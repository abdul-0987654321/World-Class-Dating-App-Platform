/**
 * Dating Coach Service Client
 * Handles communication with the dating coach service for AI-powered features
 * including relationship trajectory prediction
 *
 * RESILIENCE FEATURES:
 * - Circuit breaker pattern for fault tolerance
 * - Exponential backoff retry with jitter
 * - Configurable timeouts
 * - Feature flag integration ready
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

import config from '../../config';
import { createLogger } from '../../utils/logger';

const logger = createLogger('dating-coach-client');

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY = 500;
const MAX_DELAY = 5000;
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];

// ============================================================================
// TYPES
// ============================================================================

/**
 * Predicted relationship trajectory outcomes
 */
export type PredictedOutcome =
  | 'strong_connection'
  | 'building_interest'
  | 'plateau'
  | 'fading'
  | 'uncertain';

/**
 * Momentum direction
 */
export type Momentum = 'accelerating' | 'steady' | 'slowing' | 'stalled';

/**
 * Trend direction
 */
export type Trend = 'improving' | 'stable' | 'declining';

/**
 * Impact level
 */
export type ImpactLevel = 'high' | 'medium' | 'low';

/**
 * Priority level
 */
export type Priority = 'high' | 'medium' | 'low';

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  text: string;
  timestamp?: number | string | Date;
  is_match: boolean;
  sender_id?: string;
}

/**
 * User profile data for trajectory prediction
 */
export interface UserProfile {
  id?: string;
  first_name?: string;
  interests?: string[];
  bio?: string;
  [key: string]: any;
}

/**
 * Interaction metrics for trajectory calculation
 */
export interface InteractionMetrics {
  total_messages?: number;
  user_messages?: number;
  match_messages?: number;
  avg_response_time_user?: number | null;
  avg_response_time_match?: number | null;
  avg_message_length_user?: number | null;
  avg_message_length_match?: number | null;
  conversation_days?: number;
  messages_per_day?: number | null;
  last_message_hours_ago?: number | null;
  question_count_user?: number;
  question_count_match?: number;
  emoji_count_user?: number;
  emoji_count_match?: number;
}

/**
 * Request payload for trajectory prediction
 */
export interface TrajectoryPredictionRequest {
  user_id: string;
  match_id: string;
  conversation_history: ConversationMessage[];
  user_profile: UserProfile;
  match_profile: UserProfile;
  interaction_metrics?: InteractionMetrics;
}

/**
 * Individual factor contributing to trajectory prediction
 */
export interface TrajectoryFactor {
  name: string;
  score: number;
  weight: number;
  trend: Trend;
  description: string;
  impact: ImpactLevel;
}

/**
 * Recommendation for improving trajectory
 */
export interface TrajectoryRecommendation {
  id: string;
  category: string;
  priority: Priority;
  title: string;
  description: string;
  action_items: string[];
  expected_impact: string;
}

/**
 * Insight about the trajectory
 */
export interface TrajectoryInsight {
  type: string;
  title: string;
  description: string;
  confidence: number;
}

/**
 * Milestone progress tracking
 */
export interface MilestoneProgress {
  first_message?: { achieved: boolean; achieved_at?: string | null };
  mutual_questions?: {
    achieved: boolean;
    user_questions: number;
    match_questions: number;
  };
  consistent_communication?: {
    achieved: boolean;
    messages_per_day: number | null;
    conversation_days: number;
  };
  deeper_conversations?: {
    achieved: boolean;
    avg_message_length: number;
  };
  date_planning?: { achieved: boolean; mentioned: boolean };
  exchanged_contacts?: { achieved: boolean; mentioned: boolean };
  overall_progress?: {
    achieved: number;
    total: number;
    percentage: number;
  };
}

/**
 * Response from trajectory prediction
 */
