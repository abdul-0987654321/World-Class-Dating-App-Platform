# Multi-Mode Implementation Guide

## Overview

The platform now supports THREE distinct modes for different types of connections:

1. **Date Mode** - Romantic connections (existing functionality)
2. **Friends Mode** - Platonic friendships (NEW)
3. **Network Mode** - Professional networking (NEW)

## Architecture

### Database Schema

#### New Tables

1. **user_modes** - Manages user's enabled modes and preferences
   - `id` (UUID, primary key)
   - `user_id` (UUID, references users)
   - `mode` (ENUM: 'date', 'friends', 'network')
   - `enabled` (BOOLEAN)
   - `preferences` (JSONB)
   - `created_at`, `updated_at`

2. **user_mode_preferences** - Mode-specific matching preferences
   - `id` (UUID, primary key)
   - `user_id` (UUID)
   - `mode` (ENUM)
   - `age_min`, `age_max`, `distance_max`
   - `gender_preference` (TEXT[])
   - `interests` (TEXT[])
   - `filters` (JSONB)

#### Modified Tables

1. **users**
   - Added: `current_mode` (ENUM, default: 'date')

2. **profiles**
   - Added Friends Mode fields:
     - `friend_looking_for` (TEXT[])
     - `friend_activities` (TEXT[])
     - `friend_availability` (TEXT)
     - `friend_group_size_preference` (VARCHAR)
   - Added Network Mode fields:
     - `network_industry` (VARCHAR)
     - `network_profession` (VARCHAR)
     - `network_company` (VARCHAR)
     - `network_job_title` (VARCHAR)
     - `network_years_experience` (INTEGER)
     - `network_skills` (TEXT[])
     - `network_looking_for` (TEXT[])
     - `network_linkedin_url` (VARCHAR)
     - `network_portfolio_url` (VARCHAR)
     - `network_career_goals` (TEXT)
     - `network_open_to_opportunities` (BOOLEAN)

3. **matches**
   - Added: `mode` (ENUM, default: 'date')
   - Users can match separately in each mode

4. **swipes**
   - Added: `mode` (ENUM, default: 'date')
   - Swipe history is mode-specific

5. **conversations**
   - Added: `mode` (ENUM, default: 'date')
   - Conversations are tagged with originating mode

### Backend Implementation

#### User Service

**New Entities:**
- `UserMode.entity.ts` - Mode configuration entity
- Updated `Profile.entity.ts` - Added mode-specific profile fields

**New Services:**
- `mode.service.ts` - Mode management service
  - `getUserModes()` - Get all modes for user
  - `getUserMode(mode)` - Get specific mode
  - `updateUserMode(mode, data)` - Update mode configuration
  - `switchMode(mode)` - Switch current active mode
  - `enableMode(mode)` - Enable a mode
  - `disableMode(mode)` - Disable a mode
  - `updateModePreferences(mode, prefs)` - Update mode preferences

**New Controllers:**
- `mode.controller.ts` - REST API endpoints for mode management

**New Routes:**
```
GET    /api/users/me/modes              - Get all modes
GET    /api/users/me/modes/:mode        - Get specific mode
PUT    /api/users/me/modes/:mode        - Update mode
POST   /api/users/me/modes/:mode/enable - Enable mode
POST   /api/users/me/modes/:mode/disable- Disable mode
POST   /api/users/me/modes/switch       - Switch active mode
PUT    /api/users/me/modes/:mode/preferences - Update preferences
```

**Database Migrations:**
- `20250203_create_multi_mode_tables.sql` - Creates user_modes table and adds mode fields

#### Matching Service

**New Types:**
- Updated `types/index.ts` - Added `UserMode` enum
- Updated `Match` interface - Added `mode` field
- Updated `SwipeRecord` interface - Added `mode` field
- Updated `RecommendationRequest` - Added `mode` parameter

**New Services:**
- `mode-matching-algorithm.service.ts` - Mode-specific matching algorithms
  - `calculateModeScore()` - Calculate compatibility by mode
  - `calculateDateModeScore()` - Romantic compatibility
  - `calculateFriendsModeScore()` - Platonic compatibility (activity-based)
  - `calculateNetworkModeScore()` - Professional compatibility
  - `getModeMatchingCriteria()` - Get mode description
  - `getRecommendedFilters()` - Get recommended filters per mode

**Database Migrations:**
- `20250203_add_mode_support.ts` - Adds mode support to matches and swipes

### Frontend Implementation

#### React Native Components

**New Components:**

