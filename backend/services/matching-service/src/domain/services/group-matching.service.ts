/**
 * Group Matching Service
 * Handles group creation, management, and group-to-group matching
 */

import groupRepository, { GroupRepository } from '../repositories/group.repository';
import { Group } from '../entities/Group.entity';
import { GroupMember } from '../entities/GroupMember.entity';
import { GroupMatch } from '../entities/GroupMatch.entity';
import {
  GroupStatus,
  GroupMemberRole,
  GroupMemberStatus,
  GroupMatchStatus,
  GroupSwipeAction,
  GroupPreferences,
  GroupProfile,
  GroupMemberProfile,
  GroupActivitySuggestion,
  CreateGroupDto,
  UpdateGroupDto,
  GroupFeedFilters,
  GroupMatchResult,
  GroupInvitation,
  GroupLookingFor,
} from '../../types/group-matching.types';
import { createLogger } from '@flamoral/backend-shared';
import notificationServiceClient from '../../infrastructure/clients/notification-service.client';
import userServiceClient from '../../infrastructure/clients/user-service.client';

const logger = createLogger('group-matching-service');

export class GroupMatchingService {
  private repository: GroupRepository;

  constructor(repository: GroupRepository = groupRepository) {
    this.repository = repository;
  }

  // ==================== GROUP MANAGEMENT ====================

  /**
   * Create a new group
   */
  async createGroup(adminId: string, data: CreateGroupDto): Promise<Group> {
    try {
      logger.info(`Creating group for admin ${adminId}`);

      // Validate group data
      this.validateGroupData(data);

      // Create the group
      const groupData = Group.createNew(adminId, {
        name: data.name,
        bio: data.bio,
        photos: data.photos || [],
        preferences: this.buildPreferences(data.preferences),
        minMembers: data.minMembers,
        maxMembers: data.maxMembers,
        location: data.location,
      });

      const group = await this.repository.createGroup(groupData);

      // Add admin as the first member
      const adminMemberData = GroupMember.createAdmin(group.id, adminId);
      await this.repository.addMember(adminMemberData);

      logger.info(`Group ${group.id} created successfully`);
      return group;
    } catch (error) {
      logger.error('Failed to create group', error);
      throw error;
    }
  }

