# AI Services Suite - World-Class Dating Platform

Complete AI-powered microservices suite for the dating platform. Includes fraud detection, natural language processing, photo analysis, and intelligent recommendations.

## Overview

This is a comprehensive implementation of 4 AI-powered microservices, each designed to enhance user safety, experience, and matchmaking quality on the dating platform.

## Services Architecture

```
ai-services/
├── fraud-detection/          # Fraud & security service
│   ├── main.py
│   ├── models.py
│   ├── services/
│   │   ├── fraud_detector.py
│   │   ├── location_analyzer.py
│   │   ├── device_analyzer.py
│   │   └── profile_analyzer.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
│
├── nlp-service/             # Natural language processing
│   ├── main.py
│   ├── models.py
│   ├── services/
│   │   ├── sentiment_analyzer.py
│   │   ├── toxicity_detector.py
│   │   ├── scam_detector.py
│   │   ├── language_detector.py
│   │   └── smart_reply_generator.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
│
├── photo-analysis/          # Photo & image analysis
│   ├── main.py
│   ├── models.py
│   ├── services/
│   │   ├── face_detector.py
│   │   ├── quality_analyzer.py
│   │   ├── nsfw_detector.py
│   │   ├── deepfake_detector.py
│   │   └── selfie_verifier.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── README.md
│
└── recommendation-service/  # Matchmaking & recommendations
    ├── main.py
    ├── models.py
    ├── services/
    │   ├── recommendation_engine.py
    │   ├── compatibility_calculator.py
    │   └── profile_matcher.py
    ├── requirements.txt
    ├── Dockerfile
    └── README.md
```

## 1. Fraud Detection Service

**Port**: 8001
**Purpose**: Protect users from fraud, scams, and malicious actors

### Features
- IP reputation checking
- Velocity checks (rate limiting abuse)
- Device fingerprint analysis
- Location anomaly detection (impossible travel)
- Profile authenticity scoring
- Risk score calculation (0-100)

### Endpoints
```
POST /api/fraud/check              - Comprehensive fraud check
POST /api/fraud/location-anomaly   - Detect impossible travel
POST /api/fraud/device-check       - Device fingerprint analysis
POST /api/fraud/profile-analysis   - Profile authenticity scoring
```

### Risk Levels
- **LOW** (0-39): Normal operation
- **MEDIUM** (40-59): Monitor closely
- **HIGH** (60-79): Require verification
- **CRITICAL** (80-100): Block immediately

## 2. NLP Service

**Port**: 8002
**Purpose**: Natural language understanding and content moderation

### Features
- Sentiment analysis (-1 to 1 scale)
- Toxicity detection (multiple categories)
- Scam message detection
- Language detection (10+ languages)
- Smart reply generation

### Endpoints
```
POST /api/nlp/sentiment        - Analyze text sentiment
POST /api/nlp/toxicity         - Detect toxic content
POST /api/nlp/scam-detection   - Detect scam messages
POST /api/nlp/language-detect  - Detect language
POST /api/nlp/smart-replies    - Generate reply suggestions
```

### Supported Languages
English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Arabic

## 3. Photo Analysis Service

**Port**: 8003
**Purpose**: Image quality, safety, and verification

### Features
- Face detection with landmarks
- Photo quality assessment
- NSFW content detection
- Deepfake/AI-generated image detection
- Selfie verification (identity matching)

### Endpoints
```
POST /api/photo/analyze        - Full photo analysis
POST /api/photo/face-detect    - Detect faces
POST /api/photo/quality        - Assess photo quality
POST /api/photo/nsfw           - NSFW content detection
POST /api/photo/deepfake       - Detect AI-generated images
POST /api/photo/verify-selfie  - Compare selfie to profile
```

### Quality Levels
- **EXCELLENT** (80-100): High-quality photos
- **GOOD** (60-79): Good quality
- **FAIR** (40-59): Acceptable quality
- **POOR** (0-39): Low quality (rejected)

## 4. Recommendation Service

**Port**: 8004
**Purpose**: Intelligent matchmaking and profile recommendations

### Features
- Personalized profile recommendations
- Multi-factor compatibility scoring
- Similar profile discovery
- Daily top picks
- Collaborative & content-based filtering

### Endpoints
```
POST /api/recommend/profiles        - Get recommended profiles
POST /api/recommend/compatibility   - Calculate compatibility score
POST /api/recommend/similar         - Find similar profiles
POST /api/recommend/top-picks       - Get top picks
```

### Compatibility Factors
- **Interests** (30%): Shared interests
- **Age** (15%): Age compatibility
- **Location** (25%): Geographic proximity
- **Preferences** (20%): Mutual preferences
- **Lifestyle** (10%): Lifestyle compatibility

## Quick Start

### Using Docker Compose

Create a `docker-compose.yml` in the `ai-services` directory:

```yaml
version: '3.8'

services:
  fraud-detection:
    build: ./fraud-detection
    ports:
      - "8001:8001"
    environment:
      - SERVICE_NAME=fraud-detection

  nlp-service:
    build: ./nlp-service
    ports:
      - "8002:8002"
    environment:
      - SERVICE_NAME=nlp-service

  photo-analysis:
    build: ./photo-analysis
    ports:
      - "8003:8003"
    environment:
      - SERVICE_NAME=photo-analysis

  recommendation-service:
    build: ./recommendation-service
    ports:
      - "8004:8004"
    environment:
      - SERVICE_NAME=recommendation-service
```

