/**
 * Safety Service
 * Handles user safety features including blocking, reporting, and security settings
 */

import { httpClient } from './api/httpClient';

export interface SecuritySettings {
  twoFactorEnabled?: boolean;
  loginNotifications?: boolean;
  incognitoMode?: boolean;
  hideLastActive?: boolean;
  [key: string]: any;
}

export interface VerificationStatus {
  photoVerified?: boolean;
  phoneVerified?: boolean;
  emailVerified?: boolean;
  idVerified?: boolean;
}

export interface ReportUserParams {
  userId: string;
  reportType: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

class SafetyService {
  /**
   * Get user's security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    try {
      const response = await httpClient.get('/safety/security-settings');
      return response.data;
    } catch (error) {
      console.error('Failed to get security settings:', error);
      // Return default settings on error
      return {
        twoFactorEnabled: false,
        loginNotifications: true,
        incognitoMode: false,
        hideLastActive: false,
      };
    }
  }

  /**
   * Update user's security settings
   */
  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void> {
    try {
      await httpClient.put('/safety/security-settings', settings);
    } catch (error) {
      console.error('Failed to update security settings:', error);
      throw error;
    }
  }

  /**
   * Get user's verification status
   */
  async getVerificationStatus(): Promise<VerificationStatus> {
    try {
      const response = await httpClient.get('/safety/verification-status');
      return response.data;
    } catch (error) {
      console.error('Failed to get verification status:', error);
      // Return default status on error
      return {
        photoVerified: false,
        phoneVerified: false,
        emailVerified: false,
        idVerified: false,
      };
    }
  }

  /**
   * Report a user
   */
  async reportUser(params: ReportUserParams): Promise<void> {
    try {
      await httpClient.post('/safety/reports', {
        reportedUserId: params.userId,
        type: params.reportType,
        description: params.description,
        severity: params.severity,
        timestamp: new Date().toISOString(),
      });
      console.log('User reported successfully:', params.userId);
    } catch (error) {
      console.error('Failed to report user:', error);
      throw error;
    }
  }

  /**
   * Block a user
   */
  async blockUser(userId: string, reason?: string): Promise<void> {
    try {
      await httpClient.post('/safety/blocks', {
        blockedUserId: userId,
        reason: reason || 'User blocked',
        timestamp: new Date().toISOString(),
      });
      console.log('User blocked successfully:', userId);
    } catch (error) {
      console.error('Failed to block user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(userId: string): Promise<void> {
    try {
      await httpClient.delete(`/safety/blocks/${userId}`);
      console.log('User unblocked successfully:', userId);
    } catch (error) {
      console.error('Failed to unblock user:', error);
      throw error;
    }
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<any[]> {
    try {
      const response = await httpClient.get('/safety/blocks');
      return response.data.blockedUsers || [];
    } catch (error) {
      console.error('Failed to get blocked users:', error);
      return [];
    }
  }

  /**
   * Check if a user is blocked
   */
  async isUserBlocked(userId: string): Promise<boolean> {
    try {
      const response = await httpClient.get(`/safety/blocks/${userId}/status`);
      return response.data.isBlocked || false;
    } catch (error) {
      console.error('Failed to check if user is blocked:', error);
      return false;
    }
  }

  /**
   * Get safety resources and tips
   */
  async getSafetyResources(): Promise<any[]> {
    try {
      const response = await httpClient.get('/safety/resources');
      return response.data.resources || [];
    } catch (error) {
      console.error('Failed to get safety resources:', error);
      return [];
    }
  }

  /**
   * Update emergency contacts
   */
  async updateEmergencyContacts(contacts: any[]): Promise<void> {
    try {
      await httpClient.put('/safety/emergency-contacts', { contacts });
      console.log('Emergency contacts updated successfully');
    } catch (error) {
      console.error('Failed to update emergency contacts:', error);
      throw error;
    }
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(): Promise<any[]> {
    try {
      const response = await httpClient.get('/safety/emergency-contacts');
      return response.data.contacts || [];
    } catch (error) {
      console.error('Failed to get emergency contacts:', error);
      return [];
    }
  }
}

export const safetyService = new SafetyService();
export default safetyService;
