import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProfileService,
  Profile,
  ProfilePhoto,
  UserPreferences,
  ProfileCompleteness,
} from './profile.service';

// DTOs for request validation
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

// Response wrapper interface
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

@Controller('api/v1/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get(':userId')
  async getProfile(@Param('userId') userId: string): Promise<ApiResponse<Profile>> {
    const profile = await this.profileService.getProfile(userId);
    return {
      success: true,
      data: profile,
    };
  }

  @Put(':userId')
  async updateProfile(
    @Param('userId') userId: string,
    @Body() updateProfileDto: UpdateProfileDto
  ): Promise<ApiResponse<Profile>> {
    const profile = await this.profileService.updateProfile(userId, updateProfileDto);
    return {
      success: true,
      data: profile,
      message: 'Profile updated successfully',
    };
  }

  @Get(':userId/photos')
  async getProfilePhotos(
    @Param('userId') userId: string
  ): Promise<ApiResponse<ProfilePhoto[]>> {
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
    @Body() addPhotoDto: AddPhotoDto
  ): Promise<ApiResponse<ProfilePhoto>> {
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
    @Param('photoId') photoId: string
  ): Promise<ApiResponse<void>> {
    await this.profileService.deleteProfilePhoto(userId, photoId);
    return {
      success: true,
      message: 'Photo deleted successfully',
    };
  }

  @Get(':userId/preferences')
  async getPreferences(
    @Param('userId') userId: string
  ): Promise<ApiResponse<UserPreferences>> {
    const profile = await this.profileService.getProfile(userId);
    return {
      success: true,
      data: profile.preferences,
    };
  }

  @Put(':userId/preferences')
  async updatePreferences(
    @Param('userId') userId: string,
    @Body() updatePreferencesDto: UpdatePreferencesDto
  ): Promise<ApiResponse<UserPreferences>> {
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
    @Param('userId') userId: string
  ): Promise<ApiResponse<ProfileCompleteness>> {
    const completeness = await this.profileService.getProfileCompleteness(userId);
    return {
      success: true,
      data: completeness,
    };
  }
}
