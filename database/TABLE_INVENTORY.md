# Flamoral Dating Platform - Complete Table Inventory

## Overview

This document provides a comprehensive inventory of all 40 tables in the Flamoral Dating Platform database, organized by functional category.

**Total Tables:** 40
**Migration Files:** 11
**Total Indexes:** 150+
**Database:** PostgreSQL 13+

---

## Table Categories

### 1. Core User System (4 tables)

#### users
**Purpose:** Core user accounts and authentication
**Primary Key:** UUID
**Migration:** 20250101000001_create_users_and_profiles.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email address |
| password_hash | VARCHAR(255) | Hashed password |
| phone_number | VARCHAR(20) | Phone number (optional) |
| status | ENUM | active, inactive, suspended, banned, deleted |
| subscription_tier | ENUM | free, basic, mid, ultra |
| is_email_verified | BOOLEAN | Email verification status |
| is_phone_verified | BOOLEAN | Phone verification status |
| is_photo_verified | BOOLEAN | Photo verification status |
| last_login_at | TIMESTAMP | Last login time |
| last_active_at | TIMESTAMP | Last activity time |
| created_at | TIMESTAMP | Account creation time |
| updated_at | TIMESTAMP | Last update time |
| deleted_at | TIMESTAMP | Soft delete timestamp |

**Indexes:** email, status, subscription_tier, created_at, last_active_at

---

#### profiles
**Purpose:** User profile information
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000001_create_users_and_profiles.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| first_name | VARCHAR(100) | First name |
| last_name | VARCHAR(100) | Last name |
| date_of_birth | DATE | Birth date |
| gender | ENUM | male, female, non-binary, other |
| bio | TEXT | Profile bio |
| occupation | VARCHAR(100) | Job title |
| education | VARCHAR(100) | Education level |
| company | VARCHAR(100) | Company name |
| school | VARCHAR(100) | School name |
| height | INTEGER | Height in cm |
| city | VARCHAR(100) | City |
| state | VARCHAR(100) | State |
| country | VARCHAR(100) | Country |
| latitude | DECIMAL(10,8) | Latitude |
| longitude | DECIMAL(11,8) | Longitude |
| interests | JSONB | Array of interests |
| languages | JSONB | Array of languages |
| relationship_type | ENUM | Desired relationship type |
| profile_completion_percentage | INTEGER | 0-100 |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** user_id, [latitude, longitude], city, country, date_of_birth

---

#### verification_tokens
**Purpose:** Email/phone verification and password reset tokens
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000001_create_users_and_profiles.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| token | VARCHAR(255) | Unique token |
| type | ENUM | email, phone, password_reset, two_factor |
| expires_at | TIMESTAMP | Expiration time |
| is_used | BOOLEAN | Usage status |
| used_at | TIMESTAMP | Usage time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** user_id, token, [token, type], expires_at

---

#### refresh_tokens
**Purpose:** JWT refresh token management
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000001_create_users_and_profiles.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| token | VARCHAR(500) | JWT refresh token |
| device_id | VARCHAR(255) | Device identifier |
| device_name | VARCHAR(100) | Device name |
| ip_address | VARCHAR(45) | IP address |
| user_agent | VARCHAR(500) | User agent string |
| expires_at | TIMESTAMP | Expiration time |
| is_revoked | BOOLEAN | Revocation status |
| revoked_at | TIMESTAMP | Revocation time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** user_id, token, expires_at, is_revoked

---

### 2. Content (3 tables)

#### photos
**Purpose:** User photo management with moderation
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000002_create_photos_and_prompts.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| url | VARCHAR(500) | Photo URL |
| thumbnail_url | VARCHAR(500) | Thumbnail URL |
| position | INTEGER | Display position (0 = primary) |
| is_primary | BOOLEAN | Primary photo flag |
| is_verified | BOOLEAN | Verification status |
| storage_key | VARCHAR(255) | Cloud storage key |
| verification_data | JSONB | AI verification results |
| verified_at | TIMESTAMP | Verification time |
| moderation_status | ENUM | pending, approved, rejected, flagged |
| moderation_data | JSONB | Moderation data |
| created_at | TIMESTAMP | Upload time |
| updated_at | TIMESTAMP | Last update time |
| deleted_at | TIMESTAMP | Soft delete timestamp |

**Indexes:** user_id, [user_id, position], [user_id, is_primary], moderation_status

---

#### prompts
**Purpose:** Predefined profile questions
**Primary Key:** UUID
**Migration:** 20250101000002_create_photos_and_prompts.ts
**Seeded Data:** 8 default prompts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| question | VARCHAR(255) | Prompt question |
| category | VARCHAR(50) | personality, lifestyle, fun |
| is_active | BOOLEAN | Active status |
| display_order | INTEGER | Display order |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** is_active, category, display_order

---

#### user_prompts
**Purpose:** User answers to profile prompts
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), prompt_id → prompts.id (CASCADE)
**Migration:** 20250101000002_create_photos_and_prompts.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| prompt_id | UUID | Foreign key to prompts |
| answer | TEXT | User's answer |
| display_order | INTEGER | Display order |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** user_id, prompt_id
**Unique:** [user_id, prompt_id]

