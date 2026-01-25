import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';

import { Public } from '../decorators/public.decorator';
import { ProxyService } from '../services/proxy.service';
import {
  UpdateUserProfileDto,
  UpdateUserPreferencesDto,
  UpdateUserSettingsDto,
  UpdateLocationDto,
  BlockUserDto,
  ReportUserDto,
  RequestVerificationDto,
} from '../dto/user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UserController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Clerk Integration Endpoints ====================

  /**
   * Sync user from Clerk webhook
   */
  @Public()
  @Post('clerk-sync')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Sync user from Clerk (webhook)' })
  async clerkSync(
    @Headers() headers: Record<string, string>,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('userService', '/api/v1/users/clerk-sync', body, {
      'X-Internal-Service': headers['x-internal-service'] || 'webhook',
    });
  }

  /**
   * Update user by Clerk ID
   */
  @Public()
  @Put('clerk/:clerkId')
  @ApiOperation({ summary: 'Update user by Clerk ID (webhook)' })
  async updateByClerkId(
    @Headers() headers: Record<string, string>,
    @Param('clerkId') clerkId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.put('userService', `/api/v1/users/clerk/${clerkId}`, body, {
      'X-Internal-Service': headers['x-internal-service'] || 'webhook',
    });
  }

  /**
   * Delete user by Clerk ID
   */
  @Public()
  @Delete('clerk/:clerkId')
  @ApiOperation({ summary: 'Delete user by Clerk ID (webhook)' })
  async deleteByClerkId(
    @Headers() headers: Record<string, string>,
    @Param('clerkId') clerkId: string
  ) {
    return this.proxyService.delete('userService', `/api/v1/users/clerk/${clerkId}`, {
      'X-Internal-Service': headers['x-internal-service'] || 'webhook',
    });
  }

  /**
   * Profile setup after Clerk signup
   */
  @Post('profile/setup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Complete profile setup after signup' })
  async profileSetup(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('userService', '/api/v1/users/profile/setup', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get profile completion status
   */
  @Get('profile/status')
  @ApiOperation({ summary: 'Check if profile setup is complete' })
  async profileStatus(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/profile/status', {
      Authorization: authorization,
    });
  }

  /**
   * Sync current user with backend (called after Clerk sign in)
   */
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync current user with backend' })
  async syncUser(
    @Headers('authorization') authorization: string,
    @Body() body: { clerkUserId: string }
  ) {
    return this.proxyService.post('userService', '/api/v1/users/sync', body, {
      Authorization: authorization,
    });
  }

  // ==================== User Profile Endpoints ====================

  /**
   * Get current user profile
   */
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getCurrentUser(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/me', {
      Authorization: authorization,
    });
  }

  /**
   * Update current user profile
   */
  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateUserProfileDto })
  async updateCurrentUser(
    @Headers('authorization') authorization: string,
    @Body() body: UpdateUserProfileDto
  ) {
    return this.proxyService.put('userService', '/api/v1/users/me', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get user by ID
   */
  @Get(':userId')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string
  ) {
    return this.proxyService.get('userService', `/api/v1/users/${userId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Update user by ID (admin)
   */
  @Put(':userId')
  @ApiOperation({ summary: 'Update user by ID (admin)' })
  @ApiBody({ type: UpdateUserProfileDto })
  async updateUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Body() body: UpdateUserProfileDto
  ) {
    return this.proxyService.put('userService', `/api/v1/users/${userId}`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Delete user account
   */
  @Delete(':userId')
  @ApiOperation({ summary: 'Delete user account' })
  async deleteUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string
  ) {
    return this.proxyService.delete('userService', `/api/v1/users/${userId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Profile Photo Endpoints ====================

  /**
   * Upload profile photo
   */
  @Post('me/photos')
  @ApiOperation({ summary: 'Upload profile photo' })
  @ApiConsumes('multipart/form-data')
  async uploadPhoto(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('userService', '/api/v1/users/me/photos', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get user photos
   */
  @Get('me/photos')
  @ApiOperation({ summary: 'Get current user photos' })
  async getUserPhotos(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/me/photos', {
      Authorization: authorization,
    });
  }

  /**
   * Delete photo
   */
  @Delete('me/photos/:photoId')
  @ApiOperation({ summary: 'Delete profile photo' })
  async deletePhoto(
    @Headers('authorization') authorization: string,
    @Param('photoId') photoId: string
  ) {
    return this.proxyService.delete('userService', `/api/v1/users/me/photos/${photoId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Set primary photo
   */
  @Put('me/photos/:photoId/primary')
  @ApiOperation({ summary: 'Set photo as primary' })
  async setPrimaryPhoto(
    @Headers('authorization') authorization: string,
    @Param('photoId') photoId: string
  ) {
    return this.proxyService.put(
      'userService',
      `/api/v1/users/me/photos/${photoId}/primary`,
      {},
      {
        Authorization: authorization,
      }
    );
  }

  // ==================== User Preferences Endpoints ====================

  /**
   * Get user preferences
   */
  @Get('me/preferences')
  @ApiOperation({ summary: 'Get user preferences' })
  async getPreferences(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/me/preferences', {
      Authorization: authorization,
    });
  }

  /**
   * Update user preferences
   */
  @Put('me/preferences')
  @ApiOperation({ summary: 'Update user preferences' })
  @ApiBody({ type: UpdateUserPreferencesDto })
  async updatePreferences(
    @Headers('authorization') authorization: string,
    @Body() body: UpdateUserPreferencesDto
  ) {
    return this.proxyService.put('userService', '/api/v1/users/me/preferences', body, {
      Authorization: authorization,
    });
  }

  // ==================== User Settings Endpoints ====================

  /**
   * Get user settings
   */
  @Get('me/settings')
  @ApiOperation({ summary: 'Get user settings' })
  async getSettings(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/me/settings', {
      Authorization: authorization,
    });
  }

  /**
   * Update user settings
   */
  @Put('me/settings')
  @ApiOperation({ summary: 'Update user settings' })
  @ApiBody({ type: UpdateUserSettingsDto })
  async updateSettings(
    @Headers('authorization') authorization: string,
    @Body() body: UpdateUserSettingsDto
  ) {
    return this.proxyService.put('userService', '/api/v1/users/me/settings', body, {
      Authorization: authorization,
    });
  }

  // ==================== Location Endpoints ====================

  /**
   * Update user location
   */
  @Put('me/location')
  @ApiOperation({ summary: 'Update user location' })
  @ApiBody({ type: UpdateLocationDto })
  async updateLocation(
    @Headers('authorization') authorization: string,
    @Body() body: UpdateLocationDto
  ) {
    return this.proxyService.put('userService', '/api/v1/users/me/location', body, {
      Authorization: authorization,
    });
  }

  // ==================== Block/Report Endpoints ====================

  /**
   * Block a user
   */
  @Post('me/blocks')
  @ApiOperation({ summary: 'Block a user' })
  @HttpCode(HttpStatus.CREATED)
  async blockUser(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('userService', '/api/v1/users/me/blocks', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get blocked users
   */
  @Get('me/blocks')
  @ApiOperation({ summary: 'Get blocked users' })
  async getBlockedUsers(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/me/blocks', {
      Authorization: authorization,
    });
  }

  /**
   * Unblock a user
   */
  @Delete('me/blocks/:blockedUserId')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @Headers('authorization') authorization: string,
    @Param('blockedUserId') blockedUserId: string
  ) {
    return this.proxyService.delete('userService', `/api/v1/users/me/blocks/${blockedUserId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Report a user
   */
  @Post('me/reports')
  @ApiOperation({ summary: 'Report a user' })
  @HttpCode(HttpStatus.CREATED)
  async reportUser(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('userService', '/api/v1/users/me/reports', body, {
      Authorization: authorization,
    });
  }

  // ==================== Verification Endpoints ====================

  /**
   * Request profile verification
   */
  @Post('me/verification')
  @ApiOperation({ summary: 'Request profile verification' })
  @HttpCode(HttpStatus.CREATED)
  async requestVerification(
    @Headers('authorization') authorization: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('userService', '/api/v1/users/me/verification', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get verification status
   */
  @Get('me/verification')
  @ApiOperation({ summary: 'Get verification status' })
  async getVerificationStatus(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/users/me/verification', {
      Authorization: authorization,
    });
  }
}
