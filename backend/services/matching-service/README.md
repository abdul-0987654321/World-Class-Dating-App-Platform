# Matching Service

AI-powered matching and recommendation service for Flamoral dating platform.

## 🎯 Overview

The Matching Service is a core component of the Flamoral platform that handles:
- Smart matching algorithm with compatibility scoring
- Swipe mechanics (Like, Pass, Super Like)
- Automatic match creation
- Personalized user recommendations
- Distance-based filtering

## 🏗️ Architecture

Built using Clean Architecture principles:

```
src/
├── api/                    # API Layer
│   ├── controllers/        # Request handlers
│   ├── middleware/         # Auth middleware
│   └── routes/             # Route definitions
├── domain/                 # Business Logic
│   ├── entities/           # Domain models (Swipe, Match)
│   ├── repositories/       # Data access layer
│   └── services/           # Business services
├── infrastructure/         # External Services
│   ├── database/           # Database connection & migrations
│   ├── cache/              # Redis caching
│   └── ml/                 # ML integration
├── types/                  # TypeScript types
├── config/                 # Configuration
└── index.ts                # Application entry point
```

## 🚀 Features

### 1. Smart Matching Algorithm

Calculates compatibility scores (0-100) based on:
- **Distance** (30% weight): Geographic proximity using Haversine formula
- **Interests** (25% weight): Shared interests and hobbies
- **Activity** (15% weight): Profile completeness, verification status
- **Preferences** (30% weight): Age, gender, and other preferences match

**Formula:**
```
Score = (Distance × 0.30) + (Interests × 0.25) + (Activity × 0.15) + (Preferences × 0.30)
Final Score = min(100, Score × Premium Boost)
```

### 2. Swipe Mechanics

- **Like**: Express interest in a user
- **Pass**: Skip a user
- **Super Like**: Premium action showing strong interest

**Match Creation:**
- Automatic match when both users like each other
- Match notification (to be implemented)
- Match analytics tracking

### 3. Recommendations

- Personalized user suggestions based on preferences
- Filters out already swiped/matched users
- Minimum compatibility score threshold (default: 30)
- Pagination support
- Top matches for premium users

### 4. Distance Filtering

- Haversine formula for accurate distance calculation
- Configurable max distance (default: 50km)
- Respects user preferences

### 5. Match Management

- View all matches
- Get recent matches
- Match count
- Unmatch functionality
- Match status tracking

## 📊 Database Schema

### Swipes Table
```sql
CREATE TABLE swipes (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,  -- 'like', 'pass', 'super_like'
  created_at TIMESTAMP NOT NULL,
  UNIQUE(user_id, target_user_id)
);
```

### Matches Table
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  user1_id UUID NOT NULL,  -- Alphabetically sorted
  user2_id UUID NOT NULL,  -- Alphabetically sorted
  status VARCHAR(20) NOT NULL,  -- 'matched', 'unmatched', 'blocked'
  compatibility_score DECIMAL(5,2),
  matched_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP NOT NULL,
  unmatched_at TIMESTAMP,
  UNIQUE(user1_id, user2_id)
);
```

### User Preferences Table
```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  max_distance INTEGER NOT NULL,
  gender_preference JSONB NOT NULL,
  interests JSONB,
  dealbreakers JSONB,
  show_me_on_discover BOOLEAN DEFAULT TRUE,
  premium_only BOOLEAN DEFAULT FALSE,
  verified_only BOOLEAN DEFAULT FALSE
);
```

## 🔌 API Endpoints

### Swipes

```http
POST /api/swipes
  Body: { targetUserId, action: 'like'|'pass'|'super_like' }
  Response: { matched: boolean, match?: Match }

GET /api/swipes/likes
  Response: { count, userIds }

GET /api/swipes/stats
  Response: { total, likes, passes, superLikes }

POST /api/swipes/undo (Premium)
  Response: { success: boolean }
```

### Matches

```http
GET /api/matches
  Query: ?status=matched
  Response: { count, matches }

GET /api/matches/recent
  Query: ?limit=10
  Response: { count, matches }

GET /api/matches/count
  Response: { count }

GET /api/matches/:matchId
  Response: { match }

DELETE /api/matches/:matchId
  Response: { success: boolean }
```

### Recommendations

```http
GET /api/recommendations
  Query: ?limit=20&offset=0
  Response: { count, recommendations: MatchScore[] }

GET /api/recommendations/top (Premium)
  Query: ?limit=10
  Response: { count, topMatches }

POST /api/recommendations/refresh
  Response: { success: boolean }
```

## 🛠️ Setup

### Prerequisites
- Node.js >= 20.0.0
- PostgreSQL >= 14
- Redis (for caching)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration

# Run migrations
npm run migrate

# Build
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

### Environment Variables

```env
PORT=3002
NODE_ENV=development

JWT_ACCESS_SECRET=your-secret-key

DB_HOST=localhost
DB_PORT=5432
DB_NAME=matching_service_dev
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

USER_SERVICE_URL=http://localhost:3001

MIN_COMPATIBILITY_SCORE=30
DEFAULT_RECOMMENDATION_LIMIT=20
MAX_DISTANCE_KM=100
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Test coverage
npm test -- --coverage
```

## 📈 Performance

- **Matching Algorithm**: O(n) where n = number of candidates
- **Distance Calculation**: O(1) using Haversine formula
- **Database Queries**: Optimized with indexes on:
  - `(user_id, target_user_id)` for swipes
  - `(user1_id, user2_id)` for matches
  - `status` for match filtering

## 🔒 Security

- JWT authentication required for all endpoints
- User authorization checks for match operations
- Input validation on all endpoints
- SQL injection prevention using parameterized queries

## 🚀 Future Enhancements

- [ ] ML-based matching using TensorFlow
- [ ] Real-time recommendations using WebSocket
- [ ] A/B testing for algorithm optimization
- [ ] Boost functionality (premium feature)
- [ ] Undo swipe (premium feature - full implementation)
- [ ] Block/Report users
- [ ] Match expiration (Bumble-style)
- [ ] Conversation starters

## 📊 Metrics & Monitoring

Key metrics to track:
- Swipes per user per day
- Match rate (matches / likes)
- Average compatibility score of matches
- Recommendation acceptance rate
- API response times

## 🤝 Integration

### User Service
- Fetches user profiles
- Retrieves user preferences
- Gets candidate pool

### Messaging Service (Future)
- Creates conversation on match
- Sends match notifications

### Notification Service (Future)
- Push notifications for matches
- Email notifications

## 📝 Development

### Adding New Features

1. Update types in `src/types/index.ts`
2. Create/update entities in `src/domain/entities/`
3. Add repository methods in `src/domain/repositories/`
4. Implement business logic in `src/domain/services/`
5. Create API endpoints in `src/api/`
6. Write tests
7. Update documentation

### Code Quality

- TypeScript strict mode enabled
- ESLint for code quality
- Prettier for formatting
- Comprehensive error handling
- Structured logging

## 📞 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ for Flamoral**
