import {
  RekognitionClient,
  DetectFacesCommand,
  CompareFacesCommand,
  FaceDetail,
} from '@aws-sdk/client-rekognition';
import { createLogger } from '@flamoral/backend-shared';
import axios from 'axios';

import config from '../../config';
import { JobPriority } from '../../infrastructure/queue/queue-config';
import queueManager from '../../infrastructure/queue/queue-manager';
import mediaRepository from '../repositories/media.repository';

const logger = createLogger('photo-verification-service');

// AWS Rekognition Configuration
const AWS_REGION = process.env.AWS_REGION || config.aws.region || 'us-east-1';

// Verification thresholds
const FACE_MATCH_THRESHOLD = 70; // 70% confidence for same person (Rekognition uses 0-100)
const LIVENESS_THRESHOLD = 0.6; // 60% confidence for liveness
const QUALITY_THRESHOLD = 0.5; // 50% minimum quality score

// Initialize AWS Rekognition Client
const rekognitionClient = new RekognitionClient({
  region: AWS_REGION,
});

export interface VerificationResult {
  verified: boolean;
  confidence: number;
  reason?: string;
  details?: {
    faceDetected: boolean;
    faceCount?: number;
    qualityScore?: number;
    matchScore?: number;
  };
}

export class PhotoVerificationService {
  /**
   * Detect faces in an image using AWS Rekognition
   */
  private async detectFaces(imageUrl: string): Promise<FaceDetail[]> {
    try {
      // Download image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBytes = Buffer.from(imageResponse.data);

      // Detect faces with attributes
      const command = new DetectFacesCommand({
        Image: { Bytes: imageBytes },
        Attributes: ['ALL'],
      });

      const response = await rekognitionClient.send(command);
      return response.FaceDetails || [];
    } catch (error) {
      logger.error('Face detection failed', error);
      throw error;
    }
  }

  /**
   * Calculate photo quality score based on face attributes from AWS Rekognition
   */
  private calculateQualityScore(faceDetail: FaceDetail): number {
    let qualityScore = 1.0;
    const quality = faceDetail.Quality;

    if (quality) {
      // Reduce score for blur (Rekognition uses Sharpness - higher is better)
      if (quality.Sharpness !== undefined) {
        if (quality.Sharpness < 30) {
          qualityScore -= 0.3;
        } else if (quality.Sharpness < 60) {
          qualityScore -= 0.15;
        }
      }

      // Reduce score for poor brightness
      if (quality.Brightness !== undefined) {
        if (quality.Brightness < 20 || quality.Brightness > 90) {
          qualityScore -= 0.2;
        }
      }
    }

    // Check for occlusion using pose
    const pose = faceDetail.Pose;
    if (pose) {
      // Extreme angles indicate potential occlusion or poor angle
      if (Math.abs(pose.Roll || 0) > 30) qualityScore -= 0.1;
      if (Math.abs(pose.Yaw || 0) > 40) qualityScore -= 0.15;
      if (Math.abs(pose.Pitch || 0) > 30) qualityScore -= 0.1;
    }

    // Check for sunglasses that might obscure face
    if (faceDetail.Sunglasses?.Value) qualityScore -= 0.15;

    return Math.max(0, qualityScore);
  }

  /**
   * Verify a photo meets basic requirements
   */
  async verifyPhoto(mediaId: string, imageUrl: string): Promise<VerificationResult> {
    try {
      logger.info(`Verifying photo: ${mediaId}`);

      // Step 1: Detect faces
      const faces = await this.detectFaces(imageUrl);

      if (faces.length === 0) {
        logger.warn(`No face detected in photo: ${mediaId}`);
        return {
          verified: false,
          confidence: 0,
          reason: 'No face detected in the photo',
          details: { faceDetected: false, faceCount: 0 },
        };
      }

      if (faces.length > 1) {
        logger.warn(`Multiple faces detected in photo: ${mediaId}`);
        return {
          verified: false,
          confidence: 0,
          reason: 'Profile photos must contain exactly one person',
          details: { faceDetected: true, faceCount: faces.length },
        };
      }

      // Step 2: Check photo quality
      const face = faces[0];
      const qualityScore = this.calculateQualityScore(face);

      if (qualityScore < QUALITY_THRESHOLD) {
        logger.warn(`Low quality photo: ${mediaId}, score: ${qualityScore}`);
        return {
          verified: false,
          confidence: qualityScore,
          reason: 'Photo quality is too low. Please use a clear, well-lit photo.',
          details: { faceDetected: true, faceCount: 1, qualityScore },
        };
      }

      // Step 3: Verification passed
      const result: VerificationResult = {
        verified: true,
        confidence: qualityScore,
        details: { faceDetected: true, faceCount: 1, qualityScore },
      };

      // Update media verification status
      await mediaRepository.update(mediaId, {
        isVerified: true,
        verificationData: {
          boundingBox: face.BoundingBox,
          qualityScore,
          verifiedAt: new Date().toISOString(),
        },
      });

      logger.info(`Photo verified successfully: ${mediaId}`);
      return result;
    } catch (error) {
      logger.error('Photo verification failed', error);
      throw error;
    }
  }

