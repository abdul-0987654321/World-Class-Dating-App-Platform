# Flamoral Development Inventory

Complete inventory of all backend service components including controllers, services, repositories, DTOs, entities, guards, and more.

**Last Updated:** 2025-12-17

## Summary

- **Total Services:** 18
- **Total Controllers:** 81
- **Total Services:** 150+
- **Total Repositories:** 50+
- **Total Entities:** 35+
- **Total DTOs:** 50+
- **Total Guards:** 7

---

## 1. Admin Service

**Location:** `backend/services/admin-service/`

### Services
- `src/services/dashboard.service.ts` - Admin dashboard data aggregation
- `src/services/health.service.ts` - System health monitoring
- `src/services/tickets.service.ts` - Support ticket management
- `src/services/users.service.ts` - User management

### Status
- Implementation: Partial
- Tests: Partial
- Documentation: Partial

---

## 2. Advertising Service

**Location:** `backend/services/advertising-service/`

### Controllers
- `src/api/controllers/creative.controller.ts` - Ad creative management
- `src/api/controllers/innovations.controller.ts` - Ad innovations
- `src/api/controllers/optimization.controller.ts` - Ad optimization
- `src/api/controllers/targeting.controller.ts` - Audience targeting

### Services
- `src/domain/services/creative.service.ts` - Creative management logic
- `src/domain/services/innovations.service.ts` - Innovation features
- `src/domain/services/optimization.service.ts` - Campaign optimization
- `src/domain/services/targeting.service.ts` - Targeting logic

### Repositories
- `src/domain/repositories/attribution.repository.ts` - Attribution tracking

### Status
- Implementation: Partial
- Tests: Minimal
- Documentation: Partial

---

## 3. AI Services

**Location:** `backend/services/ai-services/`

### Sub-services

#### Dating Coach Service
**Location:** `ai-services/dating-coach-service/`
- AI-powered dating advice
- Profile optimization suggestions
- Conversation starters

#### Fraud Detection
**Location:** `ai-services/fraud-detection/`
- Fake profile detection
- Suspicious behavior analysis
- Content authenticity verification

#### NLP Service
**Location:** `ai-services/nlp-service/`
- Natural language processing
- Sentiment analysis
- Content moderation support

#### Photo Analysis
**Location:** `ai-services/photo-analysis/`
- Photo verification
- Quality analysis
- Inappropriate content detection

#### Recommendation Service
**Location:** `ai-services/recommendation-service/`
- ML-powered match recommendations
- Collaborative filtering
- User preference learning

### Status
- Implementation: Partial
- Tests: Minimal
- Documentation: Yes (see `docs/services/AI_SERVICES_README.md`)

---

## 4. Analytics Service

**Location:** `backend/services/analytics-service/`

### Controllers
- `src/api/controllers/analytics.controller.ts` - Platform analytics
- `src/api/controllers/dashboard.controller.ts` - Dashboard metrics
- `src/api/controllers/events.controller.ts` - Event tracking
- `src/api/controllers/tracking.controller.ts` - User tracking

### Repositories
- `src/domain/repositories/attribution.repository.ts` - Attribution data
- `src/domain/repositories/engagement.repository.ts` - Engagement metrics
- `src/domain/repositories/events.repository.ts` - Event storage
- `src/domain/repositories/funnel.repository.ts` - Conversion funnels
- `src/domain/repositories/match-success.repository.ts` - Match analytics
- `src/domain/repositories/revenue.repository.ts` - Revenue tracking
- `src/domain/repositories/time-series.repository.ts` - Time-series data
- `src/domain/repositories/tracking-event.repository.ts` - Tracking events

### Status
- Implementation: Partial
- Tests: Partial (unit tests exist)
- Documentation: Partial

---

## 5. API Gateway

**Location:** `backend/services/api-gateway/`

