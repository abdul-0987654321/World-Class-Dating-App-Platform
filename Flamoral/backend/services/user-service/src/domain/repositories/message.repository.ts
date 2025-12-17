import db from '../../infrastructure/database/connection';
import { MessageEntity, CreateMessageDto, MessageStatus } from '../entities/Message.entity';

export class MessageRepository {
  private readonly table = 'messages';

  async create(data: CreateMessageDto): Promise<MessageEntity> {
    const [message] = await db(this.table)
      .insert({
        conversation_id: data.conversation_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        content: data.content,
        status: 'sent',
      })
      .returning('*');

    return message;
  }

  async findById(messageId: string): Promise<MessageEntity | null> {
    const message = await db(this.table).where({ id: messageId }).first();
    return message || null;
  }

  async findByConversationId(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageEntity[]> {
    const messages = await db(this.table)
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'asc')
      .limit(limit)
      .offset(offset);

    return messages;
  }

  async findRecentByConversationId(
    conversationId: string,
    limit = 50
  ): Promise<MessageEntity[]> {
    const messages = await db(this.table)
      .where({ conversation_id: conversationId })
      .orderBy('created_at', 'desc')
      .limit(limit);

    return messages.reverse(); // Return in chronological order
  }

  async markAsRead(messageId: string): Promise<void> {
    await db(this.table)
      .where({ id: messageId })
      .update({
        is_read: true,
        read_at: db.fn.now(),
        status: 'read',
      });
  }

  async markConversationAsRead(
    conversationId: string,
    receiverId: string
  ): Promise<void> {
    await db(this.table)
      .where({
        conversation_id: conversationId,
        receiver_id: receiverId,
        is_read: false,
      })
      .update({
        is_read: true,
        read_at: db.fn.now(),
        status: 'read',
      });
  }

  async updateStatus(messageId: string, status: MessageStatus): Promise<void> {
    await db(this.table).where({ id: messageId }).update({ status });
  }

  async getUnreadCount(conversationId: string, receiverId: string): Promise<number> {
    const result = await db(this.table)
      .where({
        conversation_id: conversationId,
        receiver_id: receiverId,
        is_read: false,
      })
      .count('id as count')
      .first();

    return parseInt(String(result?.count || '0'), 10);
  }

  async delete(messageId: string): Promise<void> {
    await db(this.table).where({ id: messageId }).delete();
  }

  async deleteByConversationId(conversationId: string): Promise<void> {
    await db(this.table).where({ conversation_id: conversationId }).delete();
  }
}