  /**
   * Compare two faces to determine if they're the same person
   */
  private async compareFaces(imageUrl1: string, imageUrl2: string): Promise<number> {
    try {
      // Download both images
      const [image1Response, image2Response] = await Promise.all([
        axios.get(imageUrl1, { responseType: 'arraybuffer' }),
        axios.get(imageUrl2, { responseType: 'arraybuffer' }),
      ]);

      const sourceBytes = Buffer.from(image1Response.data);
      const targetBytes = Buffer.from(image2Response.data);

      // Compare faces
      const command = new CompareFacesCommand({
        SourceImage: { Bytes: sourceBytes },
        TargetImage: { Bytes: targetBytes },
        SimilarityThreshold: 0,
      });

      const response = await rekognitionClient.send(command);

      if (!response.FaceMatches || response.FaceMatches.length === 0) {
        throw new Error('No face detected in one or both images');
      }

      // Return the highest similarity score (0-100, convert to 0-1)
      const highestMatch = response.FaceMatches.reduce((max, match) => {
        return (match.Similarity || 0) > (max.Similarity || 0) ? match : max;
      }, response.FaceMatches[0]);

      return (highestMatch.Similarity || 0) / 100;
    } catch (error) {
      logger.error('Face comparison failed', error);
      throw error;
    }
  }

  /**
   * Verify a profile photo against a reference photo
   */
  async verifyProfilePhoto(
    mediaId: string,
    imageUrl: string,
    referencePhotoUrl?: string
  ): Promise<VerificationResult> {
    try {
      logger.info(`Verifying profile photo: ${mediaId}`);

      const basicVerification = await this.verifyPhoto(mediaId, imageUrl);

      if (!basicVerification.verified) {
        return basicVerification;
      }

      if (referencePhotoUrl) {
        logger.info(`Performing face matching with reference photo`);
        const matchScore = await this.compareFaces(imageUrl, referencePhotoUrl);

        if (matchScore < FACE_MATCH_THRESHOLD / 100) {
          logger.warn(`Face match failed: ${matchScore} < ${FACE_MATCH_THRESHOLD / 100}`);
          return {
            verified: false,
            confidence: matchScore,
            reason: 'Face does not match your verified photo. Please use a photo of yourself.',
            details: {
              faceDetected: true,
              faceCount: 1,
              matchScore,
              qualityScore: basicVerification.details?.qualityScore,
            },
          };
        }

        return {
          verified: true,
          confidence: matchScore,
          details: {
            faceDetected: true,
            faceCount: 1,
            matchScore,
            qualityScore: basicVerification.details?.qualityScore,
          },
        };
      }

      return basicVerification;
    } catch (error) {
      logger.error('Profile photo verification failed', error);
      throw error;
    }
  }

  /**
   * Detect if a photo is a stock photo or celebrity
   */
  async detectStockPhoto(_imageUrl: string): Promise<{
    isStockPhoto: boolean;
    confidence: number;
    source?: string;
  }> {
    // Placeholder implementation
    return { isStockPhoto: false, confidence: 0 };
  }

  /**
   * Check if same face exists in multiple accounts
   */
  async detectDuplicateProfile(
    _userId: string,
    _imageUrl: string
  ): Promise<{ isDuplicate: boolean; matchingUserIds: string[] }> {
    // Note: Full implementation requires face collections
    return { isDuplicate: false, matchingUserIds: [] };
  }

  /**
   * Queue photo verification job
   */
  async queueVerification(
    mediaId: string,
    userId: string,
    imageUrl: string,
    referencePhotoUrl?: string
  ): Promise<void> {
    try {
      logger.info(`Queueing verification for photo: ${mediaId}`);
      await queueManager.addPhotoVerificationJob(
        { mediaId, userId, imageUrl, referencePhotoUrl },
        JobPriority.HIGH
      );
      logger.info(`Verification job queued for photo: ${mediaId}`);
    } catch (error) {
      logger.error('Failed to queue verification job', error);
      throw error;
    }
  }

