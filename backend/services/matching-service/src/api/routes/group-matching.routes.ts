/**
 * Group Matching Routes
 * API routes for group-to-group matching feature
 */

import { Router } from 'express';

import {
  CreateGroupDto,
  UpdateGroupDto,
  InviteMemberDto,
  GroupFeedQueryDto,
  GroupSwipeDto,
  TransferAdminDto,
  ActivitySuggestionsQueryDto,
} from '../../dto/group-matching.dto';
import groupMatchingController from '../controllers/group-matching.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody, validateQuery } from '../middleware/validation.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== GROUP MANAGEMENT ====================

/**
 * POST /api/v1/groups
 * Create a new group
 */
router.post(
  '/',
  validateBody(CreateGroupDto),
  groupMatchingController.createGroup.bind(groupMatchingController)
);

/**
 * GET /api/v1/groups/my-groups
 * Get all groups for current user
 */
router.get('/my-groups', groupMatchingController.getMyGroups.bind(groupMatchingController));

/**
 * GET /api/v1/groups/invitations
 * Get pending invitations for current user
 */
router.get(
  '/invitations',
  groupMatchingController.getPendingInvitations.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/invitations/:invitationId/accept
 * Accept a group invitation
 */
router.post(
  '/invitations/:invitationId/accept',
  groupMatchingController.acceptInvitation.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/invitations/:invitationId/decline
 * Decline a group invitation
 */
router.post(
  '/invitations/:invitationId/decline',
  groupMatchingController.declineInvitation.bind(groupMatchingController)
);

/**
 * GET /api/v1/groups/matches/:matchId/activities
 * Get activity suggestions for a group match
 */
router.get(
  '/matches/:matchId/activities',
  validateQuery(ActivitySuggestionsQueryDto),
  groupMatchingController.getActivitySuggestions.bind(groupMatchingController)
);

/**
 * GET /api/v1/groups/:groupId
 * Get a group by ID
 */
router.get('/:groupId', groupMatchingController.getGroup.bind(groupMatchingController));

/**
 * PATCH /api/v1/groups/:groupId
 * Update a group
 */
router.patch(
  '/:groupId',
  validateBody(UpdateGroupDto),
  groupMatchingController.updateGroup.bind(groupMatchingController)
);

/**
 * DELETE /api/v1/groups/:groupId
 * Disband a group
 */
router.delete('/:groupId', groupMatchingController.disbandGroup.bind(groupMatchingController));

// ==================== MEMBER MANAGEMENT ====================

/**
 * GET /api/v1/groups/:groupId/members
 * Get group members
 */
router.get(
  '/:groupId/members',
  groupMatchingController.getGroupMembers.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/:groupId/invite
 * Invite a member to the group
 */
router.post(
  '/:groupId/invite',
  validateBody(InviteMemberDto),
  groupMatchingController.inviteMember.bind(groupMatchingController)
);

/**
 * DELETE /api/v1/groups/:groupId/members/:memberId
 * Remove a member from the group
 */
router.delete(
  '/:groupId/members/:memberId',
  groupMatchingController.removeMember.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/:groupId/leave
 * Leave a group
 */
router.post('/:groupId/leave', groupMatchingController.leaveGroup.bind(groupMatchingController));

/**
 * POST /api/v1/groups/:groupId/transfer-admin
 * Transfer admin rights to another member
 */
router.post(
  '/:groupId/transfer-admin',
  validateBody(TransferAdminDto),
  groupMatchingController.transferAdmin.bind(groupMatchingController)
);

// ==================== GROUP MATCHING ====================

/**
 * GET /api/v1/groups/:groupId/feed
 * Get groups to swipe on
 */
router.get(
  '/:groupId/feed',
  validateQuery(GroupFeedQueryDto),
  groupMatchingController.getGroupFeed.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/:groupId/like
 * Like a group
 */
router.post(
  '/:groupId/like',
  validateBody(GroupSwipeDto),
  groupMatchingController.likeGroup.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/:groupId/super-like
 * Super like a group
 */
router.post(
  '/:groupId/super-like',
  validateBody(GroupSwipeDto),
  groupMatchingController.superLikeGroup.bind(groupMatchingController)
);

/**
 * POST /api/v1/groups/:groupId/pass
 * Pass on a group
 */
router.post(
  '/:groupId/pass',
  validateBody(GroupSwipeDto),
  groupMatchingController.passGroup.bind(groupMatchingController)
);

/**
 * GET /api/v1/groups/:groupId/matches
 * Get group matches
 */
router.get(
  '/:groupId/matches',
  groupMatchingController.getGroupMatches.bind(groupMatchingController)
);

/**
 * DELETE /api/v1/groups/:groupId/matches/:matchId
 * Unmatch with a group
 */
router.delete(
  '/:groupId/matches/:matchId',
  groupMatchingController.unmatchGroup.bind(groupMatchingController)
);

export default router;
