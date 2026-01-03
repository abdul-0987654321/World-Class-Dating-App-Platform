/**
 * GroupMatch Entity
 * Represents a match between two groups
 */

import { GroupMatchStatus } from '../../types/group-matching.types';

export class GroupMatch {
  id: string;
  group1Id: string;
  group2Id: string;
  status: GroupMatchStatus;
  compatibilityScore: number;
  matchedAt: Date;
  lastActivityAt: Date;
  conversationId?: string;
  expiresAt?: Date;
  expired: boolean;
  firstMessageSent: boolean;

  constructor(data: {
    id: string;
    group1Id: string;
    group2Id: string;
    status?: GroupMatchStatus;
    compatibilityScore?: number;
    matchedAt?: Date;
    lastActivityAt?: Date;
    conversationId?: string;
    expiresAt?: Date;
    expired?: boolean;
    firstMessageSent?: boolean;
  }) {
    this.id = data.id;
    this.group1Id = data.group1Id;
    this.group2Id = data.group2Id;
    this.status = data.status || GroupMatchStatus.MATCHED;
    this.compatibilityScore = data.compatibilityScore || 0;
    this.matchedAt = data.matchedAt || new Date();
    this.lastActivityAt = data.lastActivityAt || new Date();
    this.conversationId = data.conversationId;
    this.expiresAt = data.expiresAt;
    this.expired = data.expired || false;
    this.firstMessageSent = data.firstMessageSent || false;
  }

  isActive(): boolean {
    return this.status === GroupMatchStatus.MATCHED && !this.expired;
  }

  getOtherGroupId(groupId: string): string {
    return this.group1Id === groupId ? this.group2Id : this.group1Id;
  }

  isExpired(): boolean {
    if (this.firstMessageSent || this.expired === false) {
      return false;
    }
    return this.expiresAt ? new Date() > this.expiresAt : false;
  }

  getTimeUntilExpiration(): number | null {
    if (!this.expiresAt || this.firstMessageSent || this.expired) {
      return null;
    }
    const now = new Date().getTime();
    const expiry = this.expiresAt.getTime();
    return Math.max(0, expiry - now);
  }

  static createNew(
    group1Id: string,
    group2Id: string,
    compatibilityScore: number = 0
  ): Partial<GroupMatch> {
    // Ensure consistent ordering (alphabetically) to prevent duplicates
    const [sortedGroup1, sortedGroup2] = [group1Id, group2Id].sort();

    // Set expiration to 48 hours from now (longer than individual matches)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48);

    return {
      group1Id: sortedGroup1,
      group2Id: sortedGroup2,
      status: GroupMatchStatus.MATCHED,
      compatibilityScore,
      matchedAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt,
      expired: false,
      firstMessageSent: false,
    };
  }
}
