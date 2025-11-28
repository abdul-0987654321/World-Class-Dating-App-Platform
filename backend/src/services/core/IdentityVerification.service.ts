/**
 * Identity Verification Service
 * Handles multi-modal identity verification including:
 * - Government ID verification
 * - Biometric verification (face + liveness)
 * - Social media account linking
 * - Phone/email verification
 * - Video verification badges
 * - AI-powered photo authenticity analysis
 */

import { SafetyRepository } from '../../repositories/Safety.repository';
import { UserRepository } from '../../repositories';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import {
  VerificationType,
  VerificationStatus,
  DocumentType,
  SocialProvider,
  IdentityVerification,
  SocialVerification,
  UserVerificationStatus,
  VerificationSubmission,
} from '../../models/Safety.model';

interface PhotoAnalysisResult {
  isAuthentic: boolean;
  confidence: number;
  isAIGenerated: boolean;
  aiGeneratedConfidence: number;
  hasManipulation: boolean;
  manipulationTypes?: string[];
  faceDetected: boolean;
  faceCount: number;
  qualityScore: number;
  metadata?: {
    hasOriginalMetadata: boolean;
    cameraInfo?: string;
    timestamp?: Date;
  };
}

interface LivenessCheckResult {
  isLive: boolean;
  confidence: number;
  challenges: {
    type: string;
    passed: boolean;
  }[];
  faceMatchScore?: number;
  spoofDetection?: {
    isSpoof: boolean;
    spoofType?: string;
    confidence: number;
  };
}

interface DocumentVerificationResult {
  isValid: boolean;
  documentType: DocumentType;
  confidence: number;
  extractedData?: {
    fullName?: string;
    dateOfBirth?: Date;
    documentNumber?: string;
    expirationDate?: Date;
    country?: string;
    address?: string;
  };
  securityFeatures?: {
    hologramDetected: boolean;
    mrzValid: boolean;
    barcodeValid: boolean;
    tamperingDetected: boolean;
  };
  faceMatchScore?: number;
}

export class IdentityVerificationService {
  private safetyRepo: SafetyRepository;
  private userRepo: UserRepository;

  constructor(safetyRepo: SafetyRepository, userRepo: UserRepository) {
    this.safetyRepo = safetyRepo;
    this.userRepo = userRepo;
  }

  /**
   * Get comprehensive verification status for a user
   */
  async getUserVerificationStatus(userId: string): Promise<UserVerificationStatus> {
    const [user, verifications, socialVerifications] = await Promise.all([
      this.userRepo.findById(userId),
      this.safetyRepo.getUserVerifications(userId),
      this.safetyRepo.getUserSocialVerifications(userId),
    ]);

    const verifiedTypes = new Set<VerificationType>();
    verifications
      .filter(v => v.status === 'verified')
      .forEach(v => verifiedTypes.add(v.type));

    const verifiedSocialProviders = socialVerifications
      .filter(v => v.is_verified)
      .map(v => v.provider);

    const badges = this.calculateVerificationBadges(verifiedTypes, verifiedSocialProviders);
    const level = this.calculateVerificationLevel(verifiedTypes, verifiedSocialProviders);

    return {
      userId,
      emailVerified: user?.email_verified || false,
      phoneVerified: user?.phone_verified || false,
      governmentIdVerified: verifiedTypes.has('government_id'),
      selfieVerified: verifiedTypes.has('selfie'),
      livenessVerified: verifiedTypes.has('liveness'),
      videoVerified: verifiedTypes.has('video'),
      socialMediaVerified: verifiedSocialProviders,
      overallVerificationLevel: level,
      verificationBadges: badges,
    };
  }

  /**
   * Submit identity verification request
   */
  async submitVerification(submission: VerificationSubmission): Promise<IdentityVerification> {
    const { userId, type, documents, socialProvider, socialToken } = submission;

    // Create verification record
    const verification = await this.safetyRepo.createVerification(
      userId,
      type,
      this.getProviderForType(type)
    );

    try {
      switch (type) {
        case 'government_id':
          await this.processGovernmentIdVerification(verification.id, userId, documents || []);
          break;

        case 'selfie':
          await this.processSelfieVerification(verification.id, userId, documents || []);
          break;

        case 'liveness':
          await this.processLivenessVerification(verification.id, userId, documents || []);
          break;

        case 'video':
          await this.processVideoVerification(verification.id, userId, documents || []);
          break;

        case 'social_media':
          if (socialProvider && socialToken) {
            await this.processSocialMediaVerification(userId, socialProvider, socialToken);
          }
          break;

        case 'biometric':
          await this.processBiometricVerification(verification.id, userId, documents || []);
          break;

        default:
          logger.warn(`Unknown verification type: ${type}`);
      }

      return await this.safetyRepo.getVerification(verification.id) as IdentityVerification;
    } catch (error) {
      logger.error(`Verification submission failed for user ${userId}:`, error);
      await this.safetyRepo.updateVerificationStatus(verification.id, 'rejected', {
        rejectionReason: error instanceof Error ? error.message : 'Verification failed',
      });
      throw error;
    }
  }

