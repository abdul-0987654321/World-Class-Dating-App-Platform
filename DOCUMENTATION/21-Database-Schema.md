# ConnectSphere - Database Schema

**Version**: 2.0.0
**Database**: PostgreSQL 15 (Primary), MongoDB 7 (Messages), Redis 7 (Cache)

---

## PostgreSQL Schema

### users
Primary user account table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'deleted')),

  -- Verification
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  photo_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,

  -- Authentication
  last_login_at TIMESTAMP,
  last_active_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,

  -- Subscription
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'premium_plus')),
  subscription_expires_at TIMESTAMP,
  stripe_customer_id VARCHAR(255),

  -- Tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_subscription ON users(subscription_tier);
```

### profiles
User profile information

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  first_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(50),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non_binary', 'other')),
  bio TEXT,

  -- Appearance
  height_cm INTEGER,
  body_type VARCHAR(20),
  ethnicity VARCHAR(50),

  -- Lifestyle
  smoking VARCHAR(20) CHECK (smoking IN ('never', 'socially', 'regularly')),
  drinking VARCHAR(20) CHECK (drinking IN ('never', 'socially', 'regularly')),
  exercise VARCHAR(20) CHECK (exercise IN ('never', 'sometimes', 'regularly', 'very_active')),
  diet VARCHAR(20),

  -- Background
  education VARCHAR(50),
  occupation VARCHAR(100),
  company VARCHAR(100),
  school VARCHAR(100),
  religion VARCHAR(50),
  political_views VARCHAR(50),

  -- Location
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  location_point GEOGRAPHY(POINT),
  show_distance BOOLEAN DEFAULT TRUE,

  -- Preferences
  looking_for VARCHAR(20) CHECK (looking_for IN ('relationship', 'casual', 'friends', 'unsure')),
  show_age BOOLEAN DEFAULT TRUE,
  show_gender BOOLEAN DEFAULT TRUE,

  -- Stats
  profile_completion INTEGER DEFAULT 0,
  photo_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_location ON profiles USING GIST(location_point);
CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_age ON profiles(date_of_birth);
```

### photos
Profile photos

```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  position INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,

  -- Moderation
  moderation_status VARCHAR(20) DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  moderation_flags JSONB,
  moderated_at TIMESTAMP,
  moderated_by UUID REFERENCES users(id),

  -- Metadata
  width INTEGER,
  height INTEGER,
  file_size INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_moderation ON photos(moderation_status);
```

### interests
Interest tags

```sql
CREATE TABLE interests (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(50),
  icon VARCHAR(50),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_interests (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  interest_id INTEGER REFERENCES interests(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, interest_id)
);

CREATE INDEX idx_user_interests_user ON user_interests(user_id);
```

### preferences
User matching preferences

```sql
CREATE TABLE preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- Basic Preferences
  interested_in_genders TEXT[], -- Array of genders
  min_age INTEGER DEFAULT 18,
  max_age INTEGER DEFAULT 99,
  max_distance_km INTEGER DEFAULT 50,

  -- Advanced Filters (Premium)
  min_height_cm INTEGER,
  max_height_cm INTEGER,
  education_levels TEXT[],
  religions TEXT[],
  ethnicities TEXT[],
  body_types TEXT[],
  smoking_preferences TEXT[],
  drinking_preferences TEXT[],
  exercise_preferences TEXT[],

  -- Discovery Settings
  show_me_on_discover BOOLEAN DEFAULT TRUE,
  discovery_paused BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preferences_user_id ON preferences(user_id);
```

### swipes
User swipe actions

```sql
CREATE TABLE swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  action VARCHAR(20) NOT NULL CHECK (action IN ('like', 'pass', 'super_like')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_swipes_unique ON swipes(user_id, target_user_id);
CREATE INDEX idx_swipes_user_id ON swipes(user_id);
CREATE INDEX idx_swipes_target_user_id ON swipes(target_user_id);
CREATE INDEX idx_swipes_created_at ON swipes(created_at);
```

