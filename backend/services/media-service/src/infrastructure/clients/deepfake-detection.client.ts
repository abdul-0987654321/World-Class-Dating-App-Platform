/**
 * Client for the Deepfake Detection AI Service.
 *
 * Provides integration with the ML-based deepfake detection service
 * for analyzing photos and videos for AI-generated content.
 */

import { createLogger } from '@flamoral/backend-shared';
import axios, { AxiosInstance, AxiosError } from 'axios';

const logger = createLogger('deepfake-detection-client');

// Service configuration
const DEEPFAKE_SERVICE_URL = process.env.DEEPFAKE_SERVICE_URL || 'http://localhost:8010';
const DEEPFAKE_TIMEOUT = parseInt(process.env.DEEPFAKE_TIMEOUT || '30000', 10);

/**
 * Image analysis request
 */
export interface ImageAnalysisRequest {
  imageUrl: string;
  userId?: string;
}

/**
 * Image analysis response
 */
export interface ImageAnalysisResponse {
  is_deepfake: boolean;
  confidence: number;
  deepfake_score: number;
  indicators: string[];
  face_count: number;
  analysis_details: Record<string, any>;
}

/**
 * Video analysis request
 */
export interface VideoAnalysisRequest {
  videoUrl: string;
  userId?: string;
  maxFrames?: number;
}

/**
 * Video analysis response
 */
export interface VideoAnalysisResponse {
  is_deepfake: boolean;
  confidence: number;
  deepfake_score: number;
  frame_count: number;
  suspicious_frames: number;
  indicators: string[];
  temporal_consistency_score: number;
  blink_analysis: Record<string, any>;
}

/**
 * Deepfake detection result for media-service integration
 */
export interface DeepfakeDetectionResult {
  isDeepfake: boolean;
  confidence: number;
  score: number;
  indicators: string[];
  requiresReview: boolean;
  details: Record<string, any>;
}

/**
 * Client for the Deepfake Detection Service
 */
export class DeepfakeDetectionClient {
  private client: AxiosInstance;
  private isHealthy: boolean = true;
  private lastHealthCheck: Date | null = null;
  private readonly healthCheckInterval = 60000; // 1 minute

  constructor() {
    this.client = axios.create({
      baseURL: DEEPFAKE_SERVICE_URL,
      timeout: DEEPFAKE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Deepfake API request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('Deepfake API request error', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          logger.error(
            `Deepfake API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          logger.error('Deepfake API no response received');
          this.isHealthy = false;
        } else {
          logger.error('Deepfake API error', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/api/v1/deepfake/health');
      this.isHealthy = response.data?.status === 'healthy';
      this.lastHealthCheck = new Date();
      return this.isHealthy;
    } catch (error) {
      logger.error('Deepfake service health check failed', error);
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Get cached health status
   */
  async getHealthStatus(): Promise<boolean> {
    // Check if we need to refresh health status
    if (
      !this.lastHealthCheck ||
      Date.now() - this.lastHealthCheck.getTime() > this.healthCheckInterval
    ) {
      await this.checkHealth();
    }
    return this.isHealthy;
  }

  /**
   * Analyze an image for deepfake indicators
   */
  async analyzeImage(request: ImageAnalysisRequest): Promise<DeepfakeDetectionResult> {
    try {
      logger.info(`Analyzing image for deepfakes: ${request.imageUrl.substring(0, 50)}...`);

      const response = await this.client.post<ImageAnalysisResponse>(
        '/api/v1/deepfake/analyze-image-json',
        {
          image_url: request.imageUrl,
          user_id: request.userId,
        }
      );

      const result = response.data;

      return {
        isDeepfake: result.is_deepfake,
        confidence: result.confidence,
        score: result.deepfake_score,
        indicators: result.indicators,
        requiresReview: this.shouldRequireReview(result),
        details: {
          faceCount: result.face_count,
          ...result.analysis_details,
        },
      };
    } catch (error) {
      logger.error('Image deepfake analysis failed', error);
      throw new DeepfakeAnalysisError('Failed to analyze image for deepfakes', error);
    }
  }

  /**
   * Analyze a video for deepfake indicators
   */
  async analyzeVideo(request: VideoAnalysisRequest): Promise<DeepfakeDetectionResult> {
    try {
      logger.info(`Analyzing video for deepfakes: ${request.videoUrl.substring(0, 50)}...`);

      const response = await this.client.post<VideoAnalysisResponse>(
        '/api/v1/deepfake/analyze-video-json',
        {
          video_url: request.videoUrl,
          user_id: request.userId,
          max_frames: request.maxFrames,
        }
      );

      const result = response.data;

      return {
        isDeepfake: result.is_deepfake,
        confidence: result.confidence,
        score: result.deepfake_score,
        indicators: result.indicators,
        requiresReview: this.shouldRequireReview(result),
        details: {
          frameCount: result.frame_count,
          suspiciousFrames: result.suspicious_frames,
          temporalConsistency: result.temporal_consistency_score,
          blinkAnalysis: result.blink_analysis,
        },
      };
    } catch (error) {
      logger.error('Video deepfake analysis failed', error);
      throw new DeepfakeAnalysisError('Failed to analyze video for deepfakes', error);
    }
  }

  /**
   * Internal endpoint for service-to-service communication
   */
  async internalAnalyze(imageUrl: string): Promise<DeepfakeDetectionResult> {
    try {
      const response = await this.client.post<ImageAnalysisResponse>('/internal/analyze', {
        image_url: imageUrl,
      });

      const result = response.data;

      return {
        isDeepfake: result.is_deepfake,
        confidence: result.confidence,
        score: result.deepfake_score,
        indicators: result.indicators,
        requiresReview: this.shouldRequireReview(result),
        details: {
          faceCount: result.face_count,
          ...result.analysis_details,
        },
      };
    } catch (error) {
      // Fall back to public endpoint if internal fails
      return this.analyzeImage({ imageUrl });
    }
  }

  /**
   * Determine if content requires manual review
   */
  private shouldRequireReview(result: ImageAnalysisResponse | VideoAnalysisResponse): boolean {
    // Require review for borderline cases
    if (result.confidence < 0.7 && result.deepfake_score > 0.3) {
      return true;
    }

    // Require review if detected as deepfake but low confidence
    if (result.is_deepfake && result.confidence < 0.8) {
      return true;
    }

    // Multiple indicators suggest review
    if (result.indicators.length >= 3) {
      return true;
    }

    return false;
  }
}

/**
 * Custom error for deepfake analysis failures
 */
export class DeepfakeAnalysisError extends Error {
  public readonly originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'DeepfakeAnalysisError';
    this.originalError = originalError;
  }
}

// Export singleton instance
export const deepfakeDetectionClient = new DeepfakeDetectionClient();

export default deepfakeDetectionClient;
