/**
 * Dating-Specific Ad Innovations Types
 * Implements 10 innovative dating-specific advertising features
 */

// Feature 1: "Ready to Mingle" Status Ads
export interface ReadyToMingleAds {
  status_detection: MingleStatusDetection;
  real_time_targeting: RealTimeTargeting;
  ad_inventory: MingleAdInventory;
  performance_metrics: MinglePerformance;
}

export interface MingleStatusDetection {
  detection_signals: MingleSignal[];
  confidence_threshold: number;
  refresh_interval_minutes: number;
  user_consent_required: boolean;
}

export interface MingleSignal {
  signal_type: 'app_open' | 'active_swiping' | 'profile_browsing' | 'message_responding' | 'location_social_venue';
  weight: number;
  decay_rate_per_minute: number;
  minimum_duration_seconds: number;
}

export interface RealTimeTargeting {
  active_minglers: number;
  geographic_distribution: Record<string, number>;
  peak_times: TimeSlot[];
  audience_refresh_frequency_seconds: number;
}

export interface TimeSlot {
  day_of_week: number;
  hour_start: number;
  hour_end: number;
  avg_active_users: number;
  engagement_multiplier: number;
}

export interface MingleAdInventory {
  ad_formats: MingleAdFormat[];
  placement_options: PlacementOption[];
  pricing: MinglePricing;
}

export interface MingleAdFormat {
  format_id: string;
  format_name: string;
  description: string;
  specs: AdSpecs;
  best_for: string[];
}

export interface AdSpecs {
  dimensions: { width: number; height: number };
  max_file_size_kb: number;
  supported_formats: string[];
  animation_allowed: boolean;
  max_duration_seconds?: number;
}

export interface PlacementOption {
  placement_id: string;
  placement_name: string;
  location_in_app: string;
  visibility_score: number;
  avg_viewability_rate: number;
}

export interface MinglePricing {
  base_cpm: number;
  peak_time_multiplier: number;
  high_intent_multiplier: number;
  auction_type: 'first_price' | 'second_price';
}

export interface MinglePerformance {
  total_impressions: number;
  unique_users_reached: number;
  engagement_rate: number;
  conversion_rate: number;
  avg_time_to_action_seconds: number;
}

// Feature 2: First Date Sponsor Integration
export interface FirstDateSponsor {
  sponsorship_config: SponsorshipConfig;
  venue_partnerships: VenuePartnership[];
  date_packages: DatePackage[];
  redemption_tracking: RedemptionTracking;
}

export interface SponsorshipConfig {
  sponsor_tiers: SponsorTier[];
  exclusivity_options: ExclusivityOption[];
  co_branding_guidelines: BrandingGuidelines;
}

export interface SponsorTier {
  tier_id: string;
  tier_name: 'platinum' | 'gold' | 'silver' | 'bronze';
  monthly_fee: number;
  impressions_guaranteed: number;
  exclusive_categories: string[];
  featured_placement: boolean;
}

export interface ExclusivityOption {
  category: string;
  exclusivity_duration_days: number;
  premium_percentage: number;
}

export interface BrandingGuidelines {
  logo_placement_rules: string[];
  color_restrictions: string[];
  messaging_do_and_donts: { dos: string[]; donts: string[] };
}

