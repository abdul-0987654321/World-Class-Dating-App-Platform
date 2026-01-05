/**
 * Date Planning Service
 * Luxury date planning with AI-powered suggestions and venue integration
 */

import { v4 as uuidv4 } from 'uuid';

import { getGooglePlacesClient } from '../../infrastructure/clients/google-places.client';
import { getYelpClient } from '../../infrastructure/clients/yelp.client';
import db from '../../infrastructure/database/connection';
import logger from '../../utils/logger';
import {
  DatePlan,
  DatePlanStatus,
  DatePlanVenue,
  DateFeedback,
  DateIdea,
  DatePreferences,
  DatePlanCreateInput,
  DatePlanUpdateInput,
  DATE_PLAN_STATUS,
  DATE_MOODS,
  calculateEstimatedBudget,
} from '../entities/DatePlan.entity';
import {
  Venue,
  VenueType,
  PriceRange,
  VenueCreateInput,
  VENUE_TYPES,
  PRICE_RANGES,
} from '../entities/Venue.entity';

export interface CreateDatePlanDto {
  matchId: string;
  title: string;
  description?: string;
  date: string; // ISO date string
  venues: Array<{
    venueId: string;
    order: number;
    timeSlot?: string;
    notes?: string;
  }>;
  estimatedBudget?: number;
}

export interface DatePreferencesDto {
  budget?: PriceRange | 'any';
  mood?: string;
  venueTypes?: VenueType[];
  cuisinePreferences?: string[];
  activityPreferences?: string[];
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  duration?: 'short' | 'medium' | 'long';
  location?: string;
  specialOccasion?: string;
}

export interface DateFeedbackDto {
  rating: number;
  notes?: string;
  wouldRecommend?: boolean;
}

export interface SearchVenuesDto {
  location: string;
  type?: VenueType;
  budget?: PriceRange;
  keyword?: string;
}

export class DatePlanningService {
  private googlePlacesClient = getGooglePlacesClient();
  private yelpClient = getYelpClient();

  /**
   * AI-powered date suggestions based on user preferences
   */
  async suggestDateIdeas(
    userId: string,
    matchId: string,
    preferences: DatePreferencesDto
  ): Promise<DateIdea[]> {
    try {
      // Get user and match profiles for personalization
      const userProfile = await this.getUserProfile(userId);
      const matchProfile = await this.getMatchProfile(matchId, userId);

      // Generate date ideas based on preferences and profiles
      const dateIdeas = await this.generateDateIdeas(preferences, userProfile, matchProfile);

      return dateIdeas;
    } catch (error: any) {
      logger.error('Error suggesting date ideas:', error);
      throw new Error('Failed to generate date suggestions');
    }
  }

  /**
   * Search venues based on location, type, and budget
   */
  async searchVenues(params: SearchVenuesDto): Promise<Venue[]> {
    try {
      // Try Google Places first
      const venues = await this.googlePlacesClient.searchVenues({
        location: params.location,
        type: params.type,
        priceRange: params.budget,
        keyword: params.keyword,
      });

      // If Yelp is configured and we need more results, supplement with Yelp
      if (venues.length < 10 && this.yelpClient.isConfigured()) {
        const yelpVenues = await this.yelpClient.searchDateVenues(
          params.location,
          params.type,
          params.budget
        );
        // Merge and deduplicate by name
        const existingNames = new Set(venues.map((v) => v.name.toLowerCase()));
        for (const venue of yelpVenues) {
          if (!existingNames.has(venue.name.toLowerCase())) {
            venues.push(venue);
          }
        }
      }

      // Sort by rating
      venues.sort((a, b) => (b.rating || 0) - (a.rating || 0));

      return venues.slice(0, 20);
    } catch (error: any) {
      logger.error('Error searching venues:', error);
      throw new Error('Failed to search venues');
    }
  }

