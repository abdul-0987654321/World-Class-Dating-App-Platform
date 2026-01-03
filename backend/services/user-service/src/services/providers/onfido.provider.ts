/**
 * Onfido ID Verification Provider
 * Flamoral Dating Platform
 *
 * Fallback ID verification provider for Flamoral.
 * Used when Jumio is unavailable or for specific regions.
 *
 * @see https://documentation.onfido.com/
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
  OnfidoConfig,
  IDDocumentType,
  DocumentDetails,
  ExtractedIDData,
} from '../../types/id-verification-provider.types';

// Onfido API response types
interface OnfidoApplicant {
  id: string;
  created_at: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface OnfidoSdkToken {
  token: string;
  applicant_id: string;
}

interface OnfidoWorkflowRun {
  id: string;
  applicant_id: string;
  workflow_id: string;
  status: string; // 'processing', 'awaiting_input', 'approved', 'declined', 'review', 'abandoned', 'error'
  link: {
    url: string;
    expires_at: string;
  };
  created_at: string;
  updated_at: string;
}

interface OnfidoWebhookPayload {
  payload: {
    resource_type: string;
    action: string;
    object: {
      id: string;
      status?: string;
      completed_at_iso8601?: string;
      href?: string;
      applicant_id?: string;
      output?: {
        result?: string;
        sub_result?: string;
        breakdown?: Record<string, any>;
      };
    };
  };
}

interface OnfidoCheck {
  id: string;
  applicant_id: string;
  status: string; // 'in_progress', 'awaiting_applicant', 'complete', 'withdrawn', 'paused', 'reopened'
  result?: string; // 'clear', 'consider'
  sub_result?: string; // 'clear', 'rejected', 'suspected', 'caution'
  created_at: string;
  href: string;
  report_ids: string[];
}

interface OnfidoReport {
  id: string;
  name: string; // 'document', 'facial_similarity_photo', 'facial_similarity_motion', etc.
  status: string;
  result?: string;
  sub_result?: string;
  breakdown?: Record<string, any>;
  properties?: {
    document_type?: string;
    issuing_country?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    document_number?: string;
    date_of_expiry?: string;
    gender?: string;
    nationality?: string;
    mrz_line1?: string;
    mrz_line2?: string;
  };
}

export class OnfidoProvider implements IIDVerificationProvider {
  public readonly name: VerificationProvider = 'onfido';
  private config: OnfidoConfig;

  constructor(config: OnfidoConfig) {
    this.config = config;
    logger.info('Onfido provider initialized', { baseUrl: config.base_url });
  }

  /**
   * Initiate an ID verification session with Onfido
   */
  async initiateVerification(request: InitiateIDVerificationRequest): Promise<InitiateIDVerificationResponse> {
    try {
      // Step 1: Create an applicant
      const applicant = await this.createApplicant(request.user_id);

      // Step 2: Generate SDK token for the applicant
      const sdkToken = await this.generateSdkToken(applicant.id);

      // Step 3: Create a workflow run (or use Onfido Studio link)
      const workflowRun = await this.createWorkflowRun(applicant.id, request);

      logger.info('Onfido verification initiated', {
        userId: request.user_id,
        applicantId: applicant.id,
        workflowRunId: workflowRun.id,
      });

      const expiresAt = new Date(workflowRun.link.expires_at);

      return {
        success: true,
        verification_id: workflowRun.id,
        provider: 'onfido',
        web_url: workflowRun.link.url,
        sdk_token: sdkToken.token,
        expires_at: expiresAt,
      };
    } catch (error: any) {
      logger.error('Onfido verification initiation failed', {
        userId: request.user_id,
        error: error.message,
        code: error.code,
      });

      return {
        success: false,
        provider: 'onfido',
        error: error.message || 'Failed to initiate verification',
        error_code: error.code || 'ONFIDO_INIT_ERROR',
      };
    }
  }

  /**
   * Process webhook callback from Onfido
   */
  async processWebhook(payload: Record<string, any>, headers: Record<string, string>): Promise<IDVerificationResult> {
    const webhookPayload = payload as OnfidoWebhookPayload;
    const resourceType = webhookPayload.payload.resource_type;
    const action = webhookPayload.payload.action;
    const object = webhookPayload.payload.object;

    logger.info('Processing Onfido webhook', {
      resourceType,
      action,
      objectId: object.id,
    });

    // Handle workflow_run.completed event
    if (resourceType === 'workflow_run' && action === 'workflow_run.completed') {
      return await this.processWorkflowRunCompleted(object.id);
    }

    // Handle check.completed event (for non-workflow verification)
    if (resourceType === 'check' && action === 'check.completed') {
      return await this.processCheckCompleted(object.id);
    }

    // Default: return pending status for other events
    return {
      verification_id: object.id,
      external_reference_id: object.applicant_id || '',
      provider: 'onfido',
      status: 'processing',
      document_check: 'not_performed',
      face_match: 'not_performed',
      document_type: 'passport',
      raw_response: payload,
    };
  }

  /**
   * Get verification status from Onfido
   */
  async getVerificationStatus(verificationId: string): Promise<IDVerificationResult> {
    try {
      // Try to get workflow run first
      try {
        const workflowRun = await this.makeApiRequest<OnfidoWorkflowRun>(
          'GET',
          `/v3.5/workflow_runs/${verificationId}`
        );

        return {
          verification_id: verificationId,
          external_reference_id: workflowRun.applicant_id,
          provider: 'onfido',
          status: this.mapWorkflowStatus(workflowRun.status),
          document_check: 'not_performed',
          face_match: 'not_performed',
          document_type: 'passport',
          raw_response: workflowRun,
        };
      } catch {
        // If not a workflow run, try as a check
        const check = await this.makeApiRequest<OnfidoCheck>(
          'GET',
          `/v3.5/checks/${verificationId}`
        );

        return {
          verification_id: verificationId,
          external_reference_id: check.applicant_id,
          provider: 'onfido',
          status: this.mapCheckStatus(check.status, check.result),
          document_check: this.mapResult(check.result),
          face_match: 'not_performed',
          document_type: 'passport',
          raw_response: check,
        };
      }
    } catch (error: any) {
      logger.error('Failed to get Onfido verification status', {
        verificationId,
        error: error.message,
      });

      throw new Error(`Failed to get verification status: ${error.message}`);
    }
  }

  /**
   * Validate Onfido webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    try {
      // Onfido uses HMAC-SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhook_token)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Onfido webhook signature validation failed', { error });
      return false;
    }
  }

  /**
   * Create an Onfido applicant
   */
  private async createApplicant(userId: string): Promise<OnfidoApplicant> {
    const payload = {
      // Onfido requires first_name and last_name
      // We'll use placeholder values that will be updated from the document
      first_name: 'Flamoral',
      last_name: 'User',
      // Store user reference in metadata or use as email identifier
    };

    return await this.makeApiRequest<OnfidoApplicant>('POST', '/v3.5/applicants', payload);
  }

  /**
   * Generate an SDK token for the applicant
   */
  private async generateSdkToken(applicantId: string): Promise<OnfidoSdkToken> {
    const payload = {
      applicant_id: applicantId,
      referrer: '*://*/*', // Allow all referrers for development; restrict in production
    };

    return await this.makeApiRequest<OnfidoSdkToken>('POST', '/v3.5/sdk_token', payload);
  }

  /**
   * Create a workflow run for the applicant
   */
  private async createWorkflowRun(
    applicantId: string,
    request: InitiateIDVerificationRequest
  ): Promise<OnfidoWorkflowRun> {
    const workflowId = this.config.workflow_id || 'flamoral_id_verification';

    const payload = {
      applicant_id: applicantId,
      workflow_id: workflowId,
      link: {
        // Onfido Studio hosted link configuration
        language: request.locale || 'en',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      },
      custom_data: {
        user_id: request.user_id,
        document_type: request.document_type,
        country_code: request.country_code,
      },
    };

    return await this.makeApiRequest<OnfidoWorkflowRun>('POST', '/v3.5/workflow_runs', payload);
  }

  /**
   * Process completed workflow run
   */
  private async processWorkflowRunCompleted(workflowRunId: string): Promise<IDVerificationResult> {
    // Get workflow run details
    const workflowRun = await this.makeApiRequest<any>(
      'GET',
      `/v3.5/workflow_runs/${workflowRunId}`
    );

    const status = this.mapWorkflowStatus(workflowRun.status);
    const output = workflowRun.output || {};

    return {
      verification_id: workflowRunId,
      external_reference_id: workflowRun.applicant_id,
      provider: 'onfido',
      status,
      document_check: this.mapResult(output.document_result),
      face_match: this.mapFaceResult(output.facial_similarity_result),
      document_type: this.mapOnfidoDocumentType(output.document_type),
      confidence_score: this.calculateOnfidoConfidenceScore(output),
      completed_at: workflowRun.completed_at_iso8601 ? new Date(workflowRun.completed_at_iso8601) : undefined,
      raw_response: workflowRun,
    };
  }

  /**
   * Process completed check
   */
  private async processCheckCompleted(checkId: string): Promise<IDVerificationResult> {
    // Get check details
    const check = await this.makeApiRequest<OnfidoCheck>('GET', `/v3.5/checks/${checkId}`);

    // Get reports for this check
    const reports: OnfidoReport[] = [];
    for (const reportId of check.report_ids) {
      const report = await this.makeApiRequest<OnfidoReport>('GET', `/v3.5/reports/${reportId}`);
      reports.push(report);
    }

    // Find document and facial similarity reports
    const documentReport = reports.find(r => r.name === 'document');
    const facialReport = reports.find(r =>
      r.name === 'facial_similarity_photo' || r.name === 'facial_similarity_motion'
    );

    // Extract document details
    const documentDetails: DocumentDetails | undefined = documentReport?.properties ? {
      document_number: documentReport.properties.document_number,
      issuing_country: documentReport.properties.issuing_country,
      expiry_date: documentReport.properties.date_of_expiry,
      mrz_line1: documentReport.properties.mrz_line1,
      mrz_line2: documentReport.properties.mrz_line2,
    } : undefined;

    // Extract personal data
    const extractedData: ExtractedIDData | undefined = documentReport?.properties ? {
      first_name: documentReport.properties.first_name,
      last_name: documentReport.properties.last_name,
      date_of_birth: documentReport.properties.date_of_birth,
      gender: documentReport.properties.gender,
      nationality: documentReport.properties.nationality,
    } : undefined;

    return {
      verification_id: checkId,
      external_reference_id: check.applicant_id,
      provider: 'onfido',
      status: this.mapCheckStatus(check.status, check.result),
      document_check: this.mapResult(documentReport?.result),
      face_match: this.mapFaceResult(facialReport?.result),
      document_type: this.mapOnfidoDocumentType(documentReport?.properties?.document_type),
      document_details: documentDetails,
      extracted_data: extractedData,
      confidence_score: this.calculateReportConfidenceScore(reports),
      decline_reasons: check.sub_result === 'rejected' ? [check.sub_result] : undefined,
      completed_at: new Date(),
      raw_response: { check, reports },
    };
  }

  /**
   * Make API request to Onfido
   */
  private async makeApiRequest<T>(
    method: string,
    path: string,
    body?: Record<string, any>
  ): Promise<T> {
    const url = `${this.config.base_url}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `Token token=${this.config.api_token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
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
          errorData = { error: { message: errorBody } };
        }

        const error = new Error(errorData.error?.message || `Onfido API error: ${response.status}`);
        (error as any).code = errorData.error?.type || `HTTP_${response.status}`;
        throw error;
      }

      return await response.json() as T;
    } catch (error: any) {
      if (error.code) {
        throw error;
      }
      throw new Error(`Onfido API request failed: ${error.message}`);
    }
  }

  /**
   * Map workflow status to our status
   */
  private mapWorkflowStatus(status: string): IDVerificationStatus {
    const mapping: Record<string, IDVerificationStatus> = {
      'processing': 'processing',
      'awaiting_input': 'pending',
      'approved': 'approved',
      'declined': 'declined',
      'review': 'processing',
      'abandoned': 'expired',
      'error': 'error',
    };
    return mapping[status] || 'processing';
  }

  /**
   * Map check status to our status
   */
  private mapCheckStatus(status: string, result?: string): IDVerificationStatus {
    if (status !== 'complete') {
      return 'processing';
    }
    if (result === 'clear') {
      return 'approved';
    }
    if (result === 'consider') {
      // Check sub_result for more details
      return 'processing'; // Will be handled by manual review
    }
    return 'declined';
  }

  /**
   * Map result to document check result
   */
  private mapResult(result?: string): DocumentCheckResult {
    if (!result) return 'not_performed';

    const mapping: Record<string, DocumentCheckResult> = {
      'clear': 'clear',
      'consider': 'consider',
      'unidentified': 'rejected',
    };
    return mapping[result] || 'consider';
  }

  /**
   * Map face result
   */
  private mapFaceResult(result?: string): FaceMatchResult {
    if (!result) return 'not_performed';

    const mapping: Record<string, FaceMatchResult> = {
      'clear': 'match',
      'consider': 'no_match',
    };
    return mapping[result] || 'error';
  }

  /**
   * Map Onfido document type to our format
   */
  private mapOnfidoDocumentType(onfidoType?: string): IDDocumentType {
    if (!onfidoType) return 'passport';

    const mapping: Record<string, IDDocumentType> = {
      'passport': 'passport',
      'driving_licence': 'drivers_license',
      'national_identity_card': 'national_id',
      'residence_permit': 'national_id',
      'visa': 'passport',
    };
    return mapping[onfidoType.toLowerCase()] || 'passport';
  }

  /**
   * Calculate confidence score from workflow output
   */
  private calculateOnfidoConfidenceScore(output: Record<string, any>): number {
    const results = [
      output.document_result,
      output.facial_similarity_result,
    ].filter(Boolean);

    if (results.length === 0) return 0;

    const clearCount = results.filter(r => r === 'clear').length;
    return clearCount / results.length;
  }

  /**
   * Calculate confidence score from reports
   */
  private calculateReportConfidenceScore(reports: OnfidoReport[]): number {
    const completedReports = reports.filter(r => r.status === 'complete' && r.result);

    if (completedReports.length === 0) return 0;

    const clearCount = completedReports.filter(r => r.result === 'clear').length;
    return clearCount / completedReports.length;
  }
}
