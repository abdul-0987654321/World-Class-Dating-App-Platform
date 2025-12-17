# Google Play Store Submission Checklist

## Pre-Submission Requirements

This comprehensive checklist ensures all requirements are met before submitting Flamoral to the Google Play Store.

---

## 1. Developer Account Setup

### Google Play Console Account
- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Complete developer profile
- [ ] Verify email address
- [ ] Accept Google Play Developer Distribution Agreement
- [ ] Set up payment profile for app sales/subscriptions
- [ ] Enable two-factor authentication

### Developer Information
- [ ] Developer name: Flamoral Inc.
- [ ] Developer email: developer@flamoral.com
- [ ] Support email: support@flamoral.com
- [ ] Website: https://flamoral.com
- [ ] Physical address (required)
- [ ] Phone number

---

## 2. App Configuration

### Basic Information
- [ ] App name: "Flamoral: Dating & Relationships"
- [ ] Package name: com.flamoral.app (cannot be changed later)
- [ ] Default language: English (United States)
- [ ] App category: Social > Dating
- [ ] Tags: dating, relationships, video profiles, AI matching

### Version Information
- [ ] Version name: 1.0.0
- [ ] Version code: 1
- [ ] Minimum SDK: API 23 (Android 6.0)
- [ ] Target SDK: API 34 (Android 14)

---

## 3. Build Configuration

### App Bundle (AAB)
- [ ] Generate signed Android App Bundle (.aab)
- [ ] Enable code obfuscation (ProGuard/R8)
- [ ] Remove debug code and logging
- [ ] Optimize images and assets
- [ ] Test bundle on multiple devices
- [ ] Verify bundle size (<150MB recommended)
- [ ] Enable App Bundle Explorer in Play Console

### Signing Configuration
- [ ] Generate release keystore
- [ ] Store keystore securely (CRITICAL - cannot be recovered if lost)
- [ ] Document keystore credentials in secure location
- [ ] Set up Play App Signing (recommended)
- [ ] Upload signing key to Play Console
- [ ] Verify signing configuration

**Keystore Details to Store Securely:**
```
Keystore file: release.keystore
Keystore password: [SECURE]
Key alias: flamoral-release
Key password: [SECURE]
Validity: 25+ years
```

### Build Variants
- [ ] Test debug build
- [ ] Test release build
- [ ] Verify ProGuard rules don't break functionality
- [ ] Test on Android 6.0+ devices
- [ ] Verify all permissions work correctly
- [ ] Test on different screen sizes

---

## 4. Store Listing Assets

### App Icon
- [ ] 512x512 px PNG (32-bit)
- [ ] High-resolution app icon
- [ ] No transparency in background
- [ ] Matches brand identity
- [ ] Location: `play-store/assets/icon-512.png`

### Feature Graphic
- [ ] 1024x500 px PNG or JPEG
- [ ] No transparency
- [ ] Professional quality
- [ ] Brand colors and logo
- [ ] Location: `play-store/assets/feature-graphic.png`

### Screenshots (Phone)
- [ ] Minimum 2, maximum 8 screenshots
- [ ] Resolution: 1080x1920 px (recommended)
- [ ] 16:9 or 9:16 aspect ratio
- [ ] Show key features:
  - [ ] Discovery/swiping interface
  - [ ] Profile with video
  - [ ] Messaging interface
  - [ ] Matches screen
  - [ ] Video call interface
  - [ ] Safety features
  - [ ] Gamification elements
  - [ ] AI features showcase
- [ ] Location: `play-store/screenshots/phone/`

### Screenshots (Tablet) - Optional
- [ ] Up to 8 screenshots
- [ ] Resolution: 2048x2732 px (recommended)
- [ ] Showcase tablet-optimized UI
- [ ] Location: `play-store/screenshots/tablet/`

### Promotional Graphics - Optional
- [ ] Promo graphic: 180x120 px
- [ ] TV banner: 1280x720 px (if supporting Android TV)

### Promotional Video - Optional
- [ ] 30 seconds to 2 minutes
- [ ] YouTube URL
- [ ] Showcase app features
- [ ] Professional quality

---

## 5. Store Listing Copy

### Title
- [ ] App title (max 50 characters): "Flamoral: Dating & Relationships"
- [ ] Contains relevant keywords
- [ ] Clear and descriptive

### Short Description
- [ ] Max 80 characters
- [ ] Compelling value proposition
- [ ] Include keywords: dating, AI, video, authentic
- [ ] File: `play-store/SHORT_DESCRIPTION.txt`

### Full Description
- [ ] Max 4000 characters
- [ ] Detailed feature list
- [ ] Benefits and value proposition
- [ ] SEO optimized with keywords
- [ ] Clear formatting with bullet points
- [ ] Include:
  - [ ] Key features
  - [ ] Safety features
  - [ ] Privacy information
  - [ ] Subscription details
  - [ ] Age requirement (18+)
  - [ ] Support contact
