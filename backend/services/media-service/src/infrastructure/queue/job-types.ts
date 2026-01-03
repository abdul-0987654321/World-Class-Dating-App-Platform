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

export interface DeepfakeDetectionJobData {
  mediaId: string;
  userId: string;
  imageUrl: string;
  mediaType: 'image' | 'video';
  isProfilePhoto: boolean;
}

export interface DeepfakeDetectionResult {
  isDeepfake: boolean;
  confidence: number;
  score: number;
  indicators: string[];
  requiresReview: boolean;
  details: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
}
