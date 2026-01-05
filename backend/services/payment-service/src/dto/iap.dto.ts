import { IsString, IsOptional, IsIn } from 'class-validator';

/**
 * Valid IAP provider types
 */
export type IAPProvider = 'apple_iap' | 'google_play';

/**
 * DTO for validating an IAP receipt
 * POST /api/iap/validate
 *
 * Note: userId is extracted from the authenticated JWT token,
 * not from the request body, to prevent impersonation attacks.
 */
export class ValidateReceiptDto {
  @IsString()
  @IsIn(['apple_iap', 'google_play'], {
    message: 'Provider must be apple_iap or google_play',
  })
  provider: IAPProvider;

  @IsString()
  receipt: string;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  purchaseToken?: string;

  @IsOptional()
  @IsString()
  packageName?: string;
}

/**
 * DTO for restoring IAP purchases
 * POST /api/iap/restore
 *
 * Note: userId is extracted from the authenticated JWT token,
 * not from the request body, to prevent impersonation attacks.
 */
export class RestorePurchasesDto {
  @IsString()
  @IsIn(['apple_iap', 'google_play'], {
    message: 'Provider must be apple_iap or google_play',
  })
  provider: IAPProvider;

  @IsString()
  receipt: string;

  @IsOptional()
  @IsString()
  packageName?: string;
}
