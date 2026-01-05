/**
 * Apple Calendar (iCloud CalDAV) Integration Service
 * Handles CalDAV authentication and API interactions with Apple Calendar
 *
 * Note: Apple Calendar uses CalDAV protocol with app-specific passwords
 * We provide a Sign in with Apple OAuth flow for authentication,
 * then guide users to create an app-specific password for CalDAV access
 */

import * as crypto from 'crypto';

import axios, { AxiosError } from 'axios';

import { appleCalendarConfig, appleCalDAVConfig } from '../../../config/calendar.config';
import {
  CalendarOAuthTokens,
  CalendarEvent,
  CalendarEventResult,
  TimeSlot,
} from '../../../types/calendar.types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('apple-calendar-oauth');

/**
 * Generate iCalendar UID
 */
function generateUID(): string {
  return `${crypto.randomUUID()}@flamoral.com`;
}

/**
 * Format date to iCalendar format
 */
function formatICalDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/**
 * Generate iCalendar event string
 */
function generateICalEvent(event: CalendarEvent, uid: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Flamoral//Calendar Integration//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICalDate(new Date())}`,
    `DTSTART:${formatICalDate(event.startTime)}`,
    `DTEND:${formatICalDate(event.endTime)}`,
    `SUMMARY:${event.title}`,
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${event.location}`);
  }

  if (event.attendees) {
    event.attendees.forEach((attendee) => {
      lines.push(`ATTENDEE;CN=${attendee.name || attendee.email}:mailto:${attendee.email}`);
    });
  }

  if (event.reminders) {
    event.reminders.forEach((reminder) => {
      lines.push('BEGIN:VALARM');
      lines.push(`ACTION:${reminder.method === 'email' ? 'EMAIL' : 'DISPLAY'}`);
      lines.push(`TRIGGER:-PT${reminder.minutes}M`);
      lines.push(`DESCRIPTION:${event.title} reminder`);
      lines.push('END:VALARM');
    });
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Parse iCalendar VCALENDAR response
 */
function parseICalEvents(icalData: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const eventMatches = icalData.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

  for (const eventStr of eventMatches) {
    try {
      const getProperty = (name: string): string | undefined => {
        const match = eventStr.match(new RegExp(`${name}:(.+?)(?:\\r?\\n|$)`));
        return match ? match[1].trim() : undefined;
      };

      const parseICalDate = (dateStr: string | undefined): Date | undefined => {
        if (!dateStr) return undefined;
        // Handle TZID format: DTSTART;TZID=America/New_York:20260115T100000
        const cleanDate = dateStr.replace(/^[^:]*:/, '');
        // Parse format: 20260115T100000Z or 20260115T100000
        const year = parseInt(cleanDate.substring(0, 4));
        const month = parseInt(cleanDate.substring(4, 6)) - 1;
        const day = parseInt(cleanDate.substring(6, 8));
        const hour = parseInt(cleanDate.substring(9, 11)) || 0;
        const minute = parseInt(cleanDate.substring(11, 13)) || 0;
        const second = parseInt(cleanDate.substring(13, 15)) || 0;
        return new Date(Date.UTC(year, month, day, hour, minute, second));
      };

      const uid = getProperty('UID');
      const summary = getProperty('SUMMARY');
      const dtstart =
        getProperty('DTSTART') || eventStr.match(/DTSTART[^:]*:(.+?)(?:\r?\n|$)/)?.[1];
      const dtend = getProperty('DTEND') || eventStr.match(/DTEND[^:]*:(.+?)(?:\r?\n|$)/)?.[1];

      const startTime = parseICalDate(dtstart);
      const endTime = parseICalDate(dtend);

      if (uid && startTime && endTime) {
        events.push({
          id: uid,
          title: summary || 'Busy',
          description: getProperty('DESCRIPTION'),
          location: getProperty('LOCATION'),
          startTime,
          endTime,
          timezone: 'UTC',
        });
      }
    } catch (error) {
      logger.warn('Failed to parse iCal event:', error);
    }
  }

  return events;
}

/**
 * Apple Calendar OAuth and CalDAV Service
 */
export class AppleCalendarOAuth {
  /**
   * Generate Sign in with Apple authorization URL
   * Note: For full CalDAV access, users need an app-specific password
   */
  static generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: appleCalendarConfig.clientId,
      redirect_uri: appleCalendarConfig.redirectUri,
      response_type: 'code id_token',
      scope: appleCalendarConfig.scopes.join(' '),
      response_mode: 'form_post',
      state,
    });

    return `${appleCalendarConfig.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   * Returns Apple ID tokens, user will need to provide app-specific password separately
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    tokens: CalendarOAuthTokens;
    email: string;
    calendarId: string;
  }> {
    try {
      logger.info('Exchanging Apple authorization code for tokens');

      // Generate client secret JWT for Sign in with Apple
      const clientSecret = await AppleCalendarOAuth.generateClientSecret();

      const tokenResponse = await axios.post(
        appleCalendarConfig.tokenUrl,
        new URLSearchParams({
          client_id: appleCalendarConfig.clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: appleCalendarConfig.redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in, id_token } = tokenResponse.data;

      // Decode ID token to get user email
      const payload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());

      const tokens: CalendarOAuthTokens = {
        accessToken: access_token,
        refreshToken: refresh_token || '',
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
        tokenType: 'Bearer',
        scope: appleCalendarConfig.scopes.join(' '),
      };

      const email = payload.email;
      const calendarId = 'calendar'; // Default calendar

      logger.info(`Successfully authenticated Apple account: ${email}`);

      return { tokens, email, calendarId };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(
        'Failed to exchange code for tokens:',
        axiosError.response?.data || axiosError.message
      );
      throw new Error(`Failed to authenticate with Apple: ${axiosError.message}`);
    }
  }

  /**
   * Generate client secret JWT for Sign in with Apple
   */
  private static async generateClientSecret(): Promise<string> {
    // For Sign in with Apple, the client secret is a JWT signed with your private key
    // This requires the private key from Apple Developer portal
    const privateKey = process.env.APPLE_PRIVATE_KEY;
    const keyId = process.env.APPLE_KEY_ID;
    const teamId = process.env.APPLE_TEAM_ID;

    if (!privateKey || !keyId || !teamId) {
      // Return a placeholder for development
      logger.warn('Apple Sign In credentials not configured, using placeholder');
      return 'dev-apple-client-secret';
    }

    const jwt = require('jsonwebtoken');
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 86400 * 180, // 180 days
      aud: 'https://appleid.apple.com',
      sub: appleCalendarConfig.clientId,
    };

    return jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      header: {
        alg: 'ES256',
        kid: keyId,
      },
    });
  }

  /**
   * Set app-specific password for CalDAV access
   * Users must generate this from appleid.apple.com
   */
  static setAppSpecificPassword(
    tokens: CalendarOAuthTokens,
    appPassword: string
  ): CalendarOAuthTokens {
    // Store the app-specific password in the accessToken field for CalDAV auth
    return {
      ...tokens,
      accessToken: appPassword,
    };
  }

  /**
   * Refresh tokens (for Sign in with Apple, not CalDAV)
   */
  static async refreshAccessToken(refreshToken: string): Promise<CalendarOAuthTokens> {
    try {
      logger.info('Refreshing Apple tokens');

      const clientSecret = await AppleCalendarOAuth.generateClientSecret();

      const tokenResponse = await axios.post(
        appleCalendarConfig.tokenUrl,
        new URLSearchParams({
          client_id: appleCalendarConfig.clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in } = tokenResponse.data;

      return {
        accessToken: access_token,
        refreshToken, // Apple doesn't return new refresh token
        expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000),
        tokenType: 'Bearer',
        scope: appleCalendarConfig.scopes.join(' '),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(
        'Failed to refresh access token:',
        axiosError.response?.data || axiosError.message
      );
      throw new Error(`Failed to refresh Apple token: ${axiosError.message}`);
    }
  }

  /**
   * Get CalDAV calendar URL for user
   */
  private static getCalendarUrl(email: string, calendarId: string): string {
    const userId = email.split('@')[0];
    return `${appleCalDAVConfig.serverUrl}/${userId}/${calendarId}/`;
  }

  /**
   * Get free/busy information via CalDAV
   */
  static async getFreeBusy(
    email: string,
    appPassword: string,
    calendarId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeSlot[]> {
    try {
      logger.info('Fetching free/busy from iCloud CalDAV');

      const calendarUrl = AppleCalendarOAuth.getCalendarUrl(email, calendarId);

      // CalDAV REPORT request for free-busy
      const freeBusyQuery = `<?xml version="1.0" encoding="utf-8" ?>
<C:free-busy-query xmlns:C="urn:ietf:params:xml:ns:caldav">
  <C:time-range start="${formatICalDate(startTime)}" end="${formatICalDate(endTime)}"/>
</C:free-busy-query>`;

      const response = await axios.request({
        method: 'REPORT',
        url: calendarUrl,
        auth: {
          username: email,
          password: appPassword,
        },
        headers: {
          'Content-Type': 'application/xml',
          Depth: '1',
        },
        data: freeBusyQuery,
      });

      // Parse VFREEBUSY response
      const freeBusyMatches = response.data.match(/FREEBUSY:(.+?)(?:\r?\n|$)/g) || [];
      const timeSlots: TimeSlot[] = [];

      for (const fb of freeBusyMatches) {
        const period = fb.replace('FREEBUSY:', '').trim();
        const [start, end] = period.split('/');
        if (start && end) {
          timeSlots.push({
            start: new Date(start),
            end: new Date(end),
            isBusy: true,
          });
        }
      }

      logger.info(`Found ${timeSlots.length} busy slots`);
      return timeSlots;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to fetch free/busy:', axiosError.response?.data || axiosError.message);
      throw new Error(`Failed to fetch availability: ${axiosError.message}`);
    }
  }

  /**
   * Create a calendar event via CalDAV
   */
  static async createEvent(
    email: string,
    appPassword: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<CalendarEventResult> {
    try {
      logger.info(`Creating calendar event: ${event.title}`);

      const uid = generateUID();
      const calendarUrl = AppleCalendarOAuth.getCalendarUrl(email, calendarId);
      const eventUrl = `${calendarUrl}${uid}.ics`;

      const icalEvent = generateICalEvent(event, uid);

      await axios.put(eventUrl, icalEvent, {
        auth: {
          username: email,
          password: appPassword,
        },
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
        },
      });

      logger.info(`Created event with UID: ${uid}`);

      return {
        success: true,
        eventId: uid,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to create event:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: `Failed to create calendar event: ${axiosError.message}`,
      };
    }
  }

  /**
   * Update a calendar event via CalDAV
   */
  static async updateEvent(
    email: string,
    appPassword: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEventResult> {
    try {
      logger.info(`Updating calendar event: ${eventId}`);

      const calendarUrl = AppleCalendarOAuth.getCalendarUrl(email, calendarId);
      const eventUrl = `${calendarUrl}${eventId}.ics`;

      // First, get the existing event
      const existingResponse = await axios.get(eventUrl, {
        auth: {
          username: email,
          password: appPassword,
        },
      });

      // Parse and update the event
      const existingEvents = parseICalEvents(existingResponse.data);
      if (existingEvents.length === 0) {
        return {
          success: false,
          error: 'Event not found',
        };
      }

      const updatedEvent: CalendarEvent = {
        ...existingEvents[0],
        ...event,
      };

      const icalEvent = generateICalEvent(updatedEvent, eventId);

      await axios.put(eventUrl, icalEvent, {
        auth: {
          username: email,
          password: appPassword,
        },
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
        },
      });

      logger.info(`Updated event: ${eventId}`);

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to update event:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: `Failed to update calendar event: ${axiosError.message}`,
      };
    }
  }

  /**
   * Delete a calendar event via CalDAV
   */
  static async deleteEvent(
    email: string,
    appPassword: string,
    calendarId: string,
    eventId: string
  ): Promise<CalendarEventResult> {
    try {
      logger.info(`Deleting calendar event: ${eventId}`);

      const calendarUrl = AppleCalendarOAuth.getCalendarUrl(email, calendarId);
      const eventUrl = `${calendarUrl}${eventId}.ics`;

      await axios.delete(eventUrl, {
        auth: {
          username: email,
          password: appPassword,
        },
      });

      logger.info(`Deleted event: ${eventId}`);

      return {
        success: true,
        eventId,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to delete event:', axiosError.response?.data || axiosError.message);
      return {
        success: false,
        error: `Failed to delete calendar event: ${axiosError.message}`,
      };
    }
  }

  /**
   * List calendar events via CalDAV
   */
  static async listEvents(
    email: string,
    appPassword: string,
    calendarId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEvent[]> {
    try {
      logger.info(`Listing events for calendar ${calendarId}`);

      const calendarUrl = AppleCalendarOAuth.getCalendarUrl(email, calendarId);

      // CalDAV calendar-query REPORT
      const queryXml = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${formatICalDate(startTime)}" end="${formatICalDate(endTime)}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

      const response = await axios.request({
        method: 'REPORT',
        url: calendarUrl,
        auth: {
          username: email,
          password: appPassword,
        },
        headers: {
          'Content-Type': 'application/xml',
          Depth: '1',
        },
        data: queryXml,
      });

      const events = parseICalEvents(response.data);
      logger.info(`Found ${events.length} events`);

      return events;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to list events:', axiosError.response?.data || axiosError.message);
      throw new Error(`Failed to list calendar events: ${axiosError.message}`);
    }
  }

  /**
   * Revoke access (user must delete app-specific password manually)
   */
  static async revokeAccess(): Promise<void> {
    logger.info('Apple Calendar access revocation - user should delete app-specific password');
    // No programmatic way to revoke app-specific passwords
    // User must do this at appleid.apple.com
  }
}

export default AppleCalendarOAuth;
