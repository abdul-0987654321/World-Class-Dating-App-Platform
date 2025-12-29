import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../types';

/**
 * DTO for searching messages
 * POST /api/messages/search
 *
 * Server-owned fields NOT included:
 * - userId (extracted from auth token)
 */
export class SearchMessagesDto {
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  query?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * DTO for getting shared media in a conversation
 * GET /api/conversations/:conversationId/media
 */
export class GetSharedMediaQueryDto {
  @IsOptional()
  @IsEnum(['image', 'video', 'audio', 'file'])
  type?: 'image' | 'video' | 'audio' | 'file';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 50;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}
