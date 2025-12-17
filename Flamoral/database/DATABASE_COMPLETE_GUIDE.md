# Flamoral Dating Platform - Complete Database Guide

**Version:** 1.0.0
**Last Updated:** 2025-12-11
**Database:** PostgreSQL 13+

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Complete Schema Reference](#complete-schema-reference)
4. [Service-Specific Tables](#service-specific-tables)
5. [Data Relationships](#data-relationships)
6. [Query Examples](#query-examples)
7. [Performance Optimization](#performance-optimization)
8. [Backup & Recovery](#backup--recovery)
9. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Overview

The Flamoral Dating Platform uses a centralized PostgreSQL database with microservices architecture. The database contains **50+ tables** organized into logical domains.

### Database Statistics

- **Total Tables:** ~52
- **Total Indexes:** ~150+
- **Database Size:** Varies (typically 1GB - 100GB in production)
- **Expected QPS:** 1,000 - 10,000 queries per second
- **Data Retention:** Varies by table (7 days - indefinite)

### Key Technologies

- **Database:** PostgreSQL 13+
- **ORM:** Knex.js
- **Migration Tool:** Knex Migrations
- **Connection Pooling:** pg-pool
- **Replication:** Primary-Replica setup (recommended for production)

---

## Architecture

### Database Domains

```
┌─────────────────────────────────────────────────────────────┐
│                    Flamoral Database                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Users &   │  │  Matching   │  │  Messaging  │         │
│  │   Profiles  │  │   System    │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Payment   │  │  Analytics  │  │   Safety    │         │
│  │  & Billing  │  │             │  │ & Moderation│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Media    │  │Notification │  │   Privacy   │         │
│  │             │  │             │  │  & Security │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Complete Schema Reference

### 1. Users & Authentication Domain

#### users
Core user account table.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),

  -- Account status
  status VARCHAR(20) DEFAULT 'active',
    -- Values: active, inactive, suspended, banned, deleted
  subscription_tier VARCHAR(20) DEFAULT 'free',
    -- Values: free, basic, mid, ultra

  -- Verification flags
  is_email_verified BOOLEAN DEFAULT FALSE,
  is_phone_verified BOOLEAN DEFAULT FALSE,
  is_photo_verified BOOLEAN DEFAULT FALSE,

  -- Activity tracking
  last_login_at TIMESTAMP,
  last_active_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX idx_users_last_active ON users(last_active_at);
```

**Row Count (Production):** 100K - 10M users

---

#### profiles
User profile information.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

  -- Basic information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) NOT NULL,
    -- Values: male, female, non-binary, other, prefer_not_to_say

  -- Profile content
  bio TEXT,
  occupation VARCHAR(100),
  education VARCHAR(100),
  company VARCHAR(100),
  school VARCHAR(100),
  height INTEGER, -- in cm

  -- Location (for matching)
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Additional attributes
  interests JSONB DEFAULT '[]',
  languages JSONB DEFAULT '[]',
  relationship_type VARCHAR(50),
    -- Values: long_term, short_term, friendship, casual, open_to_anything

  -- Profile completeness
  profile_completion_percentage INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_location ON profiles(latitude, longitude);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_date_of_birth ON profiles(date_of_birth);
```

**Usage Example:**
```sql
-- Find users within 50km of location
SELECT p.*, u.email
FROM profiles p
JOIN users u ON p.user_id = u.id
WHERE earth_distance(
  ll_to_earth(p.latitude, p.longitude),
  ll_to_earth(40.7128, -74.0060)
) <= 50000 -- 50km in meters
AND u.status = 'active';
```

---

#### photos
User photos with moderation status.

```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Photo URLs
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),

  -- Display order
  position INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  storage_key VARCHAR(500),
  verification_data JSONB,
  verified_at TIMESTAMP,

  -- Moderation
  moderation_status VARCHAR(20) DEFAULT 'pending',
    -- Values: pending, approved, rejected, flagged
  moderation_data JSONB,
  moderated_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_user_position ON photos(user_id, position);
CREATE INDEX idx_photos_primary ON photos(user_id, is_primary);
CREATE INDEX idx_photos_moderation ON photos(moderation_status);
```

---

### 2. Matching System Domain

#### swipes
User swipe actions (like/pass/super like).

```sql
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  action VARCHAR(20) NOT NULL,
    -- Values: like, pass, super_like
  is_super_like BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, target_user_id)
);

-- Indexes
CREATE INDEX idx_swipes_user_id ON swipes(user_id);
CREATE INDEX idx_swipes_target_user_id ON swipes(target_user_id);
CREATE INDEX idx_swipes_action ON swipes(target_user_id, action);

-- Partial index for likes only (performance optimization)
CREATE INDEX idx_swipes_likes ON swipes(target_user_id, action)
WHERE action IN ('like', 'super_like');
```

**Usage Example:**
```sql
-- Find mutual likes (matches)
SELECT
  s1.user_id AS user1_id,
  s1.target_user_id AS user2_id
FROM swipes s1
JOIN swipes s2 ON s1.user_id = s2.target_user_id
  AND s1.target_user_id = s2.user_id
WHERE s1.action IN ('like', 'super_like')
  AND s2.action IN ('like', 'super_like')
  AND NOT EXISTS (
    SELECT 1 FROM matches
    WHERE (user1_id = s1.user_id AND user2_id = s1.target_user_id)
       OR (user1_id = s1.target_user_id AND user2_id = s1.user_id)
  );
```

---

#### matches
Matched users with compatibility scores.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  status VARCHAR(20) DEFAULT 'active',
    -- Values: active, unmatched, expired

  compatibility_score DECIMAL(5, 2),

  -- Activity tracking
  matched_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW(),
  unmatched_at TIMESTAMP,
  unmatched_by UUID REFERENCES users(id),

  -- Constraints
  UNIQUE(user1_id, user2_id),
  CHECK(user1_id < user2_id) -- Ensures consistent ordering
);

-- Indexes
CREATE INDEX idx_matches_user1 ON matches(user1_id, status);
CREATE INDEX idx_matches_user2 ON matches(user2_id, status);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_activity ON matches(last_activity_at);

-- Trigger to update last_activity_at
CREATE OR REPLACE FUNCTION update_match_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_match_activity
BEFORE UPDATE ON matches
FOR EACH ROW
EXECUTE FUNCTION update_match_activity();
```

---

#### user_preferences
Matching preferences per user.

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Age range
  age_min INTEGER DEFAULT 18,
  age_max INTEGER DEFAULT 99,

  -- Distance (in kilometers)
  max_distance INTEGER DEFAULT 50,

  -- Gender preferences
  gender_preference JSONB DEFAULT '["male", "female"]',

  -- Relationship preferences
  relationship_type_preference JSONB,

  -- Other preferences
  interests JSONB DEFAULT '[]',
  dealbreakers JSONB DEFAULT '[]',

  -- Discovery settings
  show_me_on_discover BOOLEAN DEFAULT TRUE,
  premium_only BOOLEAN DEFAULT FALSE,
  verified_only BOOLEAN DEFAULT FALSE,

  -- Additional filters (Premium features)
  min_height INTEGER,
  max_height INTEGER,
  education_preference JSONB,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. Messaging Domain

#### conversations
Chat conversations between matched users.

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id UUID UNIQUE REFERENCES matches(id) ON DELETE CASCADE,

  -- Last message preview
  last_message TEXT,
  last_message_at TIMESTAMP,
  last_message_sender_id UUID REFERENCES users(id),

  -- Unread counts
  unread_count_user1 INTEGER DEFAULT 0,
  unread_count_user2 INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user1_id, user2_id),
  CHECK(user1_id < user2_id)
);