---

### 3. Matching Engine (3 tables)

#### swipes
**Purpose:** User swipe actions (like, pass, super like)
**Primary Key:** UUID
**Migration:** 20250101000003_create_matching_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who swiped |
| target_user_id | UUID | User being swiped |
| action | ENUM | like, pass, super_like |
| is_super_like | BOOLEAN | Super like flag |
| created_at | TIMESTAMP | Swipe time |

**Indexes:** user_id, target_user_id, [user_id, target_user_id], [target_user_id, action], [user_id, created_at]
**Unique:** [user_id, target_user_id]
**Partial Index:** idx_swipes_like_actions (WHERE action IN ('like', 'super_like'))

---

#### matches
**Purpose:** Matched user pairs with compatibility scores
**Primary Key:** UUID
**Migration:** 20250101000003_create_matching_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user1_id | UUID | First user (lower UUID) |
| user2_id | UUID | Second user (higher UUID) |
| status | ENUM | active, unmatched, expired |
| compatibility_score | DECIMAL(5,2) | Match compatibility |
| matched_at | TIMESTAMP | Match creation time |
| last_activity_at | TIMESTAMP | Last activity time |
| unmatched_at | TIMESTAMP | Unmatch time |
| unmatched_by | UUID | User who unmatched |

**Indexes:** user1_id, user2_id, status, [user1_id, status], [user2_id, status], [user1_id, user2_id], matched_at, last_activity_at
**Unique:** [user1_id, user2_id]
**Check:** user1_id < user2_id
**Trigger:** update_matches_activity

---

#### user_preferences
**Purpose:** User matching preferences and filters
**Primary Key:** user_id (one-to-one with users)
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000003_create_matching_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, FK to users |
| age_min | INTEGER | Minimum age (default: 18) |
| age_max | INTEGER | Maximum age (default: 99) |
| max_distance | INTEGER | Max distance in km (default: 50) |
| gender_preference | JSONB | Array of genders |
| relationship_type_preference | JSONB | Relationship types |
| interests | JSONB | Preferred interests |
| dealbreakers | JSONB | Dealbreakers |
| show_me_on_discover | BOOLEAN | Discovery visibility |
| premium_only | BOOLEAN | Show premium only |
| verified_only | BOOLEAN | Show verified only |
| min_height | INTEGER | Minimum height in cm |
| max_height | INTEGER | Maximum height in cm |
| education_preference | JSONB | Education preferences |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update time |

**Indexes:** show_me_on_discover
**Trigger:** update_user_preferences_updated_at

---

### 4. Messaging (2 tables)

#### conversations
**Purpose:** Chat conversations between matched users
**Primary Key:** UUID
**Foreign Keys:** user1_id, user2_id → users.id (CASCADE), match_id → matches.id (CASCADE)
**Migration:** 20250101000004_create_messaging_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user1_id | UUID | First user (lower UUID) |
| user2_id | UUID | Second user (higher UUID) |
| match_id | UUID | Associated match |
| last_message | TEXT | Last message preview |
| last_message_at | TIMESTAMP | Last message time |
| last_message_sender_id | UUID | Last sender |
| unread_count_user1 | INTEGER | Unread for user1 |
| unread_count_user2 | INTEGER | Unread for user2 |
| created_at | TIMESTAMP | Conversation start |
| updated_at | TIMESTAMP | Last update |

**Indexes:** [user1_id, updated_at], [user2_id, updated_at], match_id, last_message_at
**Unique:** [user1_id, user2_id], match_id
**Check:** user1_id < user2_id

---

#### messages
**Purpose:** Individual messages in conversations
**Primary Key:** UUID
**Foreign Keys:** conversation_id → conversations.id (CASCADE), sender_id, receiver_id → users.id (CASCADE)
**Migration:** 20250101000004_create_messaging_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | Foreign key to conversations |
| sender_id | UUID | Message sender |
| receiver_id | UUID | Message receiver |
| content | TEXT | Message content |
| type | ENUM | text, image, gif, emoji, voice |
| media_url | VARCHAR(500) | Media URL (if applicable) |
| is_read | BOOLEAN | Read status |
| read_at | TIMESTAMP | Read time |
| status | ENUM | sent, delivered, read |
| sent_at | TIMESTAMP | Send time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |
| deleted_at | TIMESTAMP | Soft delete timestamp |

**Indexes:** [conversation_id, sent_at], [sender_id, sent_at], [receiver_id, is_read], sent_at
**Triggers:** trigger_update_conversation_on_message, trigger_reset_unread_count

---

### 5. Monetization (9 tables)

