import {
  IsEmail,
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
  IsBoolean,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for consent information during registration
 */
export class ConsentsDto {
  @ApiProperty({ description: 'Terms of Service acceptance' })
  @IsBoolean()
  terms: boolean;

  @ApiProperty({ description: 'Privacy Policy acceptance' })
  @IsBoolean()
  privacy: boolean;

  @ApiPropertyOptional({ description: 'Marketing emails opt-in' })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;
}

/**
 * DTO for user registration
 */
export class RegisterDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    description:
      'Password (minimum 12 characters, must contain uppercase, lowercase, number, and special character)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @ApiProperty({ description: 'User first name' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(1, { message: 'First name must be at least 1 character' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName: string;

  @ApiPropertyOptional({ description: 'User last name (optional)' })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @ApiProperty({ description: 'Date of birth in YYYY-MM-DD format' })
  @IsNotEmpty({ message: 'Date of birth is required' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Date of birth must be in YYYY-MM-DD format' })
  dateOfBirth: string;

  @ApiProperty({ description: 'User gender' })
  @IsNotEmpty({ message: 'Gender is required' })
  @IsString()
  @MaxLength(50)
  gender: string;

  @ApiProperty({ description: 'User consent information' })
  @IsObject()
  @ValidateNested()
  @Type(() => ConsentsDto)
  consents: ConsentsDto;
}

/**
 * DTO for device information
 */
export class DeviceDataDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  userAgent?: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({ description: 'Device information for session tracking' })
  @IsOptional()
  deviceData?: DeviceDataDto;
}

/**
 * DTO for token refresh
 */
export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  refreshToken: string;
}

/**
 * DTO for email verification
 */
export class VerifyEmailDto {
  @ApiProperty({ description: 'Verification token from email' })
  @IsString()
  @IsNotEmpty({ message: 'Verification token is required' })
  token: string;
}

/**
 * DTO for resend verification email
 */
export class ResendVerificationDto {
  @ApiProperty({ description: 'Email address to send verification to' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * DTO for forgot password
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address for password reset' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}

/**
 * DTO for reset password
 */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token from email' })
  @IsString()
  @IsNotEmpty({ message: 'Reset token is required' })
  token: string;

  @ApiProperty({ description: 'New password' })
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword: string;
}