-- Indexes
CREATE INDEX idx_conversations_user1 ON conversations(user1_id);
CREATE INDEX idx_conversations_user2 ON conversations(user2_id);
CREATE INDEX idx_conversations_match ON conversations(match_id);
CREATE INDEX idx_conversations_activity ON conversations(last_message_at);
```

---

#### messages
Individual messages in conversations.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Message content
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text',
    -- Values: text, image, gif, emoji, voice
  media_url VARCHAR(500),

  -- Read status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,

  -- Delivery status
  status VARCHAR(20) DEFAULT 'sent',
    -- Values: sent, delivered, read

  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id, sent_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_unread ON messages(receiver_id, is_read);

-- Trigger to update conversation metadata
CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message = NEW.content,
    last_message_at = NEW.sent_at,
    last_message_sender_id = NEW.sender_id,
    unread_count_user1 = CASE
      WHEN user1_id = NEW.receiver_id THEN unread_count_user1 + 1
      ELSE unread_count_user1
    END,
    unread_count_user2 = CASE
      WHEN user2_id = NEW.receiver_id THEN unread_count_user2 + 1
      ELSE unread_count_user2
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_on_message();
```

---

### 4. Payment & Monetization Domain

#### subscription_plans
Available subscription tiers.

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  tier VARCHAR(20) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly DECIMAL(10, 2),
  price_yearly DECIMAL(10, 2),
  price_3_months DECIMAL(10, 2),
  price_6_months DECIMAL(10, 2),

  -- Stripe integration
  stripe_price_id_monthly VARCHAR(255),
  stripe_price_id_yearly VARCHAR(255),
  stripe_product_id VARCHAR(255),

  -- Features
  features JSONB NOT NULL DEFAULT '{}',

  -- Limits
  daily_swipes INTEGER DEFAULT -1, -- -1 = unlimited
  daily_super_likes INTEGER DEFAULT 1,
  monthly_boosts INTEGER DEFAULT 0,

  -- Feature flags
  unlimited_likes BOOLEAN DEFAULT FALSE,
  see_who_likes_you BOOLEAN DEFAULT FALSE,
  rewind_enabled BOOLEAN DEFAULT FALSE,
  unlimited_super_likes BOOLEAN DEFAULT FALSE,
  profile_boost BOOLEAN DEFAULT FALSE,
  advanced_filters BOOLEAN DEFAULT FALSE,
  incognito_mode BOOLEAN DEFAULT FALSE,
  passport_mode BOOLEAN DEFAULT FALSE,
  no_ads BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  read_receipts BOOLEAN DEFAULT FALSE,
  see_who_viewed BOOLEAN DEFAULT FALSE,

  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Default Plans:**
