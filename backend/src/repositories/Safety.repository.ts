import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import {
  IdentityVerification,
  VerificationType,
  VerificationStatus,
  VerificationDocument,
  DocumentType,
  SocialVerification,
  SocialProvider,
  UserSecuritySettings,
  TwoFactorMethod,
  LoginAttempt,
  ActiveSession,
  AccountRecoveryMethod,
  RecoveryMethodType,
  PasswordResetToken,
  UserPrivacySettings,
  ProfileVisibility,
  DataExportRequest,
  DataExportFormat,
  DataDeletionRequest,
  DeletionType,
  ConsentRecord,
  UserBlock,
  BlockType,
  UserReport,
  ReportCategory,
  ReportStatus,
  ReportResolution,
  ReportedContentType,
  ContentModerationQueueItem,
  ContentType,
  ModerationStatus,
  MessageFilter,
  EmergencyContact,
  EmergencyRelationship,
  SafetyCheckIn,
  SafetyCheckInStatus,
  LocationShare,
  LocationShareType,
  ScamIndicator,
  ScamIndicatorType,
  FraudAlert,
  FraudAlertType,
  BotDetectionScore,
  UserBehaviorLog,
  BehaviorActionType,
  AccountFlag,
  AccountFlagType,
  AccountFlagStatus,
  ModerationAction,
  ModerationActionType,
  BanAppeal,
  AppealStatus,
  AgeVerificationCheck,
  AgeVerificationMethod,
  WellbeingSignal,
  WellbeingSignalType,
  WellbeingSignalStatus,
  CrisisResourceShown,
  CrisisResourceType,
} from '../models/Safety.model';

export class SafetyRepository {
  private db: Knex;

  constructor(db: Knex) {
    this.db = db;
  }

  // ============================================
  // Identity Verification
  // ============================================

