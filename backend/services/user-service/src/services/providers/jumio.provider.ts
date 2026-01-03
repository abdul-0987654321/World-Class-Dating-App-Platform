/**
 * Jumio ID Verification Provider
 * Flamoral Dating Platform
 *
 * Primary ID verification provider for Flamoral.
 * Implements integration with Jumio's Netverify service for document verification and liveness checks.
 *
 * @see https://docs.jumio.com/production/docs
 */

import * as crypto from 'crypto';
import logger from '../../utils/logger';
import {
  IIDVerificationProvider,
  VerificationProvider,
  InitiateIDVerificationRequest,
  InitiateIDVerificationResponse,
  IDVerificationResult,
  IDVerificationStatus,
  DocumentCheckResult,
  FaceMatchResult,
  JumioConfig,
  IDDocumentType,
  DocumentDetails,
  ExtractedIDData,
} from '../../types/id-verification-provider.types';
import {
  IBackgroundCheckProvider,
  BackgroundCheckTier,
  BackgroundCheckResult,
  BackgroundCheckStatus,
  WatchlistResult,
  WatchlistDetails,
  WatchlistMatch,
  BackgroundFlag,
  CheckType,
  BACKGROUND_CHECK_TIER_CONFIG,
} from '../../types/background-check.types';

// Jumio API response types
interface JumioWorkflowResponse {
  account: {
    id: string;
  };
  workflowExecution: {
    id: string;
  };
  web: {
    href: string;
  };
  sdk?: {
    token: string;
  };
  createdAt: string;
  expiresAt: string;
}

interface JumioCallbackPayload {
  workflowExecution: {
    id: string;
    href: string;
  };
  account: {
    id: string;
  };
  callbackSentAt: string;
  completedAt?: string;
  decision: {
    type: string; // 'PASSED', 'REJECTED', 'NOT_EXECUTED', 'WARNING'
    details: {
      label: string;
    };
  };
  workflow: {
    id: string;
    definitionKey: string;
  };
  capabilities?: {
    extraction?: {
      id: string;
      data?: {
        type?: string;
        subType?: string;
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
        expiryDate?: string;
        issuingDate?: string;
        documentNumber?: string;
        issuingCountry?: string;
        gender?: string;
        nationality?: string;
        mrzLine1?: string;
        mrzLine2?: string;
        mrzLine3?: string;
        address?: {
          line1?: string;
          line2?: string;
          city?: string;
          subdivision?: string;
          postalCode?: string;
          country?: string;
        };
      };
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
    };
    dataChecks?: {
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
    };
    liveness?: {
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
    };
    similarity?: {
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
      data?: {
        similarity: string; // 'MATCH', 'NOT_MATCH'
      };
    };
  };
  customerInternalReference?: string;
  userReference?: string;
}

// Jumio screening callback types
interface JumioScreeningCallback {
  workflowExecution: {
    id: string;
    href: string;
  };
  account: {
    id: string;
  };
  callbackSentAt: string;
  completedAt?: string;
  decision: {
    type: string;
    details: {
      label: string;
    };
  };
  capabilities?: {
    extraction?: {
      id?: string;
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
    };
    screening?: {
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
      data?: {
        searchResults?: Array<{
          listName?: string;
          listType?: string;
          matchedName?: string;
          matchScore?: number;
          details?: string;
        }>;
        listsSearched?: string[];
      };
    };
    watchlistScreening?: {
      decision?: {
        type: string;
        details?: {
          label?: string;
        };
      };
      data?: {
        searchResults?: Array<{
          listName?: string;
          listType?: string;
          matchedName?: string;
          matchScore?: number;
          details?: string;
        }>;
      };
    };
  };
  customerInternalReference?: string;
  userReference?: string;
}

export class JumioProvider implements IIDVerificationProvider, IBackgroundCheckProvider {
  public readonly name: VerificationProvider = 'jumio';
  private config: JumioConfig;

  constructor(config: JumioConfig) {
    this.config = config;
    logger.info('Jumio provider initialized', { baseUrl: config.base_url });
  }

