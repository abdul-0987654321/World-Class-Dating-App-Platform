# Flamoral iOS App Store Submission - Complete Index

## Overview

This directory contains all materials, documentation, and configuration files needed to submit the Flamoral iOS dating app to the Apple App Store.

**Status:** Ready for Submission
**Version:** 1.0.0
**Last Updated:** December 11, 2025

---

## Quick Access

### Start Here
- **[QUICK_START.md](QUICK_START.md)** - Get from zero to submission in 4 hours
- **[APP_STORE_SUBMISSION_SUMMARY.md](APP_STORE_SUBMISSION_SUMMARY.md)** - Complete overview of everything

### Essential Guides
- **[APP_STORE_SUBMISSION_CHECKLIST.md](APP_STORE_SUBMISSION_CHECKLIST.md)** - Step-by-step submission checklist
- **[SCREENSHOT_REQUIREMENTS.md](SCREENSHOT_REQUIREMENTS.md)** - Screenshot capture and specifications
- **[APP_CAPABILITIES.md](APP_CAPABILITIES.md)** - iOS capabilities and permissions setup

### Fastlane Setup
- **[../ios/fastlane/README.md](../ios/fastlane/README.md)** - Complete Fastlane automation guide

---

## Directory Structure

```
app-store/
├── INDEX.md                              # This file
├── QUICK_START.md                        # Quick start guide (4 hours to submission)
├── APP_STORE_SUBMISSION_SUMMARY.md       # Complete submission summary
├── APP_STORE_SUBMISSION_CHECKLIST.md     # Detailed checklist
├── SCREENSHOT_REQUIREMENTS.md            # Screenshot guidelines
├── APP_CAPABILITIES.md                   # iOS capabilities configuration
│
├── metadata/
│   ├── app-store-copy.md                 # Complete marketing copy and ASO
│   └── privacy-policy.txt                # Privacy policy text
│
└── screenshots/                          # Screenshots directory (to be created)
    └── en-US/
        ├── 01_Discovery.png
        ├── 02_Profile.png
        ├── 03_Matches.png
        ├── 04_Messages.png
        ├── 05_Video.png
        └── 06_Premium.png

ios/fastlane/
├── Appfile                               # Apple Developer account config
├── Fastfile                              # Automated deployment lanes
├── Matchfile                             # Code signing configuration
├── README.md                             # Fastlane usage guide
├── .env                                  # Environment variables (create this)
│
└── metadata/en-US/
    ├── name.txt                          # App name
    ├── subtitle.txt                      # App subtitle
    ├── description.txt                   # Full description
    ├── keywords.txt                      # App Store keywords
    ├── promotional_text.txt              # Promotional copy
    ├── release_notes.txt                 # What's new
    ├── privacy_url.txt                   # Privacy policy URL
    ├── support_url.txt                   # Support URL
    ├── marketing_url.txt                 # Marketing URL
    │
    └── review_information/
        ├── first_name.txt                # Review contact
        ├── last_name.txt
        ├── phone_number.txt
        ├── email_address.txt
        ├── demo_user.txt                 # Demo account email
        ├── demo_password.txt             # Demo account password
        └── notes.txt                     # Review notes

ios/FlavoralApp/
└── Info-AppStore.plist                   # Enhanced Info.plist (reference)
```

---

## Document Guide

### For Developers

**First Time Setup:**
1. [QUICK_START.md](QUICK_START.md) - Start here
2. [../ios/fastlane/README.md](../ios/fastlane/README.md) - Fastlane setup
3. [APP_CAPABILITIES.md](APP_CAPABILITIES.md) - Configure capabilities

**Before Submission:**
1. [APP_STORE_SUBMISSION_CHECKLIST.md](APP_STORE_SUBMISSION_CHECKLIST.md) - Complete checklist
2. [SCREENSHOT_REQUIREMENTS.md](SCREENSHOT_REQUIREMENTS.md) - Capture screenshots
3. [APP_STORE_SUBMISSION_SUMMARY.md](APP_STORE_SUBMISSION_SUMMARY.md) - Final review

