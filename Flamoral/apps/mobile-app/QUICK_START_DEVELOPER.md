# Flamoral Mobile App - Quick Start for Developers

## Prerequisites

- Node.js >= 18
- npm or yarn
- Xcode 14+ (for iOS development)
- Android Studio (for Android development)
- CocoaPods installed (`sudo gem install cocoapods`)
- React Native CLI (`npm install -g react-native-cli`)

## Initial Setup

### 1. Clone and Install

```bash
cd apps/mobile-app
npm install
```

### 2. iOS Setup

```bash
cd ios
pod install
cd ..
```

### 3. Environment Configuration

Create `.env` file in the mobile-app root:

```env
API_URL=http://localhost:3000
AGORA_APP_ID=your_test_app_id
GOOGLE_MAPS_API_KEY=your_test_api_key
```

For development, you can use mock values temporarily.

### 4. Run the App

**iOS:**
```bash
npm run ios
# or for specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

**Android:**
```bash
npm run android
# Make sure Android emulator is running or device is connected
```

## Project Structure

```
src/
├── components/       # Reusable UI components
├── screens/          # Screen components
├── navigation/       # Navigation configuration
├── services/         # Business logic & API calls
├── hooks/            # Custom React hooks
├── store/            # Redux store & slices
├── types/            # TypeScript types
├── utils/            # Utility functions
└── constants/        # App constants & theme
```

## Key Services Usage

### Camera Service

```typescript
import { useCamera } from '@hooks/useCamera';

const MyComponent = () => {
  const { capturePhoto, selectPhotos, loading } = useCamera();

  const handleTakePhoto = async () => {
    const photo = await capturePhoto({ quality: 0.8 });
    if (photo) {
      console.log('Photo URI:', photo.uri);
    }
  };

  return (
    <Button onPress={handleTakePhoto} loading={loading}>
      Take Photo
    </Button>
  );
};
```

### Geolocation Service

```typescript
import { useGeolocation } from '@hooks/useGeolocation';

const MyComponent = () => {
  const { location, getCurrentLocation, loading } = useGeolocation({
    autoStart: true
  });

  useEffect(() => {
    if (location) {
      console.log('Current location:', location.latitude, location.longitude);
    }
  }, [location]);
};
```

### In-App Purchases

```typescript
import { useInAppPurchase } from '@hooks/useInAppPurchase';

const MyComponent = () => {
  const { products, purchaseProduct, purchasing } = useInAppPurchase();

  const handlePurchase = async (productId: string) => {
    const success = await purchaseProduct(productId);
    if (success) {
      console.log('Purchase successful!');
    }
  };
};
```

### Redux Store Usage

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@store/store';
import { fetchSubscriptionStatus } from '@store/slices/subscriptionSlice';

const MyComponent = () => {
  const dispatch = useDispatch();
  const { currentTier, superLikesBalance } = useSelector(
    (state: RootState) => state.subscription
  );

  useEffect(() => {
    dispatch(fetchSubscriptionStatus());
  }, [dispatch]);

  return (
    <View>
      <Text>Tier: {currentTier}</Text>
      <Text>Super Likes: {superLikesBalance}</Text>
    </View>
  );
};
```

## Common Development Tasks

### Adding a New Screen

1. Create screen file in `src/screens/`
2. Add navigation type in navigator file
3. Register route in navigator
4. Add deep link if needed in `src/navigation/linking.ts`

Example:
```typescript
// src/screens/MyScreen.tsx
import React from 'react';
import { View, Text } from 'react-native';

const MyScreen: React.FC = () => {
  return (
    <View>
      <Text>My New Screen</Text>
    </View>
  );
};

export default MyScreen;
```

### Adding a New Redux Slice

1. Create slice in `src/store/slices/mySlice.ts`
2. Add to root reducer in `src/store/store.ts`
3. Add to persist whitelist if needed

### Making API Calls

