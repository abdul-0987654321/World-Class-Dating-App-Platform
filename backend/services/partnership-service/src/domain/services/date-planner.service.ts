import { createLogger } from '@flamoral/backend-shared';

import { db } from '../../infrastructure/database/connection';
import { DatePlanSuggestion, DateActivity } from '../../types';

import { EventsService } from './events.service';
import { GiftsService } from './gifts.service';
import { RestaurantService } from './restaurant.service';

const logger = createLogger('date-planner-service');

interface DatePlannerOptions {
  budget?: number;
  duration?: 'short' | 'medium' | 'long'; // 1-2 hrs, 2-4 hrs, 4+ hrs
  vibe?: 'romantic' | 'adventurous' | 'casual' | 'fancy';
  includeFood?: boolean;
  includeActivity?: boolean;
  includeGift?: boolean;
  specificInterests?: string[];
}

interface UserPreferences {
  cuisinePreferences?: string[];
  activityPreferences?: string[];
  pricePreference?: 'budget' | 'moderate' | 'splurge';
}

export class DatePlannerService {
  private restaurantService: RestaurantService;
  private eventsService: EventsService;
  private giftsService: GiftsService;

  constructor(
    restaurantService?: RestaurantService,
    eventsService?: EventsService,
    giftsService?: GiftsService
  ) {
    this.restaurantService = restaurantService || new RestaurantService();
    this.eventsService = eventsService || new EventsService();
    this.giftsService = giftsService || new GiftsService();
  }

