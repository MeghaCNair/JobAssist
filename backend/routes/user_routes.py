from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from pydantic import BaseModel, EmailStr
from  config import get_database
from typing import Dict, Optional
from google.cloud import storage
from google.cloud import vision
import os
import time
from datetime import datetime
import io
from PyPDF2 import PdfReader
import google.generativeai as genai
from dotenv import load_dotenv
from google.oauth2 import service_account

# Load environment variables
#load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

router = APIRouter()

# Initialize Google Cloud clients
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)  # Get the root directory (jobassist)
service_account_path = os.path.join(root_dir, os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'job-assist-svc.json'))

try:
    if not os.path.exists(service_account_path):
        raise Exception(f"Google Cloud service account file not found at: {service_account_path}")
        
    # Create credentials object
    credentials = service_account.Credentials.from_service_account_file(
        service_account_path,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    
    storage_client = storage.Client(credentials=credentials)
    vision_client = vision.ImageAnnotatorClient(credentials=credentials)
    
    # Initialize Gemini
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise Exception("GEMINI_API_KEY not found in environment variables")
    genai.configure(api_key=api_key)
    
    # Initialize other Google Cloud services
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT')  # job-assist-460920
    location = os.getenv('GOOGLE_CLOUD_LOCATION')   # us-central1
    bucket_name = os.getenv('GCS_BUCKET_NAME')      # jobassist-resumes
    
    if not all([project_id, location, bucket_name]):
        raise Exception("Missing required environment variables")
    
    bucket = storage_client.bucket(bucket_name)
    print(f"Successfully initialized Google Cloud services with project: {project_id}, location: {location}")
    
except Exception as e:
    print(f"Warning: Google Cloud initialization failed: {str(e)}")
    print("Some functionality will not be available.")

# Request body schema for login
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# Request body schema for signup
class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    preferences: Optional[Dict] = {}

class UpdateUserRequest(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedinUrl: Optional[str] = None
    githubUrl: Optional[str] = None
    portfolioUrl: Optional[str] = None
    preferences: Dict

# Login endpoint
@router.post("/login")  # Path is already prefixed with /users in main.py
async def login(request: LoginRequest, db=Depends(get_database)):
    try:
        users_collection = db["users"]

        # Find user by email
        user = await users_collection.find_one({"email": request.email})
        
        # Check credentials (NOTE: Use hashed passwords in production)
        if user and user["password"] == request.password:
            return {
                "status": "success",
                "message": "Login successful",
                "token": "mock_token_12345",  # Placeholder for JWT token
                "user": {
                    "email": user["email"],
                    "name": user.get("name", ""),
                    "preferences": user.get("preferences", {}),
                    "resume_uploaded": user.get("resume_uploaded", False)
                }
            }

        raise HTTPException(status_code=401, detail="Invalid email or password")

    except Exception as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Signup endpoint
@router.post("/signup")
async def signup(request: SignupRequest, db=Depends(get_database)):
    try:
        users_collection = db["users"]

        # Check if user already exists
        existing_user = await users_collection.find_one({"email": request.email})
        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="User with this email already exists"
            )

        # Create new user document
        new_user = {
            "name": request.name,
            "email": request.email,
            "password": request.password,  # NOTE: Hash password in production
            "preferences": request.preferences,
            "resume_uploaded": False
        }

        # Insert the new user
        result = await users_collection.insert_one(new_user)

        if result.inserted_id:
            return {
                "status": "success",
                "message": "User registered successfully",
                "user": {
                    "email": request.email,
                    "name": request.name,
                    "preferences": request.preferences,
                    "resume_uploaded": False
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to register user"
            )

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Signup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Get user profile endpoint
@router.get("/{email}")
async def get_user_profile(email: str, db=Depends(get_database)):
    try:
        users_collection = db["users"]
        user = await users_collection.find_one({"email": email})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        return {
            "status": "success",
            "user": {
                "email": user["email"],
                "name": user.get("name", ""),
                "phone": user.get("phone", ""),
                "location": user.get("location", ""),
                "linkedinUrl": user.get("linkedinUrl", ""),
                "githubUrl": user.get("githubUrl", ""),
                "portfolioUrl": user.get("portfolioUrl", ""),
                "preferences": user.get("preferences", {}),
                "resume_uploaded": user.get("resume_uploaded", False)
            }
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Get profile error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

# Update user preferences endpoint
@router.put("/{email}")
async def update_user_preferences(email: str, request: UpdateUserRequest, db=Depends(get_database)):
    try:
        users_collection = db["users"]
        
        # Check if user exists
        user = await users_collection.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Update user document with all fields
        update_data = {
            "name": request.name,
            "email": request.email,
            "phone": request.phone,
            "location": request.location,
            "linkedinUrl": request.linkedinUrl,
            "githubUrl": request.githubUrl,
            "portfolioUrl": request.portfolioUrl,
            "preferences": request.preferences
        }
        
        # Remove None values
        update_data = {k: v for k, v in update_data.items() if v is not None}
        
        result = await users_collection.update_one(
            {"email": email},
            {"$set": update_data}
        )
        
        # Get updated user - whether modified or not
        updated_user = await users_collection.find_one({"email": email})
        if updated_user:
            return {
                "status": "success",
                "user": {
                    "email": updated_user["email"],
                    "name": updated_user.get("name", ""),
                    "phone": updated_user.get("phone", ""),
                    "location": updated_user.get("location", ""),
                    "linkedinUrl": updated_user.get("linkedinUrl", ""),
                    "githubUrl": updated_user.get("githubUrl", ""),
                    "portfolioUrl": updated_user.get("portfolioUrl", ""),
                    "preferences": updated_user.get("preferences", {}),
                    "resume_uploaded": updated_user.get("resume_uploaded", False)
                }
            }
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to retrieve updated user"
            )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Update preferences error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    email: str = Form(...),
    db=Depends(get_database)
):
    uploaded_blob = None
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.doc', '.docx')):
            raise HTTPException(
                status_code=400,
                detail="Only PDF, DOC, and DOCX files are allowed"
            )
            
        # Get file size
        contents = await file.read()
        file_size = len(contents)
        
        # Check file size (5MB limit)
        if file_size > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="File size should be less than 5MB"
            )
            
        # Reset file pointer to start
        await file.seek(0)
            
        # Create a unique filename using email and timestamp
        file_extension = os.path.splitext(file.filename)[1]
        timestamp = int(time.time())
        unique_filename = f"{email}-{timestamp}{file_extension}"
        
        # Upload to Google Cloud Storage
        blob = bucket.blob(unique_filename)
        blob.upload_from_string(
            contents,
            content_type=file.content_type
        )
        uploaded_blob = blob
        
        # Get the latest resume version for this user
        resumes_collection = db["resumes"]
        latest_resume = await resumes_collection.find_one(
            {"user_email": email},
            sort=[("version", -1)]
        )
        
        # Calculate new version
        new_version = 1 if not latest_resume else latest_resume["version"] + 1
        
        # Store resume metadata in MongoDB
        resume_data = {
            "user_email": email,
            "filename": unique_filename,
            "storage_url": unique_filename,  # We'll use this to fetch from bucket
            "upload_date": datetime.utcnow(),
            "version": new_version,
            "content_type": file.content_type,
            "file_size": file_size
        }
        
        try:
            await resumes_collection.insert_one(resume_data)
        except Exception as db_error:
            # If MongoDB insert fails, delete the uploaded file
            if uploaded_blob:
                uploaded_blob.delete()
            raise db_error
        
        # Update user's resume_uploaded status
        result = await db.users.update_one(
            {"email": email},
            {"$set": {"resume_uploaded": True}}
        )
        
        if result.modified_count == 0 and not await db.users.find_one({"email": email, "resume_uploaded": True}):
            # If user not found, clean up the uploaded file and MongoDB entry
            if uploaded_blob:
                uploaded_blob.delete()
            await resumes_collection.delete_one({"_id": resume_data["_id"]})
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
            
        return {
            "message": "Resume uploaded successfully",
            "version": new_version,
            "filename": unique_filename
        }
        
    except Exception as e:
        # Clean up any uploaded file in case of error
        if uploaded_blob:
            try:
                uploaded_blob.delete()
            except Exception as delete_error:
                print(f"Error cleaning up uploaded file: {str(delete_error)}")
        
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/resume/{email}")
async def get_resume_url(email: str, db=Depends(get_database)):
    try:
        # Find the most recent resume for this user from MongoDB
        resumes_collection = db["resumes"]
        latest_resume = await resumes_collection.find_one(
            {"user_email": email},
            sort=[("version", -1)]
        )
        
        if not latest_resume:
            raise HTTPException(status_code=404, detail="No resume found")
            
        # Get the blob from storage
        blob = bucket.blob(latest_resume["storage_url"])
        
        # Generate signed URL that expires in 1 hour
        url = blob.generate_signed_url(
            version="v4",
            expiration=3600,  # 1 hour
            method="GET"
        )
        
        return {
            "status": "success",
            "url": url,
            "filename": latest_resume["filename"],
            "version": latest_resume["version"],
            "upload_date": latest_resume["upload_date"],
            "content_type": latest_resume["content_type"],
            "file_size": latest_resume["file_size"]
        }
        
    except Exception as e:
        print(f"Get resume URL error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/resume/{email}/versions")
