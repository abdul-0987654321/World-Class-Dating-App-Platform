# Discovery/Swipe UI Implementation

Complete implementation of the swipe/discovery UI for the Flamoral mobile dating app with smooth animations, gestures, and match functionality.

## Overview

This implementation includes a fully-featured discovery system with:
- Swipeable card stack with smooth animations
- Left swipe (pass), right swipe (like), up swipe (super like)
- Photo carousel on cards
- Match modal with animations
- Action buttons (like, pass, super-like, boost, rewind)
- Filters for discovery preferences
- Profile details view
- API integration

## Files Created

### Components

1. **SwipeCardEnhanced.tsx** (`src/components/discovery/SwipeCardEnhanced.tsx`)
   - Enhanced swipe card with react-native-reanimated
   - Smooth gesture handling with PanGestureHandler
   - Photo carousel with tap navigation
   - Swipe direction indicators (LIKE, NOPE, SUPER LIKE)
   - Profile info overlay with gradient
   - Interests preview
   - View profile button
   - Action buttons on card

2. **MatchModal.tsx** (`src/components/discovery/MatchModal.tsx`)
   - Animated match celebration modal
   - Profile images with heart icon
   - Confetti background effect
   - Send message and keep swiping actions
   - Bouncy entrance animations
   - Pulsing heart effect

### Screens

3. **DiscoveryScreenEnhanced.tsx** (`src/screens/Main/DiscoveryScreenEnhanced.tsx`)
   - Main discovery screen with full functionality
   - Card stack with preview of next profiles
   - Stats bar (likes, matches, super likes)
   - Action buttons (rewind, super like, boost)
   - Filter integration
   - Loading states and empty states
   - Profile details modal
   - Match modal integration
   - API service integration

### Services

4. **discovery.service.ts** (`src/services/api/discovery.service.ts`)
   - Complete API service for discovery endpoints
   - Get profiles with filters
   - Swipe actions (left, right, super like)
   - Rewind functionality
   - Boost activation
   - Match management
   - Stats and preferences
   - Report and block users

### Types

5. **discovery.types.ts** (`src/types/discovery.types.ts`)
   - TypeScript type definitions
   - DiscoveryProfile interface
   - DiscoveryFilters interface
   - SwipeAction, Match types
   - DiscoveryStats, BoostStatus types
   - Complete type safety

## Features

### 1. Swipe Gestures

- **Left Swipe (Pass)**: Dismiss profile
- **Right Swipe (Like)**: Like profile
- **Up Swipe (Super Like)**: Super like profile
- Smooth animations with interpolation
- Direction indicators during swipe
- Velocity-based swipe detection

### 2. Card Stack

- Preview of next 2 cards behind current card
- Scale and opacity effects for depth
- Smooth transitions between cards
- Loading more profiles automatically

### 3. Photo Carousel

- Tap left/right side of card to navigate photos
- Photo indicators at top
- Smooth transitions between photos
- Support for multiple photos per profile

### 4. Action Buttons

**On Card:**
- Pass (X)
- Super Like (Star)
- Like (Heart)

**Bottom Bar:**
- Rewind (with count badge)
- Super Like (with count badge)
- Boost (with status indicator)

### 5. Match Animation

- Full-screen modal with gradient background
- Animated entrance with bouncy effects
- Profile images with heart icon
- Confetti decoration
- Pulsing animations
- Send message or keep swiping options

### 6. Premium Features

- **Super Likes**: Limited per day (5 default)
- **Rewinds**: Undo last swipe (3 default)
- **Boosts**: 10x profile visibility for 30 minutes
- Badge indicators for remaining counts
- Premium upgrade prompts

### 7. Filters

- Distance range
- Age range
- Height range (optional)
- Education levels
- Relationship goals
- Lifestyle preferences (smoking, drinking, exercise)
- Interests
- Sexual orientations
- Verified only toggle
- Recently active filter

### 8. Stats Display

- Likes received
- Matches today
- Super likes remaining
- Real-time updates

### 9. Profile Details

- Full-screen profile view
- Photo carousel
- Complete bio and info
- Interests and prompts
- Lifestyle information
- Action buttons
- Report and block options

## Usage

### Basic Implementation

```typescript
import DiscoveryScreenEnhanced from './screens/Main/DiscoveryScreenEnhanced';

// In your navigation
<Stack.Screen
  name="Discovery"
  component={DiscoveryScreenEnhanced}
/>
```

### Using Individual Components

```typescript
import { SwipeCardEnhanced, MatchModal } from './components';

// Swipe Card
<SwipeCardEnhanced
  profile={profile}
  onSwipeLeft={handlePass}
  onSwipeRight={handleLike}
  onSwipeUp={handleSuperLike}
  onViewProfile={handleViewProfile}
/>

// Match Modal
<MatchModal
  visible={showMatch}
  userPhoto={userPhoto}
  matchedProfile={matchedProfile}
  onSendMessage={handleSendMessage}
  onKeepSwiping={handleKeepSwiping}
  onClose={handleClose}
/>
```

