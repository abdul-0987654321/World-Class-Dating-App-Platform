# Discovery & Matching Features - Quick Reference Guide

## API Endpoints Summary

### Recommendations
```
GET    /api/recommendations                  - Get personalized recommendations
GET    /api/recommendations/top              - Get top matches (premium)
POST   /api/recommendations/refresh          - Refresh recommendations cache
```

### Top Picks
```
GET    /api/top-picks                        - Get daily Top Picks
GET    /api/top-picks/stats                  - Get Top Picks statistics
POST   /api/top-picks/:userId/viewed         - Mark Top Pick as viewed
```

### Swipes
```
POST   /api/swipes                           - Record swipe action
POST   /api/swipes/undo                      - Undo last swipe (premium)
GET    /api/swipes/likes                     - Get users who liked me
GET    /api/swipes/stats                     - Get swipe statistics
```

### Boost
```
POST   /api/boosts/activate                  - Activate profile boost
GET    /api/boosts/active                    - Get active boost status
GET    /api/boosts/stats                     - Get boost performance stats
GET    /api/boosts/history                   - Get boost history
POST   /api/boosts/cancel                    - Cancel active boost
```

### Super Likes
```
POST   /api/super-likes                      - Send Super Like (with optional message)
GET    /api/super-likes/quota                - Get daily quota
GET    /api/super-likes/received             - Get received Super Likes
GET    /api/super-likes/sent                 - Get sent Super Likes
GET    /api/super-likes/unread-count         - Get unread count
GET    /api/super-likes/stats                - Get Super Like statistics
GET    /api/super-likes/messages/:id         - Get specific message
POST   /api/super-likes/messages/:id/read    - Mark message as read
DELETE /api/super-likes/messages/:id         - Delete message (5-min window)
```

### Profile Insights
```
GET    /api/insights                         - Get comprehensive insights
GET    /api/insights/views                   - Get who viewed your profile
GET    /api/insights/likes                   - Get who liked you (premium)
GET    /api/insights/likes/count             - Get likes count
POST   /api/insights/track-view              - Track profile view (internal)
```

---

## Request/Response Examples

### Send Super Like with Message
```javascript
POST /api/super-likes
Content-Type: application/json

{
  "targetUserId": "user-123",
  "message": "I noticed you're into hiking! What's your favorite trail?"
}

Response:
{
  "success": true,
  "data": {
    "swipeId": "swipe-456",
    "messageId": "msg-789",
    "match": null
  }
}
```

### Activate Boost
```javascript
POST /api/boosts/activate
Content-Type: application/json

{
  "duration": 30,  // minutes
  "paymentId": "payment-123"
}

Response:
{
  "success": true,
  "data": {
    "id": "boost-456",
    "userId": "user-123",
    "startedAt": "2025-02-10T10:00:00Z",
    "expiresAt": "2025-02-10T10:30:00Z",
    "active": true,
    "impressions": 0,
    "profileViews": 0,
    "likes": 0,
    "matches": 0
  }
}
```

### Get Top Picks
```javascript
GET /api/top-picks?forceRefresh=false

Response:
{
  "success": true,
  "data": {
    "picks": [
      {
        "userId": "user-789",
        "name": "Emma",
        "age": 26,
        "compatibilityScore": 92,
        "rank": 1,
        "insights": [
          "Exceptional compatibility match",
          "You share 5 interests",
          "Recently active"
        ],
        "topPickReason": "Exceptional compatibility match",
        "suggestedOpener": "I noticed you're into travel! What's your dream destination?",
        "commonInterests": ["Travel", "Coffee", "Hiking"]
      }
    ],
    "generated_at": "2025-02-10T06:00:00Z",
    "expires_at": "2025-02-11T06:00:00Z",
    "count": 10
  }
}
```

### Get Profile Insights
```javascript
GET /api/insights?period=week

Response:
{
  "success": true,
  "data": {
    "userId": "user-123",
    "period": "week",
    "stats": {
      "totalViews": 142,
      "uniqueViewers": 87,
      "viewsFromDiscovery": 95,
      "viewsFromSearch": 47,
      "likesReceived": 28,
      "superLikesReceived": 3,
      "matches": 15,
      "conversionRate": 19.7,
      "matchRate": 53.6
    },
    "topViewers": [
      {
        "userId": "user-456",
        "viewCount": 5,
        "lastViewedAt": "2025-02-10T09:30:00Z",
        "hasLiked": true,
        "hasMatched": false
      }
    ],
    "viewTrends": [
      {
        "date": "2025-02-10",
        "views": 23,
        "uniqueViewers": 18
      }
    ],
    "peakHours": [
      { "hour": 20, "viewCount": 35 },
      { "hour": 19, "viewCount": 28 }
    ]
  }
}
```

