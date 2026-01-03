/**
 * Outlook Calendar OAuth Service
 * Handles OAuth flow and API interactions with Microsoft Outlook Calendar
 */

import axios, { AxiosError } from 'axios';
import { createLogger } from '../../../utils/logger';
import { outlookCalendarConfig } from '../../../config/calendar.config';
import {
  CalendarOAuthTokens,
  CalendarEvent,
  CalendarEventResult,
  TimeSlot,
} from '../../../types/calendar.types';

const logger = createLogger('outlook-calendar-oauth');

/**
 * Microsoft Graph API Base URL
 */
const GRAPH_API = 'https://graph.microsoft.com/v1.0';

/**
 * Outlook Calendar OAuth Service
 */
export class OutlookCalendarOAuth {
  /**
   * Generate OAuth authorization URL
   */
  static generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: outlookCalendarConfig.clientId,
      redirect_uri: outlookCalendarConfig.redirectUri,
      response_type: 'code',
      scope: outlookCalendarConfig.scopes.join(' '),
      response_mode: 'query',
      state,
    });

    return `${outlookCalendarConfig.authorizationUrl}?${params.toString()}`;
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
        outlookCalendarConfig.tokenUrl,
        new URLSearchParams({
          client_id: outlookCalendarConfig.clientId,
          client_secret: outlookCalendarConfig.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: outlookCalendarConfig.redirectUri,
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

      // Get user profile
      const userInfo = await axios.get(`${GRAPH_API}/me`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const email = userInfo.data.mail || userInfo.data.userPrincipalName;

      // Get primary calendar ID
      const calendarsResponse = await axios.get(`${GRAPH_API}/me/calendars`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      // Find the default calendar
      const defaultCalendar = calendarsResponse.data.value.find((cal: any) => cal.isDefaultCalendar);
      const calendarId = defaultCalendar?.id || calendarsResponse.data.value[0]?.id || 'calendar';

      logger.info(`Successfully obtained tokens for Outlook account: ${email}`);

      return { tokens, email, calendarId };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to exchange code for tokens:', axiosError.response?.data || axiosError.message);
      throw new Error(`Failed to authenticate with Outlook: ${axiosError.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(refreshToken: string): Promise<CalendarOAuthTokens> {
    try {
      logger.info('Refreshing Outlook Calendar access token');

      const tokenResponse = await axios.post(
        outlookCalendarConfig.tokenUrl,
        new URLSearchParams({
          client_id: outlookCalendarConfig.clientId,
          client_secret: outlookCalendarConfig.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const { access_token, refresh_token: new_refresh_token, expires_in, token_type, scope } = tokenResponse.data;

      return {
        accessToken: access_token,
        refreshToken: new_refresh_token || refreshToken,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        tokenType: token_type,
        scope,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to refresh access token:', axiosError.response?.data || axiosError.message);
      throw new Error(`Failed to refresh Outlook token: ${axiosError.message}`);
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
      logger.info(`Fetching schedule for calendar ${calendarId}`);

      const response = await axios.post(
        `${GRAPH_API}/me/calendar/getSchedule`,
        {
          schedules: ['me'],
          startTime: {
            dateTime: startTime.toISOString(),
            timeZone: 'UTC',
          },
          endTime: {
            dateTime: endTime.toISOString(),
            timeZone: 'UTC',
          },
          availabilityViewInterval: 30, // 30-minute intervals
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const scheduleItems = response.data.value[0]?.scheduleItems || [];

      // Convert schedule items to TimeSlot format
      const timeSlots: TimeSlot[] = scheduleItems.map((item: any) => ({
        start: new Date(item.start.dateTime + 'Z'),
        end: new Date(item.end.dateTime + 'Z'),
        isBusy: item.status !== 'free',
        title: item.subject,
      }));

      logger.info(`Found ${timeSlots.length} schedule items`);

      return timeSlots;
    } catch (error) {
      const axiosError = error as AxiosError;
      logger.error('Failed to fetch schedule:', axiosError.response?.data || axiosError.message);
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

      const outlookEvent: any = {
        subject: event.title,
        body: event.description ? {
          contentType: 'text',
          content: event.description,
        } : undefined,
        location: event.location ? {
          displayName: event.location,
        } : undefined,
        start: {
          dateTime: event.startTime.toISOString().replace('Z', ''),
          timeZone: event.timezone,
        },
        end: {
          dateTime: event.endTime.toISOString().replace('Z', ''),
          timeZone: event.timezone,
        },
        showAs: event.status === 'tentative' ? 'tentative' : 'busy',
        sensitivity: event.visibility === 'private' ? 'private' : 'normal',
      };

      // Add attendees if provided
      if (event.attendees && event.attendees.length > 0) {
        outlookEvent.attendees = event.attendees.map(attendee => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name,
          },
          type: 'required',
        }));
      }

      // Add reminders if provided
      if (event.reminders && event.reminders.length > 0) {
        outlookEvent.reminderMinutesBeforeStart = event.reminders[0].minutes;
        outlookEvent.isReminderOn = true;
      }

      // Add online meeting for virtual dates
      if (event.conferenceData) {
        outlookEvent.isOnlineMeeting = true;
        outlookEvent.onlineMeetingProvider = 'teamsForBusiness';
      }

      const response = await axios.post(
        `${GRAPH_API}/me/calendars/${calendarId}/events`,
        outlookEvent,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      logger.info(`Created event with ID: ${response.data.id}`);

      return {
        success: true,
        eventId: response.data.id,
        eventLink: response.data.webLink,
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

      if (event.title) updateData.subject = event.title;
      if (event.description) {
        updateData.body = {
          contentType: 'text',
          content: event.description,
        };
      }
      if (event.location) {
        updateData.location = {
          displayName: event.location,
        };
      }
      if (event.startTime) {
        updateData.start = {
          dateTime: event.startTime.toISOString().replace('Z', ''),
          timeZone: event.timezone,
        };
      }
      if (event.endTime) {
        updateData.end = {
          dateTime: event.endTime.toISOString().replace('Z', ''),
          timeZone: event.timezone,
        };
      }
      if (event.status) {
        updateData.showAs = event.status === 'cancelled' ? 'free' : 'busy';
      }

      const response = await axios.patch(
        `${GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`,
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
        eventLink: response.data.webLink,
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
        `${GRAPH_API}/me/calendars/${calendarId}/events/${eventId}`,
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
        `${GRAPH_API}/me/calendars/${calendarId}/calendarView`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            startDateTime: startTime.toISOString(),
            endDateTime: endTime.toISOString(),
            $orderby: 'start/dateTime',
            $top: 100,
          },
        }
      );

      const events: CalendarEvent[] = (response.data.value || []).map((item: any) => ({
        id: item.id,
        title: item.subject || 'Busy',
        description: item.body?.content,
        location: item.location?.displayName,
        startTime: new Date(item.start.dateTime + 'Z'),
        endTime: new Date(item.end.dateTime + 'Z'),
        timezone: item.start.timeZone || 'UTC',
        status: item.showAs === 'free' ? 'tentative' : 'confirmed',
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
   * Revoke OAuth access (sign out)
   */
  static async revokeAccess(accessToken: string): Promise<void> {
    try {
      logger.info('Revoking Outlook Calendar access');

      // Microsoft doesn't have a token revocation endpoint
      // The token will expire naturally, but we can sign out from the app
      // by deleting the stored tokens (handled at the service level)

      logger.info('Outlook tokens will expire naturally');
    } catch (error) {
      logger.warn('Failed to revoke access:', error);
    }
  }
}

export default OutlookCalendarOAuth;
