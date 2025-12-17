# Quick Start Guide - Flamoral ML Services

Get up and running with Flamoral's AI/ML services in under 10 minutes!

## Prerequisites

- Python 3.8 or higher
- pip package manager
- (Optional) CUDA for GPU acceleration
- (Optional) Redis for online feature store

## Step 1: Installation

```bash
# Clone the repository (if not already done)
cd DatingPlatform/backend/services/ai-services

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install core dependencies
pip install -r ml-infrastructure/requirements.txt

# Download spaCy language model (for NLP)
python -m spacy download en_core_web_sm
```

## Step 2: Configuration

Create a `.env` file in the `ai-services` directory:

```env
# API Keys (get from OpenAI and Anthropic)
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Redis (optional - for online feature store)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Paths
MODEL_STORAGE_PATH=./models
FEATURE_STORE_PATH=./feature_store
MONITORING_DATA_PATH=./monitoring_data

# Service Configuration
LOG_LEVEL=INFO
USE_GPU=true
```

## Step 3: Quick Test

### Test Photo Analysis

```python
# test_photo_analysis.py
import asyncio
from photo_analysis.services.attractiveness_scorer import AttractivenessScorer

async def test_photo_scoring():
    scorer = AttractivenessScorer()
    await scorer.initialize()

    # Test with a photo URL
    result = await scorer.score(
        photo_url="https://example.com/test-photo.jpg",
        face_info=None  # Will detect face automatically
    )

    print(f"Attractiveness Score: {result['overall_score']}/10")
    print(f"Level: {result['level']}")
    print(f"Confidence: {result['confidence']}")

    await scorer.close()

# Run test
asyncio.run(test_photo_scoring())
```

### Test Bio Generation

```python
# test_bio_generation.py
import asyncio
from nlp_service.services.bio_generator import BioGenerator

async def test_bio_generation():
    generator = BioGenerator(openai_api_key="your-key")
    await generator.initialize()

    user_data = {
        "age": 28,
        "profession": "Software Engineer",
        "interests": ["hiking", "photography"],
        "hobbies": ["cooking", "guitar"],
        "activities": ["rock climbing"]
    }

    suggestions = await generator.generate_bio_suggestions(
        user_data=user_data,
        count=3,
        use_ai=False  # Use templates for quick test
    )

    for i, suggestion in enumerate(suggestions, 1):
        print(f"\nSuggestion {i}:")
        print(suggestion['text'])
        print(f"Quality Score: {suggestion['analysis']['score']}/100")

    await generator.close()

asyncio.run(test_bio_generation())
```

### Test Compatibility Prediction

```python
# test_compatibility.py
import asyncio
from recommendation_service.services.compatibility_predictor import CompatibilityPredictor

async def test_compatibility():
    predictor = CompatibilityPredictor()
    await predictor.initialize()

    user1 = {
        "user_id": "user1",
        "age": 28,
        "gender": "male",
        "interests": ["hiking", "photography", "cooking"],
        "hobbies": ["guitar", "reading"],
        "relationship_goal": "long_term",
        "location": {"city": "San Francisco", "lat": 37.7749, "lon": -122.4194}
    }

    user2 = {
        "user_id": "user2",
        "age": 26,
        "gender": "female",
        "interests": ["hiking", "travel", "cooking"],
        "hobbies": ["yoga", "photography"],
        "relationship_goal": "long_term",
        "location": {"city": "San Francisco", "lat": 37.7749, "lon": -122.4194}
    }

    result = await predictor.predict_compatibility(
        user1_profile=user1,
        user2_profile=user2,
        include_breakdown=True
    )

    print(f"Compatibility Score: {result['compatibility_score']}/100")
    print(f"Level: {result['level']}")
    print(f"Confidence: {result['confidence']}")
    print("\nInsights:")
    for insight in result['insights']:
        print(f"  - {insight}")

    await predictor.close()

asyncio.run(test_compatibility())
```

### Test Conversation Starters

```python
# test_conversation_starters.py
import asyncio
from nlp_service.services.conversation_starter_generator import ConversationStarterGenerator

async def test_starters():
    generator = ConversationStarterGenerator()
    await generator.initialize()

    sender = {
        "user_id": "user1",
        "interests": ["hiking", "photography"],
        "hobbies": ["cooking"]
    }

    recipient = {
        "user_id": "user2",
        "bio": "Love outdoor adventures and trying new restaurants!",
        "interests": ["hiking", "travel", "food"],
        "hobbies": ["photography", "cooking"],
        "prompts": [
            {"question": "My ideal weekend", "answer": "Hiking followed by trying a new restaurant"}
        ]
    }

    starters = await generator.generate_starters(
        sender_profile=sender,
        recipient_profile=recipient,
        count=5,
        use_ai=False,  # Use templates for quick test
        style="balanced"
    )

    print("Top 5 Conversation Starters:\n")
    for i, starter in enumerate(starters, 1):
        print(f"{i}. {starter['text']}")
        print(f"   Category: {starter['category']}")
        print(f"   Score: {starter['score']:.1f}\n")

    await generator.close()

asyncio.run(test_starters())
```

