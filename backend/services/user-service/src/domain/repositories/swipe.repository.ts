import db from '../../infrastructure/database/connection';
import { SwipeEntity, CreateSwipeDto } from '../entities/Swipe.entity';

export class SwipeRepository {
  private readonly tableName = 'swipes';

  async create(data: CreateSwipeDto): Promise<SwipeEntity> {
    const [swipe] = await db(this.tableName).insert(data).returning('*');
    return swipe;
  }

  async findBySwiperId(swiperId: string, limit: number = 50): Promise<SwipeEntity[]> {
    return db(this.tableName)
      .where({ swiper_id: swiperId })
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async findSwipe(swiperId: string, swipedId: string): Promise<SwipeEntity | null> {
    const swipe = await db(this.tableName)
      .where({ swiper_id: swiperId, swiped_id: swipedId })
      .first();
    return swipe || null;
  }

  async findReverseSwipe(swiperId: string, swipedId: string): Promise<SwipeEntity | null> {
    const swipe = await db(this.tableName)
      .where({ swiper_id: swipedId, swiped_id: swiperId })
      .first();
    return swipe || null;
  }

  async checkMutualLike(user1Id: string, user2Id: string): Promise<boolean> {
    const swipe1 = await db(this.tableName)
      .where({ swiper_id: user1Id, swiped_id: user2Id })
      .whereIn('action', ['like', 'super_like'])
      .first();

    const swipe2 = await db(this.tableName)
      .where({ swiper_id: user2Id, swiped_id: user1Id })
      .whereIn('action', ['like', 'super_like'])
      .first();

    return !!swipe1 && !!swipe2;
  }

  async hasUserSwiped(swiperId: string, swipedId: string): Promise<boolean> {
    const swipe = await db(this.tableName)
      .where({ swiper_id: swiperId, swiped_id: swipedId })
      .first();
    return !!swipe;
  }

  async getSwipedUserIds(userId: string): Promise<string[]> {
    const swipes = await db(this.tableName).where({ swiper_id: userId }).select('swiped_id');
    return swipes.map((s: any) => s.swiped_id);
  }

  async getLikesReceived(userId: string, limit: number = 50): Promise<any[]> {
    return db(this.tableName)
      .select(
        'swipes.*',
        'users.id as user_id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.date_of_birth',
        'users.gender',
        'users.bio',
        'users.city',
        'users.state',
        'users.country',
        'profiles.profile_photo',
        'profiles.occupation',
        'profiles.education'
      )
      .join('users', 'swipes.swiper_id', 'users.id')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .where({ swiped_id: userId })
      .whereIn('action', ['like', 'super_like'])
      .orderBy('swipes.created_at', 'desc')
      .limit(limit);
  }

  async getSuperLikesReceived(userId: string): Promise<any[]> {
    return db(this.tableName)
      .select(
        'swipes.*',
        'users.id as user_id',
        'users.email',
        'users.first_name',
        'users.last_name',
        'users.date_of_birth',
        'users.gender',
        'users.bio',
        'users.city',
        'users.state',
        'users.country',
        'profiles.profile_photo',
        'profiles.occupation',
        'profiles.education'
      )
      .join('users', 'swipes.swiper_id', 'users.id')
      .leftJoin('profiles', 'users.id', 'profiles.user_id')
      .where({ swiped_id: userId, action: 'super_like' })
      .orderBy('swipes.created_at', 'desc');
  }

  async countLikesReceived(userId: string): Promise<number> {
    const result = await db(this.tableName)
      .where({ swiped_id: userId })
      .whereIn('action', ['like', 'super_like'])
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }

  async countSwipesToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db(this.tableName)
      .where({ swiper_id: userId })
      .where('created_at', '>=', today)
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }

  /**
   * SECURITY: Count likes sent today for tier enforcement
   */
  async countLikesToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db(this.tableName)
      .where({ swiper_id: userId, action: 'like' })
      .where('created_at', '>=', today)
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }

  /**
   * SECURITY: Count super-likes sent today for tier enforcement
   */
  async countSuperLikesToday(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db(this.tableName)
      .where({ swiper_id: userId, action: 'super_like' })
      .where('created_at', '>=', today)
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }
}
