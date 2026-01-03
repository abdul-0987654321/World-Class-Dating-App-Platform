/**
 * Mock ID Verification Provider
 * Flamoral Dating Platform
 *
 * Mock provider for development and testing purposes.
 * Simulates the behavior of real ID verification providers without making external API calls.
 */

import { v4 as uuidv4 } from 'uuid';
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
  MockProviderConfig,
  IDDocumentType,
  DocumentDetails,
  ExtractedIDData,
} from '../../types/id-verification-provider.types';

// In-memory storage for mock verifications
const mockVerifications = new Map<string, MockVerificationData>();

interface MockVerificationData {
  verification_id: string;
  user_id: string;
  document_type: IDDocumentType;
  country_code: string;
  status: IDVerificationStatus;
  created_at: Date;
  expires_at: Date;
  completed_at?: Date;
  result?: IDVerificationResult;
}

export class MockProvider implements IIDVerificationProvider {
  public readonly name: VerificationProvider = 'mock';
  private config: MockProviderConfig;

  constructor(config: MockProviderConfig) {
    this.config = config;
    logger.info('Mock ID verification provider initialized', {
      defaultResult: config.default_result,
      processingDelayMs: config.processing_delay_ms,
      simulateErrors: config.simulate_errors,
    });
  }

  /**
   * Initiate a mock ID verification session
   */
  async initiateVerification(request: InitiateIDVerificationRequest): Promise<InitiateIDVerificationResponse> {
    // Simulate error if configured
    if (this.config.simulate_errors && Math.random() < 0.1) {
      logger.warn('Mock provider simulating error');
      return {
        success: false,
        provider: 'mock',
        error: 'Simulated provider error',
        error_code: 'MOCK_SIMULATED_ERROR',
      };
    }

    const verificationId = `mock_${uuidv4()}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store mock verification data
    const mockData: MockVerificationData = {
      verification_id: verificationId,
      user_id: request.user_id,
      document_type: request.document_type,
      country_code: request.country_code,
      status: 'pending',
      created_at: new Date(),
      expires_at: expiresAt,
    };

    mockVerifications.set(verificationId, mockData);

    // Schedule auto-completion if processing delay is set
    if (this.config.processing_delay_ms > 0) {
      this.scheduleAutoCompletion(verificationId);
    }

    logger.info('Mock verification initiated', {
      verificationId,
      userId: request.user_id,
      documentType: request.document_type,
    });

    return {
      success: true,
      verification_id: verificationId,
      provider: 'mock',
      web_url: `http://localhost:3000/mock-verification/${verificationId}`,
      sdk_token: `mock_sdk_token_${verificationId}`,
      expires_at: expiresAt,
    };
  }

  /**
   * Process mock webhook callback
   */
  async processWebhook(payload: Record<string, any>, headers: Record<string, string>): Promise<IDVerificationResult> {
    const verificationId = payload.verification_id;
    const action = payload.action; // 'approve', 'decline', 'error'

    logger.info('Processing mock webhook', { verificationId, action });

    const mockData = mockVerifications.get(verificationId);
    if (!mockData) {
      throw new Error(`Mock verification not found: ${verificationId}`);
    }

    let status: IDVerificationStatus;
    let documentCheck: DocumentCheckResult = 'clear';
    let faceMatch: FaceMatchResult = 'match';
    let declineReasons: string[] | undefined;

    switch (action) {
      case 'approve':
        status = 'approved';
        break;
      case 'decline':
        status = 'declined';
        documentCheck = 'rejected';
        faceMatch = 'no_match';
        declineReasons = ['Mock decline reason'];
        break;
      case 'error':
        status = 'error';
        documentCheck = 'not_performed';
        faceMatch = 'error';
        break;
      default:
        status = this.config.default_result;
    }

    const result = this.generateMockResult(mockData, status, documentCheck, faceMatch, declineReasons);

    // Update stored data
    mockData.status = status;
    mockData.completed_at = new Date();
    mockData.result = result;
    mockVerifications.set(verificationId, mockData);

    return result;
  }

  /**
   * Get mock verification status
   */
  async getVerificationStatus(verificationId: string): Promise<IDVerificationResult> {
    const mockData = mockVerifications.get(verificationId);

    if (!mockData) {
      throw new Error(`Mock verification not found: ${verificationId}`);
    }

    if (mockData.result) {
      return mockData.result;
    }

    // Return current status
    return {
      verification_id: verificationId,
      external_reference_id: `mock_ext_${verificationId}`,
      provider: 'mock',
      status: mockData.status,
      document_check: 'not_performed',
      face_match: 'not_performed',
      document_type: mockData.document_type,
    };
  }

  /**
   * Validate mock webhook signature (always returns true in mock)
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    // Mock provider accepts any signature for testing
    // In real tests, you can use 'mock_signature' as the expected signature
    return signature === 'mock_signature' || true;
  }

  /**
   * Complete a mock verification manually (for testing)
   */
  async completeVerification(
    verificationId: string,
    status: IDVerificationStatus = 'approved'
  ): Promise<IDVerificationResult> {
    const mockData = mockVerifications.get(verificationId);
    if (!mockData) {
      throw new Error(`Mock verification not found: ${verificationId}`);
    }

    const documentCheck: DocumentCheckResult = status === 'approved' ? 'clear' : 'rejected';
    const faceMatch: FaceMatchResult = status === 'approved' ? 'match' : 'no_match';
    const declineReasons = status === 'declined' ? ['Manual mock decline'] : undefined;

    const result = this.generateMockResult(mockData, status, documentCheck, faceMatch, declineReasons);

    mockData.status = status;
    mockData.completed_at = new Date();
    mockData.result = result;
    mockVerifications.set(verificationId, mockData);

    logger.info('Mock verification completed', { verificationId, status });

    return result;
  }

  /**
   * Schedule auto-completion of verification
   */
  private scheduleAutoCompletion(verificationId: string): void {
    setTimeout(async () => {
      try {
        const mockData = mockVerifications.get(verificationId);
        if (mockData && mockData.status === 'pending') {
          await this.completeVerification(verificationId, this.config.default_result);
        }
      } catch (error) {
        logger.error('Mock auto-completion failed', { verificationId, error });
      }
    }, this.config.processing_delay_ms);
  }

  /**
   * Generate a complete mock result
   */
  private generateMockResult(
    mockData: MockVerificationData,
    status: IDVerificationStatus,
    documentCheck: DocumentCheckResult,
    faceMatch: FaceMatchResult,
    declineReasons?: string[]
  ): IDVerificationResult {
    const isApproved = status === 'approved';

    // Generate mock document details
    const documentDetails: DocumentDetails = {
      document_number: `MOCK${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
      issuing_country: mockData.country_code,
      issue_date: '2020-01-15',
      expiry_date: '2030-01-15',
      mrz_line1: 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
      mrz_line2: 'MOCK12345<6USA8001014M3001015<<<<<<<<<<<<<<8',
    };

    // Generate mock extracted data
    const extractedData: ExtractedIDData = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1990-05-20',
      gender: 'M',
      nationality: mockData.country_code,
      address: {
        line1: '123 Mock Street',
        city: 'Mock City',
        state: 'MC',
        postal_code: '12345',
        country: mockData.country_code,
      },
    };

    return {
      verification_id: mockData.verification_id,
      external_reference_id: `mock_ext_${mockData.verification_id}`,
      provider: 'mock',
      status,
      document_check: documentCheck,
      face_match: faceMatch,
      document_type: mockData.document_type,
      document_details: isApproved ? documentDetails : undefined,
      extracted_data: isApproved ? extractedData : undefined,
      confidence_score: isApproved ? 0.95 : 0.3,
      decline_reasons: declineReasons,
      warnings: isApproved ? undefined : ['Mock warning'],
      completed_at: new Date(),
      raw_response: {
        mock: true,
        verification_id: mockData.verification_id,
        status,
      },
    };
  }

  /**
   * Clear all mock verifications (for testing cleanup)
   */
  static clearAllMockVerifications(): void {
    mockVerifications.clear();
    logger.info('All mock verifications cleared');
  }

  /**
   * Get all mock verifications (for testing inspection)
   */
  static getAllMockVerifications(): Map<string, MockVerificationData> {
    return new Map(mockVerifications);
  }

  /**
   * Get mock verification by ID (for testing)
   */
  static getMockVerification(verificationId: string): MockVerificationData | undefined {
    return mockVerifications.get(verificationId);
  }
}
