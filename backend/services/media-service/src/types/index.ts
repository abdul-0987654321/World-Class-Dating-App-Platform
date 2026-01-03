export interface MediaMetadata {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  urls: {
    thumbnail: string;
    standard: string;
    hd: string;
    original: string;
  };
  dimensions: {
    width: number;
    height: number;
  };
  isProfilePhoto: boolean;
  isVerified: boolean;
  moderationStatus: ModerationStatus;
  moderationResult?: ModerationResult;
  deepfakeResult?: DeepfakeResult;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface DeepfakeResult {
  isDeepfake?: boolean;
  confidence?: number;
  score?: number;
  indicators?: string[];
  analyzedAt?: string;
  flagReason?: string;
  requiresManualReview?: boolean;
  flaggedAt?: string;
}

export enum ModerationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FLAGGED = 'flagged',
}

export interface ModerationResult {
  isAdultContent: boolean;
  isRacyContent: boolean;
  isViolentContent: boolean;
  adultScore: number;
  racyScore: number;
  violenceScore: number;
  tags?: string[];
  description?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export interface ImageProcessingJob {
  mediaId: string;
  userId: string;
  fileName: string;
  buffer: Buffer;
}

export interface VerificationRequest {
  userId: string;
  selfieImage: Buffer;
  profilePhotoUrl: string;
}

export interface VerificationResult {
  isMatch: boolean;
  confidence: number;
  isLivePhoto: boolean;
  faceDetected: boolean;
}

export interface UploadResponse {
  success: boolean;
  media?: MediaMetadata;
  error?: string;
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

export interface VideoMetadata {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration: number;
  urls: {
    original: string;
    compressed: string;
    thumbnails: string[];
  };
  dimensions: {
    width: number;
    height: number;
  };
  codec?: string;
  bitrate?: number;
  frameRate?: number;
  moderationStatus: ModerationStatus;
  moderationResult?: ModerationResult;
  uploadedAt: Date;
  updatedAt: Date;
}

export interface VideoProcessingJob {
  videoId: string;
  userId: string;
  fileName: string;
  filePath: string;
}

export interface VideoValidationResult {
  valid: boolean;
  error?: string;
  duration?: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

export interface VideoCompressionOptions {
  format?: string;
  videoCodec?: string;
  audioCodec?: string;
  videoBitrate?: string;
  audioBitrate?: string;
  resolution?: {
    width: number;
    height: number;
  };
  frameRate?: number;
  preset?: string;
}

export interface ThumbnailGenerationOptions {
  width: number;
  height: number;
  count: number;
  timestamps?: number[];
}