  /**
   * Get verification status for a photo
   */
  async getVerificationStatus(mediaId: string): Promise<{ isVerified: boolean; mediaId: string }> {
    try {
      const media = await mediaRepository.findById(mediaId);
      if (!media) throw new Error('Media not found');
      return { mediaId: media.id, isVerified: media.isVerified };
    } catch (error) {
      logger.error('Failed to get verification status', error);
      throw error;
    }
  }

  /**
   * Verify all user photos
   */
  async verifyUserPhotos(userId: string): Promise<{
    total: number;
    verified: number;
    unverified: number;
  }> {
    try {
      logger.info(`Verifying all photos for user: ${userId}`);
      const photos = await mediaRepository.findByUserId(userId);
      const verified = photos.filter((photo) => photo.isVerified).length;
      return { total: photos.length, verified, unverified: photos.length - verified };
    } catch (error) {
      logger.error('Failed to verify user photos', error);
      throw error;
    }
  }

  /**
   * Implement liveness detection using AWS Rekognition
   */
  async verifyLiveness(imageUrl: string): Promise<{
    isLive: boolean;
    confidence: number;
    livenessScore?: number;
  }> {
    try {
      logger.info('Performing liveness detection');
      const faces = await this.detectFaces(imageUrl);

      if (faces.length === 0) {
        return { isLive: false, confidence: 0 };
      }

      const face = faces[0];
      let livenessScore = 1.0;
      const quality = face.Quality;

      if (quality?.Sharpness !== undefined && quality.Sharpness > 60) {
        livenessScore += 0.1;
      }

      if (quality?.Brightness !== undefined && quality.Brightness > 30 && quality.Brightness < 80) {
        livenessScore += 0.1;
      }

      const pose = face.Pose;
      if (pose && Math.abs(pose.Roll || 0) < 15 && Math.abs(pose.Yaw || 0) < 20) {
        livenessScore += 0.1;
      }

      const emotions = face.Emotions;
      if (emotions && emotions.length > 0) {
        const dominantEmotion = emotions.reduce(
          (max, e) => ((e.Confidence || 0) > (max.Confidence || 0) ? e : max),
          emotions[0]
        );
        if ((dominantEmotion.Confidence || 0) > 50) {
          livenessScore += 0.1;
        }
      }

      livenessScore = Math.min(1.0, livenessScore);
      const isLive = livenessScore >= LIVENESS_THRESHOLD;

      logger.info(`Liveness detection complete: ${isLive}, score: ${livenessScore}`);
      return { isLive, confidence: livenessScore, livenessScore };
    } catch (error) {
      logger.error('Liveness detection failed', error);
      throw error;
    }
  }

  /**
   * Comprehensive photo verification including all checks
   */
  async comprehensiveVerification(
    mediaId: string,
    userId: string,
    imageUrl: string,
    referencePhotoUrl?: string
  ): Promise<
    VerificationResult & {
      liveness?: { isLive: boolean; confidence: number };
      duplicate?: { isDuplicate: boolean; matchingUserIds: string[] };
    }
  > {
    try {
      logger.info(`Starting comprehensive verification for ${mediaId}`);

      const basicResult = await this.verifyProfilePhoto(mediaId, imageUrl, referencePhotoUrl);

      if (!basicResult.verified) {
        return basicResult;
      }

      const livenessResult = await this.verifyLiveness(imageUrl);

      if (!livenessResult.isLive) {
        return {
          verified: false,
          confidence: livenessResult.confidence,
          reason: 'Photo appears to be a screenshot or print. Please take a new photo.',
          details: basicResult.details,
          liveness: livenessResult,
        };
      }

      const duplicateResult = await this.detectDuplicateProfile(userId, imageUrl);

      if (duplicateResult.isDuplicate) {
        logger.warn(`Duplicate profile detected for user ${userId}`);
        await mediaRepository.update(mediaId, {
          flaggedForReview: true,
          flagReason: 'Duplicate profile detected',
        });
      }

      return {
        ...basicResult,
        liveness: livenessResult,
        duplicate: duplicateResult,
      };
    } catch (error) {
      logger.error('Comprehensive verification failed', error);
      throw error;
    }
  }
}

export default new PhotoVerificationService();
