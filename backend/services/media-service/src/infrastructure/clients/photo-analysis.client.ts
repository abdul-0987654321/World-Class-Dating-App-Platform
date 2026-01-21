/**
 * Photo Analysis Service Client
 *
 * Handles communication with the AI-powered photo analysis service
 * for profile photo analysis, moderation, and feedback.
 */

import { createLogger } from '@flamoral/backend-shared';
import axios, { AxiosInstance, AxiosError } from 'axios';

import config from '../../config';

const logger = createLogger('photo-analysis-client');

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PhotoAnalysisRequest {
  photo_url?: string;
  photo_base64?: string;
  user_id?: string;
  is_primary?: boolean;
}

export interface FaceInfo {
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
    x_percent?: number;
    y_percent?: number;
    width_percent?: number;
    height_percent?: number;
  };
  confidence: number;
  landmarks?: Record<string, any>;
  estimated_age?: number;
  expression?: string;
  smile_score?: number;
}

export interface QualityDetails {
  overall_score: number;
  resolution_score: number;
  lighting_score: number;
  blur_score: number;
  compression_score: number;
  noise_score: number;
  quality_level: 'excellent' | 'good' | 'fair' | 'poor';
  issues: string[];
  metrics: {
    width: number;
    height: number;
    megapixels: number;
    mean_brightness?: number;
  };
}

export interface ModerationScores {
  nudity_score: number;
  suggestive_score: number;
  violence_score: number;
  skin_exposure: number;
}

export interface StyleInfo {
  style_score: number;
  photo_type: string;
  lighting_quality: string;
  background_type: string;
  positive_aspects: string[];
  improvement_suggestions: string[];
}

export interface FilterInfo {
  filter_detected: boolean;
  filter_type?: string;
  filter_confidence: number;
  authenticity_score: number;
  editing_indicators: string[];
}

export interface PhotoAnalysisResult {
  photo_url?: string;

  // Summary scores
  quality_score: number;
  style_score: number;

  // Face information
  face_detected: boolean;
  face_count: number;
  face_position: string;
  estimated_age?: number;

  // Moderation
  is_appropriate: boolean;
  moderation_flags: string[];

  // Filter detection
  filter_detected: boolean;
  filter_type?: string;

  // Feedback
  style_feedback: string[];
  recommendations: string[];

  // Approval decision
  approved: boolean;
  rejection_reasons: string[];

  // Detailed results
  quality_details?: QualityDetails;
  face_details?: FaceInfo[];
  moderation_details?: ModerationScores;
  style_details?: StyleInfo;
  filter_details?: FilterInfo;

  // Metadata
  analysis_version: string;
  processing_time_ms?: number;
}

export interface QualityCheckResult {
  photo_url?: string;
  quality_score: number;
  quality_level: 'excellent' | 'good' | 'fair' | 'poor';
  resolution: { width: number; height: number };
  issues: string[];
  details: Record<string, number>;
  recommendations: string[];
}

export interface ModerationResult {
  photo_url?: string;
  is_appropriate: boolean;
  flags: string[];
  scores: ModerationScores;
  should_reject: boolean;
  rejection_reason?: string;
}

export interface StyleFeedbackResult {
  photo_url?: string;
  style_score: number;
  style_info: StyleInfo;
  feedback: string[];
  primary_recommendation?: string;
}

export interface BatchAnalysisResult {
  results: PhotoAnalysisResult[];
  total_photos: number;
  approved_count: number;
  rejected_count: number;
  best_photo_index?: number;
  processing_time_ms?: number;
}

export interface PhotoRankingResult {
  ranked_photos: Array<{
    index: number;
    url: string;
    combined_score: number;
    quality_score: number;
    style_score: number;
    face_detected: boolean;
    face_count: number;
  }>;
  recommended_primary?: string;
  profile_score: number;
  suggestions: string[];
}

// ============================================================================
// Client Implementation
// ============================================================================

// Get service API key with validation
const getServiceApiKey = (): string => {
  const key = process.env.SERVICE_API_KEY;
  if (!key && process.env.NODE_ENV === 'production') {
    throw new Error('SERVICE_API_KEY environment variable is required');
  }
  return key || 'test-internal-service-key-not-for-production';
};

