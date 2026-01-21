/**
 * Messaging Service DTOs
 *
 * This module exports all Data Transfer Objects (DTOs) used for request validation
 * in the messaging service. Each DTO uses class-validator decorators to ensure
 * type safety and input validation.
 *
 * IMPORTANT: These DTOs intentionally exclude server-owned fields to protect
 * against mass assignment vulnerabilities. Fields like id, createdAt, senderId,
 * status, etc. are managed exclusively by the server.
 */

// Message DTOs
export {
  SendMessageDto,
  UpdateMessageDto,
  DeleteMessageDto,
  UpdateMessageStatusDto,
  MarkMessageReadDto,
  MessageMetadataDto,
} from './message.dto';

// Conversation DTOs
export {
  CreateConversationDto,
  ConversationPaginationDto,
  GetMessagesQueryDto,
} from './conversation.dto';

// Typing Indicator DTOs
export { TypingIndicatorDto } from './typing.dto';

// Reaction DTOs
export { AddReactionDto, RemoveReactionDto } from './reaction.dto';

// Search DTOs
export { SearchMessagesDto, GetSharedMediaQueryDto } from './search.dto';

// Export DTOs
export { ExportChatDto, ExportFormat } from './export.dto';

// Calls DTOs
export {
  RequestCallDto,
  AcceptCallDto,
  RejectCallDto,
  EndCallDto,
  CallHistoryQueryDto,
  CallType,
} from './calls.dto';

// Encryption Keys DTOs
export {
  UploadKeysDto,
  ClaimPreKeysDto,
  CreateSessionKeyDto,
  UpdateSessionKeyDto,
  IdentityKeyDto,
  SignedPreKeyDto,
  OneTimePreKeyDto,
} from './encryption-keys.dto';

// Gifts DTOs
export { SendGiftDto, GiftHistoryQueryDto, GiftHistoryType } from './gifts.dto';

// Moderation DTOs
export { ReportContentDto, BlockUserDto, ReportReason } from './moderation.dto';

// Validation Middleware
export {
  validateBody,
  validateQuery,
  validateParams,
  ValidationOptions,
} from './validation.middleware';

// Engagement DTOs (Tier 2 Services)
export {
  // Vulnerability Window DTOs
  InitiateVulnerabilityWindowDto,
  DeclineVulnerabilityWindowDto,
  VulnerabilityWindowIdParams,
  ConversationIdParams,
  // Conversation Momentum DTOs
  MomentumParams,
  MomentumHistoryQueryDto,
  // Micro-Date DTOs
  ProposeMicroDateDto,
  AcceptMicroDateDto,
  DeclineMicroDateDto,
  MicroDateIdParams,
  UpcomingMicroDatesQueryDto,
  TimeSuggestionsQueryDto,
  // Ghosting Prevention DTOs
  GhostingRiskParams,
  AtRiskConversationsQueryDto,
  // Response interfaces
  ApiResponse,
  VulnerabilityWindowResponse,
  ThemeResponse,
  MomentumResponse,
  MicroDateResponse,
  GhostingRiskResponse,
  AtRiskConversationResponse,
} from './engagement.dto';
