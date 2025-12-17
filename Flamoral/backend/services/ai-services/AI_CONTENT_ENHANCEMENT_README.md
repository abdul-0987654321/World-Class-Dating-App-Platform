# Flamoral AI Content Enhancement Services

Comprehensive AI-powered content enhancement features for the Flamoral Dating Platform, including bio generation, profile optimization, conversation analysis, sentiment analysis, translation, photo analysis, and content generation.

## Overview

This package includes three enhanced/new AI services:

1. **Enhanced NLP Service** (`nlp-service`) - v2.0
2. **Enhanced Photo Analysis Service** (`photo-analysis`) - v2.0
3. **New Content Generator Service** (`content-generator`) - v1.0

## Services Architecture

### 1. Enhanced NLP Service (Port 8085)

Advanced natural language processing with new features:

#### New Features

**Bio Generation & Enhancement**
- AI-powered bio generation from user data using GPT-4
- Bio enhancement with specific improvement goals
- Bio quality analysis and suggestions
- Multiple tone options (friendly, professional, humorous, romantic, adventurous)

**Profile Optimization**
- Complete profile analysis with scoring
- Visibility optimization recommendations
- Profile insights and analytics
- Comparison with successful profiles
- Personalized improvement suggestions

**Compatibility Analysis**
- Conversation-based compatibility scoring
- Response dynamics analysis
- Communication style matching
- Topic alignment detection
- Red flags and green flags identification
- Conversation success prediction

**Sentiment Analysis**
- Message tone and sentiment detection
- Emotional state tracking
- Conversation sentiment flow analysis
- Dating-context appropriateness assessment

**Translation Support**
- Multi-language translation (15+ languages)
- Conversation translation
- Language detection
- Multilingual profile analysis
- Cross-language communication suggestions

#### API Endpoints

```
POST /api/v1/nlp/bio/generate - Generate bio from user data
POST /api/v1/nlp/bio/enhance - Enhance existing bio
POST /api/v1/nlp/bio/suggestions - Get bio improvement suggestions

POST /api/v1/nlp/profile/analyze-completeness - Analyze profile completeness
POST /api/v1/nlp/profile/optimize-visibility - Get visibility optimization tips
POST /api/v1/nlp/profile/insights - Generate profile insights
POST /api/v1/nlp/profile/compare - Compare with successful profiles

POST /api/v1/nlp/compatibility/analyze - Analyze conversation compatibility
POST /api/v1/nlp/compatibility/predict-success - Predict conversation success

POST /api/v1/nlp/sentiment/analyze-message - Analyze message tone
POST /api/v1/nlp/sentiment/analyze-conversation - Analyze conversation sentiment flow
POST /api/v1/nlp/sentiment/detect-emotional-state - Detect emotional state

POST /api/v1/nlp/translation/translate - Translate text
POST /api/v1/nlp/translation/translate-conversation - Translate conversation
POST /api/v1/nlp/translation/detect-language - Detect language
POST /api/v1/nlp/translation/analyze-multilingual-profile - Analyze multilingual profile
GET  /api/v1/nlp/translation/suggestions/{user_lang}/{match_lang} - Get translation suggestions
```

### 2. Enhanced Photo Analysis Service (Port 8003)

Advanced photo analysis with new features:

#### New Features

**Photo Quality Scoring**
- Comprehensive quality metrics (resolution, sharpness, brightness, contrast, color balance, noise, composition)
- Overall quality score (0-100)
- Quality level classification (excellent, good, fair, poor)
- Improvement suggestions
- Multi-photo comparison and ranking

**Background Analysis**
- Background type detection (plain, simple, moderate, busy, cluttered)
- Background quality assessment
- Distraction level analysis
- Setting type determination (indoor, outdoor, nature, etc.)
- Color analysis
- Appropriateness checking
- Background improvement suggestions

**Photo Ordering Optimization**
- AI-powered photo sequencing
- Profile strength calculation
- Photo type identification (portrait, full-body, activity, group, travel)
- Optimal ordering based on dating app best practices
- Reasoning for each position

#### API Endpoints

