# Analytics Service - Quick Start Guide

## Installation

```bash
cd backend/services/analytics-service
npm install
```

## Environment Setup

Create a `.env` file:

```env
# Server
PORT=3007
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_analytics
DB_USER=postgres
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=7

# Data Retention
DATA_RETENTION_DAYS=365
```

## Running the Service

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

## Health Check

```bash
curl http://localhost:3007/health
```

## Common Use Cases

### 1. Track a Swipe Event

```bash
curl -X POST http://localhost:3007/api/events/swipe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "targetUserId": "user456",
    "direction": "right",
    "sessionId": "session789"
  }'
```

### 2. Track a Match Event

```bash
curl -X POST http://localhost:3007/api/events/match \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "match123",
    "userId1": "user123",
    "userId2": "user456",
    "mutualSwipeTime": 3600000
  }'
```

### 3. Track Revenue Transaction

```bash
curl -X POST http://localhost:3007/api/events/revenue \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "transactionType": "subscription",
    "amount": 29.99,
    "currency": "USD",
    "status": "completed",
    "subscriptionPlan": "premium_monthly"
  }'
```

### 4. Get Dashboard Overview

```bash
curl http://localhost:3007/api/dashboard/overview?startDate=2025-01-01&endDate=2025-12-15
```

### 5. Get Real-Time Metrics

```bash
curl http://localhost:3007/api/dashboard/real-time
```

### 6. Trigger Manual Aggregation

```bash
# Hourly aggregation
curl -X POST http://localhost:3007/api/system/aggregate/hourly \
  -H "Content-Type: application/json" \
  -d '{}'

# Daily aggregation
curl -X POST http://localhost:3007/api/system/aggregate/daily \
  -H "Content-Type: application/json" \
  -d '{"date": "2025-12-14"}'
```

### 7. Backfill Historical Data

```bash
curl -X POST http://localhost:3007/api/system/backfill \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-11-01",
    "endDate": "2025-11-30"
  }'
```

### 8. Get Queue Statistics

```bash
curl http://localhost:3007/api/system/queue-stats
```

## Monitoring

### Check Service Health
```bash
curl http://localhost:3007/api/system/health
```

### Monitor Queue Status
```bash
curl http://localhost:3007/api/system/queue-stats
```

### Monitor Event Stream
```bash
curl http://localhost:3007/api/system/stream-info
```

### Database Pool Stats
```bash
curl http://localhost:3007/api/system/database/pool
```

## Scheduled Tasks

The service automatically runs:

- **Hourly Aggregation**: Every hour at minute 5 (e.g., 1:05, 2:05, 3:05)
- **Daily Aggregation**: Every day at 1:05 AM
- **Cleanup**: Every day at 3:00 AM

## Event Tracking Types

### Session Events
```javascript
{
  "sessionId": "session123",
  "userId": "user123",
  "startTime": "2025-12-15T10:00:00Z",
  "endTime": "2025-12-15T10:30:00Z",
  "duration": 1800,
  "screenViews": 10,
  "swipeCount": 25,
  "messageCount": 5,
  "deviceType": "iOS"
}
```

### Tracking Events (Generic)
```javascript
{
  "userId": "user123",
  "sessionId": "session123",
  "eventType": "page_view",
  "eventName": "profile_viewed",
  "utmSource": "facebook",
  "utmCampaign": "summer_2025",
  "eventData": {
    "profileId": "profile456",
    "duration": 30
  }
}
```

### Attribution Tracking
```javascript
{
  "userId": "user123",
  "source": "google",
  "medium": "cpc",
  "campaign": "dating_app_2025",
  "content": "ad_variant_a",
  "clickId": {
    "gclid": "abc123xyz"
  }
}
```

## Analytics Queries

### Get Funnel Conversion Rates
```bash
curl "http://localhost:3007/api/analytics/funnel/conversion-rates?utmSource=facebook"
```

### Get Attribution Summary
```bash
curl "http://localhost:3007/api/analytics/attribution/summary?startDate=2025-01-01&endDate=2025-12-15"
```

### Get User Activity
```bash
curl http://localhost:3007/api/dashboard/user/user123/activity
```

### Get Engagement Metrics
```bash
curl "http://localhost:3007/api/dashboard/engagement?startDate=2025-12-01&endDate=2025-12-15"
```

### Get Revenue Analytics
```bash
curl "http://localhost:3007/api/dashboard/revenue?startDate=2025-12-01&endDate=2025-12-15"
```

## Troubleshooting

### Service won't start
1. Check database connection: `psql -h localhost -U postgres -d flamoral_analytics`
2. Check Redis connection: `redis-cli ping`
3. Review logs for error messages

### Events not being tracked
1. Check queue status: `GET /api/system/queue-stats`
2. Check stream info: `GET /api/system/stream-info`
3. Verify database connection: `GET /api/system/health`

### Slow dashboard queries
1. Ensure aggregations are running: `GET /api/system/health`
2. Run manual aggregation: `POST /api/system/aggregate/daily`
3. Check database pool: `GET /api/system/database/pool`

### Queue backing up
1. Check queue stats: `GET /api/system/queue-stats`
2. Clean old jobs: `POST /api/system/queue/clean`
3. Review worker capacity in logs

## Architecture

```
┌─────────────────┐
│  API Gateway    │
│  (Port 3000)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Analytics API  │
│  (Port 3007)    │
└────────┬────────┘
         │
         ├─────────┐
         │         │
         ▼         ▼
┌────────────┐  ┌──────────────┐
│ PostgreSQL │  │ Redis Streams│
│  Database  │  │  & Queues    │
└────────────┘  └──────────────┘
```

## Performance Tips

1. **Use Batch Operations**: Send multiple events at once
   ```bash
   POST /api/tracking/events
   ```

2. **Enable TimescaleDB**: For better time-series performance
   ```env
   ENABLE_TIMESCALEDB=true
   ```

3. **Adjust Pool Size**: Based on load
   ```env
   DB_POOL_MIN=5
   DB_POOL_MAX=20
   ```

4. **Configure Retention**: Balance storage and performance
   ```env
   DATA_RETENTION_DAYS=180
   ```

## Support

For issues or questions:
- Check logs: `npm run dev` output
- Review health status: `GET /health`
- Examine system metrics: `GET /api/system/*`
