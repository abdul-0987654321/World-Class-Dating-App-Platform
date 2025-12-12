# App Store Screenshot Requirements

## Overview
This document outlines the screenshot requirements for the Flamoral iOS app submission to the App Store.

---

## Required Screenshot Sizes

### iPhone (Required)
Apple requires screenshots for at least one iPhone size from each size class:

#### 6.7-inch Display (iPhone 14 Pro Max, 15 Pro Max, 15 Plus)
- **Resolution:** 1290 x 2796 pixels
- **Format:** PNG or JPEG
- **Orientation:** Portrait
- **Required:** Yes (Primary)
- **Count:** 3-10 screenshots

#### 6.5-inch Display (iPhone 11 Pro Max, XS Max)
- **Resolution:** 1242 x 2688 pixels
- **Format:** PNG or JPEG
- **Orientation:** Portrait
- **Required:** Yes (Secondary)
- **Count:** 3-10 screenshots

#### 5.5-inch Display (iPhone 8 Plus, 7 Plus, 6s Plus)
- **Resolution:** 1242 x 2208 pixels
- **Format:** PNG or JPEG
- **Orientation:** Portrait
- **Required:** Optional (but recommended)
- **Count:** 3-10 screenshots

### iPad (Optional)
Since Flamoral is iPhone-only (`supportsTablet: false`), iPad screenshots are not required.

---

## Screenshot Content Requirements

### 1. Discovery/Swipe Screen
**Purpose:** Show the core dating experience
**Elements to highlight:**
- Profile card with photo
- User information (name, age, distance)
- Swipe indicators or buttons
- Clean, attractive UI
- Sample profile with appealing content

**Caption:** "Find Your Perfect Match"
**Description:** "Discover singles nearby and swipe to connect"

---

### 2. Profile Detail View
**Purpose:** Showcase profile depth and information
**Elements to highlight:**
- Multiple profile photos
- Bio and interests
- Lifestyle information
- Verification badge (if applicable)
- Clear, professional design

**Caption:** "Get to Know Each Other"
**Description:** "Detailed profiles help you find compatible matches"

---

### 3. Matches Screen
**Purpose:** Display the matching experience
**Elements to highlight:**
- Grid or list of matches
- Match indicators
- Recent matches highlighted
- Clear call-to-action buttons
- Multiple diverse profiles

**Caption:** "Connect with Your Matches"
**Description:** "See who you've matched with instantly"

---

### 4. Messaging/Chat Screen
**Purpose:** Show communication features
**Elements to highlight:**
- Clean chat interface
- Message bubbles
- Photo sharing capabilities
- Typing indicators
- Friendly conversation example

**Caption:** "Start Meaningful Conversations"
**Description:** "Chat securely with end-to-end encryption"

---

### 5. Video Call Screen (Optional)
**Purpose:** Highlight premium feature
**Elements to highlight:**
- Video call interface
- Clear video quality
- Call controls (mute, camera, end)
- Professional presentation
- Happy users connecting

**Caption:** "Video Chat with Matches"
**Description:** "Take your connection to the next level"

---

### 6. Premium Features Screen
**Purpose:** Showcase subscription benefits
**Elements to highlight:**
- Premium features list
- Pricing information
- Benefits badges/icons
- "Upgrade" call-to-action
- Value proposition clear

**Caption:** "Unlock Premium Features"
**Description:** "Get unlimited likes and advanced filters"

---

## Screenshot Guidelines

### Content Guidelines
1. **Use Mock Data:** Create realistic but fictional profiles
2. **Diversity:** Show diverse users in screenshots
3. **Privacy:** Do not use real user data or photos
4. **Age Appropriate:** No suggestive or inappropriate content
5. **Brand Consistent:** Use Flamoral brand colors and design
6. **Quality:** High-resolution, crisp, and professional
7. **Localization:** English text for US App Store

### Design Best Practices
1. **Compelling:** Screenshots should entice downloads
2. **Clear:** UI elements should be easy to see
3. **Representative:** Accurately reflect app functionality
4. **Annotated:** Consider adding text overlays (optional)
5. **Ordered:** Place most compelling screenshots first
6. **Consistent:** Maintain visual consistency across all screenshots

### Text Overlays (Optional)
If adding text to screenshots:
- Use large, readable fonts
- Keep text concise (under 10 words)
- Ensure text doesn't obscure important UI
- Use brand colors
- Maintain consistency across all screenshots

---

## Screenshot Capture Process

### Recommended Tools
1. **Xcode Simulator:** Built-in screenshot tool
2. **Fastlane Snapshot:** Automated screenshot generation
3. **Design Tools:** Sketch, Figma, or Photoshop for editing
4. **Screenshot Framer:** Tools like DaVinci for device frames

### Capture Steps

#### Using Xcode Simulator
1. Open project in Xcode
2. Select iPhone 15 Pro Max simulator
3. Build and run the app
4. Navigate to desired screen
5. Command + S to capture screenshot
6. Screenshots saved to Desktop

#### Using Fastlane Snapshot
```bash
cd ios
fastlane snapshot
```

This will:
- Launch simulators
- Navigate through UI test flows
- Capture screenshots automatically
- Save to `./fastlane/screenshots/`

---

## Screenshot Naming Convention

Use descriptive names for organization:
```
iPhone_6.7_01_Discovery.png
iPhone_6.7_02_Profile.png
iPhone_6.7_03_Matches.png
iPhone_6.7_04_Messaging.png
iPhone_6.7_05_VideoCall.png
iPhone_6.7_06_Premium.png
```

---