```
POST /api/v1/photo/quality/score - Score photo quality
POST /api/v1/photo/quality/compare - Compare multiple photos

POST /api/v1/photo/background/analyze - Analyze photo background
POST /api/v1/photo/background/improvements - Suggest background improvements
POST /api/v1/photo/background/compare - Compare backgrounds across photos

POST /api/v1/photo/ordering/optimize - Optimize photo order
POST /api/v1/photo/ordering/analyze-strength - Analyze profile photo strength
```

### 3. Content Generator Service (Port 8087)

New service for generating personalized dating content:

#### Features

**Ice-breaker Generation**
- Personalized ice-breaker messages
- Multiple style options (friendly, humorous, thoughtful, flirty, casual)
- Context-specific ice-breakers
- Quality scoring and ranking
- Profile-specific personalization

**Date Idea Generation**
- Personalized date suggestions based on both profiles
- Shared interest consideration
- Budget and location preferences
- Diverse date types (first date, activity, unique, low-key, adventurous)
- Explanation of why each idea works

**Gift Recommendations**
- Thoughtful gift suggestions based on recipient profile
- Occasion-appropriate (birthday, anniversary, casual, etc.)
- Budget-conscious recommendations
- Relationship stage awareness (early, developing, established)
- Gift-giving tips for each stage

**Compliment Generation**
- Genuine, specific compliments
- Multiple types (general, appearance, interests, personality, accomplishments)
- Profile-based personalization
- Avoids clichés and generic statements
- Respectful and appropriate

**Conversation Topic Suggestions**
- Context-aware topic recommendations
- Conversation history analysis
- Stage-appropriate topics (early, developing, established)
- Avoids repeated topics
- Open-ended questions included
- Conversation tips for each stage

#### API Endpoints

```
POST /api/v1/icebreakers/generate - Generate ice-breaker messages
POST /api/v1/date-ideas/generate - Generate date ideas
POST /api/v1/gifts/recommend - Recommend gifts
POST /api/v1/compliments/generate - Generate compliments
POST /api/v1/topics/suggest - Suggest conversation topics
```

## Technology Stack

### NLP Service
- FastAPI for API framework
- OpenAI GPT-4 for content generation
- Transformers (Hugging Face) for sentiment analysis
- sentence-transformers for embeddings
- langdetect for language detection
- NLTK, spaCy, TextBlob for NLP processing
- PostgreSQL, MongoDB, Redis for data storage

### Photo Analysis Service
- FastAPI for API framework
- OpenCV for image processing
- PIL (Pillow) for image manipulation
- face-recognition for face detection
- PyTorch, torchvision for ML models
- scikit-image for advanced image analysis

### Content Generator Service
- FastAPI for API framework
- OpenAI GPT-4 for content generation
- Structured logging and monitoring

## Setup & Installation

### Prerequisites
- Python 3.11+
- Docker & Docker Compose (for containerized deployment)
- Kubernetes (for production deployment)
- OpenAI API key (required for GPT-powered features)
- PostgreSQL, MongoDB, Redis (for NLP service)

### Local Development Setup

#### 1. NLP Service

```bash
cd backend/services/ai-services/nlp-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements_enhanced.txt

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

# Configure environment
cp .env.example .env
# Edit .env with your API keys and configuration

# Run service
uvicorn app.main_v2:app --reload --port 8085
```

#### 2. Photo Analysis Service

```bash
cd backend/services/ai-services/photo-analysis

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements_enhanced.txt

# Configure environment
cp .env.example .env

# Run service
uvicorn main:app --reload --port 8003
```

#### 3. Content Generator Service

```bash
cd backend/services/ai-services/content-generator

# Create virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Add your OpenAI API key

# Run service
uvicorn app.main:app --reload --port 8087
```

### Docker Deployment

Build and run with Docker:

