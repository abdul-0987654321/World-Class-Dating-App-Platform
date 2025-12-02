# Daily Login Rewards & Achievements - Quick Start Guide

## Quick Setup (5 Minutes)

### 1. Database Setup

```bash
# Connect to your PostgreSQL database
psql -U your_username -d flamoral_db

# Run the migration
\i database/migrations/20251202_create_rewards_achievements_tables.sql

# Verify tables were created
\dt *reward* *achievement* *streak*
```

### 2. Backend Setup

The services and routes are already created. Just add them to your main server:

```typescript
// backend/services/user-service/src/index.ts

import { createRewardsRoutes } from './api/routes/rewards.routes';
import { createAchievementsRoutes } from './api/routes/achievements.routes';
import { Pool } from 'pg';

// Initialize database pool (you probably already have this)
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Add routes (after authentication middleware)
app.use('/api/rewards', authMiddleware, createRewardsRoutes(dbPool));
app.use('/api/achievements', authMiddleware, createAchievementsRoutes(dbPool));
```

### 3. Frontend Setup

Add the components to your app:

```typescript
// Create a RewardsScreen
// apps/mobile-app/src/screens/RewardsScreen.tsx

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { DailyLoginRewards } from '../components/rewards';

export const RewardsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <DailyLoginRewards />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
```

```typescript
// Create an AchievementsScreen
// apps/mobile-app/src/screens/AchievementsScreen.tsx

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { AchievementStats, AchievementsList } from '../components/achievements';

export const AchievementsScreen = () => {
  return (
    <ScrollView style={styles.container}>
      <AchievementStats />
      <AchievementsList />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
});
```

### 4. Add to Navigation

```typescript
// apps/mobile-app/src/navigation/MainNavigator.tsx

import Icon from 'react-native-vector-icons/Feather';
import { RewardsScreen } from '../screens/RewardsScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';

// Add to your tab navigator
<Tab.Screen
  name="Rewards"
  component={RewardsScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Icon name="gift" size={size} color={color} />
    ),
  }}
/>

<Tab.Screen
  name="Achievements"
  component={AchievementsScreen}
  options={{
    tabBarIcon: ({ color, size }) => (
      <Icon name="award" size={size} color={color} />
    ),
  }}
/>
```

### 5. Hook into User Events

```typescript
// When user logs in
// backend/services/user-service/src/api/controllers/auth.controller.ts

import { RewardsService } from '../../services/rewards.service';

async login(req, res) {
  // ... existing login logic

  const rewardsService = new RewardsService(dbPool);
  await rewardsService.recordLogin(user.id);

  // ... return response
}
```

```typescript
// When user creates a match
// backend/services/matching-service/src/services/match.service.ts

import { AchievementsService } from '@user-service/services/achievements.service';

async createMatch(userId1, userId2) {
  // ... create match logic

  const achievementsService = new AchievementsService(dbPool);

  // Check for first match achievement
  await achievementsService.updateProgress({
    userId: userId1,
    requirementType: 'first_match',
    incrementValue: 1
  });

  // Track match count
  await achievementsService.updateProgress({
    userId: userId1,
    requirementType: 'match_count',
    incrementValue: 1
  });
}
```

### 6. Initialize for New Users

```typescript
// backend/services/user-service/src/services/user.service.ts

import { AchievementsService } from './achievements.service';
import { RewardsService } from './rewards.service';

async createUser(userData) {
  const user = await insertUser(userData);

  // Initialize achievements
  const achievementsService = new AchievementsService(dbPool);
  await achievementsService.initializeUserAchievements(user.id);

  // Initialize streak
  const rewardsService = new RewardsService(dbPool);
  await rewardsService.initializeUserStreak(user.id);

  return user;
}
```

## Testing

### Test the API