#### subscription_plans
**Purpose:** Available subscription tiers and features
**Primary Key:** UUID
**Migration:** 20250101000005_create_subscription_tables.ts
**Seeded Data:** 4 plans (Free, Basic, Mid, Ultra)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(50) | Plan name (unique) |
| tier | ENUM | free, basic, mid, ultra |
| display_name | VARCHAR(100) | Display name |
| description | TEXT | Plan description |
| price_monthly | DECIMAL(10,2) | Monthly price |
| price_yearly | DECIMAL(10,2) | Yearly price |
| price_3_months | DECIMAL(10,2) | 3-month price |
| price_6_months | DECIMAL(10,2) | 6-month price |
| stripe_price_id_* | VARCHAR(100) | Stripe price IDs |
| stripe_product_id | VARCHAR(100) | Stripe product ID |
| features | JSONB | Feature list |
| daily_swipes | INTEGER | Daily swipe limit |
| daily_super_likes | INTEGER | Daily super likes |
| monthly_boosts | INTEGER | Monthly boosts |
| unlimited_likes | BOOLEAN | Unlimited likes flag |
| see_who_likes_you | BOOLEAN | Feature flag |
| rewind_enabled | BOOLEAN | Feature flag |
| incognito_mode | BOOLEAN | Feature flag |
| passport_enabled | BOOLEAN | Feature flag |
| priority_likes | BOOLEAN | Feature flag |
| read_receipts | BOOLEAN | Feature flag |
| advanced_filters | BOOLEAN | Feature flag |
| unlimited_rewinds | BOOLEAN | Feature flag |
| is_active | BOOLEAN | Active status |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** tier, is_active

---

#### subscriptions
**Purpose:** User subscription records
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), plan_id → subscription_plans.id
**Migration:** 20250101000005_create_subscription_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users (unique) |
| plan_id | UUID | Foreign key to plans |
| status | ENUM | active, canceled, expired, past_due, trialing, incomplete, paused |
| billing_cycle | ENUM | monthly, yearly, 3_months, 6_months |
| stripe_subscription_id | VARCHAR(100) | Stripe subscription ID |
| stripe_customer_id | VARCHAR(100) | Stripe customer ID |
| stripe_price_id | VARCHAR(100) | Stripe price ID |
| current_period_start | TIMESTAMP | Billing period start |
| current_period_end | TIMESTAMP | Billing period end |
| cancel_at_period_end | BOOLEAN | Cancel flag |
| canceled_at | TIMESTAMP | Cancellation time |
| cancel_at | TIMESTAMP | Scheduled cancel time |
| trial_start | TIMESTAMP | Trial start |
| trial_end | TIMESTAMP | Trial end |
| metadata | JSONB | Additional metadata |
| created_at | TIMESTAMP | Subscription start |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, plan_id, status, stripe_subscription_id, stripe_customer_id, current_period_end

---

#### payment_methods
**Purpose:** Saved payment methods
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000005_create_subscription_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| stripe_payment_method_id | VARCHAR(100) | Stripe PM ID (unique) |
| stripe_customer_id | VARCHAR(100) | Stripe customer ID |
| type | ENUM | card, bank_account, apple_pay, google_pay |
| card_brand | VARCHAR(20) | Card brand |
| card_last4 | VARCHAR(4) | Last 4 digits |
| card_exp_month | INTEGER | Expiration month |
| card_exp_year | INTEGER | Expiration year |
| card_funding | VARCHAR(20) | Funding type |
| billing_name | VARCHAR(100) | Billing name |
| billing_email | VARCHAR(255) | Billing email |
| billing_address | JSONB | Billing address |
| is_default | BOOLEAN | Default payment flag |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, stripe_customer_id, [user_id, is_default]

---

#### transactions
**Purpose:** Payment transaction history
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), subscription_id → subscriptions.id
**Migration:** 20250101000005_create_subscription_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| subscription_id | UUID | Related subscription |
| stripe_payment_intent_id | VARCHAR(100) | Stripe payment intent |
| stripe_invoice_id | VARCHAR(100) | Stripe invoice |
| stripe_charge_id | VARCHAR(100) | Stripe charge |
| type | ENUM | subscription, subscription_renewal, one_time, coin_purchase, boost_purchase, refund |
| status | ENUM | pending, processing, succeeded, failed, canceled, refunded |
| amount | DECIMAL(10,2) | Transaction amount |
| currency | VARCHAR(3) | Currency code |
| description | TEXT | Description |
| metadata | JSONB | Metadata |
| failure_code | VARCHAR(50) | Failure code |
| failure_message | TEXT | Failure message |
| processed_at | TIMESTAMP | Processing time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, subscription_id, stripe_payment_intent_id, stripe_invoice_id, status, type, created_at

---

#### coins
**Purpose:** User virtual currency balances
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000006_create_coin_system.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users (unique) |
| balance | INTEGER | Current balance (≥ 0) |
| total_earned | INTEGER | Lifetime earned |
| total_spent | INTEGER | Lifetime spent |
| total_purchased | INTEGER | Lifetime purchased |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, balance
**Check:** balance >= 0

---

