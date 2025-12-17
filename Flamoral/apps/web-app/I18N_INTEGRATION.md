# i18n Integration Guide for Flamoral Web-App

## Quick Start

### Step 1: Add Package Dependency

Update `package.json`:

```json
{
  "dependencies": {
    "@flamoral/i18n": "workspace:*",
    // ... other dependencies
  }
}
```

Then install:
```bash
npm install
```

### Step 2: Initialize i18n

The initialization file has been created at `src/i18n.ts`:

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

### Step 3: Update main.tsx

Wrap your app with `I18nextProvider`:

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

### Step 4: Add RTL Support to App.tsx

```typescript
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from '@flamoral/i18n';
import { getLanguageDirection } from '@flamoral/i18n';
// ... other imports

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const direction = getLanguageDirection(i18n.language);

  // Set document direction and language when language changes
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n.language, direction]);

  // ... rest of your app
};
```

---

## Converting Components to Use Translations

### Example 1: Landing Page

**Before:**
```typescript
export default function LandingPage() {
  return (
    <div>
      <h1>Welcome to Flamoral</h1>
      <p>Where meaningful connections bloom</p>
      <button>Sign Up</button>
      <button>Sign In</button>
    </div>
  );
}
```

**After:**
```typescript
import { useTranslation } from '@flamoral/i18n';

export default function LandingPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('auth.welcome')}</h1>
      <p>{t('auth.tagline')}</p>
      <button>{t('auth.signUp')}</button>
      <button>{t('auth.signIn')}</button>
    </div>
  );
}
```

### Example 2: Discovery Page with Distance

**Before:**
```typescript
<div>{profile.distance} km away</div>
```

**After:**
```typescript
import { useTranslation } from '@flamoral/i18n';
import { formatDistance } from '@flamoral/i18n';

function ProfileCard({ profile }) {
  const { i18n } = useTranslation();

  return (
    <div>
      {formatDistance(profile.distance, i18n.language)}
    </div>
  );
  // Output for en-US: "6 miles away" (automatically converts)
  // Output for en-GB: "10 km away"
}
```

### Example 3: Settings Page

Create a language selector:

```typescript
// src/pages/Settings/SettingsPage.tsx
import { useTranslation } from '@flamoral/i18n';
import { supportedLanguages } from '@flamoral/i18n';

export const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (langCode: string) => {
    i18n.changeLanguage(langCode);
    // Optionally save to backend
    // await updateUserPreferences({ language: langCode });
  };

  return (
    <div className="settings-page">
      <h1>{t('settings.title')}</h1>

      <section className="settings-section">
        <h2>{t('settings.app.title')}</h2>

        <div className="setting-item">
          <label>{t('settings.app.language')}</label>
          <select
            value={i18n.language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="language-selector"
          >
            {supportedLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.nativeName}
              </option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
};
```

---

## Available Translations

### Translation Keys Structure

