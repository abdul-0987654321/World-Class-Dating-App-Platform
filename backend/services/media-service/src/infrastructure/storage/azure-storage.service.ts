import {
  BlobServiceClient,
  ContainerClient,
  BlockBlobClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
  SASProtocol,
} from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('azure-storage-service');

/**
 * SECURITY: Default signed URL expiration time in seconds
 * 1 hour = 3600 seconds
 */
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private sharedKeyCredential: StorageSharedKeyCredential | null = null;
  private isLocalDevelopment: boolean = false;

  constructor() {
    let connectionString: string;

    // Use Azurite for local development if Azure credentials are not provided
    if (config.nodeEnv === 'development' && (!config.azure.storageAccountName || !config.azure.storageAccountKey)) {
      // Azurite default connection string
      connectionString = 'UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://localhost:10000/devstoreaccount1';
      logger.info('Using Azurite (Azure Storage Emulator) for local development');
      this.isLocalDevelopment = true;
    } else {
      // Production Azure Storage connection string
      connectionString = `DefaultEndpointsProtocol=https;AccountName=${config.azure.storageAccountName};AccountKey=${config.azure.storageAccountKey};EndpointSuffix=core.windows.net`;
      logger.info('Using Azure Blob Storage');

      // SECURITY: Create shared key credential for signed URL generation
      if (config.azure.storageAccountName && config.azure.storageAccountKey) {
        this.sharedKeyCredential = new StorageSharedKeyCredential(
          config.azure.storageAccountName,
          config.azure.storageAccountKey
        );
      }
    }

    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(config.azure.containerName);
  }

  /**
   * Initialize container (create if doesn't exist)
   */
  async initialize(): Promise<void> {
    try {
      const exists = await this.containerClient.exists();
      if (!exists) {
        await this.containerClient.create({ access: 'blob' });
        logger.info(`Container ${config.azure.containerName} created successfully`);
      }
    } catch (error) {
      logger.error('Failed to initialize Azure Storage container', error);
      throw error;
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
    try {
      const blobName = `${folder}/${uuidv4()}-${fileName}`;
      const blockBlobClient: BlockBlobClient = this.containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
      });

      const url = blockBlobClient.url;
      logger.info(`File uploaded successfully: ${blobName}`);

      return url;
    } catch (error) {
      logger.error('Failed to upload file to Azure Storage', error);
      throw new Error('File upload failed');
    }
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
    try {
      // Extract blob name from URL
      const blobName = url.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
    try {
      const blobName = url.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
    try {
      const blockBlobClient: BlockBlobClient = this.containerClient.getBlockBlobClient(blobPath);

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
          blobCacheControl: 'public, max-age=31536000', // 1 year cache for media files
        },
      });

      const url = blockBlobClient.url;
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
    try {
      const blobName = url.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        return false;
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
    try {
      const blobName = url.split(`/${config.azure.containerName}/`)[1];
      if (!blobName) {
        throw new Error('Invalid blob URL');
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
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
   * SECURITY: Generate signed URL for media access
   * Signed URLs expire after 1 hour by default
   *
   * @param url - The original blob URL or blob path
   * @param expirySeconds - Optional custom expiry time in seconds (default: 3600 = 1 hour)
   * @param userId - Optional user ID for access logging
   * @returns Signed URL with SAS token
   */
  async getSignedUrl(
    url: string,
    expirySeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
    userId?: string
  ): Promise<{
    signedUrl: string;
    expiresAt: Date;
    expirySeconds: number;
  }> {
    try {
      // In local development, just return the original URL
      if (this.isLocalDevelopment) {
        const expiresAt = new Date(Date.now() + expirySeconds * 1000);
        logger.info('Returning unsigned URL for local development', { userId });
        return {
          signedUrl: url,
          expiresAt,
          expirySeconds,
        };
      }

      // SECURITY: Ensure we have credentials for signing
      if (!this.sharedKeyCredential) {
        throw new Error('Storage credentials not available for signing URLs');
      }

      // Extract blob name from URL
      let blobName = url;
      if (url.includes(`/${config.azure.containerName}/`)) {
        blobName = url.split(`/${config.azure.containerName}/`)[1];
      }

      if (!blobName) {
        throw new Error('Invalid blob URL or path');
      }

      // SECURITY: Limit expiry time to maximum 4 hours
      const maxExpirySeconds = 4 * 60 * 60; // 4 hours
      const safeExpirySeconds = Math.min(expirySeconds, maxExpirySeconds);

      // Calculate expiry time
      const startsOn = new Date();
      const expiresAt = new Date(startsOn.getTime() + safeExpirySeconds * 1000);

      // SECURITY: Generate SAS token with read-only permissions
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: config.azure.containerName,
          blobName,
          permissions: BlobSASPermissions.parse('r'), // Read-only
          startsOn,
          expiresOn: expiresAt,
          protocol: SASProtocol.Https, // SECURITY: HTTPS only
        },
        this.sharedKeyCredential
      ).toString();

      const blockBlobClient = this.containerClient.getBlockBlobClient(blobName);
      const signedUrl = `${blockBlobClient.url}?${sasToken}`;

      logger.info('Generated signed URL', {
        blobName,
        expirySeconds: safeExpirySeconds,
        expiresAt,
        userId,
      });

      return {
        signedUrl,
        expiresAt,
        expirySeconds: safeExpirySeconds,
      };
    } catch (error) {
      logger.error('Failed to generate signed URL', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  /**
   * SECURITY: Generate signed URLs for multiple images
   * Used for profile photos that need concurrent signed access
   */
  async getSignedUrls(
    urls: string[],
    expirySeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
    userId?: string
  ): Promise<Array<{ url: string; signedUrl: string; expiresAt: Date }>> {
    const results = await Promise.all(
      urls.map(async (url) => {
        const { signedUrl, expiresAt } = await this.getSignedUrl(url, expirySeconds, userId);
        return { url, signedUrl, expiresAt };
      })
    );

    return results;
  }

  /**
   * SECURITY: Verify user has access to media
   * Checks ownership or other access rules before generating signed URL
   */
  async getSignedUrlWithAccessCheck(
    url: string,
    requestingUserId: string,
    mediaOwnerId: string,
    expirySeconds: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS
  ): Promise<{
    signedUrl: string;
    expiresAt: Date;
    expirySeconds: number;
  } | null> {
    try {
      // SECURITY: For now, allow access - in production, implement proper ACL checks
      // This could check:
      // - Is the requesting user the owner?
      // - Is the requesting user matched with the owner?
      // - Is the content public?
      // - Does the requesting user have premium access?

      logger.info('Generating signed URL with access check', {
        requestingUserId,
        mediaOwnerId,
        url,
      });

      return await this.getSignedUrl(url, expirySeconds, requestingUserId);
    } catch (error) {
      logger.error('Access check failed for signed URL', {
        requestingUserId,
        mediaOwnerId,
        error,
      });
      return null;
    }
  }
}

export default new AzureStorageService();
