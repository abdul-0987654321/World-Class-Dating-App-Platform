# Advertising Service - Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Redis installed and running (optional, for production)

## Installation

### 1. Install Dependencies
```bash
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services\advertising-service
npm install
```

### 2. Setup Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3010
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_ads
DB_USER=postgres
DB_PASSWORD=your_password

# Redis (optional for development)
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### 3. Setup Database

#### Create Database
```bash
# Using psql
psql -U postgres -c "CREATE DATABASE flamoral_ads;"
```

#### Run Migrations
```bash
# Using psql
psql -U postgres -d flamoral_ads -f src/infrastructure/database/migrations/001_create_advertising_tables.sql
```

Or using a SQL client, execute the migration file:
```
C:\Users\citad\OneDrive\Documents\Dating\Flamoral\backend\services\advertising-service\src\infrastructure\database\migrations\001_create_advertising_tables.sql
```

### 4. Start the Service

#### Development Mode (with auto-reload)
```bash
npm run dev
```

#### Production Mode
```bash
npm run build
npm start
```

The service will start on `http://localhost:3010`

## Verify Installation

### 1. Health Check
Open your browser or use curl:
```bash
curl http://localhost:3010/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "advertising-service",
  "timestamp": "2025-02-10T15:30:00.000Z",
  "features": {
    "total": 40,
    "categories": [...]
  },
  "endpoints": {
    "ad_serving": "/api/ads",
    "tracking": "/api/tracking",
    "billing": "/api/billing",
    ...
  }
}
```

### 2. Test Ad Serving
Create a test campaign:
```bash
curl -X POST http://localhost:3010/api/ads/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "advertiser_id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Test Campaign",
    "description": "Test campaign description",
    "objective": "registrations",
    "budget": {
      "total_budget": 1000,
      "daily_budget": 100,
      "bid_strategy": "cpc",
      "max_bid": 2.0,
      "currency": "USD"
    },
    "status": "active",
    "start_date": "2025-02-01T00:00:00Z"
  }'
```

### 3. Test Ad Serving Request
```bash
curl -X POST http://localhost:3010/api/ads/serve \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "placement": {
      "placement_id": "feed_main",
      "placement_type": "feed",
      "screen_name": "home_feed"
    },
    "device_type": "mobile",
    "user_context": {
      "age": 28,
      "gender": "female",
      "location": {
        "city": "New York",
        "country": "USA",
        "coordinates": { "lat": 40.7128, "lng": -74.0060 }
      },
      "interests": ["travel", "fitness"],
      "subscription_tier": "free",
      "relationship_intent": "serious",
      "profile_completeness": 85,
      "activity_level": "high"
    },
    "max_ads": 3
  }'
```

## Testing with HTTP Files

If you use VS Code with the REST Client extension:

1. Open `test-endpoints.http`
2. Click "Send Request" above any endpoint
3. View responses in the side panel

## Project Structure

```
advertising-service/
├── src/
│   ├── api/
│   │   ├── controllers/          # HTTP request handlers
│   │   │   ├── ad-serving.controller.ts
│   │   │   ├── tracking.controller.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── targeting.controller.ts
│   │   │   ├── creative.controller.ts
│   │   │   └── optimization.controller.ts
│   │   └── routes/               # API route definitions
│   │       ├── ad-serving.routes.ts
│   │       ├── tracking.routes.ts
│   │       ├── billing.routes.ts
│   │       └── ...
│   ├── domain/
│   │   ├── services/             # Business logic
│   │   │   ├── ad-serving.service.ts
│   │   │   ├── tracking.service.ts
│   │   │   ├── billing.service.ts
│   │   │   └── ...
│   │   └── types/                # Type definitions
│   │       ├── ad.types.ts
│   │       ├── tracking.types.ts
│   │       ├── billing.types.ts
│   │       └── ...
│   ├── infrastructure/
│   │   └── database/
│   │       └── migrations/       # Database schemas
│   │           └── 001_create_advertising_tables.sql
│   ├── utils/
│   │   └── logger.ts            # Logging utility
│   └── index.ts                 # Main entry point
├── .env.example                 # Environment template
├── API_DOCUMENTATION.md         # Complete API docs
├── FIXES_SUMMARY.md            # What was fixed
├── QUICKSTART.md               # This file
├── test-endpoints.http         # HTTP test file
└── package.json
```

