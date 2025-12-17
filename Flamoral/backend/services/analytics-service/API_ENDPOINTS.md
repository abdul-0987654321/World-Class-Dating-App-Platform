# Analytics Service - API Endpoints

Base URL: `http://localhost:3007`

---

## Health & Service Info

### Get Service Health
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2025-12-15T...",
  "database": {
    "connected": true,
    "pool": {
      "totalCount": 5,
      "idleCount": 4,
      "waitingCount": 0
    }
  }
}
```

### Get Service Info
```http
GET /
```

---

## Event Tracking Endpoints

### Track Single Event
```http
POST /api/tracking/event
Content-Type: application/json

{
  "userId": "uuid",
  "sessionId": "session-123",
  "eventType": "page_view",
  "eventName": "landing_page_view",
  "utmSource": "facebook",
  "utmMedium": "cpc",
  "utmCampaign": "summer_2025",
  "pageUrl": "https://flamoral.com",
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.1",
  "deviceType": "mobile"
}
```

### Track Batch Events
```http
POST /api/tracking/events
Content-Type: application/json

{
  "events": [
    {
      "eventType": "page_view",
      "eventName": "landing_page_view",
      "sessionId": "session-123"
    },
    {
      "eventType": "click",
      "eventName": "signup_button_click",
      "sessionId": "session-123"
    }
  ]
}
```

### Track User Attribution
```http
POST /api/tracking/attribution
Content-Type: application/json

{
  "userId": "uuid",
  "source": "facebook",
  "medium": "cpc",
  "campaign": "summer_2025",
  "clickId": {
    "fbclid": "abc123"
  },
  "landingPage": "https://flamoral.com",
  "referrer": "https://facebook.com"
}
```

### Create Session
```http
POST /api/tracking/session
Content-Type: application/json

{
  "sessionId": "session-123",
  "userId": "uuid",
  "utmSource": "facebook",
  "utmCampaign": "summer_2025"
}
```

### Update Funnel Step
```http
POST /api/tracking/funnel/step
Content-Type: application/json

{
  "sessionId": "session-123",
  "userId": "uuid",
  "step": "registration_completed_at",
  "timestamp": "2025-12-15T10:30:00Z"
}
```

---

## Specialized Event Tracking

### Track Swipe Event
```http
POST /api/events/swipe
Content-Type: application/json

{
  "userId": "uuid",
  "targetUserId": "uuid",
  "direction": "right",
  "sessionId": "session-123",
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  }
}
```

### Track Match Event
```http
POST /api/events/match
Content-Type: application/json

{
  "matchId": "uuid",
  "userId1": "uuid",
  "userId2": "uuid",
  "mutualSwipeTime": 3600000,
  "sessionId": "session-123"
}
```

### Track Message Event
```http
POST /api/events/message
Content-Type: application/json

{
  "conversationId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "messageLength": 150,
  "hasMedia": false,
  "responseTime": 300,
  "sessionId": "session-123"
}
```

### Track Session Event
```http
POST /api/events/session
Content-Type: application/json

{
  "sessionId": "session-123",
  "userId": "uuid",
  "startTime": "2025-12-15T10:00:00Z",
  "endTime": "2025-12-15T10:30:00Z",
  "duration": 1800,
  "screenViews": 15,
  "swipeCount": 25,
  "messageCount": 5,
  "profileViews": 10,
  "deviceType": "mobile",
  "appVersion": "1.0.0"
}
```

### Track Revenue Transaction
```http
POST /api/events/revenue
Content-Type: application/json

{
  "userId": "uuid",
  "transactionType": "subscription",
  "amount": 29.99,
  "currency": "USD",
  "paymentMethod": "stripe",
  "status": "completed",
  "subscriptionPlan": "premium_monthly"
}
```

### Update Transaction Status
```http
PUT /api/events/revenue/{transactionId}
Content-Type: application/json

