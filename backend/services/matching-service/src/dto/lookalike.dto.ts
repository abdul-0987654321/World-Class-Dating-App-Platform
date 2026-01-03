/**
 * Lookalike Matching DTOs
 *
 * Data Transfer Objects for lookalike matching request validation.
 * Uses class-validator decorators for validation.
 */

import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsUrl,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for lookalike search request.
 * POST /api/v1/lookalike/search
 *
 * The image can be provided as:
 * - multipart/form-data file upload
 * - base64 encoded string in the 'image' field
 */
export class LookalikeSearchDto {
  @IsOptional()
  @IsString({ message: 'Image must be a base64 encoded string' })
  image?: string;

  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsNumber({}, { message: 'minSimilarity must be a number' })
  @Min(0.5, { message: 'minSimilarity must be at least 0.5' })
  @Max(1.0, { message: 'minSimilarity cannot exceed 1.0' })
  @Type(() => Number)
  minSimilarity?: number = 0.7;
}

/**
 * DTO for storing a face embedding from a profile photo.
 * POST /api/v1/lookalike/embeddings
 */
export class StoreEmbeddingDto {
  @IsString({ message: 'Photo URL is required' })
  @IsUrl({}, { message: 'Photo URL must be a valid URL' })
  @MaxLength(1024, { message: 'Photo URL cannot exceed 1024 characters' })
  photoUrl: string;

  @IsOptional()
  @IsBoolean({ message: 'isPrimary must be a boolean' })
  isPrimary?: boolean = false;
}

/**
 * DTO for embedding ID parameter.
 * DELETE /api/v1/lookalike/embeddings/:embeddingId
 */
export class EmbeddingIdParamDto {
  @IsUUID('4', { message: 'Embedding ID must be a valid UUID' })
  embeddingId: string;
}

/**
 * Query parameters for getting embeddings.
 * GET /api/v1/lookalike/embeddings
 */
export class GetEmbeddingsQueryDto {
  @IsOptional()
  @IsBoolean({ message: 'includePrimary must be a boolean' })
  @Type(() => Boolean)
  includePrimary?: boolean = true;
}

/**
 * Query parameters for search history.
 * GET /api/v1/lookalike/history
 */
export class SearchHistoryQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  @Type(() => Number)
  limit?: number = 10;
}

/**
 * DTO for image analysis request.
 * POST /api/v1/lookalike/analyze
 */
export class AnalyzeImageDto {
  @IsOptional()
  @IsString({ message: 'Image must be a base64 encoded string' })
  image?: string;
}
