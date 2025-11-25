/**
 * AI Services Index
 * Centralized exports for all AI service clients
 */

// Configuration
export { AI_CONFIG } from './config';

// Service instances
export { fraudDetectionService } from './fraudDetection.service';
export { nlpService } from './nlp.service';
export { photoAnalysisService } from './photoAnalysis.service';
export { recommendationService } from './recommendation.service';

// Service classes
export { default as FraudDetectionService } from './fraudDetection.service';
export { default as NLPService } from './nlp.service';
export { default as PhotoAnalysisService } from './photoAnalysis.service';
export { default as RecommendationService } from './recommendation.service';

// Types - Fraud Detection
export type {
  FraudCheckRequest,
  FraudCheckResult,
  RiskFactor,
  LocationAnomalyResult,
  DeviceCheckResult,
  VelocityCheckResult,
  ProfileFraudAnalysis,
} from './fraudDetection.service';

// Types - NLP
export type {
  SentimentAnalysisResult,
  EmotionScore,
  ToxicityAnalysisResult,
  ToxicityCategory,
  FlaggedPhrase,
  LanguageDetectionResult,
  KeywordExtractionResult,
  InterestExtractionResult,
  ConversationAnalysisResult,
  SmartReplyResult,
  SuggestedReply,
  ContentModerationResult,
  ScamDetectionResult,
  IcebreakerResult,
  BioAnalysisResult,
} from './nlp.service';

// Types - Photo Analysis
export type {
  PhotoAnalysisResult,
  FaceAnalysisResult,
  FaceAttributes,
  QualityAnalysisResult,
  QualityIssue,
  ModerationResult,
  ModerationCategory,
  VerificationResult,
  PhotoRankingResult,
  PhotoComparisonResult,
  ProfilePhotoSuggestions,
  FakePhotoDetectionResult,
} from './photoAnalysis.service';

// Types - Recommendation
export type {
  RecommendationRequest,
  UserPreferences,
  RecommendationFilters,
  RecommendationResult,
  RecommendedProfile,
  MatchReason,
  ProfileSummary,
  RankingFactor,
  CompatibilityResult,
  SwipeFeedback,
  RecommendationStats,
  LikedYouResult,
} from './recommendation.service';
