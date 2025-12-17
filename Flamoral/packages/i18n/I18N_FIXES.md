# i18n Package Fixes for Flamoral

## Issues Found

### 1. Duplicate Export Configuration
**Problem:** `src/index.ts` exports from old `i18n.ts` instead of using the comprehensive `exports.ts` file.

**Current Code in `src/index.ts`:**
```typescript
export { initI18n, i18n, resources, supportedLanguages, defaultNS } from './i18n';
export type { SupportedLanguage } from './i18n';
export { en } from './locales/en';
export { es } from './locales/es';
export { useTranslation, Trans, I18nextProvider } from 'react-i18next';
```

**Fix Required:**
```typescript
/**
 * i18n Package Exports - Flamoral Dating Platform
 * Full internationalization support with 12 locales
 */

// Export everything from exports.ts (the comprehensive export file)
export * from './exports';
```

**Why:** The `exports.ts` file already contains all necessary exports including:
- All 12 locale translations (en-US, en-GB, es-ES, fr-FR, de-DE, pt-BR, ar-SA, zh-CN, ja-JP, ko-KR, hi-IN, sw-KE)
- Legacy locales (en, es) for backward compatibility
- Enhanced config utilities (RTL support, currency formatting, etc.)
- React-i18next hooks

---

### 2. Missing i18n Package in Web-App

**Problem:** The `@flamoral/i18n` package is not listed as a dependency in `apps/web-app/package.json`

**Fix Required:**
Add to `apps/web-app/package.json` dependencies:
```json
{
  "dependencies": {
    "@flamoral/i18n": "workspace:*",
    // ... other dependencies
  }
}
```

Then run:
```bash
cd apps/web-app
npm install
```

---

### 3. No i18n Initialization in Web-App

**Problem:** The web-app doesn't initialize or use the i18n package

**Solution Implemented:**
Created `apps/web-app/src/i18n.ts`:
```typescript
/**
 * i18n Configuration for Flamoral Web App
 * Initializes internationalization with locale detection and RTL support
 */

import { initI18nConfig } from '@flamoral/i18n';

// Initialize i18n with auto-detection
initI18nConfig({
  detection: true,
  debug: import.meta.env.DEV,
  fallbackLng: 'en-US',
});

export { i18n } from '@flamoral/i18n';
```

**Update Required in `apps/web-app/src/main.tsx`:**
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { I18nextProvider } from '@flamoral/i18n';
import { store, persistor } from './store';
import { i18n } from './i18n';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    </I18nextProvider>
  </React.StrictMode>
);
```

---

## Package Structure Overview

### Translation Files (`packages/i18n/src/locales/`)
All locale files are properly structured with comprehensive translations:

- **en-US.ts** - English (United States) - Uses miles, USD
- **en-GB.ts** - English (United Kingdom) - Uses km, GBP
- **es-ES.ts** - Spanish (Spain) - Uses km, EUR
- **fr-FR.ts** - French (France) - Uses km, EUR
- **de-DE.ts** - German (Germany) - Uses km, EUR
- **pt-BR.ts** - Portuguese (Brazil) - Uses km, BRL
- **ar-SA.ts** - Arabic (Saudi Arabia) - Uses km, SAR, **RTL support**
- **zh-CN.ts** - Chinese (Simplified) - Uses km, CNY
- **ja-JP.ts** - Japanese (Japan) - Uses km, JPY
- **ko-KR.ts** - Korean (Korea) - Uses km, KRW
- **hi-IN.ts** - Hindi (India) - Uses km, INR
- **sw-KE.ts** - Swahili (Kenya) - Uses km, KES
- **en.ts** - Legacy English (for backward compatibility)
- **es.ts** - Legacy Spanish (for backward compatibility)

### Configuration Files

#### `src/config.ts` - Enhanced Configuration
Provides:
- All 12 locale resources
- RTL language detection
- Currency formatting per locale
- Distance unit conversion (km/miles)
- Number and date formatting
- Browser locale detection

#### `src/i18n.ts` - Legacy Configuration
Basic i18next setup (kept for backward compatibility)

#### `src/exports.ts` - Comprehensive Exports
Exports everything needed:
- All locale translations
- Configuration utilities
- React-i18next hooks
- Type definitions

---

## RTL Support

The package supports RTL (Right-to-Left) languages:

**RTL Language:** Arabic (ar-SA)

**Helper Functions:**
```typescript
import { isRTL, getLanguageDirection } from '@flamoral/i18n';

