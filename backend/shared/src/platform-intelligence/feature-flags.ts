/**
 * Platform Intelligence Feature Flags
 * Controls rollout of AI agents and safety features
 */

// ============================================================================
// FEATURE FLAG DEFINITIONS
// ============================================================================

export interface FeatureFlag {
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  regions?: string[];
  userSegments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagConfig {
  // AI Agent Flags
  aiAgents: {
    userSupportAI: FeatureFlag;
    trustSafetyAI: FeatureFlag;
    adminPlatformAI: FeatureFlag;
    diagnosisOpsAI: FeatureFlag;
    globalizationAI: FeatureFlag;
  };

  // Safety Feature Flags
  safetyFeatures: {
    lgbtqSafetyMode: FeatureFlag;
    womensSafetyFeatures: FeatureFlag;
    emergencyContacts: FeatureFlag;
    enhancedPrivacy: FeatureFlag;
  };

  // Self-Healing Flags
  selfHealing: {
    automaticScaling: FeatureFlag;
    circuitBreakers: FeatureFlag;
    cacheWarming: FeatureFlag;
    connectionPoolScaling: FeatureFlag;
  };

  // Platform Features
  platform: {
    moderationAIAssist: FeatureFlag;
    fraudDetectionEnhanced: FeatureFlag;
    realTimeAbuseDetection: FeatureFlag;
    diagnosticsAPI: FeatureFlag;
  };
}

// ============================================================================
// DEFAULT FEATURE FLAG CONFIGURATION
// ============================================================================

export const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig = {
  aiAgents: {
    userSupportAI: {
      name: 'ai_agent_user_support',
      description: 'Enable AI-powered user support assistance',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    trustSafetyAI: {
      name: 'ai_agent_trust_safety',
      description: 'Enable AI-assisted moderation and safety recommendations',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    adminPlatformAI: {
      name: 'ai_agent_admin_platform',
      description: 'Enable AI platform health monitoring and admin assistance',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    diagnosisOpsAI: {
      name: 'ai_agent_diagnosis_ops',
      description: 'Enable AI-powered issue diagnosis and self-healing suggestions',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    globalizationAI: {
      name: 'ai_agent_globalization',
      description: 'Enable AI regional compliance and localization assistance',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
  },

  safetyFeatures: {
    lgbtqSafetyMode: {
      name: 'safety_lgbtq_mode',
      description: 'Enhanced privacy for LGBTQ+ users in restrictive regions',
      enabled: true,
      rolloutPercentage: 100,
      regions: ['MENA', 'SSA', 'parts-of-APAC'],
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    womensSafetyFeatures: {
      name: 'safety_womens_features',
      description: 'Enhanced safety features for women users',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    emergencyContacts: {
      name: 'safety_emergency_contacts',
      description: 'Region-specific emergency contact information',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    enhancedPrivacy: {
      name: 'safety_enhanced_privacy',
      description: 'Additional privacy controls for sensitive regions',
      enabled: true,
      rolloutPercentage: 100,
      regions: ['MENA', 'SSA'],
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
  },

  selfHealing: {
    automaticScaling: {
      name: 'ops_automatic_scaling',
      description: 'Automatic pod/resource scaling based on load',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    circuitBreakers: {
      name: 'ops_circuit_breakers',
      description: 'Automatic circuit breaker activation for failing services',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    cacheWarming: {
      name: 'ops_cache_warming',
      description: 'Automatic cache warming on cache miss spikes',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    connectionPoolScaling: {
      name: 'ops_connection_pool_scaling',
      description: 'Automatic database connection pool scaling',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
  },

  platform: {
    moderationAIAssist: {
      name: 'platform_moderation_ai_assist',
      description: 'AI-assisted moderation with action recommendations',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    fraudDetectionEnhanced: {
      name: 'platform_fraud_detection_enhanced',
      description: 'Enhanced fraud detection with ML models',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    realTimeAbuseDetection: {
      name: 'platform_realtime_abuse_detection',
      description: 'Real-time abuse pattern detection in messages',
      enabled: true,
      rolloutPercentage: 100,
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
    diagnosticsAPI: {
      name: 'platform_diagnostics_api',
      description: 'Expose diagnostics API for debugging',
      enabled: true,
      rolloutPercentage: 100,
      userSegments: ['admin', 'support'],
      createdAt: '2024-12-24T00:00:00Z',
      updatedAt: '2024-12-24T00:00:00Z',
    },
  },
};

// ============================================================================
// FEATURE FLAG SERVICE
// ============================================================================

export class FeatureFlagService {
  private flags: FeatureFlagConfig;

  constructor(config?: Partial<FeatureFlagConfig>) {
    this.flags = {
      ...DEFAULT_FEATURE_FLAGS,
      ...config,
    };
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(
    category: keyof FeatureFlagConfig,
    feature: string,
    context?: {
      userId?: string;
      region?: string;
      userSegment?: string;
    }
  ): boolean {
    const categoryFlags = this.flags[category] as Record<string, FeatureFlag>;
    const flag = categoryFlags[feature];

    if (!flag || !flag.enabled) {
      return false;
    }

    // Check region restriction
    if (flag.regions && context?.region) {
      if (!flag.regions.some(r => context.region?.includes(r))) {
        return false;
      }
    }

    // Check user segment restriction
    if (flag.userSegments && context?.userSegment) {
      if (!flag.userSegments.includes(context.userSegment)) {
        return false;
      }
    }

    // Check rollout percentage
    if (flag.rolloutPercentage < 100 && context?.userId) {
      const hash = this.hashUserId(context.userId);
      const bucket = hash % 100;
      if (bucket >= flag.rolloutPercentage) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all flags for a category
   */
  getFlags(category: keyof FeatureFlagConfig): Record<string, FeatureFlag> {
    return this.flags[category] as Record<string, FeatureFlag>;
  }

  /**
   * Update a feature flag
   */
  updateFlag(
    category: keyof FeatureFlagConfig,
    feature: string,
    updates: Partial<FeatureFlag>
  ): void {
    const categoryFlags = this.flags[category] as Record<string, FeatureFlag>;
    if (categoryFlags[feature]) {
      categoryFlags[feature] = {
        ...categoryFlags[feature],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Simple hash function for user ID bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagService();
export default featureFlags;
