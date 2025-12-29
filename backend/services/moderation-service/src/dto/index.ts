/**
 * Moderation Service DTOs
 *
 * This module exports all DTOs for request validation in the moderation service.
 * DTOs use class-validator decorators for validation and class-transformer for transformation.
 *
 * Security Notes:
 * - Server-owned fields (id, createdAt, moderatorId, adminId) are NOT included in DTOs
 * - adminId/moderatorId should be extracted from JWT tokens, not request bodies
 * - Use the globalValidationPipe from @flamoral/backend-shared for validation
 */

// Moderation endpoint DTOs (moderator/admin actions)
export {
  ModerateImageDto,
  ModerateTextDto,
  AdminSuspendUserDto,
  AdminUnsuspendUserDto,
  AdminBanUserDto,
  AdminUnbanUserDto,
} from './moderation.dto';

// CSAM detection endpoint DTOs
export {
  CSAMDetectDto,
  QuarantineForReviewDto,
  AuditVerifyDto,
  GrantLawEnforcementAccessDto,
  WarrantInfoDto,
} from './csam.dto';

// Internal service-to-service endpoint DTOs
export {
  InternalModerateContentDto,
  FlagContentDto,
  BulkModerateDto,
  BulkModerateItemDto,
  InternalContentType,
  ModerationPriority,
} from './internal.dto';

// Query parameter DTOs
export {
  GetUserViolationsQueryDto,
  GetStatisticsQueryDto,
  ListQuarantineQueryDto,
  GetAuditLogsQueryDto,
  GetUserHistoryQueryDto,
  StatisticsTimeRange,
  QuarantineStatusFilter,
  AuditEventTypeFilter,
  AuditSeverityFilter,
} from './query.dto';

// Validation middleware for Express
export {
  validateBody,
  validateQuery,
  validateParams,
} from './validation.middleware';