- [ ] File: `play-store/FULL_DESCRIPTION.txt`

### What's New
- [ ] Release notes for version 1.0.0
- [ ] Max 500 characters
- [ ] Highlight new features
- [ ] File: `play-store/WHATS_NEW.txt`

---

## 6. Categorization & Tags

### Category
- [ ] Primary category: Social > Dating
- [ ] Secondary category: Lifestyle (optional)

### Tags
- [ ] dating
- [ ] relationships
- [ ] video profiles
- [ ] AI matching
- [ ] secure messaging
- [ ] video calling

### Target Audience
- [ ] Target age: 18+
- [ ] Gender: All
- [ ] Geography: Worldwide (or specific countries)

---

## 7. Content Rating

### IARC Questionnaire
- [ ] Complete content rating questionnaire
- [ ] Select "Dating & Social Networking" category
- [ ] Answer questions honestly:
  - [ ] User interaction: YES
  - [ ] User-generated content: YES
  - [ ] Dating content: YES
  - [ ] Location sharing: YES (approximate)
  - [ ] Personal information: YES
  - [ ] In-app purchases: YES
- [ ] Expected rating: Mature 17+ / PEGI 18
- [ ] File: `play-store/CONTENT_RATING_QUESTIONNAIRE.md`

### Age Verification
- [ ] Implement age gate (18+)
- [ ] Date of birth verification
- [ ] Document age verification process

---

## 8. Privacy & Legal

### Privacy Policy
- [ ] Create comprehensive privacy policy
- [ ] Upload to https://flamoral.com/privacy
- [ ] Add URL to Play Console
- [ ] Include:
  - [ ] Data collection practices
  - [ ] Data usage
  - [ ] Third-party sharing
  - [ ] User rights
  - [ ] Data deletion process
  - [ ] Contact information
- [ ] File: `apps/mobile-app/PRIVACY_POLICY.md`

### Terms of Service
- [ ] Create terms of service
- [ ] Upload to https://flamoral.com/terms
- [ ] Add URL to Play Console
- [ ] Include age restriction (18+)

### Data Safety Section
- [ ] Complete Data Safety form in Play Console
- [ ] Specify data collected:
  - [ ] Personal info (name, email, phone, photos)
  - [ ] Location (approximate)
  - [ ] Messages
  - [ ] User activity
- [ ] Specify data usage:
  - [ ] App functionality
  - [ ] Analytics
  - [ ] Personalization
  - [ ] Account management
- [ ] Specify security practices:
  - [ ] Data encrypted in transit (HTTPS)
  - [ ] Data encrypted at rest
  - [ ] Users can request data deletion
  - [ ] Data handling complies with Play Families Policy
- [ ] Declare third-party data sharing

### Permissions Declaration
- [ ] Review all permissions in AndroidManifest.xml
- [ ] Remove unnecessary permissions
- [ ] Declare permission usage in Play Console:
  - [ ] INTERNET - Core functionality
  - [ ] CAMERA - Profile photos and verification
  - [ ] RECORD_AUDIO - Voice messages and video calls
  - [ ] ACCESS_FINE_LOCATION - Matching nearby users
  - [ ] READ_EXTERNAL_STORAGE - Upload photos
  - [ ] WRITE_EXTERNAL_STORAGE - Save photos
  - [ ] POST_NOTIFICATIONS - Match and message notifications
- [ ] Provide permission justification for each

---

## 9. App Content Declaration

### Ads
- [ ] Declare if app contains ads: NO (subscription model)
- [ ] If yes, provide ad network details

### Target Audience
- [ ] Age group: 18+
- [ ] Not designed for children
- [ ] Not eligible for Family program

### COVID-19 Contact Tracing
- [ ] Does not contain contact tracing: NO

### Health Data
- [ ] Does not collect health data: NO

### Sensitive Permissions
- [ ] Review all sensitive permissions
- [ ] Provide usage justification

---

## 10. App Pricing & Distribution

### Pricing
- [ ] Free to download
- [ ] Contains in-app purchases: YES
- [ ] Set up subscription products in Play Console:
  - [ ] Flamoral Plus: $9.99/month
  - [ ] Flamoral Premium: $19.99/month
  - [ ] Flamoral Elite: $29.99/month
- [ ] Configure subscription benefits
- [ ] Set up free trial (optional)

### Distribution
- [ ] Select countries for distribution
- [ ] Verify app complies with local laws
- [ ] Consider phased rollout strategy
- [ ] Set up beta testing track

### Device Categories
- [ ] Phone: YES
- [ ] Tablet: YES
- [ ] Wear OS: NO
- [ ] Android TV: NO
- [ ] Android Auto: NO

---

## 11. Testing & Quality Assurance

