# Google Play Store Preparation Guide

**Flamoral Android App - Complete Preparation Documentation**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Files & Assets Created](#files--assets-created)
4. [Build Configuration](#build-configuration)
5. [App Signing](#app-signing)
6. [Store Listing](#store-listing)
7. [Fastlane Automation](#fastlane-automation)
8. [Submission Process](#submission-process)
9. [Post-Submission](#post-submission)
10. [Quick Start Commands](#quick-start-commands)

---

## Overview

This document provides a comprehensive guide for preparing and submitting Flamoral Android app to the Google Play Store.

**App Details:**
- **Package Name:** com.flamoral.app
- **App Name:** Flamoral: Dating & Relationships
- **Category:** Social > Dating
- **Age Rating:** Mature 17+ (18+ enforced in app)
- **Version:** 1.0.0 (Version Code: 1)

---

## Prerequisites

### Required Accounts
- [ ] Google Play Developer Account ($25 one-time fee)
- [ ] Firebase Project (for push notifications, analytics)
- [ ] Payment merchant account (for subscriptions)

### Required Tools
- [ ] Android Studio (latest version)
- [ ] JDK 11+
- [ ] Android SDK (API 23-34)
- [ ] Fastlane (optional but recommended)
- [ ] Git

### Required Information
- [ ] Developer/Company name
- [ ] Support email: support@flamoral.com
- [ ] Privacy policy URL: https://flamoral.com/privacy
- [ ] Terms of service URL: https://flamoral.com/terms
- [ ] Physical address (required by Google)

---

## Files & Assets Created

### Android Configuration Files

```
apps/mobile-app/android/
├── build.gradle                      # Root build configuration
├── gradle.properties                 # Gradle settings
├── SIGNING_CONFIGURATION.md          # Signing guide
│
├── app/
│   ├── build.gradle                  # App build configuration
│   ├── proguard-rules.pro           # ProGuard/R8 rules
│   └── src/main/
│       └── AndroidManifest.xml      # App manifest
│
└── fastlane/
    ├── Fastfile                      # Fastlane automation
    ├── Appfile                       # Fastlane app config
    ├── README.md                     # Fastlane guide
    └── metadata/android/en-US/
        ├── title.txt                 # App title
        ├── short_description.txt     # Short description
        ├── full_description.txt      # Full description
        ├── video.txt                 # Promo video URL
        ├── changelogs/
        │   └── 1.txt                 # Version 1 changelog
        └── images/
            ├── icon.png              # To be created
            ├── featureGraphic.png    # To be created
            └── phoneScreenshots/     # To be created
```

### Play Store Assets

```
apps/mobile-app/play-store/
├── SHORT_DESCRIPTION.txt             # 80 char description
├── FULL_DESCRIPTION.txt              # Full store description
├── WHATS_NEW.txt                     # Release notes
├── FEATURE_GRAPHIC_REQUIREMENTS.md   # Design specifications
├── CONTENT_RATING_QUESTIONNAIRE.md   # Rating guide
├── SUBMISSION_CHECKLIST.md           # Complete checklist
├── PLAY_STORE_PREPARATION.md         # This file
│
├── assets/
│   ├── icon-512.png                  # To be created
│   ├── feature-graphic.png           # To be created
│   └── promo-graphic.png             # To be created (optional)
│
└── screenshots/
    ├── phone/
    │   ├── 1_discovery.png           # To be created
    │   ├── 2_profile.png             # To be created
    │   ├── 3_messaging.png           # To be created
    │   └── ...                       # Up to 8 screenshots
    └── tablet/                       # Optional
```

---

## Build Configuration

### 1. Gradle Configuration

**Root `build.gradle`** - Already created with:
- Build tools version: 34.0.0
- Kotlin version: 1.8.0
- Google Services plugin
- Dependency versions

**App `build.gradle`** - Already configured with:
- Min SDK: 23 (Android 6.0)
- Target SDK: 34 (Android 14)
- Version management
- Signing configurations
- ProGuard/R8 optimization
- Multi-APK support

### 2. ProGuard Rules

**`proguard-rules.pro`** - Configured to:
- Keep React Native classes
- Keep Firebase classes
- Optimize code size
- Remove debug logging
- Obfuscate code
- Preserve stack traces for crash reporting

### 3. Gradle Properties

**`gradle.properties`** - Configured with:
- JVM heap size: 2GB
- Hermes engine: Enabled
- R8 optimization: Enabled
- Build caching: Enabled
- AndroidX: Enabled

---

## App Signing

### Quick Setup

1. **Generate Keystore:**
   ```bash
   keytool -genkeypair -v \
     -keystore android/release.keystore \
     -alias flamoral-release \
     -keyalg RSA -keysize 2048 \
     -validity 10000
   ```

2. **Create `keystore.properties`:**
   ```properties
   storePassword=YOUR_PASSWORD
   keyPassword=YOUR_PASSWORD
   keyAlias=flamoral-release
   storeFile=../release.keystore
   ```

3. **Add to `.gitignore`:**
   ```
   *.keystore
   keystore.properties
   ```

4. **Enable Play App Signing** (recommended)
   - Automatic in Google Play Console
   - Protects your signing key
   - Allows key recovery

**See `SIGNING_CONFIGURATION.md` for detailed instructions.**

---

## Store Listing

### Required Assets

#### 1. App Icon
- **Size:** 512 x 512 px
- **Format:** PNG (32-bit)
- **Content:** Flamoral logo
- **Location:** `play-store/assets/icon-512.png`

#### 2. Feature Graphic
- **Size:** 1024 x 500 px
- **Format:** PNG or JPEG
- **Content:** Branding, tagline, visual elements
- **Location:** `play-store/assets/feature-graphic.png`

**Design Requirements:**
- Use brand colors: #FF6B9D (primary), #C73866 (secondary)
- Include tagline: "Where Passion Meets Connection"
- Keep text readable
- Professional quality
- No misleading imagery

#### 3. Screenshots (Phone)
- **Quantity:** 2-8 screenshots
- **Size:** 1080 x 1920 px (recommended)
- **Format:** PNG or JPEG

**Required Screenshots:**
1. **Discovery Screen** - Swipe interface with profiles
2. **Profile Screen** - Video profile showcase
3. **Messaging Screen** - Chat interface
4. **Matches Screen** - Match list
5. **Video Call** - Video calling feature
6. **Safety Features** - Safety toolkit
7. **Gamification** - Daily rewards/achievements
8. **AI Features** - Smart matching

**Location:** `play-store/screenshots/phone/`

### Store Copy

#### App Title (50 chars max)
```
Flamoral: Dating & Relationships
```

#### Short Description (80 chars)
```
Authentic connections through AI-powered matching. Video profiles & smart conversations.
```
**File:** `play-store/SHORT_DESCRIPTION.txt`

#### Full Description (4000 chars)
Comprehensive app description including:
- Key features
- Value proposition
- Safety features
- Premium features
- Privacy information
- Subscription details
- Age requirement

**File:** `play-store/FULL_DESCRIPTION.txt`

#### What's New (500 chars)
Release notes for version 1.0.0

**File:** `play-store/WHATS_NEW.txt`

---

## Fastlane Automation

### Installation

```bash
# Install Fastlane
gem install fastlane

# Or using Bundler
bundle install
```

### Configuration

1. **Set up Google Play service account**
   - Download JSON key file
   - Place in secure location (not in Git!)

2. **Update `Appfile`:**
   ```ruby
   json_key_file("path/to/service-account.json")
   package_name("com.flamoral.app")
   ```

3. **Set environment variables:**
   ```bash
   export FLAMORAL_UPLOAD_STORE_FILE="/path/to/release.keystore"
   export FLAMORAL_UPLOAD_STORE_PASSWORD="your_password"
   export FLAMORAL_UPLOAD_KEY_ALIAS="flamoral-release"
   export FLAMORAL_UPLOAD_KEY_PASSWORD="your_password"
   ```

### Available Commands

```bash
# Build release bundle
fastlane build_bundle

# Deploy to internal testing
fastlane deploy_internal

# Deploy to alpha
fastlane deploy_alpha

# Deploy to beta
fastlane deploy_beta

# Deploy to production
fastlane deploy_production

# Upload metadata only
fastlane upload_metadata
```

**See `android/fastlane/README.md` for complete guide.**

---

## Submission Process

### Step-by-Step Submission

#### Phase 1: Preparation (Before Submission)

1. **Complete all checklist items** in `SUBMISSION_CHECKLIST.md`

2. **Create all required assets:**
   - [ ] App icon (512x512)
   - [ ] Feature graphic (1024x500)
   - [ ] Screenshots (8 recommended)
   - [ ] Privacy policy (live URL)
   - [ ] Terms of service (live URL)

3. **Test the release build:**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   - Install on test device
   - Test all features
   - Verify no crashes
   - Check ProGuard didn't break anything

4. **Run pre-launch checks:**
   - [ ] All tests passing
   - [ ] No lint errors
   - [ ] Version numbers updated
   - [ ] Changelog prepared
   - [ ] Backend ready for production

#### Phase 2: Google Play Console Setup

1. **Create app in Play Console:**
   - Login to https://play.google.com/console
   - Create Application
   - App name: "Flamoral: Dating & Relationships"
   - Default language: English (United States)
   - App or game: App
   - Free or paid: Free

2. **Store Presence > Main Store Listing:**
   - [ ] Upload app icon
   - [ ] Upload feature graphic
   - [ ] Upload screenshots
   - [ ] Enter app title
   - [ ] Enter short description
   - [ ] Enter full description
   - [ ] Select category: Social > Dating
   - [ ] Add tags
   - [ ] Enter contact details
   - [ ] Enter privacy policy URL

3. **App Content:**
   - [ ] **Privacy Policy:** https://flamoral.com/privacy
   - [ ] **Ads:** Declare if app contains ads (NO)
   - [ ] **Content Rating:** Complete questionnaire
     - Use `CONTENT_RATING_QUESTIONNAIRE.md` as guide
     - Expected rating: Mature 17+
   - [ ] **Target Audience:** 18+
   - [ ] **News Apps:** Not applicable
   - [ ] **COVID-19 Contact Tracing:** Not applicable
   - [ ] **Data Safety:**
     - Complete data collection questionnaire
     - Declare all data types collected
     - Explain data usage
     - Security measures

4. **Pricing & Distribution:**
   - [ ] Free app
   - [ ] Contains in-app purchases: YES
   - [ ] Select countries for distribution
   - [ ] Content guidelines accepted
   - [ ] US export laws accepted

5. **Store Settings:**
   - [ ] App category
   - [ ] Tags
   - [ ] Contact details
   - [ ] External marketing (optional)

#### Phase 3: Release Setup

1. **Production > Releases > Create Release:**
   - [ ] Upload signed AAB
   - [ ] Enter release name: "1.0.0 - Initial Release"
   - [ ] Add release notes (What's new)
   - [ ] Review and rollout

2. **Release Configuration:**
   - [ ] Release type: Production
   - [ ] Rollout percentage: Start with 10-20%
   - [ ] Release notes in all languages

3. **App Signing:**
   - [ ] Enable Play App Signing (recommended)
   - [ ] Upload upload certificate

#### Phase 4: Submit for Review

1. **Review all sections** - Ensure green checkmarks
2. **Submit for review** - Click "Start rollout to production"
3. **Wait for review** - Typically 1-7 days

---

## Post-Submission

### During Review

- [ ] Monitor email for review status
- [ ] Respond quickly to any questions
- [ ] Prepare for possible rejection (have fixes ready)

### After Approval

#### First 24 Hours
- [ ] Monitor crash reports (target: >99% crash-free)
- [ ] Check user reviews
- [ ] Verify analytics tracking
- [ ] Test in-app purchases on live app
- [ ] Monitor server load
- [ ] Check push notifications working

#### First Week
- [ ] Respond to user reviews (aim for <24h response time)
- [ ] Address critical bugs immediately
- [ ] Monitor key metrics:
  - Install rate
  - Crash rate
  - ANR rate
  - Retention rate
  - Conversion rate
- [ ] Gather user feedback
- [ ] Plan first update

#### Ongoing
- [ ] Weekly review monitoring
- [ ] Monthly performance analysis
- [ ] Regular updates (aim for monthly)
- [ ] ASO optimization
- [ ] User engagement campaigns
- [ ] Feature releases based on feedback

### Metrics to Track

**Technical Health:**
- Crash-free users: >99%
- ANR rate: <1%
- App size
- Load time
- Battery usage

**User Engagement:**
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Retention (D1, D7, D30)
- Session length
- Features usage

**Business Metrics:**
- Install rate
- Conversion rate (free to paid)
- Subscription retention
- Revenue per user
- Lifetime value (LTV)

**Store Performance:**
- Store listing impressions
- Store listing conversion
- Average rating
- Review sentiment
- Keyword rankings

---

## Quick Start Commands

### Build and Test

```bash
# Navigate to Android directory
cd apps/mobile-app/android

# Build debug APK
./gradlew assembleDebug

# Build release AAB
./gradlew bundleRelease

# Install debug build
./gradlew installDebug

# Run tests
./gradlew test

# Run lint checks
./gradlew lint
```

### Using Fastlane

```bash
# Navigate to Android directory
cd apps/mobile-app/android

# Build release bundle
fastlane build_bundle

# Deploy to internal testing
fastlane deploy_internal

# Complete deployment with auto-versioning
fastlane deploy

# Upload metadata updates
fastlane upload_metadata
```

### Version Management

```bash
# Update version in build.gradle
# Edit: android/app/build.gradle
# Change: versionCode and versionName

# Or use fastlane to auto-increment
fastlane increment_version_code
```

---

## Common Issues & Solutions

### Build Issues

**Issue:** ProGuard breaks app functionality
```bash
# Solution: Add specific keep rules to proguard-rules.pro
-keep class your.package.** { *; }
```

**Issue:** Missing signing configuration
```bash
# Solution: Create keystore.properties or set environment variables
# See SIGNING_CONFIGURATION.md
```

**Issue:** Duplicate resources
```bash
# Solution: Add to build.gradle:
android {
    packagingOptions {
        pickFirst 'lib/x86/libc++_shared.so'
    }
}
```

### Upload Issues

**Issue:** Version code already used
```bash
# Solution: Increment versionCode in build.gradle
```

**Issue:** Signature mismatch
```bash
# Solution: Verify using correct keystore
# Check keystore fingerprint matches Play Console
```

**Issue:** Missing required assets
```bash
# Solution: Upload all required screenshots and graphics
# Check SUBMISSION_CHECKLIST.md
```

### Post-Launch Issues

**Issue:** High crash rate
```bash
# Solution:
# 1. Check Firebase Crashlytics
# 2. Identify common crash pattern
# 3. Release hotfix immediately if critical
# 4. Use staged rollout to limit impact
```

**Issue:** Poor ratings
```bash
# Solution:
# 1. Respond to all negative reviews
# 2. Fix reported issues quickly
# 3. Ask happy users to rate (in-app prompt)
# 4. Improve onboarding if confusion is common
```

---

## Resources & Documentation

### Internal Documentation
- [Submission Checklist](SUBMISSION_CHECKLIST.md) - Complete pre-submission checklist
- [Content Rating Guide](CONTENT_RATING_QUESTIONNAIRE.md) - IARC questionnaire answers
- [Signing Configuration](../android/SIGNING_CONFIGURATION.md) - App signing guide
- [Fastlane README](../android/fastlane/README.md) - Automation guide
- [Feature Graphic Requirements](FEATURE_GRAPHIC_REQUIREMENTS.md) - Asset specifications

### External Links
- [Google Play Console](https://play.google.com/console)
- [Developer Policies](https://play.google.com/about/developer-content-policy/)
- [Android Developers](https://developer.android.com/)
- [Fastlane Documentation](https://docs.fastlane.tools/)

### Support Contacts
- **Developer Support:** developer@flamoral.com
- **User Support:** support@flamoral.com
- **Privacy:** privacy@flamoral.com
- **Security:** security@flamoral.com

---

## Final Checklist

Before submitting to Play Store, verify:

- [ ] All files created and configured
- [ ] Keystore generated and backed up securely
- [ ] Release build tested on multiple devices
- [ ] All assets created (icon, graphics, screenshots)
- [ ] Store listing copy finalized
- [ ] Privacy policy and ToS live
- [ ] Backend production-ready
- [ ] Analytics and crash reporting configured
- [ ] Fastlane configured (optional but recommended)
- [ ] Team notified of submission
- [ ] Support channels ready for users
- [ ] Monitoring and alerts configured

---

## Success Criteria

**Pre-Launch:**
- ✅ All checklist items completed
- ✅ Zero critical bugs
- ✅ <100MB app size
- ✅ All assets professional quality

**Launch:**
- ✅ Review approval within 7 days
- ✅ No immediate critical issues
- ✅ Positive initial reviews

**Post-Launch (Week 1):**
- ✅ >99% crash-free rate
- ✅ <1% ANR rate
- ✅ >4.0 average rating
- ✅ >50% D1 retention
- ✅ Positive review sentiment

---

## Next Steps

1. **Create missing assets** (icon, feature graphic, screenshots)
2. **Generate keystore** following SIGNING_CONFIGURATION.md
3. **Build release AAB** and test thoroughly
4. **Create Google Play Developer account** if not done
5. **Set up service account** for Fastlane
6. **Upload to Internal testing** first
7. **Complete testing cycle** (internal → alpha → beta)
8. **Submit to production** with phased rollout

---

**Document Version:** 1.0
**Last Updated:** December 11, 2025
**Author:** Flamoral Development Team
**Next Review:** Before version 2.0 submission

---

**Good luck with your Play Store submission! 🚀**

For questions or issues, contact: developer@flamoral.com
