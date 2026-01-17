import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Enum for message types
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  GIF = 'gif',
  VOICE = 'voice',
}

/**
 * Enum for message status
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

/**
 * DTO for creating a new conversation
 */
export class CreateConversationDto {
  @ApiProperty({ description: 'ID of the other participant' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  participantId: string;
}

/**
 * DTO for sending a message
 */
export class SendMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message content must not exceed 5000 characters' })
  content: string;

  @ApiPropertyOptional({ description: 'Message type', enum: MessageType, default: MessageType.TEXT })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @ApiPropertyOptional({ description: 'Reply to message ID' })
  @IsOptional()
  @IsString()
  @IsUUID()
  replyToId?: string;
}

/**
 * DTO for updating a message
 */
export class UpdateMessageDto {
  @ApiProperty({ description: 'Updated message content' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000, { message: 'Message content must not exceed 5000 characters' })
  content: string;
}

/**
 * DTO for updating message status
 */
export class UpdateMessageStatusDto {
  @ApiProperty({ description: 'New message status', enum: MessageStatus })
  @IsEnum(MessageStatus)
  status: MessageStatus;

  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;
}

/**
 * DTO for deleting a message
 */
export class DeleteMessageDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  conversationId: string;

  @ApiPropertyOptional({ description: 'Delete for everyone (requires being the sender)' })
  @IsOptional()
  @IsBoolean()
  deleteForEveryone?: boolean;
}
