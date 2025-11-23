import { Collection, Db, ObjectId } from 'mongodb';
import { MessageDocument, ConversationDocument, NotificationDocument } from '../models/Message.model';

export class MessageRepository {
  private messagesCollection: Collection<MessageDocument>;
  private conversationsCollection: Collection<ConversationDocument>;
  private notificationsCollection: Collection<NotificationDocument>;

  constructor(db: Db) {
    this.messagesCollection = db.collection('messages');
    this.conversationsCollection = db.collection('conversations');
    this.notificationsCollection = db.collection('notifications');
  }

  // Message operations
  async createMessage(
    matchId: string,
    senderId: string,
    receiverId: string,
    content: string,
    type: 'text' | 'image' | 'gif' | 'voice_note' = 'text',
    mediaUrl?: string
  ): Promise<MessageDocument> {
    const message: MessageDocument = {
      _id: new ObjectId().toString(),
      matchId,
      senderId,
      receiverId,
      content,
      type,
      mediaUrl,
      sentAt: new Date(),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.messagesCollection.insertOne(message as any);

    // Update conversation
    await this.updateConversation(matchId, senderId, receiverId, content);

    return message;
  }

  async getMessages(matchId: string, limit: number = 50, before?: Date): Promise<MessageDocument[]> {
    const query: any = { matchId, isDeleted: false };

    if (before) {
      query.sentAt = { $lt: before };
    }

    const messages = await this.messagesCollection
      .find(query)
      .sort({ sentAt: -1 })
      .limit(limit)
      .toArray();

    return messages as MessageDocument[];
  }

  async markAsRead(matchId: string, userId: string): Promise<void> {
    await this.messagesCollection.updateMany(
      {
        matchId,
        receiverId: userId,
        readAt: { $exists: false },
      },
      {
        $set: {
          readAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async markAsDelivered(messageIds: string[]): Promise<void> {
    await this.messagesCollection.updateMany(
      {
        _id: { $in: messageIds },
        deliveredAt: { $exists: false },
      },
      {
        $set: {
          deliveredAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    await this.messagesCollection.updateOne(
      {
        _id: messageId,
        senderId: userId,
      },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );
  }

  async getUnreadCount(matchId: string, userId: string): Promise<number> {
    const count = await this.messagesCollection.countDocuments({
      matchId,
      receiverId: userId,
      readAt: { $exists: false },
      isDeleted: false,
    });

    return count;
  }

  // Conversation operations
  private async updateConversation(
    matchId: string,
    senderId: string,
    receiverId: string,
    content: string
  ): Promise<void> {
    const participants: [string, string] = [senderId, receiverId].sort() as [string, string];

    await this.conversationsCollection.updateOne(
      { matchId },
      {
        $set: {
          lastMessage: {
            content,
            senderId,
            sentAt: new Date(),
          },
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: {
          [`unreadCount.${receiverId}`]: 1,
        },
        $setOnInsert: {
          _id: new ObjectId().toString(),
          matchId,
          participants,
          isActive: true,
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  async getConversation(matchId: string): Promise<ConversationDocument | null> {
    const conversation = await this.conversationsCollection.findOne({ matchId });
    return conversation as ConversationDocument | null;
  }

  async getUserConversations(userId: string, limit: number = 50): Promise<ConversationDocument[]> {
    const conversations = await this.conversationsCollection
      .find({
        participants: userId,
        isActive: true,
      })
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .toArray();

    return conversations as ConversationDocument[];
  }

  async resetUnreadCount(matchId: string, userId: string): Promise<void> {
    await this.conversationsCollection.updateOne(
      { matchId },
      {
        $set: {
          [`unreadCount.${userId}`]: 0,
          updatedAt: new Date(),
        },
      }
    );
  }

  async deactivateConversation(matchId: string): Promise<void> {
    await this.conversationsCollection.updateOne(
      { matchId },
      {
        $set: {
          isActive: false,
          updatedAt: new Date(),
        },
      }
    );
  }

  // Notification operations
  async createNotification(
    userId: string,
    type: 'new_match' | 'new_message' | 'new_like' | 'super_like' | 'profile_view',
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<NotificationDocument> {
    const notification: NotificationDocument = {
      _id: new ObjectId().toString(),
      userId,
      type,
      title,
      body,
      data,
      isRead: false,
      createdAt: new Date(),
    };

    await this.notificationsCollection.insertOne(notification as any);

    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<NotificationDocument[]> {
    const notifications = await this.notificationsCollection
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return notifications as NotificationDocument[];
  }

  async markNotificationAsRead(notificationId: string): Promise<void> {
    await this.notificationsCollection.updateOne(
      { _id: notificationId },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await this.notificationsCollection.updateMany(
      {
        userId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const count = await this.notificationsCollection.countDocuments({
      userId,
      isRead: false,
    });

    return count;
  }

  async deleteOldNotifications(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationsCollection.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true,
    });

    return result.deletedCount;
  }
}
