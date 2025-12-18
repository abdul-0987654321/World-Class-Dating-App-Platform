# Flamoral API Endpoint Inventory

Complete inventory of all API endpoints across the Flamoral platform, including implementation status, controller locations, and test coverage.

**Last Updated:** 2025-12-17

## Summary

- **Total Services:** 18
- **Total Controllers:** 81
- **API Gateway Endpoints:** Primary access point for all client requests
- **Internal Service Endpoints:** Service-to-service communication

## Status Legend

- **Implemented** - Fully implemented and tested
- **Partial** - Partially implemented, needs completion
- **Missing** - Endpoint defined but not implemented
- **N/A** - Not applicable or deprecated

---

## 1. Authentication Service (auth-service)

**Base Path:** `/api/auth`
**Controller:** `backend/services/auth-service/src/api/controllers/auth.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/register` | Register new user | Implemented | Yes |
| POST | `/login` | User login | Implemented | Yes |
| POST | `/logout` | User logout | Implemented | Yes |
| POST | `/refresh-token` | Refresh access token | Implemented | Yes |
| POST | `/verify-email` | Verify email address | Implemented | Yes |
| POST | `/resend-verification` | Resend verification email | Implemented | Yes |
| POST | `/forgot-password` | Request password reset | Implemented | Yes |
| POST | `/reset-password` | Reset password with token | Implemented | Yes |
| GET | `/me` | Get current user info | Implemented | Yes |
| POST | `/change-password` | Change user password | Implemented | Yes |
| POST | `/oauth/:provider` | OAuth login (Google, Facebook, Apple) | Implemented | Yes |
| POST | `/oauth/:provider/callback` | OAuth callback | Implemented | Yes |
| POST | `/2fa/enable` | Enable 2FA | Implemented | Yes |
| POST | `/2fa/verify` | Verify 2FA code | Implemented | Yes |
| POST | `/2fa/disable` | Disable 2FA | Implemented | Yes |

---

## 2. User Service (user-service)

**Base Path:** `/api/users`
**Controller:** `backend/services/user-service/src/api/controllers/`

### User Profile Endpoints

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/me` | Get current user profile | Implemented | Yes |
| PUT | `/me` | Update current user profile | Implemented | Yes |
| GET | `/:userId` | Get user by ID | Implemented | Yes |
| PUT | `/:userId` | Update user by ID (admin) | Implemented | Yes |
| DELETE | `/:userId` | Delete user account | Implemented | Yes |
| GET | `/:userId/profile` | Get public profile | Implemented | Yes |
| PATCH | `/me/settings` | Update user settings | Implemented | Yes |
| GET | `/me/preferences` | Get user preferences | Implemented | Yes |
| PUT | `/me/preferences` | Update user preferences | Implemented | Yes |

### Photo Management

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/me/photos` | Upload profile photo | Implemented | Yes |
| GET | `/me/photos` | Get user photos | Implemented | Yes |
| DELETE | `/me/photos/:photoId` | Delete photo | Implemented | Yes |
| PUT | `/me/photos/:photoId/primary` | Set primary photo | Implemented | Yes |
| PUT | `/me/photos/:photoId/order` | Reorder photos | Implemented | Yes |

### Privacy & Safety

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/me/block/:userId` | Block user | Implemented | Yes |
| DELETE | `/me/block/:userId` | Unblock user | Implemented | Yes |
| GET | `/me/blocked` | Get blocked users | Implemented | Yes |
| POST | `/me/report/:userId` | Report user | Implemented | Yes |
| GET | `/me/privacy` | Get privacy settings | Implemented | Yes |
| PUT | `/me/privacy` | Update privacy settings | Implemented | Yes |

### Subscription & Coins

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/me/subscription` | Get subscription status | Implemented | Yes |
| GET | `/me/coins` | Get coin balance | Implemented | Yes |
| POST | `/me/coins/purchase` | Purchase coins | Implemented | Yes |
| GET | `/me/coins/history` | Get coin transaction history | Implemented | Yes |

### Achievements

**Controller:** `backend/services/user-service/src/api/controllers/achievements.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/me/achievements` | Get user achievements | Implemented | Yes |
| GET | `/achievements` | Get all available achievements | Implemented | Yes |

---

## 3. Matching Service (matching-service)