  /**
   * Generate personalized date plan suggestions
   */
  async generateDatePlans(
    userId: string,
    matchId: string | undefined,
    latitude: number,
    longitude: number,
    date: string,
    options: DatePlannerOptions
  ): Promise<DatePlanSuggestion[]> {
    const budget = options.budget || 150;
    const suggestions: DatePlanSuggestion[] = [];

    try {
      // Generate different types of date plans
      if (options.vibe === 'romantic' || !options.vibe) {
        const romanticPlan = await this.createRomanticDatePlan(
          userId,
          matchId,
          latitude,
          longitude,
          date,
          budget
        );
        if (romanticPlan) suggestions.push(romanticPlan);
      }

      if (options.vibe === 'adventurous' || !options.vibe) {
        const adventurePlan = await this.createAdventureDatePlan(
          userId,
          matchId,
          latitude,
          longitude,
          date,
          budget
        );
        if (adventurePlan) suggestions.push(adventurePlan);
      }

      if (options.vibe === 'casual' || !options.vibe) {
        const casualPlan = await this.createCasualDatePlan(
          userId,
          matchId,
          latitude,
          longitude,
          date,
          budget
        );
        if (casualPlan) suggestions.push(casualPlan);
      }

      if (options.vibe === 'fancy' || !options.vibe) {
        const fancyPlan = await this.createFancyDatePlan(
          userId,
          matchId,
          latitude,
          longitude,
          date,
          budget * 1.5 // Allow more budget for fancy dates
        );
        if (fancyPlan) suggestions.push(fancyPlan);
      }

      // Store suggestions in database
      for (const suggestion of suggestions) {
        await this.saveSuggestion(suggestion);
      }

      return suggestions;
    } catch (error: any) {
      logger.error('Failed to generate date plans', {
        userId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create a romantic dinner date plan
   */
  private async createRomanticDatePlan(
    userId: string,
    matchId: string | undefined,
    latitude: number,
    longitude: number,
    date: string,
    budget: number
  ): Promise<DatePlanSuggestion | null> {
    const activities: DateActivity[] = [];
    let totalCost = 0;

    try {
      // Find romantic restaurants
      const restaurants = await this.restaurantService.getDateNightSuggestions(
        latitude,
        longitude,
        budget * 0.6 // 60% of budget for dinner
      );

      if (restaurants.length > 0) {
        const restaurant = restaurants[0];
        const estimatedDinnerCost = this.estimateDinnerCost(restaurant.priceRange);

        activities.push({
          order: 1,
          type: 'restaurant',
          name: `Dinner at ${restaurant.name}`,
          description: `${restaurant.cuisine?.join(', ')} - ${this.getPriceLabel(restaurant.priceRange)}`,
          resourceId: restaurant.id,
          estimatedDuration: '1.5-2 hours',
          estimatedCost: estimatedDinnerCost,
          bookingRequired: true,
          bookingUrl: `/partnerships/restaurants/${restaurant.partnerId}/${restaurant.externalId}`,
        });
        totalCost += estimatedDinnerCost;
      }

      // Add romantic gift suggestion
      const gifts = await this.giftsService.getRomanticSuggestions(budget * 0.25);
      if (gifts.length > 0) {
        const gift = gifts[0];
        activities.push({
          order: 2,
          type: 'gift',
          name: `Surprise: ${gift.name}`,
          description: gift.description,
          resourceId: gift.externalId,
          estimatedDuration: 'N/A',
          estimatedCost: gift.price,
          bookingRequired: true,
          bookingUrl: `/partnerships/gifts/${gift.partnerId}/${gift.externalId}`,
        });
        totalCost += gift.price;
      }

      if (activities.length === 0) {
        return null;
      }

      return {
        id: this.generateId(),
        userId,
        matchId,
        title: 'Romantic Evening',
        description: 'A classic romantic dinner date with a thoughtful surprise',
        budget: { min: totalCost * 0.8, max: totalCost * 1.2, currency: 'USD' },
        duration: '2-3 hours',
        activities,
        totalEstimatedCost: totalCost,
        romanticScore: 9,
        adventureScore: 3,
        createdAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to create romantic date plan', { error: error.message });
      return null;
    }
  }

  /**
   * Create an adventure date plan
   */
  private async createAdventureDatePlan(
    userId: string,
    matchId: string | undefined,
    latitude: number,
    longitude: number,
    date: string,
    budget: number
  ): Promise<DatePlanSuggestion | null> {
    const activities: DateActivity[] = [];
    let totalCost = 0;

    try {
      // Find adventure events
      const events = await this.eventsService.getDateFriendlyEvents(
        latitude,
        longitude,
        date,
        budget * 0.5
      );

      const adventureEvents = events.filter((e) =>
        ['experiences', 'classes', 'comedy'].includes(e.category)
      );

      if (adventureEvents.length > 0) {
        const event = adventureEvents[0];
        const ticketCost = event.priceRange.min * 2; // Two tickets

        activities.push({
          order: 1,
          type: 'event',
          name: event.name,
          description: `${event.category} at ${event.venue?.name || 'TBD'}`,
          resourceId: event.id,
          estimatedDuration: '2-3 hours',
          estimatedCost: ticketCost,
          bookingRequired: true,
          bookingUrl: `/partnerships/events/${event.partnerId}/${event.externalId}`,
        });
        totalCost += ticketCost;
      }

      // Add casual dinner after
      const restaurants = await this.restaurantService.searchRestaurants(userId, {
        latitude,
        longitude,
        date,
        time: '20:00',
        partySize: 2,
        priceRange: [1, 2],
        radiusMiles: 5,
      });

      const casualRestaurants = restaurants.flatMap((r) => r.restaurants);
      if (casualRestaurants.length > 0) {
        const restaurant = casualRestaurants[0];
        const dinnerCost = this.estimateDinnerCost(restaurant.priceRange);

        activities.push({
          order: 2,
          type: 'restaurant',
          name: `Dinner at ${restaurant.name}`,
          description: 'Wind down with a casual meal',
          resourceId: restaurant.id,
          estimatedDuration: '1-1.5 hours',
          estimatedCost: dinnerCost,
          bookingRequired: false,
        });
        totalCost += dinnerCost;
      }

      if (activities.length === 0) {
        return null;
      }

      return {
        id: this.generateId(),
        userId,
        matchId,
        title: 'Adventure Date',
        description: 'Try something new together and create memorable experiences',
        budget: { min: totalCost * 0.8, max: totalCost * 1.2, currency: 'USD' },
        duration: '3-4 hours',
        activities,
        totalEstimatedCost: totalCost,
        romanticScore: 6,
        adventureScore: 9,
        createdAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to create adventure date plan', { error: error.message });
      return null;
    }
  }

  /**
   * Create a casual date plan
   */
  private async createCasualDatePlan(
    userId: string,
    matchId: string | undefined,
    latitude: number,
    longitude: number,
    date: string,
    budget: number
  ): Promise<DatePlanSuggestion | null> {
    const activities: DateActivity[] = [];
    let totalCost = 0;

    try {
      // Find casual dining
      const restaurants = await this.restaurantService.searchRestaurants(userId, {
        latitude,
        longitude,
        date,
        time: '18:30',
        partySize: 2,
        priceRange: [1, 2],
        radiusMiles: 5,
      });

      const casualSpots = restaurants.flatMap((r) => r.restaurants);
      if (casualSpots.length > 0) {
        const restaurant = casualSpots[0];
        const dinnerCost = this.estimateDinnerCost(restaurant.priceRange);

        activities.push({
          order: 1,
          type: 'restaurant',
          name: `${restaurant.name}`,
          description: `Casual ${restaurant.cuisine?.join(', ') || 'dining'}`,
          resourceId: restaurant.id,
          estimatedDuration: '1-1.5 hours',
          estimatedCost: dinnerCost,
          bookingRequired: false,
        });
        totalCost += dinnerCost;
      }

      // Look for casual events
      const events = await this.eventsService.getDateFriendlyEvents(
        latitude,
        longitude,
        date,
        budget * 0.3
      );

      const casualEvents = events.filter(
        (e) =>
          e.priceRange.min < 30 && ['food_drink', 'classes', 'experiences'].includes(e.category)
      );

      if (casualEvents.length > 0) {
        const event = casualEvents[0];
        const ticketCost = event.priceRange.min * 2;

        activities.push({
          order: 2,
          type: 'event',
          name: event.name,
          description: 'Low-key activity to enjoy together',
          resourceId: event.id,
          estimatedDuration: '1-2 hours',
          estimatedCost: ticketCost,
          bookingRequired: false,
        });
        totalCost += ticketCost;
      }

      if (activities.length === 0) {
        return null;
      }

      return {
        id: this.generateId(),
        userId,
        matchId,
        title: 'Casual Hangout',
        description: 'Low-key vibes for getting to know each other',
        budget: { min: totalCost * 0.8, max: totalCost * 1.2, currency: 'USD' },
        duration: '2-3 hours',
        activities,
        totalEstimatedCost: totalCost,
        romanticScore: 5,
        adventureScore: 4,
        createdAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to create casual date plan', { error: error.message });
      return null;
    }
  }

  /**
   * Create a fancy/upscale date plan
   */
  private async createFancyDatePlan(
    userId: string,
    matchId: string | undefined,
    latitude: number,
    longitude: number,
    date: string,
    budget: number
  ): Promise<DatePlanSuggestion | null> {
    const activities: DateActivity[] = [];
    let totalCost = 0;

    try {
      // Find upscale restaurants
      const restaurants = await this.restaurantService.searchRestaurants(userId, {
        latitude,
        longitude,
        date,
        time: '19:30',
        partySize: 2,
        priceRange: [3, 4],
        dateNightOnly: true,
        minRating: 4.5,
        radiusMiles: 15,
      });

      const fineRestaurants = restaurants.flatMap((r) => r.restaurants);
      if (fineRestaurants.length > 0) {
        const restaurant = fineRestaurants.sort(
          (a, b) => (b.romanticScore || 0) - (a.romanticScore || 0)
        )[0];
        const dinnerCost = this.estimateDinnerCost(restaurant.priceRange);

        activities.push({
          order: 1,
          type: 'restaurant',
          name: `Fine Dining at ${restaurant.name}`,
          description: `${restaurant.cuisine?.join(', ')} - ${this.getPriceLabel(restaurant.priceRange)}`,
          resourceId: restaurant.id,
          estimatedDuration: '2-2.5 hours',
          estimatedCost: dinnerCost,
          bookingRequired: true,
          bookingUrl: `/partnerships/restaurants/${restaurant.partnerId}/${restaurant.externalId}`,
        });
        totalCost += dinnerCost;
      }

      // Look for upscale events (theater, concerts)
      const events = await this.eventsService.getDateFriendlyEvents(
        latitude,
        longitude,
        date,
        budget * 0.4
      );

      const upscaleEvents = events.filter(
        (e) => ['theater', 'concerts'].includes(e.category) && e.priceRange.min >= 50
      );

      if (upscaleEvents.length > 0) {
        const event = upscaleEvents[0];
        const ticketCost = event.priceRange.min * 2;

        activities.push({
          order: 2,
          type: 'event',
          name: event.name,
          description: `${event.category} at ${event.venue?.name}`,
          resourceId: event.id,
          estimatedDuration: '2-3 hours',
          estimatedCost: ticketCost,
          bookingRequired: true,
          bookingUrl: `/partnerships/events/${event.partnerId}/${event.externalId}`,
        });
        totalCost += ticketCost;
      }

      // Premium gift
      const gifts = await this.giftsService.getRomanticSuggestions(budget * 0.2);
      const premiumGifts = gifts.filter((g) => g.price >= 60);
      if (premiumGifts.length > 0) {
        const gift = premiumGifts[0];
        activities.push({
          order: 3,
          type: 'gift',
          name: `${gift.name}`,
          description: 'A luxurious surprise',
          resourceId: gift.externalId,
          estimatedDuration: 'N/A',
          estimatedCost: gift.price,
          bookingRequired: true,
          bookingUrl: `/partnerships/gifts/${gift.partnerId}/${gift.externalId}`,
        });
        totalCost += gift.price;
      }

      if (activities.length === 0) {
        return null;
      }

      return {
        id: this.generateId(),
        userId,
        matchId,
        title: 'Luxury Experience',
        description: 'An unforgettable upscale evening',
        budget: { min: totalCost * 0.9, max: totalCost * 1.3, currency: 'USD' },
        duration: '4-5 hours',
        activities,
        totalEstimatedCost: totalCost,
        romanticScore: 10,
        adventureScore: 5,
        createdAt: new Date(),
      };
    } catch (error: any) {
      logger.error('Failed to create fancy date plan', { error: error.message });
      return null;
    }
  }

  /**
   * Get saved date plan suggestions for a user
   */
  async getUserSuggestions(userId: string, matchId?: string): Promise<DatePlanSuggestion[]> {
    let query = db('date_plan_suggestions')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(20);

    if (matchId) {
      query = query.where('match_id', matchId);
    }

    const rows = await query;
    return rows.map((r) => this.mapSuggestion(r));
  }

  /**
   * Save a suggestion to the database
   */
  private async saveSuggestion(suggestion: DatePlanSuggestion): Promise<void> {
    await db('date_plan_suggestions').insert({
      id: suggestion.id,
      user_id: suggestion.userId,
      match_id: suggestion.matchId,
      title: suggestion.title,
      description: suggestion.description,
      budget_min: suggestion.budget.min,
      budget_max: suggestion.budget.max,
      budget_currency: suggestion.budget.currency,
      duration: suggestion.duration,
      activities: JSON.stringify(suggestion.activities),
      total_estimated_cost: suggestion.totalEstimatedCost,
      romantic_score: suggestion.romanticScore,
      adventure_score: suggestion.adventureScore,
    });
  }

  /**
   * Estimate dinner cost based on price range
   */
  private estimateDinnerCost(priceRange: number): number {
    const costPerPerson: Record<number, number> = {
      1: 20,
      2: 40,
      3: 70,
      4: 120,
    };
    return (costPerPerson[priceRange] || 40) * 2; // For two people
  }

  /**
   * Get price label from range
   */
  private getPriceLabel(priceRange: number): string {
    const labels: Record<number, string> = {
      1: '$',
      2: '$$',
      3: '$$$',
      4: '$$$$',
    };
    return labels[priceRange] || '$$';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `dp_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Map database row to DatePlanSuggestion
   */
  private mapSuggestion(row: any): DatePlanSuggestion {
    return {
      id: row.id,
      userId: row.user_id,
      matchId: row.match_id,
      title: row.title,
      description: row.description,
      budget: {
        min: parseFloat(row.budget_min),
        max: parseFloat(row.budget_max),
        currency: row.budget_currency,
      },
      duration: row.duration,
      activities: typeof row.activities === 'string' ? JSON.parse(row.activities) : row.activities,
      totalEstimatedCost: parseFloat(row.total_estimated_cost),
      romanticScore: row.romantic_score,
      adventureScore: row.adventure_score,
      createdAt: row.created_at,
    };
  }
}

export default new DatePlannerService();
