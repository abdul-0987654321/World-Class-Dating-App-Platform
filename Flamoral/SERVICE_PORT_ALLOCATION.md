# Flamoral Service Port Allocation Reference

This document defines the official port assignments for all microservices in the Flamoral platform.
All services must use these standardized port assignments to ensure proper inter-service communication.

## Port Assignments

| Service | Port | Description |
|---------|------|-------------|
| Auth Service | 3001 | Authentication, JWT tokens, login/register |
| User Service | 3002 | User profiles, preferences, settings |
| Matching Service | 3009 | Match algorithm, compatibility scoring |
| Messaging Service | 3004 | Chat, conversations, message delivery |
| Payment Service | 3005 | Stripe integration, subscriptions, coins |
| Media Service | 3006 | Photo uploads, Azure Blob storage |
| Analytics Service | 3007 | Event tracking, metrics, reporting |
| Moderation Service | 3008 | Content moderation, user reports |
| Admin Service | 3010 | Admin dashboard, user management |
| Advertising Service | 3011 | Ad campaigns, targeting |
| Notification Service | 3012 | Push, email, SMS notifications |
| Workflow Engine | 3013 | Automation, scheduled tasks |
| API Gateway | 4000 | Main entry point, routing, rate limiting |
| AI Service | 8000 | ML models, recommendations |
| Realtime Service | 8081 | WebSocket connections, presence |

## Production URLs

For production deployments, services communicate through the API Gateway:
- Frontend: `https://flamoral.com`
- API: `https://api.flamoral.com`
- WebSocket: `wss://api.flamoral.com`

## CORS Origins

All services should include these production domains in their CORS configuration:
```
https://flamoral.com
https://www.flamoral.com
https://admin.flamoral.com
```

Plus development URLs:
```
http://localhost:3000
http://localhost:5173
http://localhost:4000
```

## Configuration Checklist

When adding a new service or updating configurations:

1. Verify PORT matches this allocation
2. Verify all SERVICE_URL references use correct ports
3. Include all production domains in CORS_ORIGINS
4. Set GraphQL introspection/playground to false for production
5. Use environment variables, never hardcode production URLs

## Last Updated
December 13, 2025