**Base Path:** `/api/matching`
**Controller:** `backend/services/matching-service/src/api/controllers/`

### Swipe Endpoints

**Controller:** `swipe.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/swipe/like` | Like a profile | Implemented | Yes |
| POST | `/swipe/pass` | Pass on a profile | Implemented | Yes |
| POST | `/swipe/undo` | Undo last swipe | Implemented | Partial |
| GET | `/swipe/history` | Get swipe history | Implemented | Yes |

### Match Endpoints

**Controller:** `match.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/matches` | Get all matches | Implemented | Yes |
| GET | `/matches/:matchId` | Get match details | Implemented | Yes |
| DELETE | `/matches/:matchId` | Unmatch | Implemented | Yes |
| GET | `/matches/new` | Get new matches | Implemented | Yes |

### Recommendation Endpoints

**Controller:** `recommendation.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/recommendations` | Get personalized recommendations | Implemented | Yes |
| POST | `/recommendations/refresh` | Refresh recommendations | Implemented | Yes |
| GET | `/recommendations/nearby` | Get nearby users | Implemented | Yes |

### Super Like Endpoints

**Controller:** `super-like.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/super-like/:userId` | Send super like | Implemented | Yes |
| GET | `/super-like/remaining` | Get remaining super likes | Implemented | Yes |
| GET | `/super-like/received` | Get received super likes | Implemented | Yes |

### Boost Endpoints

**Controller:** `boost.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/boost/activate` | Activate profile boost | Implemented | Yes |
| GET | `/boost/status` | Get boost status | Implemented | Yes |
| GET | `/boost/history` | Get boost history | Implemented | Yes |

### Insights Endpoints

**Controller:** `insights.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/insights` | Get profile insights | Implemented | Yes |
| GET | `/insights/views` | Get profile views | Implemented | Yes |
| GET | `/insights/likes` | Get likes received | Implemented | Yes |

---

## 4. Messaging Service (messaging-service)

**Base Path:** `/api/messages`
**Controller:** `backend/services/messaging-service/src/api/controllers/`

### Message Endpoints

**Controller:** `message.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/send` | Send message | Implemented | Yes |
| GET | `/conversation/:conversationId` | Get conversation messages | Implemented | Yes |
| DELETE | `/:messageId` | Delete message | Implemented | Yes |
| PUT | `/:messageId/read` | Mark message as read | Implemented | Yes |
| POST | `/:messageId/react` | React to message | Implemented | Yes |

### Conversation Endpoints

**Controller:** `conversation.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/conversations` | Get all conversations | Implemented | Yes |
| GET | `/conversations/:conversationId` | Get conversation details | Implemented | Yes |
| DELETE | `/conversations/:conversationId` | Delete conversation | Implemented | Yes |
| PUT | `/conversations/:conversationId/mute` | Mute conversation | Implemented | Yes |
| PUT | `/conversations/:conversationId/unmute` | Unmute conversation | Implemented | Yes |

### Typing Indicators

**Controller:** `conversation-typing.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/typing/start/:conversationId` | Start typing indicator | Implemented | Yes |
| POST | `/typing/stop/:conversationId` | Stop typing indicator | Implemented | Yes |

### Read Receipts

**Controller:** `read-receipt.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/read/:messageId` | Mark message as read | Implemented | Yes |
| GET | `/read/:conversationId` | Get read receipts | Implemented | Yes |

### End-to-End Encryption

**Controller:** `encryption-keys.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/encryption/keys` | Upload encryption keys | Implemented | Yes |
| GET | `/encryption/keys/:userId` | Get user encryption keys | Implemented | Yes |
| PUT | `/encryption/keys` | Update encryption keys | Implemented | Yes |

### Enhanced Messaging

**Controller:** `enhanced-messaging.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/enhanced/gif` | Send GIF | Implemented | Yes |
| POST | `/enhanced/voice-note` | Send voice note | Implemented | Yes |
| POST | `/enhanced/location` | Share location | Implemented | Yes |

---

## 5. Media Service (media-service)

**Base Path:** `/api/media`
**Controller:** `backend/services/media-service/src/api/controllers/`

### Upload Endpoints

