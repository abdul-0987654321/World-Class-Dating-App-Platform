/**
 * Self-Healing Service
 * Automated remediation for platform issues
 */

import { featureFlags } from './feature-flags';

// ============================================================================
// SELF-HEALING ACTION TYPES
// ============================================================================

export interface SelfHealingAction {
  id: string;
  trigger: string;
  action: string;
  type: 'automatic' | 'semi-automatic' | 'manual';
  reversible: boolean;
  requiresApproval?: string;
  executedAt?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'rolled-back';
}

export interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: string;
}

export interface SelfHealingEvent {
  id: string;
  timestamp: string;
  trigger: string;
  action: SelfHealingAction;
  result: 'success' | 'failure' | 'pending-approval';
  details: string;
}

// ============================================================================
// SELF-HEALING TRIGGERS AND ACTIONS
// ============================================================================

export const SELF_HEALING_CONFIG = {
  triggers: {
    highLatency: {
      threshold: 2000, // ms
      action: 'scale-horizontal',
      cooldown: 300, // seconds
    },
    highErrorRate: {
      threshold: 0.05, // 5%
      action: 'circuit-breaker',
      cooldown: 60,
    },
    memoryPressure: {
      threshold: 0.85, // 85%
      action: 'restart-pod',
      cooldown: 600,
    },
    connectionPoolExhaustion: {
      threshold: 0.9, // 90%
      action: 'scale-connection-pool',
      cooldown: 120,
    },
    cacheMissSpike: {
      threshold: 0.5, // 50% miss rate
      action: 'cache-warming',
      cooldown: 180,
    },
    diskPressure: {
      threshold: 0.9, // 90%
      action: 'log-rotation',
      cooldown: 3600,
    },
  },

  actions: {
    'scale-horizontal': {
      description: 'Add more pod replicas',
      maxReplicas: 10,
      scaleIncrement: 2,
      reversible: true,
    },
    'circuit-breaker': {
      description: 'Activate circuit breaker for failing service',
      timeout: 30000, // 30 seconds
      halfOpenAfter: 10000, // 10 seconds
      reversible: true,
    },
    'restart-pod': {
      description: 'Graceful pod restart',
      gracePeriod: 30, // seconds
      reversible: false,
    },
    'scale-connection-pool': {
      description: 'Increase database connection pool size',
      maxConnections: 100,
      increment: 10,
      reversible: true,
    },
    'cache-warming': {
      description: 'Pre-populate cache with hot data',
      batchSize: 1000,
      reversible: true,
    },
    'log-rotation': {
      description: 'Rotate and compress old logs',
      retentionDays: 7,
      reversible: false,
    },
  },
};

// ============================================================================
// SELF-HEALING SERVICE
// ============================================================================

export class SelfHealingService {
  private events: SelfHealingEvent[] = [];
  private cooldowns: Map<string, number> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();

  /**
   * Check if a self-healing feature is enabled
   */
  private isFeatureEnabled(feature: string): boolean {
    const featureMap: Record<string, string> = {
      'scale-horizontal': 'automaticScaling',
      'circuit-breaker': 'circuitBreakers',
      'cache-warming': 'cacheWarming',
      'scale-connection-pool': 'connectionPoolScaling',
    };

    const flagName = featureMap[feature];
    if (!flagName) return true; // Allow actions without specific flags

    return featureFlags.isEnabled('selfHealing', flagName);
  }

  /**
   * Check if action is in cooldown period
   */
  private isInCooldown(trigger: string): boolean {
    const lastExecution = this.cooldowns.get(trigger);
    if (!lastExecution) return false;

    const config = SELF_HEALING_CONFIG.triggers[trigger as keyof typeof SELF_HEALING_CONFIG.triggers];
    if (!config) return false;

    const cooldownMs = config.cooldown * 1000;
    return Date.now() - lastExecution < cooldownMs;
  }

