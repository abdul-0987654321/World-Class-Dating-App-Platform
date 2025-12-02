# Flamoral Dating Platform - Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Definitions](#table-definitions)
4. [Indexes and Performance](#indexes-and-performance)
5. [Triggers and Functions](#triggers-and-functions)

## Overview

The Flamoral Dating Platform uses a single PostgreSQL database with 40+ tables organized into logical domains:

- **Authentication & User Management**: User accounts, profiles, tokens
- **Content**: Photos, prompts, user-generated content
- **Matching Engine**: Swipes, matches, preferences
- **Messaging**: Conversations and messages
- **Monetization**: Subscriptions, coins, boosts, payments
- **Safety & Moderation**: Blocks, reports, violations
- **Privacy**: User privacy settings
- **Notifications**: Multi-channel notifications (push, email, SMS)
- **Analytics**: Event tracking, attribution, campaigns

## Entity Relationship Diagram

### Core User Flow
```
users (1) ──→ (1) profiles
  │
  ├──→ (n) photos
  ├──→ (n) user_prompts
  ├──→ (1) privacy_settings
  ├──→ (1) user_preferences
  ├──→ (1) subscriptions
  ├──→ (1) coins
  ├──→ (1) user_safety_records
  └──→ (1) notification_preferences
```

### Matching System
```
users (1) ──→ (n) swipes ←── (1) target_users
  │
  └──→ (n) matches ←── (n) users
        │
        └──→ (1) conversations
              │
              └──→ (n) messages
```

### Monetization Flow
```
users (1) ──→ (1) subscriptions ──→ (1) subscription_plans
  │
  ├──→ (1) coins ──→ (n) coin_transactions ──→ (n) coin_packages
  │
  ├──→ (n) boosts ──→ (n) boost_products
  │
  └──→ (n) transactions ──→ (n) payment_methods
```

## Table Definitions

### 1. Users & Authentication

#### `users`
Core user account table.

**Columns:**
- `id` (UUID, PK): Unique user identifier
- `email` (VARCHAR, UNIQUE): User email address
- `password_hash` (VARCHAR): Hashed password
- `phone_number` (VARCHAR): Phone number
- `status` (ENUM): Account status (active, inactive, suspended, banned, deleted)
- `subscription_tier` (ENUM): Current tier (free, basic, mid, ultra)
- `is_email_verified` (BOOLEAN): Email verification status
- `is_phone_verified` (BOOLEAN): Phone verification status
- `is_photo_verified` (BOOLEAN): Photo verification status
- `last_login_at` (TIMESTAMP): Last login timestamp
- `last_active_at` (TIMESTAMP): Last activity timestamp
- `created_at`, `updated_at`, `deleted_at` (TIMESTAMP)

**Indexes:**
- email, status, subscription_tier, created_at, last_active_at

#### `profiles`
User profile information.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, UNIQUE)
- `first_name`, `last_name` (VARCHAR)
- `date_of_birth` (DATE)
- `gender` (ENUM): male, female, non-binary, other, prefer_not_to_say
- `bio` (TEXT)
- `occupation`, `education`, `company`, `school` (VARCHAR)
- `height` (INTEGER): Height in cm
- `city`, `state`, `country` (VARCHAR)
- `latitude`, `longitude` (DECIMAL)
- `interests`, `languages` (JSONB)
- `relationship_type` (ENUM)
- `profile_completion_percentage` (INTEGER)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes:**
- user_id, [latitude, longitude], city, country, date_of_birth

#### `verification_tokens`
Email/phone verification and password reset tokens.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `token` (VARCHAR, UNIQUE)
- `type` (ENUM): email, phone, password_reset, two_factor
- `expires_at` (TIMESTAMP)
- `is_used` (BOOLEAN)
- `used_at` (TIMESTAMP)

#### `refresh_tokens`
JWT refresh tokens for session management.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `token` (VARCHAR, UNIQUE)
- `device_id`, `device_name` (VARCHAR)
- `ip_address`, `user_agent` (VARCHAR)
- `expires_at` (TIMESTAMP)
- `is_revoked` (BOOLEAN)
- `revoked_at` (TIMESTAMP)

### 2. Content

#### `photos`
User photos with moderation.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `url`, `thumbnail_url` (VARCHAR)
- `position` (INTEGER): Display order (0 = primary)
- `is_primary`, `is_verified` (BOOLEAN)
- `storage_key` (VARCHAR): Cloud storage key
- `verification_data` (JSONB): AI verification results
- `verified_at` (TIMESTAMP)
- `moderation_status` (ENUM): pending, approved, rejected, flagged
- `moderation_data` (JSONB)

**Indexes:**
- user_id, [user_id, position], [user_id, is_primary], moderation_status

#### `prompts`
Predefined profile questions.

**Columns:**
- `id` (UUID, PK)
- `question` (VARCHAR)
- `category` (VARCHAR): personality, lifestyle, fun
- `is_active` (BOOLEAN)
- `display_order` (INTEGER)

**Default Prompts:**
- "My ideal Sunday looks like..."
- "I geek out on..."
- "A perfect first date would be..."
- "The way to win me over is..."
- "I'm looking for someone who..."
- "My greatest adventure was..."
- "I spend most of my free time..."
- "My love language is..."

#### `user_prompts`
User answers to prompts.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `prompt_id` (UUID, FK → prompts)
- `answer` (TEXT)
- `display_order` (INTEGER)

**Constraints:**
- UNIQUE [user_id, prompt_id]

### 3. Matching System

#### `swipes`
User swipe actions.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID): Swiping user
- `target_user_id` (UUID): User being swiped on
- `action` (ENUM): like, pass, super_like
- `is_super_like` (BOOLEAN)
- `created_at` (TIMESTAMP)

