/**
 * Google Calendar OAuth Service
 * Handles OAuth flow and API interactions with Google Calendar
 */

import axios, { AxiosError } from 'axios';

import { googleCalendarConfig, calendarConfig } from '../../../config/calendar.config';
import {
  CalendarOAuthTokens,
  CalendarEvent,
  CalendarEventResult,
  TimeSlot,
  CalendarProvider,
} from '../../../types/calendar.types';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('google-calendar-oauth');

/**
 * Google Calendar API Base URL
 */
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

/**
 * Google User Info API
 */
const GOOGLE_USERINFO_API = 'https://www.googleapis.com/oauth2/v2/userinfo';

/**
 * Google Calendar OAuth Service
 */
export class GoogleCalendarOAuth {
  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: googleCalendarConfig.clientId,
      redirect_uri: googleCalendarConfig.redirectUri,
      response_type: 'code',
      scope: googleCalendarConfig.scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${googleCalendarConfig.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(code: string): Promise<{
    tokens: CalendarOAuthTokens;
    email: string;
    calendarId: string;
  }> {
    try {
      logger.info('Exchanging authorization code for tokens');

      const tokenResponse = await axios.post(
        googleCalendarConfig.tokenUrl,
        new URLSearchParams({
          client_id: googleCalendarConfig.clientId,
          client_secret: googleCalendarConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: googleCalendarConfig.redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token, expires_in, token_type, scope } = tokenResponse.data;

      const tokens: CalendarOAuthTokens = {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        tokenType: token_type,
        scope,
      };

      // Get user email
      const userInfo = await axios.get(GOOGLE_USERINFO_API, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const email = userInfo.data.email;

      // Use primary calendar
      const calendarId = 'primary';

      logger.info(`Successfully obtained tokens for Google account: ${email}`);

      return { tokens, email, calendarId };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(
        'Failed to exchange code for tokens:',
        axiosError.response?.data || axiosError.message
      );
      throw new Error(`Failed to authenticate with Google: ${axiosError.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<CalendarOAuthTokens> {
    try {
      logger.info('Refreshing Google Calendar access token');

      const tokenResponse = await axios.post(
        googleCalendarConfig.tokenUrl,
        new URLSearchParams({
          client_id: googleCalendarConfig.clientId,
          client_secret: googleCalendarConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, expires_in, token_type, scope } = tokenResponse.data;

      return {
        accessToken: access_token,
        refreshToken, // Google doesn't always return a new refresh token
        expiresAt: new Date(Date.now() + expires_in * 1000),
        tokenType: token_type,
        scope: scope || googleCalendarConfig.scopes.join(' '),
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error(
        'Failed to refresh access token:',
        axiosError.response?.data || axiosError.message
      );
      throw new Error(`Failed to refresh Google token: ${axiosError.message}`);
    }
  }

  /**
   * Get free/busy information for availability
   */
  static async getFreeBusy(
    accessToken: string,
    calendarId: string,
    startTime: Date,
    endTime: Date
  ): Promise<TimeSlot[]> {
    try {
      logger.info(`Fetching free/busy for calendar ${calendarId}`);

      const response = await axios.post(
        `${GOOGLE_CALENDAR_API}/freeBusy`,
        {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: calendarId }],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const busySlots = response.data.calendars[calendarId]?.busy || [];

      // Convert busy slots to TimeSlot format
      const timeSlots: TimeSlot[] = busySlots.map((slot: { start: string; end: string }) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
        isBusy: true,
      }));

      logger.info(`Found ${timeSlots.length} busy slots`);

      return timeSlots;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to fetch free/busy:', axiosError.response?.data || axiosError.message);
      throw new Error(`Failed to fetch availability: ${axiosError.message}`);
    }
  }

  /**
   * Create a calendar event
   */
  static async createEvent(
    accessToken: string,
    calendarId: string,
    event: CalendarEvent
  ): Promise<CalendarEventResult> {
    try {
      logger.info(`Creating calendar event: ${event.title}`);

      const googleEvent: any = {
        summary: event.title,
        description: event.description,
        location: event.location,
        start: {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timezone,
        },
        end: {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timezone,
        },
        status: event.status || 'confirmed',
        visibility: event.visibility || 'private',
      };

      // Add attendees if provided
      if (event.attendees && event.attendees.length > 0) {
        googleEvent.attendees = event.attendees.map((attendee) => ({
          email: attendee.email,
          displayName: attendee.name,
          responseStatus: attendee.responseStatus || 'needsAction',
        }));
      }

      // Add reminders if provided
      if (event.reminders && event.reminders.length > 0) {
        googleEvent.reminders = {
          useDefault: false,
          overrides: event.reminders.map((reminder) => ({
            method: reminder.method,
            minutes: reminder.minutes,
          })),
        };
      }

      // Add conference data for virtual dates
      if (event.conferenceData) {
        googleEvent.conferenceData = {
          createRequest: {
            requestId: `flamoral-${Date.now()}`,
            conferenceSolutionKey: {
              type: event.conferenceData.type,
            },
          },
        };
      }

      const response = await axios.post(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
        googleEvent,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          params: event.conferenceData ? { conferenceDataVersion: 1 } : undefined,
        }
      );

      logger.info(`Created event with ID: ${response.data.id}`);

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
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
   * Update a calendar event
   */
  static async updateEvent(
    accessToken: string,
    calendarId: string,
    eventId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEventResult> {
    try {
      logger.info(`Updating calendar event: ${eventId}`);

      const updateData: any = {};

      if (event.title) updateData.summary = event.title;
      if (event.description) updateData.description = event.description;
      if (event.location) updateData.location = event.location;
      if (event.startTime) {
        updateData.start = {
          dateTime: event.startTime.toISOString(),
          timeZone: event.timezone,
        };
      }
      if (event.endTime) {
        updateData.end = {
          dateTime: event.endTime.toISOString(),
          timeZone: event.timezone,
        };
      }
      if (event.status) updateData.status = event.status;

      const response = await axios.patch(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        updateData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Updated event: ${response.data.id}`);

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.htmlLink,
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
   * Delete a calendar event
   */
  static async deleteEvent(
    accessToken: string,
    calendarId: string,
    eventId: string
  ): Promise<CalendarEventResult> {
    try {
      logger.info(`Deleting calendar event: ${eventId}`);

      await axios.delete(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

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
   * List calendar events within a date range
   */
  static async listEvents(
    accessToken: string,
    calendarId: string,
    startTime: Date,
    endTime: Date
  ): Promise<CalendarEvent[]> {
    try {
      logger.info(`Listing events for calendar ${calendarId}`);

      const response = await axios.get(
        `${GOOGLE_CALENDAR_API}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          },
        }
      );

      const events: CalendarEvent[] = (response.data.items || []).map((item: any) => ({
        id: item.id,
        title: item.summary || 'Busy',
        description: item.description,
        location: item.location,
        startTime: new Date(item.start.dateTime || item.start.date),
        endTime: new Date(item.end.dateTime || item.end.date),
        timezone: item.start.timeZone || 'UTC',
        status: item.status,
      }));

      logger.info(`Found ${events.length} events`);

      return events;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to list events:', axiosError.response?.data || axiosError.message);
      throw new Error(`Failed to list calendar events: ${axiosError.message}`);
    }
  }

  /**
   * Revoke OAuth access
   */
  static async revokeAccess(accessToken: string): Promise<void> {
    try {
      logger.info('Revoking Google Calendar access');

      await axios.post(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, null, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      logger.info('Successfully revoked access');
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.warn('Failed to revoke access:', axiosError.response?.data || axiosError.message);
      // Don't throw - token might already be invalid
    }
  }
}

export default GoogleCalendarOAuth;