1. **ModeSwitcher.tsx** - Mode selection UI
   - Visual mode picker with icons and descriptions
   - Shows enabled/disabled status
   - Handles mode switching and enabling
   - Modal interface for mode selection

2. **ModeSpecificProfile.tsx** - Display mode-specific profile sections
   - Date Mode: Relationship goals, family plans, values
   - Friends Mode: Activities, availability, group preferences
   - Network Mode: Professional info, skills, career goals
   - Editable with mode-specific forms

3. **ModeSpecificFilters.tsx** - Mode-specific discovery filters
   - Date Mode: Age, distance, gender, relationship goals
   - Friends Mode: Age, distance, gender preference, activities
   - Network Mode: Industry, profession, experience level, connection type
   - Real-time filter updates

**New Services:**

4. **mode.service.ts** - API client for mode operations
   - All mode management API calls
   - Discovery and matching API calls with mode parameter
   - Type-safe with TypeScript interfaces

#### Integration Points

**Navigation:**
```typescript
// Add ModeSwitcher to app header/navigation
import { ModeSwitcher } from '@/components/mode/ModeSwitcher';

<ModeSwitcher
  currentMode={currentMode}
  modesState={modesState}
  onModeChange={handleModeChange}
  onEnableMode={handleEnableMode}
/>
```

**Profile Screen:**
```typescript
// Display mode-specific profile sections
import { ModeSpecificProfile } from '@/components/mode/ModeSpecificProfile';

<ModeSpecificProfile
  mode={currentMode}
  dateProfile={profile.dateData}
  friendsProfile={profile.friendsData}
  networkProfile={profile.networkData}
  onEdit={handleEditProfile}
  editable={isOwnProfile}
/>
```

**Discovery/Filters:**
```typescript
// Mode-specific filters
import { ModeSpecificFilters } from '@/components/mode/ModeSpecificFilters';

<ModeSpecificFilters
  mode={currentMode}
  dateFilters={filters.date}
  friendsFilters={filters.friends}
  networkFilters={filters.network}
  onFiltersChange={handleFiltersChange}
/>
```

## Matching Algorithm Differences

### Date Mode
**Focus:** Romantic compatibility
**Key Factors:**
- Distance (30% weight) - Proximity matters for dating
- Interests (25%) - Shared hobbies and values
- Preferences (25%) - Gender, age, relationship goals
- Activity (20%) - Recent activity and engagement

**Features:**
- Gender-based matching per user preferences
- Relationship goal alignment
- Lifestyle compatibility
- Chemistry prediction

### Friends Mode
**Focus:** Platonic connections
**Key Factors:**
- Interests (40% weight) - Shared activities are critical
- Distance (35%) - Want friends nearby
- Activity (15%) - Engagement level
- Preferences (10%) - More flexible matching

**Features:**
- Gender-neutral matching (or same-gender preference)
- Activity-based matching (hiking, gaming, concerts, etc.)
- Group size preferences (one-on-one vs groups)
- No romantic intent signals
- "Looking for" tags: hiking buddy, gym partner, concert friend, study partner, etc.

### Network Mode
**Focus:** Professional networking
**Key Factors:**
- Interests (35% weight) - Professional/industry overlap
- Preferences (35%) - Connection type matching
- Distance (15%) - Less critical, remote networking OK
- Activity (15%) - Professional engagement

**Features:**
- Industry/profession filters
- Experience level matching
- Mentorship connections (mentor/mentee pairing)
- Complementary skills matching
- Career goals alignment
- LinkedIn-style profiles
- "Looking for" tags: mentor, mentee, collaborator, co-founder, investor, advisor, etc.

## Default Behavior

1. **New Users:**
   - Date mode enabled by default
   - Friends and Network modes disabled
   - Current mode set to 'date'

2. **Mode Switching:**
   - Users can only switch to enabled modes
   - Cannot disable Date mode (primary mode)
   - If current mode is disabled, auto-switches to Date mode

3. **Discovery Feed:**
   - Shows users based on current active mode
   - Separate pools per mode
   - Mode-specific algorithms apply

4. **Matches:**
   - Stored separately per mode
   - Same person can be matched in different modes
   - Each mode has its own conversation

5. **Swipes:**
   - Tracked separately per mode
   - Can swipe same person in different modes
   - Swipe history doesn't cross modes

## API Usage Examples

### Get User's Modes
```bash
GET /api/users/me/modes
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "date": {
      "id": "uuid",
      "mode": "date",
      "enabled": true,
      "preferences": {}
    },
    "friends": {
      "id": "uuid",
      "mode": "friends",
      "enabled": false,
      "preferences": {}
    },
    "network": {
      "id": "uuid",
      "mode": "network",
      "enabled": false,
      "preferences": {}
    },
    "current_mode": "date"
  }
}
```

