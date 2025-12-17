/**
 * AI Services Configuration
 * Centralized configuration for AI service endpoints
 */

export const AI_CONFIG = {
  // AI Service Base URLs
  FRAUD_DETECTION_URL: import.meta.env.VITE_FRAUD_DETECTION_URL || '/api/ai/fraud',
  NLP_SERVICE_URL: import.meta.env.VITE_NLP_SERVICE_URL || '/api/ai/nlp',
  PHOTO_ANALYSIS_URL: import.meta.env.VITE_PHOTO_ANALYSIS_URL || '/api/ai/photos',
  RECOMMENDATION_URL: import.meta.env.VITE_RECOMMENDATION_URL || '/api/ai/recommendations',

  // Timeouts (ms)
  DEFAULT_TIMEOUT: 30000,
  UPLOAD_TIMEOUT: 120000,
  AI_ANALYSIS_TIMEOUT: 60000,

  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
};
