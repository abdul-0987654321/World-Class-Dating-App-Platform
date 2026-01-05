/**
 * DTOs for Internal Service Routes
 *
 * These DTOs validate request bodies for internal service-to-service endpoints.
 * Server-owned fields (id, createdAt, flagId) are NOT included
 * as they are generated server-side.
 */

import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
  MinLength,
  MaxLength,
  IsObject,
} from 'class-validator';

/**
 * Content type enum for internal moderation
 * Matches the valid content types accepted by the moderation service
 */
export enum InternalContentType {
  PHOTO = 'photo',
  PROFILE = 'profile',
  MESSAGE = 'message',
  BIO = 'bio',
}

/**
 * Priority levels for moderation queue
 */
export enum ModerationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/**
 * Content data - can be a string (text) or an object with URL (image)
 */
export class ContentUrlDto {
  @IsString()
  @MinLength(1)
  url: string;
}

/**
 * DTO for POST /api/internal/moderation/moderate
 * Moderate content (photo, profile, message, bio)
 */
export class InternalModerateContentDto {
  @IsUUID()
  contentId: string;

  @IsEnum(InternalContentType, {
    message: 'contentType must be one of: photo, profile, message, bio',
  })
  contentType: InternalContentType;

  /**
   * Content to moderate.
   * For text content (profile, message, bio): string
   * For photo content: string URL or object with url property
   */
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  content: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(ModerationPriority)
  priority?: ModerationPriority;
}

/**
 * DTO for POST /api/internal/moderation/flag
 * Flag content for review
 */
export class FlagContentDto {
  @IsUUID()
  contentId: string;

  @IsEnum(InternalContentType, {
    message: 'contentType must be one of: photo, profile, message, bio',
  })
  contentType: InternalContentType;

  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(5, { message: 'Reason must be at least 5 characters' })
  @MaxLength(1000, { message: 'Reason cannot exceed 1000 characters' })
  reason: string;

  @IsOptional()
  @IsUUID()
  reportedBy?: string;
}

/**
 * Individual item for bulk moderation
 */
export class BulkModerateItemDto {
  @IsUUID()
  contentId: string;

  @IsEnum(InternalContentType, {
    message: 'contentType must be one of: photo, profile, message, bio',
  })
  contentType: InternalContentType;

  /**
   * Content to moderate.
   * For text content: string
   * For photo content: string URL or object with url property
   */
  @IsString()
  @MinLength(1, { message: 'Content cannot be empty' })
  content: string;

  @IsUUID()
  userId: string;
}

/**
 * DTO for POST /api/internal/moderation/moderate-bulk
 * Bulk moderate multiple content items
 */
export class BulkModerateDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Items array must contain at least 1 item' })
  @ArrayMaxSize(100, { message: 'Items array cannot contain more than 100 items' })
  @ValidateNested({ each: true })
  @Type(() => BulkModerateItemDto)
  items: BulkModerateItemDto[];
}
