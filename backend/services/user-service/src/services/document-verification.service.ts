/**
 * Document Verification Service
 * Flamoral Dating Platform
 *
 * Complete OCR-based document verification service with:
 * - AWS Textract integration for document OCR
 * - Text extraction from ID documents (passport, driver's license, national ID)
 * - Field parsing and validation
 * - Document authenticity checking
 * - Profile matching with user data
 * - Verification confidence scoring
 * - GDPR-compliant data handling
 * - Comprehensive audit logging
 */

import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import db from '../infrastructure/database/connection';
import logger from '../utils/logger';
import config from '../config';
import { textractOCRService } from './textract-ocr.service';
import {
  DocumentType,
  DocumentVerificationStatus,
  ExtractedDocumentData,
  DocumentDataResult,
  DocumentValidationResult,
  AuthenticityResult,
  AuthenticityCheck,
  SecurityFeatureCheck,
  FormatConsistencyCheck,
  ProfileMatchResultComplete,
  ProfileMatchDetails,
  ProfileMatchResult,
  UserProfile,
  DocumentVerificationResult,
  DocumentVerificationRequest,
  DocumentVerificationResponse,
  DocumentVerificationRecord,
  AuditLogEntry,
  VerificationThresholds,
  DEFAULT_VERIFICATION_THRESHOLDS,
  DATA_RETENTION_PERIODS,
  getConfidenceLevel,
  MRZValidation,
} from '../types/document-verification.types';

/**
 * Document Verification Service
 * Provides complete document verification with OCR, validation, and profile matching.
 */
export class DocumentVerificationService {
  private thresholds: VerificationThresholds;
  private encryptionKey: string;

  constructor() {
    this.thresholds = this.loadThresholds();
    this.encryptionKey = process.env.DOCUMENT_ENCRYPTION_KEY ||
      process.env.JWT_ACCESS_SECRET ||
      'default-encryption-key-change-in-production';

    logger.info('Document Verification Service initialized');
  }

  /**
   * Load verification thresholds from config or use defaults
   */
  private loadThresholds(): VerificationThresholds {
    return {
      ...DEFAULT_VERIFICATION_THRESHOLDS,
      minimumExtractionConfidence: parseFloat(process.env.DOC_MIN_EXTRACTION_CONFIDENCE || '0.7'),
      minimumProfileMatchScore: parseFloat(process.env.DOC_MIN_PROFILE_MATCH || '0.8'),
      autoApproveThreshold: parseFloat(process.env.DOC_AUTO_APPROVE_THRESHOLD || '0.95'),
      autoRejectThreshold: parseFloat(process.env.DOC_AUTO_REJECT_THRESHOLD || '0.4'),
    };
  }

