# FLAMORAL AI Assistant

Production-ready conversational AI system for the FLAMORAL dating platform.

## Overview

The AI Assistant provides personalized guidance, dating advice, safety tips, and feature help to users through a real-time chat interface.

## Features

- **Real-time Streaming**: Server-sent events (SSE) for smooth response streaming
- **Multi-Context Support**: 8 specialized contexts for different user needs
- **Session Memory**: Redis-backed conversation history with per-user persistence
- **Personalization**: Responses adapt based on user profile, tier, and activity
- **Rate Limiting**: Per-user, per-tier rate limits to prevent abuse
- **Safety Guardrails**: Content moderation and safety trigger detection
- **Dual AI Provider**: Supports both OpenAI and Anthropic Claude
- **Audit Logging**: Full request/response logging for compliance

## Architecture

```
Frontend (React)
    ↓
    ├── AIAssistantWidget.tsx (UI Component)
    ├── useAssistant.ts (React Hook)
    └── assistant.service.ts (API Client)
         ↓
Backend (Express/Node.js)
    ↓
    ├── assistant.routes.ts (Express Routes)
    ├── assistant.controller.ts (Request Handlers)
    ├── assistant.service.ts (Core Logic)
    ├── session-memory.service.ts (Redis Storage)
    └── prompt-templates.ts (AI Prompts)
         ↓
AI Provider (OpenAI/Claude)
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/assistant/message` | Send message, get response |
| POST | `/api/v1/assistant/stream` | Send message, stream response (SSE) |
| GET | `/api/v1/assistant/history/:sessionId` | Get conversation history |
| DELETE | `/api/v1/assistant/history/:sessionId` | Clear conversation |
| GET | `/api/v1/assistant/sessions` | Get user's sessions |
| GET | `/api/v1/assistant/usage` | Get usage statistics |
| POST | `/api/v1/assistant/feedback` | Submit message feedback |
| GET | `/api/v1/assistant/contexts` | Get available contexts |

## Environment Variables

```bash
# AI Provider Selection
AI_PROVIDER=openai  # or 'anthropic'

# OpenAI Configuration
OPENAI_API_KEY=sk-...

# Anthropic Configuration (alternative)
ANTHROPIC_API_KEY=sk-ant-...

# Model Configuration
AI_MODEL=gpt-4-turbo-preview  # or 'claude-3-opus-20240229'
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7

# Rate Limits (requests per day)
AI_RATE_LIMIT_FREE=20
AI_RATE_LIMIT_GOLD=100
AI_RATE_LIMIT_PLATINUM=250
AI_RATE_LIMIT_DIAMOND=500
# Elite tier is unlimited

# Redis (required for session storage)
REDIS_URL=redis://localhost:6379
```

## Contexts

| Context | Description |
|---------|-------------|
| `onboarding` | Help for new users getting started |
| `dating_advice` | Dating tips and relationship guidance |
| `safety_guidance` | Safety tips and reporting concerns |
| `feature_help` | How to use FLAMORAL features |
| `profile_coaching` | Profile optimization and tips |
| `conversation_tips` | Conversation starters and messaging |
| `troubleshooting` | Technical support and account help |
| `general` | General questions and assistance |

## Rate Limits

| Tier | Requests/Minute | Requests/Day | Tokens/Day |
|------|----------------|--------------|------------|
| FREE | 3 | 20 | 5,000 |
| GOLD | 10 | 100 | 25,000 |
| PLATINUM | 20 | 250 | 75,000 |
| DIAMOND | 30 | 500 | 150,000 |
| ELITE | 60 | Unlimited | Unlimited |

## Usage Example

### Frontend (React)

```tsx
import { AIAssistantWidget } from '@/components/AIAssistant';

function App() {
  return (
    <div>
      <AIAssistantWidget
        initialContext="general"
        position="bottom-right"
      />
    </div>
  );
}
```

### With Hook

```tsx
import { useAssistant, AssistantContext } from '@/components/AIAssistant';

function ChatComponent() {
  const {
    messages,
    isLoading,
    sendMessage,
    setContext,
  } = useAssistant({ initialContext: AssistantContext.DATING_ADVICE });

  return (
    // Your UI
  );
}
```

### Backend API

```bash
# Send a message
curl -X POST https://api.flamoral.com/api/v1/assistant/message \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{
    "message": "How do I improve my profile?",
    "context": "profile_coaching"
  }'

# Stream a response
curl -X POST https://api.flamoral.com/api/v1/assistant/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: access_token=..." \
  -d '{
    "message": "What makes a good first message?",
    "context": "conversation_tips"
  }'
```

## Safety Features

1. **Input Moderation**: Checks for prohibited content before processing
2. **Safety Triggers**: Detects mentions of abuse, harassment, self-harm
3. **Guardrails**: Never provides medical, legal, or financial advice
4. **Escalation**: Automatically provides safety resources when needed
5. **Audit Trail**: All interactions logged for 30 days

## Session Management

- Sessions persist for 24 hours in Redis
- Maximum 50 messages per session (older trimmed)
- Maximum 10 sessions per user
- Sessions can be manually cleared

## Error Handling

| Error Code | Description |
|------------|-------------|
| `ASSISTANT_RATE_LIMIT` | Rate limit exceeded |
| `ASSISTANT_INVALID_INPUT` | Invalid request data |
| `ASSISTANT_SESSION_NOT_FOUND` | Session doesn't exist |
| `ASSISTANT_AI_ERROR` | AI provider error |
| `ASSISTANT_CONTENT_BLOCKED` | Content moderation blocked |
| `ASSISTANT_INTERNAL_ERROR` | Internal server error |

## Testing

```bash
# Run unit tests
npm test -- --grep "assistant"

# Run integration tests
npm run test:integration -- --grep "assistant"
```

## Files

```
backend/services/auth-service/src/api/assistant/
├── README.md              # This file
├── index.ts               # Module exports
├── assistant.types.ts     # TypeScript types
├── assistant.service.ts   # Core AI service
├── assistant.controller.ts # HTTP handlers
├── assistant.routes.ts    # Express routes
├── assistant.validator.ts # Input validation
├── session-memory.service.ts # Redis session store
└── prompt-templates.ts    # AI system prompts

apps/web-app/src/
├── services/
│   └── assistant.service.ts # Frontend API client
└── components/AIAssistant/
    ├── index.ts
    ├── AIAssistantWidget.tsx # Chat widget
    └── useAssistant.ts       # React hook
```
