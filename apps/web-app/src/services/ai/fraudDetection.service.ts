/**
 * Fraud Detection Service
 * Web client for fraud detection AI service
 */

import { apiClient, ApiError } from '../api.client';
import { AI_CONFIG } from './config';

// Types
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
  };
  activity?: {
    type: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface FraudCheckResult {
  is_fraudulent: boolean;
  risk_score: number;
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
  indicators: { type: string; confidence: number; description: string }[];
  recommendations: string[];
  last_analyzed: string;
}

class FraudDetectionService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AI_CONFIG.FRAUD_DETECTION_URL;
  }

  async checkFraud(request: FraudCheckRequest): Promise<FraudCheckResult> {
    return apiClient.post<FraudCheckResult>(`${this.baseUrl}/check`, request);
  }

  async checkLocationAnomaly(
    userId: string,
    location: { latitude: number; longitude: number; ip_address?: string }
  ): Promise<LocationAnomalyResult> {
    return apiClient.post<LocationAnomalyResult>(
      `${this.baseUrl}/location/check`,
      { user_id: userId, ...location }
    );
  }

  async checkDevice(
    userId: string,
    device: FraudCheckRequest['device']
  ): Promise<DeviceCheckResult> {
    return apiClient.post<DeviceCheckResult>(
      `${this.baseUrl}/device/check`,
      { user_id: userId, device }
    );
  }

  async registerDevice(
    userId: string,
    device: FraudCheckRequest['device']
  ): Promise<{ device_id: string; registered: boolean }> {
    return apiClient.post(`${this.baseUrl}/device/register`, { user_id: userId, device });
  }

  async checkActivityVelocity(
    userId: string,
    activityType: string
  ): Promise<VelocityCheckResult> {
    return apiClient.post<VelocityCheckResult>(
      `${this.baseUrl}/velocity/check`,
      { user_id: userId, activity_type: activityType }
    );
  }

  async analyzeProfile(userId: string): Promise<ProfileFraudAnalysis> {
    return apiClient.get<ProfileFraudAnalysis>(`${this.baseUrl}/profile/${userId}/analysis`);
  }

  async reportSuspiciousActivity(
    reporterId: string,
    targetUserId: string,
    reason: string,
    evidence?: string[]
  ): Promise<{ report_id: string; status: string }> {
    return apiClient.post(`${this.baseUrl}/report`, {
      reporter_id: reporterId,
      target_user_id: targetUserId,
      reason,
      evidence,
    });
  }

  async shouldBlockUser(userId: string): Promise<{ should_block: boolean; reason?: string }> {
    return apiClient.get(`${this.baseUrl}/user/${userId}/block-status`);
  }

  async getFraudHistory(userId: string, limit: number = 50): Promise<FraudCheckResult[]> {
    return apiClient.get(`${this.baseUrl}/user/${userId}/history?limit=${limit}`);
  }
}

export const fraudDetectionService = new FraudDetectionService();
export default fraudDetectionService;
