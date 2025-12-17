# Analytics Service

Comprehensive analytics and metrics tracking service for the Flamoral dating platform. Provides real-time event tracking, user behavior analytics, match success metrics, revenue analytics, and admin dashboard APIs.

## Features

### 1. Event Collection
- **Swipe Events**: Track user swipes (left, right, super likes)
- **Match Events**: Track successful matches and mutual swipes
- **Message Events**: Track conversation messages and response times
- **Session Events**: Track user sessions, screen views, and engagement

### 2. User Behavior Tracking
- Time on app metrics
- Feature usage statistics
- Session duration and frequency
- Screen flow analysis
- Device and platform analytics

### 3. Match Success Metrics
- Conversation start rates
- Message exchange patterns
- Response time distribution
- Date arrangement tracking
- Match-to-conversation funnel

### 4. Engagement Metrics
- **DAU** (Daily Active Users)
- **WAU** (Weekly Active Users)
- **MAU** (Monthly Active Users)
- Retention cohorts (Day 1, 7, 30, 90)
- Churn rate analysis
- User stickiness (DAU/MAU ratio)

### 5. Revenue Analytics
- Subscription conversions
- Coin purchase tracking
- Boost and Super Like revenue
- MRR/ARR calculations
- ARPU/ARPPU metrics
- Payment funnel analytics

### 6. Dashboard APIs
- Real-time metrics
- Time-series data aggregation
- Comparison metrics (period over period)
- Custom date range queries
- Pre-aggregated daily/hourly metrics

### 7. Time-Series Aggregation
- Hourly metrics aggregation
- Daily metrics aggregation
- Historical data backfill
- Optimized query performance with pre-aggregated tables

## API Endpoints

### Event Tracking

```
POST /api/events/swipe              # Track swipe event
POST /api/events/match              # Track match event
POST /api/events/message            # Track message event
POST /api/events/session            # Track session
POST /api/events/revenue            # Track revenue transaction
POST /api/events/date-arrangement   # Track date arrangement
```

### Analytics Queries

```
GET  /api/analytics/funnel/conversion-rates  # Get funnel conversion rates
GET  /api/analytics/attribution/summary      # Get attribution summary
GET  /api/analytics/events/by-source         # Get events by source
GET  /api/analytics/funnel/dropoff           # Get drop-off analysis
GET  /api/analytics/funnel/timings           # Get average timings
```

### Dashboard APIs

```
GET  /api/dashboard/overview          # Overall dashboard overview
GET  /api/dashboard/real-time         # Real-time metrics
GET  /api/dashboard/engagement        # Engagement analytics
GET  /api/dashboard/match-success     # Match success metrics
GET  /api/dashboard/revenue           # Revenue analytics
GET  /api/dashboard/user-behavior     # User behavior analytics
GET  /api/dashboard/time-series       # Time-series data
GET  /api/dashboard/comparison        # Period comparison
GET  /api/dashboard/daily-metrics     # Daily aggregated metrics
GET  /api/dashboard/hourly-metrics    # Hourly aggregated metrics
GET  /api/dashboard/user/:userId/activity  # User activity summary
```

### Admin Operations

```
POST /api/dashboard/aggregate         # Manually aggregate metrics
POST /api/dashboard/backfill          # Backfill historical data
POST /api/dashboard/track-event       # Test event tracking
```

## Database Schema

### Core Event Tables
- `swipe_events` - User swipe activity
- `match_events` - Match occurrences
- `message_events` - Message activity
- `session_events` - User sessions
- `revenue_transactions` - Payment transactions
- `date_arrangements` - Date proposals and confirmations

### Aggregated Metrics Tables
- `daily_metrics` - Pre-aggregated daily metrics
- `hourly_metrics` - Pre-aggregated hourly metrics

### Legacy Tables (from migration 001)
- `tracking_events` - Generic event tracking
- `user_attribution` - User attribution data
- `conversion_funnel` - Conversion funnel tracking
- `ad_campaign_performance` - Campaign metrics
- `user_sessions` - Session tracking
- `pixel_events` - Pixel event queue

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for caching)
- TimescaleDB extension (optional, for time-series optimization)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Create database:
```sql
CREATE DATABASE flamoral_analytics;
```

4. (Optional) Enable TimescaleDB:
```sql
CREATE EXTENSION timescaledb CASCADE;
```

5. Run migrations:
The service will automatically run migrations on startup. Alternatively, run manually:
```bash
psql -d flamoral_analytics -f src/infrastructure/database/migrations/001_create_tracking_tables.sql
psql -d flamoral_analytics -f src/infrastructure/database/migrations/002_create_analytics_tables.sql
```