## Key Features

### 1. Ad Serving (`/api/ads`)
- Smart ad targeting based on user profile
- Multiple ad formats (banner, native, video, etc.)
- Campaign and ad management
- Intelligent ad ranking algorithm

### 2. Tracking (`/api/tracking`)
- Impression tracking with viewability metrics
- Click tracking with fraud detection
- Conversion tracking with attribution
- Real-time analytics and reporting

### 3. Billing (`/api/billing`)
- Multi-currency support
- Multiple billing types (prepaid, postpaid)
- Automated invoicing
- Transaction history
- Budget management

### 4. AI Features (Existing)
- Targeting (`/api/targeting`) - 10 features
- Creative (`/api/creative`) - 10 features
- Optimization (`/api/optimization`) - 10 features
- Innovations (`/api/innovations`) - 10 features

## Common Tasks

### Create a Campaign
See `test-endpoints.http` → "Create Campaign" section

### Serve Ads to a User
See `test-endpoints.http` → "Serve Ads" section

### Track Impression/Click
See `test-endpoints.http` → "Track Impression/Click" sections

### Generate Invoice
See `test-endpoints.http` → "Generate Invoice" section

### View Analytics
See `test-endpoints.http` → "Get Ad Statistics" section

## Troubleshooting

### Service won't start
1. Check if port 3010 is available: `netstat -ano | findstr :3010`
2. Check if PostgreSQL is running
3. Verify database credentials in `.env`

### Database connection errors
1. Verify PostgreSQL is running: `pg_ctl status`
2. Check database exists: `psql -U postgres -l`
3. Test connection: `psql -U postgres -d flamoral_ads`
4. Verify `.env` has correct credentials

### No ads being served
1. Check if campaigns are active: `GET /api/ads/campaigns`
2. Verify ads exist and are active
3. Check targeting criteria matches user context
4. Review server logs for errors

### TypeScript compilation errors
```bash
npx tsc --noEmit
```

## Next Steps

1. **Connect Real Database**: Update `.env` with production database credentials
2. **Setup Redis**: Configure Redis for real-time metrics caching
3. **Add Authentication**: Implement JWT or API key authentication
4. **Enable Monitoring**: Add application monitoring (DataDog, New Relic, etc.)
5. **Review Documentation**: Read `API_DOCUMENTATION.md` for complete API reference

## Documentation

- **API Documentation**: `API_DOCUMENTATION.md`
- **Fixes Summary**: `FIXES_SUMMARY.md`
- **HTTP Tests**: `test-endpoints.http`
- **Database Schema**: `src/infrastructure/database/migrations/001_create_advertising_tables.sql`

## Support

For issues or questions:
1. Check the logs: Service outputs to console
2. Review `FIXES_SUMMARY.md` for architecture details
3. Review `API_DOCUMENTATION.md` for API details
4. Check database schema in migrations folder

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Redis configured and running
- [ ] SSL/TLS certificates configured
- [ ] CORS origins updated for production domains
- [ ] Rate limiting configured
- [ ] Authentication/authorization implemented
- [ ] Logging configured (Winston → CloudWatch/DataDog)
- [ ] Monitoring configured
- [ ] Backup strategy implemented
- [ ] Load balancer configured
- [ ] Auto-scaling configured

## Performance Optimization

### Database
- Ensure indexes are created (migration handles this)
- Monitor query performance
- Consider read replicas for analytics queries
- Use connection pooling

### Caching
- Enable Redis for metrics caching
- Cache frequently accessed campaigns/ads
- Implement cache invalidation strategy

### API
- Implement request rate limiting
- Add response compression
- Use CDN for static assets
- Monitor response times

Happy Advertising! 🎯
