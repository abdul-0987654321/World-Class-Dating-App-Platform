/**
 * Speed Dating Match Entity
 * Represents a mutual interest connection between two participants in a speed dating event
 */

export class SpeedDatingMatch {
  id: string;
  eventId: string;
  participantAId: string;
  participantBId: string;
  userAId: string;
  userBId: string;
  roundNumber: number;
  mutualInterest: boolean;
  conversationStarted: boolean;
  regularMatchCreated: boolean;
  regularMatchId?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    id: string;
    eventId: string;
    participantAId: string;
    participantBId: string;
    userAId: string;
    userBId: string;
    roundNumber: number;
    mutualInterest?: boolean;
    conversationStarted?: boolean;
    regularMatchCreated?: boolean;
    regularMatchId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = data.id;
    this.eventId = data.eventId;
    this.participantAId = data.participantAId;
    this.participantBId = data.participantBId;
    this.userAId = data.userAId;
    this.userBId = data.userBId;
    this.roundNumber = data.roundNumber;
    this.mutualInterest = data.mutualInterest ?? false;
    this.conversationStarted = data.conversationStarted ?? false;
    this.regularMatchCreated = data.regularMatchCreated ?? false;
    this.regularMatchId = data.regularMatchId;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  isMutual(): boolean {
    return this.mutualInterest === true;
  }

  hasConversationStarted(): boolean {
    return this.conversationStarted === true;
  }

  hasRegularMatch(): boolean {
    return this.regularMatchCreated === true && !!this.regularMatchId;
  }

  getOtherUserId(userId: string): string {
    return this.userAId === userId ? this.userBId : this.userAId;
  }

  getOtherParticipantId(participantId: string): string {
    return this.participantAId === participantId ? this.participantBId : this.participantAId;
  }

  involvesUser(userId: string): boolean {
    return this.userAId === userId || this.userBId === userId;
  }

  involvesParticipant(participantId: string): boolean {
    return this.participantAId === participantId || this.participantBId === participantId;
  }

  static createNew(data: {
    eventId: string;
    participantAId: string;
    participantBId: string;
    userAId: string;
    userBId: string;
    roundNumber: number;
    mutualInterest?: boolean;
  }): Partial<SpeedDatingMatch> {
    // Sort user IDs to ensure consistent ordering (prevents duplicates)
    const [sortedUserA, sortedUserB] = [data.userAId, data.userBId].sort();
    const [sortedParticipantA, sortedParticipantB] =
      data.userAId === sortedUserA
        ? [data.participantAId, data.participantBId]
        : [data.participantBId, data.participantAId];

    return {
      eventId: data.eventId,
      participantAId: sortedParticipantA,
      participantBId: sortedParticipantB,
      userAId: sortedUserA,
      userBId: sortedUserB,
      roundNumber: data.roundNumber,
      mutualInterest: data.mutualInterest ?? false,
      conversationStarted: false,
      regularMatchCreated: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Speed Dating Interest Record
 * Tracks individual interest expressions during rounds
 */
export class SpeedDatingInterest {
  id: string;
  eventId: string;
  roundNumber: number;
  participantId: string;
  userId: string;
  targetParticipantId: string;
  targetUserId: string;
  interested: boolean;
  createdAt: Date;

  constructor(data: {
    id: string;
    eventId: string;
    roundNumber: number;
    participantId: string;
    userId: string;
    targetParticipantId: string;
    targetUserId: string;
    interested: boolean;
    createdAt?: Date;
  }) {
    this.id = data.id;
    this.eventId = data.eventId;
    this.roundNumber = data.roundNumber;
    this.participantId = data.participantId;
    this.userId = data.userId;
    this.targetParticipantId = data.targetParticipantId;
    this.targetUserId = data.targetUserId;
    this.interested = data.interested;
    this.createdAt = data.createdAt || new Date();
  }

  static createNew(data: {
    eventId: string;
    roundNumber: number;
    participantId: string;
    userId: string;
    targetParticipantId: string;
    targetUserId: string;
    interested: boolean;
  }): Partial<SpeedDatingInterest> {
    return {
      ...data,
      createdAt: new Date(),
    };
  }
}