```typescript
translation: {
  common: {
    continue, back, cancel, save, delete, edit, done,
    skip, next, previous, loading, error, retry,
    confirm, yes, no, ok, search, filter, sort,
    share, report, block, unblock, mute, unmute
  },
  auth: {
    welcome, tagline, signIn, signUp, signOut,
    email, password, confirmPassword, forgotPassword,
    resetPassword, phoneNumber, verifyCode, sendCode,
    resendCode, orContinueWith, agreeToTerms,
    termsOfService, and, privacyPolicy,
    errors: { ... }
  },
  onboarding: {
    steps: {
      name: { ... },
      birthday: { ... },
      gender: { ... },
      interestedIn: { ... },
      photos: { ... },
      location: { ... },
      interests: { ... },
      prompts: { ... },
      relationshipGoals: { ... },
      lifestyle: { ... },
      notifications: { ... },
      complete: { ... }
    },
    progress
  },
  discovery: {
    title, noMoreProfiles, expandSearch, refreshProfiles,
    distance, online, lastActive, verified, compatibility,
    actions: { pass, like, superLike, boost, rewind },
    outOfLikes: { ... }
  },
  matches: {
    title, newMatch, newMatchSubtitle, sendMessage,
    keepSwiping, noMatches, startSwiping,
    filters: { all, unread, superLikes }
  },
  messages: {
    title, noMessages, startConversation, typeMessage,
    send, delivered, read, typing,
    icebreakers: { ... },
    actions: { ... }
  },
  videoCall: {
    calling, connecting, connected, ended, incoming,
    incomingVideo, incomingVoice, accept, decline,
    endCall, mute, unmute, stopVideo, startVideo,
    speaker, switchCamera, shareScreen, stopShare, duration
  },
  events: {
    title, create, noEvents, adjustFilters, spotsLeft,
    attending, free, going, joinEvent, leaveEvent,
    almostFull, details: { ... }, categories: { ... }
  },
  profile: {
    title, editProfile, viewProfile, settings, premium,
    verification: { ... }, stats: { ... }
  },
  settings: {
    title, logout,
    account: { ... },
    discovery: { ... },
    notifications: { ... },
    privacy: { ... },
    app: { ... },
    about: { ... }
  },
  premium: {
    title, subtitle, subscribe, restore,
    features: { ... }, plans: { ... }
  },
  time: {
    now, minutesAgo, hoursAgo, daysAgo, weeksAgo,
    today, yesterday
  }
}
```

---

## Supported Languages

- 🇺🇸 **en-US** - English (United States) - Miles, USD
- 🇬🇧 **en-GB** - English (United Kingdom) - Kilometers, GBP
- 🇪🇸 **es-ES** - Spanish (Spain) - Kilometers, EUR
- 🇫🇷 **fr-FR** - French (France) - Kilometers, EUR
- 🇩🇪 **de-DE** - German (Germany) - Kilometers, EUR
- 🇧🇷 **pt-BR** - Portuguese (Brazil) - Kilometers, BRL
- 🇸🇦 **ar-SA** - Arabic (Saudi Arabia) - Kilometers, SAR - **RTL**
- 🇨🇳 **zh-CN** - Chinese (Simplified) - Kilometers, CNY
- 🇯🇵 **ja-JP** - Japanese (Japan) - Kilometers, JPY
- 🇰🇷 **ko-KR** - Korean (Korea) - Kilometers, KRW
- 🇮🇳 **hi-IN** - Hindi (India) - Kilometers, INR
- 🇰🇪 **sw-KE** - Swahili (Kenya) - Kilometers, KES

---

## Utility Functions

### formatCurrency
```typescript
import { formatCurrency } from '@flamoral/i18n';

formatCurrency(99.99, 'en-US'); // "$99.99"
formatCurrency(99.99, 'de-DE'); // "99,99 €"
formatCurrency(99.99, 'ja-JP'); // "¥100"
```

### formatDistance
```typescript
import { formatDistance } from '@flamoral/i18n';

formatDistance(10, 'en-US'); // "6 miles"
formatDistance(10, 'en-GB'); // "10 km"
```

### formatNumber
```typescript
import { formatNumber } from '@flamoral/i18n';

formatNumber(1234567, 'en-US'); // "1,234,567"
formatNumber(1234567, 'de-DE'); // "1.234.567"
```

### formatDate
```typescript
import { formatDate } from '@flamoral/i18n';

const date = new Date('2024-12-15');

formatDate(date, 'en-US', { dateStyle: 'long' });
// "December 15, 2024"

formatDate(date, 'es-ES', { dateStyle: 'long' });
// "15 de diciembre de 2024"
```

---

## RTL (Right-to-Left) Support

Arabic (ar-SA) requires RTL layout:

### Automatic Direction Setting
```typescript
// In App.tsx
import { getLanguageDirection } from '@flamoral/i18n';

useEffect(() => {
  const direction = getLanguageDirection(i18n.language);
  document.documentElement.dir = direction;
}, [i18n.language]);
```