### API Integration

```typescript
import { discoveryService } from './services/api/discovery.service';

// Get profiles
const response = await discoveryService.getProfiles(filters, cursor, 20);

// Swipe right
const result = await discoveryService.swipeRight(profileId);
if (result.success && result.data?.isMatch) {
  // Show match modal
}

// Super like
const superLikeResult = await discoveryService.superLike(profileId);

// Activate boost
const boostResult = await discoveryService.activateBoost();
```

## Animation Details

### Swipe Card Animations

- Uses `react-native-reanimated` for 60fps performance
- Interpolated rotation based on swipe distance
- Smooth spring animations on release
- Velocity-based swipe detection

### Match Modal Animations

- Delayed sequential animations for each element
- Bouncy spring effects for images
- Pulsing heart animation
- Fade and slide for text content
- Confetti decorations (static positioned)

## State Management

The implementation includes local state management for:
- Current profile index
- Profiles array
- Match state
- Filter preferences
- Premium feature counts
- Loading states

For production, consider integrating with:
- Redux/Redux Toolkit
- React Query for data fetching
- Context API for global state

## API Endpoints

The discovery service expects these endpoints:

```
GET  /api/v1/discovery/profiles - Get discovery profiles
POST /api/v1/discovery/swipe/pass - Pass on profile
POST /api/v1/discovery/swipe/like - Like profile
POST /api/v1/discovery/swipe/super-like - Super like profile
POST /api/v1/discovery/rewind - Rewind last swipe
POST /api/v1/discovery/boost/activate - Activate boost
GET  /api/v1/discovery/boost/status - Get boost status
GET  /api/v1/discovery/matches - Get matches
GET  /api/v1/discovery/stats - Get discovery stats
PUT  /api/v1/discovery/filters - Update filters
POST /api/v1/discovery/report - Report profile
POST /api/v1/discovery/block - Block user
```

## Customization

### Colors

Update the color scheme in styles:
- Primary: `#E91E63` (pink)
- Success: `#4CAF50` (green)
- Error: `#F44336` (red)
- Info: `#2196F3` (blue)

### Dimensions

Adjust card size:
```typescript
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.7;
```

### Swipe Thresholds

```typescript
const SWIPE_THRESHOLD = 120; // Horizontal swipe
const SUPER_LIKE_THRESHOLD = -100; // Vertical swipe
```

## Performance Optimization

1. **Image Loading**: Consider using `react-native-fast-image` for better image caching
2. **List Virtualization**: Cards are rendered on-demand
3. **Native Driver**: Most animations use native driver
4. **Memoization**: Use React.memo for card components
5. **Lazy Loading**: Profiles loaded in batches

## Testing

Test cases to implement:
- Swipe gestures work correctly
- Match modal appears on mutual like
- Super like count decreases
- Boost activation works
- Filters apply correctly
- Rewind restores previous card
- Loading states display properly
- Error handling works

## Future Enhancements

1. **Video Profiles**: Add video playback on cards
2. **Voice Notes**: Play voice introductions
3. **Undo Animation**: Show card returning on rewind
4. **Haptic Feedback**: Add vibration on swipes
5. **Sound Effects**: Swipe and match sounds
6. **AR Filters**: Face filters for photos
7. **Live Status**: Show who's online now
8. **Smart Recommendations**: ML-based profile sorting

## Dependencies

Required packages:
```json
{
  "react-native-reanimated": "^3.6.0",
  "react-native-gesture-handler": "^2.14.0",
  "@react-navigation/native": "^6.1.9",
  "@react-native-async-storage/async-storage": "^1.21.0"
}
```

## Installation

1. Ensure all dependencies are installed:
```bash
npm install
```

2. For iOS:
```bash
cd ios && pod install && cd ..
```

3. Configure react-native-reanimated in `babel.config.js`:
```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'],
};
```

4. Add to `index.js` or `App.tsx`:
```javascript
import 'react-native-gesture-handler';
```

## Troubleshooting

### Animations not smooth
- Ensure native driver is enabled
- Check if running in debug mode (slower)
- Verify react-native-reanimated plugin is configured

### Gestures not working
- Import gesture handler at app entry
- Wrap app with GestureHandlerRootView
- Check z-index of card components

### Images not loading
- Verify image URLs are valid
- Check network permissions
- Add placeholder images

## Support

For issues or questions:
1. Check the existing components documentation
2. Review React Native Reanimated docs
3. Test on both iOS and Android
4. Check console for errors

## License

This implementation is part of the Flamoral Dating App Platform.
