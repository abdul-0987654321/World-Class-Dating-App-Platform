# Dating Coach Service

AI-powered dating coach providing personalized advice, conversation suggestions, and profile optimization for the Flamoral dating platform.

## Features

### 1. Icebreaker Generation
Generate personalized opening messages based on match's profile:
- References specific profile details
- Multiple tone options (friendly, playful, witty, sincere)
- Context-aware suggestions

### 2. Response Suggestions
Get AI-powered reply suggestions when stuck in conversation:
- Based on conversation history
- Considers both profiles
- Multiple style options (balanced, playful, deep, flirty)
- Real-time conversation analysis

### 3. Profile Optimization
Analyze and improve your dating profile:
- Overall profile score (0-100)
- Category-specific tips (photos, bio, prompts, interests)
- Priority levels (high/medium/low)
- Quick wins for easy improvements
- Profile completeness tracking

### 4. Date Idea Generation
Get personalized date ideas based on shared interests:
- Considers both profiles
- Location-aware suggestions
- Budget options (low/moderate/high)
- Date type specific (first/second/casual/special)
- Includes conversation starters and backup plans

### 5. Conversation Analysis
Deep analysis of conversation dynamics:
- Engagement metrics
- Sentiment analysis
- Red and green flags
- Interest level estimation
- Actionable recommendations
- Next steps suggestions

## Premium Tiers

| Tier | Daily Limit | Features |
|------|-------------|----------|
| Free | 3 requests | Basic features |
| Basic | 3 requests | Basic features |
| Premium | 10 requests | All features |
| Premium+ | Unlimited | All features + advanced analysis |

## API Endpoints

### Health Check
```
GET /health
```

### Generate Icebreakers
```
POST /api/coach/icebreakers
```

**Request:**
```json
{
  "user_id": "user123",
  "match_profile": {
    "first_name": "Sarah",
    "bio": "Love hiking and photography",
    "interests": ["hiking", "photography", "travel"],
    "occupation": "Photographer"
  },
  "num_suggestions": 3,
  "tone": "friendly"
}
```

**Response:**
```json
{
  "icebreakers": [
    "Hi Sarah! I saw you love hiking and photography - have you ever captured some amazing shots on the trails?",
    "Hey! Fellow hiking enthusiast here. What's been your favorite hike recently?",
    "Your photography work must lead to some incredible adventures! What's the most beautiful place you've photographed?"
  ],
  "context_used": [
    "Interests: hiking, photography, travel",
    "Occupation: Photographer"
  ],
  "confidence_scores": [0.85, 0.80, 0.75]
}
```

### Suggest Response
```
POST /api/coach/suggest-response
```

### Profile Tips
```
POST /api/coach/profile-tips
```

### Date Ideas
```
POST /api/coach/date-ideas
```

### Conversation Analysis
```
POST /api/coach/conversation-analysis
```

### Check Usage
```
POST /api/coach/usage
```

## Setup

### Prerequisites
- Python 3.11+
- Redis (for rate limiting)
- MongoDB (optional - for analytics)
- OpenAI API key or Anthropic API key

### Installation

1. **Clone and navigate to service:**
```bash
cd backend/services/ai-services/dating-coach-service
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

5. **Run the service:**
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

## Docker Deployment

### Build and run with Docker:
```bash
docker build -t flamoral-dating-coach .
docker run -p 8004:8004 --env-file .env flamoral-dating-coach
```

### Run with docker-compose:
```bash
docker-compose -f docker-compose.dating-coach.yml up
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `AI_PROVIDER` | AI provider (openai/anthropic) | openai |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `OPENAI_MODEL` | OpenAI model | gpt-4-turbo-preview |
| `ANTHROPIC_MODEL` | Anthropic model | claude-3-opus-20240229 |
| `REDIS_HOST` | Redis host | localhost |
| `REDIS_PORT` | Redis port | 6379 |
| `RATE_LIMIT_FREE` | Free tier daily limit | 3 |
| `RATE_LIMIT_PREMIUM` | Premium tier daily limit | 10 |
| `RATE_LIMIT_PREMIUM_PLUS` | Premium+ tier limit | -1 (unlimited) |

## Rate Limiting

The service implements per-user, per-day rate limiting based on subscription tier:
- Uses Redis for distributed rate limiting
- Resets daily at midnight UTC
- Returns clear error messages with upgrade prompts
- Check usage endpoint for UI integration

## Integration with User Service

The dating coach service should be called from the user-service with proper authentication and subscription tier validation:

```typescript
// In user-service
const coachResponse = await fetch('http://dating-coach-service:8004/api/coach/icebreakers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    user_id: req.user.id,
    match_profile: matchData,
    num_suggestions: 3,
    tone: 'friendly'
  })
});
```

## Monitoring

### Health Check
The service exposes a health check endpoint that reports:
- Service status
- AI provider status
- Version information

### Logging
- Structured logging with configurable levels
- Error tracking with Sentry (optional)
- Request/response logging for debugging

## Development

### Running Tests
```bash
pytest tests/
```

### Code Quality
```bash
# Format code
black app/

# Lint code
pylint app/

# Type checking
mypy app/
```

## Architecture

```
dating-coach-service/
├── app/
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py           # API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_provider.py      # OpenAI/Anthropic integration
│   │   ├── icebreaker_service.py
│   │   ├── response_suggester.py
│   │   ├── profile_analyzer.py
│   │   ├── date_idea_generator.py
│   │   ├── conversation_analyzer.py
│   │   └── rate_limiter.py     # Rate limiting logic
│   ├── config.py               # Configuration
│   ├── main.py                 # FastAPI app
│   └── __init__.py
├── models.py                   # Pydantic models
├── requirements.txt
├── Dockerfile
├── .env.example
└── README.md
```

## Security

- API keys stored in environment variables
- Rate limiting prevents abuse
- Input validation with Pydantic
- No PII stored in logs
- CORS configured appropriately

## Future Enhancements

- [ ] A/B testing for suggestion quality
- [ ] User feedback collection
- [ ] Multi-language support
- [ ] Voice tone analysis
- [ ] Image analysis for photo tips
- [ ] Success rate tracking
- [ ] Personalized learning from user interactions

## Support

For issues or questions:
1. Check the logs: `docker logs flamoral-dating-coach-service`
2. Review API documentation: `http://localhost:8004/docs`
3. Contact the development team

## License

Proprietary - Flamoral Dating Platform
