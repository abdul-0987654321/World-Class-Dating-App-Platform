# End-to-End Testing Guide

## Prerequisites

1. **Docker Desktop** - Must be running
2. **Node.js 20+** - Required for backend and frontend
3. **Yarn** - Package manager

## Quick Start

### Step 1: Start Docker Desktop

Open Docker Desktop application and wait for it to fully start (icon should show "Docker is running").

### Step 2: Start Infrastructure

```bash
cd World-Class-Dating-App-Platform
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- MongoDB (port 27017)
- Redis (port 6379)
- Elasticsearch (port 9200)
- RabbitMQ (ports 5672, 15672)

### Step 3: Install Dependencies

```bash
yarn install
```

### Step 4: Setup Environment

```bash
# Copy environment files
cp .env.example .env
cp apps/web-app/.env.example apps/web-app/.env
cp backend/.env.example backend/.env
```

### Step 5: Run Database Migrations

```bash
cd backend
yarn migrate
yarn seed
cd ..
```

### Step 6: Start Backend Services

```bash
# Terminal 1 - API Gateway
cd backend/services/api-gateway
yarn dev

# Terminal 2 - User Service
cd backend/services/user-service
yarn dev

# Terminal 3 - Matching Service
cd backend/services/matching-service
yarn dev

# Terminal 4 - Messaging Service
cd backend/services/messaging-service
yarn dev
```

### Step 7: Start Web Application

```bash
# Terminal 5
cd apps/web-app
yarn dev
```

Web app will be available at: **http://localhost:5173**

---

## Test User Accounts

| Account | Email | Password |
|---------|-------|----------|
| Test User 1 | `test1@connectsphere.com` | `TestUser1!` |
| Test User 2 | `test2@connectsphere.com` | `TestUser2!` |

Both accounts have:
- Premium subscription
- 100 coins
- Full verification
- Complete profile

---

## Running E2E Tests

### Playwright Tests

```bash
cd apps/web-app

# Install Playwright browsers
npx playwright install

# Run all E2E tests
yarn test:e2e

# Run specific test file
npx playwright test tests/e2e/specs/auth.spec.ts

# Run with UI mode (visual)
npx playwright test --ui

# Run with headed browsers (see the browser)
npx playwright test --headed
```

### Test Categories

1. **Authentication Tests** (`tests/e2e/specs/auth.spec.ts`)
   - Login flow
   - Registration flow
   - Password reset
   - Session management

2. **Critical Path Tests** (`tests/e2e/specs/critical-paths.smoke.ts`)
   - Profile viewing
   - Swiping/matching
   - Messaging
   - Settings

3. **Visual Regression** (`tests/visual/visual-regression.spec.ts`)
   - UI consistency
   - Component rendering

4. **Accessibility Tests** (`tests/accessibility/accessibility.spec.ts`)
   - WCAG compliance
   - Screen reader compatibility

---

## Manual Testing Checklist

### Authentication
- [ ] Login with test1@connectsphere.com / TestUser1!
- [ ] Login with test2@connectsphere.com / TestUser2!
- [ ] Logout functionality
- [ ] Remember me option

### Discovery/Swiping
- [ ] View profile cards
- [ ] Swipe right (like)
- [ ] Swipe left (pass)
- [ ] Super like
- [ ] Undo last swipe

### Matching
- [ ] View matches list
- [ ] Open match details
- [ ] Start conversation from match

### Messaging
- [ ] View conversations
- [ ] Send text message
- [ ] Send emoji/reaction
- [ ] See typing indicator
- [ ] Message read receipts

### Profile
- [ ] View own profile
- [ ] Edit bio
- [ ] Update photos
- [ ] Change preferences
- [ ] Update settings

### Premium Features
- [ ] View subscription options
- [ ] Access premium filters
- [ ] Use boost feature
- [ ] View who liked you

---

## API Endpoints for Testing

### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/refresh-token
```

### Users
```
GET  /api/users/me
PATCH /api/users/me
GET  /api/users/:id
```

### Matching
```
GET  /api/matching/recommendations
POST /api/matching/swipe
GET  /api/matching/matches
POST /api/matching/undo
```

### Messages
```
GET  /api/messages/conversations
GET  /api/messages/conversations/:id
POST /api/messages/conversations/:id/messages
```

---

## Troubleshooting

### Docker Issues
```bash
# Restart Docker
docker-compose down
docker-compose up -d

# View logs
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Database Issues
```bash
# Reset database
docker-compose down -v
docker-compose up -d
yarn migrate
yarn seed
```

### Port Conflicts
```bash
# Check what's using a port
netstat -ano | findstr :5173
netstat -ano | findstr :4000
```

### Clear Cache
```bash
# Clear node_modules
rm -rf node_modules
rm -rf apps/web-app/node_modules
yarn install
```

---

## Performance Testing

```bash
cd backend/tests/performance/k6

# Run load test
k6 run api-load-test.js

# Run stress test
k6 run stress-test.js
```

---

## Mobile App Testing

### iOS Simulator
```bash
cd apps/mobile-app
npx pod-install
yarn ios
```

### Android Emulator
```bash
cd apps/mobile-app
yarn android
```

---

## CI/CD Pipeline

The project includes GitHub Actions workflows:
- `.github/workflows/ci.yml` - Runs on every PR
- `.github/workflows/e2e-tests.yml` - E2E test suite
- `.github/workflows/deploy.yml` - Production deployment

---

## Contact & Support

Repository: https://github.com/oks-citadel/World-Class-Dating-App-Platform
