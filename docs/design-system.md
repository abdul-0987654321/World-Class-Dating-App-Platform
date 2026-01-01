# Flamoral Design System

**Version:** 1.0.0
**Last Updated:** 2026-01-01

## Overview

The Flamoral Design System provides a consistent visual language across the dating platform. It uses CSS variables as the source of truth with Tailwind utility classes for implementation.

---

## Color System

### Primary Palette

| Token | CSS Variable | Tailwind Class | Hex Value |
|-------|-------------|----------------|-----------|
| Pink (Primary) | `--accent-pink` | `text-fm-pink` | `#d4587a` |
| Violet | `--accent-purple` | `text-fm-violet` | `#7B61FF` |
| Cyan | `--accent-cyan` | `text-fm-cyan` | `#2ED4FF` |
| Mint | - | `text-fm-mint` | `#2EE89A` |
| Gold | - | `text-fm-gold` | `#D4A574` |

### Background Colors

| Token | CSS Variable | Tailwind Class | Usage |
|-------|-------------|----------------|-------|
| Page Background | `--bg-page-solid` | `bg-fm-bg-0` | Main page background |
| Card Surface | `--surface-card` | `bg-fm-surface-card` | Cards, modals |
| Elevated | `--surface-elevated` | `bg-fm-surface-elevated` | Dropdowns, tooltips |
| Overlay | `--surface-overlay` | `bg-fm-surface-overlay` | Modal backdrops |

### Text Colors

| Token | CSS Variable | Tailwind Class | Usage |
|-------|-------------|----------------|-------|
| Primary | `--text-primary` | `text-fm-text` | Main text |
| Secondary | `--text-secondary` | `text-fm-text-secondary` | Descriptions |
| Muted | `--text-muted` | `text-fm-text-muted` | Hints, placeholders |

### Semantic Colors

| Token | Tailwind Class | Usage |
|-------|----------------|-------|
| Success | `text-fm-success` / `bg-fm-success` | Success states |
| Warning | `text-fm-warning` / `bg-fm-warning` | Warning states |
| Error | `text-fm-error` / `bg-fm-error` | Error states |
| Info | `text-fm-info` / `bg-fm-info` | Informational |

---

## Gradients

### Background Gradients

```css
/* Romance (Pink/Violet/Cyan) */
.bg-fm-romance {
  background: linear-gradient(135deg, rgba(212,88,122,0.15) 0%, rgba(123,97,255,0.1) 50%, rgba(46,212,255,0.05) 100%);
}

/* Trust (Blue tones) */
.bg-fm-trust {
  background: linear-gradient(135deg, rgba(26,39,68,0.3) 0%, rgba(59,130,246,0.2) 50%, rgba(46,212,255,0.1) 100%);
}

/* Elite (Gold tones) */
.bg-fm-elite {
  background: linear-gradient(135deg, rgba(139,105,20,0.2) 0%, rgba(212,165,116,0.15) 50%, rgba(245,214,138,0.1) 100%);
}

/* Glass effect */
.bg-fm-glass {
  background: rgba(17,19,24,0.6);
  backdrop-filter: blur(12px);
}
```

### Accent Gradient

```css
.accent-gradient {
  background: linear-gradient(135deg, #d4587a 0%, #7B61FF 50%, #2ED4FF 100%);
}
```

---

## Typography

### Font Families

| Usage | Font Family | Tailwind Class |
|-------|-------------|----------------|
| Headings | Space Grotesk | `font-display` |
| Body | Inter | `font-sans` |
| Code | JetBrains Mono | `font-mono` |

### Font Sizes

| Token | Size | Line Height | Tailwind |
|-------|------|-------------|----------|
| xs | 12px | 16px | `text-xs` |
| sm | 14px | 20px | `text-sm` |
| base | 16px | 24px | `text-base` |
| lg | 18px | 28px | `text-lg` |
| xl | 20px | 28px | `text-xl` |
| 2xl | 24px | 32px | `text-2xl` |
| 3xl | 30px | 36px | `text-3xl` |
| 4xl | 36px | 40px | `text-4xl` |

---

## Spacing

### Flamoral Spacing Scale

| Token | Value | Tailwind Class |
|-------|-------|----------------|
| fm-2 | 8px | `p-fm-2`, `m-fm-2`, `gap-fm-2` |
| fm-3 | 12px | `p-fm-3`, `m-fm-3`, `gap-fm-3` |
| fm-4 | 16px | `p-fm-4`, `m-fm-4`, `gap-fm-4` |
| fm-5 | 20px | `p-fm-5`, `m-fm-5`, `gap-fm-5` |
| fm-6 | 24px | `p-fm-6`, `m-fm-6`, `gap-fm-6` |
| fm-8 | 32px | `p-fm-8`, `m-fm-8`, `gap-fm-8` |
| fm-10 | 40px | `p-fm-10`, `m-fm-10`, `gap-fm-10` |
| fm-12 | 48px | `p-fm-12`, `m-fm-12`, `gap-fm-12` |

---

## Border Radius

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Card | 20px | `rounded-fm-card` | Cards, modals |
| Chip | 9999px | `rounded-fm-chip` | Pills, badges |
| Modal | 24px | `rounded-fm-modal` | Large modals |

---

## Shadows

