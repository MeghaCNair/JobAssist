from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class Job(BaseModel):
    title: str
    company: str
    location: str
    description: str
    salary: str
    requirements: List[str]
    postedDate: datetime = Field(default_factory=datetime.now)
    status: str = "active"

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        schema_extra = {
            "example": {
                "title": "Senior Software Engineer",
                "company": "Tech Corp",
                "location": "New York, NY",
                "description": "We are looking for an experienced software engineer...",
                "salary": "$120,000 - $150,000",
                "requirements": ["Python", "MongoDB", "React", "5+ years experience"],
                "status": "active"
            }
        } 