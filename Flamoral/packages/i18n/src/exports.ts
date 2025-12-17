/**
 * i18n Package Exports - Flamoral Dating Platform
 * Full internationalization support with 12 locales
 */

// Main configuration
export { initI18n, i18n, resources, supportedLanguages, defaultNS } from './i18n';
export type { SupportedLanguage } from './i18n';

// Enhanced configuration with utilities
export {
  initI18nConfig,
  isRTL,
  getLanguageDirection,
  getCurrencyForLocale,
  getDistanceUnitForLocale,
  detectLocale,
  formatCurrency,
  formatNumber,
  formatDate,
  formatDistance,
  RTL_LANGUAGES,
} from './config';
export type { SupportedLanguageCode } from './config';

// Locale exports
export { en } from './locales/en';
export { es } from './locales/es';
export { enUS } from './locales/en-US';
export { enGB } from './locales/en-GB';
export { esES } from './locales/es-ES';
export { frFR } from './locales/fr-FR';
export { deDE } from './locales/de-DE';
export { ptBR } from './locales/pt-BR';
export { arSA } from './locales/ar-SA';
export { zhCN } from './locales/zh-CN';
export { jaJP } from './locales/ja-JP';
export { koKR } from './locales/ko-KR';
export { hiIN } from './locales/hi-IN';
export { swKE } from './locales/sw-KE';

// Re-export react-i18next hooks
export { useTranslation, Trans, I18nextProvider } from 'react-i18next';
