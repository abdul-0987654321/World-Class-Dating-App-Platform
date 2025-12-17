import { UserRepository } from '../repositories/user.repository';
import phoneVerificationService from './phone-verification.service';
import photoVerificationService from './photo-verification.service';
import identityVerificationService from './identity-verification.service';
import db from '../../infrastructure/database/connection';
import { createLogger } from '../../utils/logger';

const logger = createLogger('verification-status-service');

export interface VerificationStatusResponse {
  userId: string;
  email: {
    verified: boolean;
    verifiedAt?: Date;
  };
  phone: {
    verified: boolean;
    verifiedAt?: Date;
    phoneNumber?: string;
    hasPendingVerification: boolean;
  };
  governmentId: {
    verified: boolean;
    verifiedAt?: Date;
    status?: 'none' | 'pending' | 'approved' | 'rejected';
    provider?: string;
    referenceId?: string;
  };
  selfie: {
    verified: boolean;
    verifiedAt?: Date;
    status?: 'none' | 'pending' | 'approved' | 'rejected';
    submittedAt?: Date;
    rejectionReason?: string;
  };
  liveness: {
    verified: boolean;
    verifiedAt?: Date;
    passed?: boolean;
  };
  video: {
    verified: boolean;
    verifiedAt?: Date;
    status?: 'none' | 'pending' | 'approved' | 'rejected';
    submittedAt?: Date;
  };
  biometric: {
    verified: boolean;
    verifiedAt?: Date;
    type?: string;
  };
  overall: {
    isFullyVerified: boolean;
    verificationScore: number;
    hasAnyVerification: boolean;
    verificationLevel: 'none' | 'basic' | 'standard' | 'full';
  };
}

/**
 * Comprehensive Verification Status Service
 * Provides unified access to all verification statuses
 */
