import { UserRepository } from '../repositories/user.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { PromptRepository } from '../repositories/prompt.repository';
import { SwipeRepository } from '../repositories/swipe.repository';
import { MatchRepository } from '../repositories/match.repository';
import db from '../../infrastructure/database/connection';

export interface DiscoveryProfile {
  id: string;
  first_name: string;
  age: number;
  bio?: string;
  occupation?: string;
  city?: string;
  distance?: number;
  photos: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    position: number;
  }>;
  interests: string[];
  prompts: Array<{
    question: string;
    answer: string;
  }>;
  is_verified: boolean;
}

export interface DiscoveryFilters {
  age_min?: number;
  age_max?: number;
  distance_max?: number; // in km
  gender?: string;
}

export class DiscoveryService {
  private userRepository: UserRepository;
  private profileRepository: ProfileRepository;
  private photoRepository: PhotoRepository;
  private promptRepository: PromptRepository;
  private swipeRepository: SwipeRepository;
  private matchRepository: MatchRepository;

  constructor(
    userRepository?: UserRepository,
    profileRepository?: ProfileRepository,
    photoRepository?: PhotoRepository,
    promptRepository?: PromptRepository,
    swipeRepository?: SwipeRepository,
    matchRepository?: MatchRepository
  ) {
    this.userRepository = userRepository || new UserRepository();
    this.profileRepository = profileRepository || new ProfileRepository();
    this.photoRepository = photoRepository || new PhotoRepository();
    this.promptRepository = promptRepository || new PromptRepository();
    this.swipeRepository = swipeRepository || new SwipeRepository();
    this.matchRepository = matchRepository || new MatchRepository();
  }

  async getDiscoveryProfiles(
    userId: string,
    limit: number = 10,
    filters?: DiscoveryFilters
  ): Promise<DiscoveryProfile[]> {
    // Get user's own profile for location-based filtering
    const userProfile = await this.profileRepository.findByUserId(userId);
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Get users already swiped or matched
    const swipedUserIds = await this.swipeRepository.getSwipedUserIds(userId);
    const matchedUserIds = await this.matchRepository.getMatchedUserIds(userId);
    const excludedUserIds = [...new Set([...swipedUserIds, ...matchedUserIds, userId])];

    // Build query for candidate users with improved filtering
    let query = db('users')
      .select(
        'users.id',
        'users.first_name',
        'users.date_of_birth',
        'users.gender',
        'users.interests as user_interests',
        'users.last_active_at',
        'users.is_verified',
        'users.profile_completion_percentage',
        'profiles.bio',
        'profiles.occupation',
        'profiles.city',
        'profiles.latitude',
        'profiles.longitude',
        'profiles.interests as profile_interests',
        'profiles.is_photo_verified'
      )
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .whereNotIn('users.id', excludedUserIds)
      .where('users.is_active', true)
      .where('users.is_verified', true);

    // Apply age filters
    if (filters?.age_min) {
      const maxDateOfBirth = new Date();
      maxDateOfBirth.setFullYear(maxDateOfBirth.getFullYear() - filters.age_min);
      query = query.where('users.date_of_birth', '<=', maxDateOfBirth);
    }

    if (filters?.age_max) {
      const minDateOfBirth = new Date();
      minDateOfBirth.setFullYear(minDateOfBirth.getFullYear() - filters.age_max - 1);
      query = query.where('users.date_of_birth', '>', minDateOfBirth);
    }

    // Apply gender filter
    if (filters?.gender) {
      query = query.where('users.gender', filters.gender);
    }

    // Add distance calculation if user has location
    if (userProfile?.latitude && userProfile?.longitude) {
      const lat1 = userProfile.latitude;
      const lon1 = userProfile.longitude;

      query = query.select(
        db.raw(`
          ROUND(CAST(
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(?)) * cos(radians(profiles.latitude)) *
                cos(radians(profiles.longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(profiles.latitude))
              ))
            ) AS numeric
          ), 1) as distance
        `, [lat1, lon1, lat1])
      );

      // Apply distance filter if specified
      if (filters?.distance_max) {
        query = query
          .whereNotNull('profiles.latitude')
          .whereNotNull('profiles.longitude')
          .whereRaw(`
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(?)) * cos(radians(profiles.latitude)) *
                cos(radians(profiles.longitude) - radians(?)) +
                sin(radians(?)) * sin(radians(profiles.latitude))
              ))
            ) <= ?
          `, [lat1, lon1, lat1, filters.distance_max]);
      }
    } else {
      query = query.select(db.raw('NULL as distance'));
    }

    // Order by relevance: verification, profile completion, activity, then distance
    query = query
      .orderByRaw('users.is_verified DESC NULLS LAST')
      .orderByRaw('users.profile_completion_percentage DESC NULLS LAST')
      .orderByRaw('users.last_active_at DESC NULLS LAST');

    // Add distance-based ordering if available
    if (userProfile?.latitude && userProfile?.longitude) {
      query = query.orderByRaw('distance ASC NULLS LAST');
    }

    query = query.limit(limit);

    const candidates = await query;

    // Build discovery profiles with photos and prompts
    const discoveryProfiles: DiscoveryProfile[] = [];

    for (const candidate of candidates) {
      const photos = await this.photoRepository.findByUserId(candidate.id);
      const prompts = await this.promptRepository.findUserPrompts(candidate.id);

      // Calculate distance if both users have location
      let distance: number | undefined;
      if (
        userProfile?.latitude &&
        userProfile?.longitude &&
        candidate.latitude &&
        candidate.longitude
      ) {
        distance = this.calculateDistance(
          userProfile.latitude,
          userProfile.longitude,
          candidate.latitude,
          candidate.longitude
        );
      }

      const age = this.calculateAge(candidate.date_of_birth);

      // Merge interests from both users and profiles tables
      const interests = [
        ...(candidate.user_interests || []),
        ...(candidate.profile_interests || [])
      ];
      const uniqueInterests = [...new Set(interests)];

      discoveryProfiles.push({
        id: candidate.id,
        first_name: candidate.first_name,
        age,
        bio: candidate.bio,
        occupation: candidate.occupation,
        city: candidate.city,
        distance,
        photos: photos.map((p) => ({
          id: p.id,
          url: p.url,
          thumbnail_url: p.thumbnail_url,
          position: p.position,
        })),
        interests: uniqueInterests,
        prompts: prompts.slice(0, 3).map((p) => ({
          question: p.question,
          answer: p.answer,
        })),
        is_verified: candidate.is_photo_verified || candidate.is_verified,
      });
    }

    return discoveryProfiles;
  }