**Controller:** `upload.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/upload/photo` | Upload photo | Implemented | Yes |
| POST | `/upload/video` | Upload video | Implemented | Yes |
| POST | `/upload/avatar` | Upload avatar | Implemented | Yes |
| GET | `/:mediaId` | Get media file | Implemented | Yes |
| DELETE | `/:mediaId` | Delete media file | Implemented | Yes |

### Video Endpoints

**Controller:** `video.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/video/upload` | Upload video to profile | Implemented | Yes |
| GET | `/video/:videoId` | Get video | Implemented | Yes |
| DELETE | `/video/:videoId` | Delete video | Implemented | Yes |
| GET | `/video/:videoId/status` | Get processing status | Implemented | Yes |
| POST | `/video/:videoId/thumbnail` | Generate thumbnail | Implemented | Yes |

### Voice Note Endpoints

**Controller:** `voice-note.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/voice-note` | Upload voice note | Implemented | Yes |
| GET | `/voice-note/:noteId` | Get voice note | Implemented | Yes |
| DELETE | `/voice-note/:noteId` | Delete voice note | Implemented | Yes |

---

## 6. Notification Service (notification-service)

**Base Path:** `/api/notifications`
**Controller:** `backend/services/notification-service/src/api/controllers/`

### Notification Endpoints

**Controller:** `notification.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/` | Get all notifications | Implemented | Yes |
| GET | `/unread` | Get unread notifications | Implemented | Yes |
| PUT | `/:notificationId/read` | Mark as read | Implemented | Yes |
| PUT | `/read-all` | Mark all as read | Implemented | Yes |
| DELETE | `/:notificationId` | Delete notification | Implemented | Yes |
| GET | `/settings` | Get notification settings | Implemented | Yes |
| PUT | `/settings` | Update notification settings | Implemented | Yes |

### Device Management

**Controller:** `device.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/devices` | Register device | Implemented | Yes |
| GET | `/devices` | Get registered devices | Implemented | Yes |
| DELETE | `/devices/:deviceId` | Unregister device | Implemented | Yes |
| PUT | `/devices/:deviceId` | Update device token | Implemented | Yes |

### Batch Notifications

**Controller:** `batch.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/batch/send` | Send batch notifications | Implemented | Partial |

---

## 7. Payment Service (payment-service)

**Base Path:** `/api/payments`
**Controller:** `backend/services/payment-service/src/api/controllers/`

### Payment Endpoints

**Controller:** `payment.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/subscription/create` | Create subscription | Implemented | Yes |
| POST | `/subscription/cancel` | Cancel subscription | Implemented | Yes |
| GET | `/subscription/status` | Get subscription status | Implemented | Yes |
| POST | `/coins/purchase` | Purchase coins | Implemented | Yes |
| GET | `/history` | Get payment history | Implemented | Yes |
| GET | `/methods` | Get payment methods | Implemented | Yes |
| POST | `/methods` | Add payment method | Implemented | Yes |
| DELETE | `/methods/:methodId` | Delete payment method | Implemented | Yes |

### In-App Purchase Endpoints

**Controller:** `iap.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/iap/verify/ios` | Verify iOS purchase | Implemented | Yes |
| POST | `/iap/verify/android` | Verify Android purchase | Implemented | Yes |
| GET | `/iap/products` | Get available products | Implemented | Yes |

### Webhook Endpoints

**Controller:** `webhook.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/webhook/stripe` | Stripe webhook handler | Implemented | Yes |

---

## 8. Analytics Service (analytics-service)

**Base Path:** `/api/analytics`
**Controller:** `backend/services/analytics-service/src/api/controllers/`

### Analytics Endpoints

**Controller:** `analytics.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/stats` | Get platform statistics | Implemented | Partial |
| GET | `/user/:userId/stats` | Get user statistics | Implemented | Yes |
| GET | `/engagement` | Get engagement metrics | Implemented | Partial |

### Event Tracking

**Controller:** `events.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/events/track` | Track custom event | Implemented | Yes |
| GET | `/events/:userId` | Get user events | Implemented | Yes |

### Dashboard

**Controller:** `dashboard.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/dashboard/overview` | Get dashboard overview | Implemented | Partial |
| GET | `/dashboard/metrics` | Get key metrics | Implemented | Partial |

### Tracking

**Controller:** `tracking.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/track/page-view` | Track page view | Implemented | Yes |
| POST | `/track/action` | Track user action | Implemented | Yes |

