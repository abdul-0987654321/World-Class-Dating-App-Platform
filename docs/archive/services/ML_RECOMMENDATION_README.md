# Advanced ML-Based Matching Algorithm

## Overview

This recommendation service implements a state-of-the-art machine learning system for intelligent dating profile matching. It combines multiple approaches to provide highly personalized and effective recommendations.

## Architecture

### 1. Feature Extraction (`feature_extractor.py`)

Extracts comprehensive features from user profiles:

#### Features Extracted:
- **Demographics** (13 features)
  - Age (normalized + squared for non-linear patterns)
  - Gender (one-hot encoded)
  - Relationship goals (one-hot encoded)
  - Education level (ordinal)

- **Location** (5 features)
  - Latitude/longitude (normalized)
  - City size indicators

- **Interests** (12 features)
  - Category-level encoding (sports, arts, intellectual, etc.)
  - Interest count and diversity metrics

- **Profile Completeness** (7 features)
  - Bio length and quality
  - Photo count
  - Verification status
  - Premium status
  - Account age

- **Behavioral** (5 features)
  - Last active timestamp
  - Response rate
  - Average response time
  - Like rate (selectivity)
  - Match conversion rate

- **Text Features** (6 features)
  - Sentiment indicators (positive/negative)
  - Bio length categories
  - Emoji usage

**Total: 48 base features per profile**

#### Interaction Features:
When calculating compatibility between two users, additional features are extracted:
- Interest similarity (Jaccard coefficient)
- Age compatibility
- Distance (Haversine formula)
- Preference matching
- Education similarity

### 2. Collaborative Filtering (`collaborative_filter.py`)

Learns from user behavior patterns to find similar users and recommend profiles.

#### Approach:
- **Matrix Factorization**: Uses Alternating Least Squares (ALS) for implicit feedback
- **Latent Factors**: Discovers 50 latent dimensions representing hidden preferences
- **User Similarity**: Computes user-user similarity using cosine similarity
- **Cold Start Handling**: Falls back to global mean for new users

#### Key Features:
- Implicit feedback (swipes, matches, messages)
- Action weighting:
  - Pass: -0.5
  - Like: 1.0
  - Super Like: 2.0
  - Match: 3.0
  - Message: 4.0
  - Conversation: 5.0

- User/Item biases for personalization
- Consistent predictions via learned latent factors

#### Training:
```python
collaborative_filter = CollaborativeFilter(
    n_factors=50,
    learning_rate=0.01,
    regularization=0.02,
    n_iterations=20
)
collaborative_filter.fit(interactions, implicit=True)
```

### 3. Content-Based Filtering (`content_based_filter.py`)

Recommends profiles based on attribute similarity and stated preferences.

#### Components:
1. **Profile Similarity**
   - Cosine similarity between feature vectors
   - Normalized to 0-1 range

2. **Preference Matching**
   - Age preference validation
   - Gender preference checking
   - Distance constraints
   - Interest overlap requirements
   - Dealbreaker filtering

3. **Learned User Profiles**
   - Creates preference profiles from positive/negative interactions
   - Emphasizes features from liked profiles
   - De-emphasizes features from passed profiles

#### Scoring:
```
Final Score = 0.3 × Base Similarity +
              0.5 × Preference Match +
              0.2 × Interaction Features
```

#### Features:
- Explainable recommendations (common interests, proximity, etc.)
- Diversity promotion via Maximal Marginal Relevance (MMR)
- Adaptive learning from user feedback

### 4. Hybrid Recommender (`hybrid_recommender.py`)

Combines collaborative and content-based approaches with intelligent weighting.

#### Adaptive Weighting:
The system automatically adjusts weights based on:
- **User Experience Level**
  - New users (< 5 interactions): 100% content-based
  - Experienced users: Gradual shift to collaborative filtering
  - Sigmoid transition function for smooth weight adjustment

- **Model Performance**
  - Tracks success rate of each approach
  - Boosts better-performing model dynamically

#### Components:
1. **Score Calculation**
   ```
   Final Score = W_cf × CF Score + W_cb × CB Score
   ```
   Where weights are adaptive based on user history

2. **Dealbreaker Filtering**
   - Hard constraints (age, distance, gender preferences)
   - Custom dealbreakers from user settings

3. **Diversity Application**
   - MMR algorithm to avoid filter bubbles
   - Promotes variety in recommendations

4. **Personalized Ranking**
   - Boosts for verified profiles
   - Boosts for recently active users
   - Boosts for high response rates
   - Penalties for incomplete profiles

#### Cold Start Strategy:
- **New Users**: Pure content-based filtering
- **Some History** (5-50 interactions): Blended approach
- **Experienced Users**: Primarily collaborative filtering

### 5. Behavioral Learner (`behavioral_learner.py`)

Learns from user interaction patterns to improve recommendations over time.

#### Learning Sources:
1. **Swipe Patterns**
   - Like/pass ratios
   - Super like usage
   - Selectivity metrics

2. **Photo Preferences**
   - Preferred photo positions
   - Average photos viewed

3. **Temporal Patterns**
   - Active hours
   - Active days
   - Session patterns