  async getProfileById(userId: string, profileId: string): Promise<DiscoveryProfile> {
    // Verify profile exists and is not the current user
    if (userId === profileId) {
      throw new Error('Cannot view your own profile');
    }

    const user = await this.userRepository.findById(profileId);
    if (!user || !user.is_active) {
      throw new Error('Profile not found');
    }

    const profile = await this.profileRepository.findByUserId(profileId);
    const photos = await this.photoRepository.findByUserId(profileId);
    const prompts = await this.promptRepository.findUserPrompts(profileId);

    const age = this.calculateAge(user.date_of_birth);

    return {
      id: user.id,
      first_name: user.first_name,
      age,
      bio: profile?.bio,
      occupation: profile?.occupation,
      city: profile?.city,
      photos: photos.map((p) => ({
        id: p.id,
        url: p.url,
        thumbnail_url: p.thumbnail_url,
        position: p.position,
      })),
      interests: profile?.interests || [],
      prompts: prompts.map((p) => ({
        question: p.question,
        answer: p.answer,
      })),
      is_verified: profile?.is_photo_verified || false,
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const earthRadiusKm = 6371;

    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLon = this.degreesToRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadiusKm * c;

    return Math.round(distance * 10) / 10; // Round to 1 decimal
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Get user's discovery stats and usage limits
   */
  async getDiscoveryStats(userId: string) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tier = (user.subscription_tier || 'free').toLowerCase();

    // Get today's usage limits
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usageLimits = await db('usage_limits')
      .where({ user_id: userId })
      .select('swipes_today', 'super_likes_today', 'boosts_today', 'reset_at')
      .first();

    // Define limits by tier
    const TIER_LIMITS: Record<string, {
      dailySwipes: number;
      dailySuperLikes: number;
      dailyBoosts: number;
    }> = {
      free: { dailySwipes: 100, dailySuperLikes: 1, dailyBoosts: 0 },
      basic: { dailySwipes: -1, dailySuperLikes: 5, dailyBoosts: 1 },
      plus: { dailySwipes: -1, dailySuperLikes: 10, dailyBoosts: 2 },
      premium: { dailySwipes: -1, dailySuperLikes: 20, dailyBoosts: 5 },
      premium_plus: { dailySwipes: -1, dailySuperLikes: -1, dailyBoosts: 10 },
      elite: { dailySwipes: -1, dailySuperLikes: -1, dailyBoosts: -1 },
    };

    const limits = TIER_LIMITS[tier] || TIER_LIMITS.free;
    const swipesUsed = usageLimits?.swipes_today || 0;
    const superLikesUsed = usageLimits?.super_likes_today || 0;
    const boostsUsed = usageLimits?.boosts_today || 0;

    return {
      tier: tier.toUpperCase(),
      limits: {
        dailySwipes: limits.dailySwipes,
        dailySuperLikes: limits.dailySuperLikes,
        dailyBoosts: limits.dailyBoosts,
      },
      usage: {
        swipesToday: swipesUsed,
        superLikesToday: superLikesUsed,
        boostsToday: boostsUsed,
      },
      remaining: {
        swipes: limits.dailySwipes === -1 ? -1 : Math.max(0, limits.dailySwipes - swipesUsed),
        superLikes: limits.dailySuperLikes === -1 ? -1 : Math.max(0, limits.dailySuperLikes - superLikesUsed),
        boosts: limits.dailyBoosts === -1 ? -1 : Math.max(0, limits.dailyBoosts - boostsUsed),
      },
      resetsAt: usageLimits?.reset_at || null,
    };
  }
}