### matches
Mutual matches between users

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Match info
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Conversation
  last_message_at TIMESTAMP,
  last_message_by UUID REFERENCES users(id),
  message_count INTEGER DEFAULT 0,

  -- Status
  user1_unmatched BOOLEAN DEFAULT FALSE,
  user2_unmatched BOOLEAN DEFAULT FALSE,
  user1_blocked BOOLEAN DEFAULT FALSE,
  user2_blocked BOOLEAN DEFAULT FALSE,

  CONSTRAINT check_different_users CHECK (user1_id < user2_id)
);

CREATE UNIQUE INDEX idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX idx_matches_user1 ON matches(user1_id);
CREATE INDEX idx_matches_user2 ON matches(user2_id);
CREATE INDEX idx_matches_last_message ON matches(last_message_at);
```

### daily_limits
Track daily action limits for free users

```sql
CREATE TABLE daily_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  likes_count INTEGER DEFAULT 0,
  super_likes_count INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_limits_user_date ON daily_limits(user_id, date);
```

### boosts
Profile visibility boosts

```sql
CREATE TABLE boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  boost_type VARCHAR(20) CHECK (boost_type IN ('profile_boost', 'spotlight')),
  started_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP NOT NULL,

  -- Stats
  views_during_boost INTEGER DEFAULT 0,
  likes_during_boost INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_boosts_user_id ON boosts(user_id);
CREATE INDEX idx_boosts_active ON boosts(started_at, expires_at);
```

### transactions
Payment transactions

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  transaction_type VARCHAR(50) CHECK (transaction_type IN ('subscription', 'boost', 'super_likes', 'coins')),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Stripe
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'succeeded', 'failed', 'refunded')),

  -- Details
  description TEXT,
  metadata JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(payment_status);
CREATE INDEX idx_transactions_created ON transactions(created_at);
```

### coins
Virtual currency balance

```sql
CREATE TABLE coin_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE coin_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  amount INTEGER NOT NULL, -- Positive for credit, negative for debit
  transaction_type VARCHAR(50) CHECK (transaction_type IN ('purchase', 'reward', 'super_like', 'boost', 'refund')),
  description TEXT,

  balance_after INTEGER,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_coin_transactions_user ON coin_transactions(user_id);
```

### reports
User reports and flagging

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'inappropriate_photos', 'harassment', 'fake_profile',
    'spam', 'underage', 'scam', 'other'
  )),
  details TEXT,

  -- Moderation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  action_taken TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created ON reports(created_at);
```

### blocks
Blocked users

```sql
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  blocked_user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  reason VARCHAR(50),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(blocker_user_id, blocked_user_id)
);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_user_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_user_id);
```

### notifications
Push notification history

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL CHECK (type IN (
    'new_match', 'new_message', 'like_received',
    'super_like_received', 'boost_complete', 'profile_view'
  )),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  data JSONB,

  -- Status
  read BOOLEAN DEFAULT FALSE,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

### device_tokens
Push notification device tokens

```sql
CREATE TABLE device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  token VARCHAR(500) UNIQUE NOT NULL,
  platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
  device_info JSONB,

  active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_tokens_user ON device_tokens(user_id);
CREATE INDEX idx_device_tokens_active ON device_tokens(active);
```

### sessions
User sessions

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  refresh_token VARCHAR(500) UNIQUE NOT NULL,
  access_token_jti VARCHAR(255),

  device_info JSONB,
  ip_address INET,
  user_agent TEXT,

  expires_at TIMESTAMP NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(refresh_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### analytics_events
Analytics tracking

```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  event_name VARCHAR(100) NOT NULL,
  event_properties JSONB,

  -- Context
  session_id UUID,
  device_info JSONB,
  ip_address INET,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_event ON analytics_events(event_name);
CREATE INDEX idx_analytics_created ON analytics_events(created_at);
```

---

## MongoDB Schema

### messages
Chat messages (MongoDB for better scalability)

```javascript
{
  _id: ObjectId,
  match_id: UUID, // Reference to PostgreSQL matches table
  sender_id: UUID,
  receiver_id: UUID,

  // Content
  type: String, // 'text', 'photo', 'voice', 'gif'
  content: String,
  media_url: String,

  // Status
  read: Boolean,
  read_at: Date,
  delivered: Boolean,
  delivered_at: Date,

  // Metadata
  reply_to_message_id: ObjectId,
  reactions: [{
    user_id: UUID,
    emoji: String,
    created_at: Date
  }],

  // Timestamps
  created_at: Date,
  deleted_at: Date
}

