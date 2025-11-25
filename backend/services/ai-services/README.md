# AI Services

ConnectSphere AI microservices for intelligent matching, safety, and content analysis.

## Services

### 1. Fraud Detection Service
Location: `fraud-detection-service/`
- Real-time fraud risk assessment
- Location anomaly detection (impossible travel)
- Device fingerprinting and trust scoring
- Activity velocity checking
- Profile fraud analysis

### 2. NLP Service
Location: `nlp-service/`
- Sentiment analysis for messages and bios
- Toxicity and content moderation
- Language detection
- Interest extraction from text
- Conversation health analysis
- Smart reply generation
- Scam detection

### 3. Photo Analysis Service
Location: `photo-analysis-service/`
- Face detection and analysis
- Photo quality assessment
- NSFW content moderation
- Deepfake/AI-generated image detection
- Selfie verification matching
- Profile photo ranking

### 4. Recommendation Service
Location: `recommendation-service/`
- Vector-based profile matching
- Compatibility scoring
- Personalized recommendations
- Similar profile suggestions
- Top picks generation

## Running the Services

Each service is a FastAPI application. To run:

```bash
cd <service-name>
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port <port>
```

Default ports:
- Fraud Detection: 8001
- NLP Service: 8002
- Photo Analysis: 8003
- Recommendation: 8004

## Docker

Each service includes a Dockerfile. Build and run:

```bash
docker build -t <service-name> .
docker run -p <port>:<port> <service-name>
```

## Environment Variables

See individual service configs for required environment variables.

## API Documentation

Each service exposes Swagger UI at `/docs` when running.
