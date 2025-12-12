# Certificate Pinning Dependencies and Setup

## Required Dependencies

Add these dependencies to your `package.json`:

```json
{
  "dependencies": {
    "react-native-ssl-pinning": "^1.5.1"
  }
}
```

## Installation Instructions

### 1. Install npm Package

```bash
cd DatingPlatform/apps/mobile-app
npm install react-native-ssl-pinning
```

### 2. iOS Setup

#### 2a. Install CocoaPods Dependencies

```bash
cd ios
pod install
cd ..
```

#### 2b. Configure TrustKit (Optional - for enhanced iOS pinning)

If you want to use TrustKit for iOS (recommended), add to your Podfile:

```ruby
pod 'TrustKit', '~> 3.0'
```

Then:

```bash
cd ios
pod install
cd ..
```

#### 2c. Update Info.plist

Replace the existing `Info.plist` with `Info_UPDATED.plist`:

```bash
cd ios/FlavoralApp
mv Info.plist Info.plist.backup
mv Info_UPDATED.plist Info.plist
cd ../..
```

### 3. Android Setup

#### 3a. Update AndroidManifest.xml

Replace the existing `AndroidManifest.xml` with `AndroidManifest_UPDATED.xml`:

```bash
cd android/app/src/main
mv AndroidManifest.xml AndroidManifest.xml.backup
mv AndroidManifest_UPDATED.xml AndroidManifest.xml
cd ../../../../..
```

#### 3b. Verify Network Security Config

Ensure the file exists at:
```
android/app/src/main/res/xml/network_security_config.xml
```

### 4. Link Native Modules (React Native < 0.60)

If using React Native < 0.60, manually link:

```bash
react-native link react-native-ssl-pinning
```

For React Native >= 0.60, auto-linking should work automatically.

---

## Alternative: Manual Implementation (No Third-Party Library)

If you prefer not to use `react-native-ssl-pinning`, you can implement pinning using native modules:

### iOS - Using TrustKit

1. **Install TrustKit**:
```bash
cd ios
pod 'TrustKit'
pod install
cd ..
```

2. **Create TrustKit Configuration** (`ios/TrustKitConfig.plist`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>TSKPinnedDomains</key>
    <dict>
        <key>api.flamoral.com</key>
        <dict>
            <key>TSKPublicKeyHashes</key>
            <array>
                <string>YOUR_PRIMARY_PIN_HASH</string>
                <string>YOUR_BACKUP_PIN_HASH</string>
            </array>
            <key>TSKIncludeSubdomains</key>
            <false/>
            <key>TSKEnforcePinning</key>
            <true/>
        </dict>
        <key>ai.flamoral.com</key>
        <dict>
            <key>TSKPublicKeyHashes</key>
            <array>
                <string>YOUR_PRIMARY_PIN_HASH</string>
                <string>YOUR_BACKUP_PIN_HASH</string>
            </array>
            <key>TSKIncludeSubdomains</key>
            <false/>
            <key>TSKEnforcePinning</key>
            <true/>
        </dict>
    </dict>
</dict>
</plist>
```

3. **Initialize in AppDelegate.m**:

```objc
#import <TrustKit/TrustKit.h>

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
    // Initialize TrustKit
    NSDictionary *trustKitConfig = @{
        kTSKPinnedDomains: @{
            @"api.flamoral.com": @{
                kTSKPublicKeyHashes: @[
                    @"YOUR_PRIMARY_PIN_HASH",
                    @"YOUR_BACKUP_PIN_HASH"
                ],
                kTSKIncludeSubdomains: @NO,
                kTSKEnforcePinning: @YES
            }
        }
    };
    [TrustKit initSharedInstanceWithConfiguration:trustKitConfig];

    // Rest of your code...
}
```

### Android - Network Security Config Only

Android's Network Security Config (already created) provides built-in pinning without additional libraries.

**Advantages**:
- No third-party dependencies
- Native Android support
- Declarative configuration

**Limitations**:
- Android 7.0+ only (API level 24+)
- For older Android versions, consider using OkHttp with CertificatePinner

---

## Post-Installation Steps

### 1. Update Pin Hashes

Replace all placeholder pins in:

- `src/config/sslPinning.config.ts`
- `android/app/src/main/res/xml/network_security_config.xml`
- iOS TrustKit configuration (if using)

### 2. Generate Your Pins

Follow the instructions in `SSL_PINNING_SETUP.md` to generate pin hashes for your domains:

```bash
openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### 3. Test the Implementation

