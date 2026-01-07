import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';

import {
  VerificationService,
  VerificationResult,
  DocumentImage,
} from './verification.service';

class VerifyIdentityDto {
  userId: string;
  documentImages: DocumentImage[];
}

class VerifyPhotoDto {
  userId: string;
  selfieImage: string; // Base64 encoded
}

class CompareFacesDto {
  sourceImage: string; // Base64 encoded
  targetImage: string; // Base64 encoded
}

class RequestManualReviewDto {
  userId: string;
  reason?: string;
}

@ApiTags('verification')
@Controller('verification')
@ApiBearerAuth('JWT-auth')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post('identity')
  @ApiOperation({ summary: 'Verify user identity with document images' })
  @ApiBody({
    description: 'User ID and document images for identity verification',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        documentImages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              imageData: { type: 'string', description: 'Base64 encoded image' },
              documentType: {
                type: 'string',
                enum: ['passport', 'drivers_license', 'id_card'],
              },
            },
          },
        },
      },
      required: ['userId', 'documentImages'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Identity verification initiated',
    schema: {
      type: 'object',
      properties: {
        verificationId: { type: 'string' },
        userId: { type: 'string' },
        type: { type: 'string' },
        status: { type: 'string' },
        confidence: { type: 'number' },
        details: { type: 'object' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @HttpCode(HttpStatus.CREATED)
  async verifyIdentity(@Body() dto: VerifyIdentityDto): Promise<VerificationResult> {
    return this.verificationService.verifyIdentity(dto.userId, dto.documentImages);
  }

  @Post('photo')
  @ApiOperation({ summary: 'Verify user photo (selfie verification)' })
  @ApiBody({
    description: 'User ID and selfie image for photo verification',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        selfieImage: { type: 'string', description: 'Base64 encoded selfie image' },
      },
      required: ['userId', 'selfieImage'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Photo verification completed',
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @HttpCode(HttpStatus.CREATED)
  async verifyPhoto(@Body() dto: VerifyPhotoDto): Promise<VerificationResult> {
    return this.verificationService.verifyPhoto(dto.userId, dto.selfieImage);
  }

  @Get('status/:userId')
  @ApiOperation({ summary: 'Get verification status for a user' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Verification status retrieved',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string' },
        identityVerification: { type: 'string' },
        photoVerification: { type: 'string' },
        documentVerification: { type: 'string' },
        overallStatus: { type: 'string' },
        lastUpdated: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getVerificationStatus(@Param('userId') userId: string) {
    return this.verificationService.getVerificationStatus(userId);
  }

  @Post('manual-review')
  @ApiOperation({ summary: 'Request manual review for verification' })
  @ApiBody({
    description: 'Request manual review for a user verification',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'User ID' },
        reason: { type: 'string', description: 'Reason for manual review request' },
      },
      required: ['userId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Manual review request created',
    schema: {
      type: 'object',
      properties: {
        reviewId: { type: 'string' },
        userId: { type: 'string' },
        status: { type: 'string' },
        reason: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        estimatedReviewTime: { type: 'string' },
      },
    },
  })
  @HttpCode(HttpStatus.CREATED)
  async requestManualReview(@Body() dto: RequestManualReviewDto) {
    return this.verificationService.requestManualReview(dto.userId, dto.reason);
  }

  @Post('compare-faces')
  @ApiOperation({ summary: 'Compare two face images' })
  @ApiBody({
    description: 'Compare two face images for similarity',
    schema: {
      type: 'object',
      properties: {
        sourceImage: { type: 'string', description: 'Base64 encoded source image' },
        targetImage: { type: 'string', description: 'Base64 encoded target image' },
      },
      required: ['sourceImage', 'targetImage'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Face comparison result',
    schema: {
      type: 'object',
      properties: {
        match: { type: 'boolean' },
        confidence: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid images or face not detected' })
  @HttpCode(HttpStatus.OK)
  async compareFaces(@Body() dto: CompareFacesDto) {
    return this.verificationService.compareFaces(dto.sourceImage, dto.targetImage);
  }
}
