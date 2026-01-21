import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProfileService,
  Profile,
  ProfilePhoto,
  UserPreferences,
  ProfileCompleteness,
} from './profile.service';
import {
  BlindProfileService,
  BlindProfileSettings,
  BlindProfile,
  RevealStage,
} from './blind-profile.service';
import {
  EmotionalAvailabilityService,
  EmotionalState,
  AvailabilityWindow,
  UserEmotionalProfile,
  EmotionalCompatibility,
  EmotionalStateHistoryEntry,
  EmotionalPrivacySettings,
} from './emotional-availability.service';
import {
  JwtAuthGuard,
  AuthenticatedRequest,
  verifyOwnership,
} from '../guards/jwt-auth.guard';

// =============================================================================
// DTOs for Profile Operations
// =============================================================================

class LocationDto {
  @IsString()
  city: string;

  @IsString()
  country: string;

  @IsOptional()
  @ValidateNested()
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

class UpdateProfileDto {
  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  @Min(18)
  @Max(120)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsNumber()
  height?: number;
}

class AgeRangeDto {
  @IsNumber()
  @Min(18)
  min: number;

  @IsNumber()
  @Max(120)
  max: number;
}

class UpdatePreferencesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => AgeRangeDto)
  ageRange?: AgeRangeDto;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  distance?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  genderPreference?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relationshipGoals?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dealbreakers?: string[];

  @IsOptional()
  showOnlineStatus?: boolean;

  @IsOptional()
  showDistance?: boolean;

  @IsOptional()
  showAge?: boolean;
}

class AddPhotoDto {
  @IsString()
  url: string;

  @IsString()
  thumbnailUrl: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  @IsNumber()
  order?: number;

  @IsOptional()
  isVerified?: boolean;
}

// =============================================================================
// DTOs for Blind Profile Mode
// =============================================================================

class EnableBlindModeDto {
  @IsOptional()
  @IsEnum(['automatic', 'manual', 'hybrid'])
  strategy?: 'automatic' | 'manual' | 'hybrid';
}

// =============================================================================
// DTOs for Emotional Availability
// =============================================================================

const EMOTIONAL_STATES = [
  'open_to_connect',
  'casual_chat',
  'deep_conversations',
  'need_space',
  'feeling_adventurous',
  'seeking_comfort',
] as const;

class SetEmotionalStateDto {
  @IsEnum(EMOTIONAL_STATES, {
    message: `state must be one of: ${EMOTIONAL_STATES.join(', ')}`,
  })
  state: EmotionalState;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440) // Max 24 hours
  duration?: number;

  @IsOptional()
  @IsBoolean()
  autoExpire?: boolean;
}

class UpdateEmotionalPrivacyDto {
  @IsOptional()
  @IsEnum(['public', 'matches_only', 'hidden'])
  visibility?: 'public' | 'matches_only' | 'hidden';

  @IsOptional()
  @IsBoolean()
  anonymousMode?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  historyRetentionDays?: number;

  @IsOptional()
  @IsBoolean()
  shareWithMatches?: boolean;
}

class GetStateHistoryQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;
}

// =============================================================================
// Response Interfaces
// =============================================================================

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// =============================================================================
// Profile Controller
// =============================================================================

