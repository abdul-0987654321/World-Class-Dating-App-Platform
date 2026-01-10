/**
 * AI Kill Switch Admin Controller
 *
 * Provides API endpoints for managing the AI kill switch system.
 * All operations require admin authentication and appropriate permissions.
 *
 * Endpoints:
 * - GET    /ai/status           - Get status of all AI services
 * - GET    /ai/:service/status  - Get status of a specific AI service
 * - POST   /ai/:service/disable - Disable AI for a specific service
 * - POST   /ai/:service/enable  - Enable AI for a specific service
 * - POST   /ai/disable-all      - Emergency disable all AI services
 * - POST   /ai/enable-all       - Re-enable all AI services
 * - GET    /ai/circuit-breakers - Get circuit breaker status
 * - POST   /ai/:service/circuit-breaker/reset - Reset circuit breaker
 */

import { Router, Response, NextFunction } from 'express';
import {
  AIKillSwitch,
  AI_ENABLED_SERVICES,
  getCircuitBreakerRegistry,
} from '../../../../shared/ai-security';
import type { AIServiceName, KillSwitchStatus } from '../../../../shared/ai-security';
import { auditLog } from '../middleware/audit';
import { authenticateAdmin, requirePermission, requireRole } from '../middleware/auth';
import { Permission, AdminRole, AuthRequest } from '../types';

const router = Router();

// Initialize the kill switch service
const killSwitch = new AIKillSwitch({
  projectName: process.env.PROJECT_NAME || 'flamoral',
  environment: process.env.NODE_ENV || 'development',
  region: process.env.AWS_REGION,
  enableMetrics: process.env.NODE_ENV === 'production',
});

