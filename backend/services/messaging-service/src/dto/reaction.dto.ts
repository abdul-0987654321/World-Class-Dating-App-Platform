import { IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';

/**
 * DTO for adding a reaction to a message
 * POST /api/messages/:messageId/reactions
 *
 * Server-owned fields NOT included:
 * - messageId (from URL param)
 * - userId (extracted from auth token)
 * - createdAt (server timestamp)
 */
export class AddReactionDto {
  @IsUUID()
  conversationId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10)
  @Matches(/^[\p{Emoji}\p{Emoji_Component}]+$/u, {
    message: 'Emoji must be a valid emoji character or sequence',
  })
  emoji: string;
}

/**
 * DTO for removing a reaction from a message
 * DELETE /api/messages/:messageId/reactions
 */
export class RemoveReactionDto {
  @IsUUID()
  conversationId: string;
}
