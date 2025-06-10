from fastapi import APIRouter, HTTPException, Query, Depends
from  utils.job_scraper import JobMarketScraper
from  data.locations import get_all_locations, get_states, get_major_cities, get_tech_hubs
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from models.job_model import Job
from config import get_database
from fastapi.responses import JSONResponse
from utils.job_analysis import (
    generate_job_match_analysis,
    generate_cover_letter,
    enhance_resume
)

router = APIRouter()
scraper = JobMarketScraper()

@router.get("/market-data")
async def get_job_market_data():
    """Get comprehensive job market data including job types, locations, industries, and skills"""
    try:
        market_data = scraper.get_market_data()
        return {
            "status": "success",
            "data": market_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/job-types")
async def get_job_types():
    """Get list of common job types"""
    try:
        job_types = scraper.extract_job_types()
        return {
            "status": "success",
            "data": job_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/locations")
async def get_locations():
    """Get list of all locations (states + major cities + tech hubs)"""
    try:
        locations = get_all_locations()
        return {
            "status": "success",
            "data": locations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/states")
async def get_us_states():
    """Get list of US states"""
    try:
        states = get_states()
        return {
            "status": "success", 
            "data": states
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/cities")
async def get_us_cities():
    """Get list of major US cities"""
    try:
        cities = get_major_cities()
        return {
            "status": "success",
            "data": cities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tech-hubs") 
async def get_us_tech_hubs():
    """Get list of major US tech hubs"""
    try:
        hubs = get_tech_hubs()
        return {
            "status": "success",
            "data": hubs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/industries")
async def get_industries():
    """Get list of common industries"""
    try:
        industries = scraper.extract_industries()
        return {
            "status": "success",
            "data": industries
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/skills")
async def get_skills():
    """Get list of in-demand skills"""
    try:
        skills = scraper.extract_skills(num_pages=3)
        return {
            "status": "success",
            "data": skills
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs")
async def get_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(6, ge=1, le=50, description="Items per page"),
    search: Optional[str] = None,
    location: Optional[str] = None,
    company: Optional[str] = None,
    email: Optional[str] = None
):
    try:
        db = await get_database()
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Build search pipeline
        pipeline = []
        
        # Add search stage if search term is provided
        if search:
            pipeline.append({
                "$search": {
                    "index": "job_search",  # Make sure to create this index in MongoDB Atlas
                    "compound": {
                        "should": [
                            {
                                "text": {
                                    "query": search,
                                    "path": ["title", "description", "requirements"],
                                    "score": { "boost": { "value": 3 } }
                                }
                            },
                            {
                                "text": {
                                    "query": search,
                                    "path": ["company", "location"],
                                    "score": { "boost": { "value": 2 } }
                                }
                            }
                        ]
                    },
                    "highlight": {
                        "path": ["title", "description"]
                    }
                }
            })
            # Add a field for the search score
            pipeline.append({
                "$addFields": {
                    "searchScore": {
                        "$meta": "searchScore"
                    }
                }
            })
            # Sort by the added searchScore field
            pipeline.append({
                "$sort": {
                    "searchScore": -1
                }
            })
        else:
            # If no search, sort by posted date
            pipeline.append({"$sort": {"postedDate": -1}})

        # Add location filter if provided
        if location:
            pipeline.append({
                "$match": {
                    "location": {"$regex": location, "$options": "i"}
                }
            })

        # Add company filter if provided
        if company:
            pipeline.append({
                "$match": {
                    "company": {"$regex": company, "$options": "i"}
                }
            })

        # Exclude jobs that the user has already applied to
        if email:
            user = await db.users.find_one({"email": email})
            if user and user.get("applied_jobs"):
                pipeline.append({
                    "$match": {
                        "_id": {"$nin": [ObjectId(job_id) for job_id in user["applied_jobs"]]}
                    }
                })

        # Add facet stage to get total count and paginated results in one query
        pipeline.append({
            "$facet": {
                "total": [{"$count": "count"}],
                "jobs": [
                    {"$skip": skip},
                    {"$limit": limit}
                ]
            }
        })

        # Execute the pipeline
        result = await db.jobs.aggregate(pipeline).to_list(1)
        result = result[0] if result else {"total": [{"count": 0}], "jobs": []}

        total = result["total"][0]["count"] if result["total"] else 0
        jobs = []

        for job in result["jobs"]:
            # Format the posted date
            posted_date = None
            if "posted_date" in job:
                if isinstance(job["posted_date"], dict) and "$date" in job["posted_date"]:
                    timestamp = int(job["posted_date"]["$date"]["$numberLong"]) / 1000
                    posted_date = datetime.fromtimestamp(timestamp).isoformat()
                else:
                    posted_date = job["posted_date"]
            
            # Get highlighted fields if available
            highlights = job.get("highlights", {})
            description = highlights.get("description", [job.get("description", job.get("summary", ""))])[0]
            
            formatted_job = {
                "_id": str(job["_id"]),
                "title": highlights.get("title", [job.get("title", "")])[0],
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "description": description,
                "salary": job.get("salary", "Not specified"),
                "requirements": job.get("requirements", []),
                "postedDate": posted_date or datetime.now().isoformat(),
                "status": "active",
                "url": job.get("url", ""),
                "searchScore": job.get("score", None)  # Include search score if available
            }
            jobs.append(formatted_job)

        return {
            "jobs": jobs,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit
        }

    except Exception as e:
        print(f"Error in get_jobs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs")
async def create_job(job: Job):
    try:
        db = await get_database()
        job_dict = job.dict()
        result = await db.jobs.insert_one(job_dict)
        job_dict["_id"] = str(result.inserted_id)
        return job_dict
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    try:
        db = await get_database()
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if job:
            # Format the posted date
            posted_date = None
            if "posted_date" in job:
                if isinstance(job["posted_date"], dict) and "$date" in job["posted_date"]:
                    # Handle MongoDB date format
                    timestamp = int(job["posted_date"]["$date"]["$numberLong"]) / 1000  # Convert to seconds
                    posted_date = datetime.fromtimestamp(timestamp).isoformat()
                else:
                    posted_date = job["posted_date"]

            # Format the job with all available fields
            formatted_job = {
                "_id": str(job["_id"]),
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "description": job.get("description", job.get("summary", "")),  # Full job description/summary
                "salary": job.get("salary", "Not specified"),
                "requirements": job.get("requirements", []),  # Get actual requirements or empty array
                "postedDate": posted_date or datetime.now().isoformat(),
                "status": "active",
                "url": job.get("url", ""),  # Original job posting URL
                "source": job.get("source", ""),  # Job source (e.g., LinkedIn)
                "search_query": job.get("search_query", ""),  # Original search query
                "search_location": job.get("search_location", ""),  # Original search location
                "job_id": job.get("job_id", ""),  # Original job ID from source
                "scraped_date": job.get("scraped_date", {}).get("$date", {}).get("$numberLong", "") if isinstance(job.get("scraped_date"), dict) else job.get("scraped_date", "")
            }
            return formatted_job
        raise HTTPException(status_code=404, detail="Job not found")
    except Exception as e:
        print(f"Error in get_job: {str(e)}")  # Add logging
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/jobs/{job_id}")
async def update_job(job_id: str, job_update: Job):
    try:
        db = await get_database()
        job_dict = job_update.dict(exclude_unset=True)
        result = await db.jobs.update_one(
            {"_id": ObjectId(job_id)},
            {"$set": job_dict}
        )
        if result.modified_count:
            updated_job = await db.jobs.find_one({"_id": ObjectId(job_id)})
            updated_job["_id"] = str(updated_job["_id"])
            return updated_job
        raise HTTPException(status_code=404, detail="Job not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    try:
        db = await get_database()
        result = await db.jobs.delete_one({"_id": ObjectId(job_id)})
        if result.deleted_count:
            return {"message": "Job deleted successfully"}
        raise HTTPException(status_code=404, detail="Job not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/vector-search/{email}")
async def vector_search_jobs(
    email: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(5, ge=1, le=20, description="Items per page"),
):
    """Search for jobs using vector similarity with the user's resume and provide AI-curated matching details."""
    try:
        db = await get_database()
        
        # Get user's latest resume version and applied jobs
        resume = await db.resumes.find_one(
            {"user_email": email},
            sort=[("version", -1)]  # Sort by version descending to get latest
        )
        
        user = await db.users.find_one({"email": email})
        applied_job_ids = [ObjectId(job_id) for job_id in user.get("applied_jobs", [])] if user else []
        
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        print(f"Found latest resume (version {resume.get('version')}) for {email}")
            
        if "embedding" not in resume:
            # Try to generate embedding if missing
            print(f"Embedding missing for resume version {resume.get('version')}, attempting to generate...")
            if "extracted_text" in resume and resume["extracted_text"]:
                from ..services.embedding_service import EmbeddingService
                embedding_service = EmbeddingService()
                resume["embedding"] = await embedding_service.generate_resume_embedding(resume["extracted_text"])
                
                # Update resume with new embedding
                await db.resumes.update_one(
                    {"_id": resume["_id"]},
                    {"$set": {"embedding": resume["embedding"]}}
                )
                print("Successfully generated and stored new embedding")
            else:
                raise HTTPException(status_code=400, detail="Resume text extraction required before vector search")
            
        print(f"Using resume embedding with dimension: {len(resume['embedding'])}")
        
        # Find jobs with vector similarity search using MongoDB Atlas Search
        pipeline = [
            {
                "$search": {
                    "index": "job_vector_index",
                    "knnBeta": {
                        "vector": resume["embedding"],
                        "path": "embedding",
                        "k": limit * 4  # Get more results for better filtering
                    },
                    "scoreDetails": True  # Get similarity scores
                }
            },
            {
                "$match": {
                    "_id": {"$nin": applied_job_ids}  # Exclude applied jobs
                }
            },
            {
                "$addFields": {
                    "similarity_score": {
                        "$meta": "searchScore"
                    }
                }
            }
        ]
        
        print(f"Executing vector search pipeline for resume version {resume.get('version')}...")
        cursor = db.jobs.aggregate(pipeline)
        jobs = []
        
        async for job in cursor:
            print(f"Processing job: {job.get('title')} with similarity score: {job.get('similarity_score', 0)}")
            
            # Format the job data
            posted_date = None
            if "posted_date" in job:
                if isinstance(job["posted_date"], dict) and "$date" in job["posted_date"]:
                    timestamp = int(job["posted_date"]["$date"]["$numberLong"]) / 1000
                    posted_date = datetime.fromtimestamp(timestamp).isoformat()
                else:
                    posted_date = job["posted_date"]
            
            # Verify job has embedding
            if "embedding" not in job or not job["embedding"]:
                print(f"Warning: Job {job.get('_id')} has no embedding, skipping...")
                continue
                
            # Calculate match score using cosine similarity
            job_embedding = job["embedding"]
            resume_embedding = resume["embedding"]
            
            if len(job_embedding) != len(resume_embedding):
                print(f"Warning: Embedding dimension mismatch - Job: {len(job_embedding)}, Resume: {len(resume_embedding)}")
                continue
            
            # Calculate cosine similarity
            dot_product = sum(a * b for a, b in zip(job_embedding, resume_embedding))
            job_norm = sum(x * x for x in job_embedding) ** 0.5
            resume_norm = sum(x * x for x in resume_embedding) ** 0.5
            
            if job_norm > 0 and resume_norm > 0:
                match_score = round((dot_product / (job_norm * resume_norm)) * 100, 1)
            else:
                print(f"Warning: Invalid norms - Job: {job_norm}, Resume: {resume_norm}")
                continue
            
            print(f"Calculated match score: {match_score}")
            
            # Extract and normalize skills
            job_skills = [skill.lower().strip() for skill in job.get("requirements", []) if skill]
            resume_skills = [skill.lower().strip() for skill in resume.get("skills", []) if skill]
            
            # Find exact and partial skill matches
            exact_matches = set(job_skills) & set(resume_skills)
            partial_matches = set()
            
            for job_skill in job_skills:
                for resume_skill in resume_skills:
                    if (job_skill in resume_skill or resume_skill in job_skill) and \
                       job_skill not in exact_matches and \
                       resume_skill not in exact_matches:
                        partial_matches.add(job_skill)
            
            matching_skills = list(exact_matches) + list(partial_matches)
            print(f"Found {len(matching_skills)} matching skills")
            
            # Adjust match score based on skill matches
            skill_match_weight = 0.3  # 30% weight for skill matches
            if job_skills:  # Avoid division by zero
                skill_match_score = (len(matching_skills) / len(job_skills)) * 100
                match_score = round(
                    (match_score * (1 - skill_match_weight)) + 
                    (skill_match_score * skill_match_weight), 
                    1
                )
            
            print(f"Final adjusted match score: {match_score}")
            
            # Generate AI analysis using Gemini
            match_explanation = await generate_job_match_analysis(
                job_title=job.get("title", ""),
                job_description=job.get("description", ""),
                job_requirements=job_skills,
                resume_text=resume.get("text", ""),
                match_score=match_score,
                matching_skills=matching_skills
            )
            
            # Generate match highlights
            match_highlights = {
                "overall_match": match_score,
                "key_skills": job_skills[:5],
                "matching_skills": matching_skills[:5],
                "seniority_match": "High" if match_score > 85 else "Medium" if match_score > 70 else "Low",
                "role_alignment": "Strong" if match_score > 90 else "Good" if match_score > 75 else "Moderate",
                "match_explanation": match_explanation
            }
            
            # Format job data
            job_data = {
                "_id": str(job["_id"]),
                "title": job.get("title"),
                "company": job.get("company"),
                "location": job.get("location"),
                "description": job.get("description"),
                "requirements": job.get("requirements", []),
                "salary": job.get("salary"),
                "postedDate": posted_date,
                "status": job.get("status"),
                "matchScore": match_score,
                "matchDetails": match_highlights
            }
            jobs.append(job_data)
        
        # Sort jobs by match score in descending order
        jobs.sort(key=lambda x: x["matchScore"], reverse=True)
        
        # Take only the top 'limit' jobs
        jobs = jobs[:limit]
        
        print(f"Returning {len(jobs)} jobs with match scores: {[job['matchScore'] for job in jobs]}")
        
        return {
            "jobs": jobs,
            "total": len(jobs),
            "page": page,
            "limit": limit
        }
        
    except Exception as e:
        print(f"Error in vector search: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/match-analysis/{email}")
async def generate_job_match_analysis_endpoint(job_id: str, email: str):
    """Generate AI-curated match analysis for a specific job and user's resume."""
    try:
        db = await get_database()
        
        # Get the job and resume
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        resume = await db.resumes.find_one({"user_email": email})
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        # Debug logging
        print(f"Job found: {job.get('title')}")
        print(f"Job requirements: {job.get('requirements', [])}")
        print(f"Resume skills: {resume.get('skills', [])}")
        print(f"Resume text length: {len(resume.get('text', ''))}")
            
        # Calculate vector similarity score if embeddings exist
        match_score = 0
        if "embedding" in job and "embedding" in resume:
            job_embedding = job["embedding"]
            resume_embedding = resume["embedding"]
            
            if len(job_embedding) != len(resume_embedding):
                print(f"Warning: Embedding dimensions mismatch - Job: {len(job_embedding)}, Resume: {len(resume_embedding)}")
            else:
                # Calculate cosine similarity
                dot_product = sum(a * b for a, b in zip(job_embedding, resume_embedding))
                job_norm = sum(x * x for x in job_embedding) ** 0.5
                resume_norm = sum(x * x for x in resume_embedding) ** 0.5
                
                if job_norm > 0 and resume_norm > 0:
                    match_score = round((dot_product / (job_norm * resume_norm)) * 100, 1)
                    print(f"Calculated match score: {match_score}")
        else:
            print("Warning: Embeddings not found - Job:", "embedding" in job, "Resume:", "embedding" in resume)
        
        # Extract key skills and find matching ones
        job_skills = job.get("requirements", [])
        resume_skills = resume.get("skills", [])
        
        # Normalize skills for better matching
        job_skills = [skill.lower().strip() for skill in job_skills if skill]
        resume_skills = [skill.lower().strip() for skill in resume_skills if skill]
        
        # Find matching skills
        matching_skills = list(set(job_skills) & set(resume_skills))
        print(f"Matching skills found: {matching_skills}")
        
        # If no exact matches, try partial matching
        if not matching_skills:
            for job_skill in job_skills:
                for resume_skill in resume_skills:
                    if (job_skill in resume_skill) or (resume_skill in job_skill):
                        matching_skills.append(job_skill)
            matching_skills = list(set(matching_skills))
            print(f"Skills after partial matching: {matching_skills}")
        
        # Adjust match score based on skills match if no embedding score
        if match_score == 0 and job_skills:
            skill_match_ratio = len(matching_skills) / len(job_skills)
            match_score = round(skill_match_ratio * 100, 1)
            print(f"Adjusted match score based on skills: {match_score}")
        
        # Generate AI analysis using Gemini
        match_explanation = await generate_job_match_analysis(
            job_title=job.get("title", ""),
            job_description=job.get("description", ""),
            job_requirements=job_skills,
            resume_text=resume.get("text", ""),
            match_score=match_score,
            matching_skills=matching_skills
        )
        
        # Generate match highlights
        match_details = {
            "overall_match": match_score,
            "key_skills": job_skills[:5],
            "matching_skills": matching_skills[:5],
            "seniority_match": "High" if match_score > 85 else "Medium" if match_score > 70 else "Low",
            "role_alignment": "Strong" if match_score > 90 else "Good" if match_score > 75 else "Moderate",
            "match_explanation": match_explanation
        }
        
        print("Final match details:", match_details)
        return match_details
        
    except Exception as e:
        print(f"Error in generate_job_match_analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def determine_experience_level(job_title: str) -> str:
    """Determine the experience level from the job title."""
    title_lower = job_title.lower()
    if any(level in title_lower for level in ["senior", "sr.", "lead", "principal", "architect"]):
        return "senior"
    elif any(level in title_lower for level in ["junior", "jr.", "entry"]):
        return "junior"
    else:
        return "mid"

@router.post("/jobs/{job_id}/apply")
async def mark_job_as_applied(job_id: str, email: str):
    """Mark a job as applied for a specific user."""
    try:
        db = await get_database()
        
        # Update the user document to add the job to their applied_jobs list
        current_time = datetime.utcnow().isoformat()
        result = await db.users.update_one(
            {"email": email},
            {
                "$addToSet": {"applied_jobs": job_id},
                "$set": {f"applied_dates.{job_id}": current_time}
            }
        )
        
        if result.modified_count:
            return {"message": "Job marked as applied successfully"}
        return {"message": "Job already marked as applied"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/jobs/applied/{email}")
async def get_applied_jobs(
    email: str,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(6, ge=1, le=50, description="Items per page")
):
    """Get all jobs that a user has applied to."""
    try:
        db = await get_database()
        
        # Get user's applied jobs
        user = await db.users.find_one({"email": email})
        if not user or not user.get("applied_jobs"):
            return {
                "jobs": [],
                "total": 0,
                "page": page,
                "limit": limit,
                "totalPages": 0
            }
        
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Get total count
        total = len(user["applied_jobs"])
        
        # Get jobs with pagination
        applied_jobs = user["applied_jobs"][skip:skip + limit]
        
        # Fetch job details for the paginated job IDs
        jobs = []
        for job_id in applied_jobs:
            try:
                job = await db.jobs.find_one({"_id": ObjectId(job_id)})
                if job:
                    # Format the job data
                    formatted_job = {
                        "_id": str(job["_id"]),
                        "title": job.get("title", ""),
                        "company": job.get("company", ""),
                        "location": job.get("location", ""),
                        "description": job.get("description", job.get("summary", "")),
                        "salary": job.get("salary", "Not specified"),
                        "requirements": job.get("requirements", []),
                        "postedDate": job.get("postedDate") or datetime.now().isoformat(),
                        "status": "applied",
                        "url": job.get("url", ""),
                        "appliedDate": user.get("applied_dates", {}).get(job_id)
                    }
                    jobs.append(formatted_job)
            except Exception as e:
                print(f"Error fetching job {job_id}: {str(e)}")
                continue
        
        return {
            "jobs": jobs,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/cover-letter/{email}")
async def generate_job_cover_letter(job_id: str, email: str):
    """Generate a cover letter for a specific job using the user's resume."""
    try:
        db = await get_database()
        
        # Get the job and user data
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        user = await db.users.find_one({"email": email})
        resume = await db.resumes.find_one({"user_email": email}, sort=[("version", -1)])
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        # Generate cover letter
        cover_letter = await generate_cover_letter(
            job_title=job.get("title", ""),
            company=job.get("company", ""),
            job_description=job.get("description", ""),
            resume_text=resume.get("extracted_text", ""),
            user_name=user.get("name", "")
        )
        
        return {"cover_letter": cover_letter}
        
    except Exception as e:
        print(f"Error generating cover letter: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/jobs/{job_id}/enhance-resume/{email}")
async def get_resume_enhancements(job_id: str, email: str):
    """Get suggestions to enhance the resume for a specific job."""
    try:
        db = await get_database()
        
        # Get the job and resume
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        resume = await db.resumes.find_one({"user_email": email}, sort=[("version", -1)])
        
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
            
        # Get enhancement suggestions
        suggestions = await enhance_resume(
            resume_text=resume.get("extracted_text", ""),
            job_title=job.get("title", ""),
            job_description=job.get("description", ""),
            job_requirements=job.get("requirements", [])
        )
        
        return suggestions
        
    except Exception as e:
        print(f"Error generating resume enhancements: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 