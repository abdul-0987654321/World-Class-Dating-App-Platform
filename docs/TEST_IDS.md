# Required Test IDs for E2E Testing

This document defines all required `data-testid` attributes for UI automation testing. Frontend developers should add these attributes to the corresponding components to enable stable E2E tests.

## Naming Convention

Format: `[component]-[element]-[action/modifier]`

Examples:
- `login-email` - Email input on login page
- `profile-card` - Profile card in discovery view
- `send-message-button` - Button to send a message

## Required Test IDs by Page/Component

---

## Global/Shared Components

### Navigation

| Test ID | Element | Description |
|---------|---------|-------------|
| `nav-discover` | Link/Button | Navigation to discovery page |
| `nav-messages` | Link/Button | Navigation to messages page |
| `nav-profile` | Link/Button | Navigation to profile page |
| `nav-settings` | Link/Button | Navigation to settings page |
| `user-menu` | Button | User menu dropdown trigger |
| `bottom-nav` | Container | Mobile bottom navigation bar |
| `mobile-menu-button` | Button | Mobile hamburger menu button |
| `mobile-menu` | Container | Mobile slide-out menu |
| `back-button` | Button | Back navigation button |

### Loading States

| Test ID | Element | Description |
|---------|---------|-------------|
| `loading-spinner` | Element | Loading spinner indicator |
| `loading-overlay` | Container | Full-page loading overlay |
| `skeleton-loader` | Element | Skeleton loading placeholder |
| `progress-bar` | Element | Progress bar indicator |

### Error States

| Test ID | Element | Description |
|---------|---------|-------------|
| `error-banner` | Container | Full-width error banner |
| `error-toast` | Container | Toast error notification |
| `error-message` | Text | Error message text |

### Notifications

| Test ID | Element | Description |
|---------|---------|-------------|
| `toast` | Container | Toast notification |
| `notification` | Container | Popup notification |

### Branding

| Test ID | Element | Description |
|---------|---------|-------------|
| `app-logo` | Image/SVG | Application logo |
| `app-container` | Container | Root application container |

---

## Login Page (`/login`)

### Form Elements

| Test ID | Element | Description |
|---------|---------|-------------|
| `login-form` | Form | Login form container |
| `login-email` | Input | Email input field |
| `login-password` | Input | Password input field |
| `login-submit` | Button | Submit/login button |
| `remember-me` | Checkbox | Remember me option |
| `password-toggle` | Button | Show/hide password button |

### Error Display

| Test ID | Element | Description |
|---------|---------|-------------|
| `login-error` | Container | Login error message container |
| `email-error` | Text | Email validation error |
| `password-error` | Text | Password validation error |

### Navigation Links

| Test ID | Element | Description |
|---------|---------|-------------|
| `forgot-password-link` | Link | Forgot password link |
| `signup-link` | Link | Sign up/register link |

### Social Login

| Test ID | Element | Description |
|---------|---------|-------------|
| `google-signin` | Button | Google OAuth button |
| `apple-signin` | Button | Apple OAuth button |
| `facebook-signin` | Button | Facebook OAuth button |

### Messaging

| Test ID | Element | Description |
|---------|---------|-------------|
| `welcome-message` | Text | Welcome/heading message |

---

## Sign Up Page (`/signup`)

### Form Elements

| Test ID | Element | Description |
|---------|---------|-------------|
| `signup-form` | Form | Registration form container |
| `signup-email` | Input | Email input |
| `signup-password` | Input | Password input |
| `signup-confirm-password` | Input | Confirm password input |
| `signup-first-name` | Input | First name input |
| `signup-last-name` | Input | Last name input |
| `signup-date-of-birth` | Input | Date of birth input |
| `signup-gender` | Select | Gender selection |
| `signup-terms` | Checkbox | Accept terms checkbox |
| `signup-submit` | Button | Submit registration button |

### Error Display

| Test ID | Element | Description |
|---------|---------|-------------|
| `signup-error` | Container | Registration error message |
| `age-validation-error` | Text | Age requirement error |

---

## Discovery Page (`/discover`)

### Profile Card

| Test ID | Element | Description |
|---------|---------|-------------|
| `profile-card` | Container | Main profile card |
| `profile-name` | Text | User's display name |
| `profile-age` | Text | User's age |
| `profile-distance` | Text | Distance from user |
| `profile-photo` | Image | Profile photo |
| `profile-bio` | Text | User's bio/about text |
| `photo-indicator` | Element | Photo navigation dots |
| `expand-profile` | Button | Expand profile details |

