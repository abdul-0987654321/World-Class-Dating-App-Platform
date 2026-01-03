/**
 * Speed Dating Type Definitions
 * Types for speed dating events, WebSocket events, and API responses
 */

import { SpeedDatingEvent, SpeedDatingEventStatus } from '../domain/entities/SpeedDatingEvent.entity';
import { SpeedDatingParticipant, ParticipantStatus } from '../domain/entities/SpeedDatingParticipant.entity';
import { SpeedDatingMatch } from '../domain/entities/SpeedDatingMatch.entity';

// ==================== WebSocket Event Types ====================

/**
 * Client -> Server Events
 */
export interface ClientToServerEvents {
  join_event: (eventId: string) => void;
  leave_event: () => void;
  check_in: (eventId: string) => void;
  submit_interest: (data: { eventId: string; targetUserId: string; interested: boolean }) => void;
  round_message: (data: { eventId: string; message: string }) => void;
}

/**
 * Server -> Client Events
 */
export interface ServerToClientEvents {
  // Connection events
  error: (data: { message: string }) => void;

  // Event lifecycle
  event_joined: (data: {
    event: SpeedDatingEvent;
    participant: SpeedDatingParticipant;
    stats: EventStats;
  }) => void;
  event_started: (data: {
    event: SpeedDatingEvent;
    message: string;
    timestamp: string;
  }) => void;
  event_completed: (data: {
    event: SpeedDatingEvent;
    matchesCreated: number;
    message: string;
    timestamp: string;
  }) => void;

  // Participant events
  participant_joined: (data: {
    participantId: string;
    userId: string;
    timestamp: string;
  }) => void;
  participant_left: (data: {
    participantId: string;
    userId: string;
    timestamp: string;
  }) => void;
  participant_checked_in: (data: {
    participantId: string;
    userId: string;
    timestamp: string;
  }) => void;

  // Check-in
  checked_in: (data: {
    participant: SpeedDatingParticipant;
    message: string;
  }) => void;

  // Round events
  round_started: (data: {
    roundNumber: number;
    totalRounds: number;
    duration: number;
    startTime: string;
    endTime: string;
  }) => void;
  your_round: (data: {
    roundNumber: number;
    partnerId: string | null;
    roomId?: string;
    duration?: number;
    message?: string;
  }) => void;
  round_ended: (data: {
    roundNumber: number;
    message: string;
    breakDuration: number;
    nextRound: number | null;
  }) => void;
  round_info: (data: RoundInfo | null) => void;

  // Interest/Match events
  interest_recorded: (data: {
    success: boolean;
    mutual: boolean;
    match?: SpeedDatingMatch;
  }) => void;
  mutual_match: (data: {
    match: SpeedDatingMatch;
    partnerId: string;
  }) => void;

  // Messaging
  round_message: (data: {
    from: string;
    message: string;
    timestamp: string;
  }) => void;
  message_sent: (data: {
    message: string;
    timestamp: string;
  }) => void;

  // Stats updates
  stats_updated: (data: EventStats) => void;

  // Countdown
  countdown: (data: {
    type: 'round' | 'break';
    secondsRemaining: number;
  }) => void;

  // Final results
  your_results: (data: {
    matchCount: number;
    matches: SpeedDatingMatch[];
  }) => void;
}

// ==================== API Response Types ====================

export interface EventStats {
  totalParticipants: number;
  activeParticipants: number;
  completedRounds: number;
  totalMatches: number;
  mutualMatches: number;
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

export interface EventListResponse {
  events: SpeedDatingEvent[];
  count: number;
  total: number;
}

export interface EventResponse extends SpeedDatingEvent {
  isRegistered: boolean;
}

export interface UserEventResponse {
  events: SpeedDatingEvent[];
  count: number;
}

export interface MatchesResponse {
  matches: SpeedDatingMatch[];
  count: number;
}

export interface IcebreakersResponse {
  icebreakers: string[];
}

// ==================== Event Filters ====================

export interface EventFilters {
  status?: SpeedDatingEventStatus;
  theme?: string;
  location?: string;
  fromDate?: Date;
  toDate?: Date;
  hasSpace?: boolean;
}

// ==================== API Request Types ====================

export interface JoinEventRequest {
  eventId: string;
}

export interface LeaveEventRequest {
  eventId: string;
}

export interface CheckInRequest {
  eventId: string;
}

export interface RecordInterestRequest {
  eventId: string;
  targetUserId: string;
  interested: boolean;
}

export interface RatePartnerRequest {
  partnerId: string;
  rating: number;
  feedback?: string;
}

export interface ReportPartnerRequest {
  roundId: string;
  partnerId: string;
  reason: string;
  details?: string;
}

export interface CreateEventRequest {
  name: string;
  description: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  roundDuration: number;
  breakDuration: number;
  theme?: string;
  location?: string;
  coverImage?: string;
}
