# Gamification Features Documentation

## Overview

This document describes the implementation of the MEDIUM PRIORITY Gamification features for the dating app. These features are designed to increase user engagement, retention, and provide a rewarding experience.

## Features Implemented

### 1. Daily Login Rewards

**Purpose:** Encourage users to log in every day and build consistent app usage habits.

#### Database Schema
- `daily_rewards` - Tracks user's daily reward status
- `daily_reward_claims` - Records each claim with details
- `reward_calendar_config` - Configures the 7-day reward cycle
- `weekly_bonus_rewards` - Extra rewards for weekly completion
- `user_weekly_bonus_claims` - Tracks weekly bonus claims

#### Reward Cycle (7 Days)
| Day | Reward Type | Amount | Description |
|-----|-------------|--------|-------------|
| 1 | Coins | 10 | Start your week! |
| 2 | Coins | 15 | Keep going! |
| 3 | Super Likes | 2 | Stand out! |
| 4 | Coins | 20 | Halfway bonus! |
| 5 | Super Likes | 3 | More Super Likes! |
| 6 | Boosts | 1 | Get boosted! |
| 7 | Coins | 50 (2x) | Week complete! Special bonus! |

#### Weekly Bonuses
- Week 1: 100 Coins
- Week 2: 3 Super Likes
- Week 3: 1 Boost
- Week 4: 500 Coins (Monthly Master)

#### API Endpoints
```
GET  /api/v1/daily-rewards/status   - Get current status
POST /api/v1/daily-rewards/claim    - Claim daily reward
GET  /api/v1/daily-rewards/calendar - Get reward calendar
GET  /api/v1/daily-rewards/stats    - Get user statistics
GET  /api/v1/daily-rewards/history  - Get claim history
```

---

### 2. Achievement Badges

**Purpose:** Reward users for reaching milestones and completing specific actions.

#### Badge Categories
- **Dating** - Match-related achievements
- **Social** - Message and interaction achievements
- **Profile** - Profile completion achievements
- **Engagement** - App usage achievements
- **Streak** - Consistency achievements
- **Special** - Hidden/secret achievements
- **Collector** - Collection-based achievements

#### Badge Rarities
| Rarity | Color | Glow Effect |
|--------|-------|-------------|
| Common | Gray | None |
| Uncommon | Green | Subtle |
| Rare | Blue | Medium |
| Epic | Purple | Strong |
| Legendary | Gold | Animated |

#### Sample Achievement Badges
| Badge | Category | Requirement | Rewards |
|-------|----------|-------------|---------|
| First Spark | Dating | Get first match | 50 coins, 100 XP |
| Matchmaker Bronze | Dating | Get 10 matches | 100 coins, 250 XP |
| Matchmaker Gold | Dating | Get 100 matches | 500 coins, 1000 XP |
| Conversation Starter | Social | Send 10 messages | 25 coins, 50 XP |
| Social Butterfly | Social | Send 100 messages | 100 coins, 200 XP |
| Profile Pro | Profile | 100% completion | 150 coins, 300 XP |
| Week Warrior | Streak | 7-day login streak | 75 coins, 150 XP |
| Month Master | Streak | 30-day login streak | 300 coins, 600 XP |
| Early Bird | Special | Login before 7 AM 5x | 100 coins, 200 XP |

#### API Endpoints
```
GET  /api/v1/gamification/achievements              - Get all badges with progress
GET  /api/v1/gamification/achievements/unlocked     - Get unlocked badges
PUT  /api/v1/gamification/achievements/:id/display  - Toggle profile display
```

---

### 3. Streak Counters

**Purpose:** Encourage consistent daily engagement through streak tracking.

#### Streak Types
- **Login Streak** - Consecutive daily logins
- **Conversation Streak** - Consecutive days sending messages
- **Match Streak** - Consecutive days getting matches

#### Streak Milestones
| Days | Title | Coin Reward | Other Rewards |
|------|-------|-------------|---------------|
| 3 | 3-Day Streak | 20 | - |
| 7 | Week Warrior | 50 | 1 Super Like |
| 14 | Two Week Champion | 100 | 2 Super Likes |
| 30 | Monthly Master | 250 | 1 Boost, 5 Super Likes |
| 100 | Century Club | 1000 | 3 Boosts, 10 Super Likes |

#### Streak Protection
- **Cost:** 50 coins
- **Duration:** 24 hours
- **Effect:** Prevents streak reset if day is missed

#### API Endpoints
```
GET  /api/v1/gamification/streaks              - Get all user streaks
POST /api/v1/gamification/streaks/protect      - Protect a streak (costs coins)
GET  /api/v1/gamification/streaks/leaderboard  - Get streak leaderboard
```

---

### 4. Virtual Currency (Coins)

**Purpose:** Provide an in-app economy for rewards and purchases.

#### Earning Coins
| Event | Base Coins | Daily Limit |
|-------|------------|-------------|
| Daily Login | 5 | 1x |
| Daily Reward Claim | 10-100 | 1x |
| New Match | 3 | 20x |
| Message Sent | 1 | 50x |
| Profile Complete | 100 | 1x (lifetime) |
| Photo Verified | 50 | 1x (lifetime) |
| Streak Milestone | 25+ | - |
| Achievement Unlocked | 10-1000 | - |
| Referral Signup | 100 | - |
| Weekly Bonus | 100-500 | 1x/week |