### Action Buttons

| Test ID | Element | Description |
|---------|---------|-------------|
| `like-button` | Button | Like/swipe right button |
| `dislike-button` | Button | Pass/swipe left button |
| `superlike-button` | Button | Super like button |
| `rewind-button` | Button | Undo last swipe button |
| `boost-button` | Button | Profile boost button |
| `filter-button` | Button | Open filters button |
| `discovery-actions` | Container | Action buttons container |

### Match Modal

| Test ID | Element | Description |
|---------|---------|-------------|
| `match-modal` | Container | Match notification modal |
| `match-title` | Text | "It's a Match!" title |
| `match-photo` | Image | Matched user's photo |
| `match-message-button` | Button | Send message button |
| `match-keep-swiping` | Button | Continue swiping button |
| `close-match-modal` | Button | Close modal button |
| `match-message-input` | Input | Quick message input |
| `match-send-message` | Button | Send quick message |

### Filter Panel

| Test ID | Element | Description |
|---------|---------|-------------|
| `filter-panel` | Container | Filter settings panel |
| `filter-age-min` | Input | Minimum age filter |
| `filter-age-max` | Input | Maximum age filter |
| `filter-distance` | Input/Slider | Distance filter |
| `filter-gender` | Select | Gender preference filter |
| `filter-apply` | Button | Apply filters button |
| `filter-reset` | Button | Reset filters button |
| `filter-close` | Button | Close filter panel |

### State Indicators

| Test ID | Element | Description |
|---------|---------|-------------|
| `loading-profiles` | Element | Loading profiles indicator |
| `no-more-profiles` | Container | Empty state - no profiles |
| `expand-search` | Container | Prompt to expand search |
| `premium-prompt` | Container | Premium upgrade prompt |
| `out-of-likes` | Container | Out of likes message |
| `out-of-superlikes` | Container | Out of super likes message |

---

## Messages Page (`/messages`)

### Conversation List

| Test ID | Element | Description |
|---------|---------|-------------|
| `conversation-list` | Container | List of conversations |
| `conversation-item` | Container | Individual conversation preview |
| `conversation-name` | Text | User name in conversation |
| `conversation-preview` | Text | Last message preview |
| `conversation-avatar` | Image | User avatar |
| `unread-badge` | Badge | Unread message indicator |
| `search-conversations` | Input | Search conversations input |
| `empty-messages` | Container | No messages empty state |
| `new-matches-list` | Container | New matches carousel |
| `new-match-item` | Container | Individual new match |

### Chat View

| Test ID | Element | Description |
|---------|---------|-------------|
| `chat-container` | Container | Chat view container |
| `chat-header` | Container | Chat header bar |
| `chat-user-name` | Text | Chat partner's name |
| `chat-user-avatar` | Image | Chat partner's avatar |
| `message-list` | Container | Message list container |
| `message-item` | Container | Individual message bubble |
| `sent-message` | Container | Outgoing message |
| `received-message` | Container | Incoming message |
| `message-input` | Input/Textarea | Message compose input |
| `send-message-button` | Button | Send message button |
| `typing-indicator` | Element | Typing indicator |
| `read-receipt` | Element | Message read indicator |
| `message-timestamp` | Text | Message timestamp |

### Chat Actions

| Test ID | Element | Description |
|---------|---------|-------------|
| `attachment-button` | Button | Add attachment button |
| `gif-button` | Button | Add GIF button |
| `gif-search` | Input | GIF search input |
| `gif-result` | Container | GIF search result |
| `icebreakers-button` | Button | Icebreakers button |
| `icebreaker-option` | Button | Individual icebreaker |
| `video-call-button` | Button | Start video call |
| `voice-call-button` | Button | Start voice call |
| `chat-menu-button` | Button | Chat options menu |

### Moderation Actions

| Test ID | Element | Description |
|---------|---------|-------------|
| `unmatch-button` | Button | Unmatch user button |
| `confirm-unmatch` | Button | Confirm unmatch |
| `report-button` | Button | Report user button |
| `report-reason-{reason}` | Radio/Button | Report reason option |
| `report-details` | Textarea | Report details input |
| `submit-report` | Button | Submit report button |
| `block-button` | Button | Block user button |

### Video Call

