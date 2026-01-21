import { IsBoolean, IsString, IsNumber, IsOptional, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Feature Flag Data Transfer Object
 * Represents a complete feature flag with all its properties
 */
export class FeatureFlagDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsBoolean()
  enabled!: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userSegments?: string[];

  @IsString()
  createdAt!: string;

  @IsString()
  updatedAt!: string;

  @IsString()
  category!: string;

  @IsString()
  key!: string;
}

/**
 * DTO for updating feature flag rollout percentage
 */
export class UpdateRolloutDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for updating feature flag segments
 */
export class UpdateSegmentsDto {
  @IsArray()
  @IsString({ each: true })
  segments!: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for updating feature flag regions
 */
export class UpdateRegionsDto {
  @IsArray()
  @IsString({ each: true })
  regions!: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for toggling feature flag enabled state
 */
export class ToggleFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for updating multiple feature flag properties at once
 */
export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userSegments?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Feature Flag Metrics DTO
 * Contains usage statistics for a feature flag
 */
export class FeatureFlagMetricsDto {
  @IsString()
  category!: string;

  @IsString()
  name!: string;

  @IsString()
  flagKey!: string;

  @IsNumber()
  totalEvaluations!: number;

  @IsNumber()
  enabledEvaluations!: number;

  @IsNumber()
  disabledEvaluations!: number;

  @IsNumber()
  uniqueUsers!: number;

  @IsNumber()
  enabledPercentage!: number;

  @IsString()
  lastEvaluatedAt!: string;

  evaluationsByDay!: DailyEvaluationDto[];

  evaluationsBySegment!: SegmentEvaluationDto[];

  evaluationsByRegion!: RegionEvaluationDto[];
}

/**
 * Daily evaluation metrics
 */
export class DailyEvaluationDto {
  @IsString()
  date!: string;

  @IsNumber()
  total!: number;

  @IsNumber()
  enabled!: number;

  @IsNumber()
  disabled!: number;
}

/**
 * Segment-based evaluation metrics
 */
export class SegmentEvaluationDto {
  @IsString()
  segment!: string;

  @IsNumber()
  total!: number;

  @IsNumber()
  enabled!: number;

  @IsNumber()
  disabled!: number;
}

/**
 * Region-based evaluation metrics
 */
export class RegionEvaluationDto {
  @IsString()
  region!: string;

  @IsNumber()
  total!: number;

  @IsNumber()
  enabled!: number;

  @IsNumber()
  disabled!: number;
}

/**
 * Feature Flag Override DTO
 * Represents a runtime override stored in Redis/DB
 */
export class FeatureFlagOverrideDto {
  @IsString()
  category!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userSegments?: string[];

  @IsString()
  createdBy!: string;

  @IsString()
  createdAt!: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Bulk update DTO for multiple feature flags
 */
export class BulkUpdateFeatureFlagsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates!: BulkUpdateItemDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Individual item in bulk update
 */
export class BulkUpdateItemDto {
  @IsString()
  category!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;
}

/**
 * Feature flag list response DTO
 */
export class FeatureFlagListResponseDto {
  flags!: FeatureFlagDto[];

  @IsNumber()
  total!: number;

  categories!: CategorySummaryDto[];
}

/**
 * Category summary for feature flags
 */
export class CategorySummaryDto {
  @IsString()
  name!: string;

  @IsNumber()
  totalFlags!: number;

  @IsNumber()
  enabledFlags!: number;

  @IsNumber()
  disabledFlags!: number;
}

/**
 * Feature flag history entry DTO
 */
export class FeatureFlagHistoryDto {
  @IsString()
  id!: string;

  @IsString()
  category!: string;

  @IsString()
  name!: string;

  @IsString()
  action!: string;

  previousValue?: Partial<FeatureFlagDto>;

  newValue?: Partial<FeatureFlagDto>;

  @IsString()
  changedBy!: string;

  @IsString()
  changedAt!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
