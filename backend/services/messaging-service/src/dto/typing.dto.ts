import { IsBoolean } from 'class-validator';

/**
 * DTO for sending typing indicator
 * POST /api/conversations/:conversationId/typing
 *
 * Server-owned fields NOT included:
 * - conversationId (from URL param)
 * - userId (extracted from auth token)
 * - timestamp (server timestamp)
 */
export class TypingIndicatorDto {
  @IsBoolean()
  isTyping: boolean;
}
