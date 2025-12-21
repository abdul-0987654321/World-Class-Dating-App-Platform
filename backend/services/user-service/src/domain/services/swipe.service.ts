import { SwipeRepository } from '../repositories/swipe.repository';
import { MatchRepository } from '../repositories/match.repository';
import { SwipeAction, SwipeResponse } from '../entities/Swipe.entity';

/**
 * SECURITY: Server-side tier enforcement for swipe limits
 * These limits are the AUTHORITATIVE source - frontend should NOT enforce these
 */
export interface TierLimits {
  dailyLikes: number;
  dailySuperLikes: number;
  maxPhotos: number;
  canMakeCalls: boolean;
}

/**
 * SECURITY: Subscription tier limits - enforced server-side ONLY
 * Do NOT rely on frontend for enforcement
 */
export const TIER_LIMITS: Record<string, TierLimits> = {
  free: {
    dailyLikes: 50,
    dailySuperLikes: 1,
    maxPhotos: 3,
    canMakeCalls: false,
  },
  basic: {
    dailyLikes: 75,
    dailySuperLikes: 3,
    maxPhotos: 5,
    canMakeCalls: false,
  },
  plus: {
    dailyLikes: 100,
    dailySuperLikes: 5,
    maxPhotos: 6,
    canMakeCalls: false,
  },
  premium: {
    dailyLikes: -1, // unlimited
    dailySuperLikes: 10,
    maxPhotos: 9,
    canMakeCalls: true,
  },
  premium_plus: {
    dailyLikes: -1, // unlimited
    dailySuperLikes: 15,
    maxPhotos: 12,
    canMakeCalls: true,
  },
  elite: {
    dailyLikes: -1, // unlimited
    dailySuperLikes: -1, // unlimited
    maxPhotos: 15,
    canMakeCalls: true,
  },
};

export class SwipeService {
  private swipeRepository: SwipeRepository;
  private matchRepository: MatchRepository;

  constructor(
    swipeRepository?: SwipeRepository,
    matchRepository?: MatchRepository
  ) {
    this.swipeRepository = swipeRepository || new SwipeRepository();
    this.matchRepository = matchRepository || new MatchRepository();
  }

  /**
   * Get tier limits for a subscription tier
   * SECURITY: This is the authoritative source for limits
   */
  static getTierLimits(tier: string): TierLimits {
    return TIER_LIMITS[tier] || TIER_LIMITS.free;
  }

  async swipe(
    swiperId: string,
    swipedId: string,
    action: SwipeAction,
    subscriptionTier: string = 'free'
  ): Promise<SwipeResponse> {
    // Prevent self-swiping
    if (swiperId === swipedId) {
      throw new Error('Cannot swipe on yourself');
    }

    // Check if already swiped
    const existingSwipe = await this.swipeRepository.hasUserSwiped(swiperId, swipedId);
    if (existingSwipe) {
      throw new Error('You have already swiped on this user');
    }

    // SECURITY: Server-side enforcement of daily limits based on subscription tier
    const limits = SwipeService.getTierLimits(subscriptionTier);

    // Check daily like limit (unless unlimited = -1)
    if (action === 'like' && limits.dailyLikes !== -1) {
      const likesToday = await this.swipeRepository.countLikesToday(swiperId);
      if (likesToday >= limits.dailyLikes) {
        throw new Error(`Daily like limit of ${limits.dailyLikes} reached. Upgrade your subscription for more likes.`);
      }
    }

    // Check daily super-like limit (unless unlimited = -1)
    if (action === 'super_like' && limits.dailySuperLikes !== -1) {
      const superLikesToday = await this.swipeRepository.countSuperLikesToday(swiperId);
      if (superLikesToday >= limits.dailySuperLikes) {
        throw new Error(`Daily super-like limit of ${limits.dailySuperLikes} reached. Upgrade your subscription for more super-likes.`);
      }
    }

    // Create the swipe
    const swipe = await this.swipeRepository.create({
      swiper_id: swiperId,
      swiped_id: swipedId,
      action,
    });

    // Check for mutual like and create match
    let isMatch = false;
    if (action === 'like' || action === 'super_like') {
      const reverseSwipe = await this.swipeRepository.findReverseSwipe(swiperId, swipedId);

      if (reverseSwipe && (reverseSwipe.action === 'like' || reverseSwipe.action === 'super_like')) {
        // It's a match!
        isMatch = true;
        await this.matchRepository.create({
          user1_id: swiperId,
          user2_id: swipedId,
        });
      }
    }

    return {
      id: swipe.id,
      swiped_id: swipedId,
      action,
      is_match: isMatch,
      swiped_at: swipe.swiped_at,
    };
  }

  /**
   * SECURITY: Like action with tier-based limit enforcement
   */
  async like(swiperId: string, swipedId: string, subscriptionTier: string = 'free'): Promise<SwipeResponse> {
    return this.swipe(swiperId, swipedId, 'like', subscriptionTier);
  }

  /**
   * Pass action - no limit enforcement needed
   */
  async pass(swiperId: string, swipedId: string): Promise<SwipeResponse> {
    return this.swipe(swiperId, swipedId, 'pass', 'elite'); // Passes don't count toward limit
  }

  /**
   * SECURITY: Super-like action with tier-based limit enforcement
   */
  async superLike(swiperId: string, swipedId: string, subscriptionTier: string = 'free'): Promise<SwipeResponse> {
    return this.swipe(swiperId, swipedId, 'super_like', subscriptionTier);
  }

  async getLikesReceived(userId: string, limit: number = 50): Promise<any[]> {
    const likes = await this.swipeRepository.getLikesReceived(userId, limit);

    return likes.map((like) => {
      const age = this.calculateAge(like.date_of_birth);
      return {
        id: like.id,
        action: like.action,
        created_at: like.created_at,
        user: {
          id: like.user_id,
          first_name: like.first_name,
          last_name: like.last_name,
          age,
          gender: like.gender,
          bio: like.bio,
          city: like.city,
          state: like.state,
          country: like.country,
          photo: like.profile_photo,
          occupation: like.occupation,
          education: like.education,
        },
      };
    });
  }

  async getSuperLikesReceived(userId: string): Promise<any[]> {
    const superLikes = await this.swipeRepository.getSuperLikesReceived(userId);

    return superLikes.map((like) => {
      const age = this.calculateAge(like.date_of_birth);
      return {
        id: like.id,
        action: like.action,
        created_at: like.created_at,
        user: {
          id: like.user_id,
          first_name: like.first_name,
          last_name: like.last_name,
          age,
          gender: like.gender,
          bio: like.bio,
          city: like.city,
          state: like.state,
          country: like.country,
          photo: like.profile_photo,
          occupation: like.occupation,
          education: like.education,
        },
      };
    });
  }

  private calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  async getSwipeStats(userId: string): Promise<any> {
    const likesReceived = await this.swipeRepository.countLikesReceived(userId);
    const swipesToday = await this.swipeRepository.countSwipesToday(userId);
    const swipedUserIds = await this.swipeRepository.getSwipedUserIds(userId);

    return {
      likes_received: likesReceived,
      swipes_today: swipesToday,
      swipes_remaining: Math.max(0, this.FREE_SWIPE_LIMIT - swipesToday),
      total_swiped: swipedUserIds.length,
    };
  }

  async getSwipedUserIds(userId: string): Promise<string[]> {
    return this.swipeRepository.getSwipedUserIds(userId);
  }
}
