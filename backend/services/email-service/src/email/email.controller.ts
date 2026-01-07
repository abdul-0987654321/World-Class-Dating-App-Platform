import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IsString, IsEmail, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { EmailService, MatchData, EmailResult } from './email.service';

// DTOs for request validation
class SendWelcomeEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  name: string;
}

class SendPasswordResetDto {
  @IsEmail()
  to: string;

  @IsString()
  token: string;
}

class MatchDataDto implements MatchData {
  @IsString()
  matchId: string;

  @IsString()
  matchName: string;

  @IsString()
  @IsOptional()
  matchPhotoUrl?: string;

  @IsString()
  matchedAt: string;
}

class SendMatchNotificationDto {
  @IsEmail()
  to: string;

  @IsObject()
  @ValidateNested()
  @Type(() => MatchDataDto)
  matchData: MatchDataDto;
}

class SendVerificationEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  code: string;
}

class SendGenericEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  subject: string;

  @IsString()
  html: string;

  @IsString()
  @IsOptional()
  text?: string;
}

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('welcome')
  @HttpCode(HttpStatus.OK)
  async sendWelcomeEmail(@Body() dto: SendWelcomeEmailDto): Promise<EmailResult> {
    return this.emailService.sendWelcomeEmail(dto.to, dto.name);
  }

  @Post('password-reset')
  @HttpCode(HttpStatus.OK)
  async sendPasswordReset(@Body() dto: SendPasswordResetDto): Promise<EmailResult> {
    return this.emailService.sendPasswordReset(dto.to, dto.token);
  }

  @Post('match-notification')
  @HttpCode(HttpStatus.OK)
  async sendMatchNotification(@Body() dto: SendMatchNotificationDto): Promise<EmailResult> {
    return this.emailService.sendMatchNotification(dto.to, dto.matchData);
  }

  @Post('verification')
  @HttpCode(HttpStatus.OK)
  async sendVerificationEmail(@Body() dto: SendVerificationEmailDto): Promise<EmailResult> {
    return this.emailService.sendVerificationEmail(dto.to, dto.code);
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendEmail(@Body() dto: SendGenericEmailDto): Promise<EmailResult> {
    return this.emailService.sendEmail({
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
      text: dto.text,
    });
  }
}