// Simple logger (use your project's logger in production)
const logger = {
  info: (message: string, meta?: any) => console.info(`[INFO] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
};

/**
 * Validate that a service name is a valid AI service
 */
function validateServiceName(serviceName: string): serviceName is AIServiceName {
  return AI_ENABLED_SERVICES.includes(serviceName as AIServiceName);
}

/**
 * Get status of all AI services
 * GET /api/v1/admin/ai/status
 */
router.get(
  '/status',
  authenticateAdmin,
  requirePermission(Permission.HEALTH_VIEW),
  async (req: AuthRequest, res: Response) => {
    try {
      const status = await killSwitch.getAllStatus();

      // Get circuit breaker status
      const circuitBreakerRegistry = getCircuitBreakerRegistry();
      const circuitBreakerStatus = circuitBreakerRegistry.getAllStatus();

      res.json({
        success: true,
        data: {
          services: status,
          circuitBreakers: circuitBreakerStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get AI status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve AI service status',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Get status of a specific AI service
 * GET /api/v1/admin/ai/:service/status
 */
router.get(
  '/:service/status',
  authenticateAdmin,
  requirePermission(Permission.HEALTH_VIEW),
  async (req: AuthRequest, res: Response) => {
    try {
      const { service } = req.params;

      if (!validateServiceName(service)) {
        res.status(400).json({
          success: false,
          error: `Invalid AI service: ${service}`,
          validServices: AI_ENABLED_SERVICES,
        });
        return;
      }

      const enabled = await killSwitch.isAIEnabled(service);
      const allStatus = await killSwitch.getAllStatus();
      const serviceStatus = allStatus[service];

      // Get circuit breaker status if available
      const circuitBreakerRegistry = getCircuitBreakerRegistry();
      const circuitBreakerStatus = circuitBreakerRegistry.getAllStatus()[service];

      res.json({
        success: true,
        data: {
          service,
          enabled,
          ...serviceStatus,
          circuitBreaker: circuitBreakerStatus || null,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to get AI status for ${req.params.service}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve AI service status',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Disable AI for a specific service
 * POST /api/v1/admin/ai/:service/disable
 *
 * Body:
 * - reason: string (required) - Reason for disabling
 */
router.post(
  '/:service/disable',
  authenticateAdmin,
  requireRole(AdminRole.ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('disable_ai_service', 'ai_service'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { service } = req.params;
      const { reason } = req.body;

      if (!validateServiceName(service)) {
        res.status(400).json({
          success: false,
          error: `Invalid AI service: ${service}`,
          validServices: AI_ENABLED_SERVICES,
        });
        return;
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Reason is required when disabling AI',
        });
        return;
      }

      const disabledBy = `${req.admin!.firstName} ${req.admin!.lastName} (${req.admin!.email})`;

      await killSwitch.disableAI(service, reason.trim(), disabledBy);

      logger.warn('AI Service Disabled', {
        service,
        reason,
        disabledBy,
        adminId: req.admin!.id,
      });

      res.json({
        success: true,
        message: `AI disabled for ${service}`,
        data: {
          service,
          enabled: false,
          reason,
          disabledBy,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to disable AI for ${req.params.service}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to disable AI service',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Enable AI for a specific service
 * POST /api/v1/admin/ai/:service/enable
 */
router.post(
  '/:service/enable',
  authenticateAdmin,
  requireRole(AdminRole.ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('enable_ai_service', 'ai_service'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { service } = req.params;

      if (!validateServiceName(service)) {
        res.status(400).json({
          success: false,
          error: `Invalid AI service: ${service}`,
          validServices: AI_ENABLED_SERVICES,
        });
        return;
      }

      const enabledBy = `${req.admin!.firstName} ${req.admin!.lastName} (${req.admin!.email})`;

      await killSwitch.enableAI(service, enabledBy);

      logger.info('AI Service Enabled', {
        service,
        enabledBy,
        adminId: req.admin!.id,
      });

      res.json({
        success: true,
        message: `AI enabled for ${service}`,
        data: {
          service,
          enabled: true,
          enabledBy,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to enable AI for ${req.params.service}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to enable AI service',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Emergency disable ALL AI services
 * POST /api/v1/admin/ai/disable-all
 *
 * Body:
 * - reason: string (required) - Reason for the global disable
 *
 * Requires SUPER_ADMIN role
 */
router.post(
  '/disable-all',
  authenticateAdmin,
  requireRole(AdminRole.SUPER_ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('disable_all_ai', 'ai_service'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Reason is required for emergency AI shutdown',
        });
        return;
      }

      const disabledBy = `${req.admin!.firstName} ${req.admin!.lastName} (${req.admin!.email})`;

      logger.warn('EMERGENCY: All AI Services Being Disabled', {
        reason,
        disabledBy,
        adminId: req.admin!.id,
        timestamp: new Date().toISOString(),
      });

      await killSwitch.disableAllAI(reason.trim(), disabledBy);

      res.json({
        success: true,
        message: 'All AI services have been disabled',
        data: {
          services: AI_ENABLED_SERVICES,
          reason,
          disabledBy,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to disable all AI services:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to disable all AI services',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Re-enable ALL AI services
 * POST /api/v1/admin/ai/enable-all
 *
 * Requires SUPER_ADMIN role
 */
router.post(
  '/enable-all',
  authenticateAdmin,
  requireRole(AdminRole.SUPER_ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('enable_all_ai', 'ai_service'),
  async (req: AuthRequest, res: Response) => {
    try {
      const enabledBy = `${req.admin!.firstName} ${req.admin!.lastName} (${req.admin!.email})`;

      logger.info('All AI Services Being Re-enabled', {
        enabledBy,
        adminId: req.admin!.id,
        timestamp: new Date().toISOString(),
      });

      await killSwitch.enableAllAI(enabledBy);

      res.json({
        success: true,
        message: 'All AI services have been enabled',
        data: {
          services: AI_ENABLED_SERVICES,
          enabledBy,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to enable all AI services:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to enable all AI services',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Get circuit breaker status for all services
 * GET /api/v1/admin/ai/circuit-breakers
 */
router.get(
  '/circuit-breakers',
  authenticateAdmin,
  requirePermission(Permission.HEALTH_VIEW),
  async (req: AuthRequest, res: Response) => {
    try {
      const circuitBreakerRegistry = getCircuitBreakerRegistry();
      const status = circuitBreakerRegistry.getAllStatus();

      res.json({
        success: true,
        data: {
          circuitBreakers: status,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Failed to get circuit breaker status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve circuit breaker status',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Reset circuit breaker for a specific service
 * POST /api/v1/admin/ai/:service/circuit-breaker/reset
 */
router.post(
  '/:service/circuit-breaker/reset',
  authenticateAdmin,
  requireRole(AdminRole.ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('reset_circuit_breaker', 'ai_service'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { service } = req.params;

      const circuitBreakerRegistry = getCircuitBreakerRegistry();
      const breakers = circuitBreakerRegistry.getAllBreakers();
      const breaker = breakers.get(service);

      if (!breaker) {
        res.status(404).json({
          success: false,
          error: `No circuit breaker found for service: ${service}`,
        });
        return;
      }

      breaker.reset();

      logger.info('Circuit Breaker Reset', {
        service,
        resetBy: `${req.admin!.firstName} ${req.admin!.lastName}`,
        adminId: req.admin!.id,
      });

      res.json({
        success: true,
        message: `Circuit breaker reset for ${service}`,
        data: {
          service,
          newState: breaker.getState(),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to reset circuit breaker for ${req.params.service}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset circuit breaker',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

/**
 * Trip circuit breaker for a specific service (force open)
 * POST /api/v1/admin/ai/:service/circuit-breaker/trip
 *
 * Body:
 * - reason: string (required) - Reason for tripping
 */
router.post(
  '/:service/circuit-breaker/trip',
  authenticateAdmin,
  requireRole(AdminRole.ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('trip_circuit_breaker', 'ai_service'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { service } = req.params;
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Reason is required when tripping circuit breaker',
        });
        return;
      }

      const circuitBreakerRegistry = getCircuitBreakerRegistry();
      const breakers = circuitBreakerRegistry.getAllBreakers();
      const breaker = breakers.get(service);

      if (!breaker) {
        res.status(404).json({
          success: false,
          error: `No circuit breaker found for service: ${service}`,
        });
        return;
      }

      breaker.trip(reason);

      logger.warn('Circuit Breaker Force Tripped', {
        service,
        reason,
        trippedBy: `${req.admin!.firstName} ${req.admin!.lastName}`,
        adminId: req.admin!.id,
      });

      res.json({
        success: true,
        message: `Circuit breaker tripped for ${service}`,
        data: {
          service,
          newState: breaker.getState(),
          reason,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error(`Failed to trip circuit breaker for ${req.params.service}:`, error);
      res.status(500).json({
        success: false,
        error: 'Failed to trip circuit breaker',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
      });
    }
  }
);

export default router;

// Named export for explicit import
export { router as aiKillSwitchRouter };
