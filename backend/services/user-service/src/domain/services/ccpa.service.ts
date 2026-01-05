import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';

export interface OptOutRequest {
  userId: string;
  optOutType: 'do_not_sell' | 'do_not_share' | 'limit_use_sensitive_data';
  optedOut: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataAccessRequest {
  userId: string;
  categories: string[];
  ipAddress?: string;
}

/**
 * CCPA Compliance Service
 * California Consumer Privacy Act compliance
 */
export class CCPAService {
  /**
   * Record opt-out preference
   */
  async recordOptOut(request: OptOutRequest): Promise<void> {
    try {
      // Check if preference exists
      const existing = await db('ccpa_opt_outs')
        .where({
          user_id: request.userId,
          opt_out_type: request.optOutType,
        })
        .first();

      if (existing) {
        // Update existing preference
        await db('ccpa_opt_outs')
          .where({ id: existing.id })
          .update({
            opted_out: request.optedOut,
            opted_out_at: request.optedOut ? new Date() : existing.opted_out_at,
            opted_in_at: !request.optedOut ? new Date() : existing.opted_in_at,
            ip_address: request.ipAddress,
            user_agent: request.userAgent,
          });
      } else {
        // Create new preference
        await db('ccpa_opt_outs').insert({
          user_id: request.userId,
          opt_out_type: request.optOutType,
          opted_out: request.optedOut,
          opted_out_at: request.optedOut ? new Date() : null,
          opted_in_at: !request.optedOut ? new Date() : null,
          ip_address: request.ipAddress,
          user_agent: request.userAgent,
        });
      }

      logger.info(
        `CCPA opt-out recorded for user ${request.userId}: ${request.optOutType} = ${request.optedOut}`
      );
    } catch (error) {
      logger.error('Error recording opt-out:', error);
      throw new Error('Failed to record opt-out preference');
    }
  }

  /**
   * Get user's opt-out preferences
   */
  async getOptOutPreferences(userId: string): Promise<any[]> {
    try {
      const preferences = await db('ccpa_opt_outs').where({ user_id: userId }).select('*');

      // Ensure all opt-out types are represented
      const optOutTypes = ['do_not_sell', 'do_not_share', 'limit_use_sensitive_data'];
      const result = optOutTypes.map((type) => {
        const pref = preferences.find((p) => p.opt_out_type === type);
        return {
          optOutType: type,
          optedOut: pref?.opted_out || false,
          optedOutAt: pref?.opted_out_at,
          optedInAt: pref?.opted_in_at,
        };
      });

      return result;
    } catch (error) {
      logger.error('Error getting opt-out preferences:', error);
      throw new Error('Failed to get opt-out preferences');
    }
  }

  /**
   * Check if user has opted out of a specific type
   */
  async hasOptedOut(userId: string, optOutType: string): Promise<boolean> {
    try {
      const preference = await db('ccpa_opt_outs')
        .where({
          user_id: userId,
          opt_out_type: optOutType,
        })
        .first();

      return preference?.opted_out || false;
    } catch (error) {
      logger.error('Error checking opt-out status:', error);
      return false; // Default to not opted out to be safe
    }
  }