---

## 9. Moderation Service (moderation-service)

**Base Path:** `/api/moderation`
**Controller:** `backend/services/moderation-service/src/api/controllers/`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/content/review` | Submit content for review | Implemented | Yes |
| POST | `/report` | Report content/user | Implemented | Yes |
| GET | `/reports` | Get reports (admin) | Implemented | Partial |
| PUT | `/reports/:reportId/resolve` | Resolve report | Implemented | Partial |
| POST | `/content/scan` | Scan content for violations | Implemented | Yes |

---

## 10. Automation Service (automation-service)

**Base Path:** `/api/automation`
**Controller:** `backend/services/automation-service/src/api/controllers/`

### Icebreaker

**Controller:** `icebreaker.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/icebreakers` | Get icebreaker suggestions | Implemented | Yes |
| POST | `/icebreakers/send` | Send icebreaker | Implemented | Yes |

### Smart Reply

**Controller:** `reply-assistant.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/smart-reply/suggest` | Get reply suggestions | Implemented | Yes |
| POST | `/smart-reply/send` | Send smart reply | Implemented | Yes |

### Scheduled Messages

**Controller:** `scheduled-message.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/scheduled-messages` | Schedule message | Implemented | Yes |
| GET | `/scheduled-messages` | Get scheduled messages | Implemented | Yes |
| DELETE | `/scheduled-messages/:messageId` | Cancel scheduled message | Implemented | Yes |

### Message Automation

**Controller:** `message-automation.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/automation/enable` | Enable automation | Implemented | Yes |
| POST | `/automation/disable` | Disable automation | Implemented | Yes |
| GET | `/automation/settings` | Get automation settings | Implemented | Yes |

---

## 11. Advertising Service (advertising-service)

**Base Path:** `/api/advertising`
**Controller:** `backend/services/advertising-service/src/api/controllers/`

### Creative Management

**Controller:** `creative.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/creative` | Create ad creative | Implemented | Partial |
| GET | `/creative/:creativeId` | Get creative | Implemented | Partial |
| PUT | `/creative/:creativeId` | Update creative | Implemented | Partial |

### Targeting

**Controller:** `targeting.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/targeting/rules` | Create targeting rules | Implemented | Partial |
| GET | `/targeting/audience` | Get target audience | Implemented | Partial |

### Optimization

**Controller:** `optimization.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/optimization/recommendations` | Get optimization tips | Implemented | Partial |

---

## 12. Admin Service (admin-service)

**Base Path:** `/api/admin`
**Controller:** `backend/services/admin-service/src/`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/dashboard` | Get admin dashboard | Implemented | Partial |
| GET | `/users` | Get all users | Implemented | Partial |
| PUT | `/users/:userId/ban` | Ban user | Implemented | Partial |
| PUT | `/users/:userId/unban` | Unban user | Implemented | Partial |
| GET | `/reports` | Get all reports | Implemented | Partial |
| GET | `/analytics` | Get platform analytics | Implemented | Partial |

---

## 13. API Gateway

**Base Path:** `/api/*`
**Controller:** `backend/services/api-gateway/src/controllers/`

The API Gateway acts as the primary entry point for all client requests and proxies them to the appropriate microservices.

### Security Endpoints

**Controller:** `security.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/security/check` | Security health check | Implemented | Yes |

### CSRF Protection

**Controller:** `csrf.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/csrf/token` | Get CSRF token | Implemented | Yes |

### Rate Limit Admin

**Controller:** `rate-limit-admin.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/rate-limit/status/:userId` | Get rate limit status | Implemented | Partial |
| POST | `/rate-limit/reset/:userId` | Reset rate limit | Implemented | Partial |

### Health Check

**Controller:** `health.controller.ts`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/health` | Health check | Implemented | Yes |
| GET | `/health/services` | Services health status | Implemented | Yes |

---

## 14. Realtime Service (realtime-service)

**Protocol:** WebSocket
**Base Path:** `/ws`

| Event | Description | Status | Test Coverage |
|-------|-------------|--------|---------------|
| `connection` | WebSocket connection | Implemented | Yes |
| `message` | Real-time message | Implemented | Yes |
| `typing` | Typing indicator | Implemented | Yes |
| `match` | New match notification | Implemented | Yes |
| `online` | User online status | Implemented | Yes |
| `read` | Read receipt | Implemented | Yes |

---

## 15. AI Services

### Dating Coach Service

**Base Path:** `/api/ai/dating-coach`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/advice` | Get dating advice | Implemented | Partial |
| POST | `/profile-review` | Get profile review | Implemented | Partial |