  /**
   * Initiate an ID verification session with Jumio
   */
  async initiateVerification(request: InitiateIDVerificationRequest): Promise<InitiateIDVerificationResponse> {
    try {
      const workflowId = this.config.workflow_id || '10011'; // Default: ID verification with selfie
      const customerInternalReference = `flamoral_${request.user_id}_${Date.now()}`;

      const payload = {
        customerInternalReference,
        userReference: request.user_id,
        workflowDefinition: {
          key: workflowId,
          credentials: [
            {
              category: 'ID',
              type: {
                values: this.mapDocumentType(request.document_type),
              },
              country: {
                values: [request.country_code],
              },
            },
          ],
        },
        callbackUrl: this.config.callback_url,
        web: {
          successUrl: request.redirect_url ? `${request.redirect_url}?status=success` : undefined,
          errorUrl: request.redirect_url ? `${request.redirect_url}?status=error` : undefined,
          locale: request.locale || 'en',
        },
      };

      const response = await this.makeApiRequest<JumioWorkflowResponse>(
        'POST',
        '/api/v1/accounts',
        payload
      );

      const expiresAt = new Date(response.expiresAt);

      logger.info('Jumio verification initiated', {
        userId: request.user_id,
        workflowExecutionId: response.workflowExecution.id,
        accountId: response.account.id,
      });

      return {
        success: true,
        verification_id: response.workflowExecution.id,
        provider: 'jumio',
        web_url: response.web.href,
        sdk_token: response.sdk?.token,
        expires_at: expiresAt,
      };
    } catch (error: any) {
      logger.error('Jumio verification initiation failed', {
        userId: request.user_id,
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        provider: 'jumio',
        error: error.message || 'Failed to initiate verification',
        error_code: error.code || 'JUMIO_INIT_ERROR',
      };
    }
  }

  /**
   * Process webhook callback from Jumio
   */
  async processWebhook(payload: Record<string, any>, headers: Record<string, string>): Promise<IDVerificationResult> {
    const callback = payload as JumioCallbackPayload;
    const verificationId = callback.workflowExecution.id;
    const userId = callback.userReference || callback.customerInternalReference?.split('_')[1] || '';

    logger.info('Processing Jumio webhook', {
      verificationId,
      decision: callback.decision.type,
    });

    // Map Jumio decision to our status
    const status = this.mapDecisionToStatus(callback.decision.type);
    const documentCheck = this.mapDocumentCheckResult(callback);
    const faceMatch = this.mapFaceMatchResult(callback);
    const documentType = this.mapJumioDocumentType(callback.capabilities?.extraction?.data?.type);

    // Extract document details
    const extractionData = callback.capabilities?.extraction?.data;
    const documentDetails: DocumentDetails | undefined = extractionData ? {
      document_number: extractionData.documentNumber,
      issuing_country: extractionData.issuingCountry,
      issue_date: extractionData.issuingDate,
      expiry_date: extractionData.expiryDate,
      mrz_line1: extractionData.mrzLine1,
      mrz_line2: extractionData.mrzLine2,
      mrz_line3: extractionData.mrzLine3,
    } : undefined;

    // Extract personal data
    const extractedData: ExtractedIDData | undefined = extractionData ? {
      first_name: extractionData.firstName,
      last_name: extractionData.lastName,
      date_of_birth: extractionData.dateOfBirth,
      gender: extractionData.gender,
      nationality: extractionData.nationality,
      address: extractionData.address ? {
        line1: extractionData.address.line1,
        line2: extractionData.address.line2,
        city: extractionData.address.city,
        state: extractionData.address.subdivision,
        postal_code: extractionData.address.postalCode,
        country: extractionData.address.country,
      } : undefined,
    } : undefined;

    // Gather decline reasons and warnings
    const declineReasons: string[] = [];
    const warnings: string[] = [];

    if (callback.decision.type === 'REJECTED') {
      declineReasons.push(callback.decision.details.label);
    }
    if (callback.decision.type === 'WARNING') {
      warnings.push(callback.decision.details.label);
    }

    // Calculate confidence score based on decisions
    const confidenceScore = this.calculateConfidenceScore(callback);

    return {
      verification_id: verificationId,
      external_reference_id: callback.account.id,
      provider: 'jumio',
      status,
      document_check: documentCheck,
      face_match: faceMatch,
      document_type: documentType,
      document_details: documentDetails,
      extracted_data: extractedData,
      confidence_score: confidenceScore,
      decline_reasons: declineReasons.length > 0 ? declineReasons : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      completed_at: callback.completedAt ? new Date(callback.completedAt) : undefined,
      raw_response: payload,
    };
  }

  /**
   * Get verification status from Jumio
   */
  async getVerificationStatus(verificationId: string): Promise<IDVerificationResult> {
    try {
      // First, get the workflow execution details
      const execution = await this.makeApiRequest<any>(
        'GET',
        `/api/v1/workflow-executions/${verificationId}`
      );

      const status = this.mapDecisionToStatus(execution.decision?.type || 'NOT_EXECUTED');

      return {
        verification_id: verificationId,
        external_reference_id: execution.account?.id || '',
        provider: 'jumio',
        status,
        document_check: 'not_performed',
        face_match: 'not_performed',
        document_type: 'passport', // Will be updated when details are fetched
        raw_response: execution,
      };
    } catch (error: any) {
      logger.error('Failed to get Jumio verification status', {
        verificationId,
        error: error.message,
      });

      throw new Error(`Failed to get verification status: ${error.message}`);
    }
  }

  /**
   * Validate Jumio webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Jumio uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', this.config.api_secret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Jumio webhook signature validation failed', { error });
      return false;
    }
  }

  /**
   * Make API request to Jumio
   */
  private async makeApiRequest<T>(
    method: string,
    path: string,
    body?: Record<string, any>
  ): Promise<T> {
    const url = `${this.config.base_url}${path}`;

    // Create Basic Auth header
    const authString = Buffer.from(`${this.config.api_key}:${this.config.api_secret}`).toString('base64');

    const headers: Record<string, string> = {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Flamoral/1.0',
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorBody);
        } catch {
          errorData = { message: errorBody };
        }

        const error = new Error(errorData.message || `Jumio API error: ${response.status}`);
        (error as any).code = errorData.code || `HTTP_${response.status}`;
        throw error;
      }