### For Product/Marketing

**App Store Metadata:**
1. [metadata/app-store-copy.md](metadata/app-store-copy.md) - All marketing copy
2. [SCREENSHOT_REQUIREMENTS.md](SCREENSHOT_REQUIREMENTS.md) - Screenshot guidelines
3. [metadata/privacy-policy.txt](metadata/privacy-policy.txt) - Privacy policy

**Strategy & Optimization:**
- [metadata/app-store-copy.md](metadata/app-store-copy.md) includes ASO strategy
- Keywords analysis and competitor research
- Pricing and subscription strategy

### For Project Managers

**Status & Planning:**
1. [APP_STORE_SUBMISSION_SUMMARY.md](APP_STORE_SUBMISSION_SUMMARY.md) - Complete overview
2. [APP_STORE_SUBMISSION_CHECKLIST.md](APP_STORE_SUBMISSION_CHECKLIST.md) - Track progress
3. [QUICK_START.md](QUICK_START.md) - Timeline estimates

---

## File Descriptions

### Documentation Files

#### QUICK_START.md
- **Purpose:** Get from zero to submission in ~4 hours
- **Audience:** Developers performing submission
- **Contains:** Step-by-step instructions, commands, timeline
- **Use When:** You're ready to submit and want quick guidance

#### APP_STORE_SUBMISSION_SUMMARY.md
- **Purpose:** Complete submission overview and reference
- **Audience:** Everyone involved in submission
- **Contains:** All details, contacts, resources, checklists
- **Use When:** You need comprehensive information

#### APP_STORE_SUBMISSION_CHECKLIST.md
- **Purpose:** Detailed pre-submission verification
- **Audience:** QA, developers, product managers
- **Contains:** 200+ checklist items covering everything
- **Use When:** Verifying app is ready for submission

#### SCREENSHOT_REQUIREMENTS.md
- **Purpose:** Screenshot specifications and guidelines
- **Audience:** Designers, developers, marketing
- **Contains:** Sizes, content requirements, capture process
- **Use When:** Creating App Store screenshots

#### APP_CAPABILITIES.md
- **Purpose:** iOS capabilities and permissions setup
- **Audience:** iOS developers
- **Contains:** Required capabilities, setup steps, configuration
- **Use When:** Configuring Xcode project for submission

#### metadata/app-store-copy.md
- **Purpose:** Complete App Store marketing content
- **Audience:** Marketing, product, copywriters
- **Contains:** Descriptions, keywords, ASO strategy
- **Use When:** Preparing App Store metadata

### Configuration Files

#### ios/fastlane/Appfile
- **Purpose:** Apple Developer account configuration
- **Contains:** Bundle ID, Apple ID, Team ID
- **Setup:** Replace placeholder values with your credentials

#### ios/fastlane/Fastfile
- **Purpose:** Automated build and deployment scripts
- **Contains:** All Fastlane lanes for testing, building, deploying
- **Usage:** Run via `fastlane [lane_name]`

#### ios/fastlane/Matchfile
- **Purpose:** Code signing automation configuration
- **Contains:** Certificate repository settings
- **Setup:** Configure git repository for certificates

#### ios/fastlane/.env
- **Purpose:** Environment variables and secrets
- **Contains:** Passwords, API keys, credentials
- **Note:** Create this file yourself (not in git)

### Metadata Files

All files in `ios/fastlane/metadata/en-US/` are plain text files that Fastlane uses to upload metadata to App Store Connect automatically.

