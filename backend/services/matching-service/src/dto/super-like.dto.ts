import { IsUUID, IsOptional, IsString, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * DTO for sending a Super Like with optional message.
 * POST /api/super-likes
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 */
export class SendSuperLikeDto {
  @IsNotEmpty({ message: 'Target user ID is required' })
  @IsUUID('4', { message: 'Target user ID must be a valid UUID' })
  targetUserId: string;

  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  @MaxLength(500, { message: 'Message cannot exceed 500 characters' })
  message?: string;
}

/**
 * Query parameters for getting received super likes.
 * GET /api/super-likes/received
 */
export class GetReceivedSuperLikesQueryDto {
  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;

  @IsOptional()
  unreadOnly?: boolean;
}

/**
 * Query parameters for getting sent super likes.
 * GET /api/super-likes/sent
 */
export class GetSentSuperLikesQueryDto {
  @IsOptional()
  limit?: number;

  @IsOptional()
  offset?: number;
}