  /**
   * Main entry point: Verify a document
   */
  async verifyDocument(request: DocumentVerificationRequest): Promise<DocumentVerificationResponse> {
    const verificationId = uuidv4();
    const startTime = Date.now();
    const auditLog: AuditLogEntry[] = [];

    try {
      // Log verification start
      this.addAuditEntry(auditLog, 'VERIFICATION_STARTED', 'system',
        `Document verification initiated for user ${request.userId}`);

      // Validate consent
      if (!request.consentGiven) {
        return {
          success: false,
          error: 'User consent is required for document verification',
          errorCode: 'CONSENT_REQUIRED',
        };
      }

      // Create initial database record
      await this.createVerificationRecord(verificationId, request, auditLog);

      // Step 1: Extract document data using OCR
      this.addAuditEntry(auditLog, 'OCR_EXTRACTION_STARTED', 'system',
        `Starting OCR extraction for ${request.documentType}`);

      const extractionResult = await this.extractDocumentData(
        request.documentFront,
        request.documentBack,
        request.documentType
      );

      if (!extractionResult.success) {
        await this.updateVerificationFailed(verificationId, 'extraction_failed',
          extractionResult.errors?.join(', ') || 'OCR extraction failed', auditLog);

        return {
          success: false,
          verificationId,
          status: 'failed',
          error: 'Failed to extract document data',
          errorCode: 'EXTRACTION_FAILED',
        };
      }

      this.addAuditEntry(auditLog, 'OCR_EXTRACTION_COMPLETED', 'system',
        `Extracted ${extractionResult.fields.length} fields with ${(extractionResult.overallConfidence * 100).toFixed(1)}% confidence`,
        extractionResult.fields.map(f => f.fieldName));

      // Step 2: Validate document authenticity
      this.addAuditEntry(auditLog, 'VALIDATION_STARTED', 'system',
        'Starting document authenticity validation');

      const validationResult = await this.validateDocument(
        extractionResult.data!,
        request.documentType,
        request.countryCode
      );

      this.addAuditEntry(auditLog, 'VALIDATION_COMPLETED', 'system',
        `Validation completed: ${validationResult.authenticityResult} with ${validationResult.checks.length} checks`);

      // Step 3: Match with user profile
      this.addAuditEntry(auditLog, 'PROFILE_MATCHING_STARTED', 'system',
        'Starting profile matching');

      const userProfile = await this.getUserProfile(request.userId);
      const matchResult = await this.matchWithProfile(extractionResult.data!, userProfile);

      this.addAuditEntry(auditLog, 'PROFILE_MATCHING_COMPLETED', 'system',
        `Profile matching completed: ${matchResult.overallResult} with score ${(matchResult.verificationScore * 100).toFixed(1)}%`);

      // Step 4: Calculate final verification score and make decision
      const finalScore = this.calculateVerificationScore(
        extractionResult.overallConfidence,
        validationResult,
        matchResult
      );

      const decision = this.makeVerificationDecision(finalScore, validationResult, matchResult);

      this.addAuditEntry(auditLog, 'DECISION_MADE', 'system',
        `Verification decision: ${decision.decision} (score: ${(finalScore * 100).toFixed(1)}%)`);

      // Step 5: Update database with results
      await this.updateVerificationCompleted(
        verificationId,
        extractionResult,
        validationResult,
        matchResult,
        finalScore,
        decision,
        auditLog,
        Date.now() - startTime
      );

      // Step 6: If approved, update user verification status
      if (decision.decision === 'approved') {
        await this.updateUserVerificationStatus(request.userId, verificationId, request.documentType);
        this.addAuditEntry(auditLog, 'USER_STATUS_UPDATED', 'system',
          'User verification status updated to verified');
      }

      logger.info('Document verification completed', {
        verificationId,
        userId: request.userId,
        decision: decision.decision,
        score: finalScore,
        processingTime: Date.now() - startTime,
      });

      return {
        success: true,
        verificationId,
        status: 'completed',
        message: `Verification ${decision.decision}`,
      };

    } catch (error: any) {
      logger.error('Document verification failed', {
        verificationId,
        userId: request.userId,
        error: error.message,
      });

      this.addAuditEntry(auditLog, 'VERIFICATION_ERROR', 'system',
        `Verification failed with error: ${error.message}`);

      await this.updateVerificationFailed(verificationId, 'system_error', error.message, auditLog);

      return {
        success: false,
        verificationId,
        status: 'failed',
        error: 'An error occurred during verification',
        errorCode: 'SYSTEM_ERROR',
      };
    }
  }

  /**
   * Extract document data using OCR
   */
  async extractDocumentData(
    documentFront: Buffer,
    documentBack: Buffer | undefined,
    documentType: DocumentType
  ): Promise<DocumentDataResult> {
    return documentBack
      ? textractOCRService.extractFromMultipleImages(documentFront, documentBack, documentType)
      : textractOCRService.extractDocumentData(documentFront, documentType);
  }

