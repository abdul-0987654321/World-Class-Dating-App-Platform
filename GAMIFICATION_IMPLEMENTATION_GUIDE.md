# Complete Gamification System Implementation Guide

## Overview
This document provides a comprehensive guide to the complete gamification system implemented for the dating app platform. The system includes rewards, achievements, badges, streaks, challenges, XP/levels, and more.

---

## Table of Contents
1. [Database Schema](#database-schema)
2. [Backend Architecture](#backend-architecture)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Integration Guide](#integration-guide)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Future Enhancements](#future-enhancements)

---

## Database Schema

### Created Migrations

#### 1. Daily Rewards (`20251201000001_create_daily_rewards_table.ts`)
- **Tables:**
  - `daily_rewards` - User reward status and streak tracking
  - `daily_reward_claims` - History of claimed rewards
  - `reward_calendar_config` - 7-day reward cycle configuration

#### 2. Achievements (`20251201000002_create_achievements_table.ts`)
- **Tables:**
  - `achievement_definitions` - Achievement templates (profile, social, activity, premium, hidden)
  - `user_achievements` - User progress and unlocks
  - `achievement_progress_logs` - Detailed tracking logs
  - `user_achievement_stats` - Aggregate statistics

#### 3. Streaks (`20251202000001_create_gamification_streaks_table.ts`)
- **Tables:**
  - `user_streaks` - Login, conversation, match, activity streaks
  - `streak_milestones` - Milestone definitions with rewards
  - `user_streak_milestones` - User milestone achievements

#### 4. Challenges (`20251202000002_create_gamification_challenges_table.ts`)
- **Tables:**
  - `challenge_definitions` - Daily, weekly, monthly challenges
  - `user_challenges` - User challenge progress
  - `challenge_progress_logs` - Action tracking

#### 5. XP & Levels (`20251202000003_create_gamification_xp_levels_table.ts`)
- **Tables:**
  - `user_experience` - User XP and level data
  - `xp_transactions` - XP earning/spending history
  - `level_definitions` - 50 levels with rewards (Bronze → Diamond tiers)
  - `xp_sources` - XP sources and rates
  - `user_level_unlocks` - Level achievement tracking

#### 6. Badges (`20251202000004_create_gamification_badges_table.ts`)
- **Tables:**
  - `profile_badges` - Badge definitions (verification, status, achievement, premium, seasonal)
  - `user_profile_badges` - User badge ownership
  - `badge_collections` - Sets of badges with completion bonuses
  - `user_badge_collections` - Collection completion tracking

---

## Backend Architecture

### Service Layer

#### 1. **ExperienceService** (`Experience.service.ts`)
Manages user XP and level progression.

**Key Methods:**
- `getUserExperience(userId)` - Get user's XP/level data
- `awardXP(userId, actionKey, multiplier, metadata)` - Award XP with automatic level-up
- `getXPTransactions(userId, limit, offset)` - Transaction history
- `getXPLeaderboard(limit)` - Top users by XP
- `getLevelDefinitions()` - All level definitions

**Tracking Methods:**
- `trackProfileComplete()`, `trackPhotoUpload()`, `trackPhoneVerification()`
- `trackMatch()`, `trackSwipe()`, `trackDailyLogin()`
- `trackMessage()`, `trackVideoChat()`, `trackSubscription()`

#### 2. **StreakService** (`Streak.service.ts`)
Handles streak tracking and management.

**Key Methods:**
- `getUserStreaks(userId)` - Get all user streaks
- `updateLoginStreak(userId)` - Daily login tracking
- `updateConversationStreak(userId)` - Message streak tracking
- `updateMatchStreak(userId)` - Match streak tracking
- `protectStreak(userId, streakType, durationHours)` - Streak freeze feature
- `getStreakLeaderboard(streakType, limit)` - Top streaks

#### 3. **ChallengeService** (`Challenge.service.ts`)
Manages daily, weekly, and monthly challenges.

**Key Methods:**
- `getActiveChallenges(userId)` - User's active challenges
- `getAvailableChallenges(userId, type)` - Challenges user can start
- `startChallenge(userId, challengeId)` - Begin a challenge
- `updateChallengeProgress(userId, update)` - Track progress
- `expireOldChallenges()` - Cleanup expired challenges
- `generateDailyChallenges(userId)` - Auto-create daily challenges

#### 4. **BadgeService** (`Badge.service.ts`)
Handles profile badge system.

**Key Methods:**
- `getAllBadges()` - Get all badge definitions
- `getUserBadges(userId)` - User's earned badges
- `getUserEquippedBadges(userId)` - Badges shown on profile
- `awardBadge(userId, badgeKey, metadata)` - Award a badge
- `equipBadge(userId, badgeId, equipped)` - Show/hide badge on profile
- `autoAwardBadges(userId)` - Check and award eligible badges
- `removeExpiredBadges()` - Cleanup temporary badges

#### 5. **AchievementService** (`Achievement.service.ts`)
Already existing - manages achievement system.

**Key Methods:**
- `getUserAchievements(userId)` - All achievements with progress
- `updateProgress(userId, updates)` - Track achievement progress
- `toggleShowcase(userId, achievementId, showcase, order)` - Showcase on profile
- Tracking methods for various actions

### Repository Layer

Each service has a corresponding repository for database operations:

- **ExperienceRepository** - XP, levels, transactions
- **StreakRepository** - Streaks, milestones
- **ChallengeRepository** - Challenges, progress
- **BadgeRepository** - Badges, collections
- **AchievementRepository** - Already exists

### Controller Layer

#### **GamificationController** (`Gamification.controller.ts`)
Unified controller for all gamification endpoints.

**Endpoint Groups:**
1. **Overview** - `GET /dashboard` - Complete gamification overview
2. **Experience** - XP, levels, transactions, leaderboard
3. **Streaks** - User streaks, protection, leaderboard
4. **Challenges** - Active, available, start challenge
5. **Badges** - All badges, user badges, equip/unequip
6. **Tracking** - `POST /track` - Universal action tracking webhook

---

## API Endpoints

### Base Route: `/api/gamification`

#### Overview
```http
GET /api/gamification/dashboard
Authorization: Bearer {token}
```
Returns complete gamification data: experience, streaks, challenges, badges, achievements.

#### Experience & Levels
```http
GET /api/gamification/experience
GET /api/gamification/experience/transactions?limit=50&offset=0
GET /api/gamification/experience/leaderboard?limit=10
GET /api/gamification/levels (public)
```

#### Streaks
```http
GET /api/gamification/streaks
POST /api/gamification/streaks/protect
    Body: { streakType: 'login', durationHours: 24 }
GET /api/gamification/streaks/leaderboard?type=login&limit=10
```

#### Challenges
```http
GET /api/gamification/challenges/active
GET /api/gamification/challenges/available?type=daily
POST /api/gamification/challenges/start
    Body: { challengeId: 'uuid' }
```

#### Badges
```http
GET /api/gamification/badges (public)
GET /api/gamification/badges/user
PUT /api/gamification/badges/:badgeId/equip
    Body: { equipped: true }
```

#### Action Tracking (Internal/Webhook)
```http
POST /api/gamification/track
Body: {
  userId: 'uuid',
  actionType: 'SWIPE' | 'MATCH' | 'SEND_MESSAGE' | 'DAILY_LOGIN' | etc,
  metadata: { ... }
}
```

This endpoint automatically:
- Awards XP
- Updates achievements
- Updates challenges
- Updates streaks
- Auto-awards badges

### Daily Rewards Endpoints
```http
GET /api/daily-rewards/calendar (public)
GET /api/daily-rewards/status
POST /api/daily-rewards/claim
GET /api/daily-rewards/history
```

### Achievement Endpoints
```http
GET /api/achievements
GET /api/achievements/user
GET /api/achievements/category/:category
GET /api/achievements/showcase/:userId
PUT /api/achievements/:achievementId/showcase
GET /api/achievements/leaderboard
```

---

## Frontend Components

### React Native Components

#### 1. **GamificationDashboard** (`GamificationDashboard.tsx`)
Main gamification UI with tabs:
- Overview (streaks, active challenges)
- Challenges (all challenges with progress)
- Achievements (unlocked and locked)
- Badges (earned badges grid)

**Usage:**
```tsx
import { GamificationDashboard } from '@/components/gamification/GamificationDashboard';

<GamificationDashboard />
```

#### 2. **DailyRewardsModal** (`DailyRewardsModal.tsx`)
Modal for daily reward calendar and claiming.

**Features:**
- 7-day reward calendar visualization
- Current streak display
- Claim button (when available)
- Reward history

**Usage:**
```tsx
import { DailyRewardsModal } from '@/components/gamification/DailyRewardsModal';

const [showRewards, setShowRewards] = useState(false);

<DailyRewardsModal
  visible={showRewards}
  onClose={() => setShowRewards(false)}
  onRewardClaimed={(reward) => {
    console.log('Reward claimed:', reward);
  }}
/>
```

#### 3. **LevelProgressCard** (`LevelProgressCard.tsx`)
Displays user level, XP progress, and stats.

**Features:**
- Level badge with tier color
- XP progress bar
- Next level information
- Total XP stat

**Usage:**
```tsx
import { LevelProgressCard } from '@/components/gamification/LevelProgressCard';

<LevelProgressCard
  currentLevel={15}
  currentLevelXp={1250}
  xpToNextLevel={2000}
  totalXp={15750}
  levelProgressPercentage={62.5}
  onPress={() => navigation.navigate('LevelDetails')}
/>
```

### Additional Components to Create

#### 4. **StreakDisplay**
Shows user streaks with flame icons and protection status.

#### 5. **ChallengeCard**
Individual challenge card with progress bar.

#### 6. **BadgeGrid**
Grid display of badges with equip/unequip functionality.

#### 7. **AchievementList**
Categorized list of achievements with progress.

#### 8. **LevelUpAnimation**
Celebratory animation when user levels up.

#### 9. **RewardNotification**
Toast/banner for reward notifications.

---

## Integration Guide

### Step 1: Run Database Migrations

```bash
cd backend/services/user-service
npm run migrate:latest
```

This will create all gamification tables.

### Step 2: Register Gamification Routes

In `backend/services/user-service/src/api/index.ts`:

```typescript
import gamificationRoutes from './routes/gamification.routes';

// Register routes
app.use('/api/gamification', gamificationRoutes);
```

### Step 3: Integrate Action Tracking

In your existing services (matching, messaging, etc.), call the tracking endpoint:

```typescript
// Example: After a swipe
await axios.post('/api/gamification/track', {
  userId: user.id,
  actionType: 'SWIPE',
  metadata: { totalSwipes: user.totalSwipes + 1 }
});

// Example: After a match
await axios.post('/api/gamification/track', {
  userId: user.id,
  actionType: 'MATCH',
  metadata: {
    totalMatches: user.totalMatches + 1,
    isSuperLike: match.isSuperLike
  }
});

// Example: After sending message
await axios.post('/api/gamification/track', {
  userId: user.id,
  actionType: 'SEND_MESSAGE',
  metadata: {
    totalMessages: user.totalMessages + 1,
    responseTime: responseTimeInSeconds
  }
});

// Example: Daily login
await axios.post('/api/gamification/track', {
  userId: user.id,
  actionType: 'DAILY_LOGIN',
  metadata: {}
});
```

### Step 4: Add to Navigation

In `apps/mobile-app/src/navigation/MainNavigator.tsx`:

```typescript
import { GamificationDashboard } from '../components/gamification/GamificationDashboard';

// Add to tab navigator
<Tab.Screen
  name="Gamification"
  component={GamificationDashboard}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="trophy" size={size} color={color} />
    ),
  }}
/>
```

### Step 5: Add Daily Rewards Button

In your main screen or header:

```typescript
const [showDailyRewards, setShowDailyRewards] = useState(false);

// Check if user can claim
useEffect(() => {
  const checkDailyReward = async () => {
    const status = await axios.get('/api/daily-rewards/status');
    if (status.data.data.canClaimToday) {
      // Show notification badge
      setHasUnclaimedReward(true);
    }
  };
  checkDailyReward();
}, []);

// In render
<TouchableOpacity onPress={() => setShowDailyRewards(true)}>
  <Ionicons name="gift" size={24} color="#FF6B6B" />
  {hasUnclaimedReward && <Badge />}
</TouchableOpacity>

<DailyRewardsModal
  visible={showDailyRewards}
  onClose={() => setShowDailyRewards(false)}
  onRewardClaimed={handleRewardClaimed}
/>
```

### Step 6: Show Level Progress

In profile screen or header:

```typescript
const { data: experience } = useQuery('user-experience', () =>
  axios.get('/api/gamification/experience')
);

<LevelProgressCard
  {...experience}
  onPress={() => navigation.navigate('ExperienceDetails')}
/>
```

---

## Configuration

### XP Sources Configuration

XP sources are defined in the migration and can be updated via admin panel:

- **Profile Actions**: 25-500 XP
- **Social Actions**: 100-300 XP
- **Activity Actions**: 1-50 XP
- **Engagement Actions**: 10-150 XP
- **Premium Actions**: 500-1000 XP

### Level Progression

Levels 1-50 with exponential XP requirements:
- **Level 1-9**: Bronze Tier (100-1500 XP per level)
- **Level 10-19**: Silver Tier (1500-4500 XP per level)
- **Level 20-29**: Gold Tier (4500-12000 XP per level)
- **Level 30-39**: Platinum Tier (12000-25000 XP per level)
- **Level 40-50**: Diamond Tier (25000+ XP per level)

Milestone levels (5, 10, 15, 20, 25, 30, 40, 50) give 2x rewards.

### Challenge Configuration

Challenges reset automatically:
- **Daily**: Reset at midnight (UTC)
- **Weekly**: Reset on Monday 00:00 UTC
- **Monthly**: Reset on 1st of month 00:00 UTC

### Streak Protection

Premium feature that prevents streak loss:
- **Duration**: 24 hours by default
- **Cost**: Coins or premium subscription
- **Usage**: Automatic when streak would break

---

## Testing

### Unit Tests

Create tests for each service:

```typescript
// Example: Experience.service.test.ts
describe('ExperienceService', () => {
  it('should award XP and level up user', async () => {
    const result = await service.awardXP(userId, 'SWIPE');
    expect(result.awarded).toBe(true);
    expect(result.leveledUp).toBe(true);
  });

  it('should respect daily XP limits', async () => {
    // Award XP multiple times
    // Should eventually return daily limit reached
  });
});
```

### Integration Tests

Test complete workflows:

```typescript
describe('Gamification Integration', () => {
  it('should track swipe and update all systems', async () => {
    const response = await request(app)
      .post('/api/gamification/track')
      .send({
        userId,
        actionType: 'SWIPE',
        metadata: { totalSwipes: 100 }
      });

    expect(response.status).toBe(200);
    expect(response.body.data.experience).toBeDefined();
    expect(response.body.data.challenges).toBeDefined();
  });
});
```

### Manual Testing Checklist

- [ ] Daily reward claim works correctly
- [ ] Streaks increment properly
- [ ] Streaks break after 24+ hours
- [ ] Streak protection prevents break
- [ ] XP is awarded for all actions
- [ ] Level up triggers correctly
- [ ] Level rewards are granted
- [ ] Challenges track progress
- [ ] Challenges complete and award rewards
- [ ] Achievements unlock at correct thresholds
- [ ] Badges are auto-awarded when eligible
- [ ] Badges can be equipped/unequipped
- [ ] Leaderboards display correctly

---

## Future Enhancements

### Phase 2
1. **Seasonal Events** - Limited-time challenges and badges
2. **Social Competition** - Friends leaderboards
3. **Tournaments** - Weekly/monthly competitions
4. **Quests** - Multi-step storyline challenges
5. **Cosmetics** - Profile themes, animations earned through gameplay

### Phase 3
1. **Clans/Guilds** - Team-based challenges
2. **Trading System** - Trade collectible items
3. **Battle Pass** - Premium seasonal progression
4. **Mini-Games** - Fun activities that award XP
5. **NFT Integration** - Rare collectible badges as NFTs

### Analytics to Track
- Daily active users (DAU) with gamification engagement
- Average session length impact
- Retention rate improvements
- Revenue impact (from streak protections, etc.)
- Most popular challenges
- Challenge completion rates
- Level distribution across user base
- Badge rarity and desirability

---

## Missing Entity Files to Create

Some entity type definitions still need to be created. Here are the interfaces needed:

### Badge.entity.ts
```typescript
export type BadgeType = 'verification' | 'status' | 'achievement' | 'special' | 'seasonal' | 'premium';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface ProfileBadge {
  id: string;
  key: string;
  name: string;
  description: string;
  type: BadgeType;
  rarity: BadgeRarity;
  iconName: string;
  iconColor: string;
  backgroundColor: string;
  requirements: any;
  isAutoAwarded: boolean;
  isPermanent: boolean;
  durationDays: number | null;
  isVisibleOnProfile: boolean;
  displayPriority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileBadge {
  id: string;
  userId: string;
  badgeId: string;
  isEquipped: boolean;
  displayOrder: number | null;
  earnedAt: Date;
  expiresAt: Date | null;
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface BadgeCollection {
  id: string;
  key: string;
  name: string;
  description: string;
  requiredBadgeIds: string[];
  coinReward: number;
  xpReward: number;
  bonusRewards: any;
  collectionBadgeIcon: string;
  collectionBadgeColor: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserBadgeCollection {
  id: string;
  userId: string;
  collectionId: string;
  isCompleted: boolean;
  completedAt: Date | null;
  rewardClaimed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Challenge.entity.ts (Update existing)
```typescript
export type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special_event' | 'limited_time';
export type ChallengeCategory = 'social' | 'activity' | 'engagement' | 'profile' | 'premium';
export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type ChallengeStatus = 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';

export interface ChallengeDefinition {
  id: string;
  key: string;
  title: string;
  description: string;
  type: ChallengeType;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  requirements: any;
  targetValue: number;
  coinReward: number;
  xpReward: number;
  boostReward: number;
  superLikeReward: number;
  bonusRewards: any;
  iconName: string;
  badgeColor: string;
  startDate: Date | null;
  endDate: Date | null;
  durationDays: number | null;
  isRepeatable: boolean;
  isFeatured: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserChallenge {
  id: string;
  userId: string;
  challengeId: string;
  status: ChallengeStatus;
  progress: number;
  target: number;
  progressPercentage: number;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  rewardClaimed: boolean;
  rewardClaimedAt: Date | null;
  progressData: any;
  timesCompleted: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChallengeProgressUpdate {
  actionType: string;
  incrementBy?: number;
  metadata?: any;
}

export interface ChallengeCompletionResult {
  challenge: ChallengeDefinition;
  userChallenge: UserChallenge;
  rewardsAwarded: {
    coins: number;
    xp: number;
    boosts: number;
    superLikes: number;
  };
}
```

---

## Support & Maintenance

### Monitoring
- Monitor XP award rates for balance issues
- Track challenge completion rates
- Watch for streak manipulation
- Monitor database performance on leaderboard queries

### Scheduled Jobs
Create cron jobs for:
1. **Daily Challenge Generation** - 00:00 UTC
2. **Challenge Expiration** - Hourly
3. **Badge Expiration Check** - Daily at 01:00 UTC
4. **Streak Check & Notification** - Daily at 20:00 UTC
5. **Leaderboard Cache Refresh** - Every 5 minutes

### Database Optimization
- Index all foreign keys
- Index frequently queried columns (level, xp, streak_count)
- Consider partitioning transactions tables by date
- Archive old transaction data after 1 year

---

## Conclusion

This gamification system provides a comprehensive engagement layer for the dating app. It incentivizes daily usage, rewards user activity, and creates progression systems that keep users coming back.

The modular architecture allows for easy expansion and modification. Each component (XP, streaks, challenges, badges) works independently but can be combined for powerful engagement mechanics.

For questions or issues, please refer to the API documentation or contact the development team.