```bash
# NLP Service
cd backend/services/ai-services/nlp-service
docker build -f Dockerfile.enhanced -t flamoral/nlp-service:v2.0 .
docker run -p 8085:8085 --env-file .env flamoral/nlp-service:v2.0

# Photo Analysis Service
cd backend/services/ai-services/photo-analysis
docker build -f Dockerfile.enhanced -t flamoral/photo-analysis:v2.0 .
docker run -p 8003:8003 flamoral/photo-analysis:v2.0

# Content Generator Service
cd backend/services/ai-services/content-generator
docker build -t flamoral/content-generator:v1.0 .
docker run -p 8087:8087 --env-file .env flamoral/content-generator:v1.0
```

### Kubernetes Deployment

Deploy to Kubernetes cluster:

```bash
# Create namespace
kubectl create namespace flamoral

# Create secrets (encode your keys with base64)
echo -n "your-openai-api-key" | base64
kubectl apply -f k8s-manifests.yaml

# Verify deployments
kubectl get pods -n flamoral
kubectl get services -n flamoral

# Check logs
kubectl logs -f deployment/nlp-service-enhanced -n flamoral
kubectl logs -f deployment/photo-analysis-enhanced -n flamoral
kubectl logs -f deployment/content-generator -n flamoral
```

## Configuration

### Required API Keys

1. **OpenAI API Key** (Required for GPT-powered features)
   - Sign up at https://platform.openai.com
   - Generate API key
   - Add to environment: `OPENAI_API_KEY=sk-...`

2. **Translation API** (Optional, for translation features)
   - Google Cloud Translation API
   - DeepL API
   - Azure Translator
   - Configure preferred provider in `TRANSLATION_PROVIDER`

### Environment Variables

Key configuration variables:

```bash
# API Keys
OPENAI_API_KEY=your_key_here
GOOGLE_TRANSLATE_API_KEY=your_key_here  # Optional
DEEPL_API_KEY=your_key_here  # Optional

# Feature Flags (NLP Service)
ENABLE_BIO_GENERATION=true
ENABLE_PROFILE_OPTIMIZATION=true
ENABLE_COMPATIBILITY_ANALYSIS=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_TRANSLATION=true

# Model Configuration
GPT_MODEL=gpt-4-turbo-preview
GPT_MAX_TOKENS=2000
GPT_TEMPERATURE=0.7

# Rate Limiting
RATE_LIMIT_BIO_GENERATION=10  # per hour
RATE_LIMIT_TRANSLATION=100  # per hour
RATE_LIMIT_ANALYSIS=50  # per hour
```

## API Usage Examples

### Generate Bio

```python
import httpx

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8085/api/v1/nlp/bio/generate",
        json={
            "user_data": {
                "occupation": "Software Engineer",
                "interests": ["hiking", "photography", "cooking"],
                "hobbies": ["rock climbing", "travel"],
                "values": ["authenticity", "adventure"],
                "looking_for": "meaningful connections"
            },
            "tone": "friendly",
            "max_length": 200
        }
    )
    result = response.json()
    print(result["primary_bio"])
```

### Analyze Profile Completeness

```python
response = await client.post(
    "http://localhost:8085/api/v1/nlp/profile/analyze-completeness",
    json={
        "profile_data": {
            "bio": "Love hiking and good coffee...",
            "photos": [{"url": "...", "verified": true}],
            "interests": ["hiking", "coffee", "travel"],
            "prompts": [{"question": "...", "answer": "..."}],
            "preferences": {"age_range": "25-35"}
        }
    }
)
```

### Generate Ice-breakers

```python
response = await client.post(
    "http://localhost:8087/api/v1/icebreakers/generate",
    json={
        "match_profile": {
            "bio": "Adventure seeker and coffee enthusiast",
            "interests": ["hiking", "travel", "photography"]
        },
        "count": 5,
        "style": "friendly"
    }
)
icebreakers = response.json()["icebreakers"]
```

### Score Photo Quality

```python
response = await client.post(
    "http://localhost:8003/api/v1/photo/quality/score",
    json={
        "photo_url": "https://example.com/photo.jpg"
    }
)
quality = response.json()
print(f"Quality Score: {quality['overall_score']}/100")
print(f"Level: {quality['quality_level']}")
```

## Performance Considerations

### Resource Requirements

**NLP Service**
- Memory: 2-4GB per instance
- CPU: 1-2 cores
- GPU: Optional (improves ML model performance)

