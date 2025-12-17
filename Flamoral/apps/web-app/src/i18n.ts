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
