# Recommendation Service

AI-powered recommendation engine for the dating platform. Provides personalized profile recommendations, compatibility scoring, and match suggestions using collaborative and content-based filtering.

## Features

- **Profile Recommendations**: Personalized suggestions based on preferences and behavior
- **Compatibility Scoring**: Multi-factor compatibility calculation
- **Similar Profiles**: Find users with similar characteristics
- **Top Picks**: Daily curated matches with highest compatibility
- **Vector Similarity**: Uses embeddings for semantic matching (production)
- **Collaborative Filtering**: Learn from user interactions and patterns

## API Endpoints

### POST /api/recommend/profiles
Get personalized profile recommendations.

**Request:**
```json
{
  "user_id": "user123",
  "user_profile": {
    "user_id": "user123",
    "age": 28,
    "gender": "female",
    "location": {
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "interests": ["hiking", "reading", "travel", "cooking"],
    "preferences": {
      "age_min": 25,
      "age_max": 35,
      "gender_preference": "male",
      "max_distance_km": 50
    },
    "bio": "Love outdoor adventures and good books"
  },
  "limit": 10,
  "exclude_user_ids": ["user456", "user789"]
}
```

**Response:**
```json
{
  "user_id": "user123",
  "recommendations": [
    {
      "user_id": "user999",
      "compatibility_score": 0.85,
      "match_reasons": [
        "3 shared interests",
        "Nearby location",
        "Similar age"
      ],
      "distance_km": 12.5,
      "common_interests": ["hiking", "reading", "travel"]
    }
  ],
  "total_candidates": 45,
  "algorithm_version": "1.0"
}
```

### POST /api/recommend/compatibility
Calculate compatibility score between two users.

**Request:**
```json
{
  "user1_profile": {
    "user_id": "user123",
    "age": 28,
    "gender": "female",
    "location": {"latitude": 40.7128, "longitude": -74.0060},
    "interests": ["hiking", "reading", "travel"],
    "preferences": {"age_min": 25, "age_max": 35}
  },
  "user2_profile": {
    "user_id": "user456",
    "age": 30,
    "gender": "male",
    "location": {"latitude": 40.7580, "longitude": -73.9855},
    "interests": ["hiking", "music", "travel", "photography"],
    "preferences": {"age_min": 25, "age_max": 32}
  }
}
```

**Response:**
```json
{
  "compatibility_score": 0.78,
  "match_factors": {
    "interests": 0.6,
    "age": 0.8,
    "location": 0.85,
    "preferences": 1.0,
    "lifestyle": 0.7
  },
  "common_interests": ["hiking", "travel"],
  "compatibility_level": "Great Match"
}
```

### POST /api/recommend/similar
Find profiles similar to a given user.

**Request:**
```json
{
  "user_profile": {
    "user_id": "user123",
    "age": 28,
    "gender": "female",
    "location": {"latitude": 40.7128, "longitude": -74.0060},
    "interests": ["hiking", "reading", "yoga", "travel"],
    "bio": "Nature lover and bookworm"
  },
  "limit": 10
}
```

**Response:**
```json
{
  "reference_user_id": "user123",
  "similar_profiles": [
    {
      "user_id": "user555",
      "compatibility_score": 0.82,
      "match_reasons": [
        "4 shared interests",
        "Similar age",
        "Nearby"
      ],
      "distance_km": 8.3,
      "common_interests": ["hiking", "reading", "yoga", "travel"]
    }
  ],
  "similarity_metric": "cosine"
}
```

### POST /api/recommend/top-picks
Get daily top picks for a user.

**Request:**
```json
{
  "user_id": "user123",
  "user_profile": {
    "user_id": "user123",
    "age": 28,
    "gender": "female",
    "location": {"latitude": 40.7128, "longitude": -74.0060},
    "interests": ["hiking", "reading", "travel"],
    "preferences": {"age_min": 25, "age_max": 35}
  },
  "count": 5
}
```

