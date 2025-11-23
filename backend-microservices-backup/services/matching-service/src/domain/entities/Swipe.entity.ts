import { SwipeAction } from '../../types';

export class Swipe {
  id: string;
  userId: string;
  targetUserId: string;
  action: SwipeAction;
  createdAt: Date;

  constructor(data: {
    id: string;
    userId: string;
    targetUserId: string;
    action: SwipeAction;
    createdAt: Date;
  }) {
    this.id = data.id;
    this.userId = data.userId;
    this.targetUserId = data.targetUserId;
    this.action = data.action;
    this.createdAt = data.createdAt;
  }

  isLike(): boolean {
    return this.action === SwipeAction.LIKE || this.action === SwipeAction.SUPER_LIKE;
  }

  isSuperLike(): boolean {
    return this.action === SwipeAction.SUPER_LIKE;
  }
}