@Controller('api/v1/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(
    private readonly profileService: ProfileService,
    private readonly blindProfileService: BlindProfileService,
    private readonly emotionalAvailabilityService: EmotionalAvailabilityService
  ) {}

  // ===========================================================================
  // Core Profile Endpoints
  // ===========================================================================

  @Get(':userId')
  async getProfile(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<Profile>> {
    // Users can view their own profile, admins can view any
    verifyOwnership(req.user, userId);

    const profile = await this.profileService.getProfile(userId);
    return {
      success: true,
      data: profile,
    };
  }

  @Put(':userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<Profile>> {
    verifyOwnership(req.user, userId);

    const profile = await this.profileService.updateProfile(userId, updateProfileDto);
    return {
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    };
  }

  @Get(':userId/photos')
  async getProfilePhotos(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<ProfilePhoto[]>> {
    verifyOwnership(req.user, userId);

    const photos = await this.profileService.getProfilePhotos(userId);
    return {
      success: true,
      data: photos,
    };
  }

  @Post(':userId/photos')
  @HttpCode(HttpStatus.CREATED)
  async addProfilePhoto(
    @Param('userId') userId: string,
    @Body() addPhotoDto: AddPhotoDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<ProfilePhoto>> {
    verifyOwnership(req.user, userId);

    const photo = await this.profileService.addProfilePhoto(userId, {
      url: addPhotoDto.url,
      thumbnailUrl: addPhotoDto.thumbnailUrl,
      isPrimary: addPhotoDto.isPrimary || false,
      order: addPhotoDto.order || 0,
      isVerified: addPhotoDto.isVerified || false,
    });
    return {
      success: true,
      data: photo,
      message: 'Photo added successfully',
    };
  }

  @Delete(':userId/photos/:photoId')
  @HttpCode(HttpStatus.OK)
  async deleteProfilePhoto(
    @Param('userId') userId: string,
    @Param('photoId') photoId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<void>> {
    verifyOwnership(req.user, userId);

    await this.profileService.deleteProfilePhoto(userId, photoId);
    return {
      success: true,
      message: 'Photo deleted successfully',
    };
  }

  @Get(':userId/preferences')
  async getPreferences(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<UserPreferences>> {
    verifyOwnership(req.user, userId);

    const profile = await this.profileService.getProfile(userId);
    return {
      success: true,
      data: profile.preferences,
    };
  }

  @Put(':userId/preferences')
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<UserPreferences>> {
    verifyOwnership(req.user, userId);

    const preferences = await this.profileService.updatePreferences(
      userId,
      updatePreferencesDto
    );
    return {
      success: true,
      data: preferences,
      message: 'Preferences updated successfully',
    };
  }

  @Get(':userId/completeness')
  async getProfileCompleteness(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<ProfileCompleteness>> {
    verifyOwnership(req.user, userId);

    const completeness = await this.profileService.getProfileCompleteness(userId);
    return {
      success: true,
      data: completeness,
    };
  }

  // ===========================================================================
  // Blind Profile Mode Endpoints
  // ===========================================================================

  /**
   * Enable blind profile mode for the authenticated user
   * POST /api/v1/profile/blind-mode/enable
   */
  @Post('blind-mode/enable')
  @HttpCode(HttpStatus.OK)
  async enableBlindMode(
    @Body() dto: EnableBlindModeDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<BlindProfileSettings>> {
    const userId = req.user.userId;

    // Check if feature is available for this user
    if (!this.blindProfileService.isFeatureAvailable(userId)) {
      throw new ForbiddenException(
        'Blind profile mode is not available for your account. This feature is currently in limited rollout.'
      );
    }

    const settings = this.blindProfileService.enableBlindMode(
      userId,
      dto.strategy || 'automatic'
    );

    if (!settings) {
      throw new BadRequestException('Failed to enable blind mode');
    }

    return {
      success: true,
      data: settings,
      message: 'Blind profile mode enabled successfully',
    };
  }

  /**
   * Disable blind profile mode for the authenticated user
   * POST /api/v1/profile/blind-mode/disable
   */
  @Post('blind-mode/disable')
  @HttpCode(HttpStatus.OK)
  async disableBlindMode(
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<void>> {
    const userId = req.user.userId;

    this.blindProfileService.disableBlindMode(userId);

    return {
      success: true,
      message: 'Blind profile mode disabled successfully',
    };
  }

  /**
   * Get blind profile settings for the authenticated user
   * GET /api/v1/profile/blind-mode/settings
   */
  @Get('blind-mode/settings')
  async getBlindModeSettings(
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<BlindProfileSettings | null>> {
    const userId = req.user.userId;

    const isAvailable = this.blindProfileService.isFeatureAvailable(userId);
    const settings = this.blindProfileService.getSettings(userId);

    return {
      success: true,
      data: settings,
      message: isAvailable
        ? undefined
        : 'Blind profile mode is not available for your account',
    };
  }

  /**
   * Get a user's blind profile (progressive reveal based on conversation)
   * GET /api/v1/profile/:userId/blind
   */
  @Get(':userId/blind')
  async getBlindProfile(
    @Param('userId') userId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<BlindProfile | Profile>> {
    const viewerId = req.user.userId;

    // Check if the profile owner has blind mode enabled
    if (!this.blindProfileService.isBlindModeEnabled(userId)) {
      // Return full profile if blind mode is not enabled
      const profile = await this.profileService.getProfile(userId);
      return {
        success: true,
        data: profile,
        message: 'User has not enabled blind profile mode',
      };
    }

    // Get the full profile to transform
    const fullProfile = await this.profileService.getProfile(userId);

    // Get the blind profile view for this viewer
    const blindProfile = this.blindProfileService.getBlindProfile(
      fullProfile,
      viewerId
    );

    return {
      success: true,
      data: blindProfile,
    };
  }

  /**
   * Request to reveal a profile (viewer requests full profile from owner)
   * POST /api/v1/profile/blind-mode/request-reveal/:profileId
   */
  @Post('blind-mode/request-reveal/:profileId')
  @HttpCode(HttpStatus.OK)
  async requestReveal(
    @Param('profileId') profileId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<{ requested: boolean; message: string }>> {
    const viewerId = req.user.userId;

    // Cannot request reveal on your own profile
    if (viewerId === profileId) {
      throw new BadRequestException('Cannot request reveal on your own profile');
    }

    const success = this.blindProfileService.requestReveal(viewerId, profileId);

    if (!success) {
      return {
        success: false,
        data: {
          requested: false,
          message:
            'Cannot request reveal yet. You need at least 3 messages exchanged before requesting a reveal.',
        },
      };
    }

    return {
      success: true,
      data: {
        requested: true,
        message: 'Reveal request sent successfully',
      },
    };
  }

  /**
   * Grant reveal to a viewer (profile owner approves reveal request)
   * POST /api/v1/profile/blind-mode/grant-reveal/:viewerId
   */
  @Post('blind-mode/grant-reveal/:viewerId')
  @HttpCode(HttpStatus.OK)
  async grantReveal(
    @Param('viewerId') viewerId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<{ granted: boolean; message: string }>> {
    const profileOwnerId = req.user.userId;

    // Cannot grant reveal to yourself
    if (profileOwnerId === viewerId) {
      throw new BadRequestException('Cannot grant reveal to yourself');
    }

    const success = this.blindProfileService.grantReveal(profileOwnerId, viewerId);

    if (!success) {
      return {
        success: false,
        data: {
          granted: false,
          message: 'No pending reveal request from this user',
        },
      };
    }

    return {
      success: true,
      data: {
        granted: true,
        message: 'Reveal granted successfully',
      },
    };
  }

  // ===========================================================================
  // Emotional Availability Endpoints
  // ===========================================================================

  /**
   * Set the authenticated user's emotional state
   * PUT /api/v1/profile/emotional-state
   */
  @Put('emotional-state')
  async setEmotionalState(
    @Body() dto: SetEmotionalStateDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<UserEmotionalProfile>> {
    const userId = req.user.userId;

    // Check if feature is available for this user
    if (!this.emotionalAvailabilityService.isFeatureAvailable(userId)) {
      throw new ForbiddenException(
        'Emotional availability feature is not available for your account. This feature is currently in limited rollout.'
      );
    }

    const profile = this.emotionalAvailabilityService.setEmotionalState(
      userId,
      dto.state,
      dto.duration
    );

    if (!profile) {
      throw new BadRequestException('Failed to set emotional state');
    }

    return {
      success: true,
      data: profile,
      message: `Emotional state set to "${dto.state}"${dto.duration ? ` for ${dto.duration} minutes` : ''}`,
    };
  }

  /**
   * Get the authenticated user's current emotional state
   * GET /api/v1/profile/emotional-state
   */
  @Get('emotional-state')
  async getEmotionalState(
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<AvailabilityWindow | null>> {
    const userId = req.user.userId;

    // Check if feature is available for this user
    if (!this.emotionalAvailabilityService.isFeatureAvailable(userId)) {
      return {
        success: true,
        data: null,
        message: 'Emotional availability feature is not available for your account',
      };
    }

    const state = this.emotionalAvailabilityService.getEmotionalState(userId);

    return {
      success: true,
      data: state,
    };
  }

  /**
   * Clear the authenticated user's emotional state
   * DELETE /api/v1/profile/emotional-state
   */
  @Delete('emotional-state')
  @HttpCode(HttpStatus.OK)
  async clearEmotionalState(
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<void>> {
    const userId = req.user.userId;

    // Check if feature is available for this user
    if (!this.emotionalAvailabilityService.isFeatureAvailable(userId)) {
      throw new ForbiddenException(
        'Emotional availability feature is not available for your account'
      );
    }

    this.emotionalAvailabilityService.clearEmotionalState(userId);

    return {
      success: true,
      message: 'Emotional state cleared successfully',
    };
  }

  /**
   * Get the authenticated user's emotional state history
   * GET /api/v1/profile/emotional-state/history
   */
  @Get('emotional-state/history')
  async getEmotionalStateHistory(
    @Query() query: GetStateHistoryQueryDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<EmotionalStateHistoryEntry[]>> {
    const userId = req.user.userId;
    const days = query.days || 30;

    // Check if feature is available for this user
    if (!this.emotionalAvailabilityService.isFeatureAvailable(userId)) {
      return {
        success: true,
        data: [],
        message: 'Emotional availability feature is not available for your account',
      };
    }

    const history = this.emotionalAvailabilityService.getStateHistory(userId, days);

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Get emotional compatibility with a match
   * GET /api/v1/profile/emotional-compatibility/:matchId
   */
  @Get('emotional-compatibility/:matchId')
  async getEmotionalCompatibility(
    @Param('matchId') matchId: string,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<EmotionalCompatibility & { userState: EmotionalState | null; matchState: EmotionalState | null }>> {
    const userId = req.user.userId;

    // Check if feature is available for this user
    if (!this.emotionalAvailabilityService.isFeatureAvailable(userId)) {
      throw new ForbiddenException(
        'Emotional availability feature is not available for your account'
      );
    }

    // Cannot check compatibility with yourself
    if (userId === matchId) {
      throw new BadRequestException('Cannot check compatibility with yourself');
    }

    // Get both users' emotional states
    const userState = this.emotionalAvailabilityService.getEmotionalState(userId)?.state || null;
    const matchState = this.emotionalAvailabilityService.getEmotionalStateForViewer(
      userId,
      matchId,
      true // Assuming they are a match for this endpoint
    )?.state || null;

    // Calculate compatibility
    const compatibility = this.emotionalAvailabilityService.calculateEmotionalCompatibility(
      userState,
      matchState
    );

    return {
      success: true,
      data: {
        ...compatibility,
        userState,
        matchState,
      },
    };
  }

  /**
   * Update emotional state privacy settings
   * PUT /api/v1/profile/emotional-state/privacy
   */
  @Put('emotional-state/privacy')
  async updateEmotionalPrivacy(
    @Body() dto: UpdateEmotionalPrivacyDto,
    @Request() req: AuthenticatedRequest
  ): Promise<ApiResponse<EmotionalPrivacySettings>> {
    const userId = req.user.userId;

    // Check if feature is available for this user
    if (!this.emotionalAvailabilityService.isFeatureAvailable(userId)) {
      throw new ForbiddenException(
        'Emotional availability feature is not available for your account'
      );
    }

    const settings = this.emotionalAvailabilityService.updatePrivacySettings(userId, dto);

    if (!settings) {
      throw new BadRequestException('Failed to update privacy settings');
    }

    return {
      success: true,
      data: settings,
      message: 'Privacy settings updated successfully',
    };
  }
}
