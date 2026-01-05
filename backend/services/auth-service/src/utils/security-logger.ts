import logger from './logger';

/**
 * Security event types
 */
export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Account Security Events
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  ACCOUNT_PERMANENTLY_LOCKED = 'ACCOUNT_PERMANENTLY_LOCKED',
  SUSPICIOUS_LOGIN_DETECTED = 'SUSPICIOUS_LOGIN_DETECTED',
  NEW_DEVICE_LOGIN = 'NEW_DEVICE_LOGIN',
  NEW_LOCATION_LOGIN = 'NEW_LOCATION_LOGIN',
  IMPOSSIBLE_TRAVEL_DETECTED = 'IMPOSSIBLE_TRAVEL_DETECTED',

  // Token Security Events
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  TOKEN_REUSE_DETECTED = 'TOKEN_REUSE_DETECTED',
  TOKEN_THEFT_SUSPECTED = 'TOKEN_THEFT_SUSPECTED',
  ALL_TOKENS_INVALIDATED = 'ALL_TOKENS_INVALIDATED',

  // Session Security Events
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  ALL_SESSIONS_REVOKED = 'ALL_SESSIONS_REVOKED',

  // Authorization Events
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PRIVILEGE_ESCALATION_ATTEMPT = 'PRIVILEGE_ESCALATION_ATTEMPT',

  // Data Security Events
  SENSITIVE_DATA_ACCESS = 'SENSITIVE_DATA_ACCESS',
  DATA_EXPORT_REQUESTED = 'DATA_EXPORT_REQUESTED',
  DATA_DELETION_REQUESTED = 'DATA_DELETION_REQUESTED',

  // Attack Detection
  BRUTE_FORCE_DETECTED = 'BRUTE_FORCE_DETECTED',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  MALICIOUS_FILE_UPLOAD = 'MALICIOUS_FILE_UPLOAD',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Password Security
  BREACHED_PASSWORD_REJECTED = 'BREACHED_PASSWORD_REJECTED',
  WEAK_PASSWORD_REJECTED = 'WEAK_PASSWORD_REJECTED',

  // Configuration Changes
  SECURITY_CONFIG_CHANGED = 'SECURITY_CONFIG_CHANGED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
}

/**
 * Security event severity levels
 */
export enum SecurityEventSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Security event interface
 */
export interface SecurityEvent {
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  userId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Security event thresholds for alerting
 */
const ALERT_THRESHOLDS = {
  [SecurityEventType.LOGIN_FAILURE]: 5, // Alert after 5 failed logins
  [SecurityEventType.TOKEN_REUSE_DETECTED]: 1, // Alert immediately
  [SecurityEventType.IMPOSSIBLE_TRAVEL_DETECTED]: 1, // Alert immediately
  [SecurityEventType.BRUTE_FORCE_DETECTED]: 1, // Alert immediately
  [SecurityEventType.SQL_INJECTION_ATTEMPT]: 1, // Alert immediately
};

/**
 * Security Logger Service
 * Logs security events and triggers alerts for critical events
 */
class SecurityLogger {
  private eventCounts: Map<string, number> = new Map();
  private alertsSent: Set<string> = new Set();

  /**
   * Log a security event
   */
  logSecurityEvent(event: SecurityEvent): void {
    const logEntry = {
      ...event,
      timestamp: event.timestamp.toISOString(),
    };

    // Log based on severity
    switch (event.severity) {
      case SecurityEventSeverity.CRITICAL:
        logger.error(`[SECURITY:CRITICAL] ${event.type}`, logEntry);
        this.triggerAlert(event);
        break;

      case SecurityEventSeverity.HIGH:
        logger.error(`[SECURITY:HIGH] ${event.type}`, logEntry);
        this.checkAndTriggerAlert(event);
        break;

      case SecurityEventSeverity.MEDIUM:
        logger.warn(`[SECURITY:MEDIUM] ${event.type}`, logEntry);
        this.checkAndTriggerAlert(event);
        break;

      case SecurityEventSeverity.LOW:
        logger.info(`[SECURITY:LOW] ${event.type}`, logEntry);
        break;

      default:
        logger.info(`[SECURITY] ${event.type}`, logEntry);
    }

    // Store event for analysis
    this.storeSecurityEvent(event);
  }

