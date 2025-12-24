import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ProxyService } from '../services/proxy.service';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard, Role } from '../guards/roles.guard';
import * as multer from 'multer';

/**
 * Verification Controller
 * Handles identity verification endpoints through API Gateway
 */
@ApiTags('verification')
@ApiBearerAuth('JWT-auth')
@Controller('verification')
export class VerificationController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== User Verification Endpoints ====================

  /**
   * POST /verification/start
   * Start a new identity verification flow
   */
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start a new identity verification flow' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type'],
      properties: {
        type: {
          type: 'string',
          enum: ['email', 'phone', 'id', 'selfie', 'liveness', 'video', 'biometric'],
          description: 'Type of verification to start',
        },
        region_policy_key: {
          type: 'string',
          description: 'Region policy key (e.g., US-IL, US-TX, US-WA)',
        },
        biometric_consent: {
          type: 'boolean',
          description: 'User consent for biometric data collection',
        },
        metadata: {
          type: 'object',
          description: 'Additional metadata',
        },
      },
    },
  })
  async startVerification(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post(
      'userService',
      '/api/v1/identity-verification/start',
      body,
      { Authorization: authorization },
    );
  }

  /**
   * POST /verification/upload
   * Upload a verification artifact (document, selfie, etc.)
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a verification artifact' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['request_id', 'type', 'file'],
      properties: {
        request_id: {
          type: 'string',
          format: 'uuid',
          description: 'Verification request ID',
        },
        type: {
          type: 'string',
          description: 'Artifact type (document_front, document_back, selfie, etc.)',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'The file to upload',
        },
      },
    },
  })
  async uploadArtifact(
    @Headers('authorization') authorization: string,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // Forward multipart form data to user service
    // In a production implementation, you would:
    // 1. Upload file to cloud storage
    // 2. Send the file URL to the user service
    return this.proxyService.post(
      'userService',
      '/api/v1/identity-verification/upload',
      { ...body, file: file ? { originalname: file.originalname, size: file.size, mimetype: file.mimetype } : null },
      { Authorization: authorization },
    );
  }

  /**
   * POST /verification/submit
   * Submit verification for review
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit verification for review' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['request_id'],
      properties: {
        request_id: {
          type: 'string',
          format: 'uuid',
          description: 'Verification request ID',
        },
      },
    },
  })
  async submitForReview(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post(
      'userService',
      '/api/v1/identity-verification/submit',
      body,
      { Authorization: authorization },
    );
  }

  /**
   * GET /verification/status
   * Get verification status for current user
   */
  @Get('status')
  @ApiOperation({ summary: 'Get verification status for current user' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['email', 'phone', 'id', 'selfie', 'liveness', 'video', 'biometric'],
    description: 'Filter by verification type',
  })
  async getStatus(
    @Headers('authorization') authorization: string,
    @Query('type') type?: string,
  ) {
    const queryString = type ? `?type=${type}` : '';
    return this.proxyService.get(
      'userService',
      `/api/v1/identity-verification/status${queryString}`,
      { Authorization: authorization },
    );
  }

  /**
   * POST /verification/retry
   * Retry a denied or expired verification
   */
  @Post('retry')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Retry a denied or expired verification' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['request_id'],
      properties: {
        request_id: {
          type: 'string',
          format: 'uuid',
          description: 'Original verification request ID',
        },
      },
    },
  })
  async retryVerification(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ) {
    return this.proxyService.post(
      'userService',
      '/api/v1/identity-verification/retry',
      body,
      { Authorization: authorization },
    );
  }

  // ==================== Admin Verification Endpoints ====================
  // SECURITY: All admin endpoints require Role.ADMIN

  /**
   * GET /verification/admin/pending
   * Get pending verifications for admin review
   */
  @Get('admin/pending')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get pending verifications for admin review' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Pagination offset' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['email', 'phone', 'id', 'selfie', 'liveness', 'video', 'biometric'],
    description: 'Filter by verification type',
  })
  async getPendingVerifications(
    @Headers('authorization') authorization: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type') type?: string,
  ) {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    if (type) params.append('type', type);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return this.proxyService.get(
      'userService',
      `/api/v1/identity-verification/admin/pending${queryString}`,
      { Authorization: authorization },
    );
  }

  /**
   * POST /verification/admin/:requestId/approve
   * Approve a verification request
   */
  @Post('admin/:requestId/approve')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a verification request' })
  @ApiParam({ name: 'requestId', type: String, description: 'Verification request ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        notes: {
          type: 'string',
          description: 'Admin notes',
        },
      },
    },
  })
  async approveVerification(
    @Headers('authorization') authorization: string,
    @Param('requestId') requestId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/identity-verification/admin/${requestId}/approve`,
      body,
      { Authorization: authorization },
    );
  }

  /**
   * POST /verification/admin/:requestId/deny
   * Deny a verification request
   */
  @Post('admin/:requestId/deny')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deny a verification request' })
  @ApiParam({ name: 'requestId', type: String, description: 'Verification request ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['reason_code'],
      properties: {
        reason_code: {
          type: 'string',
          description: 'Denial reason code',
        },
        notes: {
          type: 'string',
          description: 'Admin notes',
        },
      },
    },
  })
  async denyVerification(
    @Headers('authorization') authorization: string,
    @Param('requestId') requestId: string,
    @Body() body: any,
  ) {
    return this.proxyService.post(
      'userService',
      `/api/v1/identity-verification/admin/${requestId}/deny`,
      body,
      { Authorization: authorization },
    );
  }
}
