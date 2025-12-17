# AI Content Enhancement - Quick Start Guide

## New Files Created

### NLP Service (Port 8085)
```
nlp-service/app/
├── services/
│   ├── bio_generator.py              ← NEW: Bio generation & improvement
│   └── message_assistant.py          ← NEW: Message assistance & analysis
├── api/
│   └── content_enhancement_routes.py ← NEW: API routes for bio & messages
└── main_enhanced.py                  ← NEW: Enhanced main with new services
```

### Recommendation Service (Port 8084)
```
recommendation-service/app/
├── services/
│   └── compatibility_enhancement.py  ← NEW: Red flags, readiness, comm styles
└── api/
    └── compatibility_routes.py       ← NEW: Compatibility API routes
```

## Quick Integration

### Option 1: Use Enhanced Main (Recommended)
```bash
# In nlp-service directory
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/backend/services/ai-services/nlp-service

# Rename files
mv app/main.py app/main_original_backup.py
mv app/main_enhanced.py app/main.py

# Start service
python -m app.main
```

### Option 2: Manual Integration
Add to existing `nlp-service/app/main.py`:

```python
# Add imports
from app.services.bio_generator import BioGeneratorService
from app.services.message_assistant import MessageAssistantService
from app.api.content_enhancement_routes import router as content_router

# In lifespan() function, after existing services:
app.state.bio_generator = BioGeneratorService(settings)
await app.state.bio_generator.initialize()

app.state.message_assistant = MessageAssistantService(settings)
await app.state.message_assistant.initialize()

# In cleanup section:
await app.state.bio_generator.close()
await app.state.message_assistant.close()

# After existing router include:
app.include_router(content_router, prefix="/api/v1", tags=["AI Content Enhancement"])
```

### For Recommendation Service
Add to `recommendation-service/app/main.py`:

```python
# Add imports
from app.services.compatibility_enhancement import CompatibilityEnhancementService
from app.api.compatibility_routes import router as compat_router

# In lifespan() function:
app.state.compatibility_enhancement = CompatibilityEnhancementService(settings)
await app.state.compatibility_enhancement.initialize()

# In cleanup:
await app.state.compatibility_enhancement.close()

# Add router:
app.include_router(compat_router, prefix="/api/v1", tags=["Compatibility Enhancement"])
```

## New API Endpoints

### Bio Generator (NLP Service)
- `POST /api/v1/bio/generate` - Generate new bio
- `POST /api/v1/bio/improve` - Improve existing bio

### Message Assistant (NLP Service)
- `POST /api/v1/messages/conversation-starters` - Generate openers
- `POST /api/v1/messages/reply-suggestions` - Get reply suggestions
- `POST /api/v1/messages/rewrite` - Rewrite message
- `POST /api/v1/messages/adjust-tone` - Adjust tone
- `POST /api/v1/messages/analyze` - Analyze effectiveness

### Compatibility Enhancement (Recommendation Service)
- `POST /api/v1/compatibility/red-flags` - Analyze red flags
- `POST /api/v1/compatibility/relationship-readiness` - Assess readiness
- `POST /api/v1/compatibility/communication-style` - Match styles

## Sample Requests

### 1. Generate Bio
```bash
curl -X POST http://localhost:8085/api/v1/bio/generate \
  -H "Content-Type: application/json" \
  -d '{
    "interests": ["hiking", "photography"],
    "personality_traits": ["outgoing", "creative"],
    "style": "witty",
    "max_length": 150
  }'
```

### 2. Get Conversation Starters
```bash
curl -X POST http://localhost:8085/api/v1/messages/conversation-starters \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_profile": {
      "name": "Sarah",
      "interests": ["yoga", "travel"]
    },
    "tone": "casual",
    "count": 3
  }'
```

### 3. Analyze Red Flags
```bash
curl -X POST http://localhost:8084/api/v1/compatibility/red-flags \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_history": [
      {"text": "Can you send me money?", "sender_id": "user2"}
    ]
  }'
```

## Available Styles/Tones

### Bio Styles
- `witty` - Clever and humorous
- `romantic` - Warm and heartfelt
- `casual` - Relaxed and friendly
- `professional` - Polished and mature
- `adventurous` - Energetic and bold

### Message Tones
- `casual` - Relaxed and friendly
- `formal` - Professional and respectful
- `playful` - Fun and lighthearted
- `flirty` - Charming and engaging
- `sincere` - Genuine and thoughtful

### Message Rewrite Styles
- `flirty` - Add romantic charm
- `romantic` - More heartfelt
- `casual` - More relaxed
- `formal` - More professional
- `playful` - More fun

## Testing

### Test Bio Generation
```bash
# Simple test
curl -X POST http://localhost:8085/api/v1/bio/generate \
  -H "Content-Type: application/json" \
  -d '{"interests":["reading"],"personality_traits":["kind"],"style":"casual"}'
```

### Test Message Analysis
```bash
curl -X POST http://localhost:8085/api/v1/messages/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"Hey! How are you doing today?"}'
```

### Check Health
```bash
# NLP Service
curl http://localhost:8085/health

# Recommendation Service
curl http://localhost:8084/health
```

## Key Features

### 1. AI Bio Generator
✓ Generates personalized bios
✓ 5 different writing styles
✓ Bio improvement analysis
✓ Quality scoring
✓ Multiple variations

### 2. AI Message Assistant
✓ Smart conversation starters
✓ Context-aware replies
✓ Message rewriting
✓ Tone adjustment
✓ Effectiveness scoring

### 3. Compatibility Enhancement
✓ Red flag detection (8 types)
✓ Relationship readiness assessment
✓ Communication style matching
✓ Safety recommendations
✓ Risk level analysis

## Important Notes

1. **First Request Slow**: Model loading takes time on first request
2. **No GPU Required**: Runs on CPU
3. **Memory Usage**: ~2-4GB per service
4. **No Breaking Changes**: All existing endpoints unchanged
5. **Rate Limiting**: Consider adding for production

## Troubleshooting

### Models Not Loading
```bash
# Install required packages
pip install transformers torch sentence-transformers
```

### Port Conflicts
- NLP Service: Change PORT in `.env` or config
- Recommendation Service: Change PORT in `.env` or config

### Memory Issues
- Reduce model size
- Use quantized models
- Increase available RAM

## Production Checklist

- [ ] Add rate limiting to expensive endpoints
- [ ] Set up model caching
- [ ] Configure proper logging
- [ ] Add monitoring/metrics
- [ ] Test with real user data
- [ ] Set up content moderation integration
- [ ] Configure appropriate timeouts
- [ ] Add API key authentication
- [ ] Set up error alerting
- [ ] Document API for frontend team

## Next Steps

1. Test all endpoints locally
2. Review generated content quality
3. Adjust model parameters if needed
4. Deploy to staging environment
5. Gather user feedback
6. Iterate and improve

## Support

For questions or issues:
- Check logs in service directories
- Review `AI_CONTENT_ENHANCEMENT_IMPLEMENTATION.md` for details
- Test with curl commands above
- Verify service health endpoints

## Documentation

Full documentation: `AI_CONTENT_ENHANCEMENT_IMPLEMENTATION.md`