export interface VenuePartnership {
  venue_id: string;
  venue_name: string;
  venue_type: 'restaurant' | 'bar' | 'activity' | 'entertainment' | 'outdoor';
  location: {
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  partnership_terms: PartnershipTerms;
  performance: VenuePerformance;
}

export interface PartnershipTerms {
  discount_percentage: number;
  revenue_share: number;
  minimum_bookings_per_month: number;
  featured_in_app: boolean;
  exclusive_offers: string[];
}

export interface VenuePerformance {
  total_referrals: number;
  successful_dates: number;
  avg_spend_per_visit: number;
  customer_rating: number;
  repeat_visit_rate: number;
}

export interface DatePackage {
  package_id: string;
  package_name: string;
  description: string;
  included_items: PackageItem[];
  total_value: number;
  discounted_price: number;
  validity_days: number;
  restrictions: string[];
}

export interface PackageItem {
  item_type: 'venue_credit' | 'activity_ticket' | 'product' | 'service';
  description: string;
  value: number;
  venue_id?: string;
}

export interface RedemptionTracking {
  total_packages_sold: number;
  redemption_rate: number;
  avg_time_to_redemption_days: number;
  most_popular_packages: string[];
  geographic_distribution: Record<string, number>;
}

// Feature 3: Compatibility-Triggered Promotions
export interface CompatibilityPromotion {
  trigger_config: CompatibilityTrigger;
  promotion_types: PromotionType[];
  personalization: PromotionPersonalization;
  performance: PromotionPerformance;
}

export interface CompatibilityTrigger {
  minimum_compatibility_score: number;
  trigger_events: TriggerEvent[];
  cooldown_hours: number;
  max_promotions_per_day: number;
}

export interface TriggerEvent {
  event_type: 'new_match' | 'mutual_super_like' | 'first_message' | 'conversation_milestone' | 'date_scheduled';
  priority: number;
  time_sensitivity_minutes: number;
}

export interface PromotionType {
  promotion_id: string;
  promotion_name: string;
  category: 'restaurant' | 'experience' | 'gift' | 'subscription' | 'travel';
  offer_type: 'discount' | 'bundle' | 'upgrade' | 'freebie';
  value: number;
  value_type: 'percentage' | 'fixed' | 'free_item';
  sponsor?: string;
}

export interface PromotionPersonalization {
  interest_matching: boolean;
  location_based: boolean;
  price_sensitivity_aware: boolean;
  previous_redemption_history: boolean;
}

export interface PromotionPerformance {
  total_shown: number;
  click_through_rate: number;
  redemption_rate: number;
  revenue_generated: number;
  customer_satisfaction_score: number;
}

// Feature 4: Profile Boost Marketplace Ads
export interface BoostMarketplace {
  boost_products: BoostProduct[];
  marketplace_dynamics: MarketplaceDynamics;
  ad_placements: BoostAdPlacement[];
  roi_tracking: BoostROITracking;
}

export interface BoostProduct {
  product_id: string;
  product_name: string;
  boost_type: 'visibility' | 'priority' | 'super_like' | 'profile_highlight';
  duration_hours: number;
  base_price: number;
  effectiveness_multiplier: number;
  best_times_to_use: string[];
}

export interface MarketplaceDynamics {
  demand_by_hour: Record<number, number>;
  pricing_algorithm: PricingAlgorithm;
  inventory_management: InventoryManagement;
  competitive_analysis: CompetitiveAnalysis;
}

export interface PricingAlgorithm {
  algorithm_type: 'dynamic' | 'tiered' | 'auction' | 'fixed';
  price_range: { min: number; max: number };
  demand_sensitivity: number;
  time_decay_factor: number;
}

export interface InventoryManagement {
  total_boost_slots_per_hour: number;
  utilization_rate: number;
  premium_slot_percentage: number;
  overflow_handling: 'queue' | 'upgrade' | 'refund';
}

export interface CompetitiveAnalysis {
  similar_products: string[];
  price_positioning: 'premium' | 'competitive' | 'value';
  unique_value_propositions: string[];
}

export interface BoostAdPlacement {
  placement_id: string;
  trigger_point: 'pre_swipe' | 'low_matches' | 'post_purchase' | 'special_event';
  ad_format: string;
  conversion_rate: number;
  recommended_creative_themes: string[];
}

export interface BoostROITracking {
  avg_matches_increase: number;
  avg_likes_increase: number;
  avg_profile_views_increase: number;
  user_satisfaction_score: number;
  repeat_purchase_rate: number;
}

// Feature 5: Dating Event Sponsorship Platform
export interface EventSponsorshipPlatform {
  event_types: DatingEventType[];
  sponsorship_packages: EventSponsorshipPackage[];
  event_calendar: EventCalendarIntegration;
  brand_activation: BrandActivation[];
}

export interface DatingEventType {
  type_id: string;
  type_name: string;
  format: 'speed_dating' | 'mixer' | 'activity_based' | 'virtual' | 'themed';
  typical_attendance: { min: number; max: number };
  demographics: EventDemographics;
  sponsorship_opportunities: string[];
}

export interface EventDemographics {
  age_range: { min: number; max: number };
  gender_split: { male: number; female: number; other: number };
  relationship_goals: string[];
  income_level: string;
}

export interface EventSponsorshipPackage {
  package_id: string;
  package_name: string;
  tier: 'title' | 'presenting' | 'supporting' | 'vendor';
  price: number;
  inclusions: SponsorshipInclusion[];
  branding_rights: BrandingRight[];
  performance_guarantees: PerformanceGuarantee[];
}

export interface SponsorshipInclusion {
  inclusion_type: string;
  description: string;
  quantity: number;
  value: number;
}

export interface BrandingRight {
  right_type: 'logo_placement' | 'naming_rights' | 'product_sampling' | 'speaking_opportunity' | 'booth_space';
  details: string;
  exclusivity: boolean;
}

export interface PerformanceGuarantee {
  metric: string;
  minimum_value: number;
  remedy_if_not_met: string;
}

export interface EventCalendarIntegration {
  upcoming_events: UpcomingEvent[];
  booking_availability: Record<string, boolean>;
  waitlist: WaitlistEntry[];
}

export interface UpcomingEvent {
  event_id: string;
  event_name: string;
  event_type: string;
  date: Date;
  location: string;
  sponsorship_status: 'available' | 'partially_sold' | 'sold_out';
  remaining_packages: string[];
}

export interface WaitlistEntry {
  brand_id: string;
  event_type_preference: string[];
  budget_range: { min: number; max: number };
  priority_score: number;
}

export interface BrandActivation {
  activation_id: string;
  activation_type: 'product_demo' | 'experience_zone' | 'photo_booth' | 'game' | 'sampling';
  engagement_metrics: ActivationMetrics;
  cost: number;
  roi: number;
}

export interface ActivationMetrics {
  participants: number;
  engagement_time_minutes: number;
  social_shares: number;
  leads_generated: number;
  brand_recall_score: number;
}

// Feature 6: Relationship Milestone Advertising
export interface MilestoneAdvertising {
  milestone_definitions: RelationshipMilestone[];
  milestone_detection: MilestoneDetection;
  celebration_ads: CelebrationAd[];
  gifting_integration: GiftingIntegration;
}

export interface RelationshipMilestone {
  milestone_id: string;
  milestone_name: string;
  milestone_type: 'match_anniversary' | 'message_milestone' | 'first_date' | 'relationship_status' | 'engagement';
  days_from_match?: number;
  message_count?: number;
  celebration_potential: number;
  recommended_ad_categories: string[];
}

export interface MilestoneDetection {
  detection_methods: DetectionMethod[];
  notification_timing: NotificationTiming;
  opt_in_required: boolean;
  privacy_considerations: string[];
}

export interface DetectionMethod {
  method_type: 'behavioral' | 'stated' | 'inferred' | 'calendar';
  confidence_level: number;
  data_sources: string[];
}

export interface NotificationTiming {
  advance_notice_days: number;
  reminder_frequency: string;
  optimal_time_of_day: number;
}

export interface CelebrationAd {
  ad_id: string;
  milestone_types: string[];
  ad_format: 'notification' | 'in_feed' | 'full_screen' | 'email';
  creative_theme: string;
  personalization_level: 'basic' | 'moderate' | 'high';
  call_to_action: string;
  sponsor?: string;
}

export interface GiftingIntegration {
  gift_categories: GiftCategory[];
  partner_brands: GiftPartner[];
  recommendation_engine: GiftRecommendationEngine;
}

export interface GiftCategory {
  category_id: string;
  category_name: string;
  price_range: { min: number; max: number };
  occasion_fit: string[];
  avg_purchase_rate: number;
}

export interface GiftPartner {
  partner_id: string;
  brand_name: string;
  categories: string[];
  commission_rate: number;
  featured: boolean;
}

export interface GiftRecommendationEngine {
  factors: RecommendationFactor[];
  personalization_depth: 'profile_based' | 'conversation_based' | 'ai_suggested';
  success_rate: number;
}

export interface RecommendationFactor {
  factor_name: string;
  weight: number;
  data_source: string;
}

// Feature 7: Singles Event Discovery Ads
export interface SinglesEventDiscovery {
  event_aggregation: EventAggregation;
  personalized_recommendations: EventRecommendation[];
  ticketing_integration: TicketingIntegration;
  social_features: EventSocialFeatures;
}

export interface EventAggregation {
  data_sources: EventDataSource[];
  event_categories: EventCategory[];
  geographic_coverage: string[];
  update_frequency_hours: number;
}

export interface EventDataSource {
  source_name: string;
  source_type: 'api' | 'scraping' | 'partnership' | 'user_submitted';
  reliability_score: number;
  data_freshness_hours: number;
}

export interface EventCategory {
  category_id: string;
  category_name: string;
  subcategories: string[];
  typical_age_range: { min: number; max: number };
  singles_friendliness_score: number;
}

export interface EventRecommendation {
  user_id: string;
  recommended_events: RecommendedEvent[];
  recommendation_factors: string[];
  refresh_timestamp: Date;
}

export interface RecommendedEvent {
  event_id: string;
  event_name: string;
  date: Date;
  location: string;
  category: string;
  match_score: number;
  mutual_interest_users: number;
  price: number;
  sponsored: boolean;
}

export interface TicketingIntegration {
  ticketing_partners: TicketingPartner[];
  in_app_purchase_enabled: boolean;
  group_booking_enabled: boolean;
  refund_policy: string;
}

export interface TicketingPartner {
  partner_id: string;
  partner_name: string;
  commission_rate: number;
  supported_regions: string[];
}

export interface EventSocialFeatures {
  interest_expression: InterestExpression;
  group_formation: GroupFormation;
  post_event_connection: PostEventConnection;
}

export interface InterestExpression {
  visibility_options: ('private' | 'matches_only' | 'public')[];
  default_visibility: string;
  notification_to_matches: boolean;
}

export interface GroupFormation {
  enabled: boolean;
  max_group_size: number;
  friend_invitation: boolean;
  match_group_suggestion: boolean;
}

export interface PostEventConnection {
  enabled: boolean;
  time_window_hours: number;
  proximity_based: boolean;
  mutual_attendance_required: boolean;
}

// Feature 8: Premium Feature Upsell Moments
export interface PremiumUpsellMoments {
  trigger_moments: UpsellTrigger[];
  upsell_creatives: UpsellCreative[];
  pricing_optimization: UpsellPricing;
  conversion_tracking: UpsellConversion;
}

export interface UpsellTrigger {
  trigger_id: string;
  trigger_name: string;
  trigger_type: 'frustration' | 'desire' | 'milestone' | 'competitive' | 'scarcity';
  detection_criteria: TriggerCriteria;
  priority: number;
  cooldown_hours: number;
}

export interface TriggerCriteria {
  event_type: string;
  conditions: TriggerCondition[];
  time_sensitivity: boolean;
}

export type TriggerConditionValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | { min: number; max: number };

export interface TriggerCondition {
  field: string;
  operator: string;
  value: TriggerConditionValue;
}

export interface UpsellCreative {
  creative_id: string;
  trigger_types: string[];
  format: 'modal' | 'banner' | 'inline' | 'notification';
  headline: string;
  value_proposition: string;
  social_proof?: string;
  urgency_element?: string;
  cta: string;
  discount_offer?: DiscountOffer;
}

export interface DiscountOffer {
  discount_type: 'percentage' | 'fixed' | 'free_trial';
  value: number;
  duration_hours: number;
  code?: string;
}

export interface UpsellPricing {
  base_prices: Record<string, number>;
  dynamic_discounting: DynamicDiscount[];
  price_testing: PriceTest[];
}

export interface DynamicDiscount {
  user_segment: string;
  discount_percentage: number;
  rationale: string;
}

export interface PriceTest {
  test_id: string;
  variants: PriceVariant[];
  traffic_allocation: Record<string, number>;
  winning_variant?: string;
}

export interface PriceVariant {
  variant_id: string;
  price: number;
  conversion_rate: number;
  revenue_per_user: number;
}

export interface UpsellConversion {
  total_upsells_shown: number;
  conversion_rate: number;
  revenue_generated: number;
  avg_order_value: number;
  most_effective_triggers: string[];
  most_effective_creatives: string[];
}

// Feature 9: Date Night Planning Partner Ads
export interface DateNightPlanningAds {
  planning_journey: PlanningJourney;
  partner_ecosystem: PartnerEcosystem;
  bundle_builder: BundleBuilder;
  recommendation_engine: DateRecommendationEngine;
}

export interface PlanningJourney {
  journey_stages: JourneyStage[];
  touchpoints: PlanningTouchpoint[];
  completion_rate: number;
  avg_time_to_complete_minutes: number;
}

export interface JourneyStage {
  stage_id: string;
  stage_name: 'inspiration' | 'exploration' | 'comparison' | 'booking' | 'preparation';
  user_actions: string[];
  ad_opportunities: AdOpportunity[];
  drop_off_rate: number;
}

export interface AdOpportunity {
  opportunity_type: string;
  relevance_score: number;
  recommended_formats: string[];
  sponsor_categories: string[];
}

export interface PlanningTouchpoint {
  touchpoint_id: string;
  touchpoint_name: string;
  placement: string;
  ad_format: string;
  avg_engagement: number;
}

export interface PartnerEcosystem {
  partner_categories: PartnerCategory[];
  featured_partners: FeaturedPartner[];
  partnership_tiers: PartnershipTier[];
}

export interface PartnerCategory {
  category_id: string;
  category_name: string;
  partner_count: number;
  avg_user_rating: number;
  commission_range: { min: number; max: number };
}

export interface FeaturedPartner {
  partner_id: string;
  brand_name: string;
  category: string;
  featured_offer: string;
  exclusive: boolean;
  performance_score: number;
}

export interface PartnershipTier {
  tier_name: string;
  benefits: string[];
  requirements: string[];
  fee_structure: string;
}

export interface BundleBuilder {
  bundle_templates: BundleTemplate[];
  dynamic_bundling: DynamicBundling;
  pricing_engine: BundlePricingEngine;
}

export interface BundleTemplate {
  template_id: string;
  template_name: string;
  components: BundleComponent[];
  suggested_occasions: string[];
  price_range: { min: number; max: number };
}

export interface BundleComponent {
  component_type: 'activity' | 'dining' | 'entertainment' | 'transport' | 'gift';
  required: boolean;
  alternatives: number;
}

export interface DynamicBundling {
  enabled: boolean;
  personalization_factors: string[];
  price_optimization: boolean;
  inventory_aware: boolean;
}

export interface BundlePricingEngine {
  base_discount_percentage: number;
  volume_discount_tiers: VolumeTier[];
  flash_sale_enabled: boolean;
}

export interface VolumeTier {
  min_components: number;
  discount_percentage: number;
}

export interface DateRecommendationEngine {
  recommendation_sources: string[];
  personalization_level: 'basic' | 'advanced' | 'ai_powered';
  success_metrics: DateSuccessMetrics;
}

export interface DateSuccessMetrics {
  booking_completion_rate: number;
  date_completion_rate: number;
  positive_feedback_rate: number;
  rebooking_rate: number;
}

// Feature 10: Influencer Dating Tips Integration
export interface InfluencerIntegration {
  influencer_network: InfluencerNetwork;
  content_library: ContentLibrary;
  sponsored_content: SponsoredContent[];
  performance_analytics: InfluencerPerformance;
}

export interface InfluencerNetwork {
  influencers: DatingInfluencer[];
  recruitment_pipeline: RecruitmentPipeline;
  relationship_management: InfluencerRM;
}

export interface DatingInfluencer {
  influencer_id: string;
  name: string;
  niche: 'dating_coach' | 'relationship_expert' | 'lifestyle' | 'entertainment' | 'self_improvement';
  platforms: SocialPlatform[];
  audience_size: number;
  engagement_rate: number;
  audience_demographics: InfluencerAudience;
  rate_card: RateCard;
}

export interface SocialPlatform {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'podcast';
  handle: string;
  followers: number;
  avg_engagement: number;
}

export interface InfluencerAudience {
  age_range: { primary: string; secondary: string };
  gender_split: { male: number; female: number };
  locations: string[];
  interests: string[];
}

export interface RateCard {
  story_post: number;
  feed_post: number;
  video_content: number;
  live_session: number;
  long_term_partnership: number;
}

export interface RecruitmentPipeline {
  prospects: InfluencerProspect[];
  outreach_templates: OutreachTemplate[];
  conversion_rate: number;
}

export interface InfluencerProspect {
  prospect_id: string;
  name: string;
  platform: string;
  followers: number;
  fit_score: number;
  status: 'identified' | 'contacted' | 'negotiating' | 'contracted' | 'declined';
}

export interface OutreachTemplate {
  template_id: string;
  template_name: string;
  subject: string;
  body: string;
  response_rate: number;
}

export interface InfluencerRM {
  communication_log: boolean;
  performance_reviews: boolean;
  payment_tracking: boolean;
  contract_management: boolean;
}

export interface ContentLibrary {
  content_types: ContentType[];
  content_items: ContentItem[];
  curation_process: CurationProcess;
}

export interface ContentType {
  type_id: string;
  type_name: string;
  format: 'video' | 'image' | 'article' | 'audio';
  typical_length: string;
  engagement_benchmark: number;
}

export interface ContentItem {
  content_id: string;
  influencer_id: string;
  content_type: string;
  title: string;
  url: string;
  publish_date: Date;
  performance: ContentPerformance;
  sponsored: boolean;
  brand_mentions: string[];
}

export interface ContentPerformance {
  views: number;
  engagement: number;
  shares: number;
  comments: number;
  click_throughs: number;
}

export interface CurationProcess {
  approval_workflow: boolean;
  brand_safety_check: boolean;
  performance_threshold: number;
  content_refresh_days: number;
}

export interface SponsoredContent {
  campaign_id: string;
  campaign_name: string;
  sponsor: string;
  influencers: string[];
  content_briefs: ContentBrief[];
  budget: number;
  timeline: { start: Date; end: Date };
  deliverables: Deliverable[];
  performance: CampaignPerformance;
}

export interface ContentBrief {
  brief_id: string;
  key_messages: string[];
  hashtags: string[];
  mentions: string[];
  dos_and_donts: { dos: string[]; donts: string[] };
  approval_required: boolean;
}

export interface Deliverable {
  deliverable_id: string;
  type: string;
  quantity: number;
  due_date: Date;
  status: 'pending' | 'submitted' | 'approved' | 'published';
}

export interface CampaignPerformance {
  total_reach: number;
  total_engagement: number;
  total_clicks: number;
  conversions: number;
  roi: number;
  brand_lift: number;
}

export interface InfluencerPerformance {
  top_performers: string[];
  content_performance_by_type: Record<string, number>;
  roi_by_influencer: Record<string, number>;
  audience_growth_impact: number;
  brand_sentiment_change: number;
}
