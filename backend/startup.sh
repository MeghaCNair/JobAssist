#!/bin/bash

# Enable command printing and exit on error
set -ex

echo "Starting startup script..."

# Create credentials directory if it doesn't exist
echo "Setting up credentials directory..."
mkdir -p /app/credentials

# Decode base64 service account JSON and save it
echo "Decoding service account credentials..."
if [ -z "$GOOGLE_CREDS_JSON" ]; then
    echo "Error: GOOGLE_CREDS_JSON environment variable is not set"
    exit 1
fi

echo "$GOOGLE_CREDS_JSON" | base64 -d > /app/credentials/service-account.json

# Verify credentials file exists
if [ ! -f /app/credentials/service-account.json ]; then
    echo "Error: Failed to create service account file"
    exit 1
fi

# Set Google credentials environment variable
echo "Setting GOOGLE_APPLICATION_CREDENTIALS..."
export GOOGLE_APPLICATION_CREDENTIALS="/app/credentials/service-account.json"

# Print working directory and verify main.py exists
echo "Current working directory: $(pwd)"
if [ ! -f "main.py" ]; then
    echo "Error: main.py not found in $(pwd)"
    ls -la
    exit 1
fi

echo "Starting Uvicorn..."
# Start the FastAPI application with increased timeout
exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --timeout-keep-alive 75
