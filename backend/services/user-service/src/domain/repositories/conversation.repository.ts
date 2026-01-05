import db from '../../infrastructure/database/connection';
import { ConversationEntity, CreateConversationDto } from '../entities/Conversation.entity';

export class ConversationRepository {
  private readonly table = 'conversations';

  async create(data: CreateConversationDto): Promise<ConversationEntity> {
    // Ensure user1_id < user2_id
    const [user1_id, user2_id] =
      data.user1_id < data.user2_id
        ? [data.user1_id, data.user2_id]
        : [data.user2_id, data.user1_id];

    const [conversation] = await db(this.table)
      .insert({
        user1_id,
        user2_id,
        match_id: data.match_id,
      })
      .returning('*');

    return conversation;
  }

  async findById(conversationId: string): Promise<ConversationEntity | null> {
    const conversation = await db(this.table).where({ id: conversationId }).first();
    return conversation || null;
  }

  async findByMatchId(matchId: string): Promise<ConversationEntity | null> {
    const conversation = await db(this.table).where({ match_id: matchId }).first();
    return conversation || null;
  }

  async findByUserIds(user1Id: string, user2Id: string): Promise<ConversationEntity | null> {
    const [userId1, userId2] = user1Id < user2Id ? [user1Id, user2Id] : [user2Id, user1Id];

    const conversation = await db(this.table)
      .where({ user1_id: userId1, user2_id: userId2 })
      .first();

    return conversation || null;
  }

  async findByUserId(userId: string, limit = 50, offset = 0): Promise<ConversationEntity[]> {
    const conversations = await db(this.table)
      .where('user1_id', userId)
      .orWhere('user2_id', userId)
      .orderBy('updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    return conversations;
  }

  async findByUserIdWithDetails(userId: string, limit = 50, offset = 0): Promise<any[]> {
    const conversations = await db(this.table)
      .select(
        'conversations.*',
        db.raw(
          `
          CASE
            WHEN conversations.user1_id = ? THEN conversations.user2_id
            ELSE conversations.user1_id
          END as other_user_id
        `,
          [userId]
        ),
        db.raw(
          `
          CASE
            WHEN conversations.user1_id = ? THEN conversations.unread_count_user1
            ELSE conversations.unread_count_user2
          END as unread_count
        `,
          [userId]
        )
      )
      .where('user1_id', userId)
      .orWhere('user2_id', userId)
      .orderBy('conversations.updated_at', 'desc')
      .limit(limit)
      .offset(offset);

    return conversations;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.findById(conversationId);
    if (!conversation) return;

    if (conversation.user1_id === userId) {
      await db(this.table).where({ id: conversationId }).update({ unread_count_user1: 0 });
    } else if (conversation.user2_id === userId) {
      await db(this.table).where({ id: conversationId }).update({ unread_count_user2: 0 });
    }
  }

  async getTotalUnreadCount(userId: string): Promise<number> {
    const result = await db(this.table)
      .sum({
        total: db.raw(
          `
          CASE
            WHEN user1_id = ? THEN unread_count_user1
            WHEN user2_id = ? THEN unread_count_user2
            ELSE 0
          END
        `,
          [userId, userId]
        ),
      })
      .where('user1_id', userId)
      .orWhere('user2_id', userId)
      .first();

    return parseInt(result?.total || '0', 10);
  }

  async delete(conversationId: string): Promise<void> {
    await db(this.table).where({ id: conversationId }).delete();
  }
}
