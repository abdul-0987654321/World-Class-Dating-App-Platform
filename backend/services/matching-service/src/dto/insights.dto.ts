import {
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Enum for insight time periods.
 */
export enum InsightPeriod {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  ALL_TIME = 'all_time',
}

/**
 * Enum for view source tracking.
 */
export enum ViewSource {
  DISCOVERY = 'discovery',
  SEARCH = 'search',
  PROFILE_LINK = 'profile_link',
  MATCH = 'match',
  SUPER_LIKE = 'super_like',
}

/**
 * Query parameters for getting profile insights.
 * GET /api/insights
 */
export class ProfileInsightsQueryDto {
  @IsOptional()
  @IsEnum(InsightPeriod, { message: 'Period must be one of: day, week, month, all_time' })
  period?: InsightPeriod = InsightPeriod.WEEK;
}

/**
 * Query parameters for getting who viewed me.
 * GET /api/insights/views
 */
export class WhoViewedMeQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset cannot be negative' })
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString({ message: 'Period must be a string' })
  period?: string = 'week';
}

/**
 * Query parameters for getting who liked you.
 * GET /api/insights/likes
 */
export class WhoLikedYouQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset cannot be negative' })
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  unmatchedOnly?: boolean;
}

/**
 * DTO for tracking a profile view.
 * POST /api/insights/track-view
 *
 * Note: viewerId (the user doing the viewing) is derived from the
 * authenticated user (JWT token), not from the request body.
 */
export class TrackProfileViewDto {
  @IsNotEmpty({ message: 'Viewed user ID is required' })
  @IsUUID('4', { message: 'Viewed user ID must be a valid UUID' })
  viewedUserId: string;

  @IsOptional()
  @IsEnum(ViewSource, {
    message: 'Source must be one of: discovery, search, profile_link, match, super_like',
  })
  source?: ViewSource;

  @IsOptional()
  @IsInt({ message: 'Duration must be an integer (milliseconds)' })
  @Min(0, { message: 'Duration cannot be negative' })
  @Max(3600000, { message: 'Duration cannot exceed 1 hour (3600000ms)' })
  @Type(() => Number)
  duration?: number;
}
