import {
  IsOptional,
  IsInt,
  IsArray,
  IsString,
  IsNumber,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for getting recommendations.
 * GET /api/recommendations
 *
 * Note: userId is derived from the authenticated user (JWT token).
 * Filter parameters are optional and allow narrowing down recommendations.
 */
export class GetRecommendationsQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset cannot be negative' })
  @Type(() => Number)
  offset?: number = 0;

  // Optional filter parameters
  @IsOptional()
  @IsInt({ message: 'Minimum age must be an integer' })
  @Min(18, { message: 'Minimum age must be at least 18' })
  @Max(100, { message: 'Minimum age cannot exceed 100' })
  @Type(() => Number)
  ageMin?: number;

  @IsOptional()
  @IsInt({ message: 'Maximum age must be an integer' })
  @Min(18, { message: 'Maximum age must be at least 18' })
  @Max(100, { message: 'Maximum age cannot exceed 100' })
  @Type(() => Number)
  ageMax?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Maximum distance must be a number' })
  @Min(1, { message: 'Maximum distance must be at least 1 km' })
  @Max(500, { message: 'Maximum distance cannot exceed 500 km' })
  @Type(() => Number)
  maxDistance?: number;

  @IsOptional()
  @IsArray({ message: 'Gender preference must be an array' })
  @IsString({ each: true, message: 'Each gender preference must be a string' })
  @ArrayMaxSize(10, { message: 'Cannot have more than 10 gender preferences' })
  genderPreference?: string[];

  @IsOptional()
  @IsArray({ message: 'Interests must be an array' })
  @IsString({ each: true, message: 'Each interest must be a string' })
  @ArrayMaxSize(50, { message: 'Cannot have more than 50 interests' })
  interests?: string[];
}

/**
 * Query parameters for getting top matches.
 * GET /api/recommendations/top
 */
export class GetTopMatchesQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(20, { message: 'Limit cannot exceed 20' })
  @Type(() => Number)
  limit?: number = 10;
}