4. **Engagement Metrics**
   - Match conversion rates
   - Message response rates
   - Conversation quality
   - Conversation duration

#### Learned Preferences:
The system automatically learns:
- Preferred age ranges
- Preferred interests
- Education preferences
- Height preferences (if available)
- Location preferences

#### Swipe Prediction:
Can predict likely user action with confidence level:
```python
action, confidence = behavioral_learner.predict_swipe(
    user_id=user_id,
    target_profile=profile
)
# Returns: ('like', 0.85) or ('pass', 0.62)
```

#### User Profiling:
Classifies users into types:
- **Explorer**: Likes most profiles (>70% like rate)
- **Selective**: Very picky (<30% like rate)
- **Engaged**: High response rate (>80%)
- **Balanced**: Normal behavior

### 6. A/B Testing Framework (`experiment_manager.py`)

Enables scientific testing of algorithm variants.

#### Features:
- **Consistent User Bucketing**: Hash-based assignment ensures same user always gets same variant
- **Traffic Allocation**: Flexible percentage splits (e.g., 50/50, 70/30)
- **Multiple Concurrent Experiments**: Run multiple tests simultaneously
- **Statistical Significance Testing**:
  - Chi-square test for categorical outcomes
  - T-test for continuous metrics
  - Confidence level validation

#### Tracked Metrics:
- Impressions
- Likes
- Matches
- Conversations
- Response rates
- Conversation lengths
- User satisfaction scores

#### Statistical Analysis:
- Calculates p-values for significance
- Determines winner with confidence level
- Provides actionable recommendations

#### Example Experiment:
```python
experiment_manager.create_experiment(
    experiment_id="algo_v2_test",
    name="New Hybrid Weights Test",
    hypothesis="Increasing content-based weight improves match quality",
    variants=[
        {
            "id": "control",
            "name": "Current Algorithm",
            "traffic_allocation": 0.5,
            "config": {"cf_weight": 0.5, "cb_weight": 0.5}
        },
        {
            "id": "treatment",
            "name": "Content-Heavy Algorithm",
            "traffic_allocation": 0.5,
            "config": {"cf_weight": 0.3, "cb_weight": 0.7}
        }
    ]
)
```

## API Endpoints

### Core Recommendation Endpoints

#### `POST /api/ml/recommend`
Get personalized recommendations using ML.

**Request:**
```json
{
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
  "diversity_factor": 0.1,
  "use_ab_test": true,
  "experiment_id": "algo_v2_test"
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "user_id": "user456",
      "score": 0.89,
      "explanation": {
        "collaborative_score": 0.85,
        "content_score": 0.92,
        "factors": [
          {"type": "interests", "value": 4, "description": "4 shared interests"},
          {"type": "distance", "value": 8.5, "description": "Very close location"}
        ]
      }
    }
  ],
  "metadata": {
    "algorithm": "hybrid",
    "n_candidates": 100,
    "n_recommendations": 20
  },
  "experiment_info": {
    "experiment_id": "algo_v2_test",
    "variant_id": "treatment"
  }
}
```

#### `POST /api/ml/predict-compatibility`
Predict compatibility score between two users.

### Behavioral Learning Endpoints

#### `POST /api/ml/behavioral/swipe`
Record swipe event for learning.

#### `POST /api/ml/behavioral/match`
Record match event for learning.

#### `POST /api/ml/behavioral/insights`
Get behavioral insights and learned preferences.

**Response:**
```json
{
  "user_id": "user123",
  "insights": {
    "profile_type": "selective",
    "selectivity": 0.28,
    "engagement_level": "high",
    "match_success_rate": 0.42,
    "learned_preferences": {
      "preferred_age_range": [25, 35],
      "preferred_interests": ["hiking", "photography", "travel"]
    }
  }
}
```

#### `POST /api/ml/behavioral/predict-swipe`
Predict likely swipe action.

### A/B Testing Endpoints

#### `POST /api/ml/experiments/create`
Create new A/B test.

#### `POST /api/ml/experiments/{id}/start`
Start experiment.

#### `GET /api/ml/experiments/{id}/results`
Get experiment results with statistical analysis.

**Response:**
```json
{
  "experiment_id": "algo_v2_test",
  "name": "New Hybrid Weights Test",
  "status": "completed",
  "results": {
    "variants": [
      {
        "id": "control",
        "metrics": {
          "impressions": 5234,
          "like_rate": 0.32,
          "match_rate": 0.18,
          "conversation_rate": 0.65
        }
      },
      {
        "id": "treatment",
        "metrics": {
          "impressions": 5198,
          "like_rate": 0.34,
          "match_rate": 0.22,
          "conversation_rate": 0.71
        }
      }
    ],
    "statistical_significance": {
      "match_rate": {
        "p_value": 0.023,
        "significant": true
      }
    },
    "winner": {
      "variant_id": "treatment",
      "statistically_significant": true,
      "confidence": "high"
    },
    "recommendation": "Roll out variant 'Content-Heavy Algorithm' to all users..."
  }
}
```

## Model Training

### Training Pipeline