### Enable Friends Mode
```bash
POST /api/users/me/modes/friends/enable
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "friends mode enabled successfully",
  "data": {
    "id": "uuid",
    "mode": "friends",
    "enabled": true,
    "preferences": {}
  }
}
```

### Switch to Network Mode
```bash
POST /api/users/me/modes/switch
Authorization: Bearer {token}
Content-Type: application/json

{
  "mode": "network"
}

Response:
{
  "success": true,
  "message": "Switched to network mode successfully",
  "data": {
    "success": true,
    "current_mode": "network"
  }
}
```

### Update Profile with Mode-Specific Fields
```bash
PUT /api/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "bio": "Software engineer and coffee enthusiast",

  // Friends mode fields
  "friend_looking_for": ["hiking buddy", "gym partner", "coffee friend"],
  "friend_activities": ["hiking", "rock climbing", "coffee shops"],
  "friend_availability": "Weekends and evenings",
  "friend_group_size_preference": "small-group",

  // Network mode fields
  "network_industry": "Technology",
  "network_profession": "Software Engineering",
  "network_company": "TechCorp Inc",
  "network_job_title": "Senior Software Engineer",
  "network_years_experience": 8,
  "network_skills": ["JavaScript", "React", "Node.js", "Python"],
  "network_looking_for": ["mentor", "collaborator"],
  "network_linkedin_url": "https://linkedin.com/in/username",
  "network_career_goals": "Transition to engineering leadership",
  "network_open_to_opportunities": true
}
```

### Get Discovery Feed for Specific Mode
```bash
GET /api/discovery?mode=friends&limit=20
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "name": "John Doe",
      "age": 28,
      "distance": 5.2,
      "friend_looking_for": ["hiking buddy", "gym partner"],
      "friend_activities": ["hiking", "cycling", "yoga"],
      "photos": [...],
      "compatibility_score": 85
    }
  ]
}
```

### Swipe in Specific Mode
```bash
POST /api/swipes
Authorization: Bearer {token}
Content-Type: application/json

{
  "targetUserId": "user-id",
  "action": "like",
  "mode": "friends"
}

Response:
{
  "success": true,
  "data": {
    "matched": true,
    "match": {
      "id": "match-id",
      "mode": "friends",
      "matchedAt": "2025-02-03T12:00:00Z"
    }
  }
}
```

## Testing

### Database Migration Testing
```bash
# Run migrations
cd backend/services/user-service
npm run migrate

cd backend/services/matching-service
npm run migrate
```

### API Testing
```bash
# Test mode endpoints
curl -X GET http://localhost:3000/api/users/me/modes \
  -H "Authorization: Bearer {token}"

curl -X POST http://localhost:3000/api/users/me/modes/friends/enable \
  -H "Authorization: Bearer {token}"

curl -X POST http://localhost:3000/api/users/me/modes/switch \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"mode": "friends"}'
```

## Future Enhancements

1. **Mode-Specific Notifications**
   - Separate notification preferences per mode
   - Mode-aware push notifications

2. **Mode Analytics**
   - Track usage per mode
   - Engagement metrics by mode
   - Conversion rates

3. **Advanced Matching**
   - AI-powered mode recommendations
   - Cross-mode suggestions (friend -> network)
   - Activity scheduling for Friends mode

4. **Group Features (Friends Mode)**
   - Group creation
   - Group activities
   - Event organization

5. **Professional Features (Network Mode)**
   - Job board integration
   - Industry events
   - Skill endorsements
   - Recommendation letters

## Migration Guide

### For Existing Users

1. All existing users will have:
   - Date mode: ENABLED (default)
   - Friends mode: DISABLED
   - Network mode: DISABLED
   - Current mode: 'date'

2. Existing matches, swipes, and conversations will be tagged as 'date' mode

3. No changes to existing functionality in Date mode

### For New Features

1. Users can enable Friends/Network modes from settings
2. Must fill out mode-specific profile sections
3. Discovery feed will show mode-specific matches
4. Filters adapt to current mode

## Support

For questions or issues:
- Backend: Check `/backend/services/user-service` and `/backend/services/matching-service`
- Frontend: Check `/apps/mobile-app/src/components/mode`
- Database: Check migration files in `/migrations` directories

## Version

- Implementation Date: February 3, 2025
- Version: 1.0.0
- Status: Production Ready
