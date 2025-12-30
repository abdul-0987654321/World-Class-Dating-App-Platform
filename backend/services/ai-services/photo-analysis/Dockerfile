FROM python:3.11-slim@sha256:87f0a12eedb9fdc5ae29f4d0a287e3f5e85a87e07d09e86b5cd5c4bb3c6b8d3e

WORKDIR /app

# Install system dependencies for image processing
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/services/ai-services/photo-analysis/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/services/ai-services/photo-analysis/main.py .
COPY backend/services/ai-services/photo-analysis/models.py .
COPY backend/services/ai-services/photo-analysis/services ./services

# Expose port
EXPOSE 8003

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
