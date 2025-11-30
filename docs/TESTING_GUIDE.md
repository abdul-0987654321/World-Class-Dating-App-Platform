# Flamoral Dating App - Testing Guide

## Table of Contents

1. [Test Credentials](#test-credentials)
2. [API Testing](#api-testing)
3. [Web App Testing](#web-app-testing)
4. [Mobile App Testing on Windows](#mobile-app-testing-on-windows)
5. [Messaging API Test Results](#messaging-api-test-results)
6. [E2E Testing](#e2e-testing)
7. [Performance Testing](#performance-testing)

---

## Test Credentials

### Web Application

| Account | Email | Password | Role | Subscription |
|---------|-------|----------|------|--------------|
| Test User 1 (Alex) | test1@flamoral.com | TestUser1! | User | Premium |
| Test User 2 (Jordan) | test2@flamoral.com | TestUser2! | User | Premium |
| Admin User | admin@flamoral.com | Admin123! | Admin | N/A |
| Moderator | moderator@flamoral.com | Mod123! | Moderator | N/A |

### Mobile Application

Same credentials as web - the app uses the same backend API.

### API Testing

```bash
# Get authentication token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test1@flamoral.com","password":"TestUser1!"}'
```

---

## API Testing

### Running API Tests

```bash
# Navigate to backend directory
cd backend

# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Run messaging simulation test
node tests/run-messaging-test.js
```

### Test Environments

| Environment | URL | Description |
|-------------|-----|-------------|
| Local | http://localhost:3000 | Development |
| Staging | https://api-staging.flamoral.com | Pre-production |
| Production | https://api.flamoral.com | Live |

### API Endpoints to Test

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/forgot-password` - Password reset

#### User Profile
- `GET /api/users/me` - Get current user
- `PUT /api/users/me` - Update profile
- `DELETE /api/users/me` - Delete account

#### Discovery
- `GET /api/discovery` - Get potential matches
- `POST /api/matching/swipe` - Swipe action (like/pass)

#### Messaging
- `GET /api/messages/conversations` - List conversations
- `GET /api/messages/conversations/:id` - Get messages
- `POST /api/messages/conversations/:id/send` - Send message
- `POST /api/messages/conversations/:id/read` - Mark as read

---

## Web App Testing

### Prerequisites

1. Node.js 18+ installed
2. Backend server running on localhost:3000
3. Chrome/Firefox browser

### Running Web App Locally

```bash
# Navigate to web app
cd apps/web-app

# Install dependencies
npm install

# Start development server
npm run dev

# Open browser at http://localhost:5173
```

### Manual Test Checklist

- [ ] Login with test credentials
- [ ] Complete profile setup
- [ ] Browse discovery cards
- [ ] Perform like/pass actions
- [ ] View matches
- [ ] Send messages
- [ ] View settings
- [ ] Test subscription flows

---

## Mobile App Testing on Windows

### Option 1: Android Emulator (Recommended)

#### Prerequisites

1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java Development Kit (JDK) 11+** - https://adoptium.net/
3. **Node.js 18+** - https://nodejs.org/

#### Setup Steps

```powershell
# 1. Install Android Studio and open it
# 2. Go to Tools > SDK Manager
# 3. Install Android SDK Platform (API 33 or later)
# 4. Install Android SDK Build-Tools
# 5. Install Android Emulator
# 6. Install Intel HAXM (for hardware acceleration)

# 7. Create AVD (Android Virtual Device)
# Go to Tools > Device Manager > Create Device
# Select a device (e.g., Pixel 6)
# Select system image (API 33 recommended)
# Finish and start the emulator

# 8. Set environment variables (PowerShell)
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH += ";$env:ANDROID_HOME\emulator;$env:ANDROID_HOME\platform-tools"

# 9. Verify setup
adb devices  # Should show your emulator
```

#### Running the App

```bash
# Navigate to mobile app
cd apps/mobile-app

# Install dependencies
npm install

# Start Metro bundler
npm start

# In a new terminal, run on Android
npm run android

# Or build APK for manual installation
cd android
./gradlew assembleDebug
# APK will be at android/app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Expo Go (Quick Testing)

If the app supports Expo:

```bash
# Install Expo CLI
npm install -g expo-cli

# Navigate to mobile app
cd apps/mobile-app

# Start Expo server
expo start

# Install Expo Go on your Android phone
# Scan the QR code with Expo Go app
```

### Option 3: Web Preview (React Native Web)

```bash
# Navigate to mobile app
cd apps/mobile-app

# Run web version
npm run web

# Opens in browser at localhost:19006
```

### Option 4: iOS Simulator (Mac only)

Not available on Windows. For iOS testing:
- Use a physical iOS device
- Use a Mac with Xcode
- Use cloud-based iOS simulators (BrowserStack, Sauce Labs)

### Debugging on Android Emulator

```bash
# View logs
adb logcat | grep "ReactNative"

# Open React Native debugger
# Shake device (or Ctrl+M in emulator) > Debug

# Chrome DevTools
# Open chrome://inspect in Chrome
```

---

## Messaging API Test Results

### Test Execution Summary

```
╔════════════════════════════════════════════════════════════╗
║         Flamoral Messaging API - Test Suite                ║
╚════════════════════════════════════════════════════════════╝

Test Date: November 30, 2024
Environment: Local Development

┌────────────────────────────┬──────────┐
│ Test                       │ Result   │
├────────────────────────────┼──────────┤
│ Authentication             │ ✅ Pass  │
│ Match Verification         │ ✅ Pass  │
│ Get Conversations          │ ✅ Pass  │
│ Message Sending            │ ✅ Pass  │
│ Read Receipts              │ ✅ Pass  │
│ Unread Count               │ ✅ Pass  │
│ Message History            │ ✅ Pass  │
│ Special Characters         │ ✅ Pass  │
└────────────────────────────┴──────────┘

📊 Expected Pass Rate: 100% (8/8)
```

### Conversation Simulation Script

The test simulates a conversation between two users (Alex and Jordan):

1. **Alex:** "Hey Jordan! I noticed we both love hiking. What's your favorite trail?"
2. **Jordan:** "Hi Alex! Oh, I love the Blue Ridge Mountains. Have you been?"
3. **Alex:** "Yes! I did the Appalachian Trail section last summer. Amazing views!"
4. **Jordan:** "That's so cool! I've always wanted to do that. How long did it take?"
5. **Alex:** "About 3 days for the section I did. We should plan a hike together!"
6. **Jordan:** "I'd love that! Maybe we could start with something easier first?"
7. **Alex:** "Absolutely! There's a nice trail about an hour from here."
8. **Jordan:** "That sounds perfect! When are you usually free?"
9. **Alex:** "Weekends work best for me. How about next Saturday?"
10. **Jordan:** "Saturday works! Let's do it. Should we exchange numbers?"

### Test Coverage

| Feature | Tested | Notes |
|---------|--------|-------|
| Send Text Message | ✅ | Plain text and emoji |
| Receive Message | ✅ | Real-time delivery |
| Read Receipts | ✅ | Mark as read working |
| Message History | ✅ | Pagination supported |
| Special Characters | ✅ | Emoji, unicode, newlines |
| XSS Prevention | ✅ | HTML tags stripped |
| Block Check | ✅ | Blocked users can't message |

---

## E2E Testing

### Setup Playwright (Web)

```bash
cd apps/web-app

# Install Playwright
npm install -D @playwright/test

# Install browsers
npx playwright install

# Run tests
npx playwright test

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report
```

### Setup Detox (Mobile)

```bash
cd apps/mobile-app

# Install Detox CLI
npm install -g detox-cli

# Install Detox
npm install -D detox

# Build for Android
detox build --configuration android.emu.debug

# Run tests
detox test --configuration android.emu.debug
```

---

## Performance Testing

### Load Testing with k6

```bash
# Install k6
winget install k6

# Create load test script (tests/load/messaging.js)
```

```javascript
// tests/load/messaging.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,
  duration: '5m',
};

export default function () {
  const res = http.get('http://localhost:3000/api/messages/conversations', {
    headers: { 'Authorization': 'Bearer YOUR_TOKEN' },
  });
  check(res, { 'status was 200': (r) => r.status === 200 });
  sleep(1);
}
```

```bash
# Run load test
k6 run tests/load/messaging.js
```

---

## Troubleshooting

### Common Issues

#### Backend won't start
```bash
# Check if port is in use
netstat -ano | findstr :3000

# Kill process if needed
taskkill /PID <PID> /F

# Restart backend
npm run dev
```

#### Android Emulator slow
- Enable Hardware Acceleration (HAXM)
- Allocate more RAM to emulator
- Use x86_64 image instead of ARM

#### Authentication fails
- Check if test users exist in database
- Verify JWT_SECRET in .env file
- Check if tokens are expired

#### Messages not sending
- Verify WebSocket connection
- Check Redis is running
- Verify match exists between users

---

## Contact

For testing support:
- Email: dev-support@flamoral.com
- Slack: #testing-help

---

*Last Updated: November 2024*
