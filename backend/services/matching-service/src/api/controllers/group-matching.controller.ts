/**
 * Group Matching Controller
 * Handles HTTP requests for group matching features
 */

import { Request, Response } from 'express';
import groupMatchingService from '../../domain/services/group-matching.service';
import { createLogger } from '@flamoral/backend-shared';
import {
  CreateGroupDto,
  UpdateGroupDto,
  InviteMemberDto,
  GroupFeedQueryDto,
  GroupSwipeDto,
  TransferAdminDto,
  ActivitySuggestionsQueryDto,
} from '../../dto/group-matching.dto';
import {
  GroupLookingFor,
  GroupFeedFilters,
} from '../../types/group-matching.types';

const logger = createLogger('group-matching-controller');

export class GroupMatchingController {
  // ==================== GROUP MANAGEMENT ====================

  /**
   * Create a new group
   * POST /api/v1/groups
   */
  async createGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const data: CreateGroupDto = req.body;

      const group = await groupMatchingService.createGroup(userId, data);

      res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: { group },
      });
    } catch (error: any) {
      logger.error('Failed to create group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Get a group by ID
   * GET /api/v1/groups/:groupId
   */
  async getGroup(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      const group = await groupMatchingService.getGroup(groupId);

      if (!group) {
        res.status(404).json({
          success: false,
          error: 'Group not found',
        });
        return;
      }

      const members = await groupMatchingService.getGroupMembers(groupId);

      res.status(200).json({
        success: true,
        data: {
          group,
          members,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Update a group
   * PATCH /api/v1/groups/:groupId
   */
  async updateGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const data: UpdateGroupDto = req.body;

      const group = await groupMatchingService.updateGroup(groupId, userId, data);

      res.status(200).json({
        success: true,
        message: 'Group updated successfully',
        data: { group },
      });
    } catch (error: any) {
      logger.error('Failed to update group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Disband a group
   * DELETE /api/v1/groups/:groupId
   */
  async disbandGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;

      await groupMatchingService.disbandGroup(groupId, userId);

      res.status(200).json({
        success: true,
        message: 'Group disbanded successfully',
      });
    } catch (error: any) {
      logger.error('Failed to disband group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Get all groups for current user
   * GET /api/v1/groups/my-groups
   */
  async getMyGroups(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const groups = await groupMatchingService.getUserGroups(userId);

      res.status(200).json({
        success: true,
        data: {
          count: groups.length,
          groups,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get user groups', error);
      this.handleError(res, error);
    }
  }

  // ==================== MEMBER MANAGEMENT ====================

  /**
   * Invite a member to the group
   * POST /api/v1/groups/:groupId/invite
   */
  async inviteMember(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const data: InviteMemberDto = req.body;

      const invitation = await groupMatchingService.inviteMember(
        groupId,
        userId,
        data.userId,
        data.message
      );

      res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        data: { invitation },
      });
    } catch (error: any) {
      logger.error('Failed to invite member', error);
      this.handleError(res, error);
    }
  }

  /**
   * Accept a group invitation
   * POST /api/v1/groups/invitations/:invitationId/accept
   */
  async acceptInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { invitationId } = req.params;

      await groupMatchingService.acceptInvitation(invitationId, userId);

      res.status(200).json({
        success: true,
        message: 'Invitation accepted successfully',
      });
    } catch (error: any) {
      logger.error('Failed to accept invitation', error);
      this.handleError(res, error);
    }
  }

  /**
   * Decline a group invitation
   * POST /api/v1/groups/invitations/:invitationId/decline
   */
  async declineInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { invitationId } = req.params;

      await groupMatchingService.declineInvitation(invitationId, userId);

      res.status(200).json({
        success: true,
        message: 'Invitation declined',
      });
    } catch (error: any) {
      logger.error('Failed to decline invitation', error);
      this.handleError(res, error);
    }
  }

  /**
   * Get pending invitations for current user
   * GET /api/v1/groups/invitations
   */
  async getPendingInvitations(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;

      const invitations = await groupMatchingService.getPendingInvitations(userId);

      res.status(200).json({
        success: true,
        data: {
          count: invitations.length,
          invitations,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get pending invitations', error);
      this.handleError(res, error);
    }
  }

  /**
   * Remove a member from the group
   * DELETE /api/v1/groups/:groupId/members/:memberId
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId, memberId } = req.params;

      await groupMatchingService.removeMember(groupId, userId, memberId);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
    } catch (error: any) {
      logger.error('Failed to remove member', error);
      this.handleError(res, error);
    }
  }

  /**
   * Leave a group
   * POST /api/v1/groups/:groupId/leave
   */
  async leaveGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;

      await groupMatchingService.leaveGroup(groupId, userId);

      res.status(200).json({
        success: true,
        message: 'Left group successfully',
      });
    } catch (error: any) {
      logger.error('Failed to leave group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Transfer admin rights
   * POST /api/v1/groups/:groupId/transfer-admin
   */
  async transferAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const { newAdminId }: TransferAdminDto = req.body;

      await groupMatchingService.transferAdmin(groupId, userId, newAdminId);

      res.status(200).json({
        success: true,
        message: 'Admin rights transferred successfully',
      });
    } catch (error: any) {
      logger.error('Failed to transfer admin', error);
      this.handleError(res, error);
    }
  }

  /**
   * Get group members
   * GET /api/v1/groups/:groupId/members
   */
  async getGroupMembers(req: Request, res: Response): Promise<void> {
    try {
      const { groupId } = req.params;

      const members = await groupMatchingService.getGroupMembers(groupId);

      res.status(200).json({
        success: true,
        data: {
          count: members.length,
          members,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get group members', error);
      this.handleError(res, error);
    }
  }

  // ==================== GROUP MATCHING ====================

  /**
   * Get group feed (groups to swipe on)
   * GET /api/v1/groups/:groupId/feed
   */
  async getGroupFeed(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const query: GroupFeedQueryDto = req.query as any;

      const filters: GroupFeedFilters = {};
      if (query.minGroupSize) filters.minGroupSize = query.minGroupSize;
      if (query.maxGroupSize) filters.maxGroupSize = query.maxGroupSize;
      if (query.maxDistance) filters.maxDistance = query.maxDistance;

      const profiles = await groupMatchingService.getGroupFeed(
        groupId,
        userId,
        filters,
        query.limit || 20,
        query.offset || 0
      );

      res.status(200).json({
        success: true,
        data: {
          count: profiles.length,
          profiles,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get group feed', error);
      this.handleError(res, error);
    }
  }

  /**
   * Like a group
   * POST /api/v1/groups/:groupId/like
   */
  async likeGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const { targetGroupId }: GroupSwipeDto = req.body;

      const result = await groupMatchingService.likeGroup(groupId, targetGroupId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to like group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Super like a group
   * POST /api/v1/groups/:groupId/super-like
   */
  async superLikeGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const { targetGroupId }: GroupSwipeDto = req.body;

      const result = await groupMatchingService.superLikeGroup(groupId, targetGroupId, userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error('Failed to super like group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Pass on a group
   * POST /api/v1/groups/:groupId/pass
   */
  async passGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;
      const { targetGroupId }: GroupSwipeDto = req.body;

      await groupMatchingService.passGroup(groupId, targetGroupId, userId);

      res.status(200).json({
        success: true,
        message: 'Passed on group',
      });
    } catch (error: any) {
      logger.error('Failed to pass on group', error);
      this.handleError(res, error);
    }
  }

  /**
   * Get group matches
   * GET /api/v1/groups/:groupId/matches
   */
  async getGroupMatches(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId } = req.params;

      const matches = await groupMatchingService.getGroupMatches(groupId, userId);

      res.status(200).json({
        success: true,
        data: {
          count: matches.length,
          matches,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get group matches', error);
      this.handleError(res, error);
    }
  }

  /**
   * Unmatch with a group
   * DELETE /api/v1/groups/:groupId/matches/:matchId
   */
  async unmatchGroup(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { groupId, matchId } = req.params;

      await groupMatchingService.unmatchGroup(groupId, matchId, userId);

      res.status(200).json({
        success: true,
        message: 'Unmatched successfully',
      });
    } catch (error: any) {
      logger.error('Failed to unmatch group', error);
      this.handleError(res, error);
    }
  }

  // ==================== ACTIVITY SUGGESTIONS ====================

  /**
   * Get activity suggestions for a match
   * GET /api/v1/groups/matches/:matchId/activities
   */
  async getActivitySuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = (req as any).user;
      const { matchId } = req.params;
      const { limit }: ActivitySuggestionsQueryDto = req.query as any;

      const suggestions = await groupMatchingService.getActivitySuggestions(
        matchId,
        userId,
        limit || 10
      );

      res.status(200).json({
        success: true,
        data: {
          count: suggestions.length,
          suggestions,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get activity suggestions', error);
      this.handleError(res, error);
    }
  }

  // ==================== ERROR HANDLING ====================

  private handleError(res: Response, error: any): void {
    const message = error.message || 'An unexpected error occurred';

    // Determine status code based on error type
    let statusCode = 500;

    if (
      message.includes('not found') ||
      message.includes('Not found')
    ) {
      statusCode = 404;
    } else if (
      message.includes('Only the') ||
      message.includes('cannot') ||
      message.includes('denied') ||
      message.includes('not for you') ||
      message.includes('not a member')
    ) {
      statusCode = 403;
    } else if (
      message.includes('already') ||
      message.includes('maximum capacity') ||
      message.includes('must be') ||
      message.includes('at least') ||
      message.includes('cannot exceed') ||
      message.includes('minimum members')
    ) {
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

export default new GroupMatchingController();
