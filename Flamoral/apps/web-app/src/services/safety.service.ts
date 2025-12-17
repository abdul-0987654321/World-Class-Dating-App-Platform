/**
 * Safety Service
 * Handles all safety, privacy, and security API calls
 */

import apiClient from './api.client';

// Types
export interface VerificationStatus {
  userId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  governmentIdVerified: boolean;
  selfieVerified: boolean;
  livenessVerified: boolean;
  videoVerified: boolean;
  socialMediaVerified: string[];
  biometricVerified: boolean;
  overallVerificationLevel: 'none' | 'basic' | 'standard' | 'enhanced' | 'premium';
  verificationScore: number;
}

export interface SecuritySettings {
  id: string;
  user_id: string;
  two_factor_enabled: boolean;
  two_factor_method: 'authenticator' | 'sms' | 'email' | null;
  login_alerts_enabled: boolean;
  new_device_alerts_enabled: boolean;
  suspicious_activity_alerts_enabled: boolean;
  allowed_login_countries: string[];
  trusted_devices: string[];
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  profile_visibility: 'public' | 'matches_only' | 'hidden';
  show_online_status: boolean;
  show_last_active: boolean;
  show_distance: boolean;
  show_age: boolean;
  allow_screenshots: boolean;
  incognito_mode: boolean;
  hide_from_search: boolean;
  block_contacts: boolean;
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  is_primary: boolean;
  notify_on_sos: boolean;
  notify_on_checkin_miss: boolean;
}

export interface SafetyCheckIn {
  id: string;
  user_id: string;
  match_user_id: string;
  location_name?: string;
  scheduled_time: string;
  check_in_interval_minutes: number;
  status: 'scheduled' | 'active' | 'checked_in' | 'missed' | 'completed' | 'cancelled';
}

export interface SafetyTip {
  category: 'before' | 'during' | 'after';
  tip: string;
  priority: 'high' | 'medium' | 'low';
}

export interface CrisisResource {
  type: string;
  name: string;
  contact: string;
  country: string;
  description: string;
  hours?: string;
  website?: string;
}

export interface BlockedUser {
  id: string;
  blocked_user_id: string;
  block_type: 'full' | 'messages_only' | 'profile_only';
  reason?: string;
  created_at: string;
}

export interface TwoFactorSetupResponse {
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  message?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: { message: string };
}

class SafetyService {
  // Only enable mock mode in development when API URL is not set
  private isMock = import.meta.env.MODE === 'development' &&
                   import.meta.env.VITE_USE_MOCKS === 'true' &&
                   !import.meta.env.VITE_API_URL;

  // ============================================
  // Verification
  // ============================================

  async getVerificationStatus(): Promise<VerificationStatus> {
    if (this.isMock) {
      return this.getMockVerificationStatus();
    }

    const response = await apiClient.get<ApiResponse<VerificationStatus>>(
      '/api/v1/safety/verification/status'
    );
    return response.data;
  }

  async submitVerification(type: string, data: any): Promise<any> {
    if (this.isMock) {
      return { id: 'mock-verification', status: 'pending' };
    }

    const response = await apiClient.post<ApiResponse<any>>(
      '/api/v1/safety/verification/submit',
      { type, ...data }
    );
    return response.data;
  }

  // ============================================
  // Security Settings
  // ============================================

  async getSecuritySettings(): Promise<SecuritySettings> {
    if (this.isMock) {
      return this.getMockSecuritySettings();
    }

    const response = await apiClient.get<ApiResponse<SecuritySettings>>(
      '/api/v1/safety/security/settings'
    );
    return response.data;
  }

  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<SecuritySettings> {
    if (this.isMock) {
      return { ...this.getMockSecuritySettings(), ...settings };
    }

    const response = await apiClient.put<ApiResponse<SecuritySettings>>(
      '/api/v1/safety/security/settings',
      settings
    );
    return response.data;
  }

  async setupTwoFactor(method: 'authenticator' | 'sms' | 'email'): Promise<TwoFactorSetupResponse> {
    if (this.isMock) {
      return {
        secret: 'MOCK_SECRET_KEY',
        qrCode: 'data:image/png;base64,mockQRCode',
        backupCodes: ['ABC123', 'DEF456', 'GHI789'],
      };
    }

    const response = await apiClient.post<ApiResponse<TwoFactorSetupResponse>>(
      '/api/v1/safety/security/2fa/setup',
      { method }
    );
    return response.data;
  }

  async verifyTwoFactor(code: string): Promise<{ success: boolean; backupCodes?: string[] }> {
    if (this.isMock) {
      return { success: true, backupCodes: ['ABC123', 'DEF456'] };
    }

    const response = await apiClient.post<ApiResponse<{ success: boolean; backupCodes?: string[] }>>(
      '/api/v1/safety/security/2fa/verify',
      { code }
    );
    return response.data;
  }

