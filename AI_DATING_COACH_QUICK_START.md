# AI Dating Coach - Quick Start Guide

## Overview
The AI Dating Coach is a premium feature that provides personalized dating advice powered by OpenAI GPT-4 or Anthropic Claude.

## Features at a Glance

### 1. Icebreaker Generation
Generate personalized opening messages based on match's profile
- **Location**: Match profile screen
- **Usage**: Click "Get Icebreakers" button
- **Result**: 3-5 personalized opening messages

### 2. Response Suggestions
Get AI-powered reply suggestions when stuck in conversation
- **Location**: Chat/messaging screen
- **Usage**: Click "Suggest Reply" button
- **Result**: 3-5 contextual reply options

### 3. Profile Optimization
Analyze and improve your dating profile
- **Location**: Profile editing screen
- **Usage**: Click "Improve Profile" button
- **Result**: Overall score + categorized tips

### 4. Date Ideas
Generate personalized date ideas based on shared interests
- **Location**: Match profile or chat screen
- **Usage**: Click "Date Ideas" button
- **Result**: 3-5 creative date suggestions

### 5. Conversation Analysis
Deep analysis of conversation dynamics
- **Location**: Chat screen (menu option)
- **Usage**: Click "Analyze Conversation"
- **Result**: Engagement metrics + insights

## Quick Setup (Development)

### Prerequisites
```bash
# Required
- Python 3.11+
- Redis
- OpenAI API key OR Anthropic API key

# Optional
- MongoDB (for analytics)
```

### 1. Navigate to Service
```bash
cd backend/services/ai-services/dating-coach-service
```

### 2. Create Environment File
```bash
cp .env.example .env
```

### 3. Configure API Keys
Edit `.env` and add your API key:
```env
# Choose one:
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key-here

# OR

AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

### 4. Install Dependencies
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Start Redis (if not running)
```bash
# macOS/Linux
redis-server

# Windows (if installed)
redis-server.exe

# Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### 6. Run the Service
```bash
python -m uvicorn app.main:app --reload --port 8004
```

### 7. Test the Service
Open browser: http://localhost:8004/docs

You'll see interactive API documentation (Swagger UI).

## Quick Test

### Test Icebreaker Generation

1. Go to http://localhost:8004/docs
2. Find POST `/api/coach/icebreakers`
3. Click "Try it out"
4. Use this example:

```json
{
  "user_id": "test_user_123",
  "match_profile": {
    "first_name": "Sarah",
    "bio": "Love hiking, photography, and trying new restaurants",
    "interests": ["hiking", "photography", "food", "travel"],
    "occupation": "Photographer"
  },
  "num_suggestions": 3,
  "tone": "friendly"
}
```

5. Click "Execute"
6. You should get 3 personalized icebreaker messages!

## Docker Setup (Production)

### Single Service
```bash
cd backend/services/ai-services/dating-coach-service

# Build
docker build -t flamoral-dating-coach .

# Run
docker run -d \
  -p 8004:8004 \
  -e OPENAI_API_KEY=your-key-here \
  -e REDIS_HOST=redis \
  --name dating-coach \
  flamoral-dating-coach
```

### With Docker Compose
```bash
# Make sure you have the main docker-compose running (for Redis)
cd backend/services/ai-services/dating-coach-service

# Set environment variables
export OPENAI_API_KEY=your-key-here

# Start service
docker-compose -f docker-compose.dating-coach.yml up -d

# Check logs
docker logs flamoral-dating-coach-service

# Stop service
docker-compose -f docker-compose.dating-coach.yml down
```

## Integration with Platform

### 1. Frontend Integration

Add to chat component:
```tsx
import { CoachButton } from '@/components/coach/CoachButton';
import { SuggestionCard } from '@/components/coach/SuggestionCard';

// In your chat component
<CoachButton
  variant="response"
  onClick={handleGetSuggestions}
  remainingUses={5}
/>

{suggestions && (
  <SuggestionCard
    suggestions={suggestions}
    onSelect={handleUseSuggestion}
    onDismiss={handleDismiss}
    type="response"
  />
)}
```

