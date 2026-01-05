import { Knex } from 'knex';

import logger from '../utils/logger';

interface CCPAOptOut {
  id: string;
  user_id: string;
  opt_out_type: 'do_not_sell' | 'do_not_share' | 'limit_sensitive_data';
  opted_out: boolean;
  opted_out_at?: Date;
  opted_in_at?: Date;
  ip_address?: string;
  user_agent?: string;
}

interface DataAccessLog {
  id: string;
  user_id: string;
  access_type: 'read' | 'write' | 'delete' | 'export';
  data_category: string;
  accessed_by: string;
  accessed_at: Date;
  ip_address?: string;
  purpose: string;
}

/**
 * CCPA Compliance Service
 * California Consumer Privacy Act compliance
 */
export class CCPAComplianceService {
  private db: Knex;

  // CCPA data categories
  private readonly DATA_CATEGORIES = {
    IDENTIFIERS: 'identifiers',
    PERSONAL_INFO: 'personal_information',
    PROTECTED_CLASSIFICATIONS: 'protected_classifications',
    COMMERCIAL_INFO: 'commercial_information',
    BIOMETRIC_INFO: 'biometric_information',
    INTERNET_ACTIVITY: 'internet_activity',
    GEOLOCATION: 'geolocation_data',
    AUDIO_VISUAL: 'audio_visual_information',
    PROFESSIONAL_INFO: 'professional_information',
    EDUCATION_INFO: 'education_information',
    INFERENCES: 'inferences',
  };

  constructor(database: Knex) {
    this.db = database;
  }

