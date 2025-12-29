import { IsOptional, IsInt, IsEnum, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MatchStatus } from '../types';

/**
 * Query parameters for getting matches.
 * GET /api/matches
 */
export class GetMatchesQueryDto {
  @IsOptional()
  @IsEnum(MatchStatus, {
    message: 'Status must be one of: pending, matched, unmatched, blocked',
  })
  status?: MatchStatus;
}

/**
 * Query parameters for getting recent matches.
 * GET /api/matches/recent
 */
export class RecentMatchesQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  @Type(() => Number)
  limit?: number = 10;
}
