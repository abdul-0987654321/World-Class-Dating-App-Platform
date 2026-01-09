# Flamoral Brand System

The official design system for Flamoral - a modern dating app platform. This package contains design tokens, CSS variables, and Tailwind CSS presets for consistent branding across all Flamoral applications.

## Overview

The Flamoral brand system is built around a dark theme with vibrant accent colors:

- **Primary**: Blue gradient (`#0066FF` to `#00CCFF`) - Trust, connection
- **Secondary**: Pink (`#FF1493` to `#FF69B4`) - Romance, passion
- **Accent**: Green (`#00FF7F` to `#00CC66`) - Success, matches
- **Surface**: Dark tones (`#0A0A0A` to `#2A2A2A`) - Modern, sleek

## Installation

```bash
npm install @flamoral/asset-branding
# or
yarn add @flamoral/asset-branding
# or
pnpm add @flamoral/asset-branding
```

## Usage

### CSS Variables

Import the CSS file to use Flamoral design tokens as CSS custom properties:

```css
/* In your main CSS file */
@import '@flamoral/asset-branding/theme.css';

/* Then use the variables */
.my-component {
  background: var(--color-surface-dark);
  color: var(--color-text-primary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glow-blue);
}
```

### Tailwind CSS

Add the preset to your `tailwind.config.js`:

```javascript
// tailwind.config.js
module.exports = {
  presets: [
    require('@flamoral/asset-branding/tailwind.preset.js')
  ],
  // ... your config
}
```

Then use Flamoral tokens with Tailwind classes:

```html
<div class="bg-surface-dark text-text-primary rounded-lg shadow-glow-blue">
  <h1 class="text-gradient-primary text-4xl font-bold">
    Welcome to Flamoral
  </h1>
  <button class="bg-gradient-primary text-white px-lg py-md rounded-full">
    Get Started
  </button>
</div>
```

### Design Tokens (JSON)

Import tokens directly for use in JavaScript/TypeScript:

```javascript
import tokens from '@flamoral/asset-branding/tokens.json';

// Access colors
const primaryBlue = tokens.colors.primary['gradient-start']; // #0066FF

// Access typography
const fontFamily = tokens.typography.fontFamily.display; // Inter, system-ui, sans-serif

// Access spacing
const spacing = tokens.spacing.lg; // 1.5rem
```

### TypeScript Support

Type definitions are included:

```typescript
import type { FlamoralTokens } from '@flamoral/asset-branding';

const tokens: FlamoralTokens = require('@flamoral/asset-branding/tokens.json');
```

## Design Tokens Reference

### Colors

| Category | Token | Value | Usage |
|----------|-------|-------|-------|
| Primary | `gradient-start` | `#0066FF` | Primary actions, links |
| Primary | `gradient-end` | `#00CCFF` | Gradient endpoint |
| Secondary | `pink` | `#FF1493` | Hearts, likes, matches |
| Secondary | `pink-light` | `#FF69B4` | Hover states |
| Accent | `green` | `#00FF7F` | Success states, online |
| Accent | `green-dark` | `#00CC66` | Success hover |
| Surface | `black` | `#0A0A0A` | App background |
| Surface | `dark` | `#1A1A1A` | Card background |
| Surface | `dark-elevated` | `#2A2A2A` | Elevated elements |
| Text | `primary` | `#FFFFFF` | Main text |
| Text | `secondary` | `#B0B0B0` | Secondary text |
| Text | `muted` | `#666666` | Disabled text |
| State | `success` | `#00FF7F` | Success messages |
| State | `error` | `#FF4444` | Error states |
| State | `warning` | `#FFAA00` | Warnings |
| State | `info` | `#00CCFF` | Information |

### Typography

| Token | Value | Usage |
|-------|-------|-------|
| `fontFamily.display` | Inter, system-ui | Headings |
| `fontFamily.body` | Inter, system-ui | Body text |
| `fontFamily.mono` | JetBrains Mono | Code |
| `fontSize.xs` | 0.75rem (12px) | Small labels |
| `fontSize.sm` | 0.875rem (14px) | Secondary text |
| `fontSize.base` | 1rem (16px) | Body text |
| `fontSize.lg` | 1.125rem (18px) | Large body |
| `fontSize.xl` | 1.25rem (20px) | Small headings |
| `fontSize.2xl` | 1.5rem (24px) | Medium headings |
| `fontSize.3xl` | 2rem (32px) | Large headings |
| `fontSize.4xl` | 2.5rem (40px) | Hero headings |
| `fontSize.5xl` | 3rem (48px) | Display headings |

### Spacing

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 0.25rem (4px) | Tight spacing |
| `sm` | 0.5rem (8px) | Small gaps |
| `md` | 1rem (16px) | Standard spacing |
| `lg` | 1.5rem (24px) | Section spacing |
| `xl` | 2rem (32px) | Large spacing |
| `2xl` | 3rem (48px) | Page sections |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 0.25rem (4px) | Subtle rounding |
| `md` | 0.5rem (8px) | Buttons, inputs |
| `lg` | 1rem (16px) | Cards |
| `xl` | 1.5rem (24px) | Large cards |
| `full` | 9999px | Pills, avatars |

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `glow-blue` | `0 0 20px rgba(0, 102, 255, 0.3)` | Primary glow |
| `glow-pink` | `0 0 20px rgba(255, 20, 147, 0.3)` | Secondary glow |
| `elevated` | `0 4px 20px rgba(0, 0, 0, 0.5)` | Elevated cards |

## Utility Classes

The Tailwind preset includes custom utility classes:

### Gradient Text

```html
<h1 class="text-gradient-primary">Blue gradient text</h1>
<h2 class="text-gradient-secondary">Pink gradient text</h2>
<h3 class="text-gradient-accent">Green gradient text</h3>
```

### Glass Effect

```html
<div class="glass">
  Frosted glass background
</div>
<div class="glass-light">
  Light frosted glass
</div>
```

### Glow Effects

```html
<button class="glow-blue">Blue glow</button>
<button class="glow-pink">Pink glow</button>
<button class="glow-green">Green glow</button>
```

## Docker Deployment

Build and run the asset server:

```bash
# Build the image
docker build -t flamoral-assets .

# Run the container
docker run -p 8080:80 flamoral-assets

# Access assets
curl http://localhost:8080/assets/tokens.json
curl http://localhost:8080/assets/theme.css
```

## Contributing

1. Make changes to `tokens.json` for design token updates
2. Run `npm run build` to regenerate derived files
3. Test changes with `npm test`
4. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built with care by the Flamoral team.
