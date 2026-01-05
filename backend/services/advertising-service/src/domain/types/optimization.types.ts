/**
 * Optimization & Performance Types
 * Implements 10 optimization features for dating ad campaigns
 */

// Feature 1: Match Prediction for Ad Timing
export interface MatchPredictionTiming {
  user_id: string;
  match_probability_timeline: MatchProbabilityPoint[];
  optimal_ad_windows: OptimalAdWindow[];
  prediction_confidence: number;
  model_version: string;
}

export interface MatchProbabilityPoint {
  timestamp: Date;
  probability: number;
  contributing_factors: PredictionFactor[];
}

export interface PredictionFactor {
  factor: string;
  impact: number;
  direction: 'positive' | 'negative';
}

export interface OptimalAdWindow {
  window_start: Date;
  window_end: Date;
  predicted_engagement: number;
  recommended_ad_types: string[];
  bid_multiplier: number;
}

// Feature 2: Engagement-Based Bid Optimization
export interface EngagementBidOptimizer {
  campaign_id: string;
  optimization_goal: 'clicks' | 'matches' | 'messages' | 'subscriptions';
  bidding_strategy: BiddingStrategy;
  real_time_adjustments: BidAdjustment[];
  performance_tracking: BidPerformance;
}

export interface BiddingStrategy {
  strategy_type: 'manual' | 'target_cpa' | 'target_roas' | 'maximize_conversions';
  base_bid: number;
  bid_caps: { min: number; max: number };
  learning_budget: number;
}

export interface BidAdjustment {
  adjustment_id: string;
  dimension: 'time' | 'device' | 'location' | 'audience' | 'placement';
  adjustment_value: number;
  reason: string;
  effective_from: Date;
  effective_until?: Date;
}

export interface BidPerformance {
  avg_cpc: number;
  avg_cpm: number;
  avg_cpa: number;
  spend_efficiency: number;
  improvement_vs_baseline: number;
  daily_metrics: DailyBidMetrics[];
}

export interface DailyBidMetrics {
  date: Date;
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  avg_bid: number;
  win_rate: number;
}

// Feature 3: Cross-Platform Attribution for Dating Conversions
export interface CrossPlatformAttribution {
  conversion_id: string;
  user_journey: TouchPoint[];
  attribution_model: AttributionModel;
  channel_credits: ChannelCredit[];
  conversion_value: number;
}

export interface TouchPoint {
  touchpoint_id: string;
  channel: 'in_app' | 'social_media' | 'search' | 'display' | 'email' | 'push' | 'referral';
  platform: string;
  timestamp: Date;
  interaction_type: 'impression' | 'click' | 'engagement' | 'install' | 'registration';
  creative_id?: string;
  campaign_id?: string;
}

export interface AttributionModel {
  model_type:
    | 'last_click'
    | 'first_click'
    | 'linear'
    | 'time_decay'
    | 'position_based'
    | 'data_driven';
  lookback_window_days: number;
  cross_device_enabled: boolean;
  view_through_enabled: boolean;
}

export interface ChannelCredit {
  channel: string;
  credit_percentage: number;
  credit_value: number;
  touchpoint_count: number;
  avg_time_to_conversion_hours: number;
}

// Feature 4: Real-Time Budget Pacing
export interface RealTimeBudgetPacing {
  campaign_id: string;
  budget_config: BudgetConfig;
  pacing_status: PacingStatus;
  forecast: BudgetForecast;
  alerts: PacingAlert[];
}

export interface BudgetConfig {
  total_budget: number;
  daily_budget: number;
  budget_type: 'daily' | 'lifetime' | 'monthly';
  pacing_type: 'standard' | 'accelerated' | 'day_parting';
  carryover_enabled: boolean;
}

export interface PacingStatus {
  current_spend: number;
  expected_spend: number;
  pacing_percentage: number;
  status: 'under_pacing' | 'on_track' | 'over_pacing';
  adjustment_recommendation: string;
}

export interface BudgetForecast {
  projected_daily_spend: number;
  projected_end_of_period_spend: number;
  projected_impressions: number;
  projected_conversions: number;
  confidence_interval: { lower: number; upper: number };
}

export interface PacingAlert {
  alert_type: 'budget_exhaustion' | 'under_delivery' | 'over_delivery' | 'roi_decline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommended_action: string;
  triggered_at: Date;
}

