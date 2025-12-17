import { UserRepository } from '../repositories/user.repository';
import db from '../../infrastructure/database/connection';
import { createLogger } from '../../utils/logger';
import axios from 'axios';

const logger = createLogger('identity-verification-service');

export interface IdentityVerificationRequest {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  documentType: 'passport' | 'drivers_license' | 'national_id';
  documentNumber: string;
  documentFrontImage: string; // Base64 or URL
  documentBackImage?: string; // Base64 or URL (optional for passport)
  selfieImage: string; // Base64 or URL
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export interface IdentityVerificationResult {
  success: boolean;
  verificationId?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'requires_review';
  message?: string;
  error?: string;
  confidence?: number;
  checks?: {
    documentAuthenticity: boolean;
    faceMatch: boolean;
    livenessCheck: boolean;
    ageVerification: boolean;
    nameMatch: boolean;
  };
}

/**
 * Identity Verification Service (KYC)
 * Integrates with third-party KYC providers like Stripe Identity, Persona, Onfido, or Jumio
 */
export class IdentityVerificationService {
  private userRepository: UserRepository;
  private readonly KYC_PROVIDER: string;

  constructor() {
    this.userRepository = new UserRepository();
    // Support multiple KYC providers
    this.KYC_PROVIDER = process.env.KYC_PROVIDER || 'stripe'; // stripe, persona, onfido, jumio
  }

  /**
   * Initiate identity verification process
   */
  async initiateVerification(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    try {
      logger.info(`Initiating identity verification for user ${request.userId}`);

      // Check if user already has pending verification
      const existingVerification = await db('identity_verifications')
        .where({
          user_id: request.userId,
          status: 'pending',
        })
        .first();

      if (existingVerification) {
        return {
          success: false,
          error: 'You already have a pending identity verification request',
        };
      }

      // Route to appropriate KYC provider
      let verificationResult: IdentityVerificationResult;

      switch (this.KYC_PROVIDER) {
        case 'stripe':
          verificationResult = await this.verifyWithStripe(request);
          break;
        case 'persona':
          verificationResult = await this.verifyWithPersona(request);
          break;
        case 'onfido':
          verificationResult = await this.verifyWithOnfido(request);
          break;
        case 'jumio':
          verificationResult = await this.verifyWithJumio(request);
          break;
        default:
          // Fallback to manual verification
          verificationResult = await this.createManualVerificationRequest(request);
      }

      // Save verification record
      if (verificationResult.success && verificationResult.verificationId) {
        await this.saveVerificationRecord(request.userId, verificationResult);

        // If auto-approved, update user status
        if (verificationResult.status === 'approved') {
          await this.approveVerification(
            verificationResult.verificationId,
            this.KYC_PROVIDER
          );
        }
      }

      return verificationResult;
    } catch (error: any) {
      logger.error('Error initiating identity verification:', error);
      return {
        success: false,
        error: 'Failed to initiate identity verification',
      };
    }
  }

  /**
   * Verify identity using Stripe Identity
   */
  private async verifyWithStripe(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        logger.warn('Stripe not configured, falling back to manual verification');
        return await this.createManualVerificationRequest(request);
      }

