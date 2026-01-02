# Flamoral Logo Brand Guidelines

**Version 2.0** | **Last Updated: January 2025**

---

## Overview

This document provides guidelines for using the Flamoral logo and brand assets. The logo represents Flamoral as a premium global dating platform, combining elements of romance, connection, and international reach.

---

## 1. Logo Concept

The Flamoral logo is built around a **flame-heart** symbol that embodies:

- **Flame (from "Flam")**: Passion, desire, warmth, and the spark of attraction
- **Heart**: Romance, love, emotional connection
- **Global Ring**: International reach, worldwide connections
- **Connection Dots**: Network of people across the globe

### Design Philosophy

- Clean, modern, minimalist aesthetic
- Premium and luxurious feel
- Animated-ready with distinct layered elements
- Works seamlessly on both dark and light backgrounds

---

## 2. Color Palette

### Primary Colors

| Color | Hex Code | RGB | Usage |
|-------|----------|-----|-------|
| **Pink/Magenta** | `#EC4899` | 236, 72, 153 | Primary brand color, CTAs, highlights |
| **Blue** | `#3B82F6` | 59, 130, 246 | Secondary accents, trust elements |
| **Green** | `#22C55E` | 34, 197, 94 | Success states, connection indicators |

### Background Colors

| Color | Hex Code | RGB | Usage |
|-------|----------|-----|-------|
| **Deep Black** | `#0A0A0F` | 10, 10, 15 | Primary dark background |
| **Dark Navy** | `#0F172A` | 15, 23, 42 | Secondary dark background |

### Gradient Applications

```css
/* Primary Flame Gradient */
background: linear-gradient(135deg, #3B82F6 0%, #EC4899 100%);

/* Inner Glow Gradient */
background: linear-gradient(135deg, #22C55E 0%, #3B82F6 100%);

/* Ring Gradient */
background: linear-gradient(135deg, #EC4899 0%, #3B82F6 50%, #22C55E 100%);
```

---

## 3. Logo Versions

### 3.1 Icon Only (`flamoral-icon.svg`)

The standalone icon for use in:
- App icons
- Favicons
- Social media avatars
- Loading states
- UI elements where space is limited

**Minimum Size**: 24px

### 3.2 Full Logo with Wordmark (`flamoral-logo-full.svg`)

The complete horizontal logo with icon and "FLAMORAL" wordmark for use in:
- Website headers
- Marketing materials
- Email signatures
- Partnerships and sponsorships
- Press kits

**Minimum Width**: 120px

---

## 4. Logo Elements Breakdown

### Flame-Heart Shape
The primary symbol combining a heart outline with flame-like characteristics.
- Represents passion and romance
- Gradient from blue (bottom) to pink (top)

### Inner Flame
A secondary flame shape inside the main heart.
- Creates depth and dimension
- Uses green-to-blue gradient for contrast

### Central Spark
A white elliptical highlight at the heart center.
- Represents the "spark" of connection
- Provides visual focal point

### Global Ring
A dashed circular ring surrounding the icon.
- Represents global reach and international connections
- Uses tri-color gradient (pink, blue, green)

### Connection Dots
Six colored dots positioned around the ring.
- Represent users connecting across the globe
- Alternate between brand colors

---

## 5. Clear Space Rules

Maintain minimum clear space equal to **1x** (the width of one connection dot) on all sides of the logo.

```
    +-1x-+
    |    |
1x  [LOGO]  1x
    |    |
    +-1x-+
```

---

## 6. Logo Dont's

**Never:**
- Stretch or distort the logo proportions
- Change the gradient colors
- Remove elements (dots, ring, spark)
- Add drop shadows or 3D effects beyond those defined
- Rotate the logo
- Place on busy backgrounds without sufficient contrast
- Use low-resolution versions
- Recreate or modify the flame-heart shape
- Change the wordmark font

---

## 7. Background Usage

### On Dark Backgrounds
- Use the standard colored version
- Backgrounds: `#0A0A0F`, `#0F172A`, or darker
- Ensure minimum contrast ratio of 4.5:1

### On Light Backgrounds
- Use the standard colored version
- The gradient colors provide sufficient contrast
- Avoid pure white backgrounds; prefer `#F8FAFC` or similar

### On Colored Backgrounds
- Avoid placing logo on backgrounds that clash with brand colors
- If necessary, use a subtle dark or light overlay

---

## 8. Favicon Usage

### Available Sizes

| Size | File | Usage |
|------|------|-------|
| 16x16 | `favicon-16x16.svg` | Browser tabs (legacy) |
| 32x32 | `favicon-32x32.svg` | Standard favicon |
| 180x180 | `apple-touch-icon-180x180.svg` | iOS home screen |

### HTML Implementation

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<meta name="theme-color" content="#EC4899">
```

---

## 9. Animation Guidelines

The logo is designed with animation in mind. Recommended animations:

### Entrance Animation
```css
@keyframes logoEntrance {
  0% {
    opacity: 0;
    transform: scale(0.8);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Ring Rotation (Subtle)
```css
@keyframes ringRotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
/* Duration: 60s for subtle effect */
```

### Pulse Effect (Connection Dots)
```css
@keyframes dotPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
/* Stagger each dot by 0.5s */
```

### Spark Glow
```css
@keyframes sparkGlow {
  0%, 100% { opacity: 0.9; }
  50% { opacity: 0.6; }
}
/* Duration: 2s, creates breathing effect */
```

---

## 10. Typography

### Wordmark Font
- **Font Family**: Playfair Display
- **Weight**: 700 (Bold)
- **Letter Spacing**: 0.02em
- **Fallbacks**: Georgia, serif

### Tagline Font
- **Font Family**: Inter
- **Weight**: 500 (Medium)
- **Letter Spacing**: 0.15em
- **Size**: Relative to wordmark (approximately 28%)

---

## 11. File Locations

```
apps/branding/
├── logo/
│   ├── flamoral-icon.svg          # Icon only
│   └── flamoral-logo-full.svg     # Full logo with wordmark
├── favicon/
│   ├── favicon.svg                # Main favicon (scalable)
│   ├── favicon-16x16.svg          # 16x16 version
│   ├── favicon-32x32.svg          # 32x32 version
│   ├── apple-touch-icon-180x180.svg  # iOS icon
│   └── README.md                  # Favicon implementation guide
└── BRAND_GUIDELINES.md            # This document
```

---

## 12. Contact

For brand asset requests or questions:
- **Brand Team**: brand@flamoral.com
- **Design System**: design@flamoral.com

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0 | January 2025 | New logo system with updated color palette |
| 1.0 | November 2024 | Initial brand guidelines |

---

*Copyright 2025 Flamoral. All rights reserved.*