### Controllers
- `src/controllers/analytics.controller.ts` - Analytics proxy
- `src/controllers/auth.controller.ts` - Authentication proxy
- `src/controllers/csrf.controller.ts` - CSRF token management
- `src/controllers/matching.controller.ts` - Matching proxy
- `src/controllers/media.controller.ts` - Media proxy
- `src/controllers/messaging.controller.ts` - Messaging proxy
- `src/controllers/moderation.controller.ts` - Moderation proxy
- `src/controllers/notification.controller.ts` - Notification proxy
- `src/controllers/payment.controller.ts` - Payment proxy
- `src/controllers/rate-limit-admin.controller.ts` - Rate limit admin
- `src/controllers/security.controller.ts` - Security endpoints
- `src/controllers/user.controller.ts` - User proxy
- `src/health/health.controller.ts` - Health checks

### Services
- `src/services/circuit-breaker.service.ts` - Circuit breaker pattern
- `src/services/ddos-protection.service.ts` - DDoS protection
- `src/services/proxy.service.ts` - Request proxying
- `src/health/health-aggregator.service.ts` - Health aggregation

### Guards
- `src/guards/comprehensive-rate-limit.guard.ts` - Rate limiting
- `src/guards/csrf.guard.ts` - CSRF protection
- `src/guards/jwt-auth.guard.ts` - JWT authentication
- `src/guards/redis-throttler.guard.ts` - Redis-based throttling
- `src/guards/roles.guard.ts` - Role-based access control
- `src/guards/subscription.guard.ts` - Subscription validation

### Middleware
- CSRF protection
- Rate limiting
- Request logging
- Error handling

### Status
- Implementation: Complete
- Tests: Good (unit + integration)
- Documentation: Good

---

## 6. Auth Service

**Location:** `backend/services/auth-service/`

### Controllers
- `src/api/controllers/auth.controller.ts` - Authentication endpoints

### Services
- `src/domain/services/account-lockout.service.ts` - Account lockout logic
- `src/domain/services/auth.service.ts` - Core authentication
- `src/domain/services/device-fingerprint.service.ts` - Device fingerprinting
- `src/domain/services/password-breach-checker.service.ts` - Password security
- `src/domain/services/session-management.service.ts` - Session handling
- `src/domain/services/suspicious-login-detector.service.ts` - Fraud detection
- `src/infrastructure/email/email.service.ts` - Email notifications

### Repositories
- `src/domain/repositories/token.repository.ts` - Token management
- `src/domain/repositories/user.repository.ts` - User authentication data

### Status
- Implementation: Complete
- Tests: Excellent (unit + integration + e2e)
- Documentation: Good

---

## 7. Automation Service

**Location:** `backend/services/automation-service/`

### Controllers
- `src/api/controllers/icebreaker.controller.ts` - Icebreaker suggestions
- `src/api/controllers/reply-assistant.controller.ts` - Smart replies
- `src/api/controllers/scheduled-message.controller.ts` - Message scheduling
- `src/controllers/message-automation.controller.ts` - Automation management
- `src/controllers/smart-reply.controller.ts` - Smart reply alternatives

### Services
- `src/services/ghosting-detection.service.ts` - Ghosting detection
- `src/services/icebreaker.service.ts` - Icebreaker generation
- `src/services/message-automation.service.ts` - Automation logic
- `src/services/reply-assistant.service.ts` - Reply assistance
- `src/services/scheduled-message.service.ts` - Message scheduling
- `src/services/smart-reply.service.ts` - Smart reply generation
- `src/services/workflow-engine.service.ts` - Workflow execution

### DTOs
- `src/dtos/automation-flow.dto.ts` - Automation flow configuration
- `src/dtos/conversation-automation.dto.ts` - Conversation automation
- `src/dtos/icebreaker.dto.ts` - Icebreaker DTOs
- `src/dtos/scheduled-message.dto.ts` - Scheduled message DTOs

### Status
- Implementation: Partial
- Tests: Partial
- Documentation: Partial

---

## 8. Matching Service

**Location:** `backend/services/matching-service/`

### Controllers
- `src/api/controllers/boost.controller.ts` - Profile boost
- `src/api/controllers/insights.controller.ts` - Match insights
- `src/api/controllers/match.controller.ts` - Match management
- `src/api/controllers/recommendation.controller.ts` - Recommendations
- `src/api/controllers/super-like.controller.ts` - Super like feature
- `src/api/controllers/swipe.controller.ts` - Swipe actions

