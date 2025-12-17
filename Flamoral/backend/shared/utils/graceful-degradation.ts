/**
 * Graceful Degradation Manager
 * Disable non-essential features under high load to reduce costs
 */

import os from 'os';
import { CostOptimizationConfig } from '../config/cost-optimization';

export enum DegradationLevel {
  NONE = 0,
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestRate: number;
}

export class GracefulDegradationManager {
  private currentLevel: DegradationLevel = DegradationLevel.NONE;
  private disabledFeatures: Set<string> = new Set();
  private queuedOperations: Set<string> = new Set();
  private metrics: SystemMetrics = {
    cpuUsage: 0,
    memoryUsage: 0,
    activeConnections: 0,
    requestRate: 0,
  };

  constructor() {
    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Start system monitoring
   */
  private startMonitoring(): void {
    setInterval(() => {
      this.updateMetrics();
      this.adjustDegradation();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Update system metrics
   */
  private updateMetrics(): void {
    // CPU usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    this.metrics.cpuUsage = 100 - (100 * totalIdle) / totalTick;

    // Memory usage
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    this.metrics.memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
  }

  /**
   * Adjust degradation level based on metrics
   */
  private adjustDegradation(): void {
    const { cpuUsage, memoryUsage } = this.metrics;
    const config = CostOptimizationConfig.gracefulDegradation;

    let newLevel = DegradationLevel.NONE;

    // Determine degradation level
    if (cpuUsage > config.cpuThreshold || memoryUsage > config.memoryThreshold) {
      if (cpuUsage > 95 || memoryUsage > 95) {
        newLevel = DegradationLevel.CRITICAL;
      } else if (cpuUsage > 90 || memoryUsage > 90) {
        newLevel = DegradationLevel.HIGH;
      } else if (cpuUsage > 85 || memoryUsage > 85) {
        newLevel = DegradationLevel.MEDIUM;
      } else {
        newLevel = DegradationLevel.LOW;
      }
    }

    if (newLevel !== this.currentLevel) {
      this.setDegradationLevel(newLevel);
    }
  }

  /**
   * Set degradation level
   */
  private setDegradationLevel(level: DegradationLevel): void {
    console.log(`[GracefulDegradation] Changing level from ${this.currentLevel} to ${level}`);
    console.log(`[GracefulDegradation] CPU: ${this.metrics.cpuUsage.toFixed(2)}%, Memory: ${this.metrics.memoryUsage.toFixed(2)}%`);

    this.currentLevel = level;

    // Clear existing disabled features
    this.disabledFeatures.clear();
    this.queuedOperations.clear();

    const config = CostOptimizationConfig.gracefulDegradation;

    // Disable features based on level
    if (level >= DegradationLevel.LOW) {
      // Disable analytics
      this.disableFeature('analytics-events');
    }

    if (level >= DegradationLevel.MEDIUM) {
      // Disable non-critical emails
      this.disableFeature('email-notifications');
      // Queue operations
      config.queueOperations.forEach((op) => this.queueOperation(op));
    }

    if (level >= DegradationLevel.HIGH) {
      // Disable non-urgent push notifications
      this.disableFeature('push-notifications-non-urgent');
      this.disableFeature('ai-recommendations');
    }

    if (level >= DegradationLevel.CRITICAL) {
      // Disable expensive features
      this.disableFeature('image-optimization');
      this.disableFeature('advanced-search');
      console.error('[GracefulDegradation] CRITICAL: System under extreme load!');
    }
  }

  /**
   * Disable a feature
   */
  private disableFeature(feature: string): void {
    this.disabledFeatures.add(feature);
    console.log(`[GracefulDegradation] Disabled feature: ${feature}`);
  }

  /**
   * Queue an operation
   */
  private queueOperation(operation: string): void {
    this.queuedOperations.add(operation);
    console.log(`[GracefulDegradation] Queued operation: ${operation}`);
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    return !this.disabledFeatures.has(feature);
  }

  /**
   * Check if an operation should be queued
   */
  shouldQueueOperation(operation: string): boolean {
    return this.queuedOperations.has(operation);
  }

  /**
   * Get current degradation level
   */
  getDegradationLevel(): DegradationLevel {
    return this.currentLevel;
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Get disabled features
   */
  getDisabledFeatures(): string[] {
    return Array.from(this.disabledFeatures);
  }

  /**
   * Get queued operations
   */
  getQueuedOperations(): string[] {
    return Array.from(this.queuedOperations);
  }

  /**
   * Manually set degradation level (for testing)
   */
  setManualDegradation(level: DegradationLevel): void {
    this.setDegradationLevel(level);
  }

  /**
   * Get degradation status
   */
  getStatus() {
    return {
      level: this.currentLevel,
      levelName: DegradationLevel[this.currentLevel],
      metrics: this.metrics,
      disabledFeatures: this.getDisabledFeatures(),
      queuedOperations: this.getQueuedOperations(),
    };
  }
}

/**
 * Feature Flag Manager with Degradation Support
 */
export class FeatureFlagManager {
  private static instance: GracefulDegradationManager;
  private static manualFlags: Map<string, boolean> = new Map();

  static initialize(): void {
    if (!this.instance) {
      this.instance = new GracefulDegradationManager();
    }
  }

  static getInstance(): GracefulDegradationManager {
    if (!this.instance) {
      this.initialize();
    }
    return this.instance;
  }

  /**
   * Check if feature is enabled (considering both manual flags and degradation)
   */
  static isEnabled(feature: string): boolean {
    // Check manual flag first
    if (this.manualFlags.has(feature)) {
      return this.manualFlags.get(feature)!;
    }

    // Check degradation
    return this.getInstance().isFeatureEnabled(feature);
  }

  /**
   * Manually enable/disable a feature
   */
  static setFlag(feature: string, enabled: boolean): void {
    this.manualFlags.set(feature, enabled);
  }

  /**
   * Clear manual flag
   */
  static clearFlag(feature: string): void {
    this.manualFlags.delete(feature);
  }

  /**
   * Get all flags
   */
  static getAllFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {};
    this.manualFlags.forEach((value, key) => {
      flags[key] = value;
    });
    return flags;
  }
}

/**
 * Express middleware for graceful degradation
 */
export function createDegradationMiddleware(feature: string) {
  return (req: any, res: any, next: any) => {
    if (!FeatureFlagManager.isEnabled(feature)) {
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable',
        message: `Feature '${feature}' is currently disabled due to high system load. Please try again later.`,
        degraded: true,
      });
    }
    next();
  };
}

/**
 * Queue middleware for non-critical operations
 */
export function createQueueMiddleware(operation: string, queueFn: Function) {
  return async (req: any, res: any, next: any) => {
    const degradation = FeatureFlagManager.getInstance();

    if (degradation.shouldQueueOperation(operation)) {
      try {
        // Queue the operation instead of processing immediately
        await queueFn(req);
        return res.status(202).json({
          success: true,
          message: 'Operation queued for processing',
          queued: true,
        });
      } catch (error) {
        console.error(`Failed to queue operation ${operation}:`, error);
        // Fall through to normal processing
      }
    }

    next();
  };
}

export default GracefulDegradationManager;
