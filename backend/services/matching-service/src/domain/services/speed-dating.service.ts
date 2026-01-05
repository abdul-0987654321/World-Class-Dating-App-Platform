/**
 * Speed Dating Service
 * Handles business logic for speed dating events, including round management,
 * participant matching, and interest recording
 */

import { createLogger } from '@flamoral/backend-shared';

import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import { UserMode } from '../../types';
import { Match } from '../entities/Match.entity';
import { SpeedDatingEvent, SpeedDatingEventStatus } from '../entities/SpeedDatingEvent.entity';
import { SpeedDatingMatch } from '../entities/SpeedDatingMatch.entity';
import {
  SpeedDatingParticipant,
  ParticipantStatus,
} from '../entities/SpeedDatingParticipant.entity';
import matchRepository from '../repositories/match.repository';
import speedDatingRepository, {
  EventFilters,
  RoundPairing,
} from '../repositories/speed-dating.repository';

const logger = createLogger('speed-dating-service');

export interface JoinEventResult {
  participant: SpeedDatingParticipant;
  position: number;
  event: SpeedDatingEvent;
}

export interface InterestResult {
  success: boolean;
  mutual: boolean;
  match?: SpeedDatingMatch;
}

export interface RoundInfo {
  roundNumber: number;
  partner: {
    id: string;
    participantId: string;
  } | null;
  startTime: Date;
  endTime: Date;
  status: string;
  roomId?: string;
}

export interface EventStats {
  totalParticipants: number;
  activeParticipants: number;
  completedRounds: number;
  totalMatches: number;
  mutualMatches: number;
}

export class SpeedDatingService {
  /**
   * Get upcoming events with optional filters
   */
  async getUpcomingEvents(
    filters: EventFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ events: SpeedDatingEvent[]; total: number }> {
    try {
      logger.info('Getting upcoming events', { filters, limit, offset });

      const events = await speedDatingRepository.getUpcomingEvents(
        { ...filters, hasSpace: true },
        limit,
        offset
      );

      return {
        events,
        total: events.length,
      };
    } catch (error) {
      logger.error('Failed to get upcoming events', error);
      throw error;
    }
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<SpeedDatingEvent | null> {
    try {
      return await speedDatingRepository.findEventById(eventId);
    } catch (error) {
      logger.error('Failed to get event', error);
      throw error;
    }
  }

  /**
   * Get user's registered events
   */
  async getUserRegisteredEvents(userId: string): Promise<SpeedDatingEvent[]> {
    try {
      const results = await speedDatingRepository.getUserEvents(userId);
      return results.map((r) => r.event);
    } catch (error) {
      logger.error('Failed to get user registered events', error);
      throw error;
    }
  }

  /**
   * Join an event
   */
  async joinEvent(userId: string, eventId: string): Promise<JoinEventResult> {
    try {
      logger.info(`User ${userId} joining event ${eventId}`);

      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.isUpcoming()) {
        throw new Error('Event is not accepting registrations');
      }

      if (!event.hasSpace()) {
        throw new Error('Event is full');
      }

      // Check if user already registered
      const existingParticipant = await speedDatingRepository.findParticipantByEventAndUser(
        eventId,
        userId
      );
      if (existingParticipant) {
        throw new Error('Already registered for this event');
      }

      // TODO: Check event requirements (age, verification, premium status)
      // TODO: Deduct entry fee if applicable

      // Create participant
      const participantData = SpeedDatingParticipant.createNew(eventId, userId);
      const participant = await speedDatingRepository.createParticipant(participantData);

      // Increment event participant count
      await speedDatingRepository.incrementParticipantCount(eventId);

      // Refresh event to get updated count
      const updatedEvent = await speedDatingRepository.findEventById(eventId);

      logger.info(
        `User ${userId} joined event ${eventId}, position ${updatedEvent.currentParticipants}`
      );

      return {
        participant,
        position: updatedEvent.currentParticipants,
        event: updatedEvent,
      };
    } catch (error) {
      logger.error('Failed to join event', error);
      throw error;
    }
  }

