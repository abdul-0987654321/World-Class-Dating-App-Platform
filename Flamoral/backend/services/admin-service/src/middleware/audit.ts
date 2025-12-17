import { Response, NextFunction } from 'express';
import { AuthRequest, AuditLog } from '../types';
import { db } from '../infrastructure/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Audit logging middleware
 * Logs all admin actions for compliance and security
 */
export const auditLog = (action: string, resource: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    // Capture response data
    res.json = function (body: any) {
      // Extract resource ID from request
      const resourceId = req.params.id || req.params.userId || req.params.adminId ||
                        req.params.testId || req.params.ticketId || req.params.serviceName ||
                        req.body.id || req.body.userId;

      // Determine if action was successful
      const success = res.statusCode >= 200 && res.statusCode < 300;

      if (success && req.admin) {
        // Log to database asynchronously
        createAuditLog({
          id: uuidv4(),
          adminId: req.admin.id,
          adminEmail: req.admin.email,
          action,
          resource,
          resourceId,
          changes: extractChanges(req),
          ipAddress: getIpAddress(req),
          userAgent: req.headers['user-agent'] || '',
          timestamp: new Date(),
        }).catch(error => {
          logger.error('Failed to create audit log:', error);
        });
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Create audit log entry
 */
async function createAuditLog(log: AuditLog): Promise<void> {
  try {
    await db('audit_logs').insert({
      id: log.id,
      admin_id: log.adminId,
      admin_email: log.adminEmail,
      action: log.action,
      resource: log.resource,
      resource_id: log.resourceId,
      changes: JSON.stringify(log.changes),
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      created_at: log.timestamp,
    });

    logger.info('Audit log created:', {
      adminEmail: log.adminEmail,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
    });
  } catch (error) {
    logger.error('Error creating audit log:', error);
    throw error;
  }
}

/**
 * Extract changes from request body
 */
function extractChanges(req: AuthRequest): any {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  if (!req.body || typeof req.body !== 'object') {
    return null;
  }

  // Clone and sanitize request body
  const changes = { ...req.body };

  // Remove sensitive fields
  Object.keys(changes).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      changes[key] = '[REDACTED]';
    }
  });

  return changes;
}

/**
 * Get client IP address
 */
function getIpAddress(req: AuthRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(filters: {
  adminId?: string;
  action?: string;
  resource?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ logs: AuditLog[]; total: number; page: number; limit: number }> {
  const page = filters.page || 1;
  const limit = filters.limit || 50;
  const offset = (page - 1) * limit;

  let query = db('audit_logs').select('*');

  if (filters.adminId) {
    query = query.where('admin_id', filters.adminId);
  }

  if (filters.action) {
    query = query.where('action', filters.action);
  }

  if (filters.resource) {
    query = query.where('resource', filters.resource);
  }

  if (filters.startDate) {
    query = query.where('created_at', '>=', filters.startDate);
  }

  if (filters.endDate) {
    query = query.where('created_at', '<=', filters.endDate);
  }

  // Get total count
  const [{ count }] = await query.clone().count('* as count');
  const total = parseInt(count as string);

  // Get paginated results
  const logs = await query
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);

  return {
    logs: logs.map(log => ({
      id: log.id,
      adminId: log.admin_id,
      adminEmail: log.admin_email,
      action: log.action,
      resource: log.resource,
      resourceId: log.resource_id,
      changes: log.changes ? JSON.parse(log.changes) : null,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.created_at,
    })),
    total,
    page,
    limit,
  };
}
