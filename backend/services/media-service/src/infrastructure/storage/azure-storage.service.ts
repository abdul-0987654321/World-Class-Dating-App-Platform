/**
 * BACKWARD COMPATIBILITY: Re-export S3 storage service with Azure naming
 * This file exists for backward compatibility during Azure to AWS migration.
 * All references to AzureStorageService now use the S3 implementation.
 */

import s3StorageService, { S3StorageService, storageService } from './s3-storage.service';

// Export S3 service as Azure for backward compatibility
export const AzureStorageService = S3StorageService;
export default s3StorageService;
export { storageService };
