# Flamoral Mobile App - Deployment Checklist

## Pre-Development Setup

### Environment Setup
- [ ] Node.js 18+ installed
- [ ] Xcode 14+ installed (Mac only)
- [ ] Android Studio installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)
- [ ] React Native CLI installed (`npm install -g react-native-cli`)

### Project Setup
- [ ] Clone repository
- [ ] Run `npm install` in `apps/mobile-app`
- [ ] Copy `.env.example` to `.env`
- [ ] Configure environment variables in `.env`
- [ ] Run `npm run pod-install` for iOS

### Firebase Configuration
- [ ] Create Firebase project
- [ ] Download `google-services.json` (Android)
- [ ] Place in `apps/mobile-app/android/app/`
- [ ] Download `GoogleService-Info.plist` (iOS)
- [ ] Place in `apps/mobile-app/ios/FlavoralApp/`
- [ ] Enable Firebase Cloud Messaging
- [ ] Configure iOS APNs certificates

## Development Phase

### Code Quality
- [ ] All TypeScript errors resolved (`npm run typecheck`)
- [ ] ESLint passing (`npm run lint`)
- [ ] Code formatted (`npm run format`)
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented
- [ ] Loading states implemented
- [ ] Empty states implemented

### Testing
- [ ] Unit tests written and passing (`npm test`)
- [ ] E2E tests implemented
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Tested on physical iOS device
- [ ] Tested on physical Android device
- [ ] Network error handling tested
- [ ] Offline mode tested

### API Integration
- [ ] All API endpoints configured
- [ ] Authentication flow working
- [ ] Token refresh working
- [ ] API error handling implemented
- [ ] Retry logic implemented
- [ ] Request timeouts configured
- [ ] Response interceptors working

### Navigation & Deep Linking
- [ ] Navigation structure complete
- [ ] Deep linking tested (custom scheme)
- [ ] Universal links tested (HTTPS)
- [ ] All deep link routes working
- [ ] Navigation state persistence working
- [ ] Back button behavior correct

### Features
- [ ] User registration working
- [ ] Login/logout working
- [ ] Profile management working
- [ ] Discovery/matching working
- [ ] Messaging working
- [ ] Push notifications working
- [ ] Video calls working (if enabled)
- [ ] Payment flow working (if enabled)
- [ ] All feature flags tested

## Pre-Production Checklist

### Version Management
- [ ] Version number updated in `package.json`
- [ ] Version number updated in `app.json`
- [ ] iOS version updated in Xcode project
- [ ] Android versionCode incremented
- [ ] Android versionName updated
- [ ] CHANGELOG updated

### Environment Configuration
- [ ] Production API endpoints configured
- [ ] Production environment variables set
- [ ] `.env.production` file created and configured
- [ ] No development/staging URLs in production build
- [ ] Debug mode disabled
- [ ] Logging level set to 'error'

### Security
- [ ] SSL certificate pinning configured
- [ ] Production SSL pins generated and added
- [ ] Backup SSL pins configured
- [ ] Root/jailbreak detection enabled
- [ ] Sensitive data encrypted
- [ ] Secure storage used for tokens
- [ ] API keys not hard-coded
- [ ] No secrets in version control
- [ ] ProGuard/R8 enabled for Android
- [ ] Code obfuscation enabled

### iOS Specific
- [ ] Bundle identifier correct (`com.flamoral`)
- [ ] Signing certificate configured
- [ ] Provisioning profile configured
- [ ] Push notification certificate uploaded
- [ ] App Icon added (all sizes)
- [ ] Launch Screen configured
- [ ] All required permissions in Info.plist
- [ ] Associated domains configured
- [ ] Build number incremented
- [ ] Archive created successfully

### Android Specific
- [ ] Package name correct (`com.flamoral`)
- [ ] Keystore generated
- [ ] Signing configuration in `gradle.properties`
- [ ] ProGuard rules configured
- [ ] App Icon added (all densities)
- [ ] Adaptive icon configured
- [ ] All permissions in AndroidManifest.xml
- [ ] Deep link intent filters configured
- [ ] Release APK/AAB builds successfully
- [ ] APK size reasonable (<50MB)

### App Store Preparation

#### iOS App Store
- [ ] App Store Connect account set up
- [ ] App created in App Store Connect
- [ ] Screenshots prepared (all device sizes)
- [ ] App description written
- [ ] Keywords optimized
- [ ] Privacy policy URL configured
- [ ] Terms of service URL configured
- [ ] Support URL configured
- [ ] Age rating configured (17+)
- [ ] App categories selected
- [ ] Pricing set
- [ ] In-app purchases configured (if applicable)

