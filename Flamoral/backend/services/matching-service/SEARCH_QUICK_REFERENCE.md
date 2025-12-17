# Search Service - Quick Reference Guide

## Quick Start

### Run Migrations
```bash
cd backend/services/matching-service
npm run migrate:latest
```

### Test Search Endpoint
```bash
curl -X POST http://localhost:3009/api/search/advanced \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "minAge": 25,
    "maxAge": 35,
    "maxDistance": 50,
    "sortBy": "relevance",
    "limit": 20
  }'
```

## Search Filter Options

### Basic Filters
- `minAge` / `maxAge` (18-100)
- `maxDistance` (1-500 km)
- `minHeight` / `maxHeight` (cm)
- `verifiedOnly` (boolean)

### Array Filters
- `interests` (string array) - e.g., ["hiking", "travel"]
- `relationshipGoals` (string array) - e.g., ["long_term", "marriage"]
- `education` (string array) - e.g., ["bachelors", "masters"]
- `occupation` (string array)
- `religion` (string array)

### Dealbreakers
```json
{
  "dealbreakers": {
    "noSmokers": true,
    "noDrinkers": true,
    "noChildren": true,
    "noPets": true
  }
}
```

### Sort Options
- `relevance` (default) - Multi-factor scoring
- `distance` - Nearest first
- `activity` - Most recently active
- `newest` - Recently joined

## Relevance Scoring Breakdown

| Component | Max Points | Description |
|-----------|------------|-------------|
| Interest Match | 40 | Jaccard similarity of interests |
| Profile Complete | 25 | Profile completion percentage |
| Activity Recent | 20 | Time since last active |
| Verification | 15 | Verified user bonus |
| **Total** | **100** | Overall relevance score |

## Common Use Cases

### 1. Basic Nearby Search
```json
{
  "maxDistance": 25,
  "sortBy": "distance",
  "limit": 10
}
```

### 2. Highly Specific Search
```json
{
  "minAge": 28,
  "maxAge": 35,
  "maxDistance": 50,
  "interests": ["fitness", "travel", "cooking"],
  "education": ["bachelors", "masters"],
  "verifiedOnly": true,
  "sortBy": "relevance"
}
```

### 3. Active Users Search
```json
{
  "maxDistance": 100,
  "sortBy": "activity",
  "limit": 20
}
```

## Analytics Endpoints

### Get Search Suggestions (No Results)
```bash
GET /api/search/suggestions
```
Returns relaxed filters when searches return no results.

### Get User Search Patterns
```bash
GET /api/search/analytics/patterns?days=30
```
Returns user's search behavior over specified days.

## Database Queries

### Check Index Usage
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'users'
ORDER BY idx_scan DESC;
```

### Monitor Slow Searches
```sql
SELECT
  user_id,
  filters,
  result_count,
  response_time_ms,
  timestamp
FROM search_analytics
WHERE response_time_ms > 1000
ORDER BY response_time_ms DESC
LIMIT 10;
```

### View Daily Stats
```sql
SELECT * FROM search_daily_stats
ORDER BY date DESC
LIMIT 7;
```

## Cache Management

### Check Cache Hit Rate
```bash
redis-cli INFO stats | grep keyspace
```

### Clear Search Cache
```bash
redis-cli KEYS "search:*" | xargs redis-cli DEL
```

### Monitor Cache Size
```bash
redis-cli DBSIZE
```

## Performance Tips

1. **Always use pagination** - Set reasonable `limit` (max 100)
2. **Cache frequently used filters** - Consider saved searches
3. **Use appropriate sort** - Distance for location, relevance for matching
4. **Monitor slow queries** - Review analytics regularly
5. **Update indexes** - Analyze query patterns monthly

## Error Handling

### Common Errors

**400 Bad Request**
- Invalid filter values
- Age range reversed (minAge > maxAge)
- Distance out of bounds

**500 Internal Server Error**
- Database connection issues
- Invalid coordinates
- Redis unavailable (non-critical, search still works)

## Development Commands

```bash
# Run service locally
npm run dev

# Run tests
npm run test

# Run migrations
npm run migrate:latest

# Rollback migration
npm run migrate:rollback

# Check migration status
npm run migrate:status

# Lint code
npm run lint:fix
```

## Environment Variables

```env
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=matching_service_dev
REDIS_HOST=localhost
REDIS_PORT=6379

# Optional
MAX_SEARCH_LIMIT=100
DEFAULT_SEARCH_LIMIT=20
SEARCH_CACHE_TTL=300
SEARCH_ANALYTICS_ENABLED=true
```

## Health Checks

```bash
# Service health
curl http://localhost:3009/health

# Database connection
curl http://localhost:3009/api/internal/health/db

# Redis connection
curl http://localhost:3009/api/internal/health/redis
```

## Support & Resources

- **Main Documentation**: `SEARCH_AND_DISCOVERY_FIXES.md`
- **API Swagger**: `http://localhost:3009/api-docs`
- **Service Logs**: `logs/matching-service.log`
- **Analytics Dashboard**: (To be implemented)