### 2. API Integration

```typescript
// services/coach.service.ts
async function getResponseSuggestions(
  conversationHistory: Message[],
  matchProfile: Profile
): Promise<ResponseSuggestion> {
  const response = await fetch('http://localhost:8004/api/coach/suggest-response', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      user_id: userId,
      conversation_history: conversationHistory,
      match_profile: matchProfile,
      num_suggestions: 3,
      style: 'balanced',
    }),
  });

  return response.json();
}
```

## Premium Tier Limits

| Tier | Daily Limit | Cost |
|------|-------------|------|
| Free | 3 requests | Free |
| Basic | 3 requests | $4.99/mo |
| Premium | 10 requests | $14.99/mo |
| Premium+ | Unlimited | $29.99/mo |

## Common Use Cases

### 1. Starting a Conversation
```typescript
// User viewing a match's profile
const icebreakers = await coachService.getIcebreakers({
  user_id: currentUser.id,
  match_profile: matchData,
  num_suggestions: 3,
  tone: 'friendly'
});
```

### 2. Replying in Chat
```typescript
// User clicks "Suggest Reply" in chat
const suggestions = await coachService.suggestResponse({
  user_id: currentUser.id,
  conversation_history: messages.slice(-10), // Last 10 messages
  match_profile: matchData,
  user_profile: currentUser.profile,
  num_suggestions: 3,
  style: 'balanced'
});
```

### 3. Improving Profile
```typescript
// User on profile edit page
const tips = await coachService.analyzeProfile({
  user_id: currentUser.id,
  profile_data: currentUser.profile,
  photos: currentUser.photos,
  prompts: currentUser.prompts
});

// Display overall score and tips
console.log(`Profile Score: ${tips.overall_score}/100`);
```

### 4. Planning a Date
```typescript
// After matching/chatting
const dateIdeas = await coachService.generateDateIdeas({
  user_id: currentUser.id,
  match_profile: matchData,
  user_profile: currentUser.profile,
  location: 'San Francisco',
  budget: 'moderate',
  date_type: 'first',
  num_suggestions: 3
});
```

### 5. Analyzing Conversation
```typescript
// View conversation health
const analysis = await coachService.analyzeConversation({
  user_id: currentUser.id,
  conversation_history: allMessages,
  match_profile: matchData
});

// Show insights
console.log(`Engagement: ${analysis.metrics.engagement_level}`);
console.log(`Interest Level: ${analysis.interest_level}`);
```

## Monitoring

### Health Check
```bash
curl http://localhost:8004/health
```

Response:
```json
{
  "status": "healthy",
  "service": "dating-coach-service",
  "version": "1.0.0",
  "ai_provider": "openai",
  "ai_status": "connected"
}
```

### Check Usage
```bash
curl -X POST http://localhost:8004/api/coach/usage \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "coaching_type": "icebreaker",
    "subscription_tier": "premium"
  }'
```

Response:
```json
{
  "allowed": true,
  "remaining_today": 7,
  "limit_per_day": 10,
  "reset_time": "2024-01-02 00:00:00 UTC",
  "upgrade_message": null
}
```

## Troubleshooting

### Service Won't Start

**Problem**: Port 8004 already in use
```bash
# Find process using port
lsof -i :8004  # macOS/Linux
netstat -ano | findstr :8004  # Windows

# Kill process or use different port
python -m uvicorn app.main:app --reload --port 8005
```

**Problem**: Missing API key
```
ValueError: Missing API key for openai
```
Solution: Check `.env` file has correct API key

### AI Generation Errors

**Problem**: Rate limit from OpenAI/Anthropic
```
Error: Rate limit exceeded
```
Solution: Wait or upgrade AI provider plan

**Problem**: Invalid API key
```
Error: Incorrect API key
```
Solution: Verify API key in `.env` is correct

### Redis Connection Issues

**Problem**: Redis not running
```
Error: Could not connect to Redis
```
Solution:
```bash
# Start Redis
redis-server

# Or with Docker
docker run -d -p 6379:6379 redis:7-alpine
```

