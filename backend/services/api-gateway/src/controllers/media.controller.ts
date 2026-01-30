import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { Roles } from '../decorators/roles.decorator';
import { RolesGuard, Role } from '../guards/roles.guard';
import { ProxyService } from '../services/proxy.service';

@ApiTags('media')
@ApiBearerAuth('JWT-auth')
@Controller('media')
export class MediaController {
  constructor(private readonly proxyService: ProxyService) {}

  // ==================== Upload Endpoints ====================

  /**
   * Upload photo (main upload endpoint)
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload a photo' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  async uploadPhoto(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('mediaService', '/api/media/upload', body, {
      Authorization: authorization,
    });
  }

  /**
   * Upload image (alias)
   */
  @Post('upload/image')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  async uploadImage(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('mediaService', '/api/media/upload', body, {
      Authorization: authorization,
    });
  }

  /**
   * Upload video
   */
  @Post('upload/video')
  @ApiOperation({ summary: 'Upload a video' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  async uploadVideo(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('mediaService', '/api/media/upload/video', body, {
      Authorization: authorization,
    });
  }

  /**
   * Upload multiple files
   */
  @Post('upload/batch')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @HttpCode(HttpStatus.CREATED)
  async uploadBatch(@Headers('authorization') authorization: string, @Body() body: Record<string, unknown>) {
    return this.proxyService.post('mediaService', '/api/media/upload/batch', body, {
      Authorization: authorization,
    });
  }

  // ==================== Media Management Endpoints ====================

  /**
   * Get user media (admin/moderator only for other users)
   * SECURITY: Requires Role.MODERATOR — normal users access own media via /users/me/photos
   */
  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MODERATOR)
  @ApiOperation({ summary: 'Get all media for a user (admin/moderator)' })
  async getUserMedia(
    @Headers('authorization') authorization: string,
    @Param('userId') userId: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const queryString = new URLSearchParams();
    if (type) queryString.append('type', type);
    if (limit) queryString.append('limit', limit);
    if (offset) queryString.append('offset', offset);

    const path = `/api/media/user/${userId}${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('mediaService', path, {
      Authorization: authorization,
    });
  }

  /**
   * Get media by ID
   */
  @Get(':mediaId')
  @ApiOperation({ summary: 'Get media by ID' })
  async getMedia(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.get('mediaService', `/api/media/${mediaId}`, {
      Authorization: authorization,
    });
  }

  /**
   * Delete media
   */
  @Delete(':mediaId')
  @ApiOperation({ summary: 'Delete media' })
  async deleteMedia(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.delete('mediaService', `/api/media/${mediaId}`, {
      Authorization: authorization,
    });
  }

  // ==================== Processing Endpoints ====================

  /**
   * Get image processing status
   */
  @Get(':mediaId/status')
  @ApiOperation({ summary: 'Get media processing status' })
  async getProcessingStatus(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.get('mediaService', `/api/media/${mediaId}/status`, {
      Authorization: authorization,
    });
  }

  /**
   * Request image resizing
   */
  @Post(':mediaId/resize')
  @ApiOperation({ summary: 'Request image resize' })
  @HttpCode(HttpStatus.OK)
  async resizeImage(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('mediaService', `/api/media/${mediaId}/resize`, body, {
      Authorization: authorization,
    });
  }

  /**
   * Generate thumbnail
   */
  @Post(':mediaId/thumbnail')
  @ApiOperation({ summary: 'Generate thumbnail' })
  @HttpCode(HttpStatus.OK)
  async generateThumbnail(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string,
    @Body() body: Record<string, unknown>
  ) {
    return this.proxyService.post('mediaService', `/api/media/${mediaId}/thumbnail`, body, {
      Authorization: authorization,
    });
  }

  // ==================== URL Generation Endpoints ====================

  /**
   * Get signed URL for media
   */
  @Get(':mediaId/url')
  @ApiOperation({ summary: 'Get signed URL for media access' })
  async getSignedUrl(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string,
    @Query('expires') expires?: string
  ) {
    const queryString = new URLSearchParams();
    if (expires) queryString.append('expires', expires);

    const path = `/api/media/${mediaId}/url${queryString.toString() ? '?' + queryString.toString() : ''}`;
    return this.proxyService.get('mediaService', path, {
      Authorization: authorization,
    });
  }

  // ==================== Moderation Endpoints ====================

  /**
   * Get media moderation status
   */
  @Get(':mediaId/moderation')
  @ApiOperation({ summary: 'Get media moderation status' })
  async getModerationStatus(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.get('mediaService', `/api/media/${mediaId}/moderation`, {
      Authorization: authorization,
    });
  }

  /**
   * Request media moderation review
   */
  @Post(':mediaId/moderation/review')
  @ApiOperation({ summary: 'Request moderation review' })
  @HttpCode(HttpStatus.OK)
  async requestModerationReview(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.post(
      'mediaService',
      `/api/media/${mediaId}/moderation/review`,
      {},
      {
        Authorization: authorization,
      }
    );
  }

  // ==================== Analytics Endpoints ====================

  /**
   * Get media analytics
   */
  @Get(':mediaId/analytics')
  @ApiOperation({ summary: 'Get media analytics' })
  async getMediaAnalytics(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.get('mediaService', `/api/media/${mediaId}/analytics`, {
      Authorization: authorization,
    });
  }

  /**
   * Track media view
   */
  @Post(':mediaId/views')
  @ApiOperation({ summary: 'Track media view' })
  @HttpCode(HttpStatus.OK)
  async trackView(
    @Headers('authorization') authorization: string,
    @Param('mediaId') mediaId: string
  ) {
    return this.proxyService.post(
      'mediaService',
      `/api/media/${mediaId}/views`,
      {},
      {
        Authorization: authorization,
      }
    );
  }
}