### Fraud Detection Service

**Base Path:** `/api/ai/fraud-detection`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/scan/profile` | Scan profile for fraud | Implemented | Partial |
| POST | `/scan/photo` | Scan photo for fraud | Implemented | Partial |

### NLP Service

**Base Path:** `/api/ai/nlp`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/analyze/text` | Analyze text | Implemented | Partial |
| POST | `/sentiment` | Get sentiment analysis | Implemented | Partial |

### Photo Analysis Service

**Base Path:** `/api/ai/photo-analysis`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/verify` | Verify photo authenticity | Implemented | Yes |
| POST | `/analyze` | Analyze photo quality | Implemented | Partial |

### Recommendation Service (ML)

**Base Path:** `/api/ai/recommendations`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/train` | Train recommendation model | Implemented | Partial |
| GET | `/predict/:userId` | Get ML predictions | Implemented | Partial |

---

## 16. Policy Service (policy-service)

**Base Path:** `/api/policy`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| GET | `/terms` | Get terms of service | Implemented | Partial |
| GET | `/privacy` | Get privacy policy | Implemented | Partial |
| GET | `/community-guidelines` | Get community guidelines | Implemented | Partial |

---

## 17. Workflow Engine (workflow-engine)

**Base Path:** `/api/workflows`

| Method | Endpoint | Description | Status | Test Coverage |
|--------|----------|-------------|--------|---------------|
| POST | `/create` | Create workflow | Implemented | Partial |
| POST | `/trigger` | Trigger workflow | Implemented | Partial |
| GET | `/:workflowId` | Get workflow | Implemented | Partial |

---

## Test Coverage Summary

### By Service

| Service | Unit Tests | Integration Tests | E2E Tests | Coverage % |
|---------|-----------|-------------------|-----------|------------|
| Auth Service | Yes | Yes | Yes | 85% |
| User Service | Yes | Yes | Yes | 80% |
| Matching Service | Yes | Yes | Partial | 75% |
| Messaging Service | Yes | Yes | Partial | 70% |
| Media Service | Yes | Yes | Yes | 75% |
| Notification Service | Yes | Partial | Partial | 65% |
| Payment Service | Yes | Yes | Partial | 70% |
| Analytics Service | Partial | Partial | No | 45% |
| Moderation Service | Yes | Yes | No | 60% |
| Automation Service | Partial | Partial | No | 50% |
| API Gateway | Yes | Yes | Yes | 80% |
| Realtime Service | Partial | Partial | No | 55% |

### Missing Tests

High-priority endpoints that need test coverage:
1. Analytics Service - Dashboard endpoints
2. Advertising Service - All endpoints
3. Admin Service - All endpoints
4. AI Services - ML prediction endpoints
5. Workflow Engine - All endpoints

---

## Implementation Notes

### Authentication
- All endpoints (except those marked `@Public()`) require JWT authentication
- Token passed via `Authorization: Bearer <token>` header
- Rate limiting applied per user/IP

### Error Handling
- Standard HTTP status codes
- Consistent error response format:
  ```json
  {
    "statusCode": 400,
    "message": "Error description",
    "error": "Bad Request"
  }
  ```

### Pagination
- List endpoints support pagination via query parameters:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20, max: 100)
  - Response includes: `data`, `total`, `page`, `limit`

### Rate Limiting
- Applied at API Gateway level
- Different limits for authenticated vs anonymous users
- Configurable per endpoint

---

## Related Documentation

- [API Reference Complete](./API_REFERENCE_COMPLETE.md) - Detailed API specifications
- [WebSocket API](./WEBSOCKET_API.md) - Real-time WebSocket documentation
- [Integration Guides](./INTEGRATION_GUIDES.md) - Third-party integrations
- [Development Inventory](../development/development-inventory.md) - Service components
- [Test Inventory](../testing/test-inventory.md) - Test files and coverage

---

**Maintained by:** Flamoral Development Team
**For questions:** See [Development Guide](../deployment/DEV_GUIDE.md)