#### Google Play Store
- [ ] Google Play Console account set up
- [ ] App created in Play Console
- [ ] Screenshots prepared (all device types)
- [ ] App description written
- [ ] Short description written
- [ ] Privacy policy URL configured
- [ ] Content rating questionnaire completed
- [ ] App categories selected
- [ ] Pricing set
- [ ] In-app products configured (if applicable)
- [ ] Target countries selected

### Performance
- [ ] App startup time < 3 seconds
- [ ] No memory leaks detected
- [ ] Images optimized
- [ ] Bundle size optimized
- [ ] Hermes engine enabled
- [ ] Code splitting implemented
- [ ] Lazy loading implemented where appropriate
- [ ] Crash rate < 1%

### Monitoring & Analytics
- [ ] Sentry/error tracking configured
- [ ] Analytics events implemented
- [ ] Performance monitoring enabled
- [ ] Crash reporting enabled
- [ ] User feedback mechanism implemented

## Build Process

### iOS Build
- [ ] Clean build performed
- [ ] Archive created in Xcode
- [ ] Archive validated
- [ ] Archive uploaded to App Store Connect
- [ ] TestFlight build available
- [ ] TestFlight testing completed
- [ ] App submitted for review

### Android Build
- [ ] Clean build performed
- [ ] Release APK/AAB generated
- [ ] APK/AAB signed
- [ ] APK/AAB tested on device
- [ ] Internal testing track deployed
- [ ] Internal testing completed
- [ ] Closed alpha/beta testing completed (if applicable)
- [ ] Production release created

## Testing in Production

### Pre-Launch Testing
- [ ] TestFlight testing (iOS)
- [ ] Internal testing (Android)
- [ ] All critical user flows tested
- [ ] Payment processing tested
- [ ] Push notifications tested
- [ ] Deep links tested
- [ ] App updates tested
- [ ] Data migration tested (if applicable)

### Smoke Testing
- [ ] App installs successfully
- [ ] App launches successfully
- [ ] Login works
- [ ] Core features work
- [ ] Push notifications arrive
- [ ] Deep links work
- [ ] No crashes in main flows

## Post-Launch

### Monitoring
- [ ] Monitor crash reports
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Monitor user reviews
- [ ] Monitor analytics
- [ ] Monitor API usage

### Support
- [ ] Support email monitored
- [ ] User feedback reviewed
- [ ] Common issues documented
- [ ] FAQ updated
- [ ] Known issues tracked

### Updates
- [ ] Hotfix process defined
- [ ] Update schedule planned
- [ ] Feature flag strategy defined
- [ ] A/B testing plan defined
- [ ] Rollback plan documented

## Compliance

### Legal
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie policy published (if applicable)
- [ ] GDPR compliance (EU users)
- [ ] CCPA compliance (CA users)
- [ ] Age verification implemented
- [ ] Content moderation in place

### App Store Compliance
- [ ] Apple App Store guidelines reviewed
- [ ] Google Play Store policies reviewed
- [ ] No prohibited content
- [ ] Age-appropriate content
- [ ] Proper content ratings
- [ ] Data collection disclosed

## Rollback Plan

### If Issues Found
- [ ] Rollback procedure documented
- [ ] Previous version available
- [ ] Database migration rollback tested
- [ ] Communication plan for users
- [ ] Incident response plan ready

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] Testing completed and signed off
- [ ] Documentation updated

### Product Team
- [ ] Features verified
- [ ] User experience approved
- [ ] Business requirements met

### Security Team
- [ ] Security review completed
- [ ] Penetration testing done
- [ ] Security issues resolved

### Management
- [ ] Release approved
- [ ] Budget approved
- [ ] Timeline approved

---

## Quick Commands Reference

### Development
```bash
npm run ios              # Run iOS dev build
npm run android          # Run Android dev build
npm test                 # Run tests
npm run typecheck        # Type check
npm run lint             # Lint code
```

### Building
```bash
npm run ios:build        # Build iOS
npm run android:build    # Build Android APK
npm run android:bundle   # Build Android App Bundle
```

### Cleaning
```bash
npm run clean            # Clean builds
npm run clean:deep       # Deep clean
npm run clean:all        # Nuclear clean
```

---

## Notes

- This checklist should be completed for every production release
- Keep this document updated as the project evolves
- Use issue tracking to monitor checklist completion
- Archive completed checklists for audit purposes

## Resources

- [Mobile App Config Guide](./apps/mobile-app/MOBILE_APP_CONFIG_GUIDE.md)
- [Quick Start Guide](./apps/mobile-app/QUICK_START.md)
- [Fixes Summary](./apps/mobile-app/MOBILE_APP_FIXES_SUMMARY.md)
