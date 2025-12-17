# Analytics Service - API Reference

## Base URL
```
http://localhost:3007
```

## Authentication
Most endpoints require JWT authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

For service-to-service calls, use the service API key:
```
X-Service-API-Key: <your_service_api_key>
```

---

## Event Tracking Endpoints

### Track Swipe Event
Track a user swipe action.

**Endpoint:** `POST /api/events/swipe`

**Request Body:**
```json
{
  "userId": "uuid",
  "targetUserId": "uuid",
  "direction": "left|right|super",
  "sessionId": "string (optional)",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "metadata": {}
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "targetUserId": "uuid",
    "direction": "right",
    "timestamp": "2025-01-19T12:00:00Z"
  },
  "message": "Swipe tracked successfully"
}
```

---

### Track Match Event
Track when two users match.

**Endpoint:** `POST /api/events/match`

**Request Body:**
```json
{
  "matchId": "uuid",
  "userId1": "uuid",
  "userId2": "uuid",
  "mutualSwipeTime": 3600000,
  "sessionId": "string (optional)"
}
```

**Response:** `201 Created`

---

### Track Message Event
Track a message sent in a conversation.

**Endpoint:** `POST /api/events/message`

**Request Body:**
```json
{
  "conversationId": "uuid",
  "senderId": "uuid",
  "receiverId": "uuid",
  "messageLength": 150,
  "hasMedia": false,
  "responseTime": 120,
  "sessionId": "string (optional)"
}
```

**Response:** `201 Created`

---

### Track Session
Track or update a user session.

**Endpoint:** `POST /api/events/session`

**Request Body:**
```json
{
  "sessionId": "string",
  "userId": "uuid (optional)",
  "startTime": "2025-01-19T12:00:00Z (optional)",
  "endTime": "2025-01-19T13:00:00Z (optional)",
  "duration": 3600,
  "screenViews": 15,
  "swipeCount": 50,
  "messageCount": 5,
  "profileViews": 10,
  "deviceType": "mobile",
  "appVersion": "1.2.0"
}
```

**Response:** `201 Created`

---

### Track Revenue Transaction
Track a payment or purchase.

**Endpoint:** `POST /api/events/revenue`

**Request Body:**
```json
{
  "userId": "uuid",
  "transactionType": "subscription|coins|boost|super_like|other",
  "amount": 9.99,
  "currency": "USD",
  "paymentMethod": "stripe",
  "status": "completed|pending|failed|refunded",
  "subscriptionPlan": "premium_monthly",
  "coinPackageSize": 100,
  "metadata": {}
}
```

**Response:** `201 Created`

---

### Track Date Arrangement
Track when users arrange a date.

**Endpoint:** `POST /api/events/date-arrangement`

**Request Body:**
```json
{
  "conversationId": "uuid",
  "userId1": "uuid",
  "userId2": "uuid",
  "status": "proposed|accepted|confirmed|completed|cancelled"
}
```

**Response:** `201 Created`

---

### Update Date Arrangement Status
Update the status of a date arrangement.

**Endpoint:** `PUT /api/events/date-arrangement/:id`

**Request Body:**
```json
{
  "status": "accepted|confirmed|completed|cancelled"
}
```

**Response:** `200 OK`

---

## Dashboard Endpoints

### Get Dashboard Overview
Get overall platform metrics.

**Endpoint:** `GET /api/dashboard/overview`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "averageDAU": 15000,
      "totalNewUsers": 5000,
      "totalMatches": 50000,
      "totalRevenue": 125000.50,
      "conversionRate": 35.5,
      "mrr": 85000,
      "arr": 1020000
    },
    "realTime": {
      "activeUsers": 1250,
      "sessionsStarted": 890,
      "swipesInLastHour": 12500,
      "matchesInLastHour": 450,
      "messagesInLastHour": 3200
    },
    "trends": {
      "engagement": [...],
      "revenue": {...}
    }
  }
}
```

---

### Get Real-Time Metrics
Get metrics for the last hour.

**Endpoint:** `GET /api/dashboard/real-time`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "activeUsers": 1250,
    "sessionsStarted": 890,
    "swipesInLastHour": 12500,
    "matchesInLastHour": 450,
    "messagesInLastHour": 3200
  }
}
```

---

### Get Engagement Analytics
Get comprehensive engagement metrics.

**Endpoint:** `GET /api/dashboard/engagement`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "currentMetrics": {
      "dau": 15000,
      "wau": 45000,
      "mau": 120000,
      "stickinessRatio": 12.5
    },
    "trends": [...],
    "retention": [...],
    "churn": {
      "totalUsersAtStart": 100000,
      "churnedUsers": 5000,
      "churnRate": 5.0
    },
    "featureUsage": [...],
    "timeOnApp": {
      "averageSessionDuration": 1800,
      "medianSessionDuration": 1200,
      "totalTimeSpent": 54000000,
      "averageTimePerUser": 450
    }
  }
}
```

---

### Get Match Success Analytics
Get match and conversation metrics.

**Endpoint:** `GET /api/dashboard/match-success`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalMatches": 50000,
      "conversationsStarted": 35000,
      "conversationRate": 70.0,
      "messagesExchanged": 250000,
      "averageMessagesPerConversation": 7.14,
      "datesArranged": 5000,
      "dateArrangementRate": 14.3,
      "averageTimeToFirstMessage": 3600000,
      "averageResponseTime": 1800
    },
    "funnel": {...},
    "dateArrangements": {...},
    "responseTimeDistribution": [...],
    "topConversations": [...]
  }
}
```

