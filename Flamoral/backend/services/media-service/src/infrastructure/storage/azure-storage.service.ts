import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('azure-storage-service');

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient | null = null;
  private containerClient: ContainerClient | null = null;
  private sharedKeyCredential: StorageSharedKeyCredential | null = null;
  private initialized: boolean = false;
  private initializationError: Error | null = null;

  constructor() {
    this.initializeClients();
  }

  /**
   * Initialize blob service and container clients
   */
  private initializeClients(): void {
    try {
      let connectionString: string;

      // Use Azurite for local development if Azure credentials are not provided
      if (config.nodeEnv === 'development' && (!config.azure.storageAccountName || !config.azure.storageAccountKey)) {
        // Azurite default connection string
        connectionString = 'UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://localhost:10000/devstoreaccount1';
        logger.info('Using Azurite (Azure Storage Emulator) for local development');
      } else if (!config.azure.storageAccountName || !config.azure.storageAccountKey) {
        // Missing credentials - log error but don't crash
        const error = new Error('Azure Storage credentials not configured. Please set AZURE_STORAGE_ACCOUNT_NAME and AZURE_STORAGE_ACCOUNT_KEY');
        this.initializationError = error;
        logger.error('Azure Storage configuration error:', error.message);
        logger.warn('Media service running in degraded mode - uploads will fail until credentials are configured');
        return;
      } else {
        // Production Azure Storage connection string
        connectionString = `DefaultEndpointsProtocol=https;AccountName=${config.azure.storageAccountName};AccountKey=${config.azure.storageAccountKey};EndpointSuffix=core.windows.net`;

        // Initialize shared key credential for SAS token generation
        this.sharedKeyCredential = new StorageSharedKeyCredential(
          config.azure.storageAccountName,
          config.azure.storageAccountKey
        );

        logger.info('Using Azure Blob Storage');
      }

      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(config.azure.containerName);
      logger.info('Azure Storage clients initialized successfully');
    } catch (error) {
      this.initializationError = error as Error;
      logger.error('Failed to initialize Azure Storage clients:', error);
      logger.warn('Media service running in degraded mode - uploads will fail');
    }
  }

  /**
   * Initialize container (create if doesn't exist)
   */
  async initialize(): Promise<void> {
    if (this.initializationError) {
      logger.error('Cannot initialize Azure Storage - client initialization failed:', this.initializationError.message);
      return;
    }

    if (!this.containerClient) {
      const error = new Error('Container client not initialized');
      this.initializationError = error;
      logger.error('Cannot initialize Azure Storage:', error.message);
      return;
    }

    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create({ access: 'blob' });
        logger.info(`Container ${config.azure.containerName} created successfully`);
      } else {
        logger.info(`Container ${config.azure.containerName} already exists`);
      }
      this.initialized = true;
      this.initializationError = null;
      logger.info('Azure Storage initialized successfully');
    } catch (error) {
      this.initializationError = error as Error;
      logger.error('Failed to initialize Azure Storage container:', error);
      logger.warn('Media service running in degraded mode - uploads will fail');
    }
  }

  /**
   * Check if storage is healthy and ready
   */
  isHealthy(): boolean {
    return this.initialized && !this.initializationError && this.containerClient !== null;
  }

  /**
   * Get health status with details
   */
  getHealthStatus(): { healthy: boolean; error?: string; initialized: boolean } {
    return {
      healthy: this.isHealthy(),
      error: this.initializationError?.message,
      initialized: this.initialized,
    };
  }

  /**
   * Ensure storage is ready before operations
   */
  private ensureInitialized(): void {
    if (!this.isHealthy()) {
      throw new Error(
        this.initializationError?.message || 'Azure Storage not initialized - check configuration'
      );
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads'
  ): Promise<string> {
    this.ensureInitialized();

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Add timestamp to filename for cache-busting
        const timestamp = Date.now();
        const fileNameParts = fileName.split('.');
        const extension = fileNameParts.pop();
        const baseName = fileNameParts.join('.');
        const blobName = `${folder}/${uuidv4()}-${baseName}-${timestamp}.${extension}`;

        const blockBlobClient: BlockBlobClient = this.containerClient!.getBlockBlobClient(blobName);

        // Determine cache control based on folder (profile images need revalidation)
        const isProfileImage = folder.includes('profile') || folder.includes('standard') || folder.includes('thumbnails');
        const cacheControl = isProfileImage
          ? 'public, max-age=3600, must-revalidate' // 1 hour with revalidation for profile images
          : 'public, max-age=31536000, immutable'; // 1 year immutable for other content

        await blockBlobClient.upload(buffer, buffer.length, {
          blobHTTPHeaders: {
            blobContentType: mimeType,
            blobCacheControl: cacheControl,
            blobContentDisposition: 'inline', // Display in browser instead of download
          },
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalName: fileName,
            size: buffer.length.toString(),
            timestamp: timestamp.toString(),
          },
        });

        // Return CDN URL if configured, otherwise return blob URL
        const url = this.getCdnUrl(blockBlobClient.url);
        logger.info(`File uploaded successfully: ${blobName}`, {
          attempt,
          size: buffer.length,
          cdnEnabled: !!config.azure.cdnUrl,
          cacheControl,
        });

        return url;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`Upload attempt ${attempt} failed`, {
          attempt,
          maxRetries,
          error: (error as Error).message,
        });

        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
        }
      }
    }

    logger.error('Failed to upload file after all retries', lastError);
    throw new Error('File upload failed after multiple attempts');
  }

  /**
   * Upload multiple versions of an image
   */
  async uploadImageVersions(
    buffers: { thumbnail: Buffer; standard: Buffer; hd: Buffer; original: Buffer },
    fileName: string,
    mimeType: string,
    userId: string
  ): Promise<{ thumbnail: string; standard: string; hd: string; original: string }> {
    this.ensureInitialized();

    try {
      const baseFileName = fileName.replace(/\.[^/.]+$/, '');
      const extension = fileName.split('.').pop();

      const [thumbnailUrl, standardUrl, hdUrl, originalUrl] = await Promise.all([
        this.uploadFile(buffers.thumbnail, `${baseFileName}-thumb.${extension}`, mimeType, `${userId}/thumbnails`),
        this.uploadFile(buffers.standard, `${baseFileName}-std.${extension}`, mimeType, `${userId}/standard`),
        this.uploadFile(buffers.hd, `${baseFileName}-hd.${extension}`, mimeType, `${userId}/hd`),
        this.uploadFile(buffers.original, `${baseFileName}.${extension}`, mimeType, `${userId}/original`),
      ]);

      return {
        thumbnail: thumbnailUrl,
        standard: standardUrl,
        hd: hdUrl,
        original: originalUrl,
      };
    } catch (error) {
      logger.error('Failed to upload image versions', error);
      throw error;
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   */
  async deleteFile(url: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Convert CDN URL to blob URL if needed
      const blobUrl = this.getBlobUrlFromCdn(url);

      // Extract blob name from URL
      const blobName = blobUrl.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      await blockBlobClient.delete();

      logger.info(`File deleted successfully: ${blobName}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete file from Azure Storage', error);
      return false;
    }
  }

  /**
   * Delete all versions of an image
   */
  async deleteImageVersions(urls: {
    thumbnail: string;
    standard: string;
    hd: string;
    original: string;
  }): Promise<boolean> {
    try {
      await Promise.all([
        this.deleteFile(urls.thumbnail),
        this.deleteFile(urls.standard),
        this.deleteFile(urls.hd),
        this.deleteFile(urls.original),
      ]);

      return true;
    } catch (error) {
      logger.error('Failed to delete image versions', error);
      return false;
    }
  }

  /**
   * Get a file from Azure Blob Storage
   */
  async getFile(url: string): Promise<Buffer> {
    this.ensureInitialized();

    try {
      // Convert CDN URL to blob URL if needed
      const blobUrl = this.getBlobUrlFromCdn(url);

      const blobName = blobUrl.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      const downloadResponse = await blockBlobClient.download(0);

      if (!downloadResponse.readableStreamBody) {
        throw new Error('Failed to download file');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Failed to get file from Azure Storage', error);
      throw error;
    }
  }

  /**
   * Upload a blob with custom path
   */
  async uploadBlob(buffer: Buffer, blobPath: string, mimeType: string): Promise<string> {
    this.ensureInitialized();

    try {
      const blockBlobClient: BlockBlobClient = this.containerClient!.getBlockBlobClient(blobPath);

      // Determine cache control based on path (profile images need revalidation)
      const isProfileImage = blobPath.includes('profile') || blobPath.includes('standard') || blobPath.includes('thumb');
      const cacheControl = isProfileImage
        ? 'public, max-age=3600, must-revalidate' // 1 hour with revalidation for profile images
        : 'public, max-age=31536000, immutable'; // 1 year immutable for other content

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
          blobCacheControl: cacheControl,
        },
      });

      // Return CDN URL if configured, otherwise return blob URL
      const url = this.getCdnUrl(blockBlobClient.url);
      logger.info(`Blob uploaded successfully: ${blobPath}`);

      return url;
    } catch (error) {
      logger.error('Failed to upload blob to Azure Storage', error);
      throw new Error('Blob upload failed');
    }
  }

  /**
   * Delete a blob by URL
   */
  async deleteBlob(url: string): Promise<boolean> {
    return this.deleteFile(url);
  }

  /**
   * Download a blob by URL
   */
  async downloadBlob(url: string): Promise<Buffer> {
    return this.getFile(url);
  }

  /**
   * Check if a blob exists
   */
  async blobExists(url: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Convert CDN URL to blob URL if needed
      const blobUrl = this.getBlobUrlFromCdn(url);

      const blobName = blobUrl.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        return false;
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      return await blockBlobClient.exists();
    } catch (error) {
      logger.error('Failed to check if blob exists', error);
      return false;
    }
  }

  /**
   * Get blob metadata
   */
  async getBlobMetadata(url: string): Promise<{
    contentType?: string;
    contentLength?: number;
    lastModified?: Date;
  }> {
    this.ensureInitialized();

    try {
      // Convert CDN URL to blob URL if needed
      const blobUrl = this.getBlobUrlFromCdn(url);

      const blobName = blobUrl.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);
      const properties = await blockBlobClient.getProperties();

      return {
        contentType: properties.contentType,
        contentLength: properties.contentLength,
        lastModified: properties.lastModified,
      };
    } catch (error) {
      logger.error('Failed to get blob metadata', error);
      throw error;
    }
  }

  /**
   * Convert blob URL to CDN URL with fallback
   */
  private getCdnUrl(blobUrl: string): string {
    const cdnUrl = config.azure.cdnUrl;

    if (!cdnUrl) {
      logger.debug('CDN URL not configured, using blob URL directly');
      return blobUrl;
    }

    try {
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');

      // Remove container name from path (first part after /)
      const blobPath = pathParts.slice(2).join('/');

      // Ensure CDN URL doesn't end with slash
      const cleanCdnUrl = cdnUrl.endsWith('/') ? cdnUrl.slice(0, -1) : cdnUrl;

      const finalUrl = `${cleanCdnUrl}/${blobPath}`;
      logger.debug('Converted blob URL to CDN URL', {
        blobUrl,
        cdnUrl: finalUrl,
      });

      return finalUrl;
    } catch (error) {
      logger.error('Failed to convert blob URL to CDN URL, falling back to blob URL', error);
      return blobUrl;
    }
  }

  /**
   * Test CDN connectivity
   */
  async testCdnConnectivity(): Promise<boolean> {
    const cdnUrl = config.azure.cdnUrl;

    if (!cdnUrl) {
      logger.info('CDN not configured, skipping connectivity test');
      return false;
    }

    try {
      const response = await fetch(cdnUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const isHealthy = response.ok;
      logger.info('CDN connectivity test result', {
        cdnUrl,
        status: response.status,
        healthy: isHealthy,
      });

      return isHealthy;
    } catch (error) {
      logger.warn('CDN connectivity test failed', {
        cdnUrl,
        error: (error as Error).message,
      });
      return false;
    }
  }

  /**
   * Convert CDN URL back to blob URL (for deletion and management)
   */
  private getBlobUrlFromCdn(cdnUrl: string): string {
    const cdnBaseUrl = config.azure.cdnUrl;

    if (!cdnBaseUrl || !cdnUrl.startsWith(cdnBaseUrl)) {
      return cdnUrl;
    }

    try {
      const blobPath = cdnUrl.replace(cdnBaseUrl, '').replace(/^\//, '');
      return `https://${config.azure.storageAccountName}.blob.core.windows.net/${config.azure.containerName}/${blobPath}`;
    } catch (error) {
      logger.error('Failed to convert CDN URL to blob URL', error);
      return cdnUrl;
    }
  }

  /**
   * Generate a SAS token for a blob with read permissions
   * @param blobName - Name of the blob
   * @param expiryMinutes - How long the SAS token should be valid (default: 60 minutes)
   * @returns SAS token URL
   */
  async generatePresignedUrl(blobName: string, expiryMinutes: number = 60): Promise<string> {
    this.ensureInitialized();

    if (!this.sharedKeyCredential) {
      throw new Error('Shared key credential not initialized. Cannot generate SAS token.');
    }

    try {
      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);

      // Set expiry time
      const expiresOn = new Date();
      expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

      // Define permissions (read-only for presigned URLs)
      const permissions = new BlobSASPermissions();
      permissions.read = true;

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: config.azure.containerName,
          blobName,
          permissions,
          expiresOn,
          startsOn: new Date(),
        },
        this.sharedKeyCredential
      ).toString();

      // Return full URL with SAS token
      const presignedUrl = `${blockBlobClient.url}?${sasToken}`;
      logger.info(`Generated presigned URL for ${blobName}, expires in ${expiryMinutes} minutes`);

      return presignedUrl;
    } catch (error) {
      logger.error('Failed to generate presigned URL', error);
      throw new Error('Presigned URL generation failed');
    }
  }

  /**
   * Generate a SAS token for upload with write permissions
   * @param blobName - Name of the blob
   * @param expiryMinutes - How long the SAS token should be valid (default: 30 minutes)
   * @returns SAS token URL for upload
   */
  async generateUploadPresignedUrl(blobName: string, expiryMinutes: number = 30): Promise<string> {
    this.ensureInitialized();

    if (!this.sharedKeyCredential) {
      throw new Error('Shared key credential not initialized. Cannot generate SAS token.');
    }

    try {
      const blockBlobClient = this.containerClient!.getBlockBlobClient(blobName);

      // Set expiry time
      const expiresOn = new Date();
      expiresOn.setMinutes(expiresOn.getMinutes() + expiryMinutes);

      // Define permissions (write for uploads)
      const permissions = new BlobSASPermissions();
      permissions.write = true;
      permissions.create = true;

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: config.azure.containerName,
          blobName,
          permissions,
          expiresOn,
          startsOn: new Date(),
        },
        this.sharedKeyCredential
      ).toString();

      // Return full URL with SAS token
      const presignedUrl = `${blockBlobClient.url}?${sasToken}`;
      logger.info(`Generated upload presigned URL for ${blobName}, expires in ${expiryMinutes} minutes`);

      return presignedUrl;
    } catch (error) {
      logger.error('Failed to generate upload presigned URL', error);
      throw new Error('Upload presigned URL generation failed');
    }
  }

  /**
   * Generate a temporary download URL for a blob
   * @param url - Blob URL or CDN URL
   * @param expiryMinutes - How long the URL should be valid (default: 60 minutes)
   * @returns Temporary download URL
   */
  async generateTemporaryDownloadUrl(url: string, expiryMinutes: number = 60): Promise<string> {
    this.ensureInitialized();

    try {
      // Convert CDN URL to blob URL if needed
      const blobUrl = this.getBlobUrlFromCdn(url);

      // Extract blob name from URL
      const blobName = blobUrl.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      // Generate presigned URL
      return await this.generatePresignedUrl(blobName, expiryMinutes);
    } catch (error) {
      logger.error('Failed to generate temporary download URL', error);
      throw error;
    }
  }

  /**
   * Set CORS rules for the blob service
   */
  async configureCORS(): Promise<void> {
    this.ensureInitialized();

    if (!this.blobServiceClient) {
      throw new Error('Blob service client not initialized');
    }

    try {
      // Get allowed origins from environment or use defaults
      const allowedOrigins = process.env.AZURE_STORAGE_CORS_ORIGINS
        ? process.env.AZURE_STORAGE_CORS_ORIGINS.split(',').map(o => o.trim())
        : ['https://flamoral.com', 'https://www.flamoral.com', 'https://admin.flamoral.com'];

      // Add localhost for development
      if (config.nodeEnv === 'development') {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:4000');
      }

      const maxAgeInSeconds = parseInt(process.env.AZURE_STORAGE_CORS_MAX_AGE || '3600', 10);

      const corsRules = [
        {
          allowedOrigins,
          allowedMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          allowedHeaders: [
            'Origin',
            'Content-Type',
            'Accept',
            'Authorization',
            'X-Requested-With',
            'x-ms-blob-type',
            'x-ms-blob-content-type',
            'x-ms-meta-*',
          ],
          exposedHeaders: [
            'x-ms-request-id',
            'x-ms-version',
            'Date',
            'ETag',
            'Content-Length',
            'Content-Type',
            'Last-Modified',
          ],
          maxAgeInSeconds,
        },
      ];

      await this.blobServiceClient.setProperties({
        cors: corsRules,
      });

      logger.info('CORS rules configured successfully for blob storage', {
        allowedOrigins,
        maxAgeInSeconds,
      });
    } catch (error) {
      logger.error('Failed to configure CORS rules', error);
      throw error;
    }
  }

  /**
   * Get comprehensive health check information
   */
  async getHealthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    storage: {
      initialized: boolean;
      containerExists: boolean;
      error?: string;
    };
    cdn: {
      configured: boolean;
      healthy: boolean;
      url?: string;
    };
  }> {
    const healthCheck = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      storage: {
        initialized: this.initialized,
        containerExists: false,
        error: this.initializationError?.message,
      },
      cdn: {
        configured: !!config.azure.cdnUrl,
        healthy: false,
        url: config.azure.cdnUrl,
      },
    };

    try {
      // Check if container exists
      if (this.containerClient) {
        healthCheck.storage.containerExists = await this.containerClient.exists();
      }

      // Test CDN connectivity
      if (config.azure.cdnUrl) {
        healthCheck.cdn.healthy = await this.testCdnConnectivity();
      }

      // Determine overall status
      if (!healthCheck.storage.initialized || !healthCheck.storage.containerExists) {
        healthCheck.status = 'unhealthy';
      } else if (healthCheck.cdn.configured && !healthCheck.cdn.healthy) {
        healthCheck.status = 'degraded';
      }

      logger.info('Health check completed', healthCheck);
    } catch (error) {
      logger.error('Health check failed', error);
      healthCheck.status = 'unhealthy';
      healthCheck.storage.error = (error as Error).message;
    }

    return healthCheck;
  }
}

export default new AzureStorageService();
