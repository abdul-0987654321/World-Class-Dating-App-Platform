/**
 * Audit Logging Middleware
 * Comprehensive request/response audit trail for security and compliance
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database.config';
import { getRedisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  requestId: string;
  userId?: string;
  userRole?: string;
  sessionId?: string;
  method: string;
  endpoint: string;
  path: string;
  queryParams?: Record<string, any>;
  bodyPreview?: string;         // Sanitized body preview (no sensitive data)
  ipAddress: string;
  userAgent?: string;
  referer?: string;
  statusCode: number;
  responseTime: number;
  errorCode?: string;
  errorMessage?: string;
  action?: string;              // Human-readable action description
  resourceType?: string;        // Type of resource accessed
  resourceId?: string;          // ID of resource accessed
  changes?: Record<string, any>; // What was changed (for mutations)
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

// Sensitive fields that should never be logged
const SENSITIVE_FIELDS = [
  'password',
  'passwordConfirm',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'creditCard',
  'cardNumber',
  'cvv',
  'ssn',
  'pin',
];

// High-risk endpoints that require detailed logging
const HIGH_RISK_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/password',
  '/auth/reset-password',
  '/users/me',
  '/payments',
  '/admin',
  '/moderation',
  '/settings/security',
];

// Extend Express Request to include audit data
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      auditAction?: string;
      auditResourceType?: string;
      auditResourceId?: string;
      auditChanges?: Record<string, any>;
      auditRiskLevel?: 'low' | 'medium' | 'high' | 'critical';
    }
  }
}

export class AuditMiddleware {
  /**
   * Main audit logging middleware
   */
  static log(options: {
    action?: string;
    resourceType?: string;
    skipBodyLog?: boolean;
    logRequestBody?: boolean;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  } = {}) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = uuidv4();
      req.requestId = requestId;

      // Capture original json and send methods to intercept response
      const originalJson = res.json.bind(res);
      let responseBody: any;

      res.json = function(body: any) {
        responseBody = body;
        return originalJson(body);
      };

      // Log on response finish
      res.on('finish', async () => {
        try {
          const responseTime = Date.now() - startTime;

          const auditEntry: AuditLogEntry = {
            id: uuidv4(),
            timestamp: new Date(),
            requestId,
            userId: req.user?.userId,
            userRole: (req as any).userRole,
            sessionId: req.headers['x-session-id'] as string,
            method: req.method,
            endpoint: req.route?.path || req.path,
            path: req.path,
            queryParams: Object.keys(req.query).length > 0 ? req.query as Record<string, any> : undefined,
            bodyPreview: options.logRequestBody && !options.skipBodyLog
              ? AuditMiddleware.sanitizeBody(req.body)
              : undefined,
            ipAddress: AuditMiddleware.getClientIp(req),
            userAgent: req.get('user-agent'),
            referer: req.get('referer'),
            statusCode: res.statusCode,
            responseTime,
            errorCode: responseBody?.error?.code,
            errorMessage: responseBody?.error?.message,
            action: req.auditAction || options.action || AuditMiddleware.inferAction(req),
            resourceType: req.auditResourceType || options.resourceType,
            resourceId: req.auditResourceId || req.params.id || req.params.userId,
            changes: req.auditChanges,
            riskLevel: req.auditRiskLevel || options.riskLevel || AuditMiddleware.assessRiskLevel(req, res),
            metadata: {
              contentType: req.get('content-type'),
              contentLength: req.get('content-length'),
              responseSize: res.get('content-length'),
            },
          };

          // Log to console for immediate visibility
          AuditMiddleware.logToConsole(auditEntry);

          // Store in database for persistence
          await AuditMiddleware.logToDatabase(auditEntry);

          // Store recent entries in Redis for quick access
          await AuditMiddleware.logToRedis(auditEntry);

          // Alert on high-risk events
          if (auditEntry.riskLevel === 'high' || auditEntry.riskLevel === 'critical') {
            await AuditMiddleware.alertHighRisk(auditEntry);
          }
        } catch (error) {
          logger.error('Audit logging failed:', error);
        }
      });

      next();
    };
  }

  /**
   * Sanitize request body to remove sensitive data
   */
  private static sanitizeBody(body: any): string {
    if (!body || typeof body !== 'object') {
      return '';
    }

    try {
      const sanitized = { ...body };

      const sanitizeObject = (obj: any): void => {
        for (const key of Object.keys(obj)) {
          if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
            obj[key] = '[REDACTED]';
          } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
          }
        }
      };

      sanitizeObject(sanitized);

      const jsonString = JSON.stringify(sanitized);
      // Truncate to prevent excessive logging
      return jsonString.length > 500 ? jsonString.substring(0, 500) + '...' : jsonString;
    } catch {
      return '[PARSE_ERROR]';
    }
  }

  /**
   * Get client IP, handling proxies
   */
  private static getClientIp(req: Request): string {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (forwardedFor as string).split(',');
      return ips[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  /**
   * Infer action from request method and path
   */
  private static inferAction(req: Request): string {
    const method = req.method;
    const path = req.path;

    // Auth actions
    if (path.includes('/auth/login')) return 'USER_LOGIN';
    if (path.includes('/auth/logout')) return 'USER_LOGOUT';
    if (path.includes('/auth/register')) return 'USER_REGISTER';
    if (path.includes('/auth/password')) return 'PASSWORD_CHANGE';
    if (path.includes('/auth/reset')) return 'PASSWORD_RESET';
    if (path.includes('/auth/verify')) return 'EMAIL_VERIFY';

    // User actions
    if (path.includes('/users/me') && method === 'GET') return 'VIEW_PROFILE';
    if (path.includes('/users/me') && method === 'PUT') return 'UPDATE_PROFILE';
    if (path.includes('/users/me') && method === 'DELETE') return 'DELETE_ACCOUNT';

    // Matching actions
    if (path.includes('/swipe') || path.includes('/like')) return 'SWIPE_ACTION';
    if (path.includes('/match')) return 'MATCH_ACTION';
    if (path.includes('/unmatch')) return 'UNMATCH';

    // Messaging actions
    if (path.includes('/messages') && method === 'POST') return 'SEND_MESSAGE';
    if (path.includes('/messages') && method === 'GET') return 'VIEW_MESSAGES';

    // Payment actions
    if (path.includes('/payment') || path.includes('/subscription')) return 'PAYMENT_ACTION';
    if (path.includes('/purchase')) return 'PURCHASE';

    // Admin actions
    if (path.includes('/admin')) return 'ADMIN_ACTION';
    if (path.includes('/moderation')) return 'MODERATION_ACTION';

    // Generic actions
    if (method === 'GET') return 'READ';
    if (method === 'POST') return 'CREATE';
    if (method === 'PUT' || method === 'PATCH') return 'UPDATE';
    if (method === 'DELETE') return 'DELETE';

    return 'API_REQUEST';
  }

  /**
   * Assess risk level based on request characteristics
   */
  private static assessRiskLevel(req: Request, res: Response): 'low' | 'medium' | 'high' | 'critical' {
    const path = req.path;
    const method = req.method;
    const statusCode = res.statusCode;

    // Critical: Admin actions, payment failures, auth breaches
    if (path.includes('/admin') && method !== 'GET') return 'critical';
    if (statusCode === 401 && HIGH_RISK_ENDPOINTS.some(e => path.includes(e))) return 'critical';
    if (path.includes('/payment') && statusCode >= 400) return 'critical';

    // High: Auth failures, account changes, moderation
    if (path.includes('/auth') && statusCode >= 400) return 'high';
    if (path.includes('/moderation')) return 'high';
    if (path.includes('/password') || path.includes('/security')) return 'high';
    if (path.includes('/users/me') && method === 'DELETE') return 'high';

    // Medium: Profile updates, purchases, sensitive reads
    if (path.includes('/users/me') && (method === 'PUT' || method === 'PATCH')) return 'medium';
    if (path.includes('/purchase') || path.includes('/subscription')) return 'medium';
    if (statusCode >= 400 && statusCode < 500) return 'medium';

    // Low: Normal reads, health checks
    return 'low';
  }

  /**
   * Log to console via winston
   */
  private static logToConsole(entry: AuditLogEntry): void {
    const logLevel = entry.riskLevel === 'critical' || entry.riskLevel === 'high' ? 'warn' : 'info';

    logger[logLevel]('AUDIT', {
      requestId: entry.requestId,
      action: entry.action,
      userId: entry.userId,
      method: entry.method,
      path: entry.path,
      status: entry.statusCode,
      responseTime: `${entry.responseTime}ms`,
      riskLevel: entry.riskLevel,
      ip: entry.ipAddress,
    });
  }

  /**
   * Log to database for persistence
   */
  private static async logToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      // Check if audit_logs table exists
      const tableExists = await db.schema.hasTable('audit_logs');
      if (!tableExists) {
        // Create table if it doesn't exist
        await db.schema.createTable('audit_logs', (table) => {
          table.uuid('id').primary();
          table.timestamp('timestamp').defaultTo(db.fn.now());
          table.string('request_id', 36);
          table.string('user_id', 36).nullable();
          table.string('user_role', 50).nullable();
          table.string('session_id', 100).nullable();
          table.string('method', 10);
          table.string('endpoint', 255);
          table.string('path', 500);
          table.jsonb('query_params').nullable();
          table.text('body_preview').nullable();
          table.string('ip_address', 45);
          table.string('user_agent', 500).nullable();
          table.string('referer', 500).nullable();
          table.integer('status_code');
          table.integer('response_time');
          table.string('error_code', 50).nullable();
          table.text('error_message').nullable();
          table.string('action', 100);
          table.string('resource_type', 50).nullable();
          table.string('resource_id', 100).nullable();
          table.jsonb('changes').nullable();
          table.string('risk_level', 20).defaultTo('low');
          table.jsonb('metadata').nullable();
          table.index(['user_id', 'timestamp']);
          table.index(['action', 'timestamp']);
          table.index(['risk_level', 'timestamp']);
        });
      }

      await db('audit_logs').insert({
        id: entry.id,
        timestamp: entry.timestamp,
        request_id: entry.requestId,
        user_id: entry.userId,
        user_role: entry.userRole,
        session_id: entry.sessionId,
        method: entry.method,
        endpoint: entry.endpoint,
        path: entry.path,
        query_params: entry.queryParams ? JSON.stringify(entry.queryParams) : null,
        body_preview: entry.bodyPreview,
        ip_address: entry.ipAddress,
        user_agent: entry.userAgent?.substring(0, 500),
        referer: entry.referer?.substring(0, 500),
        status_code: entry.statusCode,
        response_time: entry.responseTime,
        error_code: entry.errorCode,
        error_message: entry.errorMessage,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        changes: entry.changes ? JSON.stringify(entry.changes) : null,
        risk_level: entry.riskLevel,
        metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      });
    } catch (error) {
      // Don't fail the request if audit logging fails
      logger.error('Failed to write audit log to database:', error);
    }
  }

  /**
   * Log recent entries to Redis for quick access
   */
  private static async logToRedis(entry: AuditLogEntry): Promise<void> {
    try {
      const redis = getRedisClient();
      const key = `audit:recent`;
      const userKey = entry.userId ? `audit:user:${entry.userId}` : null;

      // Store in recent audit log list (keep last 1000)
      await redis.lpush(key, JSON.stringify(entry));
      await redis.ltrim(key, 0, 999);
      await redis.expire(key, 86400); // 24 hours

      // Store per-user audit trail (keep last 100)
      if (userKey) {
        await redis.lpush(userKey, JSON.stringify(entry));
        await redis.ltrim(userKey, 0, 99);
        await redis.expire(userKey, 604800); // 7 days
      }

      // Track high-risk events separately
      if (entry.riskLevel === 'high' || entry.riskLevel === 'critical') {
        await redis.lpush('audit:high_risk', JSON.stringify(entry));
        await redis.ltrim('audit:high_risk', 0, 499);
        await redis.expire('audit:high_risk', 604800); // 7 days
      }
    } catch (error) {
      logger.error('Failed to write audit log to Redis:', error);
    }
  }

  /**
   * Alert on high-risk events
   */
  private static async alertHighRisk(entry: AuditLogEntry): Promise<void> {
    logger.warn('HIGH RISK AUDIT EVENT', {
      action: entry.action,
      userId: entry.userId,
      ip: entry.ipAddress,
      path: entry.path,
      riskLevel: entry.riskLevel,
      errorCode: entry.errorCode,
    });

    // In production, you would integrate with alerting services here:
    // - Send to Slack/Discord webhook
    // - Send email to security team
    // - Trigger PagerDuty/OpsGenie alert
    // - Log to SIEM system
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(userId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      const redis = getRedisClient();
      const cached = await redis.lrange(`audit:user:${userId}`, 0, limit - 1);

      if (cached.length > 0) {
        return cached.map(entry => JSON.parse(entry));
      }

      // Fallback to database
      const logs = await db('audit_logs')
        .where({ user_id: userId })
        .orderBy('timestamp', 'desc')
        .limit(limit);

      return logs;
    } catch (error) {
      logger.error('Failed to get user audit logs:', error);
      return [];
    }
  }

  /**
   * Get high-risk audit events
   */
  static async getHighRiskEvents(limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      const redis = getRedisClient();
      const cached = await redis.lrange('audit:high_risk', 0, limit - 1);

      if (cached.length > 0) {
        return cached.map(entry => JSON.parse(entry));
      }

      // Fallback to database
      const logs = await db('audit_logs')
        .whereIn('risk_level', ['high', 'critical'])
        .orderBy('timestamp', 'desc')
        .limit(limit);

      return logs;
    } catch (error) {
      logger.error('Failed to get high-risk audit events:', error);
      return [];
    }
  }
}

export default AuditMiddleware;