### Pre-Launch Testing
- [ ] Run pre-launch report in Play Console
- [ ] Test on various devices (Firebase Test Lab)
- [ ] Fix all crash reports
- [ ] Verify no memory leaks
- [ ] Test on slow network conditions
- [ ] Test offline functionality

### Manual Testing
- [ ] Test complete user flow:
  - [ ] Registration and onboarding
  - [ ] Profile creation
  - [ ] Photo/video upload
  - [ ] Discovery and swiping
  - [ ] Matching
  - [ ] Messaging
  - [ ] Video calling
  - [ ] Safety features
  - [ ] Settings and preferences
  - [ ] Subscription purchase
  - [ ] Account deletion
- [ ] Test on multiple Android versions (6.0+)
- [ ] Test on multiple screen sizes
- [ ] Test accessibility features
- [ ] Test with different languages

### Performance
- [ ] App size optimized (<100MB ideal)
- [ ] Fast app startup time (<2 seconds)
- [ ] Smooth animations (60 fps)
- [ ] Efficient battery usage
- [ ] Minimal data usage
- [ ] No ANR (Application Not Responding) errors
- [ ] Memory usage optimized

### Security
- [ ] No hardcoded API keys or secrets
- [ ] Secure network communication (HTTPS only)
- [ ] Proper certificate pinning
- [ ] Input validation and sanitization
- [ ] Secure local storage
- [ ] ProGuard/R8 enabled for release

---

## 12. Backend & Infrastructure

### API Endpoints
- [ ] Production API deployed and stable
- [ ] API rate limiting configured
- [ ] API monitoring and logging
- [ ] Error handling and recovery
- [ ] Load testing completed

### Services
- [ ] Firebase Cloud Messaging configured
- [ ] Push notification service active
- [ ] Analytics configured (Firebase/Mixpanel)
- [ ] Crash reporting (Firebase Crashlytics)
- [ ] Backend services scalable

### Database
- [ ] Production database configured
- [ ] Backup and recovery plan
- [ ] Database migrations tested
- [ ] Performance optimization

---

## 13. Compliance & Policies

### Google Play Policies
- [ ] Review Google Play Developer Program Policies
- [ ] Ensure compliance with:
  - [ ] User data privacy
  - [ ] Child safety (not applicable - 18+ only)
  - [ ] Intellectual property
  - [ ] Monetization and ads
  - [ ] Device and network abuse
  - [ ] Deceptive behavior
  - [ ] Malware
  - [ ] Mobile unwanted software

### Legal Compliance
- [ ] GDPR compliance (EU)
- [ ] CCPA compliance (California)
- [ ] COPPA compliance (age restriction)
- [ ] Data localization requirements
- [ ] Age verification requirements
- [ ] Dating service regulations

### Third-Party Services
- [ ] Review all third-party SDK compliance
- [ ] Firebase
- [ ] Payment processor (Google Play Billing)
- [ ] Analytics services
- [ ] Cloud storage
- [ ] Video/audio services

---

## 14. Release Management

### Release Tracks
- [ ] Set up Internal testing track
- [ ] Set up Closed testing track (alpha/beta)
- [ ] Configure Open testing track (optional)
- [ ] Plan production rollout

### Phased Rollout Strategy
- [ ] Internal testing: 1-2 weeks (internal team)
- [ ] Closed alpha: 1-2 weeks (50-100 users)
- [ ] Closed beta: 2-4 weeks (500-1000 users)
- [ ] Open beta: 2-4 weeks (optional)
- [ ] Production: Phased rollout (10% → 50% → 100%)

### Rollback Plan
- [ ] Prepare rollback procedure
- [ ] Monitor crash rates and reviews
- [ ] Set up automated alerts
- [ ] Define rollback criteria

---

## 15. Marketing & Launch

