# Vercel + Railway Integration Guide

This document describes the integration architecture between Vercel (frontend hosting) and Railway (backend hosting) for the Flamoral dating platform.

## Architecture Overview

```
                                    PRODUCTION
    +------------------+         +------------------+
    |    flamoral.com  |         | api.flamoral.com |
    |                  |         |                  |
    |    +---------+   |         |   +---------+   |
    |    | Vercel  |   | ------> |   | Railway |   |
    |    | Edge    |   | /api/*  |   | Backend |   |
    |    +---------+   | ------> |   +---------+   |
    |        |         | /ws/*   |        |        |
    |        v         | ------> |        v        |
    |    +---------+   | /graphql|   +---------+   |
    |    | Static  |   |         |   | API     |   |
    |    | Assets  |   |         |   | Gateway |   |
    |    +---------+   |         |   +---------+   |
    +------------------+         +------------------+
             |                          |
             |                          |
    +--------+--------------------------+--------+
    |                                            |
    |            Shared Services                 |
    |  +------+  +-------+  +--------+  +-----+  |
    |  |Stripe|  |Sentry |  |Analytics| | CDN |  |
    |  +------+  +-------+  +--------+  +-----+  |
    +--------------------------------------------+
```

## Request Flow

### HTTP API Requests

```
User Browser
     |
     v
Vercel Edge Network (Global CDN)
     |
     | (vercel.json rewrites)
     v
/api/* -> Railway Backend
     |
     v
API Gateway (Railway)
     |
     v
Microservices
```

### WebSocket Connections

```
User Browser
     |
     v
Vercel Edge (Upgrade Request)
     |
     | (rewrite to Railway)
     v
/ws/* or /socket.io/*
     |
     v
Railway Backend (WebSocket Server)
     |
     v
Real-time Services (Messaging, Presence, etc.)
```

## Environment Mapping

| Environment | Vercel Domain        | Railway Service | API URL                          |
| ----------- | -------------------- | --------------- | -------------------------------- |
| Production  | flamoral.com         | production      | https://api.flamoral.com         |
| Production  | www.flamoral.com     | production      | https://api.flamoral.com         |
| Staging     | staging.flamoral.com | staging         | https://staging-api.flamoral.com |
| Preview     | \*.vercel.app        | staging         | Railway staging URL              |

## Environment Variables

### Frontend (Vercel)

| Variable         | Production                       | Staging                 |
| ---------------- | -------------------------------- | ----------------------- |
| VITE_API_URL     | https://api.flamoral.com         | Railway staging URL     |
| VITE_WS_URL      | wss://api.flamoral.com           | Railway staging WSS     |
| VITE_SOCKET_URL  | wss://api.flamoral.com           | Railway staging WSS     |
| VITE_GRAPHQL_URL | https://api.flamoral.com/graphql | Railway staging GraphQL |
| VITE_SENTRY_DSN  | Production DSN                   | Staging DSN             |
| VITE_APP_ENV     | production                       | staging                 |

### Backend (Railway)

| Variable      | Description                                |
| ------------- | ------------------------------------------ |
| CORS_ORIGINS  | flamoral.com,www.flamoral.com,*.vercel.app |
| ALLOWED_HOSTS | flamoral.com,\*.railway.app                |
| NODE_ENV      | production / staging                       |
| DATABASE_URL  | PostgreSQL connection string               |
| REDIS_URL     | Redis connection string                    |

## Vercel Configuration

### Rewrites (vercel.json)

The rewrites are processed in order. Host-based conditions route requests appropriately:

1. **Production domains** (flamoral.com, www.flamoral.com):
   - Route to `https://api.flamoral.com`

2. **Preview deployments** (\*.vercel.app):
   - Route to Railway staging environment

3. **Fallback**:
   - Default to Railway production

### Headers

Security headers applied to all responses:

- Strict-Transport-Security (HSTS)
- Content-Security-Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy

### CORS Headers for API Routes

API proxy routes include CORS headers:

- Access-Control-Allow-Origin
- Access-Control-Allow-Methods
- Access-Control-Allow-Headers
- Access-Control-Allow-Credentials

## CSP Directives

The Content Security Policy allows connections to:

### Script Sources