## App Preview Video (Optional)

### Requirements
- **Length:** 15-30 seconds
- **Size:** Same as screenshot sizes
- **Format:** .mov, .mp4, or .m4v
- **Resolution:** Up to 1080p
- **File Size:** Up to 500 MB
- **Audio:** Optional but recommended

### Content Suggestions
1. Open with Flamoral logo (2-3 seconds)
2. Show swipe interaction (3-4 seconds)
3. Demonstrate matching (2-3 seconds)
4. Show messaging interface (3-4 seconds)
5. Highlight premium features (2-3 seconds)
6. End with call-to-action (2-3 seconds)

### Best Practices
- Keep it fast-paced and engaging
- No voiceover required
- Use upbeat background music
- Show actual app functionality
- Keep user privacy in mind
- Test on actual device

---

## Screenshot Checklist

### Before Capture
- [ ] Mock data prepared
- [ ] App built in Release mode
- [ ] All features functional
- [ ] Design polished and final
- [ ] Localization complete (if applicable)

### During Capture
- [ ] iPhone 6.7" screenshots (required)
- [ ] iPhone 6.5" screenshots (required)
- [ ] iPhone 5.5" screenshots (recommended)
- [ ] All 6 screens captured
- [ ] Screenshots are portrait orientation
- [ ] Status bar looks clean (time shows 9:41)
- [ ] No personal or sensitive data visible

### After Capture
- [ ] Screenshots are correct resolution
- [ ] File format is PNG or JPEG
- [ ] File size under 8MB each
- [ ] Images are clear and crisp
- [ ] Text is readable
- [ ] Colors are accurate
- [ ] Screenshots uploaded to App Store Connect
- [ ] Captions and descriptions added

---

## Image Specifications

### File Format
- **Preferred:** PNG (for transparency and quality)
- **Acceptable:** JPEG
- **Not Accepted:** GIF, BMP, TIFF

### Color Profile
- **sRGB** color space
- **72 DPI** resolution (screen resolution)

### File Size
- **Maximum:** 8 MB per screenshot
- **Recommended:** Under 5 MB for faster uploads

---

## Screenshot Upload Process

### Via App Store Connect Web Interface
1. Log in to App Store Connect
2. Navigate to: My Apps > Flamoral > 1.0 Prepare for Submission
3. Scroll to "App Previews and Screenshots"
4. Select iPhone display size
5. Drag and drop screenshots
6. Reorder screenshots if needed
7. Add captions (optional)
8. Save changes

### Via Fastlane Deliver
```bash
cd ios
fastlane deliver
```

This will:
- Upload screenshots automatically
- Apply metadata from `./fastlane/metadata/`
- Submit for review (optional)

---

## Localization Screenshots

If supporting multiple languages:

### Supported Languages (Launch)
- English (US) - Required
- English (UK) - Optional
- English (Canada) - Optional
- English (Australia) - Optional

### Screenshot Localization
For each language:
1. Create folder: `./fastlane/screenshots/en-US/`
2. Add localized screenshots
3. Update text overlays to match language
4. Ensure UI text is translated

---

## Quality Assurance

### Screenshot Review Checklist
- [ ] Screenshots accurately represent the app
- [ ] No spelling or grammar errors in overlays
- [ ] Brand colors are consistent
- [ ] Images are high quality and crisp
- [ ] No blurry or pixelated images
- [ ] Content is appropriate for 17+ rating
- [ ] Screenshots tell a compelling story
- [ ] Order is logical and engaging
- [ ] First screenshot is most compelling

---

## Common Mistakes to Avoid

1. **Wrong Dimensions:** Ensure exact pixel dimensions
2. **Low Quality:** Avoid blurry or compressed images
3. **Misleading Content:** Screenshots must reflect actual app
4. **Personal Data:** Never use real user information
5. **Inconsistent UI:** Make sure UI is polished
6. **Too Many Screenshots:** 6-8 is optimal, max 10
7. **Wrong Orientation:** Must be portrait for Flamoral
8. **Status Bar Issues:** Keep status bar clean

---

## Tools & Resources

### Screenshot Generation
- **Fastlane Snapshot:** https://docs.fastlane.tools/actions/snapshot/
- **Xcode Simulator:** Built-in iOS development tool

### Design & Editing
- **Sketch:** UI design tool
- **Figma:** Collaborative design platform
- **Adobe Photoshop:** Image editing
- **Pixelmator Pro:** Mac-native image editor

### Screenshot Framing
- **DaVinci:** Device frame mockups
- **Screely:** Free screenshot beautification
- **Placeit:** Screenshot templates

### Automation
- **Fastlane Frameit:** Add device frames
- **Fastlane Snapshot:** Automated screenshot capture

---

## Timeline

### Screenshot Production Schedule
1. **Day 1-2:** Design and prepare mock data
2. **Day 3-4:** Capture and edit screenshots
3. **Day 5:** Review and approval
4. **Day 6:** Upload to App Store Connect
5. **Day 7:** Final QA and adjustments

---

## Contact & Support

For questions about screenshots:
- **Design Lead:** design@flamoral.com
- **Marketing Team:** marketing@flamoral.com
- **App Store Specialist:** appstore@flamoral.com

---

## References

- [App Store Connect Help - Screenshots](https://help.apple.com/app-store-connect/#/devd274dd925)
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [App Store Screenshot Sizes](https://help.apple.com/app-store-connect/#/dev4e413fcb8)

---

**Last Updated:** December 11, 2025
**Version:** 1.0.0
**Document Owner:** Flamoral Marketing Team
