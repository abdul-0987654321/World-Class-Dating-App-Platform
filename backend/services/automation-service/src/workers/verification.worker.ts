/**
 * Verification Worker
 * Processes verification requests
 * Integrates with verification provider
 * Updates verification status
 */

import { Job } from 'bull';
import { createLogger } from '@flamoral/shared';
import axios from 'axios';
import {
  BaseWorker,
  WorkerQueueName,
  BaseJobData,
  JobResult,
  JobPriority,
} from './base-worker';

const logger = createLogger('verification-worker');

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const MEDIA_SERVICE_URL = process.env.MEDIA_SERVICE_URL || 'http://localhost:3006';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007';

// Verification types
export enum VerificationType {
  PHOTO = 'photo',
  ID = 'id',
  PHONE = 'phone',
  EMAIL = 'email',
  SOCIAL = 'social',
}

// Verification status
export enum VerificationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

// Job data interfaces
export interface VerificationJobData extends BaseJobData {
  type:
    | 'process_photo_verification'
    | 'process_id_verification'
    | 'process_phone_verification'
    | 'process_email_verification'
    | 'process_social_verification'
    | 'check_verification_status'
    | 'expire_verification';
  userId: string;
  verificationType: VerificationType;
  verificationId?: string;
  photoUrl?: string;
  referencePhotoUrl?: string;
  idDocumentUrl?: string;
  phoneNumber?: string;
  emailAddress?: string;
  socialProvider?: string;
  socialAccessToken?: string;
  metadata?: Record<string, any>;
}

export interface VerificationResult {
  verificationId: string;
  userId: string;
  verificationType: VerificationType;
  status: VerificationStatus;
  confidence?: number;
  rejectionReason?: string;
  expiresAt?: string;
}

/**
 * Verification Worker
 */
export class VerificationWorker extends BaseWorker<VerificationJobData, VerificationResult> {
  private readonly photoVerificationThreshold = 0.85; // 85% confidence required
  private readonly idVerificationThreshold = 0.90; // 90% confidence required
  private readonly verificationExpiryDays = 365; // Verification valid for 1 year

  constructor() {
    super(WorkerQueueName.VERIFICATION, 5);
  }

