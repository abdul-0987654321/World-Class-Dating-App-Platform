# Phase 1 Implementation Guide

## Overview

Phase 1 implements a comprehensive monetization and safety system for the dating platform, including subscription management, virtual currency, profile boosts, user blocking/reporting, and privacy controls.

## Architecture

### Backend Services

#### User Service (Port 3001)
Handles user management, subscriptions, coins, boosts, privacy, blocking, and reporting.

**Key Components:**
- 12 Entity models
- 12 Repositories
- 8 Services
- 8 Controllers
- 8 Route handlers
- 8 Validation schemas
- Internal API endpoints for webhook integration

#### Payment Service (Port 3002)
Manages Stripe integration, payment processing, and webhook handling.

**Key Components:**
- Payment controller with Stripe integration
- Webhook processing for real-time payment events
- Inter-service communication client
- Comprehensive webhook documentation

### Frontend (Vite + React)

**Key Components:**
- 3 Service files (subscription, coin, payment)
- 5 React components (SubscriptionCard, CoinShopCard, CoinBalance, SubscriptionBadge)
- 2 Pages (Subscription, CoinShop)
- Route integration

## Features Implemented

### 1. Subscription System (4-Tier Freemium Model)

**Tiers:**
- **Free**: Basic functionality (10 swipes/day, 5 likes/day)
- **Basic ($9.99/mo)**: Unlimited swipes/likes, advanced filters, see who liked you
- **Mid ($19.99/mo)**: All Basic + incognito mode, super likes, rewinds, 1 free boost/month
- **Ultra ($29.99/mo)**: All Mid + unlimited super likes/rewinds, 2 free boosts/month, VIP badge

**Features:**
- Subscription CRUD operations
- Feature access checks
- Tier upgrades/downgrades
- Subscription cancellation (immediate or at period end)
- Reactivation support
- Stripe integration for recurring payments

**API Endpoints:**
```
GET    /api/subscriptions/current
GET    /api/subscriptions/features
GET    /api/subscriptions/features/:featureKey/access
PUT    /api/subscriptions/tier
POST   /api/subscriptions/cancel
POST   /api/subscriptions/reactivate
```

### 2. Virtual Currency System (Coins)

**Coin Packages:**
- Small: 100 coins ($4.99)
- Medium: 500 coins ($19.99)
- Large: 1200 coins ($39.99) + 20% bonus
- XL: 2500 coins ($74.99) + 25% bonus

**Features:**
- Coin balance tracking
- Purchase history with filtering
- Transaction summary
- Daily rewards
- Spend coins for features
- Refund support

**API Endpoints:**
```
GET    /api/coins/balance
GET    /api/coins/transactions
GET    /api/coins/transactions/summary
GET    /api/coins/products
POST   /api/coins/purchase
POST   /api/coins/spend
POST   /api/coins/daily-reward
```

### 3. Profile Boost System

**Boost Products:**
- 30 minutes ($4.99 or 50 coins)
- 1 hour ($7.99 or 80 coins)
- 3 hours ($14.99 or 150 coins)

**Features:**
- Purchase boosts with money or coins
- Active boost tracking
- Boost history
- Statistics (views, likes during boost)
- Auto-expiration

**API Endpoints:**
```
GET    /api/boosts/products
POST   /api/boosts/purchase
GET    /api/boosts/active
GET    /api/boosts/history
GET    /api/boosts/stats
POST   /api/boosts/cancel
```

### 4. User Blocking System

**Features:**
- Block users with optional reason
- Unblock users
- View blocked users list
- Check if users are blocked
- Bidirectional block enforcement

**API Endpoints:**
```
POST   /api/blocks/:blockedId
DELETE /api/blocks/:blockedId
GET    /api/blocks/list
GET    /api/blocks/check/:targetUserId
```

### 5. User Reporting & Moderation

**Report Types:**
- Inappropriate photos
- Inappropriate messages
- Fake profile
- Spam
- Harassment
- Underage
- Scam
- Violence
- Hate speech
- Other

**Features:**
- Create reports with evidence
- View report categories
- My reports history
- Moderation queue for admins
- Resolve reports with actions
- Report statistics

**API Endpoints:**
```
POST   /api/reports
GET    /api/reports/categories
GET    /api/reports/my-reports
PUT    /api/reports/:reportId/resolve
GET    /api/reports/moderation-queue
GET    /api/reports/stats
```

### 6. Privacy Controls

**Settings:**
- Incognito mode (temporary invisibility)
- Show/hide distance
- Show/hide last active
- Show/hide online status
- Show/hide age
- Profile visibility (everyone, matches only, private)
- Hide from phone contacts
- Read receipts
- Typing indicators
- Precise location toggle
- Location radius control

**Presets:**
- Public (maximum visibility)
- Balanced (moderate privacy)
- Private (maximum privacy)

**API Endpoints:**
```
GET    /api/privacy/settings
PUT    /api/privacy/settings
POST   /api/privacy/incognito/toggle
POST   /api/privacy/preset
```

### 7. Usage Limits

**Resources Tracked:**
- Swipes
- Likes
- Super likes
- Rewinds
- Boosts

**Features:**
- View all limits for current user
- Check specific resource limit
- View current usage
- Automatic reset (daily/monthly)

**API Endpoints:**
```
GET    /api/usage-limits/limits
GET    /api/usage-limits/check/:resourceType
GET    /api/usage-limits/usage/:resourceType
```

## Payment Integration

### Stripe Webhook Events

**Supported Events:**
- `payment_intent.succeeded` - One-time purchases (coins, boosts)
- `payment_intent.payment_failed` - Payment failures
- `customer.subscription.created` - New subscriptions
- `customer.subscription.updated` - Subscription changes
- `customer.subscription.deleted` - Subscription cancellations
- `invoice.payment_succeeded` - Successful renewals
- `invoice.payment_failed` - Failed renewals