```sql
INSERT INTO subscription_plans (name, tier, display_name, price_monthly, daily_swipes, daily_super_likes) VALUES
('free', 'free', 'Free', 0.00, 50, 1),
('basic', 'basic', 'Flamoral Basic', 9.99, -1, 5),
('mid', 'mid', 'Flamoral Mid', 19.99, -1, -1),
('ultra', 'ultra', 'Flamoral Ultra', 34.99, -1, -1);
```

---

#### coins
User coin balances.

```sql
CREATE TABLE coins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  balance INTEGER DEFAULT 0,
  total_earned INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0,
  total_purchased INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CHECK(balance >= 0)
);

-- Indexes
CREATE INDEX idx_coins_user_id ON coins(user_id);
```

---

#### coin_transactions
Coin transaction history.

```sql
CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
    -- Values: purchase, spent, earned, refund, bonus, gift, admin_adjustment
  amount INTEGER NOT NULL, -- Positive = credit, Negative = debit
  balance_after INTEGER NOT NULL,

  description TEXT,
  reference_type VARCHAR(100),
  reference_id UUID,

  transaction_id UUID REFERENCES transactions(id),
  package_id UUID REFERENCES coin_packages(id),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id, created_at);
CREATE INDEX idx_coin_transactions_type ON coin_transactions(type);

-- Trigger to update coin balance
CREATE OR REPLACE FUNCTION update_coin_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE coins
  SET
    balance = NEW.balance_after,
    total_earned = total_earned + CASE WHEN NEW.amount > 0 THEN NEW.amount ELSE 0 END,
    total_spent = total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
    total_purchased = total_purchased + CASE WHEN NEW.type = 'purchase' THEN NEW.amount ELSE 0 END,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_coin_balance
AFTER INSERT ON coin_transactions
FOR EACH ROW
EXECUTE FUNCTION update_coin_balance();
```

---

### 5. Analytics Domain

#### analytics_events
Event tracking with UTM parameters.

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),

  -- Event details
  event_type VARCHAR(100) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(100),
  properties JSONB,

  -- Page info
  page_url TEXT,
  referrer_url TEXT,

  -- UTM parameters (for attribution)
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_content VARCHAR(255),
  utm_term VARCHAR(255),

  -- Click IDs (platform-specific)
  click_ids JSONB,

  -- Device info
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),

  -- Location
  country VARCHAR(2),
  region VARCHAR(100),
  city VARCHAR(100),

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes (Partitioned by date recommended for large scale)
CREATE INDEX idx_analytics_user ON analytics_events(user_id, created_at);
CREATE INDEX idx_analytics_session ON analytics_events(session_id);
CREATE INDEX idx_analytics_event ON analytics_events(event_type, event_name);
CREATE INDEX idx_analytics_utm ON analytics_events(utm_source, utm_campaign);
CREATE INDEX idx_analytics_date ON analytics_events(created_at);
```

---

### 6. Safety & Moderation Domain

#### reports
User reports for safety issues.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  category VARCHAR(50) NOT NULL,
    -- Values: inappropriate_photos, inappropriate_messages, fake_profile,
    --         spam, harassment, underage, scam, violence, hate_speech,
    --         impersonation, other

  description TEXT,
  evidence JSONB, -- Screenshots, message IDs, etc.

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',
    -- Values: pending, investigating, resolved, dismissed, action_taken
  severity VARCHAR(20) DEFAULT 'medium',
    -- Values: low, medium, high, critical

  -- Resolution
  resolution_notes TEXT,
  action_taken VARCHAR(50),
    -- Values: none, warning_sent, content_removed, photo_removed,
    --         account_restricted, account_suspended, account_banned

  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_reports_reported ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_severity ON reports(severity);
```

