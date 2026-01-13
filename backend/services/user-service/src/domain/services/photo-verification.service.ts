import {
  RekognitionClient,
  DetectFacesCommand,
  CompareFacesCommand,
  DetectFacesCommandOutput,
  CompareFacesCommandOutput,
} from '@aws-sdk/client-rekognition';

import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

export interface PhotoVerificationRequest {
  userId: string;
  photoUrl: string;
  pose?: string;
}

export interface PhotoVerificationResult {
  verified: boolean;
  confidence: number;
  reason?: string;
  faceMatch?: boolean;
  livenessDetected?: boolean;
  status?: 'approved' | 'rejected' | 'pending_review';
  requiresManualReview?: boolean;
}

/**
 * Photo Verification Service
 * Implements selfie verification with pose detection and face matching
 * Uses AWS Rekognition for face detection and comparison
 * Includes graceful degradation when AWS Rekognition is unavailable
 */
export class PhotoVerificationService {
  private readonly VERIFICATION_THRESHOLD = 0.85; // 85% confidence threshold
  private readonly FACE_MATCH_THRESHOLD = 0.9; // 90% face match threshold
  private readonly AWS_API_TIMEOUT = 10000; // 10 second timeout for AWS API calls
  private rekognitionClient: RekognitionClient | null = null;

  constructor() {
    // Initialize AWS Rekognition client if AWS_REGION is configured
    if (process.env.AWS_REGION) {
      this.rekognitionClient = new RekognitionClient({
        region: process.env.AWS_REGION,
        // AWS SDK will automatically use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
        // from environment variables, or IAM role credentials in production
      });
    }
  }

  /**
   * Request photo verification
   */
  async requestVerification(
    userId: string,
    pose?: string
  ): Promise<{ verificationId: string; pose: string; expiresAt: Date }> {
    try {
      // Generate random pose if not provided
      const selectedPose = pose || this.generateRandomPose();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Create verification request
      const [verificationId] = await db('photo_verification_requests')
        .insert({
          user_id: userId,
          requested_pose: selectedPose,
          status: 'pending',
          expires_at: expiresAt,
          created_at: new Date(),
        })
        .returning('id');

      logger.info(`Photo verification requested for user ${userId} with pose ${selectedPose}`);

      return {
        verificationId: verificationId.id || verificationId,
        pose: selectedPose,
        expiresAt,
      };
    } catch (error) {
      logger.error('Error requesting photo verification:', error);
      throw new Error('Failed to request photo verification');
    }
  }

  /**
   * Generate random pose instruction
   */
  private generateRandomPose(): string {
    const poses = ['smile', 'neutral', 'look_left', 'look_right', 'look_up', 'thumbs_up'];

    return poses[Math.floor(Math.random() * poses.length)];
  }

  /**
   * Submit photo for verification
   */
  async submitPhoto(verificationId: string, photoUrl: string): Promise<PhotoVerificationResult> {
    try {
      // Get verification request
      const request = await db('photo_verification_requests').where({ id: verificationId }).first();

      if (!request) {
        throw new Error('Verification request not found');
      }

      if (request.status !== 'pending') {
        throw new Error('Verification request already processed');
      }

      if (new Date() > new Date(request.expires_at)) {
        await this.updateVerificationStatus(verificationId, 'expired', null);
        throw new Error('Verification request expired');
      }

      // Verify the photo
      const result = await this.verifyPhoto(
        request.user_id,
        photoUrl,
        request.requested_pose,
        verificationId
      );

      // Handle pending review status
      if (result.status === 'pending_review') {
        await this.updateVerificationStatus(verificationId, 'pending_review' as any, result);
        logger.info(`Photo queued for manual review for user ${request.user_id}`);
        return result;
      }

      // Update verification request
      await this.updateVerificationStatus(
        verificationId,
        result.verified ? 'approved' : 'rejected',
        result
      );

      // If verified, update user profile
      if (result.verified) {
        await db('users').where({ id: request.user_id }).update({
          photo_verified: true,
          photo_verified_at: new Date(),
        });

        // Add verification badge
        await this.addVerificationBadge(request.user_id);

        logger.info(`User ${request.user_id} photo verified successfully`);
      } else {
        logger.warn(`Photo verification failed for user ${request.user_id}: ${result.reason}`);
      }

      return result;
    } catch (error) {
      logger.error('Error submitting photo verification:', error);
      throw new Error('Failed to submit photo verification');
    }
  }

