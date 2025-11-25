import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { ReportService } from '../../domain/services/report.service';
import logger from '../../utils/logger';

export class ReportController {
  private reportService: ReportService;

  constructor(reportService?: ReportService) {
    this.reportService = reportService || new ReportService();
  }

  async createReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const reporterId = req.user?.userId;
      const { reportedId, reportType, description, evidenceUrls, severity } = req.body;

      if (!reporterId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!reportedId || !reportType) {
        return res.status(400).json({
          success: false,
          message: 'Reported user ID and report type are required',
        });
      }

      const report = await this.reportService.createReport({
        reporterId,
        reportedId,
        reportType,
        description,
        evidenceUrls,
        severity,
      });

      return res.status(201).json({
        success: true,
        message: 'Report submitted successfully',
        data: report,
      });
    } catch (error: any) {
      logger.error('Create report error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create report',
      });
    }
  }

  async getReportCategories(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const categories = await this.reportService.getReportCategories();

      return res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error: any) {
      logger.error('Get report categories error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get report categories',
      });
    }
  }

  async getMyReports(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      const { limit, offset } = req.query;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const options: any = {};
      if (limit) options.limit = parseInt(limit as string);
      if (offset) options.offset = parseInt(offset as string);

      const reports = await this.reportService.getReportsByUser(userId, options);

      return res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error: any) {
      logger.error('Get my reports error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get reports',
      });
    }
  }

  async resolveReport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const moderatorId = req.user?.userId;
      const { reportId } = req.params;
      const { resolution, actionTaken } = req.body;

      if (!moderatorId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      if (!resolution || !actionTaken) {
        return res.status(400).json({
          success: false,
          message: 'Resolution and action taken are required',
        });
      }

      const report = await this.reportService.resolveReport(
        reportId,
        resolution,
        actionTaken,
        moderatorId
      );

      return res.status(200).json({
        success: true,
        message: 'Report resolved successfully',
        data: report,
      });
    } catch (error: any) {
      logger.error('Resolve report error:', error);

      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to resolve report',
      });
    }
  }

  async getModerationQueue(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { limit } = req.query;
      const limitNum = limit ? parseInt(limit as string) : 50;

      const queue = await this.reportService.getModerationQueue(limitNum);

      return res.status(200).json({
        success: true,
        data: queue,
      });
    } catch (error: any) {
      logger.error('Get moderation queue error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get moderation queue',
      });
    }
  }

  async getReportStats(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const stats = await this.reportService.getReportStats();

      return res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error('Get report stats error:', error);

      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get report stats',
      });
    }
  }
}

export default new ReportController();