---

#### user_blocks
Blocked users list.

```sql
CREATE TABLE user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  reason VARCHAR(100),
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, blocked_user_id),
  CHECK(user_id != blocked_user_id)
);

-- Indexes
CREATE INDEX idx_blocks_user ON user_blocks(user_id);
CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_user_id);
```

---

### 7. Notification Domain

#### notifications
Notification history.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES notification_templates(id),

  type VARCHAR(20) NOT NULL,
    -- Values: push, email, sms, in_app
  category VARCHAR(50),
    -- Values: match, message, like, super_like, profile_view,
    --         boost, system, marketing, security

  title VARCHAR(255),
  body TEXT,
  data JSONB,

  -- Actions
  action_url VARCHAR(500),
  deep_link VARCHAR(500),
  image_url VARCHAR(500),

  -- Status
  status VARCHAR(20) DEFAULT 'pending',
    -- Values: pending, queued, sent, delivered, failed, read, clicked
  priority VARCHAR(20) DEFAULT 'normal',
    -- Values: low, normal, high, urgent

  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timing
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  clicked_at TIMESTAMP,
  expires_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at);
CREATE INDEX idx_notifications_priority ON notifications(priority, status);
```

---

## Service-Specific Tables

### User Service (20+ tables)
- users, profiles, photos, prompts, user_prompts
- verification_tokens, refresh_tokens
- preferences, privacy_settings
- coins, coin_transactions, coin_packages
- boosts, boost_products
- subscriptions, subscription_plans, subscription_features

### Matching Service (5+ tables)
- swipes, matches, user_preferences
- boost_history, match_analytics

### Messaging Service (2 tables)
- conversations, messages

### Media Service (3+ tables)
- media, videos, voice_notes

### Payment Service (5+ tables)
- transactions, payment_methods, invoices, refunds

### Moderation Service (4+ tables)
- reports, moderation_logs, user_violations, user_safety_records

### Notification Service (4+ tables)
- notifications, notification_templates, user_devices, notification_preferences

### Analytics Service (6+ tables)
- analytics_events, user_attribution, conversion_funnel
- ad_campaign_performance, user_sessions, pixel_events

---

## Query Examples

### Find Potential Matches

```sql
WITH user_prefs AS (
  SELECT * FROM user_preferences WHERE user_id = :current_user_id
)
SELECT
  p.user_id,
  p.first_name,
  EXTRACT(YEAR FROM AGE(p.date_of_birth)) AS age,
  p.bio,
  p.city,
  ph.url AS photo_url,
  earth_distance(
    ll_to_earth(p.latitude, p.longitude),
    ll_to_earth(:user_lat, :user_lon)
  ) / 1000 AS distance_km
FROM profiles p
JOIN users u ON p.user_id = u.id
LEFT JOIN photos ph ON ph.user_id = p.user_id AND ph.is_primary = TRUE
CROSS JOIN user_prefs up
WHERE u.status = 'active'
  AND u.id != :current_user_id
  -- Age filter
  AND EXTRACT(YEAR FROM AGE(p.date_of_birth)) BETWEEN up.age_min AND up.age_max
  -- Distance filter
  AND earth_distance(
    ll_to_earth(p.latitude, p.longitude),
    ll_to_earth(:user_lat, :user_lon)
  ) <= (up.max_distance * 1000)
  -- Gender filter
  AND p.gender = ANY(up.gender_preference::text[])
  -- Not already swiped
  AND NOT EXISTS (
    SELECT 1 FROM swipes
    WHERE user_id = :current_user_id
    AND target_user_id = p.user_id
  )
  -- Not blocked
  AND NOT EXISTS (
    SELECT 1 FROM user_blocks
    WHERE (user_id = :current_user_id AND blocked_user_id = p.user_id)
       OR (user_id = p.user_id AND blocked_user_id = :current_user_id)
  )
