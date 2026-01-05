import { v4 as uuidv4 } from 'uuid';

import db from '../infrastructure/database/connection';
import {
  VerificationType,
  VerificationStatus,
  VerificationRequest,
  VerificationArtifact,
  VerificationResult,
  StartVerificationRequest,
  StartVerificationResponse,
  UploadArtifactResponse,
  VerificationStatusResponse,
  ArtifactSummary,
  VerificationResultSummary,
  VALID_STATUS_TRANSITIONS,
  VERIFICATION_TYPE_CONFIGS,
  BIOMETRIC_CONSENT_REQUIRED_STATES,
  BiometricConsentRegion,
  VerificationReasonCode,
  ArtifactProcessingStatus,
  VerificationDecision,
} from '../types/verification.types';
import logger from '../utils/logger';

/**
 * Identity Verification Service
 * Implements complete verification flow with state machine, biometric consent handling,
 * and support for multiple verification types (email, phone, id, selfie, liveness, video, biometric)
 */
export class IdentityVerificationService {
  /**
   * Start a new verification flow for a user
   */
  async startVerification(
    userId: string,
    request: StartVerificationRequest,
    clientIp?: string
  ): Promise<StartVerificationResponse> {
    const { type, region_policy_key, biometric_consent, metadata } = request;

    try {
      // Validate verification type
      const config = VERIFICATION_TYPE_CONFIGS[type];
      if (!config) {
        return {
          success: false,
          error: `Invalid verification type: ${type}`,
        };
      }

      // Check for existing active verification of same type
      const existingRequest = await db('verification_requests')
        .where({
          user_id: userId,
          type: type,
        })
        .whereIn('status', ['not_started', 'pending', 'in_review'])
        .first();

      if (existingRequest) {
        // Return existing request instead of creating new one
        return {
          success: true,
          request_id: existingRequest.request_id,
          status: existingRequest.status,
          biometric_consent_required: this.isBiometricConsentRequired(type, region_policy_key),
          message: 'Existing verification request found',
        };
      }

      // Check if biometric consent is required
      const biometricConsentRequired = this.isBiometricConsentRequired(type, region_policy_key);

      // If biometric consent is required but not provided, return error
      if (biometricConsentRequired && !biometric_consent) {
        return {
          success: false,
          biometric_consent_required: true,
          error: 'Biometric consent is required for this verification type in your region',
        };
      }

      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.expires_after_hours);

      // Create new verification request
      const requestId = uuidv4();
      const now = new Date();

      await db('verification_requests').insert({
        request_id: requestId,
        user_id: userId,
        type: type,
        status: 'not_started',
        region_policy_key: region_policy_key || null,
        biometric_consent_given: biometricConsentRequired ? biometric_consent : false,
        biometric_consent_at: biometricConsentRequired && biometric_consent ? now : null,
        biometric_consent_ip: biometricConsentRequired && biometric_consent ? clientIp : null,
        retry_count: 0,
        max_retries: config.max_retries,
        expires_at: expiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null,
        external_reference_id: null,
        submitted_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      });

      logger.info(`Started verification request ${requestId} for user ${userId}`, {
        type,
        region_policy_key,
        biometric_consent_required: biometricConsentRequired,
      });

      return {
        success: true,
        request_id: requestId,
        status: 'not_started',
        biometric_consent_required: biometricConsentRequired,
        message: 'Verification request created successfully',
      };
    } catch (error: any) {
      logger.error('Failed to start verification', {
        userId,
        type,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to start verification. Please try again.',
      };
    }
  }