**Constraints:**
- UNIQUE [user_id, target_user_id]

**Indexes:**
- user_id, target_user_id, [user_id, target_user_id], [target_user_id, action]
- Partial index on likes: `WHERE action IN ('like', 'super_like')`

#### `matches`
Matched users.

**Columns:**
- `id` (UUID, PK)
- `user1_id`, `user2_id` (UUID): Matched users (user1_id < user2_id)
- `status` (ENUM): active, unmatched, expired
- `compatibility_score` (DECIMAL)
- `matched_at`, `last_activity_at`, `unmatched_at` (TIMESTAMP)
- `unmatched_by` (UUID): User who unmatched

**Constraints:**
- UNIQUE [user1_id, user2_id]
- CHECK user1_id < user2_id

**Triggers:**
- `update_matches_activity`: Auto-updates last_activity_at

#### `user_preferences`
User matching preferences.

**Columns:**
- `user_id` (UUID, PK, FK → users)
- `age_min`, `age_max` (INTEGER)
- `max_distance` (INTEGER): In kilometers
- `gender_preference` (JSONB): Array of preferred genders
- `relationship_type_preference` (JSONB)
- `interests`, `dealbreakers` (JSONB)
- `show_me_on_discover` (BOOLEAN)
- `premium_only`, `verified_only` (BOOLEAN)
- `min_height`, `max_height` (INTEGER)
- `education_preference` (JSONB)

### 4. Messaging

#### `conversations`
Chat conversations between matched users.

**Columns:**
- `id` (UUID, PK)
- `user1_id`, `user2_id` (UUID, FK → users): Participants (user1_id < user2_id)
- `match_id` (UUID, FK → matches, UNIQUE)
- `last_message` (TEXT)
- `last_message_at` (TIMESTAMP)
- `last_message_sender_id` (UUID, FK → users)
- `unread_count_user1`, `unread_count_user2` (INTEGER)

**Constraints:**
- UNIQUE [user1_id, user2_id], match_id
- CHECK user1_id < user2_id

**Triggers:**
- `trigger_update_conversation_on_message`: Updates metadata on new message

#### `messages`
Individual messages.

