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

export class JumioProvider implements IIDVerificationProvider {
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
}
