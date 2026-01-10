/**
 * AI Security Guardrails
 *
 * This module provides security controls for AI features:
 * - Kill Switch: Emergency disable of AI features per service
 * - Circuit Breaker: Automatic protection against cascade failures
 */

// Kill Switch exports
export {
  AIKillSwitch,
  AI_ENABLED_SERVICES,
  getKillSwitch,
  withKillSwitch,
  type AIServiceName,
  type KillSwitchConfig,
  type KillSwitchStatus,
} from './kill-switch';

// Circuit Breaker exports
export {
  AICircuitBreaker,
  CircuitOpenError,
  createCircuitBreaker,
  getCircuitBreakerRegistry,
  withCircuitBreaker,
  withAIProtection,
  type CircuitBreakerConfig,
  type CircuitState,
} from './circuit-breaker';
