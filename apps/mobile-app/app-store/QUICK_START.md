# Quick Start - iOS App Store Submission

## 30-Second Overview

Everything is ready for App Store submission. All files are created and documented. Follow this guide to submit in under 4 hours.

---

## Prerequisites (10 minutes)

1. **Apple Developer Account** - $99/year membership
2. **App Store Connect Access** - Create app record
3. **MacOS with Xcode** - Latest version installed
4. **Fastlane** - Install: `sudo gem install fastlane`

---

## Setup (30 minutes)

### 1. Configure Apple Developer (10 min)

```bash
# Edit ios/fastlane/Appfile
# Replace with your details:
app_identifier("com.flamoral")
apple_id("your-email@example.com")
team_id("YOUR_TEAM_ID")
```

### 2. Create Environment File (5 min)

```bash
# Create ios/fastlane/.env
FASTLANE_USER="your-email@example.com"
FASTLANE_PASSWORD="your_password"
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD="app_specific_password"
MATCH_PASSWORD="encryption_password_for_certificates"
DEMO_PASSWORD="ReviewPass2025!"
```

### 3. Install Dependencies (15 min)

```bash
cd apps/mobile-app/ios
bundle install
fastlane install_deps
```

---

## Code Signing (30 minutes)

### Option 1: Automatic (Recommended)

```bash
cd apps/mobile-app/ios
fastlane sync_certificates
```

### Option 2: Manual

1. Open Xcode
2. Select FlavoralApp project
3. Signing & Capabilities
4. Enable Automatic signing
5. Select your team

---

## Create Demo Account (15 minutes)

**CRITICAL: Apple requires a working demo account**

1. Run the app in development
2. Create account: `reviewer@flamoral.com`
3. Password: `ReviewPass2025!`
4. Complete profile with photos
5. Create some test matches
6. Test all features work

---

## Capture Screenshots (30 minutes)

### Automated (Recommended)

```bash
cd apps/mobile-app/ios
fastlane screenshots
```

### Manual

1. Run app on iPhone 15 Pro Max simulator
2. Navigate to each screen
3. Press Cmd+S to save screenshot
4. Repeat for other device sizes
5. Save to `ios/fastlane/screenshots/en-US/`

Required screenshots:
- Discovery screen
- Profile view
- Matches screen
- Messaging
- Premium features (optional)

---

## Configure App Store Connect (45 minutes)

### 1. Create App Record (10 min)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. My Apps > + > New App
3. Fill in:
   - Platform: iOS
   - Name: Flamoral - Dating & Relationships
   - Primary Language: English (US)
   - Bundle ID: com.flamoral
   - SKU: flamoral-ios-001

### 2. Configure In-App Purchases (20 min)

**Subscriptions:**
1. Features > In-App Purchases > Manage
2. Create Subscription Group: "Flamoral Premium"
3. Add products:
   - `com.flamoral.premium.monthly` - $9.99/month
   - `com.flamoral.premium.yearly` - $59.99/year
   - `com.flamoral.premium_plus.monthly` - $19.99/month
   - `com.flamoral.premium_plus.yearly` - $119.99/year

**Consumables:**
4. Add coin packs:
   - `com.flamoral.coins.small` - $1.99
   - `com.flamoral.coins.medium` - $4.99
   - `com.flamoral.coins.large` - $9.99

### 3. App Information (15 min)

1. Navigate to App Information
2. Set:
   - Category: Lifestyle
   - Secondary: Social Networking
   - Age Rating: 17+
   - Privacy Policy URL: https://flamoral.com/privacy
   - Support URL: https://flamoral.com/support

---

## Build & Submit (60 minutes)

### Option 1: Fully Automated (Recommended)

```bash
cd apps/mobile-app/ios
fastlane release
```

This will:
1. Build the app
2. Upload to App Store Connect
3. Upload metadata and screenshots
4. Submit for review

**Done!**

### Option 2: Step by Step

```bash
# Step 1: Build
cd apps/mobile-app/ios
fastlane build_release

# Step 2: Upload
fastlane submit

# Step 3: Manually submit in App Store Connect
```

---

## Verify Submission

1. Go to App Store Connect
2. My Apps > Flamoral
3. Check status: "Waiting for Review"
4. Verify:
   - [ ] Build selected
   - [ ] Screenshots uploaded
   - [ ] Description complete
   - [ ] Keywords added
   - [ ] Review information complete
   - [ ] Demo account provided

---

## What to Expect

### Timeline
- **Upload Processing:** 5-15 minutes
- **Waiting for Review:** 24-48 hours
- **In Review:** 24-72 hours
- **Total:** 2-5 days typically

