# Flamoral - Complete Product Specification

**Version**: 2.0.0
**Date**: November 23, 2025
**Status**: Production Ready

---

## Executive Summary

Flamoral is a world-class dating application ecosystem featuring iOS, Android, and web applications, backed by a scalable microservices architecture and comprehensive admin dashboard. The platform incorporates all modern features expected from leading global dating apps including Tinder, Bumble, and Hinge.

---

## 1. Feature Specification

### 1.1 Core Features (Must Have)

#### Authentication & Onboarding
- ✅ Email/password registration
- ✅ Phone number verification (Twilio)
- ✅ Social login (Google, Facebook, Apple)
- ✅ Multi-step onboarding wizard
- ✅ Profile photo upload (4-9 photos)
- ✅ Bio and interest tags
- ✅ Age verification (18+ required)
- ✅ Location permissions and setup
- ✅ Push notification preferences

#### Profile Management
- ✅ Complete profile CRUD operations
- ✅ Photo gallery with ordering
- ✅ Profile prompts (Hinge-style)
- ✅ Lifestyle indicators (smoking, drinking, exercise)
- ✅ Education and job information
- ✅ Height, religion, ethnicity
- ✅ Looking for (relationship type)
- ✅ Profile completion percentage
- ✅ Profile verification badges
- ✅ Privacy controls

#### Discovery & Matching
- ✅ Location-based discovery (geolocation)
- ✅ Swipe interface (like/pass)
- ✅ Super likes (limited per day)
- ✅ Rewind last swipe (premium)
- ✅ Advanced filters:
  - Age range
  - Distance radius
  - Height
  - Education level
  - Religion
  - Ethnicity
  - Smoking/drinking preferences
- ✅ Compatibility scoring algorithm
- ✅ Mutual matching system
- ✅ Daily match recommendations
- ✅ Top picks feature

#### Messaging & Communication
- ✅ Real-time text messaging (Socket.io)
- ✅ Read receipts and typing indicators
- ✅ Photo/image sharing in chat
- ✅ GIF support
- ✅ Voice messages
- ✅ Video chat (Agora)
- ✅ Voice calls (Agora)
- ✅ Icebreaker questions
- ✅ Message reactions/emoji
- ✅ Conversation search
- ✅ Conversation archiving
- ✅ Message expiration (optional)

#### Safety & Moderation
- ✅ Photo verification (selfie + AI)
- ✅ Profile verification badges
- ✅ User reporting system
- ✅ Block/unmatch functionality
- ✅ AI content moderation
- ✅ Manual moderation queue
- ✅ Safety tips and guidelines
- ✅ Emergency contact feature
- ✅ Share your date feature
- ✅ Video call safety screening
- ✅ Offensive content detection
- ✅ Fake profile detection

#### Monetization
- ✅ Free tier with limitations
- ✅ Premium subscription (monthly/yearly)
- ✅ Premium+ subscription
- ✅ Virtual coins/credits
- ✅ Profile boosts (visibility boost)
- ✅ Super likes (purchase packs)
- ✅ Spotlight feature
- ✅ See who liked you
- ✅ Unlimited likes
- ✅ Advanced filters
- ✅ Read receipts
- ✅ Rewind feature
- ✅ Passport mode (change location)

### 1.2 Advanced Features

#### Social Features
- ✅ Match suggestions based on mutual friends
- ✅ Instagram integration
- ✅ Spotify integration (music taste matching)
- ✅ Shared interest discovery
- ✅ Event-based matching
- ✅ Group photos identification
- ✅ Common connections display

#### Engagement Features
- ✅ Daily login rewards
- ✅ Streak tracking
- ✅ Gamification elements
- ✅ Achievement badges
- ✅ Profile optimization tips
- ✅ Match quality score
- ✅ Response rate tracking
- ✅ Best time to swipe notifications

#### Premium Features
- ✅ Incognito mode (browse privately)
- ✅ Custom privacy settings
- ✅ See who viewed your profile
- ✅ Priority likes (shown first)
- ✅ Advanced analytics dashboard
- ✅ Profile boost scheduling
- ✅ Custom super like messages
- ✅ Unlimited rewinds

