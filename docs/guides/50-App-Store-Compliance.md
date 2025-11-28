# App Store & Play Store Compliance Checklist

## Apple App Store Requirements

### Technical Requirements
- [ ] Built with Xcode 16+ targeting iOS 18 SDK
- [ ] App runs on iOS 18, iPadOS 18
- [ ] All links functional (privacy policy, terms, support)
- [ ] No placeholder content or unfinished features
- [ ] Stable - no crashes or major bugs
- [ ] Proper error handling and loading states

### Content & Functionality
- [x] Privacy Policy included and linked
- [x] Terms of Service included and linked
- [ ] Support contact information (email: support@flamoral.com)
- [ ] App is 100% complete and functional
- [ ] No forced ratings/reviews required to use app
- [ ] Provides substantial value (dating/matchmaking service)
- [x] Age restriction: 17+ (Mature content - dating app)

### Privacy & Permissions
Required permissions with explanations in Info.plist:
- [ ] **NSCameraUsageDescription**: "Take photos for your profile"
- [ ] **NSPhotoLibraryUsageDescription**: "Choose photos for your profile"
- [ ] **NSLocationWhenInUseUsageDescription**: "Find matches near you"
- [ ] **NSUserNotificationsUsageDescription**: "Get notified about new matches and messages"
- [ ] No forced permissions - all optional except account creation

### Privacy Manifest (Required for iOS 18)
- [x] Data collection disclosed in Privacy Policy
- [ ] Privacy manifest file created (PrivacyInfo.xcprivacy)
- [ ] Required reasons API usage documented
- [ ] Third-party SDK privacy manifests included

### Financial Compliance
- N/A - No loan features
- [x] Subscriptions use Apple In-App Purchase
- [x] Clear pricing and subscription terms

### Developer Account
- [ ] Active Apple Developer account ($99/year)
- [ ] App ID created in App Store Connect
- [ ] Certificates and provisioning profiles configured

## Google Play Store Requirements

### Technical Requirements
- [ ] **Target Android 14 (API level 34)** - REQUIRED as of Aug 2024
- [ ] Minimum SDK version appropriate (Android 6.0 / API 23 recommended)
- [ ] App Bundle (.aab) format for upload
- [ ] 64-bit native libraries if using native code

### Testing Requirements
- [ ] **20 testers for 2 weeks minimum** (for new developer accounts)
- [ ] Internal testing track set up
- [ ] Closed testing completed before production
- [ ] Test accounts provided for review

### Privacy & Data Safety
- [x] Privacy Policy URL provided
- [ ] Data Safety form completed in Play Console
- [ ] All data collection types disclosed
- [ ] Data deletion option available (account deletion in settings)
- [x] Terms of Service available

### Permissions (Android 14 Requirements)
Required permissions in AndroidManifest.xml with clear explanations:
- [ ] **CAMERA**: "Take profile photos"
- [ ] **READ_MEDIA_IMAGES**: "Select profile photos from gallery"
- [ ] **ACCESS_COARSE_LOCATION**: "Find matches near you"
- [ ] **POST_NOTIFICATIONS**: "Receive match and message notifications"
- [ ] **INTERNET**: Required for app functionality
- [ ] Photos/Videos access limited to app functionality (Oct 31, 2024 requirement)

### Content Rating
- [ ] Complete IARC questionnaire
- [ ] Age rating: Mature 17+ (Dating content)
- [ ] Accurate content descriptors

### Financial Compliance
- N/A - No loan features
- [x] In-app purchases use Google Play Billing
- [ ] Clear subscription terms and cancellation policy

### Developer Verification
- [ ] Google Play Developer account ($25 one-time fee)
- [ ] Organization verification (if required for category)
- [ ] D-U-N-S number (if organization)

## Universal Requirements (Both Stores)

### Legal Documents
- [x] Privacy Policy (PRIVACY_POLICY.md)
- [x] Terms of Service (TERMS_OF_SERVICE.md)
- [ ] Privacy Policy hosted at URL
- [ ] Terms of Service hosted at URL
- [ ] Support page with contact information