### Test Fraud Detection

```python
# test_fraud_detection.py
import asyncio
from fraud_detection.fraud_detector import FraudDetector
from datetime import datetime, timedelta

async def test_fraud_detection():
    detector = FraudDetector()
    await detector.initialize()

    # Legitimate user
    legitimate_user = {
        "user_id": "user123",
        "bio": "Software engineer who loves hiking and photography. Looking for meaningful connections!",
        "photos": [
            {"has_face": True, "is_ai_generated": False, "upload_time": (datetime.now() - timedelta(days=5)).isoformat()},
            {"has_face": True, "is_ai_generated": False, "upload_time": (datetime.now() - timedelta(days=3)).isoformat()}
        ],
        "message_history": [],
        "login_history": [
            {"timestamp": datetime.now().isoformat(), "location": "San Francisco"}
        ],
        "created_at": (datetime.now() - timedelta(days=30)).isoformat(),
        "response_rate": 0.75
    }

    result = await detector.detect_fraud(legitimate_user)

    print(f"Risk Score: {result['risk_score']}/100")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Is Suspicious: {result['is_suspicious']}")
    print(f"Requires Review: {result['requires_review']}")
    if result['flags']:
        print(f"Flags: {', '.join(result['flags'])}")

    await detector.close()

asyncio.run(test_fraud_detection())
```

## Step 4: Run ML Infrastructure

### Initialize Feature Store

```python
# init_feature_store.py
import asyncio
from ml_infrastructure.feature_store import FeatureStore, FeatureDefinition, FeatureType, FeatureStorageType, FeatureGroup

async def setup_feature_store():
    store = FeatureStore()
    await store.initialize()

    # Register features
    features = [
        FeatureDefinition(
            name="user_age_normalized",
            feature_type=FeatureType.NUMERIC,
            storage_type=FeatureStorageType.BOTH,
            description="User age normalized to 0-1 range",
            source="user_profile"
        ),
        FeatureDefinition(
            name="interest_count",
            feature_type=FeatureType.NUMERIC,
            storage_type=FeatureStorageType.BOTH,
            description="Number of interests",
            source="user_profile"
        ),
        FeatureDefinition(
            name="response_rate",
            feature_type=FeatureType.NUMERIC,
            storage_type=FeatureStorageType.BOTH,
            description="User response rate to messages",
            source="user_behavior"
        )
    ]

    for feature in features:
        store.register_feature(feature)
        print(f"Registered: {feature.name}")

    # Register feature group
    group = FeatureGroup(
        name="user_profile_features",
        features=["user_age_normalized", "interest_count", "response_rate"],
        entity_type="user",
        description="Core user profile features"
    )
    store.register_feature_group(group)
    print(f"Registered group: {group.name}")

    await store.close()
    print("\nFeature store initialized successfully!")

asyncio.run(setup_feature_store())
```

### Setup ML Monitoring

```python
# init_monitoring.py
import asyncio
import numpy as np
from ml_infrastructure.ml_monitoring import MLMonitoring

async def setup_monitoring():
    monitoring = MLMonitoring()
    await monitoring.initialize()

    # Setup monitoring for compatibility model
    monitoring.setup_model_monitoring(
        model_id="compatibility_v1",
        reference_data={
            "age": np.random.randint(18, 65, 1000),
            "interests_count": np.random.randint(0, 20, 1000)
        },
        reference_predictions=np.random.uniform(0, 1, 1000),
        baseline_metrics={
            "accuracy": 0.82,
            "f1_score": 0.79,
            "precision": 0.81,
            "recall": 0.77
        }
    )

    print("Monitoring setup complete for compatibility_v1")

    # Get initial health status
    health = monitoring.get_model_health("compatibility_v1")
    print(f"\nModel Health Status: {health['status']}")

    await monitoring.close()

asyncio.run(setup_monitoring())
```

### Create A/B Test Experiment

```python
# create_ab_test.py
import asyncio
from ml_infrastructure.ab_testing_framework import ABTestingFramework

async def create_experiment():
    framework = ABTestingFramework()
    await framework.initialize()

    # Create experiment
    experiment = framework.create_experiment(
        name="Compatibility Model V2 Test",
        description="Testing improved compatibility prediction model",
        variants=[
            {
                "name": "control",
                "variant_type": "control",
                "traffic_allocation": 0.5,
                "model_config": {"model_version": "v1.0", "threshold": 0.7}
            },
            {
                "name": "treatment",
                "variant_type": "treatment",
                "traffic_allocation": 0.5,
                "model_config": {"model_version": "v2.0", "threshold": 0.65}
            }
        ],
        metrics=[
            {
                "name": "match_rate",
                "metric_type": "conversion",
                "primary": True
            },
            {
                "name": "conversation_rate",
                "metric_type": "conversion",
                "primary": False
            }
        ],
        target_sample_size=1000
    )

    print(f"Created experiment: {experiment.experiment_id}")
    print(f"Name: {experiment.name}")
    print(f"Status: {experiment.status}")

    # Start experiment
    framework.start_experiment(experiment.experiment_id)
    print(f"\nExperiment started!")

    # Test variant assignment
    for i in range(5):
        user_id = f"test_user_{i}"
        variant = framework.assign_variant(experiment.experiment_id, user_id)
        print(f"User {user_id} assigned to: {variant['variant_name']}")

    await framework.close()

asyncio.run(create_experiment())
```

