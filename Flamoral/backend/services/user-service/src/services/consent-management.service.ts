import { Knex } from 'knex';
import logger from '../utils/logger';

interface ConsentRecord {
  id: string;
  user_id: string;
  consent_type: string;
  consent_given: boolean;
  consent_version: string;
  consent_text: string;
  given_at: Date;
  ip_address?: string;
  user_agent?: string;
  withdrawn_at?: Date;
}

interface ConsentType {
  type: string;
  required: boolean;
  version: string;
  description: string;
  category: 'essential' | 'functional' | 'analytics' | 'marketing';
}

/**
 * Consent Management Service
 * Manages user consents for GDPR compliance (Article 7)
 */
export class ConsentManagementService {
  private db: Knex;

  // Define all consent types
  private readonly CONSENT_TYPES: ConsentType[] = [
    {
      type: 'terms_of_service',
      required: true,
      version: '1.0',
      description: 'Terms of Service acceptance',
      category: 'essential',
    },
    {
      type: 'privacy_policy',
      required: true,
      version: '1.0',
      description: 'Privacy Policy acceptance',
      category: 'essential',
    },
    {
      type: 'data_processing',
      required: true,
      version: '1.0',
      description: 'Consent to process personal data for core service functionality',
      category: 'essential',
    },
    {
      type: 'profile_visibility',
      required: true,
      version: '1.0',
      description: 'Consent to show profile to other users',
      category: 'essential',
    },
    {
      type: 'location_data',
      required: false,
      version: '1.0',
      description: 'Consent to collect and process location data',
      category: 'functional',
    },
    {
      type: 'push_notifications',
      required: false,
      version: '1.0',
      description: 'Consent to receive push notifications',
      category: 'functional',
    },
    {
      type: 'email_notifications',
      required: false,
      version: '1.0',
      description: 'Consent to receive email notifications',
      category: 'functional',
    },
    {
      type: 'analytics',
      required: false,
      version: '1.0',
      description: 'Consent to collect analytics and usage data',
      category: 'analytics',
    },
    {
      type: 'personalized_ads',
      required: false,
      version: '1.0',
      description: 'Consent to show personalized advertisements',
      category: 'marketing',
    },
    {
      type: 'marketing_emails',
      required: false,
      version: '1.0',
      description: 'Consent to receive marketing emails',
      category: 'marketing',
    },
    {
      type: 'third_party_sharing',
      required: false,
      version: '1.0',
      description: 'Consent to share data with third-party partners',
      category: 'marketing',
    },
    {
      type: 'data_retention',
      required: true,
      version: '1.0',
      description: 'Consent to data retention policy',
      category: 'essential',
    },
  ];

