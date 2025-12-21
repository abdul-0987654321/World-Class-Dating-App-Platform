# Data Model

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    profiles     │       │ profile_photos  │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ user_id (PK)    │──────<│ user_id (PK,FK) │──────<│ photo_id (PK)   │
│ email           │       │ display_name    │       │ user_id (FK)    │
│ password_hash   │       │ bio             │       │ media_id (FK)   │
│ role            │       │ gender          │       │ status          │
│ dob             │       │ interests       │       │ position        │
│ country         │       │ location        │       │ created_at      │
│ created_at      │       │ created_at      │       └────────┬────────┘
│ updated_at      │       │ updated_at      │                │
│ deleted_at      │       └────────┬────────┘                │
└────────┬────────┘                │                         │
         │                         │                         │
         │       ┌─────────────────┴──────────────┐         │
         │       │       user_preferences         │         │
         │       ├────────────────────────────────┤         │
         │       │ user_id (PK,FK)                │         │
         │       │ age_min, age_max               │         │
         │       │ distance_km                    │         │
         │       │ genders                        │         │
         │       │ dealbreakers                   │         │
         │       │ updated_at                     │         │
         │       └────────────────────────────────┘         │
         │                                                   │
         │       ┌─────────────────────────────────────────┐│
         │       │              likes/passes               ││
         │       ├─────────────────────────────────────────┤│
         ├──────<│ event_id (PK)                           ││
         │       │ actor_user_id (FK) ─────────────────────┼┘
         ├──────<│ target_user_id (FK)                     │
         │       │ created_at                              │
         │       │ correlation_id                          │
         │       └─────────────────────────────────────────┘
         │
         │       ┌─────────────────┐       ┌─────────────────┐
         │       │    matches      │       │  conversations  │
         │       ├─────────────────┤       ├─────────────────┤
         ├──────<│ match_id (PK)   │──────<│ conversation_id │
         ├──────<│ user_a_id (FK)  │       │ match_id (FK)   │
         │       │ user_b_id (FK)  │       │ created_at      │
         │       │ created_at      │       │ last_message_at │
         │       │ ended_at        │       └────────┬────────┘
         │       │ end_reason      │                │
         │       └─────────────────┘                │
         │                                          │
         │       ┌──────────────────────────────────┴──────┐
         │       │                messages                  │
         │       ├─────────────────────────────────────────┤
         ├──────<│ message_id (PK)                         │
         │       │ conversation_id (FK)                    │
         │       │ sender_id (FK)                          │
         │       │ type                                    │
         │       │ content                                 │
         │       │ media_id (FK) ──────────────────────────┼───┐
         │       │ created_at                              │   │
         │       │ correlation_id                          │   │
         │       └─────────────────────────────────────────┘   │
         │                                                     │
         │       ┌─────────────────────────────────────────┐   │
         │       │            media_files                   │<──┘
         │       ├─────────────────────────────────────────┤
         ├──────<│ media_id (PK)                           │
         │       │ owner_user_id (FK)                      │
         │       │ purpose                                 │
         │       │ url                                     │
         │       │ status                                  │
         │       │ mime                                    │
         │       │ size_bytes                              │
         │       │ created_at                              │
         │       └─────────────────────────────────────────┘
         │
         │       ┌─────────────────┐       ┌─────────────────┐
         │       │  call_sessions  │       │   call_events   │
         │       ├─────────────────┤       ├─────────────────┤
         │       │ call_id (PK)    │──────<│ event_id (PK)   │
         ├──────<│ match_id (FK)   │       │ call_id (FK)    │
         ├──────<│ requester_id    │       │ event_type      │
         │       │ status          │       │ actor_user_id   │
         │       │ provider        │       │ created_at      │
         │       │ provider_room   │       └─────────────────┘
         │       │ created_at      │
         │       │ ended_at        │
         │       └─────────────────┘
         │
         │       ┌───────────────────────────────────────────┐
         │       │          verification_requests            │
         │       ├───────────────────────────────────────────┤
         ├──────<│ request_id (PK)                           │
         │       │ user_id (FK)                              │
         │       │ type                                      │
         │       │ status                                    │
         │       │ region_policy_key                         │
         │       │ created_at                                │
         │       │ updated_at                                │
         │       └───────────────────────────────────────────┘
         │
         │       ┌─────────────────┐       ┌─────────────────┐
         │       │    reports      │       │moderation_cases │
         │       ├─────────────────┤       ├─────────────────┤
         ├──────<│ report_id (PK)  │──────>│ case_id (PK)    │
         ├──────<│ reporter_id(FK) │       │ subject_user_id │
         ├──────<│ target_user_id  │       │ status          │
         │       │ category        │       │ created_at      │
         │       │ description     │       │ resolved_at     │
         │       │ evidence_media  │       └─────────────────┘
         │       │ status          │
         │       │ created_at      │
         │       └─────────────────┘
         │
         │       ┌───────────────────────────────────────────┐
         │       │           user_subscriptions              │
         │       ├───────────────────────────────────────────┤
         ├──────<│ subscription_id (PK)                      │
         │       │ user_id (FK)                              │
         │       │ plan_id                                   │
         │       │ status                                    │
         │       │ started_at                                │
         │       │ renews_at                                 │
         │       │ canceled_at                               │
         │       └───────────────────────────────────────────┘
         │
         │       ┌───────────────────────────────────────────┐
         │       │           audit_log_events                │
         │       ├───────────────────────────────────────────┤
         └──────<│ event_id (PK)                             │
                 │ event_type                                │
                 │ actor_user_id (FK)                        │
                 │ subject_user_id (FK)                      │
                 │ payload_json                              │
                 │ correlation_id                            │
                 │ created_at                                │
                 └───────────────────────────────────────────┘