// Feature 5: Seasonal Dating Trend Optimization
export interface SeasonalTrendOptimizer {
  trend_analysis: SeasonalTrend[];
  optimization_calendar: OptimizationCalendar;
  automated_adjustments: AutomatedAdjustment[];
  performance_vs_trend: TrendPerformance;
}

export interface SeasonalTrend {
  trend_id: string;
  trend_name: string;
  peak_period: { start: Date; end: Date };
  expected_lift: number;
  affected_segments: string[];
  historical_data: HistoricalTrendData[];
}

export interface HistoricalTrendData {
  year: number;
  period: string;
  registrations_lift: number;
  engagement_lift: number;
  revenue_lift: number;
}

export interface OptimizationCalendar {
  events: CalendarEvent[];
  pre_scheduled_campaigns: ScheduledCampaign[];
  budget_allocations: BudgetAllocation[];
}

export interface CalendarEvent {
  event_id: string;
  event_name: string;
  event_type: 'holiday' | 'cultural' | 'sporting' | 'entertainment' | 'dating_specific';
  date: Date;
  duration_days: number;
  expected_impact: number;
  recommended_creative_themes: string[];
}

export interface ScheduledCampaign {
  campaign_id: string;
  associated_events: string[];
  start_date: Date;
  end_date: Date;
  budget: number;
  creative_themes: string[];
}

export interface BudgetAllocation {
  period: string;
  allocation_percentage: number;
  rationale: string;
}

export interface AutomatedAdjustment {
  trigger: TrendTrigger;
  action: AdjustmentAction;
  magnitude: number;
  active: boolean;
}

export interface TrendTrigger {
  metric: string;
  condition: 'above' | 'below' | 'change';
  threshold: number;
  time_window_hours: number;
}

export interface AdjustmentAction {
  action_type: 'bid_adjustment' | 'budget_shift' | 'creative_swap' | 'targeting_expansion';
  parameters: Record<string, any>;
}

export interface TrendPerformance {
  current_period: string;
  performance_vs_forecast: number;
  yoy_comparison: number;
  optimization_impact: number;
}

// Feature 6: Device-Specific Ad Optimization
export interface DeviceOptimization {
  device_profiles: DeviceProfile[];
  optimization_rules: DeviceOptimizationRule[];
  performance_by_device: Record<string, DevicePerformance>;
}

export interface DeviceProfile {
  device_type: 'smartphone' | 'tablet' | 'desktop' | 'smart_tv';
  os: 'ios' | 'android' | 'windows' | 'macos' | 'other';
  screen_size_category: 'small' | 'medium' | 'large' | 'xlarge';
  connection_type: 'wifi' | 'cellular' | 'unknown';
  app_version?: string;
}

export interface DeviceOptimizationRule {
  rule_id: string;
  target_device: DeviceProfile;
  creative_adaptations: CreativeAdaptation[];
  bid_adjustment: number;
  enabled: boolean;
}

export interface CreativeAdaptation {
  adaptation_type: 'resize' | 'reformat' | 'simplify' | 'enhance';
  from_format: string;
  to_format: string;
  quality_preservation: number;
}

export interface DevicePerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  avg_session_duration: number;
  unique_users: number;
}

// Feature 7: Frequency Capping Intelligence
export interface FrequencyCapping {
  capping_config: CappingConfig;
  user_exposure_tracking: UserExposure[];
  fatigue_detection: FatigueSignal[];
  optimization_recommendations: FrequencyRecommendation[];
}

export interface CappingConfig {
  global_cap: FrequencyCap;
  campaign_caps: Record<string, FrequencyCap>;
  creative_caps: Record<string, FrequencyCap>;
  cross_campaign_cap?: FrequencyCap;
}

export interface FrequencyCap {
  max_impressions: number;
  time_window_hours: number;
  cap_type: 'hard' | 'soft';
  overflow_action: 'block' | 'reduce_bid' | 'alternate_creative';
}

export interface UserExposure {
  user_id: string;
  campaign_exposures: Record<string, CampaignExposure>;
  total_exposures_24h: number;
  total_exposures_7d: number;
  last_exposure: Date;
}

export interface CampaignExposure {
  campaign_id: string;
  impressions: number;
  clicks: number;
  last_seen: Date;
  creative_ids_seen: string[];
}

export interface FatigueSignal {
  signal_type: 'declining_ctr' | 'declining_cvr' | 'increased_skip_rate' | 'negative_feedback';
  severity: number;
  detected_at: Date;
  affected_users: number;
}