async def get_resume_versions(email: str, db=Depends(get_database)):
    try:
        # Get all resume versions for this user
        resumes_collection = db["resumes"]
        versions = await resumes_collection.find(
            {"user_email": email},
            sort=[("version", -1)]
        ).to_list(100)
        
        if not versions:
            raise HTTPException(status_code=404, detail="No resumes found")
            
        # Format the response
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
        
    except Exception as e:
        print(f"Get resume versions error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.get("/resume/{email}/version/{version}")
async def get_specific_resume_version(email: str, version: int, db=Depends(get_database)):
    try:
        # Find the specific resume version
        resumes_collection = db["resumes"]
        resume = await resumes_collection.find_one({
            "user_email": email,
            "version": version
        })
        
        if not resume:
            raise HTTPException(status_code=404, detail=f"Resume version {version} not found")
            
        # Get the blob from storage
        blob = bucket.blob(resume["storage_url"])
        
        # Generate signed URL that expires in 1 hour
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
        print(f"Get specific resume version error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

@router.post("/resume/{email}/extract-text")
async def extract_resume_text(email: str, version: Optional[int] = None, db=Depends(get_database)):
    try:
        # Get the resume metadata from MongoDB
        resumes_collection = db["resumes"]
        
        # Get the resume based on version
        if version is not None:
            resume = await resumes_collection.find_one({
                "user_email": email,
                "version": version
            })
        else:
            # Get latest version if no specific version provided
            resume = await resumes_collection.find_one(
                {"user_email": email},
                sort=[("version", -1)]
            )
        
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        # Get the blob from storage
        blob = bucket.blob(resume["storage_url"])
        
        # Download the file to memory
        content = blob.download_as_bytes()
        
        extracted_text = ""
        
        # Try PDF extraction first
        try:
            # Create a PDF reader object
            pdf_file = io.BytesIO(content)
            pdf_reader = PdfReader(pdf_file)
            
            # Extract text from all pages
            text_parts = []
            for page in pdf_reader.pages:
                text_parts.append(page.extract_text())
            
            extracted_text = "\n".join(text_parts)
            
        except Exception as pdf_error:
            print(f"PDF extraction failed, falling back to Vision API: {str(pdf_error)}")
            # Fallback to Vision API
            image = vision.Image(content=content)
            response = vision_client.document_text_detection(image=image)
            extracted_text = response.full_text_annotation.text if response.full_text_annotation else ""
        
        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from the document")
        
        # Store extracted text in MongoDB
        await resumes_collection.update_one(
            {"_id": resume["_id"]},
            {"$set": {"extracted_text": extracted_text}}
        )
        
        return {
            "status": "success",
            "message": "Text extracted successfully",
            "text": extracted_text
        }
        
    except Exception as e:
        print(f"Text extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")

async def get_ai_analysis(prompt: str, analysis_type: str) -> str:
    """Helper function to handle AI text generation with retries"""
    max_retries = 3
    retry_delay = 2  # seconds
    
    for attempt in range(max_retries):
        try:
            print(f"Attempting {analysis_type} analysis with Gemini, attempt {attempt + 1}")
            model = genai.GenerativeModel(model_name="gemini-1.5-pro")
            response = model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    max_output_tokens=2048,
                    top_k=40,
                    top_p=0.8,
                )
            )
            if not response or not response.text:
                raise Exception(f"Empty response received for {analysis_type}")
            return response.text
        except Exception as e:
            print(f"Error in {analysis_type} analysis attempt {attempt + 1}: {str(e)}")
            if attempt == max_retries - 1:  # Last attempt
                raise Exception(f"Failed {analysis_type} analysis after {max_retries} attempts: {str(e)}")
            time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
    
    raise Exception(f"Failed to get {analysis_type} analysis after all retries")

