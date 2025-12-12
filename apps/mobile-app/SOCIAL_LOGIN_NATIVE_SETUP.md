# Mobile App Social Login Native Setup

## iOS Setup

### 1. Install CocoaPods Dependencies

```bash
cd ios
pod install
cd ..
```

### 2. Configure Info.plist

Add the following to `ios/FlamoralDating/Info.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Existing keys... -->

    <!-- Google Sign In -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleTypeRole</key>
            <string>Editor</string>
            <key>CFBundleURLSchemes</key>
            <array>
                <!-- Replace with your REVERSED_CLIENT_ID from GoogleService-Info.plist -->
                <string>com.googleusercontent.apps.YOUR-CLIENT-ID</string>
            </array>
        </dict>
        <!-- Facebook URL Scheme -->
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>fb{FACEBOOK_APP_ID}</string>
            </array>
        </dict>
    </array>

    <!-- Google Sign In Client ID -->
    <key>GIDClientID</key>
    <string>YOUR-CLIENT-ID.apps.googleusercontent.com</string>

    <!-- Facebook Configuration -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>fb{FACEBOOK_APP_ID}</string>
            </array>
        </dict>
    </array>

    <key>FacebookAppID</key>
    <string>{FACEBOOK_APP_ID}</string>

    <key>FacebookClientToken</key>
    <string>{FACEBOOK_CLIENT_TOKEN}</string>

    <key>FacebookDisplayName</key>
    <string>Flamoral</string>

    <!-- Allow HTTP for local development -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <true/>
        <key>NSExceptionDomains</key>
        <dict>
            <key>localhost</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
            </dict>
        </dict>
    </dict>

    <!-- LSApplicationQueriesSchemes for Facebook -->
    <key>LSApplicationQueriesSchemes</key>
    <array>
        <string>fbapi</string>
        <string>fb-messenger-share-api</string>
        <string>fbauth2</string>
        <string>fbshareextension</string>
    </array>
</dict>
</plist>
```

### 3. Enable Sign In with Apple Capability

1. Open `ios/FlamoralDating.xcworkspace` in Xcode
2. Select your target (FlamoralDating)
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "Sign In with Apple"

### 4. Update AppDelegate.m (or AppDelegate.mm)

Add these imports at the top:

```objective-c
#import <GoogleSignIn/GoogleSignIn.h>
#import <FBSDKCoreKit/FBSDKCoreKit.h>
```

Add to `application:didFinishLaunchingWithOptions:`:

```objective-c
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // ... existing code ...

  // Initialize Facebook SDK
  [[FBSDKApplicationDelegate sharedInstance] application:application
                           didFinishLaunchingWithOptions:launchOptions];

  return YES;
}
```

Add URL handling:

```objective-c
- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  // Handle Google Sign In
  if ([GIDSignIn.sharedInstance handleURL:url]) {
    return YES;
  }

  // Handle Facebook Login
  [[FBSDKApplicationDelegate sharedInstance] application:app
                                                  openURL:url
                                        sourceApplication:options[UIApplicationOpenURLOptionsSourceApplicationKey]
                                               annotation:options[UIApplicationOpenURLOptionsAnnotationKey]
  ];

  return YES;
}
```

### 5. Download GoogleService-Info.plist

1. Go to Firebase Console (or Google Cloud Console)
2. Download `GoogleService-Info.plist`
3. Add it to your Xcode project (in the same directory as Info.plist)
4. Make sure it's added to your target

## Android Setup

### 1. Update android/build.gradle

```gradle
buildscript {
    ext {
        buildToolsVersion = "33.0.0"
        minSdkVersion = 21
        compileSdkVersion = 33
        targetSdkVersion = 33

        // Add these
        googlePlayServicesAuthVersion = "20.7.0"
    }
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath("com.android.tools.build:gradle:7.4.2")
        classpath("com.google.gms:google-services:4.3.15")
        classpath("com.facebook.android:facebook-android-sdk:latest.release")
    }
}
```

### 2. Update android/app/build.gradle

Add at the top:
```gradle
apply plugin: "com.android.application"
apply plugin: "com.google.gms.google-services" // Add this
```

Add to dependencies:
```gradle
dependencies {
    implementation "com.facebook.android:facebook-android-sdk:latest.release"
    implementation "com.google.android.gms:play-services-auth:20.7.0"

    // ... existing dependencies
}
```

### 3. Update AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.flamoraldating">

    <!-- Add Internet Permission -->
    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:name=".MainApplication"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/AppTheme">

        <!-- ... existing activities ... -->

        <!-- Facebook App ID -->
        <meta-data
            android:name="com.facebook.sdk.ApplicationId"
            android:value="@string/facebook_app_id"/>

        <meta-data
            android:name="com.facebook.sdk.ClientToken"
            android:value="@string/facebook_client_token"/>

        <!-- Facebook Activity -->
        <activity
            android:name="com.facebook.FacebookActivity"
            android:configChanges="keyboard|keyboardHidden|screenLayout|screenSize|orientation"
            android:label="@string/app_name" />

        <activity
            android:name="com.facebook.CustomTabActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="@string/fb_login_protocol_scheme" />
            </intent-filter>
        </activity>

    </application>