### Content Standards
- [ ] Age-appropriate content (17+)
- [ ] No objectionable, misleading, or harmful content
- [ ] No explicit/adult content in screenshots
- [ ] Clear, accurate app description
- [x] Ads align with age rating (if applicable)

### User Experience
- [ ] App fully functional without placeholders
- [ ] Graceful error handling
- [ ] Loading states for all async operations
- [ ] Offline fallback content where appropriate
- [x] Demo/test accounts for review

### Screenshots & Assets
- [ ] iOS: Screenshots for all required device sizes
- [ ] Android: Screenshots for phone and tablet
- [ ] App icon (1024x1024 for iOS, 512x512 for Android)
- [ ] Feature graphic (Android)
- [ ] No misleading screenshots

### Localization
- [ ] English (required)
- [ ] Additional languages (optional)
- [ ] Localized screenshots (if multiple languages)

## Test Credentials for Review

**Demo Account 1 (Standard User)**
- Email: demo@flamoral.com
- Password: Demo123!
- Features: Standard free account with sample matches

**Demo Account 2 (Premium User)**
- Email: premium@flamoral.com
- Password: Premium123!
- Features: Premium subscription active, all features unlocked

**Instructions for Reviewers**:
1. Use demo accounts above to test all features
2. Matching algorithm populated with test profiles
3. Sample conversations available
4. Payment testing uses sandbox environment

## Data Safety Declaration

### Data Collected
**Personal Information**:
- Name, email, phone number
- Profile photos
- Date of birth (age verification)
- Bio and interests

**Location**:
- Approximate location (city-level) for matching

**Messages**:
- Text messages between matched users
- Read receipts and delivery status

**App Activity**:
- Likes, matches, and interactions
- App features used

### Data Usage
- Provide app functionality
- Personalize user experience
- Prevent fraud and ensure safety
- Communicate about service

### Data Sharing
- With other users (profile information only)
- Service providers (cloud storage, messaging, payments)
- Legal requirements only

### Security Practices
- Data encrypted in transit (HTTPS/TLS)
- Data encrypted at rest
- Option to delete account and all data
- No sale of user data to third parties

## Account Deletion

Users can delete account through:
1. **In-App**: Settings > Account > Delete Account
2. **Email Request**: privacy@flamoral.com
3. **Web Portal**: https://flamoral.com/delete-account

Deletion timeline:
- Immediate: Account deactivated
- 30 days: All personal data permanently deleted
- Legal holds: Some data retained if required by law

## Pre-Submission Checklist

### Week Before Submission
- [ ] All features tested and working
- [ ] No crashes or critical bugs
- [ ] Privacy Policy and Terms uploaded to website
- [ ] Test accounts created and verified
- [ ] Screenshots and marketing assets prepared
- [ ] App metadata written (description, keywords)

### Day of Submission
- [ ] Final build created and tested
- [ ] Version number incremented
- [ ] Build uploaded to App Store Connect / Play Console
- [ ] All metadata and assets uploaded
- [ ] Test accounts provided in reviewer notes
- [ ] Submit for review

### Post-Submission
- [ ] Monitor review status daily
- [ ] Respond to reviewer questions within 24 hours
- [ ] Prepare for potential rejection/feedback
- [ ] Have updates ready if needed

## Timeline Estimates

**Apple App Store**:
- Review time: 1-2 days typically
- Expedited review: Available in urgent cases
- Rejection turnaround: Usually within 24 hours

**Google Play Store**:
- Review time: Hours to a few days
- Internal testing: Minimum 2 weeks (20 testers)
- Closed testing: 1-2 weeks recommended
- Production review: 24-72 hours typically

## Contact Information

**Support Email**: support@flamoral.com
**Privacy Email**: privacy@flamoral.com
**Legal Email**: legal@flamoral.com
**Website**: https://flamoral.com

---

**Last Updated**: November 23, 2025
**Review Status**: Pre-submission preparation