// Check if locale is RTL
const isRightToLeft = isRTL('ar-SA'); // true

// Get direction
const direction = getLanguageDirection('ar-SA'); // 'rtl'
```

**Usage in Components:**
```typescript
import { useTranslation } from '@flamoral/i18n';
import { getLanguageDirection } from '@flamoral/i18n';

function MyComponent() {
  const { i18n } = useTranslation();
  const dir = getLanguageDirection(i18n.language);

  return (
    <div dir={dir}>
      {/* Content will be RTL for Arabic */}
    </div>
  );
}
```

---

## Utility Functions

### Currency Formatting
```typescript
import { formatCurrency, getCurrencyForLocale } from '@flamoral/i18n';

// Auto-detect currency from locale
formatCurrency(99.99, 'en-US'); // "$99.99"
formatCurrency(99.99, 'de-DE'); // "99,99 €"
formatCurrency(99.99, 'ar-SA'); // "٩٩٫٩٩ ر.س"

// Custom currency
formatCurrency(99.99, 'en-US', 'EUR'); // "€99.99"
```

### Distance Formatting
```typescript
import { formatDistance } from '@flamoral/i18n';

// Converts based on locale preference
formatDistance(10, 'en-US'); // "6 miles" (converts km to miles)
formatDistance(10, 'en-GB'); // "10 km"
```

### Number Formatting
```typescript
import { formatNumber } from '@flamoral/i18n';

formatNumber(1234567.89, 'en-US'); // "1,234,567.89"
formatNumber(1234567.89, 'de-DE'); // "1.234.567,89"
```

### Date Formatting
```typescript
import { formatDate } from '@flamoral/i18n';

const date = new Date('2024-12-15');

formatDate(date, 'en-US', { dateStyle: 'long' });
// "December 15, 2024"

formatDate(date, 'fr-FR', { dateStyle: 'long' });
// "15 décembre 2024"
```

---

## Using Translations in Components

### Basic Usage
```typescript
import { useTranslation } from '@flamoral/i18n';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('auth.welcome')}</h1>
      <p>{t('auth.tagline')}</p>
      <button>{t('common.continue')}</button>
    </div>
  );
}
```

### With Interpolation
```typescript
const { t } = useTranslation();

// Name interpolation
t('onboarding.steps.birthday.title', { name: 'John' });
// Output: "When's your birthday, John?"

// Age interpolation
t('onboarding.steps.birthday.youAre', { age: 25 });
// Output: "You're 25 years old"
```

### Language Switching
```typescript
import { useTranslation } from '@flamoral/i18n';

