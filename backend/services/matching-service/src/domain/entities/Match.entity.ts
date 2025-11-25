import { MatchStatus } from '../../types';

export class Match {
  id: string;
  user1Id: string;
  user2Id: string;
  status: MatchStatus;
  compatibilityScore?: number;
  matchedAt: Date;
  lastActivityAt: Date;
  unmatchedAt?: Date;

  constructor(data: {
    id: string;
    user1Id: string;
    user2Id: string;
    status: MatchStatus;
    compatibilityScore?: number;
    matchedAt: Date;
    lastActivityAt: Date;
    unmatchedAt?: Date;
  }) {
    this.id = data.id;
    this.user1Id = data.user1Id;
    this.user2Id = data.user2Id;
    this.status = data.status;
    this.compatibilityScore = data.compatibilityScore;
    this.matchedAt = data.matchedAt;
    this.lastActivityAt = data.lastActivityAt;
    this.unmatchedAt = data.unmatchedAt;
  }

  isActive(): boolean {
    return this.status === MatchStatus.MATCHED;
  }

  getOtherUserId(userId: string): string {
    return this.user1Id === userId ? this.user2Id : this.user1Id;
  }

  static createNew(user1Id: string, user2Id: string, score?: number): Partial<Match> {
    // Ensure consistent ordering (alphabetically) to prevent duplicates
    const [sortedUser1, sortedUser2] = [user1Id, user2Id].sort();

    return {
      user1Id: sortedUser1,
      user2Id: sortedUser2,
      status: MatchStatus.MATCHED,
      compatibilityScore: score,
      matchedAt: new Date(),
      lastActivityAt: new Date(),
    };
  }
}