  /**
   * Upload an artifact for a verification request
   */
  async uploadArtifact(
    userId: string,
    requestId: string,
    artifactType: string,
    fileUrl: string,
    fileHash: string,
    fileSize: number,
    mimeType: string,
    mediaId?: string
  ): Promise<UploadArtifactResponse> {
    try {
      // Verify the request belongs to the user and is in valid state
      const request = await db('verification_requests')
        .where({
          request_id: requestId,
          user_id: userId,
        })
        .first();

      if (!request) {
        return {
          success: false,
          error: 'Verification request not found',
        };
      }

      // Check if request is expired
      if (request.expires_at && new Date(request.expires_at) < new Date()) {
        await this.transitionStatus(requestId, 'expired');
        return {
          success: false,
          error: 'Verification request has expired. Please start a new verification.',
        };
      }

      // Check if request can accept artifacts
      if (!['not_started', 'pending'].includes(request.status)) {
        return {
          success: false,
          error: `Cannot upload artifacts when verification is in ${request.status} status`,
        };
      }

      // Create artifact record
      const artifactId = uuidv4();
      const now = new Date();

      await db('verification_artifacts').insert({
        artifact_id: artifactId,
        request_id: requestId,
        media_id: mediaId || null,
        type: artifactType,
        file_url: fileUrl,
        file_hash: fileHash,
        file_size: fileSize,
        mime_type: mimeType,
        processing_status: 'pending',
        processing_error: null,
        processed_at: null,
        analysis_result: null,
        confidence_score: null,
        created_at: now,
      });

      // Transition to pending if this is the first artifact
      if (request.status === 'not_started') {
        await this.transitionStatus(requestId, 'pending');
      }

      logger.info(`Uploaded artifact ${artifactId} for request ${requestId}`, {
        type: artifactType,
        fileSize,
      });

      return {
        success: true,
        artifact_id: artifactId,
        message: 'Artifact uploaded successfully',
      };
    } catch (error: any) {
      logger.error('Failed to upload artifact', {
        requestId,
        artifactType,
        error: error.message,
      });

      return {
        success: false,
        error: 'Failed to upload artifact. Please try again.',
      };
    }
  }

  /**
   * Get verification status for a user
   */
  async getStatus(userId: string, type?: VerificationType): Promise<VerificationStatusResponse[]> {
    try {
      let query = db('verification_requests')
        .where({ user_id: userId })
        .orderBy('created_at', 'desc');

      if (type) {
        query = query.where({ type });
      }

      const requests = await query;

      const responses: VerificationStatusResponse[] = [];

      for (const request of requests) {
        // Get artifacts
        const artifacts = await db('verification_artifacts')
          .where({ request_id: request.request_id })
          .orderBy('created_at', 'asc');

        const artifactSummaries: ArtifactSummary[] = artifacts.map((a: any) => ({
          artifact_id: a.artifact_id,
          type: a.type,
          processing_status: a.processing_status,
          created_at: a.created_at,
        }));

        // Get result if exists
        const result = await db('verification_results')
          .where({ request_id: request.request_id })
          .orderBy('decided_at', 'desc')
          .first();

        const resultSummary: VerificationResultSummary | null = result
          ? {
              decision: result.decision,
              reason_code: result.reason_code,
              decided_at: result.decided_at,
            }
          : null;

        const biometricConsentRequired = this.isBiometricConsentRequired(
          request.type,
          request.region_policy_key
        );

        responses.push({
          request_id: request.request_id,
          type: request.type,
          status: request.status,
          biometric_consent_required: biometricConsentRequired,
          biometric_consent_given: request.biometric_consent_given,
          retry_count: request.retry_count,
          max_retries: request.max_retries,
          expires_at: request.expires_at,
          created_at: request.created_at,
          submitted_at: request.submitted_at,
          completed_at: request.completed_at,
          artifacts: artifactSummaries,
          result: resultSummary,
        });
      }

      return responses;
    } catch (error: any) {
      logger.error('Failed to get verification status', {
        userId,
        type,
        error: error.message,
      });

      throw new Error('Failed to get verification status');
    }
  }

