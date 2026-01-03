/**
 * Speed Dating Event Entity
 * Represents a scheduled speed dating event where users can meet multiple potential matches
 */

export enum SpeedDatingEventStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface AgeRange {
  min: number;
  max: number;
}

export interface EventRequirements {
  minAge?: number;
  maxAge?: number;
  gender?: string;
  verified?: boolean;
  premium?: boolean;
}

export interface EntryFee {
  coins?: number;
  gems?: number;
  free?: boolean;
}

export class SpeedDatingEvent {
  id: string;
  name: string;
  description: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number;
  currentParticipants: number;
  roundDuration: number; // in seconds
  breakDuration: number; // in seconds
  totalRounds: number;
  currentRound: number;
  status: SpeedDatingEventStatus;
  theme?: string; // e.g., "Book Lovers", "Foodies", "Tech Enthusiasts"
  ageRange?: AgeRange;
  location: string; // virtual or city name
  requirements?: EventRequirements;
  entryFee?: EntryFee;
  coverImage?: string;
  hostId?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    name: string;
    description: string;
    startTime: Date;
    endTime: Date;
    maxParticipants: number;
    currentParticipants?: number;
    roundDuration: number;
    breakDuration: number;
    totalRounds?: number;
    currentRound?: number;
    status?: SpeedDatingEventStatus;
    theme?: string;
    ageRange?: AgeRange;
    location: string;
    requirements?: EventRequirements;
    entryFee?: EntryFee;
    coverImage?: string;
    hostId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.maxParticipants = data.maxParticipants;
    this.currentParticipants = data.currentParticipants || 0;
    this.roundDuration = data.roundDuration;
    this.breakDuration = data.breakDuration;
    this.totalRounds = data.totalRounds || 0;
    this.currentRound = data.currentRound || 0;
    this.status = data.status || SpeedDatingEventStatus.UPCOMING;
    this.theme = data.theme;
    this.ageRange = data.ageRange;
    this.location = data.location;
    this.requirements = data.requirements;
    this.entryFee = data.entryFee;
    this.coverImage = data.coverImage;
    this.hostId = data.hostId;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  isUpcoming(): boolean {
    return this.status === SpeedDatingEventStatus.UPCOMING;
  }

  isActive(): boolean {
    return this.status === SpeedDatingEventStatus.ACTIVE;
  }

  isCompleted(): boolean {
    return this.status === SpeedDatingEventStatus.COMPLETED;
  }

  isCancelled(): boolean {
    return this.status === SpeedDatingEventStatus.CANCELLED;
  }

  hasSpace(): boolean {
    return this.currentParticipants < this.maxParticipants;
  }

  isFree(): boolean {
    return this.entryFee?.free === true || (!this.entryFee?.coins && !this.entryFee?.gems);
  }

  getTimeUntilStart(): number {
    return Math.max(0, this.startTime.getTime() - Date.now());
  }

  getRoundEndTime(): Date | null {
    if (!this.isActive() || this.currentRound === 0) {
      return null;
    }
    // Calculate based on start time + (current round * round duration) + ((current round - 1) * break duration)
    const roundTime = this.currentRound * this.roundDuration * 1000;
    const breakTime = (this.currentRound - 1) * this.breakDuration * 1000;
    return new Date(this.startTime.getTime() + roundTime + breakTime);
  }

  static createNew(data: {
    name: string;
    description: string;
    startTime: Date;
    endTime: Date;
    maxParticipants: number;
    roundDuration: number;
    breakDuration: number;
    totalRounds?: number;
    theme?: string;
    ageRange?: AgeRange;
    location: string;
    requirements?: EventRequirements;
    entryFee?: EntryFee;
    coverImage?: string;
    hostId?: string;
  }): Partial<SpeedDatingEvent> {
    return {
      ...data,
      currentParticipants: 0,
      currentRound: 0,
      status: SpeedDatingEventStatus.UPCOMING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