</manifest>
```

### 4. Update strings.xml

Add to `android/app/src/main/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Flamoral Dating</string>

    <!-- Facebook Configuration -->
    <string name="facebook_app_id">{YOUR_FACEBOOK_APP_ID}</string>
    <string name="fb_login_protocol_scheme">fb{YOUR_FACEBOOK_APP_ID}</string>
    <string name="facebook_client_token">{YOUR_FACEBOOK_CLIENT_TOKEN}</string>
</resources>
```

### 5. Download google-services.json

1. Go to Firebase Console
2. Download `google-services.json`
3. Place it in `android/app/`
4. Make sure it's in gitignore

### 6. Get SHA-1 Fingerprint

For development:
```bash
cd android
./gradlew signingReport
```

Copy the SHA-1 fingerprint and add it to:
- Google Cloud Console → Credentials → Android OAuth Client
- Firebase Console → Project Settings → Your Android App

## Environment Configuration

Create `.env` file in the root of mobile-app:

```env
# API Configuration
API_URL=http://localhost:3001

# Google Configuration
GOOGLE_WEB_CLIENT_ID=YOUR-WEB-CLIENT-ID.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=YOUR-IOS-CLIENT-ID.apps.googleusercontent.com

# Facebook Configuration
FACEBOOK_APP_ID=YOUR_FACEBOOK_APP_ID
```

## Code Integration

### 1. Update App.tsx

```typescript
import React, { useEffect } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Settings as FBSettings } from 'react-native-fbsdk-next';

function App() {
  useEffect(() => {
    // Configure Google Sign In
    GoogleSignin.configure({
      webClientId: process.env.GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });

    // Configure Facebook SDK
    FBSettings.setAppID(process.env.FACEBOOK_APP_ID || '');
    FBSettings.initializeSDK();
  }, []);

  // ... rest of your app
}
```

### 2. Usage in Login Screen

The `SocialLoginButtons` component is already created and integrated. Just import and use:

```typescript
import SocialLoginButtons from '@components/auth/SocialLoginButtons';

function LoginScreen() {
  return (
    <View>
      {/* Your existing login form */}

      <SocialLoginButtons
        onSuccess={(isNewUser, needsProfileSetup) => {
          if (needsProfileSetup) {
            navigation.navigate('ProfileSetup');
          } else {
            navigation.navigate('Home');
          }
        }}
        onError={(error) => {
          Alert.alert('Login Failed', error.message);
        }}
      />
    </View>
  );
}
```

## Testing

### iOS Simulator Testing

1. Google Sign In works in simulator
2. Apple Sign In works in simulator (iOS 13+)
3. Facebook Login requires device or TestFlight

### Android Emulator Testing

1. Google Sign In requires Play Services
2. Facebook Login works in emulator
3. Use device for full testing

### Test User Accounts

Create test accounts for each provider:

**Google:**
- Use any Google account
- Or create test account in Google Cloud Console

**Apple:**
- Use your Apple ID
- Or create test account in TestFlight

**Facebook:**
- Create test users in Facebook Developer Console
- App Dashboard → Roles → Test Users

## Troubleshooting

### iOS Issues

**"No such module GoogleSignIn"**
```bash
cd ios
pod install
cd ..
npx react-native run-ios
```

**"Apple Sign In not working"**
- Check capability is enabled in Xcode
- Verify bundle ID matches Apple Developer Portal
- Ensure iOS 13+ device/simulator

**"Google Sign In failed"**
- Verify GoogleService-Info.plist is added
- Check CLIENT_ID in Info.plist
- Ensure URL scheme is correct

### Android Issues

**"Google Play Services not available"**
- Install Play Services on emulator
- Use device for testing

**"Facebook Login failed"**
- Verify App ID in strings.xml
- Check package name matches Facebook Console
- Add SHA-1 fingerprint to Facebook Console

**"Build failed"**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## Production Checklist

- [ ] Remove development .env file
- [ ] Use production API URL
- [ ] Update OAuth redirect URIs
- [ ] Add production SHA-1 fingerprints
- [ ] Submit apps for review (Facebook, Apple)
- [ ] Enable production mode in provider consoles
- [ ] Test on real devices (iOS and Android)
- [ ] Verify all social login flows
- [ ] Test error scenarios
- [ ] Monitor crash reports

## Security Notes

1. **Never commit:**
   - GoogleService-Info.plist
   - google-services.json
   - .env file
   - Private keys

2. **Always use:**
   - Environment variables for sensitive data
   - Secure storage for tokens
   - HTTPS in production

3. **Regular updates:**
   - Keep SDK versions updated
   - Monitor security advisories
   - Update dependencies

## Resources

- [Google Sign In React Native](https://github.com/react-native-google-signin/google-signin)
- [Apple Authentication React Native](https://github.com/invertase/react-native-apple-authentication)
- [Facebook SDK React Native](https://github.com/thebergamo/react-native-fbsdk-next)
- [React Native Documentation](https://reactnative.dev/)

## Support

For issues:
1. Check error logs
2. Verify configuration
3. Test with provider's tools
4. Consult provider documentation
5. Contact development team
