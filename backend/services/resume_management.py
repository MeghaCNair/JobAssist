import os
from datetime import datetime, timezone
from fastapi import HTTPException, UploadFile
from google.cloud import storage, vision
from google.oauth2 import service_account
from PyPDF2 import PdfReader
from .embedding_service import EmbeddingService
import io
from config import model
from typing import List

class ResumeManagementService:
    def __init__(self, db):
        self.db = db
        self.setup_google_cloud()
        self.embedding_service = EmbeddingService()
        self.bucket = storage.Client().bucket(os.getenv('GCS_BUCKET_NAME'))

    def setup_google_cloud(self):
        """Initialize Google Cloud services"""
        try:
            # Get service account path
            current_dir = os.path.dirname(os.path.abspath(__file__))
            root_dir = os.path.dirname(os.path.dirname(current_dir))
            service_account_path = os.path.join(
                root_dir, 
                os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'job-assist-svc.json')
            )

            if not os.path.exists(service_account_path):
                raise Exception(f"Service account file not found at: {service_account_path}")

            # Create credentials
            credentials = service_account.Credentials.from_service_account_file(
                service_account_path,
                scopes=['https://www.googleapis.com/auth/cloud-platform']
            )

            # Initialize clients
            self.storage_client = storage.Client(credentials=credentials)
            self.vision_client = vision.ImageAnnotatorClient(credentials=credentials)
            
            # Get bucket
            bucket_name = os.getenv('GCS_BUCKET_NAME')
            if not bucket_name:
                raise Exception("GCS_BUCKET_NAME not found in environment variables")
            self.bucket = self.storage_client.bucket(bucket_name)

        except Exception as e:
            print(f"Failed to initialize Google Cloud services: {str(e)}")
            raise

    async def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from resume text using Gemini AI."""
        try:
            prompt = f"""
            As a skilled ATS system, analyze the following resume text and extract a comprehensive list of technical and professional skills.
            Include both hard skills (technical skills, tools, programming languages, etc.) and relevant soft skills.
            Format the response as a simple comma-separated list of skills, without any additional text or formatting.

            Resume text:
            {text}
            """

            response = await model.generate_content_async(prompt)
            if not response or not response.text:
                return []

            # Split the response into individual skills and clean them
            skills = [
                skill.strip().lower()
                for skill in response.text.split(',')
                if skill.strip()
            ]

            return list(set(skills))  # Remove duplicates
        except Exception as e:
            print(f"Error extracting skills: {str(e)}")
            return []

    async def upload_resume(self, file: UploadFile, email: str) -> dict:
        """Upload a resume file and store its metadata"""
        try:
            # Validate file type
            if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
                raise HTTPException(
                    status_code=400,
                    detail="Only PDF, DOC, and DOCX files are allowed"
                )

            # Read file contents
            contents = await file.read()
            file_size = len(contents)

            # Check file size (5MB limit)
            if file_size > 5 * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail="File size should be less than 5MB"
                )

            # Create unique filename with UTC timestamp
            file_extension = os.path.splitext(file.filename)[1]
            timestamp = int(datetime.now(timezone.utc).timestamp())
            unique_filename = f"{email}-{timestamp}{file_extension}"

            # Upload to Google Cloud Storage
            blob = self.bucket.blob(unique_filename)
            blob.upload_from_string(contents, content_type=file.content_type)

            # Get the latest resume version
            latest_resume = await self.db["resumes"].find_one(
                {"user_email": email},
                sort=[("version", -1)]
            )
            new_version = 1 if not latest_resume else latest_resume["version"] + 1

            # Extract text and generate embedding
            extracted_text = await self._extract_text_from_content(contents)
            
            # Extract skills from text
            skills = []
            if extracted_text:
                skills = await self._extract_skills_from_text(extracted_text)
                print(f"Extracted skills: {skills}")

            # Generate embedding if text was extracted
            embedding = None
            if extracted_text:
                embedding = await self.embedding_service.generate_resume_embedding(extracted_text)

            # Store metadata in MongoDB with UTC timestamp
            current_time = datetime.now(timezone.utc)
            resume_data = {
                "user_email": email,
                "filename": unique_filename,
                "storage_url": unique_filename,
                "upload_date": current_time,
                "version": new_version,
                "content_type": file.content_type,
                "file_size": file_size,
                "extracted_text": extracted_text if extracted_text else None,
                "embedding": embedding if embedding else None,
                "skills": skills
            }

            await self.db["resumes"].insert_one(resume_data)
            await self.db["users"].update_one(
                {"email": email},
                {"$set": {
                    "resume_uploaded": True,
                    "skills": skills
                }}
            )

            return {
                "message": "Resume uploaded successfully",
                "version": new_version,
                "filename": unique_filename,
                "has_embedding": embedding is not None,
                "skills_extracted": len(skills),
                "upload_date": current_time.isoformat()
            }

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Resume upload error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _extract_text_from_content(self, content: bytes) -> str:
        """Extract text from file content."""
        try:
            extracted_text = ""
            
            # Try PDF extraction first
            try:
                pdf_file = io.BytesIO(content)
                pdf_reader = PdfReader(pdf_file)
                
                text_parts = []
                for page in pdf_reader.pages:
                    text_parts.append(page.extract_text())
                
                extracted_text = "\n".join(text_parts)
                
            except Exception as pdf_error:
                print(f"PDF extraction failed, falling back to Vision API: {str(pdf_error)}")
                # Fallback to Vision API
                image = vision.Image(content=content)
                response = self.vision_client.document_text_detection(image=image)
                extracted_text = response.full_text_annotation.text if response.full_text_annotation else ""

            return extracted_text.strip()
            
        except Exception as e:
            print(f"Text extraction error: {str(e)}")
            return ""

    async def get_resume(self, email: str, version: int = None) -> dict:
        """Get resume metadata and generate signed URL"""
        try:
            # Find resume document
            query = {"user_email": email}
            if version:
                query["version"] = version
            else:
                # Get latest version
                resume = await self.db["resumes"].find_one(
                    {"user_email": email},
                    sort=[("version", -1)]
                )
                if not resume:
                    raise HTTPException(status_code=404, detail="No resume found")
                return await self._generate_resume_response(resume)

            resume = await self.db["resumes"].find_one(query)
            if not resume:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Resume version {version} not found"
                )

            return await self._generate_resume_response(resume)

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Get resume error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def _generate_resume_response(self, resume: dict) -> dict:
        """Generate response with signed URL for resume download"""
        try:
            blob = self.bucket.blob(resume["storage_url"])
            url = blob.generate_signed_url(
                version="v4",
                expiration=3600,  # 1 hour
                method="GET"
            )

            return {
                "status": "success",
                "url": url,
                "filename": resume["filename"],
                "version": resume["version"],
                "upload_date": resume["upload_date"],
                "content_type": resume["content_type"],
                "file_size": resume["file_size"]
            }
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to generate download URL: {str(e)}"
            )

    async def extract_text(self, email: str, version: int = None) -> dict:
        """Extract text from a resume and generate embedding"""
        try:
            # Get resume document
            query = {"user_email": email}
            if version:
                query["version"] = version

            resume = await self.db["resumes"].find_one(
                query,
                sort=[("version", -1)]
            )

            if not resume:
                raise HTTPException(status_code=404, detail="Resume not found")

            # Check if we already have extracted text
            if resume.get("extracted_text"):
                extracted_text = resume["extracted_text"]
            else:
                # Download and extract text
                blob = self.bucket.blob(resume["storage_url"])
                content = blob.download_as_bytes()
                extracted_text = await self._extract_text_from_content(content)
                
                # Generate embedding if we have text
                if extracted_text:
                    embedding = await self.embedding_service.generate_resume_embedding(extracted_text)
                    
                    # Update the document with text and embedding
                    await self.db["resumes"].update_one(
                        {"_id": resume["_id"]},
                        {
                            "$set": {
                                "extracted_text": extracted_text,
                                "embedding": embedding
                            }
                        }
                    )

            if not extracted_text:
                raise HTTPException(
                    status_code=400,
                    detail="Could not extract text from the document"
                )

            return {
                "status": "success",
                "message": "Text extracted successfully",
                "text": extracted_text,
                "has_embedding": "embedding" in resume or embedding is not None
            }

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Text extraction error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    async def get_versions(self, email: str) -> dict:
        """Get all versions of a user's resume"""
        try:
            versions = await self.db["resumes"].find(
                {"user_email": email},
                sort=[("version", -1)]
            ).to_list(100)

            if not versions:
                raise HTTPException(status_code=404, detail="No resumes found")

            formatted_versions = [{
                "version": v["version"],
                "upload_date": v["upload_date"],
                "filename": v["filename"],
                "file_size": v["file_size"]
            } for v in versions]

            return {
                "status": "success",
                "versions": formatted_versions
            }

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Get resume versions error: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e)) 