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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

import { ProxyService } from '../services/proxy.service';

@ApiTags('Safety')
@ApiBearerAuth('JWT-auth')
@Controller('safety')
export class SafetyController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== SOS ALERTS ====================

  @Post('sos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger SOS alert' })
  @ApiResponse({ status: 200, description: 'SOS alert triggered' })
  async triggerSOS(
    @Headers('authorization') authorization: string,
    @Body()
    body: { location?: { latitude: number; longitude: number; accuracy?: number }; reason?: string }
  ) {
    return this.proxyService.post('userService', '/api/v1/safety/sos', body, {
      Authorization: authorization,
    });
  }

  @Get('sos/status')
  @ApiOperation({ summary: 'Get active SOS status' })
  async getSOSStatus(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/safety/sos/status', {
      Authorization: authorization,
    });
  }

  @Post('sos/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel active SOS alert' })
  async cancelSOS(
    @Headers('authorization') authorization: string,
    @Body() body: { alertId: string }
  ) {
    return this.proxyService.post('userService', '/api/v1/safety/sos/cancel', body, {
      Authorization: authorization,
    });
  }

  @Get('sos/history')
  @ApiOperation({ summary: 'Get SOS alert history' })
  async getSOSHistory(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/safety/sos/history', {
      Authorization: authorization,
    });
  }

  // ==================== EMERGENCY CONTACTS ====================

  @Get('emergency-contacts')
  @ApiOperation({ summary: 'Get emergency contacts' })
  async getEmergencyContacts(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/safety/emergency-contacts', {
      Authorization: authorization,
    });
  }

  @Post('emergency-contacts')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add emergency contact' })
  async addEmergencyContact(
    @Headers('authorization') authorization: string,
    @Body()
    body: {
      name: string;
      phone: string;
      email?: string;
      relationship: 'family' | 'friend' | 'partner' | 'other';
      notify_on_sos?: boolean;
      notify_on_checkin_miss?: boolean;
    }
  ) {
    return this.proxyService.post('userService', '/api/v1/safety/emergency-contacts', body, {
      Authorization: authorization,
    });
  }

  @Put('emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Update emergency contact' })
  async updateEmergencyContact(
    @Headers('authorization') authorization: string,
    @Param('contactId') contactId: string,
    @Body() body: any
  ) {
    return this.proxyService.put(
      'userService',
      `/api/v1/safety/emergency-contacts/${contactId}`,
      body,
      { Authorization: authorization }
    );
  }

  @Delete('emergency-contacts/:contactId')
  @ApiOperation({ summary: 'Delete emergency contact' })
  async deleteEmergencyContact(
    @Headers('authorization') authorization: string,
    @Param('contactId') contactId: string
  ) {
    return this.proxyService.delete(
      'userService',
      `/api/v1/safety/emergency-contacts/${contactId}`,
      { Authorization: authorization }
    );
  }

  // ==================== SAFETY CHECKINS ====================

  @Get('checkins')
  @ApiOperation({ summary: 'Get active check-ins' })
  async getCheckins(@Headers('authorization') authorization: string) {
    return this.proxyService.get('userService', '/api/v1/safety/checkins', {
      Authorization: authorization,
    });
  }

  @Post('checkins')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create safety check-in' })
  async createCheckin(
    @Headers('authorization') authorization: string,
    @Body()
    body: {
      scheduled_at: string;
      meeting_details?: {
        location?: string;
        with_user_id?: string;
        notes?: string;
      };
    }
  ) {
    return this.proxyService.post('userService', '/api/v1/safety/checkins', body, {
      Authorization: authorization,
    });
  }

  @Post('checkins/:checkinId/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm check-in (I am safe)' })
  async confirmCheckin(
    @Headers('authorization') authorization: string,
    @Param('checkinId') checkinId: string
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/safety/checkins/${checkinId}/confirm`,
      {},
      { Authorization: authorization }
    );
  }

  @Post('checkins/:checkinId/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel check-in' })
  async cancelCheckin(
    @Headers('authorization') authorization: string,
    @Param('checkinId') checkinId: string
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/safety/checkins/${checkinId}/cancel`,
      {},
      { Authorization: authorization }
    );
  }

  // ==================== CRISIS RESOURCES ====================

  @Get('crisis-resources')
  @ApiOperation({ summary: 'Get crisis resources' })
  async getCrisisResources(
    @Headers('authorization') authorization: string,
    @Query('region') region?: string
  ) {
    const queryParams = region ? `?region=${region}` : '';
    return this.proxyService.get('userService', `/api/v1/safety/crisis-resources${queryParams}`, {
      Authorization: authorization,
    });
  }
}
