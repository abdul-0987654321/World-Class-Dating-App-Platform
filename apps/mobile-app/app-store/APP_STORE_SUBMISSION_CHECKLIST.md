# App Store Submission Checklist - Flamoral iOS

## Overview
This comprehensive checklist ensures that the Flamoral iOS app is fully prepared for App Store submission and review. Follow each section carefully before submitting.

**App Information:**
- **App Name:** Flamoral - Dating & Relationships
- **Bundle ID:** com.flamoral
- **Version:** 1.0.0
- **Build:** 1
- **Category:** Lifestyle / Social Networking
- **Age Rating:** 17+

---

## Pre-Development Checklist

### Apple Developer Account Setup
- [ ] Apple Developer Program membership active ($99/year)
- [ ] Team ID configured
- [ ] Developer account verified
- [ ] Payment information up to date
- [ ] Tax forms completed
- [ ] Banking information configured for App Store payments

### App Store Connect Setup
- [ ] App Store Connect account created
- [ ] App record created for Flamoral
- [ ] Bundle ID registered (com.flamoral)
- [ ] App icon uploaded (1024x1024px)
- [ ] App name reserved
- [ ] Primary language set (English - US)

---

## Development & Build Checklist

### Xcode Configuration
- [ ] Xcode version is latest stable release
- [ ] Project uses latest iOS SDK
- [ ] Deployment target set (iOS 13.0+)
- [ ] Bundle Identifier: com.flamoral
- [ ] Version number: 1.0.0
- [ ] Build number: 1 (increment for each submission)
- [ ] Display name: Flamoral
- [ ] All schemes configured correctly

### Code Signing
- [ ] Distribution certificate created
- [ ] App Store provisioning profile created
- [ ] Automatic signing disabled for release
- [ ] Correct team selected
- [ ] Provisioning profiles synced (use Fastlane Match)
- [ ] No expired certificates
- [ ] No expired provisioning profiles

### App Capabilities
- [ ] Push Notifications enabled
- [ ] Sign In with Apple enabled (if using social login)
- [ ] In-App Purchase capability added
- [ ] Background Modes configured (remote-notification, voip)
- [ ] Associated Domains configured (universal links)
- [ ] All required entitlements added
- [ ] Capabilities tested on device

### Info.plist Configuration
- [ ] All permission descriptions added
- [ ] NSCameraUsageDescription complete
- [ ] NSPhotoLibraryUsageDescription complete
- [ ] NSLocationWhenInUseUsageDescription complete
- [ ] NSMicrophoneUsageDescription complete
- [ ] NSFaceIDUsageDescription added
- [ ] NSUserTrackingUsageDescription added (iOS 14.5+)
- [ ] Background modes configured
- [ ] URL schemes configured
- [ ] Associated domains configured
- [ ] App Transport Security configured
- [ ] Supported orientations set (Portrait only)

