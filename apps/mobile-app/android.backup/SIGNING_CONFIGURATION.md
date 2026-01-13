# Android App Signing Configuration Guide

## Overview

This guide explains how to configure app signing for Flamoral Android app for Google Play Store submission.

---

## 1. Keystore Generation

### Generate Release Keystore

Run this command to create a new keystore:

```bash
keytool -genkeypair -v \
  -keystore release.keystore \
  -alias flamoral-release \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_KEYSTORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=Flamoral Inc, OU=Mobile, O=Flamoral, L=San Francisco, S=California, C=US"
```

### Keystore Details

**CRITICAL: Store these details securely. Losing the keystore means you cannot update your app!**

```
Keystore file: release.keystore
Keystore password: [SECURE - Use password manager]
Key alias: flamoral-release
Key password: [SECURE - Use password manager]
Validity: 10,000 days (~27 years)
Key size: 2048-bit RSA
```

### Security Best Practices

1. **Never commit keystore to version control**
   - Add to `.gitignore`
   - Store in secure location (password manager, vault)

2. **Backup keystore securely**
   - Multiple encrypted backups
   - Different physical locations
   - Cloud backup with encryption

3. **Restrict access**
   - Only authorized team members
   - Use environment variables for CI/CD
   - Never share passwords in plain text

---

## 2. Configure Gradle for Signing

### Add to `.gitignore`

```gitignore
# Signing
*.keystore
*.jks
keystore.properties
local.properties
```

### Create `keystore.properties` (Local Development)

