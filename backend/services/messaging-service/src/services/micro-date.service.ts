/**
 * Micro-Date Scheduler Service
 * 15-minute video date booking for low-commitment first meetings
 * Reduces pressure and allows spontaneous scheduling
 */

import { v4 as uuidv4 } from 'uuid';

import { RedisClient } from '../infrastructure/cache/redis';
import { postgresClient } from '../infrastructure/database/postgres-client';
import { createLogger } from '../utils/logger';

const logger = createLogger('micro-date-service');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Types of micro-dates available
 */
export type MicroDateType =
  | 'coffee_chat'        // Casual 15-min catch-up
  | 'quick_intro'        // Fast introduction, get to know basics
  | 'interest_deep_dive' // Focus on a shared interest
  | 'compatibility_check'; // Quick compatibility assessment

/**
 * Status of a micro-date
 */
export type MicroDateStatus =
  | 'proposed'    // Initial proposal sent
  | 'accepted'    // Recipient accepted
  | 'scheduled'   // Time confirmed, ready to go
  | 'in_progress' // Video call active
  | 'completed'   // Successfully finished
  | 'cancelled'   // Cancelled by either party
  | 'no_show';    // One or both parties didn't show

/**
 * A single suggested time slot
 */
export interface SuggestedTimeSlot {
  start: Date;
  end: Date;
  isOptimal: boolean;  // True if AI suggests this time
  reason?: string;     // Why this time was suggested
}

/**
 * Micro-date proposal from one user to another
 */
export interface MicroDateProposal {
  id: string;
  proposerId: string;
  recipientId: string;
  suggestedTimes: SuggestedTimeSlot[];
  type: MicroDateType;
  message?: string;        // Optional personal message
  conversationId: string;  // Associated chat conversation
  createdAt: Date;
  expiresAt: Date;
}

/**
 * A scheduled micro-date
 */