```bash
# iOS
npm run ios

# Android
npm run android
```

### 4. Verify Pinning Works

Test with a tool like Charles Proxy:
1. Install Charles certificate on device
2. Configure device to use Charles proxy
3. Launch app
4. App should fail to connect (pinning is working)
5. Check logs for SSL pinning error messages

---

## Migration Guide

### Migrating from Standard httpClient to Secure Client

**Option 1: Gradual Migration (Recommended)**

Keep both clients and migrate gradually:

```typescript
// Before
import { httpClient } from './services/api/httpClient';

// After (for critical endpoints)
import { httpClient } from './services/api/httpClient.secure';
```

**Option 2: Complete Migration**

Replace the entire httpClient:

```bash
cd src/services/api
mv httpClient.ts httpClient.legacy.ts
mv httpClient.secure.ts httpClient.ts
```

Then update imports:
```typescript
// All imports automatically use secure client now
import { httpClient } from './services/api/httpClient';
```

---

## Environment-Specific Configuration

### Development Environment

In development, you may want to disable pinning for easier debugging:

```typescript
// src/config/sslPinning.config.ts
export const SSL_PINNING_OPTIONS = {
  enabled: __DEV__ ? false : true, // Disabled in development
  validationMode: __DEV__ ? 'permissive' : 'strict',
};
```

### Staging Environment

Use separate pins for staging:

```typescript
const STAGING_PINS = {
  'api-staging.flamoral.com': ['sha256/STAGING_PIN_1=', 'sha256/STAGING_PIN_2='],
};

const PRODUCTION_PINS = {
  'api.flamoral.com': ['sha256/PROD_PIN_1=', 'sha256/PROD_PIN_2='],
};

export const SSL_PIN_CONFIG = __DEV__
  ? []
  : (IS_STAGING ? STAGING_PINS : PRODUCTION_PINS);
```

---

## Troubleshooting

### Issue: "react-native-ssl-pinning" module not found

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# iOS
cd ios && pod install && cd ..

# Android - clean
cd android && ./gradlew clean && cd ..
```

### Issue: iOS build fails with TrustKit errors

**Solution**:
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Issue: Android build fails - network_security_config not found

**Solution**:
```bash
# Verify file exists
ls android/app/src/main/res/xml/network_security_config.xml

# Create xml directory if missing
mkdir -p android/app/src/main/res/xml
```

### Issue: SSL pinning not working in development

**Solution**:
Check `SSL_PINNING_OPTIONS.enabled` is set to `true` for testing.

---

## Performance Considerations

### Impact on App Size

- `react-native-ssl-pinning`: ~50KB
- TrustKit (iOS): ~200KB
- Network Security Config (Android): Negligible

### Runtime Performance

- Pin validation adds ~5-10ms per request
- Negligible impact on user experience
- Caching reduces overhead for repeated requests

---

## Security Checklist

Before deploying to production:

- [ ] All placeholder pins replaced with actual pins
- [ ] Minimum 2 pins per domain (primary + backup)
- [ ] Backup pins tested and verified
- [ ] Certificate expiration dates documented
- [ ] Rotation schedule planned (see SSL_PINNING_SETUP.md)
- [ ] NSAllowsArbitraryLoads set to `false` (iOS)
- [ ] usesCleartextTraffic set to `false` (Android)
- [ ] SSL pinning tested with proxy (should fail)
- [ ] Error handling tested and user-friendly
- [ ] Monitoring/logging configured
- [ ] Emergency rollback plan documented

---

## Support

If you encounter issues:

1. Check `SSL_PINNING_SETUP.md` for detailed troubleshooting
2. Review logs for specific error messages
3. Test with `validationMode: 'permissive'` to see warnings
4. Contact security team: security@flamoral.com

---

Last Updated: 2025-12-11
