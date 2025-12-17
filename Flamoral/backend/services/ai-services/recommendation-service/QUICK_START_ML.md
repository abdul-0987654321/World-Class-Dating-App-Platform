# Quick Start Guide - ML Recommendation Service

## 5-Minute Setup

### 1. Install Dependencies
```bash
cd backend/services/ai-services/recommendation-service
pip install -r requirements.txt
```

### 2. Quick Test with Synthetic Data
```bash
# Train models with synthetic data
python train_model.py --synthetic --output-dir ./models

# Expected output:
# - Training collaborative filter...
# - Training content-based filter...
# - Training hybrid recommender...
# - Training behavioral learner...
# Training complete: 4/4 models trained successfully
```

### 3. Run Usage Examples
```bash
python examples/ml_usage_example.py

# You'll see demonstrations of:
# - Feature extraction
# - Collaborative filtering
# - Content-based filtering
# - Hybrid recommendations
# - Behavioral learning
# - A/B testing
# - Complete workflow
```

### 4. Start the API Service
```bash
uvicorn app.main:app --reload --port 8004

# Service will be available at:
# http://localhost:8004
```

### 5. Test the API
```bash
# Health check
curl http://localhost:8004/health

# API documentation
open http://localhost:8004/docs
```

## Basic API Usage

### Get Recommendations
```bash
curl -X POST http://localhost:8004/api/ml/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {
      "user_id": "user123",
      "age": 28,
      "gender": "female",
      "location": {"latitude": 40.7128, "longitude": -74.0060},
      "interests": ["hiking", "reading", "travel"],
      "education": "bachelors",
      "relationship_goal": "serious"
    },
    "candidate_profiles": [...],
    "n": 20,
    "diversity_factor": 0.1
  }'
```

### Record User Behavior
```bash
# Record swipe
curl -X POST http://localhost:8004/api/ml/behavioral/swipe \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "target_user_id": "user456",
    "action": "like",
    "target_profile": {...}
  }'
```

### Get Behavioral Insights
```bash
curl -X POST http://localhost:8004/api/ml/behavioral/insights \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123"
  }'
```

## Project Structure
```
recommendation-service/
├── app/
│   ├── ml/
│   │   ├── models/
│   │   │   ├── feature_extractor.py      # Feature extraction
│   │   │   ├── collaborative_filter.py   # Collaborative filtering
│   │   │   ├── content_based_filter.py   # Content-based filtering
│   │   │   ├── hybrid_recommender.py     # Hybrid approach
│   │   │   └── behavioral_learner.py     # Behavioral learning
│   │   └── ab_testing/
│   │       └── experiment_manager.py     # A/B testing
│   └── api/
│       └── ml_routes.py                  # FastAPI routes
├── examples/
│   └── ml_usage_example.py               # Usage examples
├── train_model.py                        # Training script
├── evaluate_model.py                     # Evaluation script
├── config_ml.yaml                        # Configuration
├── ML_RECOMMENDATION_README.md           # Full documentation
└── QUICK_START_ML.md                     # This file
```

## Key Features

### 1. Compatibility Scoring
```python
from app.ml.models.hybrid_recommender import HybridRecommender

recommender = HybridRecommender()
score, explanation = recommender.predict_score(
    user_id="user123",
    user_profile=user_profile,
    target_profile=target_profile
)

print(f"Compatibility: {score:.2f}")
print(f"Explanation: {explanation}")
```

### 2. Behavioral Learning
```python
from app.ml.models.behavioral_learner import BehavioralLearner

learner = BehavioralLearner()
learner.learn_from_swipe(
    user_id="user123",
    target_user_id="user456",
    action="like",
    target_profile=profile
)

# Get learned preferences
preferences = learner.get_user_preferences("user123")
```

### 3. A/B Testing
```python
from app.ml.ab_testing.experiment_manager import ExperimentManager

manager = ExperimentManager()
manager.create_experiment(
    experiment_id="test1",
    name="Algorithm Test",
    variants=[...]
)

# Assign user to variant
variant = manager.assign_variant("user123", "test1")
```

## Common Use Cases

### Cold Start (New User)
```python
# System automatically uses content-based filtering
recommendations = hybrid_recommender.recommend(
    user_id="new_user",
    user_profile=profile,
    candidate_profiles=candidates,
    n=20
)
# Uses: 100% content-based (no interaction history)
```

### Experienced User
```python
# System blends collaborative + content-based
recommendations = hybrid_recommender.recommend(
    user_id="experienced_user",  # Has 50+ interactions
    user_profile=profile,
    candidate_profiles=candidates,
    n=20
)
# Uses: 70% collaborative, 30% content-based (adaptive)
```

### Top Picks
```python
# Get highest quality matches
top_picks = hybrid_recommender.get_top_picks(
    user_id="user123",
    user_profile=profile,
    candidate_profiles=candidates,
    count=5
)
# Returns only matches with score > 0.7
```

## Configuration

Edit `config_ml.yaml` to customize:

```yaml
# Adjust algorithm weights
hybrid_recommender:
  default_weights:
    collaborative: 0.5
    content_based: 0.5

# Change recommendation count
recommendations:
  default_count: 20
  max_count: 100

# Enable/disable features
ab_testing:
  enabled: true

behavioral_learning:
  enabled: true
```

## Monitoring

### Check Model Statistics
```bash
curl http://localhost:8004/api/ml/models/stats
```

### View Active A/B Tests
```bash
curl http://localhost:8004/api/ml/experiments/active
```

## Troubleshooting

### Models Not Found
```bash
# Train models first
python train_model.py --synthetic
```

### Import Errors
```bash
# Install dependencies
pip install -r requirements.txt
```

### Low Performance
```bash
# Check configuration
cat config_ml.yaml

# Verify caching is enabled
# performance.feature_caching.enabled: true
```

## Next Steps

1. **Read Full Documentation:** `ML_RECOMMENDATION_README.md`
2. **Train with Real Data:** Prepare your data in JSON format
3. **Evaluate Models:** Use `evaluate_model.py` for metrics
4. **Set Up A/B Tests:** Create experiments for algorithm variants
5. **Monitor Performance:** Track metrics in production

## Support

- **API Docs:** http://localhost:8004/docs
- **Full Documentation:** ML_RECOMMENDATION_README.md
- **Examples:** examples/ml_usage_example.py
- **Configuration:** config_ml.yaml

## Tips

1. **Start Simple:** Use synthetic data to understand the system
2. **Test Incrementally:** Test each component individually
3. **Monitor Metrics:** Track precision, recall, diversity
4. **Iterate:** Use A/B testing to improve algorithms
5. **Scale Gradually:** Start with small datasets, scale up

---

**Ready to go!** Start with synthetic data, test the examples, then integrate with your real data.
