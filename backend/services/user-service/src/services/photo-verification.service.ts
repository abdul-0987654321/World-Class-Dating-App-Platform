import {
  RekognitionClient,
  CompareFacesCommand,
  DetectFacesCommand,
} from '@aws-sdk/client-rekognition';
import { v4 as uuidv4 } from 'uuid';

import db from '../database';
import { s3Storage } from '../infrastructure/storage/s3-storage.config';
import logger from '../utils/logger';

/**
 * Photo Verification Service
 * Handles selfie verification to ensure users are real people
 * Uses AWS Rekognition for face detection and comparison
 */
export class PhotoVerificationService {
  private rekognitionClient: RekognitionClient;

  constructor() {
    // Initialize AWS Rekognition client
    const credentials =
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined;

    this.rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION || 'us-east-1',
      ...(credentials && { credentials }),
    });
  }

  /**
   * Initiate photo verification process
   * @param userId - User ID requesting verification
   * @param selfieFile - Uploaded selfie image
   * @returns Verification request ID
   */
  async initiateVerification(
    userId: string,
    selfieFile: Express.Multer.File
  ): Promise<{
    success: boolean;
    verificationId?: string;
    status?: 'pending' | 'approved' | 'rejected';
    message?: string;
    error?: string;
  }> {
    try {
      // Check if user has existing pending verification
      const existingVerification = await db('photo_verifications')
        .where({ user_id: userId, status: 'pending' })
        .first();

      if (existingVerification) {
        return {
          success: false,
          error: 'You already have a pending verification request',
        };
      }

      // Get user's profile photos for comparison
      const profilePhotos = await db('photos')
        .where({
          user_id: userId,
          moderation_status: 'approved',
        })
        .select('url')
        .limit(3);

      if (profilePhotos.length === 0) {
        return {
          success: false,
          error: 'You must have at least one approved profile photo before verifying',
        };
      }

      // Upload selfie to S3
      const selfieFileName = `verification/${userId}/${uuidv4()}.jpg`;
      const selfieUrl = await s3Storage.uploadFile(
        selfieFileName,
        selfieFile.buffer,
        selfieFile.mimetype
      );

      // Detect face in selfie
      const selfieFaceAnalysis = await this.detectFace(selfieFile.buffer);

      if (!selfieFaceAnalysis.success || !selfieFaceAnalysis.faceId) {
        // Delete uploaded selfie
        await s3Storage.deleteFile(selfieFileName);

        return {
          success: false,
          error: selfieFaceAnalysis.error || 'No face detected in selfie',
        };
      }

      // Compare selfie with profile photos
      let matchFound = false;
      let maxSimilarity = 0;
      let matchedPhotoUrl = '';

      for (const photo of profilePhotos) {
        const comparison = await this.compareFaces(selfieFile.buffer, photo.url);

        if (comparison.success && comparison.isIdentical) {
          matchFound = true;
          maxSimilarity = Math.max(maxSimilarity, comparison.confidence || 0);
          matchedPhotoUrl = photo.url;
          break;
        }

        if (comparison.confidence && comparison.confidence > maxSimilarity) {
          maxSimilarity = comparison.confidence;
          matchedPhotoUrl = photo.url;
        }
      }

      // Create verification record
      const verificationId = uuidv4();
      const autoApproved = matchFound && maxSimilarity >= 70;

      await db('photo_verifications').insert({
        id: verificationId,
        user_id: userId,
        selfie_url: selfieUrl,
        matched_photo_url: matchedPhotoUrl,
        similarity_score: maxSimilarity,
        status: autoApproved ? 'approved' : 'pending',
        auto_approved: autoApproved,
        submitted_at: new Date(),
        reviewed_at: autoApproved ? new Date() : null,
      });

      // If auto-approved, update user verification status
      if (autoApproved) {
        await db('users').where({ id: userId }).update({
          is_verified: true,
          verified_at: new Date(),
        });

        logger.info(`User ${userId} photo verification auto-approved`, {
          verificationId,
          similarity: maxSimilarity,
        });
      } else {
        logger.info(`User ${userId} photo verification pending manual review`, {
          verificationId,
          similarity: maxSimilarity,
        });
      }

      return {
        success: true,
        verificationId,
        status: autoApproved ? 'approved' : 'pending',
        message: autoApproved
          ? 'Verification successful! You are now verified.'
          : 'Verification submitted. Our team will review it within 24 hours.',
      };
    } catch (error: any) {
      logger.error('Photo verification initiation failed', {
        userId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to process verification request. Please try again.',
      };
    }
  }

  /**
   * Detect face in image using AWS Rekognition
   * @param imageBuffer - Buffer of image to analyze
   * @returns Face detection result
   */
  private async detectFace(imageBuffer: Buffer): Promise<{
    success: boolean;
    faceId?: string;
    faceAttributes?: any;
    error?: string;
  }> {
    try {
      const command = new DetectFacesCommand({
        Image: {
          Bytes: imageBuffer,
        },
        Attributes: ['ALL'],
      });

      const result = await this.rekognitionClient.send(command);

      if (!result.FaceDetails || result.FaceDetails.length === 0) {
        return {
          success: false,
          error: 'No face detected in the image',
        };
      }

      if (result.FaceDetails.length > 1) {
        return {
          success: false,
          error: 'Multiple faces detected. Please take a selfie with only your face.',
        };
      }

      const face = result.FaceDetails[0];

      return {
        success: true,
        faceId: `face_${uuidv4()}`,
        faceAttributes: {
          confidence: face.Confidence,
          quality: face.Quality,
          ageRange: face.AgeRange,
        },
      };
    } catch (error: any) {
      logger.error('Face detection failed', { error: error.message });

      return {
        success: false,
        error: 'Failed to analyze image',
      };
    }
  }

  /**
   * Compare two faces using AWS Rekognition
   * @param selfieBuffer - Buffer of selfie image
   * @param profilePhotoUrl - Profile photo URL
   * @returns Comparison result
   */
  private async compareFaces(
    selfieBuffer: Buffer,
    profilePhotoUrl: string
  ): Promise<{
    success: boolean;
    isIdentical: boolean;
    confidence: number;
    error?: string;
  }> {
    try {
      // Fetch the profile photo from URL
      const response = await fetch(profilePhotoUrl);
      if (!response.ok) {
        return {
          success: false,
          isIdentical: false,
          confidence: 0,
          error: 'Could not fetch profile photo',
        };
      }
      const profilePhotoBuffer = Buffer.from(await response.arrayBuffer());

      const command = new CompareFacesCommand({
        SourceImage: {
          Bytes: selfieBuffer,
        },
        TargetImage: {
          Bytes: profilePhotoBuffer,
        },
        SimilarityThreshold: 70,
      });

      const result = await this.rekognitionClient.send(command);

      if (result.FaceMatches && result.FaceMatches.length > 0) {
        const bestMatch = result.FaceMatches[0];
        const similarity = bestMatch.Similarity || 0;

        return {
          success: true,
          isIdentical: similarity >= 70,
          confidence: similarity,
        };
      }

      return {
        success: true,
        isIdentical: false,
        confidence: 0,
      };
    } catch (error: any) {
      logger.error('Face comparison failed', { error: error.message });

      return {
        success: false,
        isIdentical: false,
        confidence: 0,
        error: 'Failed to compare faces',
      };
    }
  }

  /**
   * Get verification status for user
   * @param userId - User ID
   * @returns Verification status
   */
  async getVerificationStatus(userId: string): Promise<{
    success: boolean;
    isVerified: boolean;
    status?: 'pending' | 'approved' | 'rejected' | 'none';
    verificationId?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
    error?: string;
  }> {
    try {
      const user = await db('users').where({ id: userId }).select('is_verified').first();

      if (!user) {
        return {
          success: false,
          isVerified: false,
          error: 'User not found',
        };
      }

      if (user.is_verified) {
        return {
          success: true,
          isVerified: true,
          status: 'approved',
        };
      }

      // Check for pending or rejected verification
      const verification = await db('photo_verifications')
        .where({ user_id: userId })
        .orderBy('submitted_at', 'desc')
        .first();

      if (!verification) {
        return {
          success: true,
          isVerified: false,
          status: 'none',
        };
      }

      return {
        success: true,
        isVerified: false,
        status: verification.status,
        verificationId: verification.id,
        submittedAt: verification.submitted_at,
        reviewedAt: verification.reviewed_at,
        rejectionReason: verification.rejection_reason,
      };
    } catch (error: any) {
      logger.error('Failed to get verification status', {
        userId,
        error: error.message,
      });

      return {
        success: false,
        isVerified: false,
        error: 'Failed to retrieve verification status',
      };
    }
  }

  /**
   * Admin: Manually approve verification
   * @param verificationId - Verification request ID
   * @param reviewedBy - Admin user ID
   * @returns Approval result
   */
  async approveVerification(
    verificationId: string,
    reviewedBy: string
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const verification = await db('photo_verifications').where({ id: verificationId }).first();

      if (!verification) {
        return {
          success: false,
          error: 'Verification request not found',
        };
      }

      if (verification.status !== 'pending') {
        return {
          success: false,
          error: `Verification already ${verification.status}`,
        };
      }

      // Update verification status
      await db('photo_verifications').where({ id: verificationId }).update({
        status: 'approved',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
      });

      // Update user verification status
      await db('users').where({ id: verification.user_id }).update({
        is_verified: true,
        verified_at: new Date(),
      });

      logger.info(`Verification ${verificationId} approved by admin ${reviewedBy}`);

      return {
        success: true,
        message: 'Verification approved successfully',
      };
    } catch (error: any) {
      logger.error('Failed to approve verification', {
        verificationId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to approve verification',
      };
    }
  }

  /**
   * Admin: Manually reject verification
   * @param verificationId - Verification request ID
   * @param reviewedBy - Admin user ID
   * @param reason - Rejection reason
   * @returns Rejection result
   */
  async rejectVerification(
    verificationId: string,
    reviewedBy: string,
    reason: string
  ): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const verification = await db('photo_verifications').where({ id: verificationId }).first();

      if (!verification) {
        return {
          success: false,
          error: 'Verification request not found',
        };
      }

      if (verification.status !== 'pending') {
        return {
          success: false,
          error: `Verification already ${verification.status}`,
        };
      }

      // Update verification status
      await db('photo_verifications').where({ id: verificationId }).update({
        status: 'rejected',
        reviewed_by: reviewedBy,
        reviewed_at: new Date(),
        rejection_reason: reason,
      });

      logger.info(`Verification ${verificationId} rejected by admin ${reviewedBy}`, { reason });

      return {
        success: true,
        message: 'Verification rejected',
      };
    } catch (error: any) {
      logger.error('Failed to reject verification', {
        verificationId,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to reject verification',
      };
    }
  }

  /**
   * Admin: Get pending verifications
   * @param limit - Number of results
   * @param offset - Pagination offset
   * @returns Pending verifications
   */
  async getPendingVerifications(limit: number = 20, offset: number = 0) {
    try {
      const verifications = await db('photo_verifications')
        .where({ status: 'pending' })
        .join('users', 'photo_verifications.user_id', 'users.id')
        .select('photo_verifications.*', 'users.email', 'users.first_name', 'users.last_name')
        .orderBy('photo_verifications.submitted_at', 'asc')
        .limit(limit)
        .offset(offset);

      const totalCount = await db('photo_verifications')
        .where({ status: 'pending' })
        .count('* as count')
        .first();

      return {
        success: true,
        verifications,
        pagination: {
          total: Number(totalCount?.count || 0),
          limit,
          offset,
          hasMore: Number(totalCount?.count || 0) > offset + limit,
        },
      };
    } catch (error: any) {
      logger.error('Failed to get pending verifications', {
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to retrieve pending verifications',
        verifications: [],
      };
    }
  }
}

export const photoVerificationService = new PhotoVerificationService();