      // Create Stripe verification session
      const response = await axios.post(
        'https://api.stripe.com/v1/identity/verification_sessions',
        new URLSearchParams({
          type: 'document',
          'metadata[user_id]': request.userId,
          'options[document][allowed_types][]': request.documentType,
          'options[document][require_matching_selfie]': 'true',
        }),
        {
          headers: {
            'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const session = response.data;

      return {
        success: true,
        verificationId: session.id,
        status: 'pending',
        message: 'Verification session created. Please complete the verification process.',
      };
    } catch (error: any) {
      logger.error('Stripe verification failed:', error);
      return {
        success: false,
        error: 'Failed to create Stripe verification session',
      };
    }
  }

  /**
   * Verify identity using Persona
   */
  private async verifyWithPersona(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    try {
      if (!process.env.PERSONA_API_KEY) {
        logger.warn('Persona not configured, falling back to manual verification');
        return await this.createManualVerificationRequest(request);
      }

      // Create Persona inquiry
      const response = await axios.post(
        'https://withpersona.com/api/v1/inquiries',
        {
          data: {
            type: 'inquiry',
            attributes: {
              'inquiry-template-id': process.env.PERSONA_TEMPLATE_ID,
              'reference-id': request.userId,
              'name-first': request.firstName,
              'name-last': request.lastName,
              'birthdate': request.dateOfBirth,
            },
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.PERSONA_API_KEY}`,
            'Content-Type': 'application/json',
            'Persona-Version': '2023-01-05',
          },
        }
      );

      return {
        success: true,
        verificationId: response.data.data.id,
        status: 'pending',
        message: 'Verification inquiry created successfully',
      };
    } catch (error: any) {
      logger.error('Persona verification failed:', error);
      return {
        success: false,
        error: 'Failed to create Persona verification inquiry',
      };
    }
  }

  /**
   * Verify identity using Onfido
   */
  private async verifyWithOnfido(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    try {
      if (!process.env.ONFIDO_API_KEY) {
        logger.warn('Onfido not configured, falling back to manual verification');
        return await this.createManualVerificationRequest(request);
      }

      // Create Onfido applicant
      const applicantResponse = await axios.post(
        'https://api.onfido.com/v3/applicants',
        {
          first_name: request.firstName,
          last_name: request.lastName,
          dob: request.dateOfBirth,
          address: request.address,
        },
        {
          headers: {
            'Authorization': `Token token=${process.env.ONFIDO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const applicantId = applicantResponse.data.id;

      // Create check
      const checkResponse = await axios.post(
        'https://api.onfido.com/v3/checks',
        {
          applicant_id: applicantId,
          report_names: ['document', 'facial_similarity_photo'],
        },
        {
          headers: {
            'Authorization': `Token token=${process.env.ONFIDO_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        verificationId: checkResponse.data.id,
        status: 'pending',
        message: 'Onfido verification check created',
      };
    } catch (error: any) {
      logger.error('Onfido verification failed:', error);
      return {
        success: false,
        error: 'Failed to create Onfido verification check',
      };
    }
  }

  /**
   * Verify identity using Jumio
   */
  private async verifyWithJumio(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    try {
      if (!process.env.JUMIO_API_TOKEN || !process.env.JUMIO_API_SECRET) {
        logger.warn('Jumio not configured, falling back to manual verification');
        return await this.createManualVerificationRequest(request);
      }

      // Create Jumio verification
      const auth = Buffer.from(
        `${process.env.JUMIO_API_TOKEN}:${process.env.JUMIO_API_SECRET}`
      ).toString('base64');

      const response = await axios.post(
        'https://netverify.com/api/netverify/v2/initiateNetverify',
        {
          customerInternalReference: request.userId,
          successUrl: `${process.env.APP_URL}/verification/success`,
          errorUrl: `${process.env.APP_URL}/verification/error`,
          callbackUrl: `${process.env.API_URL}/api/verification/jumio-callback`,
        },
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Flamoral Dating App/1.0',
          },
        }
      );

      return {
        success: true,
        verificationId: response.data.jumioIdScanReference,
        status: 'pending',
        message: 'Jumio verification initiated',
      };
    } catch (error: any) {
      logger.error('Jumio verification failed:', error);
      return {
        success: false,
        error: 'Failed to initiate Jumio verification',
      };
    }
  }

  /**
   * Create manual verification request (fallback)
   */
  private async createManualVerificationRequest(
    request: IdentityVerificationRequest
  ): Promise<IdentityVerificationResult> {
    const verificationId = `manual_${Date.now()}_${request.userId.substring(0, 8)}`;

    return {
      success: true,
      verificationId,
      status: 'requires_review',
      message: 'Verification submitted for manual review. This typically takes 1-2 business days.',
    };
  }

  /**
   * Save verification record to database
   */
  private async saveVerificationRecord(
    userId: string,
    result: IdentityVerificationResult
  ): Promise<void> {
    await db('identity_verifications').insert({
      id: result.verificationId,
      user_id: userId,
      provider: this.KYC_PROVIDER,
      status: result.status,
      confidence_score: result.confidence,
      submitted_at: new Date(),
    });
  }

  /**
   * Approve identity verification
   */
  async approveVerification(
    verificationId: string,
    provider: string,
    reviewedBy?: string
  ): Promise<void> {
    try {
      const verification = await db('identity_verifications')
        .where({ id: verificationId })
        .first();

      if (!verification) {
        throw new Error('Verification not found');
      }

      // Update verification status
      await db('identity_verifications')
        .where({ id: verificationId })
        .update({
          status: 'approved',
          reviewed_at: new Date(),
          reviewed_by: reviewedBy,
        });

      // Update user status
      await this.userRepository.verifyIdentity(
        verification.user_id,
        provider,
        verificationId
      );

      logger.info(`Identity verification approved for user ${verification.user_id}`);
    } catch (error: any) {
      logger.error('Error approving verification:', error);
      throw error;
    }
  }

  /**
   * Reject identity verification
   */
  async rejectVerification(
    verificationId: string,
    reason: string,
    reviewedBy?: string
  ): Promise<void> {
    await db('identity_verifications')
      .where({ id: verificationId })
      .update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_at: new Date(),
        reviewed_by: reviewedBy,
      });

    const verification = await db('identity_verifications')
      .where({ id: verificationId })
      .first();

    logger.info(`Identity verification rejected for user ${verification?.user_id}`, {
      reason,
    });
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(userId: string): Promise<any> {
    const verification = await db('identity_verifications')
      .where({ user_id: userId })
      .orderBy('submitted_at', 'desc')
      .first();

    const userStatus = await this.userRepository.getVerificationStatus(userId);

    return {
      verified: userStatus?.isIdentityVerified || false,
      verifiedAt: userStatus?.identityVerifiedAt,
      latestVerification: verification
        ? {
            id: verification.id,
            provider: verification.provider,
            status: verification.status,
            submittedAt: verification.submitted_at,
            reviewedAt: verification.reviewed_at,
            rejectionReason: verification.rejection_reason,
          }
        : null,
    };
  }

  /**
   * Webhook handler for KYC provider callbacks
   */
  async handleWebhook(provider: string, payload: any): Promise<void> {
    try {
      logger.info(`Received webhook from ${provider}`);

      switch (provider) {
        case 'stripe':
          await this.handleStripeWebhook(payload);
          break;
        case 'persona':
          await this.handlePersonaWebhook(payload);
          break;
        case 'onfido':
          await this.handleOnfidoWebhook(payload);
          break;
        case 'jumio':
          await this.handleJumioWebhook(payload);
          break;
        default:
          logger.warn(`Unknown webhook provider: ${provider}`);
      }
    } catch (error: any) {
      logger.error(`Error handling ${provider} webhook:`, error);
      throw error;
    }
  }

  private async handleStripeWebhook(payload: any): Promise<void> {
    const session = payload.data?.object;
    if (session?.status === 'verified') {
      await this.approveVerification(session.id, 'stripe');
    } else if (session?.status === 'requires_input') {
      await this.rejectVerification(session.id, 'Additional information required');
    }
  }

  private async handlePersonaWebhook(payload: any): Promise<void> {
    const inquiry = payload.data;
    if (inquiry?.attributes?.status === 'approved') {
      await this.approveVerification(inquiry.id, 'persona');
    } else if (inquiry?.attributes?.status === 'declined') {
      await this.rejectVerification(
        inquiry.id,
        inquiry.attributes?.['failure-reason'] || 'Verification declined'
      );
    }
  }

  private async handleOnfidoWebhook(payload: any): Promise<void> {
    const check = payload.object;
    if (check?.status === 'complete' && check?.result === 'clear') {
      await this.approveVerification(check.id, 'onfido');
    } else if (check?.status === 'complete' && check?.result === 'consider') {
      await this.rejectVerification(check.id, 'Verification requires review');
    }
  }

  private async handleJumioWebhook(payload: any): Promise<void> {
    const verification = payload;
    if (verification?.verificationStatus === 'APPROVED_VERIFIED') {
      await this.approveVerification(
        verification.jumioIdScanReference,
        'jumio'
      );
    } else if (verification?.verificationStatus === 'DENIED_FRAUD') {
      await this.rejectVerification(
        verification.jumioIdScanReference,
        'Verification failed: Potential fraud detected'
      );
    }
  }
}

export default new IdentityVerificationService();