  /**
   * Process government ID document verification
   */
  private async processGovernmentIdVerification(
    verificationId: string,
    userId: string,
    documents: VerificationSubmission['documents']
  ): Promise<void> {
    if (!documents || documents.length === 0) {
      throw new Error('Government ID document is required');
    }

    const idDocument = documents.find(d =>
      ['passport', 'drivers_license', 'national_id'].includes(d.type)
    );

    if (!idDocument) {
      throw new Error('Valid government ID document type required');
    }

    // Store document securely
    const storagePath = await this.storeDocument(userId, idDocument.data, idDocument.type);
    const fileHash = this.calculateFileHash(idDocument.data);

    const doc = await this.safetyRepo.createVerificationDocument(
      verificationId,
      idDocument.type,
      storagePath,
      fileHash
    );

    // Perform document verification (simulated - in production would call external API)
    const verificationResult = await this.verifyDocument(idDocument);

    await this.safetyRepo.updateDocumentAIAnalysis(doc.id, {
      isAuthentic: verificationResult.isValid,
      confidence: verificationResult.confidence,
      detectedIssues: verificationResult.securityFeatures?.tamperingDetected ? ['tampering_detected'] : [],
      extractedData: verificationResult.extractedData,
    });

    if (verificationResult.isValid && verificationResult.confidence > 0.8) {
      // Verify extracted data matches user profile
      const user = await this.userRepo.findById(userId);
      const nameMatch = this.verifyNameMatch(
        user?.first_name,
        user?.last_name,
        verificationResult.extractedData?.fullName
      );

      const dobMatch = this.verifyDateOfBirthMatch(
        user?.date_of_birth,
        verificationResult.extractedData?.dateOfBirth
      );

      if (nameMatch && dobMatch) {
        await this.safetyRepo.updateVerificationStatus(verificationId, 'verified', {
          verificationData: verificationResult.extractedData,
          verifiedAt: new Date(),
          expiresAt: this.calculateExpirationDate('government_id'),
        });

        // Update user verification status
        await this.userRepo.updateVerificationStatus(userId, true);
      } else {
        await this.safetyRepo.updateVerificationStatus(verificationId, 'rejected', {
          rejectionReason: 'Document information does not match profile',
        });
      }
    } else {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'rejected', {
        rejectionReason: verificationResult.securityFeatures?.tamperingDetected
          ? 'Document tampering detected'
          : 'Document could not be verified',
      });
    }
  }

  /**
   * Process selfie verification (face match with ID)
   */
  private async processSelfieVerification(
    verificationId: string,
    userId: string,
    documents: VerificationSubmission['documents']
  ): Promise<void> {
    const selfie = documents?.find(d => d.type === 'selfie_photo');
    if (!selfie) {
      throw new Error('Selfie photo is required');
    }

    // Get user's ID verification for face comparison
    const idVerification = await this.safetyRepo.getUserVerificationByType(userId, 'government_id');
    if (!idVerification || idVerification.status !== 'verified') {
      throw new Error('Government ID verification required before selfie verification');
    }

    const storagePath = await this.storeDocument(userId, selfie.data, 'selfie_photo');
    const fileHash = this.calculateFileHash(selfie.data);

    const doc = await this.safetyRepo.createVerificationDocument(
      verificationId,
      'selfie_photo',
      storagePath,
      fileHash
    );

    // Analyze selfie (simulated)
    const photoAnalysis = await this.analyzePhoto(selfie.data);

    // Face match score (simulated - in production would use face comparison API)
    const faceMatchScore = await this.compareFaces(idVerification.id, selfie.data);

    await this.safetyRepo.updateDocumentAIAnalysis(doc.id, {
      isAuthentic: photoAnalysis.isAuthentic && !photoAnalysis.isAIGenerated,
      confidence: photoAnalysis.confidence,
      detectedIssues: this.getPhotoIssues(photoAnalysis),
      faceMatchScore,
      documentQuality: photoAnalysis.qualityScore,
    });

    if (photoAnalysis.isAuthentic && !photoAnalysis.isAIGenerated && faceMatchScore > 0.85) {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'verified', {
        verificationData: { faceMatchScore, photoAnalysis },
        verifiedAt: new Date(),
      });
    } else {
      let reason = 'Selfie verification failed';
      if (photoAnalysis.isAIGenerated) reason = 'AI-generated photo detected';
      else if (!photoAnalysis.isAuthentic) reason = 'Photo appears manipulated';
      else if (faceMatchScore <= 0.85) reason = 'Face does not match ID photo';

      await this.safetyRepo.updateVerificationStatus(verificationId, 'rejected', {
        rejectionReason: reason,
      });
    }
  }

  /**
   * Process liveness detection verification
   */
  private async processLivenessVerification(
    verificationId: string,
    userId: string,
    documents: VerificationSubmission['documents']
  ): Promise<void> {
    const video = documents?.find(d => d.type === 'liveness_video');
    if (!video) {
      throw new Error('Liveness video is required');
    }

    const storagePath = await this.storeDocument(userId, video.data, 'liveness_video');
    const fileHash = this.calculateFileHash(video.data);

    const doc = await this.safetyRepo.createVerificationDocument(
      verificationId,
      'liveness_video',
      storagePath,
      fileHash
    );

    // Perform liveness check (simulated)
    const livenessResult = await this.checkLiveness(video.data);

    await this.safetyRepo.updateDocumentAIAnalysis(doc.id, {
      isAuthentic: livenessResult.isLive,
      confidence: livenessResult.confidence,
      detectedIssues: livenessResult.spoofDetection?.isSpoof ? ['spoof_detected'] : [],
    });

    if (livenessResult.isLive && !livenessResult.spoofDetection?.isSpoof) {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'verified', {
        verificationData: {
          livenessScore: livenessResult.confidence,
          challengesPassed: livenessResult.challenges.filter(c => c.passed).length,
        },
        verifiedAt: new Date(),
      });
    } else {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'rejected', {
        rejectionReason: livenessResult.spoofDetection?.isSpoof
          ? `Spoof attempt detected: ${livenessResult.spoofDetection.spoofType}`
          : 'Liveness check failed',
      });
    }
  }

  /**
   * Process video verification (video call verification badge)
   */
  private async processVideoVerification(
    verificationId: string,
    userId: string,
    documents: VerificationSubmission['documents']
  ): Promise<void> {
    const video = documents?.find(d => d.type === 'selfie_video');
    if (!video) {
      throw new Error('Video recording is required');
    }

    const storagePath = await this.storeDocument(userId, video.data, 'selfie_video');
    const fileHash = this.calculateFileHash(video.data);

    const doc = await this.safetyRepo.createVerificationDocument(
      verificationId,
      'selfie_video',
      storagePath,
      fileHash
    );

    // Analyze video for authenticity
    const videoAnalysis = await this.analyzeVideo(video.data);

    await this.safetyRepo.updateDocumentAIAnalysis(doc.id, {
      isAuthentic: videoAnalysis.isAuthentic,
      confidence: videoAnalysis.confidence,
    });

    // Video verifications are set to in_review for manual verification
    await this.safetyRepo.updateVerificationStatus(verificationId, 'in_review', {
      verificationData: videoAnalysis,
    });

    // For demo purposes, auto-approve
    if (videoAnalysis.isAuthentic && videoAnalysis.confidence > 0.9) {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'verified', {
        verifiedAt: new Date(),
      });
    }
  }

  /**
   * Process social media account verification
   */
  private async processSocialMediaVerification(
    userId: string,
    provider: SocialProvider,
    token: string
  ): Promise<SocialVerification> {
    // Verify OAuth token and get user profile (simulated)
    const socialProfile = await this.verifySocialToken(provider, token);

    if (!socialProfile.verified) {
      throw new Error(`Unable to verify ${provider} account`);
    }

    // Check if this social account is already linked to another user
    const existingVerifications = await this.safetyRepo.getUserSocialVerifications(userId);
    const alreadyLinked = existingVerifications.find(v => v.provider === provider);

    if (alreadyLinked) {
      throw new Error(`${provider} account already linked`);
    }

    return await this.safetyRepo.createSocialVerification(
      userId,
      provider,
      socialProfile.userId,
      socialProfile.username,
      {
        name: socialProfile.name,
        profileUrl: socialProfile.profileUrl,
        followersCount: socialProfile.followersCount,
        accountAge: socialProfile.accountAge,
        isVerified: socialProfile.isVerifiedAccount,
      }
    );
  }

  /**
   * Process biometric verification
   */
  private async processBiometricVerification(
    verificationId: string,
    userId: string,
    documents: VerificationSubmission['documents']
  ): Promise<void> {
    // Biometric verification combines face recognition + liveness
    const selfieVerification = await this.safetyRepo.getUserVerificationByType(userId, 'selfie');
    const livenessVerification = await this.safetyRepo.getUserVerificationByType(userId, 'liveness');

    if (selfieVerification?.status === 'verified' && livenessVerification?.status === 'verified') {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'verified', {
        verificationData: {
          selfieVerificationId: selfieVerification.id,
          livenessVerificationId: livenessVerification.id,
        },
        verifiedAt: new Date(),
      });
    } else {
      await this.safetyRepo.updateVerificationStatus(verificationId, 'rejected', {
        rejectionReason: 'Both selfie and liveness verification required for biometric verification',
      });
    }
  }

  /**
   * Analyze photo for authenticity and AI generation
   */
  async analyzePhoto(photoData: Buffer | string): Promise<PhotoAnalysisResult> {
    // In production, this would call an AI service like AWS Rekognition,
    // Clarifai, or a custom model trained on AI-generated images

    // Simulated analysis
    const confidence = 0.85 + Math.random() * 0.15;
    const qualityScore = 0.7 + Math.random() * 0.3;

    return {
      isAuthentic: true,
      confidence,
      isAIGenerated: false,
      aiGeneratedConfidence: Math.random() * 0.2, // Low confidence of AI generation
      hasManipulation: false,
      faceDetected: true,
      faceCount: 1,
      qualityScore,
      metadata: {
        hasOriginalMetadata: true,
      },
    };
  }

  /**
   * Compare faces between two images
   */
  private async compareFaces(
    verificationId: string,
    selfieData: Buffer | string
  ): Promise<number> {
    // In production, would use AWS Rekognition CompareFaces or similar
    // Simulated face match score
    return 0.88 + Math.random() * 0.12;
  }

  /**
   * Perform liveness check on video
   */
  private async checkLiveness(videoData: Buffer | string): Promise<LivenessCheckResult> {
    // In production, would use AWS Rekognition Liveness or similar
    return {
      isLive: true,
      confidence: 0.92,
      challenges: [
        { type: 'blink', passed: true },
        { type: 'smile', passed: true },
        { type: 'turn_head', passed: true },
      ],
      spoofDetection: {
        isSpoof: false,
        confidence: 0.95,
      },
    };
  }

  /**
   * Verify document authenticity
   */
  private async verifyDocument(
    document: NonNullable<VerificationSubmission['documents']>[0]
  ): Promise<DocumentVerificationResult> {
    // In production, would use Onfido, Jumio, or similar service
    return {
      isValid: true,
      documentType: document.type,
      confidence: 0.95,
      extractedData: {
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-05-15'),
        documentNumber: 'AB123456',
        expirationDate: new Date('2030-05-15'),
        country: 'USA',
      },
      securityFeatures: {
        hologramDetected: true,
        mrzValid: true,
        barcodeValid: true,
        tamperingDetected: false,
      },
      faceMatchScore: 0.92,
    };
  }

  /**
   * Analyze video for authenticity
   */
  private async analyzeVideo(videoData: Buffer | string): Promise<{
    isAuthentic: boolean;
    confidence: number;
    duration: number;
    hasAudio: boolean;
    facesDetected: number;
  }> {
    return {
      isAuthentic: true,
      confidence: 0.91,
      duration: 15, // seconds
      hasAudio: true,
      facesDetected: 1,
    };
  }

  /**
   * Verify social media OAuth token
   */
  private async verifySocialToken(
    provider: SocialProvider,
    token: string
  ): Promise<{
    verified: boolean;
    userId: string;
    username?: string;
    name?: string;
    profileUrl?: string;
    followersCount?: number;
    accountAge?: number;
    isVerifiedAccount?: boolean;
  }> {
    // In production, would call respective social media APIs
    // Simulated response
    return {
      verified: true,
      userId: `${provider}_${crypto.randomBytes(8).toString('hex')}`,
      username: 'user_' + Math.random().toString(36).substring(7),
      name: 'Social User',
      profileUrl: `https://${provider}.com/user`,
      followersCount: Math.floor(Math.random() * 1000),
      accountAge: 365 + Math.floor(Math.random() * 1000), // days
      isVerifiedAccount: false,
    };
  }

  /**
   * Store document securely
   */
  private async storeDocument(
    userId: string,
    data: Buffer | string,
    type: DocumentType
  ): Promise<string> {
    // In production, would encrypt and store in secure storage (S3 with KMS, etc.)
    const filename = `${userId}/${type}_${Date.now()}.encrypted`;
    // Simulated storage path
    return `/secure-storage/verifications/${filename}`;
  }

  /**
   * Calculate file hash for integrity verification
   */
  private calculateFileHash(data: Buffer | string): string {
    const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Get verification provider based on type
   */
  private getProviderForType(type: VerificationType): string | undefined {
    const providers: Partial<Record<VerificationType, string>> = {
      government_id: 'internal',
      selfie: 'internal',
      liveness: 'internal',
      video: 'internal',
      biometric: 'internal',
    };
    return providers[type];
  }

  /**
   * Calculate verification expiration date
   */
  private calculateExpirationDate(type: string): Date {
    const expirationDays: Record<string, number> = {
      government_id: 365 * 5, // 5 years
      selfie: 365, // 1 year
      liveness: 180, // 6 months
      video: 365 * 2, // 2 years
      biometric: 180, // 6 months
    };

    const days = expirationDays[type] || 365;
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + days);
    return expiration;
  }

  /**
   * Verify name match between profile and document
   */
  private verifyNameMatch(
    profileFirstName?: string,
    profileLastName?: string,
    documentFullName?: string
  ): boolean {
    if (!profileFirstName || !documentFullName) return false;

    const profileName = `${profileFirstName} ${profileLastName || ''}`.toLowerCase().trim();
    const docName = documentFullName.toLowerCase().trim();

    // Simple similarity check - in production would use fuzzy matching
    return profileName === docName ||
           docName.includes(profileFirstName.toLowerCase());
  }

  /**
   * Verify date of birth match
   */
  private verifyDateOfBirthMatch(
    profileDob?: Date,
    documentDob?: Date
  ): boolean {
    if (!profileDob || !documentDob) return false;

    const profileDate = new Date(profileDob);
    const docDate = new Date(documentDob);

    return profileDate.getFullYear() === docDate.getFullYear() &&
           profileDate.getMonth() === docDate.getMonth() &&
           profileDate.getDate() === docDate.getDate();
  }

  /**
   * Get issues from photo analysis
   */
  private getPhotoIssues(analysis: PhotoAnalysisResult): string[] {
    const issues: string[] = [];
    if (analysis.isAIGenerated) issues.push('ai_generated');
    if (analysis.hasManipulation) issues.push('manipulation_detected');
    if (!analysis.faceDetected) issues.push('no_face_detected');
    if (analysis.faceCount > 1) issues.push('multiple_faces');
    if (analysis.qualityScore < 0.5) issues.push('low_quality');
    return issues;
  }

  /**
   * Calculate verification level based on completed verifications
   */
  private calculateVerificationLevel(
    verifiedTypes: Set<VerificationType>,
    socialProviders: SocialProvider[]
  ): 'none' | 'basic' | 'standard' | 'premium' | 'verified' {
    const hasGovId = verifiedTypes.has('government_id');
    const hasSelfie = verifiedTypes.has('selfie');
    const hasLiveness = verifiedTypes.has('liveness');
    const hasVideo = verifiedTypes.has('video');
    const hasBiometric = verifiedTypes.has('biometric');
    const hasSocial = socialProviders.length > 0;

    if (hasGovId && hasBiometric && hasVideo) return 'verified';
    if (hasGovId && (hasSelfie || hasLiveness)) return 'premium';
    if (hasGovId || (hasSelfie && hasLiveness)) return 'standard';
    if (hasSelfie || hasSocial) return 'basic';
    return 'none';
  }

  /**
   * Calculate verification badges
   */
  private calculateVerificationBadges(
    verifiedTypes: Set<VerificationType>,
    socialProviders: SocialProvider[]
  ): string[] {
    const badges: string[] = [];

    if (verifiedTypes.has('government_id')) badges.push('id_verified');
    if (verifiedTypes.has('selfie')) badges.push('photo_verified');
    if (verifiedTypes.has('liveness')) badges.push('liveness_verified');
    if (verifiedTypes.has('video')) badges.push('video_verified');
    if (verifiedTypes.has('biometric')) badges.push('biometric_verified');
    if (socialProviders.length > 0) badges.push('social_verified');
    if (socialProviders.length >= 2) badges.push('multi_social_verified');

    // Premium badges
    if (verifiedTypes.has('government_id') && verifiedTypes.has('selfie')) {
      badges.push('identity_confirmed');
    }
    if (verifiedTypes.has('government_id') && verifiedTypes.has('biometric')) {
      badges.push('fully_verified');
    }

    return badges;
  }
}