**Columns:**
- `id` (UUID, PK)
- `conversation_id` (UUID, FK → conversations)
- `sender_id`, `receiver_id` (UUID, FK → users)
- `content` (TEXT)
- `type` (ENUM): text, image, gif, emoji, voice
- `media_url` (VARCHAR)
- `is_read` (BOOLEAN)
- `read_at` (TIMESTAMP)
- `status` (ENUM): sent, delivered, read
- `sent_at` (TIMESTAMP)

**Triggers:**
- `trigger_reset_unread_count`: Decrements unread count when read

### 5. Monetization

#### `subscription_plans`
Available subscription tiers.

**Columns:**
- `id` (UUID, PK)
- `name` (VARCHAR, UNIQUE): free, basic, mid, ultra
- `tier` (ENUM)
- `display_name`, `description` (VARCHAR/TEXT)
- `price_monthly`, `price_yearly`, `price_3_months`, `price_6_months` (DECIMAL)
- `stripe_price_id_*`, `stripe_product_id` (VARCHAR)
- `features` (JSONB)
- `daily_swipes`, `daily_super_likes`, `monthly_boosts` (INTEGER)
- Feature flags (BOOLEAN): unlimited_likes, see_who_likes_you, rewind_enabled, etc.
- `is_active` (BOOLEAN)
- `sort_order` (INTEGER)

**Default Plans:**
1. Free: $0/mo, 50 swipes, 1 super like
2. Basic: $9.99/mo, unlimited swipes, 5 super likes, see likes
3. Mid: $19.99/mo, unlimited super likes, advanced filters
4. Ultra: $34.99/mo, incognito, passport, 5 boosts/month

#### `subscriptions`
User subscriptions.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, UNIQUE)
- `plan_id` (UUID, FK → subscription_plans)
- `status` (ENUM): active, canceled, expired, past_due, trialing, incomplete, paused
- `billing_cycle` (ENUM): monthly, yearly, 3_months, 6_months
- `stripe_subscription_id`, `stripe_customer_id`, `stripe_price_id` (VARCHAR)
- `current_period_start`, `current_period_end` (TIMESTAMP)
- `cancel_at_period_end` (BOOLEAN)
- `canceled_at`, `cancel_at` (TIMESTAMP)
- `trial_start`, `trial_end` (TIMESTAMP)
- `metadata` (JSONB)

#### `payment_methods`
Saved payment methods.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `stripe_payment_method_id` (VARCHAR, UNIQUE)
- `stripe_customer_id` (VARCHAR)
- `type` (ENUM): card, bank_account, apple_pay, google_pay
- Card details: brand, last4, exp_month, exp_year, funding
- Billing details: name, email, address (JSONB)
- `is_default` (BOOLEAN)

#### `transactions`
Payment transactions.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `subscription_id` (UUID, FK → subscriptions)
- `stripe_payment_intent_id`, `stripe_invoice_id`, `stripe_charge_id` (VARCHAR)
- `type` (ENUM): subscription, subscription_renewal, one_time, coin_purchase, boost_purchase, refund
- `status` (ENUM): pending, processing, succeeded, failed, canceled, refunded
- `amount` (DECIMAL)
- `currency` (VARCHAR)
- `description` (TEXT)
- `metadata` (JSONB)
- `failure_code`, `failure_message` (VARCHAR/TEXT)
- `processed_at` (TIMESTAMP)

#### `coins`
User coin balances.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, UNIQUE)
- `balance`, `total_earned`, `total_spent`, `total_purchased` (INTEGER)

**Constraints:**
- CHECK balance >= 0

#### `coin_packages`
Available coin packages.

**Columns:**
- `id` (UUID, PK)
- `name`, `sku` (VARCHAR, UNIQUE)
- `coins`, `bonus_coins` (INTEGER)
- `price` (DECIMAL)
- `currency` (VARCHAR)
- `stripe_price_id`, `stripe_product_id` (VARCHAR)
- `is_popular`, `is_active` (BOOLEAN)
- `sort_order` (INTEGER)
- `description` (TEXT)

**Default Packages:**
1. 10 Coins: $4.99
2. 25 Coins: $9.99 (+2 bonus)
3. 50 Coins: $17.99 (+5 bonus) ⭐ Popular
4. 100 Coins: $29.99 (+15 bonus)
5. 250 Coins: $59.99 (+50 bonus)