### Internal API Endpoints

**Service-to-Service Communication** (requires `X-Service-Key` header):

```
PUT  /api/internal/subscriptions/update
POST /api/internal/coins/add
POST /api/internal/coins/subtract
POST /api/internal/boosts/activate
POST /api/internal/notifications/send
GET  /api/internal/users/:userId
```

### Webhook Flow

1. Stripe sends webhook to `/api/payments/webhook`
2. Payment service validates signature
3. Processes event based on type
4. Calls user-service internal API to update data
5. Sends notification to user
6. Returns 200 OK to Stripe

## Frontend Components

### Subscription Management

**Components:**
- `SubscriptionCard` - Display individual plan with features
- `SubscriptionBadge` - Show current tier in navigation
- `Subscription` (Page) - Full subscription management UI

**Features:**
- View all available plans
- Compare features
- Upgrade/downgrade
- Cancel subscription
- Reactivate canceled subscription

### Coin Shop

**Components:**
- `CoinShopCard` - Display coin package with bonus
- `CoinBalance` - Show balance in navigation
- `CoinShop` (Page) - Full coin shop UI

**Features:**
- View coin packages
- See bonus percentages
- Claim daily rewards
- View coin usage examples
- Purchase coins

## Database Schema

### Key Tables

**subscriptions**
- User subscription tier and status
- Stripe subscription ID
- Period dates
- Cancellation status

**coin_balances**
- Current balance per user
- Last updated timestamp

**coin_transactions**
- Transaction history
- Type (purchase, reward, spent, refund)
- Amount and balance after transaction
- Reference to related entities

**boosts**
- Active boosts
- Start and end times
- Purchase method (money/coins)
- Statistics (views, likes)

**blocks**
- Blocked user relationships
- Optional reason
- Timestamps

**reports**
- Report details
- Reporter and reported user
- Type, severity, status
- Evidence URLs
- Resolution details

**privacy_settings**
- All privacy preferences
- Incognito mode status
- Visibility settings

**usage_limits**
- Daily/monthly limits per tier
- Resource type
- Current usage count
- Reset period

## Configuration

### Environment Variables

**User Service:**
```bash
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/dating_app
JWT_SECRET=your-jwt-secret
SERVICE_API_KEY=your-internal-service-key
```

**Payment Service:**
```bash
PORT=3002
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
USER_SERVICE_URL=http://localhost:3001
SERVICE_API_KEY=your-internal-service-key
```

**Frontend:**
```bash
VITE_API_URL=http://localhost:3001/api
VITE_PAYMENT_API_URL=http://localhost:3002/api/payments
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

## Testing

### Manual Testing

1. **Subscriptions:**
   - Visit `/subscription`
   - Click on different plans
   - Test upgrade/downgrade flows
   - Test cancellation

2. **Coins:**
   - Visit `/coins`
   - Claim daily reward
   - Test coin purchase flow
   - Check balance updates

3. **Webhooks:**
   - Use Stripe CLI: `stripe listen --forward-to localhost:3002/api/payments/webhook`
   - Trigger test events: `stripe trigger payment_intent.succeeded`
   - Check user-service for data updates

### Integration Testing

Run integration tests for:
- Subscription tier changes
- Coin purchases and spending
- Boost activation
- Block/unblock operations
- Report creation and resolution
- Privacy settings updates

## Deployment

### Prerequisites

1. Stripe account with API keys
2. PostgreSQL database
3. Node.js 18+
4. Docker (optional)

### Deployment Steps

1. **Deploy Backend Services:**
   ```bash
   cd backend/services/user-service
   npm install
   npm run build
   npm start

   cd ../payment-service
   npm install
   npm run build
   npm start
   ```

2. **Deploy Frontend:**
   ```bash
   cd frontend/web
   npm install
   npm run build
   # Deploy dist/ to your hosting provider
   ```

3. **Configure Stripe Webhooks:**
   - Add endpoint: `https://yourdomain.com/api/payments/webhook`
   - Select events (see webhook integration docs)
   - Copy webhook secret to environment

4. **Run Database Migrations:**
   ```bash
   npx knex migrate:latest
   ```

## Monitoring

### Key Metrics

- Subscription conversion rate
- Churn rate
- Coin purchase frequency
- Boost usage
- Report volume
- Webhook delivery success rate

### Logging

- All webhook events logged
- Payment failures logged
- User-service integration errors logged
- Feature access violations logged

## Security

- Webhook signature validation
- Internal API key authentication
- JWT token validation for user endpoints
- Input validation on all endpoints
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized inputs)
- Rate limiting on all public endpoints

## Future Enhancements

### Phase 2 Considerations

- Gift coins to matches
- Coin bundles with time-limited offers
- Referral rewards
- Achievement system with coin rewards
- Premium filters (education, height, etc.)
- Travel mode (change location)
- Multiple active boosts
- Boost scheduling
- Video chat coins
- Profile verification badges

## Troubleshooting

### Common Issues

**Webhook not firing:**
- Check Stripe Dashboard webhook logs
- Verify endpoint URL is accessible
- Confirm webhook secret matches `.env`

**Coin balance not updating:**
- Check payment service logs
- Verify user-service internal API is accessible
- Check `SERVICE_API_KEY` matches

**Subscription not syncing:**
- Verify Stripe subscription has correct metadata (userId, tier)
- Check webhook processing logs
- Manually trigger sync via internal API

**Frontend not loading balance:**
- Check browser console for errors
- Verify API URLs in environment variables
- Check CORS settings

## Support

For issues or questions:
- Review logs in backend services
- Check Stripe Dashboard for payment issues
- Test internal APIs with curl/Postman
- Review webhook integration documentation
