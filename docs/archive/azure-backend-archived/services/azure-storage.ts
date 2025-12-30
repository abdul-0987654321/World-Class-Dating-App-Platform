/**
 * Azure Blob Storage utilities
 */
import { BlobServiceClient } from '@azure/storage-blob';
import logger from './logger';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'verification-photos';

/**
 * Upload a file to Azure Blob Storage
 */
export async function uploadToAzureBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  try {
    if (!connectionString) {
      throw new Error('Azure Storage connection string not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create container if it doesn't exist
    await containerClient.createIfNotExists({ access: 'blob' });

    const blockBlobClient = containerClient.getBlockBlobClient(filename);

    await blockBlobClient.uploadData(buffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });

    return blockBlobClient.url;
  } catch (error) {
    logger.error('Error uploading to Azure Blob Storage:', error);
    throw error;
  }
}

/**
 * Delete a file from Azure Blob Storage
 */
export async function deleteFromAzureBlob(blobUrl: string): Promise<void> {
  try {
    if (!connectionString) {
      throw new Error('Azure Storage connection string not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    const blobName = blobUrl.split('/').pop();

    if (!blobName) {
      throw new Error('Invalid blob URL');
    }

    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists();

    logger.info(`Deleted blob: ${blobName}`);
  } catch (error) {
    logger.error('Error deleting from Azure Blob Storage:', error);
    throw error;
  }
}
