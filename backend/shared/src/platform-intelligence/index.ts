/**
 * Platform Intelligence Module
 * Unified AI Behavior Rules for FLAMORAL Global Dating Platform
 */

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

// Type exports
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