Run all services:
```bash
docker-compose up -d
```

### Individual Service Deployment

Each service can be deployed independently:

```bash
# Fraud Detection
cd fraud-detection
docker build -t fraud-detection .
docker run -p 8001:8001 fraud-detection

# NLP Service
cd nlp-service
docker build -t nlp-service .
docker run -p 8002:8002 nlp-service

# Photo Analysis
cd photo-analysis
docker build -t photo-analysis .
docker run -p 8003:8003 photo-analysis

# Recommendation Service
cd recommendation-service
docker build -t recommendation-service .
docker run -p 8004:8004 recommendation-service
```

### Local Development

For each service:

```bash
cd <service-name>
pip install -r requirements.txt
python main.py
```

## Health Checks

All services expose health check endpoints:

```bash
curl http://localhost:8001/health  # Fraud Detection
curl http://localhost:8002/health  # NLP Service
curl http://localhost:8003/health  # Photo Analysis
curl http://localhost:8004/health  # Recommendation Service
```

## Technology Stack

### Common Technologies
- **FastAPI**: High-performance async web framework
- **Pydantic**: Data validation and settings
- **Python 3.11**: Latest stable Python
- **Docker**: Containerization

### Service-Specific
- **Fraud Detection**: Pattern matching, geolocation algorithms
- **NLP**: Transformers (optional), regex patterns, language models
- **Photo Analysis**: Pillow, OpenCV, image processing algorithms
- **Recommendations**: NumPy, scikit-learn, vector similarity

## Production Enhancements

### Fraud Detection
- Integrate IP reputation APIs (IPQualityScore, MaxMind)
- Use Redis for velocity tracking
- Connect to MongoDB for fraud patterns
- Implement machine learning fraud models

### NLP Service
- Add Hugging Face Transformers models
- Integrate GPT for smart replies
- Use spaCy for advanced NLP
- Implement custom toxicity models

### Photo Analysis
- Integrate face_recognition library
- Use cloud APIs (AWS Rekognition, Azure Vision)
- Add NSFW detection models
- Implement deepfake detection ML models

### Recommendation Service
- Integrate vector databases (Pinecone, FAISS)
- Add collaborative filtering
- Use user behavior tracking
- Implement A/B testing

## API Integration Examples

### Python Client

```python
import httpx

# Fraud check
response = httpx.post(
    "http://localhost:8001/api/fraud/check",
    json={
        "user_id": "user123",
        "ip_address": "192.168.1.1"
    }
)
print(response.json())

# Sentiment analysis
response = httpx.post(
    "http://localhost:8002/api/nlp/sentiment",
    json={"text": "This is amazing!"}
)
print(response.json())

# Photo analysis
response = httpx.post(
    "http://localhost:8003/api/photo/analyze",
    json={"photo_url": "https://example.com/photo.jpg"}
)
print(response.json())

# Get recommendations
response = httpx.post(
    "http://localhost:8004/api/recommend/profiles",
    json={
        "user_id": "user123",
        "user_profile": {...},
        "limit": 10
    }
)
print(response.json())
```

### cURL Examples

```bash
# Fraud check
curl -X POST http://localhost:8001/api/fraud/check \
  -H "Content-Type: application/json" \
  -d '{"user_id":"user123","ip_address":"192.168.1.1"}'

# Toxicity detection
curl -X POST http://localhost:8002/api/nlp/toxicity \
  -H "Content-Type: application/json" \
  -d '{"text":"Your message here"}'

# Photo quality
curl -X POST http://localhost:8003/api/photo/quality \
  -H "Content-Type: application/json" \
  -d '{"photo_url":"https://example.com/photo.jpg"}'

# Compatibility score
curl -X POST http://localhost:8004/api/recommend/compatibility \
  -H "Content-Type: application/json" \
  -d '{"user1_profile":{...},"user2_profile":{...}}'
```

## Monitoring & Observability

All services include:
- Health check endpoints
- Structured logging
- Error handling
- Request/response validation

For production, integrate:
- Prometheus metrics
- Sentry error tracking
- ELK stack for logging
- Grafana dashboards

## Performance Considerations

- **Caching**: Implement Redis for frequently accessed data
- **Rate Limiting**: Prevent API abuse
- **Load Balancing**: Use NGINX or cloud load balancers
- **Async Processing**: Leverage FastAPI's async capabilities
- **Database Optimization**: Use connection pooling
- **CDN**: For image processing services

## Security Best Practices

- API authentication (JWT tokens)
- Rate limiting per endpoint
- Input validation (Pydantic)
- CORS configuration
- HTTPS in production
- Secret management (environment variables)
- Container security scanning

## Deployment

### Kubernetes

Create Kubernetes deployments for each service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fraud-detection
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fraud-detection
  template:
    metadata:
      labels:
        app: fraud-detection
    spec:
      containers:
      - name: fraud-detection
        image: fraud-detection:latest
        ports:
        - containerPort: 8001
```

### Cloud Platforms

- **AWS**: ECS, EKS, or Lambda
- **Google Cloud**: Cloud Run, GKE
- **Azure**: Container Instances, AKS
- **Heroku**: Container deployment

## License

Proprietary - All rights reserved

## Support

For issues, questions, or contributions, refer to individual service README files.

---

**Built with FastAPI, Python 3.11, and modern AI/ML technologies**