function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <select onChange={(e) => changeLanguage(e.target.value)}>
      <option value="en-US">English (US)</option>
      <option value="es-ES">Español</option>
      <option value="fr-FR">Français</option>
      <option value="ar-SA">العربية</option>
    </select>
  );
}
```

---

## Build and Testing

### Build the Package
```bash
cd packages/i18n
npm run build
```

This will:
1. Compile TypeScript to JavaScript
2. Generate type definitions
3. Create both CJS and ESM outputs in `dist/`

### Expected Output
```
dist/
├── index.js          # CommonJS
├── index.mjs         # ES Module
└── index.d.ts        # TypeScript definitions
```

---

## Integration Checklist

- [ ] Fix `packages/i18n/src/index.ts` to export from `exports.ts`
- [ ] Build the i18n package: `npm run build`
- [ ] Add `@flamoral/i18n` to web-app dependencies
- [ ] Install dependencies in web-app: `npm install`
- [ ] Update `apps/web-app/src/main.tsx` to wrap app with `I18nextProvider`
- [ ] Add language selector component to settings page
- [ ] Update all hardcoded strings to use `t()` function
- [ ] Add RTL CSS support for Arabic
- [ ] Test all 12 locales
- [ ] Test currency formatting
- [ ] Test distance units (km vs miles)
- [ ] Test RTL layout for Arabic

---

## Translation Coverage

### Fully Translated Sections
All locales include translations for:
- ✅ Common UI elements (buttons, labels)
- ✅ Authentication (login, signup, errors)
- ✅ Onboarding flow (name, birthday, gender, interests)
- ✅ Discovery/Swiping interface
- ✅ Matches and messaging
- ✅ Profile and settings
- ✅ Time formatting
- ✅ Basic app navigation

### Partial Coverage
Some advanced features have basic translations but may need expansion:
- ⚠️ Events (basic translations exist)
- ⚠️ Premium features
- ⚠️ Video calls
- ⚠️ Lifestyle questions

### Missing Sections
The following may need translation additions:
- ❌ Admin panel
- ❌ Gamification/rewards
- ❌ Communities
- ❌ Speed dating
- ❌ Safety center

---

## Recommendations

1. **Fix index.ts immediately** - This is blocking proper exports
2. **Add to web-app** - Integrate i18n into the web application
3. **Create language selector** - Add UI component for users to switch languages
4. **Translate remaining strings** - Identify and translate all hardcoded text
5. **Add more locales** - Consider adding Italian (it-IT), Russian (ru-RU), etc.
6. **Test RTL thoroughly** - Ensure Arabic layout works correctly
7. **Add translation management** - Consider using a service like Crowdin or Lokalise
8. **Performance** - Currently all locales load at once; consider lazy loading

---

## Example: Complete Integration

### Step 1: Component with Translations
```typescript
// src/pages/Auth/LoginPage.tsx
import { useTranslation } from '@flamoral/i18n';

export function LoginPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('auth.welcome')}</h1>
      <p>{t('auth.tagline')}</p>

      <form>
        <input
          type="email"
          placeholder={t('auth.email')}
        />
        <input
          type="password"
          placeholder={t('auth.password')}
        />
        <button>{t('auth.signIn')}</button>
      </form>

      <a href="/forgot-password">
        {t('auth.forgotPassword')}
      </a>
    </div>
  );
}
```

### Step 2: Settings Page with Language Selector
```typescript
// src/pages/Settings/SettingsPage.tsx
import { useTranslation } from '@flamoral/i18n';
import { supportedLanguages } from '@flamoral/i18n';

export function SettingsPage() {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h2>{t('settings.app.language')}</h2>

      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
      >
        {supportedLanguages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### Step 3: RTL Support in Layout
```typescript
// src/App.tsx
import { useTranslation } from '@flamoral/i18n';
import { getLanguageDirection } from '@flamoral/i18n';

export default function App() {
  const { i18n } = useTranslation();
  const direction = getLanguageDirection(i18n.language);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n.language, direction]);

  return (
    <div className="app" dir={direction}>
      {/* Your app content */}
    </div>
  );
}
```

---

## Testing i18n

```typescript
// Test changing language
import { i18n } from './i18n';

// Change to Spanish
await i18n.changeLanguage('es-ES');

// Change to Arabic (RTL)
await i18n.changeLanguage('ar-SA');

// Get current language
console.log(i18n.language); // 'ar-SA'

// Test translation
console.log(i18n.t('common.continue')); // 'متابعة' (Arabic)
```

---

## Next Steps

1. Apply the fix to `packages/i18n/src/index.ts`
2. Build the package
3. Integrate into web-app
4. Test each locale
5. Add missing translations for advanced features
6. Consider adding more languages based on target markets
