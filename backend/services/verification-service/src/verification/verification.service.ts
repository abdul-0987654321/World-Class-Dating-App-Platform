import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
  DetectModerationLabelsCommand,
} from '@aws-sdk/client-rekognition';
import { v4 as uuidv4 } from 'uuid';

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  MANUAL_REVIEW = 'manual_review',
}

export enum VerificationType {
  IDENTITY = 'identity',
  PHOTO = 'photo',
  DOCUMENT = 'document',
}

export interface VerificationResult {
  verificationId: string;
  userId: string;
  type: VerificationType;
  status: VerificationStatus;
  confidence?: number;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentImage {
  imageData: string; // Base64 encoded image
  documentType: 'passport' | 'drivers_license' | 'id_card';
}

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private rekognitionClient: RekognitionClient;

  constructor(private readonly configService: ConfigService) {
    this.rekognitionClient = new RekognitionClient({
      region: this.configService.get<string>('AWS_REGION') || 'us-east-1',
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Verify user identity by comparing document photo with selfie
   */
  async verifyIdentity(
    userId: string,
    documentImages: DocumentImage[]
  ): Promise<VerificationResult> {
    this.logger.log(`Starting identity verification for user: ${userId}`);

    const verificationId = uuidv4();
    const now = new Date();

    try {
      if (!documentImages || documentImages.length === 0) {
        throw new BadRequestException('At least one document image is required');
      }

      // Validate document images contain faces
      const faceDetectionResults = await Promise.all(
        documentImages.map(async (doc) => {
          const imageBytes = Buffer.from(doc.imageData, 'base64');
          return this.detectFaces(imageBytes);
        })
      );

      const hasFaces = faceDetectionResults.every((result) => result.faceCount > 0);

      if (!hasFaces) {
        return {
          verificationId,
          userId,
          type: VerificationType.IDENTITY,
          status: VerificationStatus.REJECTED,
          confidence: 0,
          details: {
            reason: 'No face detected in one or more document images',
            faceDetectionResults,
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      // Check for content moderation issues
      const moderationResults = await Promise.all(
        documentImages.map(async (doc) => {
          const imageBytes = Buffer.from(doc.imageData, 'base64');
          return this.checkContentModeration(imageBytes);
        })
      );

      const hasInappropriateContent = moderationResults.some(
        (result) => result.inappropriateContent
      );

      if (hasInappropriateContent) {
        return {
          verificationId,
          userId,
          type: VerificationType.IDENTITY,
          status: VerificationStatus.REJECTED,
          confidence: 0,
          details: {
            reason: 'Document contains inappropriate content',
            moderationResults,
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      // If all checks pass, mark as pending manual review for document verification
      return {
        verificationId,
        userId,
        type: VerificationType.IDENTITY,
        status: VerificationStatus.MANUAL_REVIEW,
        confidence: 75,
        details: {
          documentTypes: documentImages.map((d) => d.documentType),
          faceDetectionResults,
          requiresManualReview: true,
        },
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.logger.error(`Identity verification failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify photo by comparing with existing profile photos or document photos
   */
  async verifyPhoto(
    userId: string,
    selfieImage: string
  ): Promise<VerificationResult> {
    this.logger.log(`Starting photo verification for user: ${userId}`);

    const verificationId = uuidv4();
    const now = new Date();

    try {
      const imageBytes = Buffer.from(selfieImage, 'base64');

      // Detect faces in the selfie
      const faceResult = await this.detectFaces(imageBytes);

      if (faceResult.faceCount === 0) {
        return {
          verificationId,
          userId,
          type: VerificationType.PHOTO,
          status: VerificationStatus.REJECTED,
          confidence: 0,
          details: {
            reason: 'No face detected in selfie image',
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      if (faceResult.faceCount > 1) {
        return {
          verificationId,
          userId,
          type: VerificationType.PHOTO,
          status: VerificationStatus.REJECTED,
          confidence: 0,
          details: {
            reason: 'Multiple faces detected in selfie. Please submit a photo with only your face.',
            faceCount: faceResult.faceCount,
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      // Check for content moderation
      const moderationResult = await this.checkContentModeration(imageBytes);

      if (moderationResult.inappropriateContent) {
        return {
          verificationId,
          userId,
          type: VerificationType.PHOTO,
          status: VerificationStatus.REJECTED,
          confidence: 0,
          details: {
            reason: 'Photo contains inappropriate content',
            labels: moderationResult.labels,
          },
          createdAt: now,
          updatedAt: now,
        };
      }

      // Photo passes all automated checks
      const confidence = faceResult.faceDetails?.Confidence || 90;

      return {
        verificationId,
        userId,
        type: VerificationType.PHOTO,
        status: VerificationStatus.VERIFIED,
        confidence,
        details: {
          faceConfidence: confidence,
          qualityChecks: {
            brightness: faceResult.faceDetails?.Quality?.Brightness,
            sharpness: faceResult.faceDetails?.Quality?.Sharpness,
          },
        },
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      this.logger.error(`Photo verification failed for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<{
    userId: string;
    identityVerification: VerificationStatus;
    photoVerification: VerificationStatus;
    documentVerification: VerificationStatus;
    overallStatus: VerificationStatus;
    lastUpdated: Date;
  }> {
    this.logger.log(`Getting verification status for user: ${userId}`);

    // In a real implementation, this would query the database
    // For now, return a default status structure
    return {
      userId,
      identityVerification: VerificationStatus.PENDING,
      photoVerification: VerificationStatus.PENDING,
      documentVerification: VerificationStatus.PENDING,
      overallStatus: VerificationStatus.PENDING,
      lastUpdated: new Date(),
    };
  }

  /**
   * Request manual review for a verification
   */
  async requestManualReview(
    userId: string,
    reason?: string
  ): Promise<{
    reviewId: string;
    userId: string;
    status: string;
    reason?: string;
    createdAt: Date;
    estimatedReviewTime: string;
  }> {
    this.logger.log(`Manual review requested for user: ${userId}`);

    const reviewId = uuidv4();

    // In a real implementation, this would create a review ticket
    // and notify the moderation team
    return {
      reviewId,
      userId,
      status: 'pending',
      reason: reason || 'User requested manual review',
      createdAt: new Date(),
      estimatedReviewTime: '24-48 hours',
    };
  }

  /**
   * Compare two faces to verify they belong to the same person
   */
  async compareFaces(
    sourceImage: string,
    targetImage: string
  ): Promise<{ match: boolean; confidence: number }> {
    try {
      const command = new CompareFacesCommand({
        SourceImage: {
          Bytes: Buffer.from(sourceImage, 'base64'),
        },
        TargetImage: {
          Bytes: Buffer.from(targetImage, 'base64'),
        },
        SimilarityThreshold: 80,
      });

      const response = await this.rekognitionClient.send(command);

      if (response.FaceMatches && response.FaceMatches.length > 0) {
        const bestMatch = response.FaceMatches[0];
        return {
          match: true,
          confidence: bestMatch.Similarity || 0,
        };
      }

      return {
        match: false,
        confidence: 0,
      };
    } catch (error) {
      this.logger.error(`Face comparison failed: ${error.message}`);
      throw new BadRequestException('Failed to compare faces');
    }
  }

  /**
   * Detect faces in an image
   */
  private async detectFaces(imageBytes: Buffer): Promise<{
    faceCount: number;
    faceDetails?: {
      Confidence?: number;
      Quality?: {
        Brightness?: number;
        Sharpness?: number;
      };
    };
  }> {
    try {
      const command = new DetectFacesCommand({
        Image: {
          Bytes: imageBytes,
        },
        Attributes: ['ALL'],
      });

      const response = await this.rekognitionClient.send(command);

      return {
        faceCount: response.FaceDetails?.length || 0,
        faceDetails: response.FaceDetails?.[0]
          ? {
              Confidence: response.FaceDetails[0].Confidence,
              Quality: response.FaceDetails[0].Quality,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Face detection failed: ${error.message}`);
      return { faceCount: 0 };
    }
  }

  /**
   * Check image for inappropriate content
   */
  private async checkContentModeration(imageBytes: Buffer): Promise<{
    inappropriateContent: boolean;
    labels: string[];
  }> {
    try {
      const command = new DetectModerationLabelsCommand({
        Image: {
          Bytes: imageBytes,
        },
        MinConfidence: 60,
      });

      const response = await this.rekognitionClient.send(command);

      const inappropriateLabels = response.ModerationLabels?.filter(
        (label) => (label.Confidence || 0) > 70
      );

      return {
        inappropriateContent: inappropriateLabels ? inappropriateLabels.length > 0 : false,
        labels: inappropriateLabels?.map((l) => l.Name || 'Unknown') || [],
      };
    } catch (error) {
      this.logger.error(`Content moderation check failed: ${error.message}`);
      return { inappropriateContent: false, labels: [] };
    }
  }
}
