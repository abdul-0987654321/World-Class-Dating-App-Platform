/**
 * Audience Targeting & Segmentation Types
 * Implements 10 audience targeting features for dating-specific advertising
 */

// Feature 1: Dating Behavior Segmentation
export interface DatingBehaviorSegment {
  id: string;
  name: string;
  criteria: {
    swipe_patterns: SwipePattern[];
    messaging_behavior: MessagingBehavior;
    match_preferences: MatchPreferences;
    engagement_level: 'passive' | 'active' | 'highly_active';
    response_rate_threshold?: number;
  };
  size: number;
  last_updated: Date;
}

export interface SwipePattern {
  direction: 'left' | 'right' | 'super';
  frequency: 'low' | 'medium' | 'high';
  time_of_day?: string[];
  profile_type_preference?: string[];
}

export interface MessagingBehavior {
  avg_messages_per_match: number;
  first_message_time_hours: number;
  conversation_length: 'short' | 'medium' | 'long';
  emoji_usage: 'none' | 'low' | 'high';
}

export interface MatchPreferences {
  age_range_flexibility: 'strict' | 'moderate' | 'flexible';
  distance_flexibility: 'strict' | 'moderate' | 'flexible';
  deal_breaker_count: number;
}

// Feature 2: Relationship Intent Targeting
export interface RelationshipIntentTarget {
  id: string;
  intent:
    | 'casual_dating'
    | 'serious_relationship'
    | 'marriage_minded'
    | 'new_friends'
    | 'networking';
  signals: RelationshipSignal[];
  confidence_score: number;
  ad_compatibility: AdCompatibility;
}

export interface RelationshipSignal {
  signal_type: string;
  weight: number;
  source: 'profile' | 'behavior' | 'stated' | 'inferred';
}

export interface AdCompatibility {
  compatible_ad_types: string[];
  incompatible_ad_types: string[];
  recommended_messaging: string[];
}

// Feature 3: Compatibility-Based Ad Matching
export interface CompatibilityAdMatch {
  ad_id: string;
  user_id: string;
  compatibility_score: number;
  matching_dimensions: CompatibilityDimension[];
  predicted_engagement: number;
  predicted_conversion: number;
}

export interface CompatibilityDimension {
  dimension: string;
  user_value: string | number;
  ad_target_value: string | number;
  match_score: number;
}

// Feature 4: Life Stage Segmentation
export interface LifeStageSegment {
  id: string;
  life_stage: LifeStage;
  characteristics: LifeStageCharacteristics;
  ad_preferences: AdPreference[];
  purchase_propensity: Record<string, number>;
}

export type LifeStage =
  | 'college_student'
  | 'young_professional'
  | 'established_career'
  | 'career_changer'
  | 'new_parent'
  | 'empty_nester'
  | 'recently_divorced'
  | 'retired';

export interface LifeStageCharacteristics {
  typical_age_range: { min: number; max: number };
  income_level: 'low' | 'medium' | 'high' | 'very_high';
  time_availability: 'limited' | 'moderate' | 'abundant';
  disposable_income: 'low' | 'medium' | 'high';
  lifestyle_priorities: string[];
}

export interface AdPreference {
  category: string;
  affinity_score: number;
  optimal_timing: string[];
}

// Feature 5: Profile Quality Scoring for Ad Tiers
export interface ProfileQualityAdTier {
  user_id: string;
  quality_score: number; // 0-100
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  quality_factors: QualityFactor[];
  eligible_ad_categories: string[];
  ad_priority_boost: number;
}

export interface QualityFactor {
  factor: string;
  score: number;
  weight: number;
  improvement_suggestion?: string;
}

// Feature 6: Geographic Dating Market Targeting
export interface GeoDatingMarket {
  market_id: string;
  location: {
    city: string;
    state?: string;
    country: string;
    coordinates: { lat: number; lng: number };
    radius_km: number;
  };
  market_characteristics: MarketCharacteristics;
  competitive_landscape: CompetitiveLandscape;
  ad_pricing: AdPricing;
}

