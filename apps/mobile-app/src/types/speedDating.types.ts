/**
 * Speed Dating Types for Mobile App
 * Matches web app functionality for web-mobile parity
 */

/**
 * Speed Dating Event
 */
export interface SpeedDatingEvent {
  id: string;
  title: string;
  description: string;
  theme: string;
  date: string;
  duration: number; // in minutes
  roundDuration: number; // in minutes
  maxParticipants: number;
  currentParticipants: number;
  ageRange: {
    min: number;
    max: number;
  };
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
  isRegistered: boolean;
  price: number;
  host: SpeedDatingHost;
  imageUrl?: string;
  tags?: string[];
  requirements?: string[];
}

/**
 * Speed Dating Host
 */
export interface SpeedDatingHost {
  id?: string;
  name: string;
  photoUrl: string;
  bio?: string;
  verified?: boolean;
}

/**
 * Speed Dating Participant
 */
export interface SpeedDatingParticipant {
  id: string;
  name: string;
  age: number;
  photoUrl: string;
  bio?: string;
  occupation?: string;
  location?: string;
  interests?: string[];
  verified?: boolean;
}

/**
 * Speed Dating Match
 */
export interface SpeedDatingMatch {
  id: string;
  eventId: string;
  eventTitle?: string;
  user: {
    id: string;
    name: string;
    photoUrl: string;
    age: number;
    bio?: string;
  };
  matchedAt: string;
  isMutual: boolean;
  hasMessaged: boolean;
  lastMessageAt?: string;
}

/**
 * Speed Dating Round
 */
export interface SpeedDatingRound {
  roundNumber: number;
  partnerId: string;
  partner: SpeedDatingParticipant;
  startTime: string;
  endTime: string;
  liked?: boolean;
  notes?: string;
}

/**
 * Speed Dating Session
 */
export interface SpeedDatingSession {
  id: string;
  eventId: string;
  eventTitle: string;
  status: 'waiting' | 'countdown' | 'active' | 'break' | 'voting' | 'ended';
  currentRound: number;
  totalRounds: number;
  roundDuration: number; // in seconds
  breakDuration: number; // in seconds
  participants: SpeedDatingParticipant[];
  rounds: SpeedDatingRound[];
  likes: string[]; // participant IDs that were liked
  matches: SpeedDatingMatch[];
  startedAt?: string;
  endedAt?: string;
}

/**
 * Session Configuration
 */
export interface SpeedDatingSessionConfig {
  eventId: string;
  eventTitle: string;
  roundDuration: number; // in seconds
  breakDuration: number; // in seconds
  totalRounds: number;
  participants: SpeedDatingParticipant[];
}

/**
 * Speed Dating History Entry
 */
export interface SpeedDatingHistoryEntry {
  id: string;
  eventId: string;
  eventTitle: string;
  eventTheme: string;
  date: string;
  participantCount: number;
  roundsCompleted: number;
  matchCount: number;
  matches: SpeedDatingMatch[];
  duration: number; // in minutes
}

/**
 * Queue Status
 */
export interface SpeedDatingQueueStatus {
  position: number;
  totalInQueue: number;
  estimatedWaitTime: number; // in seconds
  isMatching: boolean;
}

/**
 * Agora Video Configuration for Speed Dating
 */
export interface SpeedDatingVideoConfig {
  appId: string;
  channel: string;
  token: string;
  uid?: number;
  enableHD?: boolean;
}

/**
 * Call Quality Stats
 */
export interface SpeedDatingCallStats {
  duration: number;
  bitrate: number;
  packetLoss: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

/**
 * API Response Types
 */
export interface SpeedDatingEventsResponse {
  events: SpeedDatingEvent[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SpeedDatingMatchesResponse {
  matches: SpeedDatingMatch[];
  total: number;
}

export interface SpeedDatingHistoryResponse {
  sessions: SpeedDatingHistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SpeedDatingRegistrationResponse {
  success: boolean;
  eventId: string;
  registrationId: string;
  message?: string;
}

export interface SpeedDatingSessionResponse {
  session: SpeedDatingSession;
  videoConfig: SpeedDatingVideoConfig;
}
