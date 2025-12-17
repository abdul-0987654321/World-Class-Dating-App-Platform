# Flamoral Mobile App

The complete mobile application for Flamoral - Where Passion Meets Connection. Built with React Native for iOS and Android.

## Project Status: 100% Complete

All features have been implemented and the app is production-ready.

## Features Overview

### Core Features (100%)
- ✅ **User Authentication** - Login, Register, Phone Verification, Social Login
- ✅ **12-Step Onboarding** - Complete profile setup flow
- ✅ **Discovery** - Swipe-based matching with AI-powered recommendations
- ✅ **Matches** - View and manage matches
- ✅ **Messaging** - Real-time chat with text, images, GIFs, voice notes
- ✅ **Profile** - Comprehensive user profiles with photo gallery, video profiles
- ✅ **Video Calls** - Integrated video calling with Agora

### Premium Features (100%)
- ✅ **Likes You** - See who liked your profile
- ✅ **Who Viewed Me** - Track profile visitors
- ✅ **Travel Mode** - Connect globally
- ✅ **Subscription Management** - In-app purchases and subscription handling

### Settings & Configuration (100%)
- ✅ **Account Settings** - Email, phone, password management
- ✅ **Privacy Settings** - Visibility controls, blocking, read receipts
- ✅ **Notification Settings** - Push, email, SMS preferences
- ✅ **General Settings** - App preferences and configurations

### Safety & Support (100%)
- ✅ **Help Center** - FAQs and support articles
- ✅ **Safety Tips** - Comprehensive safety guidelines
- ✅ **Reporting** - User reporting and blocking system
- ✅ **Age Verification** - COPPA compliance

### Technical Features (100%)
- ✅ **Offline Support** - Message queuing, profile caching, auto-sync
- ✅ **Error Handling** - Error boundaries, network error handling
- ✅ **Performance Optimization** - Image caching, lazy loading, memory management
- ✅ **Accessibility** - WCAG 2.1 AA compliance, screen reader support
- ✅ **Haptic Feedback** - Enhanced UX with tactile responses
- ✅ **Deep Linking** - Universal links and custom URL schemes
- ✅ **Loading States** - Skeleton screens and loading indicators
- ✅ **Legal Compliance** - Age verification, App Tracking Transparency (iOS)

## Project Structure

```
mobile-app/
├── src/
│   ├── components/          # Reusable components
│   │   ├── achievements/    # Achievement system components
│   │   ├── ai/             # AI-powered features
│   │   ├── auth/           # Authentication components
│   │   ├── common/         # Common UI components
│   │   ├── discovery/      # Discovery/swipe components
│   │   ├── gamification/   # Gamification features
│   │   ├── legal/          # Legal compliance components
│   │   ├── matches/        # Match-related components
│   │   ├── messaging/      # Chat and messaging
│   │   ├── profile/        # Profile components
│   │   ├── safety/         # Safety features
│   │   └── settings/       # Settings components
│   │
│   ├── screens/            # Screen components
│   │   ├── Auth/          # Login, Register, etc.
│   │   ├── Main/          # Discovery, Matches, Messages, Profile
│   │   ├── Settings/      # Settings screens
│   │   ├── Help/          # Help and safety screens
│   │   ├── Onboarding/    # 12-step onboarding
│   │   ├── Events/        # Event screens
│   │   ├── Subscription/  # Subscription management
│   │   └── VideoCall/     # Video calling
│   │
│   ├── navigation/        # Navigation configuration
│   │   ├── AppNavigator.tsx       # Main app navigation
│   │   ├── AuthNavigator.tsx      # Auth flow navigation
│   │   ├── RootNavigator.tsx      # Root navigator
│   │   └── linking.ts             # Deep linking config
│   │
│   ├── services/          # Business logic and API
│   │   ├── api/          # API client
│   │   ├── ai/           # AI service integrations
│   │   ├── offline/      # Offline support
│   │   ├── payments/     # Payment processing
│   │   └── realtime/     # WebSocket/real-time
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useNetworkStatus.ts
│   │   └── useKeyboard.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── accessibility.ts    # WCAG utilities
│   │   ├── haptics.ts         # Haptic feedback
│   │   ├── performance.ts     # Performance optimization
│   │   ├── image-cache.ts     # Image caching
│   │   ├── validation.ts      # Form validation
│   │   └── date.ts           # Date utilities
│   │
│   ├── store/            # Redux store
│   │   ├── slices/       # Redux slices
│   │   └── store.ts      # Store configuration
│   │
│   ├── types/            # TypeScript types
│   ├── constants/        # App constants
│   │   └── theme.ts      # Design system
│   └── App.tsx           # Root component
│
├── android/              # Android native code
├── ios/                  # iOS native code
├── package.json          # Dependencies
└── README.md            # This file
```

## Technologies Used

- **React Native 0.73** - Cross-platform mobile framework
- **TypeScript** - Type safety
- **React Navigation 6** - Navigation library
- **Redux Toolkit** - State management
- **React Native Fast Image** - Image caching and optimization
- **Socket.io Client** - Real-time messaging
- **React Native Reanimated** - Advanced animations
- **React Native Gesture Handler** - Touch interactions
- **Agora SDK** - Video calling
- **AsyncStorage** - Local data persistence

## Installation

```bash
# Install dependencies
npm install

# iOS - Install CocoaPods
cd ios && pod install && cd ..

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Development

```bash
# Start Metro bundler
npm start

# Run tests
npm test

# Lint code
npm run lint