#### `coin_transactions`
Coin transaction history.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `type` (ENUM): purchase, spent, earned, refund, bonus, gift, admin_adjustment
- `amount` (INTEGER): Positive for credits, negative for debits
- `balance_after` (INTEGER)
- `description` (TEXT)
- `reference_type`, `reference_id` (VARCHAR/UUID)
- `transaction_id` (UUID, FK → transactions)
- `package_id` (UUID, FK → coin_packages)

**Triggers:**
- `trigger_update_coin_balance`: Updates coins table on insert

#### `boost_products`
Available boost products.

**Columns:**
- `id` (UUID, PK)
- `name`, `sku` (VARCHAR, UNIQUE)
- `description` (TEXT)
- `type` (ENUM): standard, prime_time, spotlight
- `duration_minutes` (INTEGER)
- `coin_cost` (INTEGER)
- `usd_price` (DECIMAL)
- `visibility_multiplier` (INTEGER)
- `stripe_price_id`, `stripe_product_id` (VARCHAR)
- `is_active`, `is_featured` (BOOLEAN)
- `sort_order` (INTEGER)

**Default Products:**
1. Standard Boost: 30min, 5 coins, 10x visibility
2. Prime Time: 60min, 10 coins, 15x visibility
3. Spotlight: 60min, 15 coins, 20x visibility

#### `boosts`
User boost history.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `product_id` (UUID, FK → boost_products)
- `type` (ENUM): standard, prime_time, spotlight
- `status` (ENUM): pending, active, completed, expired, canceled
- `duration_minutes` (INTEGER)
- `start_time`, `end_time` (TIMESTAMP)
- Performance metrics: impressions_gained, profile_views, likes_gained, super_likes_gained, matches_gained
- `transaction_id`, `coin_transaction_id` (UUID)

**Triggers:**
- `trigger_activate_boost`: Sets start/end times on activation

### 6. Safety & Moderation

#### `user_blocks`
Blocked users.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users): Blocker
- `blocked_user_id` (UUID, FK → users): Blocked user
- `reason`, `notes` (VARCHAR/TEXT)
- `created_at` (TIMESTAMP)

**Constraints:**
- UNIQUE [user_id, blocked_user_id]
- CHECK user_id != blocked_user_id

#### `reports`
User reports.

**Columns:**
- `id` (UUID, PK)
- `reporter_id`, `reported_user_id` (UUID, FK → users)
- `category` (ENUM): inappropriate_photos, inappropriate_messages, fake_profile, spam, harassment, underage, scam, violence, hate_speech, impersonation, other
- `description` (TEXT)
- `evidence` (JSONB): Screenshots, message IDs
- `status` (ENUM): pending, investigating, resolved, dismissed, action_taken
- `severity` (ENUM): low, medium, high, critical
- `resolution_notes` (TEXT)
- `action_taken` (ENUM): none, warning_sent, content_removed, photo_removed, account_restricted, account_suspended, account_banned
- `resolved_by` (UUID, FK → users)
- `resolved_at` (TIMESTAMP)

#### `moderation_logs`
Content moderation history.

**Columns:**
- `id` (UUID, PK)
- `content_id` (UUID): ID of moderated content
- `content_type` (ENUM): photo, bio, message, prompt_answer, profile
- `content_url`, `content_text` (TEXT)
- `user_id` (UUID, FK → users)
- `status` (ENUM): pending, approved, rejected, flagged, reviewing
- `action` (ENUM): auto_approved, auto_rejected, auto_flagged, manual_approved, manual_rejected
- `risk_score` (DECIMAL): 0.0000 to 1.0000
- `violations` (JSONB): Array of violation types
- AI moderation data (JSONB): image_moderation_data, text_moderation_data
- `recommendations` (JSONB)
- `moderated_at`, `moderated_by`, `reviewed_at`, `reviewed_by` (TIMESTAMP/UUID)
- `review_notes` (TEXT)

