/**
 * Ad Types and Interfaces
 */

export interface Ad {
  id: string;
  campaign_id: string;
  creative_id: string;
  title: string;
  description: string;
  image_url?: string;
  video_url?: string;
  cta_text: string;
  cta_url: string;
  ad_format: AdFormat;
  targeting_config: TargetingConfig;
  budget_config: BudgetConfig;
  status: AdStatus;
  created_at: Date;
  updated_at: Date;
  start_date?: Date;
  end_date?: Date;
}

export type AdFormat = 'banner' | 'interstitial' | 'native' | 'video' | 'carousel' | 'story';
export type AdStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export interface TargetingConfig {
  age_range?: { min: number; max: number };
  gender?: ('male' | 'female' | 'non_binary' | 'all')[];
  location?: {
    country?: string[];
    city?: string[];
    radius_km?: number;
    coordinates?: { lat: number; lng: number };
  };
  interests?: string[];
  relationship_intent?: ('casual' | 'serious' | 'marriage' | 'friendship')[];
  subscription_tier?: ('free' | 'gold' | 'platinum' | 'diamond')[];
  activity_level?: 'low' | 'medium' | 'high';
  profile_completeness?: number;
}

export interface BudgetConfig {
  total_budget: number;
  daily_budget: number;
  bid_strategy: 'cpc' | 'cpm' | 'cpa';
  max_bid: number;
  min_bid?: number;
  currency: string;
}

export interface AdServeRequest {
  user_id: string;
  placement: AdPlacement;
  device_type: 'mobile' | 'tablet' | 'desktop';
  user_context: UserContext;
  max_ads?: number;
}

export interface AdPlacement {
  placement_id: string;
  placement_type: 'feed' | 'profile' | 'messaging' | 'search' | 'sidebar';
  screen_name: string;
  format_constraints?: {
    max_width?: number;
    max_height?: number;
    allowed_formats?: AdFormat[];
  };
}

export interface UserContext {
  age: number;
  gender: string;
  location: {
    city: string;
    country: string;
    coordinates: { lat: number; lng: number };
  };
  interests: string[];
  subscription_tier: string;
  relationship_intent: string;
  profile_completeness: number;
  activity_level: string;
  recent_actions?: string[];
}

export interface AdServeResponse {
  ads: ServedAd[];
  request_id: string;
  served_at: Date;
  targeting_score: number;
}

export interface ServedAd {
  ad_id: string;
  campaign_id: string;
  creative_id: string;
  title: string;
  description: string;
  image_url?: string;
  video_url?: string;
  cta_text: string;
  cta_url: string;
  ad_format: AdFormat;
  impression_token: string;
  tracking_urls: {
    impression: string;
    click: string;
    conversion?: string;
  };
  relevance_score: number;
  bid_amount: number;
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  name: string;
  description: string;
  objective: CampaignObjective;
  budget: BudgetConfig;
  status: CampaignStatus;
  created_at: Date;
  updated_at: Date;
  start_date: Date;
  end_date?: Date;
  performance_metrics?: CampaignPerformance;
}

export type CampaignObjective =
  | 'brand_awareness'
  | 'app_installs'
  | 'registrations'
  | 'subscriptions'
  | 'engagement'
  | 'matches';

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'archived';

export interface CampaignPerformance {
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  ctr: number;
  cvr: number;
  cpc: number;
  cpm: number;
  cpa: number;
  roas?: number;
}