  async disableTwoFactor(password: string): Promise<{ success: boolean }> {
    if (this.isMock) {
      return { success: true };
    }

    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(
      '/api/v1/safety/security/2fa/disable',
      { password }
    );
    return response.data;
  }

  async getSessions(): Promise<any[]> {
    if (this.isMock) {
      return [
        { id: '1', device: 'Chrome on Windows', lastActive: new Date().toISOString(), current: true },
        { id: '2', device: 'Safari on iPhone', lastActive: new Date(Date.now() - 86400000).toISOString(), current: false },
      ];
    }

    const response = await apiClient.get<ApiResponse<any[]>>(
      '/api/v1/safety/security/sessions'
    );
    return response.data;
  }

  async revokeSession(sessionId: string): Promise<void> {
    if (this.isMock) {
      return;
    }

    await apiClient.delete(`/api/v1/safety/security/sessions/${sessionId}`);
  }

  async revokeAllOtherSessions(): Promise<{ revokedCount: number }> {
    if (this.isMock) {
      return { revokedCount: 1 };
    }

    const response = await apiClient.post<ApiResponse<{ revokedCount: number }>>(
      '/api/v1/safety/security/sessions/revoke-all',
      {}
    );
    return response.data;
  }

  // ============================================
  // Privacy Settings
  // ============================================

  async getPrivacySettings(): Promise<PrivacySettings> {
    if (this.isMock) {
      return this.getMockPrivacySettings();
    }

    const response = await apiClient.get<ApiResponse<PrivacySettings>>(
      '/api/v1/safety/privacy/settings'
    );
    return response.data;
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    if (this.isMock) {
      return { ...this.getMockPrivacySettings(), ...settings };
    }

    const response = await apiClient.put<ApiResponse<PrivacySettings>>(
      '/api/v1/safety/privacy/settings',
      settings
    );
    return response.data;
  }

  async enableIncognitoMode(): Promise<void> {
    if (this.isMock) return;
    await apiClient.post('/api/v1/safety/privacy/incognito/enable');
  }

  async disableIncognitoMode(): Promise<void> {
    if (this.isMock) return;
    await apiClient.post('/api/v1/safety/privacy/incognito/disable');
  }

  async requestDataExport(format: 'json' | 'csv' = 'json'): Promise<{ requestId: string }> {
    if (this.isMock) {
      return { requestId: 'mock-export-123' };
    }

    const response = await apiClient.post<ApiResponse<{ requestId: string }>>(
      '/api/v1/safety/privacy/export',
      { format }
    );
    return response.data;
  }

  async requestAccountDeletion(type: 'full' | 'selective', reason?: string): Promise<{ requestId: string }> {
    if (this.isMock) {
      return { requestId: 'mock-deletion-123' };
    }

    const response = await apiClient.post<ApiResponse<{ requestId: string }>>(
      '/api/v1/safety/privacy/delete',
      { type, reason }
    );
    return response.data;
  }

  // ============================================
  // Emergency Contacts
  // ============================================

  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    if (this.isMock) {
      return [];
    }

