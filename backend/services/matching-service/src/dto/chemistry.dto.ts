import { Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsString,
  IsArray,
  IsNumber,
  IsObject,
  IsEnum,
  IsDate,
  IsNotEmpty,
  ValidateNested,
  Min,
  Max,
  ArrayMinSize,
} from 'class-validator';

/**
 * Chemistry Matching DTOs
 *
 * Security Notes:
 * - User identity (userId) is NEVER accepted from request bodies; it is always
 *   derived from the authenticated user's JWT token in the auth middleware.
 * - Server-owned fields are not included to prevent mass assignment attacks.
 */

// ============================================================================
// Activity Log Entry DTO
// ============================================================================

export class ActivityLogEntryDto {
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsNumber()
  @Min(0)
  sessionDuration!: number;

  @IsNumber()
  @Min(0)
  actionsCount!: number;
}

// ============================================================================
// Message History Entry DTO
// ============================================================================

export class MessageHistoryEntryDto {
  @IsString()
  @IsNotEmpty()
  matchId!: string;

  @IsDate()
  @Type(() => Date)
  sentAt!: Date;

  @IsNumber()
  @Min(0)
  messageLength!: number;

  @IsBoolean()
  hasEmoji!: boolean;

  @IsBoolean()
  hasQuestion!: boolean;

  @IsBoolean()
  responseToPartner!: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  responseLatency?: number;
}

// ============================================================================
// Swipe History Entry DTO
// ============================================================================

export class SwipeHistoryEntryDto {
  @IsDate()
  @Type(() => Date)
  timestamp!: Date;

  @IsEnum(['left', 'right', 'super'])
  direction!: 'left' | 'right' | 'super';

  @IsNumber()
  @Min(0)
  viewDuration!: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  profileCompleteness!: number;
}

// ============================================================================
// Profile Interaction Entry DTO
// ============================================================================

export class ProfileInteractionEntryDto {
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @IsDate()
  @Type(() => Date)
  viewedAt!: Date;

  @IsNumber()
  @Min(0)
  viewDuration!: number;

  @IsArray()
  @IsString({ each: true })
  sectionsViewed!: string[];

  @IsEnum(['none', 'like', 'pass', 'super_like'])
  action!: 'none' | 'like' | 'pass' | 'super_like';
}

// ============================================================================
// Behavior Data DTO
// ============================================================================

export class BehaviorDataDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActivityLogEntryDto)
  activityLogs!: ActivityLogEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageHistoryEntryDto)
  messageHistory!: MessageHistoryEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SwipeHistoryEntryDto)
  swipeHistory!: SwipeHistoryEntryDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProfileInteractionEntryDto)
  profileInteractions!: ProfileInteractionEntryDto[];
}

// ============================================================================
// Build Chemistry Profile DTO
// ============================================================================

/**
 * Request body for building a chemistry profile.
 * POST /api/v1/matching/chemistry/profile
 *
 * Note: userId is derived from the JWT token, not from the request body.
 */
export class BuildChemistryProfileDto {
  @IsObject()
  @ValidateNested()
  @Type(() => BehaviorDataDto)
  behaviorData!: BehaviorDataDto;

  @IsOptional()
  @IsBoolean()
  forceRebuild?: boolean;
}

// ============================================================================
// Get Chemistry Score Query DTO
// ============================================================================

/**
 * Query parameters for getting top chemistry matches.
 * GET /api/v1/matching/chemistry/top-matches
 */
export class GetTopChemistryMatchesQueryDto {
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(50, { message: 'Limit cannot exceed 50' })
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt({ message: 'Minimum score must be an integer' })
  @Min(0, { message: 'Minimum score must be at least 0' })
  @Max(100, { message: 'Minimum score cannot exceed 100' })
  @Type(() => Number)
  minimumScore?: number = 75;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeExplanations?: boolean = true;
}

// ============================================================================
// Find Chemistry Matches DTO
// ============================================================================

/**
 * Request body for finding high chemistry matches from candidates.
 * POST /api/v1/matching/chemistry/find-matches
 */
export class FindChemistryMatchesDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'At least one candidate ID is required' })
  candidateIds!: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  minimumScore?: number = 75;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeExplanations?: boolean = true;
}

// ============================================================================
// Response DTOs
// ============================================================================

/**
 * Chemistry dimension scores response
 */
export interface ChemistryDimensionsResponseDto {
  rhythmSync: number;
  engagementMatch: number;
  personalityComplement: number;
  mysteryBalance: number;
  energyMatch: number;
  timingCompatibility: number;
  conversationFlow: number;
  emotionalResonance: number;
}

/**
 * Chemistry anti-pattern response
 */
export interface ChemistryAntiPatternResponseDto {
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  recommendation?: string;
}

/**
 * Chemistry score response
 * GET /api/v1/matching/chemistry/score/:matchId
 */
export interface ChemistryScoreResponseDto {
  matchId: string;
  overall: number;
  confidence: number;
  dimensions: ChemistryDimensionsResponseDto;
  sparkPotential: 'low' | 'medium' | 'high' | 'exceptional';
  antiPatterns: ChemistryAntiPatternResponseDto[];
  weights: {
    rhythmSync: number;
    engagementMatch: number;
    personalityComplement: number;
    mysteryBalance: number;
    energyMatch: number;
  };
}

/**
 * Chemistry explanation response
 * GET /api/v1/matching/chemistry/explain/:matchId
 */
export interface ChemistryExplanationDto {
  matchId: string;
  summary: string;
  highlights: string[];
  concerns: string[];
  tips: string[];
  iceBreakers: string[];
  factors: ChemistryFactorDto[];
}

/**
 * Chemistry factor detail
 */
export interface ChemistryFactorDto {
  factor: string;
  score: number;
  weight: number;
  positive: boolean;
  explanation: string;
}

/**
 * Chemistry profile response
 */
export interface ChemistryProfileResponseDto {
  userId: string;
  primaryPersonalityType: string;
  energyLevel: number;
  mysteryFactor: number;
  warmthFactor: number;
  dataQuality: 'insufficient' | 'low' | 'medium' | 'high';
  totalInteractions: number;
  lastCalculated: string;
}

/**
 * Top chemistry match item
 */
export interface TopChemistryMatchDto {
  matchId: string;
  score: ChemistryScoreResponseDto;
  explanation?: ChemistryExplanationDto;
  predictedOutcome: {
    likelyToMatch: number;
    likelyToMessage: number;
    likelyToHaveLongConversation: number;
    likelyToMeetUp: number;
    estimatedConversationDepth: 'surface' | 'moderate' | 'deep';
    estimatedResponseRate: 'low' | 'medium' | 'high';
  };
  calculatedAt: string;
}

/**
 * Top chemistry matches response
 * GET /api/v1/matching/chemistry/top-matches
 */
export interface TopChemistryMatchesResponseDto {
  matches: TopChemistryMatchDto[];
  totalCandidates: number;
  profilesWithInsufficientData: string[];
  calculationTime: number;
}

/**
 * Feature availability response
 */
export interface ChemistryAvailabilityResponseDto {
  available: boolean;
  reason?: string;
}