      return await response.json() as T;
    } catch (error: any) {
      if (error.code) {
        throw error;
      }
      throw new Error(`Jumio API request failed: ${error.message}`);
    }
  }

  /**
   * Map document type to Jumio format
   */
  private mapDocumentType(documentType: IDDocumentType): string[] {
    const mapping: Record<IDDocumentType, string[]> = {
      passport: ['PASSPORT'],
      drivers_license: ['DRIVING_LICENSE'],
      national_id: ['ID_CARD'],
    };
    return mapping[documentType] || ['PASSPORT'];
  }

  /**
   * Map Jumio document type back to our format
   */
  private mapJumioDocumentType(jumioType?: string): IDDocumentType {
    if (!jumioType) return 'passport';

    const mapping: Record<string, IDDocumentType> = {
      'PASSPORT': 'passport',
      'DRIVING_LICENSE': 'drivers_license',
      'ID_CARD': 'national_id',
    };
    return mapping[jumioType.toUpperCase()] || 'passport';
  }

  /**
   * Map Jumio decision to our status
   */
  private mapDecisionToStatus(decision: string): IDVerificationStatus {
    const mapping: Record<string, IDVerificationStatus> = {
      'PASSED': 'approved',
      'REJECTED': 'declined',
      'NOT_EXECUTED': 'pending',
      'WARNING': 'approved', // Approved with warnings
    };
    return mapping[decision] || 'processing';
  }

  /**
   * Map document check result from Jumio callback
   */
  private mapDocumentCheckResult(callback: JumioCallbackPayload): DocumentCheckResult {
    const dataChecksDecision = callback.capabilities?.dataChecks?.decision?.type;
    const extractionDecision = callback.capabilities?.extraction?.decision?.type;

    if (!dataChecksDecision && !extractionDecision) {
      return 'not_performed';
    }

    if (dataChecksDecision === 'PASSED' && extractionDecision === 'PASSED') {
      return 'clear';
    }

    if (dataChecksDecision === 'REJECTED' || extractionDecision === 'REJECTED') {
      return 'rejected';
    }

    if (dataChecksDecision === 'WARNING' || extractionDecision === 'WARNING') {
      return 'caution';
    }

    return 'consider';
  }

  /**
   * Map face match result from Jumio callback
   */
  private mapFaceMatchResult(callback: JumioCallbackPayload): FaceMatchResult {
    const similarityDecision = callback.capabilities?.similarity?.decision?.type;
    const similarityData = callback.capabilities?.similarity?.data?.similarity;

    if (!similarityDecision) {
      return 'not_performed';
    }

    if (similarityDecision === 'PASSED' || similarityData === 'MATCH') {
      return 'match';
    }

    if (similarityDecision === 'REJECTED' || similarityData === 'NOT_MATCH') {
      return 'no_match';
    }

    return 'error';
  }

  /**
   * Calculate confidence score from Jumio response
   */
  private calculateConfidenceScore(callback: JumioCallbackPayload): number {
    const checks = [
      callback.capabilities?.extraction?.decision?.type,
      callback.capabilities?.dataChecks?.decision?.type,
      callback.capabilities?.similarity?.decision?.type,
      callback.capabilities?.liveness?.decision?.type,
    ].filter(Boolean);

    if (checks.length === 0) return 0;

    const passedChecks = checks.filter(c => c === 'PASSED').length;
    const warningChecks = checks.filter(c => c === 'WARNING').length;

    // PASSED = 1.0, WARNING = 0.7, REJECTED = 0
    return (passedChecks * 1.0 + warningChecks * 0.7) / checks.length;
  }

  // ============================================
  // Background Check Provider Implementation
  // ============================================

  /**
   * Create a background check with Jumio
   * Uses screening workflows for watchlist and identity checks
   */
  async createBackgroundCheck(
    userId: string,
    applicantId: string,
    tier: BackgroundCheckTier
  ): Promise<{ success: boolean; check_id?: string; error?: string }> {
    try {
      // Determine workflow based on tier
      const workflowKey = this.getScreeningWorkflowKey(tier);
      const customerInternalReference = `flamoral_bg_${userId}_${Date.now()}`;

      logger.info('Creating Jumio background check', {
        userId,
        applicantId,
        tier,
        workflowKey,
      });

      const payload = {
        customerInternalReference,
        userReference: userId,
        workflowDefinition: {
          key: workflowKey,
          credentials: [
            {
              category: 'ID',
              type: {
                values: ['PASSPORT', 'DRIVING_LICENSE', 'ID_CARD'],
              },
            },
          ],
          capabilities: this.getCapabilitiesForTier(tier),
        },
        callbackUrl: this.config.callback_url,
      };

      const response = await this.makeApiRequest<JumioWorkflowResponse>(
        'POST',
        '/api/v1/accounts',
        payload
      );

      logger.info('Jumio background check created', {
        userId,
        workflowExecutionId: response.workflowExecution.id,
        accountId: response.account.id,
      });

      return {
        success: true,
        check_id: response.workflowExecution.id,
      };
    } catch (error: any) {
      logger.error('Failed to create Jumio background check', {
        userId,
        applicantId,
        error: error.message,
      });

      return {
        success: false,
        error: error.message || 'Failed to create background check',
      };
    }
  }

  /**
   * Get background check status from Jumio
   */
  async getCheckStatus(checkId: string): Promise<BackgroundCheckResult> {
    try {
      // Get workflow execution details
      const execution = await this.makeApiRequest<any>(
        'GET',
        `/api/v1/workflow-executions/${checkId}`
      );

      return this.mapExecutionToBackgroundResult(execution, checkId);
    } catch (error: any) {
      logger.error('Failed to get Jumio check status', {
        checkId,
        error: error.message,
      });

      throw new Error(`Failed to get background check status: ${error.message}`);
    }
  }

  /**
   * Process background check webhook from Jumio
   */
  async processBackgroundCheckWebhook(
    payload: Record<string, any>,
    headers: Record<string, string>
  ): Promise<BackgroundCheckResult> {
    const callback = payload as JumioScreeningCallback;
    const verificationId = callback.workflowExecution.id;

    logger.info('Processing Jumio background check webhook', {
      verificationId,
      decision: callback.decision.type,
    });

    // Map decision to status
    const status = this.mapDecisionToBackgroundStatus(callback.decision.type);

    // Extract screening results
    const screeningData = callback.capabilities?.screening || callback.capabilities?.watchlistScreening;
    const watchlistResult = this.mapScreeningToWatchlistResult(screeningData);
    const watchlistDetails = this.extractJumioWatchlistDetails(screeningData);

    // Check identity verification from main decision
    const identityVerified = callback.decision.type === 'PASSED';

    // Extract flags
    const flags = this.extractJumioBackgroundFlags(callback);

    // Determine tier and checks performed
    const tier = this.inferTierFromCallback(callback);
    const checksPerformed = this.getChecksFromCallback(callback);

    // Calculate overall score
    const overallScore = this.calculateBackgroundScore(callback);

    return {
      background_check_id: verificationId,
      external_id: callback.account.id,
      provider: 'jumio',
      status,
      tier,
      checks_performed: checksPerformed,
      identity_verified: identityVerified,
      watchlist_result: watchlistResult,
      watchlist_details: watchlistDetails,
      overall_score: overallScore,
      flags: flags.length > 0 ? flags : undefined,
      completed_at: callback.completedAt ? new Date(callback.completedAt) : undefined,
      raw_response: payload,
    };
  }

  /**
   * Map tier to Jumio report names/capabilities
   */
  mapTierToReports(tier: BackgroundCheckTier): string[] {
    switch (tier) {
      case 'basic':
        return ['extraction', 'liveness', 'screening'];
      case 'standard':
        return ['extraction', 'liveness', 'screening', 'dataChecks', 'similarity'];
      case 'comprehensive':
        return ['extraction', 'liveness', 'screening', 'dataChecks', 'similarity', 'watchlistScreening'];
      default:
        return ['extraction', 'liveness', 'screening'];
    }
  }

  /**
   * Get Jumio workflow key for screening tier
   */
  private getScreeningWorkflowKey(tier: BackgroundCheckTier): string {
    // Jumio workflow IDs for different screening levels
    const workflows: Record<BackgroundCheckTier, string> = {
      basic: '10011', // ID verification + basic screening
      standard: '10012', // Enhanced with data checks
      comprehensive: '10013', // Full screening with watchlist
    };
    return this.config.workflow_id || workflows[tier] || '10011';
  }

  /**
   * Get capabilities configuration for tier
   */
  private getCapabilitiesForTier(tier: BackgroundCheckTier): Record<string, any> {
    const base = {
      extraction: {},
      liveness: {},
      similarity: {},
    };

    switch (tier) {
      case 'basic':
        return {
          ...base,
          screening: {
            watchlists: ['PEP', 'SANCTIONS'],
          },
        };
      case 'standard':
        return {
          ...base,
          dataChecks: {},
          screening: {
            watchlists: ['PEP', 'SANCTIONS', 'ADVERSE_MEDIA'],
          },
        };
      case 'comprehensive':
        return {
          ...base,
          dataChecks: {},
          screening: {
            watchlists: ['PEP', 'SANCTIONS', 'ADVERSE_MEDIA', 'CRIMINAL', 'GLOBAL_WATCHLIST'],
          },
        };
      default:
        return base;
    }
  }

  /**
   * Map Jumio execution to background check result
   */
  private mapExecutionToBackgroundResult(execution: any, checkId: string): BackgroundCheckResult {
    const status = this.mapDecisionToBackgroundStatus(execution.decision?.type || 'NOT_EXECUTED');

    return {
      background_check_id: checkId,
      external_id: execution.account?.id || '',
      provider: 'jumio',
      status,
      tier: 'basic',
      checks_performed: [],
      identity_verified: execution.decision?.type === 'PASSED',
      watchlist_result: 'not_performed',
      raw_response: execution,
    };
  }

  /**
   * Map Jumio decision to background check status
   */
  private mapDecisionToBackgroundStatus(decision: string): BackgroundCheckStatus {
    const mapping: Record<string, BackgroundCheckStatus> = {
      'PASSED': 'clear',
      'REJECTED': 'flagged',
      'NOT_EXECUTED': 'pending',
      'WARNING': 'consider',
    };
    return mapping[decision] || 'processing';
  }

  /**
   * Map screening data to watchlist result
   */
  private mapScreeningToWatchlistResult(screeningData?: any): WatchlistResult {
    if (!screeningData?.decision) return 'not_performed';

    switch (screeningData.decision.type) {
      case 'PASSED':
        return 'clear';
      case 'WARNING':
        return 'possible_match';
      case 'REJECTED':
        return 'confirmed_match';
      default:
        return 'not_performed';
    }
  }

  /**
   * Extract watchlist details from Jumio screening
   */
  private extractJumioWatchlistDetails(screeningData?: any): WatchlistDetails | undefined {
    if (!screeningData?.data) return undefined;

    const searchResults = screeningData.data.searchResults || [];
    const listsSearched = screeningData.data.listsSearched || [];

    const matches: WatchlistMatch[] = searchResults.map((result: any) => ({
      list_name: result.listName || 'Unknown',
      list_type: result.listType || 'other',
      match_score: result.matchScore || 0.5,
      name_matched: result.matchedName,
      details: result.details,
    }));

    return {
      screened_lists: listsSearched,
      potential_matches: matches,
      match_count: matches.length,
      high_risk_matches: matches.filter(m => m.match_score >= 0.8).length,
    };
  }

  /**
   * Extract flags from Jumio callback
   */
  private extractJumioBackgroundFlags(callback: JumioScreeningCallback): BackgroundFlag[] {
    const flags: BackgroundFlag[] = [];

    if (callback.decision.type === 'REJECTED') {
      flags.push({
        type: 'verification_rejected',
        severity: 'high',
        description: callback.decision.details.label,
        source: 'jumio',
      });
    }

    if (callback.decision.type === 'WARNING') {
      flags.push({
        type: 'verification_warning',
        severity: 'medium',
        description: callback.decision.details.label,
        source: 'jumio',
      });
    }

    // Add screening-specific flags
    const screening = callback.capabilities?.screening || callback.capabilities?.watchlistScreening;
    if (screening?.decision?.type === 'WARNING' || screening?.decision?.type === 'REJECTED') {
      flags.push({
        type: 'watchlist_concern',
        severity: screening.decision.type === 'REJECTED' ? 'critical' : 'high',
        description: screening.decision.details?.label || 'Watchlist screening concern',
        source: 'jumio_screening',
      });
    }

    return flags;
  }

  /**
   * Infer tier from callback data
   */
  private inferTierFromCallback(callback: JumioScreeningCallback): BackgroundCheckTier {
    const capabilities = callback.capabilities || {};
    const capabilityCount = Object.keys(capabilities).length;

    if (capabilityCount >= 5 || capabilities.watchlistScreening) {
      return 'comprehensive';
    }
    if (capabilityCount >= 4) {
      return 'standard';
    }
    return 'basic';
  }

  /**
   * Get checks performed from callback
   */
  private getChecksFromCallback(callback: JumioScreeningCallback): CheckType[] {
    const checks: CheckType[] = [];
    const capabilities = callback.capabilities || {};

    if (capabilities.extraction) checks.push('identity');
    if (capabilities.screening || capabilities.watchlistScreening) checks.push('watchlist');

    return checks;
  }

  /**
   * Calculate background score from Jumio callback
   */
  private calculateBackgroundScore(callback: JumioScreeningCallback): number {
    const decisions = [
      callback.decision.type,
      callback.capabilities?.screening?.decision?.type,
      callback.capabilities?.watchlistScreening?.decision?.type,
    ].filter(Boolean);

    if (decisions.length === 0) return 0;

    let score = 0;
    for (const decision of decisions) {
      if (decision === 'PASSED') score += 1;
      else if (decision === 'WARNING') score += 0.5;
    }

    return score / decisions.length;
  }
}
