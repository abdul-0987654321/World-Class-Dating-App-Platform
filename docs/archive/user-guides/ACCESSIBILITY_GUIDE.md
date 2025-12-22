# Flamoral Accessibility Guide

Flamoral is committed to making our dating platform accessible to everyone. This guide covers all accessibility features available in our apps and website.

## Table of Contents
- [Overview](#overview)
- [Screen Reader Support](#screen-reader-support)
- [Visual Accessibility](#visual-accessibility)
- [Motor and Dexterity](#motor-and-dexterity)
- [Hearing Accessibility](#hearing-accessibility)
- [Cognitive Accessibility](#cognitive-accessibility)
- [Platform-Specific Features](#platform-specific-features)
- [Assistive Technology Compatibility](#assistive-technology-compatibility)

---

## Overview

### Our Commitment

Flamoral is designed to meet **WCAG 2.1 AA** (Web Content Accessibility Guidelines) standards. We strive to ensure everyone can:
- Create and manage profiles
- Browse and match with others
- Send and receive messages
- Access all features regardless of ability

### Accessibility Standards Met

- **WCAG 2.1 Level AA compliance**
- **Section 508 compliance** (US federal accessibility standards)
- **ADA compliance** (Americans with Disabilities Act)
- **EN 301 549 compliance** (European accessibility standard)

### Continuous Improvement

We regularly:
- Conduct accessibility audits
- Test with assistive technologies
- Gather feedback from users with disabilities
- Implement improvements based on feedback

**Report accessibility issues:** accessibility@flamoral.com

---

## Screen Reader Support

### Compatible Screen Readers

**iOS:**
- VoiceOver (built-in)
- Full support for all iOS gestures
- Tested on iOS 15+

**Android:**
- TalkBack (built-in)
- Voice Access
- Tested on Android 10+

**Web:**
- JAWS (Windows)
- NVDA (Windows, free)
- VoiceOver (macOS)
- ChromeVox (Chrome browser)
- Narrator (Windows)

---

### How to Enable Screen Readers

**iOS VoiceOver:**
1. Settings > Accessibility
2. Tap VoiceOver
3. Toggle VoiceOver on
4. **Quick toggle**: Triple-click home button or side button

**Android TalkBack:**
1. Settings > Accessibility
2. Tap TalkBack
3. Toggle on
4. **Quick toggle**: Press both volume keys for 3 seconds

**Windows NVDA (Free):**
1. Download from nvaccess.org
2. Install and run
3. NVDA announces when active

---

### Screen Reader Features in Flamoral

**Profile browsing:**
- Clear announcements of name, age, distance
- Bio read aloud in full
- Photo descriptions (auto-generated)
- Interest tags announced
- Verification status announced

**Swiping:**
- Audio cues for swipe actions
- "Swipe right to like, swipe left to pass, swipe up for Super Like"
- Confirmation sounds for each action
- Undo action available (Premium)

**Messaging:**
- New message alerts with sender name
- Messages read in chronological order
- Time stamps announced
- Typing indicators announced
- Read receipts announced (Premium)

**Navigation:**
- Logical tab order through all screens
- Landmarks for major sections
- Skip to content option
- Clear focus indicators

---

### ARIA Labels

All interactive elements include:
- Descriptive labels
- Button purposes clearly stated
- Form field instructions
- Error messages announced
- Status updates announced

Example:
- "Like button - swipe right or tap to like this profile"
- "Send message button - activates with double tap"
- "Premium upgrade - access unlimited features"

---

## Visual Accessibility

### Color Contrast

All text meets WCAG 2.1 AA standards:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

**No information conveyed by color alone:**
- Icons include text labels
- Status indicators include symbols
- Errors include text descriptions

---

### Font Size Control

**iOS:**
1. Settings > Display & Brightness
2. Text Size
3. Drag slider to adjust
4. Flamoral respects system text size

**Android:**
1. Settings > Display
2. Font size
3. Select size
4. Flamoral adapts automatically

**Web:**
1. Browser zoom (Ctrl/Cmd + or -)
2. All layouts responsive to zoom
3. Text remains readable up to 200% zoom

**Supported text sizes:**
- Extra Small to Extra Extra Large
- Up to 200% scaling
- Layouts adapt dynamically

---

### High Contrast Mode

**Enable high contrast:**

**iOS:**
1. Settings > Accessibility
2. Display & Text Size
3. Toggle "Increase Contrast"

**Android:**
1. Settings > Accessibility
2. Visibility enhancements
3. High contrast text

**Windows:**
1. Settings > Ease of Access
2. High Contrast
3. Choose theme

**Flamoral adapts to system high contrast settings automatically.**

---

### Dark Mode

Reduce eye strain and improve readability:

**Auto Dark Mode:**
- Follows system settings
- iOS: Settings > Display > Dark Mode
- Android: Settings > Display > Dark Theme
- Web: Browser/system preferences

**Manual Toggle:**
1. Flamoral Profile > Settings
2. Appearance
3. Choose: Light, Dark, or Auto

**Benefits:**
- Reduced eye strain
- Better for low-light environments
- Improved battery life (OLED screens)
- Higher contrast for some users

---

### Reduced Motion

For users sensitive to motion and animations:

**iOS:**
1. Settings > Accessibility
2. Motion
3. Toggle "Reduce Motion"

**Android:**
1. Settings > Accessibility
2. Remove Animations

**Flamoral respects these settings:**
- Eliminates parallax effects
- Reduces card animations
- Simplifies transitions
- Disables auto-play videos

---

### Color Blindness Support

**Features for color-blind users:**
- Icons include text labels, not just colors
- Match status uses symbols + colors
- Message status uses icons + colors
- Premium badges use shapes + colors

**Supported types:**
- Protanopia (red-blind)
- Deuteranopia (green-blind)
- Tritanopia (blue-blind)
- Achromatopsia (total color blindness)

---

### Low Vision Support

**Magnification:**
- Pinch to zoom on photos
- System magnifier compatible
- Large touch targets (minimum 44x44 pixels)

**Screen Magnifier:**
- iOS: Settings > Accessibility > Zoom
- Android: Settings > Accessibility > Magnification

---

## Motor and Dexterity

### Touch Accommodations

**iOS - AssistiveTouch:**
1. Settings > Accessibility
2. Touch > AssistiveTouch
3. Toggle on

**Android - Accessibility Menu:**
1. Settings > Accessibility
2. Accessibility Menu
3. Toggle on

---

### Large Touch Targets

All interactive elements meet or exceed:
- **Minimum size**: 44x44 pixels (iOS), 48x48 dp (Android)
- **Generous spacing** between elements
- **No precise gestures required**
- **Accidental touch prevention**

---

### Alternative Input Methods

**Supported:**
- Switch Control (iOS)
- Switch Access (Android)
- Voice Control (iOS)
- Voice Access (Android)
- Keyboard navigation (Web)
- External keyboards (iOS/Android)
- Adaptive controllers
- Head tracking devices

**Switch Control Setup (iOS):**
1. Settings > Accessibility
2. Switch Control
3. Add switches
4. Configure actions

**Switch Access Setup (Android):**
1. Settings > Accessibility
2. Switch Access
3. Settings
4. Assign switches

---

### Keyboard Navigation (Web)

**Full keyboard support:**
- **Tab**: Navigate forward through elements
- **Shift+Tab**: Navigate backward
- **Enter**: Activate buttons/links
- **Space**: Select checkboxes/toggle
- **Arrow keys**: Navigate within components
- **Esc**: Close modals/dialogs

**Keyboard shortcuts:**
- **Alt+H**: Home/Discovery
- **Alt+M**: Matches
- **Alt+C**: Conversations
- **Alt+P**: Profile
- **Alt+S**: Settings
- **Alt+/**: Search

**Visible focus indicators:**
- Clear outline on focused elements
- High contrast focus ring
- Never hidden or unclear

---

### Dwell Control

**For users who can't click:**
- iOS: Settings > Accessibility > Touch > Dwell Control
- Hover over element for set duration to activate
- Adjustable dwell time

---

### Voice Control

**Full voice control support:**

**iOS Voice Control:**
1. Settings > Accessibility
2. Voice Control
3. Toggle on

**Commands:**
- "Tap [button name]"
- "Swipe right"
- "Scroll down"
- "Go home"

**Android Voice Access:**
1. Play Store > Install Voice Access
2. Settings > Accessibility > Voice Access

---

## Hearing Accessibility

### Visual Alternatives to Audio

**All audio has visual equivalent:**
- Match notifications: Visual banner + vibration
- Message notifications: Visual + vibration
- Typing indicators: Visual dots
- Video call incoming: Visual alert + vibration

---

### Video Call Captions

**Live captions during video calls:**
1. During video call, tap "Captions"
2. Real-time speech-to-text
3. Powered by AI
4. Supports 10+ languages

**Accuracy:**
- 90%+ in quiet environments
- Improves with clear speech
- Better with good connection

---

### Vibration Alerts

**Customize vibration patterns:**
1. Profile > Settings > Notifications
2. Vibration Settings
3. Choose patterns for:
   - New matches
   - Messages
   - Likes
   - Super Likes

**Android custom vibrations:**
- Settings > Sound > Vibration pattern
- Create custom patterns

---

### Mono Audio

**For users with hearing in one ear:**

**iOS:**
1. Settings > Accessibility
2. Audio/Visual
3. Toggle "Mono Audio"

**Android:**
1. Settings > Accessibility
2. Hearing enhancements
3. Mono audio

---

## Cognitive Accessibility

### Simplified Interface Option

**Enable Simple Mode:**
1. Profile > Settings > Accessibility
2. Toggle "Simplified Interface"

**Changes:**
- Larger, clearer buttons
- Reduced visual clutter
- Step-by-step workflows
- Clear, simple language
- Fewer options per screen

---

### Focus Mode

**Reduce distractions:**
1. Profile > Settings > Accessibility
2. Toggle "Focus Mode"

**Features:**
- Hides non-essential UI elements
- One action at a time
- Clear next steps
- Minimal distractions

---

### Clear Language

**Throughout the app:**
- Simple, conversational language
- No jargon or complex terms
- Short sentences and paragraphs
- Clear instructions
- Visual aids for complex tasks

---

### Predictable Navigation

**Consistent patterns:**
- Same navigation on every screen
- Predictable button locations
- Clear page titles
- Breadcrumb trails (web)
- No unexpected changes

---

### Error Prevention

**Helpful features:**
- Confirmation for destructive actions
- Undo available for many actions
- Clear error messages
- Suggestions for fixing errors
- Save drafts automatically

---

## Platform-Specific Features

### iOS Accessibility Features

**Supported features:**
- VoiceOver
- Voice Control
- Switch Control
- AssistiveTouch
- Display Accommodations
- Larger Text
- Bold Text
- Button Shapes
- Reduce Transparency
- Increase Contrast
- Reduce Motion
- Spoken Content
- Audio Descriptions

**How to access:**
Settings > Accessibility > [Feature Name]

---

### Android Accessibility Features

**Supported features:**
- TalkBack
- Voice Access
- Switch Access
- Select to Speak
- Live Transcribe
- Sound Amplifier
- Font size adjustment
- Display size
- High contrast text
- Color correction
- Color inversion
- Remove animations

**How to access:**
Settings > Accessibility > [Feature Name]

---

### Web Accessibility Features

**Browser features supported:**
- Text scaling (up to 200%)
- Custom stylesheets
- Reader mode
- Browser extensions (screen readers, etc.)
- Keyboard-only navigation
- High contrast themes

---

## Assistive Technology Compatibility

### Tested and Compatible

**Screen Readers:**
- JAWS 2021+
- NVDA 2021+
- VoiceOver (iOS 15+, macOS 12+)
- TalkBack (Android 10+)
- ChromeVox

**Screen Magnifiers:**
- ZoomText
- MAGic
- iOS Zoom
- Android Magnification

**Speech Recognition:**
- Dragon NaturallySpeaking
- Windows Speech Recognition
- iOS Voice Control
- Android Voice Access

**Switch Access:**
- iOS Switch Control
- Android Switch Access
- Various switch hardware

---

## Reporting Accessibility Issues

### We Want to Hear From You

If you encounter accessibility barriers:

**Email:** accessibility@flamoral.com

**Include:**
1. Description of the issue
2. Device and OS version
3. Assistive technology used (if any)
4. Steps to reproduce
5. Screenshots (if applicable)

**Response time:** Within 48 hours

---

### Accessibility Feedback

**Help us improve:**
- Share your experience
- Suggest improvements
- Report barriers
- Participate in user testing

**User testing opportunities:**
- Email accessibility@flamoral.com to participate
- Compensation provided for testers
- Remote testing available

---

## Accessibility Resources

### In-App Help

**Access help anytime:**
1. Profile > Settings
2. Help & Support
3. Accessibility

**Features:**
- Interactive tutorials
- Video guides (with captions)
- Screen reader optimized help
- Contact support directly

---

### External Resources

**Learn more about assistive technology:**

**iOS:**
- [Apple Accessibility](https://www.apple.com/accessibility/)
- [VoiceOver User Guide](https://support.apple.com/guide/iphone/voiceover)

**Android:**
- [Android Accessibility](https://www.android.com/accessibility/)
- [TalkBack User Guide](https://support.google.com/accessibility/android/answer/6283677)

**Web:**
- [WebAIM](https://webaim.org/)
- [NVDA Screen Reader](https://www.nvaccess.org/)

---

## Quick Reference

### Common Accessibility Shortcuts

**iOS VoiceOver:**
- **Swipe right**: Next item
- **Swipe left**: Previous item
- **Double tap**: Activate
- **Three-finger swipe**: Scroll
- **Rotor**: Two-finger rotate

**Android TalkBack:**
- **Swipe right**: Next item
- **Swipe left**: Previous item
- **Double tap**: Activate
- **Swipe down then right**: Reading controls

**Web Keyboard:**
- **Tab**: Next element
- **Shift+Tab**: Previous element
- **Enter**: Activate
- **Space**: Toggle/select
- **Esc**: Close modal

---

## Contact and Support

**Accessibility Support:**
- Email: accessibility@flamoral.com
- Response time: 24-48 hours
- Priority support for accessibility issues

**General Support:**
- Email: support@flamoral.com
- In-app: Profile > Help & Support

**Accessibility Coordinator:**
- For complex accessibility needs
- Email: accessibility@flamoral.com

---

**Last Updated:** December 2025

**We are committed to continuous improvement in accessibility. Your feedback helps us create a more inclusive platform for everyone.**