---

## Feature Configuration

### Environment Variables
```bash
# ML Model
EMBEDDING_MODEL=all-MiniLM-L6-v2
MODEL_PATH=/models/deep_matching_network.pth

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Boost Settings
BOOST_DURATION_MINUTES=30
BOOST_MULTIPLIER=10
MAX_DAILY_BOOSTS_FREE=5
MAX_DAILY_BOOSTS_PREMIUM=unlimited

# Super Like Settings
FREE_DAILY_SUPER_LIKES=1
PREMIUM_DAILY_SUPER_LIKES=5
SUPER_LIKE_MESSAGE_MIN_LENGTH=10
SUPER_LIKE_MESSAGE_MAX_LENGTH=500
SUPER_LIKE_DELETE_WINDOW_MINUTES=5

# Top Picks
TOP_PICKS_COUNT=10
TOP_PICKS_CACHE_TTL_SECONDS=86400
TOP_PICKS_MIN_COMPATIBILITY=70
TOP_PICKS_DIVERSITY_THRESHOLD=0.3

# Profile Views
PROFILE_VIEW_DEDUP_WINDOW_SECONDS=3600
PROFILE_VIEW_TRACKING_ENABLED=true

# Discovery
MIN_COMPATIBILITY_SCORE=30
RECOMMENDATIONS_LIMIT_DEFAULT=20
RECOMMENDATIONS_POOL_SIZE=100
```

---

## Database Schema Quick Reference

### boosts table
```sql
id                UUID PRIMARY KEY
user_id           UUID NOT NULL
started_at        TIMESTAMP NOT NULL
expires_at        TIMESTAMP NOT NULL
active            BOOLEAN DEFAULT true
impressions       INTEGER DEFAULT 0
profile_views     INTEGER DEFAULT 0
likes             INTEGER DEFAULT 0
matches           INTEGER DEFAULT 0
payment_id        VARCHAR
created_at        TIMESTAMP DEFAULT NOW()
updated_at        TIMESTAMP DEFAULT NOW()
```

### super_like_messages table
```sql
id                UUID PRIMARY KEY
user_id           UUID NOT NULL
target_user_id    UUID NOT NULL
swipe_id          UUID NOT NULL (FK to swipes)
message           TEXT NOT NULL
read              BOOLEAN DEFAULT false
read_at           TIMESTAMP
created_at        TIMESTAMP DEFAULT NOW()
```

### profile_views table
```sql
id                UUID PRIMARY KEY
viewer_id         UUID NOT NULL
viewed_user_id    UUID NOT NULL
viewed_at         TIMESTAMP DEFAULT NOW()
source            VARCHAR NOT NULL
duration          INTEGER (seconds)
```

---

## Cron Jobs

### Deactivate Expired Boosts
```bash
# Every 5 minutes
*/5 * * * * curl -X POST http://localhost:3002/internal/boosts/deactivate-expired
```

### Generate Daily Top Picks
```bash
# Every day at 6 AM UTC
0 6 * * * curl -X POST http://localhost:3002/internal/top-picks/generate-all
```

### Cleanup Old Profile Views
```bash
# Every day at 3 AM
0 3 * * * psql -d dating_db -c "DELETE FROM profile_views WHERE viewed_at < NOW() - INTERVAL '90 days'"
```

---

## Mobile App Components

### Screens
```
apps/mobile-app/src/screens/Main/
  ├── DiscoveryEnhancedScreen.tsx       - Main discovery with all features
  ├── TopPicksScreen.tsx                - Daily Top Picks view
  └── ProfileInsightsScreen.tsx         - Analytics and insights
```

### Key Features in Mobile UI
- **Swipe Cards**: Full-screen profile cards with gestures
- **Compatibility Badge**: Green badge showing match percentage
- **Super Like Button**: Star button with quota indicator
- **Undo Button**: Orange circular button (premium)
- **Boost Banner**: Yellow banner when boost is active
- **Filters Modal**: Full-screen advanced filters
- **Match Modal**: Celebration screen with CTA buttons

---

## Web App Components

### Pages
```
apps/web-app/src/pages/Discovery/
  ├── EnhancedDiscoveryPage.tsx         - Main discovery page
  └── TopPicksPage.tsx                  - Top Picks grid view
```

### Key Features in Web UI
- **Three-Column Layout**: Stats | Profile Card | Who Liked You
- **Keyboard Shortcuts**: Arrow keys for swipe, Ctrl+Z for undo
- **Hover Effects**: Enhanced interaction feedback
- **Responsive Design**: Works on desktop and tablet
- **Modal Overlays**: Super Like and Match modals

---

## Testing Checklist