### Running the Service

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Configuration

### Environment Variables

```env
# Server
PORT=3007
NODE_ENV=development

# Database (PostgreSQL)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_analytics
DB_USER=postgres
DB_PASSWORD=your_password
DB_POOL_MIN=2
DB_POOL_MAX=10

# TimescaleDB (optional)
ENABLE_TIMESCALEDB=false

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=7

# Event Queue
EVENT_QUEUE_TYPE=redis
EVENT_BATCH_SIZE=1000
EVENT_FLUSH_INTERVAL_MS=5000

# Data Retention
DATA_RETENTION_DAYS=365

# External Services
USER_SERVICE_URL=http://localhost:3001
MATCHING_SERVICE_URL=http://localhost:3002

# Security
JWT_ACCESS_SECRET=your-jwt-access-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
SERVICE_API_KEY=your-service-api-key

# CORS
CORS_ORIGINS=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## Usage Examples

### Track a Swipe Event

```bash
curl -X POST http://localhost:3007/api/events/swipe \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "targetUserId": "223e4567-e89b-12d3-a456-426614174000",
    "direction": "right",
    "sessionId": "session-123",
    "location": {
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  }'
```

### Track a Match

```bash
curl -X POST http://localhost:3007/api/events/match \
  -H "Content-Type: application/json" \
  -d '{
    "matchId": "match-123",
    "userId1": "123e4567-e89b-12d3-a456-426614174000",
    "userId2": "223e4567-e89b-12d3-a456-426614174000",
    "mutualSwipeTime": 3600000,
    "sessionId": "session-123"
  }'
```

### Get Dashboard Overview

```bash
curl "http://localhost:3007/api/dashboard/overview?startDate=2025-01-01&endDate=2025-01-31"
```

### Get Real-Time Metrics

```bash
curl http://localhost:3007/api/dashboard/real-time
```

### Get User Activity Summary

```bash
curl http://localhost:3007/api/dashboard/user/123e4567-e89b-12d3-a456-426614174000/activity
```

## Data Aggregation

The service provides automatic data aggregation for optimal dashboard performance:

### Manual Aggregation

Aggregate metrics for a specific date:
```bash
curl -X POST http://localhost:3007/api/dashboard/aggregate \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-19",
    "type": "daily"
  }'
```

### Backfill Historical Data

Backfill metrics for a date range:
```bash
curl -X POST http://localhost:3007/api/dashboard/backfill \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-19"
  }'
```

### Recommended Cron Jobs

Set up the following cron jobs for automatic aggregation:

```bash
# Aggregate hourly metrics every hour
0 * * * * curl -X POST http://localhost:3007/api/dashboard/aggregate -d '{"type":"hourly"}'

# Aggregate daily metrics at 1 AM every day
0 1 * * * curl -X POST http://localhost:3007/api/dashboard/aggregate -d '{"type":"daily"}'
```

## Performance Optimization

### TimescaleDB

For better performance with time-series data, enable TimescaleDB:

1. Install TimescaleDB extension in PostgreSQL
2. Set `ENABLE_TIMESCALEDB=true` in `.env`
3. Restart the service

The service will automatically convert time-series tables to hypertables and set up data retention policies.

### Indexing

The service creates comprehensive indexes for all query patterns. Monitor query performance and add additional indexes as needed.

### Caching

Consider implementing Redis caching for frequently accessed dashboard data:
- Real-time metrics (TTL: 1 minute)
- Daily aggregates (TTL: 1 hour)
- Monthly reports (TTL: 24 hours)

## Monitoring

### Health Check

```bash
curl http://localhost:3007/health
```

Response:
```json
{
  "status": "healthy",
  "service": "analytics-service",
  "timestamp": "2025-01-19T12:00:00.000Z",
  "database": {
    "connected": true,
    "pool": {
      "totalCount": 5,
      "idleCount": 3,
      "waitingCount": 0
    }
  }
}
```

## Architecture

### Repository Pattern
- Clean separation of data access logic
- Easy to test and mock
- Supports multiple data sources

### Event-Driven
- Asynchronous event processing
- Scalable event queue (Redis/Kafka)
- Batch processing for efficiency

### Time-Series Optimization
- Pre-aggregated metrics tables
- Efficient date range queries
- Automatic data retention

## Testing

Run tests:
```bash
npm test
```

Run specific test suites:
```bash
npm run test:unit
```

## Contributing

1. Follow existing code patterns
2. Add tests for new features
3. Update documentation
4. Use TypeScript strictly

## License

Proprietary - Flamoral Platform