#### Spending Coins
| Item | Cost |
|------|------|
| Super Like | 50 |
| Boost (30 min) | 100 |
| See Who Likes You | 200 |
| Undo Last Swipe | 25 |
| Streak Protection | 50 |

#### API Endpoints
```
GET  /api/v1/gamification/wallet  - Get balance and history
GET  /api/v1/gamification/shop    - Get shop items and earning methods
GET  /api/v1/coins/balance        - Get coin balance
GET  /api/v1/coins/transactions   - Get transaction history
```

---

### 5. XP and Levels

**Purpose:** Provide long-term progression and unlock rewards.

#### Level System
| Level | Title | XP Required | Coin Reward | Super Likes | Boosts |
|-------|-------|-------------|-------------|-------------|--------|
| 1 | Newcomer | 0 | - | - | - |
| 2 | Explorer | 100 | 25 | - | - |
| 3 | Rising Star | 250 | 50 | - | - |
| 4 | Social Spark | 500 | 75 | 1 | - |
| 5 | Connection Pro | 1000 | 100 | 2 | - |
| 6 | Heart Hunter | 2000 | 150 | 2 | 1 |
| 7 | Love Expert | 3500 | 200 | 3 | 1 |
| 8 | Dating Guru | 5000 | 300 | 5 | 2 |
| 9 | Romance Master | 7500 | 500 | 5 | 2 |
| 10 | Love Legend | 10000 | 1000 | 10 | 5 |

#### API Endpoints
```
GET /api/v1/gamification/level   - Get user level info
GET /api/v1/gamification/levels  - Get all level definitions
```

---

## Unified Dashboard

The gamification dashboard provides a single endpoint to fetch all gamification data:

```
GET /api/v1/gamification/dashboard
```

**Response:**
```json
{
  "dailyRewards": {
    "canClaim": true,
    "currentStreak": 5,
    "dayInCycle": 5,
    "todayReward": { ... }
  },
  "streaks": {
    "login": { ... },
    "conversation": { ... },
    "match": { ... }
  },
  "achievements": {
    "unlocked": 8,
    "total": 20,
    "progress": 40,
    "recentBadges": [ ... ]
  },
  "wallet": {
    "coins": 500,
    "totalEarned": 750
  },
  "level": {
    "currentLevel": 4,
    "title": "Social Spark",
    "totalXP": 650,
    "xpProgress": 150,
    "xpNeeded": 500
  }
}
```

---

## Action Tracking

Actions are tracked for gamification progress:

```
POST /api/v1/gamification/track
```

**Request:**
```json
{
  "userId": "user-id",
  "action": "match_made",
  "metadata": { "matchId": "match-123" }
}
```

**Tracked Actions:**
- `daily_login`
- `match_made`
- `message_sent`
- `super_like_used`
- `boost_used`
- `photo_uploaded`
- `photo_verification_complete`
- `profile_complete`

---

## UI Components

### Web App Components
1. **DailyRewardsModal** - Modal for claiming daily rewards
2. **AchievementBadgeCard** - Display achievement badges
3. **StreakDisplay** - Show streak counters with milestones
4. **CoinWallet** - Display coin balance and transactions
5. **EnhancedGamificationPage** - Main gamification page with tabs

### Mobile App Components
1. **DailyRewardsModal** - React Native modal for daily rewards

---

## File Structure

```
backend/services/user-service/src/
├── api/
│   ├── controllers/
│   │   ├── DailyReward.controller.ts
│   │   ├── EnhancedGamification.controller.ts
│   │   └── Gamification.controller.ts
│   └── routes/
│       ├── dailyReward.routes.ts
│       └── gamification.routes.ts
├── domain/
│   ├── entities/
│   │   ├── Badge.entity.ts
│   │   ├── Coin.entity.ts
│   │   ├── DailyReward.entity.ts
│   │   └── Streak.entity.ts
│   ├── repositories/
│   │   ├── Badge.repository.ts
│   │   ├── DailyReward.repository.ts
│   │   └── Streak.repository.ts
│   └── services/
│       ├── AchievementBadge.service.ts
│       ├── Badge.service.ts
│       ├── coin.service.ts
│       ├── DailyReward.service.ts
│       └── Streak.service.ts
└── infrastructure/
    └── database/
        └── migrations/
            ├── 20251201000001_create_daily_rewards_table.ts
            ├── 20251202000001_create_gamification_streaks_table.ts
            ├── 20251202000004_create_gamification_badges_table.ts
            └── 20260102000010_enhance_gamification_system.ts

apps/web-app/src/
├── components/
│   └── gamification/
│       ├── AchievementBadgeCard.tsx
│       ├── CoinWallet.tsx
│       ├── DailyRewardsModal.tsx
│       ├── StreakDisplay.tsx
│       └── index.ts
├── pages/
│   └── Gamification/
│       ├── EnhancedGamificationPage.tsx
│       └── GamificationPage.tsx
└── services/
    └── gamification.service.ts
```

---

## Testing

Integration tests are available at:
```
backend/services/user-service/src/__tests__/gamification/gamification.integration.test.ts
```

Run tests:
```bash
cd backend/services/user-service
npm test -- --testPathPattern=gamification
```

---

## Future Enhancements

1. **Seasonal Events** - Time-limited badges and rewards
2. **Badge Collections** - Bonus rewards for completing badge sets
3. **Leaderboards** - Weekly/monthly competitions
4. **Challenges** - Daily/weekly objectives with rewards
5. **Gifting** - Send coins or items to matches
6. **Premium Multipliers** - Bonus coins for premium users
