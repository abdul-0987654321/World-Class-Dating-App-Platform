/**
 * Calendar Integration Service
 * Core service for calendar connections, date proposals, and scheduling
 */

import { v4 as uuidv4 } from 'uuid';

import { calendarConfig } from '../../config/calendar.config';
import { postgresClient } from '../../infrastructure/database/postgres-client';
import {
  CalendarProvider,
  CalendarConnection,
  CalendarOAuthTokens,
  TimeSlot,
  DateProposal,
  DateProposalStatus,
  ScheduledDate,
  ScheduledDateStatus,
  CalendarEvent,
  CalendarEventResult,
  UserAvailability,
  VenueSuggestion,
  ProposeDateRequest,
  CounterProposalRequest,
  ReminderTiming,
} from '../../types/calendar.types';
import { createLogger } from '../../utils/logger';

import { GoogleCalendarOAuth, OutlookCalendarOAuth, AppleCalendarOAuth } from './oauth';

const logger = createLogger('calendar-integration-service');

/**
 * Calendar Integration Service
 * Handles calendar connections, availability, date proposals, and scheduling
 */
export class CalendarIntegrationService {
  private initialized = false;

  /**
   * Initialize database connection
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!postgresClient.isInitialized()) {
        await postgresClient.initialize();
      }

      this.initialized = true;
      logger.info('CalendarIntegrationService initialized');
    } catch (error) {
      logger.error('Failed to initialize CalendarIntegrationService:', error);
      throw error;
    }
  }

  // ============================================================================
  // CALENDAR CONNECTION METHODS
  // ============================================================================

  /**
   * Generate OAuth authorization URL for a provider
   */
  generateAuthUrl(provider: CalendarProvider, userId: string): string {
    const state = Buffer.from(JSON.stringify({ userId, provider, timestamp: Date.now() })).toString(
      'base64'
    );

    switch (provider) {
      case CalendarProvider.GOOGLE:
        return GoogleCalendarOAuth.generateAuthUrl(state);
      case CalendarProvider.OUTLOOK:
        return OutlookCalendarOAuth.generateAuthUrl(state);
      case CalendarProvider.APPLE:
        return AppleCalendarOAuth.generateAuthUrl(state);
      default:
        throw new Error(`Unsupported calendar provider: ${provider}`);
    }
  }