  /**
   * Get categories of personal information collected
   */
  async getDataCategories(userId: string): Promise<any> {
    try {
      const user = await db('users').where({ id: userId }).first();
      if (!user) {
        throw new Error('User not found');
      }

      return {
        categories: [
          {
            category: 'Identifiers',
            description: 'Email address, name, unique identifiers',
            examples: ['Email', 'User ID', 'Device ID'],
            collected: true,
            sources: ['Directly from user', 'Automatically collected'],
            purposes: ['Account creation', 'Authentication', 'Communication'],
            sharedWith: ['Service providers', 'Analytics platforms'],
          },
          {
            category: 'Personal Information',
            description: 'Name, contact information, profile details',
            examples: ['First name', 'Last name', 'Phone number', 'Date of birth'],
            collected: true,
            sources: ['Directly from user'],
            purposes: ['Profile creation', 'Age verification', 'Matching'],
            sharedWith: ['Other users (limited)', 'Service providers'],
          },
          {
            category: 'Protected Classifications',
            description: 'Age, gender, sexual orientation',
            examples: ['Age', 'Gender', 'Sexual preference'],
            collected: true,
            sources: ['Directly from user'],
            purposes: ['Matching algorithm', 'User preferences'],
            sharedWith: ['Other users (with consent)', 'Matching algorithm'],
          },
          {
            category: 'Commercial Information',
            description: 'Purchase history, subscription details',
            examples: ['Subscription tier', 'Purchase history', 'Payment method'],
            collected: true,
            sources: ['Transaction data'],
            purposes: ['Billing', 'Service provision', 'Customer support'],
            sharedWith: ['Payment processors', 'Service providers'],
          },
          {
            category: 'Biometric Information',
            description: 'Photos for verification purposes',
            examples: ['Profile photos', 'Verification photos'],
            collected: true,
            sources: ['Directly from user'],
            purposes: ['Profile display', 'Identity verification', 'Safety'],
            sharedWith: ['Other users', 'Verification services', 'Content moderation'],
          },
          {
            category: 'Internet/Network Activity',
            description: 'Browsing history, interactions with the app',
            examples: ['Swipes', 'Matches', 'Messages', 'App usage patterns'],
            collected: true,
            sources: ['Automatically collected'],
            purposes: ['Matching algorithm', 'User experience', 'Analytics'],
            sharedWith: ['Analytics platforms', 'Service providers'],
          },
          {
            category: 'Geolocation Data',
            description: 'Approximate location',
            examples: ['City', 'Distance from other users'],
            collected: true,
            sources: ['Device location services'],
            purposes: ['Location-based matching', 'Safety features'],
            sharedWith: ['Other users (approximate)', 'Service providers'],
          },
          {
            category: 'Sensory Information',
            description: 'Photos and videos',
            examples: ['Profile photos', 'Shared media'],
            collected: true,
            sources: ['Directly from user'],
            purposes: ['Profile display', 'Communication'],
            sharedWith: ['Other users', 'Content moderation services'],
          },
          {
            category: 'Inferences',
            description: 'Preferences and characteristics derived from user behavior',
            examples: ['Match preferences', 'Behavior patterns', 'Interests'],
            collected: true,
            sources: ['Derived from user activity'],
            purposes: ['Personalization', 'Matching algorithm', 'Recommendations'],
            sharedWith: ['Service providers'],
          },
        ],
        disclaimer:
          'We do not sell your personal information to third parties. We may share data with service providers who help us operate the platform.',
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Error getting data categories:', error);
      throw new Error('Failed to get data categories');
    }
  }

  /**
   * Get information about data sharing practices
   */
  async getDataSharingInfo(userId: string): Promise<any> {
    try {
      // Check opt-out status
      const hasOptedOutOfSale = await this.hasOptedOut(userId, 'do_not_sell');
      const hasOptedOutOfSharing = await this.hasOptedOut(userId, 'do_not_share');

      return {
        doNotSellStatus: hasOptedOutOfSale ? 'Opted Out' : 'Active',
        doNotShareStatus: hasOptedOutOfSharing ? 'Opted Out' : 'Active',
        thirdParties: [
          {
            name: 'Analytics Providers',
            purpose: 'App analytics and usage tracking',
            dataShared: ['Usage patterns', 'Device information', 'App interactions'],
            optedOut: hasOptedOutOfSharing,
          },
          {
            name: 'Cloud Storage Providers',
            purpose: 'Data storage and hosting',
            dataShared: ['Photos', 'Profile data', 'Messages'],
            optedOut: false, // Essential service
          },
          {
            name: 'Payment Processors',
            purpose: 'Payment processing',
            dataShared: ['Payment information', 'Transaction details'],
            optedOut: false, // Essential service
          },
          {
            name: 'Content Moderation Services',
            purpose: 'Safety and content moderation',
            dataShared: ['Photos', 'Messages (flagged)', 'User reports'],
            optedOut: false, // Essential for safety
          },
          {
            name: 'Customer Support Tools',
            purpose: 'Customer support and communication',
            dataShared: ['Support tickets', 'User information', 'Communication history'],
            optedOut: false, // Essential service
          },
        ],
        salesDisclosure: {
          sellsPersonalInfo: false,
          disclosure:
            'We do not sell your personal information to third parties for monetary consideration.',
          sharesForTargetedAds: false,
          ageRange: 'We do not knowingly collect or share data from users under 16.',
        },
      };
    } catch (error) {
      logger.error('Error getting data sharing info:', error);
      throw new Error('Failed to get data sharing information');
    }
  }

  /**
   * Process CCPA data access request
   */
  async processDataAccessRequest(request: DataAccessRequest): Promise<any> {
    try {
      const userId = request.userId;
      const data: any = {
        requestedAt: new Date().toISOString(),
        userId,
        requestedCategories: request.categories,
        data: {},
      };

      // Collect requested data categories
      for (const category of request.categories) {
        switch (category) {
          case 'identifiers':
            const user = await db('users').where({ id: userId }).first();
            data.data.identifiers = {
              email: user?.email,
              userId: user?.id,
              phoneNumber: user?.phone_number,
            };
            break;

          case 'personal_information':
            const profile = await db('profiles').where({ user_id: userId }).first();
            const userInfo = await db('users').where({ id: userId }).first();
            data.data.personalInformation = {
              firstName: userInfo?.first_name,
              lastName: userInfo?.last_name,
              dateOfBirth: userInfo?.date_of_birth,
              gender: userInfo?.gender,
              bio: profile?.bio,
            };
            break;

          case 'commercial_information':
            const subscriptions = await db('subscriptions').where({ user_id: userId }).select('*');
            data.data.commercialInformation = {
              subscriptions: subscriptions.map((s) => ({
                tier: s.tier,
                status: s.status,
                startDate: s.start_date,
                endDate: s.end_date,
              })),
            };
            break;

          case 'activity_information':
            const swipeCount = await db('swipes')
              .where('swiper_id', userId)
              .count('* as count')
              .first();
            const matchCount = await db('matches')
              .where('user1_id', userId)
              .orWhere('user2_id', userId)
              .count('* as count')
              .first();
            data.data.activityInformation = {
              swipeCount: swipeCount?.count || 0,
              matchCount: matchCount?.count || 0,
            };
            break;

          case 'geolocation':
            const location = await db('profiles').where({ user_id: userId }).first();
            data.data.geolocation = {
              city: location?.city,
              state: location?.state,
              country: location?.country,
            };
            break;
        }
      }

      // Log the access request
      await db('data_access_logs').insert({
        user_id: userId,
        access_type: 'download_data',
        accessed_by: 'user',
        purpose: 'CCPA data access request',
        data_accessed: JSON.stringify({ categories: request.categories }),
        ip_address: request.ipAddress,
        accessed_at: new Date(),
      });

      return data;
    } catch (error) {
      logger.error('Error processing data access request:', error);
      throw new Error('Failed to process data access request');
    }
  }

  /**
   * Get user's CCPA rights information
   */
  async getUserRights(userId: string): Promise<any> {
    return {
      rights: [
        {
          right: 'Right to Know',
          description:
            'You have the right to know what personal information we collect, use, and share.',
          howToExercise: 'Request a copy of your data through the Privacy Dashboard',
        },
        {
          right: 'Right to Delete',
          description: 'You have the right to request deletion of your personal information.',
          howToExercise: 'Submit a deletion request through Account Settings',
        },
        {
          right: 'Right to Opt-Out',
          description:
            'You have the right to opt-out of the sale or sharing of your personal information.',
          howToExercise: 'Use the "Do Not Sell My Personal Information" toggle in Privacy Settings',
        },
        {
          right: 'Right to Non-Discrimination',
          description: 'We will not discriminate against you for exercising your CCPA rights.',
          howToExercise: 'Automatically protected',
        },
        {
          right: 'Right to Correct',
          description: 'You have the right to correct inaccurate personal information.',
          howToExercise: 'Update your information in Profile Settings',
        },
        {
          right: 'Right to Limit Use of Sensitive Data',
          description:
            'You have the right to limit the use of your sensitive personal information.',
          howToExercise: 'Use the privacy controls in Settings',
        },
      ],
      contactInfo: {
        email: 'privacy@flamoral.com',
        phone: '1-800-PRIVACY',
        address: 'Privacy Office, Flamoral Inc.',
      },
    };
  }

  /**
   * Verify if user is a California resident (for CCPA applicability)
   */
  async isCaliforniaResident(userId: string): Promise<boolean> {
    try {
      const profile = await db('profiles').where({ user_id: userId }).first();

      // Check if user's state is California
      if (profile?.state === 'CA' || profile?.state === 'California') {
        return true;
      }

      // Could also check IP address geolocation
      const recentLogin = await db('login_attempts')
        .where({ user_id: userId, successful: true })
        .orderBy('attempted_at', 'desc')
        .first();

      if (recentLogin?.location && recentLogin.location.includes('California')) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error checking California residency:', error);
      return false;
    }
  }

  /**
   * Generate CCPA disclosure report
   */
  async generateDisclosureReport(): Promise<any> {
    try {
      // Aggregate statistics (anonymized)
      const totalUsers = await db('users').count('* as count').first();
      const activeOptOuts = await db('ccpa_opt_outs')
        .where({ opted_out: true })
        .count('* as count')
        .first();

      const optOutsByType = await db('ccpa_opt_outs')
        .where({ opted_out: true })
        .select('opt_out_type')
        .count('* as count')
        .groupBy('opt_out_type');

      return {
        reportPeriod: {
          start: new Date(new Date().getFullYear(), 0, 1).toISOString(),
          end: new Date().toISOString(),
        },
        metrics: {
          totalUsers: totalUsers?.count || 0,
          activeOptOuts: activeOptOuts?.count || 0,
          optOutsByType: optOutsByType.map((row) => ({
            type: row.opt_out_type,
            count: row.count,
          })),
        },
        compliance: {
          dataInventoryComplete: true,
          privacyPolicyUpdated: true,
          optOutMechanismImplemented: true,
          consumerRequestProcessImplemented: true,
          dataProtectionMeasures: true,
        },
      };
    } catch (error) {
      logger.error('Error generating disclosure report:', error);
      throw new Error('Failed to generate disclosure report');
    }
  }
}
