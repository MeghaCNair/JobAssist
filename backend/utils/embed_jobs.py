import os
from typing import List
import asyncio
from pymongo import MongoClient
from pymongo.operations import UpdateOne
from vertexai.preview.language_models import TextEmbeddingInput, TextEmbeddingModel
from google.cloud import aiplatform
from dotenv import load_dotenv
import time
import sys
from pathlib import Path

# Add the backend directory to Python path for imports
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from services.embedding_service import EmbeddingService

# Load environment variables from root .env file
root_dir = backend_dir.parent
load_dotenv(root_dir / '.env')

async def check_authentication():
    """Check Google Cloud authentication and provide guidance if not authenticated."""
    try:
        # Get credentials path from env or use default in backend directory
        credentials_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS', 'job-assist-svc.json')
        
        # If it's not an absolute path, look in backend directory
        if not os.path.isabs(credentials_path):
            credentials_path = os.path.join(backend_dir, credentials_path)
            
        if not os.path.exists(credentials_path):
            raise ValueError(f"Credentials file not found at: {credentials_path}")
            
        # Set the credentials environment variable
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = credentials_path
        print(f"Using credentials file: {credentials_path}")
        
        # Try to initialize Vertex AI
        project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
        if not project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT environment variable is not set")
            
        location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
        aiplatform.init(project=project_id, location=location)
        
        # Test authentication by trying to get the model
        try:
            embedding_service = EmbeddingService()
            test_input = "test"
            test_result = await embedding_service.generate_job_embedding(test_input)
            if test_result:
                print("Successfully authenticated and tested model access")
                return True
            else:
                print("Error: Test embedding generation failed")
                return False
        except Exception as model_error:
            print("\nError accessing the embedding model:")
            print("=====================================")
            print(f"Error details: {str(model_error)}")
            print("\nPlease check that:")
            print("1. Your project has access to the Vertex AI API")
            print("2. The service account has the required permissions")
            print("3. You have enabled the Vertex AI API in your project")
            print("\nTo fix this:")
            print("1. Go to Google Cloud Console")
            print("2. Enable the Vertex AI API")
            print("3. Grant the service account 'Vertex AI User' role")
            return False
        
    except Exception as e:
        print("\nGoogle Cloud Authentication Error:")
        print("=================================")
        print(f"Error details: {str(e)}")
        print("\nPlease check that:")
        print(f"1. The service account key file exists in the backend directory: {backend_dir}")
        print("2. The service account key file is valid")
        print("3. GOOGLE_CLOUD_PROJECT is set correctly in .env")
        return False

async def process_job(job: dict, embedding_service: EmbeddingService, collection) -> bool:
    """Process a single job to generate and store its embedding."""
    try:
        if not job.get('summary'):
            print(f"Skipping job {job['_id']}: No summary found")
            return False
            
        # Generate embedding with 2048 character limit
        embedding = await embedding_service.generate_job_embedding(job['summary'])
        if not embedding:
            print(f"Failed to generate embedding for job {job['_id']}")
            return False
            
        # Update in MongoDB
        result = collection.update_one(
            {"_id": job["_id"]},
            {"$set": {"embedding": embedding}}
        )
        
        if result.modified_count > 0:
            return True
        else:
            print(f"Warning: Failed to update job {job['_id']}")
            return False
            
    except Exception as e:
        print(f"Error processing job {job['_id']}: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return False

async def generate_embeddings_for_jobs(force_update: bool = True):
    """Generate embeddings for all jobs in the database."""
    # Check authentication first
    if not await check_authentication():
        return
        
    try:
        # Connect to MongoDB
        mongo_uri = os.getenv('MONGO_URI')
        if not mongo_uri:
            print("Error: MONGO_URI environment variable is not set")
            return
            
        client = MongoClient(mongo_uri)
        db = client['jobsearch']
        jobs_collection = db.jobs
        
        # Get all jobs or only those without embeddings
        query = {} if force_update else {"embedding": {"$exists": False}}
        total_jobs = jobs_collection.count_documents(query)
        
        if force_update:
            print(f"\nUpdating embeddings for all {total_jobs} jobs")
        else:
            print(f"\nFound {total_jobs} jobs without embeddings")
        
        if total_jobs == 0:
            print("No jobs to process. Exiting.")
            return
        
        # Get all jobs
        jobs = jobs_collection.find(query)
        
        # Initialize embedding service
        print("Initializing embedding service...")
        embedding_service = EmbeddingService()
        print("Embedding service initialized successfully")
        
        # Process jobs one at a time
        processed_count = 0
        success_count = 0
        
        for job in jobs:
            success = await process_job(job, embedding_service, jobs_collection)
            processed_count += 1
            if success:
                success_count += 1
            
            if processed_count % 10 == 0:
                print(f"Progress: {processed_count}/{total_jobs} jobs processed ({success_count} successful)")
            
            # Add a small delay to avoid rate limits
            await asyncio.sleep(0.1)
            
        print(f"\nFinished processing {processed_count} jobs ({success_count} successful)")
        
        # Final verification
        jobs_without_embeddings = jobs_collection.count_documents({"embedding": {"$exists": False}})
        print(f"Jobs still without embeddings: {jobs_without_embeddings}")
        
        # Sample a job with embedding to verify
        sample_job = jobs_collection.find_one({"embedding": {"$exists": True}})
        if sample_job and "embedding" in sample_job:
            print(f"Sample job embedding length: {len(sample_job['embedding'])}")
        else:
            print("Warning: Could not find any jobs with embeddings")
        
    except Exception as e:
        print(f"Error generating embeddings: {str(e)}")
        import traceback
        print(traceback.format_exc())
    finally:
        client.close()

if __name__ == "__main__":
    print("Starting job embedding generation/update process...")
    print("This will update ALL existing job embeddings with the new 2048 character limit")
    asyncio.run(generate_embeddings_for_jobs(force_update=True)) 