export class VerificationStatusService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get complete verification status for a user
   */
  async getCompleteVerificationStatus(userId: string): Promise<VerificationStatusResponse> {
    try {
      // Get base verification status from user record
      const userVerification = await this.userRepository.getVerificationStatus(userId);

      if (!userVerification) {
        throw new Error('User not found');
      }

      // Get phone verification details
      const phoneStatus = await phoneVerificationService.getVerificationStatus(userId);

      // Get photo verification details (selfie)
      const photoStatus = await photoVerificationService.getVerificationStatus(userId);

      // Get government ID verification details
      const governmentIdStatus = await identityVerificationService.getVerificationStatus(userId);

      // Get video verification status
      const videoVerification = await db('video_verifications')
        .where({ user_id: userId })
        .orderBy('submitted_at', 'desc')
        .first();

      // Get biometric verification status
      const biometricVerification = await db('biometric_verifications')
        .where({ user_id: userId })
        .orderBy('verified_at', 'desc')
        .first();

      // Get liveness status (part of photo verification)
      const livenessVerified = userVerification.isPhotoVerified; // Liveness is part of photo verification

      // Calculate verification score (0-100)
      const verificationScore = this.calculateVerificationScore({
        email: userVerification.isEmailVerified,
        phone: userVerification.isPhoneVerified,
        selfie: userVerification.isPhotoVerified,
        governmentId: userVerification.isIdentityVerified,
        liveness: livenessVerified,
        video: videoVerification?.status === 'approved',
        biometric: biometricVerification?.status === 'approved',
      });

      // Determine verification level
      const verificationLevel = this.getVerificationLevel(verificationScore);

      // Check if user has any verification
      const hasAnyVerification =
        userVerification.isEmailVerified ||
        userVerification.isPhoneVerified ||
        userVerification.isPhotoVerified ||
        userVerification.isIdentityVerified ||
        videoVerification?.status === 'approved' ||
        biometricVerification?.status === 'approved';

      // Check if fully verified (all core verifications complete)
      const isFullyVerified =
        userVerification.isEmailVerified &&
        userVerification.isPhoneVerified &&
        userVerification.isPhotoVerified &&
        userVerification.isIdentityVerified;

      return {
        userId,
        email: {
          verified: userVerification.isEmailVerified,
          verifiedAt: userVerification.emailVerifiedAt,
        },
        phone: {
          verified: userVerification.isPhoneVerified,
          verifiedAt: userVerification.phoneVerifiedAt,
          phoneNumber: phoneStatus.phoneNumber,
          hasPendingVerification: phoneStatus.hasPendingVerification,
        },
        governmentId: {
          verified: userVerification.isIdentityVerified,
          verifiedAt: userVerification.identityVerifiedAt,
          status: governmentIdStatus.latestVerification?.status || 'none',
          provider: governmentIdStatus.latestVerification?.provider,
          referenceId: userVerification.kyc_reference_id,
        },
        selfie: {
          verified: userVerification.isPhotoVerified,
          verifiedAt: userVerification.photoVerifiedAt,
          status: photoStatus.verified ? 'approved' : (photoStatus.latestRequest?.status || 'none'),
          submittedAt: photoStatus.latestRequest?.createdAt,
          rejectionReason: photoStatus.latestRequest?.status === 'rejected'
            ? 'Please resubmit with a clearer photo'
            : undefined,
        },
        liveness: {
          verified: livenessVerified,
          verifiedAt: userVerification.photoVerifiedAt,
          passed: livenessVerified,
        },
        video: {
          verified: videoVerification?.status === 'approved',
          verifiedAt: videoVerification?.reviewed_at,
          status: videoVerification?.status || 'none',
          submittedAt: videoVerification?.submitted_at,
        },
        biometric: {
          verified: biometricVerification?.status === 'approved',
          verifiedAt: biometricVerification?.verified_at,
          type: biometricVerification?.biometric_type,
        },
        overall: {
          isFullyVerified,
          verificationScore,
          hasAnyVerification,
          verificationLevel,
        },
      };
    } catch (error: any) {
      logger.error('Error getting verification status:', error);
      throw new Error('Failed to get verification status');
    }
  }

  /**
   * Calculate verification score (0-100)
   * Email: 15 points
   * Phone: 20 points
   * Selfie: 25 points
   * Government ID: 20 points
   * Liveness: 10 points
   * Video: 5 points (bonus)
   * Biometric: 5 points (bonus)
   */
  private calculateVerificationScore(verifications: {
    email: boolean;
    phone: boolean;
    selfie: boolean;
    governmentId: boolean;
    liveness: boolean;
    video: boolean;
    biometric: boolean;
  }): number {
    let score = 0;

    if (verifications.email) score += 15;
    if (verifications.phone) score += 20;
    if (verifications.selfie) score += 25;
    if (verifications.governmentId) score += 20;
    if (verifications.liveness) score += 10;
    if (verifications.video) score += 5;
    if (verifications.biometric) score += 5;

    return score;
  }

  /**
   * Get verification level based on score
   */
  private getVerificationLevel(score: number): 'none' | 'basic' | 'standard' | 'full' {
    if (score === 0) return 'none';
    if (score < 50) return 'basic';
    if (score < 90) return 'standard';
    return 'full';
  }

  /**
   * Check if user meets minimum verification requirements
   */
  async meetsMinimumVerification(userId: string): Promise<boolean> {
    const status = await this.getCompleteVerificationStatus(userId);
    // Minimum requirement: email verified
    return status.email.verified;
  }

  /**
   * Check if user meets standard verification requirements
   */
  async meetsStandardVerification(userId: string): Promise<boolean> {
    const status = await this.getCompleteVerificationStatus(userId);
    // Standard requirement: email + phone verified
    return status.email.verified && status.phone.verified;
  }

  /**
   * Check if user is fully verified
   */
  async isFullyVerified(userId: string): Promise<boolean> {
    const status = await this.getCompleteVerificationStatus(userId);
    return status.overall.isFullyVerified;
  }

  /**
   * Get verification badge type based on verification level
   */
  async getVerificationBadgeType(userId: string): Promise<string | null> {
    const status = await this.getCompleteVerificationStatus(userId);

    if (status.identity.verified) return 'identity_verified';
    if (status.photo.verified) return 'photo_verified';
    if (status.phone.verified) return 'phone_verified';
    if (status.email.verified) return 'email_verified';

    return null;
  }

  /**
   * Get next verification step recommendation
   */
  async getNextVerificationStep(userId: string): Promise<{
    step: 'email' | 'phone' | 'selfie' | 'government-id' | 'liveness' | 'video' | 'biometric' | 'complete';
    message: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const status = await this.getCompleteVerificationStatus(userId);

    if (!status.email.verified) {
      return {
        step: 'email',
        message: 'Verify your email address to get started',
        priority: 'high',
      };
    }

    if (!status.phone.verified) {
      return {
        step: 'phone',
        message: 'Verify your phone number for enhanced security',
        priority: 'high',
      };
    }

    if (!status.selfie.verified) {
      return {
        step: 'selfie',
        message: 'Submit a selfie to verify your identity',
        priority: 'high',
      };
    }

    if (!status.liveness.verified) {
      return {
        step: 'liveness',
        message: 'Complete liveness check to prove you\'re real',
        priority: 'medium',
      };
    }

    if (!status.governmentId.verified) {
      return {
        step: 'government-id',
        message: 'Submit government ID for full verification',
        priority: 'medium',
      };
    }

    if (!status.video.verified) {
      return {
        step: 'video',
        message: 'Complete video verification for enhanced trust',
        priority: 'low',
      };
    }

    if (!status.biometric.verified) {
      return {
        step: 'biometric',
        message: 'Set up biometric authentication for extra security',
        priority: 'low',
      };
    }

    return {
      step: 'complete',
      message: 'You\'re fully verified with all security features enabled!',
      priority: 'low',
    };
  }
}

export default new VerificationStatusService();
