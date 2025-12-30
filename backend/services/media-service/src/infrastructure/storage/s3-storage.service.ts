import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('s3-storage-service');

/**
 * SECURITY: Default signed URL expiration time in seconds
 * 1 hour = 3600 seconds
 */
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

export class S3StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;
  private isLocalDevelopment: boolean = false;

  constructor() {
    this.region = config.aws?.region || process.env.AWS_REGION || 'us-east-1';
    this.bucket = config.aws?.s3Bucket || process.env.AWS_S3_BUCKET_MEDIA || 'flamoral-media';

    // Use LocalStack for local development if AWS credentials are not provided
    if (config.nodeEnv === 'development' && !process.env.AWS_ACCESS_KEY_ID) {
      logger.info('Using LocalStack (S3 Emulator) for local development');
      this.isLocalDevelopment = true;
      this.s3Client = new S3Client({
        region: this.region,
        endpoint: 'http://localhost:4566',
        forcePathStyle: true,
        credentials: {
          accessKeyId: 'test',
          secretAccessKey: 'test',
        },
      });
    } else {
      logger.info('Using AWS S3 Storage');
      this.s3Client = new S3Client({
        region: this.region,
        // Credentials loaded from environment or IAM role
      });
    }
  }

  /**
   * Initialize bucket (for local development)
   */
  async initialize(): Promise<void> {
    try {
      if (this.isLocalDevelopment) {
        // In local dev with LocalStack, we might need to create the bucket
        const { CreateBucketCommand } = await import('@aws-sdk/client-s3');
        try {
          await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          logger.info(`Bucket ${this.bucket} created successfully`);
        } catch (error: any) {
          if (error.name !== 'BucketAlreadyOwnedByYou' && error.name !== 'BucketAlreadyExists') {
            throw error;
          }
        }
      }
      logger.info(`S3 bucket ${this.bucket} is ready`);
    } catch (error) {
      logger.error('Failed to initialize S3 bucket', error);
      throw error;
    }
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    folder: string = 'uploads'
  ): Promise<string> {
    try {
      const key = `${folder}/${uuidv4()}-${fileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      });

      await this.s3Client.send(command);

      const url = this.getObjectUrl(key);
      logger.info(`File uploaded successfully: ${key}`);

      return url;
    } catch (error) {
      logger.error('Failed to upload file to S3', error);
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
   * Delete a file from S3
   */
  async deleteFile(url: string): Promise<boolean> {
    try {
      const key = this.extractKeyFromUrl(url);
      if (!key) {
        throw new Error('Invalid S3 URL');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      logger.info(`File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete file from S3', error);
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
   * Get a file from S3
   */
  async getFile(url: string): Promise<Buffer> {
    try {
      const key = this.extractKeyFromUrl(url);
      if (!key) {
        throw new Error('Invalid S3 URL');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Failed to download file');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('Failed to get file from S3', error);
      throw error;
    }
  }

  /**
   * Upload a blob with custom path
   */
  async uploadBlob(buffer: Buffer, blobPath: string, mimeType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: blobPath,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000', // 1 year cache for media files
      });

      await this.s3Client.send(command);

      const url = this.getObjectUrl(blobPath);
      logger.info(`Blob uploaded successfully: ${blobPath}`);

      return url;
    } catch (error) {
      logger.error('Failed to upload blob to S3', error);
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
      const key = this.extractKeyFromUrl(url);
      if (!key) {
        return false;
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
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
      const key = this.extractKeyFromUrl(url);
      if (!key) {
        throw new Error('Invalid S3 URL');
      }

      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return {
        contentType: response.ContentType,
        contentLength: response.ContentLength,
        lastModified: response.LastModified,
      };
    } catch (error) {
      logger.error('Failed to get blob metadata', error);
      throw error;
    }
  }

  /**
   * SECURITY: Generate signed URL for media access
   * Signed URLs expire after 1 hour by default
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

      const key = this.extractKeyFromUrl(url) || url;

      // SECURITY: Limit expiry time to maximum 4 hours
      const maxExpirySeconds = 4 * 60 * 60; // 4 hours
      const safeExpirySeconds = Math.min(expirySeconds, maxExpirySeconds);

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: safeExpirySeconds,
      });

      const expiresAt = new Date(Date.now() + safeExpirySeconds * 1000);

      logger.info('Generated signed URL', {
        key,
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

  /**
   * Helper: Get object URL
   */
  private getObjectUrl(key: string): string {
    if (this.isLocalDevelopment) {
      return `http://localhost:4566/${this.bucket}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Helper: Extract key from URL
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      // Handle LocalStack URLs
      if (url.includes('localhost:4566')) {
        const parts = url.split(`/${this.bucket}/`);
        return parts[1] || null;
      }

      // Handle S3 URLs
      const s3Patterns = [
        new RegExp(`https://${this.bucket}\\.s3\\.${this.region}\\.amazonaws\\.com/(.+)`),
        new RegExp(`https://${this.bucket}\\.s3\\.amazonaws\\.com/(.+)`),
        new RegExp(`https://s3\\.${this.region}\\.amazonaws\\.com/${this.bucket}/(.+)`),
      ];

      for (const pattern of s3Patterns) {
        const match = url.match(pattern);
        if (match) {
          return match[1].split('?')[0]; // Remove query params
        }
      }

      // If no pattern matches, assume it's just a key
      if (!url.startsWith('http')) {
        return url;
      }

      return null;
    } catch {
      return null;
    }
  }
}

// Export singleton instance
export default new S3StorageService();

// Named export for compatibility
export const storageService = new S3StorageService();
