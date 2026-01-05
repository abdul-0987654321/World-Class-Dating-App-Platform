/**
 * Platform Intelligence Module
 * Unified AI Behavior Rules for FLAMORAL Global Dating Platform
 */

// Core AI Configuration
export * from './platform-ai-config';
export { default as PLATFORM_INTELLIGENCE } from './platform-ai-config';

// Re-export specific configurations for easier imports
export {
  PLATFORM_CORE_RULES,
  USER_SUPPORT_AI,
  TRUST_SAFETY_AI,
  ADMIN_PLATFORM_AI,
  DIAGNOSIS_OPS_AI,
  GLOBALIZATION_AI,
} from './platform-ai-config';

// Platform Intelligence Service (API wiring)
export * from './platform-intelligence.service';
export {
  UserSupportService,
  TrustSafetyService,
  AdminPlatformService,
  DiagnosisOpsService,
  GlobalizationService,
  PlatformIntelligenceAPI,
  platformIntelligence,
} from './platform-intelligence.service';

// Feature Flags
export * from './feature-flags';
export { FeatureFlagService, featureFlags, DEFAULT_FEATURE_FLAGS } from './feature-flags';
export type { FeatureFlag, FeatureFlagConfig } from './feature-flags';

// Self-Healing Service
export * from './self-healing.service';
export { SelfHealingService, selfHealing, SELF_HEALING_CONFIG } from './self-healing.service';
export type { SelfHealingAction, SelfHealingEvent, HealthCheck } from './self-healing.service';

// Type exports from platform-ai-config
export type {
  UserSupportContext,
  ModerationAction,
  ModerationCase,
  ReportCategory,
  IncidentSeverity,
  IssueScope,
  PlatformSignal,
  DiagnosisStep,
  DiagnosisFlow,
  RegionalConfig,
} from './platform-ai-config';
