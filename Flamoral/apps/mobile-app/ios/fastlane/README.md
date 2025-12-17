# Fastlane Setup & Usage Guide - Flamoral iOS

## Overview
This guide covers the setup and usage of Fastlane for automating iOS build, test, and deployment processes for the Flamoral dating app.

---

## Table of Contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Available Lanes](#available-lanes)
4. [Code Signing](#code-signing)
5. [Screenshots](#screenshots)
6. [TestFlight Deployment](#testflight-deployment)
7. [App Store Submission](#app-store-submission)
8. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites
- macOS with Xcode installed
- Ruby 2.5 or higher
- CocoaPods installed
- Apple Developer account
- App Store Connect account

### Install Fastlane

```bash
# Using RubyGems
sudo gem install fastlane -NV

# Or using Homebrew
brew install fastlane
```

### Verify Installation

```bash
fastlane --version
```

### Install Dependencies

```bash
# Navigate to iOS directory
cd apps/mobile-app/ios

# Install required gems
bundle install

# Install CocoaPods dependencies
bundle exec fastlane install_deps
```

---

## Configuration

### 1. Configure Appfile

Edit `fastlane/Appfile`:

```ruby
app_identifier("com.flamoral")
apple_id("developer@flamoral.com")
itc_team_id("YOUR_TEAM_ID")
team_id("YOUR_TEAM_ID")
```

**Finding Your Team ID:**
1. Log in to [Apple Developer](https://developer.apple.com/account)
2. Go to Membership section
3. Copy your Team ID

### 2. Set Environment Variables

Create a `.env` file in the `ios/fastlane/` directory:

```bash
# Apple Developer Credentials
FASTLANE_USER="developer@flamoral.com"
FASTLANE_PASSWORD="your_password"
FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD="your_app_specific_password"

# App Store Connect
FASTLANE_ITC_TEAM_ID="your_itc_team_id"

# Code Signing
MATCH_PASSWORD="your_match_password"
MATCH_KEYCHAIN_PASSWORD="your_keychain_password"

# Demo Account for Review
DEMO_PASSWORD="ReviewPass2025!"

# Slack (Optional)
SLACK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Git for Match
MATCH_GIT_BASIC_AUTHORIZATION="base64_encoded_credentials"
```

**Generate App-Specific Password:**
1. Go to [appleid.apple.com](https://appleid.apple.com)
2. Sign in
3. Security > App-Specific Passwords
4. Generate new password
5. Copy and save securely

### 3. Configure Matchfile

Edit `fastlane/Matchfile` to set up code signing:

```ruby
git_url("https://github.com/your-org/certificates")
git_branch("main")
storage_mode("git")
app_identifier(["com.flamoral"])
username("developer@flamoral.com")
```

**Set Up Match Repository:**
1. Create a private Git repository for certificates
2. Initialize Match: `fastlane match init`
3. Select `git` storage
4. Enter repository URL

---

## Available Lanes

### Development Lanes

#### Install Dependencies
```bash
fastlane install_deps
```
Installs CocoaPods dependencies with clean install.

#### Run Tests
```bash
fastlane test
```
Runs unit tests on iPhone 15 Pro simulator with code coverage.

#### Run Linter
```bash
fastlane lint
```
Runs ESLint to check code quality.

#### Build for Development
```bash
fastlane build_dev
```
Creates a development build (Debug configuration).

### Code Signing Lanes

#### Sync Certificates
```bash
fastlane sync_certificates
```
Downloads and installs existing certificates and provisioning profiles.

**Run this on new machine or after certificate renewal.**

#### Create New Certificates
```bash
fastlane create_certificates
```
Creates new development and distribution certificates.

**Only run if you need to create new certificates!**

### Screenshot Lanes

#### Capture Screenshots
```bash
fastlane screenshots
```
Automatically captures screenshots for all required device sizes.

**Requirements:**
- UI tests configured
- Simulator installed for each device size
- Override status bar enabled

#### Frame Screenshots
```bash
fastlane frame_screenshots
```
Adds device frames around screenshots for marketing.

**Install frameit first:**
```bash
brew install imagemagick
```

### Build & Release Lanes

#### Build for Release
```bash
fastlane build_release
```
Creates a release build with incremented build number.

**What it does:**
1. Increments build number
2. Builds app in Release mode
3. Exports IPA for App Store
4. Commits build number change

#### Upload to TestFlight (Internal)
```bash
fastlane beta
```
Builds and uploads to TestFlight for internal testing.

**What it does:**
1. Syncs code signing
2. Builds release version
3. Uploads to TestFlight
4. Distributes to internal testers
5. Sends Slack notification (if configured)

#### Upload to TestFlight (External)
```bash
fastlane beta_external
```
Builds and uploads to TestFlight for external testing.

**What it does:**
1. Syncs code signing
2. Builds release version
3. Uploads to TestFlight
4. Submits for beta review
5. Distributes to external testers
6. Sends Slack notification (if configured)

**Requires:**
- Beta app review information
- Demo account credentials
- External test group created

### App Store Submission Lanes

#### Prepare for Submission
```bash
fastlane prepare_submission
```
Complete preparation for App Store submission.

**What it does:**
1. Captures screenshots
2. Adds device frames
3. Builds release version
4. Displays next steps

#### Submit to App Store
```bash
fastlane submit
```
Uploads app and metadata to App Store Connect (does not submit for review).

**What it does:**
1. Syncs code signing
2. Builds release version
3. Uploads IPA
4. Uploads metadata
5. Uploads screenshots

**Use this to upload without submitting for review.**

#### Release to App Store
```bash
fastlane release
```
Uploads app and submits for App Store review.

**What it does:**
1. Syncs code signing
2. Builds release version
3. Uploads IPA
4. Uploads metadata
5. Uploads screenshots
6. Submits for review
7. Sends Slack notification (if configured)

**This is the complete submission process!**

### Version Management Lanes

#### Bump Version
```bash
# Bump patch version (1.0.0 -> 1.0.1)
fastlane bump_version

# Bump minor version (1.0.0 -> 1.1.0)
fastlane bump_version type:minor

# Bump major version (1.0.0 -> 2.0.0)
fastlane bump_version type:major
```

**What it does:**
1. Increments version number
2. Increments build number
3. Commits changes
4. Creates Git tag
5. Pushes to remote

### Utility Lanes

#### Clean Build Artifacts
```bash
fastlane clean
```
Removes derived data and build folders.

#### Register New Device
```bash
fastlane register_device name:"John's iPhone" udid:"abc123..."
```
Registers new device and updates provisioning profiles.

#### Display App Info
```bash
fastlane info
```
Shows current version, build number, and configuration.

---

## Code Signing

### Initial Setup

#### 1. Initialize Match
```bash
cd ios
fastlane match init
```

#### 2. Create Certificates
```bash
fastlane create_certificates
```

**This creates:**
- Development certificate and provisioning profile
- Distribution certificate and provisioning profile

#### 3. On New Mac
```bash
fastlane sync_certificates
```

### Code Signing Workflow

**For Development:**
1. Use automatic signing in Xcode
2. Or use: `fastlane match development`

**For Release:**
1. Use manual signing in Xcode
2. Run: `fastlane sync_certificates`
3. Select provisioning profile in Xcode

### Renewing Certificates

**Certificates expire after 1 year.**

```bash
# Force renewal
fastlane match appstore --force_for_new_devices

# Or manually revoke and recreate
fastlane match nuke development
fastlane match nuke distribution
fastlane create_certificates
```

---

## Screenshots

### Setup UI Tests

Create UI tests in `FlavoralAppUITests` target:

```swift
import XCTest

class ScreenshotTests: XCTestCase {
    override func setUp() {
        super.setUp()
        let app = XCUIApplication()
        setupSnapshot(app)
        app.launch()
    }

    func testScreenshots() {
        // Discovery screen
        snapshot("01Discovery")

        // Profile screen
        app.buttons["viewProfile"].tap()
        snapshot("02Profile")

        // Matches screen
        app.tabBars.buttons["Matches"].tap()
        snapshot("03Matches")

        // Messages screen
        app.tables.cells.firstMatch.tap()
        snapshot("04Messages")

        // Premium screen
        app.tabBars.buttons["Premium"].tap()
        snapshot("05Premium")
    }
}
```

### Capture Screenshots

```bash
fastlane screenshots
```

**Output:**
Screenshots saved to `./fastlane/screenshots/en-US/`

### Customize Screenshot Capture

Edit `Snapfile`:

```ruby
devices([
  "iPhone 15 Pro Max",
  "iPhone 15 Pro",
  "iPhone 8 Plus"
])

languages([
  "en-US"
])

scheme("FlavoralApp")

clear_previous_screenshots true
override_status_bar true
```

---

## TestFlight Deployment

### Setup

1. **Create App in App Store Connect:**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - My Apps > + > New App
   - Fill in app details
   - Save

2. **Create Test Groups:**
   - TestFlight > Internal Testing
   - Create group: "Internal Testers"
   - Add team members

3. **Configure External Testing (Optional):**
   - TestFlight > External Testing
   - Create group: "External Testers"
   - Add testers via email

### Deploy to TestFlight

#### Internal Testing
```bash
fastlane beta
```

**Testers receive:**
- Email notification
- TestFlight app invitation
- Instant access (no review required)

#### External Testing
```bash
fastlane beta_external
```

**Process:**
1. Build uploaded
2. Submitted for beta review
3. Review takes 24-48 hours
4. Approved builds distributed to testers

### Monitor TestFlight

**Via App Store Connect:**
- TestFlight > iOS Builds
- View build status
- See tester feedback
- Check crash reports

**Via Fastlane:**
```bash
fastlane pilot list
```

---

## App Store Submission

### Prerequisites

- [ ] All code complete and tested
- [ ] Screenshots captured
- [ ] Metadata prepared
- [ ] Privacy policy live
- [ ] Demo account created
- [ ] App Store Connect configured

### Submission Process

#### Step 1: Prepare Submission
```bash
fastlane prepare_submission
```

**Review output:**
- Check screenshots in `./fastlane/screenshots/`
- Verify build created successfully
- Confirm no errors

#### Step 2: Upload to App Store
```bash
fastlane submit
```

**This uploads:**
- App binary (IPA)
- Screenshots
- Metadata
- Review information

**Does NOT submit for review.**

#### Step 3: Manual Review in App Store Connect

1. Log in to App Store Connect
2. Go to My Apps > Flamoral > 1.0 Prepare for Submission
3. Review all information
4. Select build
5. Answer compliance questions
6. Click "Submit for Review"

**OR use automated submission:**

#### Automated Submission
```bash
fastlane release
```

**This does everything:**
- Builds app
- Uploads IPA
- Uploads metadata
- Submits for review

### Monitor Review Status

**Via App Store Connect:**
- My Apps > Flamoral
- Check status banner
- Respond to reviewer questions in Resolution Center

**Review statuses:**
- Waiting for Review
- In Review
- Pending Developer Release
- Ready for Sale
- Rejected

**Average review time:** 24-72 hours

---

## Troubleshooting

### Common Issues

#### 1. Authentication Failed

**Error:** "Your Apple ID or password was incorrect"

**Solution:**
- Use app-specific password, not regular password
- Set environment variable: `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD`
- Enable 2FA on Apple ID

#### 2. Code Signing Failed

**Error:** "No matching provisioning profiles found"

**Solution:**
```bash
fastlane match appstore --readonly
```

**Or:**
- Check bundle ID matches
- Verify certificates not expired
- Run `fastlane sync_certificates`

#### 3. Screenshots Failed

**Error:** "Simulator not found"

**Solution:**
- Install required simulators in Xcode
- Xcode > Settings > Platforms > Download
- Match device names in Snapfile

#### 4. Upload Failed

**Error:** "The provided entity includes an attribute with a value that has already been used"

**Solution:**
- Build number already used
- Increment build number
- Or use `fastlane build_release` (auto-increments)

#### 5. Match Password Error

**Error:** "Could not decrypt match repository"

**Solution:**
- Verify `MATCH_PASSWORD` environment variable
- Check password is correct
- Ensure repository access

### Getting Help

**Fastlane Docs:**
- https://docs.fastlane.tools

**Fastlane Community:**
- GitHub Issues: https://github.com/fastlane/fastlane/issues
- Stack Overflow: Tag `fastlane`

**Internal Support:**
- Technical Lead: tech@flamoral.com
- DevOps: devops@flamoral.com

---

## Best Practices

### 1. Never Commit Secrets
- Use `.env` file (add to `.gitignore`)
- Use environment variables
- Store passwords in keychain or CI/CD secrets

### 2. Test Before Release
```bash
# Always test before releasing
fastlane test
fastlane build_release
# Manual QA testing
fastlane beta  # Internal TestFlight
# Wait for tester feedback
fastlane release  # App Store
```

### 3. Semantic Versioning
- Major: Breaking changes (1.0.0 -> 2.0.0)
- Minor: New features (1.0.0 -> 1.1.0)
- Patch: Bug fixes (1.0.0 -> 1.0.1)

### 4. Keep Certificates Secure
- Encrypt match repository
- Use strong MATCH_PASSWORD
- Limit repository access
- Rotate regularly

### 5. Automate Everything
- Use Fastlane for all deployments
- Integrate with CI/CD (GitHub Actions, CircleCI)
- Document all manual steps
- Create lanes for common tasks

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/ios-release.yml`:

```yaml
name: iOS Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: 3.0
          bundler-cache: true

      - name: Install dependencies
        run: |
          cd apps/mobile-app/ios
          bundle install
          bundle exec fastlane install_deps

      - name: Run tests
        run: |
          cd apps/mobile-app/ios
          bundle exec fastlane test

      - name: Deploy to TestFlight
        env:
          FASTLANE_USER: ${{ secrets.FASTLANE_USER }}
          FASTLANE_PASSWORD: ${{ secrets.FASTLANE_PASSWORD }}
          FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD: ${{ secrets.APP_SPECIFIC_PASSWORD }}
          MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
        run: |
          cd apps/mobile-app/ios
          bundle exec fastlane beta
```

---

## Quick Reference

### Common Commands

```bash
# Setup
fastlane install_deps
fastlane sync_certificates

# Development
fastlane test
fastlane build_dev

# TestFlight
fastlane beta
fastlane beta_external

# App Store
fastlane prepare_submission
fastlane release

# Maintenance
fastlane clean
fastlane bump_version
```

### File Structure

```
ios/
├── fastlane/
│   ├── Appfile              # App identifiers and credentials
│   ├── Fastfile             # Lane definitions
│   ├── Matchfile            # Code signing configuration
│   ├── Snapfile             # Screenshot configuration
│   ├── .env                 # Environment variables (gitignored)
│   ├── metadata/            # App Store metadata
│   │   └── en-US/
│   │       ├── name.txt
│   │       ├── description.txt
│   │       ├── keywords.txt
│   │       └── ...
│   └── screenshots/         # Generated screenshots
│       └── en-US/
│           ├── 01Discovery.png
│           └── ...
└── FlavoralApp.xcworkspace
```

---

## Support & Resources

### Documentation
- **Fastlane Docs:** https://docs.fastlane.tools
- **Fastlane Actions:** https://docs.fastlane.tools/actions
- **Match Guide:** https://docs.fastlane.tools/actions/match
- **Deliver Guide:** https://docs.fastlane.tools/actions/deliver

### Tools
- **Fastlane:** Build automation
- **Match:** Code signing
- **Snapshot:** Screenshots
- **Deliver:** App Store upload
- **Pilot:** TestFlight management

### Community
- **GitHub:** https://github.com/fastlane/fastlane
- **Twitter:** @FastlaneTools
- **Slack:** fastlane-tools.slack.com

---

## Version History

**v1.0.0** - December 11, 2025
- Initial Fastlane setup
- Core lanes implemented
- Documentation complete

---

**Last Updated:** December 11, 2025
**Maintained By:** Flamoral Development Team
**Contact:** devops@flamoral.com
