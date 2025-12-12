# iOS App Capabilities Configuration

## Overview
This document outlines all the capabilities and entitlements required for the Flamoral iOS app to function properly and pass App Store review.

---

## Required Capabilities

### 1. Push Notifications
**Status:** Required
**Purpose:** Notify users of new matches, messages, and app activity

**Configuration:**
- Enable in Xcode: Signing & Capabilities > + Capability > Push Notifications
- Certificate: APNs Authentication Key or Certificate required
- Implementation: Firebase Cloud Messaging (FCM) for cross-platform support

**Setup Steps:**
1. Go to Apple Developer Portal
2. Certificates, Identifiers & Profiles > Keys
3. Create new APNs Authentication Key
4. Download and configure in Firebase Console
5. Add capability in Xcode project

**Info.plist Requirements:**
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

**Testing:**
- Send test notification via Firebase Console
- Verify notification appears on device
- Test notification permissions flow

---

### 2. Sign In with Apple
**Status:** Required (if offering third-party social login)
**Purpose:** Allow users to sign in using their Apple ID

**Configuration:**
- Enable in Xcode: Signing & Capabilities > + Capability > Sign In with Apple
- Automatic entitlement added to app

**Setup Steps:**
1. Enable in Xcode project capabilities
2. Configure in Apple Developer Portal (automatic)
3. Implement Sign In with Apple button using AuthenticationServices framework
4. Handle Apple ID credentials in backend

**Info.plist Requirements:**
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleTypeRole</key>
        <string>Editor</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>com.flamoral.apple-sign-in</string>
        </array>
    </dict>
</array>
```

**Implementation Notes:**
- Required if app offers Google or Facebook login
- Apple guideline 4.8: Must offer Sign In with Apple
- Use ASAuthorizationAppleIDButton for UI
- Handle user credentials securely

**Testing:**
- Sign in with Apple ID on device
- Verify token exchange with backend
- Test account deletion flow

---

### 3. In-App Purchase
**Status:** Required
**Purpose:** Premium subscriptions and virtual coins

**Configuration:**
- Enable in Xcode: Signing & Capabilities > + Capability > In-App Purchase
- Configure products in App Store Connect

**Products to Configure:**

#### Auto-Renewable Subscriptions
1. **Premium Monthly**
   - Product ID: `com.flamoral.premium.monthly`
   - Price: $9.99/month
   - Features: Unlimited likes, advanced filters, see who liked you

2. **Premium Yearly**
   - Product ID: `com.flamoral.premium.yearly`
   - Price: $59.99/year
   - Features: Same as monthly, 50% savings

3. **Premium+ Monthly**
   - Product ID: `com.flamoral.premium_plus.monthly`
   - Price: $19.99/month
   - Features: All Premium + profile boost + coins

4. **Premium+ Yearly**
   - Product ID: `com.flamoral.premium_plus.yearly`
   - Price: $119.99/year
   - Features: Same as monthly, 50% savings

#### Consumables (Virtual Coins)
1. **Coin Pack Small**
   - Product ID: `com.flamoral.coins.small`
   - Price: $1.99
   - Amount: 10 coins

2. **Coin Pack Medium**
   - Product ID: `com.flamoral.coins.medium`
   - Price: $4.99
   - Amount: 30 coins

3. **Coin Pack Large**
   - Product ID: `com.flamoral.coins.large`
   - Price: $9.99
   - Amount: 75 coins

**Setup Steps:**
1. Create products in App Store Connect
2. Configure pricing for each territory
3. Add subscription groups and levels
4. Implement StoreKit in app
5. Test with sandbox accounts

**Testing:**
- Create sandbox test accounts in App Store Connect
- Test purchase flow for each product
- Verify receipt validation
- Test subscription renewal and cancellation
- Test restore purchases

---

### 4. Background Modes
**Status:** Required
**Purpose:** Handle push notifications, VoIP calls, and background tasks

**Configuration:**
Enable in Xcode: Signing & Capabilities > + Capability > Background Modes

**Required Modes:**
- ✓ Remote notifications
- ✓ Voice over IP (VoIP)
- ✓ Background fetch
- ✓ Background processing

**Info.plist Configuration:**
```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>voip</string>
    <string>fetch</string>
    <string>processing</string>