  /**
   * Get venue details by ID or external ID
   */
  async getVenueDetails(venueId: string): Promise<Venue | null> {
    try {
      // Check if it's in our database first
      const cached = await db('venues').where('id', venueId).first();
      if (cached) {
        return this.mapDbRowToVenue(cached);
      }

      // Try Google Places
      const googleVenue = await this.googlePlacesClient.getVenueDetails(venueId);
      if (googleVenue) {
        // Cache the venue
        await this.cacheVenue(googleVenue);
        return googleVenue;
      }

      // Try Yelp
      if (this.yelpClient.isConfigured()) {
        const yelpVenue = await this.yelpClient.getBusinessDetails(venueId);
        if (yelpVenue) {
          await this.cacheVenue(yelpVenue);
          return yelpVenue;
        }
      }

      return null;
    } catch (error: any) {
      logger.error('Error getting venue details:', error);
      return null;
    }
  }

  /**
   * Create a new date plan
   */
  async createDatePlan(userId: string, dto: CreateDatePlanDto): Promise<DatePlan> {
    try {
      // Verify match exists and user is part of it
      const match = await this.verifyMatchAccess(userId, dto.matchId);
      if (!match) {
        throw new Error('Match not found or access denied');
      }

      const id = uuidv4();
      const now = new Date();

      // Prepare venues data
      const venuesJson = JSON.stringify(dto.venues);

      // Calculate estimated budget if not provided
      let estimatedBudget = dto.estimatedBudget;
      if (!estimatedBudget && dto.venues.length > 0) {
        const venueIds = dto.venues.map((v) => v.venueId);
        const venues = await db('venues').whereIn('id', venueIds);
        if (venues.length > 0) {
          estimatedBudget = calculateEstimatedBudget(venues.map(this.mapDbRowToVenue));
        }
      }

      await db('date_plans').insert({
        id,
        user_id: userId,
        match_id: dto.matchId,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        venues: venuesJson,
        estimated_budget: estimatedBudget,
        status: DATE_PLAN_STATUS.DRAFT,
        shared_with_match: false,
        created_at: now,
        updated_at: now,
      });

      return this.getDatePlanById(id);
    } catch (error: any) {
      logger.error('Error creating date plan:', error);
      throw new Error(error.message || 'Failed to create date plan');
    }
  }

  /**
   * Update an existing date plan
   */
  async updateDatePlan(
    userId: string,
    planId: string,
    dto: DatePlanUpdateInput
  ): Promise<DatePlan> {
    try {
      const existing = await this.getDatePlanById(planId);
      if (!existing) {
        throw new Error('Date plan not found');
      }

      if (existing.userId !== userId) {
        throw new Error('Access denied');
      }

      if (existing.status === DATE_PLAN_STATUS.COMPLETED) {
        throw new Error('Cannot update a completed date plan');
      }

      const updates: Record<string, any> = {
        updated_at: new Date(),
      };

      if (dto.title !== undefined) updates.title = dto.title;
      if (dto.description !== undefined) updates.description = dto.description;
      if (dto.date !== undefined) updates.date = new Date(dto.date);
      if (dto.venues !== undefined) updates.venues = JSON.stringify(dto.venues);
      if (dto.estimatedBudget !== undefined) updates.estimated_budget = dto.estimatedBudget;
      if (dto.status !== undefined) updates.status = dto.status;

      await db('date_plans').where('id', planId).update(updates);

      return this.getDatePlanById(planId);
    } catch (error: any) {
      logger.error('Error updating date plan:', error);
      throw new Error(error.message || 'Failed to update date plan');
    }
  }

  /**
   * Get user's date plans
   */
  async getMyDatePlans(userId: string, status?: DatePlanStatus): Promise<DatePlan[]> {
    try {
      let query = db('date_plans').where('user_id', userId).orderBy('date', 'desc');

      if (status) {
        query = query.where('status', status);
      }

      const rows = await query;
      return rows.map(this.mapDbRowToDatePlan);
    } catch (error: any) {
      logger.error('Error getting date plans:', error);
      throw new Error('Failed to retrieve date plans');
    }
  }

