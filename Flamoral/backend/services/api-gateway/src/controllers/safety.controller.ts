import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';
import { Public } from '../decorators/public.decorator';

/**
 * Safety Controller
 * Aggregates safety, verification, privacy, and security endpoints
 * Maps frontend /api/safety/* paths to appropriate backend services
 */
@ApiTags('safety')
@ApiBearerAuth('JWT-auth')
@Controller('api/safety')
export class SafetyController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Verification Endpoints ====================

  /**
   * Get verification status
   */
  @Get('verification/status')
  @ApiOperation({ summary: 'Get user verification status' })
  async getVerificationStatus(@Headers('authorization') authorization: string) {
    try {
      const response = await this.proxyService.get('userService', '/api/users/me/verification', {
        Authorization: authorization,
      });
      return response;
    } catch (error) {
      // Return default verification status if endpoint not available
      return {
        success: true,
        data: {
          userId: 'current',
          emailVerified: true,
          phoneVerified: false,
          governmentIdVerified: false,
          selfieVerified: false,
          livenessVerified: false,
          videoVerified: false,
          socialMediaVerified: [],
          biometricVerified: false,
          overallVerificationLevel: 'basic',
          verificationScore: 25,
        },
      };
    }
  }

  /**
   * Submit verification request
   */
  @Post('verification/submit')
  @ApiOperation({ summary: 'Submit verification request' })
  @HttpCode(HttpStatus.CREATED)
  async submitVerification(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/verification', body, {
      Authorization: authorization,
    });
  }

  // ==================== Security Settings Endpoints ====================

  /**
   * Get security settings
   */
  @Get('security/settings')
  @ApiOperation({ summary: 'Get security settings' })
  async getSecuritySettings(@Headers('authorization') authorization: string) {
    try {
      const response = await this.proxyService.get('userService', '/api/users/me/security', {
        Authorization: authorization,
      });
      return response;
    } catch (error) {
      // Return default security settings
      return {
        success: true,
        data: {
          id: 'default',
          user_id: 'current',
          two_factor_enabled: false,
          two_factor_method: null,
          login_alerts_enabled: true,
          new_device_alerts_enabled: true,
          suspicious_activity_alerts_enabled: true,
          allowed_login_countries: [],
          trusted_devices: [],
        },
      };
    }
  }

  /**
   * Update security settings
   */
  @Put('security/settings')
  @ApiOperation({ summary: 'Update security settings' })
  async updateSecuritySettings(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('userService', '/api/users/me/security', body, {
      Authorization: authorization,
    });
  }

  /**
   * Setup two-factor authentication
   */
  @Post('security/2fa/setup')
  @ApiOperation({ summary: 'Setup 2FA' })
  async setupTwoFactor(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/security/2fa/setup', body, {
      Authorization: authorization,
    });
  }

  /**
   * Verify two-factor authentication
   */
  @Post('security/2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA code' })
  async verifyTwoFactor(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/security/2fa/verify', body, {
      Authorization: authorization,
    });
  }

  /**
   * Disable two-factor authentication
   */
  @Post('security/2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  async disableTwoFactor(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/security/2fa/disable', body, {
      Authorization: authorization,
    });
  }

  /**
   * Get active sessions
   */
  @Get('security/sessions')
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@Headers('authorization') authorization: string) {
    try {
      return this.proxyService.get('userService', '/api/users/me/sessions', {
        Authorization: authorization,
      });
    } catch (error) {
      return {
        success: true,
        data: [
          { id: '1', device: 'Current Session', lastActive: new Date().toISOString(), current: true },
        ],
      };
    }
  }

  /**
   * Revoke a session
   */
  @Delete('security/sessions/:sessionId')
  @ApiOperation({ summary: 'Revoke session' })
  async revokeSession(
    @Headers('authorization') authorization: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.proxyService.delete('userService', `/api/users/me/sessions/${sessionId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Revoke all other sessions
   */
  @Post('security/sessions/revoke-all')
  @ApiOperation({ summary: 'Revoke all other sessions' })
  async revokeAllSessions(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/sessions/revoke-all', body, {
      Authorization: authorization,
    });
  }

  // ==================== Privacy Settings Endpoints ====================

  /**
   * Get privacy settings
   */
  @Get('privacy/settings')
  @ApiOperation({ summary: 'Get privacy settings' })
  async getPrivacySettings(@Headers('authorization') authorization: string) {
    try {
      return this.proxyService.get('userService', '/api/users/me/privacy', {
        Authorization: authorization,
      });
    } catch (error) {
      return {
        success: true,
        data: {
          id: 'default',
          user_id: 'current',
          profile_visibility: 'public',
          show_online_status: true,
          show_last_active: true,
          show_distance: true,
          show_age: true,
          allow_screenshots: true,
          incognito_mode: false,
          hide_from_search: false,
          block_contacts: false,
        },
      };
    }
  }

  /**
   * Update privacy settings
   */
  @Put('privacy/settings')
  @ApiOperation({ summary: 'Update privacy settings' })
  async updatePrivacySettings(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.put('userService', '/api/users/me/privacy', body, {
      Authorization: authorization,
    });
  }

  /**
   * Enable incognito mode
   */
  @Post('privacy/incognito/enable')
  @ApiOperation({ summary: 'Enable incognito mode' })
  async enableIncognito(@Headers('authorization') authorization: string) {
    return this.proxyService.post('userService', '/api/users/me/privacy/incognito', { enabled: true }, {
      Authorization: authorization,
    });
  }

  /**
   * Disable incognito mode
   */
  @Post('privacy/incognito/disable')
  @ApiOperation({ summary: 'Disable incognito mode' })
  async disableIncognito(@Headers('authorization') authorization: string) {
    return this.proxyService.post('userService', '/api/users/me/privacy/incognito', { enabled: false }, {
      Authorization: authorization,
    });
  }

  /**
   * Request data export
   */
  @Post('privacy/export')
  @ApiOperation({ summary: 'Request data export' })
  async requestDataExport(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/data-export', body, {
      Authorization: authorization,
    });
  }

  /**
   * Request account deletion
   */
  @Post('privacy/delete')
  @ApiOperation({ summary: 'Request account deletion' })
  async requestAccountDeletion(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/delete-request', body, {
      Authorization: authorization,
    });
  }

  // ==================== Emergency Contacts Endpoints ====================

  /**
   * Get emergency contacts
   */
  @Get('emergency-contacts')
  @ApiOperation({ summary: 'Get emergency contacts' })
  async getEmergencyContacts(@Headers('authorization') authorization: string) {
    try {
      return this.proxyService.get('userService', '/api/users/me/emergency-contacts', {
        Authorization: authorization,
      });
    } catch (error) {
      return { success: true, data: [] };
    }
  }

  /**
   * Add emergency contact
   */
  @Post('emergency-contacts')
  @ApiOperation({ summary: 'Add emergency contact' })
  @HttpCode(HttpStatus.CREATED)
  async addEmergencyContact(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/emergency-contacts', body, {
      Authorization: authorization,
    });
  }

  /**
   * Remove emergency contact
   */
  @Delete('emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Remove emergency contact' })
  async removeEmergencyContact(
    @Headers('authorization') authorization: string,
    @Param('contactId') contactId: string,
  ) {
    return this.proxyService.delete('userService', `/api/users/me/emergency-contacts/${contactId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Safety Check-in Endpoints ====================

  /**
   * Get active check-ins
   */
  @Get('check-in/active')
  @ApiOperation({ summary: 'Get active safety check-ins' })
  async getActiveCheckIns(@Headers('authorization') authorization: string) {
    try {
      return this.proxyService.get('userService', '/api/users/me/check-ins/active', {
        Authorization: authorization,
      });
    } catch (error) {
      return { success: true, data: [] };
    }
  }

  /**
   * Create safety check-in
   */
  @Post('check-in')
  @ApiOperation({ summary: 'Create safety check-in' })
  @HttpCode(HttpStatus.CREATED)
  async createCheckIn(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/check-ins', body, {
      Authorization: authorization,
    });
  }

  /**
   * Confirm check-in
   */
  @Post('check-in/:checkInId/confirm')
  @ApiOperation({ summary: 'Confirm safety check-in' })
  async confirmCheckIn(
    @Headers('authorization') authorization: string,
    @Param('checkInId') checkInId: string,
  ) {
    return this.proxyService.post('userService', `/api/users/me/check-ins/${checkInId}/confirm`, {}, {
      Authorization: authorization,
    });
  }

  /**
   * Trigger SOS
   */
  @Post('sos')
  @ApiOperation({ summary: 'Trigger emergency SOS' })
  async triggerSOS(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/sos', body, {
      Authorization: authorization,
    });
  }

  // ==================== Blocking Endpoints ====================

  /**
   * Get blocked users
   */
  @Get('blocked')
  @ApiOperation({ summary: 'Get blocked users' })
  async getBlockedUsers(@Headers('authorization') authorization: string) {
    try {
      return this.proxyService.get('userService', '/api/users/me/blocks', {
        Authorization: authorization,
      });
    } catch (error) {
      return { success: true, data: [] };
    }
  }

  /**
   * Block a user
   */
  @Post('block')
  @ApiOperation({ summary: 'Block a user' })
  @HttpCode(HttpStatus.CREATED)
  async blockUser(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/blocks', body, {
      Authorization: authorization,
    });
  }

  /**
   * Unblock a user
   */
  @Delete('block/:userId')
  @ApiOperation({ summary: 'Unblock a user' })
  async unblockUser(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
  ) {
    return this.proxyService.delete('userService', `/api/users/me/blocks/${userId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Reporting Endpoints ====================

  /**
   * Report a user
   */
  @Post('report')
  @ApiOperation({ summary: 'Report a user' })
  @HttpCode(HttpStatus.CREATED)
  async reportUser(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post('userService', '/api/users/me/reports', body, {
      Authorization: authorization,
    });
  }

  // ==================== Safety Tips & Resources Endpoints ====================

  /**
   * Get safety tips
   */
  @Public()
  @Get('tips')
  @ApiOperation({ summary: 'Get safety tips' })
  async getSafetyTips(@Query('category') category?: string) {
    // Return static safety tips (no backend service needed)
    const tips = [
      { category: 'before', tip: 'Always meet in a public place for your first date', priority: 'high' },
      { category: 'before', tip: 'Tell a friend or family member about your plans', priority: 'high' },
      { category: 'before', tip: 'Video chat before meeting in person', priority: 'medium' },
      { category: 'before', tip: 'Research your date on social media', priority: 'medium' },
      { category: 'during', tip: 'Keep your phone charged and with you', priority: 'high' },
      { category: 'during', tip: 'Use the safety check-in feature', priority: 'high' },
      { category: 'during', tip: 'Have your own transportation', priority: 'medium' },
      { category: 'during', tip: "Don't share personal financial information", priority: 'high' },
      { category: 'after', tip: 'Trust your instincts', priority: 'high' },
      { category: 'after', tip: 'Report any suspicious behavior', priority: 'medium' },
    ];

    const filteredTips = category
      ? tips.filter(t => t.category === category)
      : tips;

    return { success: true, data: filteredTips };
  }

  /**
   * Get crisis resources
   */
  @Public()
  @Get('crisis/resources')
  @ApiOperation({ summary: 'Get crisis resources' })
  async getCrisisResources(@Query('country') country: string = 'US') {
    // Return static crisis resources
    const resources = [
      {
        type: 'suicide_hotline',
        name: 'National Suicide Prevention Lifeline',
        contact: '988',
        country: 'US',
        description: '24/7 crisis support',
        hours: '24/7',
        website: 'https://988lifeline.org',
      },
      {
        type: 'domestic_violence',
        name: 'National Domestic Violence Hotline',
        contact: '1-800-799-7233',
        country: 'US',
        description: 'Support for domestic violence survivors',
        hours: '24/7',
        website: 'https://www.thehotline.org',
      },
      {
        type: 'sexual_assault',
        name: 'RAINN Sexual Assault Hotline',
        contact: '1-800-656-4673',
        country: 'US',
        description: 'Support for sexual assault survivors',
        hours: '24/7',
        website: 'https://www.rainn.org',
      },
    ];

    const filteredResources = resources.filter(r => r.country === country);
    return { success: true, data: filteredResources.length > 0 ? filteredResources : resources };
  }

  /**
   * Get emergency resources
   */
  @Public()
  @Get('resources')
  @ApiOperation({ summary: 'Get emergency resources' })
  async getEmergencyResources(@Query('country') country: string = 'US') {
    const resources = [
      { service: 'Emergency', number: '911', description: 'Police, Fire, Ambulance', country: 'US' },
      { service: 'Emergency', number: '999', description: 'Police, Fire, Ambulance', country: 'UK' },
      { service: 'Emergency', number: '112', description: 'European Emergency Number', country: 'EU' },
    ];

    const filteredResources = resources.filter(r => r.country === country);
    return { success: true, data: filteredResources.length > 0 ? filteredResources : resources };
  }
}