  /**
   * Connect a calendar using OAuth authorization code
   */
  async connectCalendar(
    userId: string,
    provider: CalendarProvider,
    authCode: string
  ): Promise<CalendarConnection> {
    await this.ensureInitialized();

    logger.info(`Connecting ${provider} calendar for user ${userId}`);

    try {
      let tokens: CalendarOAuthTokens;
      let email: string;
      let calendarId: string;

      // Exchange code for tokens based on provider
      switch (provider) {
        case CalendarProvider.GOOGLE: {
          const result = await GoogleCalendarOAuth.exchangeCodeForTokens(authCode);
          tokens = result.tokens;
          email = result.email;
          calendarId = result.calendarId;
          break;
        }
        case CalendarProvider.OUTLOOK: {
          const result = await OutlookCalendarOAuth.exchangeCodeForTokens(authCode);
          tokens = result.tokens;
          email = result.email;
          calendarId = result.calendarId;
          break;
        }
        case CalendarProvider.APPLE: {
          const result = await AppleCalendarOAuth.exchangeCodeForTokens(authCode);
          tokens = result.tokens;
          email = result.email;
          calendarId = result.calendarId;
          break;
        }
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      // Check if connection already exists
      const existingConnection = await this.getConnection(userId, provider);
      const now = new Date();

      const connectionData = {
        id: existingConnection?.id || uuidv4(),
        user_id: userId,
        provider,
        email,
        tokens: JSON.stringify(tokens),
        calendar_id: calendarId,
        is_active: true,
        share_availability: true,
        sync_enabled: true,
        last_sync_at: now,
        updated_at: now,
      };

      if (existingConnection) {
        // Update existing connection
        await postgresClient.calendarConnections()
          .where({ id: existingConnection.id })
          .update(connectionData);
      } else {
        // Insert new connection
        await postgresClient.calendarConnections().insert({
          ...connectionData,
          created_at: now,
        });
      }

      const connection: CalendarConnection = {
        id: connectionData.id,
        userId,
        provider,
        email,
        tokens,
        calendarId,
        isActive: true,
        shareAvailability: true,
        syncEnabled: true,
        lastSyncAt: now,
        createdAt: existingConnection?.createdAt || now,
        updatedAt: now,
      };

      logger.info(`Successfully connected ${provider} calendar for user ${userId}`);

      return connection;
    } catch (error) {
      logger.error(`Failed to connect ${provider} calendar:`, error);
      throw error;
    }
  }

  /**
   * Disconnect a calendar
   */
  async disconnectCalendar(userId: string, provider: CalendarProvider): Promise<void> {
    await this.ensureInitialized();

    logger.info(`Disconnecting ${provider} calendar for user ${userId}`);

    try {
      const connection = await this.getConnection(userId, provider);
      if (!connection) {
        logger.warn(`No ${provider} calendar connection found for user ${userId}`);
        return;
      }

      // Revoke access token
      try {
        switch (provider) {
          case CalendarProvider.GOOGLE:
            await GoogleCalendarOAuth.revokeAccess(connection.tokens.accessToken);
            break;
          case CalendarProvider.OUTLOOK:
            await OutlookCalendarOAuth.revokeAccess(connection.tokens.accessToken);
            break;
          case CalendarProvider.APPLE:
            await AppleCalendarOAuth.revokeAccess();
            break;
        }
      } catch (revokeError) {
        logger.warn('Failed to revoke access token, continuing with disconnection:', revokeError);
      }

      // Delete connection
      await postgresClient.calendarConnections()
        .where({ id: connection.id, user_id: userId })
        .delete();

      logger.info(`Successfully disconnected ${provider} calendar for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to disconnect ${provider} calendar:`, error);
      throw error;
    }
  }

  /**
   * Get calendar connection for a user and provider
   */
  async getConnection(
    userId: string,
    provider: CalendarProvider
  ): Promise<CalendarConnection | null> {
    await this.ensureInitialized();

    try {
      const row = await postgresClient.calendarConnections()
        .where({ user_id: userId, provider })
        .first();

      if (!row) return null;

      return this.mapRowToConnection(row);
    } catch (error) {
      logger.error('Failed to get calendar connection:', error);
      return null;
    }
  }

  /**
   * Get all calendar connections for a user
   */
  async getConnections(userId: string): Promise<CalendarConnection[]> {
    await this.ensureInitialized();

    try {
      const rows = await postgresClient.calendarConnections()
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');

      return rows.map((row: any) => this.mapRowToConnection(row));
    } catch (error) {
      logger.error('Failed to get calendar connections:', error);
      return [];
    }
  }

  /**
   * Map database row to CalendarConnection object
   */
  private mapRowToConnection(row: any): CalendarConnection {
    return {
      id: row.id,
      userId: row.user_id,
      provider: row.provider,
      email: row.email,
      tokens: typeof row.tokens === 'string' ? JSON.parse(row.tokens) : row.tokens,
      calendarId: row.calendar_id,
      isActive: row.is_active,
      shareAvailability: row.share_availability,
      syncEnabled: row.sync_enabled,
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Refresh tokens if needed and return valid access token
   */
  private async getValidAccessToken(connection: CalendarConnection): Promise<string> {
    const now = new Date();
    const expiresAt = new Date(connection.tokens.expiresAt);
    const bufferMs = calendarConfig.oauth.tokenRefreshBuffer * 1000;

    // Check if token needs refresh
    if (expiresAt.getTime() - now.getTime() > bufferMs) {
      return connection.tokens.accessToken;
    }

    logger.info(`Refreshing tokens for ${connection.provider} calendar`);

    try {
      let newTokens: CalendarOAuthTokens;

      switch (connection.provider) {
        case CalendarProvider.GOOGLE:
          newTokens = await GoogleCalendarOAuth.refreshAccessToken(connection.tokens.refreshToken);
          break;
        case CalendarProvider.OUTLOOK:
          newTokens = await OutlookCalendarOAuth.refreshAccessToken(connection.tokens.refreshToken);
          break;
        case CalendarProvider.APPLE:
          newTokens = await AppleCalendarOAuth.refreshAccessToken(connection.tokens.refreshToken);
          break;
        default:
          throw new Error(`Unsupported provider: ${connection.provider}`);
      }

      // Update connection with new tokens
      connection.tokens = newTokens;
      connection.updatedAt = now;

      await postgresClient.calendarConnections()
        .where({ id: connection.id })
        .update({
          tokens: JSON.stringify(newTokens),
          updated_at: now,
        });

      return newTokens.accessToken;
    } catch (error) {
      logger.error('Failed to refresh tokens:', error);
      throw new Error(
        `Calendar authentication expired. Please reconnect your ${connection.provider} calendar.`
      );
    }
  }

  // ============================================================================
  // AVAILABILITY METHODS
  // ============================================================================

  /**
   * Get user's availability from connected calendars
   */
  async getAvailability(
    userId: string,
    dateRange: { start: Date; end: Date },
    timezone: string = 'UTC'
  ): Promise<UserAvailability> {
    await this.ensureInitialized();

    logger.info(`Getting availability for user ${userId}`);

    // Validate date range
    const maxDays = calendarConfig.availability.maxQueryDays;
    const daysDiff = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      throw new Error(`Date range cannot exceed ${maxDays} days`);
    }

    const connections = await this.getConnections(userId);
    const activeConnections = connections.filter((c) => c.isActive && c.shareAvailability);

    if (activeConnections.length === 0) {
      // Return empty availability if no calendars connected
      return {
        userId,
        dateRange,
        timeSlots: [],
        timezone,
        generatedAt: new Date(),
      };
    }

    // Fetch busy times from all connected calendars
    const allBusySlots: TimeSlot[] = [];

    for (const connection of activeConnections) {
      try {
        const accessToken = await this.getValidAccessToken(connection);
        let busySlots: TimeSlot[] = [];

        switch (connection.provider) {
          case CalendarProvider.GOOGLE:
            busySlots = await GoogleCalendarOAuth.getFreeBusy(
              accessToken,
              connection.calendarId,
              dateRange.start,
              dateRange.end
            );
            break;
          case CalendarProvider.OUTLOOK:
            busySlots = await OutlookCalendarOAuth.getFreeBusy(
              accessToken,
              connection.calendarId,
              dateRange.start,
              dateRange.end
            );
            break;
          case CalendarProvider.APPLE:
            busySlots = await AppleCalendarOAuth.getFreeBusy(
              connection.email,
              accessToken, // App-specific password
              connection.calendarId,
              dateRange.start,
              dateRange.end
            );
            break;
        }

        allBusySlots.push(...busySlots);
      } catch (error) {
        logger.warn(`Failed to fetch availability from ${connection.provider}:`, error);
        // Continue with other calendars
      }
    }

    // Merge overlapping busy slots
    const mergedSlots = this.mergeBusySlots(allBusySlots);

    return {
      userId,
      dateRange,
      timeSlots: mergedSlots,
      timezone,
      generatedAt: new Date(),
    };
  }

  /**
   * Merge overlapping busy time slots
   */
  private mergeBusySlots(slots: TimeSlot[]): TimeSlot[] {
    if (slots.length === 0) return [];

    // Sort by start time
    const sorted = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
    const merged: TimeSlot[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const current = sorted[i];
      const last = merged[merged.length - 1];

      if (current.start.getTime() <= last.end.getTime()) {
        // Overlapping, extend the end time
        last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
      } else {
        // No overlap, add new slot
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Check if a specific time is available for a user
   */
  async isTimeAvailable(userId: string, datetime: Date, durationMinutes: number): Promise<boolean> {
    const endTime = new Date(datetime.getTime() + durationMinutes * 60 * 1000);
    const availability = await this.getAvailability(userId, { start: datetime, end: endTime });

    // Check if any busy slot overlaps with the requested time
    for (const slot of availability.timeSlots) {
      if (slot.isBusy) {
        if (datetime < slot.end && endTime > slot.start) {
          return false; // Overlap found
        }
      }
    }

    return true;
  }

  // ============================================================================
  // DATE PROPOSAL METHODS
  // ============================================================================

  /**
   * Propose a date/time for a date
   */
  async proposeDatetime(
    conversationId: string,
    proposerId: string,
    recipientId: string,
    request: ProposeDateRequest
  ): Promise<DateProposal> {
    await this.ensureInitialized();

    logger.info(`Creating date proposal in conversation ${conversationId}`);

    // Validate: Check if there are too many pending proposals
    const pendingProposals = await this.getPendingProposals(conversationId);
    if (pendingProposals.length >= calendarConfig.proposals.maxActiveProposals) {
      throw new Error(
        `Maximum of ${calendarConfig.proposals.maxActiveProposals} pending proposals allowed`
      );
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + calendarConfig.proposals.expirationHours * 60 * 60 * 1000
    );

    const proposalId = uuidv4();

    await postgresClient.dateProposals().insert({
      id: proposalId,
      conversation_id: conversationId,
      proposer_id: proposerId,
      recipient_id: recipientId,
      proposed_datetime: request.proposedDatetime,
      timezone: request.timezone || 'UTC',
      duration: request.duration || calendarConfig.proposals.defaultDuration,
      venue: request.venue ? JSON.stringify(request.venue) : null,
      notes: request.notes,
      status: DateProposalStatus.PENDING,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    });

    const proposal: DateProposal = {
      id: proposalId,
      conversationId,
      proposerId,
      recipientId,
      proposedDatetime: request.proposedDatetime,
      timezone: request.timezone || 'UTC',
      duration: request.duration || calendarConfig.proposals.defaultDuration,
      venue: request.venue,
      notes: request.notes,
      status: DateProposalStatus.PENDING,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    logger.info(`Created date proposal ${proposal.id}`);

    return proposal;
  }

  /**
   * Accept a date proposal
   */
  async acceptDateProposal(proposalId: string, recipientId: string): Promise<ScheduledDate> {
    await this.ensureInitialized();

    logger.info(`Accepting date proposal ${proposalId}`);

    const proposal = await this.getProposalById(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.recipientId !== recipientId) {
      throw new Error('Only the recipient can accept this proposal');
    }

    if (proposal.status !== DateProposalStatus.PENDING) {
      throw new Error(`Cannot accept proposal with status: ${proposal.status}`);
    }

    if (new Date() > proposal.expiresAt) {
      throw new Error('This proposal has expired');
    }

    const now = new Date();

    // Update proposal status
    await postgresClient.dateProposals()
      .where({ id: proposalId })
      .update({
        status: DateProposalStatus.ACCEPTED,
        responded_at: now,
        updated_at: now,
      });

    // Create scheduled date
    const scheduledDateId = uuidv4();
    const participantIds = [proposal.proposerId, proposal.recipientId];

    await postgresClient.scheduledDates().insert({
      id: scheduledDateId,
      conversation_id: proposal.conversationId,
      proposal_id: proposal.id,
      participant_ids: participantIds,
      scheduled_at: proposal.proposedDatetime,
      timezone: proposal.timezone,
      duration: proposal.duration,
      venue: proposal.venue ? JSON.stringify(proposal.venue) : null,
      notes: proposal.notes,
      status: ScheduledDateStatus.CONFIRMED,
      created_at: now,
      updated_at: now,
    });

    const scheduledDate: ScheduledDate = {
      id: scheduledDateId,
      conversationId: proposal.conversationId,
      proposalId: proposal.id,
      participantIds,
      scheduledAt: proposal.proposedDatetime,
      timezone: proposal.timezone,
      duration: proposal.duration,
      venue: proposal.venue,
      notes: proposal.notes,
      status: ScheduledDateStatus.CONFIRMED,
      createdAt: now,
      updatedAt: now,
    };

    logger.info(`Created scheduled date ${scheduledDate.id}`);

    return scheduledDate;
  }

  /**
   * Decline a date proposal
   */
  async declineDateProposal(proposalId: string, recipientId: string): Promise<DateProposal> {
    await this.ensureInitialized();

    logger.info(`Declining date proposal ${proposalId}`);

    const proposal = await this.getProposalById(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.recipientId !== recipientId) {
      throw new Error('Only the recipient can decline this proposal');
    }

    if (proposal.status !== DateProposalStatus.PENDING) {
      throw new Error(`Cannot decline proposal with status: ${proposal.status}`);
    }

    const now = new Date();

    await postgresClient.dateProposals()
      .where({ id: proposalId })
      .update({
        status: DateProposalStatus.DECLINED,
        responded_at: now,
        updated_at: now,
      });

    proposal.status = DateProposalStatus.DECLINED;
    proposal.respondedAt = now;
    proposal.updatedAt = now;

    logger.info(`Declined date proposal ${proposalId}`);

    return proposal;
  }

  /**
   * Counter a date proposal with a new time/venue
   */
  async counterDateProposal(
    proposalId: string,
    recipientId: string,
    counterRequest: CounterProposalRequest
  ): Promise<DateProposal> {
    await this.ensureInitialized();

    logger.info(`Countering date proposal ${proposalId}`);

    const originalProposal = await this.getProposalById(proposalId);
    if (!originalProposal) {
      throw new Error('Proposal not found');
    }

    if (originalProposal.recipientId !== recipientId) {
      throw new Error('Only the recipient can counter this proposal');
    }

    if (originalProposal.status !== DateProposalStatus.PENDING) {
      throw new Error(`Cannot counter proposal with status: ${originalProposal.status}`);
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + calendarConfig.proposals.expirationHours * 60 * 60 * 1000
    );

    // Create counter proposal
    const counterProposalId = uuidv4();

    await postgresClient.dateProposals().insert({
      id: counterProposalId,
      conversation_id: originalProposal.conversationId,
      proposer_id: recipientId, // Now the recipient is proposing
      recipient_id: originalProposal.proposerId, // Original proposer receives the counter
      proposed_datetime: counterRequest.newDatetime,
      timezone: counterRequest.timezone || originalProposal.timezone,
      duration: counterRequest.duration || originalProposal.duration,
      venue: counterRequest.venue
        ? JSON.stringify(counterRequest.venue)
        : originalProposal.venue
          ? JSON.stringify(originalProposal.venue)
          : null,
      notes: counterRequest.notes,
      status: DateProposalStatus.PENDING,
      original_proposal_id: originalProposal.id,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now,
    });

    // Update original proposal status
    await postgresClient.dateProposals()
      .where({ id: proposalId })
      .update({
        status: DateProposalStatus.COUNTERED,
        responded_at: now,
        updated_at: now,
        counter_proposal_id: counterProposalId,
      });

    const counterProposal: DateProposal = {
      id: counterProposalId,
      conversationId: originalProposal.conversationId,
      proposerId: recipientId,
      recipientId: originalProposal.proposerId,
      proposedDatetime: counterRequest.newDatetime,
      timezone: counterRequest.timezone || originalProposal.timezone,
      duration: counterRequest.duration || originalProposal.duration,
      venue: counterRequest.venue || originalProposal.venue,
      notes: counterRequest.notes,
      status: DateProposalStatus.PENDING,
      originalProposalId: originalProposal.id,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    logger.info(`Created counter proposal ${counterProposal.id}`);

    return counterProposal;
  }

  /**
   * Cancel a date proposal
   */
  async cancelDateProposal(proposalId: string, userId: string): Promise<DateProposal> {
    await this.ensureInitialized();

    const proposal = await this.getProposalById(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.proposerId !== userId) {
      throw new Error('Only the proposer can cancel this proposal');
    }

    if (proposal.status !== DateProposalStatus.PENDING) {
      throw new Error(`Cannot cancel proposal with status: ${proposal.status}`);
    }

    const now = new Date();

    await postgresClient.dateProposals()
      .where({ id: proposalId })
      .update({
        status: DateProposalStatus.CANCELLED,
        updated_at: now,
      });

    proposal.status = DateProposalStatus.CANCELLED;
    proposal.updatedAt = now;

    return proposal;
  }

  /**
   * Get proposal by ID
   */
  private async getProposalById(proposalId: string): Promise<DateProposal | null> {
    try {
      const row = await postgresClient.dateProposals()
        .where({ id: proposalId })
        .first();

      if (!row) return null;

      return this.mapRowToProposal(row);
    } catch (error) {
      logger.error('Failed to get proposal:', error);
      return null;
    }
  }

  /**
   * Map database row to DateProposal object
   */
  private mapRowToProposal(row: any): DateProposal {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      proposerId: row.proposer_id,
      recipientId: row.recipient_id,
      proposedDatetime: new Date(row.proposed_datetime),
      timezone: row.timezone,
      duration: row.duration,
      venue: row.venue ? (typeof row.venue === 'string' ? JSON.parse(row.venue) : row.venue) : undefined,
      notes: row.notes,
      status: row.status,
      originalProposalId: row.original_proposal_id,
      counterProposalId: row.counter_proposal_id,
      expiresAt: new Date(row.expires_at),
      respondedAt: row.responded_at ? new Date(row.responded_at) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Get pending proposals for a conversation
   */
  private async getPendingProposals(conversationId: string): Promise<DateProposal[]> {
    const rows = await postgresClient.dateProposals()
      .where({
        conversation_id: conversationId,
        status: DateProposalStatus.PENDING,
      });

    return rows.map((row: any) => this.mapRowToProposal(row));
  }

  /**
   * Get all proposals for a conversation
   */
  async getProposals(conversationId: string): Promise<DateProposal[]> {
    await this.ensureInitialized();

    const rows = await postgresClient.dateProposals()
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'desc');

    return rows.map((row: any) => this.mapRowToProposal(row));
  }

  // ============================================================================
  // SCHEDULED DATE METHODS
  // ============================================================================

  /**
   * Get scheduled date by ID
   */
  async getScheduledDate(scheduledDateId: string): Promise<ScheduledDate | null> {
    await this.ensureInitialized();

    try {
      const row = await postgresClient.scheduledDates()
        .where({ id: scheduledDateId })
        .first();

      if (!row) return null;

      return this.mapRowToScheduledDate(row);
    } catch (error) {
      logger.error('Failed to get scheduled date:', error);
      return null;
    }
  }

  /**
   * Map database row to ScheduledDate object
   */
  private mapRowToScheduledDate(row: any): ScheduledDate {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      proposalId: row.proposal_id,
      participantIds: row.participant_ids,
      scheduledAt: new Date(row.scheduled_at),
      timezone: row.timezone,
      duration: row.duration,
      venue: row.venue ? (typeof row.venue === 'string' ? JSON.parse(row.venue) : row.venue) : undefined,
      notes: row.notes,
      status: row.status,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      calendarEventIds: row.calendar_event_ids
        ? (typeof row.calendar_event_ids === 'string' ? JSON.parse(row.calendar_event_ids) : row.calendar_event_ids)
        : undefined,
      reminderIds: row.reminder_ids,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Get upcoming scheduled dates for a user
   */
  async getUpcomingDates(userId: string, limit: number = 10): Promise<ScheduledDate[]> {
    await this.ensureInitialized();

    const now = new Date();

    const rows = await postgresClient.scheduledDates()
      .whereRaw('? = ANY(participant_ids)', [userId])
      .where('scheduled_at', '>', now)
      .where('status', ScheduledDateStatus.CONFIRMED)
      .orderBy('scheduled_at', 'asc')
      .limit(limit);

    return rows.map((row: any) => this.mapRowToScheduledDate(row));
  }

  /**
   * Cancel a scheduled date
   */
  async cancelScheduledDate(
    scheduledDateId: string,
    userId: string,
    reason?: string
  ): Promise<ScheduledDate> {
    await this.ensureInitialized();

    const scheduledDate = await this.getScheduledDate(scheduledDateId);
    if (!scheduledDate) {
      throw new Error('Scheduled date not found');
    }

    if (!scheduledDate.participantIds.includes(userId)) {
      throw new Error('You are not a participant in this date');
    }

    if (scheduledDate.status !== ScheduledDateStatus.CONFIRMED) {
      throw new Error(`Cannot cancel date with status: ${scheduledDate.status}`);
    }

    const now = new Date();

    await postgresClient.scheduledDates()
      .where({ id: scheduledDateId })
      .update({
        status: ScheduledDateStatus.CANCELLED,
        cancelled_by: userId,
        cancellation_reason: reason,
        updated_at: now,
      });

    scheduledDate.status = ScheduledDateStatus.CANCELLED;
    scheduledDate.cancelledBy = userId;
    scheduledDate.cancellationReason = reason;
    scheduledDate.updatedAt = now;

    // Delete calendar events if synced
    await this.deleteCalendarEvents(scheduledDate);

    logger.info(`Cancelled scheduled date ${scheduledDateId}`);

    return scheduledDate;
  }

  /**
   * Mark a scheduled date as completed
   */
  async completeScheduledDate(scheduledDateId: string): Promise<ScheduledDate> {
    await this.ensureInitialized();

    const scheduledDate = await this.getScheduledDate(scheduledDateId);
    if (!scheduledDate) {
      throw new Error('Scheduled date not found');
    }

    const now = new Date();

    await postgresClient.scheduledDates()
      .where({ id: scheduledDateId })
      .update({
        status: ScheduledDateStatus.COMPLETED,
        updated_at: now,
      });

    scheduledDate.status = ScheduledDateStatus.COMPLETED;
    scheduledDate.updatedAt = now;

    return scheduledDate;
  }

  // ============================================================================
  // CALENDAR SYNC METHODS
  // ============================================================================

  /**
   * Sync a scheduled date to user's calendar
   */
  async syncToCalendar(
    userId: string,
    scheduledDate: ScheduledDate,
    provider?: CalendarProvider
  ): Promise<CalendarEventResult> {
    await this.ensureInitialized();

    logger.info(`Syncing scheduled date ${scheduledDate.id} to calendar for user ${userId}`);

    // Get the other participant for the event
    const otherUserId = scheduledDate.participantIds.find((id) => id !== userId);

    // Create calendar event
    const event: CalendarEvent = {
      title: 'Date - Flamoral',
      description: scheduledDate.notes || 'Date scheduled via Flamoral',
      location: scheduledDate.venue?.address,
      startTime: new Date(scheduledDate.scheduledAt),
      endTime: new Date(
        new Date(scheduledDate.scheduledAt).getTime() + scheduledDate.duration * 60 * 1000
      ),
      timezone: scheduledDate.timezone,
      reminders: [
        { method: 'popup', minutes: ReminderTiming.ONE_HOUR },
        { method: 'popup', minutes: ReminderTiming.ONE_DAY },
      ],
      visibility: 'private',
      status: 'confirmed',
    };

    // Get user's calendar connections
    const connections = await this.getConnections(userId);
    const targetConnections = provider
      ? connections.filter((c) => c.provider === provider && c.isActive)
      : connections.filter((c) => c.isActive && c.syncEnabled);

    if (targetConnections.length === 0) {
      return {
        success: false,
        error: 'No active calendar connections found',
      };
    }

    // Sync to all target calendars
    const results: CalendarEventResult[] = [];

    for (const connection of targetConnections) {
      try {
        const accessToken = await this.getValidAccessToken(connection);
        let result: CalendarEventResult;

        switch (connection.provider) {
          case CalendarProvider.GOOGLE:
            result = await GoogleCalendarOAuth.createEvent(
              accessToken,
              connection.calendarId,
              event
            );
            break;
          case CalendarProvider.OUTLOOK:
            result = await OutlookCalendarOAuth.createEvent(
              accessToken,
              connection.calendarId,
              event
            );
            break;
          case CalendarProvider.APPLE:
            result = await AppleCalendarOAuth.createEvent(
              connection.email,
              accessToken,
              connection.calendarId,
              event
            );
            break;
          default:
            continue;
        }

        if (result.success && result.eventId) {
          // Store event ID for later reference
          if (!scheduledDate.calendarEventIds) {
            scheduledDate.calendarEventIds = {};
          }
          scheduledDate.calendarEventIds[userId] = {
            provider: connection.provider,
            eventId: result.eventId,
          };
        }

        results.push(result);
      } catch (error) {
        logger.error(`Failed to sync to ${connection.provider}:`, error);
        results.push({
          success: false,
          error: `Failed to sync to ${connection.provider}`,
        });
      }
    }

    // Update scheduled date with event IDs
    if (scheduledDate.calendarEventIds) {
      await postgresClient.scheduledDates()
        .where({ id: scheduledDate.id })
        .update({
          calendar_event_ids: JSON.stringify(scheduledDate.calendarEventIds),
        });
    }

    // Return first successful result or last error
    const successResult = results.find((r) => r.success);
    return (
      successResult ||
      results[results.length - 1] || { success: false, error: 'No calendars synced' }
    );
  }

  /**
   * Delete calendar events for a cancelled date
   */
  private async deleteCalendarEvents(scheduledDate: ScheduledDate): Promise<void> {
    if (!scheduledDate.calendarEventIds) return;

    for (const [userId, eventInfo] of Object.entries(scheduledDate.calendarEventIds)) {
      try {
        const connection = await this.getConnection(userId, eventInfo.provider);
        if (!connection) continue;

        const accessToken = await this.getValidAccessToken(connection);

        switch (eventInfo.provider) {
          case CalendarProvider.GOOGLE:
            await GoogleCalendarOAuth.deleteEvent(
              accessToken,
              connection.calendarId,
              eventInfo.eventId
            );
            break;
          case CalendarProvider.OUTLOOK:
            await OutlookCalendarOAuth.deleteEvent(
              accessToken,
              connection.calendarId,
              eventInfo.eventId
            );
            break;
          case CalendarProvider.APPLE:
            await AppleCalendarOAuth.deleteEvent(
              connection.email,
              accessToken,
              connection.calendarId,
              eventInfo.eventId
            );
            break;
        }
      } catch (error) {
        logger.warn(`Failed to delete calendar event for user ${userId}:`, error);
      }
    }
  }

  /**
   * Update availability sharing preference
   */
  async updateAvailabilitySharing(
    userId: string,
    provider: CalendarProvider,
    shareAvailability: boolean
  ): Promise<CalendarConnection> {
    await this.ensureInitialized();

    const connection = await this.getConnection(userId, provider);
    if (!connection) {
      throw new Error('Calendar connection not found');
    }

    const now = new Date();

    await postgresClient.calendarConnections()
      .where({ id: connection.id })
      .update({
        share_availability: shareAvailability,
        updated_at: now,
      });

    connection.shareAvailability = shareAvailability;
    connection.updatedAt = now;

    return connection;
  }
}

// Export singleton instance
export const calendarIntegrationService = new CalendarIntegrationService();
export default calendarIntegrationService;