@router.post("/resume/{email}/analyze")
async def analyze_resume(email: str, version: Optional[int] = None, db=Depends(get_database)):
    try:
        print(f"Starting resume analysis for email: {email}, version: {version}")
        # Get the resume metadata and extracted text from MongoDB
        resumes_collection = db["resumes"]
        
        # Get the resume based on version
        if version is not None:
            resume = await resumes_collection.find_one({
                "user_email": email,
                "version": version
            })
        else:
            # Get latest version if no specific version provided
            resume = await resumes_collection.find_one(
                {"user_email": email},
                sort=[("version", -1)]
            )
        
        if not resume:
            print(f"No resume found for email: {email}, version: {version}")
            raise HTTPException(status_code=404, detail="Resume not found")
            
        # Get extracted text
        extracted_text = resume.get("extracted_text")
        if not extracted_text:
            print(f"No extracted text found for resume: {email}, version: {version}")
            raise HTTPException(status_code=400, detail="No extracted text found. Please extract text from the resume first.")
        
        print(f"Found resume text of length: {len(extracted_text)}")
        
        # Prepare prompts for different analyses
        resume_feedback_prompt = f"""
        You are an expert resume reviewer and career counselor. Please analyze the following resume and provide detailed feedback.
        Focus on being specific, actionable, and constructive in your feedback.
        
        Resume text:
        {extracted_text}
        
        Please provide:
        1. Overall feedback on the resume structure and content
        2. Specific suggestions for improvement
        3. Key strengths identified
        4. Areas that need enhancement
        
        Format your response in clear sections with bullet points.
        Keep the response concise but informative.
        """
        
        upskilling_prompt = f"""
        You are a career development expert. Based on the following resume, suggest upskilling opportunities that would enhance this person's career prospects.
        Focus on current industry trends and in-demand skills.
        
        Resume text:
        {extracted_text}
        
        Please provide:
        1. Technical skills that could be added or improved
        2. Specific courses or certifications recommended
        3. Emerging technologies or skills relevant to their field
        4. Soft skills that could enhance their profile
        
        Format your response in clear sections with bullet points.
        Keep the response concise but informative.
        """
        
        matching_roles_prompt = f"""
        You are a job market expert. Based on the following resume, suggest the most suitable roles that match this person's skills and experience.
        Focus on roles that offer growth potential and align with current market demands.
        
        Resume text:
        {extracted_text}
        
        Please provide:
        1. Top 5 job roles that best match their skills and experience
        2. Required skills they already have for each role
        3. Additional skills needed for each role
        4. Potential career progression paths
        
        Format your response in clear sections with bullet points.
        Keep the response concise but informative.
        """
        
        try:
            # Get responses from Gemini with retries
            print("Starting resume feedback analysis...")
            resume_feedback = await get_ai_analysis(resume_feedback_prompt, "resume feedback")
            
            print("Starting upskilling suggestions analysis...")
            upskilling_suggestions = await get_ai_analysis(upskilling_prompt, "upskilling")
            
            print("Starting matching roles analysis...")
            matching_roles = await get_ai_analysis(matching_roles_prompt, "matching roles")
            
            # Store the analysis in MongoDB
            analysis_result = {
                "resume_feedback": resume_feedback,
                "upskilling_suggestions": upskilling_suggestions,
                "matching_roles": matching_roles,
                "analysis_date": datetime.utcnow()
            }
            
            print("Storing analysis results in MongoDB...")
            await resumes_collection.update_one(
                {"_id": resume["_id"]},
                {"$set": {"ai_analysis": analysis_result}}
            )
            
            print("Analysis completed successfully")
            return {
                "status": "success",
                "message": "Resume analysis completed successfully",
                "analysis": analysis_result
            }
            
        except Exception as analysis_error:
            error_msg = f"Error during analysis: {str(analysis_error)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg)
        
    except HTTPException as he:
        raise he
    except Exception as e:
        error_msg = f"Resume analysis error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
