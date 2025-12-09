# Quick Start Guide - AI Content Enhancement Services

Get up and running with Flamoral's AI Content Enhancement Services in minutes.

## Prerequisites

- Python 3.11+
- Docker (optional, for containerized setup)
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- PostgreSQL, MongoDB, Redis (for NLP service)

## 5-Minute Setup (Local Development)

### Step 1: Clone and Navigate

```bash
cd backend/services/ai-services
```

### Step 2: Choose Your Service

#### Option A: Content Generator (Simplest - Start Here!)

```bash
cd content-generator

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env and add your OpenAI API key:
# OPENAI_API_KEY=sk-your-key-here

# Run
uvicorn app.main:app --reload --port 8087
```

**Test it**:
```bash
curl http://localhost:8087/health
```

#### Option B: Enhanced NLP Service

```bash
cd nlp-service

# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements_enhanced.txt

# Download NLTK data
python -c "import nltk; nltk.download('punkt'); nltk.download('stopwords'); nltk.download('wordnet')"

# Configure
cp .env.example .env
# Add your OpenAI API key and database URLs

# Run
uvicorn app.main_v2:app --reload --port 8085
```

#### Option C: Enhanced Photo Analysis

```bash
cd photo-analysis

# Setup
python -m venv venv
source venv/bin/activate
pip install -r requirements_enhanced.txt

# Configure
cp .env.example .env

# Run
uvicorn main:app --reload --port 8003
```

### Step 3: Test an API Endpoint

**Generate an Ice-breaker** (Content Generator):

```bash
curl -X POST http://localhost:8087/api/v1/icebreakers/generate \
  -H "Content-Type: application/json" \
  -d '{
    "match_profile": {
      "bio": "Love hiking and good coffee",
      "interests": ["hiking", "coffee", "travel"]
    },
    "count": 3,
    "style": "friendly"
  }'
```

**Generate a Bio** (NLP Service):

```bash
curl -X POST http://localhost:8085/api/v1/nlp/bio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "user_data": {
      "occupation": "Software Engineer",
      "interests": ["hiking", "photography"],
      "hobbies": ["rock climbing"],
      "values": ["authenticity", "adventure"]
    },
    "tone": "friendly"
  }'
```

## Docker Setup (Recommended for Testing)

### Quick Docker Run

```bash
# Content Generator
cd content-generator
docker build -t flamoral/content-generator:v1.0 .
docker run -p 8087:8087 -e OPENAI_API_KEY=your-key flamoral/content-generator:v1.0

# NLP Service
cd nlp-service
docker build -f Dockerfile.enhanced -t flamoral/nlp-service:v2.0 .
docker run -p 8085:8085 -e OPENAI_API_KEY=your-key flamoral/nlp-service:v2.0

# Photo Analysis
cd photo-analysis
docker build -f Dockerfile.enhanced -t flamoral/photo-analysis:v2.0 .
docker run -p 8003:8003 flamoral/photo-analysis:v2.0
```

### Docker Compose (All Services)

Create `docker-compose-ai.yml`:

```yaml
version: '3.8'

services:
  nlp-service:
    build:
      context: ./nlp-service
      dockerfile: Dockerfile.enhanced
    ports:
      - "8085:8085"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ENVIRONMENT=development
    depends_on:
      - postgres
      - mongodb
      - redis

  photo-analysis:
    build:
      context: ./photo-analysis
      dockerfile: Dockerfile.enhanced
    ports:
      - "8003:8003"
    environment:
      - ENVIRONMENT=development

  content-generator:
    build:
      context: ./content-generator
    ports:
      - "8087:8087"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ENVIRONMENT=development

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: flamoral
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Run:
```bash
export OPENAI_API_KEY=your-key-here
docker-compose -f docker-compose-ai.yml up
```

## Kubernetes Setup (Production)

### Prerequisites
- kubectl configured
- Kubernetes cluster access

### Quick Deploy

```bash
# Create namespace
kubectl create namespace flamoral

# Create secrets
kubectl create secret generic ai-services-secrets \
  --from-literal=openai-api-key=your-key-here \
  -n flamoral

# Deploy
kubectl apply -f k8s-manifests.yaml

# Check status
kubectl get pods -n flamoral
kubectl get services -n flamoral

# Check logs
kubectl logs -f deployment/content-generator -n flamoral
```

### Verify Deployment

```bash
# Port forward to test
kubectl port-forward svc/content-generator 8087:8087 -n flamoral

# Test
curl http://localhost:8087/health
```

## Testing the APIs

### Python Example

```python
import httpx
import asyncio