---

### Get Revenue Analytics
Get revenue and monetization metrics.

**Endpoint:** `GET /api/dashboard/revenue`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRevenue": 125000.50,
      "subscriptionRevenue": 85000,
      "coinPurchaseRevenue": 35000,
      "boostRevenue": 5000.50,
      "transactionCount": 15000,
      "averageTransactionValue": 8.33,
      "newSubscribers": 2500,
      "activeSubscribers": 12000,
      "mrr": 85000,
      "arr": 1020000
    },
    "subscriptions": [...],
    "coinPurchases": [...],
    "conversionFunnel": {...},
    "revenueTimeSeries": [...],
    "arpu": 1.04,
    "arppu": 10.42,
    "topRevenueUsers": [...]
  }
}
```

---

### Get User Behavior Analytics
Get user behavior patterns.

**Endpoint:** `GET /api/dashboard/user-behavior`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `groupBy` (optional): hour|day|week (default: day)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "sessionStats": {
      "totalSessions": 125000,
      "averageDuration": 1800,
      "averageSwipesPerSession": 25,
      "averageMessagesPerSession": 3
    },
    "swipeActivity": [...],
    "featureUsage": [...],
    "powerUsers": [...]
  }
}
```

---

### Get Time-Series Data
Get time-series data for any metric.

**Endpoint:** `GET /api/dashboard/time-series`

**Query Parameters:**
- `metric` (required): Metric name (e.g., dau, revenue, total_swipes)
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `groupBy` (optional): hour|day|week|month (default: day)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "metric": "dau",
    "period": "day",
    "dataPoints": [
      {
        "period": "2025-01-19T00:00:00Z",
        "value": 15000
      },
      {
        "period": "2025-01-18T00:00:00Z",
        "value": 14800
      }
    ]
  }
}
```

---

### Get Comparison Metrics
Compare two time periods.

**Endpoint:** `GET /api/dashboard/comparison`

**Query Parameters:**
- `currentStart` (required): ISO 8601 date string
- `currentEnd` (required): ISO 8601 date string
- `previousStart` (required): ISO 8601 date string
- `previousEnd` (required): ISO 8601 date string

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "current": {...},
    "previous": {...},
    "percentageChange": {
      "dau": 5.2,
      "revenue": 12.5,
      "sessions": 8.1,
      "matches": 15.3
    }
  }
}
```

---

### Get Daily Metrics
Get pre-aggregated daily metrics.

**Endpoint:** `GET /api/dashboard/daily-metrics`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-19T00:00:00Z",
      "dau": 15000,
      "newUsers": 500,
      "totalSessions": 45000,
      "averageSessionDuration": 1800,
      "totalSwipes": 750000,
      "totalMatches": 25000,
      "totalMessages": 150000,
      "revenue": 5000.00,
      "newSubscribers": 150
    }
  ]
}
```

---

### Get User Activity Summary
Get detailed activity for a specific user.

**Endpoint:** `GET /api/dashboard/user/:userId/activity`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "lastActiveAt": "2025-01-19T12:00:00Z",
    "totalSessions": 150,
    "totalDaysActive": 45,
    "averageSessionDuration": 2100,
    "totalSwipes": 3500,
    "totalMatches": 125,
    "totalMessages": 450,
    "isActive": true,
    "swipeStats": {
      "totalSwipes": 3500,
      "rightSwipes": 1750,
      "leftSwipes": 1700,
      "superLikes": 50,
      "swipeRate": 50
    },
    "matchSuccessRate": {
      "totalMatches": 125,
      "conversationStarted": 85,
      "conversationRate": 68,
      "averageResponseTime": 1200
    }
  }
}
```

---

## Admin Operations

### Aggregate Metrics
Manually trigger metrics aggregation.

**Endpoint:** `POST /api/dashboard/aggregate`

**Request Body:**
```json
{
  "date": "2025-01-19",
  "type": "daily|hourly"
}
```

**Response:** `200 OK`

---

### Backfill Metrics
Backfill historical aggregated metrics.

**Endpoint:** `POST /api/dashboard/backfill`

**Request Body:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-19"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "daysProcessed": 19
  },
  "message": "Successfully backfilled 19 days of metrics"
}
```

---

## Analytics Query Endpoints

### Get Funnel Conversion Rates
**Endpoint:** `GET /api/analytics/funnel/conversion-rates`

**Query Parameters:**
- `utmSource` (optional): Filter by UTM source
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

---

### Get Attribution Summary
**Endpoint:** `GET /api/analytics/attribution/summary`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

---

### Get Events by Source
**Endpoint:** `GET /api/analytics/events/by-source`

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Internal server error message"
}
```

---

## Rate Limiting

- Event tracking endpoints: 1000 requests per minute per IP
- Dashboard endpoints: 100 requests per minute per user
- Admin operations: 10 requests per minute per user

---

## Webhooks

The analytics service can send webhooks for critical events:

- Daily metrics summary
- Anomaly detection alerts
- Revenue milestones
- User behavior alerts

Configure webhooks in the service configuration.
