/**
 * Background Check Service
 * Flamoral Dating Platform
 *
 * Orchestrates background checks for Elite tier users.
 * Integrates with Onfido and Jumio providers for identity and watchlist screening.
 */

import { v4 as uuidv4 } from 'uuid';

import config from '../config';
import db from '../infrastructure/database/connection';
import {
  BackgroundCheckTier,
  BackgroundCheckStatus,
  BackgroundCheckResult,
  BackgroundCheckStatusResponse,
  InitiateBackgroundCheckRequest,
  InitiateBackgroundCheckResponse,
  CheckType,
  WatchlistResult,
  BACKGROUND_CHECK_TIER_CONFIG,
} from '../types/background-check.types';
import { VerificationProvider } from '../types/id-verification-provider.types';
import logger from '../utils/logger';

import { JumioProvider } from './providers/jumio.provider';
import { OnfidoProvider } from './providers/onfido.provider';

// Provider type that supports both ID verification and background checks
type BackgroundCheckCapableProvider = JumioProvider | OnfidoProvider;

// Provider region preferences for background checks
const REGION_PROVIDER_PREFERENCES: Record<string, VerificationProvider> = {
  // EU countries - Onfido for GDPR compliance
  DEU: 'onfido',
  FRA: 'onfido',
  GBR: 'onfido',
  ITA: 'onfido',
  ESP: 'onfido',
  // Americas - Jumio
  USA: 'jumio',
  CAN: 'jumio',
  MEX: 'jumio',
  // Default to Jumio
};