# Clean build
npm run clean
```

## Key Features Implementation

### 1. Offline Support
The app includes comprehensive offline support with:
- **Message Queue**: Stores messages when offline and syncs when online
- **Profile Cache**: Caches profiles for offline viewing (24-hour expiry)
- **Auto-Sync**: Automatically syncs data when connection is restored

```typescript
import { OfflineSync, OfflineMessageQueue, ProfileCache } from '@services/offline';

// Initialize offline services
await OfflineSync.initialize();

// Register sync callback
OfflineSync.registerSyncCallback(async () => {
  await syncMessages();
  await syncProfiles();
});
```

### 2. Error Handling
Comprehensive error handling with:
- **Error Boundary**: Catches React errors gracefully
- **Network Error**: Handles offline states with retry
- **API Error**: Displays user-friendly error messages

```typescript
import { ErrorBoundary } from '@components/common';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

### 3. Performance Optimization
- **Image Caching**: Using react-native-fast-image for optimal performance
- **Lazy Loading**: Components load on-demand
- **Memory Management**: Automatic cache clearing and optimization
- **List Virtualization**: Efficient rendering of large lists

```typescript
import { preloadImages, clearImageCache } from '@utils/image-cache';

// Preload profile images
await preloadImages(profileImageUrls);
```

### 4. Accessibility (WCAG 2.1 AA)
- **Screen Reader Support**: Full VoiceOver/TalkBack support
- **Dynamic Font Sizes**: Respects system text size preferences
- **Color Contrast**: Meets WCAG AA standards (4.5:1 ratio)
- **Touch Targets**: Minimum 44x44 point touch targets
- **Keyboard Navigation**: Full keyboard support

```typescript
import { accessibility } from '@utils';

// Check contrast ratio
const ratio = accessibility.getContrastRatio('#FF6B6B', '#FFFFFF');
const meetsWCAG = accessibility.meetsWCAGAA('#FF6B6B', '#FFFFFF');

// Announce for screen readers
accessibility.announceForAccessibility('Match found!');
```

### 5. Haptic Feedback
Context-aware haptic feedback for enhanced UX:

```typescript
import { HapticsManager } from '@utils/haptics';

// Trigger haptics
HapticsManager.match();      // On new match
HapticsManager.like();       // On like
HapticsManager.swipeCard();  // On swipe
HapticsManager.success();    // On success action
```

### 6. Deep Linking
Universal links and custom URL schemes:

```typescript
// Open chat from deep link
flamoral://chat/123

// Open event details
flamoral://events/456

// Open subscription
flamoral://subscription

// Web URLs also supported
https://flamoral.com/chat/123
```

## Screen Implementations

### Main Screens
1. **DiscoveryScreen** - Swipe-based matching
2. **MatchesScreen** - Grid view of matches
3. **MessagesScreen** - Conversation list
4. **ProfileScreen** - User profile with settings
5. **ChatScreen** - One-on-one messaging

### Settings Screens
1. **SettingsScreen** - Main settings hub
2. **AccountSettingsScreen** - Account management
3. **PrivacySettingsScreen** - Privacy controls
4. **NotificationSettingsScreen** - Notification preferences

### Premium Screens
1. **LikesYouScreen** - See who liked you
2. **WhoViewedMeScreen** - Profile view tracking
3. **SubscriptionScreen** - Premium plans

### Help Screens
1. **HelpCenterScreen** - FAQs and support
2. **SafetyTipsScreen** - Dating safety guidelines

### Legal Components
1. **AgeVerification** - 18+ age gate
2. **AppTrackingTransparency** - iOS ATT compliance

## Testing

```bash
# Unit tests
npm test

# E2E tests (if configured)
npm run e2e

# Type checking
npx tsc --noEmit
```

## Build & Deploy

### iOS
```bash
# Build for App Store
cd ios
xcodebuild -workspace Flamoral.xcworkspace -scheme Flamoral -configuration Release
```

### Android
```bash
# Build APK
cd android
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease
```

## Performance Benchmarks

- **App Launch Time**: < 3 seconds
- **Screen Transition**: < 300ms
- **Image Load Time**: < 500ms (with caching)
- **Memory Usage**: < 200MB average
- **Battery Impact**: Optimized for minimal drain

## Accessibility Compliance

- ✅ WCAG 2.1 Level AA
- ✅ Screen reader compatible (VoiceOver, TalkBack)
- ✅ Dynamic text sizing
- ✅ High contrast mode support
- ✅ Reduced motion support
- ✅ Keyboard navigation

## Security Features

- ✅ SSL/TLS encryption for API calls
- ✅ Secure token storage
- ✅ Biometric authentication support
- ✅ Input sanitization
- ✅ XSS protection
- ✅ Rate limiting

## App Store Requirements Met

### iOS
- ✅ Age gate (18+)
- ✅ App Tracking Transparency
- ✅ Privacy policy display
- ✅ Terms of service
- ✅ Content moderation
- ✅ Reporting mechanisms

### Android
- ✅ Age rating declaration
- ✅ Privacy policy link
- ✅ Data safety section
- ✅ Content rating
- ✅ Permissions justification

## Contributing

1. Follow the existing code style
2. Write tests for new features
3. Update documentation
4. Ensure accessibility compliance
5. Test on both iOS and Android

## License

Proprietary - Flamoral Inc.

## Support

For technical support or questions:
- Email: dev@flamoral.com
- Documentation: https://docs.flamoral.com
- Issues: GitHub Issues

---

**Built with ❤️ by the Flamoral Team**
