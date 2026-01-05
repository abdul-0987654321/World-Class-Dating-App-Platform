import { Type } from 'class-transformer';
import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

/**
 * Query parameters for getting discovery feed.
 * GET /api/v1/discovery/feed
 */
export class DiscoveryFeedQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsString({ message: 'Cursor must be a string' })
  cursor?: string;
}

/**
 * DTO for liking a user.
 * POST /api/v1/discovery/like
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 */
export class DiscoveryLikeDto {
  @IsNotEmpty({ message: 'target_user_id is required' })
  @IsUUID('4', { message: 'target_user_id must be a valid UUID' })
  target_user_id: string;
}

/**
 * DTO for passing on a user.
 * POST /api/v1/discovery/pass
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 */
export class DiscoveryPassDto {
  @IsNotEmpty({ message: 'target_user_id is required' })
  @IsUUID('4', { message: 'target_user_id must be a valid UUID' })
  target_user_id: string;
}

/**
 * DTO for super-liking a user via discovery feed.
 * POST /api/v1/discovery/super-like
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 */
export class DiscoverySuperLikeDto {
  @IsNotEmpty({ message: 'target_user_id is required' })
  @IsUUID('4', { message: 'target_user_id must be a valid UUID' })
  target_user_id: string;

  @IsOptional()
  @IsString({ message: 'Message must be a string' })
  @MaxLength(500, { message: 'Message cannot exceed 500 characters' })
  message?: string;
}
