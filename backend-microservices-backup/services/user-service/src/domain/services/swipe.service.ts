import { SwipeRepository } from '../repositories/swipe.repository';
import { MatchRepository } from '../repositories/match.repository';
import { SwipeAction, SwipeResponse } from '../entities/Swipe.entity';

export class SwipeService {
  private swipeRepository: SwipeRepository;
  private matchRepository: MatchRepository;
  private readonly FREE_SWIPE_LIMIT = 50; // Per day for free users

  constructor(
    swipeRepository?: SwipeRepository,
    matchRepository?: MatchRepository
  ) {
    this.swipeRepository = swipeRepository || new SwipeRepository();
    this.matchRepository = matchRepository || new MatchRepository();
  }

  async swipe(
    swiperId: string,
    swipedId: string,
    action: SwipeAction,
    isPremium: boolean = false
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

    // Check daily swipe limit for free users
    if (!isPremium) {
      const swipesToday = await this.swipeRepository.countSwipesToday(swiperId);
      if (swipesToday >= this.FREE_SWIPE_LIMIT) {
        throw new Error('Daily swipe limit reached. Upgrade to Premium for unlimited swipes.');
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

  async like(swiperId: string, swipedId: string, isPremium: boolean = false): Promise<SwipeResponse> {
    return this.swipe(swiperId, swipedId, 'like', isPremium);
  }

  async pass(swiperId: string, swipedId: string): Promise<SwipeResponse> {
    return this.swipe(swiperId, swipedId, 'pass', true); // Passes don't count toward limit
  }

  async superLike(swiperId: string, swipedId: string): Promise<SwipeResponse> {
    // Super likes typically require premium or limited quantity
    return this.swipe(swiperId, swipedId, 'super_like', true);
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
