# Flamoral Design System

**Version 1.0** | **Last Updated: December 2024**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Principles](#2-design-principles)
3. [Foundation](#3-foundation)
4. [Color System](#4-color-system)
5. [Typography](#5-typography)
6. [Spacing & Layout](#6-spacing--layout)
7. [Elevation & Shadows](#7-elevation--shadows)
8. [Motion & Animation](#8-motion--animation)
9. [Accessibility](#9-accessibility)
10. [Theming](#10-theming)
11. [Design Patterns](#11-design-patterns)
12. [Implementation Guide](#12-implementation-guide)

---

## 1. Introduction

### 1.1 About This System

The Flamoral Design System is a comprehensive framework for creating consistent, accessible, and beautiful user experiences across the Flamoral Dating Platform. This system serves as the single source of truth for design decisions, component specifications, and implementation guidelines.

### 1.2 Who Should Use This

- **Designers:** Creating new features and experiences
- **Developers:** Implementing UI components
- **Product Managers:** Understanding design capabilities
- **QA Engineers:** Validating visual consistency
- **Content Writers:** Understanding UI constraints

### 1.3 System Goals

1. **Consistency:** Unified experience across all touchpoints
2. **Efficiency:** Faster design and development workflows
3. **Quality:** High-quality, accessible experiences
4. **Scalability:** Easy to extend and maintain
5. **Brand Alignment:** True to Flamoral's brand identity

### 1.4 Version History

| Version | Date | Changes | Author |
|---------|------|---------|---------|
| 1.0 | Dec 2024 | Initial release | Design Team |

---

## 2. Design Principles

### 2.1 Authentic Connection

> Design experiences that foster genuine human connections, not superficial interactions.

**In Practice:**
- Prioritize meaningful profile information over vanity metrics
- Design for quality matches, not quantity
- Use warm, inviting visual language
- Avoid gamification that diminishes authenticity

### 2.2 Emotional Intelligence

> Understand and respond to the emotional journey of dating.

**In Practice:**
- Provide clear feedback and guidance
- Reduce anxiety with helpful microcopy
- Celebrate meaningful moments (matches, first messages)
- Handle rejection gracefully

### 2.3 Inclusive by Design

> Create experiences accessible to everyone, regardless of ability or identity.

**In Practice:**
- WCAG 2.1 AA compliance minimum
- Support diverse gender identities and orientations
- Design for various relationship goals
- Consider cultural differences

### 2.4 Premium Yet Approachable

> Balance sophistication with warmth and accessibility.

**In Practice:**
- Use refined typography and spacious layouts
- Maintain playful moments without sacrificing elegance
- Premium feel doesn't mean inaccessible
- Quality over flashiness

### 2.5 Mobile-First, Desktop-Ready

> Optimize for mobile while leveraging desktop capabilities.

**In Practice:**
- Touch-friendly target sizes (minimum 44x44px)
- Progressive enhancement for larger screens
- Responsive images and layouts
- Consider one-handed mobile usage

---

## 3. Foundation

### 3.1 Base Unit System

The entire system is built on a **4px base unit**, ensuring mathematical harmony and consistent spacing.

```
1 unit = 4px
2 units = 8px
4 units = 16px
6 units = 24px
8 units = 32px
12 units = 48px
16 units = 64px
24 units = 96px
```

**Why 4px?**
- Divides evenly for all screen densities (@1x, @2x, @3x)
- Provides enough granularity without too many options
- Industry standard for modern UI design

### 3.2 Grid System

#### Desktop Grid (≥1024px)
- **Columns:** 12
- **Gutter:** 24px
- **Margin:** 64px (min), flexible (max)
- **Max Width:** 1280px

#### Tablet Grid (640px - 1023px)
- **Columns:** 8
- **Gutter:** 24px
- **Margin:** 32px

#### Mobile Grid (<640px)
- **Columns:** 4
- **Gutter:** 16px
- **Margin:** 16px

### 3.3 Breakpoints

```css
/* Mobile First Approach */
$breakpoint-mobile: 320px;
$breakpoint-mobile-lg: 480px;
$breakpoint-tablet: 640px;
$breakpoint-tablet-lg: 768px;
$breakpoint-desktop: 1024px;
$breakpoint-desktop-lg: 1280px;
$breakpoint-desktop-xl: 1536px;
```

### 3.4 Container Widths

| Breakpoint | Container Width |
|------------|-----------------|
| Mobile | 100% - 32px |
| Tablet | 100% - 64px |
| Desktop | 100% - 128px |
| Desktop Max | 1280px |

---

## 4. Color System

### 4.1 Color Philosophy

The Flamoral color palette evokes warmth, passion, and authenticity while maintaining accessibility and professional polish.

**Core Concepts:**
- **Warmth:** Reds, oranges, and golds create inviting experiences
- **Contrast:** Sufficient contrast for readability and accessibility
- **Hierarchy:** Color guides attention to important elements
- **Emotion:** Colors support the emotional journey of dating

### 4.2 Primary Colors

#### Flame Red
```
HEX: #D62839
RGB: 214, 40, 57
HSL: 354°, 69%, 50%
Usage: Primary CTAs, key highlights, brand moments
```

The heart of our brand. Use for primary actions, important notifications, and moments that matter.

#### Ember Orange
```
HEX: #FF6E35
RGB: 255, 110, 53
HSL: 17°, 100%, 60%
Usage: Secondary actions, warmth accents, gradients
```

The warmth complement. Use for secondary interactions and to soften the intensity of Flame Red.

#### Velvet Wine
```
HEX: #7A1020
RGB: 122, 16, 32
HSL: 351°, 77%, 27%
Usage: Premium features, dark mode primary, depth accents
```

The premium anchor. Use for upscale features, dark mode, and creating depth.

#### Rich Charcoal
```
HEX: #1A1A1A
RGB: 26, 26, 26
HSL: 0°, 0%, 10%
Usage: Primary text, dark backgrounds
```

The foundation. Primary text color and dark mode background.

#### Ember Gold
```
HEX: #D9A657
RGB: 217, 166, 87
HSL: 36°, 62%, 60%
Usage: Premium badges, special features, highlights
```

The premium accent. Use for VIP badges, special achievements, and premium tier features.

### 4.3 Secondary Colors

#### Blush Coral
```
HEX: #E45C5C
RGB: 228, 92, 92
HSL: 0°, 72%, 63%
Usage: Soft accents, like indicators, notifications
```

#### Copper
```
HEX: #C77A45
RGB: 199, 122, 69
HSL: 24°, 53%, 53%
Usage: Earthy accents, profile elements
```

#### Smoke Grey
```
HEX: #C4C4C4
RGB: 196, 196, 196
HSL: 0°, 0%, 77%
Usage: Borders, dividers, disabled states
```

#### Soft Ivory
```
HEX: #FFF6EE
RGB: 255, 246, 238
HSL: 28°, 100%, 97%
Usage: Light mode backgrounds, cards
```

### 4.4 Neutral Scale

```
Grey 900: #1A1A1A (Primary text)
Grey 800: #2A2A2A (Dark surfaces)
Grey 700: #3A3A3A (Elevated dark surfaces)
Grey 600: #666666 (Secondary text light mode)
Grey 500: #8A8A8A (Tertiary text)
Grey 400: #AAAAAA (Placeholder text)
Grey 300: #C4C4C4 (Borders)
Grey 200: #E0E0E0 (Dividers)
Grey 100: #F5F5F5 (Light backgrounds)
White: #FFFFFF (Surfaces)
Black: #000000 (Use sparingly)
```

### 4.5 Semantic Colors

#### Success
```
HEX: #2ECC71
Usage: Success messages, verified badges, positive actions
Contrast: 4.5:1 on white (AA compliant)
```

#### Warning
```
HEX: #F39C12
Usage: Warnings, cautionary messages, attention needed
Contrast: 3.2:1 on white (Large text AA)
```

#### Error
```
HEX: #E74C3C
Usage: Error messages, destructive actions, validation errors
Contrast: 4.8:1 on white (AA compliant)
```

#### Info
```
HEX: #3498DB
Usage: Informational messages, tips, helpful hints
Contrast: 4.6:1 on white (AA compliant)
```

### 4.6 Gradients

#### Flamoral Primary
```css
background: linear-gradient(135deg, #D62839 0%, #FF6E35 100%);
```
**Usage:** Primary buttons, hero sections, key CTAs

#### Velvet Night
```css
background: linear-gradient(135deg, #7A1020 0%, #1A1A1A 100%);
```
**Usage:** Dark mode premium elements, overlays

#### Blush Ember
```css
background: linear-gradient(135deg, #E45C5C 0%, #D9A657 100%);
```
**Usage:** Secondary elements, soft highlights

#### Gold Glow
```css
background: linear-gradient(135deg, #D9A657 0%, #C77A45 100%);
```
**Usage:** Premium badges, VIP elements

### 4.7 Color Usage Guidelines

#### Light Mode
```
Background: #FFF6EE (Soft Ivory)
Surface: #FFFFFF
Elevated Surface: #FFFFFF + shadow
Text Primary: #1A1A1A
Text Secondary: #666666
Text Tertiary: #8A8A8A
Primary Action: #D62839
Accent: #FF6E35
```

#### Dark Mode
```
Background: #1A1A1A (Rich Charcoal)
Surface: #2A2A2A
Elevated Surface: #3A3A3A
Text Primary: #FFF6EE
Text Secondary: #AAAAAA
Text Tertiary: #8A8A8A
Primary Action: #D62839
Accent: #D9A657
```

### 4.8 Accessibility Contrast

All color combinations must meet **WCAG 2.1 AA** standards minimum:

| Color Combination | Contrast | Rating | Usage |
|-------------------|----------|--------|-------|
| Rich Charcoal on Soft Ivory | 14.5:1 | AAA | Body text |
| Flame Red on Soft Ivory | 5.2:1 | AA | Buttons, links |
| Flame Red on White | 5.5:1 | AA | CTAs |
| Ember Gold on Rich Charcoal | 6.1:1 | AA | Premium badges |
| Soft Ivory on Velvet Wine | 7.8:1 | AAA | Dark CTAs |
| Success Green on White | 4.5:1 | AA | Success states |

**Testing Tools:**
- WebAIM Contrast Checker
- Stark plugin for Figma
- Chrome DevTools Accessibility

---

## 5. Typography

### 5.1 Typography Philosophy

Typography is the voice of our brand. We use two typefaces to balance elegance with functionality:

- **Playfair Display:** Sophisticated serif for headlines and marketing
- **Inter:** Highly legible sans-serif for UI and body text

### 5.2 Typeface Specifications

#### Playfair Display
```
Style: Serif
Weights: Regular (400), Medium (500), Bold (700)
Usage: Headlines, hero text, section titles, marketing copy
Fallback: Georgia, serif
License: Open Font License
```

**Character:**
- Elegant and sophisticated
- High contrast letterforms
- Excellent for large display text
- Evokes romance and premium quality

#### Inter
```
Style: Sans-serif
Weights: Regular (400), Medium (500), SemiBold (600), Bold (700)
Usage: Body text, UI elements, forms, navigation, buttons
Fallback: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif
License: Open Font License
```

**Character:**
- Highly legible at all sizes
- Optimized for digital screens
- Excellent kerning and spacing
- Professional and approachable

### 5.3 Type Scale

| Level | Size | Line Height | Weight | Font | Usage |
|-------|------|-------------|--------|------|-------|
| **H1** | 48px (3rem) | 1.2 (57.6px) | Bold (700) | Playfair | Page titles, hero headlines |
| **H2** | 36px (2.25rem) | 1.25 (45px) | Bold (700) | Playfair | Section headlines |
| **H3** | 28px (1.75rem) | 1.3 (36.4px) | SemiBold (600) | Playfair | Subsection titles |
| **H4** | 24px (1.5rem) | 1.35 (32.4px) | SemiBold (600) | Inter | Card titles, feature headers |
| **H5** | 20px (1.25rem) | 1.4 (28px) | SemiBold (600) | Inter | Small section headers |
| **H6** | 18px (1.125rem) | 1.45 (26.1px) | Medium (500) | Inter | List headers, labels |
| **Body Large** | 18px (1.125rem) | 1.6 (28.8px) | Regular (400) | Inter | Intro paragraphs, callouts |
| **Body** | 16px (1rem) | 1.6 (25.6px) | Regular (400) | Inter | Standard body text |
| **Body Small** | 14px (0.875rem) | 1.5 (21px) | Regular (400) | Inter | Secondary text, captions |
| **Caption** | 12px (0.75rem) | 1.4 (16.8px) | Regular (400) | Inter | Image captions, metadata |
| **Overline** | 11px (0.6875rem) | 1.3 (14.3px) | SemiBold (600) | Inter | Labels, tags, overlines |

### 5.4 Responsive Typography

Typography scales down on smaller screens to maintain readability:

| Element | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|---------|-----------------|---------------------|-------------------|
| H1 | 32px | 40px | 48px |
| H2 | 28px | 32px | 36px |
| H3 | 22px | 26px | 28px |
| H4 | 20px | 22px | 24px |
| H5 | 18px | 19px | 20px |
| H6 | 16px | 17px | 18px |
| Body | 16px | 16px | 16px |

### 5.5 Letter Spacing (Tracking)

| Style | Tracking | Usage |
|-------|----------|-------|
| Headlines (Playfair) | -0.02em | H1, H2, H3 |
| Subheadings | -0.01em | H4, H5 |
| Body Text | 0em | Body, Body Large |
| Buttons | 0.02em | Button text, CTAs |
| Captions | 0.01em | Caption text |
| Overline | 0.1em | Overline, tags, labels |

### 5.6 Text Styles

#### Primary Text
```css
color: #1A1A1A; /* Light mode */
color: #FFF6EE; /* Dark mode */
opacity: 1;
```

#### Secondary Text
```css
color: #666666; /* Light mode */
color: #AAAAAA; /* Dark mode */
opacity: 1;
```

#### Tertiary Text
```css
color: #8A8A8A;
opacity: 1;
```

#### Disabled Text
```css
color: #C4C4C4;
opacity: 0.5;
```

#### Link Text
```css
color: #D62839;
text-decoration: none;

&:hover {
  text-decoration: underline;
  color: #7A1020;
}
```

### 5.7 Text Alignment

- **Left-aligned:** Default for all body text and most UI elements
- **Center-aligned:** Headlines, hero sections, empty states, modals
- **Right-aligned:** Numerical data, timestamps (in some contexts)
- **Justified:** Never use (creates uneven spacing)

### 5.8 Text Truncation

#### Single Line
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

#### Multi-Line (3 lines)
```css
display: -webkit-box;
-webkit-line-clamp: 3;
-webkit-box-orient: vertical;
overflow: hidden;
```

### 5.9 Readability Guidelines

- **Optimal Line Length:** 50-75 characters per line
- **Paragraph Spacing:** 1em between paragraphs
- **Minimum Touch Target:** 44x44px for interactive text
- **Avoid:** All caps for body text (hurts readability)
- **Use:** Sentence case for most UI elements
- **Use:** Title case for major headings

---

## 6. Spacing & Layout

### 6.1 Spacing Philosophy

Consistent spacing creates visual rhythm and hierarchy. All spacing values are multiples of 4px.

### 6.2 Spacing Scale

| Token | Value | Usage Examples |
|-------|-------|----------------|
| `space-xs` | 4px | Icon padding, tight element spacing |
| `space-sm` | 8px | Related elements, chip padding |
| `space-md` | 16px | Standard spacing, button padding |
| `space-lg` | 24px | Card padding, section gaps |
| `space-xl` | 32px | Major sections, form groups |
| `space-2xl` | 48px | Page sections, hero padding |
| `space-3xl` | 64px | Major page sections |
| `space-4xl` | 96px | Hero sections, major breaks |

### 6.3 Component Spacing

#### Buttons
```
Padding: 16px 32px (md)
Small: 12px 24px
Large: 20px 40px
Icon-only: 12px 12px (square)
```

#### Cards
```
Padding: 24px (lg)
Compact: 16px (md)
Spacious: 32px (xl)
```

#### Inputs
```
Padding: 16px (md)
Small: 12px
Large: 20px
```

#### Sections
```
Vertical: 64px - 96px (3xl - 4xl)
Horizontal: 16px - 64px (responsive)
```

### 6.4 Layout Patterns

#### Content Width
```css
/* Standard content */
max-width: 1280px;
margin: 0 auto;

/* Reading content */
max-width: 720px;
margin: 0 auto;

/* Full width sections */
max-width: 100%;
```

#### Safe Areas
```css
/* Mobile */
padding-left: max(16px, env(safe-area-inset-left));
padding-right: max(16px, env(safe-area-inset-right));

/* Tablet */
padding-left: max(32px, env(safe-area-inset-left));
padding-right: max(32px, env(safe-area-inset-right));
```

### 6.5 Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius-none` | 0px | Sharp edges, specific design needs |
| `radius-sm` | 4px | Inputs, small buttons, tags |
| `radius-md` | 8px | Cards, standard buttons, containers |
| `radius-lg` | 16px | Large cards, modals, sheets |
| `radius-xl` | 24px | Feature cards, special containers |
| `radius-full` | 9999px | Pills, avatars, badges, circular elements |

### 6.6 Z-Index Scale

| Layer | Value | Usage |
|-------|-------|-------|
| Base | 0 | Default document flow |
| Dropdown | 1000 | Dropdown menus, selects |
| Sticky | 1100 | Sticky headers, toolbars |
| Fixed | 1200 | Fixed navigation, floating buttons |
| Modal Backdrop | 1300 | Modal overlay backgrounds |
| Modal | 1400 | Modal dialogs |
| Popover | 1500 | Popovers, tooltips |
| Tooltip | 1600 | Tooltips (highest layer for context) |
| Toast | 1700 | Toast notifications |

---

## 7. Elevation & Shadows

### 7.1 Elevation Philosophy

Elevation creates depth and hierarchy through shadows. Use sparingly for maximum impact.

### 7.2 Shadow Scale

#### Soft (Level 1)
```css
box-shadow: 0 2px 8px rgba(26, 26, 26, 0.08);
```
**Usage:** Subtle elevation, hover states, gentle floating

**Examples:** Input focus, card hover preview

#### Medium (Level 2)
```css
box-shadow: 0 4px 16px rgba(26, 26, 26, 0.12);
```
**Usage:** Standard cards, buttons, elevated surfaces

**Examples:** Profile cards, standard modals, dropdown menus

#### Strong (Level 3)
```css
box-shadow: 0 8px 32px rgba(26, 26, 26, 0.16);
```
**Usage:** Prominent elements, important modals, floating panels

**Examples:** Navigation drawers, important dialogs, image galleries

#### Glow (Interactive)
```css
box-shadow: 0 4px 24px rgba(214, 40, 57, 0.3);
```
**Usage:** Primary button hover, active states, special highlights

**Examples:** Primary CTA hover, match celebration

#### Premium (Special)
```css
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```
**Usage:** Premium features, VIP cards, special promotions

**Examples:** Premium subscription cards, VIP profile highlights

### 7.3 Dark Mode Shadows

In dark mode, shadows are less visible. Increase contrast with lighter shadows or borders:

```css
/* Dark mode shadow enhancement */
box-shadow:
  0 4px 16px rgba(0, 0, 0, 0.4),
  0 0 0 1px rgba(255, 255, 255, 0.05);
```

### 7.4 Shadow Animation

```css
transition: box-shadow 200ms ease-decelerate;

&:hover {
  box-shadow: 0 8px 32px rgba(26, 26, 26, 0.16);
}
```

---

## 8. Motion & Animation

### 8.1 Motion Philosophy

Motion should be purposeful, subtle, and respectful of user preferences. Animations enhance understanding and delight but should never distract or delay.

### 8.2 Animation Principles

1. **Purposeful:** Every animation serves a function
2. **Subtle:** Avoid jarring or excessive motion
3. **Fast:** Keep animations quick (100-400ms typically)
4. **Consistent:** Same interactions = same animations
5. **Performant:** Use transform and opacity only
6. **Accessible:** Respect `prefers-reduced-motion`

### 8.3 Duration Scale

| Token | Duration | Usage |
|-------|----------|-------|
| `instant` | 100ms | Color changes, opacity fades |
| `fast` | 200ms | Hover states, small elements |
| `normal` | 300ms | Most transitions, standard interactions |
| `slow` | 400ms | Large elements, modals, sheets |
| `glacial` | 600ms | Page transitions, special animations |

### 8.4 Easing Functions

#### Standard
```css
cubic-bezier(0.4, 0, 0.2, 1)
```
**Usage:** Most interactions, general purpose

#### Decelerate
```css
cubic-bezier(0, 0, 0.2, 1)
```
**Usage:** Elements entering the screen

#### Accelerate
```css
cubic-bezier(0.4, 0, 1, 1)
```
**Usage:** Elements exiting the screen

#### Spring
```css
cubic-bezier(0.175, 0.885, 0.32, 1.275)
```
**Usage:** Playful interactions (likes, matches)

### 8.5 Common Animations

#### Button Press
```css
.button {
  transition: transform 100ms ease;

  &:active {
    transform: scale(0.98);
  }
}
```

#### Card Hover
```css
.card {
  transition: all 200ms cubic-bezier(0, 0, 0.2, 1);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(26, 26, 26, 0.16);
  }
}
```

#### Fade In
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

animation: fadeIn 300ms cubic-bezier(0, 0, 0.2, 1);
```

#### Like Heart
```css
@keyframes heartPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

animation: heartPop 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

#### Match Celebration
```css
@keyframes matchGlow {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

animation: matchGlow 600ms cubic-bezier(0.175, 0.885, 0.32, 1.275);
```

### 8.6 Reduced Motion

Always respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Accessibility

### 9.1 Accessibility Standards

Flamoral adheres to **WCAG 2.1 Level AA** as a minimum standard, with AAA compliance where possible.

### 9.2 Color Contrast

**Minimum Requirements:**
- **Normal Text:** 4.5:1 contrast ratio
- **Large Text (18px+):** 3:1 contrast ratio
- **UI Components:** 3:1 contrast ratio
- **Focus Indicators:** 3:1 contrast ratio

### 9.3 Focus States

All interactive elements must have visible focus indicators:

```css
/* Focus ring */
&:focus-visible {
  outline: 2px solid #D62839;
  outline-offset: 2px;
  border-radius: inherit;
}

/* Alternative: Focus shadow */
&:focus-visible {
  box-shadow: 0 0 0 3px rgba(214, 40, 57, 0.3);
}
```

### 9.4 Touch Targets

**Minimum Size:** 44x44px for all interactive elements

```css
/* Ensure minimum touch target */
min-width: 44px;
min-height: 44px;
padding: 12px 16px;
```

### 9.5 Screen Reader Support

#### Semantic HTML
```html
<!-- Good: Semantic elements -->
<button>Submit</button>
<nav>...</nav>
<main>...</main>

<!-- Bad: Non-semantic -->
<div onclick="...">Submit</div>
```

#### ARIA Labels
```html
<!-- Icon-only button -->
<button aria-label="Like profile">
  <HeartIcon />
</button>

<!-- Loading state -->
<div role="status" aria-live="polite">
  Loading profiles...
</div>

<!-- Error message -->
<div role="alert" aria-live="assertive">
  Please enter a valid email address
</div>
```

### 9.6 Keyboard Navigation

**Tab Order:** Logical and predictable
**Skip Links:** Provide "Skip to content" links
**Escape Key:** Close modals and overlays
**Arrow Keys:** Navigate through lists and carousels

```html
<!-- Skip link -->
<a href="#main-content" class="skip-link">
  Skip to main content
</a>

<main id="main-content">
  <!-- Content -->
</main>
```

### 9.7 Form Accessibility

```html
<!-- Proper label association -->
<label for="email">Email Address</label>
<input
  type="email"
  id="email"
  name="email"
  aria-required="true"
  aria-invalid="false"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">
  <!-- Error message if applicable -->
</span>

<!-- Required field indicator -->
<label for="name">
  Name <span aria-label="required">*</span>
</label>
```

### 9.8 Loading States

```html
<button disabled aria-busy="true">
  <span role="status" aria-live="polite">
    Loading...
  </span>
</button>
```

### 9.9 Alternative Text

```html
<!-- Profile photo -->
<img
  src="profile.jpg"
  alt="Sarah, 28, smiling in a park"
/>

<!-- Decorative image -->
<img
  src="decoration.svg"
  alt=""
  role="presentation"
/>

<!-- Icon with text -->
<button>
  <HeartIcon aria-hidden="true" />
  <span>Like</span>
</button>
```

---

## 10. Theming

### 10.1 Light and Dark Modes

Flamoral supports both light and dark modes, with automatic detection of system preferences.

#### Light Mode (Default)
```css
:root {
  --bg-primary: #FFF6EE;
  --bg-surface: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #666666;
  --accent-primary: #D62839;
  --accent-secondary: #FF6E35;
}
```

#### Dark Mode
```css
:root[data-theme="dark"] {
  --bg-primary: #1A1A1A;
  --bg-surface: #2A2A2A;
  --text-primary: #FFF6EE;
  --text-secondary: #AAAAAA;
  --accent-primary: #D62839;
  --accent-secondary: #D9A657;
}
```

#### System Preference Detection
```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    /* Apply dark mode tokens */
  }
}
```

### 10.2 Theme Toggle Implementation

```typescript
// Detect system preference
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

// Apply theme
function setTheme(theme: 'light' | 'dark' | 'auto') {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
  localStorage.setItem('theme', theme);
}

// Listen for system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (localStorage.getItem('theme') === 'auto') {
    // Update automatically
  }
});
```

### 10.3 Image Handling in Dark Mode

```css
/* Reduce brightness of photos in dark mode */
:root[data-theme="dark"] img {
  filter: brightness(0.9);
}

/* Invert logos if needed */
:root[data-theme="dark"] .logo-dark {
  filter: invert(1);
}
```

---

## 11. Design Patterns

### 11.1 Card Pattern

Cards are the primary container for content.

```html
<div class="card">
  <img src="..." alt="..." class="card-image" />
  <div class="card-content">
    <h3 class="card-title">Title</h3>
    <p class="card-description">Description</p>
  </div>
  <div class="card-actions">
    <button class="button-secondary">Action</button>
  </div>
</div>
```

### 11.2 Form Pattern

Consistent form layout with clear validation.

```html
<form class="form">
  <div class="form-group">
    <label for="input" class="form-label">Label</label>
    <input type="text" id="input" class="form-input" />
    <span class="form-hint">Helpful hint</span>
    <span class="form-error">Error message</span>
  </div>
</form>
```

### 11.3 Empty State Pattern

Guide users when there's no content.

```html
<div class="empty-state">
  <img src="illustration.svg" alt="" class="empty-state-image" />
  <h3 class="empty-state-title">No matches yet</h3>
  <p class="empty-state-description">
    Keep swiping to find your perfect match!
  </p>
  <button class="button-primary">Start Swiping</button>
</div>
```

### 11.4 Loading Pattern

Clear feedback during loading states.

```html
<div class="loading">
  <div class="spinner"></div>
  <p>Loading profiles...</p>
</div>
```

---

## 12. Implementation Guide

### 12.1 CSS Variables

Use CSS custom properties for theming:

```css
:root {
  /* Colors */
  --color-flame-red: #D62839;
  --color-ember-orange: #FF6E35;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;

  /* Typography */
  --font-heading: 'Playfair Display', Georgia, serif;
  --font-body: 'Inter', -apple-system, sans-serif;

  /* Animation */
  --duration-fast: 200ms;
  --easing-standard: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### 12.2 Utility Classes

```css
/* Spacing utilities */
.mt-md { margin-top: var(--space-md); }
.p-lg { padding: var(--space-lg); }

/* Typography utilities */
.text-h1 { font-size: 48px; line-height: 1.2; }
.text-body { font-size: 16px; line-height: 1.6; }

/* Color utilities */
.bg-flame { background-color: var(--color-flame-red); }
.text-charcoal { color: var(--color-rich-charcoal); }
```

### 12.3 Component Naming

Use BEM methodology:

```css
/* Block */
.card { }

/* Element */
.card__title { }
.card__content { }

/* Modifier */
.card--premium { }
.card--compact { }
```

### 12.4 Responsive Design

Mobile-first approach:

```css
/* Mobile first (default) */
.card {
  padding: 16px;
}

/* Tablet and up */
@media (min-width: 640px) {
  .card {
    padding: 24px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .card {
    padding: 32px;
  }
}
```

### 12.5 Design Token Usage

Import and use design tokens:

```typescript
import tokens from './design-tokens.json';

const primaryColor = tokens.color.primary.flameRed.value;
const spacing = tokens.spacing.md.value;
```

### 12.6 Figma Integration

1. **Install Tokens Plugin:** Figma Tokens or similar
2. **Import JSON:** Load DESIGN_TOKENS.json
3. **Sync Regularly:** Keep Figma and code in sync
4. **Version Control:** Track token changes in git

---

## Appendix

### A. Resources

- **Design Tokens:** `/docs/DESIGN_TOKENS.json`
- **Component Library:** `/docs/COMPONENT_LIBRARY.md`
- **Figma Components:** `/docs/FIGMA_COMPONENTS.md`
- **Brand Guidelines:** `/apps/branding/flamoral-brand-guidelines.md`

### B. Tools

- **Figma:** Primary design tool
- **Tokens Studio:** Design token management
- **Stark:** Accessibility contrast checking
- **Chromatic:** Visual testing
- **Storybook:** Component development

### C. Support

For questions or contributions:
- Design Team: design@flamoral.com
- Design System: design-system@flamoral.com
- GitHub Issues: [Link to repo]

---

*Copyright 2024 Flamoral. All rights reserved.*
