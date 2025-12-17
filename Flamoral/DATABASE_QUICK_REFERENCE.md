# Flamoral Database - Quick Reference Guide

**Quick access to common database operations and schema information**

---

## Quick Start

```bash
# Navigate to database directory
cd database

# Run migrations
npm run migrate:latest

# Check migration status
npm run migrate:status

# Run seeds (development data)
npm run seed:run

# Reset database (destructive!)
npm run db:reset
```

---

## Connection Strings

### Development
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=postgres
```

### Production (Azure PostgreSQL)
```env
DATABASE_URL=postgresql://user@server:password@server.postgres.database.azure.com:5432/flamoral?ssl=true
DB_SSL=true
```

---

## Core Tables Quick Reference

### Users & Authentication
| Table | Primary Key | Key Columns | Notes |
|-------|-------------|-------------|-------|
| `users` | `id` (UUID) | email, password_hash, status, subscription_tier | Main user account |
| `profiles` | `id` (UUID) | user_id, first_name, last_name, bio, location | User profile info |
| `verification_tokens` | `id` (UUID) | user_id, token, type, expires_at | Email/phone verification |
| `refresh_tokens` | `id` (UUID) | user_id, token, device_id, expires_at | JWT refresh tokens |

### Matching
| Table | Primary Key | Key Columns | Notes |
|-------|-------------|-------------|-------|
| `swipes` | `id` (UUID) | user_id, target_user_id, action | like, pass, super_like |
| `matches` | `id` (UUID) | user1_id, user2_id, compatibility_score | user1_id < user2_id |
| `user_preferences` | `user_id` (UUID) | age_min, age_max, max_distance, gender_preference | Matching filters |

### Messaging
| Table | Primary Key | Key Columns | Notes |
|-------|-------------|-------------|-------|
| `conversations` | `id` (UUID) | user1_id, user2_id, match_id, last_message | One per match |
| `messages` | `id` (UUID) | conversation_id, sender_id, content, type, is_read | Chat messages |

### Monetization
| Table | Primary Key | Key Columns | Notes |
|-------|-------------|-------------|-------|
| `subscription_plans` | `id` (UUID) | name, tier, price_monthly, features | 4 tiers: free, basic, mid, ultra |
| `subscriptions` | `id` (UUID) | user_id, plan_id, status, stripe_subscription_id | One per user |
| `coins` | `id` (UUID) | user_id, balance, total_earned | Virtual currency |
| `coin_transactions` | `id` (UUID) | user_id, type, amount, balance_after | Transaction history |
| `boosts` | `id` (UUID) | user_id, product_id, status, start_time, end_time | Profile boosts |

---

## Common Queries

### User Queries

**Get user with profile:**
```sql
SELECT u.*, p.*
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.id = 'user-uuid';
```

**Get user's matches:**
```sql
SELECT m.*,
       CASE WHEN m.user1_id = 'user-uuid' THEN m.user2_id ELSE m.user1_id END as matched_user_id
FROM matches m
WHERE (m.user1_id = 'user-uuid' OR m.user2_id = 'user-uuid')
  AND m.status = 'active'
ORDER BY m.matched_at DESC;
```

**Get user's conversations:**
```sql
SELECT c.*,
       CASE WHEN c.user1_id = 'user-uuid' THEN c.user2_id ELSE c.user1_id END as other_user_id
FROM conversations c
WHERE (c.user1_id = 'user-uuid' OR c.user2_id = 'user-uuid')
ORDER BY c.last_message_at DESC;
```

### Analytics Queries

**Daily active users:**
```sql
SELECT DATE(last_active_at) as date, COUNT(DISTINCT id) as dau
FROM users
WHERE last_active_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(last_active_at)
ORDER BY date DESC;
```

**Match rate:**
```sql
SELECT
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) as total_swipes,
  SUM(CASE WHEN action = 'like' THEN 1 ELSE 0 END) as total_likes,
  COUNT(DISTINCT m.id) as total_matches,
  ROUND(100.0 * COUNT(DISTINCT m.id) / NULLIF(COUNT(*), 0), 2) as match_rate
