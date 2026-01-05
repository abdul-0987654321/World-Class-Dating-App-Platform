import * as fs from 'fs';
import * as path from 'path';

import archiver from 'archiver';

import logger from '../../utils/logger';

export interface GDPRExportRequest {
  userId: string;
  requestId: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface UserDataExport {
  profile: any;
  photos: any[];
  preferences: any;
  matches: any[];
  conversations: any[];
  swipes: any[];
  subscriptions: any[];
  payments: any[];
  verifications: any[];
  reportsMade: any[];
  reportsReceived: any[];
  blocks: any[];
  loginHistory: any[];
  deviceHistory: any[];
  metadata: {
    exportedAt: Date;
    version: string;
    userId: string;
  };
}

class GDPRExportService {
  private readonly EXPORT_EXPIRY_DAYS = 7;
  private readonly EXPORT_DIR = path.join(process.cwd(), 'temp', 'exports');

  constructor() {
    // Ensure export directory exists
    this.ensureExportDirectory();
  }

  /**
   * Request GDPR data export
   */
  async requestDataExport(userId: string): Promise<GDPRExportRequest> {
    // Check for existing pending/processing requests
    const existingRequest = await this.getPendingExportRequest(userId);
    if (existingRequest) {
      return existingRequest;
    }

    const requestId = this.generateRequestId();
    const request: GDPRExportRequest = {
      userId,
      requestId,
      requestedAt: new Date(),
      status: 'pending',
    };

    // Store request
    await this.storeExportRequest(request);

    // Queue export job
    await this.queueExportJob(request);

    logger.info('GDPR export requested', { userId, requestId });

    return request;
  }

  /**
   * Process data export
   */
  async processDataExport(requestId: string): Promise<void> {
    try {
      const request = await this.getExportRequest(requestId);
      if (!request) {
        throw new Error('Export request not found');
      }

      // Update status to processing
      request.status = 'processing';
      await this.updateExportRequest(request);

      logger.info('Starting GDPR export processing', { requestId, userId: request.userId });

      // Gather all user data
      const userData = await this.gatherUserData(request.userId);

      // Generate export files
      const exportPath = await this.generateExportFiles(request.userId, userData);

      // Create archive
      const archivePath = await this.createArchive(request.userId, exportPath);

      // Upload to storage (S3, Azure Blob, etc.)
      const downloadUrl = await this.uploadToStorage(archivePath);

      // Update request with download URL
      request.status = 'completed';
      request.downloadUrl = downloadUrl;
      request.completedAt = new Date();
      request.expiresAt = new Date(Date.now() + this.EXPORT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

      await this.updateExportRequest(request);

      // Notify user
      await this.notifyUserExportReady(request);

      logger.info('GDPR export completed', { requestId, userId: request.userId });

      // Cleanup local files
      await this.cleanupLocalFiles(exportPath, archivePath);
    } catch (error: any) {
      logger.error('GDPR export failed', { requestId, error: error.message });

      const request = await this.getExportRequest(requestId);
      if (request) {
        request.status = 'failed';
        request.error = error.message;
        await this.updateExportRequest(request);
      }
    }
  }

  /**
   * Get export request status
   */
  async getExportStatus(userId: string): Promise<GDPRExportRequest | null> {
    // In production, query from database
    return null;
  }

  /**
   * Download export
   */
  async downloadExport(requestId: string): Promise<string> {
    const request = await this.getExportRequest(requestId);

    if (!request) {
      throw new Error('Export request not found');
    }

    if (request.status !== 'completed') {
      throw new Error('Export is not ready yet');
    }

    if (!request.downloadUrl) {
      throw new Error('Download URL not available');
    }

    if (request.expiresAt && new Date() > request.expiresAt) {
      throw new Error('Export has expired');
    }

    return request.downloadUrl;
  }

  /**
   * Gather all user data
   */
  private async gatherUserData(userId: string): Promise<UserDataExport> {
    // In production, fetch from various services/databases
    const data: UserDataExport = {
      profile: await this.fetchProfileData(userId),
      photos: await this.fetchPhotos(userId),
      preferences: await this.fetchPreferences(userId),
      matches: await this.fetchMatches(userId),
      conversations: await this.fetchConversations(userId),
      swipes: await this.fetchSwipes(userId),
      subscriptions: await this.fetchSubscriptions(userId),
      payments: await this.fetchPayments(userId),
      verifications: await this.fetchVerifications(userId),
      reportsMade: await this.fetchReportsMade(userId),
      reportsReceived: await this.fetchReportsReceived(userId),
      blocks: await this.fetchBlocks(userId),
      loginHistory: await this.fetchLoginHistory(userId),
      deviceHistory: await this.fetchDeviceHistory(userId),
      metadata: {
        exportedAt: new Date(),
        version: '1.0',
        userId,
      },
    };

    return data;
  }

  /**
   * Generate export files
   */
  private async generateExportFiles(userId: string, data: UserDataExport): Promise<string> {
    const exportPath = path.join(this.EXPORT_DIR, userId);

    // Create user export directory
    await fs.promises.mkdir(exportPath, { recursive: true });

    // Write data to JSON files
    await fs.promises.writeFile(
      path.join(exportPath, 'profile.json'),
      JSON.stringify(data.profile, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'photos.json'),
      JSON.stringify(data.photos, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'preferences.json'),
      JSON.stringify(data.preferences, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'matches.json'),
      JSON.stringify(data.matches, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'conversations.json'),
      JSON.stringify(data.conversations, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'swipes.json'),
      JSON.stringify(data.swipes, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'subscriptions.json'),
      JSON.stringify(data.subscriptions, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'payments.json'),
      JSON.stringify(data.payments, null, 2)
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'activity.json'),
      JSON.stringify(
        {
          loginHistory: data.loginHistory,
          deviceHistory: data.deviceHistory,
        },
        null,
        2
      )
    );

    await fs.promises.writeFile(
      path.join(exportPath, 'moderation.json'),
      JSON.stringify(
        {
          reportsMade: data.reportsMade,
          reportsReceived: data.reportsReceived,
          blocks: data.blocks,
        },
        null,
        2
      )
    );

    // Create README
    await this.createReadmeFile(exportPath);

    return exportPath;
  }