async def test_apis():
    async with httpx.AsyncClient() as client:
        # Generate ice-breaker
        response = await client.post(
            "http://localhost:8087/api/v1/icebreakers/generate",
            json={
                "match_profile": {
                    "bio": "Adventure seeker who loves hiking",
                    "interests": ["hiking", "photography", "travel"]
                },
                "count": 5,
                "style": "friendly"
            }
        )
        print("Ice-breakers:", response.json())

        # Generate bio
        response = await client.post(
            "http://localhost:8085/api/v1/nlp/bio/generate",
            json={
                "user_data": {
                    "occupation": "Teacher",
                    "interests": ["reading", "yoga", "cooking"],
                    "values": ["kindness", "growth"]
                },
                "tone": "friendly"
            }
        )
        print("Generated Bio:", response.json())

asyncio.run(test_apis())
```

### JavaScript Example

```javascript
// Generate date ideas
const response = await fetch('http://localhost:8087/api/v1/date-ideas/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    profile1: {
      interests: ['hiking', 'coffee', 'art']
    },
    profile2: {
      interests: ['hiking', 'music', 'food']
    },
    preferences: {
      budget: 'moderate',
      location_type: 'urban'
    }
  })
});

const dateIdeas = await response.json();
console.log('Date Ideas:', dateIdeas);
```

### cURL Examples

```bash
# Generate compliments
curl -X POST http://localhost:8087/api/v1/compliments/generate \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "bio": "Passionate about environmental conservation",
      "interests": ["sustainability", "volunteering"]
    },
    "compliment_type": "personality",
    "count": 5
  }'

# Analyze profile completeness
curl -X POST http://localhost:8085/api/v1/nlp/profile/analyze-completeness \
  -H "Content-Type: application/json" \
  -d '{
    "profile_data": {
      "bio": "Love adventure and trying new things",
      "photos": [{"url": "...", "verified": true}],
      "interests": ["travel", "cooking", "hiking"],
      "prompts": [{"question": "Q", "answer": "A"}]
    }
  }'

# Translate text
curl -X POST http://localhost:8085/api/v1/nlp/translation/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, how are you?",
    "target_language": "es"
  }'
```

## Common Issues & Quick Fixes

### "OpenAI API key not found"
```bash
# Make sure it's in your .env file:
echo "OPENAI_API_KEY=sk-your-key" >> .env

# Or export it:
export OPENAI_API_KEY=sk-your-key
```

### "Module not found" errors
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### "Connection refused" (NLP service)
```bash
# Start required databases first:
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15-alpine
docker run -d -p 27017:27017 mongo:7
docker run -d -p 6379:6379 redis:7-alpine
```

### "Port already in use"
```bash
# Kill the process using the port:
# On Linux/Mac:
lsof -ti:8087 | xargs kill -9

# On Windows:
netstat -ano | findstr :8087
taskkill /PID <PID> /F
```

## API Documentation

Once services are running, visit:
- Content Generator: http://localhost:8087/docs
- NLP Service: http://localhost:8085/docs
- Photo Analysis: http://localhost:8003/docs

FastAPI auto-generates interactive Swagger documentation!

## Next Steps

1. **Read the Full Documentation**
   - See `AI_CONTENT_ENHANCEMENT_README.md` for comprehensive guide
   - Check `IMPLEMENTATION_SUMMARY.md` for technical details

2. **Configure for Your Environment**
   - Adjust `.env` files for your setup
   - Set up proper database connections
   - Configure monitoring

3. **Integrate with Your App**
   - Add API calls to your frontend
   - Implement authentication
   - Add error handling

4. **Deploy to Production**
   - Follow Kubernetes deployment guide
   - Set up monitoring and alerts
   - Configure auto-scaling

## Useful Commands

```bash
# Check service health
curl http://localhost:8087/health
curl http://localhost:8085/health
curl http://localhost:8003/health

# View logs
docker logs -f <container-id>
kubectl logs -f deployment/content-generator -n flamoral

# Restart services
docker-compose restart
kubectl rollout restart deployment/content-generator -n flamoral

# Scale services
kubectl scale deployment/content-generator --replicas=3 -n flamoral
```

## Getting Help

- **Documentation**: See README files in each service directory
- **API Docs**: Visit `/docs` endpoint on each service
- **Issues**: Check logs for detailed error messages
- **Support**: Contact the team or open a GitHub issue

## Quick Reference Card

| Service | Port | Main Purpose | Key Endpoint |
|---------|------|--------------|--------------|
| Content Generator | 8087 | Generate ice-breakers, date ideas, etc. | `/api/v1/icebreakers/generate` |
| NLP Service | 8085 | Bio generation, profile optimization | `/api/v1/nlp/bio/generate` |
| Photo Analysis | 8003 | Photo quality & background analysis | `/api/v1/photo/quality/score` |

## Success Checklist

- [ ] Services running locally
- [ ] API endpoints responding
- [ ] OpenAI API key configured
- [ ] Test requests working
- [ ] Documentation reviewed
- [ ] Ready to integrate!

---

**Need more help?** Check the comprehensive documentation in `AI_CONTENT_ENHANCEMENT_README.md`

**Ready for production?** See deployment guide in `IMPLEMENTATION_SUMMARY.md`