**Response:**
```json
{
  "user_id": "user123",
  "top_picks": [
    {
      "user_id": "user888",
      "compatibility_score": 0.92,
      "match_reasons": [
        "5 shared interests",
        "Nearby location",
        "Perfect age match"
      ],
      "distance_km": 5.2,
      "common_interests": ["hiking", "reading", "travel", "cooking", "yoga"]
    }
  ],
  "selection_criteria": "High compatibility + active users + mutual interests",
  "refreshed_at": "2025-12-01T10:00:00Z"
}
```

## Compatibility Factors

The compatibility score is calculated using weighted factors:

1. **Interests** (30%): Jaccard similarity of shared interests
2. **Age** (15%): Age difference compatibility
3. **Location** (25%): Geographic proximity
4. **Preferences** (20%): Mutual preference matching
5. **Lifestyle** (10%): Lifestyle and activity compatibility

## Compatibility Levels

- **Excellent Match** (0.8-1.0): Highly compatible
- **Great Match** (0.6-0.79): Very compatible
- **Good Match** (0.4-0.59): Compatible
- **Fair Match** (0.2-0.39): Somewhat compatible
- **Low Compatibility** (0-0.19): Not very compatible

## Running the Service

### Using Docker

```bash
docker build -t recommendation-service .
docker run -p 8004:8004 recommendation-service
```

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

The service will be available at `http://localhost:8004`.

### Health Check

```bash
curl http://localhost:8004/health
```

## Technology Stack

- **FastAPI**: Modern Python web framework
- **Pydantic**: Data validation
- **NumPy & scikit-learn**: Machine learning utilities
- **Python 3.11**: Latest Python version

## Production Enhancements

For production deployment, consider integrating:

**Vector Databases:**
- Pinecone: Managed vector database
- FAISS: Facebook AI Similarity Search
- ChromaDB: Open-source vector database
- Weaviate: Vector search engine

**ML Models:**
- Sentence Transformers: For profile embeddings
- LightFM: Hybrid recommendation system
- TensorFlow Recommenders: Deep learning recommendations
- Implicit: Collaborative filtering

**Features:**
- User behavior tracking (swipes, messages, likes)
- Collaborative filtering based on similar users
- A/B testing for algorithm improvements
- Real-time personalization
- Seasonal and temporal patterns
- Geographic clustering

## Recommendation Strategies

1. **Content-Based Filtering**
   - Match based on profile attributes
   - Interest overlap
   - Demographic similarity

2. **Collaborative Filtering**
   - Learn from user interactions
   - Find users with similar taste
   - Implicit feedback (swipes, messages)

3. **Hybrid Approach**
   - Combine content and collaborative
   - Cold-start handling for new users
   - Diversity in recommendations

4. **Ranking & Scoring**
   - Multi-factor scoring
   - Recency and freshness
   - Popularity balancing
   - Exploration vs exploitation

## Development

The service is structured as follows:

```
recommendation-service/
├── main.py                            # FastAPI application
├── models.py                          # Pydantic models
├── services/                          # Business logic
│   ├── recommendation_engine.py       # Main recommendation logic
│   ├── compatibility_calculator.py    # Compatibility scoring
│   └── profile_matcher.py             # Profile similarity matching
├── requirements.txt                   # Python dependencies
├── Dockerfile                         # Container build
└── README.md                         # This file
```

## Performance Optimization

- **Caching**: Cache recommendations for active users
- **Pre-computation**: Pre-calculate embeddings and similarities
- **Batch Processing**: Process updates in batches
- **Indexing**: Use vector indices for fast similarity search
- **Load Balancing**: Distribute across multiple instances

## Algorithm Tuning

Adjust weights and thresholds based on:
- User engagement metrics
- Match success rates
- Conversation quality
- User feedback
- A/B test results

## License

Proprietary - All rights reserved