  /**
   * Update a group
   */
  async updateGroup(groupId: string, userId: string, data: UpdateGroupDto): Promise<Group> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isAdmin(userId)) {
        throw new Error('Only the group admin can update the group');
      }

      const updateData: Partial<Group> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.photos !== undefined) updateData.photos = data.photos;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.preferences !== undefined) {
        updateData.preferences = { ...group.preferences, ...data.preferences };
      }

      const updated = await this.repository.updateGroup(groupId, updateData);

      if (!updated) {
        throw new Error('Failed to update group');
      }

      logger.info(`Group ${groupId} updated by ${userId}`);
      return updated;
    } catch (error) {
      logger.error('Failed to update group', error);
      throw error;
    }
  }

  /**
   * Get a group by ID
   */
  async getGroup(groupId: string): Promise<Group | null> {
    return this.repository.findGroupById(groupId);
  }

  /**
   * Get all groups for a user
   */
  async getUserGroups(userId: string): Promise<Group[]> {
    return this.repository.findGroupsByUserId(userId);
  }

  /**
   * Disband a group
   */
  async disbandGroup(groupId: string, userId: string): Promise<void> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isAdmin(userId)) {
        throw new Error('Only the group admin can disband the group');
      }

      await this.repository.deleteGroup(groupId);

      // Notify all members
      const members = await this.repository.findGroupMembers(groupId, GroupMemberStatus.ACTIVE);
      await Promise.allSettled(
        members.map((member) =>
          notificationServiceClient.sendNotification({
            userId: member.userId,
            type: 'new_match',
            title: 'Group Disbanded',
            body: `The group "${group.name}" has been disbanded by the admin.`,
            data: { groupId },
            channel: 'push',
          })
        )
      );

      logger.info(`Group ${groupId} disbanded by ${userId}`);
    } catch (error) {
      logger.error('Failed to disband group', error);
      throw error;
    }
  }

  // ==================== MEMBER MANAGEMENT ====================

  /**
   * Invite a member to the group
   */
  async inviteMember(
    groupId: string,
    inviterId: string,
    targetUserId: string,
    message?: string
  ): Promise<GroupInvitation> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isAdmin(inviterId)) {
        throw new Error('Only the group admin can invite members');
      }

      if (!group.canAddMember()) {
        throw new Error('Group is at maximum capacity');
      }

      // Check if user is already a member or has pending invitation
      const existingMember = await this.repository.findMemberByGroupAndUser(groupId, targetUserId);

      if (existingMember) {
        if (existingMember.isActive()) {
          throw new Error('User is already a member of this group');
        }
        if (existingMember.isPending()) {
          throw new Error('User already has a pending invitation');
        }
      }

      // Create the invitation
      const memberData = GroupMember.createPendingMember(groupId, targetUserId, inviterId);
      const member = await this.repository.addMember(memberData);

      // Send notification to invited user
      await notificationServiceClient.sendNotification({
        userId: targetUserId,
        type: 'new_match',
        title: 'Group Invitation',
        body: `You've been invited to join "${group.name}"${message ? `: ${message}` : ''}`,
        data: {
          groupId,
          invitationId: member.id,
          action: 'view_group_invitation',
        },
        channel: 'push',
      });

      logger.info(`User ${targetUserId} invited to group ${groupId} by ${inviterId}`);

      return {
        id: member.id,
        groupId,
        userId: targetUserId,
        invitedBy: inviterId,
        status: GroupMemberStatus.PENDING,
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: member.invitedAt,
      };
    } catch (error) {
      logger.error('Failed to invite member', error);
      throw error;
    }
  }

  /**
   * Accept a group invitation
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      const member = await this.repository.findMemberById(invitationId);

      if (!member) {
        throw new Error('Invitation not found');
      }

      if (member.userId !== userId) {
        throw new Error('This invitation is not for you');
      }

      if (!member.isPending()) {
        throw new Error('Invitation has already been responded to');
      }

      const group = await this.repository.findGroupById(member.groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.canAddMember()) {
        throw new Error('Group is at maximum capacity');
      }

      // Accept the invitation
      await this.repository.updateMemberStatus(invitationId, GroupMemberStatus.ACTIVE, new Date());
      await this.repository.incrementMemberCount(member.groupId);

      // Update combined interests
      await this.updateCombinedInterests(member.groupId);

      // Notify group admin
      await notificationServiceClient.sendNotification({
        userId: group.adminId,
        type: 'new_match',
        title: 'New Group Member',
        body: 'A new member has joined your group!',
        data: {
          groupId: member.groupId,
          newMemberId: userId,
        },
        channel: 'push',
      });

      logger.info(`User ${userId} accepted invitation to group ${member.groupId}`);
    } catch (error) {
      logger.error('Failed to accept invitation', error);
      throw error;
    }
  }

  /**
   * Decline a group invitation
   */
  async declineInvitation(invitationId: string, userId: string): Promise<void> {
    try {
      const member = await this.repository.findMemberById(invitationId);

      if (!member) {
        throw new Error('Invitation not found');
      }

      if (member.userId !== userId) {
        throw new Error('This invitation is not for you');
      }

      if (!member.isPending()) {
        throw new Error('Invitation has already been responded to');
      }

      await this.repository.updateMemberStatus(invitationId, GroupMemberStatus.DECLINED);

      logger.info(`User ${userId} declined invitation to group ${member.groupId}`);
    } catch (error) {
      logger.error('Failed to decline invitation', error);
      throw error;
    }
  }

  /**
   * Remove a member from the group
   */
  async removeMember(groupId: string, adminId: string, targetUserId: string): Promise<void> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isAdmin(adminId)) {
        throw new Error('Only the group admin can remove members');
      }

      if (targetUserId === adminId) {
        throw new Error('Admin cannot remove themselves. Transfer admin rights first or disband the group.');
      }

      const member = await this.repository.findMemberByGroupAndUser(groupId, targetUserId);

      if (!member || !member.isActive()) {
        throw new Error('Member not found in group');
      }

      await this.repository.removeMember(groupId, targetUserId);
      await this.repository.decrementMemberCount(groupId);

      // Update combined interests
      await this.updateCombinedInterests(groupId);

      // Notify the removed member
      await notificationServiceClient.sendNotification({
        userId: targetUserId,
        type: 'new_match',
        title: 'Removed from Group',
        body: `You have been removed from "${group.name}"`,
        data: { groupId },
        channel: 'push',
      });

      logger.info(`User ${targetUserId} removed from group ${groupId} by ${adminId}`);
    } catch (error) {
      logger.error('Failed to remove member', error);
      throw error;
    }
  }

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (group.isAdmin(userId)) {
        throw new Error('Admin cannot leave the group. Transfer admin rights first or disband the group.');
      }

      const member = await this.repository.findMemberByGroupAndUser(groupId, userId);

      if (!member || !member.isActive()) {
        throw new Error('You are not a member of this group');
      }

      await this.repository.updateMemberStatus(member.id, GroupMemberStatus.LEFT);
      await this.repository.decrementMemberCount(groupId);

      // Update combined interests
      await this.updateCombinedInterests(groupId);

      logger.info(`User ${userId} left group ${groupId}`);
    } catch (error) {
      logger.error('Failed to leave group', error);
      throw error;
    }
  }

  /**
   * Transfer admin rights to another member
   */
  async transferAdmin(groupId: string, currentAdminId: string, newAdminId: string): Promise<void> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isAdmin(currentAdminId)) {
        throw new Error('Only the current admin can transfer admin rights');
      }

      const newAdminMember = await this.repository.findMemberByGroupAndUser(groupId, newAdminId);

      if (!newAdminMember || !newAdminMember.isActive()) {
        throw new Error('New admin must be an active member of the group');
      }

      await this.repository.transferAdmin(groupId, newAdminId);

      // Notify the new admin
      await notificationServiceClient.sendNotification({
        userId: newAdminId,
        type: 'new_match',
        title: 'You Are Now Group Admin',
        body: `You are now the admin of "${group.name}"`,
        data: { groupId },
        channel: 'push',
      });

      logger.info(`Admin rights transferred from ${currentAdminId} to ${newAdminId} for group ${groupId}`);
    } catch (error) {
      logger.error('Failed to transfer admin rights', error);
      throw error;
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    return this.repository.findGroupMembers(groupId, GroupMemberStatus.ACTIVE);
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<GroupInvitation[]> {
    const members = await this.repository.findPendingInvitations(userId);

    return Promise.all(
      members.map(async (member) => {
        const group = await this.repository.findGroupById(member.groupId);
        return {
          id: member.id,
          groupId: member.groupId,
          userId: member.userId,
          invitedBy: member.invitedBy,
          status: member.status,
          expiresAt: new Date(member.invitedAt.getTime() + 7 * 24 * 60 * 60 * 1000),
          createdAt: member.invitedAt,
          groupName: group?.name,
        };
      })
    );
  }

  // ==================== GROUP MATCHING ====================

  /**
   * Get groups for swiping (group feed)
   */
  async getGroupFeed(
    groupId: string,
    userId: string,
    filters?: GroupFeedFilters,
    limit: number = 20,
    offset: number = 0
  ): Promise<GroupProfile[]> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      // Verify user is a member
      const member = await this.repository.findMemberByGroupAndUser(groupId, userId);
      if (!member || !member.isActive()) {
        throw new Error('You are not a member of this group');
      }

      // Build preferences from filters and group preferences
      const preferences: GroupPreferences = {
        ...group.preferences,
        ...filters,
      };

      const groups = await this.repository.findGroupsForFeed(groupId, preferences, limit, offset);

      // Build profiles with member info and compatibility
      const profiles = await Promise.all(
        groups.map(async (targetGroup) => this.buildGroupProfile(group, targetGroup))
      );

      // Sort by compatibility score
      profiles.sort((a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0));

      return profiles;
    } catch (error) {
      logger.error('Failed to get group feed', error);
      throw error;
    }
  }

  /**
   * Like a group (swipe right)
   */
  async likeGroup(
    groupId: string,
    targetGroupId: string,
    userId: string
  ): Promise<GroupMatchResult> {
    return this.swipeGroup(groupId, targetGroupId, userId, GroupSwipeAction.LIKE);
  }

  /**
   * Super like a group
   */
  async superLikeGroup(
    groupId: string,
    targetGroupId: string,
    userId: string
  ): Promise<GroupMatchResult> {
    return this.swipeGroup(groupId, targetGroupId, userId, GroupSwipeAction.SUPER_LIKE);
  }

  /**
   * Pass on a group (swipe left)
   */
  async passGroup(groupId: string, targetGroupId: string, userId: string): Promise<void> {
    try {
      await this.validateSwipeAction(groupId, targetGroupId, userId);

      await this.repository.createSwipe({
        groupId,
        targetGroupId,
        action: GroupSwipeAction.PASS,
        swipedByUserId: userId,
      });

      logger.info(`Group ${groupId} passed on group ${targetGroupId}`);
    } catch (error) {
      logger.error('Failed to pass on group', error);
      throw error;
    }
  }

  /**
   * Get group matches
   */
  async getGroupMatches(groupId: string, userId: string): Promise<GroupMatch[]> {
    try {
      // Verify user is a member
      const member = await this.repository.findMemberByGroupAndUser(groupId, userId);
      if (!member || !member.isActive()) {
        throw new Error('You are not a member of this group');
      }

      return this.repository.findMatchesByGroupId(groupId, GroupMatchStatus.MATCHED);
    } catch (error) {
      logger.error('Failed to get group matches', error);
      throw error;
    }
  }

  /**
   * Unmatch with a group
   */
  async unmatchGroup(groupId: string, matchId: string, userId: string): Promise<void> {
    try {
      const group = await this.repository.findGroupById(groupId);

      if (!group) {
        throw new Error('Group not found');
      }

      if (!group.isAdmin(userId)) {
        throw new Error('Only the group admin can unmatch');
      }

      const match = await this.repository.findMatchById(matchId);

      if (!match) {
        throw new Error('Match not found');
      }

      if (match.group1Id !== groupId && match.group2Id !== groupId) {
        throw new Error('This match does not belong to your group');
      }

      await this.repository.updateMatchStatus(matchId, GroupMatchStatus.UNMATCHED);

      logger.info(`Group ${groupId} unmatched with match ${matchId}`);
    } catch (error) {
      logger.error('Failed to unmatch group', error);
      throw error;
    }
  }

  // ==================== ACTIVITY SUGGESTIONS ====================

  /**
   * Get activity suggestions for matched groups
   */
  async getActivitySuggestions(
    groupMatchId: string,
    userId: string,
    limit: number = 10
  ): Promise<GroupActivitySuggestion[]> {
    try {
      const match = await this.repository.findMatchById(groupMatchId);

      if (!match) {
        throw new Error('Match not found');
      }

      // Verify user is a member of one of the groups
      const member1 = await this.repository.findMemberByGroupAndUser(match.group1Id, userId);
      const member2 = await this.repository.findMemberByGroupAndUser(match.group2Id, userId);

      if ((!member1 || !member1.isActive()) && (!member2 || !member2.isActive())) {
        throw new Error('You are not a member of either matched group');
      }

      // Get combined group size
      const group1 = await this.repository.findGroupById(match.group1Id);
      const group2 = await this.repository.findGroupById(match.group2Id);

      if (!group1 || !group2) {
        throw new Error('Groups not found');
      }

      const combinedSize = group1.memberCount + group2.memberCount;

      // Get common interests for tag filtering
      const commonTags = this.findCommonInterests(
        group1.combinedInterests,
        group2.combinedInterests
      );

      return this.repository.findActivitySuggestions(combinedSize, commonTags, limit);
    } catch (error) {
      logger.error('Failed to get activity suggestions', error);
      throw error;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async swipeGroup(
    groupId: string,
    targetGroupId: string,
    userId: string,
    action: GroupSwipeAction
  ): Promise<GroupMatchResult> {
    try {
      await this.validateSwipeAction(groupId, targetGroupId, userId);

      // Record the swipe
      await this.repository.createSwipe({
        groupId,
        targetGroupId,
        action,
        swipedByUserId: userId,
      });

      // Check for mutual like
      const isMutualLike = await this.repository.checkMutualLike(groupId, targetGroupId);

      if (isMutualLike) {
        // Create the match
        const group = await this.repository.findGroupById(groupId);
        const targetGroup = await this.repository.findGroupById(targetGroupId);

        if (!group || !targetGroup) {
          throw new Error('Groups not found');
        }

        const compatibilityScore = this.calculateCompatibility(group, targetGroup);

        const matchData = GroupMatch.createNew(groupId, targetGroupId, compatibilityScore);
        const match = await this.repository.createMatch(matchData);

        // Notify both groups
        await this.notifyGroupMatch(group, targetGroup, match);

        logger.info(`Group match created between ${groupId} and ${targetGroupId}`);

        return {
          matched: true,
          match,
          message: "It's a group match!",
        };
      }

      return {
        matched: false,
        message: action === GroupSwipeAction.SUPER_LIKE ? 'Super like sent!' : 'Like sent!',
      };
    } catch (error) {
      logger.error('Failed to process group swipe', error);
      throw error;
    }
  }

  private async validateSwipeAction(
    groupId: string,
    targetGroupId: string,
    userId: string
  ): Promise<void> {
    const group = await this.repository.findGroupById(groupId);

    if (!group) {
      throw new Error('Group not found');
    }

    if (!group.isAdmin(userId)) {
      throw new Error('Only the group admin can swipe on other groups');
    }

    if (!group.hasMinimumMembers()) {
      throw new Error('Group needs minimum members before matching');
    }

    const targetGroup = await this.repository.findGroupById(targetGroupId);

    if (!targetGroup) {
      throw new Error('Target group not found');
    }

    if (!targetGroup.isActive()) {
      throw new Error('Target group is not active');
    }

    // Check if already swiped
    const existingSwipe = await this.repository.findSwipe(groupId, targetGroupId);
    if (existingSwipe) {
      throw new Error('Already swiped on this group');
    }

    // Check if already matched
    const existingMatch = await this.repository.findMatchByGroups(groupId, targetGroupId);
    if (existingMatch && existingMatch.status === GroupMatchStatus.MATCHED) {
      throw new Error('Already matched with this group');
    }
  }

  private async buildGroupProfile(sourceGroup: Group, targetGroup: Group): Promise<GroupProfile> {
    const members = await this.repository.findGroupMembers(targetGroup.id, GroupMemberStatus.ACTIVE);

    // Get member profiles from user service (simplified for now)
    const memberProfiles: GroupMemberProfile[] = await Promise.all(
      members.map(async (member) => {
        try {
          const profile = await userServiceClient.getUserProfile(member.userId);
          return {
            userId: member.userId,
            firstName: profile?.first_name || 'Member',
            age: profile?.age || 0,
            photos: profile?.photos || [],
            interests: profile?.interests || [],
            bio: profile?.bio,
          };
        } catch {
          return {
            userId: member.userId,
            firstName: 'Member',
            age: 0,
            photos: [],
            interests: [],
          };
        }
      })
    );

    const commonInterests = this.findCommonInterests(
      sourceGroup.combinedInterests,
      targetGroup.combinedInterests
    );

    const distance = this.calculateDistance(sourceGroup.location, targetGroup.location);
    const compatibilityScore = this.calculateCompatibility(sourceGroup, targetGroup);

    return {
      group: targetGroup,
      members: memberProfiles,
      compatibilityScore,
      commonInterests,
      distance,
    };
  }

  private calculateCompatibility(group1: Group, group2: Group): number {
    let score = 0;
    let factors = 0;

    // Interest overlap (40% weight)
    const commonInterests = this.findCommonInterests(
      group1.combinedInterests,
      group2.combinedInterests
    );
    const interestScore = Math.min(commonInterests.length * 10, 40);
    score += interestScore;
    factors++;

    // Group size compatibility (20% weight)
    const sizeDiff = Math.abs(group1.memberCount - group2.memberCount);
    const sizeScore = Math.max(0, 20 - sizeDiff * 5);
    score += sizeScore;
    factors++;

    // Looking for compatibility (20% weight)
    const lookingForOverlap = this.findLookingForOverlap(
      group1.preferences.lookingFor,
      group2.preferences.lookingFor
    );
    const lookingForScore = lookingForOverlap.length > 0 ? 20 : 0;
    score += lookingForScore;
    factors++;

    // Activity preference overlap (20% weight)
    const activityOverlap = this.findCommonInterests(
      group1.preferences.activityPreferences || [],
      group2.preferences.activityPreferences || []
    );
    const activityScore = Math.min(activityOverlap.length * 5, 20);
    score += activityScore;
    factors++;

    return Math.round(score);
  }

  private findCommonInterests(interests1: string[], interests2: string[]): string[] {
    const set1 = new Set(interests1.map((i) => i.toLowerCase()));
    return interests2.filter((i) => set1.has(i.toLowerCase()));
  }

  private findLookingForOverlap(
    lookingFor1: GroupLookingFor[],
    lookingFor2: GroupLookingFor[]
  ): GroupLookingFor[] {
    const set1 = new Set(lookingFor1);
    return lookingFor2.filter((l) => set1.has(l));
  }

  private calculateDistance(
    loc1?: { latitude: number; longitude: number },
    loc2?: { latitude: number; longitude: number }
  ): number | undefined {
    if (!loc1 || !loc2) return undefined;

    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(loc2.latitude - loc1.latitude);
    const dLon = this.toRad(loc2.longitude - loc1.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(loc1.latitude)) *
        Math.cos(this.toRad(loc2.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private async updateCombinedInterests(groupId: string): Promise<void> {
    try {
      const members = await this.repository.findGroupMembers(groupId, GroupMemberStatus.ACTIVE);

      const allInterests: string[] = [];

      for (const member of members) {
        try {
          const profile = await userServiceClient.getUserProfile(member.userId);
          if (profile?.interests) {
            allInterests.push(...profile.interests);
          }
        } catch {
          // Continue if user profile fetch fails
        }
      }

      // Count interest frequency and get top interests
      const interestCounts = new Map<string, number>();
      for (const interest of allInterests) {
        const lower = interest.toLowerCase();
        interestCounts.set(lower, (interestCounts.get(lower) || 0) + 1);
      }

      // Sort by frequency and take top 10
      const sortedInterests = Array.from(interestCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([interest]) => interest);

      await this.repository.updateGroup(groupId, { combinedInterests: sortedInterests });
    } catch (error) {
      logger.error('Failed to update combined interests', error);
      // Non-critical error, don't throw
    }
  }

  private async notifyGroupMatch(group1: Group, group2: Group, match: GroupMatch): Promise<void> {
    try {
      const members1 = await this.repository.findGroupMembers(group1.id, GroupMemberStatus.ACTIVE);
      const members2 = await this.repository.findGroupMembers(group2.id, GroupMemberStatus.ACTIVE);

      // Notify all members of both groups
      const notifications = [
        ...members1.map((member) =>
          notificationServiceClient.sendNotification({
            userId: member.userId,
            type: 'new_match',
            title: "It's a Group Match!",
            body: `Your group "${group1.name}" matched with "${group2.name}"!`,
            data: {
              matchId: match.id,
              otherGroupId: group2.id,
              action: 'view_group_match',
            },
            channel: 'push',
          })
        ),
        ...members2.map((member) =>
          notificationServiceClient.sendNotification({
            userId: member.userId,
            type: 'new_match',
            title: "It's a Group Match!",
            body: `Your group "${group2.name}" matched with "${group1.name}"!`,
            data: {
              matchId: match.id,
              otherGroupId: group1.id,
              action: 'view_group_match',
            },
            channel: 'push',
          })
        ),
      ];

      await Promise.allSettled(notifications);
    } catch (error) {
      logger.error('Failed to send match notifications', error);
      // Non-critical error, don't throw
    }
  }

  private validateGroupData(data: CreateGroupDto): void {
    if (!data.name || data.name.trim().length < 2) {
      throw new Error('Group name must be at least 2 characters');
    }

    if (data.name.length > 100) {
      throw new Error('Group name must be 100 characters or less');
    }

    if (!data.bio || data.bio.trim().length < 10) {
      throw new Error('Group bio must be at least 10 characters');
    }

    if (data.bio.length > 500) {
      throw new Error('Group bio must be 500 characters or less');
    }

    if (data.minMembers !== undefined && data.minMembers < 2) {
      throw new Error('Minimum members must be at least 2');
    }

    if (data.maxMembers !== undefined && data.maxMembers > 20) {
      throw new Error('Maximum members cannot exceed 20');
    }

    if (
      data.minMembers !== undefined &&
      data.maxMembers !== undefined &&
      data.minMembers > data.maxMembers
    ) {
      throw new Error('Minimum members cannot exceed maximum members');
    }
  }

  private buildPreferences(partial?: Partial<GroupPreferences>): GroupPreferences {
    return {
      minGroupSize: partial?.minGroupSize || 2,
      maxGroupSize: partial?.maxGroupSize || 8,
      ageRangeMin: partial?.ageRangeMin || 18,
      ageRangeMax: partial?.ageRangeMax || 99,
      maxDistance: partial?.maxDistance || 50,
      genderPreferences: partial?.genderPreferences || [],
      activityPreferences: partial?.activityPreferences || [],
      lookingFor: partial?.lookingFor || [GroupLookingFor.GROUP_HANGOUT],
    };
  }
}

export default new GroupMatchingService();