  /**
   * Get a single date plan by ID
   */
  async getDatePlanById(planId: string): Promise<DatePlan | null> {
    try {
      const row = await db('date_plans').where('id', planId).first();
      if (!row) return null;
      return this.mapDbRowToDatePlan(row);
    } catch (error: any) {
      logger.error('Error getting date plan:', error);
      return null;
    }
  }

  /**
   * Get date plan with venue details
   */
  async getDatePlanWithVenues(userId: string, planId: string): Promise<DatePlan | null> {
    try {
      const datePlan = await this.getDatePlanById(planId);
      if (!datePlan) return null;

      // Check access
      const match = await this.verifyMatchAccess(userId, datePlan.matchId);
      if (!match && datePlan.userId !== userId) {
        throw new Error('Access denied');
      }

      // Load venue details
      if (datePlan.venues.length > 0) {
        const venueIds = datePlan.venues.map((v) => v.venueId);
        const venues = await db('venues').whereIn('id', venueIds);
        const venueMap = new Map(venues.map((v: any) => [v.id, this.mapDbRowToVenue(v)]));

        datePlan.venues = datePlan.venues.map((dpv) => ({
          ...dpv,
          venue: venueMap.get(dpv.venueId),
        }));
      }

      return datePlan;
    } catch (error: any) {
      logger.error('Error getting date plan with venues:', error);
      throw new Error(error.message || 'Failed to retrieve date plan');
    }
  }

  /**
   * Share date plan with match
   */
  async sharePlanWithMatch(userId: string, planId: string): Promise<void> {
    try {
      const datePlan = await this.getDatePlanById(planId);
      if (!datePlan) {
        throw new Error('Date plan not found');
      }

      if (datePlan.userId !== userId) {
        throw new Error('Access denied');
      }

      if (datePlan.sharedWithMatch) {
        throw new Error('Date plan is already shared');
      }

      if (datePlan.venues.length === 0) {
        throw new Error('Cannot share a date plan without venues');
      }

      await db('date_plans').where('id', planId).update({
        shared_with_match: true,
        shared_at: new Date(),
        status: DATE_PLAN_STATUS.CONFIRMED,
        updated_at: new Date(),
      });

      // TODO: Send notification to match
      logger.info(`Date plan ${planId} shared with match`);
    } catch (error: any) {
      logger.error('Error sharing date plan:', error);
      throw new Error(error.message || 'Failed to share date plan');
    }
  }

  /**
   * Mark date plan as completed with feedback
   */
  async completeDatePlan(userId: string, planId: string, feedback: DateFeedbackDto): Promise<void> {
    try {
      const datePlan = await this.getDatePlanById(planId);
      if (!datePlan) {
        throw new Error('Date plan not found');
      }

      // Allow either user in the match to complete
      const match = await this.verifyMatchAccess(userId, datePlan.matchId);
      if (!match && datePlan.userId !== userId) {
        throw new Error('Access denied');
      }

      if (datePlan.status === DATE_PLAN_STATUS.COMPLETED) {
        throw new Error('Date plan is already completed');
      }

      const feedbackData: DateFeedback = {
        rating: feedback.rating,
        notes: feedback.notes,
        wouldRecommend: feedback.wouldRecommend,
        submittedAt: new Date(),
      };

      await db('date_plans')
        .where('id', planId)
        .update({
          status: DATE_PLAN_STATUS.COMPLETED,
          completed_at: new Date(),
          feedback: JSON.stringify(feedbackData),
          updated_at: new Date(),
        });

      logger.info(`Date plan ${planId} completed with rating ${feedback.rating}`);
    } catch (error: any) {
      logger.error('Error completing date plan:', error);
      throw new Error(error.message || 'Failed to complete date plan');
    }
  }

  /**
   * Delete a date plan
   */
  async deleteDatePlan(userId: string, planId: string): Promise<void> {
    try {
      const datePlan = await this.getDatePlanById(planId);
      if (!datePlan) {
        throw new Error('Date plan not found');
      }

      if (datePlan.userId !== userId) {
        throw new Error('Access denied');
      }

      await db('date_plans').where('id', planId).delete();
      logger.info(`Date plan ${planId} deleted`);
    } catch (error: any) {
      logger.error('Error deleting date plan:', error);
      throw new Error(error.message || 'Failed to delete date plan');
    }
  }

