/**
 * ID Verification Service
 * Flamoral Dating Platform
 *
 * Orchestrates ID verification across multiple providers (Jumio, Onfido, Mock).
 * Implements provider selection logic, fallback handling, and unified result processing.
 */

import { v4 as uuidv4 } from 'uuid';
import db from '../infrastructure/database/connection';
import logger from '../utils/logger';
import config from '../config';
import { JumioProvider, OnfidoProvider, MockProvider } from './providers';
import {
  IIDVerificationProvider,
  VerificationProvider,
  InitiateIDVerificationRequest,
  InitiateIDVerificationResponse,
  IDVerificationResult,
  IDVerificationStatus,
  IDVerificationRecord,
  IDVerificationStatusResponse,
  IDDocumentType,
  UserVerificationUpdate,
  VerificationLevel,
} from '../types/id-verification-provider.types';

// Provider region preferences
const REGION_PROVIDER_PREFERENCES: Record<string, VerificationProvider> = {
  // EU countries prefer Onfido due to GDPR compliance features
  'DEU': 'onfido',
  'FRA': 'onfido',
  'GBR': 'onfido',
  'ITA': 'onfido',
  'ESP': 'onfido',
  'NLD': 'onfido',
  'BEL': 'onfido',
  'AUT': 'onfido',
  'CHE': 'onfido',
  // Americas use Jumio as primary
  'USA': 'jumio',
  'CAN': 'jumio',
  'MEX': 'jumio',
  'BRA': 'jumio',
  // Asia-Pacific
  'AUS': 'jumio',
  'JPN': 'jumio',
  'SGP': 'jumio',
  'HKG': 'jumio',
};

export class IDVerificationService {
  private providers: Map<VerificationProvider, IIDVerificationProvider>;
  private defaultProvider: VerificationProvider;

  constructor() {
    this.providers = new Map();
    this.defaultProvider = this.getConfiguredProvider();
    this.initializeProviders();
  }

  /**
   * Initialize all configured providers
   */
  private initializeProviders(): void {
    const providerConfig = config.verification;

    // Initialize Jumio if configured
    if (providerConfig?.jumio?.apiKey && providerConfig?.jumio?.apiSecret) {
      this.providers.set('jumio', new JumioProvider({
        api_key: providerConfig.jumio.apiKey,
        api_secret: providerConfig.jumio.apiSecret,
        base_url: providerConfig.jumio.baseUrl || 'https://api.jumio.com',
        workflow_id: providerConfig.jumio.workflowId,
        callback_url: providerConfig.jumio.callbackUrl || `${config.service.baseUrl}/api/v1/verification/id/webhook`,
      }));
      logger.info('Jumio provider initialized');
    }

    // Initialize Onfido if configured
    if (providerConfig?.onfido?.apiToken) {
      this.providers.set('onfido', new OnfidoProvider({
        api_token: providerConfig.onfido.apiToken,
        base_url: providerConfig.onfido.baseUrl || 'https://api.onfido.com',
        webhook_token: providerConfig.onfido.webhookToken || '',
        workflow_id: providerConfig.onfido.workflowId,
      }));
      logger.info('Onfido provider initialized');
    }

    // Always initialize mock provider for development/testing
    this.providers.set('mock', new MockProvider({
      default_result: 'approved',
      processing_delay_ms: providerConfig?.mock?.processingDelayMs || 3000,
      simulate_errors: providerConfig?.mock?.simulateErrors || false,
    }));
    logger.info('Mock provider initialized');

    // Verify at least one provider is available
    if (this.providers.size === 1 && this.providers.has('mock')) {
      logger.warn('Only mock provider is available. Configure Jumio or Onfido for production use.');
    }
  }

  /**
   * Get the configured default provider
   */
  private getConfiguredProvider(): VerificationProvider {
    const configured = config.verification?.provider as VerificationProvider;
    if (configured && ['jumio', 'onfido', 'mock'].includes(configured)) {
      return configured;
    }
    return 'jumio'; // Default to Jumio as primary
  }

