# Daily Login Rewards & Achievement System Implementation

## Overview
This document provides a complete implementation guide for the daily login rewards and achievement system for the Flamoral dating app.

## Table of Contents
1. [Features](#features)
2. [Database Schema](#database-schema)
3. [Backend Services](#backend-services)
4. [API Endpoints](#api-endpoints)
5. [Frontend Components](#frontend-components)
6. [Integration Guide](#integration-guide)
7. [Testing](#testing)

---

## Features

### 1. Daily Login Rewards System
- **7-Day Reward Cycle**: Rotating calendar of rewards that resets after day 7
- **Streak Tracking**: Monitors consecutive daily logins
- **Reward Types**:
  - Coins (virtual currency)
  - Super Likes (premium feature)
  - Profile Boosts (visibility enhancement)
  - Premium Trial (temporary premium access)
- **Claim Mechanism**: 24-hour cooldown between claims
- **Visual Calendar**: Interactive UI showing all 7 days with progress

### 2. Achievement System
- **Categories**:
  - Profile: Complete profile, add photos, verify phone/photo
  - Social: First match, matches count, first message, messages sent
  - Activity: Swipe counts, login streaks
  - Hidden: Secret achievements for special actions

- **Tiers**: Bronze, Silver, Gold, Platinum, Diamond
- **Progress Tracking**: Real-time progress updates
- **Showcase**: Display up to 5 achievements on profile
- **Rewards**: Coins, Super Likes, and Boosts upon unlock

---

## Database Schema

### Tables Created

#### 1. `daily_login_rewards`
Configuration table for 7-day reward cycle.

```sql
- id (SERIAL PRIMARY KEY)
- day_number (1-7)
- reward_type (coins, super_likes, boosts, premium_trial)
- reward_amount (INTEGER)
- reward_duration_hours (INTEGER, optional)
- display_title (VARCHAR)
- display_description (TEXT)
- icon_name (VARCHAR)
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

**Default Rewards:**
- Day 1: 10 Coins
- Day 2: 1 Super Like
- Day 3: 20 Coins
- Day 4: 1-hour Profile Boost
- Day 5: 30 Coins
- Day 6: 2 Super Likes
- Day 7: 24-hour Premium Trial

#### 2. `user_login_streaks`
Tracks each user's login streak and reward status.

```sql
- id (UUID PRIMARY KEY)
- user_id (UUID, references users)
- current_streak (INTEGER)
- longest_streak (INTEGER)
- last_login_date (DATE)
- current_day_in_cycle (1-7)
- last_claim_date (DATE)
- can_claim_today (BOOLEAN)
- total_logins (INTEGER)
- total_rewards_claimed (INTEGER)
- created_at, updated_at (TIMESTAMP)
```

#### 3. `user_reward_history`
Historical record of all claimed rewards.

```sql
- id (UUID PRIMARY KEY)
- user_id (UUID)
- reward_type (VARCHAR)
- reward_amount (INTEGER)
- reward_duration_hours (INTEGER)
- day_in_cycle (INTEGER)
- streak_at_claim (INTEGER)
- claimed_at (TIMESTAMP)
- expires_at (TIMESTAMP, for time-limited rewards)
```

#### 4. `achievements`
Master list of all available achievements.

```sql
- id (UUID PRIMARY KEY)
- name (VARCHAR)
- slug (VARCHAR, unique)
- description (TEXT)
- category (profile, social, activity, hidden)
- requirement_type (profile_completion, photo_count, verify_phone, etc.)
- requirement_value (INTEGER)
- reward_coins (INTEGER)
- reward_super_likes (INTEGER)
- reward_boosts (INTEGER)
- icon_name (VARCHAR)
- icon_color (VARCHAR)
- badge_image_url (VARCHAR)
- tier (bronze, silver, gold, platinum, diamond)
- is_hidden (BOOLEAN)
- is_active (BOOLEAN)
- display_order (INTEGER)
- created_at, updated_at (TIMESTAMP)
```

**Default Achievements (17 total):**
- 5 Profile achievements
- 7 Social achievements
- 7 Activity achievements
- 4 Hidden achievements

#### 5. `user_achievements`
Tracks user progress on achievements.

```sql
- id (UUID PRIMARY KEY)
- user_id (UUID)
- achievement_id (UUID)
- current_progress (INTEGER)
- required_progress (INTEGER)
- is_unlocked (BOOLEAN)
- unlocked_at (TIMESTAMP)
- shown_on_profile (BOOLEAN)
- notification_sent (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### 6. `achievement_progress_events`
Logs all events that contribute to achievements.

```sql
- id (UUID PRIMARY KEY)
- user_id (UUID)
- event_type (VARCHAR)
- event_value (INTEGER)
- metadata (JSONB)
- created_at (TIMESTAMP)
```

### Views

#### `v_user_streak_stats`
Aggregated streak statistics with user tier classification.

#### `v_achievement_completion_rate`
Per-user achievement completion percentages.

#### `v_user_achievement_showcase`
User achievements displayed on profiles.

---

## Backend Services

### Location
`backend/services/user-service/src/`

### Services Implemented

#### 1. RewardsService (`services/rewards.service.ts`)

**Key Methods:**

```typescript
// Initialize user streak record
initializeUserStreak(userId: string): Promise<UserLoginStreak>

// Get user's complete streak status
getUserStreakStatus(userId: string): Promise<UserStreakStatus>

// Record daily login and update streak
recordLogin(userId: string): Promise<StreakCheckResult>

// Claim daily reward
claimDailyReward(userId: string): Promise<RewardClaimResult>

// Get reward configuration for a specific day
getRewardConfig(dayNumber: number): Promise<DailyRewardConfig>

// Get user's reward claim history
getUserRewardHistory(filters: RewardHistoryFilters): Promise<UserRewardHistory[]>
```

**Features:**
- Automatic streak calculation
- Streak break detection (missed > 1 day)
- 24-hour claim cooldown
- Automatic reward granting (coins, super likes, boosts, premium)
- Cycle management (resets to day 1 after day 7)

#### 2. AchievementsService (`services/achievements.service.ts`)

**Key Methods:**

```typescript
// Get all achievements with optional filters
getAllAchievements(filters?: AchievementFilters): Promise<Achievement[]>

// Get user's achievements with progress
getUserAchievements(userId: string, includeHidden?: boolean): Promise<UserAchievementWithDetails[]>

// Get unlocked achievements only
getUnlockedAchievements(userId: string): Promise<UserAchievementWithDetails[]>

// Get showcased achievements (max 5)
getShowcaseAchievements(userId: string): Promise<UserAchievementWithDetails[]>

// Toggle achievement on profile showcase
toggleAchievementShowcase(userId: string, achievementId: string, show: boolean): Promise<boolean>

// Get user achievement statistics
getUserAchievementStats(userId: string): Promise<UserAchievementStats>

// Update achievement progress
updateProgress(update: AchievementProgressUpdate): Promise<AchievementUnlockResult[]>

// Initialize achievements for new user
initializeUserAchievements(userId: string): Promise<void>
```

**Features:**
- Automatic progress tracking
- Real-time unlock detection
- Automatic reward granting
- Progress event logging
- Category-based filtering
- Tier-based organization

---

## API Endpoints

### Rewards Endpoints

#### `GET /api/rewards/streak`
Get user's current streak status.

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStreak": 5,
    "longestStreak": 12,
    "currentDayInCycle": 5,
    "canClaimToday": true,
    "lastLoginDate": "2025-12-02",
    "lastClaimDate": "2025-12-01",
    "totalLogins": 45,
    "totalRewardsClaimed": 30,
    "hoursUntilNextClaim": 0,
    "todayReward": { ... },
    "nextRewards": [ ... ]
  }
}
```

#### `POST /api/rewards/login`
Record user login and update streak.

**Response:**
```json
{
  "success": true,
  "data": {
    "streakBroken": false,
    "currentStreak": 6,
    "daysSkipped": 0,
    "message": "Great! Your streak is now 6 days!"
  }
}
```

#### `POST /api/rewards/claim`
Claim daily reward.

**Response:**
```json
{
  "success": true,
  "message": "Reward claimed successfully!",
  "data": {
    "reward": {
      "type": "coins",
      "amount": 30,
      "dayNumber": 5
    },
    "currentStreak": 5,
    "nextReward": { ... },
    "expiresAt": null
  }
}
```

#### `GET /api/rewards/calendar`
Get the 7-day reward calendar with user's current status.

#### `GET /api/rewards/history`
Get user's reward claim history with pagination.

**Query Params:**
- `limit` (default: 50)
- `offset` (default: 0)
- `rewardType` (optional filter)

#### `GET /api/rewards/stats`
Get user's overall reward statistics.

### Achievements Endpoints

#### `GET /api/achievements`
Get all available achievements.

**Query Params:**
- `category` (profile, social, activity, hidden)
- `tier` (bronze, silver, gold, platinum, diamond)
- `includeHidden` (true/false)

#### `GET /api/achievements/:id`
Get specific achievement by ID.

#### `GET /api/achievements/user/me`
Get current user's achievements with progress.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "userId": "...",
      "achievementId": "...",
      "currentProgress": 75,
      "requiredProgress": 100,
      "isUnlocked": false,
      "achievement": {
        "name": "Profile Pioneer",
        "description": "Complete your profile to 100%",
        "category": "profile",
        "tier": "bronze",
        "rewardCoins": 50,
        ...
      }
    }
  ]
}
```

#### `GET /api/achievements/user/me/unlocked`
Get only unlocked achievements.

#### `GET /api/achievements/user/me/showcase`
Get achievements showcased on profile (max 5).

#### `GET /api/achievements/user/:userId/showcase`
Get another user's showcased achievements.

#### `PUT /api/achievements/:achievementId/showcase`
Toggle achievement showcase on profile.

**Body:**
```json
{
  "show": true
}
```

#### `GET /api/achievements/user/me/stats`
Get achievement statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalAchievements": 17,
    "unlockedAchievements": 8,
    "completionPercentage": 47,
    "totalRewardsEarned": {
      "coins": 450,
      "superLikes": 3,
      "boosts": 1
    }
  }
}
```

#### `POST /api/achievements/progress` (Internal)
Update achievement progress (called by other services).

**Body:**
```json
{
  "userId": "...",
  "requirementType": "match_count",
  "incrementValue": 1
}
```

#### `POST /api/achievements/initialize/:userId` (Internal)
Initialize achievements for a new user.

#### `POST /api/achievements` (Admin)
Create new achievement.

#### `PUT /api/achievements/:id` (Admin)
Update achievement.

---

## Frontend Components

### Location
`apps/mobile-app/src/components/`

### Rewards Components

#### 1. `DailyLoginRewards.tsx` (`rewards/`)
Full-featured daily login rewards calendar.

**Features:**
- Horizontal scrollable 7-day calendar
- Visual indicators for current day, completed days
- Claim button with loading state
- Animated reward claim modal
- Countdown timer for next claim
- Gradient cards with tier-based colors

**Props:**
```typescript
interface DailyLoginRewardsProps {
  onRewardClaimed?: (reward: any) => void;
}
```

**Usage:**
```tsx
<DailyLoginRewards
  onRewardClaimed={(reward) => {
    console.log('Reward claimed:', reward);
    // Update user balance, show notification, etc.
  }}
/>
```

#### 2. `StreakTracker.tsx` (`rewards/`)
Visual streak progress indicator.

**Features:**
- Animated fire icon for active streaks
- Streak level classification (Beginner, Active, Champion, Master, Legendary)
- Longest streak display
- Total logins counter
- Progress bar to next milestone
- Pulsing animations

**Props:**
```typescript
interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
  totalLogins: number;
  animated?: boolean;
}
```

**Usage:**
```tsx
<StreakTracker
  currentStreak={user.currentStreak}
  longestStreak={user.longestStreak}
  totalLogins={user.totalLogins}
  animated={true}
/>
```

### Achievements Components

#### 3. `AchievementsList.tsx` (`achievements/`)
Complete list of all achievements with progress.

**Features:**
- Category filtering (All, Profile, Social, Activity)
- Progress bars for locked achievements
- Tier-based gradient cards
- Unlock indicators
- Reward display (coins, super likes, boosts)
- Unlock date display

**Props:**
```typescript
interface AchievementsListProps {
  onAchievementPress?: (achievement: Achievement) => void;
}
```

**Usage:**
```tsx
<AchievementsList
  onAchievementPress={(achievement) => {
    // Show achievement detail modal
  }}
/>
```

#### 4. `AchievementShowcase.tsx` (`achievements/`)
Showcase component for user profiles (max 5 achievements).

**Features:**
- Horizontal scrollable showcase
- Edit mode for own profile
- Add more button (if < 5)
- Empty state with call-to-action
- Tier-based gradients

**Props:**
```typescript
interface AchievementShowcaseProps {
  userId?: string;
  editable?: boolean;
  onEdit?: () => void;
}
```

**Usage:**
```tsx
// On own profile
<AchievementShowcase
  editable={true}
  onEdit={() => {
    // Navigate to achievement selection screen
  }}
/>

// On other user's profile
<AchievementShowcase userId={otherUserId} />
```

#### 5. `AchievementStats.tsx` (`achievements/`)
Overall statistics display.

**Features:**
- Circular progress indicator
- Completion percentage
- Total unlocked count
- Rewards earned breakdown
- Gradient background

**Usage:**
```tsx
<AchievementStats />
```

---

## Integration Guide

### 1. Database Setup

```bash
# Navigate to database directory
cd database/migrations

# Run migration
psql -U your_username -d your_database -f 20251202_create_rewards_achievements_tables.sql
```

### 2. Backend Integration

#### Update main server file to include routes

```typescript
// backend/services/user-service/src/index.ts
import { createRewardsRoutes } from './api/routes/rewards.routes';
import { createAchievementsRoutes } from './api/routes/achievements.routes';

// Add routes
app.use('/api/rewards', authMiddleware, createRewardsRoutes(dbPool));
app.use('/api/achievements', authMiddleware, createAchievementsRoutes(dbPool));
```

#### Hook into existing user flows

```typescript
// On user registration
import { AchievementsService } from './services/achievements.service';

async function registerUser(userData) {
  const user = await createUser(userData);

  // Initialize achievements
  const achievementsService = new AchievementsService(dbPool);
  await achievementsService.initializeUserAchievements(user.id);

  return user;
}

// On user login
import { RewardsService } from './services/rewards.service';

async function loginUser(userId) {
  const rewardsService = new RewardsService(dbPool);
  const streakResult = await rewardsService.recordLogin(userId);

  // Optionally notify user if streak was broken
  if (streakResult.streakBroken) {
    // Send notification
  }
}
```

#### Trigger achievement progress

```typescript
// When user gets a match
import { AchievementsService } from './services/achievements.service';

async function createMatch(userId1, userId2) {
  // ... create match logic

  const achievementsService = new AchievementsService(dbPool);

  // Update achievement progress for both users
  await achievementsService.updateProgress({
    userId: userId1,
    requirementType: 'match_count',
    incrementValue: 1
  });

  await achievementsService.updateProgress({
    userId: userId2,
    requirementType: 'match_count',
    incrementValue: 1
  });
}

// When user completes profile
async function updateProfile(userId, profileData) {
  // ... update profile logic

  const completion = calculateProfileCompletion(profileData);

  const achievementsService = new AchievementsService(dbPool);
  await achievementsService.updateProgress({
    userId,
    requirementType: 'profile_completion',
    absoluteValue: completion // Use absolute value for percentage-based achievements
  });
}
```

### 3. Frontend Integration

#### Create screens

```typescript
// screens/RewardsScreen.tsx
import React from 'react';
import { ScrollView } from 'react-native';
import { DailyLoginRewards } from '../components/rewards/DailyLoginRewards';
import { StreakTracker } from '../components/rewards/StreakTracker';

export const RewardsScreen = () => {
  return (
    <ScrollView>
      <DailyLoginRewards onRewardClaimed={handleRewardClaimed} />
      <StreakTracker {...streakData} />
    </ScrollView>
  );
};

// screens/AchievementsScreen.tsx
import React from 'react';
import { View } from 'react-native';
import { AchievementStats } from '../components/achievements/AchievementStats';
import { AchievementsList } from '../components/achievements/AchievementsList';

export const AchievementsScreen = () => {
  return (
    <View>
      <AchievementStats />
      <AchievementsList onAchievementPress={handlePress} />
    </View>
  );
};
```

#### Add to navigation

```typescript
// navigation/MainNavigator.tsx
import { RewardsScreen } from '../screens/RewardsScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';

const Tab = createBottomTabNavigator();

<Tab.Navigator>
  {/* ... other tabs */}
  <Tab.Screen
    name="Rewards"
    component={RewardsScreen}
    options={{
      tabBarIcon: ({ color }) => <Icon name="gift" size={24} color={color} />
    }}
  />
  <Tab.Screen
    name="Achievements"
    component={AchievementsScreen}
    options={{
      tabBarIcon: ({ color }) => <Icon name="award" size={24} color={color} />
    }}
  />
</Tab.Navigator>
```

#### Add to profile

```typescript
// screens/ProfileScreen.tsx
import { AchievementShowcase } from '../components/achievements/AchievementShowcase';

export const ProfileScreen = () => {
  return (
    <ScrollView>
      {/* ... other profile sections */}
      <AchievementShowcase editable={true} onEdit={navigateToAchievementSelection} />
    </ScrollView>
  );
};
```

---

## Testing

### Database Tests

```sql
-- Test reward calendar setup
SELECT * FROM daily_login_rewards ORDER BY day_number;

-- Test user streak initialization
INSERT INTO users (id, email, password_hash) VALUES ('test-user-id', 'test@example.com', 'hash');
-- Should auto-create streak record via trigger or service

-- Test achievement seeding
SELECT COUNT(*) FROM achievements WHERE is_active = true;
-- Should return 17 default achievements
```

### API Tests

```bash
# Test streak status
curl -X GET http://localhost:3000/api/rewards/streak \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test reward claim
curl -X POST http://localhost:3000/api/rewards/claim \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test achievements list
curl -X GET "http://localhost:3000/api/achievements?category=profile" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test achievement progress update
curl -X POST http://localhost:3000/api/achievements/progress \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-id",
    "requirementType": "match_count",
    "incrementValue": 1
  }'
```

### Component Tests

```typescript
// Test DailyLoginRewards component
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { DailyLoginRewards } from './DailyLoginRewards';

test('displays 7-day calendar', async () => {
  const { getAllByTestId } = render(<DailyLoginRewards />);
  await waitFor(() => {
    const cards = getAllByTestId('reward-card');
    expect(cards).toHaveLength(7);
  });
});

test('claims reward successfully', async () => {
  const onRewardClaimed = jest.fn();
  const { getByText } = render(<DailyLoginRewards onRewardClaimed={onRewardClaimed} />);

  await waitFor(() => {
    fireEvent.press(getByText('Claim Now!'));
  });

  expect(onRewardClaimed).toHaveBeenCalled();
});
```

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Rewards Metrics:**
   - Daily active users claiming rewards
   - Average streak length
   - Reward claim rate
   - Most popular reward types
   - Streak retention rate (7-day, 30-day)

2. **Achievement Metrics:**
   - Average completion percentage per user
   - Most commonly unlocked achievements
   - Time to unlock per achievement
   - Showcase usage rate
   - Achievement engagement (views, interactions)

### Analytics Queries

```sql
-- Top performing achievements
SELECT a.name, COUNT(ua.id) as unlock_count
FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.is_unlocked = true
GROUP BY a.id, a.name
ORDER BY unlock_count DESC;

-- Average streak length
SELECT AVG(current_streak) as avg_streak, AVG(longest_streak) as avg_longest
FROM user_login_streaks;

-- Reward claim rate
SELECT
  DATE(claimed_at) as date,
  COUNT(*) as claims,
  COUNT(DISTINCT user_id) as unique_users
FROM user_reward_history
WHERE claimed_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(claimed_at)
ORDER BY date DESC;
```

---

## Future Enhancements

1. **Seasonal Events:**
   - Special limited-time reward cycles
   - Holiday-themed achievements
   - Bonus multipliers during events

2. **Social Features:**
   - Share achievements on feed
   - Compare progress with friends
   - Team/guild achievements

3. **Personalization:**
   - AI-recommended achievements based on behavior
   - Custom achievement goals
   - Personalized reward preferences

4. **Gamification:**
   - Leaderboards for streaks and achievements
   - Weekly challenges
   - Achievement combos with bonus rewards

5. **Advanced Analytics:**
   - Predictive streak break alerts
   - Achievement difficulty balancing
   - A/B testing for reward values

---

## Support & Documentation

For issues or questions:
- Backend API: See inline JSDoc comments in service files
- Database: Refer to schema comments in migration file
- Frontend: Check component PropTypes and inline comments

## License

Copyright 2025 Flamoral. All rights reserved.