  /**
   * Log successful login
   */
  logSuccessfulLogin(userId: string, ip: string, userAgent: string): void {
    this.logSecurityEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      severity: SecurityEventSeverity.LOW,
      userId,
      ip,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Log failed login
   */
  logFailedLogin(userId: string, ip: string, userAgent: string, reason?: string): void {
    this.logSecurityEvent({
      type: SecurityEventType.LOGIN_FAILURE,
      severity: SecurityEventSeverity.MEDIUM,
      userId,
      ip,
      userAgent,
      details: { reason },
      timestamp: new Date(),
    });
  }

  /**
   * Log account lockout
   */
  logAccountLocked(userId: string, ip: string, reason: string): void {
    this.logSecurityEvent({
      type: SecurityEventType.ACCOUNT_LOCKED,
      severity: SecurityEventSeverity.HIGH,
      userId,
      ip,
      details: { reason },
      timestamp: new Date(),
    });
  }

  /**
   * Log suspicious login
   */
  logSuspiciousLogin(userId: string, ip: string, userAgent: string, indicators: any): void {
    this.logSecurityEvent({
      type: SecurityEventType.SUSPICIOUS_LOGIN_DETECTED,
      severity: SecurityEventSeverity.HIGH,
      userId,
      ip,
      userAgent,
      details: { indicators },
      timestamp: new Date(),
    });
  }

  /**
   * Log token reuse detection
   */
  logTokenReuse(userId: string, tokenId: string): void {
    this.logSecurityEvent({
      type: SecurityEventType.TOKEN_REUSE_DETECTED,
      severity: SecurityEventSeverity.CRITICAL,
      userId,
      details: { tokenId },
      timestamp: new Date(),
    });
  }

  /**
   * Log attack attempt
   */
  logAttackAttempt(type: SecurityEventType, ip: string, details: any): void {
    this.logSecurityEvent({
      type,
      severity: SecurityEventSeverity.CRITICAL,
      ip,
      details,
      timestamp: new Date(),
    });
  }

  /**
   * Log breached password rejection
   */
  logBreachedPasswordRejected(userId: string, breachCount: number): void {
    this.logSecurityEvent({
      type: SecurityEventType.BREACHED_PASSWORD_REJECTED,
      severity: SecurityEventSeverity.MEDIUM,
      userId,
      details: { breachCount },
      timestamp: new Date(),
    });
  }

  /**
   * Log malicious file upload
   */
  logMaliciousFileUpload(userId: string, filename: string, reason: string, ip: string): void {
    this.logSecurityEvent({
      type: SecurityEventType.MALICIOUS_FILE_UPLOAD,
      severity: SecurityEventSeverity.CRITICAL,
      userId,
      ip,
      details: { filename, reason },
      timestamp: new Date(),
    });
  }

  /**
   * Check if event should trigger alert based on threshold
   */
  private checkAndTriggerAlert(event: SecurityEvent): void {
    const key = `${event.type}:${event.userId || event.ip}`;
    const threshold = ALERT_THRESHOLDS[event.type];

    if (!threshold) {
      return; // No threshold defined for this event type
    }

    const currentCount = (this.eventCounts.get(key) || 0) + 1;
    this.eventCounts.set(key, currentCount);

    if (currentCount >= threshold && !this.alertsSent.has(key)) {
      this.triggerAlert(event);
      this.alertsSent.add(key);

      // Reset after 1 hour
      setTimeout(
        () => {
          this.eventCounts.delete(key);
          this.alertsSent.delete(key);
        },
        60 * 60 * 1000
      );
    }
  }

  /**
   * Trigger security alert
   */
  private triggerAlert(event: SecurityEvent): void {
    // In production, send to alerting service (email, SMS, PagerDuty, etc.)
    logger.error('[SECURITY ALERT TRIGGERED]', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      details: event.details,
      timestamp: event.timestamp.toISOString(),
    });

    // TODO: Integrate with alerting service
    // - Send email to security team
    // - Send SMS for critical events
    // - Post to Slack channel
    // - Create incident in incident management system
  }

  /**
   * Store security event for analysis
   */
  private storeSecurityEvent(event: SecurityEvent): void {
    // In production, store in dedicated security log database
    // For now, just log to console
    // TODO: Implement event storage in database or log aggregation service
  }

  /**
   * Get security event statistics
   */
  getEventStatistics(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};

    this.eventCounts.forEach((count, key) => {
      const eventType = key.split(':')[0];
      stats[eventType] = (stats[eventType] || 0) + count;
    });

    return stats;
  }

  /**
   * Clear event counters (for testing)
   */
  clearCounters(): void {
    this.eventCounts.clear();
    this.alertsSent.clear();
  }
}

export const securityLogger = new SecurityLogger();
export default securityLogger;