  constructor(database: Knex) {
    this.db = database;
  }

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string,
    consentType: string,
    consentGiven: boolean,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    try {
      const consentTypeInfo = this.CONSENT_TYPES.find(ct => ct.type === consentType);

      if (!consentTypeInfo) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      // Check if required consent is being denied
      if (consentTypeInfo.required && !consentGiven) {
        throw new Error(`Consent type ${consentType} is required and cannot be denied`);
      }

      // Get existing consent
      const existingConsent = await this.db('gdpr_consent')
        .where({ user_id: userId, consent_type: consentType })
        .orderBy('given_at', 'desc')
        .first();

      // If consent hasn't changed, don't create duplicate
      if (existingConsent && existingConsent.consent_given === consentGiven) {
        return existingConsent;
      }

      // Record new consent
      const [consent] = await this.db('gdpr_consent')
        .insert({
          user_id: userId,
          consent_type: consentType,
          consent_given: consentGiven,
          consent_version: consentTypeInfo.version,
          consent_text: consentTypeInfo.description,
          given_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
          withdrawn_at: consentGiven ? null : new Date(),
        })
        .returning('*');

      logger.info(`Consent ${consentGiven ? 'given' : 'withdrawn'} for user ${userId}: ${consentType}`);

      return consent;
    } catch (error) {
      logger.error(`Failed to record consent: ${error}`);
      throw error;
    }
  }

  /**
   * Bulk record consents (for registration)
   */
  async recordBulkConsents(
    userId: string,
    consents: Record<string, boolean>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord[]> {
    try {
      // Validate all required consents are present and true
      const requiredConsents = this.CONSENT_TYPES.filter(ct => ct.required);

      for (const required of requiredConsents) {
        if (!consents[required.type]) {
          throw new Error(`Required consent missing: ${required.type}`);
        }
      }

      const results: ConsentRecord[] = [];

      for (const [consentType, consentGiven] of Object.entries(consents)) {
        const result = await this.recordConsent(
          userId,
          consentType,
          consentGiven,
          ipAddress,
          userAgent
        );
        results.push(result);
      }

      logger.info(`Recorded ${results.length} consents for user ${userId}`);

      return results;
    } catch (error) {
      logger.error(`Failed to record bulk consents: ${error}`);
      throw error;
    }
  }

  /**
   * Get user's current consents
   */
  async getUserConsents(userId: string): Promise<Record<string, ConsentRecord | null>> {
    try {
      const consents: Record<string, ConsentRecord | null> = {};

      // Get latest consent for each type
      for (const consentType of this.CONSENT_TYPES) {
        const consent = await this.db('gdpr_consent')
          .where({ user_id: userId, consent_type: consentType.type })
          .orderBy('given_at', 'desc')
          .first();

        consents[consentType.type] = consent || null;
      }

      return consents;
    } catch (error) {
      logger.error(`Failed to get user consents: ${error}`);
      throw error;
    }
  }

  /**
   * Get consent history for a user
   */
  async getConsentHistory(userId: string, consentType?: string): Promise<ConsentRecord[]> {
    try {
      let query = this.db('gdpr_consent')
        .where({ user_id: userId })
        .orderBy('given_at', 'desc');

      if (consentType) {
        query = query.where({ consent_type: consentType });
      }

      return query.select('*');
    } catch (error) {
      logger.error(`Failed to get consent history: ${error}`);
      throw error;
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    userId: string,
    consentType: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    try {
      const consentTypeInfo = this.CONSENT_TYPES.find(ct => ct.type === consentType);

      if (!consentTypeInfo) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      if (consentTypeInfo.required) {
        throw new Error(`Cannot withdraw required consent: ${consentType}`);
      }

      return this.recordConsent(userId, consentType, false, ipAddress, userAgent);
    } catch (error) {
      logger.error(`Failed to withdraw consent: ${error}`);
      throw error;
    }
  }

  /**
   * Check if user has given specific consent
   */
  async hasConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      const consent = await this.db('gdpr_consent')
        .where({ user_id: userId, consent_type: consentType })
        .orderBy('given_at', 'desc')
        .first();

      return consent ? consent.consent_given : false;
    } catch (error) {
      logger.error(`Failed to check consent: ${error}`);
      return false;
    }
  }

  /**
   * Check if user has all required consents
   */
  async hasAllRequiredConsents(userId: string): Promise<boolean> {
    try {
      const requiredConsents = this.CONSENT_TYPES.filter(ct => ct.required);

      for (const required of requiredConsents) {
        const hasConsent = await this.hasConsent(userId, required.type);
        if (!hasConsent) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error(`Failed to check required consents: ${error}`);
      return false;
    }
  }

  /**
   * Get all consent types with user's status
   */
  async getAllConsentTypes(userId?: string): Promise<Array<ConsentType & { userConsent?: ConsentRecord }>> {
    try {
      const result: Array<ConsentType & { userConsent?: ConsentRecord }> = [];

      for (const consentType of this.CONSENT_TYPES) {
        const item: ConsentType & { userConsent?: ConsentRecord } = { ...consentType };

        if (userId) {
          const consent = await this.db('gdpr_consent')
            .where({ user_id: userId, consent_type: consentType.type })
            .orderBy('given_at', 'desc')
            .first();

          item.userConsent = consent;
        }

        result.push(item);
      }

      return result;
    } catch (error) {
      logger.error(`Failed to get all consent types: ${error}`);
      throw error;
    }
  }

  /**
   * Update consent version (when terms change)
   */
  async updateConsentVersion(consentType: string, newVersion: string): Promise<void> {
    try {
      const consentTypeIndex = this.CONSENT_TYPES.findIndex(ct => ct.type === consentType);

      if (consentTypeIndex === -1) {
        throw new Error(`Invalid consent type: ${consentType}`);
      }

      this.CONSENT_TYPES[consentTypeIndex].version = newVersion;

      logger.info(`Updated consent version for ${consentType} to ${newVersion}`);
    } catch (error) {
      logger.error(`Failed to update consent version: ${error}`);
      throw error;
    }
  }

  /**
   * Check if user needs to re-consent (version changed)
   */
  async needsReConsent(userId: string, consentType: string): Promise<boolean> {
    try {
      const consentTypeInfo = this.CONSENT_TYPES.find(ct => ct.type === consentType);
      if (!consentTypeInfo) {
        return false;
      }

      const consent = await this.db('gdpr_consent')
        .where({ user_id: userId, consent_type: consentType })
        .orderBy('given_at', 'desc')
        .first();

      if (!consent) {
        return true;
      }

      return consent.consent_version !== consentTypeInfo.version;
    } catch (error) {
      logger.error(`Failed to check re-consent need: ${error}`);
      return false;
    }
  }

  /**
   * Export consent data for GDPR data export
   */
  async exportConsentData(userId: string): Promise<any> {
    try {
      const consents = await this.db('gdpr_consent')
        .where({ user_id: userId })
        .orderBy('given_at', 'desc')
        .select('*');

      return {
        consents,
        consentTypes: this.CONSENT_TYPES,
        exportedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to export consent data: ${error}`);
      throw error;
    }
  }

  /**
   * Get consent statistics (for admin dashboard)
   */
  async getConsentStatistics(): Promise<Record<string, any>> {
    try {
      const stats: Record<string, any> = {};

      for (const consentType of this.CONSENT_TYPES) {
        const result = await this.db('gdpr_consent')
          .where({ consent_type: consentType.type })
          .whereRaw('given_at = (SELECT MAX(given_at) FROM gdpr_consent gc2 WHERE gc2.user_id = gdpr_consent.user_id AND gc2.consent_type = gdpr_consent.consent_type)')
          .select(
            this.db.raw('COUNT(CASE WHEN consent_given = true THEN 1 END) as given_count'),
            this.db.raw('COUNT(CASE WHEN consent_given = false THEN 1 END) as withdrawn_count'),
            this.db.raw('COUNT(*) as total_count')
          )
          .first();

        stats[consentType.type] = {
          ...consentType,
          ...result,
        };
      }

      return stats;
    } catch (error) {
      logger.error(`Failed to get consent statistics: ${error}`);
      throw error;
    }
  }
}
