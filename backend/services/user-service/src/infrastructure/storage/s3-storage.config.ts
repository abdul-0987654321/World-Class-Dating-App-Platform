import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('s3-storage');

interface S3StorageConfig {
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

class S3StorageService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(config: S3StorageConfig) {
    const { region, bucket, accessKeyId, secretAccessKey } = config;
    this.bucket = bucket;
    this.region = region;

    // Initialize S3 client
    // Uses environment credentials or IAM role if accessKeyId/secretAccessKey not provided
    const clientConfig: any = { region };

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }

    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      });

      await this.s3Client.send(command);

      // Return the URL of the uploaded object
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
      });

      await this.s3Client.send(command);
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file from S3');
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(fileName: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileName}`;
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error('Error checking file existence:', error);
      return false;
    }
  }

  /**
   * Generate a presigned URL for secure access
   */
  async getSignedUrl(fileName: string, expiresInSeconds: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: fileName,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn: expiresInSeconds });
    } catch (error) {
      logger.error('Error generating signed URL:', error);
      throw new Error('Failed to generate signed URL');
    }
  }
}

// Create singleton instance (lazy initialization)
let s3StorageInstance: S3StorageService | null = null;

export const s3Storage = {
  getInstance(): S3StorageService {
    if (!s3StorageInstance) {
      const config: S3StorageConfig = {
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.AWS_S3_BUCKET_PHOTOS || 'flamoral-photos',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
      s3StorageInstance = new S3StorageService(config);
    }
    return s3StorageInstance;
  },

  async uploadFile(fileName: string, fileBuffer: Buffer, contentType: string): Promise<string> {
    return this.getInstance().uploadFile(fileName, fileBuffer, contentType);
  },

  async deleteFile(fileName: string): Promise<void> {
    return this.getInstance().deleteFile(fileName);
  },

  getFileUrl(fileName: string): string {
    return this.getInstance().getFileUrl(fileName);
  },

  async fileExists(fileName: string): Promise<boolean> {
    return this.getInstance().fileExists(fileName);
  },

  async getSignedUrl(fileName: string, expiresInSeconds?: number): Promise<string> {
    return this.getInstance().getSignedUrl(fileName, expiresInSeconds);
  },
};

// Export for backwards compatibility - alias to s3Storage
export const storage = s3Storage;