FROM swipes s
LEFT JOIN matches m ON (s.user_id = m.user1_id OR s.user_id = m.user2_id)
WHERE s.created_at >= NOW() - INTERVAL '7 days';
```

**Revenue metrics:**
```sql
SELECT
  DATE(created_at) as date,
  SUM(amount) as revenue,
  COUNT(*) as transactions,
  AVG(amount) as avg_transaction
FROM transactions
WHERE status = 'succeeded'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Repository Usage Examples

### User Registration
```typescript
import { UserRepository } from './repositories/user.repository';
import { ProfileRepository } from './repositories/profile.repository';

const userRepo = new UserRepository();
const profileRepo = new ProfileRepository();

// Create user
const user = await userRepo.create({
  email: 'user@example.com',
  password_hash: await hash(password),
  phone_number: '+1234567890'
});

// Create profile
const profile = await profileRepo.create({
  user_id: user.id,
  first_name: 'John',
  last_name: 'Doe',
  date_of_birth: new Date('1990-01-01'),
  gender: 'male',
  bio: 'Hello world!'
});
```

### Creating a Match
```typescript
import { SwipeRepository } from './repositories/swipe.repository';
import { MatchRepository } from './repositories/match.repository';

const swipeRepo = new SwipeRepository();
const matchRepo = new MatchRepository();

// User swipes right
await swipeRepo.create({
  user_id: currentUserId,
  target_user_id: profileId,
  action: 'like'
});

// Check for mutual like
const mutualLike = await swipeRepo.checkMutualLike(currentUserId, profileId);

if (mutualLike) {
  // Create match
  const match = await matchRepo.create({
    user1_id: currentUserId,
    user2_id: profileId
  });

  // Conversation is created automatically by trigger
}
```

### Sending a Message
```typescript
import { MessageRepository } from './repositories/message.repository';

const messageRepo = new MessageRepository();

const message = await messageRepo.create({
  conversation_id: conversationId,
  sender_id: userId,
  receiver_id: matchedUserId,
  content: 'Hello!',
  type: 'text'
});

// Triggers automatically update:
// - conversations.last_message
// - conversations.last_message_at
// - conversations.unread_count_user1 or unread_count_user2
```

---

## Database Triggers

### Active Triggers
1. **`trigger_update_conversation_on_message`**
   - On: INSERT into `messages`
   - Action: Updates conversation metadata

2. **`trigger_reset_unread_count`**
   - On: UPDATE of `messages.is_read`
   - Action: Decrements unread count

3. **`trigger_update_coin_balance`**
   - On: INSERT into `coin_transactions`
   - Action: Updates user coin balance

4. **`trigger_sync_user_coin_balance`**
   - On: UPDATE of `coins.balance`
   - Action: Syncs to `users.coin_balance`

5. **`trigger_sync_user_names`**
   - On: UPDATE of `profiles.first_name` or `profiles.last_name`
   - Action: Syncs to `users.first_name` and `users.last_name`

6. **`trigger_activate_boost`**
   - On: UPDATE of `boosts.status` to 'active'
   - Action: Sets start_time and end_time

7. **`update_matches_activity`**
   - On: UPDATE of `matches`
   - Action: Updates last_activity_at

---

## Performance Tips

### Query Optimization
```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
WHERE mean_time > 1000
ORDER BY mean_time DESC
LIMIT 20;
```

### Connection Pool Monitoring
```typescript
import db from './connection';

// Check pool status
const pool = db.client.pool;
console.log({
  total: pool.numUsed() + pool.numFree(),
  used: pool.numUsed(),
  free: pool.numFree(),
  pending: pool.numPendingAcquires()
});
```

### Maintenance Commands
```bash
# Analyze tables (update statistics)
npm run db:update-stats

# Vacuum tables (reclaim space)
npm run db:vacuum

# Rebuild indexes
npm run db:rebuild-indexes
```

---

## Subscription Tiers

| Tier | Price/mo | Daily Swipes | Super Likes | Features |
|------|----------|--------------|-------------|----------|
| Free | $0 | 50 | 1 | Basic matching |
| Basic | $9.99 | Unlimited | 5 | See likes, 1 boost |
| Mid | $19.99 | Unlimited | Unlimited | Advanced filters, 3 boosts |
| Ultra | $34.99 | Unlimited | Unlimited | Incognito, passport, 5 boosts |

---

