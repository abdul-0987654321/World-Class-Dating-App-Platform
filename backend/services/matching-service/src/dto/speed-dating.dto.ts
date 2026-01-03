/**
 * Speed Dating DTOs
 * Data Transfer Objects for speed dating request validation
 */

import {
  IsString,
  IsUUID,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SpeedDatingEventStatus } from '../domain/entities/SpeedDatingEvent.entity';

/**
 * Query parameters for getting upcoming events
 * GET /api/v1/speed-dating/events
 */
export class GetEventsQueryDto {
  @IsOptional()
  @IsEnum(SpeedDatingEventStatus, {
    message: 'Status must be one of: upcoming, active, completed, cancelled',
  })
  status?: SpeedDatingEventStatus;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * Join an event
 * POST /api/v1/speed-dating/join
 */
export class JoinEventDto {
  @IsUUID()
  eventId: string;
}

/**
 * Leave an event
 * DELETE /api/v1/speed-dating/leave
 */
export class LeaveEventDto {
  @IsUUID()
  eventId: string;
}

/**
 * Check in to an event
 * POST /api/v1/speed-dating/check-in
 */
export class CheckInDto {
  @IsUUID()
  eventId: string;
}

/**
 * Record interest in a participant
 * POST /api/v1/speed-dating/interest
 */
export class RecordInterestDto {
  @IsUUID()
  eventId: string;

  @IsUUID()
  targetUserId: string;

  @IsBoolean()
  interested: boolean;
}

/**
 * Get matches from an event
 * GET /api/v1/speed-dating/matches
 */
export class GetMatchesQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

/**
 * Get current round info
 * GET /api/v1/speed-dating/events/:eventId/current-round
 */
export class GetCurrentRoundDto {
  @IsUUID()
  eventId: string;
}

/**
 * Create a new event (admin)
 * POST /api/v1/speed-dating/events
 */
export class CreateEventDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  name: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsInt()
  @Min(4)
  @Max(100)
  maxParticipants: number;

  @IsInt()
  @Min(60) // minimum 1 minute
  @Max(600) // maximum 10 minutes
  roundDuration: number;

  @IsInt()
  @Min(30) // minimum 30 seconds
  @Max(300) // maximum 5 minutes
  breakDuration: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  theme?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverImage?: string;
}

/**
 * Rate a partner after a round
 * POST /api/v1/speed-dating/events/:eventId/rounds/:roundId/rate
 */
export class RatePartnerDto {
  @IsUUID()
  partnerId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  feedback?: string;
}

/**
 * Report inappropriate behavior
 * POST /api/v1/speed-dating/events/:eventId/report
 */
export class ReportPartnerDto {
  @IsUUID()
  roundId: string;

  @IsUUID()
  partnerId: string;

  @IsString()
  @MinLength(5)
  @MaxLength(100)
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  details?: string;
}
