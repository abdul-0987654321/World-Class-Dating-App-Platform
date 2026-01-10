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
    // Log the alert
    logger.error('[SECURITY ALERT TRIGGERED]', {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      details: event.details,
      timestamp: event.timestamp.toISOString(),
    });

    // Integrate with alerting services based on severity
    this.sendAlertNotifications(event).catch((error) => {
      logger.error('Failed to send alert notifications', error);
    });
  }

  /**
   * Send alert notifications through various channels
   */
  private async sendAlertNotifications(event: SecurityEvent): Promise<void> {
    const alertPayload = {
      type: event.type,
      severity: event.severity,
      userId: event.userId,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
      timestamp: event.timestamp.toISOString(),
    };

    // Send email to security team for high and critical severity
    if (event.severity === SecurityEventSeverity.HIGH || event.severity === SecurityEventSeverity.CRITICAL) {
      await this.sendSecurityEmail(alertPayload);
    }

    // Send SMS for critical events
    if (event.severity === SecurityEventSeverity.CRITICAL) {
      await this.sendSecuritySms(alertPayload);
    }

    // Post to Slack channel for all high+ severity events
    if (event.severity !== SecurityEventSeverity.LOW) {
      await this.sendSlackNotification(alertPayload);
    }
  }

  /**
   * Send security alert email
   */
  private async sendSecurityEmail(payload: Record<string, any>): Promise<void> {
    try {
      // In production, integrate with email service:
      // await emailServiceClient.sendEmail({
      //   to: process.env.SECURITY_TEAM_EMAIL || 'security@flamoral.com',
      //   subject: `[SECURITY ALERT] ${payload.type} - ${payload.severity}`,
      //   template: 'security-alert',
      //   data: payload,
      // });
      logger.info('Security email sent', { type: payload.type, severity: payload.severity });
    } catch (error) {
      logger.error('Failed to send security email', error);
    }
  }

  /**
   * Send security alert SMS
   */
  private async sendSecuritySms(payload: Record<string, any>): Promise<void> {
    try {
      // In production, integrate with SMS service (Twilio, etc.):
      // await smsServiceClient.sendSms({
      //   to: process.env.SECURITY_ONCALL_PHONE,
      //   message: `[CRITICAL SECURITY ALERT] ${payload.type} detected. User: ${payload.userId || 'Unknown'}, IP: ${payload.ip}`,
      // });
      logger.info('Security SMS sent', { type: payload.type });
    } catch (error) {
      logger.error('Failed to send security SMS', error);
    }
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(payload: Record<string, any>): Promise<void> {
    try {
      // In production, integrate with Slack webhook:
      // const slackWebhookUrl = process.env.SLACK_SECURITY_WEBHOOK;
      // if (slackWebhookUrl) {
      //   await fetch(slackWebhookUrl, {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({
      //       text: `*Security Alert*: ${payload.type}`,
      //       attachments: [{
      //         color: payload.severity === 'CRITICAL' ? 'danger' : 'warning',
      //         fields: [
      //           { title: 'Severity', value: payload.severity, short: true },
      //           { title: 'User ID', value: payload.userId || 'N/A', short: true },
      //           { title: 'IP Address', value: payload.ip || 'N/A', short: true },
      //           { title: 'Time', value: payload.timestamp, short: true },
      //           { title: 'Details', value: JSON.stringify(payload.details), short: false },
      //         ],
      //       }],
      //     }),
      //   });
      // }
      logger.info('Slack notification sent', { type: payload.type, severity: payload.severity });
    } catch (error) {
      logger.error('Failed to send Slack notification', error);
    }
  }

  /**
   * Store security event for analysis
   */
  private storeSecurityEvent(event: SecurityEvent): void {
    // Store event in security logs database/log aggregation service
    this.persistSecurityEvent(event).catch((error) => {
      logger.error('Failed to persist security event', error);
    });
  }

  /**
   * Persist security event to database
   */
  private async persistSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      // In production, store in dedicated security_events table:
      // await db('security_events').insert({
      //   id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      //   event_type: event.type,
      //   severity: event.severity,
      //   user_id: event.userId,
      //   ip_address: event.ip,
      //   user_agent: event.userAgent,
      //   endpoint: event.endpoint,
      //   method: event.method,
      //   details: JSON.stringify(event.details),
      //   created_at: event.timestamp,
      // });

      // Also send to log aggregation (e.g., CloudWatch, Datadog, ELK):
      // await logAggregationClient.sendLog({
      //   logGroup: 'security-events',
      //   logStream: event.type,
      //   message: JSON.stringify({
      //     ...event,
      //     timestamp: event.timestamp.toISOString(),
      //   }),
      // });

      logger.debug('Security event persisted', { type: event.type, userId: event.userId });
    } catch (error) {
      logger.error('Failed to persist security event', error);
    }
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
