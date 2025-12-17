/**
 * Impression and Click Tracking Service
 * Handles ad event tracking and analytics
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ImpressionEvent,
  ClickEvent,
  ConversionEvent,
  TrackingStats,
  ImpressionMetadata,
  ClickMetadata,
  ConversionMetadata,
} from '../types/tracking.types';

export class TrackingService {
  /**
   * Track ad impression
   */
  async trackImpression(
    impressionToken: string,
    adId: string,
    campaignId: string,
    userId: string,
    metadata: Partial<ImpressionMetadata>
  ): Promise<ImpressionEvent> {
    const impression: ImpressionEvent = {
      id: uuidv4(),
      ad_id: adId,
      campaign_id: campaignId,
      user_id: userId,
      impression_token: impressionToken,
      placement: metadata.ad_position?.toString() || 'unknown',
      device_type: this.detectDeviceType(metadata.user_agent),
      timestamp: new Date(),
      metadata: {
        user_agent: metadata.user_agent,
        ip_address: metadata.ip_address,
        screen_resolution: metadata.screen_resolution,
        viewport_size: metadata.viewport_size,
        ad_position: metadata.ad_position,
        viewable: metadata.viewable !== false, // Default to true if not specified
        view_duration_ms: metadata.view_duration_ms || 0,
        scroll_depth: metadata.scroll_depth || 0,
      },
    };

    // Mock implementation - would save to database
    // await db.impressions.insert(impression);

    // Update real-time metrics
    await this.updateImpressionMetrics(adId, campaignId);

    return impression;
  }

  /**
   * Track ad click
   */
  async trackClick(
    impressionToken: string,
    adId: string,
    campaignId: string,
    userId: string,
    metadata: Partial<ClickMetadata>
  ): Promise<ClickEvent> {
    const clickToken = uuidv4();

    const click: ClickEvent = {
      id: uuidv4(),
      ad_id: adId,
      campaign_id: campaignId,
      user_id: userId,
      impression_token: impressionToken,
      click_token: clickToken,
      timestamp: new Date(),
      metadata: {
        user_agent: metadata.user_agent,
        ip_address: metadata.ip_address,
        click_coordinates: metadata.click_coordinates,
        time_since_impression_ms: metadata.time_since_impression_ms,
        referrer: metadata.referrer,
        destination_url: metadata.destination_url,
      },
    };

    // Mock implementation - would save to database
    // await db.clicks.insert(click);

    // Update real-time metrics
    await this.updateClickMetrics(adId, campaignId);

    return click;
  }

  /**
   * Track conversion
   */
  async trackConversion(
    clickToken: string,
    adId: string,
    campaignId: string,
    userId: string,
    conversionType: ConversionEvent['conversion_type'],
    conversionValue?: number,
    metadata?: Partial<ConversionMetadata>
  ): Promise<ConversionEvent> {
    const conversion: ConversionEvent = {
      id: uuidv4(),
      ad_id: adId,
      campaign_id: campaignId,
      user_id: userId,
      click_token: clickToken,
      conversion_type: conversionType,
      conversion_value: conversionValue,
      timestamp: new Date(),
      metadata: {
        attribution_model: metadata?.attribution_model || 'last_click',
        time_since_click_hours: metadata?.time_since_click_hours,
        conversion_funnel_steps: metadata?.conversion_funnel_steps || [],
        revenue: metadata?.revenue,
        currency: metadata?.currency || 'USD',
      },
    };

    // Mock implementation - would save to database
    // await db.conversions.insert(conversion);

    // Update real-time metrics
    await this.updateConversionMetrics(adId, campaignId, conversionValue || 0);

    return conversion;
  }

  /**
   * Get tracking stats for an ad
   */
  async getAdStats(
    adId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrackingStats> {
    // Mock implementation - would query database
    const stats: TrackingStats = {
      ad_id: adId,
      campaign_id: 'campaign_001',
      time_period: { start: startDate, end: endDate },
      impressions: 15000,
      clicks: 1200,
      conversions: 85,
      unique_impressions: 12000,
      unique_clicks: 950,
      ctr: 0.08, // 8%
      cvr: 0.071, // 7.1%
      avg_view_duration_ms: 3500,
      viewability_rate: 0.78, // 78%
    };

    return stats;
  }

  /**
   * Get tracking stats for a campaign
   */
  async getCampaignStats(
    campaignId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TrackingStats> {
    // Mock implementation - would query database and aggregate
    const stats: TrackingStats = {
      ad_id: 'all',
      campaign_id: campaignId,
      time_period: { start: startDate, end: endDate },
      impressions: 45000,
      clicks: 3600,
      conversions: 240,
      unique_impressions: 35000,
      unique_clicks: 2800,
      ctr: 0.08,
      cvr: 0.067,
      avg_view_duration_ms: 3200,
      viewability_rate: 0.75,
    };

    return stats;
  }

  /**
   * Get hourly breakdown of impressions and clicks
   */
  async getHourlyBreakdown(
    campaignId: string,
    date: Date
  ): Promise<Array<{ hour: number; impressions: number; clicks: number }>> {
    // Mock implementation
    const breakdown = [];

    for (let hour = 0; hour < 24; hour++) {
      // Peak hours (7-11 PM) have more activity
      const isPeakHour = hour >= 19 && hour <= 23;
      const baseImpressions = isPeakHour ? 3000 : 1500;
      const baseClicks = isPeakHour ? 250 : 120;

      breakdown.push({
        hour,
        impressions: baseImpressions + Math.floor(Math.random() * 500),
        clicks: baseClicks + Math.floor(Math.random() * 50),
      });
    }

    return breakdown;
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(userId: string): Promise<{
    total_impressions: number;
    total_clicks: number;
    unique_ads_seen: number;
    avg_ctr: number;
    last_interaction: Date;
    ad_fatigue_score: number;
  }> {
    // Mock implementation
    return {
      total_impressions: 85,
      total_clicks: 7,
      unique_ads_seen: 12,
      avg_ctr: 0.082,
      last_interaction: new Date(),
      ad_fatigue_score: 0.3, // 0-1 scale, higher = more fatigued
    };
  }

  /**
   * Detect fraud patterns
   */
  async detectFraud(
    adId: string,
    userId: string,
    ipAddress: string,
    userAgent: string
  ): Promise<{
    is_suspicious: boolean;
    risk_score: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check for rapid clicking patterns
    const recentClicks = await this.getRecentClicksByUser(userId, adId);
    if (recentClicks > 10) {
      reasons.push('Excessive clicking from same user');
      riskScore += 0.3;
    }

    // Check for suspicious IP patterns
    const ipClicks = await this.getRecentClicksByIP(ipAddress, adId);
    if (ipClicks > 50) {
      reasons.push('High click volume from single IP');
      riskScore += 0.4;
    }

    // Check for bot patterns in user agent
    if (this.isSuspiciousUserAgent(userAgent)) {
      reasons.push('Suspicious user agent detected');
      riskScore += 0.3;
    }

    return {
      is_suspicious: riskScore > 0.5,
      risk_score: Math.min(riskScore, 1.0),
      reasons,
    };
  }

  /**
   * Update impression metrics (called internally)
   */
  private async updateImpressionMetrics(adId: string, campaignId: string): Promise<void> {
    // Mock implementation - would update Redis counters
    // await redis.hincrby(`ad:${adId}:metrics`, 'impressions', 1);
    // await redis.hincrby(`campaign:${campaignId}:metrics`, 'impressions', 1);
  }

  /**
   * Update click metrics (called internally)
   */
  private async updateClickMetrics(adId: string, campaignId: string): Promise<void> {
    // Mock implementation - would update Redis counters
    // await redis.hincrby(`ad:${adId}:metrics`, 'clicks', 1);
    // await redis.hincrby(`campaign:${campaignId}:metrics`, 'clicks', 1);
  }

  /**
   * Update conversion metrics (called internally)
   */
  private async updateConversionMetrics(
    adId: string,
    campaignId: string,
    value: number
  ): Promise<void> {
    // Mock implementation - would update Redis counters
    // await redis.hincrby(`ad:${adId}:metrics`, 'conversions', 1);
    // await redis.hincrby(`campaign:${campaignId}:metrics`, 'conversions', 1);
    // await redis.hincrbyfloat(`ad:${adId}:metrics`, 'conversion_value', value);
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(userAgent?: string): 'mobile' | 'tablet' | 'desktop' {
    if (!userAgent) return 'desktop';

    const ua = userAgent.toLowerCase();

    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'mobile';
    }

    if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'tablet';
    }

    return 'desktop';
  }

  /**
   * Get recent clicks by user (mock)
   */
  private async getRecentClicksByUser(userId: string, adId: string): Promise<number> {
    // Mock implementation - would query database
    return Math.floor(Math.random() * 5);
  }

  /**
   * Get recent clicks by IP (mock)
   */
  private async getRecentClicksByIP(ipAddress: string, adId: string): Promise<number> {
    // Mock implementation - would query database
    return Math.floor(Math.random() * 20);
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    if (!userAgent) return true;

    const suspiciousPatterns = [
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python-requests',
    ];

    const ua = userAgent.toLowerCase();
    return suspiciousPatterns.some(pattern => ua.includes(pattern));
  }
}

export const trackingService = new TrackingService();
