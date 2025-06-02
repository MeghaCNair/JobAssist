import os
import time
import google.generativeai as genai
from datetime import datetime
from fastapi import HTTPException

class ResumeAnalysisService:
    def __init__(self):
        # Initialize Gemini
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise Exception("GEMINI_API_KEY not found in environment variables")
        genai.configure(api_key=api_key)

    async def _get_ai_analysis(self, prompt: str, analysis_type: str) -> str:
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

    def _create_resume_feedback_prompt(self, extracted_text: str) -> str:
        return f"""
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

    def _create_upskilling_prompt(self, extracted_text: str) -> str:
        return f"""
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

    def _create_matching_roles_prompt(self, extracted_text: str) -> str:
        return f"""
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

    async def analyze_resume(self, extracted_text: str) -> dict:
        """
        Analyze a resume using AI and return comprehensive feedback
        """
        try:
            print("Starting resume analysis...")
            
            # Get responses from Gemini with retries
            print("Starting resume feedback analysis...")
            resume_feedback = await self._get_ai_analysis(
                self._create_resume_feedback_prompt(extracted_text), 
                "resume feedback"
            )
            
            print("Starting upskilling suggestions analysis...")
            upskilling_suggestions = await self._get_ai_analysis(
                self._create_upskilling_prompt(extracted_text), 
                "upskilling"
            )
            
            print("Starting matching roles analysis...")
            matching_roles = await self._get_ai_analysis(
                self._create_matching_roles_prompt(extracted_text), 
                "matching roles"
            )
            
            # Create analysis result
            analysis_result = {
                "resume_feedback": resume_feedback,
                "upskilling_suggestions": upskilling_suggestions,
                "matching_roles": matching_roles,
                "analysis_date": datetime.utcnow()
            }
            
            print("Analysis completed successfully")
            return analysis_result
            
        except Exception as e:
            error_msg = f"Resume analysis error: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=500, detail=error_msg) 