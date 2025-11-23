import { MessageRepository } from '../../repositories/Message.repository';
import { MatchRepository } from '../../repositories/Match.repository';

export class MessagingService {
  private messageRepo: MessageRepository;
  private matchRepo: MatchRepository;

  constructor(messageRepo: MessageRepository, matchRepo: MatchRepository) {
    this.messageRepo = messageRepo;
    this.matchRepo = matchRepo;
  }

  async sendMessage(
    matchId: string,
    senderId: string,
    content: string,
    type: 'text' | 'image' | 'gif' | 'voice_note' = 'text',
    mediaUrl?: string
  ) {
    // Verify match exists and sender is part of it
    const match = await this.matchRepo.getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.user_id_1 !== senderId && match.user_id_2 !== senderId) {
      throw new Error('Unauthorized');
    }

    if (!match.is_active) {
      throw new Error('This match is no longer active');
    }

    const receiverId = match.user_id_1 === senderId ? match.user_id_2 : match.user_id_1;

    // Create message
    const message = await this.messageRepo.createMessage(
      matchId,
      senderId,
      receiverId,
      content,
      type,
      mediaUrl
    );

    // Update match last_message_at and unread count
    await this.matchRepo.updateLastMessage(matchId, senderId);

    return message;
  }

  async getMessages(matchId: string, userId: string, limit: number = 50, before?: Date) {
    // Verify user is part of match
    const match = await this.matchRepo.getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.user_id_1 !== userId && match.user_id_2 !== userId) {
      throw new Error('Unauthorized');
    }

    return await this.messageRepo.getMessages(matchId, limit, before);
  }

  async markAsRead(matchId: string, userId: string) {
    await this.messageRepo.markAsRead(matchId, userId);
    await this.matchRepo.markAsRead(matchId, userId);
    await this.messageRepo.resetUnreadCount(matchId, userId);
  }

  async deleteMessage(messageId: string, userId: string) {
    await this.messageRepo.deleteMessage(messageId, userId);
  }

  async getConversations(userId: string, limit: number = 50) {
    return await this.messageRepo.getUserConversations(userId, limit);
  }

  async getUnreadCount(matchId: string, userId: string) {
    return await this.messageRepo.getUnreadCount(matchId, userId);
  }

  async createNotification(
    userId: string,
    type: 'new_match' | 'new_message' | 'new_like' | 'super_like' | 'profile_view',
    title: string,
    body: string,
    data?: Record<string, any>
  ) {
    return await this.messageRepo.createNotification(userId, type, title, body, data);
  }

  async getUserNotifications(userId: string, limit: number = 50) {
    return await this.messageRepo.getUserNotifications(userId, limit);
  }

  async markNotificationAsRead(notificationId: string) {
    await this.messageRepo.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead(userId: string) {
    await this.messageRepo.markAllNotificationsAsRead(userId);
  }

  async getUnreadNotificationCount(userId: string) {
    return await this.messageRepo.getUnreadNotificationCount(userId);
  }
}
