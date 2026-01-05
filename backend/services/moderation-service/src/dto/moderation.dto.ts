/**
 * DTOs for Moderation Routes
 *
 * These DTOs validate request bodies for the moderation endpoints.
 * Server-owned fields (id, createdAt, moderatorId, adminId) are NOT included
 * as they come from JWT tokens or are generated server-side.
 */

import {
  IsString,
  IsUUID,
  IsUrl,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';

import { ContentType } from '../types';

/**
 * DTO for POST /api/moderation/image
 * Moderate an image content
 *
 * Note: This is for manual moderation triggered by moderators.
 * The moderatorId comes from the JWT token, not the request body.
 */
export class ModerateImageDto {
  @IsUUID()
  contentId: string;

  @IsUrl({}, { message: 'imageUrl must be a valid URL' })
  imageUrl: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;
}

/**
 * DTO for POST /api/moderation/text
 * Moderate text content
 *
 * Note: This is for manual moderation triggered by moderators.
 * The moderatorId comes from the JWT token, not the request body.
 */
export class ModerateTextDto {
  @IsUUID()
  contentId: string;

  @IsString()
  @MinLength(1, { message: 'Text content cannot be empty' })
  @MaxLength(50000, { message: 'Text content exceeds maximum length of 50000 characters' })
  text: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ContentType)
  contentType?: ContentType;
}

/**
 * DTO for POST /api/moderation/admin/suspend
 * Admin: Manually suspend a user
 *
 * Note: adminId is extracted from JWT token, NOT from request body.
 * This prevents admin impersonation attacks.
 */
export class AdminSuspendUserDto {
  @IsUUID()
  targetUserId: string;

  @IsInt()
  @Min(1, { message: 'Suspension days must be at least 1' })
  @Max(365, { message: 'Suspension days cannot exceed 365' })
  suspensionDays: number;

  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;
}

/**
 * DTO for POST /api/moderation/admin/unsuspend
 * Admin: Manually unsuspend a user
 *
 * Note: adminId is extracted from JWT token, NOT from request body.
 */
export class AdminUnsuspendUserDto {
  @IsUUID()
  targetUserId: string;

  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;
}

/**
 * DTO for POST /api/moderation/admin/ban
 * Admin: Permanently ban a user
 *
 * Note: adminId is extracted from JWT token, NOT from request body.
 */
export class AdminBanUserDto {
  @IsUUID()
  targetUserId: string;

  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;
}

/**
 * DTO for POST /api/moderation/admin/unban
 * Admin: Unban a user
 *
 * Note: adminId is extracted from JWT token, NOT from request body.
 */
export class AdminUnbanUserDto {
  @IsUUID()
  targetUserId: string;

  @IsString()
  @MinLength(10, { message: 'Reason must be at least 10 characters' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;
}
