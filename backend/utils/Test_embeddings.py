from vertexai.preview.language_models import TextEmbeddingInput, TextEmbeddingModel
from google.cloud import aiplatform
import os

os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "backend/job-assist-svc.json"

aiplatform.init(
    project="job-assist-460920",
    location="us-central1"
)

# Use the recommended gemini-embedding-001 model
model = TextEmbeddingModel.from_pretrained("gemini-embedding-001")

# Specify the task type for better-suited embeddings
text_embedding_input = TextEmbeddingInput(
    text="Find data scientist jobs in the US",
    task_type="RETRIEVAL_QUERY" # Example task type
)

embedding = model.get_embeddings([text_embedding_input])[0]
print("✅ Embedding length:", len(embedding.values))
print("First few embedding values:", embedding.values[:5])