{
  "status": "completed"
}
```

### Get User Swipe Stats
```http
GET /api/events/user/{userId}/swipe-stats?startDate=2025-12-01&endDate=2025-12-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSwipes": 150,
    "rightSwipes": 90,
    "leftSwipes": 55,
    "superLikes": 5,
    "swipeRate": 60
  }
}
```

### Get User Match Success
```http
GET /api/events/user/{userId}/match-success
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMatches": 25,
    "conversationStarted": 18,
    "conversationRate": 72,
    "averageResponseTime": 450
  }
}
```

---

## Analytics Queries

### Get Funnel Conversion Rates
```http
GET /api/analytics/funnel/conversion-rates?utmSource=facebook&startDate=2025-12-01&endDate=2025-12-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "utmSource": "facebook",
    "totalSessions": 1000,
    "registrationRate": 25.5,
    "profileCompletionRate": 80.2,
    "subscriptionRate": 12.3
  }
}
```

### Get Drop-off Analysis
```http
GET /api/analytics/funnel/dropoff?utmSource=facebook
```

### Get Attribution Summary
```http
GET /api/analytics/attribution/summary?startDate=2025-12-01&endDate=2025-12-15
```

### Get Events by Source
```http
GET /api/analytics/events/by-source?startDate=2025-12-01&endDate=2025-12-15
```

---

## Dashboard Analytics

### Get Dashboard Overview
```http
GET /api/dashboard/overview?startDate=2025-12-01&endDate=2025-12-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "averageDAU": 5000,
      "totalNewUsers": 1200,
      "totalMatches": 15000,
      "totalRevenue": 45000,
      "conversionRate": 72.5,
      "mrr": 12000,
      "arr": 144000
    },
    "realTime": {
      "activeUsers": 350,
      "activeSessionsLast5Min": 280,
      "eventsLast5Min": 1500
    },
    "trends": {
      "engagement": [...],
      "revenue": {...}
    }
  }
}
```

### Get Engagement Analytics
```http
GET /api/dashboard/engagement?startDate=2025-12-01&endDate=2025-12-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentMetrics": {
      "dau": 5000,
      "wau": 25000,
      "mau": 80000,
      "stickinessRatio": 6.25
    },
    "trends": [...],
    "retention": [...],
    "churn": {...},
    "featureUsage": [...],
    "timeOnApp": {...}
  }
}
```

### Get Match Success Analytics
```http
GET /api/dashboard/match-success?startDate=2025-12-01&endDate=2025-12-15
```

### Get Revenue Analytics
```http
GET /api/dashboard/revenue?startDate=2025-12-01&endDate=2025-12-15
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRevenue": 45000,
      "mrr": 12000,
      "arr": 144000
    },
    "subscriptions": {...},
    "coinPurchases": {...},
    "arpu": 15.5,
    "arppu": 42.3,
    "topRevenueUsers": [...]
  }
}
```

### Get User Behavior Analytics
```http
GET /api/dashboard/user-behavior?startDate=2025-12-01&endDate=2025-12-15&groupBy=day
```

### Get User Activity Summary
```http
GET /api/dashboard/user/{userId}/activity
```

### Get Time-Series Data
```http
GET /api/dashboard/time-series?metric=dau&startDate=2025-12-01&endDate=2025-12-15&groupBy=day
```

**Query Parameters:**
- `metric`: dau, swipes, matches, messages, revenue
- `groupBy`: hour, day, week, month

### Get Daily Metrics
```http
GET /api/dashboard/daily-metrics?startDate=2025-12-01&endDate=2025-12-15
```

### Get Hourly Metrics
```http
GET /api/dashboard/hourly-metrics?startDate=2025-12-15T00:00:00Z&endDate=2025-12-15T23:59:59Z
```

### Get Comparison Metrics
```http
GET /api/dashboard/comparison?currentStart=2025-12-01&currentEnd=2025-12-15&previousStart=2025-11-16&previousEnd=2025-11-30
```

### Get Real-Time Metrics
```http
GET /api/dashboard/real-time
```

**Response:**
```json
{
  "success": true,
  "data": {
    "activeUsers": 350,
    "activeSessionsLast5Min": 280,
    "eventsLast5Min": 1500,
    "swipesLast5Min": 850,
    "matchesLast5Min": 45,
    "messagesLast5Min": 320
  }
}
```

---

## Admin Operations

### Manually Aggregate Metrics
```http
POST /api/dashboard/aggregate
Content-Type: application/json

{
  "date": "2025-12-15",
  "type": "daily"
}
```

### Backfill Historical Metrics
```http
POST /api/dashboard/backfill
Content-Type: application/json

{
  "startDate": "2025-11-01",
  "endDate": "2025-11-30"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "daysProcessed": 30
  },
  "message": "Successfully backfilled 30 days of metrics"
}
```

### Test Event Tracking
```http
POST /api/dashboard/track-event
Content-Type: application/json

{
  "eventType": "swipe",
  "userId": "uuid",
  "targetUserId": "uuid",
  "direction": "right"
}
```

---

## Error Responses

All endpoints return errors in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable (database issue)

---

## Authentication

**Note**: Currently, the analytics service accepts requests without authentication for internal service-to-service communication. In production, you should add:

1. JWT token validation for external requests
2. Service API key validation for internal service requests
3. Rate limiting
4. IP whitelisting

Add this to `.env`:
```env
SERVICE_API_KEY=your-internal-service-key-32chars!
JWT_ACCESS_SECRET=your-jwt-secret-key
```

---

## Rate Limiting Recommendations

For production deployment, implement rate limiting:

- **Tracking Endpoints**: 1000 req/min per IP
- **Analytics Queries**: 100 req/min per user
- **Dashboard Endpoints**: 60 req/min per user
- **Admin Operations**: 10 req/min per admin user

---

## Example Usage with cURL

### Track an Event
```bash
curl -X POST http://localhost:3007/api/tracking/event \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "registration",
    "eventName": "registration_completed",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "sessionId": "session-abc123",
    "utmSource": "facebook",
    "utmCampaign": "summer_2025"
  }'
```

### Get Dashboard Overview
```bash
curl -X GET "http://localhost:3007/api/dashboard/overview?startDate=2025-12-01&endDate=2025-12-15"
```

### Get Real-Time Metrics
```bash
curl -X GET http://localhost:3007/api/dashboard/real-time
```

---

**Last Updated**: December 15, 2025
**API Version**: 1.0.0