```typescript
import axios from 'axios';

const fetchUserProfile = async (userId: string) => {
  try {
    const response = await axios.get(
      `${process.env.API_URL}/api/users/${userId}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    throw error;
  }
};
```

## Testing

### Run Unit Tests

```bash
npm test
```

### Run E2E Tests (if configured)

```bash
npm run test:e2e
```

### Debug on Device

**iOS:**
- Shake device to open debug menu
- Or: Cmd + D in iOS Simulator

**Android:**
- Shake device to open debug menu
- Or: Cmd + M in Android Emulator

## Debugging

### Enable Remote Debugging

1. Open debug menu (shake device or Cmd+D)
2. Select "Debug"
3. Open Chrome DevTools at http://localhost:8081/debugger-ui

### React Native Debugger (Recommended)

Install:
```bash
brew install --cask react-native-debugger
```

Enable:
1. Open React Native Debugger
2. Open debug menu in app
3. Select "Debug"

### Reactotron (Alternative)

Install Reactotron app and add to your app:
```bash
npm install --dev reactotron-react-native
```

## Common Issues & Solutions

### Issue: Metro bundler not starting

**Solution:**
```bash
npm start -- --reset-cache
```

### Issue: iOS build fails after pod install

**Solution:**
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### Issue: Android build fails

**Solution:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: "Unable to resolve module"

**Solution:**
```bash
npm start -- --reset-cache
# or
watchman watch-del-all
rm -rf node_modules
npm install
```

### Issue: Permission denied errors on iOS

**Solution:**
Check that all permissions are in Info.plist with proper descriptions.

### Issue: Firebase not working

**Solution:**
- Verify GoogleService-Info.plist (iOS) is in correct location
- Verify google-services.json (Android) is in correct location
- Clean and rebuild

## Performance Optimization Tips

### Image Optimization

Use FastImage for remote images:
```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{ uri: imageUrl }}
  resizeMode={FastImage.resizeMode.cover}
  style={styles.image}
/>
```

### List Optimization

Use FlatList with proper keys:
```typescript
<FlatList
  data={items}
  keyExtractor={(item) => item.id}
  renderItem={renderItem}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

### Memoization

Use React.memo and useMemo:
```typescript
const MemoizedComponent = React.memo(({ data }) => {
  return <View>{/* render */}</View>;
});

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

## Code Style

### TypeScript

- Always use TypeScript for new files
- Define interfaces for all component props
- Avoid `any` type when possible

### Components

- Use functional components
- Use hooks instead of class components
- Keep components small and focused
- Extract reusable logic to custom hooks

### Naming Conventions

- Components: PascalCase (e.g., `UserProfile.tsx`)
- Hooks: camelCase with 'use' prefix (e.g., `useCamera.ts`)
- Utils: camelCase (e.g., `formatDate.ts`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_URL`)

## Git Workflow

### Branch Naming

- feature/feature-name
- bugfix/bug-description
- hotfix/critical-fix

### Commit Messages

```
feat: Add phone verification screen
fix: Fix camera permission issue on Android
docs: Update setup instructions
refactor: Improve geolocation service
```

### Before Committing

```bash
npm run lint
npm test
```

## Useful Commands

```bash
# Clear watchman watches
watchman watch-del-all

# Clear metro cache
npm start -- --reset-cache

# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Clean Android build
cd android && ./gradlew clean && cd ..

# Reset to clean state
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..

# Check bundle size
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output bundle.js \
  && ls -lh bundle.js
```

## Helpful Resources

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [React Native IAP](https://github.com/dooboolab-community/react-native-iap)
- [Firebase for React Native](https://rnfirebase.io/)

## Development Workflow

1. Create feature branch
2. Implement feature
3. Write/update tests
4. Test on iOS and Android
5. Create pull request
6. Code review
7. Merge to main

## Production Build

### iOS

```bash
# Archive in Xcode
# Product > Archive
# Distribute to App Store
```

### Android

```bash
cd android
./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release.apk

# Or for App Bundle (recommended)
./gradlew bundleRelease
# AAB will be at: android/app/build/outputs/bundle/release/app-release.aab
```

## Environment Variables

For different environments (dev, staging, prod), create:
- `.env.development`
- `.env.staging`
- `.env.production`

Use react-native-config or similar to load appropriate env file.

## Team Communication

- Use descriptive PR titles
- Link related issues
- Add screenshots for UI changes
- Document breaking changes
- Update CHANGELOG.md

## Getting Help

- Check documentation first
- Search existing issues
- Ask in team chat
- Create detailed bug reports with:
  - Steps to reproduce
  - Expected behavior
  - Actual behavior
  - Environment (OS, device, RN version)
  - Screenshots/videos if applicable

## Next Steps

1. Familiarize yourself with the codebase
2. Set up your development environment
3. Run the app on both iOS and Android
4. Pick a task from the backlog
5. Start coding!

Happy coding! 🚀
