/**
 * i18n Configuration - Enhanced with all locales and RTL support
 * Supports 12 locales with multi-currency and formatting
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enUS } from './locales/en-US';
import { enGB } from './locales/en-GB';
import { esES } from './locales/es-ES';
import { frFR } from './locales/fr-FR';
import { deDE } from './locales/de-DE';
import { ptBR } from './locales/pt-BR';
import { arSA } from './locales/ar-SA';
import { zhCN } from './locales/zh-CN';
import { jaJP } from './locales/ja-JP';
import { koKR } from './locales/ko-KR';
import { hiIN } from './locales/hi-IN';
import { swKE } from './locales/sw-KE';

// Legacy imports for backward compatibility
import { en } from './locales/en';
import { es } from './locales/es';

export const resources = {
  'en-US': enUS,
  'en-GB': enGB,
  'es-ES': esES,
  'fr-FR': frFR,
  'de-DE': deDE,
  'pt-BR': ptBR,
  'ar-SA': arSA,
  'zh-CN': zhCN,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'hi-IN': hiIN,
  'sw-KE': swKE,
  // Legacy support
  en,
  es,
} as const;

export const supportedLanguages = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', currency: 'USD', rtl: false, distanceUnit: 'miles' },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', currency: 'GBP', rtl: false, distanceUnit: 'km' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español', currency: 'EUR', rtl: false, distanceUnit: 'km' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français', currency: 'EUR', rtl: false, distanceUnit: 'km' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch', currency: 'EUR', rtl: false, distanceUnit: 'km' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português (Brasil)', currency: 'BRL', rtl: false, distanceUnit: 'km' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية', currency: 'SAR', rtl: true, distanceUnit: 'km' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', currency: 'CNY', rtl: false, distanceUnit: 'km' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語', currency: 'JPY', rtl: false, distanceUnit: 'km' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어', currency: 'KRW', rtl: false, distanceUnit: 'km' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', currency: 'INR', rtl: false, distanceUnit: 'km' },
  { code: 'sw-KE', name: 'Swahili', nativeName: 'Kiswahili', currency: 'KES', rtl: false, distanceUnit: 'km' },
] as const;

export type SupportedLanguageCode = typeof supportedLanguages[number]['code'];
export type SupportedLanguage = typeof supportedLanguages[number];

export const defaultNS = 'translation';

// RTL languages
export const RTL_LANGUAGES = ['ar-SA'];

/**
 * Check if a language is RTL
 */
export function isRTL(locale: string): boolean {
  return RTL_LANGUAGES.includes(locale);
}

/**
 * Get language direction for a locale
 */
export function getLanguageDirection(locale: string): 'ltr' | 'rtl' {
  return isRTL(locale) ? 'rtl' : 'ltr';
}

/**
 * Get currency for a locale
 */
export function getCurrencyForLocale(locale: string): string {
  const language = supportedLanguages.find(lang => lang.code === locale);
  return language?.currency || 'USD';
}

/**
 * Get distance unit for a locale
 */
export function getDistanceUnitForLocale(locale: string): 'km' | 'miles' {
  const language = supportedLanguages.find(lang => lang.code === locale);
  return language?.distanceUnit || 'km';
}

/**
 * Get locale from browser or system
 */
export function detectLocale(): string {
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language;
    // Try exact match first
    if (resources[browserLang as keyof typeof resources]) {
      return browserLang;
    }
    // Try language code match (e.g., 'en' from 'en-AU')
    const langCode = browserLang.split('-')[0];
    const match = supportedLanguages.find(lang =>
      lang.code.startsWith(langCode)
    );
    return match?.code || 'en-US';
  }
  return 'en-US';
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number,
  locale: string,
  currency?: string
): string {
  const currencyCode = currency || getCurrencyForLocale(locale);
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Format number based on locale
 */
export function formatNumber(number: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale).format(number);
  } catch (error) {
    return number.toString();
  }
}

/**
 * Format date based on locale
 */
export function formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch (error) {
    return date.toLocaleDateString();
  }
}

/**
 * Convert distance based on locale preference
 */
export function formatDistance(distanceInKm: number, locale: string): string {
  const unit = getDistanceUnitForLocale(locale);

  if (unit === 'miles') {
    const miles = distanceInKm * 0.621371;
    return `${Math.round(miles)} miles`;
  }

  return `${Math.round(distanceInKm)} km`;
}

/**
 * Initialize i18n with enhanced configuration
 */
export function initI18nConfig(options?: {
  lng?: string;
  debug?: boolean;
  fallbackLng?: string;
  detection?: boolean;
}) {
  const {
    lng,
    debug = false,
    fallbackLng = 'en-US',
    detection = true
  } = options || {};

  const initialLocale = detection ? detectLocale() : (lng || 'en-US');

  return i18n.use(initReactI18next).init({
    resources,
    lng: initialLocale,
    fallbackLng,
    debug,
    defaultNS,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export { i18n };
