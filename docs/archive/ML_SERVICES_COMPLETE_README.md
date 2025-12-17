# Flamoral Dating Platform - Complete AI/ML Services

This document provides a comprehensive overview of all AI/ML services implemented for the Flamoral Dating Platform.

## Table of Contents

1. [Overview](#overview)
2. [Service Architecture](#service-architecture)
3. [Core ML Services](#core-ml-services)
4. [ML Infrastructure](#ml-infrastructure)
5. [Installation & Setup](#installation--setup)
6. [Usage Examples](#usage-examples)
7. [Model Training](#model-training)
8. [Monitoring & Operations](#monitoring--operations)

---

## Overview

The Flamoral platform features a comprehensive AI/ML stack that powers:

- Photo analysis and attractiveness scoring
- Profile content generation and optimization
- Intelligent matchmaking and recommendations
- Fraud detection and safety
- A/B testing and continuous improvement

### Key Technologies

- **Deep Learning**: PyTorch for neural networks
- **Machine Learning**: scikit-learn for traditional ML algorithms
- **NLP**: OpenAI GPT-4, Anthropic Claude for text generation
- **Computer Vision**: ResNet, custom CNN models
- **Feature Engineering**: Custom feature store with online/offline storage
- **Monitoring**: Statistical drift detection, performance tracking

---

## Service Architecture

```
ai-services/
├── photo-analysis/              # Photo analysis & attractiveness scoring
│   ├── services/
│   │   ├── attractiveness_scorer.py
│   │   ├── face_detector.py
│   │   ├── quality_analyzer.py
│   │   ├── nsfw_detector.py
│   │   └── deepfake_detector.py
│   └── main.py
│
├── nlp-service/                 # NLP services
│   ├── services/
│   │   ├── bio_generator.py
│   │   ├── conversation_starter_generator.py
│   │   ├── sentiment_analyzer.py
│   │   └── toxicity_detector.py
│   └── main.py
│
├── recommendation-service/       # Recommendation engine
│   ├── services/
│   │   ├── compatibility_predictor.py
│   │   ├── user_clustering.py
│   │   ├── recommendation_engine.py
│   │   └── profile_matcher.py
│   └── main.py
│
├── fraud-detection/             # Fraud detection
│   ├── fraud_detector.py
│   └── main.py
│
└── ml-infrastructure/           # MLOps infrastructure
    ├── ab_testing_framework.py
    ├── training_pipeline.py
    ├── feature_store.py
    └── ml_monitoring.py
```

---

## Core ML Services

### 1. Photo Analysis Service

**Location**: `photo-analysis/services/attractiveness_scorer.py`

#### Features

- **Attractiveness Scoring**: Deep learning model (ResNet50-based) scores photos 0-10
- **Feature Analysis**: Evaluates symmetry, golden ratio, skin quality
- **Verification**: Face detection, quality assessment, NSFW detection, deepfake detection

#### Key Components

```python
class AttractivenessScorer:
    """
    Scores photo attractiveness using:
    - Neural network (60% weight)
    - Facial feature analysis (40% weight)

    Features analyzed:
    - Facial symmetry
    - Golden ratio proportions
    - Skin quality
    - Facial structure
    - Eye appeal
    - Smile appeal
    """
```

#### API Endpoints

```http
POST /api/photo/analyze
POST /api/photo/attractiveness-score
POST /api/photo/verify-selfie
```

#### Usage Example

```python
from services.attractiveness_scorer import AttractivenessScorer

scorer = AttractivenessScorer()
await scorer.initialize()

result = await scorer.score(
    photo_url="https://example.com/photo.jpg",
    face_info={"bounding_box": {...}, "landmarks": {...}}
)

# Result:
{
    "overall_score": 7.8,
    "model_score": 7.5,
    "feature_scores": {
        "symmetry": 8.2,
        "golden_ratio": 7.5,
        "skin_quality": 8.0,
        "facial_structure": 7.0,
        "eye_appeal": 7.5,
        "smile_appeal": 7.0
    },
    "level": "very_high",
    "confidence": 0.85
}
```

---

### 2. Bio & Prompt Generator

**Location**: `nlp-service/services/bio_generator.py`

#### Features

- AI-powered bio generation using GPT-4
- Template-based generation for variety
- Bio quality analysis and improvement suggestions
- Prompt answer generation for dating app questions

#### Key Components

```python
class BioGenerator:
    """
    Generates personalized bios using:
    - AI models (GPT-4) for creativity
    - Template engine for structure
    - Quality analyzer for feedback

    Analyzes:
    - Length optimization
    - Cliché detection
    - Specificity scoring
    - Negativity checking
    """
```

#### Usage Example

```python
from services.bio_generator import BioGenerator

generator = BioGenerator(openai_api_key="...")
await generator.initialize()

suggestions = await generator.generate_bio_suggestions(
    user_data={
        "age": 28,
        "profession": "Software Engineer",
        "interests": ["hiking", "photography", "cooking"],
        "hobbies": ["rock climbing", "travel"],
        "activities": ["exploring new restaurants"]
    },
    count=3,
    use_ai=True
)

# Result:
[
    {
        "text": "Software Engineer who trades code for trails on weekends...",
        "type": "ai_generated",
        "analysis": {
            "score": 85,
            "issues": [],
            "suggestions": ["Consider adding humor"]
        }
    }
]
```

---

### 3. Conversation Starter Generator

**Location**: `nlp-service/services/conversation_starter_generator.py`

#### Features

- Personalized conversation starters based on profile analysis
- Common interest detection
- Multiple styles (balanced, playful, serious, complimentary)
- AI-powered and template-based generation

#### Key Components

```python
class ConversationStarterGenerator:
    """
    Generates conversation starters by:
    - Analyzing both user profiles
    - Finding common interests
    - Extracting conversation hooks
    - Generating contextual openers

    Styles:
    - Balanced: Mix of questions and light humor
    - Playful: Fun and witty
    - Serious: Thoughtful conversation starters
    - Complimentary: Include genuine compliments
    """
```

#### Usage Example

```python
from services.conversation_starter_generator import ConversationStarterGenerator

generator = ConversationStarterGenerator(openai_api_key="...")
await generator.initialize()

starters = await generator.generate_starters(
    sender_profile={...},
    recipient_profile={...},
    count=5,
    style="balanced"
)

# Result:
[
    {
        "text": "I saw you're into rock climbing! What's the most challenging...",
        "type": "ai_generated",
        "category": "common_interest",
        "score": 85.5,
        "reasoning": "Based on shared interest in rock climbing"
    }
]
```

---

### 4. Compatibility Prediction Model

**Location**: `recommendation-service/services/compatibility_predictor.py`

#### Features

- Multi-model ensemble (Neural Network + Gradient Boosting)
- Comprehensive feature extraction (50+ features)
- Detailed compatibility breakdown
- Confidence scoring

#### Feature Categories

1. **Demographic**: Age, education, height compatibility
2. **Interests**: Common interests, hobbies, music taste
3. **Lifestyle**: Relationship goals, children preferences, activities
4. **Location**: Distance, same city
5. **Personality**: Big Five traits, communication style
6. **Behavioral**: Response rates, activity patterns

#### Usage Example

```python
from services.compatibility_predictor import CompatibilityPredictor

predictor = CompatibilityPredictor()
await predictor.initialize()

result = await predictor.predict_compatibility(
    user1_profile={...},
    user2_profile={...},
    include_breakdown=True
)

# Result:
{
    "compatibility_score": 78.5,
    "confidence": 0.87,
    "level": "high",
    "breakdown": {
        "categories": {
            "interests": {"score": 85.0, "weight": 0.25},
            "lifestyle": {"score": 75.0, "weight": 0.20},
            "demographics": {"score": 70.0, "weight": 0.15}
        }
    },
    "insights": [
        "You share 5 common interests",
        "Your relationship goals are well aligned",
        "Strong potential for a meaningful connection"
    ]
}
```

---

### 5. Fraud Detection Model

**Location**: `fraud-detection/fraud_detector.py`

#### Features

- Multi-model approach (Neural Network + Random Forest + Isolation Forest)
- Profile analysis (bio, photos)
- Behavior analysis (messaging, login patterns)
- Real-time risk scoring

#### Detection Categories

1. **Profile Fraud**: Suspicious keywords, fake photos, AI-generated content
2. **Messaging Fraud**: Spam patterns, scam detection, early contact sharing
3. **Behavioral Anomalies**: Unusual login patterns, bot-like behavior
4. **Account Security**: Multiple locations, impossible travel

#### Usage Example

```python
from fraud_detection.fraud_detector import FraudDetector

detector = FraudDetector()
await detector.initialize()

result = await detector.detect_fraud(
    user_data={
        "user_id": "user123",
        "bio": "...",
        "photos": [...],
        "message_history": [...],
        "login_history": [...]
    },
    include_details=True
)

# Result:
{
    "risk_score": 35.5,
    "risk_level": "low",
    "is_suspicious": False,
    "requires_review": False,
    "flags": [],
    "recommendations": ["Monitor activity closely"],
    "details": {
        "profile_analysis": {...},
        "behavior_analysis": {...},
        "model_scores": {...}
    }
}
```

---

### 6. User Clustering

**Location**: `recommendation-service/services/user_clustering.py`

#### Features

- Embedding-based user representation
- Multiple clustering algorithms (K-Means, DBSCAN, Hierarchical)
- Cluster profiling and analysis
- Similar user search

#### Clustering Pipeline

1. Feature extraction (demographics, interests, lifestyle, personality, behavior)
2. Feature scaling and normalization
3. Dimensionality reduction (PCA)
4. Neural network embeddings
5. Clustering algorithm application
6. Cluster profile generation

#### Usage Example

```python
from services.user_clustering import UserClustering

clustering = UserClustering(n_clusters=10)
await clustering.initialize()

result = await clustering.cluster_users(
    users=[...],
    method="kmeans"
)

# Get recommendations from same cluster
recommendations = await clustering.get_cluster_recommendations(
    user_id="user123",
    limit=10
)
```

---

## ML Infrastructure

### 1. A/B Testing Framework

**Location**: `ml-infrastructure/ab_testing_framework.py`

#### Features

- Experiment management (create, start, stop)
- Variant assignment (deterministic/random)
- Metrics collection and analysis
- Statistical significance testing
- Winner determination

#### Usage Example

```python
from ml_infrastructure.ab_testing_framework import ABTestingFramework

framework = ABTestingFramework()
await framework.initialize()

# Create experiment
experiment = framework.create_experiment(
    name="Compatibility Model V2",
    description="Testing new compatibility model",
    variants=[
        {
            "name": "control",
            "variant_type": "control",
            "traffic_allocation": 0.5,
            "model_config": {"version": "v1"}
        },
        {
            "name": "treatment",
            "variant_type": "treatment",
            "traffic_allocation": 0.5,
            "model_config": {"version": "v2"}
        }
    ],
    metrics=[
        {
            "name": "match_rate",
            "metric_type": "conversion",
            "primary": True
        }
    ]
)

# Start experiment
framework.start_experiment(experiment.experiment_id)

# Assign user to variant
variant = framework.assign_variant(experiment.experiment_id, "user123")

# Record metrics
framework.record_metric(
    experiment.experiment_id,
    "user123",
    variant["variant_name"],
    "match_rate",
    1.0
)

# Get results
results = framework.get_experiment_results(experiment.experiment_id)
winner = framework.get_winner(experiment.experiment_id, "match_rate")
```

---

### 2. Training Pipeline

**Location**: `ml-infrastructure/training_pipeline.py`

#### Features

- Automated model training
- Early stopping
- Checkpoint management
- Metrics tracking
- Multi-model support

#### Usage Example

```python
from ml_infrastructure.training_pipeline import TrainingPipeline, TrainingConfig, ModelType
import torch.nn as nn

pipeline = TrainingPipeline()
await pipeline.initialize()

# Define model
model = YourCustomModel()

# Create config
config = TrainingConfig(
    model_type=ModelType.COMPATIBILITY,
    model_version="v1.0",
    batch_size=32,
    learning_rate=0.001,
    epochs=50,
    early_stopping_patience=5
)

# Create job
job = pipeline.create_training_job(ModelType.COMPATIBILITY, config)

# Train model
result = await pipeline.train_model(
    job.job_id,
    model,
    train_data,
    train_labels
)

# Check status
status = pipeline.get_job_status(job.job_id)
print(f"Training status: {status.status}")
print(f"Best model: {status.best_model_path}")
```

---

### 3. Feature Store

**Location**: `ml-infrastructure/feature_store.py`

#### Features

- Online store (Redis) for real-time serving
- Offline store for batch processing
- Feature versioning
- Feature groups
- Multiple output formats (dict, numpy, DataFrame)

#### Usage Example

```python
from ml_infrastructure.feature_store import FeatureStore, FeatureDefinition, FeatureType, FeatureStorageType

store = FeatureStore()
await store.initialize()

# Register feature
feature = FeatureDefinition(
    name="user_age_normalized",
    feature_type=FeatureType.NUMERIC,
    storage_type=FeatureStorageType.BOTH,
    description="User age normalized to 0-1",
    source="user_profile"
)
store.register_feature(feature)

# Compute and store feature
store.compute_and_store_feature(
    entity_id="user123",
    feature_name="user_age_normalized",
    raw_data=28
)

# Get online features (real-time)
features = store.get_online_features(
    entity_id="user123",
    feature_names=["user_age_normalized", "user_education_level"]
)

# Materialize features for batch processing
feature_matrix = store.materialize_features(
    entity_ids=["user1", "user2", "user3"],
    feature_names=["age", "education", "interests"],
    output_format="numpy"
)
```

---

### 4. ML Monitoring & Drift Detection

**Location**: `ml-infrastructure/ml_monitoring.py`

#### Features

- Data drift detection (KS test, Chi-square test)
- Performance monitoring
- Prediction drift detection
- Automated alerting
- Health dashboard

#### Drift Detection Methods

1. **Data Drift**: Kolmogorov-Smirnov test for continuous features, Chi-square for categorical
2. **Concept Drift**: Performance degradation tracking
3. **Prediction Drift**: Distribution comparison of model outputs

#### Usage Example

```python
from ml_infrastructure.ml_monitoring import MLMonitoring

monitoring = MLMonitoring()
await monitoring.initialize()

# Setup monitoring for a model
monitoring.setup_model_monitoring(
    model_id="compatibility_v1",
    reference_data={
        "age": np.array([...]),
        "education": np.array([...])
    },
    reference_predictions=np.array([...]),
    baseline_metrics={
        "accuracy": 0.85,
        "f1_score": 0.82
    }
)

# Log predictions
monitoring.log_prediction(
    model_id="compatibility_v1",
    model_version="1.0",
    features={"age": 28, "education": "bachelors"},
    prediction=0.75,
    confidence=0.85,
    latency_ms=15.3
)

# Log performance metrics
monitoring.log_performance_metrics(
    model_id="compatibility_v1",
    model_version="1.0",
    metrics={"accuracy": 0.84, "f1_score": 0.81},
    latency_ms=15.3
)

# Check for drift
alerts = monitoring.check_drift("compatibility_v1")

# Get model health
health = monitoring.get_model_health("compatibility_v1")

# Get dashboard
dashboard = monitoring.get_monitoring_dashboard()
```

---

## Installation & Setup

### Prerequisites

```bash
# Python 3.8+
python --version

# CUDA (optional, for GPU support)
nvidia-smi
```

### Installation

```bash
# Navigate to ai-services directory
cd backend/services/ai-services

# Install dependencies
pip install -r requirements.txt

# Install additional packages for each service
pip install torch torchvision
pip install scikit-learn scipy
pip install openai anthropic
pip install redis pillow
pip install fastapi uvicorn
```

### Environment Variables

Create `.env` file:

```env
# API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Redis (for feature store)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Model paths
MODEL_STORAGE_PATH=./models
FEATURE_STORE_PATH=./feature_store
MONITORING_DATA_PATH=./monitoring_data

# Service ports
PHOTO_ANALYSIS_PORT=8003
NLP_SERVICE_PORT=8002
RECOMMENDATION_PORT=8004
FRAUD_DETECTION_PORT=8005
```

### Running Services

```bash
# Photo Analysis Service
python photo-analysis/main.py

# NLP Service
python nlp-service/main.py

# Recommendation Service
python recommendation-service/main.py

# Fraud Detection Service
python fraud-detection/main.py
```

---

## Model Training

### Training Compatibility Model

```python
import numpy as np
from ml_infrastructure.training_pipeline import TrainingPipeline, TrainingConfig, ModelType
from recommendation-service.services.compatibility_predictor import CompatibilityNeuralNetwork

# Prepare data
train_features = np.random.rand(1000, 100)  # Replace with real data
train_labels = np.random.rand(1000, 1)

# Setup pipeline
pipeline = TrainingPipeline()
await pipeline.initialize()

# Create config
config = TrainingConfig(
    model_type=ModelType.COMPATIBILITY,
    model_version="v2.0",
    batch_size=32,
    learning_rate=0.001,
    epochs=50,
    validation_split=0.2,
    early_stopping_patience=5,
    optimizer="adam",
    loss_function="mse"
)

# Create model
model = CompatibilityNeuralNetwork(input_dim=100)

# Create and run training job
job = pipeline.create_training_job(ModelType.COMPATIBILITY, config)
result = await pipeline.train_model(job.job_id, model, train_features, train_labels)

print(f"Training completed: {result.status}")
print(f"Final validation loss: {result.metrics_history[-1].val_loss}")
print(f"Model saved to: {result.best_model_path}")
```

### Training Fraud Detection Model

Similar process, replace with `FraudNeuralNetwork` and appropriate training data.

---

## Monitoring & Operations

### Health Checks

```bash
# Photo Analysis Service
curl http://localhost:8003/health

# NLP Service
curl http://localhost:8002/health

# Recommendation Service
curl http://localhost:8004/health
```

### Monitoring Dashboard

Access real-time monitoring:

```python
from ml_infrastructure.ml_monitoring import MLMonitoring

monitoring = MLMonitoring()
dashboard = monitoring.get_monitoring_dashboard()

print(json.dumps(dashboard, indent=2))
```

### Alert Management

```python
# Get active alerts
alerts = monitoring.alerts

# Get model health
health = monitoring.get_model_health("compatibility_v1")

if health['status'] == 'critical':
    print("CRITICAL: Model needs attention!")
    print(health['recommendations'])
```

---

## Performance Metrics

### Expected Latencies

- Photo Analysis: < 500ms
- Bio Generation (AI): < 2s
- Bio Generation (Template): < 100ms
- Conversation Starters (AI): < 2s
- Compatibility Prediction: < 50ms
- Fraud Detection: < 100ms
- User Clustering: < 200ms

### Model Accuracy Baselines

- Compatibility Prediction: 75-85% accuracy
- Fraud Detection: 90%+ precision, 85%+ recall
- Attractiveness Scoring: 0.7+ correlation with human ratings

---

## Future Enhancements

1. **Real-time Personalization**: Dynamic model updates based on user behavior
2. **Multi-modal Learning**: Combine text, images, and behavior for better predictions
3. **Federated Learning**: Privacy-preserving model training
4. **AutoML**: Automated hyperparameter tuning and architecture search
5. **Graph Neural Networks**: Leverage social graph for recommendations

---

## Support & Documentation

For questions or issues:
- Technical Documentation: See individual service READMEs
- API Documentation: Available at `/docs` endpoint for each service
- Model Cards: See `models/` directory for model documentation

---

**Last Updated**: December 2025
**Version**: 1.0.0
**Maintainer**: Flamoral AI Team
