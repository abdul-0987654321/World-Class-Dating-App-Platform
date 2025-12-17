/**
 * i18n Package
 */

export { initI18n, i18n, resources, supportedLanguages, defaultNS } from './i18n';
export type { SupportedLanguage } from './i18n';
export { en } from './locales/en';
export { es } from './locales/es';

// Re-export react-i18next hooks
export { useTranslation, Trans, I18nextProvider } from 'react-i18next';