### Component-Level RTL
```typescript
import { useTranslation } from '@flamoral/i18n';
import { getLanguageDirection } from '@flamoral/i18n';

function MyComponent() {
  const { i18n } = useTranslation();
  const dir = getLanguageDirection(i18n.language);

  return (
    <div dir={dir} className="my-component">
      {/* Content will flip for RTL languages */}
    </div>
  );
}
```

### Tailwind RTL Support
Add RTL-aware classes:

```typescript
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  {/* Margin left in LTR, margin right in RTL */}
</div>
```

Or update `tailwind.config.js`:
```javascript
module.exports = {
  // Enable RTL support
  plugins: [
    require('tailwindcss-rtl'),
  ],
}
```

---

## Migration Checklist

### Pages to Update
- [ ] LandingPage - Replace hardcoded text with t()
- [ ] LoginPage - Replace auth strings
- [ ] SignupPage - Replace auth strings
- [ ] DiscoveryPage - Add distance formatting
- [ ] MatchesPage - Replace UI strings
- [ ] MessagesPage - Replace message UI strings
- [ ] ProfilePage - Replace profile strings
- [ ] ProfileEditPage - Replace form labels
- [ ] SettingsPage - Add language selector
- [ ] EventsPage - Replace event strings
- [ ] SubscriptionPage - Add currency formatting

### Components to Update
- [ ] Navigation - Replace menu items
- [ ] SwipeCard - Format distance
- [ ] ConversationList - Format timestamps
- [ ] MessageThread - Replace UI strings
- [ ] PhotoUpload - Replace photo tips
- [ ] VideoCall - Replace call UI strings

---

## Testing

### Test Language Switching
```typescript
// In browser console
import { i18n } from './i18n';

// Switch to Spanish
await i18n.changeLanguage('es-ES');

// Switch to Arabic (RTL)
await i18n.changeLanguage('ar-SA');

// Check current language
console.log(i18n.language);
```

### Test Each Locale
1. Switch language in settings
2. Navigate through all pages
3. Check:
   - All text is translated
   - Layout works (especially RTL for Arabic)
   - Currency displays correctly
   - Distance units are correct
   - Date/time formatting is appropriate

---

## Common Patterns

### Loading States
```typescript
const { t } = useTranslation();

if (loading) {
  return <div>{t('common.loading')}</div>;
}
```

### Error Messages
```typescript
const { t } = useTranslation();

if (error) {
  return <div>{t('common.error')}</div>;
}
```

### Button Actions
```typescript
const { t } = useTranslation();

<button onClick={handleSave}>{t('common.save')}</button>
<button onClick={handleCancel}>{t('common.cancel')}</button>
<button onClick={handleDelete}>{t('common.delete')}</button>
```

### Form Labels
```typescript
const { t } = useTranslation();

<input
  type="email"
  placeholder={t('auth.email')}
/>
<input
  type="password"
  placeholder={t('auth.password')}
/>
```

---

## Performance Optimization

### Current State
All 12 locales are loaded on app initialization.

### Future Optimization
Consider lazy loading locales:

```typescript
// Instead of loading all locales
import { enUS, esES, frFR, ... } from '@flamoral/i18n';

// Load dynamically
const loadLocale = async (locale: string) => {
  const translations = await import(`@flamoral/i18n/locales/${locale}`);
  i18n.addResourceBundle(locale, 'translation', translations.default);
};
```

---

## Troubleshooting

### Issue: Translations not showing
**Solution:** Ensure I18nextProvider is wrapping your app in main.tsx

### Issue: Language not changing
**Solution:** Check that `i18n.changeLanguage()` is being called correctly

### Issue: RTL not working
**Solution:** Verify `document.documentElement.dir` is being set in App.tsx

### Issue: Wrong currency/distance unit
**Solution:** Ensure you're using the full locale code (e.g., 'en-US' not 'en')

---

## Additional Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [RTL Styling Guide](https://rtlstyling.com/)
- [Flamoral i18n Package README](../../packages/i18n/README.md)
- [Translation Fixes Guide](../../packages/i18n/I18N_FIXES.md)