#### coin_packages
**Purpose:** Available coin packages for purchase
**Primary Key:** UUID
**Migration:** 20250101000006_create_coin_system.ts
**Seeded Data:** 5 packages (10-250 coins)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(50) | Package name |
| sku | VARCHAR(50) | Product SKU (unique) |
| coins | INTEGER | Base coin amount |
| bonus_coins | INTEGER | Bonus coins |
| price | DECIMAL(10,2) | Price |
| currency | VARCHAR(3) | Currency code |
| stripe_price_id | VARCHAR(100) | Stripe price ID |
| stripe_product_id | VARCHAR(100) | Stripe product ID |
| is_popular | BOOLEAN | Popular flag |
| is_active | BOOLEAN | Active status |
| sort_order | INTEGER | Display order |
| description | TEXT | Description |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** sku, is_active, sort_order

---

#### coin_transactions
**Purpose:** Coin transaction history
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), transaction_id → transactions.id, package_id → coin_packages.id
**Migration:** 20250101000006_create_coin_system.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| type | ENUM | purchase, spent, earned, refund, bonus, gift, admin_adjustment |
| amount | INTEGER | Amount (+ or -) |
| balance_after | INTEGER | Balance after transaction |
| description | TEXT | Description |
| reference_type | VARCHAR(50) | Reference type |
| reference_id | UUID | Reference ID |
| transaction_id | UUID | Related payment transaction |
| package_id | UUID | Related coin package |
| created_at | TIMESTAMP | Transaction time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, type, [user_id, created_at], reference_type, created_at
**Trigger:** trigger_update_coin_balance

---

#### boost_products
**Purpose:** Available boost products
**Primary Key:** UUID
**Migration:** 20250101000007_create_boost_system.ts
**Seeded Data:** 3 products (Standard, Prime Time, Spotlight)

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Product name |
| sku | VARCHAR(50) | Product SKU (unique) |
| description | TEXT | Description |
| type | ENUM | standard, prime_time, spotlight |
| duration_minutes | INTEGER | Boost duration |
| coin_cost | INTEGER | Cost in coins |
| usd_price | DECIMAL(10,2) | Direct USD price |
| visibility_multiplier | INTEGER | Visibility boost (default: 10) |
| stripe_price_id | VARCHAR(100) | Stripe price ID |
| stripe_product_id | VARCHAR(100) | Stripe product ID |
| is_active | BOOLEAN | Active status |
| is_featured | BOOLEAN | Featured flag |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** sku, type, is_active

---

#### boosts
**Purpose:** User boost purchase and usage history
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), product_id → boost_products.id, transaction_id → transactions.id, coin_transaction_id → coin_transactions.id
**Migration:** 20250101000007_create_boost_system.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| product_id | UUID | Foreign key to boost products |
| type | ENUM | standard, prime_time, spotlight |
| status | ENUM | pending, active, completed, expired, canceled |
| duration_minutes | INTEGER | Boost duration |
| start_time | TIMESTAMP | Start time |
| end_time | TIMESTAMP | End time |
| impressions_gained | INTEGER | Impressions count |
| profile_views | INTEGER | View count |
| likes_gained | INTEGER | Likes gained |
| super_likes_gained | INTEGER | Super likes gained |
| matches_gained | INTEGER | Matches gained |
| transaction_id | UUID | Related transaction |
| coin_transaction_id | UUID | Related coin transaction |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, status, [user_id, status], end_time, start_time, [status, end_time]
**Trigger:** trigger_activate_boost

---

### 6. Safety & Moderation (5 tables)

#### user_blocks
**Purpose:** Blocked users list
**Primary Key:** UUID
**Foreign Keys:** user_id, blocked_user_id → users.id (CASCADE)
**Migration:** 20250101000008_create_safety_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who blocked |
| blocked_user_id | UUID | Blocked user |
| reason | VARCHAR(255) | Block reason |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMP | Block time |

**Indexes:** user_id, blocked_user_id, [user_id, blocked_user_id]
**Unique:** [user_id, blocked_user_id]
**Check:** user_id != blocked_user_id

---

#### reports
**Purpose:** User reports for policy violations
**Primary Key:** UUID
**Foreign Keys:** reporter_id, reported_user_id, resolved_by → users.id (CASCADE/SET NULL)
**Migration:** 20250101000008_create_safety_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| reporter_id | UUID | User who reported |
| reported_user_id | UUID | Reported user |
| category | ENUM | inappropriate_photos, inappropriate_messages, fake_profile, spam, harassment, underage, scam, violence, hate_speech, impersonation, other |
| description | TEXT | Report description |
| evidence | JSONB | Evidence (screenshots, etc.) |
| status | ENUM | pending, investigating, resolved, dismissed, action_taken |
| severity | ENUM | low, medium, high, critical |
| resolution_notes | TEXT | Resolution notes |
| action_taken | ENUM | none, warning_sent, content_removed, photo_removed, account_restricted, account_suspended, account_banned |
| resolved_by | UUID | Resolver user ID |
| resolved_at | TIMESTAMP | Resolution time |
| created_at | TIMESTAMP | Report time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** reporter_id, reported_user_id, status, severity, category, [status, severity], created_at