  /**
   * Process verification job
   */
  protected async processJob(job: Job<VerificationJobData>): Promise<JobResult<VerificationResult>> {
    const { type, userId, verificationType } = job.data;
    const startTime = Date.now();

    try {
      let result: VerificationResult;

      switch (type) {
        case 'process_photo_verification':
          result = await this.processPhotoVerification(job.data);
          break;

        case 'process_id_verification':
          result = await this.processIdVerification(job.data);
          break;

        case 'process_phone_verification':
          result = await this.processPhoneVerification(job.data);
          break;

        case 'process_email_verification':
          result = await this.processEmailVerification(job.data);
          break;

        case 'process_social_verification':
          result = await this.processSocialVerification(job.data);
          break;

        case 'check_verification_status':
          result = await this.checkVerificationStatus(job.data);
          break;

        case 'expire_verification':
          result = await this.expireVerification(job.data);
          break;

        default:
          throw new Error(`Unknown verification type: ${type}`);
      }

      await job.progress(100);

      logger.info(`Verification processed`, {
        type,
        correlationId: job.data.correlationId,
        userId,
        verificationType,
        status: result.status,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      logger.error(`Verification processing failed`, {
        type,
        correlationId: job.data.correlationId,
        userId,
        verificationType,
        error: error.message,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Process photo verification (face matching)
   */
  private async processPhotoVerification(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, photoUrl, referencePhotoUrl, verificationId } = jobData;
    const verId = verificationId || this.generateVerificationId();

    try {
      // Update status to processing
      await this.updateVerificationStatus(verId, userId, VerificationType.PHOTO, VerificationStatus.PROCESSING);

      // Step 1: Verify the photo using media service
      const verificationResult = await this.callMediaServiceVerification(photoUrl!, referencePhotoUrl);

      // Step 2: Evaluate result
      const isApproved = verificationResult.confidence >= this.photoVerificationThreshold;
      const status = isApproved ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;

      // Step 3: Update verification status
      await this.updateVerificationStatus(verId, userId, VerificationType.PHOTO, status, {
        confidence: verificationResult.confidence,
        rejectionReason: isApproved ? undefined : 'Face match confidence below threshold',
      });

      // Step 4: Update user profile if approved
      if (isApproved) {
        await this.updateUserVerificationBadge(userId, VerificationType.PHOTO);
      }

      // Step 5: Send notification
      await this.sendVerificationNotification(userId, VerificationType.PHOTO, status);

      const expiresAt = isApproved
        ? new Date(Date.now() + this.verificationExpiryDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      return {
        verificationId: verId,
        userId,
        verificationType: VerificationType.PHOTO,
        status,
        confidence: verificationResult.confidence,
        rejectionReason: isApproved ? undefined : 'Face match confidence below threshold',
        expiresAt,
      };
    } catch (error: any) {
      logger.error(`Photo verification failed for user ${userId}:`, error);

      await this.updateVerificationStatus(verId, userId, VerificationType.PHOTO, VerificationStatus.FAILED, {
        rejectionReason: error.message,
      });

      throw error;
    }
  }

  /**
   * Process ID verification
   */
  private async processIdVerification(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, idDocumentUrl, referencePhotoUrl, verificationId } = jobData;
    const verId = verificationId || this.generateVerificationId();

    try {
      await this.updateVerificationStatus(verId, userId, VerificationType.ID, VerificationStatus.PROCESSING);

      // Call external ID verification provider (e.g., Jumio, Onfido)
      const idVerificationResult = await this.callIdVerificationProvider(idDocumentUrl!, referencePhotoUrl);

      const isApproved =
        idVerificationResult.documentValid &&
        idVerificationResult.faceMatch >= this.idVerificationThreshold &&
        idVerificationResult.ageVerified;

      const status = isApproved ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;

      let rejectionReason: string | undefined;
      if (!isApproved) {
        if (!idVerificationResult.documentValid) {
          rejectionReason = 'Invalid or unreadable document';
        } else if (idVerificationResult.faceMatch < this.idVerificationThreshold) {
          rejectionReason = 'Face does not match document photo';
        } else if (!idVerificationResult.ageVerified) {
          rejectionReason = 'Age verification failed';
        }
      }

      await this.updateVerificationStatus(verId, userId, VerificationType.ID, status, {
        confidence: idVerificationResult.faceMatch,
        rejectionReason,
        extractedData: idVerificationResult.extractedData,
      });

      if (isApproved) {
        await this.updateUserVerificationBadge(userId, VerificationType.ID);
        // Update user's date of birth if extracted
        if (idVerificationResult.extractedData?.dateOfBirth) {
          await this.updateUserDateOfBirth(userId, idVerificationResult.extractedData.dateOfBirth);
        }
      }

      await this.sendVerificationNotification(userId, VerificationType.ID, status, rejectionReason);

      return {
        verificationId: verId,
        userId,
        verificationType: VerificationType.ID,
        status,
        confidence: idVerificationResult.faceMatch,
        rejectionReason,
        expiresAt: isApproved
          ? new Date(Date.now() + this.verificationExpiryDays * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      };
    } catch (error: any) {
      logger.error(`ID verification failed for user ${userId}:`, error);

      await this.updateVerificationStatus(verId, userId, VerificationType.ID, VerificationStatus.FAILED, {
        rejectionReason: error.message,
      });

      throw error;
    }
  }

  /**
   * Process phone verification
   */
  private async processPhoneVerification(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, phoneNumber, verificationId, metadata } = jobData;
    const verId = verificationId || this.generateVerificationId();
    const verificationCode = metadata?.verificationCode;

    try {
      await this.updateVerificationStatus(verId, userId, VerificationType.PHONE, VerificationStatus.PROCESSING);

      // Verify the code matches what was sent
      const isCodeValid = await this.verifyPhoneCode(userId, phoneNumber!, verificationCode);

      const status = isCodeValid ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
      const rejectionReason = isCodeValid ? undefined : 'Invalid verification code';

      await this.updateVerificationStatus(verId, userId, VerificationType.PHONE, status, {
        rejectionReason,
      });

      if (isCodeValid) {
        await this.updateUserVerificationBadge(userId, VerificationType.PHONE);
        await this.updateUserPhoneNumber(userId, phoneNumber!);
      }

      await this.sendVerificationNotification(userId, VerificationType.PHONE, status, rejectionReason);

      return {
        verificationId: verId,
        userId,
        verificationType: VerificationType.PHONE,
        status,
        rejectionReason,
      };
    } catch (error: any) {
      logger.error(`Phone verification failed for user ${userId}:`, error);

      await this.updateVerificationStatus(verId, userId, VerificationType.PHONE, VerificationStatus.FAILED, {
        rejectionReason: error.message,
      });

      throw error;
    }
  }

  /**
   * Process email verification
   */
  private async processEmailVerification(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, emailAddress, verificationId, metadata } = jobData;
    const verId = verificationId || this.generateVerificationId();
    const verificationToken = metadata?.verificationToken;

    try {
      await this.updateVerificationStatus(verId, userId, VerificationType.EMAIL, VerificationStatus.PROCESSING);

      // Verify the token matches what was sent
      const isTokenValid = await this.verifyEmailToken(userId, emailAddress!, verificationToken);

      const status = isTokenValid ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
      const rejectionReason = isTokenValid ? undefined : 'Invalid or expired verification token';

      await this.updateVerificationStatus(verId, userId, VerificationType.EMAIL, status, {
        rejectionReason,
      });

      if (isTokenValid) {
        await this.updateUserVerificationBadge(userId, VerificationType.EMAIL);
        await this.updateUserEmail(userId, emailAddress!);
      }

      await this.sendVerificationNotification(userId, VerificationType.EMAIL, status, rejectionReason);

      return {
        verificationId: verId,
        userId,
        verificationType: VerificationType.EMAIL,
        status,
        rejectionReason,
      };
    } catch (error: any) {
      logger.error(`Email verification failed for user ${userId}:`, error);

      await this.updateVerificationStatus(verId, userId, VerificationType.EMAIL, VerificationStatus.FAILED, {
        rejectionReason: error.message,
      });

      throw error;
    }
  }

  /**
   * Process social verification (link social account)
   */
  private async processSocialVerification(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, socialProvider, socialAccessToken, verificationId } = jobData;
    const verId = verificationId || this.generateVerificationId();

    try {
      await this.updateVerificationStatus(verId, userId, VerificationType.SOCIAL, VerificationStatus.PROCESSING);

      // Verify social account access token
      const socialProfile = await this.verifySocialAccount(socialProvider!, socialAccessToken!);

      const isValid = socialProfile && socialProfile.id;
      const status = isValid ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
      const rejectionReason = isValid ? undefined : 'Failed to verify social account';

      await this.updateVerificationStatus(verId, userId, VerificationType.SOCIAL, status, {
        rejectionReason,
        socialProfileId: socialProfile?.id,
        socialProvider,
      });

      if (isValid) {
        await this.linkSocialAccount(userId, socialProvider!, socialProfile);
        await this.updateUserVerificationBadge(userId, VerificationType.SOCIAL);
      }

      await this.sendVerificationNotification(userId, VerificationType.SOCIAL, status, rejectionReason);

      return {
        verificationId: verId,
        userId,
        verificationType: VerificationType.SOCIAL,
        status,
        rejectionReason,
      };
    } catch (error: any) {
      logger.error(`Social verification failed for user ${userId}:`, error);

      await this.updateVerificationStatus(verId, userId, VerificationType.SOCIAL, VerificationStatus.FAILED, {
        rejectionReason: error.message,
      });

      throw error;
    }
  }

  /**
   * Check verification status with external provider
   */
  private async checkVerificationStatus(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, verificationId, verificationType } = jobData;

    try {
      // Get current verification record
      const verification = await this.getVerificationRecord(verificationId!);

      if (!verification) {
        throw new Error('Verification record not found');
      }

      // If pending, check with external provider
      if (verification.status === VerificationStatus.PENDING || verification.status === VerificationStatus.PROCESSING) {
        // Poll external provider if applicable
        // For now, return current status
      }

      return {
        verificationId: verificationId!,
        userId,
        verificationType,
        status: verification.status,
        confidence: verification.confidence,
        rejectionReason: verification.rejectionReason,
        expiresAt: verification.expiresAt,
      };
    } catch (error: any) {
      logger.error(`Failed to check verification status for ${verificationId}:`, error);
      throw error;
    }
  }

  /**
   * Expire a verification
   */
  private async expireVerification(jobData: VerificationJobData): Promise<VerificationResult> {
    const { userId, verificationId, verificationType } = jobData;

    try {
      await this.updateVerificationStatus(verificationId!, userId, verificationType, VerificationStatus.EXPIRED);

      // Remove verification badge from user
      await this.removeUserVerificationBadge(userId, verificationType);

      // Notify user
      await this.sendVerificationNotification(userId, verificationType, VerificationStatus.EXPIRED);

      return {
        verificationId: verificationId!,
        userId,
        verificationType,
        status: VerificationStatus.EXPIRED,
      };
    } catch (error: any) {
      logger.error(`Failed to expire verification ${verificationId}:`, error);
      throw error;
    }
  }

  // Helper methods

  private generateVerificationId(): string {
    return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async callMediaServiceVerification(
    photoUrl: string,
    referencePhotoUrl?: string
  ): Promise<{ confidence: number; verified: boolean }> {
    try {
      const response = await axios.post(
        `${MEDIA_SERVICE_URL}/api/v1/verification/face-match`,
        {
          photoUrl,
          referencePhotoUrl,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 30000,
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('Media service verification failed:', error);
      throw error;
    }
  }

  private async callIdVerificationProvider(
    idDocumentUrl: string,
    referencePhotoUrl?: string
  ): Promise<{
    documentValid: boolean;
    faceMatch: number;
    ageVerified: boolean;
    extractedData?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      documentNumber?: string;
    };
  }> {
    // In production, this would call Jumio, Onfido, etc.
    // For now, simulate the response
    logger.info('Calling ID verification provider (simulated)');

    return {
      documentValid: true,
      faceMatch: 0.92,
      ageVerified: true,
      extractedData: {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        documentNumber: 'ABC123456',
      },
    };
  }

  private async verifyPhoneCode(userId: string, phoneNumber: string, code: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/verification/phone/verify`,
        {
          userId,
          phoneNumber,
          code,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.valid === true;
    } catch (error) {
      return false;
    }
  }

  private async verifyEmailToken(userId: string, email: string, token: string): Promise<boolean> {
    try {
      const response = await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/verification/email/verify`,
        {
          userId,
          email,
          token,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data.valid === true;
    } catch (error) {
      return false;
    }
  }

  private async verifySocialAccount(provider: string, accessToken: string): Promise<any> {
    // In production, verify with the social provider
    // For now, simulate verification
    logger.info(`Verifying social account with ${provider}`);

    return {
      id: 'social_123456',
      email: 'user@example.com',
      name: 'John Doe',
    };
  }

  private async updateVerificationStatus(
    verificationId: string,
    userId: string,
    verificationType: VerificationType,
    status: VerificationStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await axios.put(
        `${USER_SERVICE_URL}/api/v1/internal/verifications/${verificationId}`,
        {
          userId,
          verificationType,
          status,
          ...metadata,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update verification status:`, error);
    }
  }

  private async getVerificationRecord(verificationId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${USER_SERVICE_URL}/api/v1/internal/verifications/${verificationId}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  private async updateUserVerificationBadge(userId: string, verificationType: VerificationType): Promise<void> {
    try {
      await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/verification-badge`,
        {
          verificationType,
          verifiedAt: new Date().toISOString(),
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update user verification badge:`, error);
    }
  }

  private async removeUserVerificationBadge(userId: string, verificationType: VerificationType): Promise<void> {
    try {
      await axios.delete(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/verification-badge/${verificationType}`,
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to remove user verification badge:`, error);
    }
  }

  private async updateUserDateOfBirth(userId: string, dateOfBirth: string): Promise<void> {
    try {
      await axios.patch(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}`,
        {
          dateOfBirth,
          dateOfBirthVerified: true,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update user date of birth:`, error);
    }
  }

  private async updateUserPhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    try {
      await axios.patch(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}`,
        {
          phoneNumber,
          phoneVerified: true,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update user phone number:`, error);
    }
  }

  private async updateUserEmail(userId: string, email: string): Promise<void> {
    try {
      await axios.patch(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}`,
        {
          email,
          emailVerified: true,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to update user email:`, error);
    }
  }

  private async linkSocialAccount(userId: string, provider: string, socialProfile: any): Promise<void> {
    try {
      await axios.post(
        `${USER_SERVICE_URL}/api/v1/internal/users/${userId}/social-links`,
        {
          provider,
          socialId: socialProfile.id,
          socialEmail: socialProfile.email,
          socialName: socialProfile.name,
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to link social account:`, error);
    }
  }

  private async sendVerificationNotification(
    userId: string,
    verificationType: VerificationType,
    status: VerificationStatus,
    rejectionReason?: string
  ): Promise<void> {
    try {
      const title = status === VerificationStatus.APPROVED
        ? 'Verification Approved!'
        : status === VerificationStatus.REJECTED
        ? 'Verification Failed'
        : status === VerificationStatus.EXPIRED
        ? 'Verification Expired'
        : 'Verification Update';

      const body = status === VerificationStatus.APPROVED
        ? `Your ${verificationType} verification has been approved. You now have a verified badge!`
        : status === VerificationStatus.REJECTED
        ? `Your ${verificationType} verification was not approved. ${rejectionReason || 'Please try again.'}`
        : status === VerificationStatus.EXPIRED
        ? `Your ${verificationType} verification has expired. Please verify again to keep your badge.`
        : `Your ${verificationType} verification status has been updated.`;

      await axios.post(
        `${NOTIFICATION_SERVICE_URL}/api/v1/notifications`,
        {
          userId,
          type: 'verification_update',
          title,
          body,
          data: {
            verificationType,
            status,
            rejectionReason,
          },
          channels: ['push', 'in_app'],
          priority: 'high',
        },
        {
          headers: {
            'X-Service-Auth': process.env.SERVICE_AUTH_TOKEN,
          },
          timeout: 5000,
        }
      );
    } catch (error: any) {
      logger.error(`Failed to send verification notification:`, error);
    }
  }

  // Public scheduling methods

  async schedulePhotoVerification(
    userId: string,
    photoUrl: string,
    referencePhotoUrl?: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'process_photo_verification',
        userId,
        verificationType: VerificationType.PHOTO,
        photoUrl,
        referencePhotoUrl,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async scheduleIdVerification(
    userId: string,
    idDocumentUrl: string,
    referencePhotoUrl?: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'process_id_verification',
        userId,
        verificationType: VerificationType.ID,
        idDocumentUrl,
        referencePhotoUrl,
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async schedulePhoneVerification(
    userId: string,
    phoneNumber: string,
    verificationCode: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'process_phone_verification',
        userId,
        verificationType: VerificationType.PHONE,
        phoneNumber,
        metadata: { verificationCode },
      },
      {
        priority: JobPriority.HIGH,
      }
    );
  }

  async scheduleEmailVerification(
    userId: string,
    emailAddress: string,
    verificationToken: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'process_email_verification',
        userId,
        verificationType: VerificationType.EMAIL,
        emailAddress,
        metadata: { verificationToken },
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }

  async scheduleSocialVerification(
    userId: string,
    socialProvider: string,
    socialAccessToken: string
  ): Promise<void> {
    await this.addJob(
      {
        type: 'process_social_verification',
        userId,
        verificationType: VerificationType.SOCIAL,
        socialProvider,
        socialAccessToken,
      },
      {
        priority: JobPriority.NORMAL,
      }
    );
  }

  async scheduleVerificationExpiry(
    userId: string,
    verificationId: string,
    verificationType: VerificationType,
    expiresAt: Date
  ): Promise<void> {
    const delay = expiresAt.getTime() - Date.now();

    if (delay > 0) {
      await this.addJob(
        {
          type: 'expire_verification',
          userId,
          verificationId,
          verificationType,
        },
        {
          delay,
          priority: JobPriority.LOW,
        }
      );
    }
  }
}

// Export singleton instance
export const verificationWorker = new VerificationWorker();
export default verificationWorker;
