/**
 * AI-Enhanced Ad Creative Types
 * Implements 10 AI-powered creative features for dating ads
 */

// Feature 1: Dynamic Dating Scene Personalization
export interface DynamicDatingScene {
  id: string;
  base_creative: BaseCreative;
  personalization_rules: PersonalizationRule[];
  scene_variants: SceneVariant[];
  performance_by_variant: Record<string, CreativePerformance>;
}

export interface BaseCreative {
  creative_id: string;
  format: 'image' | 'video' | 'carousel' | 'interactive';
  base_assets: CreativeAsset[];
  default_copy: CopyVariant;
}

export interface CreativeAsset {
  asset_id: string;
  type: 'image' | 'video' | 'icon' | 'background';
  url: string;
  dimensions: { width: number; height: number };
  is_modular: boolean;
}

export interface PersonalizationRule {
  condition: TargetingCondition;
  modifications: CreativeModification[];
  priority: number;
}

export type TargetingConditionValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | { min: number; max: number };

export interface TargetingCondition {
  field: string;
  operator: 'equals' | 'in' | 'range' | 'contains';
  value: TargetingConditionValue;
}

export type CreativeModificationValue =
  | string
  | number
  | CreativeAsset
  | { url: string; type: string }
  | { keyframes: string[]; duration: number };

export interface CreativeModification {
  element: string;
  modification_type: 'replace' | 'overlay' | 'animate' | 'hide';
  new_value: CreativeModificationValue;
}

export interface SceneVariant {
  variant_id: string;
  scene_type: 'coffee_date' | 'dinner' | 'outdoor_adventure' | 'concert' | 'travel' | 'home_cooking' | 'fitness' | 'cultural';
  target_interests: string[];
  assets: CreativeAsset[];
  copy: CopyVariant;
}

export interface CopyVariant {
  headline: string;
  subheadline?: string;
  body?: string;
  cta: string;
  dynamic_tokens: DynamicToken[];
}

export interface DynamicToken {
  token: string;
  source: 'user_profile' | 'location' | 'time' | 'context';
  fallback: string;
}

export interface CreativePerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  engagement_time_seconds: number;
}

// Feature 2: Emotion-Based Creative Selection
export interface EmotionBasedCreative {
  creative_pool: EmotionalCreative[];
  selection_algorithm: SelectionAlgorithm;
  emotion_detection: EmotionDetectionConfig;
  performance_tracking: EmotionPerformanceTracking;
}

export interface EmotionalCreative {
  creative_id: string;
  target_emotion: EmotionType;
  emotional_triggers: EmotionalTrigger[];
  creative_elements: EmotionalElement[];
  optimal_contexts: string[];
}

export type EmotionType =
  | 'excitement'
  | 'curiosity'
  | 'hope'
  | 'nostalgia'
  | 'confidence'
  | 'playfulness'
  | 'romance'
  | 'security';

export interface EmotionalTrigger {
  trigger_type: 'visual' | 'copy' | 'sound' | 'interaction';
  description: string;
  effectiveness_score: number;
}

export interface ColorImplementation {
  hex: string;
  rgb: { r: number; g: number; b: number };
  name: string;
}

export interface ImageryImplementation {
  url: string;
  alt: string;
  style: string;
}

export interface TypographyImplementation {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: number;
}

export interface AnimationImplementation {
  type: 'lottie' | 'css' | 'video';
  url: string;
  duration: number;
  loop: boolean;
}

export interface MusicImplementation {
  url: string;
  title: string;
  duration: number;
  volume: number;
}

export type EmotionalElementImplementation =
  | ColorImplementation
  | ImageryImplementation
  | TypographyImplementation
  | AnimationImplementation
  | MusicImplementation;

export interface EmotionalElement {
  element_type: 'color' | 'imagery' | 'typography' | 'animation' | 'music';
  emotional_impact: Record<EmotionType, number>;
  implementation: EmotionalElementImplementation;
}