  /**
   * Generate AI-powered date ideas
   */
  private async generateDateIdeas(
    preferences: DatePreferencesDto,
    userProfile: any,
    matchProfile: any
  ): Promise<DateIdea[]> {
    const ideas: DateIdea[] = [];

    // Romantic dinner date
    if (!preferences.mood || preferences.mood === DATE_MOODS.ROMANTIC) {
      ideas.push({
        id: uuidv4(),
        title: 'Romantic Dinner Experience',
        description: 'An intimate evening at a fine dining restaurant with candlelit ambiance',
        suggestedVenues: [],
        estimatedBudget: 150,
        duration: '2-3 hours',
        mood: DATE_MOODS.ROMANTIC,
        activities: ['Fine dining', 'Wine tasting', 'Sunset views'],
        bestFor: ['anniversary', 'special occasion', 'romantic evening'],
      });
    }

    // Adventure date
    if (!preferences.mood || preferences.mood === DATE_MOODS.ADVENTUROUS) {
      ideas.push({
        id: uuidv4(),
        title: 'Adventure Day Out',
        description: 'An exciting day of outdoor activities followed by a casual dinner',
        suggestedVenues: [],
        estimatedBudget: 100,
        duration: '4-6 hours',
        mood: DATE_MOODS.ADVENTUROUS,
        activities: ['Hiking', 'Kayaking', 'Outdoor dining'],
        bestFor: ['active couples', 'weekend date', 'nature lovers'],
      });
    }

    // Cultural date
    if (!preferences.mood || preferences.mood === DATE_MOODS.CULTURAL) {
      ideas.push({
        id: uuidv4(),
        title: 'Cultural Exploration',
        description: 'Discover art, history, and culture together',
        suggestedVenues: [],
        estimatedBudget: 80,
        duration: '3-4 hours',
        mood: DATE_MOODS.CULTURAL,
        activities: ['Museum visit', 'Art gallery', 'Cultural café'],
        bestFor: ['intellectual connection', 'weekend afternoon', 'art lovers'],
      });
    }

    // Fun casual date
    if (!preferences.mood || preferences.mood === DATE_MOODS.FUN) {
      ideas.push({
        id: uuidv4(),
        title: 'Fun Night Out',
        description: "Laugh, play, and enjoy each other's company",
        suggestedVenues: [],
        estimatedBudget: 75,
        duration: '3-4 hours',
        mood: DATE_MOODS.FUN,
        activities: ['Comedy show', 'Bowling', 'Arcade games'],
        bestFor: ['first date', 'casual outing', 'breaking the ice'],
      });
    }

    // Luxury experience
    if (!preferences.mood || preferences.mood === DATE_MOODS.LUXURIOUS) {
      ideas.push({
        id: uuidv4(),
        title: 'Luxury Experience',
        description: 'Indulge in the finest experiences your city has to offer',
        suggestedVenues: [],
        estimatedBudget: 300,
        duration: '4-5 hours',
        mood: DATE_MOODS.LUXURIOUS,
        activities: ['Spa treatment', 'Michelin dining', 'Champagne lounge'],
        bestFor: ['special celebration', 'treating someone special', 'memorable experience'],
      });
    }

    // Load suggested venues for each idea based on location
    if (preferences.location) {
      for (const idea of ideas) {
        try {
          const venueType = this.moodToVenueType(idea.mood);
          const venues = await this.searchVenues({
            location: preferences.location,
            type: venueType,
            budget: preferences.budget === 'any' ? undefined : preferences.budget,
          });
          idea.suggestedVenues = venues.slice(0, 3);
        } catch (error) {
          // Continue without venues if search fails
          logger.warn('Failed to load venues for date idea:', error);
        }
      }
    }

    return ideas;
  }