#### `user_violations`
User violation records.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `moderation_log_id` (UUID, FK → moderation_logs)
- `report_id` (UUID, FK → reports)
- `violation_type` (ENUM): inappropriate_content, fake_profile, harassment, spam, underage, hate_speech, violence, scam, impersonation, terms_violation, community_guidelines_violation, other
- `severity` (ENUM): warning, minor, major, severe, critical
- `content_id`, `content_type` (UUID/VARCHAR)
- `action` (ENUM): warning, content_removal, feature_restriction, temporary_suspension, permanent_suspension, account_termination
- `notes` (TEXT)
- `metadata` (JSONB)
- `created_at`, `expires_at` (TIMESTAMP)

#### `user_safety_records`
Aggregated safety data per user.

**Columns:**
- `user_id` (UUID, PK, FK → users)
- `status` (ENUM): good_standing, warned, restricted, suspended, banned
- Violation counts: total_violations, warnings_count, minor_violations, major_violations, severe_violations
- Report counts: reports_received, reports_made
- Suspension data: suspension_count, current_suspension_start, current_suspension_end
- Ban data: is_permanently_banned, banned_at, ban_reason
- `last_violation_at` (TIMESTAMP)
- `trust_score` (INTEGER): 0-100

### 7. Privacy

#### `privacy_settings`
User privacy preferences.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, UNIQUE)
- Incognito: incognito_mode, incognito_until
- Visibility: show_distance, show_last_active, show_online_status, show_age
- Profile: profile_visibility (everyone, matches_only, hidden), discoverable, show_in_search
- Contact privacy: hide_from_contacts, hidden_phone_numbers, hidden_emails (JSONB)
- Messages: read_receipts_enabled, typing_indicators_enabled, message_filter
- Location: precise_location, location_radius_km
- Photos: blur_photos, private_photo_album
- Activity: hide_activity_status, hide_recently_active
- Data sharing: allow_analytics, allow_personalized_ads, share_data_with_partners

### 8. Notifications

#### `notification_templates`
Notification message templates.

**Columns:**
- `id` (UUID, PK)
- `name`, `code` (VARCHAR, UNIQUE)
- `type` (ENUM): push, email, sms, in_app
- `category` (ENUM): match, message, like, super_like, profile_view, boost, system, marketing, security
- `subject`, `title`, `body`, `html_body` (VARCHAR/TEXT)
- `variables` (JSONB): Template variables
- `is_active` (BOOLEAN)
- `priority` (INTEGER)

**Default Templates:**
- NEW_MATCH: "It's a Match! 🎉"
- NEW_MESSAGE: Message from sender
- NEW_LIKE: "Someone likes you!"
- NEW_SUPER_LIKE: "You got a Super Like!"
- BOOST_EXPIRING: Boost expiration warning
- BOOST_RESULTS: Boost performance results
- WELCOME_EMAIL: Welcome email
- WEEKLY_DIGEST: Weekly activity summary
- VERIFICATION_CODE_SMS: SMS verification code
- SECURITY_ALERT_SMS: Login security alert

#### `user_devices`
User devices for push notifications.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `device_token` (VARCHAR)
- `platform` (ENUM): ios, android, web
- `device_id`, `device_model`, `device_name` (VARCHAR)
- `os_version`, `app_version` (VARCHAR)
- `push_provider` (ENUM): fcm, apns, web_push
- `is_active` (BOOLEAN)
- `last_active_at` (TIMESTAMP)

**Constraints:**
- UNIQUE [user_id, device_token]

#### `notification_preferences`
User notification preferences.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, UNIQUE)
- Push preferences: push_enabled, push_new_match, push_new_message, push_new_like, push_super_like, push_profile_view, push_boost_expiring, push_boost_results, push_marketing, push_tips_suggestions
- Email preferences: email_enabled, email_new_match, email_new_message, email_weekly_digest, email_monthly_summary, email_promotions, email_product_updates, email_tips_advice
- SMS preferences: sms_enabled, sms_verification, sms_security_alerts, sms_important_updates
- In-app: in_app_enabled, in_app_sound, in_app_vibration
- Quiet hours: quiet_hours_enabled, quiet_hours_start, quiet_hours_end, timezone
- Do Not Disturb: dnd_enabled, dnd_until