Create file: `android/keystore.properties`

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=flamoral-release
storeFile=../release.keystore
```

**Do NOT commit this file to Git!**

### Update `android/app/build.gradle`

The build.gradle is already configured to use environment variables or keystore.properties:

```gradle
signingConfigs {
    release {
        if (project.hasProperty('FLAMORAL_UPLOAD_STORE_FILE')) {
            // Use environment variables (CI/CD)
            storeFile file(FLAMORAL_UPLOAD_STORE_FILE)
            storePassword FLAMORAL_UPLOAD_STORE_PASSWORD
            keyAlias FLAMORAL_UPLOAD_KEY_ALIAS
            keyPassword FLAMORAL_UPLOAD_KEY_PASSWORD
        } else if (file('../keystore.properties').exists()) {
            // Use keystore.properties file (local development)
            def keystorePropertiesFile = file('../keystore.properties')
            def keystoreProperties = new Properties()
            keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
```

---

## 3. Google Play App Signing

### Enable Play App Signing (Recommended)

Google Play App Signing provides additional security and allows Google to optimize your app for different devices.

**Benefits:**
- Google manages your app signing key
- Easier key management
- App optimization by Google
- Lost key recovery possible

### Setup Steps

1. **Generate Upload Key** (different from app signing key)
   ```bash
   keytool -genkeypair -v \
     -keystore upload.keystore \
     -alias flamoral-upload \
     -keyalg RSA \
     -keysize 2048 \
     -validity 10000
   ```

2. **In Google Play Console:**
   - Go to Release > Setup > App integrity
   - Choose "Use Google Play App Signing"
   - Upload your app signing key OR let Google generate one
   - Upload your upload key certificate

3. **Export Upload Certificate:**
   ```bash
   keytool -export -rfc \
     -keystore upload.keystore \
     -alias flamoral-upload \
     -file upload_certificate.pem
   ```

### Key Types

- **App Signing Key:** Held by Google, signs the final APK
- **Upload Key:** Used by you to sign AAB before upload
- **Google ensures** the app signing key stays secure

---

## 4. Environment Variables for CI/CD

### GitHub Actions Example

Create secrets in GitHub repository settings:

```
FLAMORAL_UPLOAD_STORE_FILE=/path/to/keystore
FLAMORAL_UPLOAD_STORE_PASSWORD=your_password
FLAMORAL_UPLOAD_KEY_ALIAS=flamoral-release
FLAMORAL_UPLOAD_KEY_PASSWORD=your_password
```

### GitHub Actions Workflow

```yaml
name: Build and Deploy Android

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up JDK 11
        uses: actions/setup-java@v3
        with:
          java-version: '11'
          distribution: 'temurin'

      - name: Decode Keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.KEYSTORE_BASE64 }}
        run: |
          echo $KEYSTORE_BASE64 | base64 -d > release.keystore

      - name: Build Release AAB
        env:
          FLAMORAL_UPLOAD_STORE_FILE: ../release.keystore
          FLAMORAL_UPLOAD_STORE_PASSWORD: ${{ secrets.KEYSTORE_PASSWORD }}
          FLAMORAL_UPLOAD_KEY_ALIAS: ${{ secrets.KEY_ALIAS }}
          FLAMORAL_UPLOAD_KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: |
          cd android
          ./gradlew bundleRelease

      - name: Upload AAB
        uses: actions/upload-artifact@v3
        with:
          name: app-release.aab
          path: android/app/build/outputs/bundle/release/app-release.aab
```

### Fastlane with Environment Variables

Already configured in `android/fastlane/Fastfile`:

```ruby
lane :build_release do
  gradle(
    task: "assemble",
    build_type: "Release",
    properties: {
      "android.injected.signing.store.file" => ENV["FLAMORAL_UPLOAD_STORE_FILE"],
      "android.injected.signing.store.password" => ENV["FLAMORAL_UPLOAD_STORE_PASSWORD"],
      "android.injected.signing.key.alias" => ENV["FLAMORAL_UPLOAD_KEY_ALIAS"],
      "android.injected.signing.key.password" => ENV["FLAMORAL_UPLOAD_KEY_PASSWORD"],
    }
  )
end
```

---

## 5. Building Signed Release

### Using Gradle

```bash
cd android

# Build signed APK
./gradlew assembleRelease

# Build signed AAB (recommended for Play Store)
./gradlew bundleRelease
```

Output locations:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

### Using Fastlane

```bash
cd android

# Build release APK
fastlane build_release

# Build release AAB
fastlane build_bundle
```

---

## 6. Verify Signed Build

### Check Signature

```bash
# For APK
jarsigner -verify -verbose -certs app-release.apk

# For AAB
jarsigner -verify -verbose -certs app-release.aab
```

### Extract Certificate

```bash
# List keystore
keytool -list -v -keystore release.keystore

# Expected output should show:
# - Alias: flamoral-release
# - Creation date
# - Entry type: PrivateKeyEntry
# - Certificate fingerprints (SHA1, SHA256)
```

### Verify Certificate Fingerprint

The SHA-256 fingerprint should match what's registered in:
- Google Play Console
- Firebase Console
- Facebook Developer Console
- Other third-party services

---

## 7. Security Checklist

### Before Release
- [ ] Keystore backed up securely
- [ ] Passwords stored in password manager
- [ ] keystore.properties not in Git
- [ ] release.keystore not in Git
- [ ] CI/CD secrets configured
- [ ] Upload key uploaded to Play Console
- [ ] Certificate fingerprints registered with services

### Access Control
- [ ] Limit keystore access to authorized team only
- [ ] Use separate upload and app signing keys
- [ ] Enable Play App Signing
- [ ] Document key recovery process
- [ ] Set up alerts for unauthorized access

---

## 8. Key Recovery

### If Upload Key is Lost

With Play App Signing enabled:
1. Contact Google Play Support
2. Provide app details and verification
3. Request upload key reset
4. Generate new upload key
5. Upload new certificate

**Note:** This is only possible if using Play App Signing!

### If App Signing Key is Lost (Without Play App Signing)

**YOU CANNOT UPDATE YOUR APP!**

This is why Play App Signing is strongly recommended.

---

## 9. Key Rotation

### When to Rotate Keys

- Security breach suspected
- Key compromised
- Employee with key access leaves
- Yearly security best practice

### How to Rotate Upload Key

1. Generate new upload key
2. Export certificate
3. Upload to Play Console
4. Google will validate
5. Use new key for future releases

**App signing key** cannot be rotated (unless using Play App Signing).

---

## 10. Troubleshooting

### "Keystore was tampered with, or password was incorrect"

- Check password in keystore.properties
- Verify keystore file path
- Ensure keystore file not corrupted

### "Entry for alias ... does not contain a key"

- Check key alias is correct
- Verify alias exists: `keytool -list -keystore release.keystore`

### Build fails with signing errors

- Verify all environment variables set
- Check keystore file permissions
- Ensure keystore.properties format correct

### Certificate fingerprint mismatch

- Regenerate certificate: `keytool -list -v -keystore release.keystore`
- Update fingerprints in all services
- Rebuild and re-sign app

---

## 11. Multi-Environment Setup

### Development vs Production

```bash
# Development (debug keystore)
./gradlew assembleDebug

# Production (release keystore)
./gradlew assembleRelease
```

### Different Keystores per Environment

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }

    staging {
        // Use separate staging keystore
    }

    release {
        // Use production keystore
    }
}
```

---

## 12. Additional Resources

### Documentation
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)
- [Keytool Documentation](https://docs.oracle.com/javase/8/docs/technotes/tools/unix/keytool.html)

### Tools
- Android Studio (Build > Generate Signed Bundle/APK)
- Gradle command line
- Fastlane automation
- CI/CD platforms

---

## Summary

1. **Generate keystore** with strong password
2. **Backup securely** in multiple locations
3. **Configure Gradle** with signing config
4. **Use environment variables** for CI/CD
5. **Enable Play App Signing** for security
6. **Test signing** before submission
7. **Never commit** keystore to Git

**CRITICAL:** The keystore is the most important file for your app. Treat it like a master password!

---

**Last Updated:** December 11, 2025
**Version:** 1.0
