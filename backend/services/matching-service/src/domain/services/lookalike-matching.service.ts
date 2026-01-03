/**
 * Lookalike Matching Service
 *
 * Provides facial similarity matching using AWS Rekognition for face embedding
 * extraction and cosine similarity for finding similar profiles.
 *
 * Features:
 * - Face embedding extraction from images
 * - Similarity search using cosine similarity
 * - Rate limiting by subscription tier
 * - Caching of embeddings for efficient searches
 */

import { RekognitionClient, DetectFacesCommand, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { createHash } from 'crypto';
import axios from 'axios';
import db from '../../infrastructure/database/connection';
import { createLogger } from '@flamoral/backend-shared';
import {
  FaceEmbedding,
  BoundingBox,
  FaceAttributes,
  ExtractEmbeddingResult,
  SimilarProfile,
  FindSimilarProfilesRequest,
  FindSimilarProfilesResult,
  LookalikeSearch,
  LookalikeRateLimit,
  RateLimitCheckResult,
  LookalikeErrorCode,
  LOOKALIKE_RATE_LIMITS,
  LOOKALIKE_CONFIG,
} from '../../types/lookalike.types';

const logger = createLogger('lookalike-matching-service');

/**
 * LookalikeMatchingService
 *
 * Core service for lookalike matching functionality. Uses AWS Rekognition
 * for face detection and embedding extraction, then performs cosine similarity
 * matching against stored embeddings.
 */
export class LookalikeMatchingService {
  private rekognitionClient: RekognitionClient;
  private userServiceUrl: string;
  private paymentServiceUrl: string;

  constructor() {
    // Initialize AWS Rekognition client
    this.rekognitionClient = new RekognitionClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          }
        : undefined, // Use default credential provider chain
    });

    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:3001';
    this.paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';
  }

  /**
   * Extract face embedding from an image buffer
   *
   * Uses AWS Rekognition to detect faces and extract facial features.
   * Returns a 128-dimensional embedding vector that represents the face.
   *
   * @param imageBuffer - The image data as a Buffer
   * @returns ExtractEmbeddingResult with embedding or error
   */
  async extractFaceEmbedding(imageBuffer: Buffer): Promise<ExtractEmbeddingResult> {
    const startTime = Date.now();

    try {
      // Validate image size
      if (imageBuffer.length > LOOKALIKE_CONFIG.MAX_IMAGE_SIZE) {
        return {
          success: false,
          error: `Image size exceeds maximum allowed (${LOOKALIKE_CONFIG.MAX_IMAGE_SIZE / 1024 / 1024}MB)`,
          errorCode: 'IMAGE_TOO_LARGE',
        };
      }

      // Detect faces using AWS Rekognition
      const detectCommand = new DetectFacesCommand({
        Image: {
          Bytes: imageBuffer,
        },
        Attributes: ['ALL'],
      });

      const detectResponse = await this.rekognitionClient.send(detectCommand);
      const faces = detectResponse.FaceDetails || [];

      logger.info(`Face detection completed`, {
        facesDetected: faces.length,
        processingTimeMs: Date.now() - startTime,
      });

      // Check if any face was detected
      if (faces.length === 0) {
        return {
          success: false,
          error: 'No face detected in the image. Please upload a clear photo with a visible face.',
          errorCode: 'NO_FACE_DETECTED',
        };
      }

      // For lookalike matching, we need exactly one face
      if (faces.length > 1) {
        return {
          success: false,
          error: 'Multiple faces detected. Please upload a photo with only one person.',
          errorCode: 'MULTIPLE_FACES_DETECTED',
        };
      }

      const face = faces[0];

      // Check face confidence
      if ((face.Confidence || 0) < LOOKALIKE_CONFIG.MIN_FACE_CONFIDENCE) {
        return {
          success: false,
          error: 'Face detection confidence is too low. Please upload a clearer photo.',
          errorCode: 'LOW_QUALITY_IMAGE',
        };
      }

      // Check image quality
      const brightness = face.Quality?.Brightness || 0;
      const sharpness = face.Quality?.Sharpness || 0;

      if (brightness < LOOKALIKE_CONFIG.MIN_BRIGHTNESS * 100) {
        return {
          success: false,
          error: 'Image is too dark. Please upload a well-lit photo.',
          errorCode: 'LOW_QUALITY_IMAGE',
        };
      }

      if (sharpness < LOOKALIKE_CONFIG.MIN_SHARPNESS * 100) {
        return {
          success: false,
          error: 'Image is too blurry. Please upload a sharper photo.',
          errorCode: 'LOW_QUALITY_IMAGE',
        };
      }

      // Generate face embedding using facial landmarks
      // AWS Rekognition doesn't directly return embeddings, so we create a
      // pseudo-embedding from the detected facial features for similarity matching
      const embedding = this.generateEmbeddingFromFaceDetails(face);

      // Extract bounding box
      const boundingBox: BoundingBox | undefined = face.BoundingBox
        ? {
            width: face.BoundingBox.Width || 0,
            height: face.BoundingBox.Height || 0,
            left: face.BoundingBox.Left || 0,
            top: face.BoundingBox.Top || 0,
          }
        : undefined;

      // Extract face attributes
      const faceAttributes: FaceAttributes = {
        ageRange: face.AgeRange
          ? {
              low: face.AgeRange.Low || 0,
              high: face.AgeRange.High || 0,
            }
          : undefined,
        smile: face.Smile
          ? {
              value: face.Smile.Value || false,
              confidence: face.Smile.Confidence || 0,
            }
          : undefined,
        eyeglasses: face.Eyeglasses
          ? {
              value: face.Eyeglasses.Value || false,
              confidence: face.Eyeglasses.Confidence || 0,
            }
          : undefined,
        sunglasses: face.Sunglasses
          ? {
              value: face.Sunglasses.Value || false,
              confidence: face.Sunglasses.Confidence || 0,
            }
          : undefined,
        gender: face.Gender
          ? {
              value: face.Gender.Value || '',
              confidence: face.Gender.Confidence || 0,
            }
          : undefined,
        beard: face.Beard
          ? {
              value: face.Beard.Value || false,
              confidence: face.Beard.Confidence || 0,
            }
          : undefined,
        mustache: face.Mustache
          ? {
              value: face.Mustache.Value || false,
              confidence: face.Mustache.Confidence || 0,
            }
          : undefined,
        eyesOpen: face.EyesOpen
          ? {
              value: face.EyesOpen.Value || false,
              confidence: face.EyesOpen.Confidence || 0,
            }
          : undefined,
        mouthOpen: face.MouthOpen
          ? {
              value: face.MouthOpen.Value || false,
              confidence: face.MouthOpen.Confidence || 0,
            }
          : undefined,
        emotions: face.Emotions?.map((e) => ({
          type: e.Type || '',
          confidence: e.Confidence || 0,
        })),
      };

      return {
        success: true,
        embedding,
        faceConfidence: face.Confidence || 0,
        boundingBox,
        faceAttributes,
        qualityBrightness: brightness / 100,
        qualitySharpness: sharpness / 100,
      };
    } catch (error: any) {
      logger.error('Failed to extract face embedding', {
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      });

      // Check for specific AWS errors
      if (error.name === 'InvalidImageFormatException') {
        return {
          success: false,
          error: 'Invalid image format. Please upload a JPEG, PNG, or WebP image.',
          errorCode: 'INVALID_IMAGE_FORMAT',
        };
      }

      return {
        success: false,
        error: 'Failed to extract face embedding. Please try again.',
        errorCode: 'EMBEDDING_EXTRACTION_FAILED',
      };
    }
  }

  /**
   * Generate a pseudo-embedding from face details
   *
   * Creates a 128-dimensional vector from facial landmarks and attributes.
   * This allows similarity matching without requiring AWS Rekognition's
   * face comparison for every search (which would be expensive).
   */
  private generateEmbeddingFromFaceDetails(face: any): number[] {
    const embedding: number[] = new Array(LOOKALIKE_CONFIG.EMBEDDING_DIMENSION).fill(0);

    // Use facial landmarks to populate the embedding
    const landmarks = face.Landmarks || [];
    let idx = 0;

    // Populate with landmark positions (normalized 0-1)
    for (const landmark of landmarks) {
      if (idx < 60) {
        // Reserve first 60 dimensions for landmarks
        embedding[idx++] = landmark.X || 0;
        embedding[idx++] = landmark.Y || 0;
      }
    }

    // Use pose estimation
    if (face.Pose) {
      embedding[60] = (face.Pose.Roll || 0) / 180 + 0.5; // Normalize to 0-1
      embedding[61] = (face.Pose.Yaw || 0) / 180 + 0.5;
      embedding[62] = (face.Pose.Pitch || 0) / 180 + 0.5;
    }

    // Use quality metrics
    if (face.Quality) {
      embedding[63] = (face.Quality.Brightness || 0) / 100;
      embedding[64] = (face.Quality.Sharpness || 0) / 100;
    }

    // Use age range (normalized)
    if (face.AgeRange) {
      embedding[65] = (face.AgeRange.Low || 0) / 100;
      embedding[66] = (face.AgeRange.High || 0) / 100;
    }

    // Use gender confidence
    if (face.Gender) {
      embedding[67] = face.Gender.Value === 'Male' ? 1 : 0;
      embedding[68] = (face.Gender.Confidence || 0) / 100;
    }

    // Use facial features presence
    embedding[69] = face.Smile?.Value ? 1 : 0;
    embedding[70] = (face.Smile?.Confidence || 0) / 100;
    embedding[71] = face.Eyeglasses?.Value ? 1 : 0;
    embedding[72] = face.Sunglasses?.Value ? 1 : 0;
    embedding[73] = face.Beard?.Value ? 1 : 0;
    embedding[74] = (face.Beard?.Confidence || 0) / 100;
    embedding[75] = face.Mustache?.Value ? 1 : 0;
    embedding[76] = face.EyesOpen?.Value ? 1 : 0;
    embedding[77] = face.MouthOpen?.Value ? 1 : 0;

    // Use bounding box proportions
    if (face.BoundingBox) {
      embedding[78] = face.BoundingBox.Width || 0;
      embedding[79] = face.BoundingBox.Height || 0;
      embedding[80] = face.BoundingBox.Left || 0;
      embedding[81] = face.BoundingBox.Top || 0;
      // Face aspect ratio
      embedding[82] =
        face.BoundingBox.Width && face.BoundingBox.Height
          ? face.BoundingBox.Width / face.BoundingBox.Height
          : 0;
    }

    // Use emotions (sorted by confidence, take top 5)
    const emotions = (face.Emotions || [])
      .sort((a: any, b: any) => (b.Confidence || 0) - (a.Confidence || 0))
      .slice(0, 5);

    const emotionMap: Record<string, number> = {
      HAPPY: 0.1,
      SURPRISED: 0.2,
      ANGRY: 0.3,
      CONFUSED: 0.4,
      SAD: 0.5,
      CALM: 0.6,
      DISGUSTED: 0.7,
      FEAR: 0.8,
    };

    for (let i = 0; i < 5; i++) {
      const emotion = emotions[i];
      if (emotion) {
        embedding[83 + i * 2] = emotionMap[emotion.Type] || 0;
        embedding[84 + i * 2] = (emotion.Confidence || 0) / 100;
      }
    }

    // Fill remaining dimensions with derived features
    // Calculate relative landmark positions
    if (landmarks.length >= 10) {
      // Eye distance (normalized)
      const leftEye = landmarks.find((l: any) => l.Type === 'eyeLeft');
      const rightEye = landmarks.find((l: any) => l.Type === 'eyeRight');
      if (leftEye && rightEye) {
        embedding[93] = Math.abs((rightEye.X || 0) - (leftEye.X || 0));
        embedding[94] = Math.abs((rightEye.Y || 0) - (leftEye.Y || 0));
      }

      // Nose to mouth distance
      const nose = landmarks.find((l: any) => l.Type === 'nose');
      const mouthLeft = landmarks.find((l: any) => l.Type === 'mouthLeft');
      if (nose && mouthLeft) {
        embedding[95] = Math.abs((mouthLeft.Y || 0) - (nose.Y || 0));
      }

      // Face symmetry score
      if (leftEye && rightEye && nose) {
        const leftDist = Math.sqrt(
          Math.pow((nose.X || 0) - (leftEye.X || 0), 2) +
            Math.pow((nose.Y || 0) - (leftEye.Y || 0), 2)
        );
        const rightDist = Math.sqrt(
          Math.pow((rightEye.X || 0) - (nose.X || 0), 2) +
            Math.pow((rightEye.Y || 0) - (nose.Y || 0), 2)
        );
        embedding[96] = 1 - Math.abs(leftDist - rightDist);
      }
    }

    // Normalize the embedding vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = embedding[i] / magnitude;
      }
    }

    return embedding;
  }

  /**
   * Calculate cosine similarity between two embedding vectors
   *
   * @param embedding1 - First embedding vector
   * @param embedding2 - Second embedding vector
   * @returns Similarity score between 0 and 1
   */
  getSimilarityScore(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embedding dimensions must match');
    }

    // Calculate dot product
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) {
      return 0;
    }

    // Cosine similarity (already normalized, but just in case)
    const similarity = dotProduct / (magnitude1 * magnitude2);

    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, similarity));
  }

  /**
   * Find profiles with similar facial features to a reference image
   *
   * @param request - FindSimilarProfilesRequest with user ID and reference image
   * @returns FindSimilarProfilesResult with matching profiles
   */
  async findSimilarProfiles(request: FindSimilarProfilesRequest): Promise<FindSimilarProfilesResult> {
    const startTime = Date.now();
    const {
      userId,
      referenceImage,
      limit = LOOKALIKE_CONFIG.DEFAULT_LIMIT,
      minSimilarity = LOOKALIKE_CONFIG.DEFAULT_MIN_SIMILARITY,
      excludeUserIds = [],
    } = request;

    try {
      // Check rate limits first
      const rateLimitCheck = await this.checkRateLimit(userId);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          profiles: [],
          searchId: '',
          processingTimeMs: Date.now() - startTime,
          totalCandidates: 0,
          error: rateLimitCheck.reason,
          errorCode: rateLimitCheck.requiredTier ? 'INSUFFICIENT_TIER' : 'RATE_LIMIT_EXCEEDED',
        };
      }

      // Extract embedding from reference image
      const embeddingResult = await this.extractFaceEmbedding(referenceImage);
      if (!embeddingResult.success || !embeddingResult.embedding) {
        return {
          success: false,
          profiles: [],
          searchId: '',
          processingTimeMs: Date.now() - startTime,
          totalCandidates: 0,
          error: embeddingResult.error,
          errorCode: embeddingResult.errorCode,
        };
      }

      // Get all stored embeddings (excluding specified users and current user)
      const allExcluded = [...excludeUserIds, userId];
      const storedEmbeddings = await this.getStoredEmbeddings(allExcluded);

      logger.info(`Searching for similar profiles`, {
        userId,
        candidateCount: storedEmbeddings.length,
        minSimilarity,
        limit,
      });

      // Calculate similarity scores
      const scoredProfiles: Array<{
        userId: string;
        score: number;
        photoUrl: string;
        embeddingId: string;
      }> = [];

      for (const stored of storedEmbeddings) {
        const score = this.getSimilarityScore(
          embeddingResult.embedding,
          stored.embedding
        );

        if (score >= minSimilarity) {
          scoredProfiles.push({
            userId: stored.userId,
            score,
            photoUrl: stored.photoUrl,
            embeddingId: stored.id,
          });
        }
      }

      // Sort by similarity score (descending) and take top results
      scoredProfiles.sort((a, b) => b.score - a.score);
      const topProfiles = scoredProfiles.slice(0, Math.min(limit, LOOKALIKE_CONFIG.MAX_LIMIT));

      // Fetch full profile data for matched users
      const matchedProfiles: SimilarProfile[] = [];
      if (topProfiles.length > 0) {
        const profileData = await this.fetchUserProfiles(topProfiles.map((p) => p.userId));

        for (const scored of topProfiles) {
          const profile = profileData.get(scored.userId);
          if (profile) {
            matchedProfiles.push({
              userId: scored.userId,
              similarityScore: Math.round(scored.score * 100) / 100,
              matchedPhotoUrl: scored.photoUrl,
              profile: {
                displayName: profile.displayName || profile.name || 'User',
                age: profile.age || 0,
                city: profile.city,
                photos: profile.photos || [],
                bio: profile.bio,
                verified: profile.verified || false,
              },
              matchReasons: this.generateMatchReasons(scored.score, profile),
            });
          }
        }
      }

      // Generate image hash for deduplication
      const imageHash = createHash('sha256').update(referenceImage).digest('hex');

      // Record the search
      const searchId = await this.recordSearch({
        userId,
        referenceImageHash: imageHash,
        referenceEmbedding: embeddingResult.embedding,
        limitRequested: limit,
        resultsReturned: matchedProfiles.length,
        minSimilarityThreshold: minSimilarity,
        topMatches: matchedProfiles.slice(0, 10).map((p) => ({
          userId: p.userId,
          score: p.similarityScore,
        })),
      });

      // Update rate limit counter
      await this.incrementRateLimit(userId);

      const processingTimeMs = Date.now() - startTime;
      logger.info(`Lookalike search completed`, {
        userId,
        searchId,
        resultsFound: matchedProfiles.length,
        totalCandidates: storedEmbeddings.length,
        processingTimeMs,
      });

      return {
        success: true,
        profiles: matchedProfiles,
        searchId,
        processingTimeMs,
        totalCandidates: storedEmbeddings.length,
        referenceEmbedding: embeddingResult.embedding,
      };
    } catch (error: any) {
      logger.error('Failed to find similar profiles', {
        userId,
        error: error.message,
        processingTimeMs: Date.now() - startTime,
      });

      return {
        success: false,
        profiles: [],
        searchId: '',
        processingTimeMs: Date.now() - startTime,
        totalCandidates: 0,
        error: 'Failed to search for similar profiles. Please try again.',
        errorCode: 'SEARCH_FAILED',
      };
    }
  }

  /**
   * Store a face embedding for a user
   */
  async storeFaceEmbedding(
    userId: string,
    photoUrl: string,
    embedding: number[],
    metadata: {
      faceConfidence: number;
      boundingBox?: BoundingBox;
      faceAttributes?: FaceAttributes;
      qualityBrightness?: number;
      qualitySharpness?: number;
      isPrimary?: boolean;
    }
  ): Promise<FaceEmbedding> {
    const result = await db('face_embeddings')
      .insert({
        user_id: userId,
        photo_url: photoUrl,
        embedding: JSON.stringify(embedding),
        embedding_dimension: embedding.length,
        face_confidence: metadata.faceConfidence,
        bounding_box: metadata.boundingBox ? JSON.stringify(metadata.boundingBox) : null,
        face_attributes: metadata.faceAttributes ? JSON.stringify(metadata.faceAttributes) : null,
        quality_brightness: metadata.qualityBrightness,
        quality_sharpness: metadata.qualitySharpness,
        is_primary: metadata.isPrimary || false,
        status: 'active',
      })
      .returning('*');

    const row = result[0];
    return this.mapRowToFaceEmbedding(row);
  }

  /**
   * Get stored embeddings for similarity search
   */
  private async getStoredEmbeddings(
    excludeUserIds: string[]
  ): Promise<Array<{ id: string; userId: string; embedding: number[]; photoUrl: string }>> {
    let query = db('face_embeddings')
      .select('id', 'user_id', 'embedding', 'photo_url')
      .where('status', 'active');

    if (excludeUserIds.length > 0) {
      query = query.whereNotIn('user_id', excludeUserIds);
    }

    const rows = await query;

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
      photoUrl: row.photo_url,
    }));
  }

  /**
   * Check rate limit for a user
   */
  async checkRateLimit(userId: string): Promise<RateLimitCheckResult> {
    // Get user's subscription tier
    const tier = await this.getUserTier(userId);
    const limits = LOOKALIKE_RATE_LIMITS[tier] || LOOKALIKE_RATE_LIMITS.free;

    // Check if tier allows lookalike matching
    if (limits.dailyLimit === 0) {
      return {
        allowed: false,
        reason: 'Lookalike matching requires a Plus, Premium, or Elite subscription.',
        dailyRemaining: 0,
        monthlyRemaining: 0,
        requiredTier: 'plus',
      };
    }

    // Get current rate limit record
    const rateLimit = await this.getRateLimit(userId);
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Check if reset is needed
    let dailySearches = rateLimit?.dailySearches || 0;
    let monthlySearches = rateLimit?.monthlySearches || 0;

    if (rateLimit) {
      // Reset daily counter if needed
      if (rateLimit.dailyResetDate.toISOString().split('T')[0] !== today) {
        dailySearches = 0;
      }

      // Reset monthly counter if needed
      if (rateLimit.monthlyResetDate.toISOString().slice(0, 7) !== monthStart.slice(0, 7)) {
        monthlySearches = 0;
      }

      // Check minimum time between searches
      if (rateLimit.lastSearchAt) {
        const timeSinceLastSearch = now.getTime() - rateLimit.lastSearchAt.getTime();
        if (timeSinceLastSearch < limits.minTimeBetweenSearchesMs) {
          const waitTime = Math.ceil((limits.minTimeBetweenSearchesMs - timeSinceLastSearch) / 1000);
          return {
            allowed: false,
            reason: `Please wait ${waitTime} seconds before searching again.`,
            dailyRemaining: limits.dailyLimit - dailySearches,
            monthlyRemaining: limits.monthlyLimit - monthlySearches,
            resetTime: new Date(rateLimit.lastSearchAt.getTime() + limits.minTimeBetweenSearchesMs),
          };
        }
      }
    }

    // Check daily limit
    if (dailySearches >= limits.dailyLimit) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return {
        allowed: false,
        reason: `Daily limit of ${limits.dailyLimit} searches reached. Resets at midnight.`,
        dailyRemaining: 0,
        monthlyRemaining: limits.monthlyLimit - monthlySearches,
        resetTime: tomorrow,
      };
    }

    // Check monthly limit
    if (monthlySearches >= limits.monthlyLimit) {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      return {
        allowed: false,
        reason: `Monthly limit of ${limits.monthlyLimit} searches reached. Resets on the 1st.`,
        dailyRemaining: limits.dailyLimit - dailySearches,
        monthlyRemaining: 0,
        resetTime: nextMonth,
      };
    }

    return {
      allowed: true,
      dailyRemaining: limits.dailyLimit - dailySearches,
      monthlyRemaining: limits.monthlyLimit - monthlySearches,
    };
  }

  /**
   * Get rate limit record for a user
   */
  private async getRateLimit(userId: string): Promise<LookalikeRateLimit | null> {
    const row = await db('lookalike_rate_limits')
      .where('user_id', userId)
      .first();

    if (!row) return null;

    return {
      userId: row.user_id,
      dailySearches: row.daily_searches,
      monthlySearches: row.monthly_searches,
      dailyResetDate: new Date(row.daily_reset_date),
      monthlyResetDate: new Date(row.monthly_reset_date),
      lastSearchAt: row.last_search_at ? new Date(row.last_search_at) : undefined,
    };
  }

  /**
   * Increment rate limit counters for a user
   */
  private async incrementRateLimit(userId: string): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const existing = await db('lookalike_rate_limits')
      .where('user_id', userId)
      .first();

    if (existing) {
      // Check if we need to reset counters
      const shouldResetDaily = existing.daily_reset_date !== today;
      const shouldResetMonthly =
        new Date(existing.monthly_reset_date).toISOString().slice(0, 7) !== monthStart.slice(0, 7);

      await db('lookalike_rate_limits')
        .where('user_id', userId)
        .update({
          daily_searches: shouldResetDaily ? 1 : db.raw('daily_searches + 1'),
          monthly_searches: shouldResetMonthly ? 1 : db.raw('monthly_searches + 1'),
          daily_reset_date: today,
          monthly_reset_date: monthStart,
          last_search_at: now,
          updated_at: now,
        });
    } else {
      await db('lookalike_rate_limits').insert({
        user_id: userId,
        daily_searches: 1,
        monthly_searches: 1,
        daily_reset_date: today,
        monthly_reset_date: monthStart,
        last_search_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  }

  /**
   * Record a lookalike search
   */
  private async recordSearch(params: {
    userId: string;
    referenceImageHash: string;
    referenceEmbedding: number[];
    limitRequested: number;
    resultsReturned: number;
    minSimilarityThreshold: number;
    topMatches: Array<{ userId: string; score: number }>;
  }): Promise<string> {
    const result = await db('lookalike_searches')
      .insert({
        user_id: params.userId,
        reference_image_hash: params.referenceImageHash,
        reference_embedding: JSON.stringify(params.referenceEmbedding),
        limit_requested: params.limitRequested,
        results_returned: params.resultsReturned,
        min_similarity_threshold: params.minSimilarityThreshold,
        top_matches: JSON.stringify(params.topMatches),
      })
      .returning('id');

    return result[0].id;
  }

  /**
   * Get user's subscription tier
   */
  private async getUserTier(userId: string): Promise<string> {
    try {
      const response = await axios.get(
        `${this.paymentServiceUrl}/api/subscriptions/user/${userId}/tier`,
        { timeout: 5000 }
      );
      return response.data?.tier || 'free';
    } catch (error) {
      logger.warn(`Failed to get user tier for ${userId}, defaulting to free`);
      return 'free';
    }
  }

  /**
   * Fetch user profiles from user service
   */
  private async fetchUserProfiles(
    userIds: string[]
  ): Promise<Map<string, any>> {
    try {
      const response = await axios.post(
        `${this.userServiceUrl}/api/users/batch`,
        { userIds },
        { timeout: 10000 }
      );

      return new Map(
        (response.data || []).map((user: any) => [user.userId || user.id, user])
      );
    } catch (error) {
      logger.error('Failed to fetch user profiles', { userIds, error });
      return new Map();
    }
  }

  /**
   * Generate match reasons for a similar profile
   */
  private generateMatchReasons(score: number, profile: any): string[] {
    const reasons: string[] = [];

    // Similarity-based reasons
    if (score >= 0.9) {
      reasons.push('Very high facial similarity');
    } else if (score >= 0.8) {
      reasons.push('High facial similarity');
    } else if (score >= 0.7) {
      reasons.push('Similar facial features');
    }

    // Profile-based reasons
    if (profile.verified) {
      reasons.push('Verified profile');
    }

    if (profile.premium) {
      reasons.push('Premium member');
    }

    return reasons;
  }

  /**
   * Map database row to FaceEmbedding
   */
  private mapRowToFaceEmbedding(row: any): FaceEmbedding {
    return {
      id: row.id,
      userId: row.user_id,
      photoUrl: row.photo_url,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
      embeddingDimension: row.embedding_dimension,
      faceConfidence: row.face_confidence,
      boundingBox: row.bounding_box
        ? typeof row.bounding_box === 'string'
          ? JSON.parse(row.bounding_box)
          : row.bounding_box
        : undefined,
      faceAttributes: row.face_attributes
        ? typeof row.face_attributes === 'string'
          ? JSON.parse(row.face_attributes)
          : row.face_attributes
        : undefined,
      qualityBrightness: row.quality_brightness,
      qualitySharpness: row.quality_sharpness,
      isPrimary: row.is_primary,
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }

  /**
   * Get a user's stored face embeddings
   */
  async getUserEmbeddings(userId: string): Promise<FaceEmbedding[]> {
    const rows = await db('face_embeddings')
      .where('user_id', userId)
      .where('status', 'active')
      .orderBy('is_primary', 'desc')
      .orderBy('created_at', 'desc');

    return rows.map((row: any) => this.mapRowToFaceEmbedding(row));
  }

  /**
   * Delete a face embedding
   */
  async deleteEmbedding(userId: string, embeddingId: string): Promise<boolean> {
    const result = await db('face_embeddings')
      .where('id', embeddingId)
      .where('user_id', userId)
      .update({
        status: 'deleted',
        deleted_at: new Date(),
        updated_at: new Date(),
      });

    return result > 0;
  }

  /**
   * Get search history for a user
   */
  async getSearchHistory(
    userId: string,
    limit: number = 10
  ): Promise<LookalikeSearch[]> {
    const rows = await db('lookalike_searches')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);

    return rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      referenceImageUrl: row.reference_image_url,
      referenceImageHash: row.reference_image_hash,
      referenceEmbedding: row.reference_embedding
        ? typeof row.reference_embedding === 'string'
          ? JSON.parse(row.reference_embedding)
          : row.reference_embedding
        : undefined,
      limitRequested: row.limit_requested,
      resultsReturned: row.results_returned,
      minSimilarityThreshold: row.min_similarity_threshold,
      topMatches: row.top_matches
        ? typeof row.top_matches === 'string'
          ? JSON.parse(row.top_matches)
          : row.top_matches
        : undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get rate limit status for a user
   */
  async getRateLimitStatus(userId: string): Promise<{
    tier: string;
    dailyLimit: number;
    monthlyLimit: number;
    dailyUsed: number;
    monthlyUsed: number;
    dailyRemaining: number;
    monthlyRemaining: number;
    resetTimes: {
      daily: Date;
      monthly: Date;
    };
  }> {
    const tier = await this.getUserTier(userId);
    const limits = LOOKALIKE_RATE_LIMITS[tier] || LOOKALIKE_RATE_LIMITS.free;
    const rateLimit = await this.getRateLimit(userId);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    let dailyUsed = 0;
    let monthlyUsed = 0;

    if (rateLimit) {
      if (rateLimit.dailyResetDate.toISOString().split('T')[0] === today) {
        dailyUsed = rateLimit.dailySearches;
      }
      if (rateLimit.monthlyResetDate.toISOString().slice(0, 7) === monthStart.slice(0, 7)) {
        monthlyUsed = rateLimit.monthlySearches;
      }
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      tier,
      dailyLimit: limits.dailyLimit,
      monthlyLimit: limits.monthlyLimit,
      dailyUsed,
      monthlyUsed,
      dailyRemaining: Math.max(0, limits.dailyLimit - dailyUsed),
      monthlyRemaining: Math.max(0, limits.monthlyLimit - monthlyUsed),
      resetTimes: {
        daily: tomorrow,
        monthly: nextMonth,
      },
    };
  }
}

export default new LookalikeMatchingService();