## Step 5: Start Services

### Start All Services

```bash
# Terminal 1: Photo Analysis Service
cd photo-analysis
python main.py

# Terminal 2: NLP Service
cd nlp-service
python main.py

# Terminal 3: Recommendation Service
cd recommendation-service
python main.py

# Terminal 4: Fraud Detection (if separate)
cd fraud-detection
python main.py
```

### Test Service Endpoints

```bash
# Health checks
curl http://localhost:8003/health  # Photo Analysis
curl http://localhost:8002/health  # NLP Service
curl http://localhost:8004/health  # Recommendation Service

# Test photo analysis
curl -X POST http://localhost:8003/api/photo/analyze \
  -H "Content-Type: application/json" \
  -d '{"photo_url": "https://example.com/photo.jpg"}'

# Test bio generation
curl -X POST http://localhost:8002/api/nlp/generate-bio \
  -H "Content-Type: application/json" \
  -d '{
    "user_data": {
      "age": 28,
      "profession": "Engineer",
      "interests": ["hiking", "photography"]
    }
  }'
```

## Step 6: Integration with Main Platform

### Example FastAPI Integration

```python
# In your main application
from fastapi import FastAPI
import httpx

app = FastAPI()

# Photo analysis client
PHOTO_SERVICE_URL = "http://localhost:8003"

@app.post("/upload-photo")
async def upload_photo(photo_url: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{PHOTO_SERVICE_URL}/api/photo/analyze",
            json={"photo_url": photo_url}
        )
        return response.json()

# Bio generation client
NLP_SERVICE_URL = "http://localhost:8002"

@app.post("/generate-bio")
async def generate_bio(user_data: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{NLP_SERVICE_URL}/api/nlp/generate-bio",
            json={"user_data": user_data}
        )
        return response.json()

# Compatibility check client
RECOMMENDATION_URL = "http://localhost:8004"

@app.post("/check-compatibility")
async def check_compatibility(user1_id: str, user2_id: str):
    # Fetch user profiles
    user1_profile = get_user_profile(user1_id)
    user2_profile = get_user_profile(user2_id)

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{RECOMMENDATION_URL}/api/recommend/compatibility",
            json={
                "user1_profile": user1_profile,
                "user2_profile": user2_profile
            }
        )
        return response.json()
```

## Common Issues & Solutions

### Issue: CUDA/GPU Not Found

```bash
# Check CUDA availability
python -c "import torch; print(torch.cuda.is_available())"

# If False, either:
# 1. Install CUDA-enabled PyTorch
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# 2. Or disable GPU in .env
USE_GPU=false
```

### Issue: OpenAI API Rate Limits

```python
# Use exponential backoff
from openai import AsyncOpenAI
import asyncio

async def call_with_retry(client, max_retries=3):
    for i in range(max_retries):
        try:
            response = await client.chat.completions.create(...)
            return response
        except Exception as e:
            if i < max_retries - 1:
                await asyncio.sleep(2 ** i)  # Exponential backoff
            else:
                raise
```

### Issue: Redis Connection Failed

```python
# Feature store will fall back to local cache if Redis unavailable
# Or install and start Redis:

# Windows:
# Download from: https://github.com/microsoftarchive/redis/releases

# Linux:
sudo apt-get install redis-server
sudo systemctl start redis

# Mac:
brew install redis
brew services start redis
```

## Next Steps

1. **Explore API Documentation**: Visit `http://localhost:8003/docs` for each service
2. **Train Custom Models**: See ML_SERVICES_COMPLETE_README.md section on "Model Training"
3. **Setup Monitoring**: Implement the monitoring dashboard in your admin panel
4. **Configure A/B Tests**: Create experiments for new features
5. **Optimize Performance**: Profile services and add caching where needed

## Resources

- Full Documentation: `ML_SERVICES_COMPLETE_README.md`
- API Reference: Access `/docs` endpoint on each service
- Model Training: `ml-infrastructure/training_pipeline.py`
- Examples: `examples/` directory

## Support

For issues or questions:
- Check service logs in `logs/` directory
- Review monitoring dashboard for model health
- Consult the full documentation

---

**Congratulations!** You now have a fully functional AI/ML stack for the Flamoral dating platform.
