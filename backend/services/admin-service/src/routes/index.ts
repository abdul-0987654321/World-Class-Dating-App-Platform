import express from 'express';

import { featureFlagController } from '../controllers/feature-flag.controller';
import { auditLog, queryAuditLogs } from '../middleware/audit';
import { authenticateAdmin, requirePermission, requireRole } from '../middleware/auth';
import { ABTestService } from '../services/abtest.service';
import { DashboardService } from '../services/dashboard.service';
import { HealthService } from '../services/health.service';
import { TicketsService } from '../services/tickets.service';
import { UsersService } from '../services/users.service';
import { Permission, AdminRole, AuthRequest } from '../types';

const router = express.Router();

// Service instances
const dashboardService = new DashboardService();
const usersService = new UsersService();
const healthService = new HealthService();
const abTestService = new ABTestService();
const ticketsService = new TicketsService();

// ==================== Dashboard ====================

router.get(
  '/dashboard',
  authenticateAdmin,
  requirePermission(Permission.ANALYTICS_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const timeRange = (req.query.range as 'today' | 'week' | 'month') || 'today';
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

router.get(
  '/users',
  authenticateAdmin,
  requirePermission(Permission.USER_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        search: req.query.search as string,
        filter: req.query.filter as any,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 20,
      };

      const result = await usersService.searchUsers(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get(
  '/users/:userId',
  authenticateAdmin,
  requirePermission(Permission.USER_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const user = await usersService.getUserDetails(req.params.userId);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/users/:userId/ban',
  authenticateAdmin,
  requirePermission(Permission.USER_BAN),
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

router.post(
  '/users/:userId/unban',
  authenticateAdmin,
  requirePermission(Permission.USER_BAN),
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

router.post(
  '/users/:userId/verify',
  authenticateAdmin,
  requirePermission(Permission.USER_EDIT),
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

router.delete(
  '/users/:userId',
  authenticateAdmin,
  requirePermission(Permission.USER_DELETE),
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

router.post(
  '/users/:userId/reset-password',
  authenticateAdmin,
  requirePermission(Permission.USER_EDIT),
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

router.get(
  '/health',
  authenticateAdmin,
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

router.get(
  '/health/services/:serviceName/logs',
  authenticateAdmin,
  requirePermission(Permission.HEALTH_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string, 10) || 100;
      const logs = await healthService.getServiceLogs(req.params.serviceName, limit);
      res.json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/health/services/:serviceName/restart',
  authenticateAdmin,
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

router.get(
  '/ab-tests',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        status: req.query.status as any,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 20,
      };

      const result = await abTestService.listTests(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get(
  '/ab-tests/:testId',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const test = await abTestService.getTest(req.params.testId);
      res.json({ success: true, data: test });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/ab-tests',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_CREATE),
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

router.put(
  '/ab-tests/:testId',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_EDIT),
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

router.post(
  '/ab-tests/:testId/start',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_EDIT),
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

router.post(
  '/ab-tests/:testId/pause',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_EDIT),
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

router.post(
  '/ab-tests/:testId/complete',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_EDIT),
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

router.delete(
  '/ab-tests/:testId',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_DELETE),
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

router.get(
  '/ab-tests/:testId/metrics',
  authenticateAdmin,
  requirePermission(Permission.AB_TEST_VIEW),
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

router.get(
  '/tickets',
  authenticateAdmin,
  requirePermission(Permission.TICKET_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        priority: req.query.priority as string,
        assignedTo: req.query.assignedTo as string,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 20,
      };

      const result = await ticketsService.listTickets(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

router.get(
  '/tickets/stats',
  authenticateAdmin,
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

router.get(
  '/tickets/:ticketId',
  authenticateAdmin,
  requirePermission(Permission.TICKET_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const ticket = await ticketsService.getTicket(req.params.ticketId);
      res.json({ success: true, data: ticket });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  }
);

router.post(
  '/tickets/:ticketId/assign',
  authenticateAdmin,
  requirePermission(Permission.TICKET_RESPOND),
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

router.post(
  '/tickets/:ticketId/messages',
  authenticateAdmin,
  requirePermission(Permission.TICKET_RESPOND),
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

router.put(
  '/tickets/:ticketId/status',
  authenticateAdmin,
  requirePermission(Permission.TICKET_CLOSE),
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

router.put(
  '/tickets/:ticketId/priority',
  authenticateAdmin,
  requirePermission(Permission.TICKET_RESPOND),
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

router.get(
  '/audit-logs',
  authenticateAdmin,
  requirePermission(Permission.AUDIT_VIEW),
  async (req: AuthRequest, res) => {
    try {
      const filters = {
        adminId: req.query.adminId as string,
        action: req.query.action as string,
        resource: req.query.resource as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: parseInt(req.query.page as string, 10) || 1,
        limit: parseInt(req.query.limit as string, 10) || 50,
      };

      const result = await queryAuditLogs(filters);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// ==================== Feature Flags ====================

// GET /admin/feature-flags - List all feature flags
router.get(
  '/feature-flags',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_VIEW),
  (req: AuthRequest, res) => featureFlagController.getAllFlags(req, res)
);

// GET /admin/feature-flags/categories - List all categories
router.get(
  '/feature-flags/categories',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_VIEW),
  (req: AuthRequest, res) => featureFlagController.getCategories(req, res)
);

// GET /admin/feature-flags/category/:category - Get flags by category
router.get(
  '/feature-flags/category/:category',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_VIEW),
  (req: AuthRequest, res) => featureFlagController.getFlagsByCategory(req, res)
);

// GET /admin/feature-flags/:category/:name - Get specific flag
router.get(
  '/feature-flags/:category/:name',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_VIEW),
  (req: AuthRequest, res) => featureFlagController.getFlag(req, res)
);

// PATCH /admin/feature-flags/:category/:name - Update flag
router.patch(
  '/feature-flags/:category/:name',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_EDIT),
  auditLog('update_feature_flag', 'feature_flag'),
  (req: AuthRequest, res) => featureFlagController.updateFlag(req, res)
);

// POST /admin/feature-flags/:category/:name/toggle - Toggle flag enabled/disabled
router.post(
  '/feature-flags/:category/:name/toggle',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_TOGGLE),
  auditLog('toggle_feature_flag', 'feature_flag'),
  (req: AuthRequest, res) => featureFlagController.toggleFlag(req, res)
);

// PATCH /admin/feature-flags/:category/:name/rollout - Update rollout percentage
router.patch(
  '/feature-flags/:category/:name/rollout',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_EDIT),
  auditLog('update_feature_flag_rollout', 'feature_flag'),
  (req: AuthRequest, res) => featureFlagController.updateRollout(req, res)
);

// PATCH /admin/feature-flags/:category/:name/segments - Update user segments
router.patch(
  '/feature-flags/:category/:name/segments',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_EDIT),
  auditLog('update_feature_flag_segments', 'feature_flag'),
  (req: AuthRequest, res) => featureFlagController.updateSegments(req, res)
);

// PATCH /admin/feature-flags/:category/:name/regions - Update regions
router.patch(
  '/feature-flags/:category/:name/regions',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_EDIT),
  auditLog('update_feature_flag_regions', 'feature_flag'),
  (req: AuthRequest, res) => featureFlagController.updateRegions(req, res)
);

// GET /admin/feature-flags/:category/:name/metrics - Get usage metrics
router.get(
  '/feature-flags/:category/:name/metrics',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_VIEW),
  (req: AuthRequest, res) => featureFlagController.getMetrics(req, res)
);

// GET /admin/feature-flags/:category/:name/history - Get change history
router.get(
  '/feature-flags/:category/:name/history',
  authenticateAdmin,
  requirePermission(Permission.FEATURE_FLAG_VIEW),
  (req: AuthRequest, res) => featureFlagController.getHistory(req, res)
);

// DELETE /admin/feature-flags/:category/:name/override - Remove runtime override
router.delete(
  '/feature-flags/:category/:name/override',
  authenticateAdmin,
  requireRole(AdminRole.ADMIN),
  requirePermission(Permission.FEATURE_FLAG_EDIT),
  auditLog('remove_feature_flag_override', 'feature_flag'),
  (req: AuthRequest, res) => featureFlagController.removeOverride(req, res)
);

export default router;