#### Admin & Moderation
- ✅ Comprehensive admin dashboard
- ✅ User management (ban, suspend, verify)
- ✅ Content moderation queue
- ✅ Analytics and reporting
- ✅ Fraud detection tools
- ✅ Customer support ticketing
- ✅ Bulk operations
- ✅ A/B testing framework
- ✅ Feature flag management
- ✅ System health monitoring

### 1.3 Technical Features

#### Performance
- ✅ CDN integration for media
- ✅ Image optimization and compression
- ✅ Lazy loading
- ✅ Infinite scroll
- ✅ Caching strategies (Redis)
- ✅ Database query optimization
- ✅ Load balancing
- ✅ Horizontal scaling
- ✅ Auto-scaling groups

#### Security
- ✅ End-to-end encryption for messages
- ✅ HTTPS/TLS everywhere
- ✅ Rate limiting
- ✅ DDoS protection
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ CSRF protection
- ✅ JWT token authentication
- ✅ Refresh token rotation
- ✅ Session management
- ✅ Password hashing (bcrypt)
- ✅ Two-factor authentication (optional)

#### Compliance
- ✅ GDPR compliance
- ✅ CCPA compliance
- ✅ Data export functionality
- ✅ Right to deletion
- ✅ Cookie consent
- ✅ Privacy policy enforcement
- ✅ Terms of service acceptance
- ✅ Age verification (18+)
- ✅ Accessibility (WCAG 2.1 AA)

#### Monitoring & Logging
- ✅ Error tracking (Sentry)
- ✅ Application performance monitoring
- ✅ Log aggregation (Winston)
- ✅ Metrics collection (Prometheus)
- ✅ Dashboards (Grafana)
- ✅ Alerting system
- ✅ Uptime monitoring
- ✅ User behavior analytics

---

