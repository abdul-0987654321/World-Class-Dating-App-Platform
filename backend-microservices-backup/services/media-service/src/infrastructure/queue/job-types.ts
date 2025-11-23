/**
 * Job data types for different queue operations
 */

export interface ImageProcessingJobData {
  mediaId: string;
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  isProfilePhoto: boolean;
}

export interface ContentModerationJobData {
  mediaId: string;
  userId: string;
  imageUrl: string;
}

export interface PhotoVerificationJobData {
  mediaId: string;
  userId: string;
  imageUrl: string;
  referencePhotoUrl?: string;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}
