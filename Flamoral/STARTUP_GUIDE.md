# Flamoral - Startup Guide

This guide explains how to run the Flamoral dating app platform.

## Quick Start (Demo Mode with Mock Data)

The easiest way to see the frontend UI:

```bash
# Navigate to web app
cd apps/web-app

# Install dependencies
npm install

# Run in mock mode (no backend required)
npm run dev
```

The app will start at `http://localhost:5173` with mock data.

### Test Accounts (Mock Mode)
- Email: `test1@flamoral.com` / Password: `TestUser1!`
- Email: `test2@flamoral.com` / Password: `TestUser2!`

---

## Full Stack Mode (Frontend + Backend)

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Step 1: Start Infrastructure (Databases)

```bash
# Start PostgreSQL, MongoDB, Redis, Elasticsearch, RabbitMQ
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- MongoDB on port 27017
- Redis on port 6379
- Elasticsearch on port 9200
- RabbitMQ on ports 5672, 15672

### Step 2: Configure Environment

Create `.env` file in `backend/` directory:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres_dev_password@localhost:5432/flamoral
MONGODB_URI=mongodb://localhost:27017/flamoral
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 3: Run Database Migrations

```bash
cd backend
npm install
npm run migrate
npm run seed
```

### Step 4: Start Backend Server

```bash
cd backend
npm run dev
```

Backend will run on:
- REST API: http://localhost:3000
- GraphQL: http://localhost:4000/graphql
- WebSocket: ws://localhost:5000
- API Docs: http://localhost:3000/api-docs

### Step 5: Start Frontend

In a new terminal:

```bash
cd apps/web-app

# Copy environment file
cp .env.development .env

# Install and run
npm install
npm run dev
```

Frontend will run at http://localhost:5173

---

## Test Accounts (Full Stack Mode)

After running seeds, these accounts are available:

| Tier | Email | Password | Name |
|------|-------|----------|------|
| FREE | test3@flamoral.com | TestUser3! | Sam Developer |
| GOLD | test2@flamoral.com | TestUser2! | Jordan Demo |
| GOLD | test5@flamoral.com | TestUser5! | Morgan Sample |
| PLATINUM | test1@flamoral.com | TestUser1! | Alex Demo |
| DIAMOND | test4@flamoral.com | TestUser4! | Riley Tester |

---

## Running with Docker (All Services)

For production-like setup:

```bash
# Start all infrastructure
docker-compose up -d

# Start backend services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh` - Refresh token

### Discovery
- `GET /api/matching/recommendations` - Get profile recommendations
- `POST /api/matching/swipe` - Swipe on a profile
- `GET /api/matching/stats` - Get swipe stats

### Matches
- `GET /api/matching/matches` - Get all matches
- `DELETE /api/matching/matches/:id` - Unmatch

### Messages
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages/:conversationId` - Send message

### Profile
- `GET /api/profiles/me` - Get current user profile
- `PUT /api/profiles/me` - Update profile
- `POST /api/media/photos` - Upload photo

### Gamification
- `GET /api/gamification/daily-reward` - Claim daily reward
- `GET /api/gamification/achievements` - Get achievements
- `GET /api/gamification/quests` - Get active quests

### Speed Dating
- `GET /api/speed-dating/events` - List events
- `POST /api/speed-dating/events/:id/register` - Register for event

### Communities
- `GET /api/communities` - List communities
- `POST /api/communities/:id/join` - Join community

---

## Troubleshooting

### "Features not showing in UI"
1. Check if backend is running: `curl http://localhost:3000/health`
2. Verify `.env` has `VITE_API_URL=http://localhost:3000`
3. Check browser console for CORS errors

### "Database connection failed"
1. Ensure Docker containers are running: `docker ps`
2. Check PostgreSQL: `docker logs flamoral-postgres`
3. Verify DATABASE_URL in backend `.env`

### "Login not working"
1. Run migrations: `npm run migrate`
2. Run seeds: `npm run seed`
3. Check backend logs for errors

---

## Architecture

```
Flamoral/
├── apps/
│   ├── web-app/          # React frontend (Vite + TypeScript)
│   └── mobile-app/       # React Native mobile app
├── backend/
│   ├── src/              # Main Express server
│   │   ├── api/          # REST & GraphQL APIs
│   │   ├── services/     # Business logic
│   │   └── repositories/ # Data access
│   └── services/         # Microservices
│       ├── user-service/
│       ├── matching-service/
│       ├── messaging-service/
│       ├── media-service/
│       ├── payment-service/
│       ├── notification-service/
│       ├── advertising-service/  # 40 AI-powered ad features
│       └── ai-services/          # Python AI/ML services
└── infrastructure/       # Docker, Terraform, K8s configs
```