- **name.txt** - App name (30 chars)
- **subtitle.txt** - App subtitle (30 chars)
- **description.txt** - Full description (4000 chars)
- **keywords.txt** - Search keywords (100 chars)
- **promotional_text.txt** - Promotional copy (170 chars)
- **release_notes.txt** - What's new (4000 chars)
- **privacy_url.txt** - Privacy policy URL
- **support_url.txt** - Support URL
- **marketing_url.txt** - Marketing website URL

---

## Submission Workflow

### Phase 1: Preparation (2-3 days)
1. Review all documentation
2. Set up Apple Developer account
3. Configure App Store Connect
4. Create In-App Purchase products
5. Set up code signing
6. Create demo account

### Phase 2: Build & Test (1-2 days)
1. Run all tests
2. Build release version
3. Deploy to TestFlight
4. Internal testing
5. Fix any bugs found

### Phase 3: Assets (1 day)
1. Capture screenshots
2. Design app icon
3. Prepare marketing materials
4. Write/review copy
5. Update metadata files

### Phase 4: Submission (4 hours)
1. Final QA testing
2. Complete checklist
3. Run `fastlane release`
4. Verify in App Store Connect
5. Submit for review

### Phase 5: Review (2-5 days)
1. Monitor status
2. Respond to questions
3. Fix issues if rejected
4. Resubmit if needed

### Phase 6: Launch (1 day)
1. Approve for release
2. Monitor crash reports
3. Track user reviews
4. Provide customer support
5. Plan updates

**Total Timeline:** 1-2 weeks from start to App Store

---

## Fastlane Commands

### Essential Commands
```bash
# Installation and setup
cd apps/mobile-app/ios
bundle install
fastlane install_deps
fastlane sync_certificates

# Development
fastlane test                # Run tests
fastlane build_dev           # Development build

# Screenshots
fastlane screenshots         # Automated capture
fastlane frame_screenshots   # Add device frames

# TestFlight
fastlane beta                # Internal testing
fastlane beta_external       # External testing

# App Store
fastlane prepare_submission  # Prepare everything
fastlane submit              # Upload to App Store
fastlane release             # Complete submission

# Utilities
fastlane clean               # Clean artifacts
fastlane info                # Show app info
fastlane bump_version        # Increment version
```

See [ios/fastlane/README.md](../ios/fastlane/README.md) for complete command reference.

---

## Key Information

### App Details
- **Name:** Flamoral - Dating & Relationships
- **Subtitle:** Where Passion Meets Connection
- **Bundle ID:** com.flamoral
- **Version:** 1.0.0
- **Category:** Lifestyle / Social Networking
- **Age Rating:** 17+
- **Price:** Free (with IAP)

### Important URLs
- **Privacy:** https://flamoral.com/privacy
- **Terms:** https://flamoral.com/terms
- **Support:** https://flamoral.com/support
- **Website:** https://flamoral.com

### Demo Account
- **Email:** reviewer@flamoral.com
- **Password:** ReviewPass2025!
- **Purpose:** Apple reviewer testing

### Contact Information
- **Technical:** tech@flamoral.com
- **Support:** support@flamoral.com
- **Product:** product@flamoral.com
- **Legal:** legal@flamoral.com

---

## In-App Purchases

### Subscriptions
1. Premium Monthly - $9.99/month
2. Premium Yearly - $59.99/year
3. Premium+ Monthly - $19.99/month
4. Premium+ Yearly - $119.99/year

### Consumables
1. Coin Pack Small - $1.99 (10 coins)
2. Coin Pack Medium - $4.99 (30 coins)
3. Coin Pack Large - $9.99 (75 coins)

All products configured with IDs: `com.flamoral.[product].[tier]`

---

## Required Assets

### App Icon
- **Size:** 1024x1024px
- **Format:** PNG (no transparency)
- **Location:** Asset catalog in Xcode

### Screenshots
- **6.7":** 1290x2796px (required)
- **6.5":** 1242x2688px (required)
- **5.5":** 1242x2208px (recommended)
- **Count:** 3-10 per size
- **Format:** PNG or JPEG