</array>
```

**Use Cases:**
- **Remote Notifications:** Receive push notifications in background
- **VoIP:** Handle incoming video call notifications
- **Background Fetch:** Update match recommendations
- **Background Processing:** Sync messages and data

**Testing:**
- Test push notifications in background
- Test VoIP call notifications
- Verify background fetch works
- Check battery impact

---

### 5. Associated Domains
**Status:** Required
**Purpose:** Universal Links and deep linking

**Configuration:**
- Enable in Xcode: Signing & Capabilities > + Capability > Associated Domains
- Add domains: `applinks:flamoral.com` and `applinks:flamoral.app`

**Setup Steps:**
1. Enable capability in Xcode
2. Add domains in format: `applinks:yourdomain.com`
3. Create apple-app-site-association file
4. Upload to website at `https://flamoral.com/.well-known/apple-app-site-association`
5. Verify file is accessible without .json extension

**apple-app-site-association File:**
```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.flamoral",
        "paths": [
          "/profile/*",
          "/match/*",
          "/chat/*",
          "/invite/*"
        ]
      }
    ]
  }
}
```

**Info.plist Configuration:**
```xml
<key>com.apple.developer.associated-domains</key>
<array>
    <string>applinks:flamoral.app</string>
    <string>applinks:www.flamoral.app</string>
    <string>applinks:flamoral.com</string>
    <string>applinks:www.flamoral.com</string>
</array>
```

**Testing:**
- Test universal links in Safari
- Verify deep linking to specific screens
- Test fallback to App Store if app not installed

---

### 6. App Groups (Optional)
**Status:** Optional
**Purpose:** Share data between app and extensions (if needed in future)

**Configuration:**
- Enable in Xcode: Signing & Capabilities > + Capability > App Groups
- Create group ID: `group.com.flamoral.shared`

**Use Cases:**
- Share UserDefaults between app and extensions
- Share Core Data database
- Share files between targets

**Not required for v1.0 but useful for:**
- Notification Service Extension (rich notifications)
- Share Extension (share to app)
- Today Widget (if added)

---

## Privacy Permissions

### Required Permissions (Info.plist)

#### 1. Camera Access
```xml
<key>NSCameraUsageDescription</key>
<string>Flamoral needs access to your camera to take profile photos and verify your identity for a safe dating experience.</string>
```

**Purpose:** Profile photos, photo verification
**User Control:** Can deny, required for photo features

---

#### 2. Photo Library Access
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Flamoral needs access to your photo library so you can select and upload photos to your dating profile.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>Flamoral would like to save photos to your library when you choose to download them from conversations.</string>
```

**Purpose:** Upload profile photos, save shared photos
**User Control:** Can deny, required for photo features

---

#### 3. Location Access
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Flamoral uses your location to show you potential matches nearby. Your precise location is never shared with other users.</string>
```

**Purpose:** Show nearby matches, distance calculations
**User Control:** Can deny, app works without location
**Note:** Only "When In Use", never "Always"

---

#### 4. Microphone Access
```xml
<key>NSMicrophoneUsageDescription</key>
<string>Flamoral needs microphone access to enable video calls and voice messages with your matches.</string>
```

**Purpose:** Video calls, voice messages
**User Control:** Can deny, required for video/voice features

---

#### 5. Face ID / Touch ID
```xml
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to securely unlock the app and protect your privacy.</string>
```

**Purpose:** Biometric app lock (optional feature)
**User Control:** Optional feature, can skip

---

#### 6. User Tracking (ATT)
```xml
<key>NSUserTrackingUsageDescription</key>
<string>This helps us provide personalized match recommendations and improve your experience.</string>
```

**Purpose:** Required for iOS 14.5+, even if not tracking
**User Control:** User can deny
**Note:** Flamoral does NOT track users across apps/websites

---

## Entitlements File

The app's entitlements file should include:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- App Identifier -->
    <key>application-identifier</key>
    <string>$(AppIdentifierPrefix)com.flamoral</string>

    <!-- Team Identifier -->
    <key>com.apple.developer.team-identifier</key>
    <string>$(AppIdentifierPrefix)</string>

    <!-- Push Notifications -->
    <key>aps-environment</key>
    <string>production</string>

    <!-- Sign In with Apple -->
    <key>com.apple.developer.applesignin</key>
    <array>
        <string>Default</string>
    </array>

    <!-- Associated Domains -->
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:flamoral.app</string>
        <string>applinks:www.flamoral.app</string>
        <string>applinks:flamoral.com</string>
        <string>applinks:www.flamoral.com</string>
    </array>

    <!-- Keychain Access Groups -->
    <key>keychain-access-groups</key>
    <array>
        <string>$(AppIdentifierPrefix)com.flamoral</string>
    </array>

    <!-- App Groups (Optional) -->
    <!--
    <key>com.apple.security.application-groups</key>
    <array>
        <string>group.com.flamoral.shared</string>
    </array>
    -->

    <!-- iCloud (Not Used) -->
    <!-- Not enabled for v1.0 -->

