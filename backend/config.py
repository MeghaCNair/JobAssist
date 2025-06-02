import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure

# Load environment variables from .env in parent directory
current_dir = os.path.dirname(os.path.abspath(__file__)) 
parent_dir = os.path.dirname(current_dir)
env_path = os.path.join(parent_dir, '.env')

if not os.path.exists(env_path):
    raise FileNotFoundError(f"Environment file not found at {env_path}")

load_dotenv(env_path)

# MongoDB setup - Get URI from environment variable
mongo_uri = os.getenv("MONGO_URI")
if not mongo_uri:
    raise ValueError("MONGO_URI environment variable is not set")

async def get_database():
    try:
        # Create async MongoDB client
        client = AsyncIOMotorClient(mongo_uri)
        # Get database
        db = client.jobsearch
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

# GCP credentials setup
gcp_creds = os.path.join(current_dir, 'job-assist-svc.json')
if os.path.exists(gcp_creds):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = gcp_creds