export class PhotoAnalysisClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      config.services?.photoAnalysisUrl ||
      process.env.PHOTO_ANALYSIS_SERVICE_URL ||
      'http://photo-analysis-service:8003';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // 60 seconds for ML processing
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Key': getServiceApiKey(),
        'X-Source-Service': 'media-service',
      },
    });

    // Response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('Photo analysis response', {
          url: response.config.url,
          status: response.status,
          processingTime: response.data?.processing_time_ms,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('Photo analysis request failed', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Perform full photo analysis
   */
  async analyzePhoto(request: PhotoAnalysisRequest): Promise<PhotoAnalysisResult> {
    try {
      const response = await this.client.post<PhotoAnalysisResult>(
        '/api/v1/photo-analysis/analyze',
        request
      );

      logger.info('Photo analyzed', {
        approved: response.data.approved,
        quality: response.data.quality_score,
        faces: response.data.face_count,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Photo analysis failed', { error: error.message });
      throw this.handleError(error);
    }
  }

  /**
   * Check photo quality only
   */
  async checkQuality(request: {
    photo_url?: string;
    photo_base64?: string;
  }): Promise<QualityCheckResult> {
    try {
      const response = await this.client.post<QualityCheckResult>(
        '/api/v1/photo-analysis/quality',
        request
      );

      logger.info('Quality checked', {
        score: response.data.quality_score,
        level: response.data.quality_level,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Quality check failed', { error: error.message });
      throw this.handleError(error);
    }
  }

  /**
   * Check content moderation only
   */
  async checkModeration(request: {
    photo_url?: string;
    photo_base64?: string;
    strict_mode?: boolean;
  }): Promise<ModerationResult> {
    try {
      const response = await this.client.post<ModerationResult>(
        '/api/v1/photo-analysis/moderation',
        request
      );

      logger.info('Moderation checked', {
        appropriate: response.data.is_appropriate,
        flags: response.data.flags,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Moderation check failed', { error: error.message });
      throw this.handleError(error);
    }
  }

  /**
   * Get style feedback
   */
  async getStyleFeedback(request: {
    photo_url?: string;
    photo_base64?: string;
    is_primary?: boolean;
  }): Promise<StyleFeedbackResult> {
    try {
      const response = await this.client.post<StyleFeedbackResult>(
        '/api/v1/photo-analysis/style',
        request
      );

      logger.info('Style feedback generated', {
        score: response.data.style_score,
        feedbackCount: response.data.feedback.length,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Style feedback failed', { error: error.message });
      throw this.handleError(error);
    }
  }

  /**
   * Analyze multiple photos in batch
   */
  async batchAnalyze(photoUrls: string[], userId?: string): Promise<BatchAnalysisResult> {
    try {
      const response = await this.client.post<BatchAnalysisResult>('/api/v1/photo-analysis/batch', {
        photo_urls: photoUrls,
        user_id: userId,
      });

      logger.info('Batch analysis completed', {
        total: response.data.total_photos,
        approved: response.data.approved_count,
        processingTime: response.data.processing_time_ms,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Batch analysis failed', { error: error.message });
      throw this.handleError(error);
    }
  }

  /**
   * Rank photos and get profile optimization suggestions
   */
  async rankPhotos(photoUrls: string[], userId?: string): Promise<PhotoRankingResult> {
    try {
      const response = await this.client.post<PhotoRankingResult>('/api/v1/photo-analysis/rank', {
        photo_urls: photoUrls,
        user_id: userId,
      });

      logger.info('Photos ranked', {
        photoCount: response.data.ranked_photos.length,
        profileScore: response.data.profile_score,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Photo ranking failed', { error: error.message });
      throw this.handleError(error);
    }
  }

  /**
   * Analyze photo from base64 data (for direct uploads)
   */
  async analyzeBase64Photo(
    base64Data: string,
    isPrimary: boolean = false,
    userId?: string
  ): Promise<PhotoAnalysisResult> {
    return this.analyzePhoto({
      photo_base64: base64Data,
      is_primary: isPrimary,
      user_id: userId,
    });
  }

  /**
   * Quick validation for upload acceptance
   * Returns true if photo is acceptable for upload
   */
  async validateForUpload(photoUrl: string): Promise<{
    acceptable: boolean;
    reason?: string;
    suggestions: string[];
  }> {
    try {
      const result = await this.analyzePhoto({ photo_url: photoUrl });

      return {
        acceptable: result.approved,
        reason:
          result.rejection_reasons.length > 0
            ? this.getRejectionMessage(result.rejection_reasons[0])
            : undefined,
        suggestions: result.recommendations,
      };
    } catch (error: any) {
      logger.error('Upload validation failed', { error: error.message });
      return {
        acceptable: false,
        reason: 'Unable to analyze photo. Please try again.',
        suggestions: ['Try uploading a different photo.'],
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      logger.warn('Photo analysis service health check failed');
      return false;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private handleError(error: any): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: string; error?: string }>;

      if (axiosError.response) {
        const message =
          axiosError.response.data?.detail ||
          axiosError.response.data?.error ||
          'Photo analysis service error';
        return new Error(message);
      }

      if (axiosError.code === 'ECONNREFUSED') {
        return new Error('Photo analysis service is unavailable');
      }

      if (axiosError.code === 'ETIMEDOUT') {
        return new Error('Photo analysis request timed out');
      }
    }

    return new Error(error.message || 'Unknown photo analysis error');
  }

  private getRejectionMessage(reason: string): string {
    const messages: Record<string, string> = {
      content_guidelines_violation: 'This photo does not meet our community guidelines.',
      no_face_detected_primary: 'Your primary photo should clearly show your face.',
      multiple_faces_primary: 'Your primary photo should only show you.',
      poor_quality: 'This photo quality is too low. Please upload a clearer photo.',
      analysis_failed: 'We were unable to analyze this photo. Please try a different one.',
    };

    return messages[reason] || 'This photo cannot be used. Please try a different one.';
  }
}

// Export singleton instance
export const photoAnalysisClient = new PhotoAnalysisClient();
export default photoAnalysisClient;