export class BackgroundCheckService {
  private providers: Map<VerificationProvider, BackgroundCheckCapableProvider>;
  private defaultProvider: VerificationProvider;

  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'jumio';
    this.initializeProviders();
  }

  /**
   * Initialize background check providers
   */
  private initializeProviders(): void {
    const providerConfig = config.verification;

    // Initialize Jumio if configured
    if (providerConfig?.jumio?.apiKey && providerConfig?.jumio?.apiSecret) {
      const jumioProvider = new JumioProvider({
        api_key: providerConfig.jumio.apiKey,
        api_secret: providerConfig.jumio.apiSecret,
        base_url: providerConfig.jumio.baseUrl || 'https://api.jumio.com',
        workflow_id: providerConfig.jumio.workflowId,
        callback_url:
          providerConfig.jumio.callbackUrl ||
          `${config.service.baseUrl}/api/v1/verification/background/webhook/jumio`,
      });
      this.providers.set('jumio', jumioProvider);
      logger.info('Jumio background check provider initialized');
    }

    // Initialize Onfido if configured
    if (providerConfig?.onfido?.apiToken) {
      const onfidoProvider = new OnfidoProvider({
        api_token: providerConfig.onfido.apiToken,
        base_url: providerConfig.onfido.baseUrl || 'https://api.onfido.com',
        webhook_token: providerConfig.onfido.webhookToken || '',
        workflow_id: providerConfig.onfido.workflowId,
      });
      this.providers.set('onfido', onfidoProvider);
      logger.info('Onfido background check provider initialized');
    }

    if (this.providers.size === 0) {
      logger.warn(
        'No background check providers configured. Background checks will not be available.'
      );
    }
  }

  /**
   * Select provider based on user's region
   */
  private selectProvider(countryCode?: string): VerificationProvider {
    if (countryCode && REGION_PROVIDER_PREFERENCES[countryCode]) {
      const preferred = REGION_PROVIDER_PREFERENCES[countryCode];
      if (this.providers.has(preferred)) {
        return preferred;
      }
    }

    // Fall back to any available provider
    if (this.providers.has(this.defaultProvider)) {
      return this.defaultProvider;
    }

    // Return first available
    const available = Array.from(this.providers.keys())[0];
    return available || 'jumio';
  }

  /**
   * Initiate a background check for a user
   */
  async initiateBackgroundCheck(
    request: InitiateBackgroundCheckRequest
  ): Promise<InitiateBackgroundCheckResponse> {
    const { user_id, tier, country_code, consent_given, consent_timestamp } = request;

    try {
      // Validate consent
      if (!consent_given) {
        return {
          success: false,
          error: 'User consent is required for background checks',
          error_code: 'CONSENT_REQUIRED',
        };
      }

      // Verify user has Elite subscription
      const hasElite = await this.verifyEliteSubscription(user_id);
      if (!hasElite) {
        return {
          success: false,
          error: 'Background checks require Elite subscription',
          error_code: 'ELITE_REQUIRED',
        };
      }

      // Check for existing pending or recent background check
      const existing = await this.getExistingValidCheck(user_id);
      if (existing) {
        logger.info('Found existing valid background check', {
          userId: user_id,
          checkId: existing.id,
          status: existing.status,
        });

        return {
          success: true,
          background_check_id: existing.id,
          provider: existing.provider,
          status: existing.status,
          checks_included: existing.checks_performed,
        };
      }

      // Select provider
      const selectedProvider = this.selectProvider(country_code);
      const provider = this.providers.get(selectedProvider);

      if (!provider) {
        return {
          success: false,
          error: 'No background check provider available',
          error_code: 'NO_PROVIDER',
        };
      }

      // Get or create applicant ID for the user
      const applicantId = await this.getOrCreateApplicantId(user_id, selectedProvider);

      // Create background check with provider
      const result = await provider.createBackgroundCheck(user_id, applicantId, tier);

      if (!result.success || !result.check_id) {
        return {
          success: false,
          error: result.error || 'Failed to initiate background check',
          error_code: 'PROVIDER_ERROR',
        };
      }

      // Store background check record
      const backgroundCheckId = uuidv4();
      const now = new Date();
      const tierConfig = BACKGROUND_CHECK_TIER_CONFIG[tier];

      await db('background_checks').insert({
        id: backgroundCheckId,
        user_id,
        provider: selectedProvider,
        external_id: result.check_id,
        tier,
        status: 'initiated',
        checks_performed: JSON.stringify(tierConfig.checks),
        identity_verified: false,
        watchlist_result: 'not_performed',
        consent_given: true,
        consent_timestamp,
        initiated_at: now,
        expires_at: new Date(now.getTime() + tierConfig.validity_days * 24 * 60 * 60 * 1000),
        created_at: now,
        updated_at: now,
      });

      logger.info('Background check initiated', {
        backgroundCheckId,
        userId: user_id,
        provider: selectedProvider,
        tier,
        externalId: result.check_id,
      });

      // Calculate estimated completion (usually 1-3 hours for screening)
      const estimatedCompletion = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      return {
        success: true,
        background_check_id: backgroundCheckId,
        provider: selectedProvider,
        status: 'initiated',
        checks_included: tierConfig.checks,
        estimated_completion: estimatedCompletion,
      };
    } catch (error: any) {
      logger.error('Failed to initiate background check', {
        userId: user_id,
        tier,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Internal error initiating background check',
        error_code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Get background check status for a user
   */
  async getBackgroundCheckStatus(userId: string): Promise<BackgroundCheckStatusResponse | null> {
    try {
      // Get most recent background check for user
      const check = await db('background_checks')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc')
        .first();

      if (!check) {
        return null;
      }

      // If still processing, try to get updated status from provider
      if (['initiated', 'pending', 'processing'].includes(check.status)) {
        await this.refreshCheckStatus(check);
      }

      // Reload after potential update
      const updatedCheck = await db('background_checks').where({ id: check.id }).first();

      return this.mapRecordToStatusResponse(updatedCheck);
    } catch (error: any) {
      logger.error('Failed to get background check status', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get background check by ID
   */
  async getBackgroundCheckById(
    checkId: string,
    userId: string
  ): Promise<BackgroundCheckStatusResponse | null> {
    const check = await db('background_checks')
      .where({
        id: checkId,
        user_id: userId,
      })
      .first();

    if (!check) {
      return null;
    }

    return this.mapRecordToStatusResponse(check);
  }

  /**
   * Handle webhook from background check provider
   */
  async handleProviderWebhook(
    providerName: VerificationProvider,
    payload: Record<string, any>,
    headers: Record<string, string>,
    rawBody: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = this.providers.get(providerName);
      if (!provider) {
        logger.warn('Webhook received for unconfigured provider', { provider: providerName });
        return { success: false, error: 'Provider not configured' };
      }

      // Validate webhook signature (provider-specific)
      const signature =
        headers['x-jumio-signature'] || headers['x-sha2-signature'] || headers['signature'] || '';

      if (!provider.validateWebhookSignature(rawBody, signature)) {
        logger.warn('Invalid background check webhook signature', { provider: providerName });
        return { success: false, error: 'Invalid signature' };
      }

      // Process the webhook using background check specific method
      const result = await provider.processBackgroundCheckWebhook(payload, headers);

      // Find and update the background check record
      const check = await db('background_checks')
        .where({
          provider: providerName,
          external_id: result.external_id,
        })
        .orWhere({
          provider: providerName,
          external_id: result.background_check_id,
        })
        .first();

      if (!check) {
        logger.error('Background check not found for webhook', {
          provider: providerName,
          externalId: result.external_id,
        });
        return { success: false, error: 'Background check not found' };
      }

      // Update the record
      const now = new Date();
      await db('background_checks')
        .where({ id: check.id })
        .update({
          status: result.status,
          identity_verified: result.identity_verified,
          watchlist_result: result.watchlist_result,
          watchlist_details: result.watchlist_details
            ? JSON.stringify(result.watchlist_details)
            : null,
          overall_score: result.overall_score,
          flags: result.flags ? JSON.stringify(result.flags) : null,
          completed_at: result.completed_at || now,
          webhook_received_at: now,
          raw_response: JSON.stringify(result.raw_response),
          updated_at: now,
        });

      // If check is clear, award badge to user
      if (result.status === 'clear' && result.identity_verified) {
        await this.awardBackgroundCheckBadge(check.user_id, check.tier);
      }

      logger.info('Background check webhook processed', {
        checkId: check.id,
        userId: check.user_id,
        provider: providerName,
        status: result.status,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to process background check webhook', {
        provider: providerName,
        error: error.message,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify user has Elite subscription
   */
  private async verifyEliteSubscription(userId: string): Promise<boolean> {
    const subscription = await db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .whereIn('tier', ['elite', 'elite_annual'])
      .first();

    return !!subscription;
  }

  /**
   * Get existing valid background check
   */
  private async getExistingValidCheck(userId: string): Promise<any | null> {
    const now = new Date();

    // Check for pending or recently completed check
    const check = await db('background_checks')
      .where({ user_id: userId })
      .where(function () {
        this.whereIn('status', ['initiated', 'pending', 'processing']).orWhere(function () {
          this.where('status', 'clear').where('expires_at', '>', now);
        });
      })
      .orderBy('created_at', 'desc')
      .first();

    return check || null;
  }

  /**
   * Get or create applicant ID for user with provider
   */
  private async getOrCreateApplicantId(
    userId: string,
    provider: VerificationProvider
  ): Promise<string> {
    // Check if user already has an applicant ID for this provider
    const existing = await db('id_verifications')
      .where({
        user_id: userId,
        provider,
      })
      .whereNotNull('external_reference_id')
      .orderBy('created_at', 'desc')
      .first();

    if (existing?.external_reference_id) {
      return existing.external_reference_id;
    }

    // For new users, the provider will create an applicant during check creation
    // Return user ID as a placeholder - provider will handle creation
    return userId;
  }

  /**
   * Refresh check status from provider
   */
  private async refreshCheckStatus(check: any): Promise<void> {
    try {
      const provider = this.providers.get(check.provider);
      if (!provider) return;

      const result = await provider.getCheckStatus(check.external_id);

      if (result.status !== check.status) {
        await db('background_checks').where({ id: check.id }).update({
          status: result.status,
          identity_verified: result.identity_verified,
          watchlist_result: result.watchlist_result,
          overall_score: result.overall_score,
          updated_at: new Date(),
        });
      }
    } catch (error) {
      logger.warn('Could not refresh background check status', {
        checkId: check.id,
        error,
      });
    }
  }

  /**
   * Award background check badge to user
   */
  private async awardBackgroundCheckBadge(
    userId: string,
    tier: BackgroundCheckTier
  ): Promise<void> {
    try {
      const badgeType = `background_verified_${tier}`;

      // Check if badge already exists
      const existing = await db('user_badges')
        .where({
          user_id: userId,
          badge_type: badgeType,
        })
        .first();

      if (!existing) {
        await db('user_badges').insert({
          id: uuidv4(),
          user_id: userId,
          badge_type: badgeType,
          badge_name: `Background Verified (${tier})`,
          awarded_at: new Date(),
          created_at: new Date(),
        });

        logger.info('Background check badge awarded', {
          userId,
          badgeType,
        });
      }
    } catch (error) {
      // Don't fail the webhook if badge creation fails
      logger.warn('Could not award background check badge', {
        userId,
        tier,
        error,
      });
    }
  }

  /**
   * Map database record to status response
   */
  private mapRecordToStatusResponse(record: any): BackgroundCheckStatusResponse {
    return {
      background_check_id: record.id,
      user_id: record.user_id,
      provider: record.provider,
      status: record.status,
      tier: record.tier,
      checks_included: record.checks_performed ? JSON.parse(record.checks_performed) : [],
      initiated_at: record.initiated_at,
      completed_at: record.completed_at || undefined,
      expires_at: record.expires_at || undefined,
      result: record.completed_at
        ? {
            background_check_id: record.id,
            external_id: record.external_id,
            provider: record.provider,
            status: record.status,
            tier: record.tier,
            checks_performed: record.checks_performed ? JSON.parse(record.checks_performed) : [],
            identity_verified: record.identity_verified,
            watchlist_result: record.watchlist_result,
            watchlist_details: record.watchlist_details
              ? JSON.parse(record.watchlist_details)
              : undefined,
            overall_score: record.overall_score,
            flags: record.flags ? JSON.parse(record.flags) : undefined,
            completed_at: record.completed_at,
            raw_response: record.raw_response ? JSON.parse(record.raw_response) : undefined,
          }
        : undefined,
      badge_awarded: record.status === 'clear' && record.identity_verified,
    };
  }

  /**
   * Check if provider is available
   */
  isProviderAvailable(provider: VerificationProvider): boolean {
    return this.providers.has(provider);
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): VerificationProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get tier configuration
   */
  getTierConfig(tier: BackgroundCheckTier) {
    return BACKGROUND_CHECK_TIER_CONFIG[tier];
  }

  /**
   * Get all tier configurations
   */
  getAllTierConfigs() {
    return BACKGROUND_CHECK_TIER_CONFIG;
  }
}

// Export singleton instance
export const backgroundCheckService = new BackgroundCheckService();
