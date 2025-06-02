from fastapi import APIRouter, HTTPException, Query, Depends
from backend.utils.job_scraper import JobMarketScraper
from backend.data.locations import get_all_locations, get_states, get_major_cities, get_tech_hubs
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from ..models.job_model import Job
from ..config import get_database
from fastapi.responses import JSONResponse

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
    company: Optional[str] = None
):
    try:
        db = await get_database()
        # Calculate skip for pagination
        skip = (page - 1) * limit
        
        # Build query filter
        query_filter = {}  # Remove the status filter
        if search:
            # Use text search for better performance
            query_filter["$text"] = {"$search": search}
        if location:
            query_filter["location"] = {"$regex": location, "$options": "i"}
        if company:
            query_filter["company"] = {"$regex": company, "$options": "i"}

        # Get total count for pagination
        total = await db.jobs.count_documents(query_filter)

        # Fetch jobs with pagination
        sort_options = []
        if search:
            # If using text search, sort by text score
            sort_options.append(("score", {"$meta": "textScore"}))
        # Always add date as secondary sort
        sort_options.append(("postedDate", -1))
        
        cursor = db.jobs.find(query_filter)
        if sort_options:
            cursor = cursor.sort(sort_options)
        cursor = cursor.skip(skip).limit(limit)
        jobs = []
        async for job in cursor:
            # Format the posted date
            posted_date = None
            if "posted_date" in job:
                if isinstance(job["posted_date"], dict) and "$date" in job["posted_date"]:
                    # Handle MongoDB date format
                    timestamp = int(job["posted_date"]["$date"]["$numberLong"]) / 1000  # Convert to seconds
                    posted_date = datetime.fromtimestamp(timestamp).isoformat()
                else:
                    posted_date = job["posted_date"]
            
            # Ensure all required fields are present and properly formatted
            formatted_job = {
                "_id": str(job["_id"]),
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "description": job.get("description", job.get("summary", "")),  # Try description first, then summary
                "salary": job.get("salary", "Not specified"),
                "requirements": job.get("requirements", []),  # Get actual requirements or empty array
                "postedDate": posted_date or datetime.now().isoformat(),
                "status": "active",
                "url": job.get("url", "")  # Include the job URL
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
        print(f"Error in get_jobs: {str(e)}")  # Add logging
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