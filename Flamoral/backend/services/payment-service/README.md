# Payment Service - Complete Stripe Integration

A production-ready payment processing service with comprehensive Stripe webhook handling for subscriptions, coin purchases, and boost activations.

## 🌟 Features

### Payment Processing
- ✅ **Subscription Management** - Create, update, cancel subscriptions
- ✅ **Coin Purchases** - One-time payments for in-app currency
- ✅ **Boost Purchases** - Profile visibility boost purchases
- ✅ **Payment Methods** - Store and manage user payment methods
- ✅ **Refunds** - Process refunds and handle disputes

### Webhook Handling
- ✅ **Payment Intent Events** - `payment_intent.succeeded`, `payment_intent.payment_failed`
- ✅ **Subscription Events** - `customer.subscription.created/updated/deleted`
- ✅ **Invoice Events** - `invoice.payment_succeeded/failed`
- ✅ **Idempotency** - Prevents duplicate event processing
- ✅ **Signature Verification** - Validates all incoming webhooks
- ✅ **Error Recovery** - Automatic retry with exponential backoff

### Service Integration
- ✅ **User Service** - Syncs subscription tiers, coin balances, boost status
- ✅ **Notification Service** - Sends payment confirmations, renewal reminders
- ✅ **Analytics Service** - Tracks revenue metrics (optional)

### Developer Experience
- ✅ **TypeScript** - Full type safety throughout
- ✅ **Comprehensive Logging** - Winston logger with structured logs
- ✅ **Database Migrations** - Version-controlled schema changes
- ✅ **Unit Tests** - Jest test suite included
- ✅ **API Documentation** - Complete OpenAPI/Swagger specs
- ✅ **Local Testing** - Stripe CLI integration

## 📚 Documentation

### Quick Links

| Document | Description |
|----------|-------------|
| [🚀 Quick Start](./QUICK_START.md) | Get up and running in 5 minutes |
| [📖 Implementation Guide](./WEBHOOK_IMPLEMENTATION.md) | Complete technical documentation |
| [💡 Usage Examples](./USAGE_EXAMPLES.md) | Code examples and integration patterns |
| [🏗️ Architecture](./ARCHITECTURE_DIAGRAM.md) | System architecture and data flow |
| [📋 Implementation Summary](./IMPLEMENTATION_SUMMARY.md) | What's implemented and how |
| [🔗 Webhook Integration](./WEBHOOK_INTEGRATION.md) | Original integration documentation |

### Quick Access

- **New to this service?** → Start with [Quick Start Guide](./QUICK_START.md)
- **Need implementation details?** → See [Implementation Guide](./WEBHOOK_IMPLEMENTATION.md)
- **Looking for code examples?** → Check [Usage Examples](./USAGE_EXAMPLES.md)
- **Want to understand the architecture?** → View [Architecture Diagram](./ARCHITECTURE_DIAGRAM.md)

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your Stripe keys and database credentials

# 3. Run database migrations
npm run migrate

# 4. Start the service
npm run dev

# 5. Test with Stripe CLI
stripe listen --forward-to localhost:3005/api/payments/webhook
```

For detailed setup instructions, see [Quick Start Guide](./QUICK_START.md).

## 📁 Project Structure

```
payment-service/
├── src/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── payment.controller.ts
│   │   │   └── webhook.controller.ts          # Webhook endpoint handler
│   │   ├── middleware/
│   │   │   └── validation.middleware.ts
│   │   ├── routes/
│   │   │   └── payment.routes.ts
│   │   └── validators/
│   │       └── payment.validator.ts
│   ├── domain/
│   │   └── services/
│   │       ├── payment.service.ts
│   │       └── webhook.service.ts             # Webhook business logic
│   ├── infrastructure/
│   │   ├── clients/
│   │   │   ├── user-service.client.ts         # User Service integration
│   │   │   └── notification-service.client.ts # Notification integration
│   │   └── database/
│   │       ├── connection.ts
│   │       └── migrations/
│   │           └── 20250125_create_payment_tables.ts
│   ├── types/
│   │   ├── stripe-events.types.ts             # TypeScript type definitions
│   │   └── index.ts
│   ├── utils/
│   │   └── logger.ts
│   └── index.ts
├── tests/
│   ├── unit/
│   │   ├── controllers/
│   │   └── services/
│   └── integration/
├── .env.example                                # Environment template
├── package.json
├── tsconfig.json
├── jest.config.js
├── Dockerfile
└── Documentation (see above)
```

## 🔧 Configuration

### Environment Variables

```bash
# Stripe Configuration (REQUIRED)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Service URLs (REQUIRED)
USER_SERVICE_URL=http://localhost:3001
NOTIFICATION_SERVICE_URL=http://localhost:3008

# Service Authentication (REQUIRED)
SERVICE_API_KEY=your-internal-service-key-min-32-chars

# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_payments
DB_USER=postgres
DB_PASSWORD=your_password

# Optional
LOG_LEVEL=info
PORT=3005
```

See [.env.example](./.env.example) for complete configuration.

## 🎯 API Endpoints

### Payment Endpoints

```
POST   /api/payments/create-intent           # Create payment intent
POST   /api/payments/subscription/create     # Create subscription
POST   /api/payments/subscription/cancel     # Cancel subscription
GET    /api/payments/methods/:customerId     # Get payment methods
POST   /api/payments/methods/add             # Add payment method
POST   /api/payments/refund                  # Process refund
```

### Webhook Endpoint

```
POST   /api/payments/webhook                 # Stripe webhook handler
```

### Health Check

```
GET    /health                               # Service health status
```

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm test -- --coverage
```