export interface TrajectoryPredictionResponse {
  trajectory_score: number;
  predicted_outcome: PredictedOutcome;
  confidence: number;
  factors: TrajectoryFactor[];
  recommendations: TrajectoryRecommendation[];
  insights: TrajectoryInsight[];
  momentum: Momentum;
  milestone_progress: MilestoneProgress;
  next_milestone: string | null;
  risk_factors: string[];
  positive_signals: string[];
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private successCount = 0;
  private readonly threshold = 5;
  private readonly resetTimeout = 30000;
  private readonly successThreshold = 2;

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        logger.info('[DatingCoachClient] Circuit breaker transitioning to HALF_OPEN');
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
        logger.info('[DatingCoachClient] Circuit breaker CLOSED');
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
      logger.warn(`[DatingCoachClient] Circuit breaker OPEN: ${this.failureCount} failures`);
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculateBackoff(attempt: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
  return Math.floor(delay * (0.5 + Math.random() * 0.5));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// CLIENT CLASS
// ============================================================================

export class DatingCoachClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private circuitBreaker: CircuitBreaker;

  constructor() {
    // Use config or environment variable for the dating coach service URL
    this.baseUrl =
      process.env.DATING_COACH_SERVICE_URL ||
      config.services?.datingCoachServiceUrl ||
      'http://localhost:3010';
    this.circuitBreaker = new CircuitBreaker();

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000, // Slightly longer timeout for AI operations
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': 'messaging-service',
        'X-Service-Token': config.serviceToken,
      },
    });

    // Response interceptor for circuit breaker
    this.client.interceptors.response.use(
      (response) => {
        this.circuitBreaker.recordSuccess();
        return response;
      },
      (error: AxiosError) => {
        this.circuitBreaker.recordFailure();
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute request with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    defaultValue?: T
  ): Promise<T> {
    if (!this.circuitBreaker.allowRequest()) {
      logger.warn(`[DatingCoachClient] Circuit breaker OPEN - ${operationName} blocked`);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new Error(`Dating coach service circuit breaker is OPEN - ${operationName} blocked`);
    }

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;

        // Don't retry 4xx errors (except 408 and 429)
        if (
          status &&
          status >= 400 &&
          status < 500 &&
          !RETRYABLE_STATUS_CODES.includes(status)
        ) {
          throw error;
        }

        if (attempt < MAX_RETRIES) {
          const delay = calculateBackoff(attempt);
          logger.warn(
            `[DatingCoachClient] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${delay}ms...`
          );
          await sleep(delay);
        }
      }
    }

    // If we have a default value, return it instead of throwing
    if (defaultValue !== undefined) {
      logger.error(
        `[DatingCoachClient] ${operationName} failed after ${MAX_RETRIES} retries, using default value`
      );
      return defaultValue;
    }

    throw lastError || new Error(`${operationName} failed after ${MAX_RETRIES} retries`);
  }

  // ==========================================================================
  // TRAJECTORY PREDICTION API
  // ==========================================================================

  /**
   * Predict relationship trajectory based on conversation and engagement patterns
   *
   * @param request - The trajectory prediction request containing conversation history and profiles
   * @param authToken - Authentication token for the user
   * @returns Trajectory prediction with scores, factors, and recommendations
   */
  async predictTrajectory(
    request: TrajectoryPredictionRequest,
    authToken: string
  ): Promise<TrajectoryPredictionResponse | null> {
    return this.executeWithRetry(
      async () => {
        const response = await this.client.post('/api/coach/trajectory', request, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        return response.data;
      },
      `predictTrajectory(${request.user_id}, ${request.match_id})`,
      null
    );
  }

  /**
   * Get trajectory prediction with minimal required data
   * Convenience method that builds the request from simpler inputs
   */
  async getTrajectorySimple(
    userId: string,
    matchId: string,
    conversationHistory: ConversationMessage[],
    userProfile: UserProfile,
    matchProfile: UserProfile,
    authToken: string
  ): Promise<TrajectoryPredictionResponse | null> {
    const request: TrajectoryPredictionRequest = {
      user_id: userId,
      match_id: matchId,
      conversation_history: conversationHistory,
      user_profile: userProfile,
      match_profile: matchProfile,
    };

    return this.predictTrajectory(request, authToken);
  }

  /**
   * Check if trajectory prediction is available for a conversation
   * Returns true if there's enough data for meaningful prediction
   */
  async isTrajectoryAvailable(
    conversationHistory: ConversationMessage[]
  ): Promise<{ available: boolean; reason?: string }> {
    if (!conversationHistory || conversationHistory.length === 0) {
      return {
        available: false,
        reason: 'No conversation history available',
      };
    }

    if (conversationHistory.length < 5) {
      return {
        available: false,
        reason: 'Need at least 5 messages for trajectory prediction',
      };
    }

    // Check for messages from both parties
    const hasUserMessages = conversationHistory.some((m) => !m.is_match);
    const hasMatchMessages = conversationHistory.some((m) => m.is_match);

    if (!hasUserMessages || !hasMatchMessages) {
      return {
        available: false,
        reason: 'Need messages from both parties for trajectory prediction',
      };
    }

    return { available: true };
  }

  // ==========================================================================
  // HEALTH & STATUS
  // ==========================================================================

  /**
   * Check dating coach service health
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const response = await this.client.get('/health');
      return {
        healthy: response.data?.status === 'healthy',
        details: response.data,
      };
    } catch (error: any) {
      logger.error(`[DatingCoachClient] Health check failed: ${error.message}`);
      return {
        healthy: false,
        details: { error: error.message },
      };
    }
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(): CircuitState {
    return this.circuitBreaker.getState();
  }
}

// Export singleton instance
export const datingCoachClient = new DatingCoachClient();
export default datingCoachClient;
