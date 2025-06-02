from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional
from backend.config import get_database
from backend.services.resume_management import ResumeManagementService
from backend.services.resume_analysis import ResumeAnalysisService

router = APIRouter()

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    email: str = Form(...),
    db=Depends(get_database)
):
    resume_service = ResumeManagementService(db)
    return await resume_service.upload_resume(file, email)

@router.get("/{email}")
async def get_resume(email: str, db=Depends(get_database)):
    resume_service = ResumeManagementService(db)
    return await resume_service.get_resume(email)

@router.get("/{email}/versions")
async def get_resume_versions(email: str, db=Depends(get_database)):
    resume_service = ResumeManagementService(db)
    return await resume_service.get_versions(email)

@router.get("/{email}/version/{version}")
async def get_specific_resume_version(email: str, version: int, db=Depends(get_database)):
    resume_service = ResumeManagementService(db)
    return await resume_service.get_resume(email, version)

@router.post("/{email}/extract-text")
async def extract_resume_text(
    email: str, 
    version: Optional[int] = None, 
    db=Depends(get_database)
):
    resume_service = ResumeManagementService(db)
    return await resume_service.extract_text(email, version)

@router.post("/{email}/analyze")
async def analyze_resume(
    email: str, 
    version: Optional[int] = None, 
    db=Depends(get_database)
):
    try:
        # First get the resume text
        resume_service = ResumeManagementService(db)
        resume = await resume_service.get_resume(email, version)
        
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        # Get extracted text
        query = {"user_email": email}
        if version:
            query["version"] = version
            
        resume_doc = await db["resumes"].find_one(
            query,
            sort=[("version", -1)]
        )
        
        extracted_text = resume_doc.get("extracted_text")
        if not extracted_text:
            # Try to extract text if not already extracted
            extraction_result = await resume_service.extract_text(email, version)
            extracted_text = extraction_result["text"]
            
        # Perform AI analysis
        analysis_service = ResumeAnalysisService()
        analysis_result = await analysis_service.analyze_resume(extracted_text)
        
        # Store the analysis in MongoDB
        await db["resumes"].update_one(
            {"_id": resume_doc["_id"]},
            {"$set": {"ai_analysis": analysis_result}}
        )
        
        return {
            "status": "success",
            "message": "Resume analysis completed successfully",
            "analysis": analysis_result
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        error_msg = f"Resume analysis error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg) 