import { ConversationRepository } from '../repositories/conversation.repository';
import { MessageRepository } from '../repositories/message.repository';
import { MatchRepository } from '../repositories/match.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  ConversationResponse,
  CreateConversationDto,
} from '../entities/Conversation.entity';
import { MessageResponse, SendMessageDto } from '../entities/Message.entity';

export class MessagingService {
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private matchRepo: MatchRepository;
  private userRepo: UserRepository;

  constructor(
    conversationRepo?: ConversationRepository,
    messageRepo?: MessageRepository,
    matchRepo?: MatchRepository,
    userRepo?: UserRepository
  ) {
    this.conversationRepo = conversationRepo || new ConversationRepository();
    this.messageRepo = messageRepo || new MessageRepository();
    this.matchRepo = matchRepo || new MatchRepository();
    this.userRepo = userRepo || new UserRepository();
  }

  /**
   * Get or create a conversation between two users
   */
  async getOrCreateConversation(
    user1Id: string,
    user2Id: string
  ): Promise<ConversationResponse> {
    // Check if conversation already exists
    let conversation = await this.conversationRepo.findByUserIds(user1Id, user2Id);

    if (!conversation) {
      // Verify that users are matched
      const match = await this.matchRepo.findMatch(user1Id, user2Id);
      if (!match) {
        throw new Error('Users must be matched to start a conversation');
      }

      // Create new conversation
      const conversationData: CreateConversationDto = {
        user1_id: user1Id < user2Id ? user1Id : user2Id,
        user2_id: user1Id < user2Id ? user2Id : user1Id,
        match_id: match.id,
      };

      conversation = await this.conversationRepo.create(conversationData);
    }

    return this.mapConversationToResponse(conversation, user1Id);
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<ConversationResponse[]> {
    const conversations = await this.conversationRepo.findByUserIdWithDetails(
      userId,
      limit,
      offset
    );

    const conversationResponses = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.other_user_id;
        const otherUser = await this.userRepo.findById(otherUserId);

        if (!otherUser) {
          throw new Error(`User ${otherUserId} not found`);
        }

        return {
          id: conv.id,
          match_id: conv.match_id,
          other_user: {
            id: otherUser.id,
            name: `${otherUser.first_name} ${otherUser.last_name}`,
            photo_url: undefined, // TODO: Fetch from PhotoRepository
          },
          last_message: conv.last_message,
          last_message_at: conv.last_message_at,
          last_message_sender_id: conv.last_message_sender_id,
          unread_count: conv.unread_count,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        };
      })
    );

    return conversationResponses;
  }

  /**
   * Send a message
   */
  async sendMessage(
    senderId: string,
    data: SendMessageDto
  ): Promise<MessageResponse> {
    const { receiver_id, content } = data;

    if (!content || content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    if (content.length > 1000) {
      throw new Error('Message content cannot exceed 1000 characters');
    }

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(senderId, receiver_id);

    // Create message
    const message = await this.messageRepo.create({
      conversation_id: conversation.id,
      sender_id: senderId,
      receiver_id: receiver_id,
      content: content.trim(),
    });

    return this.mapMessageToResponse(message);
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    limit = 50,
    offset = 0
  ): Promise<MessageResponse[]> {
    // Verify user is part of conversation
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
      throw new Error('Unauthorized to access this conversation');
    }

    const messages = await this.messageRepo.findByConversationId(
      conversationId,
      limit,
      offset
    );

    return messages.map(this.mapMessageToResponse);
  }

  /**
   * Mark conversation as read
   */
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    // Verify user is part of conversation
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
      throw new Error('Unauthorized to access this conversation');
    }

    // Mark all messages as read
    await this.messageRepo.markConversationAsRead(conversationId, userId);

    // Update conversation unread count
    await this.conversationRepo.markAsRead(conversationId, userId);
  }

  /**
   * Get total unread message count for user
   */
  async getTotalUnreadCount(userId: string): Promise<number> {
    return await this.conversationRepo.getTotalUnreadCount(userId);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.user1_id !== userId && conversation.user2_id !== userId) {
      throw new Error('Unauthorized to delete this conversation');
    }

    await this.conversationRepo.delete(conversationId);
  }

  private async mapConversationToResponse(
    conversation: any,
    currentUserId: string
  ): Promise<ConversationResponse> {
    const otherUserId =
      conversation.user1_id === currentUserId
        ? conversation.user2_id
        : conversation.user1_id;

    const otherUser = await this.userRepo.findById(otherUserId);

    if (!otherUser) {
      throw new Error(`User ${otherUserId} not found`);
    }

    const unread_count =
      conversation.user1_id === currentUserId
        ? conversation.unread_count_user1
        : conversation.unread_count_user2;

    return {
      id: conversation.id,
      match_id: conversation.match_id,
      other_user: {
        id: otherUser.id,
        name: `${otherUser.first_name} ${otherUser.last_name}`,
        photo_url: undefined, // TODO: Fetch from PhotoRepository
      },
      last_message: conversation.last_message,
      last_message_at: conversation.last_message_at,
      last_message_sender_id: conversation.last_message_sender_id,
      unread_count,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
    };
  }

  private mapMessageToResponse(message: any): MessageResponse {
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      sender_id: message.sender_id,
      receiver_id: message.receiver_id,
      content: message.content,
      is_read: message.is_read,
      read_at: message.read_at,
      status: message.status,
      created_at: message.created_at,
    };
  }
}
