import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

import logger from './logger';

let containerClient: ContainerClient | null = null;

function getContainerClient(): ContainerClient {
  if (!containerClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'user-photos';

    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

/**
 * Upload a buffer to Azure Blob Storage
 * @param buffer - The file buffer to upload
 * @param filename - The name of the file
 * @param contentType - MIME type of the file
 * @returns The URL of the uploaded blob
 */
export async function uploadToAzureBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  try {
    const client = getContainerClient();
    const blockBlobClient = client.getBlockBlobClient(filename);

    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: { blobContentType: contentType },
    });

    logger.info(`Successfully uploaded blob: ${filename}`);
    return blockBlobClient.url;
  } catch (error) {
    logger.error('Failed to upload to Azure Blob Storage', { error, filename });
    throw error;
  }
}

/**
 * Delete a blob from Azure Blob Storage
 * @param blobUrl - The full URL of the blob to delete
 */
export async function deleteFromAzureBlob(blobUrl: string): Promise<void> {
  try {
    // Extract blob name from URL
    const url = new URL(blobUrl);
    const blobName = url.pathname.split('/').slice(2).join('/');

    const client = getContainerClient();
    const blockBlobClient = client.getBlockBlobClient(blobName);

    await blockBlobClient.delete();
    logger.info(`Successfully deleted blob: ${blobName}`);
  } catch (error) {
    logger.error('Failed to delete from Azure Blob Storage', { error, blobUrl });
    throw error;
  }
}
