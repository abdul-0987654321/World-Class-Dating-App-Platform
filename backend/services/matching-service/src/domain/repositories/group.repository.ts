/**
 * Group Repository
 * Handles database operations for groups and group matching
 */

import { createLogger } from '@flamoral/backend-shared';
import { Knex } from 'knex';

import db from '../../infrastructure/database/connection';
import {
  GroupStatus,
  GroupMemberRole,
  GroupMemberStatus,
  GroupMatchStatus,
  GroupSwipeAction,
  GroupPreferences,
  GroupActivitySuggestion,
  GroupSwipe,
} from '../../types/group-matching.types';
import { Group } from '../entities/Group.entity';
import { GroupMatch } from '../entities/GroupMatch.entity';
import { GroupMember } from '../entities/GroupMember.entity';

const logger = createLogger('group-repository');

export class GroupRepository {
  private db: Knex;

  constructor(database: Knex = db) {
    this.db = database;
  }

  // ==================== GROUP OPERATIONS ====================

  async createGroup(data: Partial<Group>): Promise<Group> {
    try {
      const [created] = await this.db('groups')
        .insert({
          name: data.name,
          bio: data.bio,
          photos: JSON.stringify(data.photos || []),
          admin_id: data.adminId,
          status: data.status || GroupStatus.ACTIVE,
          preferences: JSON.stringify(data.preferences || {}),
          combined_interests: JSON.stringify(data.combinedInterests || []),
          member_count: data.memberCount || 1,
          min_members: data.minMembers || 2,
          max_members: data.maxMembers || 8,
          latitude: data.location?.latitude,
          longitude: data.location?.longitude,
          city: data.location?.city,
          is_verified: data.isVerified || false,
          is_premium: data.isPremium || false,
        })
        .returning('*');

      return this.mapToGroup(created);
    } catch (error) {
      logger.error('Failed to create group', error);
      throw error;
    }
  }

  async findGroupById(groupId: string): Promise<Group | null> {
    try {
      const group = await this.db('groups').where({ id: groupId }).first();
      return group ? this.mapToGroup(group) : null;
    } catch (error) {
      logger.error('Failed to find group by ID', error);
      throw error;
    }
  }

  async findGroupsByUserId(userId: string): Promise<Group[]> {
    try {
      const groups = await this.db('groups')
        .join('group_members', 'groups.id', 'group_members.group_id')
        .where('group_members.user_id', userId)
        .where('group_members.status', GroupMemberStatus.ACTIVE)
        .where('groups.status', GroupStatus.ACTIVE)
        .select('groups.*');

      return groups.map(this.mapToGroup);
    } catch (error) {
      logger.error('Failed to find groups by user ID', error);
      throw error;
    }
  }

