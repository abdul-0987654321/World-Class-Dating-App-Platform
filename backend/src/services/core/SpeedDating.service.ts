/**
 * Speed Dating Service
 * Live video speed dating events with timed rounds
 */

import { logger } from '../../utils/logger';
import { notificationService } from './Notification.service';

// Types
export interface SpeedDatingEvent {
  id: string;
  name: string;
  description: string;
  type: EventType;
  theme?: string;
  status: EventStatus;
  scheduledAt: Date;
  checkInStartsAt: Date;
  startsAt: Date;
  endsAt?: Date;
  roundDurationSeconds: number;
  breakDurationSeconds: number;
  totalRounds: number;
  minParticipants: number;
  maxParticipants: number;
  genderRatio: { male: number; female: number };
  targetAge?: { min: number; max: number };
  entryRequirements: EntryRequirements;
  pricing: EventPricing;
  currentParticipants: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventParticipant {
  eventId: string;
  userId: string;
  gender: 'male' | 'female' | 'non-binary';
  status: ParticipantStatus;
  registeredAt: Date;
  checkedInAt?: Date;
  matchedWith: string[]; // User IDs marked as interested
  interests: Array<{
    partnerId: string;
    interested: boolean;
    markedAt: Date;
  }>;
}

export interface SpeedDatingRound {
  eventId: string;
  roundNumber: number;
  pairings: Array<{
    participant1Id: string;
    participant2Id: string;
    roomId: string;
    startedAt?: Date;
    endedAt?: Date;
  }>;
  status: 'pending' | 'active' | 'break' | 'completed';
  startsAt: Date;
  endsAt: Date;
}

export interface SpeedDatingMatch {
  eventId: string;
  user1Id: string;
  user2Id: string;
  matchedAt: Date;
  conversationStarted: boolean;
}

export interface EntryRequirements {
  minAge?: number;
  maxAge?: number;
  verifiedOnly: boolean;
  photoVerifiedOnly: boolean;
  minProfileCompletion?: number;
  premiumTiers?: string[];
}

export interface EventPricing {
  coinCost: number;
  gemCost?: number;
  freeForTiers?: string[];
}

export interface IcebreakerPrompt {
  id: string;
  text: string;
  category: 'fun' | 'deep' | 'creative' | 'casual';
}

export type EventType =
  | 'classic'      // 5-min rounds, 8-10 matches
  | 'quick'        // 3-min rounds, 12-15 matches
  | 'deep_dive'    // 8-min rounds, 5-6 matches
  | 'themed';      // Specific interest theme

export type EventStatus =
  | 'scheduled'
  | 'registration_open'
  | 'check_in'
  | 'in_progress'
  | 'matching'
  | 'completed'
  | 'cancelled';

export type ParticipantStatus =
  | 'registered'
  | 'checked_in'
  | 'in_round'
  | 'waiting'
  | 'completed'
  | 'no_show';

// Icebreaker prompts for video calls
const ICEBREAKER_PROMPTS: IcebreakerPrompt[] = [
  { id: '1', text: "What's your go-to comfort food?", category: 'casual' },
  { id: '2', text: "If you could travel anywhere tomorrow, where would you go?", category: 'fun' },
  { id: '3', text: "What's the best book you've read recently?", category: 'casual' },
  { id: '4', text: "What's your hidden talent?", category: 'fun' },
  { id: '5', text: "What does your ideal Sunday look like?", category: 'casual' },
  { id: '6', text: "If you could have dinner with anyone, dead or alive, who would it be?", category: 'deep' },
  { id: '7', text: "What's something you're passionate about that not many people know?", category: 'deep' },
  { id: '8', text: "What's the most spontaneous thing you've ever done?", category: 'fun' },
  { id: '9', text: "What's your love language?", category: 'deep' },
  { id: '10', text: "If you won the lottery, what's the first thing you'd do?", category: 'creative' },
  { id: '11', text: "What's your favorite way to spend a Friday night?", category: 'casual' },
  { id: '12', text: "What's on your bucket list?", category: 'deep' },
  { id: '13', text: "Describe your perfect first date", category: 'fun' },
  { id: '14', text: "What's your most unpopular opinion?", category: 'fun' },
  { id: '15', text: "What are you most grateful for right now?", category: 'deep' },
];

class SpeedDatingService {
  private events: Map<string, SpeedDatingEvent> = new Map();
  private participants: Map<string, EventParticipant[]> = new Map(); // eventId -> participants
  private rounds: Map<string, SpeedDatingRound[]> = new Map(); // eventId -> rounds
  private matches: Map<string, SpeedDatingMatch[]> = new Map(); // eventId -> matches
  private userEvents: Map<string, string[]> = new Map(); // userId -> eventIds

