def resume_schema(resume):
    return {
        "user_email": resume.get("user_email"),
        "filename": resume.get("filename"),
        "storage_url": resume.get("storage_url"),
        "upload_date": resume.get("upload_date"),
        "version": resume.get("version", 1),  # Track resume versions
        "content_type": resume.get("content_type"),
        "file_size": resume.get("file_size")
    } 