/**
 * SECURITY: Comprehensive Audit Logging Middleware
 *
 * Logs security-relevant events for compliance and incident investigation:
 * - Authentication events (login, logout, token refresh)
 * - Profile changes
 * - Likes, matches, and messages
 * - Reports and moderation actions
 * - Subscription changes
 * - Administrative actions
 *
 * All logs include correlation_id for request tracing across services.
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Audit event types
 */
export enum AuditEventType {
  // Authentication
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_REGISTER = 'auth.register',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',
  AUTH_PASSWORD_RESET = 'auth.password_reset',
  AUTH_PASSWORD_CHANGE = 'auth.password_change',
  AUTH_EMAIL_VERIFY = 'auth.email_verify',
  AUTH_FAILED_LOGIN = 'auth.failed_login',
  AUTH_ACCOUNT_LOCKED = 'auth.account_locked',

  // Profile
  PROFILE_VIEW = 'profile.view',
  PROFILE_UPDATE = 'profile.update',
  PROFILE_PHOTO_ADD = 'profile.photo_add',
  PROFILE_PHOTO_DELETE = 'profile.photo_delete',
  PROFILE_DELETE = 'profile.delete',

  // Interactions
  SWIPE_LIKE = 'swipe.like',
  SWIPE_PASS = 'swipe.pass',
  SWIPE_SUPER_LIKE = 'swipe.super_like',
  MATCH_CREATE = 'match.create',
  MATCH_UNMATCH = 'match.unmatch',

  // Messaging
  MESSAGE_SEND = 'message.send',
  MESSAGE_DELETE = 'message.delete',
  MESSAGE_REPORT = 'message.report',

  // Reports and Moderation
  REPORT_CREATE = 'report.create',
  REPORT_RESOLVE = 'report.resolve',
  USER_BAN = 'user.ban',
  USER_SUSPEND = 'user.suspend',
  USER_WARN = 'user.warn',
  CONTENT_REMOVE = 'content.remove',

  // Subscription
  SUBSCRIPTION_CREATE = 'subscription.create',
  SUBSCRIPTION_UPDATE = 'subscription.update',
  SUBSCRIPTION_CANCEL = 'subscription.cancel',
  SUBSCRIPTION_RENEW = 'subscription.renew',
  PAYMENT_PROCESS = 'payment.process',
  PAYMENT_REFUND = 'payment.refund',

  // Admin
  ADMIN_LOGIN = 'admin.login',
  ADMIN_ACTION = 'admin.action',
  ADMIN_USER_VIEW = 'admin.user_view',
  ADMIN_USER_EDIT = 'admin.user_edit',

  // Media
  MEDIA_UPLOAD = 'media.upload',
  MEDIA_DELETE = 'media.delete',
  MEDIA_ACCESS = 'media.access',

  // CSAM (Critical)
  CSAM_DETECTED = 'csam.detected',
  CSAM_REVIEWED = 'csam.reviewed',
  CSAM_ESCALATED = 'csam.escalated',

  // Security
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  SECURITY_IP_BLOCKED = 'security.ip_blocked',
  SECURITY_RATE_LIMIT = 'security.rate_limit',
}

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  timestamp: string;
  correlationId: string;
  eventType: AuditEventType | string;
  userId?: string;
  targetUserId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  requestPath: string;
  requestMethod: string;
  statusCode?: number;
  duration?: number;
  metadata?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Audit logger interface
 */
export interface AuditLogger {
  log(entry: AuditLogEntry): void;
  logAsync(entry: AuditLogEntry): Promise<void>;
}

/**
 * Default console audit logger
 */
export class ConsoleAuditLogger implements AuditLogger {
  log(entry: AuditLogEntry): void {
    // Format as structured JSON for log aggregation
    console.log(JSON.stringify({
      ...entry,
      _type: 'audit_log',
      _service: process.env.SERVICE_NAME || 'unknown',
    }));
  }

  async logAsync(entry: AuditLogEntry): Promise<void> {
    this.log(entry);
  }
}

// Global audit logger instance
let auditLogger: AuditLogger = new ConsoleAuditLogger();

/**
 * Set custom audit logger
 */
export function setAuditLogger(logger: AuditLogger): void {
  auditLogger = logger;
}

/**
 * Get current audit logger
 */
export function getAuditLogger(): AuditLogger {
  return auditLogger;
}

/**
 * Generate correlation ID if not present
 */