**Photo Analysis Service**
- Memory: 3-6GB per instance
- CPU: 1.5-3 cores
- GPU: Recommended for faster processing

**Content Generator Service**
- Memory: 1-2GB per instance
- CPU: 0.5-1 core
- Lightweight, API-dependent

### Scaling

All services include:
- Horizontal Pod Autoscaling (HPA) configured
- Load balancing ready
- Stateless design for easy scaling
- Health checks and readiness probes

## Monitoring & Logging

### Health Endpoints

- `/health` - Service health check
- `/ready` - Readiness check
- `/metrics` - Prometheus metrics

### Structured Logging

All services use structured logging (JSON format):

```json
{
  "timestamp": "2025-01-15T10:30:45Z",
  "level": "INFO",
  "service": "nlp-service",
  "event": "bio_generation",
  "user_id": "12345",
  "duration_ms": 1234
}
```

### Metrics

Prometheus metrics available:
- Request count and latency
- Error rates
- AI model inference time
- API rate limiting stats

## Security

### API Authentication

Services support JWT authentication:

```python
headers = {
    "Authorization": f"Bearer {jwt_token}"
}
```

### Secrets Management

- API keys stored in Kubernetes secrets
- Environment-based configuration
- No hardcoded credentials

### Data Privacy

- No PII logged
- API requests sanitized
- Compliance with data protection regulations

## Testing

### Unit Tests

```bash
# Run unit tests
pytest tests/unit -v

# With coverage
pytest tests/unit --cov=app --cov-report=html
```

### Integration Tests

```bash
# Run integration tests
pytest tests/integration -v
```

### Load Testing

```bash
# Using locust
locust -f tests/load/locustfile.py --host=http://localhost:8085
```

## Troubleshooting

### Common Issues

**Issue: OpenAI API key not working**
- Solution: Verify key is correct and has sufficient credits
- Check: `OPENAI_API_KEY` environment variable is set

**Issue: Models not loading**
- Solution: Increase startup timeout in health checks
- Check: Sufficient memory allocated

**Issue: Translation not working**
- Solution: Ensure translation API key is configured
- Check: `TRANSLATION_PROVIDER` setting matches available key

**Issue: Photo analysis fails**
- Solution: Verify OpenCV dependencies installed
- Check: Image URL is accessible

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=DEBUG
DEBUG=true
```

## Cost Optimization

### OpenAI API Usage

- Use caching for repeated requests
- Implement rate limiting
- Monitor token usage
- Consider using gpt-3.5-turbo for less critical features

### Resource Optimization

- Scale down during low-traffic periods
- Use spot instances for non-critical workloads
- Implement request batching
- Cache frequent requests

## Roadmap

### Planned Features

- [ ] Voice message analysis
- [ ] Video profile analysis
- [ ] Multi-modal compatibility scoring
- [ ] Advanced personalization with user feedback
- [ ] A/B testing framework for content generation
- [ ] Real-time language translation in chat
- [ ] Photo style recommendations
- [ ] Profile photo AI enhancement

## Contributing

When contributing new features:

1. Follow existing code structure
2. Add comprehensive tests
3. Update documentation
4. Include API examples
5. Ensure backward compatibility

## Support

For issues or questions:
- GitHub Issues: [link]
- Documentation: [link]
- Email: support@flamoral.com

## License

Copyright (c) 2025 Flamoral Dating Platform
All rights reserved.

---

## Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies (`pip install -r requirements.txt`)
- [ ] Configure environment variables (`.env`)
- [ ] Obtain OpenAI API key
- [ ] Run database migrations (NLP service)
- [ ] Start services
- [ ] Test endpoints
- [ ] Deploy to Kubernetes (production)
- [ ] Configure monitoring
- [ ] Set up alerts

## API Rate Limits

Default limits per user:
- Bio Generation: 10/hour
- Profile Analysis: 50/hour
- Translation: 100/hour
- Ice-breakers: 50/hour
- Photo Analysis: 100/hour

Limits can be adjusted via environment variables.

---

**Version**: 1.0.0
**Last Updated**: January 2025
**Status**: Production Ready