### Local Webhook Testing

```bash
# Install Stripe CLI
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3005/api/payments/webhook

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger customer.subscription.created
stripe trigger invoice.payment_succeeded
```

See [Usage Examples](./USAGE_EXAMPLES.md) for more testing scenarios.

## 📊 Database Schema

### Core Tables

- **stripe_webhook_events** - Webhook event tracking and idempotency
- **transactions** - All payment transactions
- **coin_transactions** - Coin balance changes
- **user_subscriptions** - Active subscriptions
- **subscription_plans** - Available subscription tiers
- **coin_packages** - Available coin packages
- **payment_methods** - Stored payment methods

See [Implementation Guide](./WEBHOOK_IMPLEMENTATION.md#database-schema) for detailed schema.

## 🔐 Security

- ✅ Webhook signature verification (HMAC)
- ✅ Service-to-service authentication (API keys)
- ✅ Environment variable configuration
- ✅ SQL injection prevention (Knex ORM)
- ✅ Input validation
- ✅ HTTPS in production
- ✅ Secrets management

## 🔍 Monitoring

### Key Metrics

- Webhook delivery success rate
- Processing time per event type
- Failed event count
- User service integration errors
- Database query performance

### Logging

All operations are logged with Winston:

```typescript
// Structured logs
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "payment-service",
  "message": "Coin purchase processed",
  "userId": "user-123",
  "amount": 500
}
```

### Health Checks

```bash
# Service health
curl http://localhost:3005/health

# Database health
npm run db:check

# Webhook status
stripe webhooks list
```

## 🐛 Debugging

### View Logs

```bash
# Real-time logs
npm run dev

# Error logs only
tail -f logs/error.log

# All logs
tail -f logs/combined.log
```

### Database Queries

```sql
-- Recent webhook events
SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 10;

-- Failed events
SELECT * FROM stripe_webhook_events WHERE status = 'failed';

-- Recent transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- User subscriptions
SELECT * FROM user_subscriptions WHERE user_id = 'user-id';
```

### Stripe Dashboard

- Events: https://dashboard.stripe.com/test/events
- Webhooks: https://dashboard.stripe.com/test/webhooks
- Logs: https://dashboard.stripe.com/test/logs

## 🚢 Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Webhook endpoint is HTTPS
- [ ] Production webhook created in Stripe
- [ ] Service API keys are secure
- [ ] Monitoring and alerts set up
- [ ] User Service endpoints implemented
- [ ] Notification Service configured
- [ ] Load testing completed
- [ ] Documentation reviewed

### Docker

```bash
# Build image
docker build -t payment-service .

# Run container
docker run -p 3005:3005 --env-file .env payment-service
```

See [Deployment Guide](./WEBHOOK_IMPLEMENTATION.md#production-checklist) for details.

## 🤝 Integration Guide

### User Service Requirements

Implement these internal endpoints:

```typescript
PUT  /api/internal/subscriptions/update  // Update user subscription tier
POST /api/internal/coins/add             // Add coins to user balance
POST /api/internal/boosts/activate       // Activate profile boost
```

### Notification Service Requirements

```typescript
POST /api/internal/notifications/send    // Send notification to user
```

All internal endpoints must:
- Require `X-Service-Key` header
- Accept JSON payloads
- Return appropriate status codes
- Handle errors gracefully

See [Webhook Integration](./WEBHOOK_INTEGRATION.md) for complete API specifications.

## 📈 Performance

- **Webhook Processing**: < 500ms average
- **Database Queries**: Optimized with indexes
- **Connection Pooling**: Configured for high throughput
- **Non-blocking I/O**: Async/await throughout
- **Error Recovery**: Automatic retry with backoff

## 🆘 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Signature verification fails | Check `STRIPE_WEBHOOK_SECRET` matches Dashboard |
| Database connection error | Verify PostgreSQL is running and credentials are correct |
| User service not responding | Check `USER_SERVICE_URL` and `SERVICE_API_KEY` |
| Duplicate events | Idempotency is automatic - this is expected |
| Missing metadata | Ensure payment intents include `user_id` and `type` |

See [Troubleshooting Guide](./WEBHOOK_IMPLEMENTATION.md#troubleshooting) for more solutions.

## 📝 License

Copyright © 2024 Flamoral Dating Platform

## 🤓 Support

- **Documentation**: See docs above
- **Issues**: Check GitHub issues
- **Stripe Docs**: https://stripe.com/docs
- **Logs**: Check `logs/` directory

## 🎉 What's Implemented

This is a **complete, production-ready implementation** including:

### Core Features
- ✅ All 7 required webhook events
- ✅ Coin purchase processing
- ✅ Boost purchase processing
- ✅ Subscription management
- ✅ Invoice handling
- ✅ Notification integration
- ✅ User service integration

### Quality & Safety
- ✅ TypeScript types for everything
- ✅ Comprehensive error handling
- ✅ Detailed logging
- ✅ Idempotency handling
- ✅ Signature verification
- ✅ Transaction safety
- ✅ Input validation

### Developer Experience
- ✅ Complete documentation (6 guides)
- ✅ Code examples
- ✅ Testing instructions
- ✅ Architecture diagrams
- ✅ Troubleshooting guide
- ✅ Quick start guide

---

**Built with ❤️ for the Flamoral Dating Platform**

For detailed information, start with the [Quick Start Guide](./QUICK_START.md) or explore the [complete documentation](#-documentation).
