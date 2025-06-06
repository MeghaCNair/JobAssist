import os
from typing import Optional
from vertexai.preview.language_models import TextEmbeddingInput, TextEmbeddingModel
from google.cloud import aiplatform
from pathlib import Path

class EmbeddingService:
    MODEL_NAME = "gemini-embedding-001"
    MAX_JOB_SUMMARY_LENGTH = 2048
    TARGET_EMBEDDING_DIM = 2048
    
    def __init__(self):
        self.model = None
        self.setup_model()
        
    def setup_model(self):
        """Initialize the embedding model."""
        try:
            # Initialize Vertex AI
            project_id = os.getenv('GOOGLE_CLOUD_PROJECT')
            location = os.getenv('GOOGLE_CLOUD_LOCATION', 'us-central1')
            aiplatform.init(project=project_id, location=location)
            
            # Initialize the model
            self.model = TextEmbeddingModel.from_pretrained(self.MODEL_NAME)
            
        except Exception as e:
            print(f"Failed to initialize embedding model: {str(e)}")
            raise
            
    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to specified length at word boundary."""
        if len(text) <= max_length:
            return text
            
        # Find the last space before max_length
        truncated = text[:max_length]
        last_space = truncated.rfind(' ')
        if last_space > 0:
            return truncated[:last_space]
        return truncated
            
    async def generate_embedding(self, text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> Optional[list]:
        """Generate embedding for a single text."""
        try:
            if not text:
                return None
                
            # Create embedding input
            embedding_input = TextEmbeddingInput(
                text=text,
                task_type=task_type
            )
            
            # Generate embedding
            embedding = self.model.get_embeddings([embedding_input])[0]
            
            # Take first 2048 dimensions if needed
            values = embedding.values[:self.TARGET_EMBEDDING_DIM]
            return values
            
        except Exception as e:
            print(f"Error generating embedding: {str(e)}")
            return None
            
    async def generate_resume_embedding(self, text: str) -> Optional[list]:
        """Generate embedding specifically for resume text."""
        return await self.generate_embedding(text, "RETRIEVAL_DOCUMENT")
        
    async def generate_job_embedding(self, text: str) -> Optional[list]:
        """Generate embedding specifically for job text."""
        return await self.generate_embedding(
            text, 
            "RETRIEVAL_DOCUMENT"
        )
        
    async def generate_search_query_embedding(self, query: str) -> Optional[list]:
        """Generate embedding for search queries."""
        return await self.generate_embedding(query, "RETRIEVAL_QUERY") 