  /**
   * Create archive
   */
  private async createArchive(userId: string, exportPath: string): Promise<string> {
    const archivePath = path.join(this.EXPORT_DIR, `${userId}_export.zip`);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info('Archive created', { archivePath, size: archive.pointer() });
        resolve(archivePath);
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(exportPath, false);
      archive.finalize();
    });
  }

  /**
   * Create README file
   */
  private async createReadmeFile(exportPath: string): Promise<void> {
    const readme = `
# Your Personal Data Export

This archive contains all personal data we have collected about you, as required by GDPR.

## Contents

- **profile.json**: Your profile information
- **photos.json**: Information about your photos
- **preferences.json**: Your dating preferences
- **matches.json**: Your match history
- **conversations.json**: Your conversation history
- **swipes.json**: Your swipe history
- **subscriptions.json**: Your subscription history
- **payments.json**: Your payment history
- **activity.json**: Your login and device history
- **moderation.json**: Reports and blocks

## Data Format

All data is provided in JSON format for easy parsing and readability.

## Questions?

If you have any questions about this data export, please contact our support team.

Export generated: ${new Date().toISOString()}
`;

    await fs.promises.writeFile(path.join(exportPath, 'README.txt'), readme);
  }

  /**
   * Upload to storage
   */
  private async uploadToStorage(archivePath: string): Promise<string> {
    // In production, upload to S3, Azure Blob, or similar
    // For now, return local path
    return `file://${archivePath}`;
  }

  /**
   * Cleanup local files
   */
  private async cleanupLocalFiles(...paths: string[]): Promise<void> {
    for (const p of paths) {
      try {
        await fs.promises.rm(p, { recursive: true, force: true });
      } catch (error) {
        logger.error('Failed to cleanup local files', { path: p, error });
      }
    }
  }

  /**
   * Notify user export is ready
   */
  private async notifyUserExportReady(request: GDPRExportRequest): Promise<void> {
    // In production, send email notification
    logger.info('Export ready notification would be sent', {
      userId: request.userId,
      requestId: request.requestId,
    });
  }

  // Data fetching methods (placeholders)
  private async fetchProfileData(userId: string): Promise<any> {
    return {};
  }

  private async fetchPhotos(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchPreferences(userId: string): Promise<any> {
    return {};
  }

  private async fetchMatches(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchConversations(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchSwipes(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchSubscriptions(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchPayments(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchVerifications(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchReportsMade(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchReportsReceived(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchBlocks(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchLoginHistory(userId: string): Promise<any[]> {
    return [];
  }

  private async fetchDeviceHistory(userId: string): Promise<any[]> {
    return [];
  }

  // Helper methods
  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.EXPORT_DIR)) {
      fs.mkdirSync(this.EXPORT_DIR, { recursive: true });
    }
  }

  private generateRequestId(): string {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async storeExportRequest(request: GDPRExportRequest): Promise<void> {
    // In production, store in database
    logger.debug('Export request stored', { requestId: request.requestId });
  }

  private async updateExportRequest(request: GDPRExportRequest): Promise<void> {
    // In production, update in database
    logger.debug('Export request updated', {
      requestId: request.requestId,
      status: request.status,
    });
  }

  private async getExportRequest(requestId: string): Promise<GDPRExportRequest | null> {
    // In production, fetch from database
    return null;
  }

  private async getPendingExportRequest(userId: string): Promise<GDPRExportRequest | null> {
    // In production, query from database
    return null;
  }

  private async queueExportJob(request: GDPRExportRequest): Promise<void> {
    // In production, add to job queue (Bull, BullMQ, etc.)
    // For now, process immediately (async)
    setTimeout(() => {
      this.processDataExport(request.requestId);
    }, 1000);
  }
}

export const gdprExportService = new GDPRExportService();
export default gdprExportService;
