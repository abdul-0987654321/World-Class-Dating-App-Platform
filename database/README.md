# Flamoral Dating Platform - Database Migrations

This directory contains all consolidated database migrations for the Flamoral Dating Platform, designed to run against a single PostgreSQL database.

## Overview

The database schema is organized into 11 comprehensive migrations that create all necessary tables for the platform:

1. **Users and Profiles** - Core user authentication and profile information
2. **Photos and Prompts** - User photos and profile prompts/answers
3. **Matching Tables** - Swipes, matches, and user preferences
4. **Messaging Tables** - Conversations and messages
5. **Subscription Tables** - Subscription plans and payment tracking
6. **Coin System** - Virtual currency for in-app purchases
7. **Boost System** - Profile boost functionality
8. **Safety Tables** - User blocks, reports, moderation, and violations
9. **Privacy Settings** - User privacy preferences
10. **Notification Tables** - Push, email, SMS notifications and preferences
11. **Analytics Tables** - Event tracking, attribution, and campaign analytics

## Database Schema

### Core Tables

#### Users & Authentication
- `users` - User accounts and authentication
- `profiles` - User profile information
- `verification_tokens` - Email/phone verification tokens
- `refresh_tokens` - JWT refresh tokens

#### Content
- `photos` - User photos with verification and moderation
- `prompts` - Predefined profile questions
- `user_prompts` - User answers to prompts

#### Matching System
- `swipes` - User swipe actions (like, pass, super like)
- `matches` - Matched users with compatibility scores
- `user_preferences` - User matching preferences

#### Messaging
- `conversations` - Chat conversations between matched users
- `messages` - Individual messages with read receipts

### Monetization Tables

#### Subscriptions
- `subscription_plans` - Available subscription tiers (free, basic, mid, ultra)
- `subscriptions` - User subscriptions with Stripe integration
- `payment_methods` - Saved payment methods
- `transactions` - Payment transaction history

#### Virtual Currency
- `coins` - User coin balances
- `coin_packages` - Available coin packages for purchase
- `coin_transactions` - Coin transaction history

#### Boosts
- `boost_products` - Available boost products
- `boosts` - User boost history and active boosts

### Safety & Moderation

- `user_blocks` - Blocked users
- `reports` - User reports for inappropriate content/behavior
- `moderation_logs` - Content moderation history
- `user_violations` - User violation records
- `user_safety_records` - Aggregated safety data per user

### Privacy & Notifications

- `privacy_settings` - User privacy preferences
- `notification_templates` - Notification message templates
- `user_devices` - User devices for push notifications
- `notification_preferences` - User notification preferences
- `notifications` - Notification history

### Analytics & Tracking

- `analytics_events` - Event tracking with UTM parameters
- `user_attribution` - First-touch and last-touch attribution
- `user_sessions` - User session tracking
- `conversion_funnel` - Conversion funnel progression
- `ad_campaign_performance` - Ad campaign metrics
- `engagement_metrics` - Daily user engagement metrics

## Prerequisites

- PostgreSQL 13+ (with UUID support via pgcrypto extension)
- Node.js 18+
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the example environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your database credentials:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=your_password
```

## Running Migrations

### Run all pending migrations:
```bash
npm run migrate:latest
```

### Rollback the last batch of migrations:
```bash
npm run migrate:rollback
```

### Rollback all migrations:
```bash
npm run migrate:rollback --all
```

### Check migration status:
```bash
npm run migrate:status
```

### List completed and pending migrations:
```bash
npm run migrate:list
```

### Create a new migration:
```bash
npm run migrate:make migration_name
```

## Database Reset (Development Only)

To completely reset your database:
```bash
npm run db:fresh
```

This will:
1. Rollback all migrations
2. Run all migrations from scratch

## Migration Order

The migrations must be run in this order (handled automatically by Knex):

1. `20250101000001_create_users_and_profiles.ts`
2. `20250101000002_create_photos_and_prompts.ts`
3. `20250101000003_create_matching_tables.ts`
4. `20250101000004_create_messaging_tables.ts`
5. `20250101000005_create_subscription_tables.ts`
6. `20250101000006_create_coin_system.ts`
7. `20250101000007_create_boost_system.ts`
8. `20250101000008_create_safety_tables.ts`
9. `20250101000009_create_privacy_settings.ts`
10. `20250101000010_create_notification_tables.ts`
11. `20250101000011_create_analytics_tables.ts`

## Key Features

### Automatic UUID Generation
All tables use UUID primary keys with automatic generation via PostgreSQL's `gen_random_uuid()` function.

### Timestamps
Most tables include automatic `created_at` and `updated_at` timestamps managed by Knex.

### Foreign Key Constraints
Proper foreign key relationships with cascading deletes where appropriate.

### Indexes
Comprehensive indexing strategy for optimal query performance:
- Primary keys and foreign keys
- Frequently queried columns
- Composite indexes for common query patterns
- Partial indexes for specific use cases

### Database Triggers
Several tables use PostgreSQL triggers for:
- Automatic timestamp updates
- Conversation metadata updates on new messages
- Coin balance calculations
- Boost activation

### Check Constraints
Business logic enforcement at the database level:
- Balance must be non-negative (coins)
- User cannot block themselves
- User1_id < User2_id in matches (prevents duplicates)

### JSONB Columns
Flexible data storage for:
- User interests and languages
- Feature lists
- UTM parameters and click IDs
- Event properties
- Metadata

## Default Data

Several migrations include seed data:

### Subscription Plans
- **Free**: 50 daily swipes, 1 super like
- **Basic** ($9.99/mo): Unlimited swipes, 5 super likes, see who likes you
- **Mid** ($19.99/mo): Unlimited super likes, advanced filters, priority likes
- **Ultra** ($34.99/mo): Incognito mode, passport, 5 boosts per month

### Coin Packages
- 10 Coins: $4.99
- 25 Coins: $9.99 (+ 2 bonus)
- 50 Coins: $17.99 (+ 5 bonus) - Most Popular
- 100 Coins: $29.99 (+ 15 bonus)
- 250 Coins: $59.99 (+ 50 bonus)

### Boost Products
- Standard Boost: 30 minutes, 5 coins
- Prime Time Boost: 60 minutes, 10 coins
- Spotlight: 60 minutes, 15 coins

### Prompts
8 default profile prompts across personality, lifestyle, and fun categories

### Notification Templates
10 default templates for matches, messages, likes, boosts, emails, and SMS

## Production Deployment

1. Ensure your production database is backed up
2. Test migrations in a staging environment first
3. Run migrations during low-traffic periods
4. Monitor for errors during migration

```bash
NODE_ENV=production npm run migrate:latest
```

## Rollback Strategy

Each migration includes a `down()` function for rollback:

```bash
# Rollback last batch
npm run migrate:rollback

# Rollback to a specific migration
npm run migrate:down
```

## Performance Considerations

- All foreign keys are indexed
- Composite indexes for common query patterns
- JSONB indexes using GIN for UTM parameters and click IDs
- Partial indexes for filtered queries (e.g., active swipes)
- Consider adding additional indexes based on query patterns

## Monitoring

Track these metrics in production:
- Migration execution time
- Table sizes and growth rates
- Index usage and efficiency
- Query performance

## Support

For issues or questions about the database schema:
- Check the inline migration comments
- Review the table structure in each migration file
- Consult the application documentation

## License

Copyright © 2025 Flamoral Dating Platform
