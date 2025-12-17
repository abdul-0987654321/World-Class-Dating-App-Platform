import { BlockedUserRepository } from '../repositories/blocked-user.repository';
import { BlockedUser, validateBlockAction } from '../entities/BlockedUser.entity';

export class BlockService {
  private blockedUserRepository: BlockedUserRepository;

  constructor(blockedUserRepository?: BlockedUserRepository) {
    this.blockedUserRepository = blockedUserRepository || new BlockedUserRepository();
  }

  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    reason?: string
  ): Promise<BlockedUser> {
    // Validate the block action
    validateBlockAction(blockerId, blockedId);

    // Check if already blocked
    const existingBlock = await this.blockedUserRepository.findByBlockerAndBlocked(
      blockerId,
      blockedId
    );

    if (existingBlock) {
      throw new Error('User is already blocked');
    }

    // Create block record
    return await this.blockedUserRepository.create({
      blockerId,
      blockedId,
      reason,
    });
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const block = await this.blockedUserRepository.findByBlockerAndBlocked(
      blockerId,
      blockedId
    );

    if (!block) {
      throw new Error('Block record not found');
    }

    await this.blockedUserRepository.delete(block.id);
  }

  /**
   * Check if user A has blocked user B
   */
  async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    return await this.blockedUserRepository.isBlocked(blockerId, blockedId);
  }

  /**
   * Check if users have blocked each other (bidirectional)
   */
  async isBlockedBidirectional(userAId: string, userBId: string): Promise<boolean> {
    return await this.blockedUserRepository.isBlockedBidirectional(userAId, userBId);
  }

  /**
   * Get list of users blocked by a specific user
   */
  async getBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
    return await this.blockedUserRepository.findBlockedUsersByBlockerId(blockerId);
  }

  /**
   * Get list of users who blocked a specific user
   */
  async getBlockers(blockedId: string): Promise<BlockedUser[]> {
    return await this.blockedUserRepository.findBlockersByBlockedId(blockedId);
  }

  /**
   * Get all user IDs that should be excluded from discovery/matching
   * (includes both blocked users and users who blocked this user)
   */
  async getUsersToExcludeFromDiscovery(userId: string): Promise<string[]> {
    return await this.blockedUserRepository.getUsersToExclude(userId);
  }

  /**
   * Get block counts for a user
   */
  async getBlockCounts(userId: string): Promise<{
    blockedCount: number;
    blockedByCount: number;
  }> {
    return await this.blockedUserRepository.countBlocksByUser(userId);
  }

  /**
   * Check if user can interact with another user
   * Returns true if they can interact, false if blocked
   */
  async canInteract(userAId: string, userBId: string): Promise<{
    canInteract: boolean;
    reason?: string;
  }> {
    const isBlocked = await this.blockedUserRepository.isBlockedBidirectional(
      userAId,
      userBId
    );

    if (isBlocked) {
      // Check who blocked whom
      const aBlockedB = await this.blockedUserRepository.isBlocked(userAId, userBId);
      const bBlockedA = await this.blockedUserRepository.isBlocked(userBId, userAId);

      let reason = 'blocked';
      if (aBlockedB && bBlockedA) {
        reason = 'mutually_blocked';
      } else if (aBlockedB) {
        reason = 'you_blocked';
      } else if (bBlockedA) {
        reason = 'blocked_you';
      }

      return {
        canInteract: false,
        reason,
      };
    }

    return { canInteract: true };
  }

  /**
   * Filter a list of user IDs to remove blocked users
   */
  async filterBlockedUsers(
    userId: string,
    userIds: string[]
  ): Promise<string[]> {
    const excludedUsers = await this.getUsersToExcludeFromDiscovery(userId);
    const excludedSet = new Set(excludedUsers);

    return userIds.filter(id => !excludedSet.has(id));
  }

  /**
   * Get block statistics (for admin)
   */
  async getBlockStatistics(): Promise<{
    totalBlocks: number;
    blocksToday: number;
    topBlockedUsers: Array<{ userId: string; blockCount: number }>;
  }> {
    // This would require aggregation queries
    // Simplified implementation
    return {
      totalBlocks: 0,
      blocksToday: 0,
      topBlockedUsers: [],
    };
  }

  /**
   * Report and block in one action
   */
  async reportAndBlock(
    reporterId: string,
    reportedId: string,
    reason: string
  ): Promise<BlockedUser> {
    // This would typically also create a report
    // For now, just block
    return await this.blockUser(reporterId, reportedId, reason);
  }

  /**
   * Admin: Remove all blocks for a user (when deleting account)
   */
  async removeAllBlocksForUser(userId: string): Promise<void> {
    await this.blockedUserRepository.deleteAllBlocksByUser(userId);
  }

  /**
   * Check if a user is blocked before allowing certain actions
   */
  async requireNotBlocked(userAId: string, userBId: string): Promise<void> {
    const result = await this.canInteract(userAId, userBId);

    if (!result.canInteract) {
      throw new Error(`Cannot perform this action: ${result.reason}`);
    }
  }
}

export default new BlockService();
