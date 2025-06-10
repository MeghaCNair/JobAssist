from vertexai.preview.language_models import TextEmbeddingInput, TextEmbeddingModel
from google.cloud import aiplatform
import os


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