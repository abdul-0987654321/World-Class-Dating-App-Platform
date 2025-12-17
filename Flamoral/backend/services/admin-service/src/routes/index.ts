import express from 'express';
import { authenticateAdmin, requirePermission, requireRole } from '../middleware/auth';
import { auditLog, queryAuditLogs } from '../middleware/audit';
import { Permission, AdminRole, AuthRequest } from '../types';
import { DashboardService } from '../services/dashboard.service';
import { UsersService } from '../services/users.service';
import { HealthService } from '../services/health.service';
import { ABTestService } from '../services/abtest.service';
import { TicketsService } from '../services/tickets.service';
import { AuthService } from '../services/auth.service';
import { AdminService } from '../services/admin.service';
import { ReportsService } from '../services/reports.service';
import { strictRateLimiter, standardRateLimiter, lenientRateLimiter } from '../middleware/rateLimiter';
import {
  validateLogin,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateChangePassword,
  validateCreateAdmin,
  validateUpdateAdmin,
  validateUserId,
  validateBanUser,
  validateDeleteUser,
  validatePagination,
  validateCreateABTest,
  validateCreateTicket,
  validateTicketMessage,
  validateUpdateTicketStatus,
  validateUpdateTicketPriority,
  validateUUID,
  validateDateRange,
} from '../middleware/validation';

const router = express.Router();

// Service instances
const dashboardService = new DashboardService();
const usersService = new UsersService();
const healthService = new HealthService();
const abTestService = new ABTestService();
const ticketsService = new TicketsService();
const authService = new AuthService();
const adminService = new AdminService();
const reportsService = new ReportsService();

// ==================== Authentication ====================

router.post('/auth/login',
  strictRateLimiter,
  validateLogin,
  async (req: express.Request, res) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(401).json({ success: false, error: error.message });
    }
  }
);