ORDER BY RANDOM()
LIMIT 50;
```

### Get User's Matches with Last Message

```sql
SELECT
  m.id AS match_id,
  CASE
    WHEN m.user1_id = :user_id THEN m.user2_id
    ELSE m.user1_id
  END AS matched_user_id,
  p.first_name,
  p.date_of_birth,
  ph.url AS photo_url,
  c.last_message,
  c.last_message_at,
  CASE
    WHEN m.user1_id = :user_id THEN c.unread_count_user1
    ELSE c.unread_count_user2
  END AS unread_count,
  m.matched_at
FROM matches m
JOIN profiles p ON p.user_id = CASE
  WHEN m.user1_id = :user_id THEN m.user2_id
  ELSE m.user1_id
END
LEFT JOIN photos ph ON ph.user_id = p.user_id AND ph.is_primary = TRUE
LEFT JOIN conversations c ON c.match_id = m.id
WHERE (m.user1_id = :user_id OR m.user2_id = :user_id)
  AND m.status = 'active'
ORDER BY COALESCE(c.last_message_at, m.matched_at) DESC;
```

### Analytics: User Retention Cohort

```sql
WITH user_cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', created_at) AS cohort_week,
    created_at
  FROM users
),
user_activity AS (
  SELECT
    user_id,
    DATE_TRUNC('week', last_active_at) AS activity_week
  FROM users
  WHERE last_active_at IS NOT NULL
)
SELECT
  uc.cohort_week,
  COUNT(DISTINCT uc.user_id) AS cohort_size,
  COUNT(DISTINCT CASE
    WHEN ua.activity_week = uc.cohort_week THEN ua.user_id
  END) AS week_0,
  COUNT(DISTINCT CASE
    WHEN ua.activity_week = uc.cohort_week + INTERVAL '1 week' THEN ua.user_id
  END) AS week_1,
  COUNT(DISTINCT CASE
    WHEN ua.activity_week = uc.cohort_week + INTERVAL '2 weeks' THEN ua.user_id
  END) AS week_2
FROM user_cohorts uc
LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
GROUP BY uc.cohort_week
ORDER BY uc.cohort_week DESC;
```

---

## Performance Optimization

### Index Strategies

1. **Primary Keys:** All tables use UUID primary keys with default index
2. **Foreign Keys:** All FK columns are indexed
3. **Composite Indexes:** For common query patterns
4. **Partial Indexes:** For filtered queries
5. **JSONB Indexes:** GIN indexes for JSONB columns

### Query Optimization Tips

```sql
-- Use EXPLAIN ANALYZE
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';

-- Optimize location queries
CREATE INDEX idx_profiles_location ON profiles USING GIST (ll_to_earth(latitude, longitude));

-- Optimize JSONB queries
CREATE INDEX idx_profiles_interests ON profiles USING GIN (interests);

-- Partitioning for large tables
CREATE TABLE analytics_events_2025_01 PARTITION OF analytics_events
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

---

## Backup & Recovery

### Automated Backups

```bash
# Daily full backup
0 2 * * * /path/to/database/scripts/backup.sh --full

# Hourly incremental (WAL archiving)
0 * * * * /path/to/backup-wal.sh
```

### Point-in-Time Recovery

```bash
# Restore to specific time
pg_restore --dbname=flamoral_restored \
  --clean --create \
  --if-exists \
  --jobs=4 \
  backup.dump

# Apply WAL files to specific timestamp
recovery_target_time = '2025-12-11 14:30:00'
```

---

## Monitoring & Maintenance

### Weekly Maintenance Tasks

```sql
-- Analyze tables
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;

-- Reindex if needed
REINDEX TABLE messages;

-- Check bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### Monitoring Queries

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'flamoral_dev';

-- Long running queries
SELECT
  pid,
  now() - query_start AS duration,
  query
FROM pg_stat_activity
WHERE state = 'active' AND query_start < now() - interval '5 minutes';

-- Table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC
LIMIT 10;
```

---

## Appendix

### Data Types Reference

- **UUID:** User IDs, primary keys
- **VARCHAR:** Strings with max length
- **TEXT:** Unlimited text
- **INTEGER:** Whole numbers
- **DECIMAL:** Monetary values
- **BOOLEAN:** True/false flags
- **TIMESTAMP:** Date and time
- **JSONB:** Flexible JSON data
- **ENUM:** Fixed set of values

### Naming Conventions

- **Tables:** Plural lowercase (users, profiles)
- **Columns:** Snake case (first_name, created_at)
- **Indexes:** idx_{table}_{columns} (idx_users_email)
- **Foreign Keys:** fk_{table}_{reference} (fk_profiles_user)
- **Constraints:** check_{table}_{constraint} (check_users_age)

---

**End of Complete Database Guide**

For questions or support, contact the database team.
