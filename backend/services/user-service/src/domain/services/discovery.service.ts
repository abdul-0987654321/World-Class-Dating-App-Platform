import db from '../../infrastructure/database/connection';
import { MatchRepository } from '../repositories/match.repository';
import { PhotoRepository } from '../repositories/photo.repository';
import { ProfileRepository } from '../repositories/profile.repository';
import { PromptRepository } from '../repositories/prompt.repository';
import { SwipeRepository } from '../repositories/swipe.repository';
import { UserRepository } from '../repositories/user.repository';

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

    // Build query for candidate users
    let query = db('users')
      .select(
        'users.id',
        'users.first_name',
        'users.date_of_birth',
        'users.gender',
        'profiles.bio',
        'profiles.occupation',
        'profiles.city',
        'profiles.latitude',
        'profiles.longitude',
        'profiles.interests',
        'profiles.is_photo_verified',
        'profiles.profile_completion_percentage'
      )
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .whereNotIn('users.id', excludedUserIds)
      .where('users.is_active', true)
      .where('users.is_verified', true)
      // SECURITY: Exclude test email domains from production discovery
      .whereNot('users.email', 'like', '%@example.com')
      .whereNot('users.email', 'like', '%@test.com')
      .whereNot('users.email', 'like', '%@demo.%')
      .whereNot('users.email', 'like', '%@localhost%')
      .whereNot('users.email', 'like', 'loadtest%');

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

    // Location-based filtering (if user has location)
    if (userProfile?.latitude && userProfile?.longitude && filters?.distance_max) {
      // Haversine formula for distance calculation
      const earthRadiusKm = 6371;
      const lat1 = userProfile.latitude;
      const lon1 = userProfile.longitude;

      query = query.whereNotNull('profiles.latitude').whereNotNull('profiles.longitude');
      query = query.whereRaw(
        `(
          ${earthRadiusKm} * acos(
            cos(radians(?)) * cos(radians(profiles.latitude)) *
            cos(radians(profiles.longitude) - radians(?)) +
            sin(radians(?)) * sin(radians(profiles.latitude))
          )
        ) <= ?`,
        [lat1, lon1, lat1, filters.distance_max]
      );
    }

    // Order by profile completeness and activity (better profiles first)
    query = query
      .orderByRaw('profiles.profile_completion_percentage DESC NULLS LAST')
      .orderByRaw('profiles.last_active_at DESC NULLS LAST')
      .limit(limit);

    const candidates = await query;

    // Build discovery profiles with photos and prompts
    const discoveryProfiles: DiscoveryProfile[] = [];

    if (candidates.length === 0) {
      return discoveryProfiles;
    }

    // PERFORMANCE FIX: Batch load photos and prompts for all candidates
    const candidateIds = candidates.map((c) => c.id);

    // Fetch all photos in a single query
    const allPhotos = await this.photoRepository.findByUserIds(candidateIds);
    const photoMap = new Map<string, typeof allPhotos>();
    allPhotos.forEach((photo) => {
      if (!photoMap.has(photo.user_id)) {
        photoMap.set(photo.user_id, []);
      }
      photoMap.get(photo.user_id).push(photo);
    });

    // Fetch all prompts in a single query
    const allPrompts = await this.promptRepository.findUserPromptsBatch(candidateIds);
    const promptMap = new Map<string, typeof allPrompts>();
    allPrompts.forEach((prompt) => {
      if (!promptMap.has(prompt.user_id)) {
        promptMap.set(prompt.user_id, []);
      }
      promptMap.get(prompt.user_id).push(prompt);
    });

    for (const candidate of candidates) {
      const photos = photoMap.get(candidate.id) || [];
      const prompts = promptMap.get(candidate.id) || [];

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
        interests: candidate.interests || [],
        prompts: prompts.slice(0, 3).map((p) => ({
          question: p.question,
          answer: p.answer,
        })),
        is_verified: candidate.is_photo_verified,
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
}