  constructor() {
    this.initializeSampleEvents();
  }

  /**
   * Get upcoming events
   */
  async getUpcomingEvents(filters?: {
    type?: EventType;
    theme?: string;
    afterDate?: Date;
    beforeDate?: Date;
  }): Promise<SpeedDatingEvent[]> {
    const now = new Date();
    let events = Array.from(this.events.values())
      .filter(e =>
        e.scheduledAt > now &&
        ['scheduled', 'registration_open'].includes(e.status)
      );

    if (filters?.type) {
      events = events.filter(e => e.type === filters.type);
    }
    if (filters?.theme) {
      events = events.filter(e => e.theme?.toLowerCase().includes(filters.theme!.toLowerCase()));
    }
    if (filters?.afterDate) {
      events = events.filter(e => e.scheduledAt >= filters.afterDate!);
    }
    if (filters?.beforeDate) {
      events = events.filter(e => e.scheduledAt <= filters.beforeDate!);
    }

    return events.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  /**
   * Get event by ID
   */
  async getEvent(eventId: string): Promise<SpeedDatingEvent | null> {
    return this.events.get(eventId) || null;
  }

  /**
   * Register for an event
   */
  async registerForEvent(
    eventId: string,
    userId: string,
    gender: 'male' | 'female' | 'non-binary',
    userTier?: string
  ): Promise<{
    success: boolean;
    participant?: EventParticipant;
    error?: string;
  }> {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    if (event.status !== 'registration_open' && event.status !== 'scheduled') {
      return { success: false, error: 'Registration is closed' };
    }

    // Check capacity
    if (event.currentParticipants >= event.maxParticipants) {
      return { success: false, error: 'Event is full' };
    }

    // Check if already registered
    const participants = this.participants.get(eventId) || [];
    if (participants.some(p => p.userId === userId)) {
      return { success: false, error: 'Already registered for this event' };
    }

    // Check gender ratio
    const maleCount = participants.filter(p => p.gender === 'male').length;
    const femaleCount = participants.filter(p => p.gender === 'female').length;
    const targetRatio = event.genderRatio;

    if (gender === 'male' && targetRatio.male > 0) {
      const maxMales = Math.ceil(event.maxParticipants * (targetRatio.male / (targetRatio.male + targetRatio.female)));
      if (maleCount >= maxMales) {
        return { success: false, error: 'Male spots are full for this event' };
      }
    } else if (gender === 'female' && targetRatio.female > 0) {
      const maxFemales = Math.ceil(event.maxParticipants * (targetRatio.female / (targetRatio.male + targetRatio.female)));
      if (femaleCount >= maxFemales) {
        return { success: false, error: 'Female spots are full for this event' };
      }
    }

    // Check if event is free for user's tier
    const isFree = event.pricing.freeForTiers?.includes(userTier || '') || false;

    // In production, would deduct coins here if not free

    const participant: EventParticipant = {
      eventId,
      userId,
      gender,
      status: 'registered',
      registeredAt: new Date(),
      matchedWith: [],
      interests: [],
    };

    participants.push(participant);
    this.participants.set(eventId, participants);

    // Update event participant count
    event.currentParticipants++;
    this.events.set(eventId, event);

    // Track user's events
    const userEventsList = this.userEvents.get(userId) || [];
    userEventsList.push(eventId);
    this.userEvents.set(userId, userEventsList);

    logger.info(`User ${userId} registered for event ${event.name}`);

    return { success: true, participant };
  }

  /**
   * Check in for an event
   */
  async checkIn(
    eventId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    const now = new Date();
    if (now < event.checkInStartsAt) {
      return { success: false, error: 'Check-in has not started yet' };
    }

    if (event.status !== 'check_in' && event.status !== 'registration_open') {
      return { success: false, error: 'Check-in is not available' };
    }

    const participants = this.participants.get(eventId) || [];
    const participant = participants.find(p => p.userId === userId);

    if (!participant) {
      return { success: false, error: 'Not registered for this event' };
    }

    if (participant.status !== 'registered') {
      return { success: false, error: 'Already checked in' };
    }

    participant.status = 'checked_in';
    participant.checkedInAt = new Date();

    logger.info(`User ${userId} checked in to event ${event.name}`);

    return { success: true };
  }

  /**
   * Start an event (admin function)
   */
  async startEvent(eventId: string): Promise<{
    success: boolean;
    rounds?: SpeedDatingRound[];
    error?: string;
  }> {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    const participants = this.participants.get(eventId) || [];
    const checkedIn = participants.filter(p => p.status === 'checked_in');

    if (checkedIn.length < event.minParticipants) {
      return { success: false, error: `Not enough participants. Need ${event.minParticipants}, have ${checkedIn.length}` };
    }

    // Generate pairings using round-robin algorithm
    const rounds = this.generateRounds(eventId, checkedIn, event.totalRounds, event.roundDurationSeconds);

    this.rounds.set(eventId, rounds);

    event.status = 'in_progress';
    event.startsAt = new Date();
    this.events.set(eventId, event);

    // Mark no-shows
    for (const participant of participants) {
      if (participant.status === 'registered') {
        participant.status = 'no_show';
      }
    }

    // Notify participants
    for (const participant of checkedIn) {
      await notificationService.sendPushNotification(
        participant.userId,
        'EVENT_REMINDER',
        {
          eventName: event.name,
          timeUntil: 'now',
        }
      );
    }

    logger.info(`Started event ${event.name} with ${checkedIn.length} participants`);

    return { success: true, rounds };
  }

  /**
   * Get current round status
   */
  async getCurrentRound(eventId: string): Promise<SpeedDatingRound | null> {
    const rounds = this.rounds.get(eventId) || [];
    return rounds.find(r => r.status === 'active') || null;
  }

  /**
   * Get user's current pairing
   */
  async getUserPairing(
    eventId: string,
    userId: string
  ): Promise<{
    partnerId: string | null;
    roomId: string | null;
    roundNumber: number;
    icebreakers: IcebreakerPrompt[];
    timeRemaining?: number;
  } | null> {
    const currentRound = await this.getCurrentRound(eventId);
    if (!currentRound) {
      return null;
    }

    const pairing = currentRound.pairings.find(
      p => p.participant1Id === userId || p.participant2Id === userId
    );

    if (!pairing) {
      return null;
    }

    const partnerId = pairing.participant1Id === userId
      ? pairing.participant2Id
      : pairing.participant1Id;

    // Get random icebreakers
    const shuffled = [...ICEBREAKER_PROMPTS].sort(() => Math.random() - 0.5);
    const icebreakers = shuffled.slice(0, 3);

    const now = new Date();
    const timeRemaining = Math.max(0, (currentRound.endsAt.getTime() - now.getTime()) / 1000);

    return {
      partnerId,
      roomId: pairing.roomId,
      roundNumber: currentRound.roundNumber,
      icebreakers,
      timeRemaining,
    };
  }

  /**
   * Mark interest in a partner
   */
  async markInterest(
    eventId: string,
    userId: string,
    partnerId: string,
    interested: boolean
  ): Promise<{ success: boolean; isMatch: boolean }> {
    const participants = this.participants.get(eventId) || [];
    const participant = participants.find(p => p.userId === userId);

    if (!participant) {
      return { success: false, isMatch: false };
    }

    // Record interest
    const existingInterest = participant.interests.find(i => i.partnerId === partnerId);
    if (existingInterest) {
      existingInterest.interested = interested;
      existingInterest.markedAt = new Date();
    } else {
      participant.interests.push({
        partnerId,
        interested,
        markedAt: new Date(),
      });
    }

    // Check for mutual match
    let isMatch = false;
    if (interested) {
      const partner = participants.find(p => p.userId === partnerId);
      const partnerInterest = partner?.interests.find(i => i.partnerId === userId);
      if (partnerInterest?.interested) {
        isMatch = true;
        participant.matchedWith.push(partnerId);
        partner!.matchedWith.push(userId);

        // Create match record
        const matches = this.matches.get(eventId) || [];
        matches.push({
          eventId,
          user1Id: userId,
          user2Id: partnerId,
          matchedAt: new Date(),
          conversationStarted: false,
        });
        this.matches.set(eventId, matches);

        logger.info(`Match created between ${userId} and ${partnerId} at event ${eventId}`);
      }
    }

    return { success: true, isMatch };
  }

  /**
   * Complete event and reveal matches
   */
  async completeEvent(eventId: string): Promise<{
    success: boolean;
    matches?: SpeedDatingMatch[];
    error?: string;
  }> {
    const event = this.events.get(eventId);
    if (!event) {
      return { success: false, error: 'Event not found' };
    }

    event.status = 'completed';
    event.endsAt = new Date();
    this.events.set(eventId, event);

    const matches = this.matches.get(eventId) || [];

    // Mark all participants as completed
    const participants = this.participants.get(eventId) || [];
    for (const participant of participants) {
      if (participant.status !== 'no_show') {
        participant.status = 'completed';
      }
    }

    // Notify all participants about their matches
    for (const participant of participants) {
      const userMatches = matches.filter(
        m => m.user1Id === participant.userId || m.user2Id === participant.userId
      );

      if (userMatches.length > 0) {
        await notificationService.sendPushNotification(
          participant.userId,
          'NEW_MATCH',
          { matchName: `${userMatches.length} people from speed dating` }
        );
      }
    }

    logger.info(`Completed event ${event.name} with ${matches.length} matches`);

    return { success: true, matches };
  }

  /**
   * Get event matches for a user
   */
  async getUserEventMatches(eventId: string, userId: string): Promise<SpeedDatingMatch[]> {
    const matches = this.matches.get(eventId) || [];
    return matches.filter(m => m.user1Id === userId || m.user2Id === userId);
  }

  /**
   * Get user's event history
   */
  async getUserEventHistory(userId: string): Promise<Array<{
    event: SpeedDatingEvent;
    participation: EventParticipant;
    matchCount: number;
  }>> {
    const eventIds = this.userEvents.get(userId) || [];
    const history = [];

    for (const eventId of eventIds) {
      const event = this.events.get(eventId);
      const participants = this.participants.get(eventId) || [];
      const participant = participants.find(p => p.userId === userId);

      if (event && participant) {
        const matches = this.matches.get(eventId) || [];
        const userMatches = matches.filter(
          m => m.user1Id === userId || m.user2Id === userId
        );

        history.push({
          event,
          participation: participant,
          matchCount: userMatches.length,
        });
      }
    }

    return history.sort((a, b) =>
      b.event.scheduledAt.getTime() - a.event.scheduledAt.getTime()
    );
  }

  /**
   * Create a new event (admin function)
   */
  async createEvent(
    eventData: Omit<SpeedDatingEvent, 'id' | 'currentParticipants' | 'createdAt' | 'updatedAt'>
  ): Promise<SpeedDatingEvent> {
    const event: SpeedDatingEvent = {
      ...eventData,
      id: `speed_event_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      currentParticipants: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.events.set(event.id, event);
    logger.info(`Created speed dating event: ${event.name}`);

    return event;
  }

  // Private methods

  private generateRounds(
    eventId: string,
    participants: EventParticipant[],
    totalRounds: number,
    roundDuration: number
  ): SpeedDatingRound[] {
    const rounds: SpeedDatingRound[] = [];

    // Separate by gender for heterosexual pairing
    const males = participants.filter(p => p.gender === 'male');
    const females = participants.filter(p => p.gender === 'female');

    // Use round-robin scheduling
    const numRounds = Math.min(totalRounds, Math.min(males.length, females.length));

    let startTime = new Date();
    const breakDuration = 60; // 1 minute break

    for (let round = 0; round < numRounds; round++) {
      const pairings = [];

      for (let i = 0; i < Math.min(males.length, females.length); i++) {
        // Round-robin rotation
        const femaleIndex = (i + round) % females.length;
        pairings.push({
          participant1Id: males[i].userId,
          participant2Id: females[femaleIndex].userId,
          roomId: `room_${eventId}_r${round + 1}_p${i + 1}`,
        });
      }

      const endTime = new Date(startTime.getTime() + roundDuration * 1000);

      rounds.push({
        eventId,
        roundNumber: round + 1,
        pairings,
        status: round === 0 ? 'active' : 'pending',
        startsAt: startTime,
        endsAt: endTime,
      });

      // Next round starts after break
      startTime = new Date(endTime.getTime() + breakDuration * 1000);
    }

    return rounds;
  }

  private initializeSampleEvents(): void {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Classic event tomorrow
    this.createEvent({
      name: 'Saturday Night Speed Dating',
      description: 'Classic speed dating experience. 5 minutes per round, 8 potential matches!',
      type: 'classic',
      status: 'registration_open',
      scheduledAt: tomorrow,
      checkInStartsAt: new Date(tomorrow.getTime() - 15 * 60 * 1000),
      startsAt: tomorrow,
      roundDurationSeconds: 300,
      breakDurationSeconds: 60,
      totalRounds: 8,
      minParticipants: 10,
      maxParticipants: 30,
      genderRatio: { male: 50, female: 50 },
      entryRequirements: {
        verifiedOnly: true,
        photoVerifiedOnly: false,
        minProfileCompletion: 70,
      },
      pricing: {
        coinCost: 300,
        freeForTiers: ['PLATINUM', 'DIAMOND'],
      },
    });

    // Quick connect next week
    this.createEvent({
      name: 'Quick Connect: Meet More People!',
      description: 'Fast-paced speed dating. 3 minutes per round, 12+ potential matches!',
      type: 'quick',
      status: 'registration_open',
      scheduledAt: nextWeek,
      checkInStartsAt: new Date(nextWeek.getTime() - 15 * 60 * 1000),
      startsAt: nextWeek,
      roundDurationSeconds: 180,
      breakDurationSeconds: 30,
      totalRounds: 12,
      minParticipants: 16,
      maxParticipants: 40,
      genderRatio: { male: 50, female: 50 },
      entryRequirements: {
        verifiedOnly: true,
        photoVerifiedOnly: false,
      },
      pricing: {
        coinCost: 200,
        freeForTiers: ['DIAMOND'],
      },
    });

    // Themed event
    this.createEvent({
      name: 'Gamers Speed Dating Night',
      description: 'Speed dating for gamers! Find your player 2.',
      type: 'themed',
      theme: 'Gaming',
      status: 'registration_open',
      scheduledAt: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      checkInStartsAt: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000 - 15 * 60 * 1000),
      startsAt: new Date(nextWeek.getTime() + 2 * 24 * 60 * 60 * 1000),
      roundDurationSeconds: 300,
      breakDurationSeconds: 60,
      totalRounds: 8,
      minParticipants: 8,
      maxParticipants: 24,
      genderRatio: { male: 50, female: 50 },
      entryRequirements: {
        verifiedOnly: false,
        photoVerifiedOnly: false,
      },
      pricing: {
        coinCost: 250,
        freeForTiers: ['PLATINUM', 'DIAMOND'],
      },
    });
  }
}

export const speedDatingService = new SpeedDatingService();
