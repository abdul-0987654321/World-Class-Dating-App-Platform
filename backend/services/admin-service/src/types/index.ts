import { Request } from 'express';

// Admin Roles with hierarchical permissions
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  SUPPORT = 'support',
  ANALYST = 'analyst',
}

// Granular Permissions
export enum Permission {
  // User Management
  USER_VIEW = 'user:view',
  USER_EDIT = 'user:edit',
  USER_BAN = 'user:ban',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',

  // Content Moderation
  CONTENT_VIEW = 'content:view',
  CONTENT_MODERATE = 'content:moderate',
  CONTENT_DELETE = 'content:delete',

  // Reports
  REPORT_VIEW = 'report:view',
  REPORT_HANDLE = 'report:handle',
  REPORT_DELETE = 'report:delete',

  // Analytics
  ANALYTICS_VIEW = 'analytics:view',
  ANALYTICS_EXPORT = 'analytics:export',

  // System Settings
  SETTINGS_VIEW = 'settings:view',
  SETTINGS_EDIT = 'settings:edit',

  // Revenue
  REVENUE_VIEW = 'revenue:view',
  REVENUE_EXPORT = 'revenue:export',
  REVENUE_REFUND = 'revenue:refund',

  // A/B Tests
  AB_TEST_VIEW = 'ab_test:view',
  AB_TEST_CREATE = 'ab_test:create',
  AB_TEST_EDIT = 'ab_test:edit',
  AB_TEST_DELETE = 'ab_test:delete',

  // Support Tickets
  TICKET_VIEW = 'ticket:view',
  TICKET_RESPOND = 'ticket:respond',
  TICKET_CLOSE = 'ticket:close',

  // Audit Logs
  AUDIT_VIEW = 'audit:view',
  AUDIT_EXPORT = 'audit:export',

  // System Health
  HEALTH_VIEW = 'health:view',
  HEALTH_MANAGE = 'health:manage',

  // Feature Flags
  FEATURE_FLAG_VIEW = 'feature_flag:view',
  FEATURE_FLAG_EDIT = 'feature_flag:edit',
  FEATURE_FLAG_TOGGLE = 'feature_flag:toggle',
}

// Role-Permission Mapping
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  [AdminRole.SUPER_ADMIN]: Object.values(Permission), // All permissions

  [AdminRole.ADMIN]: [
    Permission.USER_VIEW,
    Permission.USER_EDIT,
    Permission.USER_BAN,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_MODERATE,
    Permission.CONTENT_DELETE,
    Permission.REPORT_VIEW,
    Permission.REPORT_HANDLE,
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.SETTINGS_VIEW,
    Permission.SETTINGS_EDIT,
    Permission.REVENUE_VIEW,
    Permission.AB_TEST_VIEW,
    Permission.AB_TEST_EDIT,
    Permission.TICKET_VIEW,
    Permission.TICKET_RESPOND,
    Permission.TICKET_CLOSE,
    Permission.AUDIT_VIEW,
    Permission.HEALTH_VIEW,
    Permission.FEATURE_FLAG_VIEW,
    Permission.FEATURE_FLAG_EDIT,
    Permission.FEATURE_FLAG_TOGGLE,
  ],

  [AdminRole.MODERATOR]: [
    Permission.USER_VIEW,
    Permission.CONTENT_VIEW,
    Permission.CONTENT_MODERATE,
    Permission.CONTENT_DELETE,
    Permission.REPORT_VIEW,
    Permission.REPORT_HANDLE,
    Permission.TICKET_VIEW,
    Permission.TICKET_RESPOND,
  ],

  [AdminRole.SUPPORT]: [
    Permission.USER_VIEW,
    Permission.TICKET_VIEW,
    Permission.TICKET_RESPOND,
    Permission.TICKET_CLOSE,
    Permission.CONTENT_VIEW,
  ],

  [AdminRole.ANALYST]: [
    Permission.ANALYTICS_VIEW,
    Permission.ANALYTICS_EXPORT,
    Permission.REVENUE_VIEW,
    Permission.USER_VIEW,
    Permission.AB_TEST_VIEW,
    Permission.FEATURE_FLAG_VIEW,
  ],
};

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AdminRole;
  permissions: Permission[];
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  admin?: AdminUser;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  totalMatches: number;
  matchesToday: number;
  totalMessages: number;
  messagesToday: number;
  pendingVerifications: number;
  pendingReports: number;
  revenue: {
    today: number;
    month: number;
    total: number;
  };
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    name: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    lastCheck: Date;
    error?: string;
  }[];
  database: {
    status: 'up' | 'down';
    connections: number;
    latency: number;
  };
  redis: {
    status: 'up' | 'down';
    memory: number;
    latency: number;
  };
  metrics: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: Date;
  endDate?: Date;
  variants: {
    id: string;
    name: string;
    description: string;
    allocation: number;
    users: number;
    conversions: number;
  }[];
  metrics: {
    primaryMetric: string;
    secondaryMetrics: string[];
  };
  results?: {
    winner?: string;
    confidence: number;
    summary: string;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'account' | 'abuse' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'waiting_user' | 'resolved' | 'closed';
  assignedTo?: string;
  assignedToName?: string;
  messages: {
    id: string;
    senderId: string;
    senderType: 'user' | 'admin';
    content: string;
    attachments?: string[];
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}
