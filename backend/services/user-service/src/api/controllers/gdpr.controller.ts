import { Response } from 'express';

import { GDPRService } from '../../domain/services/gdpr.service';
import logger from '../../utils/logger';
import { AuthRequest } from '../middleware/auth.middleware';

export class GDPRController {
  private gdprService: GDPRService;

  constructor() {
    this.gdprService = new GDPRService();
  }

  /**
   * Record user consent
   */
  async recordConsent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { consentType, granted, version } = req.body;

      if (!consentType || typeof granted !== 'boolean' || !version) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: consentType, granted, version',
        });
      }

      await this.gdprService.recordConsent({
        userId,
        consentType,
        granted,
        version,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      return res.status(200).json({
        success: true,
        message: 'Consent recorded successfully',
      });
    } catch (error: any) {
      logger.error('Error recording consent:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to record consent',
      });
    }
  }

  /**
   * Get user's consents
   */
  async getConsents(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const consents = await this.gdprService.getUserConsents(userId);

      return res.status(200).json({
        success: true,
        data: consents,
      });
    } catch (error: any) {
      logger.error('Error getting consents:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get consents',
      });
    }
  }

  /**
   * Revoke consent
   */
  async revokeConsent(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { consentType, reason } = req.body;

      if (!consentType) {
        return res.status(400).json({
          success: false,
          message: 'consentType is required',
        });
      }

      await this.gdprService.revokeConsent(userId, consentType, reason);

      return res.status(200).json({
        success: true,
        message: 'Consent revoked successfully',
      });
    } catch (error: any) {
      logger.error('Error revoking consent:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to revoke consent',
      });
    }
  }

  /**
   * Request data export
   */
  async requestDataExport(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { format = 'json' } = req.body;

      if (!['json', 'zip'].includes(format)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid format. Must be "json" or "zip"',
        });
      }

      const requestId = await this.gdprService.requestDataExport({
        userId,
        format,
        ipAddress: req.ip,
      });

      return res.status(202).json({
        success: true,
        message: 'Data export request submitted. You will receive an email when ready.',
        data: {
          requestId,
        },
      });
    } catch (error: any) {
      logger.error('Error requesting data export:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to request data export',
      });
    }
  }

  /**
   * Get export status
   */
  async getExportStatus(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { requestId } = req.params;

      const status = await this.gdprService.getExportStatus(requestId);

      return res.status(200).json({
        success: true,
        data: status,
      });
    } catch (error: any) {
      logger.error('Error getting export status:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get export status',
      });
    }
  }

  /**
   * Request account deletion
   */
  async requestDeletion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const { deletionType = 'soft_delete', reason } = req.body;

      if (!['soft_delete', 'hard_delete', 'anonymize'].includes(deletionType)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deletion type',
        });
      }

      const requestId = await this.gdprService.requestDeletion({
        userId,
        deletionType,
        reason,
        ipAddress: req.ip,
      });

      return res.status(202).json({
        success: true,
        message: 'Account deletion scheduled. You have 30 days to cancel.',
        data: {
          requestId,
          scheduledFor: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (error: any) {
      logger.error('Error requesting deletion:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to request deletion',
      });
    }
  }

  /**
   * Cancel deletion
   */
  async cancelDeletion(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const { cancellationToken } = req.body;

      if (!cancellationToken) {
        return res.status(400).json({
          success: false,
          message: 'Cancellation token is required',
        });
      }

      await this.gdprService.cancelDeletion(cancellationToken);

      return res.status(200).json({
        success: true,
        message: 'Account deletion cancelled successfully',
      });
    } catch (error: any) {
      logger.error('Error cancelling deletion:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to cancel deletion',
      });
    }
  }

  /**
   * Get data access history
   */
  async getAccessHistory(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const limit = parseInt(req.query.limit as string) || 100;

      const history = await this.gdprService.getDataAccessHistory(userId, limit);

      return res.status(200).json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      logger.error('Error getting access history:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get access history',
      });
    }
  }
}