Use the provided training script:

```bash
# With real data
python train_model.py \
    --data-path ./data \
    --output-dir ./models

# With synthetic data (for testing)
python train_model.py \
    --data-path ./data \
    --output-dir ./models \
    --synthetic
```

### Data Format

#### profiles.json
```json
[
  {
    "user_id": "user123",
    "age": 28,
    "gender": "female",
    "location": {"latitude": 40.7128, "longitude": -74.0060},
    "interests": ["hiking", "reading"],
    "education": "bachelors",
    "relationship_goal": "serious",
    "bio": "Love outdoor adventures...",
    "photo_count": 5,
    "is_verified": true,
    "preferences": {
      "age_min": 25,
      "age_max": 35,
      "max_distance_km": 50
    }
  }
]
```

#### interactions.json
```json
[
  {
    "user_id": "user123",
    "target_user_id": "user456",
    "action": "like",
    "timestamp": "2025-01-15T10:30:00Z"
  }
]
```

## Model Evaluation

Evaluate model performance:

```bash
python evaluate_model.py \
    --test-data ./data/test_data.json \
    --recommendations ./output/recommendations.json \
    --output evaluation_results.json
```

### Evaluation Metrics

- **Precision@K**: Accuracy of top K recommendations
- **Recall@K**: Coverage of relevant items in top K
- **F1@K**: Harmonic mean of precision and recall
- **NDCG@K**: Normalized Discounted Cumulative Gain
- **Hit Rate@K**: Whether any relevant item appears in top K
- **MRR**: Mean Reciprocal Rank
- **Coverage**: Percentage of catalog items recommended
- **Diversity**: Variety in recommendations
- **Novelty**: How unpopular (novel) recommended items are

## Performance Optimization

### Caching Strategies

1. **Feature Vectors**: Cache extracted features for frequent users
2. **User Similarities**: Pre-compute similarity matrices
3. **Model Predictions**: Cache scores for candidate pools

### Batch Processing

Process recommendations in batches for efficiency:
```python
# Batch feature extraction
features = feature_extractor.transform_batch(profiles)

# Batch predictions
scores = model.predict_batch(user_ids, candidate_ids)
```

### Model Updates

- **Incremental Learning**: Update behavioral learner in real-time
- **Periodic Retraining**: Retrain collaborative filter weekly
- **A/B Testing**: Validate improvements before full rollout

## Configuration

### Environment Variables

```bash
# Model settings
ML_MODEL_DIR=/path/to/models
ML_ENABLE_CACHE=true
ML_CACHE_TTL=3600

# Collaborative filtering
CF_N_FACTORS=50
CF_LEARNING_RATE=0.01
CF_N_ITERATIONS=20

# Hybrid recommender
HYBRID_CF_WEIGHT=0.5
HYBRID_CB_WEIGHT=0.5
HYBRID_MIN_INTERACTIONS=5

# A/B testing
AB_TEST_ENABLED=true
AB_TEST_DEFAULT_CONFIDENCE=0.95
```

### requirements.txt

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
numpy==1.26.3
pandas==2.1.4
scikit-learn==1.4.0
scipy==1.11.4
```

## Best Practices

### 1. Data Quality
- Ensure complete profile data
- Validate interaction timestamps
- Remove duplicate interactions
- Handle missing values appropriately

### 2. Model Monitoring
- Track recommendation diversity
- Monitor coverage metrics
- Watch for filter bubbles
- Analyze user feedback

### 3. A/B Testing
- Always use control groups
- Ensure sufficient sample sizes
- Run tests for adequate duration (1-2 weeks)
- Consider seasonality effects

### 4. Privacy & Ethics
- Respect user preferences and dealbreakers
- Avoid discriminatory patterns
- Provide explanation for recommendations
- Allow users to provide feedback

### 5. Performance
- Use caching for frequent operations
- Batch process when possible
- Monitor API response times
- Implement request throttling

## Troubleshooting

### Low Match Rates
- Check if dealbreakers are too restrictive
- Verify preference matching logic
- Increase candidate pool size
- Adjust diversity factor

### Cold Start Issues
- Ensure content-based fallback is working
- Request more profile information from new users
- Use popularity-based recommendations initially

### Poor Diversity
- Increase diversity_factor parameter
- Check if collaborative filter is dominating
- Verify MMR implementation
- Review candidate pool composition

## Future Enhancements

1. **Deep Learning Models**
   - Neural collaborative filtering
   - Attention mechanisms for profile matching
   - Graph neural networks for social connections

2. **Advanced Features**
   - Image-based compatibility
   - Conversation quality prediction
   - Temporal dynamics modeling
   - Multi-armed bandit optimization

3. **Real-time Learning**
   - Online learning algorithms
   - Streaming data processing
   - Dynamic weight adjustment

4. **Explainability**
   - LIME/SHAP for model interpretation
   - Visual explanations
   - User-facing insights dashboard

## Support

For questions or issues:
- Check logs in `training_*.log`
- Review API error responses
- Consult evaluation metrics
- Test with synthetic data first

## License

Copyright (c) 2025 World-Class Dating App Platform