  /**
   * Map mood to primary venue type
   */
  private moodToVenueType(mood: string): VenueType {
    const mapping: Record<string, VenueType> = {
      romantic: VENUE_TYPES.RESTAURANT,
      adventurous: VENUE_TYPES.ACTIVITY,
      casual: VENUE_TYPES.BAR,
      luxurious: VENUE_TYPES.RESTAURANT,
      cultural: VENUE_TYPES.ACTIVITY,
      fun: VENUE_TYPES.ENTERTAINMENT,
    };
    return mapping[mood] || VENUE_TYPES.RESTAURANT;
  }

  /**
   * Cache venue in database
   */
  private async cacheVenue(venue: Venue): Promise<void> {
    try {
      const existing = await db('venues')
        .where('external_id', venue.externalId)
        .andWhere('external_source', venue.externalSource)
        .first();

      if (existing) {
        await db('venues')
          .where('id', existing.id)
          .update({
            name: venue.name,
            type: venue.type,
            address: venue.address,
            city: venue.city,
            price_range: venue.priceRange,
            rating: venue.rating,
            image_url: venue.imageUrl,
            metadata: JSON.stringify(venue.metadata),
            updated_at: new Date(),
          });
      } else {
        await db('venues').insert({
          id: venue.id,
          name: venue.name,
          type: venue.type,
          address: venue.address,
          city: venue.city,
          price_range: venue.priceRange,
          rating: venue.rating,
          image_url: venue.imageUrl,
          external_id: venue.externalId,
          external_source: venue.externalSource,
          metadata: JSON.stringify(venue.metadata),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } catch (error: any) {
      logger.warn('Failed to cache venue:', error.message);
    }
  }

  /**
   * Get user profile
   */
  private async getUserProfile(userId: string): Promise<any> {
    const profile = await db('profiles').where('user_id', userId).first();
    return profile || {};
  }

  /**
   * Get match profile (the other person)
   */
  private async getMatchProfile(matchId: string, userId: string): Promise<any> {
    const match = await db('matches').where('id', matchId).first();
    if (!match) return {};

    const matchedUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const profile = await db('profiles').where('user_id', matchedUserId).first();
    return profile || {};
  }

  /**
   * Verify user has access to match
   */
  private async verifyMatchAccess(userId: string, matchId: string): Promise<any> {
    const match = await db('matches')
      .where('id', matchId)
      .andWhere(function () {
        this.where('user1_id', userId).orWhere('user2_id', userId);
      })
      .andWhere('is_active', true)
      .first();

    return match;
  }

  /**
   * Map database row to DatePlan entity
   */
  private mapDbRowToDatePlan(row: any): DatePlan {
    let venues: DatePlanVenue[] = [];
    try {
      venues = typeof row.venues === 'string' ? JSON.parse(row.venues) : row.venues || [];
    } catch {
      venues = [];
    }

    let feedback: DateFeedback | undefined;
    try {
      feedback = row.feedback
        ? typeof row.feedback === 'string'
          ? JSON.parse(row.feedback)
          : row.feedback
        : undefined;
    } catch {
      feedback = undefined;
    }

    return {
      id: row.id,
      userId: row.user_id,
      matchId: row.match_id,
      title: row.title,
      description: row.description,
      date: new Date(row.date),
      venues,
      estimatedBudget: row.estimated_budget,
      status: row.status,
      sharedWithMatch: row.shared_with_match,
      sharedAt: row.shared_at ? new Date(row.shared_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      feedback,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Map database row to Venue entity
   */
  private mapDbRowToVenue(row: any): Venue {
    let metadata = {};
    try {
      metadata = row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : {};
    } catch {
      metadata = {};
    }

    return {
      id: row.id,
      name: row.name,
      type: row.type,
      address: row.address,
      city: row.city,
      priceRange: row.price_range,
      rating: row.rating,
      imageUrl: row.image_url,
      externalId: row.external_id,
      externalSource: row.external_source,
      metadata,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
