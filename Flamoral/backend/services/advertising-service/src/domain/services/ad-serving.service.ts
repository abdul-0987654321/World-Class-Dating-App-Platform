/**
 * Ad Serving Service
 * Core ad serving logic with targeting and ranking
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Ad,
  AdServeRequest,
  AdServeResponse,
  ServedAd,
  Campaign,
  TargetingConfig,
  UserContext,
} from '../types/ad.types';

export class AdServingService {
  /**
   * Serve ads based on user context and placement
   */
  async serveAds(request: AdServeRequest): Promise<AdServeResponse> {
    const requestId = uuidv4();

    // 1. Get eligible ads based on placement and user context
    const eligibleAds = await this.getEligibleAds(request);

    // 2. Score and rank ads
    const rankedAds = this.rankAds(eligibleAds, request.user_context);

    // 3. Select top ads based on budget and pacing
    const maxAds = request.max_ads || 3;
    const selectedAds = rankedAds.slice(0, maxAds);

    // 4. Create served ad objects with tracking tokens
    const servedAds = selectedAds.map(ad => this.createServedAd(ad, requestId));

    // 5. Calculate overall targeting score
    const targetingScore = this.calculateTargetingScore(servedAds, request.user_context);

    return {
      ads: servedAds,
      request_id: requestId,
      served_at: new Date(),
      targeting_score,
    };
  }

  /**
   * Get active campaigns
   */
  async getActiveCampaigns(): Promise<Campaign[]> {
    // Mock implementation - would query database
    const now = new Date();

    return [
      {
        id: 'campaign_001',
        advertiser_id: 'advertiser_001',
        name: 'Valentine\'s Day Promotion',
        description: 'Premium subscription discount for Valentine\'s Day',
        objective: 'subscriptions',
        budget: {
          total_budget: 10000,
          daily_budget: 500,
          bid_strategy: 'cpa',
          max_bid: 5.0,
          currency: 'USD',
        },
        status: 'active',
        created_at: new Date('2025-01-01'),
        updated_at: now,
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-02-14'),
      },
      {
        id: 'campaign_002',
        advertiser_id: 'advertiser_002',
        name: 'New User Acquisition',
        description: 'Acquire new users to the platform',
        objective: 'registrations',
        budget: {
          total_budget: 20000,
          daily_budget: 800,
          bid_strategy: 'cpc',
          max_bid: 2.5,
          currency: 'USD',
        },
        status: 'active',
        created_at: new Date('2025-01-15'),
        updated_at: now,
        start_date: new Date('2025-01-20'),
      },
    ];
  }

  /**
   * Get ad by ID
   */
  async getAdById(adId: string): Promise<Ad | null> {
    // Mock implementation - would query database
    const mockAds = await this.getMockAds();
    return mockAds.find(ad => ad.id === adId) || null;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at'>): Promise<Campaign> {
    const now = new Date();

    const campaign: Campaign = {
      id: uuidv4(),
      ...campaignData,
      created_at: now,
      updated_at: now,
    };

    // Mock implementation - would save to database
    return campaign;
  }

  /**
   * Update campaign
   */
  async updateCampaign(campaignId: string, updates: Partial<Campaign>): Promise<Campaign> {
    // Mock implementation - would update in database
    const campaigns = await this.getActiveCampaigns();
    const campaign = campaigns.find(c => c.id === campaignId);

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const updated: Campaign = {
      ...campaign,
      ...updates,
      updated_at: new Date(),
    };

    return updated;
  }

  /**
   * Create a new ad
   */
  async createAd(adData: Omit<Ad, 'id' | 'created_at' | 'updated_at'>): Promise<Ad> {
    const now = new Date();

    const ad: Ad = {
      id: uuidv4(),
      ...adData,
      created_at: now,
      updated_at: now,
    };

    // Mock implementation - would save to database
    return ad;
  }

  /**
   * Update ad
   */
  async updateAd(adId: string, updates: Partial<Ad>): Promise<Ad> {
    // Mock implementation - would update in database
    const ad = await this.getAdById(adId);

    if (!ad) {
      throw new Error('Ad not found');
    }

    const updated: Ad = {
      ...ad,
      ...updates,
      updated_at: new Date(),
    };

    return updated;
  }

  /**
   * Get eligible ads based on targeting
   */
  private async getEligibleAds(request: AdServeRequest): Promise<Ad[]> {
    // Mock implementation - would query database with targeting filters
    const allAds = await this.getMockAds();

    return allAds.filter(ad => {
      // Check if ad is active
      if (ad.status !== 'active') return false;

      // Check if ad format is allowed for placement
      if (request.placement.format_constraints?.allowed_formats) {
        if (!request.placement.format_constraints.allowed_formats.includes(ad.ad_format)) {
          return false;
        }
      }

      // Check targeting criteria
      return this.matchesTargeting(ad.targeting_config, request.user_context);
    });
  }

  /**
   * Check if user matches targeting criteria
   */
  private matchesTargeting(targeting: TargetingConfig, userContext: UserContext): boolean {
    // Age range
    if (targeting.age_range) {
      if (userContext.age < targeting.age_range.min || userContext.age > targeting.age_range.max) {
        return false;
      }
    }

    // Gender
    if (targeting.gender && targeting.gender.length > 0) {
      if (!targeting.gender.includes('all') && !targeting.gender.includes(userContext.gender as any)) {
        return false;
      }
    }

    // Location
    if (targeting.location?.country && targeting.location.country.length > 0) {
      if (!targeting.location.country.includes(userContext.location.country)) {
        return false;
      }
    }

    // Subscription tier
    if (targeting.subscription_tier && targeting.subscription_tier.length > 0) {
      if (!targeting.subscription_tier.includes(userContext.subscription_tier as any)) {
        return false;
      }
    }

    // Relationship intent
    if (targeting.relationship_intent && targeting.relationship_intent.length > 0) {
      if (!targeting.relationship_intent.includes(userContext.relationship_intent as any)) {
        return false;
      }
    }

    // Profile completeness
    if (targeting.profile_completeness !== undefined) {
      if (userContext.profile_completeness < targeting.profile_completeness) {
        return false;
      }
    }

    return true;
  }

  /**
   * Rank ads based on relevance and bid
   */
  private rankAds(ads: Ad[], userContext: UserContext): Ad[] {
    return ads
      .map(ad => ({
        ad,
        score: this.calculateAdScore(ad, userContext),
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.ad);
  }

  /**
   * Calculate ad relevance score
   */
  private calculateAdScore(ad: Ad, userContext: UserContext): number {
    let score = 0;

    // Base bid score (normalized to 0-1 range, assuming max bid of 10)
    score += (ad.budget_config.max_bid / 10) * 0.4;

    // Interest matching
    const interestMatch = this.calculateInterestMatch(
      ad.targeting_config.interests || [],
      userContext.interests
    );
    score += interestMatch * 0.3;

    // Age targeting precision
    if (ad.targeting_config.age_range) {
      const ageRange = ad.targeting_config.age_range.max - ad.targeting_config.age_range.min;
      const agePrecision = 1 - (ageRange / 100); // More precise targeting = higher score
      score += agePrecision * 0.15;
    }

    // Location targeting precision
    if (ad.targeting_config.location?.city) {
      score += 0.15; // City-level targeting gets bonus
    }

    return score;
  }

  /**
   * Calculate interest match score
   */
  private calculateInterestMatch(adInterests: string[], userInterests: string[]): number {
    if (adInterests.length === 0) return 0.5; // No targeting = average score

    const matches = adInterests.filter(interest =>
      userInterests.some(ui => ui.toLowerCase() === interest.toLowerCase())
    );

    return matches.length / adInterests.length;
  }

  /**
   * Create served ad object with tracking
   */
  private createServedAd(ad: Ad, requestId: string): ServedAd {
    const impressionToken = uuidv4();

    return {
      ad_id: ad.id,
      campaign_id: ad.campaign_id,
      creative_id: ad.creative_id,
      title: ad.title,
      description: ad.description,
      image_url: ad.image_url,
      video_url: ad.video_url,
      cta_text: ad.cta_text,
      cta_url: ad.cta_url,
      ad_format: ad.ad_format,
      impression_token,
      tracking_urls: {
        impression: `/api/tracking/impression/${impressionToken}`,
        click: `/api/tracking/click/${impressionToken}`,
        conversion: `/api/tracking/conversion/${impressionToken}`,
      },
      relevance_score: 0.85, // Would be calculated in real implementation
      bid_amount: ad.budget_config.max_bid,
    };
  }

  /**
   * Calculate overall targeting score
   */
  private calculateTargetingScore(servedAds: ServedAd[], userContext: UserContext): number {
    if (servedAds.length === 0) return 0;

    const avgRelevance = servedAds.reduce((sum, ad) => sum + ad.relevance_score, 0) / servedAds.length;
    return avgRelevance;
  }

  /**
   * Mock ads for development
   */
  private async getMockAds(): Promise<Ad[]> {
    const now = new Date();

    return [
      {
        id: 'ad_001',
        campaign_id: 'campaign_001',
        creative_id: 'creative_001',
        title: 'Find Your Valentine',
        description: 'Get 50% off Premium - Limited Time!',
        image_url: 'https://example.com/valentines-ad.jpg',
        cta_text: 'Upgrade Now',
        cta_url: 'https://flamoral.com/upgrade?promo=VALENTINE50',
        ad_format: 'banner',
        targeting_config: {
          age_range: { min: 22, max: 45 },
          gender: ['all'],
          subscription_tier: ['free', 'gold'],
          relationship_intent: ['serious', 'marriage'],
        },
        budget_config: {
          total_budget: 5000,
          daily_budget: 250,
          bid_strategy: 'cpa',
          max_bid: 4.5,
          currency: 'USD',
        },
        status: 'active',
        created_at: now,
        updated_at: now,
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-02-14'),
      },
      {
        id: 'ad_002',
        campaign_id: 'campaign_002',
        creative_id: 'creative_002',
        title: 'Start Your Love Story',
        description: 'Join millions finding meaningful connections',
        image_url: 'https://example.com/signup-ad.jpg',
        cta_text: 'Sign Up Free',
        cta_url: 'https://flamoral.com/signup',
        ad_format: 'native',
        targeting_config: {
          age_range: { min: 18, max: 35 },
          gender: ['all'],
          subscription_tier: ['free'],
        },
        budget_config: {
          total_budget: 10000,
          daily_budget: 400,
          bid_strategy: 'cpc',
          max_bid: 2.0,
          currency: 'USD',
        },
        status: 'active',
        created_at: now,
        updated_at: now,
        start_date: new Date('2025-01-20'),
      },
      {
        id: 'ad_003',
        campaign_id: 'campaign_001',
        creative_id: 'creative_003',
        title: 'Love is in the Air',
        description: 'Boost your profile this Valentine\'s Day',
        image_url: 'https://example.com/boost-ad.jpg',
        video_url: 'https://example.com/boost-video.mp4',
        cta_text: 'Boost Profile',
        cta_url: 'https://flamoral.com/boost',
        ad_format: 'video',
        targeting_config: {
          age_range: { min: 25, max: 40 },
          gender: ['all'],
          subscription_tier: ['gold', 'platinum'],
          activity_level: 'high',
        },
        budget_config: {
          total_budget: 3000,
          daily_budget: 150,
          bid_strategy: 'cpm',
          max_bid: 15.0,
          currency: 'USD',
        },
        status: 'active',
        created_at: now,
        updated_at: now,
        start_date: new Date('2025-02-01'),
        end_date: new Date('2025-02-14'),
      },
    ];
  }
}

export const adServingService = new AdServingService();