  /**
   * Verify photo using AWS Rekognition with graceful degradation
   */
  private async verifyPhoto(
    userId: string,
    photoUrl: string,
    requestedPose: string,
    verificationId?: string
  ): Promise<PhotoVerificationResult> {
    try {
      // Step 1: Detect face and liveness
      const livenessResult = await this.detectLiveness(userId, photoUrl, verificationId);

      // Check if manual review was triggered
      if (livenessResult.requiresManualReview) {
        return {
          verified: false,
          confidence: 0.5,
          reason: 'Photo submitted for manual verification',
          status: 'pending_review',
          requiresManualReview: true,
        };
      }

      if (!livenessResult.live) {
        return {
          verified: false,
          confidence: livenessResult.confidence,
          reason: 'Liveness check failed. Please submit a real-time selfie.',
          livenessDetected: false,
        };
      }

      // Step 2: Verify pose
      const poseResult = await this.verifyPose(userId, photoUrl, requestedPose, verificationId);

      // Check if manual review was triggered
      if (poseResult.requiresManualReview) {
        return {
          verified: false,
          confidence: 0.5,
          reason: 'Photo submitted for manual verification',
          status: 'pending_review',
          requiresManualReview: true,
        };
      }

      if (!poseResult.matched) {
        return {
          verified: false,
          confidence: poseResult.confidence,
          reason: `Please follow the requested pose: ${requestedPose}`,
          livenessDetected: true,
        };
      }

      // Step 3: Match with existing profile photos
      const faceMatchResult = await this.matchWithProfilePhotos(userId, photoUrl, verificationId);

      // Check if manual review was triggered
      if (faceMatchResult.requiresManualReview) {
        return {
          verified: false,
          confidence: 0.5,
          reason: 'Photo submitted for manual verification',
          status: 'pending_review',
          requiresManualReview: true,
        };
      }

      if (!faceMatchResult.matched) {
        return {
          verified: false,
          confidence: faceMatchResult.confidence,
          reason:
            'Face does not match profile photos. Please ensure the selfie clearly shows your face.',
          livenessDetected: true,
          faceMatch: false,
        };
      }

      // All checks passed
      return {
        verified: true,
        confidence: Math.min(
          livenessResult.confidence,
          poseResult.confidence,
          faceMatchResult.confidence
        ),
        livenessDetected: true,
        faceMatch: true,
      };
    } catch (error) {
      logger.error('Error verifying photo - queueing for manual review:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Queue for manual review on unexpected errors
      await this.queueForManualReview(userId, photoUrl, 'unexpected_error', verificationId);

      return {
        verified: false,
        confidence: 0.5,
        reason: 'Photo submitted for manual verification',
        status: 'pending_review',
        requiresManualReview: true,
      };
    }
  }

  /**
   * Fetch image from URL and return as bytes for AWS Rekognition
   */
  private async fetchImageBytes(photoUrl: string): Promise<Uint8Array> {
    const response = await fetch(photoUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  /**
   * Detect liveness (anti-spoofing) with graceful degradation
   * Uses AWS Rekognition DetectFaces for quality checks
   */
  private async detectLiveness(
    userId: string,
    photoUrl: string,
    verificationId?: string
  ): Promise<{ live: boolean; confidence: number; requiresManualReview?: boolean }> {
    try {
      if (this.rekognitionClient && process.env.AWS_REGION) {
        try {
          // Fetch image bytes from URL
          const imageBytes = await this.fetchImageBytes(photoUrl);

          // Use AWS Rekognition DetectFaces for liveness indicators
          const command = new DetectFacesCommand({
            Image: {
              Bytes: imageBytes,
            },
            Attributes: ['ALL'], // Get all face attributes for quality assessment
          });

          const response: DetectFacesCommandOutput = await this.rekognitionClient.send(command);

          if (response.FaceDetails && response.FaceDetails.length > 0) {
            const face = response.FaceDetails[0];
            const quality = face.Quality;

            // Check for photo quality indicators (liveness proxy)
            // High quality images with good sharpness and brightness are more likely real
            const sharpness = quality?.Sharpness || 0;
            const brightness = quality?.Brightness || 0;

            // Liveness indicators: good quality, not too dark/bright, sharp
            const isLive =
              sharpness > 50 &&
              brightness > 30 &&
              brightness < 90 &&
              (face.Confidence || 0) > 90;

            return {
              live: isLive,
              confidence: isLive ? 0.95 : 0.5,
            };
          }

          return {
            live: false,
            confidence: 0.0,
          };
        } catch (awsError: any) {
          // AWS Rekognition failed - log and queue for manual review
          logger.error(
            'AWS Rekognition unavailable for liveness detection, queueing for manual review',
            {
              userId,
              error: awsError.message,
              verificationId,
            }
          );

          await this.queueForManualReview(
            userId,
            photoUrl,
            'aws_rekognition_unavailable_liveness',
            verificationId
          );

          return {
            live: false,
            confidence: 0.5,
            requiresManualReview: true,
          };
        }
      }

      // AWS Rekognition not configured - queue for manual review
      logger.warn('AWS Rekognition not configured, queueing for manual review', {
        userId,
        verificationId,
      });

      await this.queueForManualReview(
        userId,
        photoUrl,
        'aws_rekognition_not_configured',
        verificationId
      );

      return {
        live: false,
        confidence: 0.5,
        requiresManualReview: true,
      };
    } catch (error) {
      logger.error('Error detecting liveness, queueing for manual review:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.queueForManualReview(userId, photoUrl, 'liveness_detection_error', verificationId);

      return {
        live: false,
        confidence: 0.5,
        requiresManualReview: true,
      };
    }
  }

  /**
   * Verify pose matches requested pose with graceful degradation
   * Uses AWS Rekognition DetectFaces for pose analysis
   */
  private async verifyPose(
    userId: string,
    photoUrl: string,
    requestedPose: string,
    verificationId?: string
  ): Promise<{ matched: boolean; confidence: number; requiresManualReview?: boolean }> {
    try {
      if (this.rekognitionClient && process.env.AWS_REGION) {
        try {
          // Fetch image bytes from URL
          const imageBytes = await this.fetchImageBytes(photoUrl);

          const command = new DetectFacesCommand({
            Image: {
              Bytes: imageBytes,
            },
            Attributes: ['ALL'], // Get all face attributes including pose and emotions
          });

          const response: DetectFacesCommandOutput = await this.rekognitionClient.send(command);

          if (response.FaceDetails && response.FaceDetails.length > 0) {
            const face = response.FaceDetails[0];
            const pose = face.Pose;
            const smile = face.Smile;
            const emotions = face.Emotions || [];

            // Verify pose based on requested pose
            let matched = false;

            switch (requestedPose) {
              case 'smile':
                matched = (smile?.Value || false) && (smile?.Confidence || 0) > 70;
                break;
              case 'neutral':
                // Check if CALM is the dominant emotion (neutral expression)
                const calmEmotion = emotions.find((e) => e.Type === 'CALM');
                matched = (calmEmotion?.Confidence || 0) > 50;
                break;
              case 'look_left':
                matched = (pose?.Yaw || 0) < -15;
                break;
              case 'look_right':
                matched = (pose?.Yaw || 0) > 15;
                break;
              case 'look_up':
                matched = (pose?.Pitch || 0) > 10;
                break;
              case 'thumbs_up':
                // Hand gesture detection requires additional ML model
                matched = true; // Accept for now
                break;
              default:
                matched = true;
            }

            return {
              matched,
              confidence: matched ? 0.9 : 0.4,
            };
          }

          return {
            matched: false,
            confidence: 0.0,
          };
        } catch (awsError: any) {
          // AWS Rekognition failed - log and queue for manual review
          logger.error(
            'AWS Rekognition unavailable for pose verification, queueing for manual review',
            {
              userId,
              error: awsError.message,
              verificationId,
            }
          );

          await this.queueForManualReview(
            userId,
            photoUrl,
            'aws_rekognition_unavailable_pose',
            verificationId
          );

          return {
            matched: false,
            confidence: 0.5,
            requiresManualReview: true,
          };
        }
      }

      // AWS Rekognition not configured - queue for manual review
      logger.warn(
        'AWS Rekognition not configured for pose verification, queueing for manual review',
        {
          userId,
          verificationId,
        }
      );

      await this.queueForManualReview(
        userId,
        photoUrl,
        'aws_rekognition_not_configured_pose',
        verificationId
      );

      return {
        matched: false,
        confidence: 0.5,
        requiresManualReview: true,
      };
    } catch (error) {
      logger.error('Error verifying pose, queueing for manual review:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.queueForManualReview(userId, photoUrl, 'pose_verification_error', verificationId);

      return {
        matched: false,
        confidence: 0.5,
        requiresManualReview: true,
      };
    }
  }

  /**
   * Match verification photo with profile photos with graceful degradation
   * Uses AWS Rekognition CompareFaces
   */
  private async matchWithProfilePhotos(
    userId: string,
    verificationPhotoUrl: string,
    verificationId?: string
  ): Promise<{ matched: boolean; confidence: number; requiresManualReview?: boolean }> {
    try {
      // Get user's profile photos
      const photos = await db('user_photos')
        .where({
          user_id: userId,
          is_deleted: false,
        })
        .orderBy('display_order', 'asc')
        .limit(3)
        .select('photo_url');

      if (photos.length === 0) {
        // No profile photos to match against
        return {
          matched: true,
          confidence: 0.8,
        };
      }

      // Use AWS Rekognition for face matching
      if (this.rekognitionClient && process.env.AWS_REGION) {
        try {
          let maxSimilarity = 0;

          for (const photo of photos) {
            const similarity = await this.compareFaces(verificationPhotoUrl, photo.photo_url);
            maxSimilarity = Math.max(maxSimilarity, similarity);
          }

          const matched = maxSimilarity >= this.FACE_MATCH_THRESHOLD;

          return {
            matched,
            confidence: maxSimilarity,
          };
        } catch (awsError: any) {
          // AWS Rekognition failed - log and queue for manual review
          logger.error('AWS Rekognition unavailable for face matching, queueing for manual review', {
            userId,
            error: awsError.message,
            verificationId,
          });

          await this.queueForManualReview(
            userId,
            verificationPhotoUrl,
            'aws_rekognition_unavailable_face_match',
            verificationId
          );

          return {
            matched: false,
            confidence: 0.5,
            requiresManualReview: true,
          };
        }
      }

      // AWS Rekognition not configured - queue for manual review
      logger.warn(
        'AWS Rekognition not configured for face matching, queueing for manual review',
        {
          userId,
          verificationId,
        }
      );

      await this.queueForManualReview(
        userId,
        verificationPhotoUrl,
        'aws_rekognition_not_configured_face_match',
        verificationId
      );

      return {
        matched: false,
        confidence: 0.5,
        requiresManualReview: true,
      };
    } catch (error) {
      logger.error('Error matching with profile photos, queueing for manual review:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      await this.queueForManualReview(
        userId,
        verificationPhotoUrl,
        'face_matching_error',
        verificationId
      );

      return {
        matched: false,
        confidence: 0.5,
        requiresManualReview: true,
      };
    }
  }

  /**
   * Compare two faces for similarity using AWS Rekognition CompareFaces
   */
  private async compareFaces(photo1Url: string, photo2Url: string): Promise<number> {
    try {
      if (!this.rekognitionClient || !process.env.AWS_REGION) {
        throw new Error('AWS Rekognition not configured');
      }

      // Fetch both images as bytes
      const [sourceBytes, targetBytes] = await Promise.all([
        this.fetchImageBytes(photo1Url),
        this.fetchImageBytes(photo2Url),
      ]);

      // Use AWS Rekognition CompareFaces
      const command = new CompareFacesCommand({
        SourceImage: {
          Bytes: sourceBytes,
        },
        TargetImage: {
          Bytes: targetBytes,
        },
        SimilarityThreshold: 0, // Get all matches with any similarity
      });

      const response: CompareFacesCommandOutput = await this.rekognitionClient.send(command);

      if (response.FaceMatches && response.FaceMatches.length > 0) {
        // Return the highest similarity score (normalized to 0-1 range)
        const highestSimilarity = response.FaceMatches[0].Similarity || 0;
        return highestSimilarity / 100; // AWS returns 0-100, we use 0-1
      }

      return 0.0;
    } catch (error) {
      logger.error('Error comparing faces:', error);
      throw error; // Re-throw to trigger manual review in caller
    }
  }

  /**
   * Queue photo for manual review
   * Used when automated verification fails due to API unavailability
   */
  private async queueForManualReview(
    userId: string,
    photoUrl: string,
    reason: string,
    verificationId?: string
  ): Promise<void> {
    try {
      // Get user information for the queue
      const user = await db('users').where({ id: userId }).first('first_name', 'last_name');

      const userName = user ? `${user.first_name} ${user.last_name}` : 'Unknown User';

      // Insert into moderation queue for manual review
      await db('moderation_queue').insert({
        content_id: verificationId || `photo_${userId}_${Date.now()}`,
        content_type: 'photo_verification',
        content_url: photoUrl,
        user_id: userId,
        user_name: userName,
        risk_score: 0.5, // Medium priority
        violations: JSON.stringify([reason]),
        status: 'flagged',
        priority: 'medium',
        flagged_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      logger.info('Photo queued for manual review', {
        userId,
        verificationId,
        reason,
      });
    } catch (error) {
      logger.error('Failed to queue photo for manual review', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - we don't want queue failures to block verification
    }
  }

  /**
   * Update verification status
   */
  private async updateVerificationStatus(
    verificationId: string,
    status: 'approved' | 'rejected' | 'expired' | 'pending_review',
    result: PhotoVerificationResult | null
  ): Promise<void> {
    try {
      await db('photo_verification_requests').where({ id: verificationId }).update({
        status,
        verified_at: new Date(),
        confidence_score: result?.confidence,
        rejection_reason: result?.reason,
        liveness_detected: result?.livenessDetected,
        face_matched: result?.faceMatch,
      });
    } catch (error) {
      logger.error('Error updating verification status:', error);
    }
  }

  /**
   * Add verification badge
   */
  private async addVerificationBadge(userId: string): Promise<void> {
    try {
      await db('user_badges')
        .insert({
          user_id: userId,
          badge_type: 'photo_verified',
          earned_at: new Date(),
          is_active: true,
        })
        .onConflict(['user_id', 'badge_type'])
        .ignore();

      logger.info(`Verification badge added for user ${userId}`);
    } catch (error) {
      logger.error('Error adding verification badge:', error);
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: string): Promise<any> {
    try {
      const user = await db('users')
        .where({ id: userId })
        .first('photo_verified', 'photo_verified_at');

      const latestRequest = await db('photo_verification_requests')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .first();

      return {
        verified: user?.photo_verified || false,
        verifiedAt: user?.photo_verified_at,
        latestRequest: latestRequest
          ? {
              id: latestRequest.id,
              status: latestRequest.status,
              requestedPose: latestRequest.requested_pose,
              createdAt: latestRequest.created_at,
              expiresAt: latestRequest.expires_at,
            }
          : null,
      };
    } catch (error) {
      logger.error('Error getting verification status:', error);
      throw new Error('Failed to get verification status');
    }
  }

  /**
   * Get verification history
   */
  async getVerificationHistory(userId: string): Promise<any[]> {
    try {
      const history = await db('photo_verification_requests')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .select('*');

      return history.map((h) => ({
        id: h.id,
        status: h.status,
        requestedPose: h.requested_pose,
        createdAt: h.created_at,
        verifiedAt: h.verified_at,
        confidenceScore: h.confidence_score,
        rejectionReason: h.rejection_reason,
      }));
    } catch (error) {
      logger.error('Error getting verification history:', error);
      throw new Error('Failed to get verification history');
    }
  }
}

export default new PhotoVerificationService();
