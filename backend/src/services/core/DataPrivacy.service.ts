/**
 * Data Privacy Service
 * Handles GDPR/CCPA compliance and privacy features including:
 * - Privacy settings management
 * - Data export (GDPR right to access)
 * - Data deletion (GDPR right to erasure)
 * - Consent management
 * - Incognito mode
 */

import { SafetyRepository } from '../../repositories/Safety.repository';
import { UserRepository, ProfileRepository } from '../../repositories';
import { logger } from '../../utils/logger';
import crypto from 'crypto';
import {
  UserPrivacySettings,
  ProfileVisibility,
  DataExportRequest,
  DataExportFormat,
  DataDeletionRequest,
  DeletionType,
  ConsentRecord,
} from '../../models/Safety.model';

interface UserDataExport {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    dateOfBirth: Date;
    gender: string;
    createdAt: Date;
  };
  profile: Record<string, any>;
  photos: string[];
  matches: {
    matchId: string;
    matchedAt: Date;
    status: string;
  }[];
  messages: {
    conversationId: string;
    messagesCount: number;
    firstMessageAt: Date;
    lastMessageAt: Date;
  }[];
  preferences: Record<string, any>;
  settings: Record<string, any>;
  activityLog: {
    action: string;
    timestamp: Date;
    details?: string;
  }[];
  exportedAt: Date;
}

export class DataPrivacyService {
  private safetyRepo: SafetyRepository;
  private userRepo: UserRepository;
  private profileRepo: ProfileRepository;

  constructor(
    safetyRepo: SafetyRepository,
    userRepo: UserRepository,
    profileRepo: ProfileRepository
  ) {
    this.safetyRepo = safetyRepo;
    this.userRepo = userRepo;
    this.profileRepo = profileRepo;
  }

  // ============================================
  // Privacy Settings
  // ============================================

