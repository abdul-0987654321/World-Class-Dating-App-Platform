import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';

import { SwipeAction } from '../types';

/**
 * DTO for processing a swipe action.
 * POST /api/swipes
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 */
export class SwipeDto {
  @IsNotEmpty({ message: 'Target user ID is required' })
  @IsUUID('4', { message: 'Target user ID must be a valid UUID' })
  targetUserId: string;

  @IsNotEmpty({ message: 'Swipe action is required' })
  @IsEnum(SwipeAction, { message: 'Action must be one of: like, pass, super_like' })
  action: SwipeAction;
}
