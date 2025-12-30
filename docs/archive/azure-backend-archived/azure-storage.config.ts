import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { createLogger } from '@flamoral/backend-shared';

const logger = createLogger('azure-storage');

interface AzureStorageConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
}

class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private containerName: string;

  constructor(config: AzureStorageConfig) {
    const { accountName, accountKey, containerName } = config;
    this.containerName = containerName;

    // Create connection string
    const connectionString = `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`;

    // Initialize blob service client
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
  }

  /**
   * Initialize container (create if doesn't exist)
   */
  async initializeContainer(): Promise<void> {
    try {
      await this.containerClient.createIfNotExists({
        access: 'blob', // Public read access for blobs
      });
      logger.info(`Container "${this.containerName}" is ready`);
    } catch (error) {
      logger.error('Error initializing container:', error);
      throw error;
    }
  }

  /**
   * Upload a file to Azure Blob Storage
   */
  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

      // Upload buffer
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      });

      // Return the URL of the uploaded blob
      return blockBlobClient.url;
    } catch (error) {
      logger.error('Error uploading file:', error);
      throw new Error('Failed to upload file to Azure Blob Storage');
    }
  }

  /**
   * Delete a file from Azure Blob Storage
   */
  async deleteFile(fileName: string): Promise<void> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.deleteIfExists();
    } catch (error) {
      logger.error('Error deleting file:', error);
      throw new Error('Failed to delete file from Azure Blob Storage');
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(fileName: string): string {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    return blockBlobClient.url;
  }

  /**
   * Check if file exists
   */
  async fileExists(fileName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      return await blockBlobClient.exists();
    } catch (error) {
      logger.error('Error checking file existence:', error);
      return false;
    }
  }
}

// Create singleton instance (lazy initialization)
let azureStorageInstance: AzureStorageService | null = null;

export const azureStorage = {
  getInstance(): AzureStorageService {
    if (!azureStorageInstance) {
      const config: AzureStorageConfig = {
        accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'devstoreaccount1',
        accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
        containerName: process.env.AZURE_BLOB_CONTAINER_NAME || 'profile-photos',
      };
      azureStorageInstance = new AzureStorageService(config);
    }
    return azureStorageInstance;
  },

  async initializeContainer(): Promise<void> {
    return this.getInstance().initializeContainer();
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
};
