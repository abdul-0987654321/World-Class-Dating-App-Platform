import { Type } from 'class-transformer';
import { IsOptional, IsString, MinLength, MaxLength, IsDate } from 'class-validator';

/**
 * DTO for updating user profile information.
 * Note: Server-owned fields (role, isVerified, subscriptionTier, etc.)
 * are not included and will be rejected if provided.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  birthDate?: Date;
}