| Test ID | Element | Description |
|---------|---------|-------------|
| `incoming-call-modal` | Container | Incoming call notification |
| `accept-call` | Button | Accept call button |
| `decline-call` | Button | Decline call button |
| `end-call` | Button | End call button |
| `local-video` | Video | Local video feed |
| `remote-video` | Video | Remote video feed |
| `mute-button` | Button | Mute audio toggle |
| `camera-toggle` | Button | Camera on/off toggle |

---

## Profile Page (`/profile`)

### Profile Display

| Test ID | Element | Description |
|---------|---------|-------------|
| `profile-container` | Container | Profile page container |
| `profile-photo` | Image | Main profile photo |
| `profile-name` | Text | Display name |
| `profile-age` | Text | User's age |
| `profile-bio` | Text | Bio/about text |
| `profile-location` | Text | Location |
| `profile-occupation` | Text | Job/occupation |
| `profile-education` | Text | Education |
| `profile-height` | Text | Height |
| `profile-interests` | Container | Interests container |
| `interest-tag` | Element | Individual interest tag |
| `verification-badge` | Badge | Verified user badge |
| `premium-badge` | Badge | Premium member badge |

### Photo Gallery

| Test ID | Element | Description |
|---------|---------|-------------|
| `profile-photos-gallery` | Container | Photo gallery |
| `photo-item` | Container | Individual photo |
| `primary-photo` | Container | Primary/main photo |
| `add-photo-button` | Button | Add new photo |
| `photo-upload` | Input | File upload input |
| `delete-photo-button` | Button | Delete photo |
| `make-primary-photo` | Button | Set as main photo |
| `reorder-photos` | Button | Reorder photos |

### Edit Mode

| Test ID | Element | Description |
|---------|---------|-------------|
| `edit-profile-button` | Button | Enter edit mode |
| `edit-profile-form` | Form | Edit form container |
| `edit-name` | Input | Name edit input |
| `edit-bio` | Textarea | Bio edit input |
| `edit-location` | Input | Location edit input |
| `edit-occupation` | Input | Occupation edit input |
| `edit-education` | Input | Education edit input |
| `edit-height` | Select/Input | Height selector |
| `edit-gender` | Select | Gender selector |
| `edit-looking-for` | Select | Looking for selector |
| `interest-selector` | Container | Interest picker |
| `save-profile` | Button | Save changes |
| `cancel-edit` | Button | Cancel editing |
| `discard-changes` | Button | Discard changes |

### Profile Stats

| Test ID | Element | Description |
|---------|---------|-------------|
| `profile-stats` | Container | Stats container |
| `likes-count` | Text | Number of likes |
| `matches-count` | Text | Number of matches |
| `profile-views` | Text | Number of profile views |

### Verification

| Test ID | Element | Description |
|---------|---------|-------------|
| `verify-profile-button` | Button | Start verification |
| `verification-status` | Text | Verification status |
| `verification-photo` | Container | Selfie capture area |

### Actions

| Test ID | Element | Description |
|---------|---------|-------------|
| `profile-settings` | Button/Link | Go to settings |
| `preview-profile` | Button | Preview as others see |
| `share-profile` | Button | Share profile |
| `logout-button` | Button | Logout |
| `upgrade-button` | Button/Link | Upgrade to premium |

---

## Settings Page (`/settings`)

### Containers

| Test ID | Element | Description |
|---------|---------|-------------|
| `settings-container` | Container | Settings page container |
| `settings-section` | Container | Individual settings section |

### Account Settings

| Test ID | Element | Description |
|---------|---------|-------------|
| `account-settings` | Section | Account settings section |
| `email-display` | Text | Current email display |
| `change-email` | Button | Change email button |
| `email-input` | Input | New email input |
| `change-password` | Button | Change password button |
| `current-password` | Input | Current password input |
| `new-password` | Input | New password input |
| `confirm-password` | Input | Confirm password input |
| `phone-number` | Text | Phone number display |
| `change-phone` | Button | Change phone button |
| `linked-accounts` | Container | Linked accounts list |
| `link-google` | Button | Link Google account |
| `link-apple` | Button | Link Apple account |
| `unlink-account` | Button | Unlink account |

### Notification Settings

| Test ID | Element | Description |
|---------|---------|-------------|
| `notification-settings` | Section | Notification settings section |
| `toggle-new-matches` | Toggle | New matches notification |
| `toggle-new-messages` | Toggle | New messages notification |
| `toggle-likes` | Toggle | Likes notification |
| `toggle-super-likes` | Toggle | Super likes notification |
| `toggle-promotions` | Toggle | Promotional notifications |
| `toggle-email-notifications` | Toggle | Email notifications |
| `toggle-push-notifications` | Toggle | Push notifications |