  async createVerification(
    userId: string,
    type: VerificationType,
    provider?: string
  ): Promise<IdentityVerification> {
    const id = uuidv4();
    const [verification] = await this.db('identity_verifications')
      .insert({
        id,
        user_id: userId,
        type,
        status: 'pending',
        provider,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return verification;
  }

  async getVerification(id: string): Promise<IdentityVerification | null> {
    return this.db('identity_verifications').where({ id }).first();
  }

  async getUserVerifications(userId: string): Promise<IdentityVerification[]> {
    return this.db('identity_verifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  }

  async getUserVerificationByType(
    userId: string,
    type: VerificationType
  ): Promise<IdentityVerification | null> {
    return this.db('identity_verifications')
      .where({ user_id: userId, type })
      .orderBy('created_at', 'desc')
      .first();
  }

  async updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    data?: {
      providerReferenceId?: string;
      verificationData?: Record<string, any>;
      rejectionReason?: string;
      verifiedAt?: Date;
      expiresAt?: Date;
    }
  ): Promise<IdentityVerification> {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (data?.providerReferenceId) updateData.provider_reference_id = data.providerReferenceId;
    if (data?.verificationData) updateData.verification_data = JSON.stringify(data.verificationData);
    if (data?.rejectionReason) updateData.rejection_reason = data.rejectionReason;
    if (data?.verifiedAt) updateData.verified_at = data.verifiedAt;
    if (data?.expiresAt) updateData.expires_at = data.expiresAt;

    const [verification] = await this.db('identity_verifications')
      .where({ id })
      .update(updateData)
      .returning('*');
    return verification;
  }

  async createVerificationDocument(
    verificationId: string,
    documentType: DocumentType,
    storagePath: string,
    fileHash?: string
  ): Promise<VerificationDocument> {
    const id = uuidv4();
    const [document] = await this.db('verification_documents')
      .insert({
        id,
        verification_id: verificationId,
        document_type: documentType,
        storage_path: storagePath,
        file_hash: fileHash,
        is_processed: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return document;
  }

  async updateDocumentAIAnalysis(
    documentId: string,
    aiAnalysis: Record<string, any>
  ): Promise<VerificationDocument> {
    const [document] = await this.db('verification_documents')
      .where({ id: documentId })
      .update({
        ai_analysis: JSON.stringify(aiAnalysis),
        is_processed: true,
        updated_at: new Date(),
      })
      .returning('*');
    return document;
  }

  async createSocialVerification(
    userId: string,
    provider: SocialProvider,
    providerUserId: string,
    providerUsername?: string,
    profileData?: Record<string, any>
  ): Promise<SocialVerification> {
    const id = uuidv4();
    const [verification] = await this.db('social_verifications')
      .insert({
        id,
        user_id: userId,
        provider,
        provider_user_id: providerUserId,
        provider_username: providerUsername,
        profile_data: profileData ? JSON.stringify(profileData) : null,
        is_verified: true,
        verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return verification;
  }

  async getUserSocialVerifications(userId: string): Promise<SocialVerification[]> {
    return this.db('social_verifications').where({ user_id: userId });
  }

  // ============================================
  // Account Security
  // ============================================

  async getOrCreateSecuritySettings(userId: string): Promise<UserSecuritySettings> {
    let settings = await this.db('user_security_settings')
      .where({ user_id: userId })
      .first();

    if (!settings) {
      const id = uuidv4();
      [settings] = await this.db('user_security_settings')
        .insert({
          id,
          user_id: userId,
          two_factor_enabled: false,
          login_alerts_enabled: true,
          new_device_alerts_enabled: true,
          suspicious_activity_alerts_enabled: true,
          max_sessions: 5,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
    }

    return settings;
  }

  async updateSecuritySettings(
    userId: string,
    updates: Partial<{
      two_factor_enabled: boolean;
      two_factor_method: TwoFactorMethod;
      two_factor_secret: string;
      backup_codes: string;
      login_alerts_enabled: boolean;
      new_device_alerts_enabled: boolean;
      suspicious_activity_alerts_enabled: boolean;
      allowed_login_locations: any;
      trusted_devices: any;
      max_sessions: number;
    }>
  ): Promise<UserSecuritySettings> {
    const updateData: any = { ...updates, updated_at: new Date() };
    if (updates.allowed_login_locations) {
      updateData.allowed_login_locations = JSON.stringify(updates.allowed_login_locations);
    }
    if (updates.trusted_devices) {
      updateData.trusted_devices = JSON.stringify(updates.trusted_devices);
    }

    const [settings] = await this.db('user_security_settings')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');
    return settings;
  }

  async recordLoginAttempt(
    data: {
      userId?: string;
      email?: string;
      ipAddress: string;
      userAgent?: string;
      deviceFingerprint?: string;
      geolocation?: Record<string, any>;
      wasSuccessful: boolean;
      failureReason?: string;
      isSuspicious?: boolean;
    }
  ): Promise<LoginAttempt> {
    const id = uuidv4();
    const [attempt] = await this.db('login_attempts')
      .insert({
        id,
        user_id: data.userId,
        email: data.email,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        device_fingerprint: data.deviceFingerprint,
        geolocation: data.geolocation ? JSON.stringify(data.geolocation) : null,
        was_successful: data.wasSuccessful,
        failure_reason: data.failureReason,
        is_suspicious: data.isSuspicious || false,
        created_at: new Date(),
      })
      .returning('*');
    return attempt;
  }

  async getRecentLoginAttempts(
    userId: string,
    limit: number = 10
  ): Promise<LoginAttempt[]> {
    return this.db('login_attempts')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async getFailedLoginAttempts(
    email: string,
    since: Date
  ): Promise<number> {
    const result = await this.db('login_attempts')
      .where({ email, was_successful: false })
      .where('created_at', '>=', since)
      .count('* as count')
      .first();
    return Number(result?.count || 0);
  }

  async createSession(
    userId: string,
    sessionToken: string,
    data: {
      deviceFingerprint?: string;
      deviceName?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      ipAddress?: string;
      geolocation?: Record<string, any>;
      expiresAt?: Date;
    }
  ): Promise<ActiveSession> {
    const id = uuidv4();
    const [session] = await this.db('active_sessions')
      .insert({
        id,
        user_id: userId,
        session_token: sessionToken,
        device_fingerprint: data.deviceFingerprint,
        device_name: data.deviceName,
        device_type: data.deviceType || 'unknown',
        browser: data.browser,
        os: data.os,
        ip_address: data.ipAddress,
        geolocation: data.geolocation ? JSON.stringify(data.geolocation) : null,
        is_current: true,
        last_active_at: new Date(),
        expires_at: data.expiresAt,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return session;
  }

  async getUserSessions(userId: string): Promise<ActiveSession[]> {
    return this.db('active_sessions')
      .where({ user_id: userId })
      .orderBy('last_active_at', 'desc');
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db('active_sessions').where({ id: sessionId }).delete();
  }

  async deleteAllUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
    let query = this.db('active_sessions').where({ user_id: userId });
    if (exceptSessionId) {
      query = query.whereNot({ id: exceptSessionId });
    }
    await query.delete();
  }

  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    ipAddress?: string
  ): Promise<PasswordResetToken> {
    const id = uuidv4();
    const [token] = await this.db('password_reset_tokens')
      .insert({
        id,
        user_id: userId,
        token_hash: tokenHash,
        is_used: false,
        expires_at: expiresAt,
        ip_address: ipAddress,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return token;
  }

  async getPasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.db('password_reset_tokens')
      .where({ token_hash: tokenHash, is_used: false })
      .where('expires_at', '>', new Date())
      .first();
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.db('password_reset_tokens')
      .where({ id })
      .update({ is_used: true, updated_at: new Date() });
  }

  // ============================================
  // Data Privacy
  // ============================================

  async getOrCreatePrivacySettings(userId: string): Promise<UserPrivacySettings> {
    let settings = await this.db('user_privacy_settings')
      .where({ user_id: userId })
      .first();

    if (!settings) {
      const id = uuidv4();
      [settings] = await this.db('user_privacy_settings')
        .insert({
          id,
          user_id: userId,
          profile_visibility: 'public',
          show_online_status: true,
          show_last_active: true,
          show_distance: true,
          show_age: true,
          allow_screenshot: false,
          blur_photos_for_non_matches: false,
          incognito_mode: false,
          data_collection_consent: true,
          personalization_consent: true,
          marketing_consent: false,
          third_party_sharing_consent: false,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
    }

    return settings;
  }

  async updatePrivacySettings(
    userId: string,
    updates: Partial<UserPrivacySettings>
  ): Promise<UserPrivacySettings> {
    const updateData: any = { ...updates, updated_at: new Date() };
    delete updateData.id;
    delete updateData.user_id;
    delete updateData.created_at;

    if (updates.hidden_from_users) {
      updateData.hidden_from_users = JSON.stringify(updates.hidden_from_users);
    }
    if (updates.blocked_contacts) {
      updateData.blocked_contacts = JSON.stringify(updates.blocked_contacts);
    }

    const [settings] = await this.db('user_privacy_settings')
      .where({ user_id: userId })
      .update(updateData)
      .returning('*');
    return settings;
  }

  async createDataExportRequest(
    userId: string,
    format: DataExportFormat = 'json'
  ): Promise<DataExportRequest> {
    const id = uuidv4();
    const [request] = await this.db('data_export_requests')
      .insert({
        id,
        user_id: userId,
        status: 'pending',
        format,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return request;
  }

  async updateDataExportRequest(
    id: string,
    updates: Partial<DataExportRequest>
  ): Promise<DataExportRequest> {
    const [request] = await this.db('data_export_requests')
      .where({ id })
      .update({ ...updates, updated_at: new Date() })
      .returning('*');
    return request;
  }

  async createDataDeletionRequest(
    userId: string,
    type: DeletionType,
    reason?: string,
    selectiveData?: Record<string, any>
  ): Promise<DataDeletionRequest> {
    const id = uuidv4();
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 30); // 30-day waiting period

    const [request] = await this.db('data_deletion_requests')
      .insert({
        id,
        user_id: userId,
        type,
        selective_data: selectiveData ? JSON.stringify(selectiveData) : null,
        status: 'pending',
        reason,
        scheduled_at: scheduledAt,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return request;
  }

  async recordConsent(
    userId: string,
    consentType: string,
    version: string,
    consented: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    const id = uuidv4();
    const [record] = await this.db('consent_records')
      .insert({
        id,
        user_id: userId,
        consent_type: consentType,
        version,
        consented,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return record;
  }

  // ============================================
  // Harassment Prevention
  // ============================================

  async createBlock(
    blockerId: string,
    blockedId: string,
    blockType: BlockType = 'full',
    reason?: string
  ): Promise<UserBlock> {
    const id = uuidv4();
    const [block] = await this.db('user_blocks')
      .insert({
        id,
        blocker_id: blockerId,
        blocked_id: blockedId,
        block_type: blockType,
        reason,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return block;
  }

  async removeBlock(blockerId: string, blockedId: string): Promise<void> {
    await this.db('user_blocks')
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .delete();
  }

  async isUserBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    const block = await this.db('user_blocks')
      .where({ blocker_id: blockerId, blocked_id: blockedId })
      .first();
    return !!block;
  }

  async getUserBlocks(userId: string): Promise<UserBlock[]> {
    return this.db('user_blocks').where({ blocker_id: userId });
  }

  async createReport(
    reporterId: string,
    reportedUserId: string,
    category: ReportCategory,
    data?: {
      description?: string;
      evidence?: Record<string, any>;
      contentId?: string;
      contentType?: ReportedContentType;
    }
  ): Promise<UserReport> {
    const id = uuidv4();
    const [report] = await this.db('user_reports')
      .insert({
        id,
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        category,
        description: data?.description,
        evidence: data?.evidence ? JSON.stringify(data.evidence) : null,
        reported_content_id: data?.contentId,
        reported_content_type: data?.contentType,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return report;
  }

  async getReport(id: string): Promise<UserReport | null> {
    return this.db('user_reports').where({ id }).first();
  }

  async getUserReports(reportedUserId: string): Promise<UserReport[]> {
    return this.db('user_reports')
      .where({ reported_user_id: reportedUserId })
      .orderBy('created_at', 'desc');
  }

  async getPendingReports(limit: number = 50): Promise<UserReport[]> {
    return this.db('user_reports')
      .where({ status: 'pending' })
      .orderBy('created_at', 'asc')
      .limit(limit);
  }

  async updateReportStatus(
    id: string,
    status: ReportStatus,
    data?: {
      resolution?: ReportResolution;
      reviewedBy?: string;
      reviewNotes?: string;
    }
  ): Promise<UserReport> {
    const [report] = await this.db('user_reports')
      .where({ id })
      .update({
        status,
        resolution: data?.resolution,
        reviewed_by: data?.reviewedBy,
        review_notes: data?.reviewNotes,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return report;
  }

  async getReportCountForUser(userId: string, since?: Date): Promise<number> {
    let query = this.db('user_reports')
      .where({ reported_user_id: userId });

    if (since) {
      query = query.where('created_at', '>=', since);
    }

    const result = await query.count('* as count').first();
    return Number(result?.count || 0);
  }

  async addToModerationQueue(
    userId: string,
    contentType: ContentType,
    contentId: string,
    aiAnalysis?: Record<string, any>
  ): Promise<ContentModerationQueueItem> {
    const id = uuidv4();
    const [item] = await this.db('content_moderation_queue')
      .insert({
        id,
        user_id: userId,
        content_type: contentType,
        content_id: contentId,
        moderation_type: aiAnalysis ? 'auto' : 'manual',
        status: 'pending',
        ai_analysis: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
        ai_confidence_score: aiAnalysis?.confidence,
        flags: aiAnalysis?.detectedIssues ? JSON.stringify(aiAnalysis.detectedIssues) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return item;
  }

  async getOrCreateMessageFilter(userId: string): Promise<MessageFilter> {
    let filter = await this.db('message_filters')
      .where({ user_id: userId })
      .first();

    if (!filter) {
      const id = uuidv4();
      [filter] = await this.db('message_filters')
        .insert({
          id,
          user_id: userId,
          filter_explicit_content: true,
          filter_spam: true,
          filter_solicitation: true,
          allow_message_requests: true,
          require_match_to_message: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
    }

    return filter;
  }

  // ============================================
  // Physical Safety
  // ============================================

  async createEmergencyContact(
    userId: string,
    data: {
      name: string;
      phone: string;
      email?: string;
      relationship: EmergencyRelationship;
      isPrimary?: boolean;
      canReceiveAlerts?: boolean;
      canSeeLocation?: boolean;
    }
  ): Promise<EmergencyContact> {
    const id = uuidv4();
    const [contact] = await this.db('emergency_contacts')
      .insert({
        id,
        user_id: userId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        relationship: data.relationship,
        is_primary: data.isPrimary || false,
        can_receive_alerts: data.canReceiveAlerts ?? true,
        can_see_location: data.canSeeLocation ?? false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return contact;
  }

  async getUserEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return this.db('emergency_contacts')
      .where({ user_id: userId })
      .orderBy('is_primary', 'desc');
  }

  async deleteEmergencyContact(id: string): Promise<void> {
    await this.db('emergency_contacts').where({ id }).delete();
  }

  async createSafetyCheckIn(
    userId: string,
    data: {
      matchId?: string;
      locationName?: string;
      coordinates?: { lat: number; lng: number };
      scheduledTime: Date;
      expectedEndTime?: Date;
      notes?: string;
    }
  ): Promise<SafetyCheckIn> {
    const id = uuidv4();
    const [checkIn] = await this.db('safety_check_ins')
      .insert({
        id,
        user_id: userId,
        match_id: data.matchId,
        location_name: data.locationName,
        coordinates: data.coordinates ? JSON.stringify(data.coordinates) : null,
        scheduled_time: data.scheduledTime,
        expected_end_time: data.expectedEndTime,
        status: 'scheduled',
        notes: data.notes,
        alert_sent: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return checkIn;
  }

  async updateSafetyCheckInStatus(
    id: string,
    status: SafetyCheckInStatus,
    lastCheckInAt?: Date
  ): Promise<SafetyCheckIn> {
    const [checkIn] = await this.db('safety_check_ins')
      .where({ id })
      .update({
        status,
        last_check_in_at: lastCheckInAt,
        updated_at: new Date(),
      })
      .returning('*');
    return checkIn;
  }

  async getActiveCheckIns(userId: string): Promise<SafetyCheckIn[]> {
    return this.db('safety_check_ins')
      .where({ user_id: userId })
      .whereIn('status', ['scheduled', 'active'])
      .orderBy('scheduled_time', 'asc');
  }

  async createLocationShare(
    userId: string,
    data: {
      sharedWithUserId?: string;
      emergencyContactId?: string;
      currentLocation?: { lat: number; lng: number; accuracy?: number };
      shareType: LocationShareType;
      expiresAt?: Date;
    }
  ): Promise<LocationShare> {
    const id = uuidv4();
    const [share] = await this.db('location_shares')
      .insert({
        id,
        user_id: userId,
        shared_with_user_id: data.sharedWithUserId,
        emergency_contact_id: data.emergencyContactId,
        current_location: data.currentLocation ? JSON.stringify(data.currentLocation) : null,
        share_type: data.shareType,
        expires_at: data.expiresAt,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return share;
  }

  async updateLocationShare(
    id: string,
    location: { lat: number; lng: number; accuracy?: number }
  ): Promise<LocationShare> {
    const [share] = await this.db('location_shares')
      .where({ id })
      .update({
        current_location: JSON.stringify({ ...location, timestamp: new Date() }),
        updated_at: new Date(),
      })
      .returning('*');
    return share;
  }

  async deactivateLocationShare(id: string): Promise<void> {
    await this.db('location_shares')
      .where({ id })
      .update({ is_active: false, updated_at: new Date() });
  }

  // ============================================
  // Financial Protection
  // ============================================

  async createScamIndicator(
    userId: string,
    indicatorType: ScamIndicatorType,
    data?: {
      contentExcerpt?: string;
      messageId?: string;
      confidenceScore?: number;
    }
  ): Promise<ScamIndicator> {
    const id = uuidv4();
    const [indicator] = await this.db('scam_indicators')
      .insert({
        id,
        user_id: userId,
        indicator_type: indicatorType,
        content_excerpt: data?.contentExcerpt,
        message_id: data?.messageId,
        confidence_score: data?.confidenceScore,
        status: 'detected',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return indicator;
  }

  async getUserScamIndicators(userId: string): Promise<ScamIndicator[]> {
    return this.db('scam_indicators')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  }

  async createFraudAlert(
    userId: string,
    alertType: FraudAlertType,
    description?: string,
    evidence?: Record<string, any>
  ): Promise<FraudAlert> {
    const id = uuidv4();
    const [alert] = await this.db('fraud_alerts')
      .insert({
        id,
        user_id: userId,
        alert_type: alertType,
        description,
        evidence: evidence ? JSON.stringify(evidence) : null,
        was_shown_to_user: false,
        user_acknowledged: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return alert;
  }

  async markFraudAlertShown(id: string): Promise<void> {
    await this.db('fraud_alerts')
      .where({ id })
      .update({ was_shown_to_user: true, updated_at: new Date() });
  }

  async acknowledgeFraudAlert(id: string): Promise<void> {
    await this.db('fraud_alerts')
      .where({ id })
      .update({
        user_acknowledged: true,
        acknowledged_at: new Date(),
        updated_at: new Date(),
      });
  }

  // ============================================
  // Platform Integrity
  // ============================================

  async getOrCreateBotDetectionScore(userId: string): Promise<BotDetectionScore> {
    let score = await this.db('bot_detection_scores')
      .where({ user_id: userId })
      .first();

    if (!score) {
      const id = uuidv4();
      [score] = await this.db('bot_detection_scores')
        .insert({
          id,
          user_id: userId,
          overall_score: 0,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning('*');
    }

    return score;
  }

  async updateBotDetectionScore(
    userId: string,
    data: {
      overallScore: number;
      behavioralSignals?: Record<string, any>;
      profileSignals?: Record<string, any>;
      interactionSignals?: Record<string, any>;
    }
  ): Promise<BotDetectionScore> {
    const [score] = await this.db('bot_detection_scores')
      .where({ user_id: userId })
      .update({
        overall_score: data.overallScore,
        behavioral_signals: data.behavioralSignals ? JSON.stringify(data.behavioralSignals) : undefined,
        profile_signals: data.profileSignals ? JSON.stringify(data.profileSignals) : undefined,
        interaction_signals: data.interactionSignals ? JSON.stringify(data.interactionSignals) : undefined,
        last_calculated_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return score;
  }

  async logBehavior(
    userId: string,
    actionType: BehaviorActionType,
    data?: {
      targetId?: string;
      metadata?: Record<string, any>;
      deviceFingerprint?: string;
      ipAddress?: string;
    }
  ): Promise<UserBehaviorLog> {
    const id = uuidv4();
    const [log] = await this.db('user_behavior_logs')
      .insert({
        id,
        user_id: userId,
        action_type: actionType,
        target_id: data?.targetId,
        metadata: data?.metadata ? JSON.stringify(data.metadata) : null,
        device_fingerprint: data?.deviceFingerprint,
        ip_address: data?.ipAddress,
        created_at: new Date(),
      })
      .returning('*');
    return log;
  }

  async createAccountFlag(
    userId: string,
    flagType: AccountFlagType,
    reason?: string,
    evidence?: Record<string, any>,
    createdBy?: string
  ): Promise<AccountFlag> {
    const id = uuidv4();
    const [flag] = await this.db('account_flags')
      .insert({
        id,
        user_id: userId,
        flag_type: flagType,
        reason,
        evidence: evidence ? JSON.stringify(evidence) : null,
        status: 'active',
        created_by: createdBy,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return flag;
  }

  async getActiveAccountFlags(userId: string): Promise<AccountFlag[]> {
    return this.db('account_flags')
      .where({ user_id: userId, status: 'active' });
  }

  async resolveAccountFlag(
    id: string,
    resolvedBy: string,
    resolutionNotes?: string
  ): Promise<AccountFlag> {
    const [flag] = await this.db('account_flags')
      .where({ id })
      .update({
        status: 'resolved',
        resolved_by: resolvedBy,
        resolution_notes: resolutionNotes,
        resolved_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return flag;
  }

  async createModerationAction(
    userId: string,
    actionType: ModerationActionType,
    data?: {
      moderatorId?: string;
      reason?: string;
      relatedReports?: string[];
      expiresAt?: Date;
    }
  ): Promise<ModerationAction> {
    const id = uuidv4();
    const [action] = await this.db('moderation_actions')
      .insert({
        id,
        user_id: userId,
        moderator_id: data?.moderatorId,
        action_type: actionType,
        reason: data?.reason,
        related_reports: data?.relatedReports ? JSON.stringify(data.relatedReports) : null,
        expires_at: data?.expiresAt,
        is_active: true,
        was_appealed: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return action;
  }

  async getActiveModerationActions(userId: string): Promise<ModerationAction[]> {
    return this.db('moderation_actions')
      .where({ user_id: userId, is_active: true });
  }

  async createBanAppeal(
    userId: string,
    moderationActionId: string,
    appealReason: string,
    supportingEvidence?: Record<string, any>
  ): Promise<BanAppeal> {
    const id = uuidv4();
    const [appeal] = await this.db('ban_appeals')
      .insert({
        id,
        user_id: userId,
        moderation_action_id: moderationActionId,
        appeal_reason: appealReason,
        supporting_evidence: supportingEvidence ? JSON.stringify(supportingEvidence) : null,
        status: 'pending',
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return appeal;
  }

  async updateBanAppealStatus(
    id: string,
    status: AppealStatus,
    reviewedBy?: string,
    reviewNotes?: string
  ): Promise<BanAppeal> {
    const [appeal] = await this.db('ban_appeals')
      .where({ id })
      .update({
        status,
        reviewed_by: reviewedBy,
        review_notes: reviewNotes,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return appeal;
  }

  // ============================================
  // Vulnerable Population Protection
  // ============================================

  async createAgeVerificationCheck(
    userId: string,
    method: AgeVerificationMethod,
    data: {
      verifiedDateOfBirth?: Date;
      estimatedAgeMin?: number;
      estimatedAgeMax?: number;
      confidenceScore?: number;
      passed: boolean;
      verificationDetails?: Record<string, any>;
    }
  ): Promise<AgeVerificationCheck> {
    const id = uuidv4();
    const [check] = await this.db('age_verification_checks')
      .insert({
        id,
        user_id: userId,
        method,
        verified_date_of_birth: data.verifiedDateOfBirth,
        estimated_age_min: data.estimatedAgeMin,
        estimated_age_max: data.estimatedAgeMax,
        confidence_score: data.confidenceScore,
        passed: data.passed,
        verification_details: data.verificationDetails ? JSON.stringify(data.verificationDetails) : null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return check;
  }

  async createWellbeingSignal(
    userId: string,
    signalType: WellbeingSignalType,
    data?: {
      contentExcerpt?: string;
      confidenceScore?: number;
    }
  ): Promise<WellbeingSignal> {
    const id = uuidv4();
    const [signal] = await this.db('wellbeing_signals')
      .insert({
        id,
        user_id: userId,
        signal_type: signalType,
        content_excerpt: data?.contentExcerpt,
        confidence_score: data?.confidenceScore,
        status: 'detected',
        resources_provided: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return signal;
  }

  async updateWellbeingSignalStatus(
    id: string,
    status: WellbeingSignalStatus,
    resourcesProvided?: boolean
  ): Promise<WellbeingSignal> {
    const [signal] = await this.db('wellbeing_signals')
      .where({ id })
      .update({
        status,
        resources_provided: resourcesProvided,
        updated_at: new Date(),
      })
      .returning('*');
    return signal;
  }

  async recordCrisisResourceShown(
    userId: string,
    resourceType: CrisisResourceType,
    data?: {
      wellbeingSignalId?: string;
      resourceCountry?: string;
      resourceName?: string;
      resourceContact?: string;
    }
  ): Promise<CrisisResourceShown> {
    const id = uuidv4();
    const [record] = await this.db('crisis_resources_shown')
      .insert({
        id,
        user_id: userId,
        wellbeing_signal_id: data?.wellbeingSignalId,
        resource_type: resourceType,
        resource_country: data?.resourceCountry,
        resource_name: data?.resourceName,
        resource_contact: data?.resourceContact,
        was_clicked: false,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');
    return record;
  }

  async markCrisisResourceClicked(id: string): Promise<void> {
    await this.db('crisis_resources_shown')
      .where({ id })
      .update({ was_clicked: true, updated_at: new Date() });
  }
}
