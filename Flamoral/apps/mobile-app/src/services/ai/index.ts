/**
 * AI Services Index
 * Centralized exports for all AI service clients
 */

// Service instances
export { fraudDetectionService } from './FraudDetectionService';
export { nlpService } from './NLPService';
export { photoAnalysisService } from './PhotoAnalysisService';
export { recommendationService } from './RecommendationService';

// Service classes (for custom instances)
export { default as FraudDetectionService } from './FraudDetectionService';
export { default as NLPService } from './NLPService';
export { default as PhotoAnalysisService } from './PhotoAnalysisService';
export { default as RecommendationService } from './RecommendationService';

// Types - Fraud Detection
export type {
  FraudCheckRequest,
  FraudCheckResult,
  RiskFactor,
  LocationAnomalyResult,
  DeviceCheckResult,
  VelocityCheckResult,
  ProfileFraudAnalysis,
  FraudIndicator,
} from './FraudDetectionService';

// Types - NLP
export type {
  SentimentAnalysisRequest,
  SentimentAnalysisResult,
  EmotionScore,
  ToxicityAnalysisRequest,
  ToxicityAnalysisResult,
  ToxicityCategory,
  FlaggedPhrase,
  LanguageDetectionResult,
  KeywordExtractionResult,
  ExtractedKeyword,
  NamedEntity,
  InterestExtractionResult,
  ExtractedInterest,
  PersonalityTrait,
  ConversationAnalysisResult,
  SmartReplyResult,
  SuggestedReply,
} from './NLPService';

// Types - Photo Analysis
export type {
  PhotoAnalysisRequest,
  PhotoAnalysisResult,
  FaceAnalysisResult,
  FaceLandmark,
  FaceAttributes,
  QualityAnalysisResult,
  QualityIssue,
  ModerationResult,
  ModerationCategory,
  VerificationResult,
  PhotoRankingResult,
  PhotoComparisonResult,
  ProfilePhotoSuggestions,
} from './PhotoAnalysisService';

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
  UserEmbedding,
} from './RecommendationService';