  /**
   * Submit verification for review (called when all artifacts are uploaded)
   */
  async submitForReview(
    userId: string,
    requestId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const request = await db('verification_requests')
        .where({
          request_id: requestId,
          user_id: userId,
        })
        .first();

      if (!request) {
        return { success: false, error: 'Verification request not found' };
      }

      if (request.status !== 'pending') {
        return {
          success: false,
          error: `Cannot submit for review when status is ${request.status}`,
        };
      }

      // Check if all required artifacts are uploaded
      const config = VERIFICATION_TYPE_CONFIGS[request.type as VerificationType];
      const artifacts = await db('verification_artifacts')
        .where({ request_id: requestId })
        .select('type');

      const uploadedTypes = new Set(artifacts.map((a: any) => a.type));
      const missingArtifacts = config.required_artifacts.filter(
        (required) => !uploadedTypes.has(required)
      );

      if (missingArtifacts.length > 0) {
        return {
          success: false,
          error: `Missing required artifacts: ${missingArtifacts.join(', ')}`,
        };
      }

      // Transition to in_review
      await this.transitionStatus(requestId, 'in_review');
      await db('verification_requests')
        .where({ request_id: requestId })
        .update({ submitted_at: new Date(), updated_at: new Date() });

      logger.info(`Submitted verification request ${requestId} for review`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to submit for review', {
        requestId,
        error: error.message,
      });