---

#### moderation_logs
**Purpose:** Content moderation audit trail
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000008_create_safety_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| content_id | UUID | Moderated content ID |
| content_type | ENUM | photo, bio, message, prompt_answer, profile |
| content_url | TEXT | Content URL |
| content_text | TEXT | Content text |
| user_id | UUID | Content owner |
| status | ENUM | pending, approved, rejected, flagged, reviewing |
| action | ENUM | auto_approved, auto_rejected, auto_flagged, manual_approved, manual_rejected |
| risk_score | DECIMAL(5,4) | Risk score (0-1) |
| violations | JSONB | Violation types |
| image_moderation_data | JSONB | AI image analysis |
| text_moderation_data | JSONB | AI text analysis |
| recommendations | JSONB | AI recommendations |
| moderated_at | TIMESTAMP | Moderation time |
| moderated_by | UUID | Moderator ID |
| reviewed_at | TIMESTAMP | Review time |
| reviewed_by | UUID | Reviewer ID |
| review_notes | TEXT | Review notes |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** content_type, user_id, status, [user_id, created_at], [status, created_at], moderated_at

---

#### user_violations
**Purpose:** User violation records
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), moderation_log_id → moderation_logs.id (CASCADE), report_id → reports.id (CASCADE)
**Migration:** 20250101000008_create_safety_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User who violated |
| moderation_log_id | UUID | Related moderation log |
| report_id | UUID | Related report |
| violation_type | ENUM | inappropriate_content, fake_profile, harassment, spam, underage, hate_speech, violence, scam, impersonation, terms_violation, community_guidelines_violation, other |
| severity | ENUM | warning, minor, major, severe, critical |
| content_id | UUID | Violating content ID |
| content_type | VARCHAR(50) | Content type |
| action | ENUM | warning, content_removal, feature_restriction, temporary_suspension, permanent_suspension, account_termination |
| notes | TEXT | Violation notes |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | Violation time |
| expires_at | TIMESTAMP | Expiration (for temp actions) |

**Indexes:** user_id, [user_id, created_at], violation_type, severity, expires_at

---

#### user_safety_records
**Purpose:** Aggregated user safety data
**Primary Key:** user_id (one-to-one with users)
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000008_create_safety_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, FK to users |
| status | ENUM | good_standing, warned, restricted, suspended, banned |
| total_violations | INTEGER | Total violations |
| warnings_count | INTEGER | Warnings count |
| minor_violations | INTEGER | Minor violations |
| major_violations | INTEGER | Major violations |
| severe_violations | INTEGER | Severe violations |
| reports_received | INTEGER | Reports received |
| reports_made | INTEGER | Reports made |
| suspension_count | INTEGER | Suspension count |
| current_suspension_start | TIMESTAMP | Current suspension start |
| current_suspension_end | TIMESTAMP | Current suspension end |
| is_permanently_banned | BOOLEAN | Permanent ban flag |
| banned_at | TIMESTAMP | Ban time |
| ban_reason | TEXT | Ban reason |
| last_violation_at | TIMESTAMP | Last violation |
| trust_score | INTEGER | Trust score (0-100) |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last update |

**Indexes:** status, is_permanently_banned, [status, updated_at], trust_score

---

### 7. Privacy (1 table)

#### privacy_settings
**Purpose:** User privacy preferences and settings
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000009_create_privacy_settings.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users (unique) |
| incognito_mode | BOOLEAN | Incognito mode status |
| incognito_until | TIMESTAMP | Incognito expiration |
| show_distance | BOOLEAN | Show distance flag |
| show_last_active | BOOLEAN | Show last active flag |
| show_online_status | BOOLEAN | Show online flag |
| show_age | BOOLEAN | Show age flag |
| profile_visibility | ENUM | everyone, matches_only, hidden |
| discoverable | BOOLEAN | Discoverable flag |
| show_in_search | BOOLEAN | Search visibility |
| hide_from_contacts | BOOLEAN | Hide from contacts flag |
| hidden_phone_numbers | JSONB | Phone numbers to hide from |
| hidden_emails | JSONB | Emails to hide from |
| read_receipts_enabled | BOOLEAN | Read receipts flag |
| typing_indicators_enabled | BOOLEAN | Typing indicators flag |
| message_filter | ENUM | everyone, matches_only, verified_only |
| precise_location | BOOLEAN | Precise location flag |
| location_radius_km | INTEGER | Location fuzz radius |
| blur_photos | BOOLEAN | Blur photos until match |
| private_photo_album | BOOLEAN | Private album flag |
| hide_activity_status | BOOLEAN | Hide activity flag |
| hide_recently_active | BOOLEAN | Hide recent activity |
| allow_analytics | BOOLEAN | Analytics consent |
| allow_personalized_ads | BOOLEAN | Personalized ads consent |
| share_data_with_partners | BOOLEAN | Data sharing consent |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, incognito_mode, profile_visibility, discoverable

---

### 8. Notifications (4 tables)