  async updateGroup(groupId: string, data: Partial<Group>): Promise<Group | null> {
    try {
      const updateData: Record<string, any> = {};

      if (data.name !== undefined) updateData.name = data.name;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.photos !== undefined) updateData.photos = JSON.stringify(data.photos);
      if (data.preferences !== undefined) updateData.preferences = JSON.stringify(data.preferences);
      if (data.combinedInterests !== undefined)
        updateData.combined_interests = JSON.stringify(data.combinedInterests);
      if (data.status !== undefined) updateData.status = data.status;
      if (data.memberCount !== undefined) updateData.member_count = data.memberCount;
      if (data.location !== undefined) {
        updateData.latitude = data.location.latitude;
        updateData.longitude = data.location.longitude;
        updateData.city = data.location.city;
      }

      const [updated] = await this.db('groups')
        .where({ id: groupId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToGroup(updated) : null;
    } catch (error) {
      logger.error('Failed to update group', error);
      throw error;
    }
  }

  async deleteGroup(groupId: string): Promise<boolean> {
    try {
      const deleted = await this.db('groups')
        .where({ id: groupId })
        .update({ status: GroupStatus.DISBANDED });
      return deleted > 0;
    } catch (error) {
      logger.error('Failed to delete group', error);
      throw error;
    }
  }

  async incrementMemberCount(groupId: string): Promise<void> {
    try {
      await this.db('groups').where({ id: groupId }).increment('member_count', 1);
    } catch (error) {
      logger.error('Failed to increment member count', error);
      throw error;
    }
  }

  async decrementMemberCount(groupId: string): Promise<void> {
    try {
      await this.db('groups').where({ id: groupId }).decrement('member_count', 1);
    } catch (error) {
      logger.error('Failed to decrement member count', error);
      throw error;
    }
  }

  // ==================== GROUP MEMBER OPERATIONS ====================

  async addMember(data: Partial<GroupMember>): Promise<GroupMember> {
    try {
      const [created] = await this.db('group_members')
        .insert({
          group_id: data.groupId,
          user_id: data.userId,
          role: data.role || GroupMemberRole.MEMBER,
          status: data.status || GroupMemberStatus.PENDING,
          joined_at: data.joinedAt,
          invited_at: data.invitedAt || new Date(),
          invited_by: data.invitedBy,
        })
        .returning('*');

      return this.mapToGroupMember(created);
    } catch (error) {
      logger.error('Failed to add member', error);
      throw error;
    }
  }

  async findMemberById(memberId: string): Promise<GroupMember | null> {
    try {
      const member = await this.db('group_members').where({ id: memberId }).first();
      return member ? this.mapToGroupMember(member) : null;
    } catch (error) {
      logger.error('Failed to find member by ID', error);
      throw error;
    }
  }

  async findMemberByGroupAndUser(groupId: string, userId: string): Promise<GroupMember | null> {
    try {
      const member = await this.db('group_members')
        .where({ group_id: groupId, user_id: userId })
        .first();
      return member ? this.mapToGroupMember(member) : null;
    } catch (error) {
      logger.error('Failed to find member by group and user', error);
      throw error;
    }
  }

  async findGroupMembers(groupId: string, status?: GroupMemberStatus): Promise<GroupMember[]> {
    try {
      let query = this.db('group_members').where({ group_id: groupId });

      if (status) {
        query = query.andWhere({ status });
      }

      const members = await query;
      return members.map(this.mapToGroupMember);
    } catch (error) {
      logger.error('Failed to find group members', error);
      throw error;
    }
  }

  async findPendingInvitations(userId: string): Promise<GroupMember[]> {
    try {
      const invitations = await this.db('group_members').where({
        user_id: userId,
        status: GroupMemberStatus.PENDING,
      });
      return invitations.map(this.mapToGroupMember);
    } catch (error) {
      logger.error('Failed to find pending invitations', error);
      throw error;
    }
  }

  async updateMemberStatus(
    memberId: string,
    status: GroupMemberStatus,
    joinedAt?: Date
  ): Promise<GroupMember | null> {
    try {
      const updateData: Record<string, any> = { status };
      if (joinedAt) updateData.joined_at = joinedAt;

      const [updated] = await this.db('group_members')
        .where({ id: memberId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToGroupMember(updated) : null;
    } catch (error) {
      logger.error('Failed to update member status', error);
      throw error;
    }
  }

  async removeMember(groupId: string, userId: string): Promise<boolean> {
    try {
      const updated = await this.db('group_members')
        .where({ group_id: groupId, user_id: userId })
        .update({ status: GroupMemberStatus.REMOVED });
      return updated > 0;
    } catch (error) {
      logger.error('Failed to remove member', error);
      throw error;
    }
  }

  async transferAdmin(groupId: string, newAdminId: string): Promise<void> {
    try {
      await this.db.transaction(async (trx) => {
        // Demote current admin
        await trx('group_members')
          .where({ group_id: groupId, role: GroupMemberRole.ADMIN })
          .update({ role: GroupMemberRole.MEMBER });

        // Promote new admin
        await trx('group_members')
          .where({ group_id: groupId, user_id: newAdminId })
          .update({ role: GroupMemberRole.ADMIN });

        // Update group admin_id
        await trx('groups').where({ id: groupId }).update({ admin_id: newAdminId });
      });
    } catch (error) {
      logger.error('Failed to transfer admin', error);
      throw error;
    }
  }

  // ==================== GROUP SWIPE OPERATIONS ====================

  async createSwipe(data: {
    groupId: string;
    targetGroupId: string;
    action: GroupSwipeAction;
    swipedByUserId: string;
  }): Promise<GroupSwipe> {
    try {
      const [created] = await this.db('group_swipes')
        .insert({
          group_id: data.groupId,
          target_group_id: data.targetGroupId,
          action: data.action,
          swiped_by_user_id: data.swipedByUserId,
        })
        .returning('*');

      return this.mapToGroupSwipe(created);
    } catch (error) {
      logger.error('Failed to create swipe', error);
      throw error;
    }
  }

  async findSwipe(groupId: string, targetGroupId: string): Promise<GroupSwipe | null> {
    try {
      const swipe = await this.db('group_swipes')
        .where({ group_id: groupId, target_group_id: targetGroupId })
        .first();
      return swipe ? this.mapToGroupSwipe(swipe) : null;
    } catch (error) {
      logger.error('Failed to find swipe', error);
      throw error;
    }
  }

  async checkMutualLike(group1Id: string, group2Id: string): Promise<boolean> {
    try {
      const swipe1 = await this.findSwipe(group1Id, group2Id);
      const swipe2 = await this.findSwipe(group2Id, group1Id);

      return (
        swipe1 !== null &&
        swipe2 !== null &&
        (swipe1.action === GroupSwipeAction.LIKE ||
          swipe1.action === GroupSwipeAction.SUPER_LIKE) &&
        (swipe2.action === GroupSwipeAction.LIKE || swipe2.action === GroupSwipeAction.SUPER_LIKE)
      );
    } catch (error) {
      logger.error('Failed to check mutual like', error);
      throw error;
    }
  }

  async getSwipedGroupIds(groupId: string): Promise<string[]> {
    try {
      const swipes = await this.db('group_swipes')
        .where({ group_id: groupId })
        .select('target_group_id');
      return swipes.map((s) => s.target_group_id);
    } catch (error) {
      logger.error('Failed to get swiped group IDs', error);
      throw error;
    }
  }

  // ==================== GROUP MATCH OPERATIONS ====================

  async createMatch(data: Partial<GroupMatch>): Promise<GroupMatch> {
    try {
      const [sortedGroup1, sortedGroup2] = [data.group1Id, data.group2Id].sort();

      const [created] = await this.db('group_matches')
        .insert({
          group1_id: sortedGroup1,
          group2_id: sortedGroup2,
          status: data.status || GroupMatchStatus.MATCHED,
          compatibility_score: data.compatibilityScore || 0,
          matched_at: data.matchedAt || new Date(),
          last_activity_at: data.lastActivityAt || new Date(),
          conversation_id: data.conversationId,
          expires_at: data.expiresAt,
          expired: data.expired || false,
          first_message_sent: data.firstMessageSent || false,
        })
        .returning('*');

      return this.mapToGroupMatch(created);
    } catch (error) {
      logger.error('Failed to create match', error);
      throw error;
    }
  }

  async findMatchById(matchId: string): Promise<GroupMatch | null> {
    try {
      const match = await this.db('group_matches').where({ id: matchId }).first();
      return match ? this.mapToGroupMatch(match) : null;
    } catch (error) {
      logger.error('Failed to find match by ID', error);
      throw error;
    }
  }

  async findMatchByGroups(group1Id: string, group2Id: string): Promise<GroupMatch | null> {
    try {
      const [sortedGroup1, sortedGroup2] = [group1Id, group2Id].sort();
      const match = await this.db('group_matches')
        .where({ group1_id: sortedGroup1, group2_id: sortedGroup2 })
        .first();
      return match ? this.mapToGroupMatch(match) : null;
    } catch (error) {
      logger.error('Failed to find match by groups', error);
      throw error;
    }
  }

  async findMatchesByGroupId(groupId: string, status?: GroupMatchStatus): Promise<GroupMatch[]> {
    try {
      let query = this.db('group_matches')
        .where('group1_id', groupId)
        .orWhere('group2_id', groupId);

      if (status) {
        query = query.andWhere('status', status);
      }

      const matches = await query.orderBy('matched_at', 'desc');
      return matches.map(this.mapToGroupMatch);
    } catch (error) {
      logger.error('Failed to find matches by group ID', error);
      throw error;
    }
  }

  async updateMatchStatus(matchId: string, status: GroupMatchStatus): Promise<GroupMatch | null> {
    try {
      const updateData: Record<string, any> = { status };
      if (status === GroupMatchStatus.UNMATCHED) {
        updateData.unmatched_at = new Date();
      }

      const [updated] = await this.db('group_matches')
        .where({ id: matchId })
        .update(updateData)
        .returning('*');

      return updated ? this.mapToGroupMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to update match status', error);
      throw error;
    }
  }

  async setMatchConversationId(
    matchId: string,
    conversationId: string
  ): Promise<GroupMatch | null> {
    try {
      const [updated] = await this.db('group_matches')
        .where({ id: matchId })
        .update({ conversation_id: conversationId })
        .returning('*');

      return updated ? this.mapToGroupMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to set match conversation ID', error);
      throw error;
    }
  }

  async markMatchFirstMessageSent(matchId: string): Promise<GroupMatch | null> {
    try {
      const [updated] = await this.db('group_matches')
        .where({ id: matchId })
        .update({ first_message_sent: true })
        .returning('*');

      return updated ? this.mapToGroupMatch(updated) : null;
    } catch (error) {
      logger.error('Failed to mark first message sent', error);
      throw error;
    }
  }

  // ==================== GROUP FEED OPERATIONS ====================

  async findGroupsForFeed(
    groupId: string,
    preferences: GroupPreferences,
    limit: number = 20,
    offset: number = 0
  ): Promise<Group[]> {
    try {
      const group = await this.findGroupById(groupId);
      if (!group) return [];

      // Get groups already swiped on
      const swipedGroupIds = await this.getSwipedGroupIds(groupId);

      // Get member IDs to exclude their groups
      const members = await this.findGroupMembers(groupId, GroupMemberStatus.ACTIVE);
      const memberIds = members.map((m) => m.userId);

      let query = this.db('groups')
        .where('status', GroupStatus.ACTIVE)
        .whereNot('id', groupId)
        .where('member_count', '>=', preferences.minGroupSize || 2)
        .where('member_count', '<=', preferences.maxGroupSize || 8);

      // Exclude already swiped groups
      if (swipedGroupIds.length > 0) {
        query = query.whereNotIn('id', swipedGroupIds);
      }

      // Exclude groups that have members in the current group
      if (memberIds.length > 0) {
        query = query.whereNotIn(
          'id',
          this.db('group_members')
            .select('group_id')
            .whereIn('user_id', memberIds)
            .andWhere('status', GroupMemberStatus.ACTIVE)
        );
      }

      // Filter by distance if location is set
      if (group.location && preferences.maxDistance) {
        const { latitude, longitude } = group.location;
        // Haversine formula for approximate distance filtering
        query = query.whereRaw(
          `
          (6371 * acos(
            cos(radians(?)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(latitude))
          )) <= ?
        `,
          [latitude, longitude, latitude, preferences.maxDistance]
        );
      }

      const groups = await query.limit(limit).offset(offset);
      return groups.map(this.mapToGroup);
    } catch (error) {
      logger.error('Failed to find groups for feed', error);
      throw error;
    }
  }

  // ==================== ACTIVITY SUGGESTIONS ====================

  async findActivitySuggestions(
    groupSize: number,
    tags?: string[],
    limit: number = 10
  ): Promise<GroupActivitySuggestion[]> {
    try {
      let query = this.db('group_activity_suggestions')
        .where('is_active', true)
        .where('ideal_group_size_min', '<=', groupSize)
        .where('ideal_group_size_max', '>=', groupSize);

      if (tags && tags.length > 0) {
        // Filter by tags using JSONB containment
        query = query.whereRaw(`tags ?| array[${tags.map(() => '?').join(',')}]`, tags);
      }

      const suggestions = await query.limit(limit);
      return suggestions.map(this.mapToActivitySuggestion);
    } catch (error) {
      logger.error('Failed to find activity suggestions', error);
      throw error;
    }
  }

  async findActivitySuggestionsByCategory(
    category: string,
    limit: number = 10
  ): Promise<GroupActivitySuggestion[]> {
    try {
      const suggestions = await this.db('group_activity_suggestions')
        .where('is_active', true)
        .where('category', category)
        .limit(limit);

      return suggestions.map(this.mapToActivitySuggestion);
    } catch (error) {
      logger.error('Failed to find activity suggestions by category', error);
      throw error;
    }
  }

  // ==================== MAPPING FUNCTIONS ====================

  private mapToGroup(record: any): Group {
    return new Group({
      id: record.id,
      name: record.name,
      bio: record.bio,
      photos: typeof record.photos === 'string' ? JSON.parse(record.photos) : record.photos || [],
      adminId: record.admin_id,
      status: record.status,
      preferences:
        typeof record.preferences === 'string'
          ? JSON.parse(record.preferences)
          : record.preferences || {},
      combinedInterests:
        typeof record.combined_interests === 'string'
          ? JSON.parse(record.combined_interests)
          : record.combined_interests || [],
      memberCount: record.member_count,
      minMembers: record.min_members,
      maxMembers: record.max_members,
      location:
        record.latitude && record.longitude
          ? {
              latitude: parseFloat(record.latitude),
              longitude: parseFloat(record.longitude),
              city: record.city,
            }
          : undefined,
      isVerified: record.is_verified,
      isPremium: record.is_premium,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    });
  }

  private mapToGroupMember(record: any): GroupMember {
    return new GroupMember({
      id: record.id,
      groupId: record.group_id,
      userId: record.user_id,
      role: record.role,
      status: record.status,
      joinedAt: record.joined_at ? new Date(record.joined_at) : undefined,
      invitedAt: new Date(record.invited_at),
      invitedBy: record.invited_by,
    });
  }

  private mapToGroupMatch(record: any): GroupMatch {
    return new GroupMatch({
      id: record.id,
      group1Id: record.group1_id,
      group2Id: record.group2_id,
      status: record.status,
      compatibilityScore: record.compatibility_score ? parseFloat(record.compatibility_score) : 0,
      matchedAt: new Date(record.matched_at),
      lastActivityAt: new Date(record.last_activity_at),
      conversationId: record.conversation_id,
      expiresAt: record.expires_at ? new Date(record.expires_at) : undefined,
      expired: record.expired,
      firstMessageSent: record.first_message_sent,
    });
  }

  private mapToGroupSwipe(record: any): GroupSwipe {
    return {
      id: record.id,
      groupId: record.group_id,
      targetGroupId: record.target_group_id,
      action: record.action,
      swipedByUserId: record.swiped_by_user_id,
      createdAt: new Date(record.created_at),
    };
  }

  private mapToActivitySuggestion(record: any): GroupActivitySuggestion {
    return {
      id: record.id,
      name: record.name,
      category: record.category,
      description: record.description,
      idealGroupSize: {
        min: record.ideal_group_size_min,
        max: record.ideal_group_size_max,
      },
      estimatedDuration: record.estimated_duration,
      estimatedCost: record.estimated_cost,
      location:
        record.latitude && record.longitude
          ? {
              latitude: parseFloat(record.latitude),
              longitude: parseFloat(record.longitude),
              address: record.address,
              venueName: record.venue_name,
            }
          : undefined,
      tags: typeof record.tags === 'string' ? JSON.parse(record.tags) : record.tags || [],
      rating: record.rating ? parseFloat(record.rating) : undefined,
      imageUrl: record.image_url,
    };
  }
}

export default new GroupRepository();
