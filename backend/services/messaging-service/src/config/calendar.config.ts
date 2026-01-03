/**
 * Calendar Integration Configuration
 * OAuth configurations for Google, Apple, and Outlook calendars
 */

import { CalendarProvider, CalendarOAuthConfig } from '../types/calendar.types';

const isProduction = process.env.NODE_ENV === 'production';

function requireSecret(name: string, devDefault: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProduction) throw new Error(`${name} environment variable is required in production`);
  return devDefault;
}

function optionalSecret(name: string): string | undefined {
  return process.env[name];
}

/**
 * Base URL for OAuth redirects
 */
const baseRedirectUrl = process.env.CALENDAR_OAUTH_REDIRECT_BASE_URL || 'http://localhost:3004/api/v1/calendar/oauth';

/**
 * Google Calendar OAuth Configuration
 */
export const googleCalendarConfig: CalendarOAuthConfig = {
  provider: CalendarProvider.GOOGLE,
  clientId: requireSecret('GOOGLE_CALENDAR_CLIENT_ID', 'dev-google-client-id'),
  clientSecret: requireSecret('GOOGLE_CALENDAR_CLIENT_SECRET', 'dev-google-client-secret'),
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scopes: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email',
  ],
  redirectUri: `${baseRedirectUrl}/google/callback`,
};

/**
 * Apple Calendar (iCloud CalDAV) OAuth Configuration
 * Note: Apple uses app-specific passwords for CalDAV access, not OAuth
 * We simulate OAuth-like flow for consistent UX
 */
export const appleCalendarConfig: CalendarOAuthConfig = {
  provider: CalendarProvider.APPLE,
  clientId: requireSecret('APPLE_CALENDAR_CLIENT_ID', 'dev-apple-client-id'),
  clientSecret: requireSecret('APPLE_CALENDAR_CLIENT_SECRET', 'dev-apple-client-secret'),
  authorizationUrl: 'https://appleid.apple.com/auth/authorize',
  tokenUrl: 'https://appleid.apple.com/auth/token',
  scopes: ['name', 'email'],
  redirectUri: `${baseRedirectUrl}/apple/callback`,
};

/**
 * Apple CalDAV Configuration
 */
export const appleCalDAVConfig = {
  serverUrl: 'https://caldav.icloud.com',
  principalPath: '/principals/users/',
  calendarPath: '/calendars/',
};

/**
 * Microsoft Outlook Calendar OAuth Configuration
 */
export const outlookCalendarConfig: CalendarOAuthConfig = {
  provider: CalendarProvider.OUTLOOK,
  clientId: requireSecret('OUTLOOK_CALENDAR_CLIENT_ID', 'dev-outlook-client-id'),
  clientSecret: requireSecret('OUTLOOK_CALENDAR_CLIENT_SECRET', 'dev-outlook-client-secret'),
  authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  scopes: [
    'offline_access',
    'openid',
    'profile',
    'email',
    'Calendars.ReadWrite',
  ],
  redirectUri: `${baseRedirectUrl}/outlook/callback`,
};

/**
 * Get OAuth configuration for a provider
 */
export function getCalendarOAuthConfig(provider: CalendarProvider): CalendarOAuthConfig {
  switch (provider) {
    case CalendarProvider.GOOGLE:
      return googleCalendarConfig;
    case CalendarProvider.APPLE:
      return appleCalendarConfig;
    case CalendarProvider.OUTLOOK:
      return outlookCalendarConfig;
    default:
      throw new Error(`Unsupported calendar provider: ${provider}`);
  }
}

/**
 * Calendar Integration General Settings
 */
export const calendarConfig = {
  // OAuth settings
  oauth: {
    stateExpiration: 600, // 10 minutes in seconds
    tokenRefreshBuffer: 300, // Refresh tokens 5 minutes before expiry
  },

  // Date proposal settings
  proposals: {
    defaultDuration: 60, // Default date duration in minutes
    expirationHours: 48, // Proposals expire after 48 hours
    maxActiveProposals: 3, // Max pending proposals per conversation
  },

  // Reminder settings
  reminders: {
    defaultTimings: [1440, 60], // 1 day and 1 hour before by default
    maxRemindersPerDate: 4,
  },

  // Availability settings
  availability: {
    maxQueryDays: 30, // Maximum days to query for availability
    slotDuration: 30, // Slot duration in minutes for availability
    defaultWorkingHours: {
      start: 9, // 9 AM
      end: 21, // 9 PM
    },
  },

  // Venue suggestions settings
  venues: {
    defaultSearchRadius: 5000, // 5km default radius
    maxSearchRadius: 50000, // 50km max radius
    resultsLimit: 20,
  },

  // Google Places API
  googlePlaces: {
    apiKey: optionalSecret('GOOGLE_PLACES_API_KEY'),
    baseUrl: 'https://maps.googleapis.com/maps/api/place',
  },

  // Sync settings
  sync: {
    batchSize: 50,
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },
};

export default calendarConfig;
