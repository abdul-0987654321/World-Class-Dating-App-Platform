import { MatchStatus, UserMode } from '../../types';

export class Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  mode: UserMode;
  compatibilityScore?: number;
  matchedAt: Date;
  lastActivityAt: Date;
  unmatchedAt?: Date;
  firstMessageSentBy?: string;
  conversationInitiated: boolean;
  requiresWomenFirst: boolean;
  womanUserId?: string;
  expiresAt?: Date;
  extended: boolean;
  extendedAt?: Date;
  expired: boolean;
  firstMessageSent: boolean;

  constructor(data: {
    id: string;
    user1Id: string;
    user2Id: string;
    status: MatchStatus;
  mode: UserMode;
    compatibilityScore?: number;
    matchedAt: Date;
    lastActivityAt: Date;
    unmatchedAt?: Date;
    firstMessageSentBy?: string;
    conversationInitiated?: boolean;
    requiresWomenFirst?: boolean;
    womanUserId?: string;
    expiresAt?: Date;
    extended?: boolean;
    extendedAt?: Date;
    expired?: boolean;
    firstMessageSent?: boolean;
  }) {
    this.id = data.id;
    this.user1Id = data.user1Id;
    this.user2Id = data.user2Id;
    this.status = data.status;
    this.mode = data.mode;
    this.compatibilityScore = data.compatibilityScore;
    this.matchedAt = data.matchedAt;
    this.lastActivityAt = data.lastActivityAt;
    this.unmatchedAt = data.unmatchedAt;
    this.firstMessageSentBy = data.firstMessageSentBy;
    this.conversationInitiated = data.conversationInitiated || false;
    this.requiresWomenFirst = data.requiresWomenFirst || false;
    this.womanUserId = data.womanUserId;
    this.expiresAt = data.expiresAt;
    this.extended = data.extended || false;
    this.extendedAt = data.extendedAt;
    this.expired = data.expired || false;
    this.firstMessageSent = data.firstMessageSent || false;
  }

  isActive(): boolean {
    return this.status === MatchStatus.MATCHED;
  }

  getOtherUserId(userId: string): string {
    return this.user1Id === userId ? this.user2Id : this.user1Id;
  }

  static createNew(user1Id: string, user2Id: string, mode: UserMode = UserMode.DATE, score?: number): Partial<Match> {
    // Ensure consistent ordering (alphabetically) to prevent duplicates
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

    // Set expiration to 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return {
      user1Id: sortedUser1,
      user2Id: sortedUser2,
      status: MatchStatus.MATCHED,
      mode,
      compatibilityScore: score,
      matchedAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt,
      extended: false,
      expired: false,
      firstMessageSent: false,
    };
  }

  isExpired(): boolean {
    if (this.firstMessageSent || this.expired === false) {
      return false;
    }
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  canExtend(): boolean {
    return !this.extended && !this.expired && !this.firstMessageSent;
  }

  getTimeUntilExpiration(): number | null {
    if (!this.expiresAt || this.firstMessageSent || this.expired) {
      return null;
    }
    const now = new Date().getTime();
    const expiry = this.expiresAt.getTime();
    return Math.max(0, expiry - now);
  }
}