</dict>
</plist>
```

---

## App Store Connect Configuration

### App Information

**Category:**
- Primary: Lifestyle
- Secondary: Social Networking

**Age Rating:**
- 17+ (Infrequent/Mild Sexual Content or Nudity)
- Reasons: Dating app, user-generated content, messaging

**Content Rights:**
- ✓ All content and materials comply with guidelines
- ✓ No third-party content without rights

---

### App Review Information

**Notes for Review:**
```
This is a dating app for users 18+.
Video calls use Agora SDK.
Payments via Apple In-App Purchase.
Push notifications for matches/messages.
Location for nearby matching only.
No third-party tracking.
```

**Demo Account:**
- Email: reviewer@flamoral.com
- Password: [Secure password provided separately]

---

### Export Compliance

**Uses Encryption:** Yes
**Exempt from Export Compliance:** Yes

**Reason:**
App uses standard encryption (HTTPS, end-to-end messaging) that qualifies for exemption under Category 5 Part 2.

**Documentation:**
- HTTPS for API calls (standard TLS)
- End-to-end encryption for messages (standard libraries)
- No custom cryptography
- Qualifies for self-classification exemption

---

## Capability Checklist

### Pre-Submission Checklist

- [ ] Push Notifications enabled and tested
- [ ] Sign In with Apple implemented (if using social login)
- [ ] In-App Purchases configured in App Store Connect
- [ ] All IAP products created and approved
- [ ] Background Modes configured correctly
- [ ] Associated Domains configured
- [ ] Universal Links tested and working
- [ ] All privacy permissions have clear descriptions
- [ ] Camera permission tested
- [ ] Photo library permission tested
- [ ] Location permission tested (optional)
- [ ] Microphone permission tested
- [ ] Face ID permission tested (if used)
- [ ] ATT permission added (iOS 14.5+)
- [ ] Entitlements file reviewed
- [ ] App Groups configured (if needed)
- [ ] Export compliance documentation ready

### Post-Configuration Testing

- [ ] Test all permissions on clean device
- [ ] Verify permission prompts appear correctly
- [ ] Test permission denial scenarios
- [ ] Verify app handles denied permissions gracefully
- [ ] Test push notifications (sandbox)
- [ ] Test VoIP notifications
- [ ] Test universal links
- [ ] Test Sign In with Apple flow
- [ ] Test all In-App Purchase flows
- [ ] Verify subscription management works
- [ ] Test restore purchases
- [ ] Verify background modes work correctly

---

## Troubleshooting

### Common Issues

**Push Notifications Not Working:**
- Verify APNs certificate is valid
- Check Firebase configuration
- Ensure aps-environment is "production" for release
- Test with actual device (not simulator)

**Sign In with Apple Failing:**
- Verify capability is enabled
- Check bundle identifier matches
- Ensure domain is configured correctly
- Test on actual device (simulator may have issues)

**In-App Purchase Not Appearing:**
- Products must be in "Ready to Submit" status
- Use correct product IDs
- Test with sandbox account
- Check network connectivity

**Universal Links Not Working:**
- Verify apple-app-site-association file is accessible
- Check file is valid JSON
- Ensure no .json extension
- Verify team ID and bundle ID match
- Test after 24 hours (CDN caching)

**Background Modes Not Working:**
- Verify capabilities are enabled
- Check Info.plist has correct entries
- Ensure code implements required delegate methods
- Test on device (not simulator)

---

## Security Considerations

### Best Practices

1. **Permissions:**
   - Request permissions only when needed
   - Explain why permission is required
   - Handle denial gracefully
   - Never request all permissions at launch

2. **Code Signing:**
   - Use automatic signing for development
   - Use manual signing for release
   - Keep certificates secure
   - Rotate certificates before expiration

3. **In-App Purchases:**
   - Always validate receipts server-side
   - Use Apple's verification service
   - Handle edge cases (restore, refund)
   - Secure product IDs

4. **Data Protection:**
   - Enable Data Protection for files
   - Use Keychain for sensitive data
   - Encrypt user data in transit and at rest
   - Follow GDPR/CCPA requirements

---

## References

- [Apple Developer Documentation - Capabilities](https://developer.apple.com/documentation/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [In-App Purchase Programming Guide](https://developer.apple.com/in-app-purchase/)
- [Universal Links Documentation](https://developer.apple.com/ios/universal-links/)
- [Push Notification Guide](https://developer.apple.com/notifications/)

---

**Last Updated:** December 11, 2025
**Version:** 1.0.0
**Prepared By:** Flamoral Development Team
