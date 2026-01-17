/**
 * Client for the Deepfake Detection AI Service.
 *
 * Provides integration with the ML-based deepfake detection service
 * for analyzing photos and videos for AI-generated content.
 *
 * RESILIENCE FEATURES:
 * - Circuit breaker pattern for fault tolerance
 * - Exponential backoff retry with jitter
 * - Configurable timeouts
 */

import { createLogger } from '@flamoral/backend-shared';
import axios, { AxiosInstance, AxiosError } from 'axios';

const logger = createLogger('deepfake-detection-client');

// Service configuration
const DEEPFAKE_SERVICE_URL = process.env.DEEPFAKE_SERVICE_URL || 'http://localhost:8010';
const DEEPFAKE_TIMEOUT = parseInt(process.env.DEEPFAKE_TIMEOUT || '30000', 10);

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 1000;
const MAX_DELAY = 15000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

/**
 * Circuit Breaker State
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker for AI service resilience
 */
class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 60000; // 1 minute for AI services
  private readonly successThreshold = 2;

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info('[DeepfakeDetection] Circuit breaker transitioning to HALF_OPEN');
      }
    }
    return this.state;
  }

  allowRequest(): boolean {
    return this.getState() !== 'OPEN';
  }

  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        logger.info('[DeepfakeDetection] Circuit breaker CLOSED');
      }
    } else {
      this.failureCount = 0;
    }
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === 'HALF_OPEN' || this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.warn(`[DeepfakeDetection] Circuit breaker OPEN: ${this.failureCount} failures`);
    }
  }

  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Calculate exponential backoff with jitter
 */
function calculateBackoff(attempt: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
  return Math.floor(delay * (0.5 + Math.random() * 0.5));
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  private circuitBreaker: CircuitBreaker;
  private isHealthy: boolean = true;
  private lastHealthCheck: Date | null = null;
  private readonly healthCheckInterval = 60000; // 1 minute

  constructor() {
    this.circuitBreaker = new CircuitBreaker();

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

    // Response interceptor for error handling and circuit breaker
    this.client.interceptors.response.use(
      (response) => {
        this.circuitBreaker.recordSuccess();
        this.isHealthy = true;
        return response;
      },
      (error: AxiosError) => {
        this.circuitBreaker.recordFailure();
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
   * Execute request with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    if (!this.circuitBreaker.allowRequest()) {
      throw new DeepfakeAnalysisError(
        `Deepfake detection circuit breaker is OPEN - ${operationName} blocked`
      );
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        // Don't retry 4xx errors (except 408 and 429)
        if (status && status >= 400 && status < 500 && !RETRYABLE_STATUS_CODES.includes(status)) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delay = calculateBackoff(attempt);
          logger.warn(`[DeepfakeDetection] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    throw lastError || new DeepfakeAnalysisError(`${operationName} failed after ${MAX_RETRIES} retries`);
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker (for recovery scenarios)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
    logger.info('[DeepfakeDetection] Circuit breaker manually reset');
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
    return this.executeWithRetry(async () => {
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
    }, 'analyzeImage');
  }

  /**
   * Analyze a video for deepfake indicators
   */
  async analyzeVideo(request: VideoAnalysisRequest): Promise<DeepfakeDetectionResult> {
    return this.executeWithRetry(async () => {
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
    }, 'analyzeVideo');
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