  /**
   * Validate document authenticity
   */
  async validateDocument(
    documentData: ExtractedDocumentData,
    documentType: DocumentType,
    countryCode: string
  ): Promise<DocumentValidationResult> {
    const checks: AuthenticityCheck[] = [];
    const issues: string[] = [];
    const warnings: string[] = [];

    // 1. Check document expiry
    const expiryCheck = this.checkDocumentExpiry(documentData);
    checks.push(expiryCheck);
    if (!expiryCheck.passed) {
      issues.push('Document is expired');
    }

    // 2. Check required fields presence
    const fieldsCheck = this.checkRequiredFields(documentData, documentType);
    checks.push(fieldsCheck);
    if (!fieldsCheck.passed) {
      issues.push('Required fields are missing');
    }

    // 3. Validate document number format
    const documentNumberCheck = this.validateDocumentNumberFormat(documentData, documentType, countryCode);
    checks.push(documentNumberCheck);
    if (!documentNumberCheck.passed) {
      warnings.push('Document number format validation failed');
    }

    // 4. Validate date formats and logical consistency
    const dateCheck = this.validateDates(documentData);
    checks.push(dateCheck);
    if (!dateCheck.passed) {
      issues.push(dateCheck.details || 'Date validation failed');
    }

    // 5. Check MRZ validity for passports
    if (documentType === 'passport' && documentData.mrz) {
      const mrzCheck = this.validateMRZ(documentData.mrz);
      checks.push(mrzCheck);
      if (!mrzCheck.passed) {
        warnings.push('MRZ check digit validation failed');
      }
    }

    // 6. Check for suspicious patterns
    const suspiciousCheck = this.checkSuspiciousPatterns(documentData);
    checks.push(suspiciousCheck);
    if (!suspiciousCheck.passed) {
      issues.push('Suspicious patterns detected in document data');
    }

    // 7. Validate age (must be 18+)
    const ageCheck = this.validateAge(documentData);
    checks.push(ageCheck);
    if (!ageCheck.passed) {
      issues.push('User does not meet minimum age requirement');
    }

    // Calculate overall confidence
    const passedChecks = checks.filter(c => c.passed).length;
    const totalConfidence = checks.reduce((sum, c) => sum + c.confidence, 0);
    const overallConfidence = totalConfidence / checks.length;

    // Determine authenticity result
    let authenticityResult: AuthenticityResult;
    if (issues.length === 0 && overallConfidence >= 0.9) {
      authenticityResult = 'authentic';
    } else if (issues.length > 2 || overallConfidence < 0.5) {
      authenticityResult = 'fraudulent';
    } else if (issues.length > 0 || overallConfidence < 0.7) {
      authenticityResult = 'suspicious';
    } else {
      authenticityResult = 'inconclusive';
    }

    return {
      isValid: issues.length === 0 && authenticityResult === 'authentic',
      authenticityResult,
      overallConfidence,
      checks,
      issues,
      warnings,
    };
  }

  /**
   * Match extracted document data with user profile
   */
  async matchWithProfile(
    documentData: ExtractedDocumentData,
    userProfile: UserProfile
  ): Promise<ProfileMatchResultComplete> {
    const matchDetails: ProfileMatchDetails[] = [];
    const issues: string[] = [];
    const warnings: string[] = [];

    // Match first name
    const firstNameMatch = this.matchField(
      'firstName',
      userProfile.firstName,
      documentData.firstName || this.extractFirstNameFromFullName(documentData.fullName)
    );
    matchDetails.push(firstNameMatch);

    // Match last name
    const lastNameMatch = this.matchField(
      'lastName',
      userProfile.lastName,
      documentData.lastName || this.extractLastNameFromFullName(documentData.fullName)
    );
    matchDetails.push(lastNameMatch);

    // Match date of birth
    const dobMatch = this.matchDateOfBirth(
      userProfile.dateOfBirth,
      documentData.dateOfBirth
    );
    matchDetails.push(dobMatch);

    // Calculate overall match score
    const matchScores = matchDetails.map(m => m.matchScore);
    const overallScore = matchScores.reduce((a, b) => a + b, 0) / matchScores.length;

    // Determine overall result
    let overallResult: ProfileMatchResult;
    if (overallScore >= 0.9) {
      overallResult = 'match';
    } else if (overallScore >= 0.6) {
      overallResult = 'partial_match';
      warnings.push('Some profile fields do not fully match document data');
    } else if (overallScore >= 0.3) {
      overallResult = 'mismatch';
      issues.push('Profile information does not match document data');
    } else {
      overallResult = 'unable_to_verify';
      issues.push('Unable to verify profile against document');
    }

    // Add specific issues
    for (const detail of matchDetails) {
      if (detail.matchResult === 'mismatch') {
        issues.push(`${detail.field} mismatch: profile "${detail.profileValue}" vs document "${detail.documentValue}"`);
      }
    }

    return {
      overallResult,
      overallConfidence: overallScore,
      matchDetails,
      issues,
      warnings,
      verificationScore: overallScore,
    };
  }

  /**
   * Get current verification score (for external queries)
   */
  async getVerificationScore(verificationId: string): Promise<number> {
    const record = await db('document_verifications')
      .where({ id: verificationId })
      .first();

    return record?.overall_score || 0;
  }