  /**
   * Record "Do Not Sell My Personal Information" opt-out
   */
  async optOutOfSale(userId: string, ipAddress?: string, userAgent?: string): Promise<CCPAOptOut> {
    try {
      const [optOut] = await this.db('ccpa_opt_outs')
        .insert({
          user_id: userId,
          opt_out_type: 'do_not_sell',
          opted_out: true,
          opted_out_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .onConflict(['user_id', 'opt_out_type'])
        .merge({
          opted_out: true,
          opted_out_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .returning('*');

      logger.info(`User ${userId} opted out of data sale`);

      return optOut;
    } catch (error) {
      logger.error(`Failed to record opt-out: ${error}`);
      throw error;
    }
  }

  /**
   * Record "Do Not Share My Personal Information" opt-out
   */
  async optOutOfSharing(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CCPAOptOut> {
    try {
      const [optOut] = await this.db('ccpa_opt_outs')
        .insert({
          user_id: userId,
          opt_out_type: 'do_not_share',
          opted_out: true,
          opted_out_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .onConflict(['user_id', 'opt_out_type'])
        .merge({
          opted_out: true,
          opted_out_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .returning('*');

      logger.info(`User ${userId} opted out of data sharing`);

      return optOut;
    } catch (error) {
      logger.error(`Failed to record opt-out: ${error}`);
      throw error;
    }
  }

  /**
   * Record "Limit Use of Sensitive Personal Information" opt-out
   */
  async limitSensitiveDataUse(
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CCPAOptOut> {
    try {
      const [optOut] = await this.db('ccpa_opt_outs')
        .insert({
          user_id: userId,
          opt_out_type: 'limit_sensitive_data',
          opted_out: true,
          opted_out_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .onConflict(['user_id', 'opt_out_type'])
        .merge({
          opted_out: true,
          opted_out_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .returning('*');

      logger.info(`User ${userId} limited sensitive data use`);

      return optOut;
    } catch (error) {
      logger.error(`Failed to record opt-out: ${error}`);
      throw error;
    }
  }

  /**
   * Opt back in to data sale/sharing
   */
  async optInToDataUse(
    userId: string,
    optOutType: 'do_not_sell' | 'do_not_share' | 'limit_sensitive_data',
    ipAddress?: string,
    userAgent?: string
  ): Promise<CCPAOptOut> {
    try {
      const [optOut] = await this.db('ccpa_opt_outs')
        .insert({
          user_id: userId,
          opt_out_type: optOutType,
          opted_out: false,
          opted_in_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .onConflict(['user_id', 'opt_out_type'])
        .merge({
          opted_out: false,
          opted_in_at: new Date(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .returning('*');

      logger.info(`User ${userId} opted in to ${optOutType}`);

      return optOut;
    } catch (error) {
      logger.error(`Failed to record opt-in: ${error}`);
      throw error;
    }
  }

  /**
   * Get user's CCPA opt-out preferences
   */
  async getUserOptOuts(userId: string): Promise<Record<string, CCPAOptOut | null>> {
    try {
      const optOuts = await this.db('ccpa_opt_outs').where({ user_id: userId }).select('*');

      const result: Record<string, CCPAOptOut | null> = {
        do_not_sell: null,
        do_not_share: null,
        limit_sensitive_data: null,
      };

      optOuts.forEach((optOut) => {
        result[optOut.opt_out_type] = optOut;
      });

      return result;
    } catch (error) {
      logger.error(`Failed to get user opt-outs: ${error}`);
      throw error;
    }
  }

  /**
   * Check if user has opted out of specific type
   */
  async hasOptedOut(
    userId: string,
    optOutType: 'do_not_sell' | 'do_not_share' | 'limit_sensitive_data'
  ): Promise<boolean> {
    try {
      const optOut = await this.db('ccpa_opt_outs')
        .where({ user_id: userId, opt_out_type: optOutType })
        .first();

      return optOut ? optOut.opted_out : false;
    } catch (error) {
      logger.error(`Failed to check opt-out status: ${error}`);
      return false;
    }
  }

  /**
   * Log data access (CCPA requires tracking)
   */
  async logDataAccess(
    userId: string,
    accessType: 'read' | 'write' | 'delete' | 'export',
    dataCategory: string,
    accessedBy: string,
    purpose: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await this.db('data_access_logs').insert({
        user_id: userId,
        access_type: accessType,
        data_category: dataCategory,
        accessed_by: accessedBy,
        accessed_at: new Date(),
        ip_address: ipAddress,
        purpose: purpose,
      });

      logger.debug(`Logged data access: ${accessType} ${dataCategory} for user ${userId}`);
    } catch (error) {
      logger.error(`Failed to log data access: ${error}`);
      // Don't throw - logging failure shouldn't block operations
    }
  }

  /**
   * Get data access logs for user
   */
  async getDataAccessLogs(
    userId: string,
    limit: number = 100,
    offset: number = 0
  ): Promise<{ logs: DataAccessLog[]; total: number }> {
    try {
      const logs = await this.db('data_access_logs')
        .where({ user_id: userId })
        .orderBy('accessed_at', 'desc')
        .limit(limit)
        .offset(offset)
        .select('*');

      const total = await this.db('data_access_logs')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      return {
        logs,
        total: parseInt((total?.count as string) || '0'),
      };
    } catch (error) {
      logger.error(`Failed to get data access logs: ${error}`);
      throw error;
    }
  }

  /**
   * Get CCPA-compliant data disclosure
   * Lists what data is collected and how it's used
   */
  async getDataDisclosure(userId: string): Promise<any> {
    try {
      const disclosure = {
        personalInformationCollected: [
          {
            category: this.DATA_CATEGORIES.IDENTIFIERS,
            examples: ['Name, email, phone number, user ID'],
            purposes: ['Account creation', 'Communication', 'Service delivery'],
            sources: ['Directly from user', 'User device'],
            retention: '2 years after account deletion',
            thirdParties: ['Email service provider', 'SMS provider'],
          },
          {
            category: this.DATA_CATEGORIES.PERSONAL_INFO,
            examples: ['Profile information', 'Photos', 'Bio', 'Preferences'],
            purposes: ['Profile creation', 'Matching algorithm', 'Service personalization'],
            sources: ['Directly from user'],
            retention: '2 years after account deletion',
            thirdParties: ['Cloud storage provider', 'CDN'],
          },
          {
            category: this.DATA_CATEGORIES.PROTECTED_CLASSIFICATIONS,
            examples: ['Age', 'Gender', 'Sexual orientation'],
            purposes: ['Age verification', 'Matching preferences', 'Legal compliance'],
            sources: ['Directly from user'],
            retention: '2 years after account deletion',
            thirdParties: ['None'],
          },
          {
            category: this.DATA_CATEGORIES.COMMERCIAL_INFO,
            examples: ['Subscription history', 'Purchase history', 'Payment information'],
            purposes: ['Payment processing', 'Subscription management', 'Customer support'],
            sources: ['Directly from user', 'Payment processor'],
            retention: '7 years (tax compliance)',
            thirdParties: ['Payment processor', 'Accounting software'],
          },
          {
            category: this.DATA_CATEGORIES.INTERNET_ACTIVITY,
            examples: ['App usage', 'Clicks', 'Swipes', 'Messages sent'],
            purposes: ['Service improvement', 'Analytics', 'Fraud prevention'],
            sources: ['User device', 'App usage'],
            retention: '1 year',
            thirdParties: ['Analytics provider'],
          },
          {
            category: this.DATA_CATEGORIES.GEOLOCATION,
            examples: ['Approximate location', 'GPS coordinates'],
            purposes: ['Location-based matching', 'Distance calculation'],
            sources: ['User device'],
            retention: '90 days',
            thirdParties: ['Maps provider'],
          },
          {
            category: this.DATA_CATEGORIES.INFERENCES,
            examples: ['Matching preferences', 'Personality insights', 'Compatibility scores'],
            purposes: ['Matching algorithm', 'Service personalization'],
            sources: ['Derived from user behavior'],
            retention: '2 years',
            thirdParties: ['None'],
          },
        ],
        dataSharing: {
          sold: false,
          shared: true,
          sharedWith: [
            {
              party: 'Cloud Service Provider',
              purpose: 'Data storage and hosting',
              categories: ['All categories'],
            },
            {
              party: 'Payment Processor',
              purpose: 'Payment processing',
              categories: [this.DATA_CATEGORIES.IDENTIFIERS, this.DATA_CATEGORIES.COMMERCIAL_INFO],
            },
            {
              party: 'Analytics Provider',
              purpose: 'Service improvement',
              categories: [this.DATA_CATEGORIES.INTERNET_ACTIVITY],
            },
          ],
        },
        userRights: {
          rightToKnow: 'Request information about data collected',
          rightToDelete: 'Request deletion of personal information',
          rightToOptOut: 'Opt-out of sale/sharing of personal information',
          rightToCorrect: 'Request correction of inaccurate information',
          rightToLimit: 'Limit use of sensitive personal information',
          rightToNonDiscrimination: 'Equal service regardless of privacy choices',
        },
        generatedAt: new Date().toISOString(),
      };

      // Add user-specific opt-out status
      const optOuts = await this.getUserOptOuts(userId);
      disclosure['userOptOuts'] = optOuts;

      return disclosure;
    } catch (error) {
      logger.error(`Failed to get data disclosure: ${error}`);
      throw error;
    }
  }

  /**
   * Clean up old access logs (keep for 2 years per CCPA)
   */
  async cleanupOldAccessLogs(): Promise<void> {
    try {
      const twoYearsAgo = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);

      const deleted = await this.db('data_access_logs')
        .where('accessed_at', '<', twoYearsAgo)
        .delete();

      logger.info(`Cleaned up ${deleted} old access logs`);
    } catch (error) {
      logger.error(`Failed to cleanup old access logs: ${error}`);
      throw error;
    }
  }

  /**
   * Get CCPA compliance status for user
   */
  async getComplianceStatus(userId: string): Promise<any> {
    try {
      const optOuts = await this.getUserOptOuts(userId);
      const accessLogs = await this.getDataAccessLogs(userId, 10, 0);

      return {
        userId,
        optOutStatus: {
          doNotSell: optOuts.do_not_sell?.opted_out || false,
          doNotShare: optOuts.do_not_share?.opted_out || false,
          limitSensitiveData: optOuts.limit_sensitive_data?.opted_out || false,
        },
        recentAccessLogs: accessLogs.logs,
        totalAccessLogs: accessLogs.total,
        rightsExercised: {
          optOutRequests: Object.values(optOuts).filter((o) => o?.opted_out).length,
          lastUpdated: Math.max(
            ...Object.values(optOuts)
              .filter((o) => o?.opted_out_at)
              .map((o) => o.opted_out_at.getTime())
          ),
        },
        complianceVersion: '1.0',
        lastReviewed: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Failed to get compliance status: ${error}`);
      throw error;
    }
  }

  /**
   * Handle "Do Not Sell or Share My Personal Information" link
   * Returns current status and provides link to manage preferences
   */
  async handleDoNotSellLink(userId: string): Promise<any> {
    try {
      const optOuts = await this.getUserOptOuts(userId);

      return {
        currentStatus: {
          doNotSell: optOuts.do_not_sell?.opted_out || false,
          doNotShare: optOuts.do_not_share?.opted_out || false,
        },
        message:
          'You have the right to opt-out of the sale or sharing of your personal information.',
        actions: {
          optOut: '/api/privacy/ccpa/opt-out',
          optIn: '/api/privacy/ccpa/opt-in',
          viewData: '/api/privacy/ccpa/data-disclosure',
        },
        lastUpdated: optOuts.do_not_sell?.opted_out_at || optOuts.do_not_sell?.opted_in_at,
      };
    } catch (error) {
      logger.error(`Failed to handle do not sell link: ${error}`);
      throw error;
    }
  }
}
