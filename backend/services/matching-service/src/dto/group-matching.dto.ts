/**
 * Group Matching DTOs
 * Data Transfer Objects for group matching endpoints
 */

import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsUUID,
  IsEnum,
  ValidateNested,
  IsObject,
  ArrayMaxSize,
} from 'class-validator';

import { GroupLookingFor } from '../types/group-matching.types';

// ==================== Location DTO ====================

class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;
}

// ==================== Group Preferences DTO ====================

class GroupPreferencesDto {
  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  minGroupSize?: number;

  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  maxGroupSize?: number;

  @IsNumber()
  @Min(18)
  @Max(99)
  @IsOptional()
  ageRangeMin?: number;

  @IsNumber()
  @Min(18)
  @Max(99)
  @IsOptional()
  ageRangeMax?: number;

  @IsNumber()
  @Min(1)
  @Max(500)
  @IsOptional()
  maxDistance?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  genderPreferences?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  activityPreferences?: string[];

  @IsArray()
  @IsEnum(GroupLookingFor, { each: true })
  @IsOptional()
  lookingFor?: GroupLookingFor[];
}

// ==================== Create Group DTO ====================

export class CreateGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  bio!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  photos?: string[];

  @ValidateNested()
  @Type(() => GroupPreferencesDto)
  @IsOptional()
  preferences?: GroupPreferencesDto;

  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  minMembers?: number;

  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  maxMembers?: number;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}

// ==================== Update Group DTO ====================

export class UpdateGroupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  @IsOptional()
  photos?: string[];

  @ValidateNested()
  @Type(() => GroupPreferencesDto)
  @IsOptional()
  preferences?: GroupPreferencesDto;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;
}

// ==================== Invite Member DTO ====================

export class InviteMemberDto {
  @IsUUID()
  userId!: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  message?: string;
}

// ==================== Group Feed Query DTO ====================

export class GroupFeedQueryDto {
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;

  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  minGroupSize?: number;

  @IsNumber()
  @Min(2)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  maxGroupSize?: number;

  @IsNumber()
  @Min(1)
  @Max(500)
  @IsOptional()
  @Type(() => Number)
  maxDistance?: number;
}

// ==================== Swipe DTO ====================

export class GroupSwipeDto {
  @IsUUID()
  targetGroupId!: string;
}

// ==================== Transfer Admin DTO ====================

export class TransferAdminDto {
  @IsUUID()
  newAdminId!: string;
}

// ==================== Activity Suggestions Query DTO ====================

export class ActivitySuggestionsQueryDto {
  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// ==================== Get User Groups Query DTO ====================

export class GetUserGroupsQueryDto {
  @IsString()
  @IsOptional()
  status?: string;
}

// ==================== Get Group Matches Query DTO ====================

export class GetGroupMatchesQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}