## 2. Technical Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   iOS App    │ Android App  │   Web App    │ Admin Dashboard│
│ (React Native)│(React Native)│   (React)    │    (React)     │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer (Nginx)                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Express)                     │
│  - Authentication  - Rate Limiting  - Request Routing       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Auth Service │User Service  │Match Service │Message Service │
├──────────────┼──────────────┼──────────────┼────────────────┤
│Media Service │Payment Service│Notification │Analytics       │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  PostgreSQL  │   MongoDB    │    Redis     │ Elasticsearch  │
│  (Users,     │  (Messages,  │  (Sessions,  │  (Search,      │
│   Profiles)  │   Logs)      │   Cache)     │   Analytics)   │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                External Services                             │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ Azure Blob   │   Stripe     │   Twilio     │   SendGrid     │
│ (Storage)    │  (Payments)  │    (SMS)     │    (Email)     │
├──────────────┼──────────────┼──────────────┼────────────────┤
│    Agora     │    Sentry    │  Prometheus  │    Grafana     │
│(Video/Voice) │   (Errors)   │  (Metrics)   │  (Dashboard)   │
└──────────────┴──────────────┴──────────────┴────────────────┘
```

### 2.2 Technology Stack

**Frontend**
- React 18 (Web)
- React Native 0.73 (Mobile)
- TypeScript 5.3
- Redux Toolkit (State Management)
- React Router (Web Navigation)
- React Navigation (Mobile Navigation)
- Socket.io Client (Real-time)
- Tailwind CSS (Web Styling)

**Backend**
- Node.js 20
- Express.js 4.18
- TypeScript 5.3
- GraphQL (Apollo Server 4)
- Socket.io (WebSocket)
- JWT (Authentication)
- Joi/Zod (Validation)

**Databases**
- PostgreSQL 15 (Primary database)
- MongoDB 7 (Messages, logs)
- Redis 7 (Cache, sessions)
- Elasticsearch 8 (Search, analytics)

**Infrastructure**
- Docker & Docker Compose
- Kubernetes (Production)
- Nginx (Load balancer)
- GitHub Actions (CI/CD)
- Azure/AWS (Cloud hosting)

**Third-Party Services**
- Stripe (Payments)
- Twilio (SMS verification)
- SendGrid (Email)
- Azure Blob Storage (Media)
- Azure Content Moderator (AI moderation)
- Agora (Video/voice calls)
- Sentry (Error tracking)
- Segment (Analytics)

### 2.3 Database Schema

See: `DATABASE_SCHEMA.md` (to be created)

### 2.4 API Architecture

See: `API_DOCUMENTATION.md` (to be created)

---

## 3. User Experience

### 3.1 User Flows

**New User Flow**
1. Download app / Visit website
2. Sign up (email/phone/social)
3. Verify phone number (SMS)
4. Upload profile photos (min 2)
5. Complete profile (bio, interests, preferences)
6. Set location permissions
7. Set notification preferences
8. Review safety tips
9. Start swiping!

**Matching Flow**
1. View profile card
2. Swipe right (like) or left (pass)
3. If mutual like → It's a match!
4. Match notification sent to both users
5. Icebreaker message suggestions
6. Start conversation

**Messaging Flow**
1. Open match conversation
2. Send text/photo/voice message
3. Real-time delivery
4. Read receipts
5. Typing indicators
6. Video/voice call option

**Premium Upgrade Flow**
1. Hit free tier limit or see premium feature
2. View subscription options
3. Select plan (monthly/yearly)
4. Enter payment info (Stripe)
5. Purchase confirmation
6. Premium features unlocked

### 3.2 Screen Inventory

**Mobile App Screens** (40+ screens)
1. Authentication
   - Splash screen
   - Onboarding carousel
   - Login
   - Registration
   - Phone verification
   - Password reset

2. Profile Setup
   - Photo upload
   - Bio editor
   - Interest selection
   - Lifestyle preferences
   - Looking for
   - Location setup

3. Main App
   - Discovery/Swipe screen
   - Matches list
   - Conversations list
   - Message thread
   - Profile view (own)
   - Profile view (other user)
   - Settings

4. Premium
   - Subscription plans
   - Payment
   - Boost purchase
   - Coin purchase
   - Who liked you

5. Other
   - Notifications
   - Search filters
   - Safety center
   - Help/Support
   - About/Legal

**Web App Pages** (30+ pages)
- Similar to mobile with desktop-optimized layouts

**Admin Dashboard** (20+ pages)
- Dashboard overview
- User management
- Content moderation
- Analytics
- Reports
- Settings
- System health

---

## 4. Subscription Tiers

### Free Tier
- Create profile
- Browse profiles
- **50 likes per day**
- Basic filters (age, distance)
- Match with others
- Send messages to matches
- Standard support

### Premium ($19.99/month or $99.99/year)
- **Unlimited likes**
- See who liked you
- Advanced filters
- **5 Super Likes per week**
- Rewind last swipe
- Read receipts
- Priority support
- Ad-free experience
- Passport mode (1 location change per month)

### Premium+ ($29.99/month or $149.99/year)
- All Premium features
- **Profile boost (1 per month)**
- **Spotlight (1 per month)**
- Unlimited rewinds
- **10 Super Likes per week**
- Incognito mode
- Advanced analytics
- Priority customer support
- Passport mode (unlimited location changes)
- Early access to new features

### À La Carte Options
- Profile Boost: $4.99 (30 min visibility boost)
- Super Likes Pack (5): $4.99
- Super Likes Pack (25): $19.99
- Coin Pack (100): $9.99
- Coin Pack (500): $39.99

---

## 5. Revenue Model

### Revenue Streams
1. **Subscriptions** (60% of revenue)
   - Premium monthly/yearly
   - Premium+ monthly/yearly

2. **In-App Purchases** (30% of revenue)
   - Profile boosts
   - Super likes
   - Virtual coins

3. **Advertising** (10% of revenue)
   - Display ads (free users only)
   - Sponsored profiles
   - Partnership promotions

### Projected Revenue (Year 1)
- 100,000 total users
- 5% conversion to Premium = 5,000 paid users
- Average revenue per user (ARPU): $15/month
- Monthly recurring revenue: $75,000
- Annual revenue: $900,000

### Projected Revenue (Year 3)
- 1,000,000 total users
- 8% conversion = 80,000 paid users
- ARPU: $18/month
- Monthly recurring revenue: $1,440,000
- Annual revenue: $17,280,000

---

## 6. Success Metrics (KPIs)

### User Acquisition
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- DAU/MAU ratio (>40% target)
- New user signups per day
- User retention (Day 1, 7, 30)
- Viral coefficient

### Engagement
- Average session duration
- Swipes per user per day
- Messages sent per day
- Match rate
- Conversation rate (matches → messages)
- Response rate
- Time to first message

### Monetization
- Conversion rate (free → paid)
- Average Revenue Per User (ARPU)
- Lifetime Value (LTV)
- Customer Acquisition Cost (CAC)
- LTV:CAC ratio (>3:1 target)
- Churn rate (<5% monthly target)

### Quality
- User satisfaction score
- Net Promoter Score (NPS) (>50 target)
- App store rating (>4.5 target)
- Support ticket volume
- Moderation response time
- Platform uptime (>99.9% target)

---

## 7. Security & Privacy

### Data Protection
- All data encrypted at rest (AES-256)
- All data encrypted in transit (TLS 1.3)
- End-to-end encryption for messages
- Regular security audits
- Penetration testing
- Vulnerability scanning

### Privacy Controls
- Users control profile visibility
- Block and report features
- Data export (GDPR)
- Account deletion (complete data purge)
- Location privacy (approximate only)
- Photo verification optional

### Compliance
- GDPR (Europe)
- CCPA (California)
- COPPA (age verification)
- PCI DSS (payment data)
- SOC 2 Type II
- ISO 27001

---

## 8. Content Moderation

### Automated Moderation
- AI photo screening (Azure Content Moderator)
- NSFW content detection
- Face detection and counting
- Fake profile detection
- Spam message detection
- Abusive language filtering

### Manual Moderation
- Dedicated moderation team
- Report review queue
- User account reviews
- Photo verification reviews
- Priority flagging system
- Moderator escalation process

### Community Guidelines
- No nudity or sexual content
- No harassment or hate speech
- No spam or scams
- Authentic photos only
- Respectful communication
- Age-appropriate content (18+)

---

## 9. Accessibility

### WCAG 2.1 AA Compliance
- Keyboard navigation
- Screen reader support
- Color contrast ratios
- Text resizing
- Alternative text for images
- ARIA labels
- Focus indicators
- Error identification

### Inclusive Design
- Multiple language support
- Right-to-left (RTL) language support
- Voice control compatibility
- Large touch targets
- Clear typography
- High contrast mode
- Reduced motion options

---

## 10. Launch Plan

### Phase 1: Beta Launch (Month 1-2)
- 1,000 beta testers
- iOS TestFlight
- Android Internal Testing
- Bug reporting system
- Feedback collection
- Iterate based on feedback

### Phase 2: Soft Launch (Month 3)
- Launch in 1-2 cities
- Monitor performance
- Refine matching algorithm
- Optimize infrastructure
- Marketing campaigns
- Influencer partnerships

### Phase 3: Regional Launch (Month 4-6)
- Expand to state/province
- Scale infrastructure
- Customer support team
- PR campaigns
- App store optimization (ASO)

### Phase 4: National Launch (Month 7-9)
- Full country rollout
- Major marketing push
- Partnership deals
- Media coverage
- Referral program

### Phase 5: International Expansion (Month 10-12)
- Localization
- International markets
- Multi-currency support
- Regional compliance
- Local partnerships

---

## 11. Success Criteria

### Launch Success Metrics (First 3 Months)
- 50,000+ downloads
- 10,000+ active users
- 1,000+ daily matches
- 4.5+ app store rating
- <2% crash rate
- 2-3% conversion to premium

### Year 1 Goals
- 500,000+ downloads
- 100,000+ monthly active users
- 5% premium conversion
- $900,000 annual revenue
- Profitability or clear path to profitability
- 4.6+ app store rating
- NPS score >50

---

**Document Status**: Complete
**Next Steps**: Implementation of each component