  /**
   * Record a health check result
   */
  recordHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.service, check);
    this.evaluateTriggers(check);
  }

  /**
   * Evaluate triggers based on health check
   */
  private evaluateTriggers(check: HealthCheck): SelfHealingAction | null {
    const triggers = SELF_HEALING_CONFIG.triggers;

    // Check high latency
    if (check.latency > triggers.highLatency.threshold) {
      return this.triggerAction('highLatency', check.service);
    }

    // Check high error rate
    if (check.errorRate > triggers.highErrorRate.threshold) {
      return this.triggerAction('highErrorRate', check.service);
    }

    return null;
  }

  /**
   * Trigger a self-healing action
   */
  triggerAction(trigger: string, context: string): SelfHealingAction | null {
    const triggerConfig = SELF_HEALING_CONFIG.triggers[trigger as keyof typeof SELF_HEALING_CONFIG.triggers];
    if (!triggerConfig) {
      console.error(`Unknown trigger: ${trigger}`);
      return null;
    }

    // Check feature flag
    if (!this.isFeatureEnabled(triggerConfig.action)) {
      console.log(`Self-healing action ${triggerConfig.action} is disabled by feature flag`);
      return null;
    }

    // Check cooldown
    if (this.isInCooldown(trigger)) {
      console.log(`Trigger ${trigger} is in cooldown period`);
      return null;
    }

    const actionConfig = SELF_HEALING_CONFIG.actions[triggerConfig.action as keyof typeof SELF_HEALING_CONFIG.actions];
    if (!actionConfig) {
      console.error(`Unknown action: ${triggerConfig.action}`);
      return null;
    }

    const action: SelfHealingAction = {
      id: `heal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      trigger,
      action: triggerConfig.action,
      type: this.determineActionType(triggerConfig.action),
      reversible: actionConfig.reversible,
      status: 'pending',
    };

    // Execute or queue for approval
    if (action.type === 'automatic') {
      this.executeAction(action, context);
    } else {
      action.requiresApproval = action.type === 'manual' ? 'ops-lead' : 'on-call';
      this.queueForApproval(action, context);
    }

    // Record cooldown
    this.cooldowns.set(trigger, Date.now());

    return action;
  }

  /**
   * Determine action type based on risk level
   */
  private determineActionType(action: string): 'automatic' | 'semi-automatic' | 'manual' {
    const automaticActions = ['scale-horizontal', 'circuit-breaker', 'cache-warming'];
    const semiAutomaticActions = ['scale-connection-pool', 'log-rotation'];

    if (automaticActions.includes(action)) return 'automatic';
    if (semiAutomaticActions.includes(action)) return 'semi-automatic';
    return 'manual';
  }

  /**
   * Execute a self-healing action
   */
  private async executeAction(action: SelfHealingAction, context: string): Promise<void> {
    action.status = 'executing';
    action.executedAt = new Date().toISOString();

    try {
      // Simulate action execution
      console.log(`Executing self-healing action: ${action.action} for ${context}`);

      // Record event
      this.events.push({
        id: action.id,
        timestamp: action.executedAt,
        trigger: action.trigger,
        action,
        result: 'success',
        details: `Auto-remediated ${action.trigger} by executing ${action.action}`,
      });

      action.status = 'completed';
    } catch (error) {
      action.status = 'failed';
      this.events.push({
        id: action.id,
        timestamp: new Date().toISOString(),
        trigger: action.trigger,
        action,
        result: 'failure',
        details: `Failed to execute ${action.action}: ${error}`,
      });
    }
  }

  /**
   * Queue action for human approval
   */
  private queueForApproval(action: SelfHealingAction, context: string): void {
    this.events.push({
      id: action.id,
      timestamp: new Date().toISOString(),
      trigger: action.trigger,
      action,
      result: 'pending-approval',
      details: `Action ${action.action} requires approval from ${action.requiresApproval}`,
    });

    // In production, this would send notification to Slack/PagerDuty
    console.log(`[APPROVAL REQUIRED] ${action.action} for ${context} - notify ${action.requiresApproval}`);
  }

  /**
   * Approve a pending action
   */
  async approveAction(actionId: string, approver: string): Promise<boolean> {
    const event = this.events.find(e => e.id === actionId && e.result === 'pending-approval');
    if (!event) return false;

    console.log(`Action ${actionId} approved by ${approver}`);
    await this.executeAction(event.action, 'approved-context');
    return true;
  }

  /**
   * Rollback a reversible action
   */
  async rollbackAction(actionId: string): Promise<boolean> {
    const event = this.events.find(e => e.id === actionId && e.action.status === 'completed');
    if (!event || !event.action.reversible) return false;

    console.log(`Rolling back action ${actionId}`);
    event.action.status = 'rolled-back';
    return true;
  }

  /**
   * Get recent self-healing events
   */
  getEvents(limit: number = 50): SelfHealingEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get current health status of all services
   */
  getHealthStatus(): Map<string, HealthCheck> {
    return this.healthChecks;
  }

  /**
   * Get self-healing statistics
   */
  getStats(): {
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    pendingApprovals: number;
    lastAction: string | null;
  } {
    const successful = this.events.filter(e => e.result === 'success').length;
    const failed = this.events.filter(e => e.result === 'failure').length;
    const pending = this.events.filter(e => e.result === 'pending-approval').length;
    const lastEvent = this.events[this.events.length - 1];

    return {
      totalActions: this.events.length,
      successfulActions: successful,
      failedActions: failed,
      pendingApprovals: pending,
      lastAction: lastEvent?.timestamp || null,
    };
  }
}

// Export singleton instance
export const selfHealing = new SelfHealingService();
export default selfHealing;
