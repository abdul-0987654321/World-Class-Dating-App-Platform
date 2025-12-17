# i18n Quick Start Guide

## 🚀 5-Minute Setup

### 1. Fix the Package (30 seconds)

**Windows:**
```bash
cd packages/i18n
fix-i18n.bat
```

**Linux/Mac:**
```bash
cd packages/i18n
chmod +x fix-i18n.sh
./fix-i18n.sh
```

**Or manually:**
Edit `packages/i18n/src/index.ts` and replace all content with:
```typescript
export * from './exports';
```

Then build:
```bash
npm run build
```

---

### 2. Add to Web App (1 minute)

Edit `apps/web-app/package.json`:

```json
{
  "dependencies": {
    "@flamoral/i18n": "workspace:*",
    ...existing dependencies
  }
}
```

Install:
```bash
cd apps/web-app
npm install
```

---

### 3. Update main.tsx (2 minutes)

Replace `apps/web-app/src/main.tsx` with:

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

### 4. Add RTL Support (1 minute)

Add to `apps/web-app/src/App.tsx` (inside App component):

```typescript
import { useTranslation } from '@flamoral/i18n';
import { getLanguageDirection } from '@flamoral/i18n';

const App: React.FC = () => {
  const { i18n } = useTranslation();

  // Add this useEffect
  useEffect(() => {
    const direction = getLanguageDirection(i18n.language);
    document.documentElement.dir = direction;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  // ... rest of your app
};
```

---

### 5. Test It! (30 seconds)

```bash
cd apps/web-app
npm run dev
```

Open browser console and test:
```javascript
// Current language (should be detected from browser)
console.log(i18n.language); // e.g., "en-US"

// Change language
await i18n.changeLanguage('es-ES');

// Reload page - should be in Spanish!
```

---

## ✅ You're Done!

Now you can use translations anywhere:

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

---

## 🌍 Available Languages

Try switching to:
- `en-US` - English (United States)
- `en-GB` - English (United Kingdom)
- `es-ES` - Español
- `fr-FR` - Français
- `de-DE` - Deutsch
- `pt-BR` - Português
- `ar-SA` - العربية (RTL)
- `zh-CN` - 中文
- `ja-JP` - 日本語
- `ko-KR` - 한국어
- `hi-IN` - हिन्दी
- `sw-KE` - Kiswahili

---

## 📚 Need More Help?

- **Detailed Guide:** See `I18N_FIXES.md`
- **Integration Guide:** See `apps/web-app/I18N_INTEGRATION.md`
- **Summary:** See `I18N_SUMMARY.md`
- **Official Docs:** https://react.i18next.com/

---

## 🔥 Quick Commands Reference

```bash
# Fix package
cd packages/i18n && npm run build

# Add to web-app
cd apps/web-app && npm install

# Start dev
npm run dev

# Build production
npm run build
```

---

**That's it! You now have 12-language support! 🎉**