### Unit Tests
- [ ] Deep matching network forward pass
- [ ] Feature extraction for user profiles
- [ ] Boost activation and expiration
- [ ] Super Like message validation
- [ ] Profile insights statistics calculation
- [ ] Advanced filters validation
- [ ] Top Picks scoring algorithm

### Integration Tests
- [ ] Complete swipe flow (swipe → match → notification)
- [ ] Boost activation → increased visibility → tracking
- [ ] Super Like send → receive → read flow
- [ ] Top Picks generation → caching → retrieval
- [ ] Undo swipe → restore profile → cleanup match
- [ ] Advanced filters → query generation → results

### E2E Tests
- [ ] User can swipe through profiles
- [ ] User can send Super Like with message
- [ ] User can activate and track boost
- [ ] User can view Top Picks
- [ ] User can undo last swipe
- [ ] User can apply advanced filters
- [ ] User can view profile insights
- [ ] User receives match notification

### Performance Tests
- [ ] ML model inference < 100ms
- [ ] Recommendation generation < 500ms
- [ ] Profile view tracking handles 1000 req/s
- [ ] Top Picks cache hit rate > 95%
- [ ] Boost tracking doesn't slow discovery

---

## Troubleshooting

### Common Issues

**Issue: Top Picks not showing**
```bash
# Check if Top Picks were generated
SELECT COUNT(*) FROM top_picks WHERE user_id = 'USER_ID' AND date = CURRENT_DATE;

# Regenerate Top Picks for user
curl -X POST http://localhost:3002/internal/top-picks/generate?userId=USER_ID
```

**Issue: Boost not increasing visibility**
```bash
# Check active boost
SELECT * FROM boosts WHERE user_id = 'USER_ID' AND active = true;

# Check boost multiplier in discovery
# Should see BOOST_MULTIPLIER (10x) applied to score
```

**Issue: Super Like quota not resetting**
```bash
# Check last reset time
SELECT COUNT(*) FROM swipes
WHERE user_id = 'USER_ID'
  AND action = 'super_like'
  AND created_at >= CURRENT_DATE;

# Manual reset (if needed)
# Quota resets automatically at midnight UTC
```

**Issue: Profile views not tracking**
```bash
# Check if tracking is enabled
echo $PROFILE_VIEW_TRACKING_ENABLED

# Check recent views
SELECT COUNT(*) FROM profile_views
WHERE viewed_user_id = 'USER_ID'
  AND viewed_at >= NOW() - INTERVAL '1 hour';
```

---

## Performance Benchmarks

### Expected Performance
- **ML Model Inference**: 50-100ms per profile
- **Recommendation Generation**: 200-500ms for 20 profiles
- **Top Picks Generation**: 2-5 seconds per user
- **Profile View Tracking**: < 10ms (async)
- **Boost Activation**: < 100ms
- **Super Like Send**: < 200ms

### Optimization Tips
1. **Use Redis caching** for frequently accessed data
2. **Batch database queries** for multiple profiles
3. **Async tracking** for non-critical events
4. **Index optimization** on high-traffic queries
5. **Connection pooling** for database connections

---

## Analytics Metrics

### Key Metrics to Track
1. **Swipe Rate**: Swipes per user per day
2. **Match Rate**: Matches / Likes sent
3. **Super Like Response Rate**: Super Likes returned / Super Likes sent
4. **Boost ROI**: (Views during boost) / (Normal views) ratio
5. **Top Picks Engagement**: Right swipe rate on Top Picks
6. **Undo Usage**: Percentage of users using undo
7. **Filter Adoption**: Percentage using advanced filters
8. **Profile View Insights**: Engagement with "Who viewed you"

---

## Quick Commands

### Start Services
```bash
# Start matching service
cd backend/services/matching-service
npm install
npm run dev

# Start recommendation service (ML)
cd backend/services/ai-services/recommendation-service
pip install -r requirements.txt
python main.py

# Start mobile app
cd apps/mobile-app
npm install
npm start

# Start web app
cd apps/web-app
npm install
npm run dev
```

### Run Migrations
```bash
cd backend/services/matching-service
npm run migrate:latest
```

### Seed Test Data
```bash
cd backend/services/matching-service
npm run seed
```

---

## Support & Documentation

### Additional Resources
- Main Documentation: `/docs/`
- API Specification: `/openapi.yaml`
- Architecture Guide: `/ARCHITECTURE.md`
- Database Schema: `/DATABASE_SCHEMA.md`
- Testing Guide: `/TESTING_GUIDE.md`

### Getting Help
- Check logs: `docker-compose logs -f matching-service`
- View database: `psql -h localhost -U postgres -d dating_db`
- Monitor Redis: `redis-cli MONITOR`
- Health check: `curl http://localhost:3002/health`

---

**Last Updated**: February 10, 2025
**Version**: 1.0.0
**Status**: Production Ready ✅