  /**
   * Get verification status
   */
  async getVerificationStatus(verificationId: string, userId: string): Promise<DocumentVerificationResult | null> {
    const record = await db('document_verifications')
      .where({ id: verificationId, user_id: userId })
      .first();

    if (!record) {
      return null;
    }

    return this.mapRecordToResult(record);
  }

  /**
   * Get user's latest verification
   */
  async getUserLatestVerification(userId: string): Promise<DocumentVerificationResult | null> {
    const record = await db('document_verifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .first();

    if (!record) {
      return null;
    }

    return this.mapRecordToResult(record);
  }

  /**
   * GDPR: Export user verification data
   */
  async exportUserData(userId: string): Promise<any> {
    const verifications = await db('document_verifications')
      .where({ user_id: userId })
      .select([
        'id',
        'document_type',
        'status',
        'is_verified',
        'verification_decision',
        'created_at',
        'completed_at',
        // Exclude sensitive data
      ]);

    return {
      exportedAt: new Date(),
      userId,
      verifications: verifications.map(v => ({
        verificationId: v.id,
        documentType: v.document_type,
        status: v.status,
        isVerified: v.is_verified,
        createdAt: v.created_at,
        completedAt: v.completed_at,
      })),
    };
  }

  /**
   * GDPR: Delete user verification data
   */
  async deleteUserData(userId: string): Promise<{ deleted: number }> {
    const deleted = await db('document_verifications')
      .where({ user_id: userId })
      .del();

    logger.info('GDPR: User document verification data deleted', {
      userId,
      recordsDeleted: deleted,
    });

    return { deleted };
  }

  /**
   * Clean up expired verification data (GDPR compliance)
   */
  async cleanupExpiredData(): Promise<{ deleted: number }> {
    const now = new Date();

    // Delete records past retention period
    const deleted = await db('document_verifications')
      .where('data_retention_expires_at', '<', now)
      .del();

    if (deleted > 0) {
      logger.info('GDPR: Expired document verification data cleaned up', {
        recordsDeleted: deleted,
      });
    }

    return { deleted };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Create initial verification record in database
   */
  private async createVerificationRecord(
    verificationId: string,
    request: DocumentVerificationRequest,
    auditLog: AuditLogEntry[]
  ): Promise<void> {
    const now = new Date();
    const retentionExpiry = new Date(now);
    retentionExpiry.setDate(retentionExpiry.getDate() + DATA_RETENTION_PERIODS.verificationData);

    await db('document_verifications').insert({
      id: verificationId,
      user_id: request.userId,
      document_type: request.documentType,
      country_code: request.countryCode,
      status: 'processing',
      is_verified: false,
      verification_decision: 'pending',
      consent_given: request.consentGiven,
      consent_timestamp: request.consentTimestamp,
      data_retention_expires_at: retentionExpiry,
      gdpr_export_requested: false,
      gdpr_deletion_requested: false,
      audit_log: JSON.stringify(auditLog),
      created_at: now,
      updated_at: now,
    });
  }

  /**
   * Update verification record on failure
   */
  private async updateVerificationFailed(
    verificationId: string,
    reason: string,
    details: string,
    auditLog: AuditLogEntry[]
  ): Promise<void> {
    this.addAuditEntry(auditLog, 'VERIFICATION_FAILED', 'system', `Failed: ${reason} - ${details}`);

    await db('document_verifications')
      .where({ id: verificationId })
      .update({
        status: 'failed',
        verification_decision: 'rejected',
        decision_reasons: JSON.stringify([`${reason}: ${details}`]),
        audit_log: JSON.stringify(auditLog),
        updated_at: new Date(),
        completed_at: new Date(),
      });
  }

  /**
   * Update verification record on completion
   */
  private async updateVerificationCompleted(
    verificationId: string,
    extractionResult: DocumentDataResult,
    validationResult: DocumentValidationResult,
    matchResult: ProfileMatchResultComplete,
    finalScore: number,
    decision: { decision: string; reasons: string[] },
    auditLog: AuditLogEntry[],
    processingDuration: number
  ): Promise<void> {
    // Encrypt sensitive extracted data
    const encryptedData = extractionResult.data
      ? this.encryptData(JSON.stringify(extractionResult.data))
      : null;

    await db('document_verifications')
      .where({ id: verificationId })
      .update({
        status: 'completed',
        extracted_data_encrypted: encryptedData,
        extraction_confidence: extractionResult.overallConfidence,
        validation_result: JSON.stringify(validationResult),
        authenticity_result: validationResult.authenticityResult,
        profile_match_result: JSON.stringify(matchResult),
        profile_match_score: matchResult.verificationScore,
        overall_score: finalScore,
        is_verified: decision.decision === 'approved',
        verification_decision: decision.decision,
        decision_reasons: JSON.stringify(decision.reasons),
        processing_duration_ms: processingDuration,
        audit_log: JSON.stringify(auditLog),
        updated_at: new Date(),
        completed_at: new Date(),
      });
  }

  /**
   * Update user verification status after successful verification
   */
  private async updateUserVerificationStatus(
    userId: string,
    verificationId: string,
    documentType: DocumentType
  ): Promise<void> {
    await db('users')
      .where({ id: userId })
      .update({
        is_document_verified: true,
        document_verified_at: new Date(),
        document_verification_id: verificationId,
        verification_level: db.raw('GREATEST(verification_level, 2)'),
        updated_at: new Date(),
      });

    // Create/update verification metadata
    await db('user_verification_metadata')
      .insert({
        id: uuidv4(),
        user_id: userId,
        verification_type: 'document',
        document_type: documentType,
        verified_at: new Date(),
        created_at: new Date(),
      })
      .onConflict(['user_id', 'verification_type'])
      .merge();
  }

  /**
   * Get user profile from database
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const user = await db('users')
      .where({ id: userId })
      .select(['id', 'first_name', 'last_name', 'date_of_birth', 'email', 'phone_number'])
      .first();

    if (!user) {
      throw new Error('User not found');
    }

    return {
      userId: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      dateOfBirth: user.date_of_birth,
      email: user.email,
      phoneNumber: user.phone_number,
    };
  }

  /**
   * Calculate overall verification score
   */
  private calculateVerificationScore(
    extractionConfidence: number,
    validationResult: DocumentValidationResult,
    matchResult: ProfileMatchResultComplete
  ): number {
    // Weighted scoring
    const extractionWeight = 0.25;
    const validationWeight = 0.35;
    const matchWeight = 0.40;

    const extractionScore = extractionConfidence;
    const validationScore = validationResult.overallConfidence;
    const matchScore = matchResult.verificationScore;

    return (
      extractionScore * extractionWeight +
      validationScore * validationWeight +
      matchScore * matchWeight
    );
  }

  /**
   * Make verification decision based on scores
   */
  private makeVerificationDecision(
    finalScore: number,
    validationResult: DocumentValidationResult,
    matchResult: ProfileMatchResultComplete
  ): { decision: 'approved' | 'rejected' | 'manual_review'; reasons: string[] } {
    const reasons: string[] = [];

    // Auto-reject conditions
    if (validationResult.authenticityResult === 'fraudulent') {
      reasons.push('Document failed authenticity checks');
      return { decision: 'rejected', reasons };
    }

    if (matchResult.overallResult === 'mismatch') {
      reasons.push('Profile information does not match document');
      return { decision: 'rejected', reasons };
    }

    if (finalScore < this.thresholds.autoRejectThreshold) {
      reasons.push(`Verification score (${(finalScore * 100).toFixed(1)}%) below threshold`);
      return { decision: 'rejected', reasons };
    }

    // Auto-approve conditions
    if (
      finalScore >= this.thresholds.autoApproveThreshold &&
      validationResult.authenticityResult === 'authentic' &&
      matchResult.overallResult === 'match'
    ) {
      reasons.push('All verification checks passed');
      return { decision: 'approved', reasons };
    }

    // Manual review
    if (finalScore >= this.thresholds.manualReviewThreshold) {
      reasons.push(...validationResult.warnings);
      reasons.push(...matchResult.warnings);
      if (reasons.length === 0) {
        reasons.push('Score requires manual review');
      }
      return { decision: 'manual_review', reasons };
    }

    // Default to rejected
    reasons.push('Verification did not meet approval criteria');
    return { decision: 'rejected', reasons };
  }

  /**
   * Check document expiry
   */
  private checkDocumentExpiry(data: ExtractedDocumentData): AuthenticityCheck {
    if (!data.expiryDate) {
      return {
        checkType: 'document_expiry',
        passed: false,
        confidence: 0.3,
        details: 'Expiry date not found',
      };
    }

    const expiry = new Date(data.expiryDate);
    const now = new Date();
    const isValid = expiry > now;

    return {
      checkType: 'document_expiry',
      passed: isValid,
      confidence: isValid ? 1.0 : 0.0,
      details: isValid ? 'Document is valid' : 'Document has expired',
    };
  }

  /**
   * Check required fields presence
   */
  private checkRequiredFields(data: ExtractedDocumentData, documentType: DocumentType): AuthenticityCheck {
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'documentNumber'];
    const presentFields: string[] = [];
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = (data as any)[field] ||
        (field === 'firstName' ? this.extractFirstNameFromFullName(data.fullName) : null) ||
        (field === 'lastName' ? this.extractLastNameFromFullName(data.fullName) : null);

      if (value) {
        presentFields.push(field);
      } else {
        missingFields.push(field);
      }
    }

    const confidence = presentFields.length / requiredFields.length;

    return {
      checkType: 'required_fields',
      passed: missingFields.length === 0,
      confidence,
      details: missingFields.length > 0
        ? `Missing fields: ${missingFields.join(', ')}`
        : 'All required fields present',
    };
  }