router.post('/auth/logout',
  authenticateAdmin,
  async (req: AuthRequest, res) => {
    try {
      await authService.logout(req.admin!.id);
      res.json({ success: true, message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/auth/password-reset/request',
  strictRateLimiter,
  validatePasswordResetRequest,
  async (req: express.Request, res) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({ success: true, message: 'Password reset instructions sent' });
    } catch (error: any) {
      res.status(200).json({ success: true, message: 'If the email exists, a reset link will be sent' });
    }
  }
);

router.post('/auth/password-reset/confirm',
  strictRateLimiter,
  validatePasswordReset,
  async (req: express.Request, res) => {
    try {
      await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/auth/password/change',
  authenticateAdmin,
  strictRateLimiter,
  validateChangePassword,
  auditLog('change_password', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      await authService.changePassword(req.admin!.id, req.body.currentPassword, req.body.newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/auth/session',
  authenticateAdmin,
  async (req: AuthRequest, res) => {
    try {
      const isValid = await authService.verifySession(req.admin!.id);
      if (isValid) {
        res.json({ success: true, data: { admin: req.admin } });
      } else {
        res.status(401).json({ success: false, error: 'Invalid session' });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== Admin Management ====================

router.get('/admins',
  authenticateAdmin,
  lenientRateLimiter,
  requireRole(AdminRole.ADMIN),
  validatePagination,
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        role: req.query.role as AdminRole,
        isActive: req.query.isActive === 'true',
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };
      const result = await adminService.listAdmins(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/admins/stats',
  authenticateAdmin,
  lenientRateLimiter,
  requireRole(AdminRole.ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const stats = await adminService.getAdminStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/admins/:adminId',
  authenticateAdmin,
  lenientRateLimiter,
  requireRole(AdminRole.ADMIN),
  validateUUID('adminId'),
  async (req: AuthRequest, res) => {
    try {
      const admin = await adminService.getAdmin(req.params.adminId);
      res.json({ success: true, data: admin });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post('/admins',
  authenticateAdmin,
  standardRateLimiter,
  requireRole(AdminRole.SUPER_ADMIN),
  validateCreateAdmin,
  auditLog('create_admin', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      const admin = await adminService.createAdmin({
        ...req.body,
        createdBy: req.admin!.id,
      });
      res.json({ success: true, data: admin });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.put('/admins/:adminId',
  authenticateAdmin,
  standardRateLimiter,
  requireRole(AdminRole.SUPER_ADMIN),
  validateUpdateAdmin,
  auditLog('update_admin', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      const admin = await adminService.updateAdmin(req.params.adminId, req.body);
      res.json({ success: true, data: admin });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/admins/:adminId/deactivate',
  authenticateAdmin,
  standardRateLimiter,
  requireRole(AdminRole.SUPER_ADMIN),
  validateUUID('adminId'),
  auditLog('deactivate_admin', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      await adminService.deactivateAdmin(req.params.adminId, req.body.reason);
      res.json({ success: true, message: 'Admin deactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/admins/:adminId/reactivate',
  authenticateAdmin,
  standardRateLimiter,
  requireRole(AdminRole.SUPER_ADMIN),
  validateUUID('adminId'),
  auditLog('reactivate_admin', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      await adminService.reactivateAdmin(req.params.adminId);
      res.json({ success: true, message: 'Admin reactivated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.delete('/admins/:adminId',
  authenticateAdmin,
  standardRateLimiter,
  requireRole(AdminRole.SUPER_ADMIN),
  validateUUID('adminId'),
  auditLog('delete_admin', 'admin'),
  async (req: AuthRequest, res) => {
    try {
      await adminService.deleteAdmin(req.params.adminId);
      res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/admins/:adminId/permissions',
  authenticateAdmin,
  lenientRateLimiter,
  validateUUID('adminId'),
  async (req: AuthRequest, res) => {
    try {
      const permissions = await adminService.getAdminPermissions(req.params.adminId);
      res.json({ success: true, data: permissions });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

// ==================== Dashboard ====================

router.get('/dashboard',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.ANALYTICS_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const timeRange = req.query.range as 'today' | 'week' | 'month' || 'today';
      const stats = await dashboardService.getDashboardStats(timeRange);
      const activities = await dashboardService.getRecentActivity(20);

      res.json({
        success: true,
        data: {
          stats,
          activities,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== User Management ====================

router.get('/users',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.USER_VIEW),
  validatePagination,
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        filter: req.query.filter as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await usersService.searchUsers(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/users/:userId',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.USER_VIEW),
  validateUserId,
  async (req: AuthRequest, res) => {
    try {
      const user = await usersService.getUserDetails(req.params.userId);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post('/users/:userId/ban',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.USER_BAN),
  validateBanUser,
  auditLog('ban_user', 'user'),
  async (req: AuthRequest, res) => {
    try {
      await usersService.banUser(req.params.userId, req.body.reason, req.body.duration);
      res.json({ success: true, message: 'User banned successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/users/:userId/unban',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.USER_BAN),
  validateUserId,
  auditLog('unban_user', 'user'),
  async (req: AuthRequest, res) => {
    try {
      await usersService.unbanUser(req.params.userId);
      res.json({ success: true, message: 'User unbanned successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/users/:userId/verify',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.USER_EDIT),
  validateUserId,
  auditLog('verify_user', 'user'),
  async (req: AuthRequest, res) => {
    try {
      await usersService.verifyUser(req.params.userId);
      res.json({ success: true, message: 'User verified successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.delete('/users/:userId',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.USER_DELETE),
  validateDeleteUser,
  auditLog('delete_user', 'user'),
  async (req: AuthRequest, res) => {
    try {
      await usersService.deleteUser(req.params.userId, req.body.reason);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/users/:userId/reset-password',
  authenticateAdmin,
  strictRateLimiter,
  requirePermission(Permission.USER_EDIT),
  validateUserId,
  auditLog('reset_password', 'user'),
  async (req: AuthRequest, res) => {
    try {
      const token = await usersService.resetPassword(req.params.userId);
      res.json({ success: true, data: { resetToken: token } });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== System Health ====================

router.get('/health',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.HEALTH_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const health = await healthService.getSystemHealth();
      res.json({ success: true, data: health });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/health/services/:serviceName/logs',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.HEALTH_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await healthService.getServiceLogs(req.params.serviceName, limit);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post('/health/services/:serviceName/restart',
  authenticateAdmin,
  standardRateLimiter,
  requireRole(AdminRole.ADMIN),
  requirePermission(Permission.HEALTH_MANAGE),
  auditLog('restart_service', 'service'),
  async (req: AuthRequest, res) => {
    try {
      await healthService.restartService(req.params.serviceName);
      res.json({ success: true, message: 'Service restart initiated' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== A/B Tests ====================

router.get('/ab-tests',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.AB_TEST_VIEW),
  validatePagination,
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        status: req.query.status as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await abTestService.listTests(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/ab-tests/:testId',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.AB_TEST_VIEW),
  validateUUID('testId'),
  async (req: AuthRequest, res) => {
    try {
      const test = await abTestService.getTest(req.params.testId);
      res.json({ success: true, data: test });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post('/ab-tests',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.AB_TEST_CREATE),
  validateCreateABTest,
  auditLog('create_ab_test', 'ab_test'),
  async (req: AuthRequest, res) => {
    try {
      const test = await abTestService.createTest({
        ...req.body,
        createdBy: req.admin!.id,
      });
      res.json({ success: true, data: test });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.put('/ab-tests/:testId',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.AB_TEST_EDIT),
  validateUUID('testId'),
  auditLog('update_ab_test', 'ab_test'),
  async (req: AuthRequest, res) => {
    try {
      const test = await abTestService.updateTest(req.params.testId, req.body);
      res.json({ success: true, data: test });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/ab-tests/:testId/start',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.AB_TEST_EDIT),
  validateUUID('testId'),
  auditLog('start_ab_test', 'ab_test'),
  async (req: AuthRequest, res) => {
    try {
      await abTestService.startTest(req.params.testId);
      res.json({ success: true, message: 'A/B test started' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/ab-tests/:testId/pause',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.AB_TEST_EDIT),
  validateUUID('testId'),
  auditLog('pause_ab_test', 'ab_test'),
  async (req: AuthRequest, res) => {
    try {
      await abTestService.pauseTest(req.params.testId);
      res.json({ success: true, message: 'A/B test paused' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/ab-tests/:testId/complete',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.AB_TEST_EDIT),
  validateUUID('testId'),
  auditLog('complete_ab_test', 'ab_test'),
  async (req: AuthRequest, res) => {
    try {
      await abTestService.completeTest(req.params.testId, req.body.results);
      res.json({ success: true, message: 'A/B test completed' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.delete('/ab-tests/:testId',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.AB_TEST_DELETE),
  validateUUID('testId'),
  auditLog('delete_ab_test', 'ab_test'),
  async (req: AuthRequest, res) => {
    try {
      await abTestService.deleteTest(req.params.testId);
      res.json({ success: true, message: 'A/B test deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.get('/ab-tests/:testId/metrics',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.AB_TEST_VIEW),
  validateUUID('testId'),
  async (req: AuthRequest, res) => {
    try {
      const metrics = await abTestService.getTestMetrics(req.params.testId);
      res.json({ success: true, data: metrics });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== Support Tickets ====================

router.get('/tickets',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.TICKET_VIEW),
  validatePagination,
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        assignedTo: req.query.assignedTo as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await ticketsService.listTickets(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/tickets/stats',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.TICKET_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const stats = await ticketsService.getTicketStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/tickets/:ticketId',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.TICKET_VIEW),
  validateUUID('ticketId'),
  async (req: AuthRequest, res) => {
    try {
      const ticket = await ticketsService.getTicket(req.params.ticketId);
      res.json({ success: true, data: ticket });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post('/tickets/:ticketId/assign',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.TICKET_RESPOND),
  validateUUID('ticketId'),
  auditLog('assign_ticket', 'ticket'),
  async (req: AuthRequest, res) => {
    try {
      await ticketsService.assignTicket(
        req.params.ticketId,
        req.admin!.id,
        `${req.admin!.firstName} ${req.admin!.lastName}`
      );
      res.json({ success: true, message: 'Ticket assigned successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.post('/tickets/:ticketId/messages',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.TICKET_RESPOND),
  validateTicketMessage,
  auditLog('add_ticket_message', 'ticket'),
  async (req: AuthRequest, res) => {
    try {
      await ticketsService.addMessage(
        req.params.ticketId,
        req.admin!.id,
        'admin',
        req.body.content,
        req.body.attachments
      );
      res.json({ success: true, message: 'Message added successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.put('/tickets/:ticketId/status',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.TICKET_CLOSE),
  validateUpdateTicketStatus,
  auditLog('update_ticket_status', 'ticket'),
  async (req: AuthRequest, res) => {
    try {
      await ticketsService.updateTicketStatus(req.params.ticketId, req.body.status);
      res.json({ success: true, message: 'Ticket status updated' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

router.put('/tickets/:ticketId/priority',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.TICKET_RESPOND),
  validateUpdateTicketPriority,
  auditLog('update_ticket_priority', 'ticket'),
  async (req: AuthRequest, res) => {
    try {
      await ticketsService.updateTicketPriority(req.params.ticketId, req.body.priority);
      res.json({ success: true, message: 'Ticket priority updated' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
);

// ==================== Audit Logs ====================

router.get('/audit-logs',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.AUDIT_VIEW),
  validatePagination,
  validateDateRange,
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        adminId: req.query.adminId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50,
      };

      const result = await queryAuditLogs(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== Reports & Analytics ====================

router.get('/reports/overview',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.ANALYTICS_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const stats = await reportsService.getOverviewStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/reports/users',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.ANALYTICS_VIEW),
  validateDateRange,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const report = await reportsService.getUserGrowthReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/reports/revenue',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.REVENUE_VIEW),
  validateDateRange,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const report = await reportsService.getRevenueReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/reports/engagement',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.ANALYTICS_VIEW),
  validateDateRange,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const report = await reportsService.getEngagementReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/reports/moderation',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.ANALYTICS_VIEW),
  validateDateRange,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const report = await reportsService.getModerationReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/reports/subscriptions',
  authenticateAdmin,
  lenientRateLimiter,
  requirePermission(Permission.ANALYTICS_VIEW),
  validateDateRange,
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const report = await reportsService.getSubscriptionReport(startDate, endDate);
      res.json({ success: true, data: report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get('/reports/export/:reportType',
  authenticateAdmin,
  standardRateLimiter,
  requirePermission(Permission.ANALYTICS_EXPORT),
  validateDateRange,
  auditLog('export_report', 'report'),
  async (req: AuthRequest, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      const csv = await reportsService.exportToCSV(req.params.reportType, startDate, endDate);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.reportType}-report.csv"`);
      res.send(csv);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

export default router;
