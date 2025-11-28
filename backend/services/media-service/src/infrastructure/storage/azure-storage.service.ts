import { BlobServiceClient, ContainerClient, BlockBlobClient } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';
import config from '../../config';
import { createLogger } from '@flamoral/shared';

const logger = createLogger('azure-storage-service');

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;

  constructor() {
    let connectionString: string;

    // Use Azurite for local development if Azure credentials are not provided
    if (config.nodeEnv === 'development' && (!config.azure.storageAccountName || !config.azure.storageAccountKey)) {
      // Azurite default connection string
      connectionString = 'UseDevelopmentStorage=true;DevelopmentStorageProxyUri=http://localhost:10000/devstoreaccount1';
      logger.info('Using Azurite (Azure Storage Emulator) for local development');
    } else {
      // Production Azure Storage connection string
      connectionString = `DefaultEndpointsProtocol=https;AccountName=${config.azure.storageAccountName};AccountKey=${config.azure.storageAccountKey};EndpointSuffix=core.windows.net`;
      logger.info('Using Azure Blob Storage');
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
}

export default new AzureStorageService();