- self (same origin)
- Stripe (js.stripe.com)
- Sentry (\*.sentry.io, browser.sentry-cdn.com)
- Google Analytics/Tag Manager
- Marketing pixels (Facebook, TikTok, LinkedIn, etc.)

### Connect Sources

- API endpoints (api.flamoral.com, Railway URLs)
- WebSocket endpoints (wss://...)
- Stripe API
- Sentry ingestion
- Analytics endpoints
- CDN/Media URLs

### Frame Sources

- Stripe checkout/hooks
- OAuth providers (Google, Facebook, Apple)

## Railway Configuration

### railway.toml

```toml
[build]
builder = "dockerfile"
dockerfilePath = "backend/services/auth-service/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 30
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 10
```

### Required Railway Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Security
JWT_SECRET=<secret>
CORS_ORIGINS=https://flamoral.com,https://www.flamoral.com

# External Services
STRIPE_SECRET_KEY=<secret>
SENTRY_DSN=<dsn>
```

## Deployment Workflow

### Production Deployment

1. Merge to `main` branch
2. Vercel auto-deploys frontend
3. Railway auto-deploys backend
4. Health checks verify deployment
5. Traffic routes to new version

### Preview Deployments

1. Open PR on GitHub
2. Vercel creates preview deployment
3. Preview uses staging Railway environment
4. Review and test changes
5. Merge triggers production deployment

## Troubleshooting

### API Requests Failing

1. **Check Railway health endpoint**:

   ```bash
   curl https://world-class-dating-app-platform-production.up.railway.app/health
   ```

2. **Verify Vercel rewrites**:
   - Check Vercel dashboard for rewrite logs
   - Confirm `vercel.json` is properly deployed

3. **Check CORS configuration**:
   - Ensure Railway CORS_ORIGINS includes Vercel domains
   - Verify CSP connect-src allows Railway URLs

### WebSocket Connection Issues

1. **Verify WebSocket endpoint is accessible**:

   ```bash
   wscat -c wss://world-class-dating-app-platform-production.up.railway.app/ws
   ```

2. **Check CSP headers**:
   - Ensure `wss://` URLs are in connect-src

3. **Railway WebSocket support**:
   - Railway supports WebSocket by default
   - Verify health checks are passing

### Preview Environment Issues

1. **Confirm staging Railway is running**:

   ```bash
   curl https://world-class-dating-app-platform-staging.up.railway.app/health
   ```

2. **Check environment variables**:
   - Vercel preview builds should use staging env vars
   - Configure environment variables in Vercel dashboard

### CSP Violations

1. **Check browser console** for CSP errors
2. **Review CSP header** in Network tab
3. **Add missing domains** to appropriate CSP directive in vercel.json

## Monitoring

### Vercel

- Deployment logs: Vercel Dashboard > Project > Deployments
- Analytics: Vercel Dashboard > Analytics
- Functions logs: Vercel Dashboard > Functions

### Railway

- Application logs: Railway Dashboard > Service > Logs
- Metrics: Railway Dashboard > Service > Metrics
- Health status: /health endpoint

### Sentry

- Frontend errors: Sentry > flamoral-web project
- Backend errors: Sentry > flamoral-api project
- Performance: Sentry > Performance tab

## Security Considerations

1. **Never commit secrets** to vercel.json or .env files
2. **Use environment variables** in Vercel/Railway dashboards
3. **Rotate secrets** regularly using the rotation runbook
4. **Monitor CSP violations** in Sentry
5. **Review CORS** configuration periodically

## Quick Reference

### URLs

| Service  | Production               | Staging                          |
| -------- | ------------------------ | -------------------------------- |
| Frontend | https://flamoral.com     | https://staging.flamoral.com     |
| API      | https://api.flamoral.com | Railway staging URL              |
| CDN      | https://cdn.flamoral.com | https://cdn-staging.flamoral.com |

### Commands

```bash
# Test production API
curl https://api.flamoral.com/health

# Test staging API
curl https://world-class-dating-app-platform-staging.up.railway.app/health

# Test WebSocket
wscat -c wss://api.flamoral.com/ws

# Verify Vercel deployment
vercel ls

# Check Railway status
railway status
```
