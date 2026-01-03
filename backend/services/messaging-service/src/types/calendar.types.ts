/**
 * Calendar Integration Type Definitions
 * Types for calendar connections, date proposals, scheduling, and reminders
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Supported calendar providers
 */
export enum CalendarProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  OUTLOOK = 'outlook',
}

/**
 * Status of a date proposal
 */
export enum DateProposalStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  COUNTERED = 'countered',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Status of a scheduled date
 */
export enum ScheduledDateStatus {
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  NO_SHOW = 'no_show',
}

/**
 * Venue categories for date suggestions
 */
export enum VenueCategory {
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BAR = 'bar',
  PARK = 'park',
  MUSEUM = 'museum',
  MOVIE_THEATER = 'movie_theater',
  CONCERT_VENUE = 'concert_venue',
  SPORTS_VENUE = 'sports_venue',
  ACTIVITY_CENTER = 'activity_center',
  OTHER = 'other',
}

/**
 * Reminder timing options
 */
export enum ReminderTiming {
  FIFTEEN_MINUTES = 15,
  THIRTY_MINUTES = 30,
  ONE_HOUR = 60,
  TWO_HOURS = 120,
  ONE_DAY = 1440,
  TWO_DAYS = 2880,
}

// ============================================================================
// INTERFACES - CALENDAR CONNECTIONS
// ============================================================================

/**
 * OAuth tokens for calendar provider
 */
export interface CalendarOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tokenType: string;
  scope: string;
}

/**
 * Calendar connection to external provider
 */
export interface CalendarConnection {
  id: string;
  userId: string;
  provider: CalendarProvider;
  email: string;
  tokens: CalendarOAuthTokens;
  calendarId: string; // Primary calendar ID
  isActive: boolean;
  shareAvailability: boolean;
  syncEnabled: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Time slot representing availability
 */
export interface TimeSlot {
  start: Date;
  end: Date;
  isBusy: boolean;
  title?: string; // Only shown if user opts to share event titles
}

/**
 * User's availability for a date range
 */
export interface UserAvailability {
  userId: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  timeSlots: TimeSlot[];
  timezone: string;
  generatedAt: Date;
}

// ============================================================================
// INTERFACES - DATE PROPOSALS
// ============================================================================

/**
 * Venue suggestion for a date
 */
export interface VenueSuggestion {
  id: string;
  name: string;
  category: VenueCategory;
  address: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  placeId?: string; // Google Places ID
  rating?: number;
  priceLevel?: number; // 1-4 scale
  phoneNumber?: string;
  website?: string;
  imageUrl?: string;
  openingHours?: {
    [day: string]: string; // e.g., "Monday": "9:00 AM - 10:00 PM"
  };
}

/**
 * Date proposal within a conversation
 */
export interface DateProposal {
  id: string;
  conversationId: string;
  proposerId: string;
  recipientId: string;
  proposedDatetime: Date;
  timezone: string;
  duration: number; // Duration in minutes
  venue?: VenueSuggestion;
  notes?: string;
  status: DateProposalStatus;
  counterProposalId?: string; // ID of counter proposal if countered
  originalProposalId?: string; // ID of original if this is a counter
  messageId?: string; // Associated chat message ID
  expiresAt: Date;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Scheduled/confirmed date
 */
export interface ScheduledDate {
  id: string;
  conversationId: string;
  proposalId: string; // The accepted proposal
  participantIds: string[];
  scheduledAt: Date;
  timezone: string;
  duration: number;
  venue?: VenueSuggestion;
  notes?: string;
  status: ScheduledDateStatus;
  calendarEventIds?: {
    [userId: string]: {
      provider: CalendarProvider;
      eventId: string;
    };
  };
  reminderIds?: string[];
  feedback?: {
    [userId: string]: {
      rating?: number;
      comment?: string;
      submittedAt?: Date;
    };
  };
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduledFrom?: string; // Previous scheduled date ID
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// INTERFACES - REMINDERS
// ============================================================================

/**
 * Date reminder
 */
export interface DateReminder {
  id: string;
  scheduledDateId: string;
  userId: string;
  reminderAt: Date;
  timingMinutes: ReminderTiming;
  sent: boolean;
  sentAt?: Date;
  notificationId?: string;
  createdAt: Date;
}

// ============================================================================
// INTERFACES - VENUE BOOKMARKS
// ============================================================================

/**
 * User's bookmarked venue
 */
export interface VenueBookmark {
  id: string;
  userId: string;
  venue: VenueSuggestion;
  category: VenueCategory;
  notes?: string;
  createdAt: Date;
}

// ============================================================================
// INTERFACES - CALENDAR EVENTS
// ============================================================================

/**
 * Calendar event to create/sync
 */
export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendees?: {
    email: string;
    name?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }[];
  reminders?: {
    method: 'email' | 'popup';
    minutes: number;
  }[];
  conferenceData?: {
    type: 'hangoutsMeet' | 'addOn';
    conferenceId?: string;
    conferenceSolution?: string;
    entryPoints?: {
      entryPointType: string;
      uri: string;
      label?: string;
    }[];
  };
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

/**
 * Result of calendar event creation
 */
export interface CalendarEventResult {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  error?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to connect a calendar
 */
export interface ConnectCalendarRequest {
  provider: CalendarProvider;
  authCode: string;
  redirectUri: string;
}

/**
 * Request to get availability
 */
export interface GetAvailabilityRequest {
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

/**
 * Request to propose a date
 */
export interface ProposeDateRequest {
  conversationId: string;
  proposedDatetime: Date;
  timezone?: string;
  duration?: number;
  venue?: VenueSuggestion;
  notes?: string;
}

/**
 * Request to counter a proposal
 */
export interface CounterProposalRequest {
  proposalId: string;
  newDatetime: Date;
  timezone?: string;
  duration?: number;
  venue?: VenueSuggestion;
  notes?: string;
}

/**
 * Request to sync date to calendar
 */
export interface SyncToCalendarRequest {
  scheduledDateId: string;
  provider?: CalendarProvider; // If not specified, sync to all connected
  addReminders?: boolean;
}

/**
 * Venue search parameters
 */
export interface VenueSearchParams {
  query?: string;
  category?: VenueCategory;
  latitude: number;
  longitude: number;
  radius?: number; // in meters
  minRating?: number;
  maxPriceLevel?: number;
  openNow?: boolean;
  limit?: number;
}

// ============================================================================
// OAUTH CONFIGURATION TYPES
// ============================================================================

/**
 * OAuth configuration for a calendar provider
 */
export interface CalendarOAuthConfig {
  provider: CalendarProvider;
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * OAuth callback data
 */
export interface OAuthCallbackData {
  code: string;
  state?: string;
  error?: string;
  errorDescription?: string;
}

// ============================================================================
// SERVICE RESPONSE TYPES
// ============================================================================

/**
 * Generic service response
 */
export interface CalendarServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

/**
 * Pagination info for list responses
 */
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Paginated list response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}
