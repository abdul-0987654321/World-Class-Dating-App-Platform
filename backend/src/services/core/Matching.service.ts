import { Knex } from 'knex';
import { MatchRepository, UserRepository, ProfileRepository } from '../../repositories';

interface DiscoveryProfile {
  userId: string;
  profile: any;
  distance?: number;
  compatibilityScore?: number;
}

export class MatchingService {
  private matchRepo: MatchRepository;
  private userRepo: UserRepository;
  private profileRepo: ProfileRepository;
  private db: Knex;

  constructor(matchRepo: MatchRepository, userRepo: UserRepository, profileRepo: ProfileRepository, db: Knex) {
    this.matchRepo = matchRepo;
    this.userRepo = userRepo;
    this.profileRepo = profileRepo;
    this.db = db;
  }

  async getDiscoveryProfiles(userId: string, limit: number = 20): Promise<DiscoveryProfile[]> {
    // Get user's settings and location
    const user = await this.userRepo.findById(userId);
    const settings = await this.userRepo.getSettings(userId);
    const userLocation = await this.userRepo.getLocation(userId);

    if (!user || !settings) {
      throw new Error('User not found');
    }

    // Get users already swiped on
    const swipedUserIds = await this.db('swipes')
      .where({ user_id: userId })
      .pluck('target_user_id');

    // Get blocked users
    const blockedUserIds = await this.db('blocks')
      .where((builder) => {
        builder.where({ user_id: userId }).orWhere({ blocked_user_id: userId });
      })
      .select('user_id', 'blocked_user_id');

    const blockedIds = new Set([
      ...blockedUserIds.map((b: any) => b.user_id),
      ...blockedUserIds.map((b: any) => b.blocked_user_id),
    ]);
    blockedIds.delete(userId);

    // Build discovery query
    let query = this.db('users')
      .where({ is_active: true, is_banned: false })
      .whereNull('deleted_at')
      .whereNot('id', userId)
      .whereNotIn('id', [...swipedUserIds, ...Array.from(blockedIds)]);

    // Apply age filter
    const today = new Date();
    const minDob = new Date(today.getFullYear() - settings.discovery_age_max, today.getMonth(), today.getDate());
    const maxDob = new Date(today.getFullYear() - settings.discovery_age_min, today.getMonth(), today.getDate());
    query = query.whereBetween('date_of_birth', [minDob, maxDob]);

    // Apply gender filter
    if (settings.discovery_show_me && !settings.discovery_show_me.includes('all')) {
      query = query.whereIn('gender', settings.discovery_show_me);
    }

    // Get potential matches
    const potentialMatches = await query.limit(limit * 2); // Get more to filter by distance

    // Calculate distances and scores
    const profilesWithScores: DiscoveryProfile[] = [];

    for (const matchUser of potentialMatches) {
      const matchProfile = await this.profileRepo.findByUserId(matchUser.id);
      if (!matchProfile) continue;

      const matchLocation = await this.userRepo.getLocation(matchUser.id);

      let distance: number | undefined;
      if (userLocation && matchLocation) {
        distance = this.calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          matchLocation.latitude,
          matchLocation.longitude
        );

        // Skip if beyond distance filter
        if (distance > settings.discovery_distance_max) {
          continue;
        }
      }

      const compatibilityScore = this.calculateCompatibility(
        user,
        matchUser,
        await this.profileRepo.findByUserId(userId),
        matchProfile
      );

      profilesWithScores.push({
        userId: matchUser.id,
        profile: {
          ...matchUser,
          profileData: matchProfile,
        },
        distance,
        compatibilityScore,
      });
    }

    // Sort by compatibility score and distance
    profilesWithScores.sort((a, b) => {
      const scoreA = a.compatibilityScore || 0;
      const scoreB = b.compatibilityScore || 0;
      return scoreB - scoreA;
    });

