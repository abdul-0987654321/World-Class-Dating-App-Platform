FROM public.ecr.aws/docker/library/python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/services/ai-services/fraud-detection/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/services/ai-services/fraud-detection/main.py .
COPY backend/services/ai-services/fraud-detection/models.py .
COPY backend/services/ai-services/fraud-detection/fraud_detector.py .
COPY backend/services/ai-services/fraud-detection/services ./services

# Expose port
EXPOSE 8001

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
