/**
 * AI Service Client
 * Client for communicating with Python AI microservices
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger';

// Service URLs from environment
const AI_SERVICE_URLS = {
  recommendation: process.env.RECOMMENDATION_SERVICE_URL || 'http://recommendation-service:8001',
  photoAnalysis: process.env.PHOTO_ANALYSIS_SERVICE_URL || 'http://photo-analysis-service:8002',
  nlp: process.env.NLP_SERVICE_URL || 'http://nlp-service:8003',
  fraudDetection: process.env.FRAUD_DETECTION_SERVICE_URL || 'http://fraud-detection-service:8004',
};

// Response types
export interface RecommendationResponse {
  userId: string;
  score: number;
  features: Record<string, number>;
  explanation?: string;
}

export interface PhotoAnalysisResponse {
  isAppropriate: boolean;
  faceDetected: boolean;
  faceCount: number;
  quality: {
    score: number;
    issues: string[];
  };
  nsfw: {
    score: number;
    category?: string;
  };
  deepfakeScore: number;
  metadata: {
    width: number;
    height: number;
    format: string;
  };
}

export interface NLPAnalysisResponse {
  sentiment: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  toxicity: {
    score: number;
    categories: string[];
  };
  language: string;
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  isSpam: boolean;
  moderationFlags: string[];
}

export interface FraudDetectionResponse {
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendations: string[];
  shouldBlock: boolean;
  metadata: Record<string, any>;
}

export interface ConversationAnalysisResponse {
  engagementScore: number;
  healthScore: number;
  redFlags: string[];
  topics: string[];
  suggestedActions: string[];
}

class AIServiceClient {
  private clients: Record<string, AxiosInstance>;
  private timeout: number;
  private retries: number;

  constructor() {
    this.timeout = parseInt(process.env.AI_SERVICE_TIMEOUT || '5000', 10);
    this.retries = parseInt(process.env.AI_SERVICE_RETRIES || '2', 10);

    // Create axios instances for each service
    this.clients = {
      recommendation: this.createClient(AI_SERVICE_URLS.recommendation),
      photoAnalysis: this.createClient(AI_SERVICE_URLS.photoAnalysis),
      nlp: this.createClient(AI_SERVICE_URLS.nlp),
      fraudDetection: this.createClient(AI_SERVICE_URLS.fraudDetection),
    };
  }

  private createClient(baseURL: string): AxiosInstance {
    const client = axios.create({
      baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'flamoral-backend',
        'X-API-Key': process.env.AI_SERVICES_API_KEY || '',
      },
    });

    // Add request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        logger.debug('AI Service Request', {
          service: baseURL,
          method: config.method,
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error('AI Service Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    client.interceptors.response.use(
      (response) => {
        logger.debug('AI Service Response', {
          service: baseURL,
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        logger.error('AI Service Response Error', {
          service: baseURL,
          status: error.response?.status,
          message: error.message,
        });
        return Promise.reject(error);
      }
    );

    return client;
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    serviceName: string
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retries + 1; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        logger.warn(`AI Service ${serviceName} attempt ${attempt} failed`, {
          error: error.message,
        });

        if (attempt <= this.retries) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 100)
          );
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if a service is healthy
   */
  async checkHealth(service: keyof typeof AI_SERVICE_URLS): Promise<boolean> {
    try {
      const response = await this.clients[service].get('/health');
      return response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get recommendations from AI service
   */
  async getRecommendations(
    userId: string,
    preferences: Record<string, any>,
    limit: number = 20
  ): Promise<RecommendationResponse[]> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.recommendation.post('/api/v1/recommendations', {
            user_id: userId,
            preferences,
            limit,
          }),
        'recommendation'
      );

      return response.data.recommendations || [];
    } catch (error: any) {
      logger.error('Failed to get AI recommendations', {
        userId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Analyze photo using AI service
   */
  async analyzePhoto(
    photoUrl: string,
    userId: string
  ): Promise<PhotoAnalysisResponse | null> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.photoAnalysis.post('/api/v1/analyze', {
            photo_url: photoUrl,
            user_id: userId,
            analyses: ['face', 'nsfw', 'quality', 'deepfake'],
          }),
        'photoAnalysis'
      );

      return {
        isAppropriate: response.data.is_appropriate,
        faceDetected: response.data.face_detected,
        faceCount: response.data.face_count || 0,
        quality: {
          score: response.data.quality?.score || 0,
          issues: response.data.quality?.issues || [],
        },
        nsfw: {
          score: response.data.nsfw?.score || 0,
          category: response.data.nsfw?.category,
        },
        deepfakeScore: response.data.deepfake_score || 0,
        metadata: response.data.metadata || {},
      };
    } catch (error: any) {
      logger.error('Failed to analyze photo', { photoUrl, error: error.message });
      return null;
    }
  }

  /**
   * Analyze text content using NLP service
   */
  async analyzeText(
    text: string,
    context?: string
  ): Promise<NLPAnalysisResponse | null> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.nlp.post('/api/v1/analyze', {
            text,
            context,
            analyses: ['sentiment', 'toxicity', 'language', 'entities', 'spam'],
          }),
        'nlp'
      );

      return {
        sentiment: {
          score: response.data.sentiment?.score || 0,
          label: response.data.sentiment?.label || 'neutral',
        },
        toxicity: {
          score: response.data.toxicity?.score || 0,
          categories: response.data.toxicity?.categories || [],
        },
        language: response.data.language || 'en',
        entities: response.data.entities || [],
        isSpam: response.data.is_spam || false,
        moderationFlags: response.data.moderation_flags || [],
      };
    } catch (error: any) {
      logger.error('Failed to analyze text', { error: error.message });
      return null;
    }
  }

  /**
   * Moderate content using NLP service
   */
  async moderateContent(
    text: string,
    contentType: 'bio' | 'message' | 'prompt'
  ): Promise<{
    isAllowed: boolean;
    violations: string[];
    suggestions: string[];
  }> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.nlp.post('/api/v1/moderate', {
            text,
            content_type: contentType,
          }),
        'nlp'
      );

      return {
        isAllowed: response.data.is_allowed ?? true,
        violations: response.data.violations || [],
        suggestions: response.data.suggestions || [],
      };
    } catch (error: any) {
      logger.error('Failed to moderate content', { error: error.message });
      // Default to allowing content if service is unavailable
      return { isAllowed: true, violations: [], suggestions: [] };
    }
  }

  /**
   * Analyze conversation using NLP service
   */
  async analyzeConversation(
    messages: Array<{ sender: string; text: string; timestamp: Date }>
  ): Promise<ConversationAnalysisResponse | null> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.nlp.post('/api/v1/conversation/analyze', {
            messages,
          }),
        'nlp'
      );

      return {
        engagementScore: response.data.engagement_score || 0,
        healthScore: response.data.health_score || 0,
        redFlags: response.data.red_flags || [],
        topics: response.data.topics || [],
        suggestedActions: response.data.suggested_actions || [],
      };
    } catch (error: any) {
      logger.error('Failed to analyze conversation', { error: error.message });
      return null;
    }
  }

  /**
   * Detect fraud using fraud detection service
   */
  async detectFraud(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<FraudDetectionResponse | null> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.fraudDetection.post('/api/v1/analyze', {
            user_id: userId,
            event_type: eventType,
            event_data: eventData,
          }),
        'fraudDetection'
      );

      return {
        riskScore: response.data.risk_score || 0,
        riskLevel: response.data.risk_level || 'low',
        indicators: response.data.indicators || [],
        recommendations: response.data.recommendations || [],
        shouldBlock: response.data.should_block || false,
        metadata: response.data.metadata || {},
      };
    } catch (error: any) {
      logger.error('Failed to detect fraud', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Analyze user profile for fraud
   */
  async analyzeProfile(
    userId: string,
    profileData: Record<string, any>
  ): Promise<FraudDetectionResponse | null> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.fraudDetection.post('/api/v1/profile/analyze', {
            user_id: userId,
            profile_data: profileData,
          }),
        'fraudDetection'
      );

      return {
        riskScore: response.data.risk_score || 0,
        riskLevel: response.data.risk_level || 'low',
        indicators: response.data.indicators || [],
        recommendations: response.data.recommendations || [],
        shouldBlock: response.data.should_block || false,
        metadata: response.data.metadata || {},
      };
    } catch (error: any) {
      logger.error('Failed to analyze profile', { userId, error: error.message });
      return null;
    }
  }

  /**
   * Analyze user behavior for fraud patterns
   */
  async analyzeBehavior(
    userId: string,
    behaviorData: {
      loginAttempts?: number;
      ipAddresses?: string[];
      deviceFingerprints?: string[];
      activityPatterns?: Record<string, any>;
    }
  ): Promise<FraudDetectionResponse | null> {
    try {
      const response = await this.withRetry(
        () =>
          this.clients.fraudDetection.post('/api/v1/behavior/analyze', {
            user_id: userId,
            behavior_data: behaviorData,
          }),
        'fraudDetection'
      );

      return {
        riskScore: response.data.risk_score || 0,
        riskLevel: response.data.risk_level || 'low',
        indicators: response.data.indicators || [],
        recommendations: response.data.recommendations || [],
        shouldBlock: response.data.should_block || false,
        metadata: response.data.metadata || {},
      };
    } catch (error: any) {
      logger.error('Failed to analyze behavior', { userId, error: error.message });
      return null;
    }
  }
}

// Export singleton instance
export const aiServiceClient = new AIServiceClient();
export default aiServiceClient;
