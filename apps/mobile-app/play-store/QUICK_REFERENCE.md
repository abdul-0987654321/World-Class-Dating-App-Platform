# Google Play Store Submission - Quick Reference Card

**Flamoral Android App**

---

## 🚀 Quick Commands

### Build Commands
```bash
# Debug build
cd android && ./gradlew assembleDebug

# Release APK
cd android && ./gradlew assembleRelease

# Release AAB (for Play Store)
cd android && ./gradlew bundleRelease
```

### Fastlane Commands
```bash
cd android

# Build & deploy to internal testing
fastlane deploy_internal

# Promote internal → alpha → beta → production
fastlane promote_internal_to_alpha
fastlane promote_alpha_to_beta
fastlane promote_beta_to_production
```

---

## 📋 Essential Checklist

### Before First Build
- [ ] Generate release keystore
- [ ] Create keystore.properties
- [ ] Add keystore to .gitignore
- [ ] Test release build

### Before Submission
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] 2-8 screenshots (1080x1920)
- [ ] Privacy policy live
- [ ] Content rating completed
- [ ] All tests passing

### Post-Submission
- [ ] Monitor crash reports
- [ ] Respond to reviews
- [ ] Track key metrics
- [ ] Plan first update

---

## 🔑 Critical Files

**DO NOT COMMIT:**
- `release.keystore`
- `keystore.properties`
- `service-account.json`

**MUST BACKUP:**
- Release keystore (you can't update app without it!)

---

## 📊 Key Metrics

**Technical:**
- Crash-free rate: >99%
- ANR rate: <1%
- App size: <100MB

**Business:**
- Rating: >4.0
- D1 retention: >50%
- Response time: <24h

---

## 🔗 Quick Links

**Documentation:**
- [Full Preparation Guide](PLAY_STORE_PREPARATION.md)
- [Submission Checklist](SUBMISSION_CHECKLIST.md)
- [Signing Guide](../android/SIGNING_CONFIGURATION.md)

**Consoles:**
- [Play Console](https://play.google.com/console)
- [Firebase Console](https://console.firebase.google.com)
- [Cloud Console](https://console.cloud.google.com)

---

## ⚙️ App Configuration

```
Package: com.flamoral.app
Version: 1.0.0 (code: 1)
Min SDK: 23 (Android 6.0)
Target SDK: 34 (Android 14)
Category: Social > Dating
Rating: Mature 17+ (18+ in app)
```

---

## 🆘 Emergency Contacts

- **Support:** support@flamoral.com
- **Developer:** developer@flamoral.com
- **Privacy:** privacy@flamoral.com
- **Security:** security@flamoral.com

---

## 🎯 Release Tracks

1. **Internal** - Team testing (10-100 users)
2. **Alpha** - Closed testing (100-1000 users)
3. **Beta** - Open testing (1000+ users)
4. **Production** - Public release

**Recommended Path:** Internal (1 week) → Alpha (1 week) → Beta (2 weeks) → Production (phased rollout)

---

## 💡 Pro Tips

1. **Always use Fastlane** - Automates 90% of the work
2. **Phased rollout** - Start with 10% in production
3. **Enable Play App Signing** - Protects your signing key
4. **Respond to reviews** - Shows users you care
5. **Monitor daily** - Catch issues early

---

## 🛠️ Troubleshooting

**Build fails:**
```bash
./gradlew clean
./gradlew --stop
```

**Signing errors:**
```bash
keytool -list -v -keystore release.keystore
```

**Metro cache:**
```bash
npx react-native start --reset-cache
```

---

**Version:** 1.0 | **Updated:** Dec 11, 2025