### Services
- `src/domain/services/advanced-filters.service.ts` - Advanced filtering
- `src/domain/services/badge-matching.service.ts` - Badge-based matching
- `src/domain/services/boost.service.ts` - Boost logic
- `src/domain/services/match.service.ts` - Match creation/management
- `src/domain/services/matching-algorithm.service.ts` - Core algorithm
- `src/domain/services/mode-matching-algorithm.service.ts` - Mode-specific matching
- `src/domain/services/profile-insights.service.ts` - Profile insights
- `src/domain/services/recommendation.service.ts` - Recommendation engine
- `src/domain/services/super-like.service.ts` - Super like logic
- `src/domain/services/swipe.service.ts` - Swipe processing
- `src/services/location-boost.service.ts` - Location-based boosting
- `src/services/ml-scoring.service.ts` - ML-based scoring
- `src/services/search.service.ts` - User search

### Repositories
- `src/domain/repositories/match.repository.ts` - Match data
- `src/domain/repositories/swipe.repository.ts` - Swipe data

### Entities
- `src/domain/entities/Match.entity.ts` - Match entity
- `src/domain/entities/Swipe.entity.ts` - Swipe entity

### Status
- Implementation: Good
- Tests: Good (unit + integration)
- Documentation: Good

---

## 9. Media Service

**Location:** `backend/services/media-service/`

### Controllers
- `src/api/controllers/upload.controller.ts` - File uploads
- `src/api/controllers/video.controller.ts` - Video management
- `src/api/controllers/voice-note.controller.ts` - Voice notes

### Services
- `src/domain/services/audio-processing.service.ts` - Audio processing
- `src/domain/services/content-moderation.service.ts` - Content moderation
- `src/domain/services/image-processing.service.ts` - Image processing
- `src/domain/services/photo-verification.service.ts` - Photo verification
- `src/domain/services/upload.service.ts` - Upload handling
- `src/domain/services/video-processing.service.ts` - Video processing
- `src/domain/services/video-upload.service.ts` - Video upload
- `src/domain/services/voice-note.service.ts` - Voice note handling
- `src/infrastructure/storage/azure-storage.service.ts` - Azure Blob Storage
- `src/services/video-thumbnails.service.ts` - Thumbnail generation

### Repositories
- `src/domain/repositories/media.repository.ts` - Media metadata
- `src/domain/repositories/video.repository.ts` - Video metadata
- `src/domain/repositories/voice-note.repository.ts` - Voice note metadata

### Entities
- `src/domain/entities/Media.entity.ts` - Media entity

### Status
- Implementation: Good
- Tests: Good (unit + integration + e2e)
- Documentation: Good

---

## 10. Messaging Service

**Location:** `backend/services/messaging-service/`

### Controllers
- `src/api/controllers/conversation-typing.controller.ts` - Typing indicators
- `src/api/controllers/conversation.controller.ts` - Conversation management
- `src/api/controllers/encryption-keys.controller.ts` - E2E encryption keys
- `src/api/controllers/enhanced-messaging.controller.ts` - Enhanced features
- `src/api/controllers/message.controller.ts` - Message management
- `src/api/controllers/read-receipt.controller.ts` - Read receipts

### Services
- `src/domain/services/encryption.service.ts` - Message encryption
- `src/domain/services/message.service.ts` - Message handling
- `src/domain/services/conversation.service.ts` - Conversation management

### Repositories
- `src/domain/repositories/conversation.repository.ts` - Conversation data
- `src/domain/repositories/message.repository.ts` - Message data

### Status
- Implementation: Good
- Tests: Good (unit + integration)
- Documentation: Good (see `docs/messaging-*.md`)

---

## 11. Moderation Service

**Location:** `backend/services/moderation-service/`

### Services
- Content moderation
- Automated filtering
- Manual review workflow
- CSAM detection integration

### Status
- Implementation: Partial
- Tests: Good (unit + integration)
- Documentation: Yes (see `docs/services/MODERATION_SERVICE_DOCUMENTATION.md`)

---

## 12. Notification Service

**Location:** `backend/services/notification-service/`

### Controllers
- `src/api/controllers/batch.controller.ts` - Batch notifications
- `src/api/controllers/device.controller.ts` - Device management
- `src/api/controllers/notification.controller.ts` - Notification management