  /**
   * Validate document number format
   */
  private validateDocumentNumberFormat(
    data: ExtractedDocumentData,
    documentType: DocumentType,
    countryCode: string
  ): AuthenticityCheck {
    if (!data.documentNumber) {
      return {
        checkType: 'document_number_format',
        passed: false,
        confidence: 0.0,
        details: 'Document number not found',
      };
    }

    // Format patterns by document type
    const patterns: Record<string, RegExp> = {
      // US passport: 9 alphanumeric
      'passport_USA': /^[A-Z0-9]{9}$/i,
      // UK passport: 9 digits
      'passport_GBR': /^\d{9}$/,
      // Generic passport: 6-9 alphanumeric
      'passport': /^[A-Z0-9]{6,9}$/i,
      // US driver's license: varies by state, typically 7-15 alphanumeric
      'drivers_license_USA': /^[A-Z0-9]{7,15}$/i,
      // Generic driver's license
      'drivers_license': /^[A-Z0-9]{5,20}$/i,
      // National ID: varies widely
      'national_id': /^[A-Z0-9]{5,20}$/i,
    };

    const specificPattern = patterns[`${documentType}_${countryCode}`];
    const genericPattern = patterns[documentType];
    const pattern = specificPattern || genericPattern;

    if (!pattern) {
      return {
        checkType: 'document_number_format',
        passed: true,
        confidence: 0.5,
        details: 'No format pattern available for this document type',
      };
    }

    const isValid = pattern.test(data.documentNumber.replace(/\s/g, ''));

    return {
      checkType: 'document_number_format',
      passed: isValid,
      confidence: isValid ? 0.9 : 0.3,
      details: isValid ? 'Document number format valid' : 'Document number format does not match expected pattern',
    };
  }

