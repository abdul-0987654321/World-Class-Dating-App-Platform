import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { LocationService, LocationPrivacySettings } from './location.service';

interface UpdateLocationDto {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface NearbyUsersQueryDto {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  excludeUserId?: string;
}

interface DistanceQueryDto {
  user1Id: string;
  user2Id: string;
}

interface UpdatePrivacySettingsDto {
  showExactLocation?: boolean;
  hideDistance?: boolean;
  locationBlurRadius?: number;
  allowLocationTracking?: boolean;
  shareLocationWithMatches?: boolean;
}

interface GeofenceCheckDto {
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
}

@Controller('api/v1/location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  /**
   * Update user's current location
   */
  @Post(':userId')
  @HttpCode(HttpStatus.OK)
  async updateUserLocation(
    @Param('userId') userId: string,
    @Body() dto: UpdateLocationDto
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (typeof dto.latitude !== 'number' || typeof dto.longitude !== 'number') {
      throw new BadRequestException('Latitude and longitude must be numbers');
    }

    try {
      const location = await this.locationService.updateUserLocation(
        userId,
        dto.latitude,
        dto.longitude,
        dto.accuracy
      );

      return {
        success: true,
        data: location,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Get user's current location
   */
  @Get(':userId')
  async getUserLocation(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const location = await this.locationService.getUserLocation(userId);

    if (!location) {
      throw new NotFoundException('Location not found for user');
    }

    return {
      success: true,
      data: location,
    };
  }

  /**
   * Delete user's location data
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async deleteUserLocation(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const deleted = await this.locationService.deleteUserLocation(userId);

    return {
      success: true,
      deleted,
    };
  }

  /**
   * Get users within a specified radius
   */
  @Get('nearby/search')
  async getNearbyUsers(@Query() query: NearbyUsersQueryDto) {
    const latitude = parseFloat(query.latitude as unknown as string);
    const longitude = parseFloat(query.longitude as unknown as string);
    const radiusKm = query.radiusKm ? parseFloat(query.radiusKm as unknown as string) : 50;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Valid latitude and longitude are required');
    }

    try {
      const nearbyUsers = await this.locationService.getNearbyUsers(
        latitude,
        longitude,
        radiusKm,
        query.excludeUserId
      );

      return {
        success: true,
        data: nearbyUsers,
        meta: {
          centerLatitude: latitude,
          centerLongitude: longitude,
          radiusKm,
          count: nearbyUsers.length,
        },
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Calculate distance between two users
   */
  @Get('distance')
  async calculateDistance(@Query() query: DistanceQueryDto) {
    if (!query.user1Id || !query.user2Id) {
      throw new BadRequestException('Both user1Id and user2Id are required');
    }

    const result = await this.locationService.calculateDistance(
      query.user1Id,
      query.user2Id
    );

    if (!result) {
      throw new NotFoundException('Unable to calculate distance. One or both users have no location data or have hidden their distance.');
    }

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get user's location privacy settings
   */
  @Get(':userId/privacy')
  async getPrivacySettings(@Param('userId') userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const settings = await this.locationService.getLocationPrivacySettings(userId);

    return {
      success: true,
      data: settings,
    };
  }

  /**
   * Update user's location privacy settings
   */
  @Put(':userId/privacy')
  async updatePrivacySettings(
    @Param('userId') userId: string,
    @Body() dto: UpdatePrivacySettingsDto
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const settings = await this.locationService.updateLocationPrivacySettings(userId, dto);

    return {
      success: true,
      data: settings,
    };
  }

  /**
   * Check if user is within a geofenced area
   */
  @Post(':userId/geofence/check')
  async checkGeofence(
    @Param('userId') userId: string,
    @Body() dto: GeofenceCheckDto
  ) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    if (
      typeof dto.centerLatitude !== 'number' ||
      typeof dto.centerLongitude !== 'number' ||
      typeof dto.radiusKm !== 'number'
    ) {
      throw new BadRequestException('centerLatitude, centerLongitude, and radiusKm are required and must be numbers');
    }

    const isWithin = await this.locationService.isWithinGeofence(
      userId,
      { latitude: dto.centerLatitude, longitude: dto.centerLongitude },
      dto.radiusKm
    );

    return {
      success: true,
      data: {
        userId,
        isWithinGeofence: isWithin,
        geofence: {
          centerLatitude: dto.centerLatitude,
          centerLongitude: dto.centerLongitude,
          radiusKm: dto.radiusKm,
        },
      },
    };
  }

  /**
   * Get bounding box for a location and radius
   */
  @Get('bounds')
  async getBoundingBox(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radiusKm') radiusKm: string
  ) {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const radius = parseFloat(radiusKm);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      throw new BadRequestException('latitude, longitude, and radiusKm are required and must be numbers');
    }

    const bounds = this.locationService.getBoundingBox(lat, lng, radius);

    return {
      success: true,
      data: bounds,
    };
  }
}
