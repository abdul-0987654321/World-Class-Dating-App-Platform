/**
 * Fraud Detection Service Client
 * Connects to the backend fraud-detection-service for real-time fraud analysis
 */

import { API_CONFIG } from '../api/config';
import { httpClient, ApiResponse } from '../api/httpClient';

// Types matching the backend service
export interface FraudCheckRequest {
  user_id: string;
  location?: {
    latitude: number;
    longitude: number;
    ip_address?: string;
    country?: string;
    city?: string;
  };
  device?: {
    device_id: string;
    fingerprint?: string;
    user_agent?: string;
    platform?: 'ios' | 'android' | 'web';
    app_version?: string;
  };
  activity?: {
    type: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  };
}

export interface FraudCheckResult {
  is_fraudulent: boolean;
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_factors: RiskFactor[];
  action: 'allow' | 'warn' | 'block' | 'verify';
  should_block: boolean;
  verification_required?: string;
  details: {
    location_anomaly?: LocationAnomalyResult;
    device_check?: DeviceCheckResult;
    velocity_check?: VelocityCheckResult;
  };
  timestamp: string;
}

export interface RiskFactor {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score_contribution: number;
}

export interface LocationAnomalyResult {
  is_anomalous: boolean;
  anomaly_type?: string;
  distance_km?: number;
  time_difference_hours?: number;
  impossible_travel?: boolean;
  vpn_detected?: boolean;
  proxy_detected?: boolean;
}

export interface DeviceCheckResult {
  is_suspicious: boolean;
  is_new_device: boolean;
  device_trust_score: number;
  is_emulator?: boolean;
  is_rooted?: boolean;
  multiple_accounts?: boolean;
}

export interface VelocityCheckResult {
  is_anomalous: boolean;
  activity_count: number;
  time_window_minutes: number;
  threshold_exceeded?: string;
}

export interface ProfileFraudAnalysis {
  user_id: string;
  overall_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  indicators: FraudIndicator[];
  recommendations: string[];
  last_analyzed: string;
}

export interface FraudIndicator {
  type: string;
  confidence: number;
  description: string;
  evidence?: string[];
}

class FraudDetectionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.AI_SERVICES.FRAUD_DETECTION;
  }

  /**
   * Perform comprehensive fraud check on user activity
   */
  async checkFraud(request: FraudCheckRequest): Promise<ApiResponse<FraudCheckResult>> {
    return httpClient.post<FraudCheckResult>(
      `${this.baseUrl}/check`,
      request,
      { timeout: API_CONFIG.TIMEOUTS.AI_ANALYSIS }
    );
  }

  /**
   * Check if a specific location is anomalous for the user
   */
  async checkLocationAnomaly(
    userId: string,
    location: { latitude: number; longitude: number; ip_address?: string }
  ): Promise<ApiResponse<LocationAnomalyResult>> {
    return httpClient.post<LocationAnomalyResult>(
      `${this.baseUrl}/location/check`,
      { user_id: userId, ...location }
    );
  }

  /**
   * Verify device fingerprint and check for suspicious patterns
   */
  async checkDevice(
    userId: string,
    device: FraudCheckRequest['device']
  ): Promise<ApiResponse<DeviceCheckResult>> {
    return httpClient.post<DeviceCheckResult>(
      `${this.baseUrl}/device/check`,
      { user_id: userId, device }
    );
  }

  /**
   * Register a new device for the user
   */
  async registerDevice(
    userId: string,
    device: FraudCheckRequest['device']
  ): Promise<ApiResponse<{ device_id: string; registered: boolean }>> {
    return httpClient.post(
      `${this.baseUrl}/device/register`,
      { user_id: userId, device }
    );
  }

  /**
   * Check activity velocity (rate limiting)
   */
  async checkActivityVelocity(
    userId: string,
    activityType: string
  ): Promise<ApiResponse<VelocityCheckResult>> {
    return httpClient.post<VelocityCheckResult>(
      `${this.baseUrl}/velocity/check`,
      { user_id: userId, activity_type: activityType }
    );
  }

  /**
   * Get full fraud analysis for a user profile
   */
  async analyzeProfile(userId: string): Promise<ApiResponse<ProfileFraudAnalysis>> {
    return httpClient.get<ProfileFraudAnalysis>(
      `${this.baseUrl}/profile/${userId}/analysis`
    );
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(
    reporterId: string,
    targetUserId: string,
    reason: string,
    evidence?: string[]
  ): Promise<ApiResponse<{ report_id: string; status: string }>> {
    return httpClient.post(
      `${this.baseUrl}/report`,
      {
        reporter_id: reporterId,
        target_user_id: targetUserId,
        reason,
        evidence,
      }
    );
  }

  /**
   * Check if user should be blocked based on fraud score
   */
  async shouldBlockUser(userId: string): Promise<ApiResponse<{ should_block: boolean; reason?: string }>> {
    return httpClient.get(`${this.baseUrl}/user/${userId}/block-status`);
  }

  /**
   * Get fraud risk history for a user
   */
  async getFraudHistory(
    userId: string,
    limit: number = 50
  ): Promise<ApiResponse<FraudCheckResult[]>> {
    return httpClient.get(`${this.baseUrl}/user/${userId}/history?limit=${limit}`);
  }
}

export const fraudDetectionService = new FraudDetectionService();
export default FraudDetectionService;
