gcloud run deploy jobassist-backend `
  --image gcr.io/job-assist-460920/jobassist-backend:latestOne `
  --platform managed `
  --region us-central1 `
  --allow-unauthenticated `
  --service-account=job-assist-svc@job-assist-460920.iam.gserviceaccount.com `
  --update-secrets="MONGO_URI=MONGO_URI_SECRET:latest,/app/credentials/service-account.json=GOOGLE_CREDS_JSON_SECRET:latest,GEMINI_API_KEY=GEMINI_API_KEY_SECRET:latest" `
  --set-env-vars="GOOGLE_CLOUD_PROJECT=job-assist-460920,GOOGLE_CLOUD_LOCATION=us-central1,GCS_BUCKET_NAME=jobassist-resumes"