    const response = await apiClient.get<ApiResponse<EmergencyContact[]>>(
      '/api/v1/safety/emergency-contacts'
    );
    return response.data;
  }

  async addEmergencyContact(contact: Omit<EmergencyContact, 'id' | 'user_id'>): Promise<EmergencyContact> {
    if (this.isMock) {
      return { id: 'mock-contact-1', user_id: 'mock-user', ...contact };
    }

    const response = await apiClient.post<ApiResponse<EmergencyContact>>(
      '/api/v1/safety/emergency-contacts',
      contact
    );
    return response.data;
  }

  async removeEmergencyContact(contactId: string): Promise<void> {
    if (this.isMock) return;
    await apiClient.delete(`/api/v1/safety/emergency-contacts/${contactId}`);
  }

  // ============================================
  // Safety Check-ins
  // ============================================

  async getActiveCheckIns(): Promise<SafetyCheckIn[]> {
    if (this.isMock) {
      return [];
    }

    const response = await apiClient.get<ApiResponse<SafetyCheckIn[]>>(
      '/api/v1/safety/check-in/active'
    );
    return response.data;
  }

  async createCheckIn(data: {
    matchUserId: string;
    locationName?: string;
    scheduledTime: string;
    checkInIntervalMinutes: number;
  }): Promise<SafetyCheckIn> {
    if (this.isMock) {
      return {
        id: 'mock-checkin-1',
        user_id: 'mock-user',
        match_user_id: data.matchUserId,
        location_name: data.locationName,
        scheduled_time: data.scheduledTime,
        check_in_interval_minutes: data.checkInIntervalMinutes,
        status: 'scheduled',
      };
    }

    const response = await apiClient.post<ApiResponse<SafetyCheckIn>>(
      '/api/v1/safety/check-in',
      data
    );
    return response.data;
  }

  async confirmCheckIn(checkInId: string): Promise<SafetyCheckIn> {
    if (this.isMock) {
      return { id: checkInId, status: 'checked_in' } as SafetyCheckIn;
    }

    const response = await apiClient.post<ApiResponse<SafetyCheckIn>>(
      `/api/v1/safety/check-in/${checkInId}/confirm`
    );
    return response.data;
  }

  async triggerSOS(location?: { lat: number; lng: number }): Promise<void> {
    if (this.isMock) return;
    await apiClient.post('/api/v1/safety/sos', { location });
  }

  // ============================================
  // Blocking
  // ============================================

  async getBlockedUsers(): Promise<BlockedUser[]> {
    if (this.isMock) {
      return [];
    }

    const response = await apiClient.get<ApiResponse<BlockedUser[]>>(
      '/api/v1/safety/blocked'
    );
    return response.data;
  }

  async blockUser(userId: string, blockType: 'full' | 'messages_only' | 'profile_only', reason?: string): Promise<BlockedUser> {
    if (this.isMock) {
      return {
        id: 'mock-block-1',
        blocked_user_id: userId,
        block_type: blockType,
        reason,
        created_at: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<ApiResponse<BlockedUser>>(
      '/api/v1/safety/block',
      { blockedUserId: userId, blockType, reason }
    );
    return response.data;
  }

  async unblockUser(userId: string): Promise<void> {
    if (this.isMock) return;
    await apiClient.delete(`/api/v1/safety/block/${userId}`);
  }

  // ============================================
  // Reporting
  // ============================================

  async reportUser(data: {
    reportedUserId: string;
    category: string;
    description: string;
    evidence?: string[];
  }): Promise<{ reportId: string }> {
    if (this.isMock) {
      return { reportId: 'mock-report-123' };
    }

    const response = await apiClient.post<ApiResponse<{ reportId: string }>>(
      '/api/v1/safety/report',
      data
    );
    return response.data;
  }

  // ============================================
  // Safety Tips & Resources
  // ============================================

  async getSafetyTips(category?: 'before' | 'during' | 'after'): Promise<SafetyTip[]> {
    if (this.isMock) {
      return this.getMockSafetyTips();
    }

    const url = category ? `/api/v1/safety/tips?category=${category}` : '/api/v1/safety/tips';
    const response = await apiClient.get<ApiResponse<SafetyTip[]>>(url);
    return response.data;
  }

  async getCrisisResources(country: string = 'US'): Promise<CrisisResource[]> {
    if (this.isMock) {
      return this.getMockCrisisResources();
    }

    const response = await apiClient.get<ApiResponse<CrisisResource[]>>(
      `/api/v1/safety/crisis/resources?country=${country}`
    );
    return response.data;
  }

  async getEmergencyResources(country: string = 'US'): Promise<any[]> {
    if (this.isMock) {
      return [
        { service: 'Emergency', number: '911', description: 'Police, Fire, Ambulance' },
      ];
    }

    const response = await apiClient.get<ApiResponse<any[]>>(
      `/api/v1/safety/resources?country=${country}`
    );
    return response.data;
  }

  // ============================================
  // Mock Data
  // ============================================

  private getMockVerificationStatus(): VerificationStatus {
    return {
      userId: 'mock-user',
      emailVerified: true,
      phoneVerified: false,
      governmentIdVerified: false,
      selfieVerified: false,
      livenessVerified: false,
      videoVerified: false,
      socialMediaVerified: [],
      biometricVerified: false,
      overallVerificationLevel: 'basic',
      verificationScore: 25,
    };
  }

  private getMockSecuritySettings(): SecuritySettings {
    return {
      id: 'mock-settings',
      user_id: 'mock-user',
      two_factor_enabled: false,
      two_factor_method: null,
      login_alerts_enabled: true,
      new_device_alerts_enabled: true,
      suspicious_activity_alerts_enabled: true,
      allowed_login_countries: [],
      trusted_devices: [],
    };
  }

  private getMockPrivacySettings(): PrivacySettings {
    return {
      id: 'mock-privacy',
      user_id: 'mock-user',
      profile_visibility: 'public',
      show_online_status: true,
      show_last_active: true,
      show_distance: true,
      show_age: true,
      allow_screenshots: true,
      incognito_mode: false,
      hide_from_search: false,
      block_contacts: false,
    };
  }

  private getMockSafetyTips(): SafetyTip[] {
    return [
      { category: 'before', tip: 'Meet in a public place', priority: 'high' },
      { category: 'before', tip: 'Tell a friend where you\'re going', priority: 'high' },
      { category: 'during', tip: 'Keep your phone charged', priority: 'medium' },
      { category: 'after', tip: 'Trust your instincts', priority: 'high' },
    ];
  }

  private getMockCrisisResources(): CrisisResource[] {
    return [
      {
        type: 'suicide_hotline',
        name: 'National Suicide Prevention Lifeline',
        contact: '988',
        country: 'US',
        description: '24/7 crisis support',
        hours: '24/7',
        website: 'https://988lifeline.org',
      },
    ];
  }
}

export const safetyService = new SafetyService();
export default safetyService;
