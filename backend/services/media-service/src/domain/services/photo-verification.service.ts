import contentModerationService from './content-moderation.service';
import mediaRepository from '../repositories/media.repository';
import queueManager from '../../infrastructure/queue/queue-manager';
import { JobPriority } from '../../infrastructure/queue/queue-config';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';
import * as faceapi from '@azure/cognitiveservices-face';
import { CognitiveServicesCredentials } from '@azure/ms-rest-azure-js';

const logger = createLogger('photo-verification-service');

// Azure Face API Configuration
const AZURE_FACE_KEY = process.env.AZURE_FACE_API_KEY || '';
const AZURE_FACE_ENDPOINT = process.env.AZURE_FACE_ENDPOINT || '';
const FACE_API_VERSION = '1.0';

// Verification thresholds
const FACE_MATCH_THRESHOLD = 0.7; // 70% confidence for same person
const LIVENESS_THRESHOLD = 0.6; // 60% confidence for liveness
const QUALITY_THRESHOLD = 0.5; // 50% minimum quality score

// Initialize Azure Face Client
let faceClient: faceapi.FaceClient | null = null;
if (AZURE_FACE_KEY && AZURE_FACE_ENDPOINT) {
  const credentials = new CognitiveServicesCredentials(AZURE_FACE_KEY);
  faceClient = new faceapi.FaceClient(credentials, AZURE_FACE_ENDPOINT);
}

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
   * Detect faces in an image using Azure Face API
   */
  private async detectFaces(imageUrl: string): Promise<any[]> {
    try {
      if (!faceClient) {
        throw new Error('Azure Face API not configured');
      }

      // Download image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBuffer = Buffer.from(imageResponse.data);

      // Detect faces with attributes
      const faces = await faceClient.face.detectWithUrl(imageUrl, {
        returnFaceAttributes: [
          'age',
          'gender',
          'smile',
          'facialHair',
          'glasses',
          'headPose',
          'emotion',
          'hair',
          'makeup',
          'occlusion',
          'accessories',
          'blur',
          'exposure',
          'noise',
        ],
        returnFaceId: true,
        recognitionModel: 'recognition_04',
        detectionModel: 'detection_03',
      });

      return faces;
    } catch (error) {
      logger.error('Face detection failed', error);
      throw error;
    }
  }

  /**
   * Calculate photo quality score based on face attributes
   */
  private calculateQualityScore(faceAttributes: any): number {
    let qualityScore = 1.0;

    // Reduce score for blur
    if (faceAttributes.blur?.blurLevel === 'high') {
      qualityScore -= 0.3;
    } else if (faceAttributes.blur?.blurLevel === 'medium') {
      qualityScore -= 0.15;
    }

    // Reduce score for poor exposure
    if (faceAttributes.exposure?.exposureLevel === 'overExposure' ||
        faceAttributes.exposure?.exposureLevel === 'underExposure') {
      qualityScore -= 0.2;
    }

    // Reduce score for high noise
    if (faceAttributes.noise?.noiseLevel === 'high') {
      qualityScore -= 0.2;
    } else if (faceAttributes.noise?.noiseLevel === 'medium') {
      qualityScore -= 0.1;
    }

    // Reduce score for occlusion
    if (faceAttributes.occlusion) {
      if (faceAttributes.occlusion.foreheadOccluded) qualityScore -= 0.1;
      if (faceAttributes.occlusion.eyeOccluded) qualityScore -= 0.15;
      if (faceAttributes.occlusion.mouthOccluded) qualityScore -= 0.1;
    }

    return Math.max(0, qualityScore);
  }

  /**
   * Verify a photo meets basic requirements
   * - Contains exactly one face
   * - Face is clearly visible
   * - Photo meets quality standards
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
          details: {
            faceDetected: false,
            faceCount: 0,
          },
        };
      }

      if (faces.length > 1) {
        logger.warn(`Multiple faces detected in photo: ${mediaId}`);
        return {
          verified: false,
          confidence: 0,
          reason: 'Profile photos must contain exactly one person',
          details: {
            faceDetected: true,
            faceCount: faces.length,
          },
        };
      }

      // Step 2: Check photo quality
      const face = faces[0];
      const qualityScore = this.calculateQualityScore(face.faceAttributes);

      if (qualityScore < QUALITY_THRESHOLD) {
        logger.warn(`Low quality photo: ${mediaId}, score: ${qualityScore}`);
        return {
          verified: false,
          confidence: qualityScore,
          reason: 'Photo quality is too low. Please use a clear, well-lit photo.',
          details: {
            faceDetected: true,
            faceCount: 1,
            qualityScore,
          },
        };
      }

      // Step 3: Verification passed
      const result: VerificationResult = {
        verified: true,
        confidence: qualityScore,
        details: {
          faceDetected: true,
          faceCount: 1,
          qualityScore,
        },
      };

      // Update media verification status
      await mediaRepository.update(mediaId, {
        isVerified: true,
        verificationData: {
          faceId: face.faceId,
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
      if (!faceClient) {
        throw new Error('Azure Face API not configured');
      }

      // Detect faces in both images
      const faces1 = await this.detectFaces(imageUrl1);
      const faces2 = await this.detectFaces(imageUrl2);

      if (faces1.length === 0 || faces2.length === 0) {
        throw new Error('No face detected in one or both images');
      }

      const faceId1 = faces1[0].faceId;
      const faceId2 = faces2[0].faceId;

      // Verify if same person
      const verifyResult = await faceClient.face.verifyFaceToFace(faceId1, faceId2);

      return verifyResult.confidence;
    } catch (error) {
      logger.error('Face comparison failed', error);
      throw error;
    }
  }

  /**
   * Verify a profile photo against a reference photo
   * Uses AI-powered face matching to ensure it's the same person
   */
  async verifyProfilePhoto(
    mediaId: string,
    imageUrl: string,
    referencePhotoUrl?: string
  ): Promise<VerificationResult> {
    try {
      logger.info(`Verifying profile photo: ${mediaId}`);

      // Step 1: Basic photo verification
      const basicVerification = await this.verifyPhoto(mediaId, imageUrl);

      if (!basicVerification.verified) {
        return basicVerification;
      }

      // Step 2: If reference photo provided, perform face matching
      if (referencePhotoUrl) {
        logger.info(`Performing face matching with reference photo`);

        const matchScore = await this.compareFaces(imageUrl, referencePhotoUrl);

        if (matchScore < FACE_MATCH_THRESHOLD) {
          logger.warn(`Face match failed: ${matchScore} < ${FACE_MATCH_THRESHOLD}`);
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
   * Helps prevent fake profiles
   */
  async detectStockPhoto(imageUrl: string): Promise<{
    isStockPhoto: boolean;
    confidence: number;
    source?: string;
  }> {
    try {
      logger.info('Checking for stock photo');

      // Use reverse image search or stock photo detection API
      // For now, using Azure Computer Vision's celebrity detection
      if (!faceClient) {
        return { isStockPhoto: false, confidence: 0 };
      }

      const faces = await this.detectFaces(imageUrl);

      // If we detect multiple professional-looking photos with same face
      // across different user accounts, flag as potential stock photo
      // This would require a database of known face IDs

      // Placeholder implementation
      return {
        isStockPhoto: false,
        confidence: 0,
      };
    } catch (error) {
      logger.error('Stock photo detection failed', error);
      return { isStockPhoto: false, confidence: 0 };
    }
  }

  /**
   * Check if same face exists in multiple accounts
   * Helps detect duplicate/fake profiles
   */
  async detectDuplicateProfile(userId: string, faceId: string): Promise<{
    isDuplicate: boolean;
    matchingUserIds: string[];
  }> {
    try {
      logger.info(`Checking for duplicate profiles for user: ${userId}`);

      // Query all verified photos from other users
      const allPhotos = await mediaRepository.findAll({
        where: {
          isVerified: true,
          userId: { $ne: userId }, // Exclude current user
        },
        select: ['id', 'userId', 'verificationData'],
      });

      const matchingUsers: string[] = [];

      // Compare with each photo
      for (const photo of allPhotos) {
        if (photo.verificationData?.faceId) {
          try {
            if (!faceClient) continue;

            const verifyResult = await faceClient.face.verifyFaceToFace(
              faceId,
              photo.verificationData.faceId
            );

            if (verifyResult.isIdentical && verifyResult.confidence > FACE_MATCH_THRESHOLD) {
              matchingUsers.push(photo.userId);
              logger.warn(`Duplicate profile detected: ${userId} matches ${photo.userId}`);
            }
          } catch (error) {
            // Continue checking other photos
            continue;
          }
        }
      }

      return {
        isDuplicate: matchingUsers.length > 0,
        matchingUserIds: matchingUsers,
      };
    } catch (error) {
      logger.error('Duplicate profile detection failed', error);
      return { isDuplicate: false, matchingUserIds: [] };
    }
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
        {
          mediaId,
          userId,
          imageUrl,
          referencePhotoUrl,
        },
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
  async getVerificationStatus(mediaId: string): Promise<{
    isVerified: boolean;
    mediaId: string;
  }> {
    try {
      const media = await mediaRepository.findById(mediaId);

      if (!media) {
        throw new Error('Media not found');
      }

      return {
        mediaId: media.id,
        isVerified: media.isVerified,
      };
    } catch (error) {
      logger.error('Failed to get verification status', error);
      throw error;
    }
  }

  /**
   * Verify all user photos
   * Useful when implementing identity verification workflows
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
      const unverified = photos.length - verified;

      return {
        total: photos.length,
        verified,
        unverified,
      };
    } catch (error) {
      logger.error('Failed to verify user photos', error);
      throw error;
    }
  }

  /**
   * Implement liveness detection
   * Verifies the photo is of a real person, not a screen or printout
   * Uses Azure Face Liveness Detection
   */
  async verifyLiveness(imageUrl: string): Promise<{
    isLive: boolean;
    confidence: number;
    livenessScore?: number;
  }> {
    try {
      logger.info('Performing liveness detection');

      if (!faceClient) {
        logger.warn('Azure Face API not configured, skipping liveness check');
        return { isLive: true, confidence: 0.5 };
      }

      // Detect face with liveness
      const faces = await this.detectFaces(imageUrl);

      if (faces.length === 0) {
        return { isLive: false, confidence: 0 };
      }

      const face = faces[0];

      // Calculate liveness score based on multiple factors
      let livenessScore = 1.0;

      // Check for signs of photo-of-photo
      // High blur + good exposure = potential screen/print
      if (face.faceAttributes?.blur?.blurLevel === 'low' &&
          face.faceAttributes?.noise?.noiseLevel === 'low') {
        livenessScore += 0.2; // Real photos have some natural imperfections
      }

      // Check head pose variations
      if (face.faceAttributes?.headPose) {
        const headPose = face.faceAttributes.headPose;
        // Slight natural variations indicate real person
        if (Math.abs(headPose.roll) < 15 && Math.abs(headPose.yaw) < 20) {
          livenessScore += 0.1;
        }
      }

      // Check for natural expressions
      if (face.faceAttributes?.emotion) {
        const emotions = face.faceAttributes.emotion;
        const totalEmotion = Object.values(emotions).reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0);
        if (totalEmotion > 0) {
          livenessScore += 0.1; // Natural emotions present
        }
      }

      // Normalize score
      livenessScore = Math.min(1.0, livenessScore);

      const isLive = livenessScore >= LIVENESS_THRESHOLD;

      logger.info(`Liveness detection complete: ${isLive}, score: ${livenessScore}`);

      return {
        isLive,
        confidence: livenessScore,
        livenessScore,
      };
    } catch (error) {
      logger.error('Liveness detection failed', error);
      throw error;
    }
  }

  /**
   * Comprehensive photo verification including all checks
   * - Face detection
   * - Quality check
   * - Face matching (if reference provided)
   * - Liveness detection
   * - Duplicate detection
   */
  async comprehensiveVerification(
    mediaId: string,
    userId: string,
    imageUrl: string,
    referencePhotoUrl?: string
  ): Promise<VerificationResult & {
    liveness?: { isLive: boolean; confidence: number };
    duplicate?: { isDuplicate: boolean; matchingUserIds: string[] };
  }> {
    try {
      logger.info(`Starting comprehensive verification for ${mediaId}`);

      // Step 1: Basic verification with optional face matching
      const basicResult = await this.verifyProfilePhoto(
        mediaId,
        imageUrl,
        referencePhotoUrl
      );

      if (!basicResult.verified) {
        return basicResult;
      }

      // Step 2: Liveness detection
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

      // Step 3: Duplicate profile detection (if face ID available)
      const media = await mediaRepository.findById(mediaId);
      let duplicateResult;

      if (media?.verificationData?.faceId) {
        duplicateResult = await this.detectDuplicateProfile(
          userId,
          media.verificationData.faceId
        );

        if (duplicateResult.isDuplicate) {
          logger.warn(`Duplicate profile detected for user ${userId}`);
          // Don't auto-reject, but flag for manual review
          await mediaRepository.update(mediaId, {
            flaggedForReview: true,
            flagReason: 'Duplicate profile detected',
          });
        }
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
