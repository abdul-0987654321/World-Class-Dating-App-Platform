/**
 * Speed Dating Participant Entity
 * Represents a user participating in a speed dating event
 */

export enum ParticipantStatus {
  REGISTERED = 'registered',
  CHECKED_IN = 'checked_in',
  WAITING = 'waiting',
  IN_ROUND = 'in_round',
  COMPLETED = 'completed',
  LEFT = 'left',
  REMOVED = 'removed',
}

export interface MatchHistoryEntry {
  roundNumber: number;
  partnerId: string;
  interested: boolean | null; // null if not yet decided
  partnerInterested: boolean | null;
  mutual: boolean | null;
  timestamp: string;
}

export class SpeedDatingParticipant {
  id: string;
  eventId: string;
  userId: string;
  status: ParticipantStatus;
  currentRound: number;
  currentPartnerId?: string;
  matchHistory: MatchHistoryEntry[];
  joinedAt: Date;
  checkedInAt?: Date;
  completedAt?: Date;
  leftAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    eventId: string;
    userId: string;
    status?: ParticipantStatus;
    currentRound?: number;
    currentPartnerId?: string;
    matchHistory?: MatchHistoryEntry[];
    joinedAt?: Date;
    checkedInAt?: Date;
    completedAt?: Date;
    leftAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.eventId = data.eventId;
    this.userId = data.userId;
    this.status = data.status || ParticipantStatus.REGISTERED;
    this.currentRound = data.currentRound || 0;
    this.currentPartnerId = data.currentPartnerId;
    this.matchHistory = data.matchHistory || [];
    this.joinedAt = data.joinedAt || new Date();
    this.checkedInAt = data.checkedInAt;
    this.completedAt = data.completedAt;
    this.leftAt = data.leftAt;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  isActive(): boolean {
    return [
      ParticipantStatus.CHECKED_IN,
      ParticipantStatus.WAITING,
      ParticipantStatus.IN_ROUND,
    ].includes(this.status);
  }

  hasCheckedIn(): boolean {
    return this.checkedInAt !== undefined;
  }

  canParticipate(): boolean {
    return this.status !== ParticipantStatus.LEFT &&
           this.status !== ParticipantStatus.REMOVED &&
           this.status !== ParticipantStatus.COMPLETED;
  }

  getMetPartnerIds(): string[] {
    return this.matchHistory.map(entry => entry.partnerId);
  }

  hasMetPartner(partnerId: string): boolean {
    return this.matchHistory.some(entry => entry.partnerId === partnerId);
  }

  getMutualMatches(): MatchHistoryEntry[] {
    return this.matchHistory.filter(entry => entry.mutual === true);
  }

  recordInterest(roundNumber: number, partnerId: string, interested: boolean): void {
    const existingEntry = this.matchHistory.find(
      entry => entry.roundNumber === roundNumber && entry.partnerId === partnerId
    );

    if (existingEntry) {
      existingEntry.interested = interested;
      existingEntry.timestamp = new Date().toISOString();
    } else {
      this.matchHistory.push({
        roundNumber,
        partnerId,
        interested,
        partnerInterested: null,
        mutual: null,
        timestamp: new Date().toISOString(),
      });
    }
  }

  updatePartnerInterest(roundNumber: number, partnerId: string, partnerInterested: boolean): void {
    const entry = this.matchHistory.find(
      entry => entry.roundNumber === roundNumber && entry.partnerId === partnerId
    );

    if (entry) {
      entry.partnerInterested = partnerInterested;
      // Calculate mutual interest
      if (entry.interested !== null && entry.partnerInterested !== null) {
        entry.mutual = entry.interested && entry.partnerInterested;
      }
    }
  }

  static createNew(eventId: string, userId: string): Partial<SpeedDatingParticipant> {
    return {
      eventId,
      userId,
      status: ParticipantStatus.REGISTERED,
      currentRound: 0,
      matchHistory: [],
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
