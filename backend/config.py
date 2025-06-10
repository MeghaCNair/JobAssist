import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
import google.generativeai as genai
import google.auth
# Load environment variables from .env in parent directory
current_dir = os.path.dirname(os.path.abspath(__file__)) 
parent_dir = os.path.dirname(current_dir)
env_path = os.path.join(parent_dir, '.env')

if not os.path.exists(env_path):
    raise FileNotFoundError(f"Environment file not found at {env_path}")

load_dotenv(env_path)

# MongoDB setup - Get URI from environment variable
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise ValueError("MONGO_URI environment variable is not set")

import os
import google.auth

def setup_gcp_credentials():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    gcp_creds = os.path.join(current_dir, 'job-assist-svc.json')

    if os.getenv("K_SERVICE"):
        # We're running on Cloud Run → do nothing, use Workload Identity
        print("✔ Running on Cloud Run. Using default credentials.")
    elif os.path.exists(gcp_creds):
        # Running locally → use service account JSON
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = gcp_creds
        print("✔ Running locally. Using job-assist-svc.json.")
    else:
        print("❌ GCP credentials not found for local development")

setup_gcp_credentials()



# Gemini API configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is not set")

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-1.5-pro', 
    generation_config=genai.types.GenerationConfig(
        temperature=0.2,
        max_output_tokens=2048,
        top_k=40,
        top_p=0.8,
    )
)

async def get_database():
    try:
        # Create async MongoDB client using MONGO_URI from env
        client = AsyncIOMotorClient(MONGO_URI)
        # Get database name from the URI or use default
        db_name = MONGO_URI.split('/')[-1].split('?')[0] or "jobsearch"
        db = client[db_name]
        
        # Test connection
        await client.admin.command('ping')
        print("Successfully connected to MongoDB")
        
        # Create indexes for job search
        await db.jobs.create_index([("title", "text"), ("description", "text"), ("requirements", "text")])
        await db.jobs.create_index("location")
        await db.jobs.create_index("company")
        await db.jobs.create_index("postedDate")
        
        return db
    except ConnectionFailure as e:
        print(f"Error connecting to MongoDB: {str(e)}")
        raise
