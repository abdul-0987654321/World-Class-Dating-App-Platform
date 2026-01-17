import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsLatitude,
  IsLongitude,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * Enum for report reasons
 */
export enum ReportReason {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  HARASSMENT = 'harassment',
  FAKE_PROFILE = 'fake_profile',
  UNDERAGE = 'underage',
  OTHER = 'other',
}

/**
 * DTO for updating user profile
 * Uses explicit field list to prevent mass assignment
 */
export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'User first name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ description: 'User bio/about me' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ description: 'User occupation' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  occupation?: string;

  @ApiPropertyOptional({ description: 'User company' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  company?: string;

  @ApiPropertyOptional({ description: 'User school/education' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  school?: string;

  @ApiPropertyOptional({ description: 'User height in cm' })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height?: number;

  @ApiPropertyOptional({ description: 'User interests as array of strings' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  interests?: string[];
}

/**
 * DTO for updating user preferences
 */
export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ description: 'Minimum age preference' })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  ageMin?: number;

  @ApiPropertyOptional({ description: 'Maximum age preference' })
  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(100)
  ageMax?: number;

  @ApiPropertyOptional({ description: 'Maximum distance in km' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  distanceMax?: number;

  @ApiPropertyOptional({ description: 'Preferred genders' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genderPreference?: string[];

  @ApiPropertyOptional({ description: 'Show me on platform' })
  @IsOptional()
  @IsBoolean()
  showMe?: boolean;

  @ApiPropertyOptional({ description: 'Global mode (show users worldwide)' })
  @IsOptional()
  @IsBoolean()
  globalMode?: boolean;
}

/**
 * DTO for updating user settings
 */
export class UpdateUserSettingsDto {
  @ApiPropertyOptional({ description: 'Enable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Show online status' })
  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @ApiPropertyOptional({ description: 'Show read receipts' })
  @IsOptional()
  @IsBoolean()
  showReadReceipts?: boolean;

  @ApiPropertyOptional({ description: 'Show last active' })
  @IsOptional()
  @IsBoolean()
  showLastActive?: boolean;

  @ApiPropertyOptional({ description: 'Preferred language' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;
}

/**
 * DTO for updating user location
 */
export class UpdateLocationDto {
  @ApiProperty({ description: 'Latitude coordinate' })
  @IsNumber()
  @IsLatitude()
  latitude: number;

  @ApiProperty({ description: 'Longitude coordinate' })
  @IsNumber()
  @IsLongitude()
  longitude: number;

  @ApiPropertyOptional({ description: 'City name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ description: 'Country name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;
}

/**
 * DTO for blocking a user
 */
export class BlockUserDto {
  @ApiProperty({ description: 'ID of user to block' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  blockedUserId: string;
}

/**
 * DTO for reporting a user
 */
export class ReportUserDto {
  @ApiProperty({ description: 'ID of user to report' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  reportedUserId: string;

  @ApiProperty({ description: 'Reason for report', enum: ReportReason })
  @IsEnum(ReportReason)
  reason: ReportReason;

  @ApiPropertyOptional({ description: 'Additional details about the report' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}

/**
 * DTO for profile verification request
 */
export class RequestVerificationDto {
  @ApiProperty({ description: 'Type of verification requested' })
  @IsString()
  @IsNotEmpty()
  verificationType: string;

  @ApiPropertyOptional({ description: 'Additional verification data' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  verificationData?: string;
}