### Discovery Settings

| Test ID | Element | Description |
|---------|---------|-------------|
| `discovery-settings` | Section | Discovery preferences |
| `show-me-select` | Select | Show me preference |
| `age-range-slider` | Slider | Age range slider |
| `age-min` | Input | Minimum age |
| `age-max` | Input | Maximum age |
| `distance-slider` | Slider | Distance slider |
| `distance-input` | Input | Distance value |
| `distance-unit` | Select | km/miles selector |
| `toggle-global-mode` | Toggle | Global mode toggle |

### Privacy Settings

| Test ID | Element | Description |
|---------|---------|-------------|
| `privacy-settings` | Section | Privacy settings section |
| `toggle-show-online` | Toggle | Show online status |
| `toggle-show-distance` | Toggle | Show distance |
| `toggle-read-receipts` | Toggle | Read receipts |
| `toggle-show-age` | Toggle | Show age |
| `toggle-hide-profile` | Toggle | Hide profile |
| `blocked-users` | Button | View blocked users |
| `blocked-users-list` | Container | Blocked users list |
| `unblock-user` | Button | Unblock user |

### Subscription Settings

| Test ID | Element | Description |
|---------|---------|-------------|
| `subscription-settings` | Section | Subscription section |
| `current-plan` | Text | Current plan name |
| `subscription-status` | Text | Subscription status |
| `renewal-date` | Text | Next renewal date |
| `manage-plan` | Button | Manage subscription |
| `cancel-subscription` | Button | Cancel subscription |
| `restore-purchases` | Button | Restore purchases |
| `upgrade-subscription` | Button | Upgrade plan |

### Data & Account

| Test ID | Element | Description |
|---------|---------|-------------|
| `data-settings` | Section | Data settings section |
| `download-data` | Button | Download user data |
| `delete-account-button` | Button | Delete account |
| `delete-confirm-input` | Input | Confirmation input |
| `confirm-delete` | Button | Confirm deletion |
| `toggle-pause-account` | Toggle | Pause account |

### Help & Support

| Test ID | Element | Description |
|---------|---------|-------------|
| `help-settings` | Section | Help section |
| `help-center` | Button/Link | Help center |
| `contact-support` | Button | Contact support |
| `faq` | Button/Link | FAQ page |
| `terms-of-service` | Link | Terms of service |
| `privacy-policy` | Link | Privacy policy |
| `community-guidelines` | Link | Community guidelines |

### App Info

| Test ID | Element | Description |
|---------|---------|-------------|
| `app-version` | Text | App version number |
| `save-settings` | Button | Save settings |

---

## Premium/Subscription Page (`/premium`)

| Test ID | Element | Description |
|---------|---------|-------------|
| `premium-page` | Container | Premium page container |
| `plan-card-monthly` | Container | Monthly plan option |
| `plan-card-yearly` | Container | Yearly plan option |
| `plan-price` | Text | Plan price display |
| `plan-features` | List | Features list |
| `select-plan` | Button | Select plan button |
| `payment-form` | Form | Payment form |
| `card-input` | Container | Credit card input |
| `subscribe-button` | Button | Subscribe button |
| `payment-processing` | Element | Processing indicator |
| `payment-success` | Container | Success message |
| `payment-error` | Container | Payment error |

---

## Accessibility Requirements

All test IDs should also support:

1. **Keyboard Navigation**: Elements with test IDs should be focusable where appropriate
2. **ARIA Labels**: Buttons and interactive elements should have `aria-label` for screen readers
3. **Semantic HTML**: Use appropriate HTML elements (`<button>`, `<a>`, `<input>`) not just `<div>`

---

## Implementation Notes

### Adding Test IDs

```tsx
// React/React Native
<button data-testid="login-submit">Log In</button>

// Or with styled-components
<StyledButton data-testid="like-button">Like</StyledButton>
```

### Dynamic Test IDs

For repeated items, use consistent patterns:

```tsx
// List items
{conversations.map((conv, index) => (
  <div data-testid="conversation-item" key={conv.id}>
    {/* content */}
  </div>
))}

// Or with unique identifiers
<div data-testid={`report-reason-${reason.id}`}>
```

### Testing Priority

1. **Critical** - Login, navigation, primary actions (like/pass)
2. **High** - Messaging, profile display, settings
3. **Medium** - Filters, photo management, notifications
4. **Low** - Premium features, analytics elements

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-19 | Initial test ID documentation |
