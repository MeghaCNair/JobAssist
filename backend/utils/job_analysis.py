from config import model
import re

async def generate_job_match_analysis(
    job_title: str,
    job_description: str,
    job_requirements: list,
    resume_text: str,
    match_score: float,
    matching_skills: list
) -> str:
    """Generate a detailed job match analysis using Gemini AI."""
    
    prompt = f"""
    As an AI career advisor, analyze the match between this job position and the candidate's resume.
    Provide a detailed yet concise analysis of the fit.

    Job Position: {job_title}
    
    Job Description:
    {job_description}
    
    Key Requirements:
    {', '.join(job_requirements)}
    
    Candidate's Resume Summary:
    {resume_text}
    
    Quantitative Match: {match_score}%
    Matching Skills: {', '.join(matching_skills)}

    Please provide a personalized analysis in the following format:

    1. Start with an overall assessment of the match and key alignment points.
    2. Highlight which specific skills from the candidate's resume are most valuable for this role and how they directly apply.
    3. Recommend 2-3 specific skills or areas the candidate should focus on developing to become an even stronger match.
    
    Keep the tone professional and encouraging. Focus on actionable insights.
    Format the response in clear paragraphs with natural transitions.
    Aim for 4-5 impactful sentences total.
    
    IMPORTANT: Return only plain text without any styling, formatting, or special characters.
    """
    
    try:
        # Generate content with Gemini
        response = await model.generate_content_async(prompt)
        
        if not response or not response.text:
            raise Exception("No response received from Gemini")
            
        # Clean and format the response
        analysis = response.text.strip()
        
        # Remove any CSS-like styling that might appear
        analysis = re.sub(r':[^}]+}', '', analysis)
        # Remove any remaining CSS properties
        analysis = re.sub(r'[.#][a-zA-Z-]+{[^}]*}', '', analysis)
        # Remove any HTML-like tags
        analysis = re.sub(r'<[^>]+>', '', analysis)
        # Remove any remaining special characters and extra whitespace
        analysis = re.sub(r'[^\w\s.,!?()-]', '', analysis)
        analysis = ' '.join(analysis.split())
        
        # Log for debugging
        print("Gemini Analysis Generated:", analysis[:100] + "...")
        
        return analysis
        
    except Exception as e:
        print(f"Error in Gemini analysis generation: {str(e)}")
        raise Exception(f"Failed to generate AI analysis: {str(e)}")

async def generate_cover_letter(
    job_title: str,
    company: str,
    job_description: str,
    resume_text: str,
    user_name: str
) -> str:
    """Generate a personalized cover letter using Gemini AI."""
    
    prompt = f"""
    As an expert career advisor, write a compelling and personalized cover letter for the following job application.
    
    Job Details:
    - Position: {job_title}
    - Company: {company}
    - Job Description: {job_description}
    
    Candidate Information:
    {resume_text}
    
    Please write a professional cover letter that:
    1. Addresses the company's needs and requirements
    2. Highlights relevant skills and experiences from the resume
    3. Shows enthusiasm for the role and company
    4. Maintains a professional yet engaging tone
    5. Follows standard cover letter format
    
    Use {user_name} as the candidate's name.
    Keep the length to 3-4 paragraphs.
    Make it persuasive and specific to the role.
    
    Format the letter with proper spacing and structure.
    """
    
    try:
        response = await model.generate_content_async(prompt)
        
        if not response or not response.text:
            raise Exception("No response received from Gemini")
            
        cover_letter = response.text.strip()
        return cover_letter
        
    except Exception as e:
        print(f"Error in cover letter generation: {str(e)}")
        raise Exception(f"Failed to generate cover letter: {str(e)}")

async def enhance_resume(
    resume_text: str,
    job_title: str,
    job_description: str,
    job_requirements: list
) -> dict:
    """Enhance resume content to better match the job requirements using Gemini AI."""
    
    prompt = f"""
    As an expert resume writer, analyze the candidate's resume and provide specific suggestions to enhance it for the following job:
    
    Target Position: {job_title}
    
    Job Description:
    {job_description}
    
    Key Requirements:
    {', '.join(job_requirements)}
    
    Current Resume:
    {resume_text}
    
    Please provide:
    1. Suggested bullet points for relevant experience sections that better align with the job requirements
    2. Skills to emphasize or add based on the job requirements
    3. Specific achievements to highlight or reword
    4. Keywords from the job description to incorporate
    5. Any sections to add or modify
    
    Format the response as a structured JSON with the following keys:
    - bullet_points: List of suggested bullet points
    - skills: List of skills to emphasize or add
    - achievements: List of achievements to highlight
    - keywords: List of important keywords
    - sections: List of sections to add/modify with explanations
    
    Keep suggestions specific and actionable.
    Focus on matching the job requirements while maintaining authenticity.
    """
    
    try:
        response = await model.generate_content_async(prompt)
        
        if not response or not response.text:
            raise Exception("No response received from Gemini")
            
        # Clean and format the response
        suggestions = response.text.strip()
        
        # Extract JSON content (assuming Gemini returns properly formatted JSON)
        # Remove any markdown formatting if present
        json_str = suggestions.replace("```json", "").replace("```", "").strip()
        
        # Parse the JSON string into a Python dictionary
        import json
        enhancement_suggestions = json.loads(json_str)
        
        return enhancement_suggestions
        
    except Exception as e:
        print(f"Error in resume enhancement: {str(e)}")
        raise Exception(f"Failed to generate resume suggestions: {str(e)}") 