  /**
   * Get user's privacy settings
   */
  async getPrivacySettings(userId: string): Promise<UserPrivacySettings> {
    return this.safetyRepo.getOrCreatePrivacySettings(userId);
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(
    userId: string,
    settings: Partial<{
      profile_visibility: ProfileVisibility;
      show_online_status: boolean;
      show_last_active: boolean;
      show_distance: boolean;
      show_age: boolean;
      allow_screenshot: boolean;
      blur_photos_for_non_matches: boolean;
      incognito_mode: boolean;
      data_collection_consent: boolean;
      personalization_consent: boolean;
      marketing_consent: boolean;
      third_party_sharing_consent: boolean;
    }>
  ): Promise<UserPrivacySettings> {
    const updatedSettings = await this.safetyRepo.updatePrivacySettings(userId, settings);

    // If incognito mode changed, update visibility
    if (settings.incognito_mode !== undefined) {
      await this.handleIncognitoModeChange(userId, settings.incognito_mode);
    }

    logger.info(`Privacy settings updated for user ${userId}`);

    return updatedSettings;
  }

  /**
   * Enable incognito mode
   */
  async enableIncognitoMode(userId: string): Promise<void> {
    await this.safetyRepo.updatePrivacySettings(userId, {
      incognito_mode: true,
      profile_visibility: 'hidden',
    });

    logger.info(`Incognito mode enabled for user ${userId}`);
  }

  /**
   * Disable incognito mode
   */
  async disableIncognitoMode(userId: string): Promise<void> {
    await this.safetyRepo.updatePrivacySettings(userId, {
      incognito_mode: false,
      profile_visibility: 'public',
    });

    logger.info(`Incognito mode disabled for user ${userId}`);
  }

  /**
   * Hide profile from specific users
   */
  async hideFromUser(userId: string, hideFromUserId: string): Promise<void> {
    const settings = await this.safetyRepo.getOrCreatePrivacySettings(userId);
    const hiddenUsers = settings.hidden_from_users || [];

    if (!hiddenUsers.includes(hideFromUserId)) {
      hiddenUsers.push(hideFromUserId);
      await this.safetyRepo.updatePrivacySettings(userId, {
        hidden_from_users: hiddenUsers,
      });
    }
  }

  /**
   * Block contacts from seeing profile (by phone hash)
   */
  async blockContactsFromProfile(
    userId: string,
    phoneNumbers: string[]
  ): Promise<void> {
    // Hash phone numbers for privacy
    const phoneHashes = phoneNumbers.map(phone =>
      crypto.createHash('sha256').update(phone).digest('hex')
    );

    const settings = await this.safetyRepo.getOrCreatePrivacySettings(userId);
    const blockedContacts = new Set([
      ...(settings.blocked_contacts || []),
      ...phoneHashes,
    ]);

    await this.safetyRepo.updatePrivacySettings(userId, {
      blocked_contacts: Array.from(blockedContacts),
    });

    logger.info(`${phoneNumbers.length} contacts blocked for user ${userId}`);
  }

  // ============================================
  // Data Export (Right to Access)
  // ============================================

  /**
   * Request data export
   */
  async requestDataExport(
    userId: string,
    format: DataExportFormat = 'json'
  ): Promise<DataExportRequest> {
    const request = await this.safetyRepo.createDataExportRequest(userId, format);

    // Start processing in background
    this.processDataExport(request.id, userId, format);

    logger.info(`Data export requested for user ${userId}: ${request.id}`);

    return request;
  }

  /**
   * Process data export request
   */
  private async processDataExport(
    requestId: string,
    userId: string,
    format: DataExportFormat
  ): Promise<void> {
    try {
      // Update status to processing
      await this.safetyRepo.updateDataExportRequest(requestId, {
        status: 'processing',
      });

      // Gather all user data
      const userData = await this.gatherUserData(userId);

      // Convert to requested format
      let exportData: string | Buffer;
      let fileExtension: string;

      switch (format) {
        case 'json':
          exportData = JSON.stringify(userData, null, 2);
          fileExtension = 'json';
          break;
        case 'csv':
          exportData = this.convertToCSV(userData);
          fileExtension = 'csv';
          break;
        case 'pdf':
          exportData = await this.convertToPDF(userData);
          fileExtension = 'pdf';
          break;
        default:
          exportData = JSON.stringify(userData, null, 2);
          fileExtension = 'json';
      }

      // Store export file (in production, would upload to secure storage)
      const downloadToken = crypto.randomBytes(32).toString('hex');
      const downloadUrl = `/api/privacy/export/download/${requestId}?token=${downloadToken}`;

      // Set expiration (7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await this.safetyRepo.updateDataExportRequest(requestId, {
        status: 'ready',
        download_url: downloadUrl,
        download_token_hash: crypto.createHash('sha256').update(downloadToken).digest('hex'),
        ready_at: new Date(),
        expires_at: expiresAt,
      });

      // Notify user that export is ready
      // Would send email/push notification

      logger.info(`Data export completed for user ${userId}: ${requestId}`);
    } catch (error) {
      logger.error(`Data export failed for user ${userId}:`, error);

      await this.safetyRepo.updateDataExportRequest(requestId, {
        status: 'failed',
      });
    }
  }

  /**
   * Gather all user data for export
   */
  private async gatherUserData(userId: string): Promise<UserDataExport> {
    const [user, profile] = await Promise.all([
      this.userRepo.findById(userId),
      this.profileRepo.findByUserId(userId),
    ]);

    if (!user) {
      throw new Error('User not found');
    }

    // In production, would gather:
    // - All messages
    // - All matches
    // - All photos
    // - Activity logs
    // - Purchase history
    // etc.

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        createdAt: user.created_at,
      },
      profile: profile || {},
      photos: [], // Would include photo URLs
      matches: [], // Would include match history
      messages: [], // Would include message summaries
      preferences: {}, // Would include matching preferences
      settings: {}, // Would include all settings
      activityLog: [], // Would include activity history
      exportedAt: new Date(),
    };
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: UserDataExport): string {
    // Simplified CSV conversion
    const lines: string[] = [];

    // User data
    lines.push('User Data');
    lines.push('Field,Value');
    lines.push(`ID,${data.user.id}`);
    lines.push(`Email,${data.user.email}`);
    lines.push(`First Name,${data.user.firstName}`);
    lines.push(`Last Name,${data.user.lastName || ''}`);
    lines.push(`Phone,${data.user.phone || ''}`);
    lines.push(`Date of Birth,${data.user.dateOfBirth}`);
    lines.push(`Gender,${data.user.gender}`);
    lines.push(`Created At,${data.user.createdAt}`);
    lines.push('');
    lines.push(`Exported At,${data.exportedAt}`);

    return lines.join('\n');
  }

  /**
   * Convert data to PDF format
   */
  private async convertToPDF(data: UserDataExport): Promise<Buffer> {
    // In production, would use a PDF library like pdfkit
    // Returning JSON as placeholder
    return Buffer.from(JSON.stringify(data, null, 2));
  }

  // ============================================
  // Data Deletion (Right to Erasure)
  // ============================================

  /**
   * Request account deletion
   */
  async requestAccountDeletion(
    userId: string,
    type: DeletionType,
    reason?: string,
    selectiveData?: Record<string, boolean>
  ): Promise<DataDeletionRequest> {
    const request = await this.safetyRepo.createDataDeletionRequest(
      userId,
      type,
      reason,
      selectiveData
    );

    // Send confirmation email
    // Would implement email notification

    logger.info(`Account deletion requested for user ${userId}: ${request.id}`);

    return request;
  }

  /**
   * Cancel deletion request (within waiting period)
   */
  async cancelDeletionRequest(
    userId: string,
    requestId: string
  ): Promise<void> {
    // Would implement cancellation logic
    logger.info(`Deletion request cancelled for user ${userId}: ${requestId}`);
  }

  /**
   * Process deletion request (after waiting period)
   */
  async processDeletionRequest(requestId: string): Promise<void> {
    // Would be called by scheduled job after 30-day waiting period
    // Implementation would delete/anonymize user data based on request type
    logger.info(`Processing deletion request: ${requestId}`);
  }

  /**
   * Anonymize user data instead of full deletion
   */
  async anonymizeUserData(userId: string): Promise<void> {
    // Replace PII with anonymized data
    const anonymousEmail = `deleted_${crypto.randomBytes(8).toString('hex')}@deleted.user`;
    const anonymousName = 'Deleted User';

    // Update user record
    await this.userRepo.anonymize(userId, {
      email: anonymousEmail,
      firstName: anonymousName,
      lastName: undefined,
      phone: undefined,
    });

    // Delete profile data
    await this.profileRepo.deleteByUserId(userId);

    // Delete photos
    // Would implement photo deletion

    logger.info(`User data anonymized: ${userId}`);
  }

  // ============================================
  // Consent Management
  // ============================================

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    consentType: string,
    version: string,
    consented: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    const record = await this.safetyRepo.recordConsent(
      userId,
      consentType,
      version,
      consented,
      ipAddress,
      userAgent
    );

    // Update privacy settings based on consent type
    if (consentType === 'marketing') {
      await this.safetyRepo.updatePrivacySettings(userId, {
        marketing_consent: consented,
      });
    } else if (consentType === 'personalization') {
      await this.safetyRepo.updatePrivacySettings(userId, {
        personalization_consent: consented,
      });
    } else if (consentType === 'third_party') {
      await this.safetyRepo.updatePrivacySettings(userId, {
        third_party_sharing_consent: consented,
      });
    }

    logger.info(`Consent recorded for user ${userId}: ${consentType}=${consented}`);

    return record;
  }

  /**
   * Get required consents for user
   */
  async getRequiredConsents(userId: string): Promise<{
    type: string;
    required: boolean;
    currentVersion: string;
    userConsented: boolean;
    userVersion?: string;
  }[]> {
    // Return list of consents that need to be accepted
    const consents = [
      { type: 'terms_of_service', required: true, currentVersion: '2.0' },
      { type: 'privacy_policy', required: true, currentVersion: '2.0' },
      { type: 'marketing', required: false, currentVersion: '1.0' },
      { type: 'personalization', required: false, currentVersion: '1.0' },
      { type: 'third_party', required: false, currentVersion: '1.0' },
    ];

    // Would check user's consent records and return status
    return consents.map(c => ({
      ...c,
      userConsented: false, // Would check actual consent status
      userVersion: undefined,
    }));
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async handleIncognitoModeChange(
    userId: string,
    enabled: boolean
  ): Promise<void> {
    if (enabled) {
      // Hide from all users
      // Remove from discovery
      // etc.
    } else {
      // Restore visibility
    }
  }
}