### Rate Limiting Issues

**Problem**: User hitting limits
```json
{
  "detail": {
    "message": "Rate limit exceeded",
    "remaining": 0,
    "reset_time": "2024-01-02 00:00:00 UTC"
  }
}
```
Solution: This is expected behavior. User needs to upgrade or wait for reset.

## Development Tips

### Testing Without Rate Limits
In `.env` for development:
```env
RATE_LIMIT_FREE=999
RATE_LIMIT_PREMIUM=999
```

### Using Cheaper Models
For development/testing:
```env
OPENAI_MODEL=gpt-3.5-turbo  # Cheaper than GPT-4
MAX_TOKENS=500              # Reduce token usage
```

### Viewing Logs
```bash
# Docker logs
docker logs -f flamoral-dating-coach-service

# Direct run
# Logs print to console automatically
```

### Testing Fallbacks
To test fallback suggestions (when AI fails):
1. Use invalid API key temporarily
2. Disconnect from internet
3. Check service returns generic suggestions

## API Reference Quick Links

- **Full API Docs**: http://localhost:8004/docs
- **OpenAPI Schema**: http://localhost:8004/openapi.json
- **Health Check**: http://localhost:8004/health
- **Root Endpoint**: http://localhost:8004/

## Next Steps

1. ✅ Service is running
2. ⬜ Test all endpoints in Swagger UI
3. ⬜ Integrate with user service for authentication
4. ⬜ Add frontend components to app
5. ⬜ Configure subscription tier checking
6. ⬜ Set up monitoring and alerts
7. ⬜ Deploy to staging environment
8. ⬜ User acceptance testing
9. ⬜ Production deployment

## Support

### Common Questions

**Q: Which AI provider should I use?**
A: GPT-4 gives best results but costs more. Claude 3 Opus is also excellent. Start with GPT-4.

**Q: How much will this cost per request?**
A: ~$0.03-0.06 per request with GPT-4, less with GPT-3.5 or Claude.

**Q: Can users customize the tone/style?**
A: Yes! Each endpoint accepts tone/style parameters.

**Q: How do I add new features?**
A: Create new service in `app/services/`, add endpoint in `app/api/routes.py`, add models in `models.py`.

**Q: Is this production-ready?**
A: Yes! Includes error handling, rate limiting, logging, health checks, and Docker deployment.

### Getting Help

1. Check service logs
2. Review this documentation
3. Check Swagger UI for API details
4. Review `IMPLEMENTATION_SUMMARY.md` for architecture
5. Contact the development team

## Configuration Reference

### Essential Variables
```env
AI_PROVIDER=openai                    # or anthropic
OPENAI_API_KEY=sk-...                 # Your API key
REDIS_HOST=localhost                  # Redis server
PORT=8004                             # Service port
```

### Optional Variables
```env
OPENAI_MODEL=gpt-4-turbo-preview     # AI model
MAX_TOKENS=1000                       # Response length limit
TEMPERATURE=0.7                       # Creativity (0-1)
LOG_LEVEL=INFO                        # Logging verbosity
CORS_ORIGINS=*                        # Allowed origins
SENTRY_DSN=https://...                # Error tracking
```

### Rate Limits
```env
RATE_LIMIT_FREE=3                     # Free tier limit
RATE_LIMIT_BASIC=3                    # Basic tier limit
RATE_LIMIT_PREMIUM=10                 # Premium tier limit
RATE_LIMIT_PREMIUM_PLUS=-1            # Unlimited (-1)
```

## Success Metrics

Track these to measure feature success:
- **Adoption Rate**: % of premium users using coach
- **Engagement**: Suggestions used vs dismissed
- **Satisfaction**: User ratings/feedback
- **Retention**: Do coached users stay longer?
- **Success**: Do suggestions lead to matches?

## Conclusion

You now have a fully functional AI Dating Coach!

The service provides intelligent, context-aware dating advice that helps users:
- Start conversations confidently
- Keep conversations flowing naturally
- Optimize their profiles
- Plan memorable dates
- Understand conversation dynamics

Happy coaching! 💕