#### `notifications`
Notification history.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `template_id` (UUID, FK → notification_templates)
- `type` (ENUM): push, email, sms, in_app
- `category` (ENUM)
- `title`, `body` (VARCHAR/TEXT)
- `data` (JSONB): Additional payload
- `action_url`, `deep_link`, `image_url` (VARCHAR)
- `status` (ENUM): pending, queued, sent, delivered, failed, read, clicked
- `priority` (ENUM): low, normal, high, urgent
- `error_message` (TEXT)
- `retry_count` (INTEGER)
- Timing: scheduled_at, sent_at, delivered_at, read_at, clicked_at, expires_at

### 9. Analytics

#### `analytics_events`
Event tracking with UTM parameters.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, nullable)
- `session_id` (VARCHAR)
- `event_type`, `event_name`, `event_category` (VARCHAR)
- `properties` (JSONB)
- `page_url`, `referrer_url` (VARCHAR)
- UTM parameters: utm_source, utm_medium, utm_campaign, utm_content, utm_term
- `click_ids` (JSONB): Platform-specific click IDs
- Device info: user_agent, ip_address, device_type, browser, os
- Location: country, region, city
- `created_at` (TIMESTAMP)

#### `user_attribution`
First-touch and last-touch attribution.

**Columns:**
- `user_id` (UUID, PK, FK → users)
- First touch: first_touch_source, first_touch_medium, first_touch_campaign, first_touch_content, first_touch_click_id, first_touch_timestamp, first_touch_landing_page, first_touch_referrer
- Last touch: last_touch_source, last_touch_medium, last_touch_campaign, last_touch_content, last_touch_click_id, last_touch_timestamp
- Registration: registration_timestamp, registration_source, registration_campaign
- Conversion: first_subscription_at, subscription_source
- `attribution_model` (VARCHAR)
- `total_touchpoints` (INTEGER)
- `touchpoint_data` (JSONB)

#### `user_sessions`
User session tracking.

**Columns:**
- `id` (UUID, PK)
- `session_id` (VARCHAR, UNIQUE)
- `user_id` (UUID, FK → users, nullable)
- Session start: started_at, landing_page, referrer_url
- UTM parameters and click_ids
- Device and location info
- Activity: page_views, events_count, duration_seconds
- Session end: ended_at, exit_page
- Conversion: converted, conversion_timestamp

#### `conversion_funnel`
Conversion funnel tracking.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users, nullable)
- `session_id` (VARCHAR)
- Funnel steps (TIMESTAMP): landing_page_view_at, registration_started_at, email_entered_at, password_created_at, registration_completed_at, email_verified_at, profile_started_at, photo_uploaded_at, profile_completed_at, first_swipe_at, first_match_at, first_message_at, subscription_purchased_at
- Time to complete (INTEGER seconds): time_to_register, time_to_verify, time_to_profile, time_to_match, time_to_subscribe
- Drop-off: dropped_at_step, completed
- Attribution: utm_source, utm_campaign

#### `ad_campaign_performance`
Ad campaign metrics.

**Columns:**
- `id` (UUID, PK)
- Campaign identifiers: platform, campaign_id, campaign_name, ad_set_id, ad_set_name, ad_id, ad_name
- UTM parameters
- Metrics: impressions, clicks, spend
- Conversions: registrations, email_verifications, profile_completions, subscriptions
- Calculated metrics: ctr, cpc, cpm, cpa, roas
- `revenue` (DECIMAL)
- `date` (DATE)

**Constraints:**
- UNIQUE [platform, campaign_id, ad_id, date]

#### `engagement_metrics`
Daily user engagement.

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `date` (DATE)
- Activity: swipes_count, likes_given, passes_given, super_likes_given, likes_received, matches_count, messages_sent, messages_received, profile_views
- Sessions: sessions_count, total_time_minutes

