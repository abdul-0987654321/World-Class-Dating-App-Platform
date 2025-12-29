import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsEmail,
  IsUUID,
  IsIn,
  IsObject,
  IsPositive,
  Min,
  Max,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a payment intent
 * POST /api/payments/create-intent
 */
export class CreatePaymentIntentDto {
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'Currency must be a 3-letter code' })
  currency?: string = 'usd';

  @IsString()
  customerId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, string>;
}

/**
 * DTO for purchasing a subscription
 * POST /api/payments/subscription/create
 */
export class PurchaseSubscriptionDto {
  @IsUUID('4', { message: 'Invalid user ID format' })
  userId: string;

  @IsString()
  @IsIn(['basic', 'mid', 'ultra'], {
    message: 'Tier must be one of: basic, mid, ultra',
  })
  tier: 'basic' | 'mid' | 'ultra';

  @IsString()
  priceId: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  paymentMethodId: string;

  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Trial days must be at least 0' })
  @Max(90, { message: 'Trial days must not exceed 90' })
  @Type(() => Number)
  trialDays?: number;
}

/**
 * DTO for canceling a subscription
 * POST /api/payments/subscription/cancel
 */
export class CancelSubscriptionDto {
  @IsString()
  subscriptionId: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  immediately?: boolean = false;
}

/**
 * DTO for adding a payment method
 * POST /api/payments/methods/add
 */
export class AddPaymentMethodDto {
  @IsString()
  customerId: string;

  @IsString()
  paymentMethodId: string;
}

/**
 * DTO for processing a refund
 * POST /api/payments/refund
 */
export class ProcessRefundDto {
  @IsString()
  paymentIntentId: string;

  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Amount must be a positive number' })
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString()
  @IsIn(['duplicate', 'fraudulent', 'requested_by_customer'], {
    message: 'Invalid refund reason',
  })
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

/**
 * DTO for customer ID parameter
 * GET /api/payments/methods/:customerId
 */
export class CustomerIdParamDto {
  @IsString()
  customerId: string;
}