  /**
   * Validate dates
   */
  private validateDates(data: ExtractedDocumentData): AuthenticityCheck {
    const issues: string[] = [];

    // Check date of birth is in the past
    if (data.dateOfBirth) {
      const dob = new Date(data.dateOfBirth);
      if (dob > new Date()) {
        issues.push('Date of birth is in the future');
      }
      // Check reasonable age (not over 150 years old)
      const age = this.calculateAge(data.dateOfBirth);
      if (age > 150) {
        issues.push('Date of birth indicates unreasonable age');
      }
    }

    // Check issue date is before expiry
    if (data.issueDate && data.expiryDate) {
      const issue = new Date(data.issueDate);
      const expiry = new Date(data.expiryDate);
      if (issue > expiry) {
        issues.push('Issue date is after expiry date');
      }
    }

    // Check issue date is in the past
    if (data.issueDate) {
      const issue = new Date(data.issueDate);
      if (issue > new Date()) {
        issues.push('Issue date is in the future');
      }
    }

    return {
      checkType: 'date_validation',
      passed: issues.length === 0,
      confidence: issues.length === 0 ? 1.0 : 0.3,
      details: issues.length > 0 ? issues.join('; ') : 'All dates are valid',
    };
  }

  /**
   * Validate MRZ data
   */
  private validateMRZ(mrz: ExtractedDocumentData['mrz']): AuthenticityCheck {
    if (!mrz || !mrz.checkDigits) {
      return {
        checkType: 'mrz_validation',
        passed: false,
        confidence: 0.0,
        details: 'MRZ data not available',
      };
    }

    const checks = mrz.checkDigits;
    const allValid = checks.documentNumber && checks.dateOfBirth && checks.expiryDate && checks.overall;
    const someValid = checks.documentNumber || checks.dateOfBirth || checks.expiryDate;

    return {
      checkType: 'mrz_validation',
      passed: allValid || false,
      confidence: allValid ? 1.0 : someValid ? 0.6 : 0.2,
      details: allValid ? 'All MRZ check digits valid' : 'Some MRZ check digits failed',
    };
  }