**Constraints:**
- UNIQUE [user_id, date]

## Indexes and Performance

### Index Strategy

1. **Primary Keys**: All UUIDs automatically indexed
2. **Foreign Keys**: All FK columns indexed
3. **Lookup Columns**: Status, type, category fields
4. **Timestamps**: created_at, updated_at for time-based queries
5. **Composite Indexes**: Common query patterns
6. **Partial Indexes**: Filtered conditions (e.g., active records only)
7. **JSONB Indexes**: GIN indexes for JSONB columns with frequent queries

### Key Composite Indexes

- `[user_id, created_at]`: User activity timeline
- `[user_id, status]`: Active user records
- `[latitude, longitude]`: Location-based matching
- `[user1_id, user2_id]`: Match lookups
- `[conversation_id, sent_at]`: Message history
- `[platform, date]`: Campaign analytics

### Partial Indexes

```sql
-- Likes and super likes only
CREATE INDEX idx_swipes_like_actions
ON swipes(target_user_id, action)
WHERE action IN ('like', 'super_like');
```

## Triggers and Functions

### 1. Match Activity Trigger
**Table**: `matches`
**Function**: `update_match_activity()`
**Purpose**: Auto-update last_activity_at on any match update

### 2. Conversation Update Trigger
**Table**: `messages`
**Function**: `update_conversation_on_message()`
**Purpose**: Update conversation metadata when new message inserted

### 3. Unread Count Trigger
**Table**: `messages`
**Function**: `reset_unread_count_on_read()`
**Purpose**: Decrement unread count when message is read

### 4. Coin Balance Trigger
**Table**: `coin_transactions`
**Function**: `update_coin_balance()`
**Purpose**: Update coin balance on new transaction

### 5. Boost Activation Trigger
**Table**: `boosts`
**Function**: `activate_boost()`
**Purpose**: Set start_time and end_time when boost is activated

### 6. Auto-Expire Boosts Function
**Function**: `auto_expire_boosts()`
**Purpose**: Mark active boosts as expired when end_time passes

## Data Types

- **UUIDs**: All primary keys use UUID v4 via `gen_random_uuid()`
- **Timestamps**: Stored in UTC, application handles timezone conversion
- **JSONB**: Used for flexible data (arrays, objects, metadata)
- **ENUM**: Used for fixed sets of values (better performance than CHECK constraints)
- **DECIMAL**: Used for monetary values with 2 decimal precision
- **BOOLEAN**: Used for flags and binary states

## Constraints

### Check Constraints
- `coins.balance >= 0`: Non-negative balance
- `user_blocks`: user_id != blocked_user_id
- `matches`: user1_id < user2_id
- `conversations`: user1_id < user2_id

### Unique Constraints
- Email addresses
- Phone numbers (where verified)
- User-specific settings (1-to-1 relationships)
- Swipe pairs (prevent duplicate swipes)
- Match pairs (prevent duplicate matches)

### Foreign Key Constraints
- CASCADE on user deletion for owned data
- SET NULL for references that should persist
- RESTRICT for data integrity requirements

## Performance Recommendations

1. **Connection Pooling**: Use 5-30 connections based on load
2. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
3. **Index Maintenance**: Regular VACUUM and REINDEX
4. **Partitioning**: Consider partitioning for large tables (analytics_events, messages)
5. **Read Replicas**: Use for analytics and reporting queries
6. **Caching**: Redis for frequently accessed data (user profiles, matches)
7. **Archiving**: Archive old messages, events, and transactions

## Security Considerations

1. **Row-Level Security (RLS)**: Consider implementing for multi-tenant isolation
2. **Encryption**: Use pgcrypto for sensitive data
3. **Audit Logging**: Track changes to critical tables
4. **Access Control**: Limit database user permissions
5. **SQL Injection**: Use parameterized queries (enforced by Knex)
6. **Secrets Management**: Store connection strings in secure vaults

---

**Last Updated**: 2025-01-01
**Schema Version**: 1.0.0
**Database**: PostgreSQL 13+