  /**
   * Leave an event (before it starts)
   */
  async leaveEvent(userId: string, eventId: string): Promise<void> {
    try {
      logger.info(`User ${userId} leaving event ${eventId}`);

      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.isUpcoming()) {
        throw new Error('Cannot leave an active or completed event');
      }

      const participant = await speedDatingRepository.findParticipantByEventAndUser(
        eventId,
        userId
      );

      if (!participant) {
        throw new Error('Not registered for this event');
      }

      // Delete participant
      await speedDatingRepository.deleteParticipant(participant.id);

      // Decrement event participant count
      await speedDatingRepository.decrementParticipantCount(eventId);

      // TODO: Refund entry fee if applicable

      logger.info(`User ${userId} left event ${eventId}`);
    } catch (error) {
      logger.error('Failed to leave event', error);
      throw error;
    }
  }

  /**
   * Check in to an event (when event is about to start)
   */
  async checkIn(userId: string, eventId: string): Promise<SpeedDatingParticipant> {
    try {
      logger.info(`User ${userId} checking in to event ${eventId}`);

      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      // Allow check-in 15 minutes before start
      const checkInWindow = event.startTime.getTime() - 15 * 60 * 1000;
      if (Date.now() < checkInWindow) {
        throw new Error('Check-in not yet available');
      }

      const participant = await speedDatingRepository.findParticipantByEventAndUser(
        eventId,
        userId
      );

      if (!participant) {
        throw new Error('Not registered for this event');
      }

      if (participant.hasCheckedIn()) {
        return participant;
      }

      const updatedParticipant = await speedDatingRepository.updateParticipantStatus(
        participant.id,
        ParticipantStatus.CHECKED_IN
      );

      logger.info(`User ${userId} checked in to event ${eventId}`);

      return updatedParticipant;
    } catch (error) {
      logger.error('Failed to check in', error);
      throw error;
    }
  }

  /**
   * Start an event (admin/scheduler function)
   */
  async startEvent(eventId: string): Promise<SpeedDatingEvent> {
    try {
      logger.info(`Starting event ${eventId}`);

      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.isUpcoming()) {
        throw new Error('Event is not in upcoming status');
      }

      // Update event status
      const updatedEvent = await speedDatingRepository.updateEventStatus(
        eventId,
        SpeedDatingEventStatus.ACTIVE
      );

      // Get checked-in participants
      const participants = await speedDatingRepository.getEventParticipants(
        eventId,
        ParticipantStatus.CHECKED_IN
      );

      // Mark non-checked-in participants as left
      const allParticipants = await speedDatingRepository.getEventParticipants(eventId);
      for (const p of allParticipants) {
        if (p.status === ParticipantStatus.REGISTERED) {
          await speedDatingRepository.updateParticipantStatus(p.id, ParticipantStatus.LEFT);
        }
      }

      // Calculate total rounds based on participant count
      const numParticipants = participants.length;
      const totalRounds = Math.min(numParticipants - 1, 10); // Max 10 rounds

      await speedDatingRepository.updateEventRound(eventId, 0, totalRounds);

      logger.info(
        `Event ${eventId} started with ${numParticipants} participants, ${totalRounds} rounds planned`
      );

      // Notify participants
      for (const p of participants) {
        await notificationServiceClient.sendNotification({
          userId: p.userId,
          type: 'speed_dating',
          title: 'Speed Dating Starting!',
          body: `${event.name} is starting now. Get ready for your first round!`,
          data: { eventId, action: 'join_event' },
          channel: 'push',
        });
      }

      return updatedEvent;
    } catch (error) {
      logger.error('Failed to start event', error);
      throw error;
    }
  }

  /**
   * Start a new round
   */
  async startRound(eventId: string): Promise<{ roundNumber: number; pairings: RoundPairing[] }> {
    try {
      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      if (!event.isActive()) {
        throw new Error('Event is not active');
      }

      const newRoundNumber = event.currentRound + 1;

      if (newRoundNumber > event.totalRounds) {
        throw new Error('All rounds completed');
      }

      logger.info(`Starting round ${newRoundNumber} for event ${eventId}`);

      // Get active participants
      const participants = await speedDatingRepository.getActiveParticipants(eventId);

      if (participants.length < 2) {
        throw new Error('Not enough participants for a round');
      }

      // Generate pairings using round-robin algorithm
      const pairings = this.generateRoundPairings(participants, newRoundNumber, eventId);

      // Save pairings to database
      const savedPairings = await speedDatingRepository.createRoundPairings(pairings);

      // Update event round
      await speedDatingRepository.updateEventRound(eventId, newRoundNumber);

      // Update participants
      for (const pairing of savedPairings) {
        await speedDatingRepository.updateParticipantRound(
          pairing.participantAId,
          newRoundNumber,
          pairing.participantBId
        );
        await speedDatingRepository.updateParticipantRound(
          pairing.participantBId,
          newRoundNumber,
          pairing.participantAId
        );

        // Mark pairing as active
        await speedDatingRepository.updateRoundPairingStatus(
          pairing.id,
          'active',
          `speed-dating-${eventId}-${newRoundNumber}-${pairing.id}`
        );
      }

      // Notify participants about their partner
      for (const pairing of savedPairings) {
        await Promise.allSettled([
          notificationServiceClient.sendNotification({
            userId: pairing.userAId,
            type: 'speed_dating',
            title: `Round ${newRoundNumber} Starting!`,
            body: 'Your partner is ready. Start your conversation!',
            data: {
              eventId,
              roundNumber: newRoundNumber,
              partnerId: pairing.userBId,
              roomId: pairing.roomId,
              action: 'start_round',
            },
            channel: 'push',
          }),
          notificationServiceClient.sendNotification({
            userId: pairing.userBId,
            type: 'speed_dating',
            title: `Round ${newRoundNumber} Starting!`,
            body: 'Your partner is ready. Start your conversation!',
            data: {
              eventId,
              roundNumber: newRoundNumber,
              partnerId: pairing.userAId,
              roomId: pairing.roomId,
              action: 'start_round',
            },
            channel: 'push',
          }),
        ]);
      }

      logger.info(`Round ${newRoundNumber} started with ${savedPairings.length} pairings`);

      return {
        roundNumber: newRoundNumber,
        pairings: savedPairings,
      };
    } catch (error) {
      logger.error('Failed to start round', error);
      throw error;
    }
  }

  /**
   * End current round
   */
  async endRound(eventId: string): Promise<void> {
    try {
      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      logger.info(`Ending round ${event.currentRound} for event ${eventId}`);

      // Get current round pairings
      const pairings = await speedDatingRepository.getRoundPairings(eventId, event.currentRound);

      // Mark all pairings as completed
      for (const pairing of pairings) {
        await speedDatingRepository.updateRoundPairingStatus(pairing.id, 'completed');
      }

      // Update participants to waiting status
      const participants = await speedDatingRepository.getActiveParticipants(eventId);
      for (const p of participants) {
        await speedDatingRepository.updateParticipantStatus(p.id, ParticipantStatus.WAITING);
      }

      // Notify participants to submit their interest
      for (const p of participants) {
        await notificationServiceClient.sendNotification({
          userId: p.userId,
          type: 'speed_dating',
          title: 'Round Complete!',
          body: 'Time to decide! Were you interested in your partner?',
          data: {
            eventId,
            roundNumber: event.currentRound,
            action: 'submit_interest',
          },
          channel: 'push',
        });
      }

      logger.info(`Round ${event.currentRound} ended for event ${eventId}`);
    } catch (error) {
      logger.error('Failed to end round', error);
      throw error;
    }
  }

  /**
   * Record interest in a participant
   */
  async recordInterest(
    userId: string,
    eventId: string,
    targetUserId: string,
    interested: boolean
  ): Promise<InterestResult> {
    try {
      logger.info(`User ${userId} recording interest in ${targetUserId}: ${interested}`);

      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      const participant = await speedDatingRepository.findParticipantByEventAndUser(
        eventId,
        userId
      );
      const targetParticipant = await speedDatingRepository.findParticipantByEventAndUser(
        eventId,
        targetUserId
      );

      if (!participant || !targetParticipant) {
        throw new Error('Participant not found');
      }

      // Record the interest
      await speedDatingRepository.recordInterest({
        eventId,
        roundNumber: event.currentRound,
        participantId: participant.id,
        userId,
        targetParticipantId: targetParticipant.id,
        targetUserId,
        interested,
      });

      // Update participant's match history
      participant.recordInterest(event.currentRound, targetUserId, interested);
      await speedDatingRepository.updateMatchHistory(participant.id, participant.matchHistory);

      // Check if there's mutual interest
      if (interested) {
        const mutual = await speedDatingRepository.checkMutualInterest(
          eventId,
          event.currentRound,
          participant.id,
          targetParticipant.id
        );

        if (mutual) {
          // Create speed dating match
          const matchData = SpeedDatingMatch.createNew({
            eventId,
            participantAId: participant.id,
            participantBId: targetParticipant.id,
            userAId: userId,
            userBId: targetUserId,
            roundNumber: event.currentRound,
            mutualInterest: true,
          });

          const match = await speedDatingRepository.createMatch(matchData);

          // Update both participants' match history
          participant.updatePartnerInterest(event.currentRound, targetUserId, true);
          targetParticipant.updatePartnerInterest(event.currentRound, userId, true);

          await speedDatingRepository.updateMatchHistory(participant.id, participant.matchHistory);
          await speedDatingRepository.updateMatchHistory(
            targetParticipant.id,
            targetParticipant.matchHistory
          );

          logger.info(`Mutual match created between ${userId} and ${targetUserId}`);

          return { success: true, mutual: true, match };
        }
      }

      return { success: true, mutual: false };
    } catch (error) {
      logger.error('Failed to record interest', error);
      throw error;
    }
  }

  /**
   * Get user's matches from an event
   */
  async getMatches(userId: string, eventId: string): Promise<SpeedDatingMatch[]> {
    try {
      return await speedDatingRepository.getUserEventMatches(eventId, userId);
    } catch (error) {
      logger.error('Failed to get matches', error);
      throw error;
    }
  }

  /**
   * Get user's current round info
   */
  async getCurrentRound(userId: string, eventId: string): Promise<RoundInfo | null> {
    try {
      const event = await speedDatingRepository.findEventById(eventId);

      if (!event || !event.isActive() || event.currentRound === 0) {
        return null;
      }

      const participant = await speedDatingRepository.findParticipantByEventAndUser(
        eventId,
        userId
      );

      if (!participant) {
        return null;
      }

      const pairing = await speedDatingRepository.getParticipantRoundPairing(
        eventId,
        event.currentRound,
        participant.id
      );

      if (!pairing) {
        return {
          roundNumber: event.currentRound,
          partner: null,
          startTime: event.startTime,
          endTime: new Date(event.startTime.getTime() + event.roundDuration * 1000),
          status: 'waiting',
        };
      }

      const partnerParticipantId =
        pairing.participantAId === participant.id ? pairing.participantBId : pairing.participantAId;
      const partnerUserId = pairing.userAId === userId ? pairing.userBId : pairing.userAId;

      return {
        roundNumber: event.currentRound,
        partner: {
          id: partnerUserId,
          participantId: partnerParticipantId,
        },
        startTime: pairing.startedAt || event.startTime,
        endTime: new Date(
          (pairing.startedAt || event.startTime).getTime() + event.roundDuration * 1000
        ),
        status: pairing.status,
        roomId: pairing.roomId,
      };
    } catch (error) {
      logger.error('Failed to get current round', error);
      throw error;
    }
  }

  /**
   * Complete an event
   */
  async completeEvent(
    eventId: string
  ): Promise<{ event: SpeedDatingEvent; matchesCreated: number }> {
    try {
      logger.info(`Completing event ${eventId}`);

      const event = await speedDatingRepository.findEventById(eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      // Get all mutual matches
      const mutualMatches = await speedDatingRepository.getEventMutualMatches(eventId);

      // Create regular matches for mutual speed dating matches
      let matchesCreated = 0;
      for (const speedMatch of mutualMatches) {
        if (!speedMatch.regularMatchCreated) {
          try {
            const regularMatchData = Match.createNew(
              speedMatch.userAId,
              speedMatch.userBId,
              UserMode.DATE,
              undefined
            );

            const regularMatch = await matchRepository.create(regularMatchData);

            await speedDatingRepository.linkRegularMatch(speedMatch.id, regularMatch.id);

            matchesCreated++;

            // Notify both users
            await Promise.allSettled([
              notificationServiceClient.sendNotification({
                userId: speedMatch.userAId,
                type: 'new_match',
                title: "It's a Match!",
                body: 'You matched at the speed dating event! Start chatting now.',
                data: {
                  matchId: regularMatch.id,
                  speedDatingEventId: eventId,
                  action: 'view_match',
                },
                channel: 'push',
              }),
              notificationServiceClient.sendNotification({
                userId: speedMatch.userBId,
                type: 'new_match',
                title: "It's a Match!",
                body: 'You matched at the speed dating event! Start chatting now.',
                data: {
                  matchId: regularMatch.id,
                  speedDatingEventId: eventId,
                  action: 'view_match',
                },
                channel: 'push',
              }),
            ]);
          } catch (error) {
            logger.error(
              `Failed to create regular match for speed dating match ${speedMatch.id}`,
              error
            );
          }
        }
      }

      // Update event status
      const updatedEvent = await speedDatingRepository.updateEventStatus(
        eventId,
        SpeedDatingEventStatus.COMPLETED
      );

      // Update all participants to completed
      const participants = await speedDatingRepository.getEventParticipants(eventId);
      for (const p of participants) {
        if (p.canParticipate()) {
          await speedDatingRepository.updateParticipantStatus(p.id, ParticipantStatus.COMPLETED);
        }
      }

      // Notify all participants
      for (const p of participants) {
        const userMatches = mutualMatches.filter((m) => m.involvesUser(p.userId));
        await notificationServiceClient.sendNotification({
          userId: p.userId,
          type: 'speed_dating',
          title: 'Speed Dating Complete!',
          body: `Thanks for joining! You got ${userMatches.length} match${userMatches.length !== 1 ? 'es' : ''}.`,
          data: {
            eventId,
            matchCount: userMatches.length,
            action: 'view_results',
          },
          channel: 'push',
        });
      }

      logger.info(`Event ${eventId} completed. ${matchesCreated} regular matches created.`);

      return {
        event: updatedEvent,
        matchesCreated,
      };
    } catch (error) {
      logger.error('Failed to complete event', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStats(eventId: string): Promise<EventStats> {
    try {
      const participants = await speedDatingRepository.getEventParticipants(eventId);
      const activeParticipants = participants.filter((p) => p.isActive());
      const event = await speedDatingRepository.findEventById(eventId);
      const matches = await speedDatingRepository.getEventMutualMatches(eventId);

      return {
        totalParticipants: participants.length,
        activeParticipants: activeParticipants.length,
        completedRounds: event?.currentRound || 0,
        totalMatches: matches.length,
        mutualMatches: matches.filter((m) => m.mutualInterest).length,
      };
    } catch (error) {
      logger.error('Failed to get event stats', error);
      throw error;
    }
  }

  /**
   * Generate round pairings using round-robin algorithm
   * Ensures participants don't meet the same person twice
   */
  private generateRoundPairings(
    participants: SpeedDatingParticipant[],
    roundNumber: number,
    eventId: string
  ): Partial<RoundPairing>[] {
    const pairings: Partial<RoundPairing>[] = [];
    const n = participants.length;

    if (n < 2) return pairings;

    // For odd number of participants, we need to add a "bye" position
    const participantList = [...participants];
    const hasOdd = n % 2 !== 0;

    // Round-robin rotation
    // In round i, pair participant at position j with participant at position (n-1-j) after rotation
    const numPositions = hasOdd ? n + 1 : n;

    // Rotate positions for this round (round numbers are 1-indexed)
    const getRotatedPosition = (pos: number, round: number): number => {
      if (pos === 0) return 0; // First position stays fixed
      // Rotate remaining positions
      return ((pos - 1 + (round - 1)) % (numPositions - 1)) + 1;
    };

    // Create pairings
    for (let i = 0; i < numPositions / 2; i++) {
      const posA = getRotatedPosition(i, roundNumber);
      const posB = getRotatedPosition(numPositions - 1 - i, roundNumber);

      // Skip if either position is the "bye" position (for odd participants)
      if (hasOdd && (posA >= n || posB >= n)) continue;

      const participantA = participantList[posA];
      const participantB = participantList[posB];

      // Check if they've already met
      if (participantA.hasMetPartner(participantB.userId)) {
        // Try to find alternative pairing
        // For simplicity, skip this pair - in production, use more sophisticated matching
        continue;
      }

      pairings.push({
        eventId,
        roundNumber,
        participantAId: participantA.id,
        participantBId: participantB.id,
        userAId: participantA.userId,
        userBId: participantB.userId,
        status: 'scheduled',
      });
    }

    return pairings;
  }
}

export default new SpeedDatingService();
