/**
 * Policy Service
 * Handles fetching and caching of legal policies from the backend
 */

import { apiClient } from './api.client';

export interface PolicySection {
  id: string;
  title: string;
  content: string;
  examples?: string[];
  lastUpdated?: string;
}

export interface Policy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  sections: PolicySection[];
  userRights?: string[];
  contactInfo?: {
    email: string;
    address: string;
    dpo?: string;
  };
}

export interface PolicyMetadata {
  id: string;
  type: string;
  region: string;
  language: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
}

export interface PolicyVersion {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  changes?: string[];
}

export interface PolicyApiResponse {
  success: boolean;
  data: Policy;
}

export interface PolicyVersionsResponse {
  success: boolean;
  data: {
    versions: PolicyVersion[];
    total: number;
  };
}

export interface PolicySummaryResponse {
  success: boolean;
  data: {
    summary: string;
    keyPoints: string[];
    effectiveDate: string;
  };
}

class PolicyService {
  private readonly baseUrl = '/api/policies';
  private readonly defaultRegion = 'us';
  private readonly defaultLanguage = 'en';

  // In-memory cache for policies
  private cache: Map<string, { data: Policy; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get a policy from cache or fetch from backend
   */
  private getCacheKey(
    region: string,
    policyType: string,
    language: string,
    version?: string
  ): string {
    return `${region}:${policyType}:${language}:${version || 'latest'}`;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Get policy from cache
   */
  private getCachedPolicy(cacheKey: string): Policy | null {
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached.timestamp)) {
      return cached.data;
    }
    return null;
  }

  /**
   * Store policy in cache
   */
  private setCachedPolicy(cacheKey: string, policy: Policy): void {
    this.cache.set(cacheKey, {
      data: policy,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear all cached policies
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get Privacy Policy
   */
  async getPrivacyPolicy(
    region: string = this.defaultRegion,
    language: string = this.defaultLanguage,
    version?: string
  ): Promise<Policy> {
    const cacheKey = this.getCacheKey(region, 'privacy', language, version);
    const cached = this.getCachedPolicy(cacheKey);

    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams({
      language,
      format: 'json',
      ...(version && { version }),
    });

    const response = await apiClient.get<PolicyApiResponse>(
      `${this.baseUrl}/${region}/privacy?${queryParams.toString()}`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      this.setCachedPolicy(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Failed to fetch privacy policy');
  }

  /**
   * Get Terms of Service
   */
  async getTermsOfService(
    region: string = this.defaultRegion,
    language: string = this.defaultLanguage,
    version?: string
  ): Promise<Policy> {
    const cacheKey = this.getCacheKey(region, 'terms', language, version);
    const cached = this.getCachedPolicy(cacheKey);

    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams({
      language,
      format: 'json',
      ...(version && { version }),
    });

    const response = await apiClient.get<PolicyApiResponse>(
      `${this.baseUrl}/${region}/terms?${queryParams.toString()}`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      this.setCachedPolicy(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Failed to fetch terms of service');
  }

  /**
   * Get Community Guidelines
   */
  async getCommunityGuidelines(
    region: string = this.defaultRegion,
    language: string = this.defaultLanguage,
    version?: string
  ): Promise<Policy> {
    const cacheKey = this.getCacheKey(region, 'community-guidelines', language, version);
    const cached = this.getCachedPolicy(cacheKey);

    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams({
      language,
      format: 'json',
      ...(version && { version }),
    });

    const response = await apiClient.get<PolicyApiResponse>(
      `${this.baseUrl}/${region}/community-guidelines?${queryParams.toString()}`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      this.setCachedPolicy(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Failed to fetch community guidelines');
  }

  /**
   * Get Trust & Safety Policy
   */
  async getTrustSafetyPolicy(
    region: string = this.defaultRegion,
    language: string = this.defaultLanguage,
    version?: string
  ): Promise<Policy> {
    const cacheKey = this.getCacheKey(region, 'content', language, version);
    const cached = this.getCachedPolicy(cacheKey);

    if (cached) {
      return cached;
    }

    const queryParams = new URLSearchParams({
      language,
      format: 'json',
      ...(version && { version }),
    });

    const response = await apiClient.get<PolicyApiResponse>(
      `${this.baseUrl}/${region}/content?${queryParams.toString()}`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      this.setCachedPolicy(cacheKey, response.data);
      return response.data;
    }

    throw new Error('Failed to fetch trust and safety policy');
  }

  /**
   * Get policy summary (shorter version for quick reading)
   */
  async getPolicySummary(
    policyType: 'privacy' | 'terms' | 'community-guidelines' | 'content',
    region: string = this.defaultRegion,
    language: string = this.defaultLanguage
  ): Promise<PolicySummaryResponse['data']> {
    const queryParams = new URLSearchParams({ language });

    const response = await apiClient.get<PolicySummaryResponse>(
      `${this.baseUrl}/${region}/${policyType}/summary?${queryParams.toString()}`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error('Failed to fetch policy summary');
  }

  /**
   * Get version history for a policy
   */
  async getPolicyVersions(
    policyType: 'privacy' | 'terms' | 'community-guidelines' | 'content',
    region: string = this.defaultRegion,
    limit: number = 10,
    offset: number = 0
  ): Promise<PolicyVersion[]> {
    const queryParams = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const response = await apiClient.get<PolicyVersionsResponse>(
      `${this.baseUrl}/${region}/${policyType}/versions?${queryParams.toString()}`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      return response.data.versions;
    }

    throw new Error('Failed to fetch policy versions');
  }

  /**
   * Get list of supported regions
   */
  async getSupportedRegions(): Promise<string[]> {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(
      `${this.baseUrl}/regions`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      return response.data;
    }

    return [this.defaultRegion];
  }

  /**
   * Get list of available policy types
   */
  async getPolicyTypes(): Promise<string[]> {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(
      `${this.baseUrl}/types`,
      { skipAuth: true }
    );

    if (response.success && response.data) {
      return response.data;
    }

    return ['privacy', 'terms', 'community-guidelines', 'content'];
  }

  /**
   * Helper method to detect user's region based on stored preference or browser language
   */
  getUserRegion(): string {
    // Check localStorage for user preference
    const savedRegion = localStorage.getItem('userRegion');
    if (savedRegion) {
      return savedRegion;
    }

    // Try to detect from browser language
    const browserLang = navigator.language || navigator.languages?.[0] || 'en-US';
    const regionFromLang = browserLang.split('-')[1]?.toUpperCase();

    if (regionFromLang && regionFromLang.length === 2) {
      return regionFromLang.toLowerCase();
    }

    // Default fallback
    return this.defaultRegion;
  }

  /**
   * Helper method to detect user's language preference
   */
  getUserLanguage(): string {
    // Try to get from browser language settings
    const browserLang = navigator.language.split('-')[0];
    return browserLang || this.defaultLanguage;
  }
}

export const policyService = new PolicyService();
export default policyService;
