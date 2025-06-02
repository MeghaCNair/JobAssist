# backend/models/user_model.py

def user_schema(user):
    return {
        "name": user.get("name"),
        "email": user.get("email"),
        "password": user.get("password"),
        "preferences": user.get("preferences", {}),
        "resume_uploaded": user.get("resume_uploaded", False)
    }