### Privacy & Data Collection
- [ ] Privacy Policy URL active (https://flamoral.com/privacy)
- [ ] Terms of Service URL active (https://flamoral.com/terms)
- [ ] Support URL active (https://flamoral.com/support)
- [ ] Privacy manifest file created (if required)
- [ ] Data collection disclosed in App Store Connect
- [ ] GDPR compliance verified
- [ ] CCPA compliance verified
- [ ] Age gate implemented (18+ requirement)

---

## App Content & Quality Checklist

### UI/UX Quality
- [ ] All screens tested and working
- [ ] No broken layouts on different screen sizes
- [ ] iPhone 15 Pro Max tested (6.7")
- [ ] iPhone 15 tested (6.1")
- [ ] iPhone SE tested (4.7")
- [ ] Dark mode supported (if applicable)
- [ ] Accessibility features tested
- [ ] VoiceOver tested
- [ ] Dynamic type tested
- [ ] All fonts are readable
- [ ] All images are high resolution
- [ ] No placeholder text or images
- [ ] Launch screen configured
- [ ] App icon meets guidelines (no transparency, correct size)

### Functionality Testing
- [ ] Sign up flow works perfectly
- [ ] Login flow works perfectly
- [ ] Sign In with Apple works (if implemented)
- [ ] Password reset works
- [ ] Profile creation works
- [ ] Photo upload works
- [ ] Photo verification tested
- [ ] Swipe/discovery works smoothly
- [ ] Matching algorithm works
- [ ] Messaging works in real-time
- [ ] Push notifications work
- [ ] Video calling works
- [ ] In-App purchases work
- [ ] Subscription management works
- [ ] Restore purchases works
- [ ] Account deletion works
- [ ] Report/block features work
- [ ] Settings screen functional
- [ ] Privacy controls work
- [ ] Location services work
- [ ] Offline mode handles gracefully
- [ ] Error messages are user-friendly

### Performance
- [ ] App launches in under 3 seconds
- [ ] No crashes during testing
- [ ] No memory leaks
- [ ] Smooth scrolling and animations
- [ ] Images load efficiently
- [ ] Video calls have good quality
- [ ] Battery usage is reasonable
- [ ] Network requests are optimized
- [ ] App size under 200 MB (if possible)
- [ ] No excessive memory usage

### Content Moderation
- [ ] Photo moderation AI active
- [ ] Text moderation for messages
- [ ] Report system functional
- [ ] Block system functional
- [ ] Automated content filtering
- [ ] Manual review process documented
- [ ] Age verification implemented
- [ ] No adult/inappropriate content visible

---

## In-App Purchases Configuration

### App Store Connect IAP Setup
- [ ] Subscription group created
- [ ] Premium Monthly subscription created
- [ ] Premium Yearly subscription created
- [ ] Premium+ Monthly subscription created
- [ ] Premium+ Yearly subscription created
- [ ] Coin packs created (Small, Medium, Large)
- [ ] All products in "Ready to Submit" status
- [ ] Pricing set for all territories
- [ ] Subscription benefits clearly described
- [ ] Free trial configured (if applicable)
- [ ] Introductory pricing set (if applicable)
- [ ] Promotional offers configured (if applicable)

### IAP Testing
- [ ] Sandbox accounts created
- [ ] Purchase flow tested with sandbox account
- [ ] All subscription tiers tested
- [ ] Coin purchases tested
- [ ] Receipt validation works
- [ ] Restore purchases works
- [ ] Subscription renewal tested
- [ ] Subscription cancellation tested
- [ ] Upgrade/downgrade tested
- [ ] Family sharing disabled (dating app)
- [ ] Price localization verified

---

## Assets & Metadata Checklist

### App Icon
- [ ] 1024x1024px PNG (no transparency)
- [ ] No alpha channel
- [ ] Meets design guidelines
- [ ] Recognizable at small sizes
- [ ] No text that requires localization
- [ ] Uploaded to App Store Connect

### Screenshots
- [ ] iPhone 6.7" screenshots (required) - 1290x2796px
- [ ] iPhone 6.5" screenshots (required) - 1242x2688px
- [ ] iPhone 5.5" screenshots (optional) - 1242x2208px
- [ ] Minimum 3 screenshots per size
- [ ] Maximum 10 screenshots per size
- [ ] Screenshots show actual app content
- [ ] No personal/real user data in screenshots
- [ ] Screenshots are compelling and clear
- [ ] Captions added (if applicable)
- [ ] Screenshots uploaded to App Store Connect

### App Preview Video (Optional)
- [ ] 15-30 seconds in length
- [ ] Shows actual app functionality
- [ ] Same sizes as screenshots
- [ ] No personal user data
- [ ] Uploaded to App Store Connect

### Marketing Copy
- [ ] App name: "Flamoral - Dating & Relationships"
- [ ] Subtitle: "Where Passion Meets Connection" (30 char)
- [ ] Promotional text written (170 char)
- [ ] Description written (4000 char max)
- [ ] Keywords selected (100 char max)
- [ ] What's New text written (4000 char max)
- [ ] All text is clear, accurate, and compelling
- [ ] No spelling or grammar errors
- [ ] No misleading claims
- [ ] No competitor mentions

---

## App Store Connect Configuration

### App Information
- [ ] Primary category: Lifestyle
- [ ] Secondary category: Social Networking
- [ ] Content rights verified
- [ ] Age rating completed (17+)
- [ ] Age rating accurate for content
- [ ] Privacy Policy URL added
- [ ] Support URL added
- [ ] Marketing URL added
- [ ] Copyright information added

### Pricing & Availability
- [ ] Price tier selected (Free)
- [ ] Countries/regions selected
- [ ] Release date configured
- [ ] Pre-order enabled (if desired)
- [ ] Educational discount (N/A for dating app)

### App Privacy
- [ ] Privacy policy URL verified
- [ ] Data types collected disclosed
- [ ] Data usage purposes disclosed
- [ ] Data linked to user identified
- [ ] Tracking disclosed accurately
- [ ] Privacy nutrition label complete

**Data Collection Disclosure:**
- [ ] Contact Info (email, phone)
- [ ] Location (approximate)
- [ ] Photos/Videos
- [ ] User Content (messages, profile)
- [ ] Identifiers (user ID, device ID)
- [ ] Usage Data
- [ ] Diagnostics

### App Review Information
- [ ] Contact first name: Flamoral
- [ ] Contact last name: Support
- [ ] Contact phone: +1-555-0100
- [ ] Contact email: support@flamoral.com
- [ ] Demo account email: reviewer@flamoral.com
- [ ] Demo account password: [Secure password]
- [ ] Review notes provided
- [ ] Notes explain dating app features
- [ ] Notes explain video calling
- [ ] Notes explain In-App purchases
- [ ] Notes clarify permissions

### Export Compliance
- [ ] App uses encryption: Yes
- [ ] Exempt from export compliance: Yes
- [ ] Reason documented (standard encryption)
- [ ] No custom cryptography used
- [ ] HTTPS/TLS only
- [ ] Self-classification exemption applies

---

## Build & Upload Checklist

### Archive Creation
- [ ] Clean build folder (Product > Clean Build Folder)
- [ ] Select "Generic iOS Device" as target
- [ ] Archive created (Product > Archive)
- [ ] Archive appears in Organizer
- [ ] Archive validated successfully
- [ ] No warnings during validation
- [ ] Build size reasonable (under 200MB if possible)

### App Validation
- [ ] Validate App in Xcode Organizer
- [ ] No errors during validation
- [ ] No critical warnings
- [ ] Code signing valid
- [ ] Provisioning profiles valid
- [ ] Entitlements correct
- [ ] Info.plist correct
- [ ] Icons included
- [ ] Launch screen included

### Upload to App Store Connect
- [ ] Upload via Xcode Organizer
- [ ] Upload via Fastlane (alternative)
- [ ] Upload successful
- [ ] Build appears in App Store Connect
- [ ] Build processing complete
- [ ] No errors in processing
- [ ] Build status: "Ready to Submit"
- [ ] TestFlight tested (optional but recommended)

---

## Pre-Submission Testing

### Device Testing
- [ ] Tested on iPhone 15 Pro Max
- [ ] Tested on iPhone 15
- [ ] Tested on iPhone SE (older device)
- [ ] Tested on iOS 17.0 (minimum version)
- [ ] Tested on latest iOS version
- [ ] No crashes on any device
- [ ] Performance acceptable on all devices

### Functionality Testing
- [ ] Fresh install tested
- [ ] Onboarding flow complete
- [ ] Sign up works perfectly
- [ ] Login works perfectly
- [ ] Profile creation works
- [ ] Photo upload works
- [ ] Discovery/swiping works
- [ ] Matching works
- [ ] Messaging works
- [ ] Push notifications work
- [ ] Video calls work
- [ ] In-App purchases work
- [ ] All features tested on real device

### Permission Handling
- [ ] Camera permission prompt works
- [ ] Photo library permission prompt works
- [ ] Location permission prompt works
- [ ] Microphone permission prompt works
- [ ] Notification permission prompt works
- [ ] App works when permissions denied
- [ ] Settings link works for denied permissions
- [ ] Permission explanations are clear

### Edge Cases
- [ ] Airplane mode handled gracefully
- [ ] Poor network handled gracefully
- [ ] Background/foreground transitions work
- [ ] Push notification while in app
- [ ] Multiple rapid actions don't crash
- [ ] Large amounts of data handled
- [ ] Account deletion works completely
- [ ] Logout works properly

---

## Compliance & Legal Checklist

### App Store Guidelines Compliance
- [ ] No private API usage
- [ ] No undocumented features
- [ ] Follows Human Interface Guidelines
- [ ] No misleading functionality
- [ ] No duplicate apps
- [ ] No spam content
- [ ] No manipulative techniques
- [ ] Complies with age rating
- [ ] Appropriate content for 17+

### Dating App Specific Guidelines
- [ ] Age gate at 18+ implemented
- [ ] Safety features implemented (report, block)
- [ ] Content moderation active
- [ ] Privacy controls available
- [ ] No escort/prostitution references
- [ ] Clear terms of service
- [ ] User verification available
- [ ] Safety tips provided

### Privacy & Data
- [ ] Privacy Policy comprehensive
- [ ] Terms of Service complete
- [ ] GDPR compliant (if serving EU)
- [ ] CCPA compliant (if serving CA)
- [ ] Data retention policy defined
- [ ] Account deletion available
- [ ] Data export available
- [ ] Cookies/tracking disclosed
- [ ] Third-party sharing disclosed

### Sign In with Apple
- [ ] Implemented if offering social login
- [ ] Prominently displayed
- [ ] Equally prominent to other options
- [ ] Works correctly
- [ ] Handles account linking

---

## Final Pre-Submission Checklist

### Documentation
- [ ] Privacy Policy live and accessible
- [ ] Terms of Service live and accessible
- [ ] Support page live and accessible
- [ ] All URLs work correctly
- [ ] All URLs use HTTPS
- [ ] Contact information accurate
- [ ] Demo account created for review
- [ ] Demo account tested and works

### App Store Connect Review
- [ ] All metadata entered correctly
- [ ] All screenshots uploaded
- [ ] All URLs verified
- [ ] Review notes complete
- [ ] Demo credentials provided
- [ ] Export compliance answered
- [ ] Age rating correct
- [ ] Pricing configured
- [ ] Release options selected

### Build Selection
- [ ] Correct build selected for submission
- [ ] Build version matches documentation
- [ ] TestFlight testing complete (if used)
- [ ] No known critical bugs
- [ ] Performance acceptable
- [ ] Crash-free rate high (95%+)

### Team Readiness
- [ ] Support team prepared for launch
- [ ] support@flamoral.com monitored
- [ ] Social media accounts ready
- [ ] Marketing materials prepared
- [ ] Press kit available (if applicable)
- [ ] Analytics tracking configured
- [ ] Crash reporting configured (Firebase)
- [ ] Customer support system ready

---

## Submission Process

### Submit for Review
- [ ] Click "Submit for Review" in App Store Connect
- [ ] Confirm all information is correct
- [ ] Select build version
- [ ] Choose release option (manual or automatic)
- [ ] Answer export compliance questions
- [ ] Answer advertising identifier questions
- [ ] Answer content rights questions
- [ ] Submit successfully

### Post-Submission
- [ ] Submission confirmation received
- [ ] Status changed to "Waiting for Review"
- [ ] Monitor email for Apple communications
- [ ] Respond promptly to any questions
- [ ] Monitor App Store Connect dashboard
- [ ] Don't make changes during review
- [ ] Prepare for possible rejection
- [ ] Have plan for addressing feedback

---

## Common Rejection Reasons & Prevention

### 1. Crashes and Bugs
**Prevention:**
- [ ] Thorough testing on multiple devices
- [ ] Fix all known crashes
- [ ] Handle all error cases
- [ ] Test with poor network conditions

### 2. Broken Links
**Prevention:**
- [ ] Test all URLs
- [ ] Ensure privacy policy is live
- [ ] Verify support page works
- [ ] Check all deep links

### 3. Incomplete Information
**Prevention:**
- [ ] Fill all required fields
- [ ] Provide complete review notes
- [ ] Include working demo account
- [ ] Explain all features clearly

### 4. Privacy Issues
**Prevention:**
- [ ] Complete privacy policy
- [ ] Accurate data collection disclosure
- [ ] Clear permission descriptions
- [ ] Implement requested permissions only

### 5. In-App Purchase Issues
**Prevention:**
- [ ] Test all purchase flows
- [ ] Verify receipt validation
- [ ] Test restore purchases
- [ ] Clear pricing display

### 6. Sign In with Apple
**Prevention:**
- [ ] Implement if using social login
- [ ] Equal prominence to other options
- [ ] Test thoroughly
- [ ] Handle edge cases

### 7. Age Rating Mismatch
**Prevention:**
- [ ] Accurate age rating selection
- [ ] Content matches rating
- [ ] Implement age gate
- [ ] Moderate user content

### 8. Misleading Description
**Prevention:**
- [ ] Accurate app description
- [ ] Screenshots show actual app
- [ ] No exaggerated claims
- [ ] Features match description

---

## Review Timeline

### Expected Timeline
- **Submission to Review:** 24-48 hours
- **In Review:** 24-72 hours
- **Total Time:** 2-5 days typically

### Status Meanings
- **Waiting for Review:** In queue
- **In Review:** Apple is reviewing
- **Pending Developer Release:** Approved, waiting for manual release
- **Ready for Sale:** Live on App Store
- **Rejected:** Needs changes, can resubmit

---

## If Rejected

### Steps to Take
1. [ ] Read rejection reason carefully
2. [ ] Review Resolution Center in App Store Connect
3. [ ] Address all issues mentioned
4. [ ] Test fixes thoroughly
5. [ ] Update metadata if needed
6. [ ] Create new build if code changes made
7. [ ] Respond to reviewer if needed
8. [ ] Resubmit for review

### Common Issues to Fix
- [ ] Fix crashes
- [ ] Update descriptions
- [ ] Fix broken links
- [ ] Address privacy concerns
- [ ] Fix In-App purchase issues
- [ ] Implement requested features
- [ ] Improve app quality

---

## Post-Approval Checklist

### Launch Day
- [ ] Monitor App Store for app appearance
- [ ] Test download from App Store
- [ ] Verify all features work in production
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Respond to user reviews
- [ ] Monitor support emails
- [ ] Post on social media
- [ ] Notify press (if applicable)

### Ongoing Monitoring
- [ ] Daily crash rate monitoring
- [ ] Daily review monitoring
- [ ] Weekly analytics review
- [ ] User feedback collection
- [ ] Bug tracking and fixing
- [ ] Plan for version 1.1
- [ ] Monitor In-App purchase revenue
- [ ] Track user acquisition costs

---

## Fastlane Automation

### Using Fastlane for Submission

**Prepare Submission:**
```bash
cd ios
fastlane prepare_submission
```

**Upload to App Store:**
```bash
cd ios
fastlane submit
```

**Submit for Review:**
```bash
cd ios
fastlane release
```

### Fastlane Benefits
- [ ] Automated screenshot capture
- [ ] Automated metadata upload
- [ ] Automated build upload
- [ ] Consistent process
- [ ] Reduced human error
- [ ] Version management
- [ ] Team collaboration

---

## Support & Resources

### Apple Resources
- **App Store Connect:** https://appstoreconnect.apple.com
- **Developer Portal:** https://developer.apple.com
- **Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Human Interface Guidelines:** https://developer.apple.com/design/human-interface-guidelines/

### Contact Information
- **Developer Support:** developer.apple.com/contact
- **App Review:** Via App Store Connect Resolution Center
- **Technical Support:** developer.apple.com/support

### Internal Contacts
- **Technical Lead:** tech@flamoral.com
- **Product Manager:** product@flamoral.com
- **Support Team:** support@flamoral.com
- **Legal/Compliance:** legal@flamoral.com

---

## Version History

**Version 1.0.0 - Initial Release**
- Date Submitted: [To be filled]
- Date Approved: [To be filled]
- Date Released: [To be filled]
- Status: [Pending/Approved/Rejected]
- Notes: Initial App Store submission

---

## Final Sign-Off

**Checklist Completed By:** _________________________
**Date:** _________________________
**Reviewed By:** _________________________
**Date:** _________________________
**Approved for Submission:** [ ] Yes [ ] No
**Submission Date:** _________________________
**Submission Confirmation ID:** _________________________

---

**Last Updated:** December 11, 2025
**Version:** 1.0.0
**Prepared By:** Flamoral Development Team

---

## Quick Reference

### Critical Files
- Info.plist: `/ios/FlavoralApp/Info.plist`
- Fastlane: `/ios/fastlane/`
- Metadata: `/ios/fastlane/metadata/en-US/`
- Screenshots: `/ios/fastlane/screenshots/`
- App Icon: Asset catalog

### Critical URLs
- Privacy: https://flamoral.com/privacy
- Terms: https://flamoral.com/terms
- Support: https://flamoral.com/support

### Demo Account
- Email: reviewer@flamoral.com
- Password: ReviewPass2025!

### Key Commands
- Build: `Product > Archive`
- Validate: In Xcode Organizer
- Upload: In Xcode Organizer or `fastlane submit`
- Test: `fastlane test`
- Screenshots: `fastlane screenshots`

**Good luck with your App Store submission!**
