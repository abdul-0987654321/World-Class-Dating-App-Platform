/**
 * Speed Dating WebSocket Handler
 * Manages real-time communication for speed dating events
 */

import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import speedDatingService from '../domain/services/speed-dating.service';
import speedDatingRepository from '../domain/repositories/speed-dating.repository';
import { SpeedDatingEventStatus } from '../domain/entities/SpeedDatingEvent.entity';
import { ParticipantStatus } from '../domain/entities/SpeedDatingParticipant.entity';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('speed-dating-websocket');

interface AuthenticatedSocket extends Socket {
  userId?: string;
  eventId?: string;
  participantId?: string;
}

interface RoundTimers {
  [eventId: string]: {
    roundTimer?: NodeJS.Timeout;
    breakTimer?: NodeJS.Timeout;
  };
}

export class SpeedDatingWebSocketHandler {
  private io: Server;
  private eventParticipants: Map<string, Set<string>> = new Map(); // eventId -> Set of socketIds
  private socketToUser: Map<string, { userId: string; eventId: string }> = new Map();
  private roundTimers: RoundTimers = {};

  constructor(io: Server) {
    this.io = io;
    this.setupNamespace();
  }

  private setupNamespace(): void {
    const speedDatingNamespace = this.io.of('/speed-dating');

    // Authentication middleware
    speedDatingNamespace.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const secret = process.env.JWT_ACCESS_SECRET || 'dev-secret-key';
        const decoded = jwt.verify(token, secret) as any;

        socket.userId = decoded.userId || decoded.id;
        next();
      } catch (error) {
        logger.error('WebSocket authentication failed', error);
        next(new Error('Invalid token'));
      }
    });

    speedDatingNamespace.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Speed dating socket connected: ${socket.id}, user: ${socket.userId}`);

      // Join event room
      socket.on('join_event', async (eventId: string) => {
        await this.handleJoinEvent(socket, eventId);
      });

      // Leave event room
      socket.on('leave_event', () => {
        this.handleLeaveEvent(socket);
      });

      // Check in to event
      socket.on('check_in', async (eventId: string) => {
        await this.handleCheckIn(socket, eventId);
      });

      // Submit interest
      socket.on('submit_interest', async (data: { eventId: string; targetUserId: string; interested: boolean }) => {
        await this.handleSubmitInterest(socket, data);
      });

      // Send message in round (for chat during rounds)
      socket.on('round_message', async (data: { eventId: string; message: string }) => {
        await this.handleRoundMessage(socket, data);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleJoinEvent(socket: AuthenticatedSocket, eventId: string): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const event = await speedDatingService.getEvent(eventId);
      if (!event) {
        socket.emit('error', { message: 'Event not found' });
        return;
      }

      const participant = await speedDatingRepository.findParticipantByEventAndUser(eventId, socket.userId);
      if (!participant) {
        socket.emit('error', { message: 'Not registered for this event' });
        return;
      }

      socket.eventId = eventId;
      socket.participantId = participant.id;

      // Join event room
      socket.join(`event:${eventId}`);

      // Track participant
      if (!this.eventParticipants.has(eventId)) {
        this.eventParticipants.set(eventId, new Set());
      }
      this.eventParticipants.get(eventId)!.add(socket.id);
      this.socketToUser.set(socket.id, { userId: socket.userId, eventId });

      // Notify others
      socket.to(`event:${eventId}`).emit('participant_joined', {
        participantId: participant.id,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Send current state
      const stats = await speedDatingService.getEventStats(eventId);
      socket.emit('event_joined', {
        event,
        participant,
        stats,
      });

      // If event is active, send current round info
      if (event.isActive() && event.currentRound > 0) {
        const roundInfo = await speedDatingService.getCurrentRound(socket.userId, eventId);
        socket.emit('round_info', roundInfo);
      }

      logger.info(`User ${socket.userId} joined event ${eventId}`);
    } catch (error) {
      logger.error('Error joining event', error);
      socket.emit('error', { message: 'Failed to join event' });
    }
  }

  private handleLeaveEvent(socket: AuthenticatedSocket): void {
    if (!socket.eventId) return;

    const eventId = socket.eventId;

    // Leave room
    socket.leave(`event:${eventId}`);

    // Clean up tracking
    this.eventParticipants.get(eventId)?.delete(socket.id);
    this.socketToUser.delete(socket.id);

    // Notify others
    socket.to(`event:${eventId}`).emit('participant_left', {
      participantId: socket.participantId,
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    socket.eventId = undefined;
    socket.participantId = undefined;

    logger.info(`User ${socket.userId} left event ${eventId}`);
  }

  private async handleCheckIn(socket: AuthenticatedSocket, eventId: string): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const participant = await speedDatingService.checkIn(socket.userId, eventId);

      socket.emit('checked_in', {
        participant,
        message: 'Successfully checked in',
      });

      // Notify event room
      this.io.of('/speed-dating').to(`event:${eventId}`).emit('participant_checked_in', {
        participantId: participant.id,
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      // Update stats for everyone
      const stats = await speedDatingService.getEventStats(eventId);
      this.io.of('/speed-dating').to(`event:${eventId}`).emit('stats_updated', stats);
    } catch (error: any) {
      logger.error('Check-in failed', error);
      socket.emit('error', { message: error.message || 'Failed to check in' });
    }
  }

  private async handleSubmitInterest(
    socket: AuthenticatedSocket,
    data: { eventId: string; targetUserId: string; interested: boolean }
  ): Promise<void> {
    try {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      const result = await speedDatingService.recordInterest(
        socket.userId,
        data.eventId,
        data.targetUserId,
        data.interested
      );

      socket.emit('interest_recorded', {
        success: true,
        mutual: result.mutual,
        match: result.match,
      });

      // If mutual, notify the other user
      if (result.mutual && result.match) {
        // Find the other user's socket
        const sockets = await this.io.of('/speed-dating').in(`event:${data.eventId}`).fetchSockets();
        for (const s of sockets) {
          const userData = this.socketToUser.get(s.id);
          if (userData && userData.userId === data.targetUserId) {
            s.emit('mutual_match', {
              match: result.match,
              partnerId: socket.userId,
            });
            break;
          }
        }
      }
    } catch (error: any) {
      logger.error('Submit interest failed', error);
      socket.emit('error', { message: error.message || 'Failed to record interest' });
    }
  }

  private async handleRoundMessage(
    socket: AuthenticatedSocket,
    data: { eventId: string; message: string }
  ): Promise<void> {
    try {
      if (!socket.userId || !socket.participantId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      // Get current round pairing
      const event = await speedDatingService.getEvent(data.eventId);
      if (!event || !event.isActive()) {
        socket.emit('error', { message: 'Event not active' });
        return;
      }

      const pairing = await speedDatingRepository.getParticipantRoundPairing(
        data.eventId,
        event.currentRound,
        socket.participantId
      );

      if (!pairing || pairing.status !== 'active') {
        socket.emit('error', { message: 'No active round' });
        return;
      }

      const partnerUserId = pairing.userAId === socket.userId ? pairing.userBId : pairing.userAId;

      // Find partner's socket
      const sockets = await this.io.of('/speed-dating').in(`event:${data.eventId}`).fetchSockets();
      for (const s of sockets) {
        const userData = this.socketToUser.get(s.id);
        if (userData && userData.userId === partnerUserId) {
          s.emit('round_message', {
            from: socket.userId,
            message: data.message,
            timestamp: new Date().toISOString(),
          });
          break;
        }
      }

      // Acknowledge to sender
      socket.emit('message_sent', {
        message: data.message,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Round message failed', error);
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  }

  private handleDisconnect(socket: AuthenticatedSocket): void {
    if (socket.eventId) {
      this.handleLeaveEvent(socket);
    }
    logger.info(`Speed dating socket disconnected: ${socket.id}`);
  }

  // ==================== Event Management (called from service/scheduler) ====================

  /**
   * Start an event (broadcast to all participants)
   */
  async broadcastEventStart(eventId: string): Promise<void> {
    const event = await speedDatingService.getEvent(eventId);
    if (!event) return;

    this.io.of('/speed-dating').to(`event:${eventId}`).emit('event_started', {
      event,
      message: 'The speed dating event has started!',
      timestamp: new Date().toISOString(),
    });

    logger.info(`Broadcast event start for ${eventId}`);
  }

  /**
   * Start a round (broadcast pairings to participants)
   */
  async broadcastRoundStart(eventId: string): Promise<void> {
    const event = await speedDatingService.getEvent(eventId);
    if (!event) return;

    // Get pairings for this round
    const pairings = await speedDatingRepository.getRoundPairings(eventId, event.currentRound);

    // Notify all participants in the event
    this.io.of('/speed-dating').to(`event:${eventId}`).emit('round_started', {
      roundNumber: event.currentRound,
      totalRounds: event.totalRounds,
      duration: event.roundDuration,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + event.roundDuration * 1000).toISOString(),
    });

    // Send individual pairing info to each participant
    const sockets = await this.io.of('/speed-dating').in(`event:${eventId}`).fetchSockets();
    for (const socket of sockets) {
      const userData = this.socketToUser.get(socket.id);
      if (!userData) continue;

      const pairing = pairings.find(
        (p) => p.userAId === userData.userId || p.userBId === userData.userId
      );

      if (pairing) {
        const partnerId = pairing.userAId === userData.userId ? pairing.userBId : pairing.userAId;
        socket.emit('your_round', {
          roundNumber: event.currentRound,
          partnerId,
          roomId: pairing.roomId,
          duration: event.roundDuration,
        });
      } else {
        socket.emit('your_round', {
          roundNumber: event.currentRound,
          partnerId: null,
          message: 'No partner for this round (odd number of participants)',
        });
      }
    }

    // Set timer for round end
    this.scheduleRoundEnd(eventId, event.roundDuration);

    logger.info(`Broadcast round ${event.currentRound} start for ${eventId}`);
  }

  /**
   * End current round (broadcast to participants)
   */
  async broadcastRoundEnd(eventId: string): Promise<void> {
    const event = await speedDatingService.getEvent(eventId);
    if (!event) return;

    // Clear any existing timers
    this.clearEventTimers(eventId);

    // End the round in the service
    await speedDatingService.endRound(eventId);

    this.io.of('/speed-dating').to(`event:${eventId}`).emit('round_ended', {
      roundNumber: event.currentRound,
      message: 'Round complete! Time to decide if you are interested.',
      breakDuration: event.breakDuration,
      nextRound: event.currentRound < event.totalRounds ? event.currentRound + 1 : null,
    });

    // Schedule next round or event completion
    if (event.currentRound < event.totalRounds) {
      this.scheduleNextRound(eventId, event.breakDuration);
    } else {
      this.scheduleEventCompletion(eventId, event.breakDuration);
    }

    logger.info(`Broadcast round ${event.currentRound} end for ${eventId}`);
  }

  /**
   * Complete event (broadcast results)
   */
  async broadcastEventComplete(eventId: string): Promise<void> {
    const result = await speedDatingService.completeEvent(eventId);

    this.io.of('/speed-dating').to(`event:${eventId}`).emit('event_completed', {
      event: result.event,
      matchesCreated: result.matchesCreated,
      message: 'Thanks for participating! Check your matches.',
      timestamp: new Date().toISOString(),
    });

    // Send individual match count to each participant
    const sockets = await this.io.of('/speed-dating').in(`event:${eventId}`).fetchSockets();
    for (const socket of sockets) {
      const userData = this.socketToUser.get(socket.id);
      if (!userData) continue;

      const matches = await speedDatingService.getMatches(userData.userId, eventId);
      socket.emit('your_results', {
        matchCount: matches.length,
        matches,
      });
    }

    // Clean up
    this.clearEventTimers(eventId);
    this.eventParticipants.delete(eventId);

    logger.info(`Broadcast event complete for ${eventId}`);
  }

  /**
   * Send countdown updates
   */
  private sendCountdown(eventId: string, secondsRemaining: number, type: 'round' | 'break'): void {
    this.io.of('/speed-dating').to(`event:${eventId}`).emit('countdown', {
      type,
      secondsRemaining,
    });
  }

  // ==================== Timer Management ====================

  private scheduleRoundEnd(eventId: string, durationSeconds: number): void {
    // Clear any existing timer
    if (this.roundTimers[eventId]?.roundTimer) {
      clearTimeout(this.roundTimers[eventId].roundTimer);
    }

    if (!this.roundTimers[eventId]) {
      this.roundTimers[eventId] = {};
    }

    // Send countdown at key intervals
    const countdownIntervals = [60, 30, 10, 5, 4, 3, 2, 1];
    for (const seconds of countdownIntervals) {
      if (seconds < durationSeconds) {
        setTimeout(() => {
          this.sendCountdown(eventId, seconds, 'round');
        }, (durationSeconds - seconds) * 1000);
      }
    }

    this.roundTimers[eventId].roundTimer = setTimeout(async () => {
      await this.broadcastRoundEnd(eventId);
    }, durationSeconds * 1000);
  }

  private scheduleNextRound(eventId: string, breakDurationSeconds: number): void {
    if (!this.roundTimers[eventId]) {
      this.roundTimers[eventId] = {};
    }

    // Send countdown at key intervals during break
    const countdownIntervals = [30, 10, 5, 4, 3, 2, 1];
    for (const seconds of countdownIntervals) {
      if (seconds < breakDurationSeconds) {
        setTimeout(() => {
          this.sendCountdown(eventId, seconds, 'break');
        }, (breakDurationSeconds - seconds) * 1000);
      }
    }

    this.roundTimers[eventId].breakTimer = setTimeout(async () => {
      // Start the next round
      await speedDatingService.startRound(eventId);
      await this.broadcastRoundStart(eventId);
    }, breakDurationSeconds * 1000);
  }

  private scheduleEventCompletion(eventId: string, delaySeconds: number): void {
    setTimeout(async () => {
      await this.broadcastEventComplete(eventId);
    }, delaySeconds * 1000);
  }

  private clearEventTimers(eventId: string): void {
    const timers = this.roundTimers[eventId];
    if (timers) {
      if (timers.roundTimer) clearTimeout(timers.roundTimer);
      if (timers.breakTimer) clearTimeout(timers.breakTimer);
      delete this.roundTimers[eventId];
    }
  }
}

export default SpeedDatingWebSocketHandler;