  /**
   * Check for suspicious patterns
   */
  private checkSuspiciousPatterns(data: ExtractedDocumentData): AuthenticityCheck {
    const suspiciousPatterns: string[] = [];

    // Check for obviously fake names
    const suspiciousNames = ['test', 'sample', 'specimen', 'fake', 'john doe', 'jane doe'];
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.toLowerCase();
    for (const pattern of suspiciousNames) {
      if (fullName.includes(pattern)) {
        suspiciousPatterns.push(`Suspicious name pattern: ${pattern}`);
      }
    }

    // Check for repeated characters in document number
    if (data.documentNumber) {
      const repeated = /(.)\1{4,}/.test(data.documentNumber);
      if (repeated) {
        suspiciousPatterns.push('Document number contains repeated characters');
      }
    }

    // Check for sequential numbers
    if (data.documentNumber) {
      const sequential = ['12345', '23456', '34567', '45678', '56789', '67890'];
      for (const seq of sequential) {
        if (data.documentNumber.includes(seq)) {
          suspiciousPatterns.push('Document number contains sequential digits');
          break;
        }
      }
    }

    return {
      checkType: 'suspicious_patterns',
      passed: suspiciousPatterns.length === 0,
      confidence: suspiciousPatterns.length === 0 ? 1.0 : 0.2,
      details: suspiciousPatterns.length > 0
        ? suspiciousPatterns.join('; ')
        : 'No suspicious patterns detected',
    };
  }

