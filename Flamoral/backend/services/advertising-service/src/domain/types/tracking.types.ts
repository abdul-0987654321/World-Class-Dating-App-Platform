/**
 * Impression and Click Tracking Types
 */

export interface ImpressionEvent {
  id: string;
  ad_id: string;
  campaign_id: string;
  user_id: string;
  impression_token: string;
  placement: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  timestamp: Date;
  metadata: ImpressionMetadata;
}

export interface ImpressionMetadata {
  user_agent?: string;
  ip_address?: string;
  screen_resolution?: string;
  viewport_size?: { width: number; height: number };
  ad_position?: number;
  viewable?: boolean;
  view_duration_ms?: number;
  scroll_depth?: number;
}

export interface ClickEvent {
  id: string;
  ad_id: string;
  campaign_id: string;
  user_id: string;
  impression_token: string;
  click_token: string;
  timestamp: Date;
  metadata: ClickMetadata;
}

export interface ClickMetadata {
  user_agent?: string;
  ip_address?: string;
  click_coordinates?: { x: number; y: number };
  time_since_impression_ms?: number;
  referrer?: string;
  destination_url?: string;
}

export interface ConversionEvent {
  id: string;
  ad_id: string;
  campaign_id: string;
  user_id: string;
  click_token: string;
  conversion_type: ConversionType;
  conversion_value?: number;
  timestamp: Date;
  metadata: ConversionMetadata;
}

export type ConversionType =
  | 'registration'
  | 'subscription'
  | 'profile_completion'
  | 'first_match'
  | 'first_message'
  | 'app_install';

export interface ConversionMetadata {
  attribution_model?: string;
  time_since_click_hours?: number;
  conversion_funnel_steps?: string[];
  revenue?: number;
  currency?: string;
}

export interface TrackingStats {
  ad_id: string;
  campaign_id: string;
  time_period: { start: Date; end: Date };
  impressions: number;
  clicks: number;
  conversions: number;
  unique_impressions: number;
  unique_clicks: number;
  ctr: number;
  cvr: number;
  avg_view_duration_ms: number;
  viewability_rate: number;
}