### Status Meanings
- **Waiting for Review** - In queue
- **In Review** - Apple is testing
- **Pending Developer Release** - Approved!
- **Ready for Sale** - Live on App Store
- **Rejected** - Needs fixes, can resubmit

---

## If Rejected (Don't Panic!)

1. Read the rejection reason carefully
2. Check Resolution Center in App Store Connect
3. Fix the issues mentioned
4. Run `fastlane release` again
5. Resubmit

**Common issues:**
- Crashes → Fix and test thoroughly
- Missing info → Complete all fields
- Broken links → Check URLs are live
- Demo account → Make sure it works

---

## Monitor Progress

**Via App Store Connect:**
- Check email for Apple notifications
- Monitor dashboard daily
- Respond to questions in Resolution Center

**Via Command Line:**
```bash
fastlane pilot list  # View TestFlight builds
```

---

## Post-Approval

### When Approved:
1. Choose release timing (manual or automatic)
2. App goes live within 24 hours
3. Monitor user reviews
4. Track crash reports
5. Respond to feedback

### After Launch:
- Monitor analytics
- Track downloads and revenue
- Plan version 1.1 updates
- Respond to user reviews
- Fix any reported bugs

---

## Troubleshooting

### Build Upload Failed
```bash
# Clean and rebuild
fastlane clean
fastlane build_release
```

### Code Signing Issues
```bash
# Re-sync certificates
fastlane sync_certificates
```

### Screenshots Missing
```bash
# Recapture screenshots
fastlane screenshots
```

### Metadata Errors
- Check all files in `ios/fastlane/metadata/en-US/`
- Verify no special characters
- Ensure all required files exist

---

## Quick Commands Reference

```bash
# Full process
fastlane release              # Complete submission

# Individual steps
fastlane test                 # Run tests
fastlane build_release        # Build app
fastlane screenshots          # Capture screenshots
fastlane submit               # Upload to App Store
fastlane beta                 # TestFlight only

# Utilities
fastlane clean                # Clean build
fastlane info                 # Show app info
fastlane sync_certificates    # Update signing
```

---

## File Locations

### Configuration
- Fastlane: `apps/mobile-app/ios/fastlane/`
- Info.plist: `apps/mobile-app/ios/FlavoralApp/Info.plist`

### Metadata
- Text files: `apps/mobile-app/ios/fastlane/metadata/en-US/`
- Screenshots: `apps/mobile-app/ios/fastlane/screenshots/`

### Documentation
- All guides: `apps/mobile-app/app-store/`
- Checklist: `APP_STORE_SUBMISSION_CHECKLIST.md`
- Summary: `APP_STORE_SUBMISSION_SUMMARY.md`

---

## Support & Help

### Documentation
- **Fastlane Guide:** `ios/fastlane/README.md`
- **Submission Checklist:** `app-store/APP_STORE_SUBMISSION_CHECKLIST.md`
- **Complete Summary:** `app-store/APP_STORE_SUBMISSION_SUMMARY.md`

### External Resources
- **App Store Connect:** https://appstoreconnect.apple.com
- **Fastlane Docs:** https://docs.fastlane.tools
- **Apple Guidelines:** https://developer.apple.com/app-store/review/guidelines/

### Contact
- **Technical:** tech@flamoral.com
- **Support:** support@flamoral.com

---

## Checklist

Use this quick checklist before submitting:

- [ ] Apple Developer account active
- [ ] Fastlane configured (Appfile, .env)
- [ ] Code signing set up
- [ ] Demo account created and tested
- [ ] In-App Purchases configured
- [ ] Screenshots captured
- [ ] Privacy policy live
- [ ] Support page live
- [ ] App built successfully
- [ ] All tests passing
- [ ] Ready to submit!

---

## Time Estimate

| Task | Time |
|------|------|
| Prerequisites & Setup | 40 min |
| Code Signing | 30 min |
| Demo Account | 15 min |
| Screenshots | 30 min |
| App Store Connect | 45 min |
| Build & Submit | 60 min |
| **Total** | **~4 hours** |

*Faster if using fully automated process*

---

## Final Tips

1. **Test Everything** - Run app on real device before submitting
2. **Check Demo Account** - Make sure reviewer can log in
3. **Verify URLs** - All links must be live and working
4. **Read Guidelines** - Familiarize with App Store Review Guidelines
5. **Be Patient** - Review takes 2-5 days typically
6. **Stay Available** - Respond quickly to Apple questions

---

## Ready to Submit?

If you've completed all prerequisites, you can submit right now:

```bash
cd apps/mobile-app/ios
fastlane release
```

**That's it!** The rest is automated.

---

**Good luck with your submission!**

*For detailed information, see the complete documentation in the `app-store/` directory.*