      return { success: false, error: 'Failed to submit for review' };
    }
  }

  /**
   * Process a verification request (called by worker)
   */
  async processVerification(requestId: string): Promise<{
    success: boolean;
    decision?: VerificationDecision;
    error?: string;
  }> {
    const trx = await db.transaction();

    try {
      // Lock the request for processing
      const request = await trx('verification_requests')
        .where({ request_id: requestId })
        .forUpdate()
        .first();

      if (!request) {
        await trx.rollback();
        return { success: false, error: 'Verification request not found' };
      }

      if (request.status !== 'in_review') {
        await trx.rollback();
        return {
          success: false,
          error: `Cannot process verification in ${request.status} status`,
        };
      }

      // Get all artifacts
      const artifacts = await trx('verification_artifacts').where({ request_id: requestId });

      // Process each artifact
      const allProcessed = true;
      let lowestConfidence = 1.0;
      let hasProcessingError = false;

      for (const artifact of artifacts) {
        if (artifact.processing_status === 'pending') {
          // Process the artifact (in a real implementation, this would call external AI services)
          const processingResult = await this.processArtifact(artifact, trx);

          if (!processingResult.success) {
            hasProcessingError = true;
          }

          if (processingResult.confidence !== undefined) {
            lowestConfidence = Math.min(lowestConfidence, processingResult.confidence);
          }
        } else if (artifact.processing_status === 'failed') {
          hasProcessingError = true;
        } else if (artifact.confidence_score !== null) {
          lowestConfidence = Math.min(lowestConfidence, artifact.confidence_score);
        }
      }

      // Determine decision based on processing results
      let decision: VerificationDecision;
      let reasonCode: string;

      const config = VERIFICATION_TYPE_CONFIGS[request.type as VerificationType];

      if (hasProcessingError) {
        decision = 'inconclusive';
        reasonCode = VerificationReasonCode.PROCESSING_ERROR;
      } else if (
        config.auto_approve_threshold &&
        lowestConfidence >= config.auto_approve_threshold
      ) {
        decision = 'approved';
        reasonCode = VerificationReasonCode.IDENTITY_CONFIRMED;
      } else if (lowestConfidence < 0.5) {
        decision = 'denied';
        reasonCode = VerificationReasonCode.LOW_CONFIDENCE;
      } else {
        decision = 'needs_review';
        reasonCode = VerificationReasonCode.MANUAL_REVIEW_REQUIRED;
      }

      // Create result record
      const resultId = uuidv4();
      await trx('verification_results').insert({
        result_id: resultId,
        request_id: requestId,
        decision: decision,
        reason_code: reasonCode,
        details: JSON.stringify({
          confidence_score: lowestConfidence,
          artifacts_processed: artifacts.length,
        }),
        confidence_score: lowestConfidence,
        decided_at: new Date(),
      });

      // Update request status based on decision
      let newStatus: VerificationStatus;
      if (decision === 'approved') {
        newStatus = 'approved';
      } else if (decision === 'denied') {
        newStatus = 'denied';
      } else {
        // needs_review or inconclusive stays in in_review for manual processing
        newStatus = 'in_review';
      }

      await trx('verification_requests')
        .where({ request_id: requestId })
        .update({
          status: newStatus,
          completed_at: ['approved', 'denied'].includes(newStatus) ? new Date() : null,
          updated_at: new Date(),
        });

      // If approved, update user's verification status
      if (decision === 'approved') {
        await this.updateUserVerificationStatus(request.user_id, request.type, trx);
      }

      await trx.commit();

      logger.info(`Processed verification request ${requestId}`, {
        decision,
        reasonCode,
        confidence: lowestConfidence,
      });

      return { success: true, decision };
    } catch (error: any) {
      await trx.rollback();
      logger.error('Failed to process verification', {
        requestId,
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Process a single artifact
   */
  private async processArtifact(
    artifact: any,
    trx: any
  ): Promise<{ success: boolean; confidence?: number }> {
    try {
      // Update status to processing
      await trx('verification_artifacts')
        .where({ artifact_id: artifact.artifact_id })
        .update({ processing_status: 'processing' });

      // In a real implementation, this would:
      // 1. Call Azure Cognitive Services or similar for document/face analysis
      // 2. Call liveness detection API for liveness checks
      // 3. Run OCR for document text extraction
      // 4. Perform face matching between selfie and ID photo

      // For now, simulate processing with a random confidence score
      const confidence = 0.7 + Math.random() * 0.25; // 0.70 to 0.95

      await trx('verification_artifacts')
        .where({ artifact_id: artifact.artifact_id })
        .update({
          processing_status: 'completed',
          processed_at: new Date(),
          confidence_score: confidence,
          analysis_result: JSON.stringify({
            processed_at: new Date().toISOString(),
            confidence: confidence,
            // In real implementation, would include OCR results, face match details, etc.
          }),
        });

      return { success: true, confidence };
    } catch (error: any) {
      await trx('verification_artifacts').where({ artifact_id: artifact.artifact_id }).update({
        processing_status: 'failed',
        processing_error: error.message,
      });

      return { success: false };
    }
  }

  /**
   * Update user's verification status after successful verification
   */
  private async updateUserVerificationStatus(
    userId: string,
    verificationType: VerificationType,
    trx: any
  ): Promise<void> {
    // Determine which field to update based on verification type
    const updateFields: Record<string, any> = {
      updated_at: new Date(),
    };

    switch (verificationType) {
      case 'email':
        updateFields.is_email_verified = true;
        break;
      case 'phone':
        updateFields.is_phone_verified = true;
        break;
      case 'id':
      case 'selfie':
      case 'liveness':
      case 'video':
      case 'biometric':
        updateFields.is_verified = true;
        updateFields.verified_at = new Date();
        break;
    }

    await trx('users').where({ id: userId }).update(updateFields);

    logger.info(`Updated verification status for user ${userId}`, {
      verificationType,
      fields: Object.keys(updateFields),
    });
  }

  /**
   * Transition verification request status
   */
  private async transitionStatus(
    requestId: string,
    newStatus: VerificationStatus,
    trx?: any
  ): Promise<boolean> {
    const conn = trx || db;

    const request = await conn('verification_requests').where({ request_id: requestId }).first();

    if (!request) {
      return false;
    }

    const currentStatus = request.status as VerificationStatus;
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

    if (!validTransitions.includes(newStatus)) {
      logger.warn(`Invalid status transition attempted`, {
        requestId,
        from: currentStatus,
        to: newStatus,
        validTransitions,
      });
      return false;
    }

    await conn('verification_requests').where({ request_id: requestId }).update({
      status: newStatus,
      updated_at: new Date(),
    });

    logger.info(`Transitioned verification status`, {
      requestId,
      from: currentStatus,
      to: newStatus,
    });

    return true;
  }

  /**
   * Check if biometric consent is required based on verification type and region
   */
  private isBiometricConsentRequired(
    type: VerificationType,
    regionPolicyKey?: string | null
  ): boolean {
    const config = VERIFICATION_TYPE_CONFIGS[type];

    // If the verification type doesn't require biometric consent at all, return false
    if (!config.requires_biometric_consent) {
      return false;
    }

    // If no region is specified, we still require consent to be safe
    if (!regionPolicyKey) {
      return true;
    }

    // Check if the region is one of the biometric consent required states
    return BIOMETRIC_CONSENT_REQUIRED_STATES.includes(regionPolicyKey as BiometricConsentRegion);
  }

  /**
   * Expire old verification requests
   */
  async expireOldRequests(): Promise<number> {
    try {
      const now = new Date();

      const result = await db('verification_requests')
        .whereIn('status', ['not_started', 'pending'])
        .where('expires_at', '<', now)
        .update({
          status: 'expired',
          updated_at: now,
        });

      if (result > 0) {
        logger.info(`Expired ${result} verification requests`);
      }

      return result;
    } catch (error: any) {
      logger.error('Failed to expire old requests', { error: error.message });
      return 0;
    }
  }

  /**
   * Retry a denied or expired verification
   */
  async retryVerification(
    userId: string,
    requestId: string,
    clientIp?: string
  ): Promise<StartVerificationResponse> {
    try {
      const request = await db('verification_requests')
        .where({
          request_id: requestId,
          user_id: userId,
        })
        .first();

      if (!request) {
        return { success: false, error: 'Verification request not found' };
      }

      if (!['denied', 'expired'].includes(request.status)) {
        return { success: false, error: 'Can only retry denied or expired verifications' };
      }

      if (request.retry_count >= request.max_retries) {
        return { success: false, error: 'Maximum retries exceeded' };
      }

      // Create a new verification request with incremented retry count
      const config = VERIFICATION_TYPE_CONFIGS[request.type as VerificationType];
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + config.expires_after_hours);

      const newRequestId = uuidv4();
      const now = new Date();

      await db('verification_requests').insert({
        request_id: newRequestId,
        user_id: userId,
        type: request.type,
        status: 'not_started',
        region_policy_key: request.region_policy_key,
        biometric_consent_given: request.biometric_consent_given,
        biometric_consent_at: request.biometric_consent_at,
        biometric_consent_ip: request.biometric_consent_ip,
        retry_count: request.retry_count + 1,
        max_retries: request.max_retries,
        expires_at: expiresAt,
        metadata: request.metadata,
        external_reference_id: null,
        submitted_at: null,
        completed_at: null,
        created_at: now,
        updated_at: now,
      });

      logger.info(`Created retry verification request ${newRequestId} for original ${requestId}`, {
        retryCount: request.retry_count + 1,
      });

      return {
        success: true,
        request_id: newRequestId,
        status: 'not_started',
        message: 'Retry verification request created successfully',
      };
    } catch (error: any) {
      logger.error('Failed to retry verification', {
        requestId,
        error: error.message,
      });

      return { success: false, error: 'Failed to retry verification' };
    }
  }

  /**
   * Admin: Manually approve a verification
   */
  async adminApprove(
    requestId: string,
    adminUserId: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const trx = await db.transaction();

    try {
      const request = await trx('verification_requests')
        .where({ request_id: requestId })
        .forUpdate()
        .first();

      if (!request) {
        await trx.rollback();
        return { success: false, error: 'Verification request not found' };
      }

      if (!['pending', 'in_review'].includes(request.status)) {
        await trx.rollback();
        return { success: false, error: `Cannot approve verification in ${request.status} status` };
      }

      // Create result record
      const resultId = uuidv4();
      await trx('verification_results').insert({
        result_id: resultId,
        request_id: requestId,
        decision: 'approved',
        reason_code: 'manual_approval',
        details: JSON.stringify({
          approved_by: adminUserId,
          notes: notes,
        }),
        confidence_score: 1.0,
        decided_at: new Date(),
      });

      // Update request status
      await trx('verification_requests').where({ request_id: requestId }).update({
        status: 'approved',
        completed_at: new Date(),
        updated_at: new Date(),
      });

      // Update user verification status
      await this.updateUserVerificationStatus(request.user_id, request.type, trx);

      await trx.commit();

      logger.info(`Admin ${adminUserId} approved verification ${requestId}`);

      return { success: true };
    } catch (error: any) {
      await trx.rollback();
      logger.error('Failed to admin approve verification', {
        requestId,
        error: error.message,
      });

      return { success: false, error: 'Failed to approve verification' };
    }
  }

  /**
   * Admin: Manually deny a verification
   */
  async adminDeny(
    requestId: string,
    adminUserId: string,
    reasonCode: string,
    notes?: string
  ): Promise<{ success: boolean; error?: string }> {
    const trx = await db.transaction();

    try {
      const request = await trx('verification_requests')
        .where({ request_id: requestId })
        .forUpdate()
        .first();

      if (!request) {
        await trx.rollback();
        return { success: false, error: 'Verification request not found' };
      }

      if (!['pending', 'in_review'].includes(request.status)) {
        await trx.rollback();
        return { success: false, error: `Cannot deny verification in ${request.status} status` };
      }

      // Create result record
      const resultId = uuidv4();
      await trx('verification_results').insert({
        result_id: resultId,
        request_id: requestId,
        decision: 'denied',
        reason_code: reasonCode,
        details: JSON.stringify({
          denied_by: adminUserId,
          notes: notes,
        }),
        confidence_score: null,
        decided_at: new Date(),
      });

      // Update request status
      await trx('verification_requests').where({ request_id: requestId }).update({
        status: 'denied',
        completed_at: new Date(),
        updated_at: new Date(),
      });

      await trx.commit();

      logger.info(`Admin ${adminUserId} denied verification ${requestId}`, { reasonCode });

      return { success: true };
    } catch (error: any) {
      await trx.rollback();
      logger.error('Failed to admin deny verification', {
        requestId,
        error: error.message,
      });

      return { success: false, error: 'Failed to deny verification' };
    }
  }

  /**
   * Get pending verifications for admin review
   */
  async getPendingVerifications(
    limit: number = 20,
    offset: number = 0,
    type?: VerificationType
  ): Promise<{
    verifications: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      let query = db('verification_requests')
        .where({ status: 'in_review' })
        .leftJoin('users', 'verification_requests.user_id', 'users.id')
        .select('verification_requests.*', 'users.email', 'users.first_name', 'users.last_name')
        .orderBy('verification_requests.submitted_at', 'asc');

      if (type) {
        query = query.where('verification_requests.type', type);
      }

      const verifications = await query.limit(limit).offset(offset);

      // Get total count
      let countQuery = db('verification_requests')
        .where({ status: 'in_review' })
        .count('* as count');

      if (type) {
        countQuery = countQuery.where({ type });
      }

      const countResult = await countQuery.first();
      const total = Number(countResult?.count || 0);

      return {
        verifications,
        total,
        hasMore: total > offset + limit,
      };
    } catch (error: any) {
      logger.error('Failed to get pending verifications', { error: error.message });
      throw new Error('Failed to get pending verifications');
    }
  }
}

export const identityVerificationService = new IdentityVerificationService();

// Re-export the ID verification service for direct access
export { idVerificationService } from './id-verification.service';