#### notification_templates
**Purpose:** Notification message templates
**Primary Key:** UUID
**Migration:** 20250101000010_create_notification_tables.ts
**Seeded Data:** 10 templates

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Template name (unique) |
| code | VARCHAR(50) | Template code (unique) |
| type | ENUM | push, email, sms, in_app |
| category | ENUM | match, message, like, super_like, profile_view, boost, system, marketing, security |
| subject | VARCHAR(255) | Email subject |
| title | TEXT | Notification title |
| body | TEXT | Notification body |
| html_body | TEXT | HTML body (email) |
| variables | JSONB | Template variables |
| is_active | BOOLEAN | Active status |
| priority | INTEGER | Priority |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** code, type, category, is_active

---

#### user_devices
**Purpose:** User device registry for push notifications
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000010_create_notification_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| device_token | VARCHAR(500) | Push token |
| platform | ENUM | ios, android, web |
| device_id | VARCHAR(255) | Device ID |
| device_model | VARCHAR(100) | Device model |
| device_name | VARCHAR(100) | Device name |
| os_version | VARCHAR(50) | OS version |
| app_version | VARCHAR(50) | App version |
| push_provider | ENUM | fcm, apns, web_push |
| is_active | BOOLEAN | Active status |
| last_active_at | TIMESTAMP | Last activity |
| created_at | TIMESTAMP | Registration time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, device_token, platform, is_active
**Unique:** [user_id, device_token]

---

#### notification_preferences
**Purpose:** User notification preferences
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000010_create_notification_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users (unique) |
| push_enabled | BOOLEAN | Push notifications enabled |
| push_new_match | BOOLEAN | New match push |
| push_new_message | BOOLEAN | New message push |
| push_new_like | BOOLEAN | New like push |
| push_super_like | BOOLEAN | Super like push |
| push_profile_view | BOOLEAN | Profile view push |
| push_boost_expiring | BOOLEAN | Boost expiring push |
| push_boost_results | BOOLEAN | Boost results push |
| push_marketing | BOOLEAN | Marketing push |
| push_tips_suggestions | BOOLEAN | Tips push |
| email_enabled | BOOLEAN | Email notifications enabled |
| email_new_match | BOOLEAN | New match email |
| email_new_message | BOOLEAN | New message email |
| email_weekly_digest | BOOLEAN | Weekly digest email |
| email_monthly_summary | BOOLEAN | Monthly summary email |
| email_promotions | BOOLEAN | Promotions email |
| email_product_updates | BOOLEAN | Product updates email |
| email_tips_advice | BOOLEAN | Tips email |
| sms_enabled | BOOLEAN | SMS notifications enabled |
| sms_verification | BOOLEAN | Verification SMS |
| sms_security_alerts | BOOLEAN | Security SMS |
| sms_important_updates | BOOLEAN | Important updates SMS |
| in_app_enabled | BOOLEAN | In-app notifications enabled |
| in_app_sound | BOOLEAN | In-app sound |
| in_app_vibration | BOOLEAN | In-app vibration |
| quiet_hours_enabled | BOOLEAN | Quiet hours enabled |
| quiet_hours_start | TIME | Quiet hours start |
| quiet_hours_end | TIME | Quiet hours end |
| timezone | VARCHAR(50) | User timezone |
| dnd_enabled | BOOLEAN | Do not disturb enabled |
| dnd_until | TIMESTAMP | DND until time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id

---

#### notifications
**Purpose:** Notification delivery history
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE), template_id → notification_templates.id
**Migration:** 20250101000010_create_notification_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| template_id | UUID | Template used |
| type | ENUM | push, email, sms, in_app |
| category | ENUM | match, message, like, super_like, profile_view, boost, system, marketing, security |
| title | VARCHAR(255) | Notification title |
| body | TEXT | Notification body |
| data | JSONB | Additional data |
| action_url | VARCHAR(500) | Action URL |
| deep_link | VARCHAR(500) | Deep link |
| image_url | VARCHAR(500) | Image URL |
| status | ENUM | pending, queued, sent, delivered, failed, read, clicked |
| priority | ENUM | low, normal, high, urgent |
| error_message | TEXT | Error message |
| retry_count | INTEGER | Retry attempts |
| scheduled_at | TIMESTAMP | Scheduled time |
| sent_at | TIMESTAMP | Sent time |
| delivered_at | TIMESTAMP | Delivered time |
| read_at | TIMESTAMP | Read time |
| clicked_at | TIMESTAMP | Clicked time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |
| expires_at | TIMESTAMP | Expiration time |

**Indexes:** user_id, status, category, type, created_at, [user_id, status], [user_id, created_at]

---

### 9. Analytics (6 tables)

