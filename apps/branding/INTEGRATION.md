# Flamoral Brand Integration Guide

Complete integration instructions for the Flamoral brand identity system.

---

## Quick Start

### 1. Install Dependencies

```bash
# For React Web
npm install

# For React Native
npm install react-native-linear-gradient
# OR for Expo
npx expo install expo-linear-gradient
```

### 2. Import Brand Assets

```typescript
// Design Tokens
import { colors, gradients, spacing, typography } from '@branding/ui-kit/tokens';

// Web Components
import { FlamoralButton, ProfileCard } from '@branding/ui-kit/web';

// React Native Components
import { Button, ProfileCard } from '@branding/ui-kit/rn';

// Icons
import { FlameHeart, CrownPremium, VerifiedBadge } from '@branding/icons/react';

// Gradients
import { flamoralPrimary, velvetNight } from '@branding/gradients/gradients';
```

---

## Folder Structure

```
apps/branding/
├── flamoral-brand-guidelines.md    # Complete brand guidelines
├── INTEGRATION.md                  # This file
│
├── ui-kit/
│   ├── tokens.ts                   # Design tokens (colors, spacing, etc.)
│   ├── web/
│   │   ├── Button.tsx              # Web button component
│   │   ├── Button.css              # Button styles
│   │   ├── Card.tsx                # Card components
│   │   └── Card.css                # Card styles
│   └── rn/
│       ├── gradients.ts            # RN gradient configs
│       ├── Button.tsx              # RN button component
│       └── ProfileCard.tsx         # RN profile card
│
├── gradients/
│   ├── flame-gradients.css         # CSS gradients & utilities
│   └── gradients.ts                # TypeScript gradient system
│
└── icons/
    ├── svg/                        # Raw SVG files
    │   ├── flame-heart.svg
    │   ├── spark.svg
    │   ├── crown-premium.svg
    │   ├── shield-heart.svg
    │   ├── chat-bubble.svg
    │   ├── lightning.svg
    │   ├── ticket.svg
    │   ├── online-dot.svg
    │   ├── verified-badge.svg
    │   └── location-pin.svg
    └── react/                      # React icon components
        ├── index.ts
        ├── FlameHeart.tsx
        ├── Spark.tsx
        └── ... (all icons)
```

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Flame Red | `#D62839` | Primary actions, CTA buttons |
| Ember Orange | `#FF6E35` | Accent, gradient endpoints |
| Velvet Wine | `#7A1020` | Premium features, depth |
| Rich Charcoal | `#1A1A1A` | Backgrounds, text |
| Ember Gold | `#D9A657` | Premium badges, highlights |

### Secondary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Blush Coral | `#E45C5C` | Soft accents |
| Copper | `#C77A45` | Warm tones |
| Smoke Grey | `#C4C4C4` | Borders, disabled states |
| Soft Ivory | `#FFF6EE` | Light backgrounds, text on dark |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#22C55E` | Online status, confirmations |
| Error | `#EF4444` | Errors, destructive actions |
| Warning | `#F59E0B` | Warnings, pending states |
| Info | `#3B82F6` | Super likes, informational |

---

## Using Gradients

### CSS (Web)

```css
/* Import the stylesheet */
@import '@branding/gradients/flame-gradients.css';

/* Use utility classes */
.my-button {
  background: var(--gradient-flamoral-primary);
}

/* Or use predefined classes */
<button class="bg-gradient-flamoral-primary">Click Me</button>
<span class="text-gradient-flame">Gradient Text</span>
```

### React (Web)

```tsx
import { getGradientCSS } from '@branding/gradients/gradients';

const MyComponent = () => (
  <div style={{ background: getGradientCSS('flamoralPrimary') }}>
    Content
  </div>
);
```

### React Native

```tsx
import LinearGradient from 'react-native-linear-gradient';
import { flamoralPrimary } from '@branding/ui-kit/rn/gradients';

const MyComponent = () => (
  <LinearGradient
    colors={flamoralPrimary.colors}
    start={flamoralPrimary.start}
    end={flamoralPrimary.end}
    locations={flamoralPrimary.locations}
    style={styles.container}
  >
    <Text>Content</Text>
  </LinearGradient>
);
```

---

## Using Icons

### React Components

```tsx
import { FlameHeart, CrownPremium, VerifiedBadge } from '@branding/icons/react';

// Default with gradient
<FlameHeart size={32} />

// Custom color
<FlameHeart size={24} color="#D62839" />

// With className for styling
<CrownPremium size={20} className="premium-icon" />
```

### SVG Direct Import

```tsx
import FlameHeartSvg from '@branding/icons/svg/flame-heart.svg';

// Use as image source
<img src={FlameHeartSvg} alt="Flame Heart" />

// Or with react-svg or similar
<ReactSVG src={FlameHeartSvg} />
```

---

## Using UI Components

### Web Buttons

