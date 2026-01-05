/**
 * DTOs for Query Parameters
 *
 * These DTOs validate query parameters for GET endpoints.
 */

import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsUUID,
  IsDateString,
  IsBoolean,
} from 'class-validator';

/**
 * Time range options for statistics
 */
export enum StatisticsTimeRange {
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
}

/**
 * Quarantine status options
 */
export enum QuarantineStatusFilter {
  QUARANTINED = 'quarantined',
  PENDING_REVIEW = 'pending_review',
  RELEASED = 'released',
  TRANSFERRED = 'transferred',
}

/**
 * Audit event type filter
 */
export enum AuditEventTypeFilter {
  CSAM_DETECTED = 'csam_detected',
  CSAM_SCAN_CLEAN = 'csam_scan_clean',
  CSAM_INCIDENT = 'csam_incident',
  CONTENT_QUARANTINED = 'content_quarantined',
  LEGAL_HOLD_APPLIED = 'legal_hold_applied',
  LEGAL_HOLD_RELEASED = 'legal_hold_released',
  NCMEC_REPORT_SUBMITTED = 'ncmec_report_submitted',
  NCMEC_REPORT_FAILED = 'ncmec_report_failed',
  LAW_ENFORCEMENT_ACCESS = 'law_enforcement_access',
  USER_ACCOUNT_ACTION = 'user_account_action',
  ADMIN_ACTION = 'admin_action',
  SYSTEM_ERROR = 'system_error',
  DETECTION_FAILURE = 'detection_failure',
}

/**
 * Audit severity filter
 */
export enum AuditSeverityFilter {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
  ERROR = 'error',
}

/**
 * DTO for GET /api/moderation/user/:userId/violations
 * Get user violation history with pagination
 */
export class GetUserViolationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

/**
 * DTO for GET /api/csam/statistics
 * Get CSAM detection statistics
 */
export class GetStatisticsQueryDto {
  @IsOptional()
  @IsEnum(StatisticsTimeRange)
  timeRange?: StatisticsTimeRange = StatisticsTimeRange.DAY;
}

/**
 * DTO for GET /api/csam/quarantine/list
 * List quarantined content with filters
 */
export class ListQuarantineQueryDto {
  @IsOptional()
  @IsEnum(QuarantineStatusFilter)
  status?: QuarantineStatusFilter;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  reviewRequired?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

/**
 * DTO for GET /api/csam/audit/logs
 * Get audit logs with filters
 */
export class GetAuditLogsQueryDto {
  @IsOptional()
  @IsEnum(AuditEventTypeFilter)
  eventType?: AuditEventTypeFilter;

  @IsOptional()
  @IsEnum(AuditSeverityFilter)
  severity?: AuditSeverityFilter;

  @IsOptional()
  @IsUUID()
  detectionId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}

/**
 * DTO for GET /api/internal/moderation/users/:userId/history
 * Get user moderation history with pagination
 */
export class GetUserHistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
