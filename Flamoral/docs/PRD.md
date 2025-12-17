# Flamoral Dating Platform - Project Requirements Document (PRD)

**Version:** 2.0
**Date:** December 16, 2025
**Status:** Production-Ready Platform
**Document Owner:** Product & Engineering Teams

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Functional Requirements](#2-functional-requirements)
3. [Non-Functional Requirements](#3-non-functional-requirements)
4. [API & Integration Requirements](#4-api--integration-requirements)
5. [Data & Storage Requirements](#5-data--storage-requirements)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Expanded Implementation Steps](#7-expanded-implementation-steps)

---

## 1. System Overview

### 1.1 Purpose and Scope

Flamoral is a world-class dating platform ecosystem featuring iOS, Android, and web applications backed by a scalable microservices architecture. The platform provides comprehensive features expected from leading dating applications including Tinder, Bumble, and Hinge, with additional innovations in AI-powered matching, enhanced safety features, and monetization strategies.

**Core Value Proposition:**
- Location-based discovery and matching
- Real-time messaging with end-to-end encryption
- Video and voice calling capabilities
- AI-powered recommendations and matching
- Multi-tier subscription model with in-app purchases
- Comprehensive safety and moderation features

### 1.2 High-Level Architecture

**Architecture Pattern:** Microservices-inspired, monolith-first approach

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT APPLICATIONS                          │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│   Web App    │ iOS Mobile   │Android Mobile│ Admin Dashboard        │
│   (React)    │(React Native)│(React Native)│ (React)                │
└──────────────┴──────────────┴──────────────┴────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    NGINX API GATEWAY (Port 80/443)                   │
│  Routes: /, /api/*, /graphql, /ws, /static/*                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND MICROSERVICES                           │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ Auth Service │ User Service │Match Service │ Messaging Service      │
│ (Port 3001)  │ (Port 3002)  │ (Port 3004)  │ (Port 3003)           │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│ Media Service│Payment Service│Notification │ Analytics Service      │
│ (Port 3005)  │ (Port 3006)  │ (Port 3007)  │ (Port 3008)           │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│Moderation    │ Realtime     │ Admin Service│ API Gateway            │
│(Port 3009)   │ (Port 3010)  │ (Port 3011)  │ (Port 3000)           │
└──────────────┴──────────────┴──────────────┴────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                   │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ PostgreSQL   │   MongoDB    │    Redis     │  Elasticsearch         │
│ (Primary DB) │ (Messages)   │ (Cache)      │  (Search)              │
└──────────────┴──────────────┴──────────────┴────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
├──────────────┬──────────────┬──────────────┬────────────────────────┤
│ Azure Blob   │   Stripe     │   Twilio     │   SendGrid             │
│ (Storage)    │  (Payments)  │    (SMS)     │    (Email)             │
├──────────────┼──────────────┼──────────────┼────────────────────────┤
│    Agora     │    Sentry    │  Prometheus  │    Grafana             │
│(Video/Voice) │   (Errors)   │  (Metrics)   │  (Dashboards)          │
└──────────────┴──────────────┴──────────────┴────────────────────────┘
```

### 1.3 Major Components

#### Frontend Applications
1. **Web Application** (React 18 + TypeScript + Vite)
   - Desktop-optimized responsive design
   - Progressive Web App (PWA) capabilities
   - Server-side rendering ready
   - Bundle splitting and lazy loading

2. **Mobile Applications** (React Native 0.73)
   - iOS (App Store)
   - Android (Google Play)
   - Shared codebase with platform-specific optimizations
   - Native modules for performance-critical features

3. **Admin Dashboard** (React 18)
   - User management and moderation
   - Analytics and reporting
   - System health monitoring
   - Feature flag management

#### Backend Services (15+ Microservices)

1. **API Gateway** - Request routing, rate limiting, authentication
2. **Auth Service** - Authentication, OAuth, JWT management
3. **User Service** - Profile management, preferences, verification
4. **Matching Service** - Discovery algorithm, swipes, matches
5. **Messaging Service** - Real-time chat, message history
6. **Realtime Service** - WebSocket connections, presence, typing indicators
7. **Media Service** - Photo/video upload, processing, CDN integration
8. **Payment Service** - Subscriptions, in-app purchases, invoices
9. **Notification Service** - Push notifications, email, SMS
10. **Analytics Service** - Event tracking, metrics, reporting
11. **Moderation Service** - Content moderation, user reports, AI scanning
12. **Admin Service** - Admin operations, user management
13. **Advertising Service** - Ad serving, tracking, billing
14. **Automation Service** - Scheduled tasks, background jobs
15. **AI Services** - Recommendation engine, NLP, fraud detection, photo analysis

### 1.4 Key Assumptions and Constraints

**Assumptions:**
- Target users: 18+ adults seeking dating connections
- Initial launch: United States market
- Expected scale: 100,000 users Year 1, 1M users Year 3
- Monetization: Freemium with premium subscriptions and in-app purchases
- Availability target: 99.9% uptime

**Constraints:**
- Budget: Infrastructure cost optimization required
- Compliance: GDPR, CCPA, COPPA, PCI-DSS
- Technology: Azure Cloud infrastructure (can support multi-cloud)
- Timeline: Production-ready platform with iterative enhancements
- Team: Cross-functional product, engineering, DevOps teams

**Technical Constraints:**
- Node.js 20+ for backend services
- PostgreSQL 15 as primary database
- Docker containerization required
- Kubernetes for orchestration
- CI/CD via GitHub Actions

---

## 2. Functional Requirements

### 2.1 Authentication & Onboarding

#### FR-AUTH-001: User Registration
**Description:** Users can create accounts using multiple methods.

**Acceptance Criteria:**
- Email/password registration with validation
- Phone number verification via SMS (Twilio)
- Social login options: Google, Facebook, Apple Sign-In
- Age verification (18+ required)
- Terms of Service and Privacy Policy acceptance required
- Email verification before full access

**Preconditions:**
- User is not already registered
- Valid email/phone number provided
- User is 18 years or older

**Postconditions:**
- User account created in PostgreSQL database
- Verification email/SMS sent
- JWT tokens generated
- User redirected to onboarding flow

**Dependencies:**
- Twilio SMS service
- SendGrid email service
- OAuth providers (Google, Facebook, Apple)

#### FR-AUTH-002: Multi-Step Onboarding
**Description:** New users complete profile setup through guided wizard.

**Steps:**
1. Upload profile photos (minimum 2, maximum 9)
2. Complete bio and basic information
3. Select interests and hobbies
4. Set dating preferences and filters
5. Enable location permissions
6. Configure notification preferences
7. Review safety tips

**Acceptance Criteria:**
- Profile completion percentage tracked
- Cannot skip mandatory steps
- Can save progress and resume later
- Visual progress indicator displayed

#### FR-AUTH-003: Password Reset
**Description:** Users can recover access to their accounts.

**Flow:**
1. User requests password reset via email
2. System sends reset link (expires in 1 hour)
3. User clicks link and enters new password
4. Password validated against strength requirements
5. All existing sessions invalidated
6. User logged in with new credentials

### 2.2 Profile Management

#### FR-PROFILE-001: Profile Information
**Description:** Users can create and manage comprehensive profiles.

**Profile Fields:**
- **Required:** First name, date of birth, gender, bio
- **Optional:** Display name, height, ethnicity, education, occupation, company, school, religion, political views
- **Lifestyle:** Smoking, drinking, exercise, diet preferences
- **Looking for:** Relationship type (relationship, casual, friends, unsure)
- **Privacy:** Show/hide age, show/hide distance

**Acceptance Criteria:**
- Real-time validation of all fields
- Profile completion percentage calculated
- Character limits enforced (bio: 500 chars)
- Age calculated automatically from DOB

#### FR-PROFILE-002: Photo Gallery
**Description:** Users manage photo gallery with ordering and moderation.

**Features:**
- Upload 2-9 photos (JPEG, PNG, HEIC)
- Reorder photos via drag-and-drop
- Set primary photo
- Photos auto-moderated via Azure Content Moderator
- Manual moderation queue for flagged photos
- Photo verification for verified badge

**Acceptance Criteria:**
- Max file size: 10MB per photo
- Minimum resolution: 800x800px
- Photos stored in Azure Blob Storage
- CDN URLs generated automatically
- Inappropriate content blocked

#### FR-PROFILE-003: Interests & Prompts
**Description:** Users select interests and answer profile prompts.

**Features:**
- 100+ interest tags across categories (Sports, Music, Travel, Food, etc.)
- Select up to 10 interests
- Hinge-style prompts with custom answers
- Prompts help ice-breaking conversations

**Acceptance Criteria:**
- Interest tags displayed as chips
- Interests influence matching algorithm
- Prompts limited to 150 characters each

### 2.3 Discovery & Matching

#### FR-MATCH-001: Location-Based Discovery
**Description:** Users discover potential matches based on location and preferences.

**Algorithm Factors:**
- Distance from user (GPS-based)
- Age range preferences
- Gender preferences
- Interest overlap
- Activity level (recently active users prioritized)
- ELO-based compatibility scoring

**Acceptance Criteria:**
- User location updated on app launch
- Discovery queue refreshed automatically
- Distance calculated accurately (km or miles)
- Out-of-range users never shown

**Preconditions:**
- User granted location permissions
- User has completed profile (min 2 photos, bio)
- User preferences configured

**Postconditions:**
- Discovery queue populated with 20+ potential matches
- Profiles displayed in optimal order

#### FR-MATCH-002: Swipe Actions
**Description:** Users interact with discovery profiles via swipe gestures.

**Actions:**
- **Swipe Right / Like:** Express interest
- **Swipe Left / Pass:** Decline match
- **Super Like:** Express strong interest (limited per day)
- **Rewind:** Undo last swipe (Premium feature)

**Free Tier Limits:**
- 50 likes per day
- 1 super like per day
- No rewind capability

**Premium Tier:**
- Unlimited likes
- 5 super likes per week
- Unlimited rewinds

**Acceptance Criteria:**
- Daily limits reset at midnight UTC
- Swipe actions recorded immediately
- Mutual likes trigger match notification
- Animation feedback for all actions

#### FR-MATCH-003: Matching System
**Description:** System creates matches when mutual likes occur.

**Match Creation:**
1. User A likes User B
2. System checks if User B already liked User A
3. If yes, create match record
4. Send "It's a Match!" notification to both users
5. Enable messaging between users

**Acceptance Criteria:**
- Match created within 1 second of second like
- Both users receive real-time notification
- Match appears in conversations list
- Icebreaker message suggestions provided

**Postconditions:**
- Match record in PostgreSQL
- Conversation created in MongoDB
- Push notifications sent to both users

#### FR-MATCH-004: Advanced Filters (Premium)
**Description:** Premium users access advanced discovery filters.

**Filters:**
- Height range
- Education level (High school, Bachelor's, Master's, PhD)
- Religion
- Ethnicity
- Body type
- Smoking preference
- Drinking preference
- Exercise frequency

**Acceptance Criteria:**
- Filters apply immediately to discovery queue
- Filter state persisted
- Free users see upgrade prompt when attempting to use

### 2.4 Messaging & Communication

#### FR-MSG-001: Real-Time Messaging
**Description:** Matched users can exchange messages in real-time.

**Features:**
- Text messages (up to 1000 characters)
- Photo sharing
- GIF support (Giphy integration)
- Voice messages (up to 2 minutes)
- Message reactions (emoji)
- Reply to specific messages
- Message expiration (optional, 24 hours)

**Acceptance Criteria:**
- Messages delivered via WebSocket
- Fallback to HTTP polling if WebSocket unavailable
- End-to-end encryption for all messages
- Delivery and read receipts
- Typing indicators
- Message search within conversation

**Technical Details:**
- WebSocket connection on port 3010
- Messages stored in MongoDB
- E2E encryption using Signal Protocol
- Real-time delivery < 100ms latency

#### FR-MSG-002: Video & Voice Calls
**Description:** Matched users can initiate video and voice calls.

**Provider:** Agora.io

**Features:**
- HD video calls (720p)
- Voice-only calls
- Call duration tracking
- In-call reactions
- Background blur (Premium feature)
- Call recording (with consent, Premium)

**Acceptance Criteria:**
- Both users must consent to call
- Safety tips displayed before first call
- Call quality indicators shown
- Automatic reconnection on network issues
- Maximum call duration: 4 hours

**Preconditions:**
- Both users matched
- Camera/microphone permissions granted
- Stable internet connection (minimum 1 Mbps)

#### FR-MSG-003: Conversation Management
**Description:** Users manage their conversations and matches.

**Features:**
- Conversation list sorted by last message time
- Unread message count badge
- Archive conversations
- Delete conversations (messages retained for recipient)
- Unmatch (removes match, deletes conversation for both)
- Report/block user

**Acceptance Criteria:**
- Unread count accurate in real-time
- Archived conversations hidden from main list
- Unmatch immediately removes from both users
- Block prevents all future contact

### 2.5 Safety & Moderation

#### FR-SAFETY-001: Photo Verification
**Description:** Users verify identity through selfie verification.

**Process:**
1. User requests verification
2. System prompts specific pose (e.g., peace sign)
3. User captures selfie
4. Azure Face API compares to profile photos
5. Manual review if automated check fails
6. Verified badge granted on approval

**Acceptance Criteria:**
- Face detection accuracy > 95%
- Same person verification > 90% confidence
- Manual review completed within 24 hours
- Badge displayed prominently on profile

#### FR-SAFETY-002: User Reporting
**Description:** Users report inappropriate behavior or content.

**Report Categories:**
- Inappropriate photos
- Harassment
- Fake profile
- Spam
- Underage user
- Scam/fraud
- Other (with details)

**Workflow:**
1. User selects report reason
2. Optional details provided
3. Report submitted to moderation queue
4. Moderator reviews within 24 hours
5. Action taken (warning, ban, account deletion)
6. Reporter notified of outcome

**Acceptance Criteria:**
- Reports submitted within 5 seconds
- Reporter remains anonymous
- Reported user cannot see who reported
- Multiple reports prioritized

#### FR-SAFETY-003: Block Functionality
**Description:** Users block others to prevent contact.

**Effects:**
- Blocked user cannot see blocker's profile
- Blocked user cannot message blocker
- Existing match removed
- Both users removed from each other's discovery
- Block is permanent (no unblock for safety)

**Acceptance Criteria:**
- Block takes effect immediately
- No notification sent to blocked user
- Blocker can still report blocked user

#### FR-SAFETY-004: AI Content Moderation
**Description:** Automated moderation of photos and messages.

**Provider:** Azure Content Moderator

**Moderation Checks:**
- **Photos:** Nudity, adult content, violence, offensive symbols
- **Messages:** Profanity, harassment, spam, scam keywords

**Actions:**
- Auto-reject content with high confidence (>90%)
- Queue for manual review (60-90% confidence)
- Auto-approve safe content (<60%)

**Acceptance Criteria:**
- Photos moderated before going live
- Messages flagged in real-time
- False positive rate < 5%
- Manual review within 2 hours

### 2.6 Monetization

#### FR-PAY-001: Subscription Tiers
**Description:** Platform offers tiered subscription plans.

**Tiers:**

**Free Tier:**
- 50 likes per day
- Basic filters (age, distance)
- Match and message
- Standard support

**Premium ($19.99/month or $99.99/year):**
- Unlimited likes
- See who liked you
- Advanced filters
- 5 super likes per week
- Rewind last swipe
- Read receipts
- Ad-free experience
- Passport mode (1 location change/month)

**Premium+ ($29.99/month or $149.99/year):**
- All Premium features
- Profile boost (1 per month)
- Spotlight feature (1 per month)
- Unlimited rewinds
- 10 super likes per week
- Incognito mode
- Advanced analytics
- Priority support
- Unlimited passport

**Acceptance Criteria:**
- Subscription processed via Stripe
- Features unlock immediately upon payment
- Auto-renewal enabled by default
- Cancel anytime (access until period ends)
- Upgrade/downgrade prorated

#### FR-PAY-002: In-App Purchases
**Description:** Users purchase consumable items and boosts.

**Products:**
- **Profile Boost:** 30-min visibility boost ($4.99)
- **Super Likes Pack:** 5 super likes ($4.99), 25 super likes ($19.99)
- **Virtual Coins:** 100 coins ($9.99), 500 coins ($39.99)
- **Spotlight:** Featured profile for 30 minutes ($6.99)

**Coin Usage:**
- 1 coin = 1 super like
- 5 coins = 1 boost
- 10 coins = 1 spotlight

**Acceptance Criteria:**
- Purchases processed securely via Stripe
- Items credited to account immediately
- Purchase history accessible
- Refunds handled per policy (7-day window)

#### FR-PAY-003: Payment Methods
**Description:** Multiple payment methods supported globally.

**Supported Providers:**
- **Stripe:** Credit/debit cards, Google Pay, Apple Pay (US, EU, global)
- **Paystack:** Mobile money, bank transfers (Africa)
- **Flutterwave:** Multiple African payment methods

**Acceptance Criteria:**
- Payment method saved for future use
- PCI-DSS compliant processing
- 3D Secure for card transactions
- Failed payment retry logic
- Invoice generation for all purchases

### 2.7 Analytics & Engagement

#### FR-ANALYTICS-001: User Analytics Dashboard
**Description:** Users view personal engagement statistics.

**Metrics (Premium Feature):**
- Profile views (daily, weekly, monthly)
- Likes received vs. sent
- Match rate percentage
- Response rate
- Average response time
- Top interests matching
- Peak activity times

**Acceptance Criteria:**
- Data updated daily
- Visualizations (charts, graphs)
- Exportable reports (PDF)

#### FR-ANALYTICS-002: Event Tracking
**Description:** System tracks user actions for analytics and recommendations.

**Tracked Events:**
- App launches
- Profile views
- Swipe actions
- Messages sent/received
- Feature usage
- Session duration
- Screen navigation

**Acceptance Criteria:**
- Events logged to analytics service
- Privacy-compliant (no PII in events)
- Stored in Elasticsearch for analysis
- Retention: 90 days

### 2.8 Admin Features

#### FR-ADMIN-001: User Management
**Description:** Admins manage user accounts and moderation.

**Capabilities:**
- Search users by email, name, ID
- View full user profiles
- Suspend/ban users
- Verify users manually
- View user activity logs
- Reset passwords
- Merge duplicate accounts

**Acceptance Criteria:**
- All admin actions logged
- Audit trail for compliance
- Role-based access control

#### FR-ADMIN-002: Moderation Queue
**Description:** Admins review flagged content and reports.

**Queue Management:**
- Sort by priority (high, medium, low)
- Filter by category
- Assign to moderators
- Approve/reject content
- Ban users
- Add notes

**SLA:** 90% of reports reviewed within 24 hours

#### FR-ADMIN-003: Analytics Dashboard
**Description:** Admins view platform-wide analytics.

**Metrics:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- New registrations
- Match rate
- Revenue metrics
- Churn rate
- Top locations

**Acceptance Criteria:**
- Real-time data updates
- Exportable reports
- Custom date ranges
- Drill-down capabilities

---

## 3. Non-Functional Requirements

### 3.1 Security

#### NFR-SEC-001: Authentication & Authorization
**Requirements:**
- JWT-based authentication with 15-minute access token expiry
- Refresh tokens stored as HTTP-only cookies with 7-day expiry
- Refresh token rotation on use
- Argon2id password hashing (minimum 6 characters, 1 uppercase, 1 number, 1 special char)
- Rate limiting: 5 failed login attempts = 15-minute lockout
- Multi-factor authentication (2FA) optional for users

#### NFR-SEC-002: Data Encryption
**Requirements:**
- TLS 1.3 for all data in transit
- AES-256-GCM encryption for data at rest
- End-to-end encryption for messages using Signal Protocol
- Encrypted backups
- Private keys encrypted in database

#### NFR-SEC-003: Security Headers
**Requirements:**
- Content-Security-Policy
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Strict-Transport-Security: max-age=31536000
- Referrer-Policy: strict-origin-when-cross-origin

#### NFR-SEC-004: Input Validation
**Requirements:**
- Server-side validation for all inputs
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization, CSP)
- CSRF tokens for state-changing operations
- File upload validation (type, size, content)

#### NFR-SEC-005: API Security
**Requirements:**
- API rate limiting: 100 requests per 15 minutes (public), 1000 requests per 15 minutes (authenticated)
- DDoS protection via Cloudflare/Azure Front Door
- Service-to-service authentication via API keys
- Request signing for sensitive operations
- IP allowlisting for admin endpoints

### 3.2 Performance

#### NFR-PERF-001: Response Times
**Targets:**
- API response time (p95): < 200ms
- Page load time (web): < 2 seconds
- WebSocket latency: < 100ms
- Database queries: < 50ms average
- Media upload (5MB): < 10 seconds

#### NFR-PERF-002: Throughput
**Targets:**
- Concurrent users: 10,000+
- Requests per second: 1,000+
- Messages per second: 500+
- WebSocket connections: 5,000+

#### NFR-PERF-003: Caching
**Strategy:**
- Redis cache for hot data (sessions, user profiles)
- CDN for static assets and media (Azure CDN / Cloudflare)
- Browser caching with appropriate headers
- API response caching (GET endpoints, 5-minute TTL)
- Database query result caching

#### NFR-PERF-004: Optimization
**Requirements:**
- Database connection pooling (min 2, max 10 per service)
- Database indexes on frequently queried fields
- Lazy loading for images
- Code splitting for frontend bundles
- Minification and compression (Gzip/Brotli)

### 3.3 Scalability

#### NFR-SCALE-001: Horizontal Scaling
**Requirements:**
- Stateless backend services (can run multiple instances)
- Session state in Redis (shared across instances)
- Load balancing via NGINX/Azure Load Balancer
- Auto-scaling based on CPU/memory metrics (HPA)
- Database read replicas for read-heavy operations

#### NFR-SCALE-002: Data Partitioning
**Strategy:**
- PostgreSQL: Horizontal partitioning by user_id for large tables
- MongoDB: Sharding for messages collection
- Redis: Cluster mode for high availability
- Elasticsearch: Index per month for analytics data

#### NFR-SCALE-003: Queue Processing
**Requirements:**
- RabbitMQ for asynchronous task processing
- Multiple worker instances for parallel processing
- Queue priority levels (high, normal, low)
- Dead letter queues for failed tasks
- Exponential backoff retry mechanism

### 3.4 Availability & Reliability

#### NFR-AVAIL-001: Uptime
**Target:** 99.9% uptime (8.76 hours downtime per year)

**Measures:**
- Multi-AZ deployment (Azure Availability Zones)
- Database replication (primary + 2 replicas)
- Automated failover for databases
- Health checks for all services
- Circuit breakers for service dependencies

#### NFR-AVAIL-002: Disaster Recovery
**RTO:** 1 hour (Recovery Time Objective)
**RPO:** 15 minutes (Recovery Point Objective)

**Strategy:**
- Automated daily backups (PostgreSQL, MongoDB)
- Point-in-time recovery enabled
- Geo-redundant storage for media (Azure GRS)
- Infrastructure as Code (Terraform) for quick rebuild
- Documented runbooks for disaster scenarios

#### NFR-AVAIL-003: Monitoring & Alerting
**Requirements:**
- Real-time monitoring (Prometheus + Grafana)
- Error tracking (Sentry)
- Log aggregation (Winston + Elasticsearch)
- Uptime monitoring (external service)
- Alerting via Slack/PagerDuty
- SLA metrics dashboard

### 3.5 Compliance & Data Protection

#### NFR-COMP-001: GDPR Compliance
**Requirements:**
- User consent for data collection
- Data portability (export user data)
- Right to be forgotten (account deletion with data purge)
- Data retention policies (30 days post-deletion)
- Privacy policy and terms of service
- Cookie consent banner
- Data processing agreements with third parties

#### NFR-COMP-002: CCPA Compliance
**Requirements:**
- User data access request handling
- Opt-out of data sale (not applicable, no data sold)
- Privacy notice for California residents
- Data deletion upon request

#### NFR-COMP-003: Age Verification (COPPA)
**Requirements:**
- Age gate on registration (18+ only)
- Date of birth validation
- Photo verification for suspicious underage accounts
- Immediate suspension of accounts found underage

#### NFR-COMP-004: PCI-DSS (Payment Data)
**Requirements:**
- No storage of credit card data (Stripe handles)
- PCI-DSS Level 1 compliance via Stripe
- Tokenization of payment methods
- Secure transmission of payment data
- Regular security audits

#### NFR-COMP-005: Data Residency
**Requirements:**
- Data stored in compliance with local regulations
- EU data stored in EU region (Azure West Europe)
- US data stored in US region (Azure East US)
- Data transfer agreements for cross-border data

### 3.6 Logging & Monitoring

#### NFR-LOG-001: Application Logging
**Requirements:**
- Structured logging (JSON format)
- Log levels: ERROR, WARN, INFO, DEBUG
- Centralized log aggregation (Elasticsearch)
- Log retention: 90 days
- PII redaction from logs
- Correlation IDs for request tracing

#### NFR-LOG-002: Security Logging
**Requirements:**
- Authentication events (login, logout, failed attempts)
- Authorization failures
- Admin actions
- Data access logs
- Security events (suspicious activity)
- Retention: 1 year

#### NFR-LOG-003: Audit Trails
**Requirements:**
- User actions logged (swipes, messages, reports)
- Admin actions logged with user attribution
- Database changes tracked
- Immutable audit logs
- Searchable and exportable

### 3.7 Error Handling

#### NFR-ERROR-001: Error Responses
**Requirements:**
- Consistent error response format (JSON)
- HTTP status codes adhering to standards
- Error codes for client-side handling
- User-friendly error messages
- Detailed error logs (server-side only)
- Stack traces excluded from production responses

#### NFR-ERROR-002: Graceful Degradation
**Requirements:**
- Fallback mechanisms for external service failures
- Cached data served when database unavailable
- Queue messages when messaging service down
- Retry logic with exponential backoff
- Circuit breakers to prevent cascade failures

---

## 4. API & Integration Requirements

### 4.1 Backend APIs

**Total Endpoints:** 300+
**Base URL (Production):** https://api.flamoral.com
**Authentication:** Bearer JWT tokens

#### 4.1.1 Authentication Service (Port 3001)

**Base Path:** `/api/auth`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | Public | Register new user |
| POST | `/login` | Public | User login |
| POST | `/logout` | JWT | User logout |
| POST | `/refresh-token` | Public | Refresh access token |
| POST | `/verify-email` | Public | Verify email address |
| POST | `/resend-verification` | Public | Resend verification email |
| POST | `/forgot-password` | Public | Request password reset |
| POST | `/reset-password` | Public | Reset password |
| GET | `/me` | JWT | Get current user |
| POST | `/validate-token` | Internal | Validate JWT token |

**OAuth Endpoints:**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/oauth/google` | Public | Initiate Google OAuth |
| GET | `/oauth/google/callback` | Public | Google OAuth callback |
| GET | `/oauth/facebook` | Public | Initiate Facebook OAuth |
| GET | `/oauth/facebook/callback` | Public | Facebook OAuth callback |
| GET | `/oauth/apple` | Public | Initiate Apple Sign-In |
| POST | `/oauth/apple/callback` | Public | Apple Sign-In callback |

#### 4.1.2 User Service (Port 3002)

**Base Path:** `/api/users`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/me` | JWT | Get own profile |
| PUT | `/me` | JWT | Update own profile |
| GET | `/:userId` | JWT | Get user profile |
| PUT | `/:userId` | JWT | Update user profile |
| DELETE | `/:userId` | JWT | Delete user account |
| GET | `/me/photos` | JWT | Get own photos |
| POST | `/me/photos` | JWT | Upload photo |
| DELETE | `/me/photos/:photoId` | JWT | Delete photo |
| PUT | `/me/photos/:photoId/primary` | JWT | Set primary photo |
| GET | `/me/preferences` | JWT | Get preferences |
| PUT | `/me/preferences` | JWT | Update preferences |
| GET | `/me/settings` | JWT | Get settings |
| PUT | `/me/settings` | JWT | Update settings |
| PUT | `/me/location` | JWT | Update location |
| POST | `/me/blocks` | JWT | Block user |
| GET | `/me/blocks` | JWT | Get blocked users |
| DELETE | `/me/blocks/:blockedUserId` | JWT | Unblock user |
| POST | `/me/reports` | JWT | Report user |
| POST | `/me/verification` | JWT | Request photo verification |
| GET | `/me/verification` | JWT | Get verification status |

#### 4.1.3 Matching Service (Port 3004)

**Base Path:** `/api/matching`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/discovery/recommendations` | JWT | Get discovery queue |
| POST | `/discovery/search` | JWT | Search users |
| GET | `/discovery/nearby` | JWT | Get nearby users |
| POST | `/likes` | JWT | Like user |
| GET | `/likes/received` | JWT+Premium | Get received likes |
| GET | `/likes/sent` | JWT | Get sent likes |
| POST | `/passes` | JWT | Pass on user |
| POST | `/actions/undo` | JWT+Premium | Undo last action |
| GET | `/matches` | JWT | Get all matches |
| GET | `/matches/count` | JWT | Get match count |
| GET | `/matches/:matchId` | JWT | Get match details |
| DELETE | `/matches/:matchId` | JWT | Unmatch user |
| GET | `/matches/:matchId/compatibility` | JWT+Premium | Get compatibility score |
| POST | `/super-likes` | JWT | Send super like |
| GET | `/super-likes/remaining` | JWT | Get remaining super likes |
| POST | `/boost` | JWT+Premium | Activate profile boost |
| GET | `/boost/status` | JWT | Get boost status |

#### 4.1.4 Messaging Service (Port 3003)

**Base Path:** `/api/messaging`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/conversations` | JWT | Get all conversations |
| POST | `/conversations` | JWT | Create conversation |
| GET | `/conversations/with/:otherUserId` | JWT | Get conversation with user |
| GET | `/conversations/:conversationId` | JWT | Get conversation |
| DELETE | `/conversations/:conversationId` | JWT | Delete conversation |
| PUT | `/conversations/:conversationId/read` | JWT | Mark conversation as read |
| GET | `/conversations/:conversationId/messages` | JWT | Get messages |
| POST | `/messages` | JWT | Send message |
| GET | `/messages/unread-count` | JWT | Get unread count |
| GET | `/messages/:messageId` | JWT | Get message |
| PUT | `/messages/:messageId` | JWT | Update message |
| DELETE | `/messages/:messageId` | JWT | Delete message |
| PUT | `/messages/:messageId/status` | JWT | Update message status |
| GET | `/users/:userId/status` | JWT | Get user online status |

#### 4.1.5 Media Service (Port 3005)

**Base Path:** `/api/media`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/upload/image` | JWT | Upload image |
| POST | `/upload/video` | JWT | Upload video |
| POST | `/upload/batch` | JWT | Batch upload |
| GET | `/user/:userId` | JWT | Get user media |
| GET | `/:mediaId` | JWT | Get media details |
| DELETE | `/:mediaId` | JWT | Delete media |
| GET | `/:mediaId/status` | JWT | Get processing status |
| POST | `/:mediaId/resize` | JWT | Resize image |
| POST | `/:mediaId/thumbnail` | JWT | Generate thumbnail |
| GET | `/:mediaId/url` | JWT | Get media URL |
| GET | `/:mediaId/moderation` | JWT | Get moderation status |
| POST | `/:mediaId/moderation/review` | JWT+Admin | Review moderation |
| GET | `/:mediaId/analytics` | JWT | Get media analytics |
| POST | `/:mediaId/views` | JWT | Track view |

#### 4.1.6 Payment Service (Port 3006)

**Base Path:** `/api/payments`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/subscriptions/plans` | JWT | Get subscription plans |
| GET | `/subscriptions/plans/:planId` | JWT | Get plan details |
| GET | `/subscriptions/me` | JWT | Get active subscription |
| POST | `/subscriptions` | JWT | Create subscription |
| PUT | `/subscriptions/me/upgrade` | JWT | Upgrade subscription |
| DELETE | `/subscriptions/me` | JWT | Cancel subscription |
| POST | `/subscriptions/me/reactivate` | JWT | Reactivate subscription |
| GET | `/payment-methods` | JWT | Get payment methods |
| POST | `/payment-methods` | JWT | Add payment method |
| DELETE | `/payment-methods/:paymentMethodId` | JWT | Delete payment method |
| PUT | `/payment-methods/:paymentMethodId/default` | JWT | Set default payment method |
| GET | `/transactions` | JWT | Get transaction history |
| GET | `/transactions/:transactionId` | JWT | Get transaction details |
| GET | `/purchases/products` | JWT | Get purchasable products |
| POST | `/purchases` | JWT | Purchase product |
| GET | `/purchases/history` | JWT | Get purchase history |
| GET | `/invoices` | JWT | Get invoices |
| GET | `/invoices/:invoiceId/download` | JWT | Download invoice |
| POST | `/webhooks/stripe` | Public | Stripe webhook |
| POST | `/webhooks/paystack` | Public | Paystack webhook |
| POST | `/webhooks/flutterwave` | Public | Flutterwave webhook |
| POST | `/promo-codes/apply` | JWT | Apply promo code |
| POST | `/promo-codes/validate` | JWT | Validate promo code |

#### 4.1.7 Notification Service (Port 3007)

**Base Path:** `/api/notifications`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | JWT | Get all notifications |
| GET | `/unread/count` | JWT | Get unread count |
| PUT | `/read-all` | JWT | Mark all as read |
| GET | `/settings` | JWT | Get notification settings |
| PUT | `/settings` | JWT | Update settings |
| GET | `/:notificationId` | JWT | Get notification |
| PUT | `/:notificationId/read` | JWT | Mark as read |
| DELETE | `/:notificationId` | JWT | Delete notification |
| DELETE | `/` | JWT | Delete all notifications |
| POST | `/push/register` | JWT | Register push token |
| DELETE | `/push/register` | JWT | Unregister push token |
| POST | `/push/test` | JWT | Send test push |
| GET | `/email/preferences` | JWT | Get email preferences |
| PUT | `/email/preferences` | JWT | Update email preferences |

#### 4.1.8 Analytics Service (Port 3008)

**Base Path:** `/api/analytics`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dashboard` | JWT | Get user dashboard |
| GET | `/profile/views` | JWT | Get profile views |
| GET | `/matches/stats` | JWT | Get match statistics |
| GET | `/messages/stats` | JWT | Get message statistics |
| GET | `/likes/stats` | JWT | Get like statistics |
| POST | `/events` | JWT | Track event |
| POST | `/pageviews` | JWT | Track page view |
| POST | `/actions` | JWT | Track action |
| GET | `/engagement` | JWT | Get engagement metrics |
| GET | `/engagement/response-rate` | JWT | Get response rate |
| GET | `/activity/timeline` | JWT | Get activity timeline |
| GET | `/platform/stats` | JWT+Admin | Get platform statistics |
| GET | `/platform/demographics` | JWT+Admin | Get demographics |
| GET | `/platform/revenue` | JWT+Admin | Get revenue metrics |
| GET | `/platform/retention` | JWT+Admin | Get retention metrics |
| GET | `/funnel` | JWT | Get conversion funnel |
| GET | `/ab-tests/:testId` | JWT+Admin | Get A/B test results |
| POST | `/export` | JWT | Export analytics data |

#### 4.1.9 Moderation Service (Port 3009)

**Base Path:** `/api/moderation`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/submit` | JWT | Submit content for moderation |
| GET | `/status/:contentId` | JWT | Get moderation status |
| GET | `/queue` | JWT+Admin | Get moderation queue |
| PUT | `/approve/:contentId` | JWT+Admin | Approve content |
| PUT | `/reject/:contentId` | JWT+Admin | Reject content |
| POST | `/reports` | JWT | Submit report |
| GET | `/reports/me` | JWT | Get my reports |
| GET | `/reports` | JWT+Admin | Get all reports |
| GET | `/reports/:reportId` | JWT+Admin | Get report details |
| PUT | `/reports/:reportId` | JWT+Admin | Update report |
| POST | `/actions/ban` | JWT+Admin | Ban user |
| POST | `/actions/unban` | JWT+Admin | Unban user |
| POST | `/actions/warn` | JWT+Admin | Warn user |
| GET | `/users/:userId/history` | JWT+Admin | Get user moderation history |
| POST | `/scan/text` | JWT | Scan text content |
| POST | `/scan/image` | JWT | Scan image content |
| GET | `/statistics` | JWT+Admin | Get moderation statistics |

#### 4.1.10 Realtime Service (Port 3010)

**WebSocket:** `wss://api.flamoral.com/ws`

**HTTP Endpoints:** `/api/realtime`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | Public | Health check |
| GET | `/ready` | Public | Readiness check |
| GET | `/presence/:userId` | JWT | Get user presence |
| POST | `/presence/batch` | JWT | Get batch presence |
| GET | `/online/users` | JWT | Get online users |
| GET | `/online/count` | JWT | Get online count |
| GET | `/typing/:conversationId` | JWT | Get typing users |
| POST | `/publish/message` | Internal | Publish message event |
| POST | `/publish/read-receipt` | Internal | Publish read receipt |
| POST | `/publish/typing` | Internal | Publish typing indicator |
| GET | `/conversation/:conversationId/participants` | JWT | Get conversation participants |
| POST | `/conversation/join` | JWT | Join conversation |
| POST | `/conversation/leave` | JWT | Leave conversation |

**WebSocket Events:**

**Client → Server:**
- `typing.start` - User starts typing
- `typing.stop` - User stops typing
- `message.read` - User reads message
- `presence.update` - Update user presence
- `ping` - Keep-alive ping

**Server → Client:**
- `message.new` - New message received
- `message.read` - Message was read
- `message.deleted` - Message was deleted
- `typing.start` - User started typing
- `typing.stop` - User stopped typing
- `presence.update` - User presence changed
- `match.new` - New match notification
- `notification.new` - New notification
- `pong` - Keep-alive pong

#### 4.1.11 Admin Service (Port 3011)

**Base Path:** `/api/admin`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users` | JWT+Admin | Get all users |
| GET | `/users/:userId` | JWT+Admin | Get user details |
| PUT | `/users/:userId` | JWT+Admin | Update user |
| POST | `/users/:userId/suspend` | JWT+Admin | Suspend user |
| POST | `/users/:userId/ban` | JWT+Admin | Ban user |
| DELETE | `/users/:userId` | JWT+Admin | Delete user |
| GET | `/stats` | JWT+Admin | Get platform stats |
| GET | `/analytics/users` | JWT+Admin | Get user analytics |
| GET | `/moderation/queue` | JWT+Admin | Get moderation queue |
| POST | `/moderation/:itemId/review` | JWT+Admin | Review moderation item |

### 4.2 Authentication & Authorization Flows

#### 4.2.1 JWT Authentication Flow

```
1. User Login
   ↓
2. POST /api/auth/login { email, password }
   ↓
3. Server validates credentials
   ↓
4. Server generates tokens:
   - Access Token (JWT, 15 min expiry)
   - Refresh Token (UUID, 7 day expiry)
   ↓
5. Server stores refresh token in sessions table
   ↓
6. Response: { accessToken, refreshToken, user }
   ↓
7. Client stores:
   - accessToken in memory/state
   - refreshToken in HTTP-only cookie or secure storage
   ↓
8. Subsequent requests:
   - Authorization: Bearer <accessToken>
   ↓
9. Access token expires
   ↓
10. POST /api/auth/refresh-token { refreshToken }
    ↓
11. Server validates refresh token
    ↓
12. Server generates new access token
    ↓
13. Response: { accessToken }
```

#### 4.2.2 OAuth Flow (Google Example)

```
1. User clicks "Sign in with Google"
   ↓
2. GET /api/oauth/google
   ↓
3. Server redirects to Google OAuth consent screen
   ↓
4. User grants permissions
   ↓
5. Google redirects to callback URL
   ↓
6. GET /api/oauth/google/callback?code=<auth_code>
   ↓
7. Server exchanges auth code for access token
   ↓
8. Server fetches user profile from Google
   ↓
9. Server creates or links account
   ↓
10. Server generates JWT tokens
    ↓
11. Response: Redirect to app with tokens
```

#### 4.2.3 Role-Based Access Control (RBAC)

**Roles:**
- `user` - Standard user (default)
- `moderator` - Content moderator
- `admin` - Platform administrator

**Permissions Matrix:**

| Resource | User | Moderator | Admin |
|----------|------|-----------|-------|
| Own profile | CRUD | CRUD | CRUD |
| Other profiles | R | R | CRUD |
| Messages | CRUD (own) | R (reported) | CRUD (all) |
| Reports | C (submit) | RU (review) | CRUD |
| Moderation queue | - | RU | CRUD |
| Analytics | R (own) | R (own) | R (all) |
| Users | - | RU | CRUD |
| System settings | - | - | CRUD |

### 4.3 External Services & Third-Party Integrations

#### 4.3.1 Azure Cloud Services

**Azure Blob Storage**
- **Purpose:** Store profile photos, media files, documents
- **Configuration:**
  - Container: `flamoral-media-{env}`
  - Access tier: Hot (for recent uploads), Cool (for old media)
  - Redundancy: GRS (Geo-redundant storage)
  - CDN: Azure CDN with custom domain
- **Integration:** `@azure/storage-blob` SDK
- **API Keys:** Stored in Azure Key Vault

**Azure Face API**
- **Purpose:** Photo verification, face detection, age verification
- **Endpoints:**
  - `/detect` - Detect faces in photo
  - `/verify` - Verify same person across photos
  - `/identify` - Identify person (for duplicates)
- **Configuration:**
  - Region: Same as app region
  - Tier: Standard (S0)
- **Integration:** `@azure/cognitiveservices-face` SDK

**Azure Content Moderator**
- **Purpose:** Automated content moderation (images, text)
- **Features:**
  - Image moderation (adult content, violence)
  - Text moderation (profanity, PII)
  - Custom term lists
- **Integration:** `@azure/cognitiveservices-contentmoderator` SDK

#### 4.3.2 Payment Processing

**Stripe**
- **Purpose:** Primary payment processor (US, EU, global)
- **Products:**
  - Subscriptions (monthly, annual)
  - One-time purchases (boosts, coins)
  - Payment methods (cards, Google Pay, Apple Pay)
- **Webhooks:**
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `charge.refunded`
- **Integration:** `stripe` Node SDK
- **Security:** Webhook signature verification

**Paystack**
- **Purpose:** Payment processor for Africa
- **Features:**
  - Mobile money
  - Bank transfers
  - Cards
- **Integration:** `paystack` SDK

**Flutterwave**
- **Purpose:** Alternative payment processor for Africa
- **Features:**
  - Mobile money (M-Pesa, etc.)
  - Bank payments
  - USSD
- **Integration:** `flutterwave-node-v3` SDK

#### 4.3.3 Communication Services

**Twilio**
- **Purpose:** SMS verification, 2FA codes
- **Services:**
  - SMS sending
  - Phone number verification
  - Programmable messaging
- **Integration:** `twilio` Node SDK
- **Rate Limits:** 1 SMS per number per minute (verification)

**SendGrid**
- **Purpose:** Transactional emails
- **Email Types:**
  - Welcome email
  - Email verification
  - Password reset
  - Match notifications
  - Weekly digest
  - Subscription receipts
- **Features:**
  - Dynamic templates
  - Click tracking
  - Bounce handling
  - Unsubscribe management
- **Integration:** `@sendgrid/mail` SDK

**Agora**
- **Purpose:** Video and voice calling
- **Features:**
  - HD video (720p, 1080p)
  - Voice calls
  - Screen sharing
  - Recording
  - Token-based authentication
- **Integration:** Agora SDK (React Native, Web)
- **Token Generation:** Server-side via `agora-access-token` library

#### 4.3.4 Monitoring & Analytics

**Sentry**
- **Purpose:** Error tracking and performance monitoring
- **Configuration:**
  - Source maps uploaded for production
  - Sampling rate: 100% (errors), 10% (transactions)
  - Environment tags: dev, staging, production
  - Release tracking
- **Integration:** `@sentry/node`, `@sentry/react`

**Google Analytics**
- **Purpose:** User behavior analytics
- **Events Tracked:**
  - Page views
  - User signups
  - Swipe actions
  - Matches created
  - Messages sent
  - Subscriptions purchased
- **Integration:** Google Analytics 4 (GA4)

**Prometheus + Grafana**
- **Purpose:** Infrastructure and application metrics
- **Metrics:**
  - HTTP request duration (histogram)
  - Database query time (histogram)
  - Queue length (gauge)
  - Memory/CPU usage (gauge)
  - Custom business metrics
- **Integration:** `prom-client` library
- **Dashboards:** Pre-configured Grafana dashboards

#### 4.3.5 AI & Machine Learning

**Azure Cognitive Services**
- Face API (photo verification)
- Content Moderator (moderation)
- Text Analytics (sentiment analysis)

**Custom ML Models (Future)**
- Recommendation engine (collaborative filtering)
- Fraud detection (anomaly detection)
- NLP for profile matching

---

## 5. Data & Storage Requirements

### 5.1 Core Data Entities and Relationships

#### 5.1.1 PostgreSQL Schema (Primary Database)

**Users Table**
```sql
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  photo_verified BOOLEAN DEFAULT FALSE,
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_expires_at TIMESTAMP,
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
)
```

**Profiles Table**
```sql
profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(50) NOT NULL,
  display_name VARCHAR(50),
  date_of_birth DATE NOT NULL,
  gender VARCHAR(20),
  bio TEXT,
  height_cm INTEGER,
  ethnicity VARCHAR(50),
  smoking VARCHAR(20),
  drinking VARCHAR(20),
  exercise VARCHAR(20),
  education VARCHAR(50),
  occupation VARCHAR(100),
  company VARCHAR(100),
  school VARCHAR(100),
  religion VARCHAR(50),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  location_point GEOGRAPHY(POINT),
  looking_for VARCHAR(20),
  profile_completion INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)
```

**Photos Table**
```sql
photos (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  position INTEGER NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  moderation_status VARCHAR(20) DEFAULT 'pending',
  moderation_flags JSONB,
  moderated_at TIMESTAMP,
  moderated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
)
```

**Swipes Table**
```sql
swipes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- 'like', 'pass', 'super_like'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, target_user_id)
)
```

**Matches Table**
```sql
matches (
  id UUID PRIMARY KEY,
  user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
  matched_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP,
  last_message_by UUID REFERENCES users(id),
  message_count INTEGER DEFAULT 0,
  user1_unmatched BOOLEAN DEFAULT FALSE,
  user2_unmatched BOOLEAN DEFAULT FALSE,
  user1_blocked BOOLEAN DEFAULT FALSE,
  user2_blocked BOOLEAN DEFAULT FALSE,
  CONSTRAINT check_different_users CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
)
```

**Transactions Table**
```sql
transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  stripe_payment_intent_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  payment_status VARCHAR(20) DEFAULT 'pending',
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
)
```

**Additional Tables:**
- `preferences` - User matching preferences
- `interests` & `user_interests` - Interest tags
- `daily_limits` - Free tier daily action limits
- `boosts` - Profile visibility boosts
- `coin_balances` & `coin_transactions` - Virtual currency
- `reports` - User reports
- `blocks` - Blocked users
- `notifications` - Notification history
- `device_tokens` - Push notification tokens
- `sessions` - Refresh token sessions
- `analytics_events` - Analytics tracking

#### 5.1.2 MongoDB Collections (Document Store)

**Messages Collection**
```javascript
{
  _id: ObjectId,
  match_id: UUID,
  sender_id: UUID,
  receiver_id: UUID,
  type: String, // 'text', 'photo', 'voice', 'gif'
  content: String, // Encrypted
  media_url: String,
  read: Boolean,
  read_at: Date,
  delivered: Boolean,
  delivered_at: Date,
  reply_to_message_id: ObjectId,
  reactions: [{
    user_id: UUID,
    emoji: String,
    created_at: Date
  }],
  created_at: Date,
  deleted_at: Date
}

// Indexes
db.messages.createIndex({ match_id: 1, created_at: -1 })
db.messages.createIndex({ sender_id: 1 })
db.messages.createIndex({ receiver_id: 1 })
db.messages.createIndex({ read: 1 })
```

**Conversations Collection**
```javascript
{
  _id: ObjectId,
  match_id: UUID,
  user1_id: UUID,
  user2_id: UUID,
  last_message: {
    content: String,
    sender_id: UUID,
    created_at: Date,
    read: Boolean
  },
  user1_unread_count: Number,
  user2_unread_count: Number,
  user1_typing: Boolean,
  user2_typing: Boolean,
  updated_at: Date
}

// Indexes
db.conversations.createIndex({ match_id: 1 })
db.conversations.createIndex({ user1_id: 1 })
db.conversations.createIndex({ user2_id: 1 })
db.conversations.createIndex({ updated_at: -1 })
```

**Audit Logs Collection**
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

// Indexes
db.audit_logs.createIndex({ user_id: 1 })
db.audit_logs.createIndex({ admin_id: 1 })
db.audit_logs.createIndex({ action: 1 })
db.audit_logs.createIndex({ created_at: -1 })
```

#### 5.1.3 Redis Data Structures (Cache)

**Session Cache**
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

**Online Users**
```
Key: online_users
Type: Sorted Set
Score: timestamp (last activity)
Member: user_id
TTL: None (ephemeral data)
```

**Rate Limiting**
```
Key: rate_limit:{user_id}:{action}
Type: String (counter)
TTL: varies by action (15 min for API, 24 hours for daily limits)
```

**Discovery Queue Cache**
```
Key: discovery:{user_id}
Type: List
Members: [user_ids in recommendation order]
TTL: 1 hour
```

#### 5.1.4 Elasticsearch Indices (Search & Analytics)

**Users Index**
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

**Analytics Index**
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

### 5.2 Persistence, Caching, and Data Lifecycle Rules

#### 5.2.1 Data Persistence Strategy

**PostgreSQL:**
- **Use Case:** Structured, relational data requiring ACID compliance
- **Entities:** Users, profiles, matches, transactions, subscriptions
- **Backup:** Daily full backups + hourly incremental, 30-day retention
- **Replication:** 1 primary + 2 read replicas
- **Connection Pooling:** Min 2, Max 10 connections per service

**MongoDB:**
- **Use Case:** High-volume, schema-flexible data
- **Entities:** Messages, conversations, audit logs
- **Backup:** Continuous backup via MongoDB Atlas, 30-day retention
- **Replication:** 3-node replica set
- **Sharding:** Sharded by user_id for messages collection

**Redis:**
- **Use Case:** Hot data, temporary state, caching
- **Entities:** Sessions, online presence, rate limits, discovery queues
- **Persistence:** RDB snapshots (daily) + AOF (append-only file)
- **Eviction Policy:** LRU (Least Recently Used)
- **Max Memory:** 512MB (dev), 4GB (staging), 16GB (production)

**Azure Blob Storage:**
- **Use Case:** Media files (photos, videos, documents)
- **Redundancy:** GRS (Geo-redundant storage)
- **Access Tiers:** Hot (recent uploads), Cool (>30 days), Archive (>1 year)
- **CDN:** Azure CDN with 24-hour cache TTL
- **Retention:** Permanent (until user deletion)

#### 5.2.2 Caching Strategy

**Cache Layers:**

1. **Application Cache (In-Memory):**
   - User profile data (LRU, 5-minute TTL)
   - Preferences (10-minute TTL)
   - Configuration (30-minute TTL)

2. **Redis Cache:**
   - User sessions (7-day TTL)
   - API responses (5-minute TTL)
   - Discovery queues (1-hour TTL)
   - Online presence (real-time, no TTL)
   - Rate limit counters (varies by action)

3. **CDN Cache:**
   - Static assets (1 year)
   - Media files (24 hours)
   - Profile photos (1 hour, with cache busting on update)

**Cache Invalidation:**
- Write-through for user profile updates
- Time-based expiry for most caches
- Event-based invalidation for critical data (e.g., subscription changes)
- Cache warming for high-traffic data

#### 5.2.3 Data Lifecycle Rules

**User Data:**
- **Active Users:** Data retained indefinitely
- **Inactive Users (90 days):** Automated email reminder
- **Inactive Users (180 days):** Account flagged for review
- **Account Deletion:**
  - Soft delete: 30-day grace period
  - Hard delete: After 30 days, all data permanently purged
  - Exception: Transaction records retained 7 years (legal requirement)

**Messages:**
- **Active Conversations:** Stored indefinitely
- **Deleted Messages:** Soft delete (visible as "deleted" to sender, retained for recipient)
- **Unmatch:** Both users' conversation deleted, messages retained for 30 days (moderation)
- **Account Deletion:** All messages sent by user marked as deleted, messages received retained

**Media Files:**
- **Active Profiles:** Photos stored permanently
- **Deleted Photos:** Moved to archive, purged after 30 days
- **Account Deletion:** All media deleted immediately
- **Reported Content:** Retained for 90 days post-resolution

**Analytics Data:**
- **Raw Events:** 90-day retention in Elasticsearch
- **Aggregated Metrics:** Permanent retention in PostgreSQL
- **Logs:** 90-day retention, archived to cold storage

**Audit Logs:**
- **Retention:** 1 year minimum
- **Compliance:** 7 years for financial transactions
- **Storage:** MongoDB (hot), Azure Archive (cold)

### 5.3 Database Sizing Estimates

#### Year 1 (100,000 users)

| Database | Size | Notes |
|----------|------|-------|
| PostgreSQL | 50 GB | Users, profiles, matches, transactions |
| MongoDB | 100 GB | Messages (avg 50 messages/user) |
| Redis | 10 GB | Sessions, cache |
| Elasticsearch | 20 GB | Search indices, analytics |
| Azure Blob | 500 GB | Photos (avg 5 photos/user @ 1MB each) |
| **Total** | **680 GB** | |

#### Year 3 (1,000,000 users)

| Database | Size | Notes |
|----------|------|-------|
| PostgreSQL | 500 GB | 10x growth |
| MongoDB | 2 TB | Message volume scales super-linearly |
| Redis | 50 GB | 5x growth |
| Elasticsearch | 200 GB | 10x growth |
| Azure Blob | 10 TB | Media scales with engagement |
| **Total** | **~13 TB** | |

### 5.4 Backup & Disaster Recovery

**Backup Strategy:**

**PostgreSQL:**
- Automated daily full backups at 02:00 UTC
- Hourly incremental backups
- Point-in-time recovery enabled
- Geo-redundant backup storage (Azure)
- 30-day retention
- Monthly backups retained for 1 year

**MongoDB:**
- Continuous backup (MongoDB Atlas)
- Point-in-time recovery (within 7 days)
- Geo-redundant snapshots
- 30-day snapshot retention

**Redis:**
- Daily RDB snapshots
- AOF (Append-Only File) for durability
- Replica sets for high availability
- No long-term backups (ephemeral data)

**Azure Blob Storage:**
- Geo-redundant storage (automatic)
- Soft delete enabled (14-day retention)
- Versioning enabled for critical files

**Disaster Recovery:**

**RTO (Recovery Time Objective):** 1 hour
**RPO (Recovery Point Objective):** 15 minutes

**Recovery Procedures:**
1. Automated failover to secondary database replica (< 5 minutes)
2. Restore from backup if primary unrecoverable (< 30 minutes)
3. Rebuild infrastructure from Terraform (< 45 minutes)
4. Restore media from geo-redundant storage (parallel with above)
5. Validate data integrity and service health (< 15 minutes)
6. DNS update to redirect traffic (< 5 minutes)

**Disaster Scenarios:**
- **Database Failure:** Automatic failover to replica
- **Region Outage:** Failover to secondary region (manual trigger)
- **Data Corruption:** Point-in-time restore from backup
- **Complete Infrastructure Loss:** Terraform rebuild + backup restore

---

## 6. User Roles & Permissions

### 6.1 Role Definitions

#### 6.1.1 User Role (Default)

**Description:** Standard platform user seeking dating connections.

**Capabilities:**
- Create and manage own profile
- Upload and manage photos (max 9)
- Set dating preferences
- Discover and swipe on other users
- Match with other users
- Send and receive messages
- Make video/voice calls with matches
- Purchase subscriptions and in-app products
- Report and block users
- Delete own account

**Limitations:**
- Cannot view other users' full profiles without matching
- Cannot message users without matching
- Daily limits on free tier (50 likes, 1 super like)
- Cannot access admin or moderation features

#### 6.1.2 Moderator Role

**Description:** Platform moderator responsible for content review and user safety.

**Inherits:** All user role capabilities

**Additional Capabilities:**
- Access moderation queue
- Review reported content (photos, profiles, messages)
- Approve or reject flagged content
- Warn users for policy violations
- View user moderation history
- Access reported messages and conversations
- View basic platform statistics

**Limitations:**
- Cannot ban or delete users (escalate to admin)
- Cannot access financial data
- Cannot modify user profiles (except moderation status)
- Cannot access system configuration

#### 6.1.3 Admin Role

**Description:** Platform administrator with full system access.

**Inherits:** All moderator role capabilities

**Additional Capabilities:**
- Full user management (view, edit, suspend, ban, delete)
- Access all user profiles and data
- View and manage all transactions
- Access full platform analytics
- Manage subscription plans and pricing
- Configure feature flags
- Access system logs and monitoring
- Manage moderator accounts
- Execute database operations (with audit)
- Configure system settings

**Limitations:**
- Cannot directly access user passwords (hashed)
- Cannot decrypt end-to-end encrypted messages
- All actions logged in audit trail

### 6.2 Access Boundaries and Enforcement Rules

#### 6.2.1 Authentication Requirements

**Public Endpoints (No Auth Required):**
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/verify-email`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/oauth/*` (OAuth flows)
- `POST /api/payments/webhooks/*` (Payment webhooks)
- `GET /health`, `GET /ready` (Health checks)

**Authenticated Endpoints (JWT Required):**
- All `/api/users/*` endpoints
- All `/api/matching/*` endpoints
- All `/api/messaging/*` endpoints
- All `/api/media/*` endpoints
- All `/api/payments/*` endpoints (except webhooks)
- All `/api/notifications/*` endpoints
- All `/api/analytics/*` endpoints (except admin)

**Admin-Only Endpoints (JWT + Admin Role):**
- All `/api/admin/*` endpoints
- `GET /api/analytics/platform/*`
- `POST /api/moderation/actions/*` (ban, unban)
- `GET /api/moderation/statistics`

**Moderator-Only Endpoints (JWT + Moderator/Admin Role):**
- `GET /api/moderation/queue`
- `PUT /api/moderation/approve/:contentId`
- `PUT /api/moderation/reject/:contentId`
- `GET /api/moderation/reports`
- `PUT /api/moderation/reports/:reportId`

#### 6.2.2 Resource Ownership Validation

**Own Resources Only:**
- Users can only modify their own profile (`/users/me`)
- Users can only delete their own photos
- Users can only update their own preferences and settings
- Users can only view their own transaction history
- Users can only access their own analytics dashboard

**Match-Based Access:**
- Users can only message users they're matched with
- Users can only view full profiles of matched users
- Users can only call matched users

**Subscription-Based Access:**
- Premium features require active subscription
- `GET /likes/received` requires Premium or Premium+
- Advanced filters require Premium subscription
- `POST /boost` requires Premium subscription or coins

**Implementation:**
```javascript
// Middleware example
async function requireOwnResource(req, res, next) {
  const { userId } = req.params;
  const authenticatedUserId = req.user.id;

  if (userId !== 'me' && userId !== authenticatedUserId) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Cannot access other users\' resources'
      }
    });
  }

  next();
}

// Route with ownership check
router.put('/users/:userId/profile',
  requireAuth,
  requireOwnResource,
  updateProfile
);
```

#### 6.2.3 Role-Based Access Control (RBAC)

**Middleware Implementation:**
```javascript
function requireRole(allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource'
        }
      });
    }

    next();
  };
}

// Usage
router.get('/admin/users',
  requireAuth,
  requireRole(['admin']),
  getUsers
);

router.get('/moderation/queue',
  requireAuth,
  requireRole(['moderator', 'admin']),
  getModerationQueue
);
```

#### 6.2.4 Subscription Tier Enforcement

**Subscription Check Middleware:**
```javascript
function requireSubscription(requiredTiers) {
  return async (req, res, next) => {
    const user = await getUserWithSubscription(req.user.id);

    // Check if subscription active
    if (user.subscription_expires_at < new Date()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'This feature requires an active subscription',
          requiredTiers
        }
      });
    }

    // Check tier level
    if (!requiredTiers.includes(user.subscription_tier)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_UPGRADE_REQUIRED',
          message: 'This feature requires a higher subscription tier',
          currentTier: user.subscription_tier,
          requiredTiers
        }
      });
    }

    next();
  };
}

// Usage
router.get('/likes/received',
  requireAuth,
  requireSubscription(['premium', 'premium_plus']),
  getReceivedLikes
);
```

#### 6.2.5 Rate Limiting Enforcement

**Rate Limit Rules:**

| Action | Free Tier | Premium | Premium+ |
|--------|-----------|---------|----------|
| API Requests | 100/15min | 1000/15min | 1000/15min |
| Likes per day | 50 | Unlimited | Unlimited |
| Super Likes | 1/day | 5/week | 10/week |
| Rewinds | 0 | Unlimited | Unlimited |
| Photo Uploads | 10/day | 20/day | 20/day |
| Profile Boosts | Pay per use | 1/month | 1/month |

**Implementation:**
```javascript
// Redis-based rate limiter
async function checkRateLimit(userId, action, limit, window) {
  const key = `rate_limit:${userId}:${action}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  if (current > limit) {
    throw new Error('RATE_LIMIT_EXCEEDED');
  }

  return {
    remaining: limit - current,
    resetAt: await redis.ttl(key)
  };
}

// Middleware
async function rateLimitMiddleware(req, res, next) {
  try {
    const user = await getUser(req.user.id);
    const limit = getRateLimitForTier(user.subscription_tier, req.route.action);

    const rateLimit = await checkRateLimit(
      req.user.id,
      req.route.action,
      limit.max,
      limit.window
    );

    res.setHeader('X-RateLimit-Limit', limit.max);
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', rateLimit.resetAt);

    next();
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.'
        }
      });
    }
    throw error;
  }
}
```

#### 6.2.6 Audit Logging

**All Admin Actions Logged:**
- User suspensions/bans
- Account deletions
- Profile modifications
- Moderation decisions
- System configuration changes

**Audit Log Entry:**
```javascript
{
  timestamp: Date,
  admin_id: UUID,
  action: String, // 'user_banned', 'photo_rejected', etc.
  entity_type: String, // 'user', 'photo', 'message', etc.
  entity_id: String,
  changes: {
    before: Object,
    after: Object
  },
  reason: String,
  ip_address: String,
  user_agent: String
}
```

**Audit Trail Access:**
- Admins can view all audit logs
- Users can view audit logs related to their account
- Audit logs are immutable
- Retention: 1 year minimum, 7 years for financial transactions

---

## 7. Expanded Implementation Steps

This section provides a step-by-step breakdown required to build or re-implement each major feature of the Flamoral dating platform. Steps are categorized by domain (Frontend, Backend, Infrastructure, DevOps) with clear validation and acceptance criteria.

### 7.1 Foundation Setup

#### STEP 1: Development Environment Setup

**Objective:** Set up local development environment for all developers.

**Backend Tasks:**
1. Install Node.js 20+
2. Install PostgreSQL 15
3. Install MongoDB 7
4. Install Redis 7
5. Clone repository from GitHub
6. Install dependencies: `yarn install`
7. Copy `.env.example` to `.env.dev` and configure
8. Run database migrations: `yarn migrate:dev`
9. Seed initial data: `yarn seed:dev`
10. Start backend services: `yarn dev:backend`

**Frontend Tasks:**
1. Install Node.js 20+
2. Install React Native CLI (for mobile)
3. Install Xcode (iOS) or Android Studio (Android)
4. Install dependencies: `yarn install`
5. Configure environment variables
6. Start web app: `yarn dev:web`
7. Start mobile app: `yarn dev:mobile`

**Validation:**
- All services start without errors
- Health check endpoints return 200 OK
- Frontend can connect to backend APIs
- Database migrations applied successfully

**Acceptance Criteria:**
- Developer can run full stack locally
- Hot reload works for code changes
- Test suite passes: `yarn test`

---

#### STEP 2: CI/CD Pipeline Setup

**Objective:** Implement automated testing and deployment pipelines.

**GitHub Actions Workflows:**

1. **Unified CI Pipeline** (`.github/workflows/unified-ci.yml`)
   - Trigger: Push to any branch, Pull requests
   - Jobs:
     - Code quality (ESLint, Prettier, TypeScript)
     - Unit tests (15 microservices in parallel)
     - Integration tests (PostgreSQL, Redis, RabbitMQ)
     - Security scans (Gitleaks, TruffleHog, SAST)
     - E2E tests (Playwright, sharded)
     - Docker image builds (no push on PR)
   - Quality Gates:
     - Secret scanning BLOCKS merge
     - ESLint errors BLOCK merge
     - TypeScript errors BLOCK merge
     - Test failures BLOCK merge

2. **CD Pipeline - Development** (`.github/workflows/unified-cd-dev.yml`)
   - Trigger: Push to `develop` branch
   - Jobs:
     - Build Docker images
     - Push to Azure Container Registry
     - Deploy to dev environment (Kubernetes)
     - Run smoke tests
     - Notify team (Slack)

3. **CD Pipeline - Staging** (`.github/workflows/unified-cd-staging.yml`)
   - Trigger: Push to `staging` branch
   - Jobs:
     - Build Docker images
     - Push to ACR
     - Terraform apply (infrastructure updates)
     - Blue-green deployment to staging
     - Run integration tests
     - Run E2E tests against staging
     - Performance tests (K6)
     - DAST security testing (OWASP ZAP)
     - Create release candidate tag

4. **CD Pipeline - Production** (`.github/workflows/unified-cd-production.yml`)
   - Trigger: Manual dispatch (workflow_dispatch)
   - Jobs:
     - Pre-deployment approval (2 reviewers)
     - Backup current state (database + manifests)
     - Build and push Docker images
     - Terraform apply (production)
     - Canary deployment (10% → 25% → 50% → 75% → 100%)
     - Post-deployment validation
     - Create GitHub release
     - Notify team
   - Rollback on failure

**Validation:**
- All workflows execute successfully
- Quality gates enforced
- Deployments succeed to all environments
- Rollback tested and functional

**Acceptance Criteria:**
- CI completes in < 15 minutes
- CD to dev < 10 minutes
- CD to staging < 20 minutes
- CD to production < 30 minutes (with approvals)

---

#### STEP 3: Infrastructure Provisioning

**Objective:** Deploy cloud infrastructure using Infrastructure as Code.

**Terraform Modules:**

1. **Networking Module**
   - Virtual Network (VNet)
   - Subnets (web, app, data, management)
   - Network Security Groups (NSGs)
   - Application Gateway (load balancer)
   - Azure Front Door (CDN)

2. **Compute Module**
   - Azure Kubernetes Service (AKS)
     - 3 node pools (system, application, data)
     - Auto-scaling enabled (HPA)
   - Azure Container Registry (ACR)

3. **Database Module**
   - Azure Database for PostgreSQL Flexible Server
     - High availability (zone-redundant)
     - Read replicas (2)
     - Automated backups
   - Azure Cosmos DB (MongoDB API)
     - Multi-region replication
   - Azure Cache for Redis
     - Clustering enabled
     - Persistence (RDB + AOF)

4. **Storage Module**
   - Azure Blob Storage
     - Hot, Cool, Archive tiers
     - Geo-redundant (GRS)
   - Azure Files (shared storage for Kubernetes)

5. **Security Module**
   - Azure Key Vault (secrets management)
   - Azure Active Directory (AAD)
   - Managed Identities for services
   - Network firewall rules

6. **Monitoring Module**
   - Azure Monitor
   - Application Insights
   - Log Analytics Workspace
   - Azure Sentinel (SIEM)

**Deployment Steps:**
```bash
# Initialize Terraform
cd infrastructure/terraform
terraform init -backend-config=environments/dev/backend.tfvars

# Plan infrastructure changes
terraform plan -var-file=environments/dev/terraform.tfvars

# Apply infrastructure
terraform apply -var-file=environments/dev/terraform.tfvars

# Verify deployment
terraform output
```

**Validation:**
- All resources provisioned successfully
- Networking configured correctly
- Kubernetes cluster accessible
- Databases reachable from cluster
- Secrets stored in Key Vault

**Acceptance Criteria:**
- Infrastructure deployed in < 30 minutes
- All health checks pass
- Cost within budget ($500/month for dev, $2000/month for staging, $5000/month for production)

---

### 7.2 Authentication & User Management

#### STEP 4: User Registration and Authentication

**Backend Tasks:**

1. **Auth Service Setup**
   ```
   backend/services/auth-service/
   ├── src/
   │   ├── controllers/
   │   │   └── auth.controller.ts
   │   ├── services/
   │   │   ├── auth.service.ts
   │   │   ├── jwt.service.ts
   │   │   ├── password.service.ts
   │   │   └── oauth.service.ts
   │   ├── middleware/
   │   │   └── auth.middleware.ts
   │   ├── validators/
   │   │   └── auth.validators.ts
   │   └── routes/
   │       └── auth.routes.ts
   ```

2. **Implement Registration Endpoint**
   - Route: `POST /api/auth/register`
   - Input validation (Joi schema):
     - Email format
     - Password strength (min 6 chars, 1 uppercase, 1 number, 1 special)
     - Date of birth (18+ check)
   - Hash password with Argon2id
   - Create user in PostgreSQL
   - Generate verification token
   - Send verification email via SendGrid
   - Return JWT tokens

3. **Implement Login Endpoint**
   - Route: `POST /api/auth/login`
   - Validate credentials
   - Check account status (active, suspended, banned)
   - Check failed login attempts (rate limit: 5 attempts = 15 min lockout)
   - Generate JWT access token (15 min expiry)
   - Generate refresh token (7 day expiry)
   - Store refresh token in sessions table
   - Return tokens and user object

4. **Implement JWT Refresh**
   - Route: `POST /api/auth/refresh-token`
   - Validate refresh token
   - Check expiration and revocation
   - Generate new access token
   - Rotate refresh token (optional)
   - Return new tokens

5. **Implement OAuth Flows**
   - Google OAuth:
     - Initiate: `GET /api/oauth/google`
     - Callback: `GET /api/oauth/google/callback`
   - Facebook OAuth:
     - Initiate: `GET /api/oauth/facebook`
     - Callback: `GET /api/oauth/facebook/callback`
   - Apple Sign-In:
     - Initiate: `GET /api/oauth/apple`
     - Callback: `POST /api/oauth/apple/callback`
   - Link or create account based on email
   - Return JWT tokens

6. **Implement Password Reset**
   - Forgot Password: `POST /api/auth/forgot-password`
     - Generate reset token (1 hour expiry)
     - Send reset email
   - Reset Password: `POST /api/auth/reset-password`
     - Validate reset token
     - Update password
     - Invalidate all sessions
     - Send confirmation email

**Frontend Tasks:**

1. **Registration Flow (Web & Mobile)**
   - Create registration form
   - Field validation (client-side + server-side)
   - Submit to `POST /api/auth/register`
   - Display success message
   - Redirect to email verification page

2. **Login Flow**
   - Create login form (email/password)
   - Social login buttons (Google, Facebook, Apple)
   - Submit to `POST /api/auth/login`
   - Store access token in memory/state
   - Store refresh token in secure storage (HTTP-only cookie for web, encrypted storage for mobile)
   - Redirect to onboarding or dashboard

3. **Token Management**
   - Implement JWT interceptor for API requests
   - Auto-refresh token when expired
   - Logout: Clear tokens and redirect to login

**Validation:**
- Unit tests for all auth functions
- Integration tests for auth flows
- E2E tests for registration and login
- Security tests (SQL injection, XSS)

**Acceptance Criteria:**
- Users can register via email or social login
- Email verification required before full access
- Login with valid credentials succeeds
- Failed login attempts rate-limited
- JWT tokens validated correctly
- Password reset flow functional
- OAuth flows work for Google, Facebook, Apple

---

#### STEP 5: Profile Management

**Backend Tasks:**

1. **User Service Setup**
   ```
   backend/services/user-service/
   ├── src/
   │   ├── controllers/
   │   │   ├── profile.controller.ts
   │   │   ├── photo.controller.ts
   │   │   └── preferences.controller.ts
   │   ├── services/
   │   │   ├── profile.service.ts
   │   │   ├── photo.service.ts
   │   │   └── preferences.service.ts
   │   └── routes/
   │       ├── profile.routes.ts
   │       ├── photo.routes.ts
   │       └── preferences.routes.ts
   ```

2. **Implement Profile CRUD**
   - Get Own Profile: `GET /api/users/me`
   - Update Profile: `PUT /api/users/me`
     - Validate all fields
     - Calculate profile completion percentage
     - Update location (geography point)
     - Return updated profile
   - Delete Account: `DELETE /api/users/me`
     - Soft delete (30-day grace period)
     - Queue hard delete job
     - Notify user via email

3. **Implement Photo Management**
   - Upload Photo: `POST /api/users/me/photos`
     - Validate file type (JPEG, PNG, HEIC)
     - Validate file size (max 10MB)
     - Upload to Azure Blob Storage
     - Generate thumbnail
     - Submit to Azure Content Moderator
     - Create photo record in database
     - Return photo URL
   - Delete Photo: `DELETE /api/users/me/photos/:photoId`
   - Set Primary Photo: `PUT /api/users/me/photos/:photoId/primary`
   - Reorder Photos: `PUT /api/users/me/photos/reorder`

4. **Implement Preferences Management**
   - Get Preferences: `GET /api/users/me/preferences`
   - Update Preferences: `PUT /api/users/me/preferences`
     - Interested in genders
     - Age range (min, max)
     - Distance range
     - Advanced filters (premium)

**Frontend Tasks:**

1. **Profile Edit Screen**
   - Form fields for all profile data
   - Real-time validation
   - Save button with loading state
   - Profile completion indicator

2. **Photo Gallery**
   - Upload photo button (camera or gallery)
   - Drag-and-drop reordering
   - Set primary photo
   - Delete photo with confirmation

3. **Preferences Screen**
   - Sliders for age range and distance
   - Gender preference selector
   - Advanced filters (premium users only)
   - Save button

**Validation:**
- Unit tests for profile service
- Integration tests for photo upload and moderation
- E2E tests for profile editing

**Acceptance Criteria:**
- Users can create and edit profiles
- Profile completion percentage accurate
- Photos uploaded and moderated successfully
- Preferences saved and applied to discovery
- Profile validation prevents invalid data

---

### 7.3 Discovery & Matching

#### STEP 6: Discovery Algorithm

**Backend Tasks:**

1. **Matching Service Setup**
   ```
   backend/services/matching-service/
   ├── src/
   │   ├── controllers/
   │   │   ├── discovery.controller.ts
   │   │   ├── swipe.controller.ts
   │   │   └── match.controller.ts
   │   ├── services/
   │   │   ├── discovery.service.ts
   │   │   ├── matching.service.ts
   │   │   └── recommendation.service.ts
   │   ├── algorithms/
   │   │   ├── distance.algorithm.ts
   │   │   ├── compatibility.algorithm.ts
   │   │   └── elo.algorithm.ts
   │   └── routes/
   │       ├── discovery.routes.ts
   │       ├── swipe.routes.ts
   │       └── match.routes.ts
   ```

2. **Implement Discovery Endpoint**
   - Route: `GET /api/matching/discovery/recommendations`
   - Algorithm:
     1. Get user preferences (age, distance, gender)
     2. Query PostgreSQL for eligible users:
        - Within distance radius (PostGIS query)
        - Match gender preferences
        - Match age range
        - Not previously swiped
        - Not blocked
        - Active within 30 days
     3. Calculate compatibility score for each candidate:
        - Interest overlap (0-50 points)
        - Activity level (0-20 points)
        - Response rate (0-20 points)
        - ELO rating proximity (0-10 points)
     4. Sort by compatibility score descending
     5. Apply diversity filter (avoid monotony)
     6. Return top 20 users
   - Cache result in Redis (1 hour TTL)

3. **Implement Swipe Actions**
   - Like: `POST /api/matching/likes`
     - Check daily limit (free: 50/day, premium: unlimited)
     - Create swipe record
     - Check for mutual match
     - If match: create match, send notifications
   - Pass: `POST /api/matching/passes`
     - Create swipe record (action: 'pass')
   - Super Like: `POST /api/matching/super-likes`
     - Check super like limit (free: 1/day, premium: 5/week)
     - Deduct from limit
     - Create swipe record (action: 'super_like')
     - Send notification to target user
   - Undo: `POST /api/matching/actions/undo` (Premium)
     - Delete last swipe record
     - If was a match, delete match record

4. **Implement Match Creation**
   - Triggered when mutual like detected
   - Create match record in PostgreSQL
   - Create conversation in MongoDB
   - Send push notifications to both users
   - Publish event to analytics queue

**Frontend Tasks:**

1. **Discovery Screen (Swipe UI)**
   - Fetch discovery queue: `GET /api/matching/discovery/recommendations`
   - Display profile card with:
     - Primary photo (swipeable gallery)
     - Name, age, distance
     - Bio
     - Interests
   - Swipe gestures:
     - Swipe right = Like
     - Swipe left = Pass
     - Tap star = Super Like
   - Animation for match notification

2. **Match List Screen**
   - Fetch matches: `GET /api/matching/matches`
   - Display grid of matched users
   - Tap to open conversation

**Validation:**
- Unit tests for discovery algorithm
- Integration tests for matching logic
- Load tests for discovery performance (< 200ms)

**Acceptance Criteria:**
- Discovery queue returns relevant users
- Swipe actions recorded correctly
- Mutual likes create matches
- Daily limits enforced
- Match notifications delivered in real-time

---

### 7.4 Messaging & Real-Time Communication

#### STEP 7: Real-Time Messaging

**Backend Tasks:**

1. **Messaging Service Setup**
   ```
   backend/services/messaging-service/
   ├── src/
   │   ├── controllers/
   │   │   ├── conversation.controller.ts
   │   │   └── message.controller.ts
   │   ├── services/
   │   │   ├── conversation.service.ts
   │   │   ├── message.service.ts
   │   │   └── encryption.service.ts
   │   └── routes/
   │       ├── conversation.routes.ts
   │       └── message.routes.ts
   ```

2. **Realtime Service Setup (WebSocket)**
   ```
   backend/services/realtime-service/
   ├── src/
   │   ├── server.ts (Socket.io server)
   │   ├── handlers/
   │   │   ├── connection.handler.ts
   │   │   ├── message.handler.ts
   │   │   └── presence.handler.ts
   │   └── middleware/
   │       └── auth.middleware.ts (JWT validation)
   ```

3. **Implement Messaging Endpoints**
   - Send Message: `POST /api/messaging/messages`
     - Validate match exists
     - Encrypt message content (E2E encryption)
     - Store in MongoDB
     - Publish to WebSocket (realtime service)
     - Send push notification if recipient offline
   - Get Messages: `GET /api/messaging/conversations/:conversationId/messages`
     - Fetch from MongoDB
     - Decrypt messages
     - Mark as delivered
     - Return paginated results

4. **Implement WebSocket Server**
   - Connection:
     - Authenticate JWT token
     - Join user-specific room
     - Broadcast presence update
   - Message events:
     - `message.new` - Deliver new message
     - `message.read` - Mark message as read
     - `typing.start` / `typing.stop` - Typing indicators
   - Presence events:
     - `presence.update` - User online/offline status

5. **Implement End-to-End Encryption**
   - Signal Protocol implementation
   - Key generation on user registration
   - Key exchange on first message
   - Message encryption/decryption

**Frontend Tasks:**

1. **Conversation List Screen**
   - Fetch conversations: `GET /api/messaging/conversations`
   - Display sorted by last message time
   - Unread count badge
   - Real-time updates via WebSocket

2. **Message Thread Screen**
   - Fetch messages: `GET /api/messaging/conversations/:conversationId/messages`
   - Display message bubbles (sent/received)
   - Message input field
   - Send button
   - Photo attachment button
   - Real-time message delivery via WebSocket
   - Typing indicators
   - Read receipts

3. **WebSocket Client**
   - Connect to `wss://api.flamoral.com/ws` with JWT
   - Listen for events:
     - `message.new`
     - `message.read`
     - `typing.start` / `typing.stop`
     - `presence.update`
   - Emit events:
     - `typing.start` / `typing.stop`
     - `message.read`

**Validation:**
- Unit tests for encryption/decryption
- Integration tests for messaging flow
- Load tests for WebSocket connections (5000+ concurrent)

**Acceptance Criteria:**
- Messages delivered in real-time (< 100ms latency)
- End-to-end encryption functional
- Typing indicators work
- Read receipts accurate
- Offline users receive push notifications
- WebSocket reconnects automatically on disconnect

---

#### STEP 8: Video & Voice Calls

**Backend Tasks:**

1. **Video Calling Service (Agora Integration)**
   ```
   backend/services/realtime-service/
   ├── src/
   │   ├── services/
   │   │   └── agora.service.ts
   │   └── controllers/
   │       └── video-call.controller.ts
   ```

2. **Implement Call Token Generation**
   - Route: `POST /api/realtime/calls/token`
   - Validate users are matched
   - Generate Agora RTC token (1 hour expiry)
   - Return token and channel name

3. **Implement Call Signaling**
   - WebSocket events:
     - `call.initiate` - User initiates call
     - `call.accept` - Recipient accepts
     - `call.reject` - Recipient rejects
     - `call.end` - Call ended

**Frontend Tasks:**

1. **Video Call Screen**
   - Request token: `POST /api/realtime/calls/token`
   - Initialize Agora SDK
   - Join channel with token
   - Display local and remote video streams
   - Call controls (mute, video off, end call)

2. **Call Notifications**
   - Listen for `call.initiate` event
   - Display incoming call modal
   - Accept or reject

**Validation:**
- Integration tests for token generation
- Manual testing of video/voice calls

**Acceptance Criteria:**
- Users can initiate video calls with matches
- HD video quality (720p)
- Calls connect within 5 seconds
- Call controls functional
- Call history tracked

---

### 7.5 Monetization

#### STEP 9: Subscription Management

**Backend Tasks:**

1. **Payment Service Setup**
   ```
   backend/services/payment-service/
   ├── src/
   │   ├── controllers/
   │   │   ├── subscription.controller.ts
   │   │   ├── payment.controller.ts
   │   │   └── webhook.controller.ts
   │   ├── services/
   │   │   ├── stripe.service.ts
   │   │   ├── paystack.service.ts
   │   │   └── subscription.service.ts
   │   └── routes/
   │       ├── subscription.routes.ts
   │       ├── payment.routes.ts
   │       └── webhook.routes.ts
   ```

2. **Implement Subscription Endpoints**
   - Get Plans: `GET /api/payments/subscriptions/plans`
   - Create Subscription: `POST /api/payments/subscriptions`
     - Create Stripe customer if not exists
     - Create subscription in Stripe
     - Update user subscription tier in database
     - Return subscription details
   - Cancel Subscription: `DELETE /api/payments/subscriptions/me`
     - Cancel in Stripe (at period end)
     - Send cancellation confirmation email

3. **Implement Stripe Webhooks**
   - Route: `POST /api/payments/webhooks/stripe`
   - Verify webhook signature
   - Handle events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Update database accordingly
   - Send notifications to user

4. **Implement In-App Purchases**
   - Get Products: `GET /api/payments/purchases/products`
   - Purchase Product: `POST /api/payments/purchases`
     - Process payment via Stripe
     - Credit coins or activate boost
     - Create transaction record

**Frontend Tasks:**

1. **Subscription Plans Screen**
   - Fetch plans: `GET /api/payments/subscriptions/plans`
   - Display plan cards (Free, Premium, Premium+)
   - Feature comparison table
   - Subscribe button for each plan

2. **Checkout Flow**
   - Stripe Elements for payment method
   - Submit to `POST /api/payments/subscriptions`
   - Display success confirmation

3. **Subscription Management Screen**
   - Display current plan and expiry
   - Upgrade/downgrade buttons
   - Cancel subscription button
   - Payment history

**Validation:**
- Unit tests for Stripe integration
- Integration tests for subscription flow
- Webhook tests (use Stripe CLI)

**Acceptance Criteria:**
- Users can subscribe to Premium or Premium+
- Subscriptions auto-renew
- Cancellations processed correctly
- Webhooks update database accurately
- Payment failures handled gracefully

---

### 7.6 Safety & Moderation

#### STEP 10: Content Moderation

**Backend Tasks:**

1. **Moderation Service Setup**
   ```
   backend/services/moderation-service/
   ├── src/
   │   ├── controllers/
   │   │   ├── moderation.controller.ts
   │   │   └── report.controller.ts
   │   ├── services/
   │   │   ├── azure-moderator.service.ts
   │   │   ├── moderation.service.ts
   │   │   └── report.service.ts
   │   └── routes/
   │       ├── moderation.routes.ts
   │       └── report.routes.ts
   ```

2. **Implement Automated Photo Moderation**
   - Triggered on photo upload
   - Submit to Azure Content Moderator
   - Parse moderation result:
     - Adult content score > 0.9 = Auto-reject
     - Adult content score 0.6-0.9 = Manual review queue
     - Adult content score < 0.6 = Auto-approve
   - Update photo moderation_status

3. **Implement Manual Moderation Queue**
   - Get Queue: `GET /api/moderation/queue` (Admin/Moderator)
   - Approve Content: `PUT /api/moderation/approve/:contentId`
   - Reject Content: `PUT /api/moderation/reject/:contentId`
     - Send notification to user
     - Delete photo if rejected

4. **Implement User Reporting**
   - Submit Report: `POST /api/moderation/reports`
   - Get Reports: `GET /api/moderation/reports` (Admin/Moderator)
   - Review Report: `PUT /api/moderation/reports/:reportId`
   - Take Action:
     - Warn user
     - Suspend account (temporary)
     - Ban account (permanent)

**Frontend (Admin Dashboard):**

1. **Moderation Queue Screen**
   - Fetch queue: `GET /api/moderation/queue`
   - Display flagged content
   - Approve/Reject buttons
   - Notes field

2. **Reports Screen**
   - Fetch reports: `GET /api/moderation/reports`
   - Filter by category
   - Review and take action

**Validation:**
- Integration tests for Azure Moderator
- Manual testing of moderation flow

**Acceptance Criteria:**
- Photos auto-moderated on upload
- Flagged content queued for manual review
- Moderators can approve/reject content
- Users can report inappropriate behavior
- Reports reviewed within 24 hours (SLA)

---

### 7.7 Analytics & Monitoring

#### STEP 11: Analytics Implementation

**Backend Tasks:**

1. **Analytics Service Setup**
   ```
   backend/services/analytics-service/
   ├── src/
   │   ├── controllers/
   │   │   ├── events.controller.ts
   │   │   └── dashboard.controller.ts
   │   ├── services/
   │   │   ├── tracking.service.ts
   │   │   └── aggregation.service.ts
   │   └── routes/
   │       ├── events.routes.ts
   │       └── dashboard.routes.ts
   ```

2. **Implement Event Tracking**
   - Track Event: `POST /api/analytics/events`
   - Store in Elasticsearch
   - Events tracked:
     - User registration
     - Profile views
     - Swipe actions
     - Matches created
     - Messages sent
     - Subscriptions purchased

3. **Implement User Analytics Dashboard**
   - Get Dashboard: `GET /api/analytics/dashboard`
   - Metrics:
     - Profile views (last 7 days, 30 days)
     - Likes received vs. sent
     - Match rate
     - Response rate
   - Aggregate from Elasticsearch

4. **Implement Platform Analytics (Admin)**
   - Get Platform Stats: `GET /api/analytics/platform/stats`
   - Metrics:
     - Daily Active Users (DAU)
     - Monthly Active Users (MAU)
     - New registrations
     - Match rate
     - Revenue metrics
   - Aggregate from PostgreSQL and Elasticsearch

**Frontend Tasks:**

1. **User Analytics Dashboard** (Premium Feature)
   - Fetch dashboard data
   - Display charts (line, bar, pie)
   - Exportable reports

2. **Admin Analytics Dashboard**
   - Fetch platform stats
   - Real-time metrics
   - Custom date ranges
   - Drill-down capabilities

**Validation:**
- Unit tests for aggregation logic
- Load tests for analytics queries

**Acceptance Criteria:**
- Events tracked accurately
- User dashboard displays correct metrics
- Admin dashboard shows platform-wide stats
- Queries perform well (< 1 second)

---

#### STEP 12: Monitoring & Alerting

**Backend Tasks:**

1. **Prometheus Integration**
   - Install `prom-client` library
   - Expose `/metrics` endpoint on each service
   - Metrics:
     - HTTP request duration (histogram)
     - HTTP request count (counter)
     - Database query time (histogram)
     - Active WebSocket connections (gauge)
     - Queue length (gauge)
     - Memory usage (gauge)
     - CPU usage (gauge)

2. **Grafana Dashboards**
   - Create dashboards:
     - System Overview
     - API Performance
     - Database Metrics
     - WebSocket Connections
     - Business KPIs
   - Set up alerts:
     - API latency > 1 second
     - Error rate > 1%
     - Database CPU > 80%
     - Queue length > 1000

3. **Sentry Integration**
   - Initialize Sentry in each service
   - Source maps uploaded for frontend
   - Error tracking with stack traces
   - Performance monitoring (transactions)

4. **Logging Strategy**
   - Winston logger configured
   - Structured JSON logging
   - Log levels: ERROR, WARN, INFO, DEBUG
   - Centralized logging to Elasticsearch
   - PII redaction from logs

**Validation:**
- Metrics visible in Prometheus
- Dashboards display correctly in Grafana
- Alerts trigger correctly
- Errors tracked in Sentry

**Acceptance Criteria:**
- All services instrumented with metrics
- Grafana dashboards operational
- Alerts configured and tested
- Logs centralized and searchable

---

### 7.8 Testing & Quality Assurance

#### STEP 13: Automated Testing

**Test Suites:**

1. **Unit Tests**
   - Framework: Jest
   - Coverage target: > 80%
   - Test all service functions
   - Mock external dependencies
   - Run on every commit

2. **Integration Tests**
   - Framework: Jest + Supertest
   - Test API endpoints
   - Use test database (Docker Compose)
   - Test database interactions
   - Run on CI pipeline

3. **End-to-End Tests**
   - Framework: Playwright
   - Test user flows:
     - Registration and login
     - Profile creation
     - Swiping and matching
     - Messaging
     - Subscription purchase
   - Multi-browser testing (Chromium, Firefox, WebKit)
   - Sharded execution for speed

4. **Performance Tests**
   - Framework: K6
   - Load tests:
     - Auth service: 1000 req/s
     - Matching service: 500 req/s
     - Messaging service: 500 req/s
     - WebSocket: 5000 concurrent connections
   - Stress tests: Increase load until failure
   - Spike tests: Sudden traffic spikes

5. **Security Tests**
   - SAST: CodeQL, Semgrep
   - Dependency scanning: Snyk
   - Secret scanning: Gitleaks, TruffleHog
   - DAST: OWASP ZAP
   - Penetration testing (manual, periodic)

**Validation:**
- All test suites pass
- Coverage meets targets
- Performance benchmarks achieved

**Acceptance Criteria:**
- Unit tests: > 80% coverage
- Integration tests: All API endpoints tested
- E2E tests: All critical user flows tested
- Performance tests: Meet targets (< 200ms API, 5000+ WebSocket)
- Security tests: No high/critical vulnerabilities

---

### 7.9 Deployment & Operations

#### STEP 14: Production Deployment

**Pre-Deployment Checklist:**
- [ ] All tests passing
- [ ] Security scans clean
- [ ] Performance tests meet targets
- [ ] Database migrations tested
- [ ] Infrastructure validated
- [ ] Secrets configured in Key Vault
- [ ] DNS configured
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring and alerting active
- [ ] Runbooks documented
- [ ] Rollback plan prepared
- [ ] Stakeholders notified

**Deployment Steps:**

1. **Infrastructure Deployment**
   ```bash
   cd infrastructure/terraform
   terraform plan -var-file=environments/production/terraform.tfvars
   terraform apply -var-file=environments/production/terraform.tfvars
   ```

2. **Database Migrations**
   ```bash
   # Run migrations on production database
   yarn migrate:production
   ```

3. **Build and Push Docker Images**
   ```bash
   # Triggered by CD pipeline
   # Build all service images
   # Push to Azure Container Registry
   # Tag with release version
   ```

4. **Kubernetes Deployment**
   ```bash
   # Deploy via Helm charts
   helm upgrade --install flamoral ./infrastructure/helm/flamoral \
     --namespace production \
     --values ./infrastructure/helm/flamoral/values-production.yaml
   ```

5. **Post-Deployment Validation**
   - Run smoke tests
   - Check health endpoints
   - Verify metrics in Grafana
   - Monitor error rates in Sentry
   - Test critical user flows manually

6. **Enable Traffic**
   - Canary deployment: Route 10% traffic to new version
   - Monitor for 15 minutes
   - Gradually increase: 25% → 50% → 75% → 100%
   - Rollback if errors detected

**Rollback Procedure:**
```bash
# Helm rollback to previous release
helm rollback flamoral --namespace production

# Restore database from backup if needed
# (Documented in runbooks)
```

**Validation:**
- All services healthy
- No errors in logs
- Metrics within normal ranges
- User-facing features functional

**Acceptance Criteria:**
- Production deployment successful
- Zero downtime during deployment
- All services responding
- Users can access platform
- No critical errors

---

#### STEP 15: Post-Launch Operations

**Ongoing Tasks:**

1. **Monitoring & Alerting**
   - Daily review of Grafana dashboards
   - Weekly review of error trends (Sentry)
   - Monthly capacity planning

2. **Incident Response**
   - On-call rotation for 24/7 coverage
   - Incident management via PagerDuty
   - Post-incident reviews (PIRs)
   - Update runbooks based on learnings

3. **Maintenance**
   - Security patches applied weekly
   - Dependency updates monthly
   - Database optimization quarterly
   - Infrastructure cost optimization quarterly

4. **Feature Releases**
   - Feature flags for gradual rollouts
   - A/B testing for new features
   - User feedback collection
   - Iterative improvements

5. **Compliance**
   - GDPR data export requests (< 30 days)
   - GDPR deletion requests (< 30 days)
   - Security audits annually
   - Penetration testing bi-annually

**Validation:**
- SLA met: 99.9% uptime
- Incident response time < 15 minutes
- Mean time to resolution < 2 hours

**Acceptance Criteria:**
- Platform stable and performant
- User satisfaction > 4.5/5
- Compliance maintained
- Continuous improvement culture

---

## 8. Appendices

### Appendix A: Technology Stack Summary

**Frontend:**
- React 18 (Web), React Native 0.73 (Mobile)
- TypeScript 5.3
- Redux Toolkit (State Management)
- Vite (Build Tool - Web)
- Tailwind CSS (Styling - Web)

**Backend:**
- Node.js 20
- Express.js 4.18
- TypeScript 5.3
- Socket.io (WebSocket)
- GraphQL (Apollo Server 4)
- JWT (Authentication)

**Databases:**
- PostgreSQL 15 (Primary)
- MongoDB 7 (Messages)
- Redis 7 (Cache)
- Elasticsearch 8 (Search, Analytics)

**Infrastructure:**
- Azure Cloud (Kubernetes, Blob Storage, databases)
- Docker & Docker Compose
- Kubernetes (AKS)
- Terraform (IaC)
- GitHub Actions (CI/CD)

**Third-Party Services:**
- Stripe, Paystack, Flutterwave (Payments)
- Twilio (SMS)
- SendGrid (Email)
- Agora (Video/Voice)
- Azure Content Moderator (AI Moderation)
- Azure Face API (Photo Verification)
- Sentry (Error Tracking)
- Prometheus + Grafana (Monitoring)

---

### Appendix B: Environment Variables Reference

See `.env.example` files in root and service directories.

**Critical Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `STRIPE_SECRET_KEY` - Stripe API key
- `AZURE_STORAGE_CONNECTION_STRING` - Azure Blob Storage
- `AZURE_FACE_API_KEY` - Azure Face API
- `AZURE_CONTENT_MODERATOR_KEY` - Azure Content Moderator
- `TWILIO_ACCOUNT_SID` & `TWILIO_AUTH_TOKEN` - Twilio
- `SENDGRID_API_KEY` - SendGrid
- `AGORA_APP_ID` & `AGORA_APP_CERTIFICATE` - Agora
- `SENTRY_DSN` - Sentry

---

### Appendix C: Port Allocation

| Service | Port | Purpose |
|---------|------|---------|
| API Gateway | 3000 | Main entry point |
| Auth Service | 3001 | Authentication |
| User Service | 3002 | User management |
| Messaging Service | 3003 | Messaging |
| Matching Service | 3004 | Discovery & matching |
| Media Service | 3005 | Media upload |
| Payment Service | 3006 | Payments |
| Notification Service | 3007 | Notifications |
| Analytics Service | 3008 | Analytics |
| Moderation Service | 3009 | Moderation |
| Realtime Service | 3010 | WebSocket |
| Admin Service | 3011 | Admin operations |

---

### Appendix D: API Response Formats

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }
  }
}
```

---

### Appendix E: Glossary

- **DAU:** Daily Active Users
- **MAU:** Monthly Active Users
- **ARPU:** Average Revenue Per User
- **LTV:** Lifetime Value
- **CAC:** Customer Acquisition Cost
- **RTO:** Recovery Time Objective
- **RPO:** Recovery Point Objective
- **GDPR:** General Data Protection Regulation
- **CCPA:** California Consumer Privacy Act
- **PCI-DSS:** Payment Card Industry Data Security Standard
- **E2E:** End-to-End
- **JWT:** JSON Web Token
- **RBAC:** Role-Based Access Control
- **CDN:** Content Delivery Network
- **IaC:** Infrastructure as Code

---

**END OF DOCUMENT**

---

**Document Status:** Complete
**Next Steps:** Review, approve, and begin implementation
**Maintained By:** Product & Engineering Teams
**Last Updated:** December 16, 2025