export interface MicroDate {
  id: string;
  proposalId: string;
  participants: {
    id: string;
    name?: string;
    avatarUrl?: string;
    joinedAt?: Date;
    leftAt?: Date;
  }[];
  scheduledTime: Date;
  duration: number;         // In minutes (default 15)
  status: MicroDateStatus;
  type: MicroDateType;
  icebreaker?: MicroDateIcebreaker;
  videoChannelId?: string;  // Agora/WebRTC channel
  feedback?: MicroDateFeedback[];
  cancelledBy?: string;
  cancellationReason?: string;
  noShowUserId?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Icebreaker for micro-date
 */
export interface MicroDateIcebreaker {
  id: string;
  type: MicroDateType;
  prompt: string;
  followUpQuestions: string[];
  sharedInterestContext?: string[];
}

/**
 * Feedback after a micro-date
 */
export interface MicroDateFeedback {
  userId: string;
  rating: number;          // 1-5 stars
  wouldMeetAgain: boolean;
  highlights?: string[];   // e.g., ['great_conversation', 'funny', 'shared_interests']
  concerns?: string[];     // e.g., ['late', 'distracted', 'uncomfortable']
  privateNote?: string;    // Optional private note
  submittedAt: Date;
}

/**
 * Decline reason for analytics
 */
export interface DeclineReason {
  reason: 'busy' | 'not_interested' | 'need_more_time' | 'prefer_in_person' | 'other';
  customMessage?: string;
}

/**
 * Feature flag configuration for micro-dates
 */
export interface MicroDateFeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  userSegments?: string[];
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MICRO_DATE_DURATION_MINUTES = 15;
const PROPOSAL_EXPIRY_HOURS = 48;
const MICRO_DATE_PREFIX = 'microdate:';
const PROPOSAL_PREFIX = 'microdate:proposal:';
const MAX_PENDING_PROPOSALS = 5;
const REMINDER_MINUTES_BEFORE = [60, 15, 5]; // 1 hour, 15 min, 5 min before

/**
 * Feature flag for micro-date scheduler (0% rollout initially)
 */
export const MICRO_DATE_FEATURE_FLAG: MicroDateFeatureFlag = {
  name: 'engagement_micro_date_scheduler',
  description: 'Low-commitment 15-minute video dates with spontaneous scheduling',
  enabled: false,
  rolloutPercentage: 0,
  userSegments: ['premium', 'elite'],
  createdAt: '2026-01-19T00:00:00Z',
  updatedAt: '2026-01-19T00:00:00Z',
};

/**
 * Icebreaker templates by date type
 */
const ICEBREAKER_TEMPLATES: Record<MicroDateType, { prompts: string[]; followUps: string[] }> = {
  coffee_chat: {
    prompts: [
      "If you could have coffee with anyone in history, who would it be and why?",
      "What's the best thing that happened to you this week?",
      "If you had a free day tomorrow with no responsibilities, how would you spend it?",
      "What's a small thing that always makes your day better?",
      "What's your go-to comfort food after a long day?",
    ],
    followUps: [
      "That's interesting! What draws you to that?",
      "Have you always felt that way?",
      "What would you do differently if you could?",
    ],
  },
  quick_intro: {
    prompts: [
      "In three words, how would your best friend describe you?",
      "What's something you're passionate about that most people wouldn't guess?",
      "What made you smile today?",
      "If your life was a movie, what genre would it be?",
      "What's one thing on your bucket list you're determined to do this year?",
    ],
    followUps: [
      "Tell me more about that!",
      "How did you discover that about yourself?",
      "That sounds amazing - what's the story behind it?",
    ],
  },
  interest_deep_dive: {
    prompts: [
      "I noticed we both love {interest}! What got you into it?",
      "What's the most memorable experience you've had with {interest}?",
      "If you could master any aspect of {interest}, what would it be?",
      "How has {interest} changed your perspective on life?",
      "What would you recommend to someone just getting into {interest}?",
    ],
    followUps: [
      "Have you met others who share this passion?",
      "What's next on your journey with this?",
      "Would you ever want to turn this into something bigger?",
    ],
  },
  compatibility_check: {
    prompts: [
      "What does an ideal weekend look like for you?",
      "How do you like to show someone you care about them?",
      "What's something you're looking for in a connection?",
      "How do you handle disagreements in a relationship?",
      "What's non-negotiable for you in a partner?",
    ],
    followUps: [
      "How important is that to you on a scale of 1-10?",
      "Has your view on this changed over time?",
      "What experiences shaped that belief?",
    ],
  },
};

// ============================================================================
// MICRO-DATE SERVICE CLASS
// ============================================================================

export class MicroDateService {
  private redis: RedisClient;
  private initialized = false;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  /**
   * Ensure the service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      if (!postgresClient.isInitialized()) {
        await postgresClient.initialize();
      }
      this.initialized = true;
      logger.info('MicroDateService initialized');
    } catch (error) {
      logger.error('Failed to initialize MicroDateService:', error);
      throw error;
    }
  }

  /**
   * Check if the feature is enabled for a user
   */
  isFeatureEnabled(userId: string, userSegment?: string): boolean {
    if (!MICRO_DATE_FEATURE_FLAG.enabled) {
      return false;
    }

    // Check user segment restriction
    if (MICRO_DATE_FEATURE_FLAG.userSegments && userSegment) {
      if (!MICRO_DATE_FEATURE_FLAG.userSegments.includes(userSegment)) {
        return false;
      }
    }

    // Check rollout percentage
    if (MICRO_DATE_FEATURE_FLAG.rolloutPercentage < 100) {
      const hash = this.hashUserId(userId);
      const bucket = hash % 100;
      if (bucket >= MICRO_DATE_FEATURE_FLAG.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simple hash function for user ID bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ============================================================================
  // PROPOSAL METHODS
  // ============================================================================

  /**
   * Propose a micro-date to another user
   */
  async proposeMicroDate(
    proposerId: string,
    recipientId: string,
    suggestedTimes: Date[],
    type: MicroDateType,
    conversationId: string,
    message?: string
  ): Promise<MicroDateProposal> {
    await this.ensureInitialized();

    logger.info('Creating micro-date proposal', {
      proposerId,
      recipientId,
      type,
      suggestedTimesCount: suggestedTimes.length,
    });

    // Validate inputs
    if (proposerId === recipientId) {
      throw new Error('Cannot propose a micro-date to yourself');
    }

    if (suggestedTimes.length === 0 || suggestedTimes.length > 5) {
      throw new Error('Must provide 1-5 suggested times');
    }

    // Check for time validity (must be in future)
    const now = new Date();
    const invalidTimes = suggestedTimes.filter(t => t <= now);
    if (invalidTimes.length > 0) {
      throw new Error('All suggested times must be in the future');
    }

    // Check if user has too many pending proposals
    const pendingCount = await this.getPendingProposalCount(proposerId);
    if (pendingCount >= MAX_PENDING_PROPOSALS) {
      throw new Error(`Maximum of ${MAX_PENDING_PROPOSALS} pending proposals allowed`);
    }

    // Create proposal
    const proposalId = uuidv4();
    const expiresAt = new Date(now.getTime() + PROPOSAL_EXPIRY_HOURS * 60 * 60 * 1000);

    const timeSlots: SuggestedTimeSlot[] = suggestedTimes.map(time => ({
      start: time,
      end: new Date(time.getTime() + MICRO_DATE_DURATION_MINUTES * 60 * 1000),
      isOptimal: false,
    }));

    const proposal: MicroDateProposal = {
      id: proposalId,
      proposerId,
      recipientId,
      suggestedTimes: timeSlots,
      type,
      message,
      conversationId,
      createdAt: now,
      expiresAt,
    };

    // Store in Redis with expiry
    const key = `${PROPOSAL_PREFIX}${proposalId}`;
    await this.redis.set(key, JSON.stringify(proposal), PROPOSAL_EXPIRY_HOURS * 60 * 60);

    // Store reference for recipient
    await this.redis.set(
      `${PROPOSAL_PREFIX}recipient:${recipientId}:${proposalId}`,
      proposalId,
      PROPOSAL_EXPIRY_HOURS * 60 * 60
    );

    // Store reference for proposer
    await this.redis.set(
      `${PROPOSAL_PREFIX}proposer:${proposerId}:${proposalId}`,
      proposalId,
      PROPOSAL_EXPIRY_HOURS * 60 * 60
    );

    logger.info('Micro-date proposal created', {
      proposalId,
      proposerId,
      recipientId,
      type,
      expiresAt,
    });

    return proposal;
  }

  /**
   * Accept a micro-date proposal with selected time
   */
  async acceptProposal(
    proposalId: string,
    selectedTime: Date,
    recipientId: string
  ): Promise<MicroDate> {
    await this.ensureInitialized();

    logger.info('Accepting micro-date proposal', { proposalId, recipientId });

    // Get proposal
    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found or expired');
    }

    // Verify recipient
    if (proposal.recipientId !== recipientId) {
      throw new Error('Only the recipient can accept this proposal');
    }

    // Verify selected time is one of the suggested times
    const validTime = proposal.suggestedTimes.some(
      slot => slot.start.getTime() === selectedTime.getTime()
    );
    if (!validTime) {
      throw new Error('Selected time must be one of the suggested times');
    }

    // Verify time is still in future
    if (selectedTime <= new Date()) {
      throw new Error('Selected time must be in the future');
    }

    // Create micro-date
    const microDateId = uuidv4();
    const now = new Date();

    const microDate: MicroDate = {
      id: microDateId,
      proposalId,
      participants: [
        { id: proposal.proposerId },
        { id: proposal.recipientId },
      ],
      scheduledTime: selectedTime,
      duration: MICRO_DATE_DURATION_MINUTES,
      status: 'scheduled',
      type: proposal.type,
      createdAt: now,
      updatedAt: now,
    };

    // Generate icebreaker
    microDate.icebreaker = await this.generateIcebreaker(proposal.type);

    // Store micro-date
    const key = `${MICRO_DATE_PREFIX}${microDateId}`;
    const ttl = Math.ceil((selectedTime.getTime() - now.getTime()) / 1000) + 7200; // Until date + 2 hours
    await this.redis.set(key, JSON.stringify(microDate), ttl);

    // Store references for both participants
    for (const participant of microDate.participants) {
      await this.redis.set(
        `${MICRO_DATE_PREFIX}user:${participant.id}:${microDateId}`,
        microDateId,
        ttl
      );
    }

    // Delete proposal
    await this.deleteProposal(proposalId);

    logger.info('Micro-date scheduled', {
      microDateId,
      scheduledTime: selectedTime,
      participants: microDate.participants.map(p => p.id),
    });

    // Schedule reminders (in production, this would use a job queue)
    await this.scheduleReminders(microDate);

    return microDate;
  }

  /**
   * Decline a micro-date proposal
   */
  async declineProposal(
    proposalId: string,
    recipientId: string,
    reason?: DeclineReason
  ): Promise<void> {
    await this.ensureInitialized();

    logger.info('Declining micro-date proposal', { proposalId, recipientId, reason });

    const proposal = await this.getProposal(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found or expired');
    }

    if (proposal.recipientId !== recipientId) {
      throw new Error('Only the recipient can decline this proposal');
    }

    // Log decline for analytics (anonymized)
    logger.info('Proposal declined', {
      proposalId,
      type: proposal.type,
      reasonCategory: reason?.reason || 'unspecified',
    });

    // Delete proposal
    await this.deleteProposal(proposalId);
  }

  /**
   * Get a proposal by ID
   */
  async getProposal(proposalId: string): Promise<MicroDateProposal | null> {
    const key = `${PROPOSAL_PREFIX}${proposalId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const proposal = JSON.parse(data) as MicroDateProposal;

    // Parse dates
    proposal.createdAt = new Date(proposal.createdAt);
    proposal.expiresAt = new Date(proposal.expiresAt);
    proposal.suggestedTimes = proposal.suggestedTimes.map(slot => ({
      ...slot,
      start: new Date(slot.start),
      end: new Date(slot.end),
    }));

    return proposal;
  }

  /**
   * Delete a proposal and its references
   */
  private async deleteProposal(proposalId: string): Promise<void> {
    const proposal = await this.getProposal(proposalId);
    if (!proposal) return;

    await this.redis.del(`${PROPOSAL_PREFIX}${proposalId}`);
    await this.redis.del(`${PROPOSAL_PREFIX}recipient:${proposal.recipientId}:${proposalId}`);
    await this.redis.del(`${PROPOSAL_PREFIX}proposer:${proposal.proposerId}:${proposalId}`);
  }

  /**
   * Get count of pending proposals for a user
   */
  private async getPendingProposalCount(userId: string): Promise<number> {
    const keys = await this.redis.keys(`${PROPOSAL_PREFIX}proposer:${userId}:*`);
    return keys.length;
  }

  // ============================================================================
  // MICRO-DATE LIFECYCLE METHODS
  // ============================================================================

  /**
   * Start a micro-date video call
   */
  async startMicroDate(dateId: string, userId: string): Promise<MicroDate> {
    await this.ensureInitialized();

    logger.info('Starting micro-date', { dateId, userId });

    const microDate = await this.getMicroDate(dateId);
    if (!microDate) {
      throw new Error('Micro-date not found');
    }

    // Verify user is a participant
    const isParticipant = microDate.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new Error('User is not a participant in this micro-date');
    }

    // Check status
    if (microDate.status !== 'scheduled' && microDate.status !== 'accepted') {
      throw new Error(`Cannot start micro-date with status: ${microDate.status}`);
    }

    // Check if it's time (allow 5 minutes early)
    const now = new Date();
    const earliestStart = new Date(microDate.scheduledTime.getTime() - 5 * 60 * 1000);
    if (now < earliestStart) {
      throw new Error('Too early to start the micro-date');
    }

    // Update participant join time
    const participantIndex = microDate.participants.findIndex(p => p.id === userId);
    if (participantIndex !== -1) {
      microDate.participants[participantIndex].joinedAt = now;
    }

    // Check if both participants have joined
    const allJoined = microDate.participants.every(p => p.joinedAt);

    if (allJoined) {
      microDate.status = 'in_progress';
      microDate.startedAt = now;

      // Generate video channel ID
      microDate.videoChannelId = `microdate_${dateId}_${Date.now()}`;
    }

    microDate.updatedAt = now;

    // Update storage
    await this.saveMicroDate(microDate);

    logger.info('Participant joined micro-date', {
      dateId,
      userId,
      status: microDate.status,
      allJoined,
    });

    return microDate;
  }

  /**
   * Complete a micro-date and collect feedback
   */
  async completeMicroDate(
    dateId: string,
    userId: string,
    feedback: Omit<MicroDateFeedback, 'userId' | 'submittedAt'>
  ): Promise<MicroDate> {
    await this.ensureInitialized();

    logger.info('Completing micro-date', { dateId, userId });

    const microDate = await this.getMicroDate(dateId);
    if (!microDate) {
      throw new Error('Micro-date not found');
    }

    // Verify user is a participant
    const isParticipant = microDate.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new Error('User is not a participant in this micro-date');
    }

    const now = new Date();

    // Update participant leave time
    const participantIndex = microDate.participants.findIndex(p => p.id === userId);
    if (participantIndex !== -1 && !microDate.participants[participantIndex].leftAt) {
      microDate.participants[participantIndex].leftAt = now;
    }

    // Add feedback
    if (!microDate.feedback) {
      microDate.feedback = [];
    }

    // Remove existing feedback from this user if any
    microDate.feedback = microDate.feedback.filter(f => f.userId !== userId);

    // Add new feedback
    microDate.feedback.push({
      ...feedback,
      userId,
      submittedAt: now,
    });

    // Check if all participants have left and given feedback
    const allLeft = microDate.participants.every(p => p.leftAt);
    const allFeedback = microDate.feedback.length === microDate.participants.length;

    if (allLeft || allFeedback) {
      microDate.status = 'completed';
      microDate.completedAt = now;
    }

    microDate.updatedAt = now;

    // Update storage
    await this.saveMicroDate(microDate);

    // Store in database for long-term analytics (would be done via repository)
    logger.info('Micro-date feedback recorded', {
      dateId,
      userId,
      rating: feedback.rating,
      wouldMeetAgain: feedback.wouldMeetAgain,
      status: microDate.status,
    });

    return microDate;
  }

  /**
   * Cancel a micro-date
   */
  async cancelMicroDate(
    dateId: string,
    userId: string,
    reason?: string
  ): Promise<MicroDate> {
    await this.ensureInitialized();

    logger.info('Cancelling micro-date', { dateId, userId, reason });

    const microDate = await this.getMicroDate(dateId);
    if (!microDate) {
      throw new Error('Micro-date not found');
    }

    // Verify user is a participant
    const isParticipant = microDate.participants.some(p => p.id === userId);
    if (!isParticipant) {
      throw new Error('User is not a participant in this micro-date');
    }

    // Check if can be cancelled
    if (microDate.status === 'completed' || microDate.status === 'cancelled') {
      throw new Error(`Cannot cancel micro-date with status: ${microDate.status}`);
    }

    microDate.status = 'cancelled';
    microDate.cancelledBy = userId;
    microDate.cancellationReason = reason;
    microDate.updatedAt = new Date();

    await this.saveMicroDate(microDate);

    logger.info('Micro-date cancelled', {
      dateId,
      cancelledBy: userId,
      reason,
    });

    return microDate;
  }

  /**
   * Mark a micro-date as no-show
   */
  async markNoShow(dateId: string, noShowUserId: string): Promise<MicroDate> {
    await this.ensureInitialized();

    logger.info('Marking no-show', { dateId, noShowUserId });

    const microDate = await this.getMicroDate(dateId);
    if (!microDate) {
      throw new Error('Micro-date not found');
    }

    // Verify user is a participant
    const isParticipant = microDate.participants.some(p => p.id === noShowUserId);
    if (!isParticipant) {
      throw new Error('User is not a participant in this micro-date');
    }

    microDate.status = 'no_show';
    microDate.noShowUserId = noShowUserId;
    microDate.updatedAt = new Date();

    await this.saveMicroDate(microDate);

    logger.info('Micro-date marked as no-show', {
      dateId,
      noShowUserId,
    });

    return microDate;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get a micro-date by ID
   */
  async getMicroDate(dateId: string): Promise<MicroDate | null> {
    const key = `${MICRO_DATE_PREFIX}${dateId}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    const microDate = JSON.parse(data) as MicroDate;

    // Parse dates
    microDate.scheduledTime = new Date(microDate.scheduledTime);
    microDate.createdAt = new Date(microDate.createdAt);
    microDate.updatedAt = new Date(microDate.updatedAt);
    if (microDate.startedAt) microDate.startedAt = new Date(microDate.startedAt);
    if (microDate.completedAt) microDate.completedAt = new Date(microDate.completedAt);

    microDate.participants = microDate.participants.map(p => ({
      ...p,
      joinedAt: p.joinedAt ? new Date(p.joinedAt) : undefined,
      leftAt: p.leftAt ? new Date(p.leftAt) : undefined,
    }));

    if (microDate.feedback) {
      microDate.feedback = microDate.feedback.map(f => ({
        ...f,
        submittedAt: new Date(f.submittedAt),
      }));
    }

    return microDate;
  }

  /**
   * Get upcoming micro-dates for a user
   */
  async getUpcomingDates(userId: string, limit: number = 10): Promise<MicroDate[]> {
    await this.ensureInitialized();

    logger.info('Getting upcoming micro-dates', { userId, limit });

    const keys = await this.redis.keys(`${MICRO_DATE_PREFIX}user:${userId}:*`);
    const microDates: MicroDate[] = [];

    for (const key of keys) {
      const dateId = await this.redis.get(key);
      if (dateId) {
        const microDate = await this.getMicroDate(dateId);
        if (microDate &&
            (microDate.status === 'scheduled' || microDate.status === 'accepted') &&
            microDate.scheduledTime > new Date()) {
          microDates.push(microDate);
        }
      }
    }

    // Sort by scheduled time (nearest first)
    microDates.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    return microDates.slice(0, limit);
  }

  /**
   * Get pending proposals for a user (as recipient)
   */
  async getPendingProposals(userId: string): Promise<MicroDateProposal[]> {
    await this.ensureInitialized();

    const keys = await this.redis.keys(`${PROPOSAL_PREFIX}recipient:${userId}:*`);
    const proposals: MicroDateProposal[] = [];

    for (const key of keys) {
      const proposalId = await this.redis.get(key);
      if (proposalId) {
        const proposal = await this.getProposal(proposalId);
        if (proposal) {
          proposals.push(proposal);
        }
      }
    }

    // Sort by creation time (newest first)
    proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return proposals;
  }

  /**
   * Get sent proposals for a user (as proposer)
   */
  async getSentProposals(userId: string): Promise<MicroDateProposal[]> {
    await this.ensureInitialized();

    const keys = await this.redis.keys(`${PROPOSAL_PREFIX}proposer:${userId}:*`);
    const proposals: MicroDateProposal[] = [];

    for (const key of keys) {
      const proposalId = await this.redis.get(key);
      if (proposalId) {
        const proposal = await this.getProposal(proposalId);
        if (proposal) {
          proposals.push(proposal);
        }
      }
    }

    proposals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return proposals;
  }

  // ============================================================================
  // AI-POWERED FEATURES
  // ============================================================================

  /**
   * Suggest optimal times based on user activity patterns
   * In production, this would analyze:
   * - User's typical online hours
   * - Message response patterns
   * - Calendar availability (if connected)
   * - Timezone compatibility
   */
  async suggestOptimalTimes(
    userId1: string,
    userId2: string,
    daysAhead: number = 7
  ): Promise<SuggestedTimeSlot[]> {
    await this.ensureInitialized();

    logger.info('Suggesting optimal times', { userId1, userId2, daysAhead });

    const suggestions: SuggestedTimeSlot[] = [];
    const now = new Date();

    // For MVP, suggest reasonable times over the next few days
    // In production, this would use ML to analyze user behavior patterns
    const preferredHours = [10, 12, 14, 17, 19, 20]; // Morning, lunch, afternoon, evening

    for (let day = 0; day < Math.min(daysAhead, 7); day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setMinutes(0);
      date.setSeconds(0);
      date.setMilliseconds(0);

      for (const hour of preferredHours) {
        date.setHours(hour);

        // Skip times in the past
        if (date <= now) continue;

        const start = new Date(date);
        const end = new Date(start.getTime() + MICRO_DATE_DURATION_MINUTES * 60 * 1000);

        // Determine if this is an "optimal" time based on simple heuristics
        const isEvening = hour >= 18 && hour <= 20;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const isOptimal = isEvening || isWeekend;

        suggestions.push({
          start,
          end,
          isOptimal,
          reason: isOptimal
            ? isEvening
              ? 'Evening - typically a good time for video chats'
              : 'Weekend - more relaxed schedule'
            : undefined,
        });
      }
    }

    // Sort by optimal first, then by time
    suggestions.sort((a, b) => {
      if (a.isOptimal !== b.isOptimal) {
        return a.isOptimal ? -1 : 1;
      }
      return a.start.getTime() - b.start.getTime();
    });

    // Return top suggestions
    return suggestions.slice(0, 10);
  }

  /**
   * Generate a personalized icebreaker for the micro-date
   */
  async generateIcebreaker(
    type: MicroDateType,
    sharedInterests?: string[]
  ): Promise<MicroDateIcebreaker> {
    await this.ensureInitialized();

    logger.info('Generating icebreaker', { type, sharedInterests });

    const templates = ICEBREAKER_TEMPLATES[type];

    // Select a random prompt
    const promptIndex = Math.floor(Math.random() * templates.prompts.length);
    let prompt = templates.prompts[promptIndex];

    // For interest-deep-dive, personalize with shared interest
    if (type === 'interest_deep_dive' && sharedInterests && sharedInterests.length > 0) {
      const interest = sharedInterests[Math.floor(Math.random() * sharedInterests.length)];
      prompt = prompt.replace('{interest}', interest);
    }

    // Select random follow-up questions
    const shuffledFollowUps = [...templates.followUps].sort(() => Math.random() - 0.5);
    const followUpQuestions = shuffledFollowUps.slice(0, 2);

    const icebreaker: MicroDateIcebreaker = {
      id: uuidv4(),
      type,
      prompt,
      followUpQuestions,
      sharedInterestContext: sharedInterests,
    };

    logger.info('Icebreaker generated', {
      icebreakerId: icebreaker.id,
      type,
      promptLength: prompt.length,
    });

    return icebreaker;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Save a micro-date to storage
   */
  private async saveMicroDate(microDate: MicroDate): Promise<void> {
    const key = `${MICRO_DATE_PREFIX}${microDate.id}`;
    const ttl = Math.max(
      86400, // At least 24 hours
      Math.ceil((microDate.scheduledTime.getTime() - Date.now()) / 1000) + 86400
    );
    await this.redis.set(key, JSON.stringify(microDate), ttl);
  }

  /**
   * Schedule reminders for a micro-date
   * In production, this would use a job queue like Bull or Agenda
   */
  private async scheduleReminders(microDate: MicroDate): Promise<void> {
    logger.info('Scheduling reminders', {
      microDateId: microDate.id,
      scheduledTime: microDate.scheduledTime,
      reminderMinutes: REMINDER_MINUTES_BEFORE,
    });

    // Store reminder schedule (in production, would enqueue jobs)
    for (const minutes of REMINDER_MINUTES_BEFORE) {
      const reminderTime = new Date(
        microDate.scheduledTime.getTime() - minutes * 60 * 1000
      );

      if (reminderTime > new Date()) {
        const reminderKey = `${MICRO_DATE_PREFIX}reminder:${microDate.id}:${minutes}`;
        const ttl = Math.ceil((reminderTime.getTime() - Date.now()) / 1000);

        await this.redis.set(
          reminderKey,
          JSON.stringify({
            microDateId: microDate.id,
            reminderTime,
            minutesBefore: minutes,
            participants: microDate.participants.map(p => p.id),
          }),
          ttl
        );
      }
    }
  }

  /**
   * Get micro-date statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    totalDates: number;
    completedDates: number;
    cancelledDates: number;
    noShows: number;
    averageRating: number;
    wouldMeetAgainPercent: number;
  }> {
    await this.ensureInitialized();

    // In production, this would query from a database
    // For now, return placeholder stats
    return {
      totalDates: 0,
      completedDates: 0,
      cancelledDates: 0,
      noShows: 0,
      averageRating: 0,
      wouldMeetAgainPercent: 0,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Factory function to create MicroDateService instance
 */
export function createMicroDateService(redis: RedisClient): MicroDateService {
  return new MicroDateService(redis);
}

export default MicroDateService;
