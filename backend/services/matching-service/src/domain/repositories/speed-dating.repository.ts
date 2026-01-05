/**
 * Speed Dating Repository
 * Handles database operations for speed dating events, participants, and matches
 */

import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

import db from '../../infrastructure/database/connection';
import { SpeedDatingEvent, SpeedDatingEventStatus } from '../entities/SpeedDatingEvent.entity';
import { SpeedDatingMatch, SpeedDatingInterest } from '../entities/SpeedDatingMatch.entity';
import {
  SpeedDatingParticipant,
  ParticipantStatus,
} from '../entities/SpeedDatingParticipant.entity';

const logger = createLogger('speed-dating-repository');

export interface EventFilters {
  status?: SpeedDatingEventStatus;
  theme?: string;
  location?: string;
  fromDate?: Date;
  toDate?: Date;
  hasSpace?: boolean;
}

export interface RoundPairing {
  id: string;
  eventId: string;
  roundNumber: number;
  participantAId: string;
  participantBId: string;
  userAId: string;
  userBId: string;
  status: string;
  startedAt?: Date;
  endedAt?: Date;
  roomId?: string;
}

export class SpeedDatingRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  // ==================== EVENT OPERATIONS ====================

  /**
   * Create a new speed dating event
   */
  async createEvent(event: Partial<SpeedDatingEvent>): Promise<SpeedDatingEvent> {
    try {
      const [created] = await this.db('speed_dating_events')
        .insert({
          name: event.name,
          description: event.description,
          start_time: event.startTime,
          end_time: event.endTime,
          max_participants: event.maxParticipants,
          current_participants: event.currentParticipants || 0,
          round_duration: event.roundDuration,
          break_duration: event.breakDuration,
          total_rounds: event.totalRounds || 0,
          current_round: event.currentRound || 0,
          status: event.status || SpeedDatingEventStatus.UPCOMING,
          theme: event.theme,
          age_range: event.ageRange ? JSON.stringify(event.ageRange) : null,
          location: event.location,
          requirements: event.requirements ? JSON.stringify(event.requirements) : null,
          entry_fee: event.entryFee ? JSON.stringify(event.entryFee) : null,
          cover_image: event.coverImage,
          host_id: event.hostId,
        })
        .returning('*');

      return this.mapToEvent(created);
    } catch (error) {
      logger.error('Failed to create event', error);
      throw error;
    }
  }

  /**
   * Find event by ID
   */
  async findEventById(eventId: string): Promise<SpeedDatingEvent | null> {
    try {
      const event = await this.db('speed_dating_events').where({ id: eventId }).first();

      return event ? this.mapToEvent(event) : null;
    } catch (error) {
      logger.error('Failed to find event by ID', error);
      throw error;
    }
  }

  /**
   * Get upcoming events with filters
   */
  async getUpcomingEvents(
    filters: EventFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<SpeedDatingEvent[]> {
    try {
      let query = this.db('speed_dating_events').where('start_time', '>', new Date());

      if (filters.status) {
        query = query.andWhere('status', filters.status);
      } else {
        query = query.andWhere('status', SpeedDatingEventStatus.UPCOMING);
      }

      if (filters.theme) {
        query = query.andWhere('theme', filters.theme);
      }

      if (filters.location) {
        query = query.andWhere('location', 'ilike', `%${filters.location}%`);
      }

      if (filters.fromDate) {
        query = query.andWhere('start_time', '>=', filters.fromDate);
      }

      if (filters.toDate) {
        query = query.andWhere('start_time', '<=', filters.toDate);
      }

      if (filters.hasSpace) {
        query = query.andWhereRaw('current_participants < max_participants');
      }

      const events = await query.orderBy('start_time', 'asc').limit(limit).offset(offset);

      return events.map(this.mapToEvent);
    } catch (error) {
      logger.error('Failed to get upcoming events', error);
      throw error;
    }
  }

  /**
   * Update event status
   */
  async updateEventStatus(
    eventId: string,
    status: SpeedDatingEventStatus
  ): Promise<SpeedDatingEvent | null> {
    try {
      const [updated] = await this.db('speed_dating_events')
        .where({ id: eventId })
        .update({ status })
        .returning('*');

      return updated ? this.mapToEvent(updated) : null;
    } catch (error) {
      logger.error('Failed to update event status', error);
      throw error;
    }
  }

  /**
   * Update event round info
   */
  async updateEventRound(
    eventId: string,
    currentRound: number,
    totalRounds?: number
  ): Promise<SpeedDatingEvent | null> {
    try {
      const updateData: any = { current_round: currentRound };
      if (totalRounds !== undefined) {
        updateData.total_rounds = totalRounds;
      }

      const [updated] = await this.db('speed_dating_events')
        .where({ id: eventId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToEvent(updated) : null;
    } catch (error) {
      logger.error('Failed to update event round', error);
      throw error;
    }
  }

  /**
   * Increment participant count
   */
  async incrementParticipantCount(eventId: string): Promise<void> {
    try {
      await this.db('speed_dating_events')
        .where({ id: eventId })
        .increment('current_participants', 1);
    } catch (error) {
      logger.error('Failed to increment participant count', error);
      throw error;
    }
  }

  /**
   * Decrement participant count
   */
  async decrementParticipantCount(eventId: string): Promise<void> {
    try {
      await this.db('speed_dating_events')
        .where({ id: eventId })
        .decrement('current_participants', 1);
    } catch (error) {
      logger.error('Failed to decrement participant count', error);
      throw error;
    }
  }

  // ==================== PARTICIPANT OPERATIONS ====================

  /**
   * Create a participant
   */
  async createParticipant(
    participant: Partial<SpeedDatingParticipant>
  ): Promise<SpeedDatingParticipant> {
    try {
      const [created] = await this.db('speed_dating_participants')
        .insert({
          event_id: participant.eventId,
          user_id: participant.userId,
          status: participant.status || ParticipantStatus.REGISTERED,
          current_round: participant.currentRound || 0,
          current_partner_id: participant.currentPartnerId,
          match_history: JSON.stringify(participant.matchHistory || []),
          joined_at: participant.joinedAt || new Date(),
          checked_in_at: participant.checkedInAt,
        })
        .returning('*');

      return this.mapToParticipant(created);
    } catch (error) {
      logger.error('Failed to create participant', error);
      throw error;
    }
  }

  /**
   * Find participant by ID
   */
  async findParticipantById(participantId: string): Promise<SpeedDatingParticipant | null> {
    try {
      const participant = await this.db('speed_dating_participants')
        .where({ id: participantId })
        .first();

      return participant ? this.mapToParticipant(participant) : null;
    } catch (error) {
      logger.error('Failed to find participant by ID', error);
      throw error;
    }
  }

  /**
   * Find participant by event and user
   */
  async findParticipantByEventAndUser(
    eventId: string,
    userId: string
  ): Promise<SpeedDatingParticipant | null> {
    try {
      const participant = await this.db('speed_dating_participants')
        .where({ event_id: eventId, user_id: userId })
        .first();

      return participant ? this.mapToParticipant(participant) : null;
    } catch (error) {
      logger.error('Failed to find participant by event and user', error);
      throw error;
    }
  }

  /**
   * Get all participants for an event
   */
  async getEventParticipants(
    eventId: string,
    status?: ParticipantStatus
  ): Promise<SpeedDatingParticipant[]> {
    try {
      let query = this.db('speed_dating_participants').where({ event_id: eventId });

      if (status) {
        query = query.andWhere('status', status);
      }

      const participants = await query.orderBy('joined_at', 'asc');

      return participants.map(this.mapToParticipant);
    } catch (error) {
      logger.error('Failed to get event participants', error);
      throw error;
    }
  }

  /**
   * Get active participants for an event
   */
  async getActiveParticipants(eventId: string): Promise<SpeedDatingParticipant[]> {
    try {
      const participants = await this.db('speed_dating_participants')
        .where({ event_id: eventId })
        .whereIn('status', [
          ParticipantStatus.CHECKED_IN,
          ParticipantStatus.WAITING,
          ParticipantStatus.IN_ROUND,
        ])
        .orderBy('joined_at', 'asc');

      return participants.map(this.mapToParticipant);
    } catch (error) {
      logger.error('Failed to get active participants', error);
      throw error;
    }
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(
    participantId: string,
    status: ParticipantStatus
  ): Promise<SpeedDatingParticipant | null> {
    try {
      const updateData: any = { status };

      if (status === ParticipantStatus.CHECKED_IN) {
        updateData.checked_in_at = new Date();
      } else if (status === ParticipantStatus.COMPLETED) {
        updateData.completed_at = new Date();
      } else if (status === ParticipantStatus.LEFT) {
        updateData.left_at = new Date();
      }

      const [updated] = await this.db('speed_dating_participants')
        .where({ id: participantId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToParticipant(updated) : null;
    } catch (error) {
      logger.error('Failed to update participant status', error);
      throw error;
    }
  }

  /**
   * Update participant round info
   */
  async updateParticipantRound(
    participantId: string,
    currentRound: number,
    currentPartnerId?: string
  ): Promise<SpeedDatingParticipant | null> {
    try {
      const [updated] = await this.db('speed_dating_participants')
        .where({ id: participantId })
        .update({
          current_round: currentRound,
          current_partner_id: currentPartnerId,
          status: currentPartnerId ? ParticipantStatus.IN_ROUND : ParticipantStatus.WAITING,
        })
        .returning('*');

      return updated ? this.mapToParticipant(updated) : null;
    } catch (error) {
      logger.error('Failed to update participant round', error);
      throw error;
    }
  }

  /**
   * Update participant match history
   */
  async updateMatchHistory(participantId: string, matchHistory: any[]): Promise<void> {
    try {
      await this.db('speed_dating_participants')
        .where({ id: participantId })
        .update({ match_history: JSON.stringify(matchHistory) });
    } catch (error) {
      logger.error('Failed to update match history', error);
      throw error;
    }
  }

  /**
   * Delete participant (leave event)
   */
  async deleteParticipant(participantId: string): Promise<boolean> {
    try {
      const deleted = await this.db('speed_dating_participants').where({ id: participantId }).del();

      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete participant', error);
      throw error;
    }
  }

  /**
   * Get user's registered events
   */
  async getUserEvents(
    userId: string
  ): Promise<{ event: SpeedDatingEvent; participant: SpeedDatingParticipant }[]> {
    try {
      const results = await this.db('speed_dating_participants as p')
        .join('speed_dating_events as e', 'p.event_id', 'e.id')
        .where('p.user_id', userId)
        .whereIn('p.status', [ParticipantStatus.REGISTERED, ParticipantStatus.CHECKED_IN])
        .select('e.*', 'p.id as participant_id', 'p.status as participant_status', 'p.joined_at');

      return results.map((row: any) => ({
        event: this.mapToEvent(row),
        participant: this.mapToParticipant({
          id: row.participant_id,
          event_id: row.id,
          user_id: userId,
          status: row.participant_status,
          joined_at: row.joined_at,
          match_history: '[]',
        }),
      }));
    } catch (error) {
      logger.error('Failed to get user events', error);
      throw error;
    }
  }

  // ==================== INTEREST OPERATIONS ====================

  /**
   * Record interest
   */
  async recordInterest(interest: Partial<SpeedDatingInterest>): Promise<SpeedDatingInterest> {
    try {
      const [created] = await this.db('speed_dating_interests')
        .insert({
          event_id: interest.eventId,
          round_number: interest.roundNumber,
          participant_id: interest.participantId,
          user_id: interest.userId,
          target_participant_id: interest.targetParticipantId,
          target_user_id: interest.targetUserId,
          interested: interest.interested,
        })
        .onConflict(['event_id', 'round_number', 'participant_id', 'target_participant_id'])
        .merge({ interested: interest.interested })
        .returning('*');

      return this.mapToInterest(created);
    } catch (error) {
      logger.error('Failed to record interest', error);
      throw error;
    }
  }

  /**
   * Get interest by participant and target
   */
  async getInterest(
    eventId: string,
    roundNumber: number,
    participantId: string,
    targetParticipantId: string
  ): Promise<SpeedDatingInterest | null> {
    try {
      const interest = await this.db('speed_dating_interests')
        .where({
          event_id: eventId,
          round_number: roundNumber,
          participant_id: participantId,
          target_participant_id: targetParticipantId,
        })
        .first();

      return interest ? this.mapToInterest(interest) : null;
    } catch (error) {
      logger.error('Failed to get interest', error);
      throw error;
    }
  }

  /**
   * Check for mutual interest
   */
  async checkMutualInterest(
    eventId: string,
    roundNumber: number,
    participantAId: string,
    participantBId: string
  ): Promise<boolean> {
    try {
      const interests = await this.db('speed_dating_interests')
        .where({ event_id: eventId, round_number: roundNumber })
        .where(function () {
          this.where({
            participant_id: participantAId,
            target_participant_id: participantBId,
          }).orWhere({ participant_id: participantBId, target_participant_id: participantAId });
        })
        .andWhere('interested', true);

      return interests.length === 2;
    } catch (error) {
      logger.error('Failed to check mutual interest', error);
      throw error;
    }
  }

  // ==================== MATCH OPERATIONS ====================

  /**
   * Create a speed dating match
   */
  async createMatch(match: Partial<SpeedDatingMatch>): Promise<SpeedDatingMatch> {
    try {
      const [created] = await this.db('speed_dating_matches')
        .insert({
          event_id: match.eventId,
          participant_a_id: match.participantAId,
          participant_b_id: match.participantBId,
          user_a_id: match.userAId,
          user_b_id: match.userBId,
          round_number: match.roundNumber,
          mutual_interest: match.mutualInterest || false,
          conversation_started: match.conversationStarted || false,
          regular_match_created: match.regularMatchCreated || false,
          regular_match_id: match.regularMatchId,
        })
        .onConflict(['event_id', 'user_a_id', 'user_b_id'])
        .merge({
          mutual_interest: match.mutualInterest,
        })
        .returning('*');

      return this.mapToMatch(created);
    } catch (error) {
      logger.error('Failed to create match', error);
      throw error;
    }
  }

  /**
   * Get matches for a user from an event
   */
  async getUserEventMatches(eventId: string, userId: string): Promise<SpeedDatingMatch[]> {
    try {
      const matches = await this.db('speed_dating_matches')
        .where({ event_id: eventId })
        .where(function () {
          this.where('user_a_id', userId).orWhere('user_b_id', userId);
        })
        .andWhere('mutual_interest', true)
        .orderBy('round_number', 'asc');

      return matches.map(this.mapToMatch);
    } catch (error) {
      logger.error('Failed to get user event matches', error);
      throw error;
    }
  }

  /**
   * Get all mutual matches for an event
   */
  async getEventMutualMatches(eventId: string): Promise<SpeedDatingMatch[]> {
    try {
      const matches = await this.db('speed_dating_matches')
        .where({ event_id: eventId, mutual_interest: true })
        .orderBy('created_at', 'asc');

      return matches.map(this.mapToMatch);
    } catch (error) {
      logger.error('Failed to get event mutual matches', error);
      throw error;
    }
  }

  /**
   * Update match with regular match ID
   */
  async linkRegularMatch(
    speedDatingMatchId: string,
    regularMatchId: string
  ): Promise<SpeedDatingMatch | null> {
    try {
      const [updated] = await this.db('speed_dating_matches')
        .where({ id: speedDatingMatchId })
        .update({
          regular_match_created: true,
          regular_match_id: regularMatchId,
        })
        .returning('*');

      return updated ? this.mapToMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to link regular match', error);
      throw error;
    }
  }

  // ==================== ROUND OPERATIONS ====================

  /**
   * Create round pairings
   */
  async createRoundPairings(pairings: Partial<RoundPairing>[]): Promise<RoundPairing[]> {
    try {
      const created = await this.db('speed_dating_rounds')
        .insert(
          pairings.map((p) => ({
            event_id: p.eventId,
            round_number: p.roundNumber,
            participant_a_id: p.participantAId,
            participant_b_id: p.participantBId,
            user_a_id: p.userAId,
            user_b_id: p.userBId,
            status: 'scheduled',
          }))
        )
        .returning('*');

      return created.map(this.mapToRoundPairing);
    } catch (error) {
      logger.error('Failed to create round pairings', error);
      throw error;
    }
  }

  /**
   * Get round pairings for an event
   */
  async getRoundPairings(eventId: string, roundNumber: number): Promise<RoundPairing[]> {
    try {
      const pairings = await this.db('speed_dating_rounds').where({
        event_id: eventId,
        round_number: roundNumber,
      });

      return pairings.map(this.mapToRoundPairing);
    } catch (error) {
      logger.error('Failed to get round pairings', error);
      throw error;
    }
  }

  /**
   * Get participant's current round pairing
   */
  async getParticipantRoundPairing(
    eventId: string,
    roundNumber: number,
    participantId: string
  ): Promise<RoundPairing | null> {
    try {
      const pairing = await this.db('speed_dating_rounds')
        .where({ event_id: eventId, round_number: roundNumber })
        .where(function () {
          this.where('participant_a_id', participantId).orWhere('participant_b_id', participantId);
        })
        .first();

      return pairing ? this.mapToRoundPairing(pairing) : null;
    } catch (error) {
      logger.error('Failed to get participant round pairing', error);
      throw error;
    }
  }

  /**
   * Update round pairing status
   */
  async updateRoundPairingStatus(
    pairingId: string,
    status: string,
    roomId?: string
  ): Promise<RoundPairing | null> {
    try {
      const updateData: any = { status };
      if (status === 'active') {
        updateData.started_at = new Date();
        if (roomId) updateData.room_id = roomId;
      } else if (status === 'completed') {
        updateData.ended_at = new Date();
      }

      const [updated] = await this.db('speed_dating_rounds')
        .where({ id: pairingId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToRoundPairing(updated) : null;
    } catch (error) {
      logger.error('Failed to update round pairing status', error);
      throw error;
    }
  }

  // ==================== MAPPERS ====================

  private mapToEvent(record: any): SpeedDatingEvent {
    return new SpeedDatingEvent({
      id: record.id,
      name: record.name,
      description: record.description,
      startTime: new Date(record.start_time),
      endTime: new Date(record.end_time),
      maxParticipants: record.max_participants,
      currentParticipants: record.current_participants,
      roundDuration: record.round_duration,
      breakDuration: record.break_duration,
      totalRounds: record.total_rounds,
      currentRound: record.current_round,
      status: record.status as SpeedDatingEventStatus,
      theme: record.theme,
      ageRange: record.age_range
        ? typeof record.age_range === 'string'
          ? JSON.parse(record.age_range)
          : record.age_range
        : undefined,
      location: record.location,
      requirements: record.requirements
        ? typeof record.requirements === 'string'
          ? JSON.parse(record.requirements)
          : record.requirements
        : undefined,
      entryFee: record.entry_fee
        ? typeof record.entry_fee === 'string'
          ? JSON.parse(record.entry_fee)
          : record.entry_fee
        : undefined,
      coverImage: record.cover_image,
      hostId: record.host_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  private mapToParticipant(record: any): SpeedDatingParticipant {
    return new SpeedDatingParticipant({
      id: record.id,
      eventId: record.event_id,
      userId: record.user_id,
      status: record.status as ParticipantStatus,
      currentRound: record.current_round,
      currentPartnerId: record.current_partner_id,
      matchHistory: record.match_history
        ? typeof record.match_history === 'string'
          ? JSON.parse(record.match_history)
          : record.match_history
        : [],
      joinedAt: new Date(record.joined_at),
      checkedInAt: record.checked_in_at ? new Date(record.checked_in_at) : undefined,
      completedAt: record.completed_at ? new Date(record.completed_at) : undefined,
      leftAt: record.left_at ? new Date(record.left_at) : undefined,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  private mapToMatch(record: any): SpeedDatingMatch {
    return new SpeedDatingMatch({
      id: record.id,
      eventId: record.event_id,
      participantAId: record.participant_a_id,
      participantBId: record.participant_b_id,
      userAId: record.user_a_id,
      userBId: record.user_b_id,
      roundNumber: record.round_number,
      mutualInterest: record.mutual_interest,
      conversationStarted: record.conversation_started,
      regularMatchCreated: record.regular_match_created,
      regularMatchId: record.regular_match_id,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  private mapToInterest(record: any): SpeedDatingInterest {
    return new SpeedDatingInterest({
      id: record.id,
      eventId: record.event_id,
      roundNumber: record.round_number,
      participantId: record.participant_id,
      userId: record.user_id,
      targetParticipantId: record.target_participant_id,
      targetUserId: record.target_user_id,
      interested: record.interested,
      createdAt: new Date(record.created_at),
    });
  }

  private mapToRoundPairing(record: any): RoundPairing {
    return {
      id: record.id,
      eventId: record.event_id,
      roundNumber: record.round_number,
      participantAId: record.participant_a_id,
      participantBId: record.participant_b_id,
      userAId: record.user_a_id,
      userBId: record.user_b_id,
      status: record.status,
      startedAt: record.started_at ? new Date(record.started_at) : undefined,
      endedAt: record.ended_at ? new Date(record.ended_at) : undefined,
      roomId: record.room_id,
    };
  }
}

export default new SpeedDatingRepository();