```

## Core Entities

### User Entity

```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin', 'support')),
    dob DATE NOT NULL,
    country VARCHAR(2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned', 'deleted')),
    email_verified_at TIMESTAMP,
    phone VARCHAR(20),
    phone_verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT age_check CHECK (dob <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### Profile Entity

```sql
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    display_name VARCHAR(50),
    bio TEXT,
    gender VARCHAR(20),
    interests JSONB DEFAULT '[]',
    location JSONB,
    height_cm INTEGER,
    occupation VARCHAR(100),
    education VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_gender ON profiles(gender);
CREATE INDEX idx_profiles_location ON profiles USING GIN(location);
CREATE INDEX idx_profiles_interests ON profiles USING GIN(interests);
```

### Match Entity

```sql
CREATE TABLE matches (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP,
    end_reason VARCHAR(50),
    CONSTRAINT unique_match UNIQUE (user_a_id, user_b_id),
    CONSTRAINT ordered_users CHECK (user_a_id < user_b_id)
);

CREATE INDEX idx_matches_user_a ON matches(user_a_id);
CREATE INDEX idx_matches_user_b ON matches(user_b_id);
CREATE INDEX idx_matches_created_at ON matches(created_at);
```

### Message Entity

```sql
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('text', 'image', 'voice', 'video', 'gift')),
    content TEXT,
    media_id UUID REFERENCES media_files(media_id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMP,
    deleted_at TIMESTAMP,
    correlation_id UUID NOT NULL
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_correlation ON messages(correlation_id);
```

## Relationship Types

### One-to-One
- `users` -> `profiles`: Each user has exactly one profile
- `users` -> `user_preferences`: Each user has one preference set

### One-to-Many
- `users` -> `profile_photos`: User can have multiple photos
- `users` -> `likes`: User can like many others
- `users` -> `messages`: User can send many messages
- `matches` -> `messages`: Match has many messages (via conversation)
- `verification_requests` -> `verification_artifacts`: Request has multiple uploads

### Many-to-Many
- `users` <-> `users` (via `matches`): Users can match with many users
- `users` <-> `users` (via `likes`): Users can like/be liked by many

## Data Integrity Constraints

### Foreign Keys

| Table | Column | References | On Delete |
|-------|--------|------------|-----------|
| profiles | user_id | users.user_id | CASCADE |
| profile_photos | user_id | users.user_id | CASCADE |
| profile_photos | media_id | media_files.media_id | SET NULL |
| likes | actor_user_id | users.user_id | CASCADE |
| likes | target_user_id | users.user_id | CASCADE |
| matches | user_a_id | users.user_id | CASCADE |
| matches | user_b_id | users.user_id | CASCADE |
| conversations | match_id | matches.match_id | CASCADE |
| messages | conversation_id | conversations.conversation_id | CASCADE |
| messages | sender_id | users.user_id | SET NULL |

### Check Constraints

```sql
-- Age must be 18+
ALTER TABLE users ADD CONSTRAINT age_check
    CHECK (dob <= CURRENT_DATE - INTERVAL '18 years');

-- Match users must be ordered (prevent duplicates)
ALTER TABLE matches ADD CONSTRAINT ordered_users
    CHECK (user_a_id < user_b_id);

-- Valid status values
ALTER TABLE users ADD CONSTRAINT valid_status
    CHECK (status IN ('active', 'suspended', 'banned', 'deleted'));

-- Photo count limit (enforced in application for tier-based limits)
-- Subscription tier enforcement is server-side
```

### Unique Constraints

```sql
-- Unique email
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- Unique match pair
ALTER TABLE matches ADD CONSTRAINT unique_match UNIQUE (user_a_id, user_b_id);

-- One like per pair
ALTER TABLE likes ADD CONSTRAINT unique_like UNIQUE (actor_user_id, target_user_id);
```

## Soft Deletes

Entities that support soft deletion:
- `users`: `deleted_at` column
- `messages`: `deleted_at` column
- `matches`: `ended_at` column (with reason)
- `media_files`: `deleted_at` column

## Versioning

Entities with version history:
- `profiles`: `profile_versions` table tracks changes
- `messages`: `message_versions` tracks edits
- `consent_records`: Tracks consent changes over time

## Indexes Strategy

### Query Patterns

| Query | Index |
|-------|-------|
| User login | `idx_users_email` |
| Discovery feed | Composite on `profiles(gender, location)` |
| User's matches | `idx_matches_user_a`, `idx_matches_user_b` |
| Conversation messages | `idx_messages_conversation` |
| Audit trail | `idx_audit_correlation`, `idx_audit_user` |

### Full-Text Search

```sql
-- Profile search
CREATE INDEX idx_profiles_fts ON profiles
    USING GIN(to_tsvector('english', display_name || ' ' || COALESCE(bio, '')));

-- Message search (if enabled)
CREATE INDEX idx_messages_fts ON messages
    USING GIN(to_tsvector('english', COALESCE(content, '')));
```

## Partitioning

### Time-Based Partitioning

```sql
-- Messages partitioned by month
CREATE TABLE messages (
    ...
) PARTITION BY RANGE (created_at);

CREATE TABLE messages_2024_01 PARTITION OF messages
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### Archive Strategy

| Data | Active | Archive After | Delete After |
|------|--------|---------------|--------------|
| Messages | Hot | 6 months | 2 years |
| Audit logs | Hot | 1 year | Never |
| Media files | CDN | 90 days (deleted users) | 90 days |
| Analytics | Hot | 90 days | Aggregate only |