#### analytics_events
**Purpose:** User event tracking
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (SET NULL)
**Migration:** 20250101000011_create_analytics_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User (nullable) |
| session_id | VARCHAR(255) | Session ID |
| event_type | VARCHAR(100) | Event type |
| event_name | VARCHAR(100) | Event name |
| event_category | VARCHAR(50) | Event category |
| properties | JSONB | Event properties |
| page_url | VARCHAR(500) | Page URL |
| referrer_url | VARCHAR(500) | Referrer URL |
| utm_source | VARCHAR(255) | UTM source |
| utm_medium | VARCHAR(255) | UTM medium |
| utm_campaign | VARCHAR(255) | UTM campaign |
| utm_content | VARCHAR(255) | UTM content |
| utm_term | VARCHAR(255) | UTM term |
| click_ids | JSONB | Click IDs (fbclid, gclid, etc.) |
| user_agent | TEXT | User agent |
| ip_address | VARCHAR(45) | IP address |
| device_type | VARCHAR(50) | Device type |
| browser | VARCHAR(100) | Browser |
| os | VARCHAR(100) | Operating system |
| country | VARCHAR(2) | Country code |
| region | VARCHAR(100) | Region |
| city | VARCHAR(100) | City |
| created_at | TIMESTAMP | Event time |

**Indexes:** user_id, session_id, event_type, event_name, utm_source, utm_campaign, created_at, [user_id, created_at], [event_type, created_at]

---

#### user_attribution
**Purpose:** User acquisition attribution tracking
**Primary Key:** user_id (one-to-one with users)
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000011_create_analytics_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| user_id | UUID | Primary key, FK to users |
| first_touch_source | VARCHAR(255) | First touch source |
| first_touch_medium | VARCHAR(255) | First touch medium |
| first_touch_campaign | VARCHAR(255) | First touch campaign |
| first_touch_content | VARCHAR(255) | First touch content |
| first_touch_click_id | JSONB | First touch click ID |
| first_touch_timestamp | TIMESTAMP | First touch time |
| first_touch_landing_page | TEXT | Landing page |
| first_touch_referrer | TEXT | Referrer |
| last_touch_source | VARCHAR(255) | Last touch source |
| last_touch_medium | VARCHAR(255) | Last touch medium |
| last_touch_campaign | VARCHAR(255) | Last touch campaign |
| last_touch_content | VARCHAR(255) | Last touch content |
| last_touch_click_id | JSONB | Last touch click ID |
| last_touch_timestamp | TIMESTAMP | Last touch time |
| registration_timestamp | TIMESTAMP | Registration time |
| registration_source | VARCHAR(255) | Registration source |
| registration_campaign | VARCHAR(255) | Registration campaign |
| first_subscription_at | TIMESTAMP | First subscription |
| subscription_source | VARCHAR(255) | Subscription source |
| attribution_model | VARCHAR(50) | Attribution model |
| total_touchpoints | INTEGER | Touchpoint count |
| touchpoint_data | JSONB | Touchpoint data |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** first_touch_source, last_touch_source, registration_timestamp, registration_source

---

#### user_sessions
**Purpose:** User session tracking
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (SET NULL)
**Migration:** 20250101000011_create_analytics_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| session_id | VARCHAR(255) | Session ID (unique) |
| user_id | UUID | User (nullable) |
| started_at | TIMESTAMP | Session start |
| landing_page | TEXT | Landing page |
| referrer_url | TEXT | Referrer URL |
| utm_source | VARCHAR(255) | UTM source |
| utm_medium | VARCHAR(255) | UTM medium |
| utm_campaign | VARCHAR(255) | UTM campaign |
| utm_content | VARCHAR(255) | UTM content |
| utm_term | VARCHAR(255) | UTM term |
| click_ids | JSONB | Click IDs |
| user_agent | TEXT | User agent |
| ip_address | VARCHAR(45) | IP address |
| device_type | VARCHAR(50) | Device type |
| browser | VARCHAR(100) | Browser |
| os | VARCHAR(100) | Operating system |
| country | VARCHAR(2) | Country code |
| region | VARCHAR(100) | Region |
| city | VARCHAR(100) | City |
| page_views | INTEGER | Page view count |
| events_count | INTEGER | Event count |
| duration_seconds | INTEGER | Session duration |
| ended_at | TIMESTAMP | Session end |
| exit_page | TEXT | Exit page |
| converted | BOOLEAN | Conversion flag |
| conversion_timestamp | TIMESTAMP | Conversion time |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** session_id, user_id, started_at, utm_source, converted

---

#### conversion_funnel
**Purpose:** User conversion funnel tracking
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000011_create_analytics_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User (nullable) |
| session_id | VARCHAR(255) | Session ID |
| landing_page_view_at | TIMESTAMP | Landing view |
| registration_started_at | TIMESTAMP | Registration start |
| email_entered_at | TIMESTAMP | Email entered |
| password_created_at | TIMESTAMP | Password created |
| registration_completed_at | TIMESTAMP | Registration complete |
| email_verified_at | TIMESTAMP | Email verified |
| profile_started_at | TIMESTAMP | Profile started |
| photo_uploaded_at | TIMESTAMP | Photo uploaded |
| profile_completed_at | TIMESTAMP | Profile complete |
| first_swipe_at | TIMESTAMP | First swipe |
| first_match_at | TIMESTAMP | First match |
| first_message_at | TIMESTAMP | First message |
| subscription_purchased_at | TIMESTAMP | Subscription purchased |
| time_to_register | INTEGER | Time to register (seconds) |
| time_to_verify | INTEGER | Time to verify (seconds) |
| time_to_profile | INTEGER | Time to profile (seconds) |
| time_to_match | INTEGER | Time to match (seconds) |
| time_to_subscribe | INTEGER | Time to subscribe (seconds) |
| dropped_at_step | VARCHAR(100) | Drop-off step |
| completed | BOOLEAN | Funnel completed |
| utm_source | VARCHAR(255) | UTM source |
| utm_campaign | VARCHAR(255) | UTM campaign |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, session_id, utm_source, completed, dropped_at_step