function getOrCreateCorrelationId(req: AuditRequest): string {
  const existing = req.headers['x-correlation-id'] as string;
  if (existing) return existing;

  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Extract client IP address
 */
function getClientIp(req: AuditRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (forwarded as string).split(',');
    return ips[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Extended request interface with audit context
 */
export interface AuditRequest extends Omit<Request, 'user'> {
  correlationId?: string;
  user?: {
    id?: string;
    userId?: string;
    email?: string;
    [key: string]: any;
  };
  auditContext?: {
    eventType?: AuditEventType | string;
    resourceType?: string;
    resourceId?: string;
    targetUserId?: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Audit logging middleware
 * Automatically logs all requests with correlation ID and user context
 */
export function auditLoggingMiddleware(
  req: AuditRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Generate or extract correlation ID
  const correlationId = getOrCreateCorrelationId(req);
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  // Capture response
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    const duration = Date.now() - startTime;

    // Determine event type from route
    const eventType = req.auditContext?.eventType || determineEventType(req);

    // Create audit log entry
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId,
      eventType,
      userId: req.user?.id || req.user?.userId,
      targetUserId: req.auditContext?.targetUserId,
      resourceType: req.auditContext?.resourceType,
      resourceId: req.auditContext?.resourceId,
      action: `${req.method} ${req.path}`,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'unknown',
      requestPath: req.path,
      requestMethod: req.method,
      statusCode: res.statusCode,
      duration,
      metadata: req.auditContext?.metadata,
      success: res.statusCode < 400,
    };

    // Log the entry
    auditLogger.log(entry);

    return originalEnd.call(this, chunk, encoding, callback);
  };

  next();
}

/**
 * Determine audit event type from request path and method
 */
function determineEventType(req: AuditRequest): string {
  const path = req.path.toLowerCase();
  const method = req.method;

  // Authentication events
  if (path.includes('/auth/login') || path.includes('/login')) {
    return method === 'POST' ? AuditEventType.AUTH_LOGIN : 'auth.access';
  }
  if (path.includes('/auth/logout') || path.includes('/logout')) {
    return AuditEventType.AUTH_LOGOUT;
  }
  if (path.includes('/auth/register') || path.includes('/signup')) {
    return AuditEventType.AUTH_REGISTER;
  }
  if (path.includes('/auth/refresh') || path.includes('/refresh-token')) {
    return AuditEventType.AUTH_TOKEN_REFRESH;
  }
  if (path.includes('/password-reset') || path.includes('/reset-password')) {
    return AuditEventType.AUTH_PASSWORD_RESET;
  }

  // Profile events
  if (path.includes('/profile')) {
    if (method === 'GET') return AuditEventType.PROFILE_VIEW;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.PROFILE_UPDATE;
    if (method === 'DELETE') return AuditEventType.PROFILE_DELETE;
  }

  // Swipe events
  if (path.includes('/swipe') || path.includes('/like')) {
    if (path.includes('super')) return AuditEventType.SWIPE_SUPER_LIKE;
    if (path.includes('pass')) return AuditEventType.SWIPE_PASS;
    return AuditEventType.SWIPE_LIKE;
  }

  // Match events
  if (path.includes('/match')) {
    if (method === 'DELETE') return AuditEventType.MATCH_UNMATCH;
    return AuditEventType.MATCH_CREATE;
  }

  // Message events
  if (path.includes('/message') || path.includes('/chat')) {
    if (method === 'POST') return AuditEventType.MESSAGE_SEND;
    if (method === 'DELETE') return AuditEventType.MESSAGE_DELETE;
  }

  // Report events
  if (path.includes('/report')) {
    if (method === 'POST') return AuditEventType.REPORT_CREATE;
    return AuditEventType.REPORT_RESOLVE;
  }

  // Subscription events
  if (path.includes('/subscription')) {
    if (method === 'POST') return AuditEventType.SUBSCRIPTION_CREATE;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.SUBSCRIPTION_UPDATE;
    if (method === 'DELETE') return AuditEventType.SUBSCRIPTION_CANCEL;
  }

  // Payment events
  if (path.includes('/payment') || path.includes('/checkout')) {
    if (path.includes('refund')) return AuditEventType.PAYMENT_REFUND;
    return AuditEventType.PAYMENT_PROCESS;
  }

  // Media events
  if (path.includes('/media') || path.includes('/upload') || path.includes('/photo')) {
    if (method === 'POST') return AuditEventType.MEDIA_UPLOAD;
    if (method === 'DELETE') return AuditEventType.MEDIA_DELETE;
    return AuditEventType.MEDIA_ACCESS;
  }

  // Admin events
  if (path.includes('/admin')) {
    return AuditEventType.ADMIN_ACTION;
  }

  // Default: use the path as event type
  return `api.${method.toLowerCase()}.${path.replace(/\//g, '.')}`;
}

/**
 * Log a specific audit event manually
 */
export function logAuditEvent(
  eventType: AuditEventType | string,
  req: AuditRequest,
  options: {
    userId?: string;
    targetUserId?: string;
    resourceType?: string;
    resourceId?: string;
    success?: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  } = {}
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId || getOrCreateCorrelationId(req),
    eventType,
    userId: options.userId || req.user?.id || req.user?.userId,
    targetUserId: options.targetUserId,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    action: eventType,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    requestPath: req.path,
    requestMethod: req.method,
    metadata: options.metadata,
    success: options.success !== false,
    errorMessage: options.errorMessage,
  };

  auditLogger.log(entry);
}

/**
 * Log CSAM detection event (critical security event)
 */
export function logCsamDetection(
  req: AuditRequest,
  options: {
    userId: string;
    contentId: string;
    confidenceScore: number;
    severity: string;
    action: 'blocked' | 'quarantined' | 'escalated';
  }
): void {
  const entry: AuditLogEntry = {
    timestamp: new Date().toISOString(),
    correlationId: req.correlationId || getOrCreateCorrelationId(req),
    eventType: AuditEventType.CSAM_DETECTED,
    userId: options.userId,
    resourceType: 'media',
    resourceId: options.contentId,
    action: `CSAM ${options.action}`,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'unknown',
    requestPath: req.path,
    requestMethod: req.method,
    metadata: {
      confidenceScore: options.confidenceScore,
      severity: options.severity,
      action: options.action,
      CRITICAL: true,
    },
    success: false,
    errorMessage: 'CSAM content detected',
  };

  // Log with CRITICAL priority
  console.error('[CRITICAL SECURITY] CSAM DETECTED:', JSON.stringify(entry));
  auditLogger.log(entry);
}

export default auditLoggingMiddleware;