    return profilesWithScores.slice(0, limit);
  }

  async swipe(userId: string, targetUserId: string, action: 'like' | 'pass' | 'super_like'): Promise<{
    swipe: any;
    match: any | null;
  }> {
    // Check if already swiped
    const existingSwipe = await this.matchRepo.getSwipe(userId, targetUserId);
    if (existingSwipe) {
      throw new Error('Already swiped on this user');
    }

    // Check daily limits for free users
    const user = await this.userRepo.findById(userId);
    if (user?.subscription_tier === 'free') {
      const today = new Date();
      const dailyLimit = await this.matchRepo.getDailyLimit(userId, today);

      if (action === 'like' && dailyLimit && dailyLimit.likes_count >= 50) {
        throw new Error('Daily like limit reached. Upgrade to Premium for unlimited likes!');
      }

      if (action === 'super_like' && dailyLimit && dailyLimit.super_likes_count >= 1) {
        throw new Error('Daily super like limit reached. Upgrade or purchase more!');
      }
    }

    // Create swipe
    const swipe = await this.matchRepo.createSwipe(userId, targetUserId, action);

    // Increment daily limit
    if (action === 'like' || action === 'super_like') {
      await this.matchRepo.incrementDailyLimit(
        userId,
        action === 'like' ? 'likes' : 'super_likes'
      );
    }

    // Check for match (if action was like or super_like)
    let match = null;
    if (action === 'like' || action === 'super_like') {
      const theirSwipe = await this.matchRepo.getSwipe(targetUserId, userId);

      if (theirSwipe && (theirSwipe.action === 'like' || theirSwipe.action === 'super_like')) {
        // It's a match!
        match = await this.matchRepo.createMatch(userId, targetUserId);
      }
    }

    return { swipe, match };
  }

  async getMatches(userId: string, limit: number = 50, offset: number = 0) {
    return await this.matchRepo.getUserMatches(userId, limit, offset);
  }

  async unmatch(matchId: string, userId: string) {
    const match = await this.matchRepo.getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.user_id_1 !== userId && match.user_id_2 !== userId) {
      throw new Error('Unauthorized');
    }

    await this.matchRepo.unmatch(matchId);
  }

  async blockUser(userId: string, blockedUserId: string, reason?: string) {
    return await this.matchRepo.blockUser(userId, blockedUserId, reason);
  }

  async unblockUser(userId: string, blockedUserId: string) {
    await this.matchRepo.unblockUser(userId, blockedUserId);
  }

  async getBlockedUsers(userId: string) {
    return await this.matchRepo.getBlockedUsers(userId);
  }

  async reportUser(reporterUserId: string, reportedUserId: string, reason: string, details?: string) {
    return await this.matchRepo.createReport(reporterUserId, reportedUserId, reason, details);
  }

  async activateBoost(userId: string) {
    const user = await this.userRepo.findById(userId);

    // Check if user has coins or premium subscription
    if (user?.subscription_tier === 'free' && (user.coin_balance < 5)) {
      throw new Error('Not enough coins. Purchase coins or upgrade to Premium+!');
    }

    // Check if already has active boost
    const activeBoost = await this.matchRepo.getActiveBoost(userId);
    if (activeBoost) {
      throw new Error('You already have an active boost');
    }

    // Deduct coins if free user
    if (user?.subscription_tier === 'free') {
      await this.userRepo.updateCoinBalance(userId, -5);
    }

    // Increment daily limit
    await this.matchRepo.incrementDailyLimit(userId, 'boosts');

    // Create boost
    return await this.matchRepo.createBoost(userId, 30);
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371; // Radius of Earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private calculateCompatibility(user1: any, user2: any, profile1: any, profile2: any): number {
    let score = 0;

    // Interest matching (40 points)
    if (profile1?.interests && profile2?.interests) {
      const commonInterests = profile1.interests.filter((i: string) =>
        profile2.interests.includes(i)
      );
      score += (commonInterests.length / Math.max(profile1.interests.length, profile2.interests.length)) * 40;
    }

    // Education level matching (20 points)
    if (profile1?.education && profile2?.education && profile1.education === profile2.education) {
      score += 20;
    }

    // Relationship goal matching (30 points)
    if (profile1?.relationship_goal && profile2?.relationship_goal && profile1.relationship_goal === profile2.relationship_goal) {
      score += 30;
    }

    // Lifestyle compatibility (10 points)
    if (profile1?.smoking && profile2?.smoking && profile1.smoking === profile2.smoking) {
      score += 5;
    }
    if (profile1?.drinking && profile2?.drinking && profile1.drinking === profile2.drinking) {
      score += 5;
    }

    return Math.min(score, 100);
  }
}