export interface MarketCharacteristics {
  population: number;
  active_users: number;
  gender_ratio: { male: number; female: number; other: number };
  avg_age: number;
  predominant_relationship_goals: string[];
  cultural_factors: string[];
}

export interface CompetitiveLandscape {
  competing_platforms: string[];
  market_saturation: 'low' | 'medium' | 'high';
  user_acquisition_cost: number;
}

export interface AdPricing {
  cpm_range: { min: number; max: number };
  cpc_range: { min: number; max: number };
  premium_placement_multiplier: number;
}

// Feature 7: Activity Time Window Targeting
export interface ActivityTimeWindow {
  user_id: string;
  peak_activity_windows: TimeWindow[];
  swipe_sessions: SessionPattern[];
  message_response_times: ResponseTimePattern[];
  optimal_ad_delivery_times: TimeWindow[];
}

export interface TimeWindow {
  day_of_week: number; // 0-6
  start_hour: number;
  end_hour: number;
  activity_intensity: number; // 0-1
  timezone: string;
}

export interface SessionPattern {
  avg_duration_minutes: number;
  avg_swipes_per_session: number;
  session_frequency_per_week: number;
  preferred_device: 'mobile' | 'tablet' | 'desktop';
}

export interface ResponseTimePattern {
  avg_response_time_minutes: number;
  response_rate: number;
  peak_response_hours: number[];
}

// Feature 8: Subscription Tier Targeting
export interface SubscriptionTierTarget {
  tier: 'free' | 'gold' | 'platinum' | 'diamond';
  tier_characteristics: TierCharacteristics;
  upgrade_propensity: UpgradePropensity;
  ad_exposure_settings: AdExposureSettings;
}

export interface TierCharacteristics {
  avg_tenure_months: number;
  avg_monthly_spend: number;
  feature_usage: Record<string, number>;
  satisfaction_score: number;
}

export interface UpgradePropensity {
  likelihood_to_upgrade: number;
  recommended_upgrade_path: string;
  upgrade_triggers: string[];
  price_sensitivity: 'low' | 'medium' | 'high';
}

export interface AdExposureSettings {
  max_ads_per_session: number;
  ad_free_zones: string[];
  premium_ad_eligibility: boolean;
  native_ad_format_allowed: boolean;
}

// Feature 9: Interest Graph for Cross-Category Targeting
export interface InterestGraph {
  user_id: string;
  primary_interests: InterestNode[];
  secondary_interests: InterestNode[];
  interest_connections: InterestConnection[];
  cross_category_opportunities: CrossCategoryOpportunity[];
}

export interface InterestNode {
  interest_id: string;
  category: string;
  name: string;
  affinity_score: number;
  source: 'stated' | 'inferred' | 'behavioral';
  confidence: number;
}

export interface InterestConnection {
  from_interest: string;
  to_interest: string;
  connection_strength: number;
  relationship_type: 'complementary' | 'substitutable' | 'hierarchical';
}

export interface CrossCategoryOpportunity {
  source_category: string;
  target_category: string;
  user_overlap: number;
  ad_opportunity_score: number;
  recommended_ad_types: string[];
}

// Feature 10: Lookalike Audience Builder
export interface LookalikeAudience {
  id: string;
  name: string;
  seed_audience: SeedAudience;
  expansion_parameters: ExpansionParameters;
  resulting_audience: AudienceStats;
  performance_metrics: LookalikePerformance;
}

export interface SeedAudience {
  source_type: 'converters' | 'high_engagers' | 'premium_users' | 'custom';
  user_ids?: string[];
  criteria?: Record<string, any>;
  size: number;
}

export interface ExpansionParameters {
  similarity_threshold: number; // 0-1
  max_expansion_ratio: number;
  required_dimensions: string[];
  excluded_dimensions: string[];
  geographic_restriction?: string[];
}

export interface AudienceStats {
  total_size: number;
  gender_distribution: Record<string, number>;
  age_distribution: Record<string, number>;
  location_distribution: Record<string, number>;
  avg_similarity_score: number;
}

export interface LookalikePerformance {
  predicted_engagement_lift: number;
  predicted_conversion_lift: number;
  actual_engagement_rate?: number;
  actual_conversion_rate?: number;
}
