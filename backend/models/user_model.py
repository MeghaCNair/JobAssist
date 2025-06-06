# backend/models/user_model.py

def user_schema(user):
    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "password": user.get("password"),
        "preferences": user.get("preferences", {}),
        "resume_uploaded": user.get("resume_uploaded", False),
        "applied_jobs": user.get("applied_jobs", []),  # List of job IDs the user has applied to
        "applied_dates": user.get("applied_dates", {})  # Dictionary of job ID to application date
    }