### Services
- Push notification delivery
- Email notifications
- In-app notifications
- Device token management

### Status
- Implementation: Good
- Tests: Partial
- Documentation: Yes (see `docs/services/PUSH_NOTIFICATIONS.md`)

---

## 13. Payment Service

**Location:** `backend/services/payment-service/`

### Controllers
- `src/api/controllers/iap.controller.ts` - In-app purchases
- `src/api/controllers/payment.controller.ts` - Payment processing
- `src/api/controllers/webhook.controller.ts` - Stripe webhooks

### Services
- Stripe integration
- Subscription management
- IAP verification (iOS/Android)
- Payment history

### Status
- Implementation: Good
- Tests: Good (unit + integration)
- Documentation: Yes (see `docs/services/WEBHOOK_INTEGRATION.md`)

---

## 14. Policy Service

**Location:** `backend/services/policy-service/`

### Features
- Terms of Service
- Privacy Policy
- Community Guidelines
- Policy versioning

### Status
- Implementation: Partial
- Tests: Minimal
- Documentation: Minimal

---

## 15. Realtime Service

**Location:** `backend/services/realtime-service/`

### Features
- WebSocket connections
- Real-time messaging
- Typing indicators
- Online status
- Match notifications
- Read receipts

### Status
- Implementation: Good
- Tests: Partial
- Documentation: Yes (see `docs/services/WEBSOCKET_INTEGRATION.md`)

---

## 16. User Service

**Location:** `backend/services/user-service/`

### Controllers
- `src/api/controllers/achievements.controller.ts` - User achievements
- `src/api/controllers/auth.controller.ts` - User authentication
- Multiple profile, preference, and privacy controllers

### Services
- Profile management
- Preference handling
- Privacy settings
- Photo management
- Blocking/reporting
- Subscription management
- Coin system

### Repositories
- `src/domain/repositories/Achievement.repository.ts`
- `src/domain/repositories/Badge.repository.ts`
- `src/domain/repositories/blocked-user.repository.ts`
- `src/domain/repositories/boost-product.repository.ts`
- `src/domain/repositories/boost.repository.ts`
- `src/domain/repositories/Challenge.repository.ts`
- `src/domain/repositories/coin-product.repository.ts`
- `src/domain/repositories/coin-transaction.repository.ts`
- `src/domain/repositories/coin.repository.ts`
- `src/domain/repositories/conversation.repository.ts`
- `src/domain/repositories/DailyReward.repository.ts`
- `src/domain/repositories/Experience.repository.ts`
- `src/domain/repositories/interestIntentionBadge.repository.ts`
- `src/domain/repositories/photo.repository.ts`
- `src/domain/repositories/preferences.repository.ts`
- `src/domain/repositories/privacy-setting.repository.ts`
- `src/domain/repositories/profile.repository.ts`
- `src/domain/repositories/prompt-answer.repository.ts`
- `src/domain/repositories/report.repository.ts`
- `src/domain/repositories/subscription.repository.ts`
- `src/domain/repositories/user.repository.ts`

### Entities
- `src/domain/entities/Achievement.entity.ts`
- `src/domain/entities/Badge.entity.ts`
- `src/domain/entities/BlockedUser.entity.ts`
- `src/domain/entities/Boost.entity.ts`
- `src/domain/entities/BoostProduct.entity.ts`
- `src/domain/entities/Challenge.entity.ts`
- `src/domain/entities/Coin.entity.ts`
- `src/domain/entities/CoinProduct.entity.ts`
- `src/domain/entities/CoinTransaction.entity.ts`
- `src/domain/entities/Conversation.entity.ts`
- `src/domain/entities/DailyLoginReward.entity.ts`
- `src/domain/entities/DailyReward.entity.ts`
- `src/domain/entities/Experience.entity.ts`
- `src/domain/entities/InterestIntentionBadge.entity.ts`
- `src/domain/entities/Match.entity.ts`
- `src/domain/entities/Message.entity.ts`
- `src/domain/entities/OpeningMove.entity.ts`
- `src/domain/entities/Photo.entity.ts`
- `src/domain/entities/Preferences.entity.ts`
- `src/domain/entities/PrivacySetting.entity.ts`
- `src/domain/entities/Profile.entity.ts`
- `src/domain/entities/Prompt.entity.ts`
- `src/domain/entities/Report.entity.ts`
- `src/domain/entities/ReportCategory.entity.ts`
- `src/domain/entities/Reward.entity.ts`
- `src/domain/entities/SocialAccount.entity.ts`
- `src/domain/entities/Subscription.entity.ts`
- `src/domain/entities/SuperLike.entity.ts`
- `src/domain/entities/User.entity.ts`

