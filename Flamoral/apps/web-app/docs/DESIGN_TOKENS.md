# Flamoral Design Tokens - Landing Page

**Version**: 1.0.0
**Date**: December 12, 2025
**Status**: Production Ready

---

## Table of Contents

1. [Overview](#1-overview)
2. [Color Tokens](#2-color-tokens)
3. [Typography Tokens](#3-typography-tokens)
4. [Spacing Tokens](#4-spacing-tokens)
5. [Border Radius Tokens](#5-border-radius-tokens)
6. [Shadow Tokens](#6-shadow-tokens)
7. [Breakpoint Tokens](#7-breakpoint-tokens)
8. [Animation Tokens](#8-animation-tokens)
9. [Z-Index Tokens](#9-z-index-tokens)
10. [Implementation Guide](#10-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This document defines the complete design token system for the Flamoral landing page. Design tokens are the visual design atoms of the design system—specifically, they are named entities that store visual design attributes. They are the source of truth for design decisions.

### 1.2 Token Naming Convention

**Format:** `[category]-[property]-[variant]-[state]`

Examples:
- `color-neutral-charcoal`
- `spacing-section-large`
- `shadow-card-hover`
- `font-size-heading-1`

**Categories:**
- `color-` - All color values
- `font-` - Typography properties
- `spacing-` - Spacing and layout
- `radius-` - Border radius values
- `shadow-` - Box shadow effects
- `breakpoint-` - Responsive breakpoints
- `animation-` - Motion and timing
- `z-` - Z-index layering

### 1.3 Design Philosophy

**Neutral & Universal**
- Gender-neutral color palette
- Culture-neutral color associations
- Globally appealing aesthetic
- Accessible and inclusive by default

**Systematic & Scalable**
- Mathematically consistent scale
- Easy to maintain and extend
- Predictable relationships
- Performance-optimized

---

## 2. Color Tokens

### 2.1 Color Palette Overview

The Flamoral landing page uses a sophisticated neutral palette with muted accent colors, designed to appeal universally while maintaining a premium, trustworthy aesthetic.

### 2.2 Neutral Colors

#### Primary Neutrals

**Rich Charcoal** - Primary text, headers
```
Token: color-neutral-charcoal
Hex: #2C2C2C
RGB: 44, 44, 44
HSL: 0°, 0%, 17%
CMYK: 0, 0, 0, 83

Usage:
- Primary headlines
- Body text (90% opacity)
- Dark mode backgrounds
- High contrast UI elements

Accessibility:
- On #FEFDFB: 14.2:1 (AAA)
- On #F7F5F2: 13.1:1 (AAA)
```

**Slate Gray** - Secondary text, labels
```
Token: color-neutral-slate
Hex: #4A5568
RGB: 74, 85, 104
HSL: 218°, 17%, 35%

Usage:
- Secondary text
- Subheadlines
- Descriptive copy
- Icon colors (default)

Accessibility:
- On #FEFDFB: 8.3:1 (AAA)
- On #F7F5F2: 7.6:1 (AAA)
```

**Warm Gray** - Tertiary text, borders
```
Token: color-neutral-warm-gray
Hex: #A0AEC0
RGB: 160, 174, 192
HSL: 214°, 21%, 69%

Usage:
- Tertiary text
- Placeholder text
- Borders and dividers
- Disabled states
- Icon colors (inactive)

Accessibility:
- On #FEFDFB: 3.2:1 (Large text only)
- On #2C2C2C: 5.1:1 (AA)
```

**Sand Beige** - Cards, alternate backgrounds
```
Token: color-neutral-sand
Hex: #F7F5F2
RGB: 247, 245, 242
HSL: 36°, 23%, 96%

Usage:
- Card backgrounds
- Alternate section backgrounds
- Subtle dividers
- Soft contrast areas

Accessibility:
- Text should be #2C2C2C or darker
```

**Ivory White** - Page background
```
Token: color-neutral-ivory
Hex: #FEFDFB
RGB: 254, 253, 251
HSL: 40°, 60%, 99%

Usage:
- Page background (default)
- Card backgrounds (elevated)
- White overlays
- Maximum contrast surface

Accessibility:
- Base background color
- Pair with dark text only
```

#### Neutral Shades (Extended)

```
Token: color-neutral-50
Hex: #FAFAFA
Use: Lightest backgrounds

Token: color-neutral-100
Hex: #F5F5F5
Use: Hover states (light)

Token: color-neutral-200
Hex: #E5E5E5
Use: Borders (light)

Token: color-neutral-300
Hex: #D4D4D4
Use: Borders (medium)

Token: color-neutral-400
Hex: #A3A3A3
Use: Placeholder text

Token: color-neutral-500
Hex: #737373
Use: Secondary text

Token: color-neutral-600
Hex: #525252
Use: Primary text (alternative)

Token: color-neutral-700
Hex: #404040
Use: Headings (alternative)

Token: color-neutral-800
Hex: #262626
Use: Dark backgrounds

Token: color-neutral-900
Hex: #171717
Use: Darkest backgrounds
```

### 2.3 Accent Colors

#### Primary Accent - Muted Teal

**Muted Teal** - Primary CTA, links, active states
```
Token: color-accent-teal
Hex: #5E9B9B
RGB: 94, 155, 155
HSL: 180°, 25%, 49%

Usage:
- Primary CTA buttons
- Active navigation states
- Links (default)
- Focus indicators
- Interactive elements

Variants:
- color-accent-teal-light: #7CB3B3 (hover, light bg)
- color-accent-teal-dark: #4A8989 (pressed, dark variant)
- color-accent-teal-pale: #E8F2F2 (backgrounds, badges)

Accessibility:
- On #FEFDFB: 3.8:1 (AA Large, AAA for UI)
- On #2C2C2C: 5.6:1 (AA)
- White text on teal: 4.9:1 (AA)
```

**Teal Gradient** - Primary CTA gradient
```
Token: gradient-primary-cta
CSS: linear-gradient(135deg, #5E9B9B 0%, #4A8989 100%)

Usage:
- Primary button backgrounds
- Premium feature highlights
- Accent decoration
```

#### Secondary Accent - Coral Blush

**Coral Blush** - Secondary CTA, warm highlights
```
Token: color-accent-coral
Hex: #E8968F
RGB: 232, 150, 143
HSL: 5°, 66%, 74%

Usage:
- Secondary CTA buttons
- Warm accent elements
- Heart/like icons
- Notification badges
- Success celebrations

Variants:
- color-accent-coral-light: #F4C1BD
- color-accent-coral-dark: #D97B73
- color-accent-coral-pale: #FDF3F2

Accessibility:
- On #FEFDFB: 3.1:1 (Large text only)
- On #2C2C2C: 6.8:1 (AA)
```

#### Tertiary Accent - Ember Gold

**Ember Gold** - Premium badges, trust indicators
```
Token: color-accent-gold
Hex: #C7A576
RGB: 199, 165, 118
HSL: 35°, 41%, 62%

Usage:
- Premium badges
- Trust certifications
- Star ratings
- Achievement indicators
- VIP features
- Testimonial highlights

Variants:
- color-accent-gold-light: #E0C9A3
- color-accent-gold-dark: #A88D5F
- color-accent-gold-pale: #F9F4ED

Accessibility:
- On #FEFDFB: 3.4:1 (Large text)
- On #2C2C2C: 4.2:1 (AA Large)
```

#### Quaternary Accent - Sage Green

**Sage Green** - Success states, verified badges
```
Token: color-accent-sage
Hex: #8BA888
RGB: 139, 168, 136
HSL: 114°, 15%, 60%

Usage:
- Success messages
- Verified badges
- Checkmarks
- Positive indicators
- Completion states
- Safety features

Variants:
- color-accent-sage-light: #B0CAAD
- color-accent-sage-dark: #6C8969
- color-accent-sage-pale: #F0F5F0

Accessibility:
- On #FEFDFB: 3.5:1 (Large text)
- On #2C2C2C: 4.8:1 (AA Large)
```

### 2.4 Semantic Colors

#### Success
```
Token: color-semantic-success
Hex: #8BA888
RGB: 139, 168, 136
HSL: 114°, 15%, 60%

Usage:
- Success messages
- Completed states
- Positive feedback
- Verification badges
```

#### Warning
```
Token: color-semantic-warning
Hex: #E8B54D
RGB: 232, 181, 77
HSL: 40°, 77%, 61%

Usage:
- Warning messages
- Attention indicators
- Important notices
- Caution states
```

#### Error
```
Token: color-semantic-error
Hex: #D97B73
RGB: 217, 123, 115
HSL: 5°, 59%, 65%

Usage:
- Error messages
- Validation errors
- Destructive actions
- Alert states
```

#### Info
```
Token: color-semantic-info
Hex: #7CB3B3
RGB: 124, 179, 179
HSL: 180°, 28%, 59%

Usage:
- Informational messages
- Helper text
- Tips and hints
- Neutral notifications
```

### 2.5 Functional Color Mappings

#### Text Colors
```
color-text-primary: #2C2C2C (90% opacity)
color-text-secondary: #4A5568
color-text-tertiary: #A0AEC0
color-text-disabled: #A0AEC0 (50% opacity)
color-text-inverse: #FEFDFB
color-text-link: #5E9B9B
color-text-link-hover: #4A8989
```

#### Background Colors
```
color-bg-page: #FEFDFB
color-bg-section-alt: #F7F5F2
color-bg-card: #FFFFFF
color-bg-card-hover: #FEFDFB
color-bg-overlay: rgba(44, 44, 44, 0.6)
color-bg-overlay-light: rgba(254, 253, 251, 0.95)
```

#### Border Colors
```
color-border-default: rgba(160, 174, 192, 0.3)
color-border-strong: rgba(74, 85, 104, 0.4)
color-border-subtle: rgba(160, 174, 192, 0.15)
color-border-focus: #5E9B9B
color-border-error: #D97B73
```

#### Interactive Colors
```
color-interactive-default: #5E9B9B
color-interactive-hover: #4A8989
color-interactive-active: #3D7676
color-interactive-disabled: rgba(160, 174, 192, 0.5)
color-interactive-focus: #5E9B9B
```

### 2.6 Gradient Tokens

```
gradient-primary-cta:
  linear-gradient(135deg, #5E9B9B 0%, #4A8989 100%)

gradient-secondary-warm:
  linear-gradient(135deg, #E8968F 0%, #D97B73 100%)

gradient-premium-badge:
  linear-gradient(135deg, #C7A576 0%, #A88D5F 100%)

gradient-hero-overlay:
  linear-gradient(135deg, rgba(44,44,44,0.4) 0%, rgba(44,44,44,0.2) 100%)

gradient-section-subtle:
  linear-gradient(180deg, #FEFDFB 0%, #F7F5F2 100%)

gradient-card-hover:
  linear-gradient(135deg, rgba(94,155,155,0.02) 0%, rgba(94,155,155,0.05) 100%)
```

### 2.7 Opacity Tokens

```
opacity-full: 1.0
opacity-high: 0.9
opacity-medium: 0.75
opacity-low: 0.5
opacity-subtle: 0.25
opacity-faint: 0.1
opacity-ghost: 0.05
```

### 2.8 Color Usage Matrix

| Element | Light Mode | Dark Mode | Hover | Active |
|---------|------------|-----------|-------|--------|
| Page BG | #FEFDFB | #1A1A1A | - | - |
| Card BG | #FFFFFF | #2A2A2A | #FEFDFB | - |
| Primary Text | #2C2C2C 90% | #FEFDFB 90% | - | - |
| Secondary Text | #4A5568 | #A0AEC0 | - | - |
| Primary CTA | Teal Gradient | Teal Gradient | Lift+Glow | Scale Down |
| Secondary CTA | Transparent+Border | Transparent+Border | BG Fill | - |
| Links | #5E9B9B | #7CB3B3 | #4A8989 | #3D7676 |
| Borders | Gray 30% | Gray 20% | Gray 40% | - |

---

## 3. Typography Tokens

### 3.1 Font Family Tokens

#### Display Font - Playfair Display
```
Token: font-family-display
Value: 'Playfair Display', Georgia, 'Times New Roman', serif
Fallback: serif

Usage:
- Main headlines (H1, H2)
- Hero text
- Section titles
- Marketing headlines
- Emotional, elegant text

Weights:
- font-weight-display-regular: 400
- font-weight-display-semibold: 600
- font-weight-display-bold: 700

Load:
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap');
```

#### UI Font - Inter
```
Token: font-family-ui
Value: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif
Fallback: sans-serif

Usage:
- Body text
- UI elements
- Navigation
- Buttons
- Forms
- Captions
- All functional text

Weights:
- font-weight-ui-regular: 400
- font-weight-ui-medium: 500
- font-weight-ui-semibold: 600
- font-weight-ui-bold: 700

Load:
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

Features:
font-feature-settings: 'cv02', 'cv03', 'cv04', 'cv11';
```

### 3.2 Font Size Tokens

#### Desktop Scale (1024px+)
```
font-size-hero: 64px / 4rem
font-size-h1: 48px / 3rem
font-size-h2: 36px / 2.25rem
font-size-h3: 28px / 1.75rem
font-size-h4: 24px / 1.5rem
font-size-h5: 20px / 1.25rem
font-size-h6: 18px / 1.125rem
font-size-body-large: 20px / 1.25rem
font-size-body: 16px / 1rem
font-size-body-small: 14px / 0.875rem
font-size-caption: 12px / 0.75rem
font-size-overline: 11px / 0.6875rem
```

#### Tablet Scale (768-1023px)
```
font-size-hero-tablet: 48px / 3rem
font-size-h1-tablet: 40px / 2.5rem
font-size-h2-tablet: 32px / 2rem
font-size-h3-tablet: 26px / 1.625rem
font-size-h4-tablet: 22px / 1.375rem
font-size-h5-tablet: 18px / 1.125rem
font-size-h6-tablet: 16px / 1rem
font-size-body-large-tablet: 18px / 1.125rem
font-size-body-tablet: 16px / 1rem
font-size-body-small-tablet: 14px / 0.875rem
font-size-caption-tablet: 12px / 0.75rem
```

#### Mobile Scale (320-767px)
```
font-size-hero-mobile: 36px / 2.25rem
font-size-h1-mobile: 32px / 2rem
font-size-h2-mobile: 28px / 1.75rem
font-size-h3-mobile: 24px / 1.5rem
font-size-h4-mobile: 20px / 1.25rem
font-size-h5-mobile: 18px / 1.125rem
font-size-h6-mobile: 16px / 1rem
font-size-body-large-mobile: 18px / 1.125rem
font-size-body-mobile: 16px / 1rem
font-size-body-small-mobile: 14px / 0.875rem
font-size-caption-mobile: 12px / 0.75rem
```

### 3.3 Line Height Tokens

```
line-height-none: 1
line-height-tight: 1.2
line-height-snug: 1.3
line-height-normal: 1.5
line-height-relaxed: 1.6
line-height-loose: 1.7
line-height-extra-loose: 1.8
```

#### Contextual Line Heights
```
line-height-hero: 1.2
line-height-heading: 1.3
line-height-subheading: 1.4
line-height-body: 1.6
line-height-body-mobile: 1.7
line-height-caption: 1.4
line-height-button: 1
```

### 3.4 Font Weight Tokens

```
font-weight-light: 300
font-weight-regular: 400
font-weight-medium: 500
font-weight-semibold: 600
font-weight-bold: 700
font-weight-extrabold: 800
```

### 3.5 Letter Spacing Tokens

```
letter-spacing-tighter: -0.04em
letter-spacing-tight: -0.02em
letter-spacing-normal: 0em
letter-spacing-wide: 0.02em
letter-spacing-wider: 0.05em
letter-spacing-widest: 0.1em
```

#### Contextual Letter Spacing
```
letter-spacing-hero: -0.02em
letter-spacing-heading: -0.01em
letter-spacing-body: 0em
letter-spacing-button: 0.02em
letter-spacing-caption: 0.01em
letter-spacing-overline: 0.1em
```

### 3.6 Typography Scale System

**Modular Scale Base:** 16px
**Scale Ratio:** 1.25 (Major Third)

```
Scale Calculation:
12px = 16 ÷ 1.25 ÷ 1.067
14px = 16 ÷ 1.067
16px = Base
20px = 16 × 1.25
24px = 16 × 1.5
28px = 16 × 1.75
32px = 16 × 2
36px = 16 × 2.25
48px = 16 × 3
64px = 16 × 4
```

### 3.7 Complete Typography Token Sets

#### Hero Headline
```
Token Prefix: typography-hero

font-family: font-family-display
font-size: 64px / 48px / 36px (desktop/tablet/mobile)
font-weight: font-weight-bold
line-height: line-height-tight (1.2)
letter-spacing: letter-spacing-tight (-0.02em)
color: color-text-primary
```

#### Section Heading (H2)
```
Token Prefix: typography-h2

font-family: font-family-display
font-size: 48px / 36px / 32px
font-weight: font-weight-semibold
line-height: line-height-snug (1.3)
letter-spacing: letter-spacing-tight (-0.01em)
color: color-text-primary
```

#### Subsection Heading (H3)
```
Token Prefix: typography-h3

font-family: font-family-display
font-size: 32px / 28px / 24px
font-weight: font-weight-semibold
line-height: line-height-normal (1.4)
letter-spacing: letter-spacing-normal (0em)
color: color-text-primary
```

#### Body Large
```
Token Prefix: typography-body-large

font-family: font-family-ui
font-size: 20px / 18px / 18px
font-weight: font-weight-regular
line-height: line-height-relaxed (1.6)
letter-spacing: letter-spacing-normal
color: color-text-secondary
```

#### Body Regular
```
Token Prefix: typography-body

font-family: font-family-ui
font-size: 16px
font-weight: font-weight-regular
line-height: line-height-relaxed (1.6)
letter-spacing: letter-spacing-normal
color: color-text-primary (90% opacity)
```

#### Button Text
```
Token Prefix: typography-button

font-family: font-family-ui
font-size: 16px / 18px (secondary / primary)
font-weight: font-weight-semibold
line-height: line-height-button (1)
letter-spacing: letter-spacing-wide (0.02em)
text-transform: none
```

#### Caption
```
Token Prefix: typography-caption

font-family: font-family-ui
font-size: 12px
font-weight: font-weight-regular
line-height: line-height-caption (1.4)
letter-spacing: letter-spacing-caption (0.01em)
color: color-text-tertiary
```

---

## 4. Spacing Tokens

### 4.1 Spacing Scale

**Base Unit:** 4px
**Scale Type:** Linear with semantic jumps

```
spacing-0: 0px
spacing-1: 4px
spacing-2: 8px
spacing-3: 12px
spacing-4: 16px
spacing-5: 20px
spacing-6: 24px
spacing-8: 32px
spacing-10: 40px
spacing-12: 48px
spacing-16: 64px
spacing-20: 80px
spacing-24: 96px
spacing-32: 128px
```

### 4.2 Semantic Spacing Tokens

#### Micro Spacing
```
spacing-xs: 4px
  - Icon padding
  - Tight element spacing
  - Badge padding

spacing-sm: 8px
  - Small button padding (vertical)
  - Related element spacing
  - Input padding (vertical)
```

#### Element Spacing
```
spacing-md: 16px
  - Standard padding
  - Card padding (minimum)
  - Button padding (horizontal)
  - Form field spacing

spacing-lg: 24px
  - Large padding
  - Card padding (comfortable)
  - Section element spacing
  - Grid gap
```

#### Component Spacing
```
spacing-xl: 32px
  - Component padding
  - Major element spacing
  - Card padding (large)
  - Feature grid gap

spacing-2xl: 48px
  - Section padding (vertical)
  - Large component spacing
  - Subsection gaps
```

#### Section Spacing
```
spacing-3xl: 64px
  - Section spacing (standard)
  - Page section padding
  - Major layout breaks

spacing-4xl: 96px
  - Large section spacing
  - Hero section padding
  - Major page divisions

spacing-5xl: 128px
  - Extra large section spacing
  - Full page breaks
```

### 4.3 Layout-Specific Spacing

#### Container Padding
```
spacing-container-mobile: 16px
spacing-container-tablet: 32px
spacing-container-desktop: 64px
spacing-container-max: 80px
```

#### Grid Gaps
```
spacing-grid-xs: 8px
spacing-grid-sm: 16px
spacing-grid-md: 24px
spacing-grid-lg: 32px
spacing-grid-xl: 48px
```

#### Section Padding
```
spacing-section-mobile: 48px
spacing-section-tablet: 64px
spacing-section-desktop: 96px
```

#### Component Padding
```
spacing-card-sm: 16px
spacing-card-md: 24px
spacing-card-lg: 32px
spacing-card-xl: 40px

spacing-button-sm-vertical: 8px
spacing-button-sm-horizontal: 16px
spacing-button-md-vertical: 12px
spacing-button-md-horizontal: 24px
spacing-button-lg-vertical: 16px
spacing-button-lg-horizontal: 32px
```

### 4.4 Spacing Usage Matrix

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Container Padding | 16px | 32px | 64px |
| Section Vertical | 48px | 64px | 96px |
| Card Padding | 24px | 32px | 32px |
| Grid Gap | 16px | 24px | 24px |
| Button Padding | 12/24px | 12/24px | 16/32px |
| Between Headings | 24px | 32px | 32px |
| Paragraph Gap | 16px | 16px | 16px |

---

## 5. Border Radius Tokens

### 5.1 Radius Scale

```
radius-none: 0px
  - Sharp edges
  - Technical elements
  - Dividers

radius-sm: 4px
  - Small inputs
  - Compact buttons
  - Tags/badges

radius-md: 8px
  - Standard buttons
  - Form inputs
  - Small cards
  - Navigation items

radius-lg: 16px
  - Large cards
  - Feature cards
  - Modals
  - Images

radius-xl: 24px
  - Hero cards
  - Premium elements
  - Special features
  - Large images

radius-2xl: 32px
  - Extra large cards
  - Hero elements

radius-full: 9999px
  - Pills
  - Avatars
  - Fully rounded buttons
  - Badges
```

### 5.2 Component-Specific Radius

```
radius-button-sm: 4px
radius-button-md: 8px
radius-button-lg: 8px
radius-button-pill: 9999px

radius-card-sm: 12px
radius-card-md: 16px
radius-card-lg: 20px
radius-card-xl: 24px

radius-input: 8px
radius-modal: 16px
radius-avatar: 9999px
radius-badge: 9999px
radius-image: 16px
```

---

## 6. Shadow Tokens

### 6.1 Shadow Scale

**Philosophy:** Subtle, realistic shadows that suggest depth without being heavy-handed.

#### Elevation Levels

**None**
```
Token: shadow-none
Value: none

Usage: Flat elements, no elevation
```

**Soft**
```
Token: shadow-soft
Value: 0 2px 8px rgba(44, 44, 44, 0.06)

Usage:
- Subtle elevation
- Hover states (cards)
- Light emphasis
```

**Medium**
```
Token: shadow-medium
Value: 0 4px 16px rgba(44, 44, 44, 0.08)

Usage:
- Cards (default)
- Buttons (resting)
- Dropdowns
- Tooltips
```

**Strong**
```
Token: shadow-strong
Value: 0 8px 32px rgba(44, 44, 44, 0.12)

Usage:
- Modals
- Popovers
- Elevated cards
- Sticky elements
```

**Extra Strong**
```
Token: shadow-extra-strong
Value: 0 12px 48px rgba(44, 44, 44, 0.16)

Usage:
- Full-screen overlays
- Maximum elevation
- Critical elements
```

### 6.2 Interactive Shadows

**Button Hover**
```
Token: shadow-button-hover
Value: 0 6px 24px rgba(94, 155, 155, 0.3)

Usage: Primary button hover state
```

**Button Active**
```
Token: shadow-button-active
Value: 0 2px 8px rgba(94, 155, 155, 0.2)

Usage: Primary button pressed state
```

**Card Hover**
```
Token: shadow-card-hover
Value: 0 8px 32px rgba(44, 44, 44, 0.12)

Usage: Card hover state (lift effect)
```

**Focus Ring**
```
Token: shadow-focus
Value: 0 0 0 3px rgba(94, 155, 155, 0.3)

Usage: Keyboard focus indicator
```

### 6.3 Colored Shadows

**Primary Glow**
```
Token: shadow-glow-teal
Value: 0 4px 24px rgba(94, 155, 155, 0.3)

Usage: Primary CTA emphasis
```

**Success Glow**
```
Token: shadow-glow-success
Value: 0 4px 16px rgba(139, 168, 136, 0.3)

Usage: Success states
```

**Warning Glow**
```
Token: shadow-glow-warning
Value: 0 4px 16px rgba(232, 181, 77, 0.3)

Usage: Warning states
```

**Error Glow**
```
Token: shadow-glow-error
Value: 0 4px 16px rgba(217, 123, 115, 0.3)

Usage: Error states
```

### 6.4 Inner Shadows

**Inset Soft**
```
Token: shadow-inset-soft
Value: inset 0 2px 4px rgba(44, 44, 44, 0.06)

Usage: Pressed buttons, inputs
```

**Inset Strong**
```
Token: shadow-inset-strong
Value: inset 0 4px 8px rgba(44, 44, 44, 0.1)

Usage: Active inputs, wells
```

---

## 7. Breakpoint Tokens

### 7.1 Breakpoint Scale

```
breakpoint-xs: 320px
  - Small mobile phones
  - Minimum supported width

breakpoint-sm: 480px
  - Mobile phones (landscape)

breakpoint-md: 768px
  - Tablets (portrait)
  - Small tablets

breakpoint-lg: 1024px
  - Tablets (landscape)
  - Small desktops
  - Laptops

breakpoint-xl: 1280px
  - Desktop
  - Standard resolution

breakpoint-2xl: 1536px
  - Large desktop
  - High resolution

breakpoint-3xl: 1920px
  - Extra large desktop
  - Full HD
```

### 7.2 Media Query Helpers

**Mobile First (Min-Width)**
```css
/* Small devices and up */
@media (min-width: 480px) { }

/* Medium devices and up */
@media (min-width: 768px) { }

/* Large devices and up */
@media (min-width: 1024px) { }

/* Extra large devices and up */
@media (min-width: 1280px) { }

/* 2X large devices and up */
@media (min-width: 1536px) { }
```

**Desktop First (Max-Width)**
```css
/* Small devices and down */
@media (max-width: 479px) { }

/* Medium devices and down */
@media (max-width: 767px) { }

/* Large devices and down */
@media (max-width: 1023px) { }

/* Extra large devices and down */
@media (max-width: 1279px) { }
```

**Range Queries**
```css
/* Mobile only */
@media (min-width: 320px) and (max-width: 767px) { }

/* Tablet only */
@media (min-width: 768px) and (max-width: 1023px) { }

/* Desktop only */
@media (min-width: 1024px) { }
```

### 7.3 Container Max Widths

```
container-sm: 640px
container-md: 768px
container-lg: 1024px
container-xl: 1280px
container-2xl: 1440px
container-max: 1600px
```

---

## 8. Animation Tokens

### 8.1 Duration Tokens

```
duration-instant: 100ms
  - Color changes
  - Opacity fades
  - Instant feedback

duration-fast: 200ms
  - Button hover
  - Small element animations
  - Quick transitions

duration-normal: 300ms
  - Standard transitions
  - Most animations
  - Default timing

duration-slow: 400ms
  - Large element animations
  - Modal enter/exit
  - Page transitions

duration-slower: 600ms
  - Complex animations
  - Multi-step transitions

duration-slowest: 800ms
  - Loading animations
  - Celebration effects
```

### 8.2 Easing Tokens

**Cubic Bezier Functions**

```
ease-standard: cubic-bezier(0.4, 0, 0.2, 1)
  - Default easing
  - Most transitions
  - Balanced motion

ease-decelerate: cubic-bezier(0, 0, 0.2, 1)
  - Elements entering screen
  - Opening animations
  - Deceleration curve

ease-accelerate: cubic-bezier(0.4, 0, 1, 1)
  - Elements exiting screen
  - Closing animations
  - Acceleration curve

ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275)
  - Playful interactions
  - Button effects
  - Bounce effect

ease-linear: linear
  - Progress indicators
  - Loaders
  - Constant motion
```

### 8.3 Animation Presets

**Fade In**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

animation: fadeIn 300ms ease-decelerate;
```

**Slide Up**
```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

animation: slideUp 400ms ease-decelerate;
```

**Scale In**
```css
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

animation: scaleIn 300ms ease-spring;
```

**Button Press**
```css
/* On click */
transform: scale(0.98);
transition: transform 100ms ease-standard;
```

**Card Lift**
```css
/* On hover */
transform: translateY(-4px);
box-shadow: shadow-card-hover;
transition: all 200ms ease-decelerate;
```

### 8.4 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 9. Z-Index Tokens

### 9.1 Z-Index Scale

**Layering System**

```
z-base: 0
  - Base content layer
  - Default elements

z-dropdown: 100
  - Dropdowns
  - Tooltips
  - Popovers

z-sticky: 200
  - Sticky headers
  - Sticky CTAs
  - Persistent elements

z-fixed: 300
  - Fixed navigation
  - Fixed footers
  - Floating action buttons

z-modal-backdrop: 400
  - Modal overlays
  - Backdrop layers

z-modal: 500
  - Modals
  - Dialogs
  - Lightboxes

z-popover: 600
  - Highest priority popovers
  - Context menus

z-toast: 700
  - Notifications
  - Alerts
  - Toast messages

z-tooltip: 800
  - Tooltips (above all)
  - Hints
```

### 9.2 Specific Component Z-Index

```
z-navigation: 300 (fixed)
z-hero-overlay: 1
z-card-hover: 2
z-modal-close-button: 501
z-cookie-banner: 250
z-skip-link: 900
```

---

## 10. Implementation Guide

### 10.1 CSS Custom Properties

**Variable Naming:**
```css
/* Format: --[category]-[property]-[variant] */

:root {
  /* Colors */
  --color-neutral-charcoal: #2C2C2C;
  --color-neutral-slate: #4A5568;
  --color-accent-teal: #5E9B9B;

  /* Typography */
  --font-family-display: 'Playfair Display', serif;
  --font-size-hero: 64px;
  --font-weight-bold: 700;

  /* Spacing */
  --spacing-md: 16px;
  --spacing-section: 96px;

  /* Shadows */
  --shadow-medium: 0 4px 16px rgba(44, 44, 44, 0.08);

  /* Etc... */
}
```

### 10.2 Sass/SCSS Variables

```scss
// Colors
$color-neutral-charcoal: #2C2C2C;
$color-neutral-slate: #4A5568;
$color-accent-teal: #5E9B9B;

// Typography
$font-family-display: 'Playfair Display', serif;
$font-size-hero: 64px;

// Spacing
$spacing-md: 16px;
$spacing-section: 96px;

// Breakpoints
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;

// Mixins
@mixin heading-1 {
  font-family: $font-family-display;
  font-size: 48px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
}

@mixin respond-to($breakpoint) {
  @if $breakpoint == 'mobile' {
    @media (max-width: 767px) { @content; }
  }
  @if $breakpoint == 'tablet' {
    @media (min-width: 768px) and (max-width: 1023px) { @content; }
  }
  @if $breakpoint == 'desktop' {
    @media (min-width: 1024px) { @content; }
  }
}
```

### 10.3 JavaScript/JSON Tokens

```javascript
// tokens.js
export const tokens = {
  color: {
    neutral: {
      charcoal: '#2C2C2C',
      slate: '#4A5568',
      warmGray: '#A0AEC0',
      sand: '#F7F5F2',
      ivory: '#FEFDFB'
    },
    accent: {
      teal: '#5E9B9B',
      coral: '#E8968F',
      gold: '#C7A576',
      sage: '#8BA888'
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px'
  },
  breakpoint: {
    sm: 480,
    md: 768,
    lg: 1024,
    xl: 1280
  }
};
```

### 10.4 Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        neutral: {
          charcoal: '#2C2C2C',
          slate: '#4A5568',
          'warm-gray': '#A0AEC0',
          sand: '#F7F5F2',
          ivory: '#FEFDFB'
        },
        accent: {
          teal: '#5E9B9B',
          coral: '#E8968F',
          gold: '#C7A576',
          sage: '#8BA888'
        }
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        ui: ['Inter', 'sans-serif']
      },
      fontSize: {
        'hero': ['64px', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
        'h1': ['48px', { lineHeight: '1.2' }],
        'h2': ['36px', { lineHeight: '1.3' }]
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
        '4xl': '96px'
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(44, 44, 44, 0.06)',
        'medium': '0 4px 16px rgba(44, 44, 44, 0.08)',
        'strong': '0 8px 32px rgba(44, 44, 44, 0.12)'
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px'
      }
    }
  }
};
```

### 10.5 Usage Examples

**HTML + CSS Custom Properties:**
```html
<button class="cta-primary">
  Get Started Free
</button>

<style>
.cta-primary {
  background: linear-gradient(135deg, var(--color-accent-teal) 0%, var(--color-accent-teal-dark) 100%);
  color: var(--color-neutral-ivory);
  font-family: var(--font-family-ui);
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  padding: var(--spacing-md) var(--spacing-xl);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-medium);
  transition: all var(--duration-fast) var(--ease-standard);
}

.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-button-hover);
}
</style>
```

**React + Styled Components:**
```jsx
import styled from 'styled-components';
import { tokens } from './tokens';

const CTAButton = styled.button`
  background: linear-gradient(135deg, ${tokens.color.accent.teal} 0%, #4A8989 100%);
  color: ${tokens.color.neutral.ivory};
  font-family: ${tokens.fontFamily.ui};
  font-size: ${tokens.fontSize.body};
  font-weight: ${tokens.fontWeight.semibold};
  padding: ${tokens.spacing.md} ${tokens.spacing.xl};
  border-radius: ${tokens.radius.md};
  box-shadow: ${tokens.shadow.medium};
  transition: all ${tokens.duration.fast} ${tokens.ease.standard};

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${tokens.shadow.buttonHover};
  }
`;
```

---

## Appendix: Token Reference Tables

### Complete Color Reference

| Token | Hex | RGB | Usage |
|-------|-----|-----|-------|
| color-neutral-charcoal | #2C2C2C | 44,44,44 | Primary text |
| color-neutral-slate | #4A5568 | 74,85,104 | Secondary text |
| color-neutral-warm-gray | #A0AEC0 | 160,174,192 | Tertiary text |
| color-neutral-sand | #F7F5F2 | 247,245,242 | Card backgrounds |
| color-neutral-ivory | #FEFDFB | 254,253,251 | Page background |
| color-accent-teal | #5E9B9B | 94,155,155 | Primary CTA |
| color-accent-coral | #E8968F | 232,150,143 | Secondary CTA |
| color-accent-gold | #C7A576 | 199,165,118 | Premium badges |
| color-accent-sage | #8BA888 | 139,168,136 | Success states |

### Complete Spacing Reference

| Token | Value | Usage |
|-------|-------|-------|
| spacing-xs | 4px | Icon padding |
| spacing-sm | 8px | Small padding |
| spacing-md | 16px | Standard padding |
| spacing-lg | 24px | Large padding |
| spacing-xl | 32px | Component spacing |
| spacing-2xl | 48px | Subsection spacing |
| spacing-3xl | 64px | Section spacing |
| spacing-4xl | 96px | Major sections |

---

**Document Version:** 1.0.0
**Last Updated:** December 12, 2025
**Maintained By:** Flamoral Design Team

**Related Documentation:**
- LANDING_PAGE_REDESIGN.md - Complete design specification
- WIREFRAMES.md - Layout wireframes
- COMPONENT_SPECS.md - Component specifications
- flamoral-brand-guidelines.md - Brand identity guide

---

*These tokens form the foundation of the Flamoral design system and should be used consistently across all landing page implementations.*
