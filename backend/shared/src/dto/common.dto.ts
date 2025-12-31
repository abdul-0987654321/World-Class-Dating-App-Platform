import { IsUUID, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Pagination DTO for list endpoints
 */
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * ID parameter DTO for endpoints with :id param
 */
export class IdParamDto {
  @IsUUID()
  id!: string;
}

/**
 * Server-owned fields that should never be accepted from client input.
 * These fields are managed exclusively by the server and should be
 * stripped or rejected from any incoming requests.
 */
export const SERVER_OWNED_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'role',
  'isAdmin',
  'isModerator',
  'isOperator',
  'subscriptionTier',
  'credits',
  'isVerified',
  'tenantId',
  'ownerId',
  'status',
  'approved',
] as const;

export type ServerOwnedField = (typeof SERVER_OWNED_FIELDS)[number];