  /**
   * Select the best provider for a verification request
   */
  private selectProvider(request: InitiateIDVerificationRequest): VerificationProvider {
    // Check for region-specific preference
    const regionPreference = REGION_PROVIDER_PREFERENCES[request.country_code];

    // Priority: Configured provider > Region preference > Default
    let selectedProvider = this.defaultProvider;

    if (regionPreference && this.providers.has(regionPreference)) {
      selectedProvider = regionPreference;
    }

    // Fallback to mock in development
    if (!this.providers.has(selectedProvider)) {
      if (config.service.env === 'development' || config.service.env === 'test') {
        return 'mock';
      }
      // In production, try any available provider
      const providerNames = Array.from(this.providers.keys());
      for (const name of providerNames) {
        if (name !== 'mock') {
          return name;
        }
      }
    }

    return selectedProvider;
  }

  /**
   * Get a provider instance
   */
  private getProvider(name: VerificationProvider): IIDVerificationProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider not configured: ${name}`);
    }
    return provider;
  }

  /**
   * Initiate ID verification for a user
   */
  async initiateVerification(request: InitiateIDVerificationRequest): Promise<InitiateIDVerificationResponse> {
    const selectedProvider = this.selectProvider(request);

    try {
      // Check for existing pending verification
      const existing = await db('id_verifications')
        .where({
          user_id: request.user_id,
        })
        .whereIn('status', ['initiated', 'pending', 'processing'])
        .first();

      if (existing) {
        logger.info('Found existing pending verification', {
          userId: request.user_id,
          verificationId: existing.id,
        });

        return {
          success: true,
          verification_id: existing.id,
          provider: existing.provider,
          web_url: existing.web_url,
          sdk_token: existing.sdk_token,
          expires_at: existing.expires_at,
        };
      }

      // Initiate with primary provider
      const provider = this.getProvider(selectedProvider);
      let response = await provider.initiateVerification(request);

      // If primary provider fails, try fallback
      if (!response.success && selectedProvider !== 'mock') {
        const fallbackProvider = this.getFallbackProvider(selectedProvider);
        if (fallbackProvider) {
          logger.warn('Primary provider failed, trying fallback', {
            primary: selectedProvider,
            fallback: fallbackProvider,
            error: response.error,
          });

          const fallback = this.getProvider(fallbackProvider);
          response = await fallback.initiateVerification(request);

          if (response.success) {
            response.provider = fallbackProvider;
          }
        }
      }

      if (!response.success) {
        return response;
      }

      // Create verification record in database
      const verificationId = uuidv4();
      const now = new Date();

      await db('id_verifications').insert({
        id: verificationId,
        user_id: request.user_id,
        provider: response.provider,
        external_reference_id: response.verification_id,
        document_type: request.document_type,
        country_code: request.country_code,
        status: 'initiated',
        web_url: response.web_url,
        sdk_token: response.sdk_token,
        expires_at: response.expires_at,
        initiated_at: now,
        created_at: now,
        updated_at: now,
      });

      // Create linked verification request
      const requestId = uuidv4();
      await db('verification_requests').insert({
        request_id: requestId,
        user_id: request.user_id,
        type: 'id',
        status: 'pending',
        region_policy_key: request.region_policy_key || null,
        biometric_consent_given: request.biometric_consent || false,
        biometric_consent_at: request.biometric_consent ? now : null,
        retry_count: 0,
        max_retries: 3,
        expires_at: response.expires_at,
        external_reference_id: verificationId,
        created_at: now,
        updated_at: now,
      });

      // Update id_verifications with request_id
      await db('id_verifications')
        .where({ id: verificationId })
        .update({ request_id: requestId });

      logger.info('ID verification initiated', {
        verificationId,
        requestId,
        userId: request.user_id,
        provider: response.provider,
      });

      return {
        success: true,
        verification_id: verificationId,
        provider: response.provider,
        web_url: response.web_url,
        sdk_token: response.sdk_token,
        expires_at: response.expires_at,
      };
    } catch (error: any) {
      logger.error('Failed to initiate ID verification', {
        userId: request.user_id,
        provider: selectedProvider,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Failed to initiate verification',
        error_code: 'VERIFICATION_INIT_ERROR',
      };
    }
  }

  /**
   * Process webhook callback from a provider
   */
  async processWebhook(
    provider: VerificationProvider,
    payload: Record<string, any>,
    headers: Record<string, string>,
    rawBody: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const providerInstance = this.getProvider(provider);

      // Validate webhook signature
      const signature = headers['x-jumio-signature'] || headers['x-sha2-signature'] || headers['signature'] || '';
      if (!providerInstance.validateWebhookSignature(rawBody, signature)) {
        logger.warn('Invalid webhook signature', { provider });
        return { success: false, error: 'Invalid signature' };
      }

      // Process the webhook
      const result = await providerInstance.processWebhook(payload, headers);

      // Find the verification record
      const verification = await db('id_verifications')
        .where({
          provider,
          external_reference_id: result.verification_id,
        })
        .first();

      if (!verification) {
        logger.error('Verification not found for webhook', {
          provider,
          externalId: result.verification_id,
        });
        return { success: false, error: 'Verification not found' };
      }

      // Update verification record
      const now = new Date();
      await db('id_verifications')
        .where({ id: verification.id })
        .update({
          status: result.status,
          document_check_result: result.document_check,
          face_match_result: result.face_match,
          confidence_score: result.confidence_score,
          document_details: result.document_details ? JSON.stringify(result.document_details) : null,
          extracted_data: result.extracted_data ? JSON.stringify(result.extracted_data) : null,
          decline_reasons: result.decline_reasons ? JSON.stringify(result.decline_reasons) : null,
          warnings: result.warnings ? JSON.stringify(result.warnings) : null,
          completed_at: result.completed_at || now,
          webhook_received_at: now,
          raw_response: JSON.stringify(result.raw_response),
          updated_at: now,
        });

      // Update linked verification request
      if (verification.request_id) {
        const requestStatus = this.mapStatusToRequestStatus(result.status);
        await db('verification_requests')
          .where({ request_id: verification.request_id })
          .update({
            status: requestStatus,
            completed_at: ['approved', 'denied'].includes(requestStatus) ? now : null,
            updated_at: now,
          });

        // If approved, update user verification level
        if (result.status === 'approved') {
          await this.updateUserVerificationLevel(verification.user_id, verification);
        }
      }

      logger.info('Webhook processed successfully', {
        verificationId: verification.id,
        provider,
        status: result.status,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Webhook processing failed', {
        provider,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string, userId: string): Promise<IDVerificationStatusResponse | null> {
    const verification = await db('id_verifications')
      .where({
        id: verificationId,
        user_id: userId,
      })
      .first();

    if (!verification) {
      return null;
    }

    // If still pending, check with provider for updates
    if (['initiated', 'pending', 'processing'].includes(verification.status)) {
      try {
        const provider = this.getProvider(verification.provider);
        const providerStatus = await provider.getVerificationStatus(verification.external_reference_id);

        if (providerStatus.status !== verification.status) {
          // Update local record
          await db('id_verifications')
            .where({ id: verificationId })
            .update({
              status: providerStatus.status,
              updated_at: new Date(),
            });
          verification.status = providerStatus.status;
        }
      } catch (error) {
        logger.warn('Could not fetch provider status', { verificationId, error });
      }
    }

    return {
      verification_id: verification.id,
      user_id: verification.user_id,
      provider: verification.provider,
      status: verification.status,
      document_type: verification.document_type,
      initiated_at: verification.initiated_at,
      completed_at: verification.completed_at,
      expires_at: verification.expires_at,
      result: verification.completed_at ? {
        verification_id: verification.id,
        external_reference_id: verification.external_reference_id,
        provider: verification.provider,
        status: verification.status,
        document_check: verification.document_check_result || 'not_performed',
        face_match: verification.face_match_result || 'not_performed',
        document_type: verification.document_type,
        document_details: verification.document_details ? JSON.parse(verification.document_details) : undefined,
        extracted_data: verification.extracted_data ? JSON.parse(verification.extracted_data) : undefined,
        confidence_score: verification.confidence_score,
        decline_reasons: verification.decline_reasons ? JSON.parse(verification.decline_reasons) : undefined,
        warnings: verification.warnings ? JSON.parse(verification.warnings) : undefined,
        completed_at: verification.completed_at,
      } : undefined,
    };
  }

  /**
   * Get user's latest verification
   */
  async getUserLatestVerification(userId: string): Promise<IDVerificationStatusResponse | null> {
    const verification = await db('id_verifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();

    if (!verification) {
      return null;
    }

    return this.getVerificationStatus(verification.id, userId);
  }

  /**
   * Get all verifications for a user
   */
  async getUserVerifications(userId: string): Promise<IDVerificationStatusResponse[]> {
    const verifications = await db('id_verifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');

    const results: IDVerificationStatusResponse[] = [];

    for (const v of verifications) {
      const status = await this.getVerificationStatus(v.id, userId);
      if (status) {
        results.push(status);
      }
    }

    return results;
  }

  /**
   * Update user verification level after successful ID verification
   */
  private async updateUserVerificationLevel(userId: string, verification: any): Promise<void> {
    try {
      const update: UserVerificationUpdate = {
        verification_level: 2, // ID Verified
        is_id_verified: true,
        id_verified_at: new Date(),
        id_verification_provider: verification.provider,
        id_document_type: verification.document_type,
      };

      await db('users')
        .where({ id: userId })
        .update({
          verification_level: update.verification_level,
          is_id_verified: update.is_id_verified,
          id_verified_at: update.id_verified_at,
          is_verified: true, // Also mark as generally verified
          verified_at: new Date(),
          updated_at: new Date(),
        });

      // Store verification metadata
      await db('user_verification_metadata').insert({
        id: uuidv4(),
        user_id: userId,
        verification_type: 'id',
        provider: verification.provider,
        document_type: verification.document_type,
        verified_at: new Date(),
        created_at: new Date(),
      }).onConflict(['user_id', 'verification_type']).merge();

      logger.info('User verification level updated', {
        userId,
        level: update.verification_level,
        provider: verification.provider,
      });
    } catch (error: any) {
      logger.error('Failed to update user verification level', {
        userId,
        error: error.message,
      });
    }
  }

  /**
   * Map provider status to verification request status
   */
  private mapStatusToRequestStatus(status: IDVerificationStatus): string {
    const mapping: Record<IDVerificationStatus, string> = {
      'initiated': 'pending',
      'pending': 'pending',
      'processing': 'in_review',
      'approved': 'approved',
      'declined': 'denied',
      'expired': 'expired',
      'error': 'denied',
    };
    return mapping[status] || 'pending';
  }

  /**
   * Get fallback provider
   */
  private getFallbackProvider(primary: VerificationProvider): VerificationProvider | null {
    const fallbacks: Record<VerificationProvider, VerificationProvider | null> = {
      'jumio': 'onfido',
      'onfido': 'jumio',
      'mock': null,
    };

    const fallback = fallbacks[primary];
    if (fallback && this.providers.has(fallback)) {
      return fallback;
    }
    return null;
  }

  /**
   * Check if a provider is available
   */
  isProviderAvailable(provider: VerificationProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): VerificationProvider[] {
    return Array.from(this.providers.keys());
  }
}

// Export singleton instance
export const idVerificationService = new IDVerificationService();