---

#### ad_campaign_performance
**Purpose:** Ad campaign tracking and ROI
**Primary Key:** UUID
**Migration:** 20250101000011_create_analytics_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| platform | VARCHAR(100) | Ad platform |
| campaign_id | VARCHAR(255) | Campaign ID |
| campaign_name | VARCHAR(255) | Campaign name |
| ad_set_id | VARCHAR(255) | Ad set ID |
| ad_set_name | VARCHAR(255) | Ad set name |
| ad_id | VARCHAR(255) | Ad ID |
| ad_name | VARCHAR(255) | Ad name |
| utm_source | VARCHAR(255) | UTM source |
| utm_medium | VARCHAR(255) | UTM medium |
| utm_campaign | VARCHAR(255) | UTM campaign |
| utm_content | VARCHAR(255) | UTM content |
| impressions | INTEGER | Impressions |
| clicks | INTEGER | Clicks |
| spend | DECIMAL(10,2) | Ad spend |
| registrations | INTEGER | Registrations |
| email_verifications | INTEGER | Email verifications |
| profile_completions | INTEGER | Profile completions |
| subscriptions | INTEGER | Subscriptions |
| ctr | DECIMAL(10,6) | Click-through rate |
| cpc | DECIMAL(10,2) | Cost per click |
| cpm | DECIMAL(10,2) | Cost per 1000 impressions |
| cpa | DECIMAL(10,2) | Cost per acquisition |
| roas | DECIMAL(10,2) | Return on ad spend |
| revenue | DECIMAL(10,2) | Revenue |
| date | DATE | Date |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** platform, campaign_id, date, utm_campaign, [platform, date]
**Unique:** [platform, campaign_id, ad_id, date]

---

#### engagement_metrics
**Purpose:** Daily user engagement metrics
**Primary Key:** UUID
**Foreign Keys:** user_id → users.id (CASCADE)
**Migration:** 20250101000011_create_analytics_tables.ts

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| date | DATE | Metric date |
| swipes_count | INTEGER | Swipes count |
| likes_given | INTEGER | Likes given |
| passes_given | INTEGER | Passes given |
| super_likes_given | INTEGER | Super likes given |
| likes_received | INTEGER | Likes received |
| matches_count | INTEGER | Matches count |
| messages_sent | INTEGER | Messages sent |
| messages_received | INTEGER | Messages received |
| profile_views | INTEGER | Profile views |
| sessions_count | INTEGER | Sessions count |
| total_time_minutes | INTEGER | Total time (minutes) |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

**Indexes:** user_id, date, [user_id, date]
**Unique:** [user_id, date]

---

## Summary Statistics

| Category | Table Count |
|----------|-------------|
| Core User System | 4 |
| Content | 3 |
| Matching Engine | 3 |
| Messaging | 2 |
| Monetization | 9 |
| Safety & Moderation | 5 |
| Privacy | 1 |
| Notifications | 4 |
| Analytics | 6 |
| **System Tables** | **3** |
| **TOTAL** | **40** |

### Additional Database Objects

- **Indexes:** 150+
- **Foreign Keys:** 60+
- **Triggers:** 7
- **Check Constraints:** 5
- **Unique Constraints:** 25+
- **Seeded Records:** 30+

---

## Migration Files

1. `20250101000001_create_users_and_profiles.ts` - Users, profiles, verification
2. `20250101000002_create_photos_and_prompts.ts` - Photos, prompts
3. `20250101000003_create_matching_tables.ts` - Swipes, matches, preferences
4. `20250101000004_create_messaging_tables.ts` - Conversations, messages
5. `20250101000005_create_subscription_tables.ts` - Subscriptions, payments
6. `20250101000006_create_coin_system.ts` - Coins, packages, transactions
7. `20250101000007_create_boost_system.ts` - Boosts, products
8. `20250101000008_create_safety_tables.ts` - Blocks, reports, moderation
9. `20250101000009_create_privacy_settings.ts` - Privacy preferences
10. `20250101000010_create_notification_tables.ts` - Notifications, templates
11. `20250101000011_create_analytics_tables.ts` - Events, attribution, campaigns

---

**Created:** 2025-12-01
**Version:** 1.0.0
**Status:** Production Ready
**Database:** PostgreSQL 13+
