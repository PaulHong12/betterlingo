# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set the working directory
WORKDIR /app

# Install system dependencies and build tools
# Add curl and gnupg for Google Cloud SDK install
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1 \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# --- Add steps to install Google Cloud SDK ---
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
# 2. Add the Cloud SDK distribution URI
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# 3. Update apt and install the SDK
RUN apt-get update -y && apt-get install google-cloud-sdk -y
# --------------------------------------------

# Install Python packages
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (including the key file)
COPY . /app/

# Set environment variable for Google credentials within the container
ENV GOOGLE_APPLICATION_CREDENTIALS=/app/gcloud-tts-key.json

# Expose the port
EXPOSE 8000