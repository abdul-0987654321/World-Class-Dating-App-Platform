import { Knex } from 'knex';

import {
  TravelDestinationEntity,
  TravelHistoryEntity,
  PopularDestinationEntity,
  TravelModeSettingsEntity,
  TravelBuddyPreferencesEntity,
  LocationChangeEntity,
  CreateTravelDestinationDto,
  UpdateTravelDestinationDto,
  CreateLocationChangeDto,
  UpdateTravelBuddyPreferencesDto,
  UpdateTravelModeSettingsDto,
  TravelDestinationResponse,
  TravelModeStatusResponse,
  PopularDestinationResponse,
} from '../entities/TravelMode.entity';

export class TravelModeService {
  constructor(private db: Knex) {}

  // Travel Destination Management
  async createTravelDestination(
    userId: string,
    data: CreateTravelDestinationDto
  ): Promise<TravelDestinationEntity> {
    // Check user's travel mode settings
    const settings = await this.getTravelModeSettings(userId);

    // Check if user can add more destinations
    const activeDestinations = await this.db('travel_destinations')
      .where({ user_id: userId, status: 'scheduled' })
      .orWhere({ user_id: userId, status: 'active' })
      .count('* as count')
      .first();

    if (
      activeDestinations &&
      Number(activeDestinations.count) >= settings.max_simultaneous_destinations
    ) {
      throw new Error(
        `Maximum ${settings.max_simultaneous_destinations} simultaneous destinations allowed. Upgrade to premium for more.`
      );
    }

    // Validate dates
    const now = new Date();
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (startDate < now) {
      throw new Error('Start date cannot be in the past');
    }

    if (endDate <= startDate) {
      throw new Error('End date must be after start date');
    }

    // Determine if this is premium travel
    const subscription = await this.db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .whereIn('tier', ['mid', 'ultra'])
      .first();

    const isPremiumTravel = !!subscription;

    // Create destination
    const [destination] = await this.db('travel_destinations')
      .insert({
        user_id: userId,
        ...data,
        is_premium_travel: isPremiumTravel,
        status: 'scheduled',
      })
      .returning('*');

    // Log location change
    await this.logLocationChange(userId, {
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      change_type: 'travel_mode',
    });

    // Update popular destinations
    await this.updatePopularDestination(data.city, data.country);

    return destination;
  }

  async getTravelDestinations(userId: string): Promise<TravelDestinationEntity[]> {
    return this.db('travel_destinations')
      .where({ user_id: userId })
      .whereNot({ status: 'cancelled' })
      .orderBy('start_date', 'asc');
  }

  async getActiveTravelDestination(userId: string): Promise<TravelDestinationEntity | null> {
    const destination = await this.db('travel_destinations')
      .where({ user_id: userId, is_active: true, status: 'active' })
      .first();

    return destination || null;
  }

