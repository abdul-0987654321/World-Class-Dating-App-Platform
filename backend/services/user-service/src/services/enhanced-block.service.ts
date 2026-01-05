/**
 * Enhanced Block Service
 * Provides advanced blocking features including:
 * - Block with audit logging
 * - Bulk block
 * - Block and report
 * - Auto-block for harassment
 * - Block statistics for admin
 */

import { db } from '../infrastructure/database';
import logger from '../utils/logger';

export interface BlockAuditLog {
  id: string;
  blockerId: string;
  blockedId: string;
  action: 'block' | 'unblock';
  reason?: string;
  source: 'manual' | 'auto_harassment' | 'report' | 'admin' | 'unmatch';
  context?: Record<string, any>;
  createdAt: Date;
}

export interface BulkBlockResult {
  successful: string[];
  failed: Array<{ userId: string; error: string }>;
  totalBlocked: number;
}

export interface EnhancedBlockResult {
  id: string;
  blockerId: string;
  blockedId: string;
  reason?: string;
  source: string;
  createdAt: Date;
  unmatched: boolean;
  reportId?: string;
}

class EnhancedBlockService {
  /**
   * Block a user with enhanced tracking and audit logging
   */
  async blockUserEnhanced(
    blockerId: string,
    blockedId: string,
    options: {
      reason?: string;
      source?: 'manual' | 'auto_harassment' | 'report' | 'admin' | 'unmatch';
      context?: Record<string, any>;
      autoUnmatch?: boolean;
    } = {}
  ): Promise<EnhancedBlockResult> {
    const { reason, source = 'manual', context, autoUnmatch = true } = options;

    // Validate
    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    // Check if already blocked
    const existingBlock = await db('blocked_users')
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .first();

    if (existingBlock) {
      throw new Error('User is already blocked');
    }

    // Create block record
    const [block] = await db('blocked_users')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason,
        created_at: new Date(),
      })
      .returning('*');

    // Log the block action
    await this.logBlockAction(blockerId, blockedId, 'block', reason, source, context);

    let unmatched = false;
    // Auto-unmatch if they were matched
    if (autoUnmatch) {
      unmatched = await this.unmatchUsers(blockerId, blockedId);
    }

    // Update safety score for blocked user
    await this.updateBlockedUserSafetyScore(blockedId);

    logger.info(`User ${blockerId} blocked ${blockedId}`, { source, reason });

    return {
      id: block.id,
      blockerId: block.blocker_id,
      blockedId: block.blocked_id,
      reason: block.reason,
      source,
      createdAt: block.created_at,
      unmatched,
    };
  }

  /**
   * Unblock a user with tracking
   */
  async unblockUserEnhanced(
    blockerId: string,
    blockedId: string,
    options: {
      source?: 'manual' | 'admin';
      context?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const { source = 'manual', context } = options;

    const block = await db('blocked_users')
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .first();

    if (!block) {
      throw new Error('Block record not found');
    }

    await db('blocked_users').where({ id: block.id }).del();

    // Log the unblock action
    await this.logBlockAction(blockerId, blockedId, 'unblock', undefined, source, context);

    logger.info(`User ${blockerId} unblocked ${blockedId}`, { source });
  }

  /**
   * Block and report a user in one action
   */
  async blockAndReport(
    blockerId: string,
    blockedId: string,
    reportData: {
      reportType: string;
      description?: string;
      severity?: string;
      evidenceUrls?: string[];
    }
  ): Promise<EnhancedBlockResult> {
    // Create report first
    const [report] = await db('reports')
      .insert({
        reporter_id: blockerId,
        reported_id: blockedId,
        report_type: reportData.reportType,
        description: reportData.description,
        severity: reportData.severity || 'medium',
        evidence_urls: reportData.evidenceUrls ? JSON.stringify(reportData.evidenceUrls) : null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Then block with report context
    const block = await this.blockUserEnhanced(blockerId, blockedId, {
      reason: reportData.description,
      source: 'report',
      context: { reportId: report.id, reportType: reportData.reportType },
    });

    return { ...block, reportId: report.id };
  }

  /**
   * Unmatch and block a user
   */
  async unmatchAndBlock(
    userId: string,
    matchedUserId: string,
    reason?: string
  ): Promise<EnhancedBlockResult> {
    // First unmatch explicitly
    await this.unmatchUsers(userId, matchedUserId);

    // Then block (with autoUnmatch: false since we already did it)
    return this.blockUserEnhanced(userId, matchedUserId, {
      reason,
      source: 'unmatch',
      context: { fromUnmatch: true },
      autoUnmatch: false,
    });
  }

  /**
   * Bulk block multiple users
   */
  async bulkBlock(
    blockerId: string,
    userIds: string[],
    reason: string,
    options: {
      source?: 'manual' | 'admin' | 'auto_harassment';
    } = {}
  ): Promise<BulkBlockResult> {
    const { source = 'manual' } = options;
    const result: BulkBlockResult = {
      successful: [],
      failed: [],
      totalBlocked: 0,
    };

    for (const userId of userIds) {
      try {
        await this.blockUserEnhanced(blockerId, userId, { reason, source });
        result.successful.push(userId);
        result.totalBlocked++;
      } catch (error: any) {
        result.failed.push({
          userId,
          error: error.message,
        });
      }
    }

    logger.info(`Bulk block completed`, {
      blockerId,
      successful: result.successful.length,
      failed: result.failed.length,
    });

    return result;
  }

  /**
   * Admin: Force block a user (blocks them for another user)
   */
  async adminForceBlock(
    adminId: string,
    blockerId: string,
    blockedId: string,
    reason: string
  ): Promise<EnhancedBlockResult> {
    const block = await this.blockUserEnhanced(blockerId, blockedId, {
      reason,
      source: 'admin',
      context: { adminId, adminAction: true },
    });

    // Log admin action
    await db('moderator_action_logs').insert({
      moderator_id: adminId,
      target_user_id: blockedId,
      action_type: 'block_applied',
      action_details: JSON.stringify({ blockerId, blockedId, reason }),
      created_at: new Date(),
    });

    return block;
  }

  /**
   * Auto-block based on harassment detection
   */
  async autoBlockForHarassment(
    senderId: string,
    recipientId: string,
    detectionId: string,
    riskScore: number
  ): Promise<EnhancedBlockResult | null> {
    // Only auto-block if risk score is high enough
    if (riskScore < 0.8) {
      return null;
    }

    try {
      const block = await this.blockUserEnhanced(recipientId, senderId, {
        reason: 'Automatic block due to harassment detection',
        source: 'auto_harassment',
        context: {
          detectionId,
          riskScore,
          autoBlocked: true,
        },
        autoUnmatch: true,
      });

      logger.warn(`Auto-blocked user ${senderId} for harassment (score: ${riskScore})`);

      return block;
    } catch (error: any) {
      // May already be blocked
      if (!error.message.includes('already blocked')) {
        logger.error(`Failed to auto-block user ${senderId}:`, error);
      }
      return null;
    }
  }

  /**
   * Get block statistics (for admin dashboard)
   */
  async getBlockStatistics(): Promise<{
    totalBlocks: number;
    blocksToday: number;
    blocksThisWeek: number;
    autoBlocks: number;
    topBlockedUsers: Array<{ userId: string; blockCount: number; email?: string }>;
    blocksBySource: Record<string, number>;
    recentBlocks: any[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    // Total blocks
    const [{ count: totalBlocks }] = await db('blocked_users').count('* as count');

    // Blocks today
    const [{ count: blocksToday }] = await db('blocked_users')
      .where('created_at', '>=', today)
      .count('* as count');

    // Blocks this week
    const [{ count: blocksThisWeek }] = await db('blocked_users')
      .where('created_at', '>=', weekAgo)
      .count('* as count');

    // Auto blocks from audit logs
    let autoBlocks = 0;
    try {
      const [result] = await db('block_audit_logs')
        .where('source', 'auto_harassment')
        .count('* as count');
      autoBlocks = parseInt((result?.count as string) || '0', 10);
    } catch (e) {
      // Table may not exist yet
    }

    // Top blocked users
    const topBlockedUsers = await db('blocked_users')
      .select('blocked_id as userId')
      .count('* as blockCount')
      .leftJoin('users', 'blocked_users.blocked_id', 'users.id')
      .select('users.email')
      .groupBy('blocked_id', 'users.email')
      .orderBy('blockCount', 'desc')
      .limit(10);

    // Blocks by source from audit logs
    const blocksBySource: Record<string, number> = {};
    try {
      const sourceStats = await db('block_audit_logs')
        .where('action', 'block')
        .select('source')
        .count('* as count')
        .groupBy('source');

      for (const stat of sourceStats) {
        blocksBySource[stat.source] = parseInt(stat.count as string, 10);
      }
    } catch (e) {
      // Table may not exist yet
    }

    // Recent blocks
    const recentBlocks = await db('blocked_users')
      .leftJoin('users as blocker', 'blocked_users.blocker_id', 'blocker.id')
      .leftJoin('users as blocked', 'blocked_users.blocked_id', 'blocked.id')
      .select(
        'blocked_users.*',
        'blocker.email as blocker_email',
        'blocker.first_name as blocker_name',
        'blocked.email as blocked_email',
        'blocked.first_name as blocked_name'
      )
      .orderBy('blocked_users.created_at', 'desc')
      .limit(20);

    return {
      totalBlocks: parseInt(totalBlocks as string, 10),
      blocksToday: parseInt(blocksToday as string, 10),
      blocksThisWeek: parseInt(blocksThisWeek as string, 10),
      autoBlocks,
      topBlockedUsers: topBlockedUsers.map((u) => ({
        userId: u.userId,
        blockCount: parseInt(u.blockCount as string, 10),
        email: u.email,
      })),
      blocksBySource,
      recentBlocks,
    };
  }

  /**
   * Get block audit history for a user
   */
  async getBlockAuditHistory(
    userId: string,
    options: { limit?: number; as?: 'blocker' | 'blocked' | 'both' } = {}
  ): Promise<BlockAuditLog[]> {
    const { limit = 100, as: role = 'both' } = options;

    try {
      let query = db('block_audit_logs').orderBy('created_at', 'desc').limit(limit);

      if (role === 'blocker') {
        query = query.where('blocker_id', userId);
      } else if (role === 'blocked') {
        query = query.where('blocked_id', userId);
      } else {
        query = query.where('blocker_id', userId).orWhere('blocked_id', userId);
      }

      const logs = await query;

      return logs.map((log: any) => ({
        id: log.id,
        blockerId: log.blocker_id,
        blockedId: log.blocked_id,
        action: log.action,
        reason: log.reason,
        source: log.source,
        context: typeof log.context === 'string' ? JSON.parse(log.context) : log.context,
        createdAt: log.created_at,
      }));
    } catch (e) {
      // Table may not exist yet
      return [];
    }
  }

  // Private helper methods

  /**
   * Log block/unblock action to audit table
   */
  private async logBlockAction(
    blockerId: string,
    blockedId: string,
    action: 'block' | 'unblock',
    reason?: string,
    source: string = 'manual',
    context?: Record<string, any>
  ): Promise<void> {
    try {
      await db('block_audit_logs').insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
        action,
        reason,
        source,
        context: context ? JSON.stringify(context) : null,
        created_at: new Date(),
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      logger.error('Failed to log block action:', error);
    }
  }

  /**
   * Unmatch two users if they have a match
   */
  private async unmatchUsers(userAId: string, userBId: string): Promise<boolean> {
    try {
      // Delete the match if it exists
      const deleted = await db('matches')
        .where(function () {
          this.where({ user1_id: userAId, user2_id: userBId }).orWhere({
            user1_id: userBId,
            user2_id: userAId,
          });
        })
        .del();

      if (deleted > 0) {
        // Also hide conversations
        await db('conversations')
          .where(function () {
            this.where({ user1_id: userAId, user2_id: userBId }).orWhere({
              user1_id: userBId,
              user2_id: userAId,
            });
          })
          .update({ is_hidden: true, updated_at: new Date() });

        logger.info(`Unmatched users ${userAId} and ${userBId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Failed to unmatch users:', error);
      return false;
    }
  }

  /**
   * Update safety score when a user is blocked
   */
  private async updateBlockedUserSafetyScore(blockedUserId: string): Promise<void> {
    try {
      // Get block count
      const [{ count }] = await db('blocked_users')
        .where('blocked_id', blockedUserId)
        .count('* as count');

      const blockedByCount = parseInt(count as string, 10);

      // Get or create safety score record
      const existing = await db('user_safety_scores').where('user_id', blockedUserId).first();

      const updates = {
        total_blocks_received: blockedByCount,
        block_frequency_score: Math.min(blockedByCount * 5, 100),
        is_flagged: blockedByCount >= 5,
        is_under_review: blockedByCount >= 10,
        last_calculated_at: new Date(),
        updated_at: new Date(),
      };

      if (existing) {
        await db('user_safety_scores').where('user_id', blockedUserId).update(updates);
      } else {
        await db('user_safety_scores').insert({
          user_id: blockedUserId,
          overall_safety_score: Math.max(100 - blockedByCount * 5, 0),
          harassment_risk_score: 0,
          report_frequency_score: 0,
          ...updates,
          created_at: new Date(),
        });
      }
    } catch (error) {
      logger.error('Failed to update blocked user safety score:', error);
    }
  }
}

export const enhancedBlockService = new EnhancedBlockService();
export default enhancedBlockService;
