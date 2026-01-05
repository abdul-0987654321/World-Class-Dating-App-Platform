export interface BlockedUser {
  id: string;
  blockerId: string; // User who initiated the block
  blockedId: string; // User who was blocked
  reason?: string;
  createdAt: Date;
}

export interface BlockedUserCreateInput {
  blockerId: string;
  blockedId: string;
  reason?: string;
}

// Validation helper
export function validateBlockAction(blockerId: string, blockedId: string): void {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself');
  }

  if (!blockerId || !blockedId) {
    throw new Error('Both blocker and blocked user IDs are required');
  }
}

// Check if user A has blocked user B
export function isUserBlocked(
  blocks: BlockedUser[],
  blockerId: string,
  blockedId: string
): boolean {
  return blocks.some((block) => block.blockerId === blockerId && block.blockedId === blockedId);
}

// Check if users have blocked each other (bidirectional)
export function areUsersBlockedBidirectional(
  blocks: BlockedUser[],
  userAId: string,
  userBId: string
): boolean {
  return isUserBlocked(blocks, userAId, userBId) || isUserBlocked(blocks, userBId, userAId);
}

// Get all users blocked by a specific user
export function getBlockedUserIds(blocks: BlockedUser[], blockerId: string): string[] {
  return blocks.filter((block) => block.blockerId === blockerId).map((block) => block.blockedId);
}

// Get all users who have blocked a specific user
export function getBlockerUserIds(blocks: BlockedUser[], blockedId: string): string[] {
  return blocks.filter((block) => block.blockedId === blockedId).map((block) => block.blockerId);
}

// Get all user IDs to exclude from discovery (blocked + blockers)
export function getUsersToExclude(blocks: BlockedUser[], userId: string): string[] {
  const blocked = getBlockedUserIds(blocks, userId);
  const blockers = getBlockerUserIds(blocks, userId);
  return [...new Set([...blocked, ...blockers])]; // Remove duplicates
}