### Status
- Implementation: Excellent
- Tests: Excellent (unit + integration + e2e)
- Documentation: Good

---

## 17. Workflow Engine

**Location:** `backend/services/workflow-engine/`

### Features
- Business process automation
- Workflow definition
- Trigger management
- Action execution

### DTOs
- `src/dto/create-workflow.dto.ts`
- `src/dto/trigger-workflow.dto.ts`
- `src/dto/update-workflow.dto.ts`

### Guards
- `src/guards/internal-service.guard.ts` - Internal service authentication

### Status
- Implementation: Partial
- Tests: Minimal
- Documentation: Minimal

---

## 18. Shared Libraries

**Location:** `backend/services/shared/`

### Common Components
- DTOs
- Interfaces
- Utilities
- Constants
- Decorators
- Filters
- Interceptors
- Pipes

---

## Development Patterns

### Architecture
- **Pattern:** Clean Architecture / Hexagonal Architecture
- **Layers:** API → Domain → Infrastructure
- **DI:** NestJS Dependency Injection

### Code Organization
```
service/
├── src/
│   ├── api/
│   │   ├── controllers/     # HTTP endpoints
│   │   ├── routes/          # Route definitions
│   │   └── dto/             # Data Transfer Objects
│   ├── domain/
│   │   ├── entities/        # Domain models
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access interfaces
│   │   └── interfaces/      # Domain interfaces
│   ├── infrastructure/
│   │   ├── database/        # Database implementation
│   │   ├── external/        # External service clients
│   │   └── config/          # Configuration
│   ├── guards/              # Authentication/Authorization
│   ├── middleware/          # Request/Response middleware
│   └── utils/               # Utility functions
├── tests/
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
└── __tests__/               # Alternative test location
```

### Testing Strategy
- **Unit Tests:** All services and repositories
- **Integration Tests:** API endpoints with database
- **E2E Tests:** Complete user workflows
- **Coverage Target:** 80%+

### Documentation
Each service should have:
- README.md with setup instructions
- API documentation
- Architecture diagrams (if complex)
- Configuration guide

---

## Technology Stack

### Core Framework
- **Runtime:** Node.js 18+
- **Framework:** NestJS
- **Language:** TypeScript

### Databases
- **PostgreSQL:** User, matching, messaging data
- **MongoDB:** Analytics, logs
- **Redis:** Caching, sessions, rate limiting

### Storage
- **Azure Blob Storage:** Media files
- **Azure CDN:** Content delivery

### Message Queue
- **RabbitMQ:** Inter-service communication
- **Azure Service Bus:** Event streaming

### Monitoring
- **Application Insights:** APM
- **Azure Monitor:** Infrastructure monitoring
- **Winston:** Logging

---

## Development Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+
- Redis 6+
- RabbitMQ 3.11+

### Local Development
```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Start databases
docker-compose up -d postgres redis rabbitmq

# Run migrations
npm run migration:run

# Start service
npm run start:dev
```

### Environment Variables
Each service requires:
- Database connection strings
- Redis connection
- RabbitMQ connection
- Service-specific API keys
- JWT secrets

---

## Related Documentation

- [API Inventory](../api/api-inventory.md) - Complete API endpoint listing
- [Test Inventory](../testing/test-inventory.md) - Test coverage details
- [Architecture Overview](../architecture/ARCHITECTURE.md) - System architecture
- [Service Documentation](../services/) - Individual service guides
- [Development Guide](../deployment/DEV_GUIDE.md) - Development workflow

---

**Maintained by:** Flamoral Development Team
**For questions:** See [Quick Start Guide](../deployment/QUICK_START.md)
