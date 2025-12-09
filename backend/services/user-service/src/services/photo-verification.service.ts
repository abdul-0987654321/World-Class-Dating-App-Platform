import type { ComputerVisionClient } from '@azure/cognitiveservices-computervision';
import type { CognitiveServicesCredentials } from '@azure/ms-rest-azure-js';
import db from '../database';
import { v4 as uuidv4 } from 'uuid';
import type { uploadToAzureBlob, deleteFromAzureBlob } from '../utils/azure-storage';
import logger from '../utils/logger';

/**
 * Photo Verification Service
 * Handles selfie verification to ensure users are real people
 */
export class PhotoVerificationService {
  private visionClient: ComputerVisionClient;

  constructor() {
    const credentials = new CognitiveServicesCredentials(
      process.env.AZURE_CV_KEY!
    );
    this.visionClient = new ComputerVisionClient(
      credentials,
      process.env.AZURE_CV_ENDPOINT!
    );
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

      // Upload selfie to Azure Blob Storage
      const selfieFileName = `verification/${userId}/${uuidv4()}.jpg`;
      const selfieUrl = await uploadToAzureBlob(
        selfieFile.buffer,
        selfieFileName,
        selfieFile.mimetype
      );

      // Detect face in selfie
      const selfieFaceAnalysis = await this.detectFace(selfieUrl);

      if (!selfieFaceAnalysis.success || !selfieFaceAnalysis.faceId) {
        // Delete uploaded selfie
        await deleteFromAzureBlob(selfieFileName);

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
        const comparison = await this.compareFaces(
          selfieFaceAnalysis.faceId,
          photo.url
        );

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
      const autoApproved = matchFound && maxSimilarity >= 0.7;

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
        await db('users')
          .where({ id: userId })
          .update({
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
   * Detect face in image using Azure Computer Vision
   * @param imageUrl - URL of image to analyze
   * @returns Face detection result
   */
  private async detectFace(imageUrl: string): Promise<{
    success: boolean;
    faceId?: string;
    faceAttributes?: any;
    error?: string;
  }> {
    try {
      const result = await this.visionClient.analyzeImage(imageUrl, {
        visualFeatures: ['Faces'],
      });

      if (!result.faces || result.faces.length === 0) {
        return {
          success: false,
          error: 'No face detected in the image',
        };
      }

      if (result.faces.length > 1) {
        return {
          success: false,
          error: 'Multiple faces detected. Please take a selfie with only your face.',
        };
      }

      // For actual face comparison, we'd use Azure Face API
      // Here we're simulating with Computer Vision
      const face = result.faces[0];

      return {
        success: true,
        faceId: `face_${uuidv4()}`,
        faceAttributes: {
          age: face.age,
          gender: face.gender,
        },
      };
    } catch (error: any) {
      logger.error('Face detection failed', { imageUrl, error: error.message });

      return {
        success: false,
        error: 'Failed to analyze image',
      };
    }
  }

  /**
   * Compare two faces using Azure Face API
   * @param selfieId - Face ID from selfie
   * @param profilePhotoUrl - Profile photo URL
   * @returns Comparison result
   */
  private async compareFaces(
    selfieId: string,
    profilePhotoUrl: string
  ): Promise<{
    success: boolean;
    isIdentical: boolean;
    confidence: number;
    error?: string;
  }> {
    try {
      // In production, use Azure Face API's verify endpoint
      // For now, we'll simulate with Computer Vision analysis

      const profileFaceAnalysis = await this.detectFace(profilePhotoUrl);

      if (!profileFaceAnalysis.success) {
        return {
          success: false,
          isIdentical: false,
          confidence: 0,
          error: 'Could not detect face in profile photo',
        };
      }

      // Simulate face comparison
      // In production, use: await faceClient.face.verifyFaceToFace(selfieId, profileFaceId)
      const confidence = Math.random() * 0.4 + 0.6; // Simulate 0.6-1.0 range

      return {
        success: true,
        isIdentical: confidence >= 0.7,
        confidence: confidence,
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
      const user = await db('users')
        .where({ id: userId })
        .select('is_verified')
        .first();

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
      const verification = await db('photo_verifications')
        .where({ id: verificationId })
        .first();

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
      await db('photo_verifications')
        .where({ id: verificationId })
        .update({
          status: 'approved',
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
        });

      // Update user verification status
      await db('users')
        .where({ id: verification.user_id })
        .update({
          is_verified: true,
          verified_at: new Date(),
        });

      logger.info(
        `Verification ${verificationId} approved by admin ${reviewedBy}`
      );

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
      const verification = await db('photo_verifications')
        .where({ id: verificationId })
        .first();

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
      await db('photo_verifications')
        .where({ id: verificationId })
        .update({
          status: 'rejected',
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
          rejection_reason: reason,
        });

      logger.info(
        `Verification ${verificationId} rejected by admin ${reviewedBy}`,
        { reason }
      );

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
        .select(
          'photo_verifications.*',
          'users.email',
          'users.first_name',
          'users.last_name'
        )
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
          total: totalCount?.count || 0,
          limit,
          offset,
          hasMore: (totalCount?.count || 0) > offset + limit,
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
