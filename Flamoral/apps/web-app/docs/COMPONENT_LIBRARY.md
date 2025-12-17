# Flamoral Component Library

**Version 1.0** | **Last Updated: December 2024**

Complete component specifications for the Flamoral Dating Platform design system.

---

## Table of Contents

1. [Core Components](#1-core-components)
2. [Navigation Components](#2-navigation-components)
3. [Layout Components](#3-layout-components)
4. [Content Components](#4-content-components)
5. [Feedback Components](#5-feedback-components)
6. [Specialized Dating Components](#6-specialized-dating-components)
7. [Legal & Policy Components](#7-legal--policy-components)

---

## 1. Core Components

### 1.1 Buttons

Buttons are the primary way users take action in the application.

#### Primary Button

**Purpose:** Main call-to-action, highest emphasis

**Specifications:**
```
Height: 48px
Padding: 16px 32px
Border Radius: 8px
Font: Inter SemiBold 16px
Letter Spacing: 0.02em
Background: linear-gradient(135deg, #D62839 0%, #FF6E35 100%)
Color: #FFF6EE
Shadow: 0 4px 16px rgba(214, 40, 57, 0.25)
```

**States:**
- **Default:** Gradient background, normal shadow
- **Hover:** `transform: translateY(-2px)`, increased shadow `0 6px 24px rgba(214, 40, 57, 0.35)`
- **Active/Pressed:** `transform: translateY(0)`, reduced shadow `0 2px 8px rgba(214, 40, 57, 0.2)`
- **Focus:** Outline `2px solid #D62839`, outline-offset `2px`
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`
- **Loading:** Show spinner, disable interaction

**Variants:**
```
Small: Height 40px, Padding 12px 24px, Font 14px
Large: Height 56px, Padding 20px 40px, Font 18px
Full Width: width: 100%
Icon + Text: Icon 20px, gap 8px
Icon Only: Padding 12px 12px, square
```

**Usage:**
- Primary actions: "Sign Up", "Send Message", "Match Now"
- One primary button per screen/section
- Always label with clear action verb

**Accessibility:**
```html
<button
  type="button"
  class="button button--primary"
  aria-label="Send message to Sarah"
>
  Send Message
</button>
```

---

#### Secondary Button

**Purpose:** Secondary actions, lower emphasis than primary

**Specifications:**
```
Height: 48px
Padding: 16px 32px
Border Radius: 8px
Font: Inter SemiBold 16px
Letter Spacing: 0.02em
Background: #1A1A1A (light mode) / #2A2A2A (dark mode)
Color: #D9A657
Border: 1px solid #D9A657
Shadow: None
```

**States:**
- **Hover:** Background `#2A2A2A` (light) / `#3A3A3A` (dark)
- **Active:** Background `#1A1A1A`, scale `0.98`
- **Focus:** Box shadow `0 0 0 3px rgba(217, 166, 87, 0.3)`
- **Disabled:** `opacity: 0.5`

**Usage:**
- Secondary actions: "View Profile", "Skip", "Maybe Later"
- Pair with primary buttons
- Cancel or alternative actions

---

#### Tertiary Button

**Purpose:** Low-emphasis actions, minimal visual weight

**Specifications:**
```
Height: 48px
Padding: 16px 32px
Border Radius: 8px
Font: Inter SemiBold 16px
Background: transparent
Color: #D62839
Border: none
Shadow: None
```

**States:**
- **Hover:** Background `rgba(214, 40, 57, 0.08)`
- **Active:** Background `rgba(214, 40, 57, 0.12)`
- **Focus:** Box shadow `0 0 0 3px rgba(214, 40, 57, 0.15)`

**Usage:**
- Least important actions: "Learn More", "Details"
- Navigation within content
- Text links in context

---

#### Ghost Button

**Purpose:** Outlined style for subtle emphasis

**Specifications:**
```
Height: 48px
Padding: 16px 32px
Border Radius: 8px
Font: Inter SemiBold 16px
Background: transparent
Color: #D62839
Border: 1px solid #D62839
```

**States:**
- **Hover:** Background `rgba(214, 40, 57, 0.08)`
- **Active:** Background `rgba(214, 40, 57, 0.12)`
- **Focus:** Box shadow `0 0 0 3px rgba(214, 40, 57, 0.15)`

**Usage:**
- Alternative actions
- Card actions
- Modal secondary buttons

---

#### Destructive Button

**Purpose:** Dangerous or irreversible actions

**Specifications:**
```
Height: 48px
Padding: 16px 32px
Border Radius: 8px
Font: Inter SemiBold 16px
Background: #E74C3C
Color: #FFFFFF
Shadow: 0 4px 16px rgba(231, 76, 60, 0.25)
```

**States:**
- **Hover:** Background `#C0392B`, increased shadow
- **Active:** Scale `0.98`
- **Focus:** Box shadow `0 0 0 3px rgba(231, 76, 60, 0.3)`

**Usage:**
- Delete account
- Unmatch
- Block user
- Always require confirmation

---

### 1.2 Input Fields

#### Text Input

**Purpose:** Single-line text entry

**Specifications:**
```
Height: 48px
Padding: 16px
Border Radius: 8px
Font: Inter Regular 16px
Background: #FFFFFF (light) / #2A2A2A (dark)
Border: 1px solid #C4C4C4
Color: #1A1A1A (light) / #FFF6EE (dark)
```

**States:**
- **Default:** Border `#C4C4C4`
- **Hover:** Border `#8A8A8A`
- **Focus:** Border `#D62839`, box-shadow `0 0 0 3px rgba(214, 40, 57, 0.1)`
- **Error:** Border `#E74C3C`, box-shadow `0 0 0 3px rgba(231, 76, 60, 0.1)`
- **Success:** Border `#2ECC71`, icon on right
- **Disabled:** Background `#F5F5F5`, opacity `0.6`

**Variants:**
```
Small: Height 40px, Padding 12px, Font 14px
Large: Height 56px, Padding 20px, Font 18px
With Icon Left: Padding-left 48px
With Icon Right: Padding-right 48px
```

**Structure:**
```html
<div class="form-group">
  <label for="email" class="form-label">
    Email Address <span class="required">*</span>
  </label>
  <input
    type="email"
    id="email"
    class="form-input"
    placeholder="you@example.com"
    aria-required="true"
    aria-invalid="false"
    aria-describedby="email-hint email-error"
  />
  <span id="email-hint" class="form-hint">
    We'll never share your email
  </span>
  <span id="email-error" class="form-error" role="alert">
    <!-- Error message appears here -->
  </span>
</div>
```

---

#### Password Input

**Purpose:** Secure password entry

**Specifications:**
Same as text input with additions:
```
Type: password (toggleable to text)
Right Icon: Eye icon to toggle visibility
Strength Indicator: Optional progress bar below
```

**Additional Features:**
- Password strength indicator
- Toggle visibility button
- Caps lock warning
- Copy/paste handling

**Structure:**
```html
<div class="form-group">
  <label for="password" class="form-label">Password</label>
  <div class="input-wrapper">
    <input
      type="password"
      id="password"
      class="form-input"
      aria-describedby="password-strength"
    />
    <button
      type="button"
      class="input-icon-button"
      aria-label="Toggle password visibility"
    >
      <EyeIcon />
    </button>
  </div>
  <div id="password-strength" class="password-strength">
    <div class="strength-bar" role="progressbar" aria-valuenow="60"></div>
    <span class="strength-label">Medium strength</span>
  </div>
</div>
```

---

#### Email Input

**Purpose:** Email address entry with validation

**Specifications:**
Same as text input with:
```
Type: email
Validation: Email format
Icon: Mail icon (optional)
Autocomplete: email
```

---

#### Phone Input

**Purpose:** Phone number entry with formatting

**Specifications:**
```
Same as text input
Type: tel
Formatting: Auto-format as user types
Country Code: Optional dropdown
Example: (555) 123-4567
```

**Structure:**
```html
<div class="form-group">
  <label for="phone" class="form-label">Phone Number</label>
  <div class="input-group">
    <select class="country-code-select">
      <option value="+1">🇺🇸 +1</option>
      <option value="+44">🇬🇧 +44</option>
    </select>
    <input
      type="tel"
      id="phone"
      class="form-input"
      placeholder="(555) 123-4567"
      autocomplete="tel"
    />
  </div>
</div>
```

---

#### Search Input

**Purpose:** Search and filter functionality

**Specifications:**
```
Height: 48px
Padding: 16px 16px 16px 48px
Border Radius: 24px (full pill)
Font: Inter Regular 16px
Background: #F5F5F5 (light) / #2A2A2A (dark)
Border: none
Left Icon: Search icon, 20px
Clear Button: X icon on right (when has value)
```

**Features:**
- Instant search/filter
- Clear button appears with text
- Loading state in right
- Recent searches dropdown

**Structure:**
```html
<div class="search-wrapper">
  <SearchIcon class="search-icon" />
  <input
    type="search"
    class="search-input"
    placeholder="Search profiles..."
    aria-label="Search profiles"
    autocomplete="off"
  />
  <button
    type="button"
    class="search-clear"
    aria-label="Clear search"
  >
    <XIcon />
  </button>
</div>
```

---

#### Textarea

**Purpose:** Multi-line text entry

**Specifications:**
```
Min Height: 120px
Padding: 16px
Border Radius: 8px
Font: Inter Regular 16px
Background: #FFFFFF (light) / #2A2A2A (dark)
Border: 1px solid #C4C4C4
Resize: vertical
Max Length: Optional character counter
```

**States:**
Same as text input

**Features:**
- Character counter
- Auto-expand option
- Max height constraint

**Structure:**
```html
<div class="form-group">
  <label for="bio" class="form-label">About Me</label>
  <textarea
    id="bio"
    class="form-textarea"
    rows="5"
    maxlength="500"
    placeholder="Tell people about yourself..."
    aria-describedby="bio-counter"
  ></textarea>
  <div id="bio-counter" class="character-counter">
    <span class="current">0</span> / <span class="max">500</span>
  </div>
</div>
```

---

### 1.3 Dropdowns and Selects

#### Standard Select

**Purpose:** Choose one option from a list

**Specifications:**
```
Height: 48px
Padding: 16px
Border Radius: 8px
Font: Inter Regular 16px
Background: #FFFFFF
Border: 1px solid #C4C4C4
Chevron: Down icon on right
```

**States:**
- **Default:** Closed state
- **Hover:** Border `#8A8A8A`
- **Focus:** Border `#D62839`, box-shadow
- **Open:** Show dropdown menu
- **Disabled:** `opacity: 0.6`

**Dropdown Menu:**
```
Max Height: 300px
Border Radius: 8px
Background: #FFFFFF
Shadow: 0 8px 32px rgba(26, 26, 26, 0.16)
Padding: 8px 0
Item Height: 40px
Item Padding: 12px 16px
```

**Structure:**
```html
<div class="form-group">
  <label for="gender" class="form-label">Gender</label>
  <select id="gender" class="form-select">
    <option value="">Select gender...</option>
    <option value="man">Man</option>
    <option value="woman">Woman</option>
    <option value="non-binary">Non-binary</option>
    <option value="other">Other</option>
  </select>
</div>
```

---

#### Multi-Select

**Purpose:** Choose multiple options

**Specifications:**
Same as select with:
```
Selected Items: Displayed as chips
Chip Style: Pills with X to remove
Placeholder: "Select options..."
```

**Structure:**
```html
<div class="form-group">
  <label class="form-label">Interests</label>
  <div class="multi-select">
    <div class="selected-chips">
      <span class="chip">
        Hiking
        <button aria-label="Remove Hiking">×</button>
      </span>
      <span class="chip">
        Cooking
        <button aria-label="Remove Cooking">×</button>
      </span>
    </div>
    <input
      type="text"
      class="multi-select-input"
      placeholder="Add more interests..."
    />
  </div>
  <div class="dropdown-menu">
    <!-- Options list -->
  </div>
</div>
```

---

#### Autocomplete

**Purpose:** Search and select from large lists

**Specifications:**
```
Same as search input
Dropdown: Filtered results
Min Characters: 2 to trigger search
Debounce: 300ms
No Results: "No matches found" state
```

---

### 1.4 Checkboxes

**Purpose:** Multiple selection, binary choices

**Specifications:**
```
Size: 20x20px
Border Radius: 4px
Border: 2px solid #C4C4C4
Background: transparent (unchecked) / #D62839 (checked)
Checkmark: White, 12px
```

**States:**
- **Unchecked:** Empty box
- **Checked:** Filled with checkmark
- **Indeterminate:** Dash icon (for parent checkboxes)
- **Hover:** Border `#D62839`
- **Focus:** Box-shadow `0 0 0 3px rgba(214, 40, 57, 0.15)`
- **Disabled:** `opacity: 0.5`

**Structure:**
```html
<label class="checkbox">
  <input type="checkbox" class="checkbox-input" />
  <span class="checkbox-box"></span>
  <span class="checkbox-label">Remember me</span>
</label>
```

**Group Structure:**
```html
<fieldset class="checkbox-group">
  <legend class="form-label">Interests</legend>
  <label class="checkbox">
    <input type="checkbox" name="interests" value="travel" />
    <span class="checkbox-box"></span>
    <span class="checkbox-label">Travel</span>
  </label>
  <label class="checkbox">
    <input type="checkbox" name="interests" value="music" />
    <span class="checkbox-box"></span>
    <span class="checkbox-label">Music</span>
  </label>
</fieldset>
```

---

### 1.5 Radio Buttons

**Purpose:** Single selection from options

**Specifications:**
```
Size: 20x20px
Border Radius: 50% (circular)
Border: 2px solid #C4C4C4
Background: transparent (unchecked) / #D62839 (selected)
Inner Circle: 8x8px, white
```

**States:**
- **Unselected:** Empty circle
- **Selected:** Filled with inner circle
- **Hover:** Border `#D62839`
- **Focus:** Box-shadow `0 0 0 3px rgba(214, 40, 57, 0.15)`
- **Disabled:** `opacity: 0.5`

**Structure:**
```html
<fieldset class="radio-group">
  <legend class="form-label">Looking for</legend>
  <label class="radio">
    <input type="radio" name="looking-for" value="relationship" />
    <span class="radio-button"></span>
    <span class="radio-label">Serious Relationship</span>
  </label>
  <label class="radio">
    <input type="radio" name="looking-for" value="casual" />
    <span class="radio-button"></span>
    <span class="radio-label">Casual Dating</span>
  </label>
  <label class="radio">
    <input type="radio" name="looking-for" value="friends" />
    <span class="radio-button"></span>
    <span class="radio-label">New Friends</span>
  </label>
</fieldset>
```

**Variants:**
- **Card Style:** Radio button + card container for visual options
- **Button Style:** Toggle button appearance

---

### 1.6 Toggle Switches

**Purpose:** Binary on/off states

**Specifications:**
```
Width: 48px
Height: 28px
Border Radius: 14px (full pill)
Track Background: #C4C4C4 (off) / #D62839 (on)
Thumb: 24x24px circle, white
Thumb Position: Left (off) / Right (on)
```

**States:**
- **Off:** Grey track, thumb left
- **On:** Red track, thumb right
- **Hover:** Slightly darker track
- **Focus:** Box-shadow `0 0 0 3px rgba(214, 40, 57, 0.15)`
- **Disabled:** `opacity: 0.5`, `cursor: not-allowed`

**Animation:**
```
Transition: all 200ms ease
Thumb slides smoothly
Track color fades
```

**Structure:**
```html
<label class="toggle">
  <input type="checkbox" class="toggle-input" />
  <span class="toggle-track">
    <span class="toggle-thumb"></span>
  </span>
  <span class="toggle-label">Enable notifications</span>
</label>
```

**Usage:**
- Settings toggles
- Feature enable/disable
- Privacy controls
- Notification preferences

---

### 1.7 Sliders

#### Range Slider

**Purpose:** Select numeric value from range

**Specifications:**
```
Track Height: 4px
Track Background: #E0E0E0
Active Track: #D62839
Thumb: 20x20px circle, #D62839
Thumb Shadow: 0 2px 8px rgba(214, 40, 57, 0.3)
```

**States:**
- **Default:** Standard appearance
- **Hover:** Thumb scale `1.1`
- **Active/Dragging:** Thumb scale `1.2`
- **Focus:** Thumb box-shadow increased
- **Disabled:** Grey colors, `opacity: 0.5`

**Variants:**

**Single Value:**
```html
<div class="slider-group">
  <label class="slider-label">
    Distance: <span class="slider-value">25 miles</span>
  </label>
  <input
    type="range"
    class="slider"
    min="1"
    max="100"
    value="25"
    aria-label="Maximum distance"
  />
  <div class="slider-markers">
    <span>1</span>
    <span>50</span>
    <span>100+</span>
  </div>
</div>
```

**Range (Two Thumbs):**
```html
<div class="range-slider-group">
  <label class="slider-label">
    Age Range: <span class="slider-value">25-35</span>
  </label>
  <div class="range-slider">
    <input
      type="range"
      min="18"
      max="100"
      value="25"
      aria-label="Minimum age"
    />
    <input
      type="range"
      min="18"
      max="100"
      value="35"
      aria-label="Maximum age"
    />
  </div>
  <div class="slider-markers">
    <span>18</span>
    <span>60</span>
    <span>100+</span>
  </div>
</div>
```

**Usage:**
- Age range filter
- Distance preference
- Height preference
- Any numeric range selection

---

## 2. Navigation Components

### 2.1 Desktop Navbar

**Purpose:** Primary navigation for desktop experiences

**Specifications:**
```
Height: 80px
Background: #FFFFFF (light) / #1A1A1A (dark)
Shadow: 0 2px 8px rgba(26, 26, 26, 0.08)
Padding: 0 64px
Max Width: 100%
Position: Sticky top
Z-Index: 1200
```

**Structure:**
```html
<nav class="navbar" role="navigation">
  <div class="navbar-container">
    <!-- Left: Logo -->
    <a href="/" class="navbar-logo">
      <img src="logo.svg" alt="Flamoral" />
    </a>

    <!-- Center: Primary Navigation -->
    <ul class="navbar-menu">
      <li><a href="/discover" class="navbar-link">Discover</a></li>
      <li><a href="/matches" class="navbar-link">Matches</a></li>
      <li><a href="/messages" class="navbar-link">Messages</a></li>
      <li><a href="/likes" class="navbar-link">Likes</a></li>
    </ul>

    <!-- Right: Actions -->
    <div class="navbar-actions">
      <button class="icon-button" aria-label="Notifications">
        <BellIcon />
        <span class="badge">3</span>
      </button>
      <button class="icon-button" aria-label="Settings">
        <SettingsIcon />
      </button>
      <button class="avatar-button">
        <img src="avatar.jpg" alt="Your profile" />
      </button>
    </div>
  </div>
</nav>
```

**Active State:**
```
Link Color: #D62839
Border Bottom: 3px solid #D62839
Font Weight: SemiBold (600)
```

**Hover State:**
```
Link Color: #D62839
Background: rgba(214, 40, 57, 0.05)
```

---

### 2.2 Mobile Navbar

**Purpose:** Primary navigation for mobile devices

**Specifications:**
```
Height: 64px
Background: #FFFFFF (light) / #1A1A1A (dark)
Shadow: 0 -2px 8px rgba(26, 26, 26, 0.08)
Position: Fixed bottom
Z-Index: 1200
Padding: 8px 16px
```

**Structure:**
```html
<nav class="mobile-navbar" role="navigation">
  <a href="/discover" class="mobile-nav-item">
    <FlameIcon />
    <span>Discover</span>
  </a>
  <a href="/matches" class="mobile-nav-item">
    <HeartIcon />
    <span>Matches</span>
    <span class="badge">5</span>
  </a>
  <a href="/messages" class="mobile-nav-item">
    <MessageIcon />
    <span>Messages</span>
    <span class="badge">2</span>
  </a>
  <a href="/profile" class="mobile-nav-item">
    <UserIcon />
    <span>Profile</span>
  </a>
</nav>
```

**Nav Item:**
```
Width: 25% (4 items)
Flex Direction: Column
Icon: 24px
Label: 11px, Inter SemiBold
Gap: 4px
Padding: 8px
Active Color: #D62839
Inactive Color: #8A8A8A
```

---

### 2.3 Hamburger Menu

**Purpose:** Expandable navigation drawer on mobile

**Specifications:**

**Button:**
```
Size: 44x44px
Icon: 24px (three horizontal lines)
Position: Top left
Color: #1A1A1A (light) / #FFF6EE (dark)
```

**Drawer:**
```
Width: 280px
Height: 100vh
Background: #FFFFFF (light) / #1A1A1A (dark)
Shadow: 0 0 32px rgba(0, 0, 0, 0.3)
Position: Fixed left
Z-Index: 1400
Animation: Slide in from left, 300ms
```

**Structure:**
```html
<!-- Hamburger Button -->
<button class="hamburger" aria-label="Open menu" aria-expanded="false">
  <span></span>
  <span></span>
  <span></span>
</button>

<!-- Drawer -->
<div class="drawer" role="dialog" aria-modal="true">
  <div class="drawer-header">
    <button class="drawer-close" aria-label="Close menu">
      <XIcon />
    </button>
  </div>

  <nav class="drawer-nav">
    <a href="/profile" class="drawer-link">My Profile</a>
    <a href="/settings" class="drawer-link">Settings</a>
    <a href="/preferences" class="drawer-link">Preferences</a>
    <hr class="drawer-divider" />
    <a href="/help" class="drawer-link">Help & Support</a>
    <a href="/safety" class="drawer-link">Safety Tips</a>
    <hr class="drawer-divider" />
    <button class="drawer-link drawer-link--danger">Sign Out</button>
  </nav>
</div>

<!-- Backdrop -->
<div class="drawer-backdrop" aria-hidden="true"></div>
```

---

### 2.4 Tab Navigation

**Purpose:** Switch between related content sections

**Specifications:**
```
Height: 48px
Background: transparent
Border Bottom: 1px solid #E0E0E0
```

**Tab:**
```
Padding: 12px 24px
Font: Inter SemiBold 14px
Color: #8A8A8A (inactive) / #D62839 (active)
Border Bottom: 3px solid transparent (inactive) / #D62839 (active)
```

**Structure:**
```html
<div class="tabs" role="tablist">
  <button
    role="tab"
    class="tab"
    aria-selected="true"
    aria-controls="panel-1"
  >
    About
  </button>
  <button
    role="tab"
    class="tab"
    aria-selected="false"
    aria-controls="panel-2"
  >
    Photos
  </button>
  <button
    role="tab"
    class="tab"
    aria-selected="false"
    aria-controls="panel-3"
  >
    Interests
  </button>
</div>

<div id="panel-1" role="tabpanel" aria-labelledby="tab-1">
  <!-- Content -->
</div>
```

**Variants:**
- **Pills:** Rounded background instead of underline
- **Buttons:** Full button appearance
- **Vertical:** Stack tabs vertically

---

### 2.5 Breadcrumbs

**Purpose:** Show navigation hierarchy and location

**Specifications:**
```
Height: 32px
Font: Inter Regular 14px
Color: #8A8A8A
Separator: / or chevron icon
Gap: 8px
```

**Structure:**
```html
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol class="breadcrumb-list">
    <li class="breadcrumb-item">
      <a href="/">Home</a>
    </li>
    <li class="breadcrumb-separator">/</li>
    <li class="breadcrumb-item">
      <a href="/settings">Settings</a>
    </li>
    <li class="breadcrumb-separator">/</li>
    <li class="breadcrumb-item breadcrumb-item--current" aria-current="page">
      Privacy
    </li>
  </ol>
</nav>
```

**Current Item:**
```
Color: #1A1A1A
Font Weight: Medium (500)
Not clickable
```

---

### 2.6 Pagination

**Purpose:** Navigate through paged content

**Specifications:**
```
Height: 40px
Gap: 8px
Alignment: Center
```

**Button:**
```
Size: 40x40px
Border Radius: 8px
Font: Inter Medium 14px
Background: transparent (inactive) / #D62839 (active)
Color: #1A1A1A (inactive) / #FFF6EE (active)
Border: 1px solid #E0E0E0 (inactive) / none (active)
```

**Structure:**
```html
<nav class="pagination" aria-label="Pagination">
  <button class="pagination-button" aria-label="Previous page">
    <ChevronLeftIcon />
  </button>

  <button class="pagination-button">1</button>
  <button class="pagination-button pagination-button--active" aria-current="page">
    2
  </button>
  <button class="pagination-button">3</button>
  <span class="pagination-ellipsis">...</span>
  <button class="pagination-button">10</button>

  <button class="pagination-button" aria-label="Next page">
    <ChevronRightIcon />
  </button>
</nav>
```

**Variants:**
- **Simple:** Just Previous/Next buttons
- **Compact:** Show current page number only
- **Load More:** Single button to load more content

---

## 3. Layout Components

### 3.1 Page Container

**Purpose:** Main content wrapper with consistent margins

**Specifications:**
```
Max Width: 1280px
Margin: 0 auto
Padding: 0 16px (mobile) / 0 32px (tablet) / 0 64px (desktop)
```

**Structure:**
```html
<div class="container">
  <main class="main-content">
    <!-- Page content -->
  </main>
</div>
```

**Variants:**
- **Narrow:** max-width: 720px (for reading content)
- **Wide:** max-width: 1440px (for dashboards)
- **Fluid:** max-width: 100% (full width)

---

### 3.2 Section Layout

**Purpose:** Vertical content sections with consistent spacing

**Specifications:**
```
Padding: 64px 0 (mobile) / 96px 0 (desktop)
Background: Can alternate between surface colors
```

**Structure:**
```html
<section class="section">
  <div class="container">
    <header class="section-header">
      <h2 class="section-title">Section Title</h2>
      <p class="section-description">Optional description</p>
    </header>
    <div class="section-content">
      <!-- Content -->
    </div>
  </div>
</section>
```

---

### 3.3 Grid System

**Purpose:** Responsive column layouts

**Specifications:**
```
Columns: 12 (desktop) / 8 (tablet) / 4 (mobile)
Gutter: 24px (desktop/tablet) / 16px (mobile)
```

**Structure:**
```html
<div class="grid">
  <div class="col-12 col-md-6 col-lg-4">
    <!-- Takes 12 cols on mobile, 6 on tablet, 4 on desktop -->
  </div>
  <div class="col-12 col-md-6 col-lg-4">
    <!-- Content -->
  </div>
  <div class="col-12 col-md-6 col-lg-4">
    <!-- Content -->
  </div>
</div>
```

**Column Classes:**
```
col-1 through col-12
col-sm-1 through col-sm-12 (≥640px)
col-md-1 through col-md-12 (≥768px)
col-lg-1 through col-lg-12 (≥1024px)
col-xl-1 through col-xl-12 (≥1280px)
```

---

### 3.4 Cards

#### Standard Card

**Purpose:** Container for related content

**Specifications:**
```
Background: #FFFFFF (light) / #2A2A2A (dark)
Border Radius: 16px
Padding: 24px
Shadow: 0 4px 16px rgba(26, 26, 26, 0.08)
```

**Structure:**
```html
<article class="card">
  <div class="card-content">
    <h3 class="card-title">Card Title</h3>
    <p class="card-description">Card description text.</p>
  </div>
  <footer class="card-footer">
    <button class="button-secondary">Action</button>
  </footer>
</article>
```

**States:**
- **Default:** Standard appearance
- **Hover:** `transform: translateY(-2px)`, increased shadow
- **Active:** Pressed state if clickable
- **Focus:** Outline when navigable

---

#### Image Card

**Purpose:** Card with prominent image

**Specifications:**
```
Same as standard card
Image: Full width, 16px border-radius on top
Aspect Ratio: 16:9 or 4:3
Object Fit: cover
```

**Structure:**
```html
<article class="card card--image">
  <div class="card-image">
    <img src="image.jpg" alt="Description" />
  </div>
  <div class="card-content">
    <h3 class="card-title">Title</h3>
    <p class="card-description">Description</p>
  </div>
</article>
```

---

### 3.5 Modals and Dialogs

**Purpose:** Focus user attention on specific tasks

**Specifications:**

**Backdrop:**
```
Background: rgba(0, 0, 0, 0.7)
Z-Index: 1300
Position: Fixed, full screen
Animation: Fade in 200ms
```

**Modal:**
```
Max Width: 500px (small) / 720px (medium) / 960px (large)
Background: #FFFFFF (light) / #2A2A2A (dark)
Border Radius: 16px
Shadow: 0 8px 32px rgba(26, 26, 26, 0.16)
Padding: 0
Z-Index: 1400
Position: Fixed, centered
Animation: Scale + fade in 300ms
```

**Structure:**
```html
<!-- Backdrop -->
<div class="modal-backdrop" aria-hidden="true"></div>

<!-- Modal -->
<div
  class="modal"
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <header class="modal-header">
    <h2 id="modal-title" class="modal-title">Modal Title</h2>
    <button class="modal-close" aria-label="Close modal">
      <XIcon />
    </button>
  </header>

  <div class="modal-body">
    <!-- Modal content -->
  </div>

  <footer class="modal-footer">
    <button class="button-secondary">Cancel</button>
    <button class="button-primary">Confirm</button>
  </footer>
</div>
```

**Header:**
```
Padding: 24px
Border Bottom: 1px solid #E0E0E0
```

**Body:**
```
Padding: 24px
Max Height: calc(100vh - 200px)
Overflow: auto
```

**Footer:**
```
Padding: 24px
Border Top: 1px solid #E0E0E0
Display: flex
Justify Content: flex-end
Gap: 12px
```

**Variants:**
- **Alert:** Simple message with OK button
- **Confirm:** Message with Cancel/Confirm actions
- **Form:** Contains form elements
- **Full Screen (Mobile):** 100% width/height on mobile

---

### 3.6 Drawers and Sidebars

**Purpose:** Side panel for additional content or navigation

**Specifications:**

**Drawer:**
```
Width: 320px (mobile) / 400px (desktop)
Height: 100vh
Background: #FFFFFF (light) / #1A1A1A (dark)
Shadow: 0 0 32px rgba(0, 0, 0, 0.3)
Position: Fixed
Z-Index: 1400
Animation: Slide in 300ms
```

**Positions:**
- **Left:** Slide from left
- **Right:** Slide from right
- **Bottom:** Sheet from bottom (mobile)

**Structure:**
```html
<!-- Backdrop -->
<div class="drawer-backdrop"></div>

<!-- Drawer -->
<aside
  class="drawer drawer--right"
  role="dialog"
  aria-modal="true"
  aria-labelledby="drawer-title"
>
  <header class="drawer-header">
    <h2 id="drawer-title">Drawer Title</h2>
    <button class="drawer-close" aria-label="Close">
      <XIcon />
    </button>
  </header>

  <div class="drawer-body">
    <!-- Content -->
  </div>

  <footer class="drawer-footer">
    <button class="button-primary button--full">Save</button>
  </footer>
</aside>
```

**Sidebar (Persistent):**
```
Width: 280px
Height: 100vh
Background: #F5F5F5 (light) / #2A2A2A (dark)
Position: Fixed or sticky
Border Right: 1px solid #E0E0E0
```

---

## 4. Content Components

### 4.1 Profile Cards

#### Compact Profile Card

**Purpose:** Quick profile preview in lists

**Specifications:**
```
Width: 100%
Height: 120px
Background: #FFFFFF
Border Radius: 16px
Padding: 16px
Shadow: 0 2px 8px rgba(26, 26, 26, 0.08)
Layout: Horizontal (image + content)
```

**Structure:**
```html
<article class="profile-card profile-card--compact">
  <div class="profile-image">
    <img src="photo.jpg" alt="Sarah, 28" />
    <span class="online-indicator" aria-label="Online now"></span>
  </div>

  <div class="profile-content">
    <div class="profile-header">
      <h3 class="profile-name">Sarah, 28</h3>
      <span class="verified-badge" aria-label="Verified">
        <CheckIcon />
      </span>
    </div>

    <p class="profile-location">
      <LocationIcon /> 2 miles away
    </p>

    <div class="profile-tags">
      <span class="tag">Coffee Lover</span>
      <span class="tag">Hiking</span>
    </div>
  </div>

  <div class="profile-actions">
    <button class="icon-button" aria-label="Like">
      <HeartIcon />
    </button>
  </div>
</article>
```

**Image:**
```
Size: 88x88px
Border Radius: 12px
Object Fit: cover
```

---

#### Expanded Profile Card

**Purpose:** Detailed profile view for discovery

**Specifications:**
```
Aspect Ratio: 3:4
Max Width: 400px
Background: #FFFFFF
Border Radius: 24px
Shadow: 0 8px 32px rgba(26, 26, 26, 0.12)
Overflow: hidden
```

**Structure:**
```html
<article class="profile-card profile-card--expanded">
  <!-- Image Gallery -->
  <div class="profile-gallery">
    <div class="gallery-image" style="background-image: url(...)">
      <div class="gallery-indicators">
        <span class="indicator indicator--active"></span>
        <span class="indicator"></span>
        <span class="indicator"></span>
      </div>
    </div>
    <button class="gallery-prev" aria-label="Previous photo">
      <ChevronLeftIcon />
    </button>
    <button class="gallery-next" aria-label="Next photo">
      <ChevronRightIcon />
    </button>
  </div>

  <!-- Info Overlay -->
  <div class="profile-info">
    <div class="profile-header">
      <div>
        <h2 class="profile-name">Sarah Miller, 28</h2>
        <p class="profile-subtitle">
          <LocationIcon /> 2 miles away
        </p>
      </div>
      <button class="icon-button icon-button--white" aria-label="More info">
        <InfoIcon />
      </button>
    </div>

    <div class="profile-bio">
      <p>Adventure seeker, coffee enthusiast, and dog lover...</p>
    </div>

    <div class="profile-details">
      <div class="detail-item">
        <span class="detail-icon"><BriefcaseIcon /></span>
        <span>Product Designer</span>
      </div>
      <div class="detail-item">
        <span class="detail-icon"><AcademicIcon /></span>
        <span>Stanford University</span>
      </div>
    </div>

    <div class="profile-tags">
      <span class="tag">Coffee Lover</span>
      <span class="tag">Hiking</span>
      <span class="tag">Photography</span>
      <span class="tag">Travel</span>
    </div>
  </div>
</article>
```

**Info Overlay:**
```
Position: Absolute bottom
Background: linear-gradient(transparent, rgba(0,0,0,0.7))
Color: #FFFFFF
Padding: 24px
```

---

### 4.2 Match Cards

**Purpose:** Display match information

**Specifications:**
```
Width: 100%
Background: #FFFFFF
Border Radius: 16px
Padding: 16px
Shadow: 0 4px 16px rgba(26, 26, 26, 0.08)
```

**Structure:**
```html
<article class="match-card">
  <div class="match-photos">
    <img src="photo1.jpg" alt="Your photo" class="match-photo match-photo--you" />
    <div class="match-heart">
      <HeartIcon />
    </div>
    <img src="photo2.jpg" alt="Sarah's photo" class="match-photo match-photo--them" />
  </div>

  <div class="match-content">
    <h3 class="match-title">It's a Match!</h3>
    <p class="match-description">
      You and Sarah liked each other
    </p>
    <time class="match-time" datetime="2024-12-12">
      Just now
    </time>
  </div>

  <div class="match-actions">
    <button class="button-primary button--full">
      Send Message
    </button>
    <button class="button-ghost">
      Keep Swiping
    </button>
  </div>
</article>
```

**Match Photos:**
```
Display: flex
Gap: -20px (overlapping)
Each Photo: 80x80px circle
Border: 3px solid #FFFFFF
```

**Match Heart:**
```
Size: 48px circle
Background: #D62839
Color: #FFFFFF
Position: Center overlap
Z-Index: 2
```

---

### 4.3 Message Bubbles

**Purpose:** Chat message display

**Specifications:**

**Sent Message (You):**
```
Max Width: 70%
Align: Right
Background: linear-gradient(135deg, #D62839 0%, #FF6E35 100%)
Color: #FFF6EE
Border Radius: 18px 18px 4px 18px
Padding: 12px 16px
Margin Bottom: 8px
```

**Received Message (Them):**
```
Max Width: 70%
Align: Left
Background: #F5F5F5 (light) / #2A2A2A (dark)
Color: #1A1A1A (light) / #FFF6EE (dark)
Border Radius: 18px 18px 18px 4px
Padding: 12px 16px
Margin Bottom: 8px
```

**Structure:**
```html
<div class="message-list">
  <!-- Received message -->
  <div class="message message--received">
    <img src="avatar.jpg" alt="Sarah" class="message-avatar" />
    <div class="message-bubble">
      <p class="message-text">Hey! How are you?</p>
      <time class="message-time">10:30 AM</time>
    </div>
  </div>

  <!-- Sent message -->
  <div class="message message--sent">
    <div class="message-bubble">
      <p class="message-text">Hi! I'm great, thanks for asking!</p>
      <time class="message-time">
        10:32 AM <CheckIcon class="message-status" />
      </time>
    </div>
  </div>

  <!-- Date divider -->
  <div class="message-divider">
    <span>Today</span>
  </div>

  <!-- Image message -->
  <div class="message message--sent">
    <div class="message-bubble message-bubble--image">
      <img src="photo.jpg" alt="Shared photo" />
      <time class="message-time">10:35 AM</time>
    </div>
  </div>
</div>
```

**Message States:**
- **Sending:** Opacity 0.6, spinner icon
- **Sent:** Check icon
- **Delivered:** Double check icon
- **Read:** Double check icon (blue)

---

### 4.4 Notification Items

**Purpose:** Display notification content

**Specifications:**
```
Width: 100%
Min Height: 72px
Background: #FFFFFF (unread) / #F5F5F5 (read)
Border Bottom: 1px solid #E0E0E0
Padding: 16px
```

**Structure:**
```html
<article class="notification" aria-label="Notification">
  <div class="notification-icon">
    <HeartIcon />
  </div>

  <div class="notification-content">
    <p class="notification-text">
      <strong>Sarah</strong> liked your photo
    </p>
    <time class="notification-time" datetime="2024-12-12T10:30">
      2 hours ago
    </time>
  </div>

  <div class="notification-image">
    <img src="photo.jpg" alt="Photo liked" />
  </div>

  <button class="notification-close" aria-label="Dismiss">
    <XIcon />
  </button>
</article>
```

**Types:**
- **Match:** Heart icon, flame gradient background
- **Message:** Message icon, blue accent
- **Like:** Heart icon, coral accent
- **Visit:** Eye icon, grey accent
- **System:** Bell icon, default styling

**Unread Indicator:**
```
Position: Absolute left
Width: 4px
Height: 100%
Background: #D62839
```

---

### 4.5 Testimonial Cards

**Purpose:** Display user testimonials

**Specifications:**
```
Width: 100%
Max Width: 400px
Background: #FFFFFF
Border Radius: 16px
Padding: 32px
Shadow: 0 4px 16px rgba(26, 26, 26, 0.08)
Text Align: Center
```

**Structure:**
```html
<article class="testimonial-card">
  <div class="testimonial-quote-icon">
    <QuoteIcon />
  </div>

  <blockquote class="testimonial-quote">
    "I met my partner on Flamoral after just two weeks.
    The matching algorithm really works!"
  </blockquote>

  <footer class="testimonial-footer">
    <img src="avatar.jpg" alt="" class="testimonial-avatar" />
    <div class="testimonial-author">
      <cite class="testimonial-name">Jessica & Mike</cite>
      <p class="testimonial-meta">Together for 2 years</p>
    </div>
  </footer>
</article>
```

**Quote Icon:**
```
Size: 32px
Color: #D9A657
Opacity: 0.3
Margin Bottom: 16px
```

---

### 4.6 Pricing Cards

**Purpose:** Display subscription pricing tiers

**Specifications:**
```
Width: 100%
Max Width: 350px
Background: #FFFFFF
Border Radius: 16px
Padding: 32px
Shadow: 0 4px 16px rgba(26, 26, 26, 0.08)
Text Align: Center
```

**Structure:**
```html
<article class="pricing-card">
  <div class="pricing-badge">MOST POPULAR</div>

  <h3 class="pricing-title">Premium</h3>
  <p class="pricing-description">
    All features to find your perfect match
  </p>

  <div class="pricing-price">
    <span class="price-currency">$</span>
    <span class="price-amount">29</span>
    <span class="price-period">/month</span>
  </div>

  <ul class="pricing-features">
    <li class="feature">
      <CheckIcon /> Unlimited likes
    </li>
    <li class="feature">
      <CheckIcon /> See who likes you
    </li>
    <li class="feature">
      <CheckIcon /> Priority matching
    </li>
    <li class="feature">
      <CheckIcon /> Ad-free experience
    </li>
    <li class="feature">
      <CheckIcon /> Read receipts
    </li>
  </ul>

  <button class="button-primary button--full">
    Get Premium
  </button>

  <p class="pricing-note">
    Cancel anytime. No commitments.
  </p>
</article>
```

**Premium Variant:**
```
Border: 2px solid #D9A657
Background: linear-gradient(145deg, #FFF6EE, #FFFFFF)
Box Shadow: 0 8px 32px rgba(217, 166, 87, 0.2)
Transform: scale(1.05) (on desktop)
```

---

### 4.7 Feature Highlight Cards

**Purpose:** Showcase app features

**Specifications:**
```
Width: 100%
Background: #FFFFFF
Border Radius: 16px
Padding: 24px
Shadow: 0 2px 8px rgba(26, 26, 26, 0.08)
Text Align: Center
```

**Structure:**
```html
<article class="feature-card">
  <div class="feature-icon">
    <ShieldIcon />
  </div>

  <h3 class="feature-title">Verified Profiles</h3>

  <p class="feature-description">
    All profiles are verified to ensure authentic connections
    and a safer dating experience.
  </p>

  <a href="/features/verification" class="feature-link">
    Learn more <ArrowRightIcon />
  </a>
</article>
```

**Icon Container:**
```
Size: 64px circle
Background: linear-gradient(135deg, #D62839 0%, #FF6E35 100%)
Color: #FFFFFF
Margin: 0 auto 16px
Icon Size: 32px
```

---

## 5. Feedback Components

### 5.1 Loading Spinners

**Purpose:** Indicate loading state

**Specifications:**

**Standard Spinner:**
```
Size: 40px
Border: 4px
Color: #D62839
Animation: Spin 1s linear infinite
```

**Structure:**
```html
<div class="spinner" role="status" aria-label="Loading">
  <span class="sr-only">Loading...</span>
</div>
```

**CSS:**
```css
.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(214, 40, 57, 0.2);
  border-top-color: #D62839;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

**Variants:**
- **Small:** 20px
- **Large:** 60px
- **Button:** 20px, inside button
- **Overlay:** Centered on overlay

---

### 5.2 Progress Bars

**Purpose:** Show task completion progress

**Specifications:**
```
Height: 8px
Width: 100%
Background: #E0E0E0
Border Radius: 4px
Overflow: hidden
```

**Fill:**
```
Height: 100%
Background: linear-gradient(90deg, #D62839 0%, #FF6E35 100%)
Transition: width 300ms ease
```

**Structure:**
```html
<div class="progress" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">
  <div class="progress-fill" style="width: 60%"></div>
</div>

<p class="progress-label">
  Profile completion: <strong>60%</strong>
</p>
```

**Variants:**
- **Thin:** Height 4px
- **Thick:** Height 12px
- **With Label:** Label inside bar
- **Striped:** Animated stripes for indeterminate

---

### 5.3 Toast Notifications

**Purpose:** Brief feedback messages

**Specifications:**
```
Max Width: 400px
Min Height: 56px
Background: #1A1A1A (default) / semantic colors
Color: #FFFFFF
Border Radius: 8px
Padding: 16px
Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
Position: Fixed
Z-Index: 1700
Animation: Slide in + fade, 300ms
```

**Position:**
- **Mobile:** Bottom center, above nav
- **Desktop:** Top right

**Structure:**
```html
<div
  class="toast toast--success"
  role="alert"
  aria-live="polite"
>
  <div class="toast-icon">
    <CheckIcon />
  </div>

  <div class="toast-content">
    <p class="toast-message">Profile updated successfully!</p>
  </div>

  <button class="toast-close" aria-label="Dismiss">
    <XIcon />
  </button>
</div>
```

**Types:**
```
Success: Background #2ECC71, CheckIcon
Error: Background #E74C3C, XCircleIcon
Warning: Background #F39C12, AlertIcon
Info: Background #3498DB, InfoIcon
Default: Background #1A1A1A, no icon
```

**Behavior:**
- Auto-dismiss after 5 seconds
- Swipe to dismiss
- Stack multiple toasts
- Pause on hover

---

### 5.4 Error States

**Purpose:** Display error conditions

**Specifications:**

**Inline Error:**
```html
<div class="form-group form-group--error">
  <label for="email" class="form-label">Email</label>
  <input
    type="email"
    id="email"
    class="form-input form-input--error"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <span id="email-error" class="form-error" role="alert">
    <AlertIcon /> Please enter a valid email address
  </span>
</div>
```

**Error Message:**
```
Color: #E74C3C
Font: Inter Regular 14px
Icon: 16px, aligned left
Gap: 8px
Margin Top: 8px
```

**Full Page Error:**
```html
<div class="error-page">
  <div class="error-content">
    <div class="error-icon">
      <AlertCircleIcon />
    </div>
    <h1 class="error-title">Something went wrong</h1>
    <p class="error-description">
      We're sorry, but something unexpected happened.
      Please try again.
    </p>
    <div class="error-actions">
      <button class="button-primary">Try Again</button>
      <a href="/" class="button-ghost">Go Home</a>
    </div>
  </div>
</div>
```

**Error Types:**
- **Form Validation:** Inline with form field
- **API Error:** Toast notification
- **Page Error:** Full page with retry
- **Network Error:** Banner at top

---

### 5.5 Empty States

**Purpose:** Guide users when no content exists

**Specifications:**
```
Text Align: Center
Padding: 64px 32px
```

**Structure:**
```html
<div class="empty-state">
  <img
    src="illustration.svg"
    alt=""
    class="empty-state-image"
    width="240"
    height="180"
  />

  <h3 class="empty-state-title">No messages yet</h3>

  <p class="empty-state-description">
    When you match with someone, you'll be able to
    start a conversation here.
  </p>

  <button class="button-primary">Find Matches</button>
</div>
```

**Illustration:**
```
Max Width: 240px
Margin: 0 auto 24px
Color: Match brand palette
Style: Simple, friendly
```

**Empty State Types:**
- **No Content:** New user, empty list
- **No Results:** Search/filter with no matches
- **No Permissions:** Access restricted
- **Completed:** All items processed

---

### 5.6 Success States

**Purpose:** Confirm successful actions

**Specifications:**

**Inline Success:**
```html
<div class="form-group form-group--success">
  <label for="username" class="form-label">Username</label>
  <input
    type="text"
    id="username"
    class="form-input form-input--success"
    value="sarah_miller"
  />
  <span class="form-success">
    <CheckIcon /> Username is available!
  </span>
</div>
```

**Success Message:**
```
Color: #2ECC71
Font: Inter Regular 14px
Icon: 16px CheckIcon
Gap: 8px
Margin Top: 8px
```

**Full Page Success:**
```html
<div class="success-page">
  <div class="success-content">
    <div class="success-icon">
      <CheckCircleIcon />
    </div>
    <h1 class="success-title">Welcome to Flamoral!</h1>
    <p class="success-description">
      Your account has been created successfully.
      Let's complete your profile to find great matches.
    </p>
    <button class="button-primary">Complete Profile</button>
  </div>
</div>
```

**Success Animation:**
- Check icon scales in with bounce
- Confetti for major successes (matches)
- Subtle glow effect

---

## 6. Specialized Dating Components

### 6.1 Swipe Card Stack

**Purpose:** Tinder-style card swiping interface

**Specifications:**
```
Card Size: 90vw max-width 400px
Aspect Ratio: 3:4
Stack: 3 cards visible
Z-Index: Decreasing stack order
Transform: Scale and rotate for depth
```

**Structure:**
```html
<div class="swipe-stack">
  <!-- Top card (active) -->
  <div class="swipe-card swipe-card--active" style="z-index: 3">
    <!-- Profile card content -->
  </div>

  <!-- Second card -->
  <div class="swipe-card" style="z-index: 2; transform: scale(0.95) translateY(10px)">
    <!-- Profile preview -->
  </div>

  <!-- Third card -->
  <div class="swipe-card" style="z-index: 1; transform: scale(0.9) translateY(20px)">
    <!-- Profile preview -->
  </div>
</div>

<!-- Swipe actions -->
<div class="swipe-actions">
  <button class="swipe-button swipe-button--pass" aria-label="Pass">
    <XIcon />
  </button>

  <button class="swipe-button swipe-button--superlike" aria-label="Super like">
    <StarIcon />
  </button>

  <button class="swipe-button swipe-button--like" aria-label="Like">
    <HeartIcon />
  </button>
</div>
```

**Swipe Indicators:**
```html
<!-- Overlays on card during swipe -->
<div class="swipe-indicator swipe-indicator--like">
  <span class="indicator-text">LIKE</span>
</div>

<div class="swipe-indicator swipe-indicator--pass">
  <span class="indicator-text">NOPE</span>
</div>
```

**Like Indicator:**
```
Position: Absolute top-left
Color: #2ECC71
Border: 4px solid
Font: Inter Bold 24px
Rotation: -20deg
Opacity: 0 to 1 (based on swipe distance)
```

**Pass Indicator:**
```
Position: Absolute top-right
Color: #E74C3C
Border: 4px solid
Font: Inter Bold 24px
Rotation: 20deg
Opacity: 0 to 1 (based on swipe distance)
```

**Gestures:**
- **Swipe Right:** Like (>40% screen width)
- **Swipe Left:** Pass (<-40% screen width)
- **Swipe Up:** Super Like (>30% screen height)
- **Tap:** View full profile
- **Drag:** Show indicators

---

### 6.2 Match Animation

**Purpose:** Celebrate successful matches

**Specifications:**
```
Duration: 2 seconds
Full Screen: Fixed overlay
Background: rgba(0, 0, 0, 0.9)
Z-Index: 2000
```

**Structure:**
```html
<div class="match-celebration">
  <div class="match-animation">
    <!-- Confetti canvas -->
    <canvas class="confetti-canvas"></canvas>

    <!-- Photos -->
    <div class="match-photos-animation">
      <img
        src="your-photo.jpg"
        alt="Your photo"
        class="match-photo match-photo--left"
      />
      <div class="match-heart-burst">
        <HeartIcon />
      </div>
      <img
        src="their-photo.jpg"
        alt="Their photo"
        class="match-photo match-photo--right"
      />
    </div>

    <!-- Text -->
    <h1 class="match-title">It's a Match!</h1>

    <!-- Actions -->
    <div class="match-actions">
      <button class="button-primary button--large">
        Send Message
      </button>
      <button class="button-ghost">
        Keep Swiping
      </button>
    </div>
  </div>
</div>
```

**Animation Sequence:**
1. Fade in background (200ms)
2. Photos slide in from sides (400ms)
3. Heart burst in center (300ms)
4. Title slides up (300ms)
5. Actions fade in (300ms)
6. Confetti falls throughout

**Photos Animation:**
```
Start: Scale 0.5, off-screen
End: Scale 1, centered position
Easing: Spring ease
Border: 4px solid white
Shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
```

---

### 6.3 Profile Photo Gallery

**Purpose:** Browse profile photos with indicators

**Specifications:**
```
Container: Full width of card
Aspect Ratio: 3:4
Object Fit: cover
```

**Structure:**
```html
<div class="photo-gallery">
  <!-- Current photo -->
  <div class="gallery-photo" style="background-image: url(...)">
    <!-- Tap zones for navigation -->
    <button
      class="gallery-tap-zone gallery-tap-zone--prev"
      aria-label="Previous photo"
    ></button>
    <button
      class="gallery-tap-zone gallery-tap-zone--next"
      aria-label="Next photo"
    ></button>
  </div>

  <!-- Indicators -->
  <div class="gallery-indicators">
    <span class="indicator indicator--active" aria-label="Photo 1 of 5"></span>
    <span class="indicator" aria-label="Photo 2 of 5"></span>
    <span class="indicator" aria-label="Photo 3 of 5"></span>
    <span class="indicator" aria-label="Photo 4 of 5"></span>
    <span class="indicator" aria-label="Photo 5 of 5"></span>
  </div>

  <!-- Optional: Arrow buttons -->
  <button class="gallery-arrow gallery-arrow--prev">
    <ChevronLeftIcon />
  </button>
  <button class="gallery-arrow gallery-arrow--next">
    <ChevronRightIcon />
  </button>
</div>
```

**Indicators:**
```
Position: Absolute top, 12px from top
Display: flex
Gap: 4px
Padding: 0 12px
Width: 100%
Justify Content: center
```

**Single Indicator:**
```
Height: 3px
Width: Divided by number of photos
Background: rgba(255, 255, 255, 0.5)
Border Radius: 2px
Active: rgba(255, 255, 255, 1)
Transition: 200ms
```

**Tap Zones:**
```
Width: 50%
Height: 100%
Position: Absolute
Transparent background
Cursor: pointer
```

---

### 6.4 Verification Badges

**Purpose:** Show verified profile status

**Specifications:**

**Badge Icon:**
```
Size: 20x20px (small) / 24x24px (medium)
Background: #2ECC71
Color: #FFFFFF
Border Radius: 50%
Icon: Check or shield
Border: 2px solid #FFFFFF (when on image)
```

**Variations:**

**Standard Verified:**
```html
<span class="verified-badge" aria-label="Verified profile">
  <CheckIcon />
</span>
```

**Photo Verified:**
```html
<span class="verified-badge verified-badge--photo" aria-label="Photo verified">
  <CameraIcon />
</span>
```

**Identity Verified:**
```html
<span class="verified-badge verified-badge--identity" aria-label="Identity verified">
  <ShieldIcon />
</span>
```

**Placement:**
- Next to name in profile cards
- Corner of profile photo
- In profile header

**Badge with Tooltip:**
```html
<span
  class="verified-badge"
  aria-label="Verified profile"
  data-tooltip="Profile verified by Flamoral"
>
  <CheckIcon />
</span>
```

---

### 6.5 Online Status Indicators

**Purpose:** Show user's online status

**Specifications:**
```
Size: 12x12px
Border Radius: 50%
Border: 2px solid #FFFFFF
Position: Absolute (bottom-right of avatar)
```

**States:**
```
Online: Background #2ECC71
Away: Background #F39C12
Offline: Background #8A8A8A (or hidden)
Busy: Background #E74C3C
```

**Structure:**
```html
<div class="avatar-wrapper">
  <img src="avatar.jpg" alt="Sarah" class="avatar" />
  <span
    class="status-indicator status-indicator--online"
    aria-label="Online now"
  ></span>
</div>
```

**Pulsing Animation (Online):**
```css
@keyframes pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.7);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(46, 204, 113, 0);
  }
}

.status-indicator--online {
  animation: pulse 2s infinite;
}
```

---

### 6.6 Typing Indicators

**Purpose:** Show when someone is typing a message

**Specifications:**
```
Height: 40px
Padding: 12px 16px
Background: #F5F5F5 (light) / #2A2A2A (dark)
Border Radius: 18px 18px 18px 4px
Display: Inline-block
```

**Structure:**
```html
<div class="typing-indicator" aria-live="polite" aria-label="Sarah is typing">
  <span class="typing-dot"></span>
  <span class="typing-dot"></span>
  <span class="typing-dot"></span>
</div>
```

**Dots:**
```
Size: 8px circles
Background: #8A8A8A
Gap: 4px
Animation: Wave pattern
```

**Animation:**
```css
@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.7;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}

.typing-dot:nth-child(1) {
  animation: typing 1.4s infinite;
}

.typing-dot:nth-child(2) {
  animation: typing 1.4s infinite 0.2s;
}

.typing-dot:nth-child(3) {
  animation: typing 1.4s infinite 0.4s;
}
```

---

## 7. Legal & Policy Components

### 7.1 Cookie Consent Banner

**Purpose:** GDPR-compliant cookie consent

**Specifications:**
```
Position: Fixed bottom
Width: 100%
Background: #FFFFFF (light) / #2A2A2A (dark)
Shadow: 0 -2px 16px rgba(26, 26, 26, 0.12)
Padding: 24px
Z-Index: 1700
```

**Structure:**
```html
<div class="cookie-banner" role="dialog" aria-labelledby="cookie-title">
  <div class="cookie-content">
    <h3 id="cookie-title" class="cookie-title">
      We value your privacy
    </h3>
    <p class="cookie-description">
      We use cookies to enhance your experience, analyze site traffic,
      and personalize content. By clicking "Accept All", you consent
      to our use of cookies.
    </p>
  </div>

  <div class="cookie-actions">
    <a href="/privacy" class="button-ghost button--small">
      Learn More
    </a>
    <button class="button-secondary button--small">
      Customize
    </button>
    <button class="button-primary button--small">
      Accept All
    </button>
  </div>
</div>
```

**Mobile Adjustments:**
```
Stack buttons vertically
Full-width buttons
Reduced padding (16px)
```

---

### 7.2 Policy Update Banner

**Purpose:** Notify users of policy changes

**Specifications:**
```
Position: Fixed top (or below navbar)
Width: 100%
Background: #3498DB (info blue)
Color: #FFFFFF
Padding: 16px 24px
Z-Index: 1200
```

**Structure:**
```html
<div class="policy-banner" role="alert">
  <div class="policy-content">
    <InfoIcon class="policy-icon" />
    <p class="policy-text">
      <strong>We've updated our Terms of Service.</strong>
      Please review the changes to continue using Flamoral.
    </p>
  </div>

  <div class="policy-actions">
    <a href="/terms" class="button-ghost button--small button--inverse">
      Review Changes
    </a>
    <button class="policy-close" aria-label="Dismiss">
      <XIcon />
    </button>
  </div>
</div>
```

**Variants:**
- **Info:** Blue background (policy updates)
- **Warning:** Orange background (action required)
- **Error:** Red background (account issues)

---

### 7.3 Age Verification Modal

**Purpose:** Verify user's age before access

**Specifications:**
```
Modal: Cannot be dismissed without verification
Max Width: 500px
Background: #FFFFFF
Border Radius: 16px
Padding: 32px
```

**Structure:**
```html
<div class="modal modal--no-dismiss" role="alertdialog" aria-labelledby="age-title">
  <header class="modal-header">
    <h2 id="age-title" class="modal-title">
      Age Verification Required
    </h2>
  </header>

  <div class="modal-body">
    <p class="modal-description">
      You must be at least 18 years old to use Flamoral.
      Please verify your date of birth to continue.
    </p>

    <form class="age-verification-form">
      <div class="form-row">
        <div class="form-group">
          <label for="month" class="form-label">Month</label>
          <select id="month" class="form-select" required>
            <option value="">Month</option>
            <option value="1">January</option>
            <!-- ... -->
          </select>
        </div>

        <div class="form-group">
          <label for="day" class="form-label">Day</label>
          <select id="day" class="form-select" required>
            <option value="">Day</option>
            <option value="1">1</option>
            <!-- ... -->
          </select>
        </div>

        <div class="form-group">
          <label for="year" class="form-label">Year</label>
          <select id="year" class="form-select" required>
            <option value="">Year</option>
            <option value="2006">2006</option>
            <!-- ... -->
          </select>
        </div>
      </div>

      <button type="submit" class="button-primary button--full">
        Verify Age
      </button>
    </form>

    <p class="form-note">
      Your date of birth will not be publicly displayed.
    </p>
  </div>
</div>
```

**Error State:**
```html
<div class="age-error" role="alert">
  <AlertIcon />
  <p>You must be at least 18 years old to use Flamoral.</p>
</div>
```

---

### 7.4 Safety Guidelines Card

**Purpose:** Provide safety tips and resources

**Specifications:**
```
Width: 100%
Background: #FFF6EE (light) / #2A2A2A (dark)
Border: 1px solid #D9A657
Border Radius: 12px
Padding: 24px
```

**Structure:**
```html
<article class="safety-card">
  <header class="safety-header">
    <div class="safety-icon">
      <ShieldIcon />
    </div>
    <h3 class="safety-title">Stay Safe on Flamoral</h3>
  </header>

  <div class="safety-content">
    <ul class="safety-list">
      <li class="safety-item">
        <CheckIcon class="safety-check" />
        <span>Always meet in public places for first dates</span>
      </li>
      <li class="safety-item">
        <CheckIcon class="safety-check" />
        <span>Tell a friend or family member your plans</span>
      </li>
      <li class="safety-item">
        <CheckIcon class="safety-check" />
        <span>Never share financial information</span>
      </li>
      <li class="safety-item">
        <CheckIcon class="safety-check" />
        <span>Report suspicious behavior immediately</span>
      </li>
    </ul>

    <a href="/safety" class="safety-link">
      Read Full Safety Guidelines <ArrowRightIcon />
    </a>
  </div>
</article>
```

**Icon Styling:**
```
Size: 48px
Background: #D9A657
Color: #1A1A1A
Border Radius: 50%
Padding: 12px
Margin Bottom: 16px
```

---

## Appendix

### Component Usage Matrix

| Component | Mobile | Tablet | Desktop | Touch | Keyboard | Screen Reader |
|-----------|--------|--------|---------|-------|----------|---------------|
| Buttons | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Inputs | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Modals | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Swipe Cards | ✓ | ✓ | Mouse | ✓ | Arrow Keys | ✓ |
| Toasts | ✓ | ✓ | ✓ | Swipe | Escape | ✓ |

### Resources

- **Figma Library:** [Link to Figma]
- **Storybook:** [Link to Storybook]
- **Code Repository:** [Link to GitHub]
- **Design Tokens:** `DESIGN_TOKENS.json`

### Support

For component questions or requests:
- Design System Team: design-system@flamoral.com
- Slack: #design-system
- Documentation: [Internal wiki link]

---

*Copyright 2024 Flamoral. All rights reserved.*
