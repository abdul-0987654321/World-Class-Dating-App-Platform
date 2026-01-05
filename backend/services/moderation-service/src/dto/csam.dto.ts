/**
 * DTOs for CSAM Detection Routes
 *
 * These DTOs validate request bodies for the CSAM detection endpoints.
 * Server-owned fields (id, createdAt, detectionId) are NOT included
 * as they are generated server-side.
 */

import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsBase64,
  IsDateString,
  MinLength,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for POST /api/csam/detect
 * Detect CSAM in an image
 *
 * Note: This is called by other services (media-service) for automated detection.
 */
export class CSAMDetectDto {
  @IsUUID()
  contentId: string;

  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(1, { message: 'imageData cannot be empty' })
  imageData: string; // Base64 encoded image data

  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contentType?: string;
}

/**
 * DTO for POST /api/csam/quarantine-for-review
 * Quarantine content for manual review (fallback for detection failures)
 */
export class QuarantineForReviewDto {
  @IsUUID()
  contentId: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  imageData?: string; // Base64 encoded image data

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  error?: string;
}

/**
 * DTO for POST /api/csam/audit/verify
 * Verify audit chain integrity
 */
export class AuditVerifyDto {
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate: string;

  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate: string;
}

/**
 * Warrant information for law enforcement access
 */
export class WarrantInfoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  warrantNumber?: string;

  @IsOptional()
  @IsDateString()
  issuedDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  jurisdiction?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  issuingJudge?: string;
}

/**
 * DTO for POST /api/csam/quarantine/:quarantineId/grant-access
 * Grant law enforcement access to quarantined content
 */
export class GrantLawEnforcementAccessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  officerId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  agency: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  caseNumber: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WarrantInfoDto)
  warrant?: WarrantInfoDto;
}
