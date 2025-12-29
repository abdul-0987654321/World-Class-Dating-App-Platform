import { IsOptional, IsEnum, IsDateString, IsBoolean } from 'class-validator';

/**
 * Supported export formats
 */
export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  TXT = 'txt',
}

/**
 * DTO for exporting chat conversation
 * POST /api/conversations/:conversationId/export
 *
 * Server-owned fields NOT included:
 * - conversationId (from URL param)
 * - userId (extracted from auth token for access verification)
 */
export class ExportChatDto {
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  includeMedia?: boolean = false;
}
