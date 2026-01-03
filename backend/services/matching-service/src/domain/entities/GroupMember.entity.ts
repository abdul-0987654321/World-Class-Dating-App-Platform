/**
 * GroupMember Entity
 * Represents a member of a group
 */

import { GroupMemberRole, GroupMemberStatus } from '../../types/group-matching.types';

export class GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  status: GroupMemberStatus;
  joinedAt?: Date;
  invitedAt: Date;
  invitedBy: string;

  constructor(data: {
    id: string;
    groupId: string;
    userId: string;
    role?: GroupMemberRole;
    status?: GroupMemberStatus;
    joinedAt?: Date;
    invitedAt?: Date;
    invitedBy: string;
  }) {
    this.id = data.id;
    this.groupId = data.groupId;
    this.userId = data.userId;
    this.role = data.role || GroupMemberRole.MEMBER;
    this.status = data.status || GroupMemberStatus.PENDING;
    this.joinedAt = data.joinedAt;
    this.invitedAt = data.invitedAt || new Date();
    this.invitedBy = data.invitedBy;
  }

  isActive(): boolean {
    return this.status === GroupMemberStatus.ACTIVE;
  }

  isPending(): boolean {
    return this.status === GroupMemberStatus.PENDING;
  }

  isAdmin(): boolean {
    return this.role === GroupMemberRole.ADMIN;
  }

  canInvite(): boolean {
    return this.isActive() && this.isAdmin();
  }

  static createAdmin(groupId: string, userId: string): Partial<GroupMember> {
    return {
      groupId,
      userId,
      role: GroupMemberRole.ADMIN,
      status: GroupMemberStatus.ACTIVE,
      joinedAt: new Date(),
      invitedAt: new Date(),
      invitedBy: userId,
    };
  }

  static createPendingMember(
    groupId: string,
    userId: string,
    invitedBy: string
  ): Partial<GroupMember> {
    return {
      groupId,
      userId,
      role: GroupMemberRole.MEMBER,
      status: GroupMemberStatus.PENDING,
      invitedAt: new Date(),
      invitedBy,
    };
  }
}
