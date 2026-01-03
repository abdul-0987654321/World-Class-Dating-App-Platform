/**
 * Lookalike Matching Types
 *
 * Type definitions for the lookalike matching feature which allows users
 * to find profiles with similar facial features to a reference image.
 */

/**
 * Face embedding extracted from an image
 */
export interface FaceEmbedding {
  id: string;
  userId: string;
  photoUrl: string;
  embedding: number[];
  embeddingDimension: number;
  faceConfidence: number;
  boundingBox?: BoundingBox;
  faceAttributes?: FaceAttributes;
  qualityBrightness?: number;
  qualitySharpness?: number;
  isPrimary: boolean;
  status: FaceEmbeddingStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

/**
 * Bounding box of detected face in image
 */
export interface BoundingBox {
  width: number;
  height: number;
  left: number;
  top: number;
}

/**
 * Facial attributes detected by AWS Rekognition
 */
export interface FaceAttributes {
  ageRange?: {
    low: number;
    high: number;
  };
  smile?: {
    value: boolean;
    confidence: number;
  };
  eyeglasses?: {
    value: boolean;
    confidence: number;
  };
  sunglasses?: {
    value: boolean;
    confidence: number;
  };
  gender?: {
    value: string;
    confidence: number;
  };
  beard?: {
    value: boolean;
    confidence: number;
  };
  mustache?: {
    value: boolean;
    confidence: number;
  };
  eyesOpen?: {
    value: boolean;
    confidence: number;
  };
  mouthOpen?: {
    value: boolean;
    confidence: number;
  };
  emotions?: Array<{
    type: string;
    confidence: number;
  }>;
}

/**
 * Status of a face embedding record
 */
export type FaceEmbeddingStatus = 'active' | 'deleted' | 'processing';

/**
 * Request to extract face embedding from an image
 */
export interface ExtractEmbeddingRequest {
  imageBuffer: Buffer;
  userId?: string;
  photoUrl?: string;
  isPrimary?: boolean;
}

/**
 * Result of face embedding extraction
 */
export interface ExtractEmbeddingResult {
  success: boolean;
  embedding?: number[];
  faceConfidence?: number;
  boundingBox?: BoundingBox;
  faceAttributes?: FaceAttributes;
  qualityBrightness?: number;
  qualitySharpness?: number;
  error?: string;
  errorCode?: LookalikeErrorCode;
}

/**
 * A profile that matches the lookalike search
 */
export interface SimilarProfile {
  userId: string;
  similarityScore: number;
  matchedPhotoUrl: string;
  profile: {
    displayName: string;
    age: number;
    city?: string;
    photos: string[];
    bio?: string;
    verified: boolean;
  };
  matchReasons: string[];
}

/**
 * Request to find similar profiles
 */
export interface FindSimilarProfilesRequest {
  userId: string;
  referenceImage: Buffer;
  limit?: number;
  minSimilarity?: number;
  excludeUserIds?: string[];
}

/**
 * Result of finding similar profiles
 */
export interface FindSimilarProfilesResult {
  success: boolean;
  profiles: SimilarProfile[];
  searchId: string;
  processingTimeMs: number;
  totalCandidates: number;
  referenceEmbedding?: number[];
  error?: string;
  errorCode?: LookalikeErrorCode;
}

/**
 * Lookalike search record
 */
export interface LookalikeSearch {
  id: string;
  userId: string;
  referenceImageUrl?: string;
  referenceImageHash: string;
  referenceEmbedding?: number[];
  limitRequested: number;
  resultsReturned: number;
  minSimilarityThreshold: number;
  topMatches?: Array<{
    userId: string;
    score: number;
  }>;
  createdAt: Date;
}

/**
 * Rate limit info for lookalike searches
 */
export interface LookalikeRateLimit {
  userId: string;
  dailySearches: number;
  monthlySearches: number;
  dailyResetDate: Date;
  monthlyResetDate: Date;
  lastSearchAt?: Date;
}

/**
 * Rate limit configuration by subscription tier
 */
export interface LookalikeRateLimitConfig {
  dailyLimit: number;
  monthlyLimit: number;
  minTimeBetweenSearchesMs: number;
}

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: string;
  dailyRemaining: number;
  monthlyRemaining: number;
  resetTime?: Date;
  requiredTier?: string;
}

/**
 * Error codes for lookalike matching
 */
export type LookalikeErrorCode =
  | 'NO_FACE_DETECTED'
  | 'MULTIPLE_FACES_DETECTED'
  | 'LOW_QUALITY_IMAGE'
  | 'INVALID_IMAGE_FORMAT'
  | 'IMAGE_TOO_LARGE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INSUFFICIENT_TIER'
  | 'EMBEDDING_EXTRACTION_FAILED'
  | 'SEARCH_FAILED'
  | 'USER_NOT_FOUND'
  | 'INTERNAL_ERROR';

/**
 * Subscription tier rate limits for lookalike matching
 */
export const LOOKALIKE_RATE_LIMITS: Record<string, LookalikeRateLimitConfig> = {
  free: {
    dailyLimit: 0, // Not available for free tier
    monthlyLimit: 0,
    minTimeBetweenSearchesMs: 0,
  },
  plus: {
    dailyLimit: 5,
    monthlyLimit: 50,
    minTimeBetweenSearchesMs: 60000, // 1 minute
  },
  premium: {
    dailyLimit: 20,
    monthlyLimit: 200,
    minTimeBetweenSearchesMs: 10000, // 10 seconds
  },
  elite: {
    dailyLimit: 100,
    monthlyLimit: 1000,
    minTimeBetweenSearchesMs: 5000, // 5 seconds
  },
};

/**
 * Configuration constants for lookalike matching
 */
export const LOOKALIKE_CONFIG = {
  // Minimum confidence score for face detection (0-100)
  MIN_FACE_CONFIDENCE: 90,

  // Minimum similarity score to include in results (0-1)
  DEFAULT_MIN_SIMILARITY: 0.7,

  // Maximum number of results to return
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // Maximum image size in bytes (10MB)
  MAX_IMAGE_SIZE: 10 * 1024 * 1024,

  // Supported image formats
  SUPPORTED_FORMATS: ['image/jpeg', 'image/png', 'image/webp'],

  // Embedding dimension (AWS Rekognition uses 128)
  EMBEDDING_DIMENSION: 128,

  // Minimum quality scores
  MIN_BRIGHTNESS: 0.2,
  MIN_SHARPNESS: 0.2,
};
