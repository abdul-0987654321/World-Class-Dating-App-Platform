import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

/**
 * DTO for user registration
 */
export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password!: string;

  @IsString()
  @MinLength(2)
  displayName!: string;
}

/**
 * DTO for user login
 */
export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