  /**
   * Validate age (18+)
   */
  private validateAge(data: ExtractedDocumentData): AuthenticityCheck {
    if (!data.dateOfBirth) {
      return {
        checkType: 'age_validation',
        passed: false,
        confidence: 0.0,
        details: 'Date of birth not available',
      };
    }

    const age = this.calculateAge(data.dateOfBirth);
    const minimumAge = 18;

    return {
      checkType: 'age_validation',
      passed: age >= minimumAge,
      confidence: age >= minimumAge ? 1.0 : 0.0,
      details: age >= minimumAge
        ? `Age verified: ${age} years`
        : `User is under ${minimumAge} years old`,
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: string): number {
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * Match a single field between profile and document
   */
  private matchField(
    fieldName: string,
    profileValue: string | undefined,
    documentValue: string | undefined
  ): ProfileMatchDetails {
    if (!profileValue && !documentValue) {
      return {
        field: fieldName,
        matchScore: 0.5,
        matchResult: 'unable_to_verify',
        details: 'Both values are missing',
      };
    }

    if (!profileValue || !documentValue) {
      return {
        field: fieldName,
        profileValue,
        documentValue,
        matchScore: 0.3,
        matchResult: 'unable_to_verify',
        details: 'One value is missing',
      };
    }

    // Normalize for comparison
    const normalizedProfile = this.normalizeString(profileValue);
    const normalizedDocument = this.normalizeString(documentValue);

    // Exact match
    if (normalizedProfile === normalizedDocument) {
      return {
        field: fieldName,
        profileValue,
        documentValue,
        matchScore: 1.0,
        matchResult: 'match',
        details: 'Exact match',
      };
    }

    // Fuzzy match using similarity score
    const similarity = this.calculateStringSimilarity(normalizedProfile, normalizedDocument);

    let matchResult: ProfileMatchResult;
    if (similarity >= 0.85) {
      matchResult = 'match';
    } else if (similarity >= 0.6) {
      matchResult = 'partial_match';
    } else {
      matchResult = 'mismatch';
    }

    return {
      field: fieldName,
      profileValue,
      documentValue,
      matchScore: similarity,
      matchResult,
      details: `Similarity: ${(similarity * 100).toFixed(1)}%`,
    };
  }

  /**
   * Match date of birth
   */
  private matchDateOfBirth(
    profileDob: string | undefined,
    documentDob: string | undefined
  ): ProfileMatchDetails {
    if (!profileDob && !documentDob) {
      return {
        field: 'dateOfBirth',
        matchScore: 0.5,
        matchResult: 'unable_to_verify',
        details: 'Both dates are missing',
      };
    }

    if (!profileDob || !documentDob) {
      return {
        field: 'dateOfBirth',
        profileValue: profileDob,
        documentValue: documentDob,
        matchScore: 0.3,
        matchResult: 'unable_to_verify',
        details: 'One date is missing',
      };
    }

    // Normalize dates for comparison
    const profileDate = new Date(profileDob);
    const documentDate = new Date(documentDob);

    if (isNaN(profileDate.getTime()) || isNaN(documentDate.getTime())) {
      return {
        field: 'dateOfBirth',
        profileValue: profileDob,
        documentValue: documentDob,
        matchScore: 0.3,
        matchResult: 'unable_to_verify',
        details: 'Invalid date format',
      };
    }

    // Check if dates match
    const profileStr = profileDate.toISOString().split('T')[0];
    const documentStr = documentDate.toISOString().split('T')[0];

    if (profileStr === documentStr) {
      return {
        field: 'dateOfBirth',
        profileValue: profileDob,
        documentValue: documentDob,
        matchScore: 1.0,
        matchResult: 'match',
        details: 'Exact date match',
      };
    }

    // Check year match at least
    if (profileDate.getFullYear() === documentDate.getFullYear()) {
      return {
        field: 'dateOfBirth',
        profileValue: profileDob,
        documentValue: documentDob,
        matchScore: 0.6,
        matchResult: 'partial_match',
        details: 'Year matches, day/month differs',
      };
    }

    return {
      field: 'dateOfBirth',
      profileValue: profileDob,
      documentValue: documentDob,
      matchScore: 0.0,
      matchResult: 'mismatch',
      details: 'Dates do not match',
    };
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9]/g, '') // Remove non-alphanumeric
      .trim();
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1.0;
    if (str1.length === 0 || str2.length === 0) return 0.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    const longerLength = longer.length;
    if (longerLength === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longerLength - distance) / longerLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Extract first name from full name
   */
  private extractFirstNameFromFullName(fullName: string | undefined): string | undefined {
    if (!fullName) return undefined;
    const parts = fullName.trim().split(/\s+/);
    return parts[0];
  }

  /**
   * Extract last name from full name
   */
  private extractLastNameFromFullName(fullName: string | undefined): string | undefined {
    if (!fullName) return undefined;
    const parts = fullName.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : undefined;
  }

  /**
   * Add audit log entry
   */
  private addAuditEntry(
    auditLog: AuditLogEntry[],
    action: string,
    actor: 'system' | 'user' | 'admin',
    details: string,
    dataAccessed?: string[]
  ): void {
    auditLog.push({
      timestamp: new Date(),
      action,
      actor,
      details,
      dataAccessed,
    });
  }

  /**
   * Encrypt sensitive data
   */
  private encryptData(data: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive data
   */
  private decryptData(encryptedData: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Map database record to result object
   */
  private mapRecordToResult(record: any): DocumentVerificationResult {
    return {
      verificationId: record.id,
      userId: record.user_id,
      documentType: record.document_type,
      status: record.status,
      extractedData: record.extracted_data_encrypted
        ? JSON.parse(this.decryptData(record.extracted_data_encrypted))
        : undefined,
      extractionConfidence: record.extraction_confidence || 0,
      validationResult: record.validation_result
        ? JSON.parse(record.validation_result)
        : undefined,
      profileMatchResult: record.profile_match_result
        ? JSON.parse(record.profile_match_result)
        : undefined,
      overallVerificationScore: record.overall_score || 0,
      isVerified: record.is_verified,
      verificationDecision: record.verification_decision,
      decisionReasons: record.decision_reasons
        ? JSON.parse(record.decision_reasons)
        : [],
      processedAt: record.completed_at || record.created_at,
      processingDuration: record.processing_duration_ms || 0,
      auditLog: record.audit_log ? JSON.parse(record.audit_log) : [],
    };
  }
}

// Export singleton instance
export const documentVerificationService = new DocumentVerificationService();
