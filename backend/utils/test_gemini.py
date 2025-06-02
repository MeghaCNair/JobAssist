import os
import google.generativeai as genai

# Load API key from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not set in environment variables")

# Configure the SDK
genai.configure(api_key=api_key)

# Initialize the Gemini model
model = genai.GenerativeModel(model_name="gemini-1.5-pro")

# Sample resume text
resume_text = """
Megha Chandrasekharan Nair
Data Analyst with experience in Python, SQL, and Power BI.
Interned at Publicis Sapient, automated client workflows using Python.
"""

# Prompt for resume feedback
prompt = f"""
You are an expert resume reviewer. Review the resume below and give:
1. Overall feedback
2. Areas to improve
3. Suggested upskilling
4. Matching job roles

Resume:
{resume_text}
"""

# Generate response
try:
    response = model.generate_content(prompt)
    print("\n=== Gemini Analysis ===\n")
    print(response.text)
except Exception as e:
    print(f"Failed to call Gemini API: {e}")
