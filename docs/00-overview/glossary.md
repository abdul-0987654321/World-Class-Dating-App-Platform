# Flamoral Glossary

> **Purpose**: Standard terminology used across the platform. Use these terms consistently in code, docs, and communication.

## User & Account Terms

| Term | Definition |
|------|------------|
| **User** | A registered account on the platform |
| **Profile** | The public-facing information about a user (photos, bio, interests) |
| **Preferences** | A user's desired characteristics for potential matches (age range, distance, genders) |
| **Session** | An authenticated login session with access and refresh tokens |
| **Role** | Permission level: `user`, `moderator`, `admin`, `support` |
| **Entitlements** | Features and limits available to a user based on subscription tier |

## Discovery & Matching Terms

| Term | Definition |
|------|------------|
| **Discovery Feed** | The queue of potential matches shown to a user |
| **Candidate** | A user who appears in another user's discovery feed |
| **Like** | A positive action indicating interest in a candidate |
| **Pass** | A negative action indicating no interest in a candidate |
| **Super-Like** | A premium like that notifies the recipient and stands out |
| **Match** | Created when two users mutually like each other |
| **Unmatch** | Dissolving a match, removing the connection |
| **Rewind** | Undoing the last like/pass action (premium feature) |
| **Boost** | Temporarily increasing profile visibility in others' feeds |

## Messaging Terms

| Term | Definition |
|------|------------|
| **Conversation** | A message thread between two matched users |
| **Message** | A single communication (text, image, voice) within a conversation |
| **Attachment** | Media file (image, voice note) attached to a message |
| **Read Receipt** | Indicator that a message has been seen (premium feature) |
| **Typing Indicator** | Real-time signal that the other user is composing a message |
| **Presence** | Online/offline/away status of a user |

## Verification Terms

| Term | Definition |
|------|------------|
| **Verification** | Process of confirming user identity |
| **Verification Level** | Degree of verification: `email`, `phone`, `id`, `selfie`, `liveness`, `video`, `biometric` |
| **Verification Request** | A user's initiated verification attempt |
| **Verification Artifact** | Document or media uploaded for verification (ID photo, selfie) |
| **Verified Badge** | Visual indicator that a user has completed verification |
| **Liveness Check** | Real-time video verification that the user is a real person |

## Moderation Terms

| Term | Definition |
|------|------------|
| **Report** | A user's complaint about another user or content |
| **Moderation Case** | An investigation triggered by reports or automated detection |
| **Moderation Action** | Response to a case: warn, restrict, suspend, ban |
| **Enforcement Event** | Audit record of a moderation action taken |
| **Appeal** | A user's request to review a moderation decision |
| **Block** | User-initiated action to prevent another user from contacting them |

## Subscription Terms

| Term | Definition |
|------|------------|
| **Plan** | A subscription tier (Free, Plus, Premium) |
| **Subscription** | A user's active plan and billing status |
| **Trial** | Time-limited access to premium features |
| **Grace Period** | Time after failed payment before downgrade (3 days) |
| **Entitlements Snapshot** | Current limits and features for a user |

## Technical Terms

| Term | Definition |
|------|------------|
| **Correlation ID** | UUID linking all logs/traces for a single request |
| **Idempotency Key** | Client-provided key to prevent duplicate operations |
| **Access Token** | Short-lived JWT for API authentication (15 min) |
| **Refresh Token** | Long-lived token to obtain new access tokens (7 days) |
| **Webhook** | HTTP callback from external service (e.g., Stripe) |
| **DLQ (Dead Letter Queue)** | Queue for failed background jobs |

## Status Codes

### Verification Status
| Status | Meaning |
|--------|---------|
| `not_started` | User has not initiated verification |
| `pending` | Awaiting document upload |
| `in_review` | Documents submitted, under review |
| `approved` | Verification successful |
| `denied` | Verification failed |
| `expired` | Verification lapsed, needs re-verification |

### Subscription Status
| Status | Meaning |
|--------|---------|
| `active` | Subscription in good standing |
| `trialing` | In trial period |
| `past_due` | Payment failed, in grace period |
| `canceled` | User canceled, access until period end |

### Message Status
| Status | Meaning |
|--------|---------|
| `sending` | Message in transit |
| `sent` | Delivered to server |
| `delivered` | Received by recipient device |
| `read` | Opened by recipient |
| `failed` | Delivery failed |

### Call Status
| Status | Meaning |
|--------|---------|
| `requested` | Call initiated, awaiting response |
| `ringing` | Recipient being notified |
| `active` | Call in progress |
| `ended` | Call completed normally |
| `rejected` | Recipient declined |
| `missed` | No answer |

### Media Status
| Status | Meaning |
|--------|---------|
| `pending_scan` | Uploaded, awaiting content scan |
| `approved` | Passed content moderation |
| `rejected` | Failed content moderation |

## Report Categories

| Category | Description |
|----------|-------------|
| `harassment` | Unwanted, aggressive, or threatening behavior |
| `scam` | Fraudulent activity or deception |
| `impersonation` | Pretending to be someone else |
| `underage` | User appears to be under 18 |
| `spam` | Promotional or repetitive unwanted content |
| `nudity` | Explicit content violating guidelines |
| `violence` | Threats or depictions of violence |
| `hate` | Discrimination based on protected characteristics |

## Severity Levels

| Level | Response Time | Description |
|-------|---------------|-------------|
| SEV-1 | Immediate | Core functionality broken, user-facing outage |
| SEV-2 | 1 hour | Major feature degraded, significant user impact |
| SEV-3 | 4 hours | Minor feature issue, workaround available |
| SEV-4 | Next sprint | Cosmetic or non-urgent issue |