### Pre-Launch Marketing
- [ ] Create landing page (https://flamoral.com)
- [ ] Set up social media accounts
- [ ] Prepare press kit
- [ ] Create launch announcement
- [ ] Build email list
- [ ] Set up analytics tracking

### App Store Optimization (ASO)
- [ ] Keyword research completed
- [ ] Title optimized for SEO
- [ ] Description optimized
- [ ] Screenshots optimized
- [ ] Monitor competitor apps
- [ ] Plan for ongoing ASO optimization

### Launch Support
- [ ] Customer support team ready
- [ ] FAQ documentation prepared
- [ ] Support email configured
- [ ] Social media monitoring
- [ ] Community management plan

---

## 16. Post-Launch Monitoring

### Metrics to Track
- [ ] Install rate
- [ ] Crash-free users percentage (>99%)
- [ ] ANR rate (<1%)
- [ ] User ratings and reviews
- [ ] Conversion rate (free to paid)
- [ ] User retention
- [ ] Daily active users (DAU)
- [ ] Monthly active users (MAU)

### Monitoring Tools
- [ ] Google Play Console analytics
- [ ] Firebase Analytics
- [ ] Firebase Crashlytics
- [ ] Custom analytics dashboard
- [ ] User feedback monitoring
- [ ] Review monitoring and responses

---

## 17. Fastlane Automation

### Fastlane Setup
- [ ] Install Fastlane
- [ ] Configure Fastfile
- [ ] Set up Google Play service account
- [ ] Download JSON key file
- [ ] Configure environment variables
- [ ] Test automated builds
- [ ] Files: `android/fastlane/Fastfile`, `android/fastlane/Appfile`

### Automated Tasks
- [ ] Build release AAB
- [ ] Upload to Play Store
- [ ] Deploy to internal track
- [ ] Promote between tracks
- [ ] Update metadata
- [ ] Generate screenshots

### CI/CD Integration
- [ ] Set up GitHub Actions / GitLab CI
- [ ] Configure automated builds
- [ ] Set up automated testing
- [ ] Configure release automation

---

## 18. Final Checks Before Submission

### Code Quality
- [ ] No hardcoded credentials
- [ ] No TODO or FIXME in production code
- [ ] Code review completed
- [ ] All tests passing
- [ ] No lint errors
- [ ] Version numbers updated

### Documentation
- [ ] README updated
- [ ] API documentation current
- [ ] User guide prepared
- [ ] Developer documentation
- [ ] Release notes completed

### Assets
- [ ] All graphics uploaded
- [ ] Screenshots current and accurate
- [ ] Videos uploaded (if applicable)
- [ ] Metadata finalized

### Legal
- [ ] Privacy policy live and linked
- [ ] Terms of service live and linked
- [ ] Age restriction enforced
- [ ] All compliance requirements met

---

## 19. Submission Process

### Upload Build
1. [ ] Generate signed AAB
2. [ ] Upload to Play Console
3. [ ] Select release track (internal/alpha/beta/production)
4. [ ] Add release notes
5. [ ] Review and confirm

### Review Process
- [ ] Wait for Google review (typically 1-7 days)
- [ ] Monitor email for review status
- [ ] Respond to any review requests promptly
- [ ] Fix any issues if rejected

### Publication
- [ ] Receive approval notification
- [ ] Confirm publication
- [ ] Monitor initial downloads
- [ ] Respond to user reviews
- [ ] Monitor crash reports

---

## 20. Post-Launch Checklist

### First 24 Hours
- [ ] Monitor crash reports
- [ ] Check user reviews
- [ ] Verify analytics tracking
- [ ] Test in-app purchases
- [ ] Monitor server load
- [ ] Check push notifications

### First Week
- [ ] Respond to user reviews
- [ ] Address critical bugs
- [ ] Monitor key metrics
- [ ] Gather user feedback
- [ ] Plan first update

### Ongoing
- [ ] Weekly review monitoring
- [ ] Monthly performance analysis
- [ ] Regular updates (bug fixes and features)
- [ ] ASO optimization
- [ ] User engagement campaigns
- [ ] Marketing initiatives

---

## 21. Emergency Contacts

### Support
- **Email:** support@flamoral.com
- **Developer:** developer@flamoral.com
- **Privacy:** privacy@flamoral.com
- **Security:** security@flamoral.com

### Critical Issues
- Server downtime
- Payment processing issues
- Security vulnerabilities
- Data breaches
- App crashes affecting >5% users

---

## 22. Resources & Links

### Documentation
- Google Play Console: https://play.google.com/console
- Developer Policies: https://play.google.com/about/developer-content-policy/
- Launch Checklist: https://developer.android.com/distribute/best-practices/launch/launch-checklist
- App Bundle: https://developer.android.com/guide/app-bundle

### Internal Documentation
- Privacy Policy: `/apps/mobile-app/PRIVACY_POLICY.md`
- Build Configuration: `/apps/mobile-app/android/app/build.gradle`
- ProGuard Rules: `/apps/mobile-app/android/app/proguard-rules.pro`
- Fastlane Config: `/apps/mobile-app/android/fastlane/`
- Store Assets: `/apps/mobile-app/play-store/`

---

## Signing Off

### Development Team Sign-Off
- [ ] Lead Developer: _______________
- [ ] QA Lead: _______________
- [ ] Product Manager: _______________
- [ ] Legal Counsel: _______________

### Submission Date
**Planned:** _______________
**Actual:** _______________

### First Review
**Submitted:** _______________
**Approved:** _______________
**Published:** _______________

---

**Version:** 1.0
**Last Updated:** December 11, 2025
**Next Review:** Before version 2.0 submission

---

## Notes

Use this checklist for every major release. Minor updates may not require all items, but all should be reviewed for relevance.

**Remember:** Once published, maintain regular updates, respond to user feedback, and continuously improve the app experience!