### Elevation Shadows

```css
/* Card shadow */
.shadow-fm-card {
  box-shadow: 0 4px 24px rgba(0,0,0,0.25);
}
```

### Glow Effects

| Token | Tailwind Class | Color |
|-------|----------------|-------|
| Pink Glow | `shadow-fm-glow-pink` | Pink accent |
| Cyan Glow | `shadow-fm-glow-cyan` | Cyan accent |
| Mint Glow | `shadow-fm-glow-mint` | Mint accent |
| Gold Glow | `shadow-fm-glow-gold` | Gold accent |
| Violet Glow | `shadow-fm-glow-violet` | Violet accent |

```css
.shadow-fm-glow-pink {
  box-shadow: 0 0 30px rgba(212,88,122,0.4);
}
```

---

## Motion

### Duration Tokens

| Token | Value | Tailwind Class | Usage |
|-------|-------|----------------|-------|
| Fast | 150ms | `duration-fm-fast` | Micro-interactions |
| Base | 250ms | `duration-fm-base` | Standard transitions |
| Slow | 400ms | `duration-fm-slow` | Complex animations |

### Easing

```css
/* Flamoral easing curve */
.ease-fm {
  transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}
```

### Animation Classes

| Class | Description |
|-------|-------------|
| `animate-pulse-slow` | Slow pulse (3s) |
| `animate-glow` | Glow animation (2s) |
| `animate-float` | Floating effect (6s) |
| `animate-gradient-shift` | Gradient movement (8s) |

---

## Components

### FlamoralBackground

The global background component for all pages.

```tsx
import { FlamoralBackground } from '@/components/theme';

<FlamoralBackground
  fixed={true}       // Fixed viewport coverage
  animated={false}   // Enable subtle animations
  withNoise={true}   // Noise texture overlay
>
  {/* Page content */}
</FlamoralBackground>
```

### PricingCard

Tier-specific pricing cards with glow effects.

```tsx
import { PricingCard, PricingGrid } from '@/components/pricing';

<PricingGrid
  currentPlanId="basic"
  onSelectPlan={(plan) => handleSubscribe(plan)}
/>
```

### FlamoralLogo

Consistent logo component across all pages.

```tsx
import { FlamoralLogo } from '@/components/Logo';

<FlamoralLogo variant="full" />      // Full logo with text
<FlamoralLogo variant="icon" />      // Icon only
<FlamoralLogo variant="wordmark" />  // Text only
```

---

## Tailwind Configuration

The design system tokens are configured in `apps/web-app/tailwind.config.js`:

```js
theme: {
  extend: {
    colors: {
      fm: {
        bg: { 0: 'var(--bg-page-solid)', 1: 'var(--surface-card)', 2: 'var(--surface-elevated)' },
        pink: 'var(--accent-pink)',
        violet: 'var(--accent-purple)',
        cyan: 'var(--accent-cyan)',
        // ...
      }
    },
    spacing: {
      'fm-2': '8px',
      'fm-3': '12px',
      // ...
    },
    borderRadius: {
      'fm-card': '20px',
      'fm-chip': '9999px',
      'fm-modal': '24px',
    },
    // ...
  }
}
```

---

## CSS Variables

All design tokens are defined in `apps/web-app/src/styles/design-system.css`:

```css
:root {
  /* Backgrounds */
  --bg-page: linear-gradient(180deg, #08080c 0%, #0d0d14 50%, #08080c 100%);
  --bg-page-solid: #08080c;

  /* Surfaces */
  --surface-card: #111318;
  --surface-elevated: #1A1D24;
  --surface-overlay: rgba(11, 11, 15, 0.95);

  /* Accents */
  --accent-pink: #d4587a;
  --accent-purple: #7B61FF;
  --accent-cyan: #2ED4FF;

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #B5B8C5;
  --text-muted: #8A8D9F;

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.15);
}
```

---

## Accessibility

### Reduced Motion

All animations respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-pulse-slow,
  .animate-glow,
  .animate-float {
    animation: none !important;
  }
}
```

### Color Contrast

All text colors meet WCAG 2.1 AA standards against their backgrounds:
- Primary text (#FFFFFF) on bg-0 (#08080c): 19.5:1
- Secondary text (#B5B8C5) on bg-0: 9.8:1
- Muted text (#8A8D9F) on bg-0: 6.2:1

---

## File Structure

```
apps/web-app/src/
├── styles/
│   ├── design-system.css    # CSS variables source of truth
│   └── index.css            # Global styles
├── components/
│   ├── theme/
│   │   ├── FlamoralBackground.tsx
│   │   └── index.ts
│   ├── pricing/
│   │   ├── PricingCard.tsx
│   │   ├── PricingGrid.tsx
│   │   └── index.ts
│   └── Logo/
│       └── FlamoralLogo.tsx
└── tailwind.config.js       # Tailwind token mappings
```

---

## Usage Guidelines

1. **Always use CSS variables** - They're the source of truth
2. **Prefer Tailwind classes** - Use `fm` namespace for Flamoral tokens
3. **Use FlamoralBackground** - Global background for all pages
4. **Respect reduced motion** - All animations should be optional
5. **Maintain contrast** - Follow WCAG guidelines for accessibility

---

**Report End**
