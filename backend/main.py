from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes import user_routes, resume_routes
from backend.routes import job_market_routes
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = FastAPI(
    title="JobAssist API",
    description="API for JobAssist application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(user_routes.router, prefix="/api/users", tags=["users"])
app.include_router(job_market_routes.router, prefix="/api", tags=["jobs"])
app.include_router(resume_routes.router, prefix="/resumes", tags=["resumes"])

@app.get("/")
async def root():
    return {
        "status": "success",
        "message": "JobAssist API is running",
        "version": "1.0.0"
    }