export interface FrequencyRecommendation {
  recommendation: string;
  impact_estimate: number;
  implementation_effort: 'low' | 'medium' | 'high';
  priority: number;
}

// Feature 8: Conversion Path Analysis
export interface ConversionPathAnalysis {
  analysis_id: string;
  conversion_type: string;
  path_data: ConversionPath[];
  path_insights: PathInsight[];
  funnel_metrics: FunnelMetrics;
}

export interface ConversionPath {
  path_id: string;
  steps: PathStep[];
  total_users: number;
  conversion_rate: number;
  avg_time_to_conversion_hours: number;
}

export interface PathStep {
  step_number: number;
  action: string;
  channel: string;
  avg_time_at_step_minutes: number;
  drop_off_rate: number;
}

export interface PathInsight {
  insight_type: 'optimal_path' | 'bottleneck' | 'opportunity' | 'anomaly';
  description: string;
  affected_paths: string[];
  recommended_action: string;
  estimated_impact: number;
}

export interface FunnelMetrics {
  top_of_funnel: FunnelStage;
  middle_of_funnel: FunnelStage;
  bottom_of_funnel: FunnelStage;
  overall_conversion_rate: number;
}

export interface FunnelStage {
  stage_name: string;
  users: number;
  conversion_to_next: number;
  avg_time_in_stage_hours: number;
}

// Feature 9: Predictive LTV Optimization
export interface PredictiveLTVOptimization {
  ltv_model: LTVModel;
  user_predictions: UserLTVPrediction[];
  segment_ltv: SegmentLTV[];
  optimization_actions: LTVOptimizationAction[];
}

export interface LTVModel {
  model_id: string;
  model_type: 'regression' | 'survival' | 'deep_learning';
  features: LTVFeature[];
  accuracy_metrics: ModelAccuracy;
  last_trained: Date;
}

export interface LTVFeature {
  feature_name: string;
  importance: number;
  feature_type: 'demographic' | 'behavioral' | 'engagement' | 'financial';
}

export interface ModelAccuracy {
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Squared Error
  r_squared: number;
  validation_period: string;
}

export interface UserLTVPrediction {
  user_id: string;
  predicted_ltv: number;
  confidence_interval: { lower: number; upper: number };
  prediction_horizon_months: number;
  risk_of_churn: number;
  upsell_potential: number;
}

export interface SegmentLTV {
  segment_id: string;
  segment_name: string;
  avg_ltv: number;
  ltv_distribution: { min: number; median: number; max: number };
  acquisition_cost: number;
  ltv_to_cac_ratio: number;
}

export interface LTVOptimizationAction {
  action_type:
    | 'increase_acquisition_spend'
    | 'reduce_acquisition_spend'
    | 'retention_focus'
    | 'upsell_campaign';
  target_segment: string;
  expected_ltv_impact: number;
  recommended_budget: number;
  priority: number;
}

// Feature 10: Multi-Touch Attribution Modeling
export interface MultiTouchAttribution {
  model_config: MTAModelConfig;
  channel_effectiveness: ChannelEffectiveness[];
  journey_analysis: JourneyAnalysis;
  budget_recommendations: MTABudgetRecommendation[];
}

export interface MTAModelConfig {
  model_type: 'shapley' | 'markov' | 'ml_based' | 'custom_rules';
  attribution_window_days: number;
  include_organic: boolean;
  cross_device_tracking: boolean;
  incrementality_testing: boolean;
}

export interface ChannelEffectiveness {
  channel: string;
  attributed_conversions: number;
  attributed_value: number;
  assist_rate: number;
  avg_position_in_path: number;
  efficiency_score: number;
}

export interface JourneyAnalysis {
  avg_touchpoints_to_conversion: number;
  avg_days_to_conversion: number;
  common_paths: CommonPath[];
  channel_synergies: ChannelSynergy[];
}

export interface CommonPath {
  path: string[];
  frequency: number;
  conversion_rate: number;
  avg_ltv: number;
}

export interface ChannelSynergy {
  channel_pair: [string, string];
  synergy_effect: number;
  optimal_sequence: string;
}

export interface MTABudgetRecommendation {
  channel: string;
  current_allocation: number;
  recommended_allocation: number;
  expected_impact: number;
  confidence: number;
  rationale: string;
}