// Indexes
db.messages.createIndex({ match_id: 1, created_at: -1 })
db.messages.createIndex({ sender_id: 1 })
db.messages.createIndex({ receiver_id: 1 })
db.messages.createIndex({ read: 1 })
```

### conversations
Conversation metadata

```javascript
{
  _id: ObjectId,
  match_id: UUID,
  user1_id: UUID,
  user2_id: UUID,

  // Last message
  last_message: {
    content: String,
    sender_id: UUID,
    created_at: Date,
    read: Boolean
  },

  // Unread counts
  user1_unread_count: Number,
  user2_unread_count: Number,

  // Typing indicators
  user1_typing: Boolean,
  user2_typing: Boolean,

  updated_at: Date
}

db.conversations.createIndex({ match_id: 1 })
db.conversations.createIndex({ user1_id: 1 })
db.conversations.createIndex({ user2_id: 1 })
db.conversations.createIndex({ updated_at: -1 })
```

### audit_logs
System audit logs

```javascript
{
  _id: ObjectId,
  user_id: UUID,
  admin_id: UUID,

  action: String, // 'user_banned', 'photo_rejected', etc.
  entity_type: String,
  entity_id: String,

  changes: {
    before: Object,
    after: Object
  },

  reason: String,
  ip_address: String,

  created_at: Date
}

db.audit_logs.createIndex({ user_id: 1 })
db.audit_logs.createIndex({ admin_id: 1 })
db.audit_logs.createIndex({ action: 1 })
db.audit_logs.createIndex({ created_at: -1 })
```

---

## Redis Data Structures

### Session Cache
```
Key: session:{user_id}
Type: Hash
TTL: 7 days
Fields: {
  user_id,
  email,
  role,
  subscription_tier,
  last_active
}
```

### Online Users
```
Key: online_users
Type: Sorted Set
Score: timestamp
Member: user_id
```

### Rate Limiting
```
Key: rate_limit:{user_id}:{action}
Type: String (counter)
TTL: varies by action
```

### Discovery Queue
```
Key: discovery:{user_id}
Type: List
Members: [user_ids in order]
TTL: 1 hour
```

### Match Notifications
```
Key: notifications:{user_id}
Type: List
Members: [notification objects]
```

---

## Elasticsearch Indices

### users_index
User search and discovery

```json
{
  "mappings": {
    "properties": {
      "user_id": { "type": "keyword" },
      "display_name": { "type": "text" },
      "age": { "type": "integer" },
      "gender": { "type": "keyword" },
      "location": { "type": "geo_point" },
      "bio": { "type": "text" },
      "interests": { "type": "keyword" },
      "education": { "type": "keyword" },
      "occupation": { "type": "text" },
      "last_active": { "type": "date" }
    }
  }
}
```

### analytics_index
Analytics and reporting

```json
{
  "mappings": {
    "properties": {
      "user_id": { "type": "keyword" },
      "event_name": { "type": "keyword" },
      "event_properties": { "type": "object", "enabled": false },
      "timestamp": { "type": "date" },
      "session_id": { "type": "keyword" }
    }
  }
}
```

---

## Database Sizing Estimates

### Year 1 (100,000 users)
- PostgreSQL: ~50 GB
- MongoDB: ~100 GB (messages)
- Redis: ~10 GB (cache)
- Elasticsearch: ~20 GB
- Azure Blob: ~500 GB (photos/media)

### Year 3 (1,000,000 users)
- PostgreSQL: ~500 GB
- MongoDB: ~2 TB
- Redis: ~50 GB
- Elasticsearch: ~200 GB
- Azure Blob: ~10 TB

---

## Backup Strategy

### PostgreSQL
- Daily full backups
- Hourly incremental backups
- Point-in-time recovery enabled
- 30-day retention
- Off-site replication

### MongoDB
- Continuous backup (MongoDB Atlas)
- Point-in-time recovery
- 30-day retention

### Redis
- Daily RDB snapshots
- AOF (Append Only File) enabled
- Replica sets for HA

---

**Document Status**: Complete
**Schema Version**: 2.0.0
