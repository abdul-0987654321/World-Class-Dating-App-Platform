import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, Max, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * DTO for activating a boost.
 * POST /api/boosts/activate
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 *
 * Server-owned fields like credits, subscriptionTier are NOT accepted here.
 * The server will validate the user has sufficient credits/subscription.
 */
export class ActivateBoostDto {
  @IsNotEmpty({ message: 'Duration is required' })
  @IsInt({ message: 'Duration must be an integer (minutes)' })
  @Min(15, { message: 'Minimum boost duration is 15 minutes' })
  @Max(180, { message: 'Maximum boost duration is 180 minutes' })
  @Type(() => Number)
  duration: number;

  @IsOptional()
  @IsString({ message: 'Payment ID must be a string' })
  paymentId?: string;
}

/**
 * DTO for canceling an active boost.
 * POST /api/boosts/cancel
 *
 * Note: userId is derived from the authenticated user (JWT token),
 * not from the request body, preventing users from spoofing their identity.
 */
export class CancelBoostDto {
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}

/**
 * Query parameters for getting boost history.
 * GET /api/boosts/history
 */
export class BoostHistoryQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt({ message: 'Offset must be an integer' })
  @Min(0, { message: 'Offset cannot be negative' })
  @Type(() => Number)
  offset?: number = 0;
}