```tsx
import { FlamoralButton, PrimaryButton, SecondaryButton } from '@branding/ui-kit/web/Button';
import '@branding/ui-kit/web/Button.css';

// Primary gradient button
<FlamoralButton variant="primary" size="lg" fullWidth>
  Find Your Match
</FlamoralButton>

// Secondary button
<SecondaryButton size="md">
  View Profile
</SecondaryButton>

// With icons
<FlamoralButton leftIcon={<FlameHeart size={18} />}>
  Super Like
</FlamoralButton>
```

### Web Cards

```tsx
import { ProfileCard, PremiumCard, FeatureCard } from '@branding/ui-kit/web/Card';
import '@branding/ui-kit/web/Card.css';

<ProfileCard
  name="Sarah"
  age={28}
  location="New York"
  imageUrl="/photos/sarah.jpg"
  isVerified
  interests={['Travel', 'Music', 'Yoga']}
  onLike={() => handleLike()}
  onPass={() => handlePass()}
/>
```

### React Native Buttons

```tsx
import { Button, PrimaryButton } from '@branding/ui-kit/rn/Button';

<Button variant="primary" size="lg" fullWidth onPress={handlePress}>
  Continue
</Button>

<Button
  variant="secondary"
  loading={isLoading}
  leftIcon={<CrownPremium size={18} color="#D9A657" />}
>
  Upgrade to Premium
</Button>
```

### React Native Profile Card

```tsx
import { ProfileCard } from '@branding/ui-kit/rn/ProfileCard';

<ProfileCard
  name="Alex"
  age={25}
  location="Los Angeles"
  imageUrl="https://example.com/photo.jpg"
  isVerified={true}
  isOnline={true}
  bio="Adventure seeker and coffee enthusiast"
  distance="5 miles away"
  interests={['Hiking', 'Photography', 'Coffee']}
  onLike={() => swipeRight()}
  onPass={() => swipeLeft()}
  onSuperLike={() => superLike()}
/>
```

---

## Design Tokens Reference

### Spacing Scale
```typescript
spacing: {
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 16,   // 16px
  lg: 24,   // 24px
  xl: 32,   // 32px
  xxl: 48,  // 48px
  xxxl: 64, // 64px
}
```

### Border Radius
```typescript
radii: {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
}
```

### Typography
```typescript
typography: {
  fonts: {
    heading: "'Playfair Display', serif",
    body: "'Inter', sans-serif",
  },
  weights: {
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
  },
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  }
}
```

---

## Font Setup

### Web (CSS)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&display=swap');

body {
  font-family: 'Inter', sans-serif;
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Playfair Display', serif;
}
```

### React Native
```typescript
// Using expo-font
import { useFonts, Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';

const [fontsLoaded] = useFonts({
  Inter_400Regular,
  Inter_600SemiBold,
  PlayfairDisplay_700Bold,
});
```

---

## Accessibility Guidelines

1. **Color Contrast**: All text meets WCAG 2.1 AA standards
   - Soft Ivory (#FFF6EE) on Rich Charcoal (#1A1A1A): 14.5:1
   - Flame Red (#D62839) on Soft Ivory (#FFF6EE): 5.2:1

2. **Touch Targets**: Minimum 44x44px for mobile

3. **Reduced Motion**: Animations respect `prefers-reduced-motion`

4. **Screen Readers**: All interactive elements have proper labels

---

## Tailwind CSS Integration

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        flamoral: {
          flame: '#D62839',
          ember: '#FF6E35',
          velvet: '#7A1020',
          charcoal: '#1A1A1A',
          gold: '#D9A657',
          coral: '#E45C5C',
          copper: '#C77A45',
          smoke: '#C4C4C4',
          ivory: '#FFF6EE',
        },
      },
      backgroundImage: {
        'gradient-flamoral': 'linear-gradient(135deg, #D62839 0%, #FF6E35 100%)',
        'gradient-velvet': 'linear-gradient(135deg, #7A1020 0%, #1A1A1A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #D9A657 0%, #C77A45 100%)',
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'flame-glow': '0 4px 24px rgba(214, 40, 57, 0.35)',
        'gold-glow': '0 4px 24px rgba(217, 166, 87, 0.35)',
      },
    },
  },
};
```

---

## Quick Reference Card

| Element | Value |
|---------|-------|
| Primary Gradient | `linear-gradient(135deg, #D62839 0%, #FF6E35 100%)` |
| Background (Dark) | `#1A1A1A` |
| Background (Light) | `#FFF6EE` |
| Text (on Dark) | `#FFF6EE` |
| Text (on Light) | `#1A1A1A` |
| Heading Font | Playfair Display |
| Body Font | Inter |
| Border Radius (Buttons) | 12px |
| Border Radius (Cards) | 24px |
| Shadow (Glow) | `0 4px 24px rgba(214, 40, 57, 0.35)` |

---

## Support & Resources

- **Brand Guidelines**: `apps/branding/flamoral-brand-guidelines.md`
- **Design Tokens**: `apps/branding/ui-kit/tokens.ts`
- **CSS Variables**: `apps/branding/gradients/flame-gradients.css`

For questions or updates, refer to the brand guidelines document.