export interface AlgorithmParameters {
  exploration_rate?: number;
  temperature?: number;
  decay_factor?: number;
  min_samples?: number;
  confidence_threshold?: number;
  window_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface SelectionAlgorithm {
  type: 'contextual' | 'predictive' | 'bandit' | 'hybrid';
  parameters: AlgorithmParameters;
  learning_rate: number;
}

export interface EmotionDetectionConfig {
  sources: ('profile' | 'behavior' | 'time' | 'weather' | 'events')[];
  update_frequency_minutes: number;
  confidence_threshold: number;
}

export interface EmotionPerformanceTracking {
  emotion_engagement_rates: Record<EmotionType, number>;
  emotion_conversion_rates: Record<EmotionType, number>;
  optimal_emotion_by_segment: Record<string, EmotionType>;
}

// Feature 3: AI Dating Photo Enhancement for Ads
export interface AIPhotoEnhancement {
  original_photo: PhotoAsset;
  enhancements: PhotoEnhancement[];
  enhanced_versions: EnhancedPhoto[];
  a_b_test_results?: PhotoTestResult;
}

export interface PhotoAsset {
  photo_id: string;
  url: string;
  dimensions: { width: number; height: number };
  quality_score: number;
  faces_detected: number;
  dominant_colors: string[];
}

export interface PhotoEnhancementParameters {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  blur_intensity?: number;
  crop_ratio?: string;
  filter_name?: string;
  filter_intensity?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PhotoEnhancement {
  enhancement_type: 'lighting' | 'color_correction' | 'background_blur' | 'crop_optimize' | 'filter_apply';
  parameters: PhotoEnhancementParameters;
  ai_model_version: string;
}

export interface EnhancedPhoto {
  version_id: string;
  url: string;
  enhancements_applied: string[];
  quality_improvement: number;
  estimated_engagement_lift: number;
}

export interface PhotoTestResult {
  winning_version: string;
  performance_by_version: Record<string, {
    impressions: number;
    engagement_rate: number;
    confidence: number;
  }>;
}

// Feature 4: Personalized Success Story Generation
export interface SuccessStoryGenerator {
  story_templates: StoryTemplate[];
  personalization_engine: PersonalizationEngine;
  generated_stories: GeneratedStory[];
  performance_metrics: StoryPerformance;
}

export interface StoryTemplate {
  template_id: string;
  story_arc: StoryArc;
  variable_slots: VariableSlot[];
  visual_requirements: VisualRequirement[];
  target_segments: string[];
}

export interface StoryArc {
  structure: ('intro' | 'challenge' | 'discovery' | 'connection' | 'outcome')[];
  emotional_journey: EmotionType[];
  duration_seconds: number;
}

export interface VariableSlot {
  slot_id: string;
  slot_type: 'name' | 'age' | 'location' | 'interest' | 'timeline' | 'outcome';
  constraints: SlotConstraint[];
}

export type SlotConstraintValue =
  | number
  | { min: number; max: number }
  | string
  | string[]
  | RegExp;

export interface SlotConstraint {
  constraint_type: 'length' | 'format' | 'content';
  value: SlotConstraintValue;
}

export interface VisualSpecification {
  type: 'image' | 'video' | 'illustration' | 'animation';
  dimensions?: { width: number; height: number };
  duration?: number;
  format?: string;
  style?: string;
  url?: string;
  [key: string]: string | number | { width: number; height: number } | undefined;
}

export interface VisualRequirement {
  element: string;
  specification: VisualSpecification;
  alternatives: VisualSpecification[];
}

export interface PersonalizationEngine {
  matching_algorithm: string;
  similarity_dimensions: string[];
  demographic_matching: boolean;
  interest_matching: boolean;
}

export interface GeneratedStory {
  story_id: string;
  template_used: string;
  personalized_for: string; // user segment
  content: StoryContent;
  performance: StoryPerformance;
}

export interface StoryContent {
  headline: string;
  narrative: string;
  visuals: CreativeAsset[];
  cta: string;
}

export interface StoryPerformance {
  view_completion_rate: number;
  engagement_rate: number;
  conversion_rate: number;
  emotional_response_score: number;
}

// Feature 5: Real-Time Copy Optimization
export interface RealTimeCopyOptimizer {
  base_copy: CopyVariant[];
  optimization_config: CopyOptimizationConfig;
  live_variants: LiveCopyVariant[];
  performance_dashboard: CopyPerformanceDashboard;
}

export interface CopyOptimizationConfig {
  optimization_goal: 'ctr' | 'conversion' | 'engagement' | 'brand_recall';
  test_duration_hours: number;
  minimum_impressions: number;
  confidence_threshold: number;
  auto_winner_selection: boolean;
}

export interface LiveCopyVariant {
  variant_id: string;
  headline: string;
  subheadline: string;
  cta: string;
  traffic_allocation: number;
  current_performance: CopyMetrics;
  statistical_significance: number;
}

export interface CopyMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  avg_time_to_click_seconds: number;
}

export interface CopyPerformanceDashboard {
  leading_variant: string;
  improvement_vs_control: number;
  estimated_completion_time: Date;
  recommendations: CopyRecommendation[];
}

export interface CopyRecommendation {
  recommendation_type: 'pause' | 'boost' | 'modify' | 'conclude';
  variant_id: string;
  reason: string;
  confidence: number;
}

// Feature 6: Interest-Matched Visual Theming
export interface InterestVisualTheme {
  theme_id: string;
  interest_category: string;
  visual_elements: ThemeVisualElements;
  color_palette: ColorPalette;
  typography: TypographyTheme;
  imagery_style: ImageryStyle;
  application_rules: ThemeApplicationRule[];
}

export interface ThemeVisualElements {
  icons: ThemedIcon[];
  patterns: Pattern[];
  illustrations: Illustration[];
  animations: Animation[];
}

export interface ThemedIcon {
  icon_id: string;
  semantic_meaning: string;
  svg_url: string;
  color_variants: Record<string, string>;
}

export interface Pattern {
  pattern_id: string;
  svg_url: string;
  tileability: boolean;
  opacity_range: { min: number; max: number };
}

export interface Illustration {
  illustration_id: string;
  style: 'flat' | 'isometric' | 'hand_drawn' | 'realistic';
  url: string;
  color_customizable: boolean;
}

export interface Animation {
  animation_id: string;
  type: 'lottie' | 'css' | 'video';
  duration_seconds: number;
  loopable: boolean;
  url: string;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text_primary: string;
  text_secondary: string;
  semantic_colors: Record<string, string>;
}

export interface TypographyTheme {
  heading_font: string;
  body_font: string;
  sizes: Record<string, number>;
  weights: Record<string, number>;
  line_heights: Record<string, number>;
}

export interface ImageryStyle {
  photography_style: 'candid' | 'posed' | 'lifestyle' | 'abstract';
  filter_preset?: string;
  composition_rules: string[];
}

export interface ThemeApplicationRule {
  placement: string;
  elements_to_apply: string[];
  override_conditions: TargetingCondition[];
}

// Feature 7: Date Idea Creative Generator
export interface DateIdeaCreative {
  date_idea: DateIdea;
  creative_variants: DateCreativeVariant[];
  geo_personalization: GeoPersonalization;
  seasonal_adjustments: SeasonalAdjustment[];
}

export interface DateIdea {
  idea_id: string;
  category: 'romantic' | 'adventurous' | 'cultural' | 'foodie' | 'active' | 'relaxing' | 'unique';
  title: string;
  description: string;
  typical_cost_range: { min: number; max: number };
  duration_hours: number;
  best_for: string[];
  weather_dependent: boolean;
}

export interface TargetDemographics {
  age_range?: { min: number; max: number };
  gender?: string[];
  relationship_status?: string[];
  interests?: string[];
  location_type?: string[];
  income_level?: string;
  [key: string]: string | number | string[] | { min: number; max: number } | undefined;
}

export interface DateCreativeVariant {
  variant_id: string;
  visual_style: 'photo' | 'illustration' | 'video' | 'mixed';
  assets: CreativeAsset[];
  copy: CopyVariant;
  target_demographics: TargetDemographics;
}

export interface GeoPersonalization {
  local_venues: LocalVenue[];
  local_events: LocalEvent[];
  local_pricing: LocalPricing;
}

export interface LocalVenue {
  venue_id: string;
  name: string;
  category: string;
  rating: number;
  price_level: number;
  coordinates: { lat: number; lng: number };
}

export interface LocalEvent {
  event_id: string;
  name: string;
  date: Date;
  venue: string;
  category: string;
}

export interface LocalPricing {
  avg_dinner_cost: number;
  avg_activity_cost: number;
  currency: string;
}

export interface SeasonalAdjustment {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  adjustments: CreativeModification[];
  special_occasions: SpecialOccasion[];
}

export interface SpecialOccasion {
  occasion: string;
  date_range: { start: Date; end: Date };
  theme_overlay: ThemeVisualElements;
  special_copy: CopyVariant;
}

// Feature 8: User Testimonial Style Matching
export interface TestimonialStyleMatch {
  testimonial_pool: Testimonial[];
  style_matching_rules: StyleMatchRule[];
  personalized_selections: PersonalizedTestimonial[];
}

export interface Testimonial {
  testimonial_id: string;
  author: TestimonialAuthor;
  content: TestimonialContent;
  authenticity_score: number;
  performance_history: TestimonialPerformance;
}

export interface TestimonialAuthor {
  anonymized_id: string;
  age_range: string;
  location_region: string;
  relationship_outcome: string;
  profile_archetype: string;
  interests: string[];
}

export interface TestimonialContent {
  quote: string;
  story_length: 'short' | 'medium' | 'long';
  emotional_tone: EmotionType[];
  topics_mentioned: string[];
  photo_available: boolean;
}

export interface TestimonialPerformance {
  impressions: number;
  engagement_rate: number;
  conversion_rate: number;
  credibility_score: number;
}

export interface StyleMatchRule {
  rule_id: string;
  viewer_attribute: string;
  matching_strategy: 'similar' | 'aspirational' | 'diverse';
  weight: number;
}

export interface PersonalizedTestimonial {
  viewer_segment: string;
  selected_testimonial_id: string;
  match_score: number;
  display_format: 'quote' | 'video' | 'carousel' | 'story';
}

// Feature 9: Animated Matching Visualization
export interface MatchingVisualization {
  visualization_id: string;
  visualization_type: 'swipe' | 'hearts' | 'connection' | 'compatibility_meter' | 'spark';
  animation_config: AnimationConfig;
  interactive_elements: InteractiveElement[];
  personalization: VisualizationPersonalization;
}

export interface AnimationConfig {
  duration_seconds: number;
  easing: string;
  loop: boolean;
  trigger: 'auto' | 'scroll' | 'click' | 'hover';
  fallback_static: CreativeAsset;
}

export interface InteractiveElement {
  element_id: string;
  interaction_type: 'tap' | 'swipe' | 'drag' | 'hold';
  response_animation: string;
  outcome: 'reveal' | 'navigate' | 'share' | 'save';
}

export interface VisualizationPersonalization {
  user_avatar_inclusion: boolean;
  match_count_display: boolean;
  compatibility_score_display: boolean;
  custom_colors: boolean;
}

// Feature 10: A/B Testing Creative Framework
export interface CreativeABFramework {
  experiment_id: string;
  experiment_name: string;
  hypothesis: string;
  variants: ExperimentVariant[];
  traffic_allocation: TrafficAllocation;
  success_metrics: SuccessMetric[];
  experiment_status: ExperimentStatus;
  results: ExperimentResults;
}

export interface ExperimentVariant {
  variant_id: string;
  variant_name: string;
  creative: BaseCreative;
  traffic_percentage: number;
  is_control: boolean;
}

export interface TrafficAllocation {
  allocation_type: 'even' | 'weighted' | 'bandit';
  segment_restrictions?: string[];
  geo_restrictions?: string[];
  device_restrictions?: string[];
}

export interface SuccessMetric {
  metric_name: string;
  metric_type: 'primary' | 'secondary' | 'guardrail';
  target_improvement: number;
  minimum_detectable_effect: number;
}

export interface ExperimentStatus {
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  start_date?: Date;
  end_date?: Date;
  current_sample_size: number;
  required_sample_size: number;
}

export interface ExperimentResults {
  winning_variant?: string;
  statistical_significance: number;
  confidence_interval: { lower: number; upper: number };
  variant_performances: Record<string, CreativePerformance>;
  recommendations: string[];
}