```bash
# Get streak status
curl http://localhost:3000/api/rewards/streak \
  -H "Authorization: Bearer YOUR_TOKEN"

# Claim reward
curl -X POST http://localhost:3000/api/rewards/claim \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get achievements
curl http://localhost:3000/api/achievements/user/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test the UI

1. Start your app
2. Navigate to Rewards tab
3. You should see the 7-day calendar
4. Click "Claim Now!" on the current day
5. Navigate to Achievements tab
6. You should see your progress

## Common Integration Points

### Update Profile Completion

```typescript
// When user updates their profile
async updateProfile(userId, profileData) {
  // ... update profile

  const completion = calculateProfileCompletion(profileData);

  const achievementsService = new AchievementsService(dbPool);
  await achievementsService.updateProgress({
    userId,
    requirementType: 'profile_completion',
    absoluteValue: completion // Use absolute value for percentages
  });
}
```

### Track Photo Uploads

```typescript
// When user uploads a photo
async uploadPhoto(userId, photoData) {
  // ... upload photo

  const photoCount = await getPhotoCount(userId);

  const achievementsService = new AchievementsService(dbPool);
  await achievementsService.updateProgress({
    userId,
    requirementType: 'photo_count',
    absoluteValue: photoCount
  });
}
```

### Track Swipes

```typescript
// When user swipes
async recordSwipe(userId, targetUserId, action) {
  // ... record swipe

  const achievementsService = new AchievementsService(dbPool);
  await achievementsService.updateProgress({
    userId,
    requirementType: 'swipe_count',
    incrementValue: 1
  });
}
```

### Track Messages

```typescript
// When user sends a message
async sendMessage(userId, receiverId, content) {
  // ... send message

  const achievementsService = new AchievementsService(dbPool);

  // First message achievement
  await achievementsService.updateProgress({
    userId,
    requirementType: 'first_message',
    incrementValue: 1
  });

  // Total messages
  await achievementsService.updateProgress({
    userId,
    requirementType: 'message_count',
    incrementValue: 1
  });
}
```

## Dependencies Required

Make sure you have these packages installed:

```bash
# Backend
npm install pg @types/pg

# Mobile App
npm install react-native-vector-icons
npm install expo-linear-gradient
npm install react-native-circular-progress
```

## Environment Variables

Add to your `.env`:

```bash
# These should already exist
DATABASE_URL=postgresql://user:password@localhost:5432/flamoral_db
JWT_SECRET=your-secret-key
```

## File Structure

```
backend/services/user-service/
├── src/
│   ├── domain/
│   │   └── entities/
│   │       ├── Achievement.entity.ts
│   │       ├── UserAchievement.entity.ts
│   │       ├── DailyLoginReward.entity.ts
│   │       ├── UserLoginStreak.entity.ts
│   │       ├── UserRewardHistory.entity.ts
│   │       └── AchievementProgressEvent.entity.ts
│   ├── services/
│   │   ├── rewards.service.ts
│   │   └── achievements.service.ts
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── rewards.controller.ts
│   │   │   └── achievements.controller.ts
│   │   └── routes/
│   │       ├── rewards.routes.ts
│   │       └── achievements.routes.ts

apps/mobile-app/
├── src/
│   ├── components/
│   │   ├── rewards/
│   │   │   ├── DailyLoginRewards.tsx
│   │   │   ├── StreakTracker.tsx
│   │   │   └── index.ts
│   │   └── achievements/
│   │       ├── AchievementsList.tsx
│   │       ├── AchievementShowcase.tsx
│   │       ├── AchievementStats.tsx
│   │       └── index.ts
│   └── screens/
│       ├── RewardsScreen.tsx
│       └── AchievementsScreen.tsx

database/
└── migrations/
    └── 20251202_create_rewards_achievements_tables.sql
```

## Next Steps

1. Customize reward values in `daily_login_rewards` table
2. Add custom achievements via admin API
3. Integrate with your notification system
4. Add analytics tracking
5. Create leaderboards
6. Add social sharing

## Support

For detailed documentation, see `REWARDS_ACHIEVEMENTS_IMPLEMENTATION.md`

## Troubleshooting

**Q: Rewards not claiming?**
A: Check that user has `can_claim_today = true` in `user_login_streaks` table.

**Q: Achievements not unlocking?**
A: Verify achievement progress is being tracked via `achievement_progress_events` table.

**Q: Components not rendering?**
A: Make sure you have all dependencies installed and API endpoints are accessible.

**Q: Database errors?**
A: Verify migration ran successfully and all tables exist.