## Coin Packages

| Package | Coins | Bonus | Price |
|---------|-------|-------|-------|
| Small | 10 | 0 | $4.99 |
| Medium | 25 | 2 | $9.99 |
| Large | 50 | 5 | $17.99 |
| XL | 100 | 15 | $29.99 |
| XXL | 250 | 50 | $59.99 |

---

## Boost Products

| Type | Duration | Cost | Visibility |
|------|----------|------|------------|
| Standard | 30 min | 5 coins | 10x |
| Prime Time | 60 min | 10 coins | 15x |
| Spotlight | 60 min | 15 coins | 20x |

---

## Indexes Reference

### Critical Indexes
- `users.email` - User lookup
- `users.last_active_at` - Activity queries
- `swipes[user_id, target_user_id]` - Duplicate prevention
- `matches[user1_id, user2_id]` - Match lookups
- `messages[conversation_id, sent_at]` - Message history
- `analytics_events[user_id, created_at]` - Event tracking

### Composite Indexes
```sql
CREATE INDEX idx_swipes_like_actions
ON swipes(target_user_id, action)
WHERE action IN ('like', 'super_like');

CREATE INDEX idx_matches_user1_status
ON matches(user1_id, status);

CREATE INDEX idx_matches_user2_status
ON matches(user2_id, status);

CREATE INDEX idx_messages_conversation_sent
ON messages(conversation_id, sent_at DESC);
```

---

## Common Issues & Solutions

### Issue: Connection Pool Exhausted
**Symptom:** "TimeoutError: Knex: Timeout acquiring a connection"
**Solution:**
```typescript
// Increase pool size
pool: {
  min: 5,
  max: 50, // Increase from 30
  acquireTimeoutMillis: 60000
}
```

### Issue: Slow Queries
**Symptom:** Queries taking >1 second
**Solution:**
1. Run `EXPLAIN ANALYZE` on slow query
2. Add missing indexes
3. Use JOINs instead of N+1 queries

### Issue: Duplicate Key Error
**Symptom:** "duplicate key value violates unique constraint"
**Solution:**
```typescript
// Use INSERT ... ON CONFLICT
await db('users')
  .insert({ email: 'test@example.com' })
  .onConflict('email')
  .merge(); // or .ignore()
```

---

## Environment Variables Reference

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flamoral_dev
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_URL=postgresql://user:password@host:5432/database

# Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10

# SSL (Production)
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SSL_CA=/path/to/ca-cert.pem

# Timeouts
DB_CONNECTION_TIMEOUT=30000
DB_QUERY_TIMEOUT=60000
```

---

## Backup & Restore

### Backup
```bash
# Full database backup
pg_dump -h localhost -U postgres -d flamoral_dev -F c -f backup.dump

# Schema only
pg_dump -h localhost -U postgres -d flamoral_dev --schema-only > schema.sql

# Data only
pg_dump -h localhost -U postgres -d flamoral_dev --data-only > data.sql
```

### Restore
```bash
# Restore from dump
pg_restore -h localhost -U postgres -d flamoral_dev backup.dump

# Restore from SQL
psql -h localhost -U postgres -d flamoral_dev < backup.sql
```

---

## Troubleshooting Commands

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('flamoral_dev'));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check active connections
SELECT COUNT(*) as connections, state
FROM pg_stat_activity
WHERE datname = 'flamoral_dev'
GROUP BY state;

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'flamoral_dev'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';

-- Check replication lag (if replica configured)
SELECT NOW() - pg_last_xact_replay_timestamp() AS replication_lag;
```

---

## Migration Commands

```bash
# Run all pending migrations
npm run migrate:latest

# Rollback last batch
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback:all

# Check migration status
npm run migrate:status

# Create new migration
npm run migrate:make migration_name

# Run specific migration up
npm run migrate:up

# Run specific migration down
npm run migrate:down
```

---

## Useful Links

- [Full Schema Documentation](./database/SCHEMA.md)
- [Migration Summary](./database/MIGRATION_SUMMARY.md)
- [Database Audit Report](./DATABASE_AUDIT_REPORT.md)
- [Table Inventory](./database/TABLE_INVENTORY.md)

---

**Last Updated:** 2025-12-16
**Version:** 1.0.0