### Preview Video (Optional)
- **Length:** 15-30 seconds
- **Sizes:** Same as screenshots
- **Format:** .mov, .mp4, or .m4v

---

## Third-Party Services

### Required
- **Firebase** - Authentication, push notifications
- **Agora** - Video calling
- **Apple IAP** - Payment processing

### Optional
- **Slack** - Team notifications (configure webhook in .env)

All services properly configured with API keys.

---

## Compliance

### Privacy
- Complete privacy policy
- GDPR compliant
- CCPA compliant
- Data deletion available
- Privacy nutrition label complete

### Export Compliance
- Uses standard encryption (HTTPS/TLS)
- Qualifies for exemption
- Self-classification permitted
- No custom cryptography

### Age Rating
- 17+ (Dating app)
- Age gate implemented
- Content moderation active
- Safety features in place

---

## Common Tasks

### Update App Description
1. Edit `ios/fastlane/metadata/en-US/description.txt`
2. Run `fastlane submit`

### Add Screenshots
1. Place screenshots in `ios/fastlane/screenshots/en-US/`
2. Run `fastlane submit`

### Change Version
1. Run `fastlane bump_version type:minor`
2. Or manually edit in Xcode

### Update Privacy Policy
1. Update website URL content
2. Verify URL in `ios/fastlane/metadata/en-US/privacy_url.txt`

### Add New IAP Product
1. Create in App Store Connect
2. Update code to reference product ID
3. Test with sandbox account

---

## Troubleshooting

### Problem: Build fails
**Solution:** Run `fastlane clean && fastlane build_release`

### Problem: Code signing error
**Solution:** Run `fastlane sync_certificates`

### Problem: Upload rejected
**Solution:** Check App Store Connect for specific error message

### Problem: Screenshots wrong size
**Solution:** See [SCREENSHOT_REQUIREMENTS.md](SCREENSHOT_REQUIREMENTS.md) for exact dimensions

### Problem: Metadata errors
**Solution:** Check all .txt files in `ios/fastlane/metadata/en-US/`

---

## Next Steps

1. **If Starting Fresh:**
   - Read [QUICK_START.md](QUICK_START.md)
   - Set up development environment
   - Configure Apple accounts

2. **If Ready to Submit:**
   - Complete [APP_STORE_SUBMISSION_CHECKLIST.md](APP_STORE_SUBMISSION_CHECKLIST.md)
   - Run `fastlane release`
   - Monitor App Store Connect

3. **If Already Submitted:**
   - Monitor review status
   - Respond to questions
   - Plan for launch

---

## Support

### Documentation
All guides are in `apps/mobile-app/app-store/` and `apps/mobile-app/ios/fastlane/`

### External Resources
- **App Store Connect:** https://appstoreconnect.apple.com
- **Developer Portal:** https://developer.apple.com
- **Fastlane Docs:** https://docs.fastlane.tools
- **Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/

### Internal Support
- **Technical Issues:** tech@flamoral.com
- **Business Questions:** product@flamoral.com
- **App Store Help:** appstore@flamoral.com

---

## Document Updates

This index and all documentation will be updated as the app evolves. Check the "Last Updated" date at the top of each document.

**Version History:**
- v1.0.0 (Dec 11, 2025) - Initial submission documentation

---

## Quick Links

- [Quick Start Guide](QUICK_START.md)
- [Complete Summary](APP_STORE_SUBMISSION_SUMMARY.md)
- [Submission Checklist](APP_STORE_SUBMISSION_CHECKLIST.md)
- [Screenshot Guide](SCREENSHOT_REQUIREMENTS.md)
- [Capabilities Guide](APP_CAPABILITIES.md)
- [Fastlane Guide](../ios/fastlane/README.md)
- [Marketing Copy](metadata/app-store-copy.md)

---

**Everything is ready for submission. Good luck!**

*Last Updated: December 11, 2025*