  async updateTravelDestination(
    destinationId: string,
    userId: string,
    data: UpdateTravelDestinationDto
  ): Promise<TravelDestinationEntity> {
    // Verify ownership
    const existing = await this.db('travel_destinations')
      .where({ id: destinationId, user_id: userId })
      .first();

    if (!existing) {
      throw new Error('Destination not found');
    }

    // Validate date changes if provided
    if (data.start_date || data.end_date) {
      const startDate = new Date(data.start_date || existing.start_date);
      const endDate = new Date(data.end_date || existing.end_date);

      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }

    const [updated] = await this.db('travel_destinations')
      .where({ id: destinationId })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  async cancelTravelDestination(destinationId: string, userId: string): Promise<void> {
    await this.db('travel_destinations').where({ id: destinationId, user_id: userId }).update({
      status: 'cancelled',
      is_active: false,
      updated_at: this.db.fn.now(),
    });
  }

  // Automatic location switching based on travel dates
  async activateTravelDestinations(): Promise<void> {
    const now = new Date();

    // Activate destinations whose start date has arrived
    const destinationsToActivate = await this.db('travel_destinations')
      .where({ status: 'scheduled' })
      .where('start_date', '<=', now)
      .whereRaw("start_date >= NOW() - INTERVAL '1 day'");

    for (const destination of destinationsToActivate) {
      // Deactivate other destinations for this user
      await this.db('travel_destinations')
        .where({ user_id: destination.user_id })
        .whereNot({ id: destination.id })
        .update({ is_active: false });

      // Activate this destination
      await this.db('travel_destinations').where({ id: destination.id }).update({
        status: 'active',
        is_active: true,
        updated_at: this.db.fn.now(),
      });
    }

    // Complete destinations whose end date has passed
    await this.db('travel_destinations')
      .where({ status: 'active' })
      .where('end_date', '<', now)
      .update({
        status: 'completed',
        is_active: false,
        updated_at: this.db.fn.now(),
      });
  }

  // Travel Mode Settings
  async getTravelModeSettings(userId: string): Promise<TravelModeSettingsEntity> {
    let settings = await this.db('travel_mode_settings').where({ user_id: userId }).first();

    if (!settings) {
      // Create default settings
      [settings] = await this.db('travel_mode_settings')
        .insert({
          user_id: userId,
          travel_mode_enabled: false,
          unlimited_passport_enabled: false,
          auto_location_switch: true,
          notify_local_matches: true,
          show_travel_badge: true,
          max_simultaneous_destinations: 1,
          passport_changes_remaining: 0,
          notify_before_arrival: true,
          notify_days_before: 3,
        })
        .returning('*');
    }

    return settings;
  }

  async updateTravelModeSettings(
    userId: string,
    data: UpdateTravelModeSettingsDto
  ): Promise<TravelModeSettingsEntity> {
    const existing = await this.getTravelModeSettings(userId);

    const [updated] = await this.db('travel_mode_settings')
      .where({ id: existing.id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  // Passport Feature (Change location anytime)
  async changeLocationWithPassport(userId: string, data: CreateLocationChangeDto): Promise<void> {
    const settings = await this.getTravelModeSettings(userId);

    if (!settings.unlimited_passport_enabled) {
      // Check if user has passport changes remaining
      if (settings.passport_changes_remaining <= 0) {
        throw new Error(
          'No passport changes remaining. Upgrade to premium for unlimited passport.'
        );
      }

      // Decrement passport changes
      await this.db('travel_mode_settings')
        .where({ user_id: userId })
        .decrement('passport_changes_remaining', 1);
    }

    // Log the location change
    await this.logLocationChange(userId, data);

    // Update user's current location in profile
    await this.db('profiles').where({ user_id: userId }).update({
      city: data.city,
      country: data.country,
      latitude: data.latitude,
      longitude: data.longitude,
      updated_at: this.db.fn.now(),
    });
  }

  // Location Change Logging
  async logLocationChange(
    userId: string,
    data: CreateLocationChangeDto
  ): Promise<LocationChangeEntity> {
    const subscription = await this.db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .whereIn('tier', ['mid', 'ultra'])
      .first();

    const [change] = await this.db('location_changes')
      .insert({
        user_id: userId,
        ...data,
        is_premium: !!subscription,
      })
      .returning('*');

    return change;
  }

  async getLocationHistory(userId: string, limit: number = 20): Promise<LocationChangeEntity[]> {
    return this.db('location_changes')
      .where({ user_id: userId })
      .orderBy('changed_at', 'desc')
      .limit(limit);
  }

  // Travel History
  async getTravelHistory(userId: string): Promise<TravelHistoryEntity[]> {
    return this.db('travel_history').where({ user_id: userId }).orderBy('visited_at', 'desc');
  }

  async addTravelHistory(destinationId: string): Promise<TravelHistoryEntity> {
    const destination = await this.db('travel_destinations').where({ id: destinationId }).first();

    if (!destination) {
      throw new Error('Destination not found');
    }

    // Get matches and connections made during travel
    const matchesCount = await this.db('matches')
      .where({ user_id: destination.user_id })
      .whereBetween('created_at', [destination.start_date, destination.end_date])
      .count('* as count')
      .first();

    const [history] = await this.db('travel_history')
      .insert({
        user_id: destination.user_id,
        destination_id: destinationId,
        city: destination.city,
        country: destination.country,
        visited_at: destination.end_date,
        matches_made: matchesCount?.count || 0,
        connections_made: 0, // Can be updated based on conversations
      })
      .returning('*');

    return history;
  }

  // Popular Destinations
  async getPopularDestinations(limit: number = 20): Promise<PopularDestinationResponse[]> {
    const destinations = await this.db('popular_destinations')
      .orderBy('popularity_score', 'desc')
      .limit(limit);

    return destinations;
  }

  async updatePopularDestination(city: string, country: string): Promise<void> {
    const existing = await this.db('popular_destinations').where({ city, country }).first();

    if (existing) {
      await this.db('popular_destinations')
        .where({ id: existing.id })
        .increment('traveler_count', 1)
        .increment('active_travelers', 1);
    }
  }

  // Travel Buddy Preferences
  async getTravelBuddyPreferences(userId: string): Promise<TravelBuddyPreferencesEntity> {
    let preferences = await this.db('travel_buddy_preferences').where({ user_id: userId }).first();

    if (!preferences) {
      [preferences] = await this.db('travel_buddy_preferences')
        .insert({
          user_id: userId,
          looking_for_travel_buddy: false,
        })
        .returning('*');
    }

    return preferences;
  }

  async updateTravelBuddyPreferences(
    userId: string,
    data: UpdateTravelBuddyPreferencesDto
  ): Promise<TravelBuddyPreferencesEntity> {
    const existing = await this.getTravelBuddyPreferences(userId);

    const [updated] = await this.db('travel_buddy_preferences')
      .where({ id: existing.id })
      .update({
        ...data,
        updated_at: this.db.fn.now(),
      })
      .returning('*');

    return updated;
  }

  // Helper: Get Travel Mode Status
  async getTravelModeStatus(userId: string): Promise<TravelModeStatusResponse> {
    const currentDestination = await this.getActiveTravelDestination(userId);
    const allDestinations = await this.getTravelDestinations(userId);
    const settings = await this.getTravelModeSettings(userId);
    const historyCount = await this.db('travel_history')
      .where({ user_id: userId })
      .count('* as count')
      .first();

    const now = new Date();
    const upcomingDestinations = allDestinations
      .filter((d) => d.status === 'scheduled' && new Date(d.start_date) > now)
      .map((d) => this.formatDestinationResponse(d));

    return {
      is_traveling: !!currentDestination,
      current_destination: currentDestination
        ? this.formatDestinationResponse(currentDestination)
        : undefined,
      upcoming_destinations: upcomingDestinations,
      travel_history_count: Number(historyCount?.count || 0),
      settings,
    };
  }

  // Helper: Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  // Helper: Format destination response
  private formatDestinationResponse(
    destination: TravelDestinationEntity
  ): TravelDestinationResponse {
    const now = new Date();
    const startDate = new Date(destination.start_date);
    const endDate = new Date(destination.end_date);

    const daysUntilArrival =
      startDate > now
        ? Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

    const daysRemaining =
      destination.status === 'active'
        ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

    return {
      id: destination.id,
      city: destination.city,
      state: destination.state,
      country: destination.country,
      country_code: destination.country_code,
      airport_code: destination.airport_code,
      latitude: destination.latitude,
      longitude: destination.longitude,
      timezone: destination.timezone,
      start_date: destination.start_date,
      end_date: destination.end_date,
      status: destination.status,
      is_active: destination.is_active,
      show_on_profile: destination.show_on_profile,
      match_before_arrival: destination.match_before_arrival,
      is_premium_travel: destination.is_premium_travel,
      travel_notes: destination.travel_notes,
      days_until_arrival: daysUntilArrival,
      days_remaining: daysRemaining,
      created_at: destination.created_at,
    };
  }

  // Helper: Check if user can use travel mode features
  async canUseTravelMode(userId: string): Promise<boolean> {
    const subscription = await this.db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .first();

    // Travel mode available for all tiers, but features vary
    return !!subscription || true; // Free users get basic travel mode
  }

  // Helper: Get premium travel features
  async getPremiumTravelFeatures(userId: string): Promise<{
    unlimited_passport: boolean;
    max_destinations: number;
    travel_buddy_matching: boolean;
    travel_history: boolean;
  }> {
    const subscription = await this.db('subscriptions')
      .where({ user_id: userId, status: 'active' })
      .first();

    const tier = subscription?.tier || 'free';

    const features = {
      free: {
        unlimited_passport: false,
        max_destinations: 1,
        travel_buddy_matching: false,
        travel_history: false,
      },
      basic: {
        unlimited_passport: false,
        max_destinations: 1,
        travel_buddy_matching: false,
        travel_history: true,
      },
      mid: {
        unlimited_passport: true,
        max_destinations: 3,
        travel_buddy_matching: true,
        travel_history: true,
      },
      ultra: {
        unlimited_passport: true,
        max_destinations: 10,
        travel_buddy_matching: true,
        travel_history: true,
      },
    };

    return features[tier as keyof typeof features];
  }
}
