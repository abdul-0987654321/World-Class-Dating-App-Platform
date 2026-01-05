/**
 * Calendar DTOs for request/response validation
 */

import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDate,
  IsObject,
  ValidateNested,
  Min,
  Max,
  IsArray,
  IsDateString,
  IsLatitude,
  IsLongitude,
} from 'class-validator';

import {
  CalendarProvider,
  VenueCategory,
  ReminderTiming,
  DateProposalStatus,
  ScheduledDateStatus,
} from '../types/calendar.types';

// ============================================================================
// CALENDAR CONNECTION DTOs
// ============================================================================

export class ConnectCalendarDto {
  @IsEnum(CalendarProvider)
  provider!: CalendarProvider;

  @IsString()
  authCode!: string;

  @IsString()
  @IsOptional()
  redirectUri?: string;
}

export class DisconnectCalendarDto {
  @IsEnum(CalendarProvider)
  provider!: CalendarProvider;
}

export class UpdateAvailabilitySharingDto {
  @IsEnum(CalendarProvider)
  provider!: CalendarProvider;

  @IsBoolean()
  shareAvailability!: boolean;
}

// ============================================================================
// AVAILABILITY DTOs
// ============================================================================

export class GetAvailabilityDto {
  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsString()
  @IsOptional()
  timezone?: string;
}

export class CheckTimeAvailabilityDto {
  @IsDateString()
  datetime!: string;

  @IsNumber()
  @Min(15)
  @Max(480) // 8 hours max
  @IsOptional()
  durationMinutes?: number;
}

// ============================================================================
// DATE PROPOSAL DTOs
// ============================================================================

export class VenueSuggestionDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  name!: string;

  @IsEnum(VenueCategory)
  category!: VenueCategory;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  country!: string;

  @IsString()
  @IsOptional()
  postalCode?: string;

  @IsNumber()
  @IsLatitude()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsLongitude()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  placeId?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsNumber()
  @Min(0)
  @Max(4)
  @IsOptional()
  priceLevel?: number;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

export class ProposeDateDto {
  @IsString()
  conversationId!: string;

  @IsDateString()
  proposedDatetime!: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsNumber()
  @Min(15)
  @Max(480)
  @IsOptional()
  duration?: number;

  @ValidateNested()
  @Type(() => VenueSuggestionDto)
  @IsOptional()
  venue?: VenueSuggestionDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CounterProposalDto {
  @IsString()
  proposalId!: string;

  @IsDateString()
  newDatetime!: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsNumber()
  @Min(15)
  @Max(480)
  @IsOptional()
  duration?: number;

  @ValidateNested()
  @Type(() => VenueSuggestionDto)
  @IsOptional()
  venue?: VenueSuggestionDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AcceptProposalDto {
  @IsString()
  proposalId!: string;
}

export class DeclineProposalDto {
  @IsString()
  proposalId!: string;
}

export class CancelProposalDto {
  @IsString()
  proposalId!: string;
}

// ============================================================================
// SCHEDULED DATE DTOs
// ============================================================================

export class CancelScheduledDateDto {
  @IsString()
  scheduledDateId!: string;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class SyncToCalendarDto {
  @IsString()
  scheduledDateId!: string;

  @IsEnum(CalendarProvider)
  @IsOptional()
  provider?: CalendarProvider;

  @IsBoolean()
  @IsOptional()
  addReminders?: boolean;
}

export class SubmitDateFeedbackDto {
  @IsString()
  scheduledDateId!: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsString()
  @IsOptional()
  comment?: string;
}

// ============================================================================
// VENUE SEARCH DTOs
// ============================================================================

export class SearchVenuesDto {
  @IsNumber()
  @IsLatitude()
  latitude!: number;

  @IsNumber()
  @IsLongitude()
  longitude!: number;

  @IsString()
  @IsOptional()
  query?: string;

  @IsEnum(VenueCategory)
  @IsOptional()
  category?: VenueCategory;

  @IsNumber()
  @Min(100)
  @Max(50000)
  @IsOptional()
  radius?: number;

  @IsNumber()
  @Min(0)
  @Max(5)
  @IsOptional()
  minRating?: number;

  @IsNumber()
  @Min(1)
  @Max(4)
  @IsOptional()
  maxPriceLevel?: number;

  @IsBoolean()
  @IsOptional()
  openNow?: boolean;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;
}

export class RecommendVenuesDto {
  @IsNumber()
  @IsLatitude()
  latitude!: number;

  @IsNumber()
  @IsLongitude()
  longitude!: number;

  @IsString()
  @IsOptional()
  dateType?: 'first_date' | 'casual' | 'romantic' | 'activity';

  @IsString()
  @IsOptional()
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';

  @IsString()
  @IsOptional()
  budget?: 'low' | 'medium' | 'high';
}

export class BookmarkVenueDto {
  @ValidateNested()
  @Type(() => VenueSuggestionDto)
  venue!: VenueSuggestionDto;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GetBookmarksDto {
  @IsEnum(VenueCategory)
  @IsOptional()
  category?: VenueCategory;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}

// ============================================================================
// REMINDER DTOs
// ============================================================================

export class CreateRemindersDto {
  @IsString()
  scheduledDateId!: string;

  @IsArray()
  @IsEnum(ReminderTiming, { each: true })
  @IsOptional()
  timings?: ReminderTiming[];
}

export class AddCustomReminderDto {
  @IsString()
  scheduledDateId!: string;

  @IsNumber()
  @Min(5)
  @Max(10080) // 1 week
  minutesBefore!: number;
}

export class RemoveReminderDto {
  @IsString()
  reminderId!: string;

  @IsString()
  scheduledDateId!: string;
}

// ============================================================================
// PAGINATION DTOs
// ============================================================================

export class PaginationDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  offset?: number;
}

export class GetProposalsDto extends PaginationDto {
  @IsString()
  conversationId!: string;

  @IsEnum(DateProposalStatus)
  @IsOptional()
  status?: DateProposalStatus;
}

export class GetScheduledDatesDto extends PaginationDto {
  @IsEnum(ScheduledDateStatus)
  @IsOptional()
  status?: ScheduledDateStatus;

  @IsBoolean()
  @IsOptional()
  upcoming?: boolean;
}
