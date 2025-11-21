import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { MessagingService } from '../../domain/services/messaging.service';
import logger from '../../utils/logger';

export class MessagingController {
  private messagingService: MessagingService;

  constructor(messagingService?: MessagingService) {
    this.messagingService = messagingService || new MessagingService();
  }

  /**
   * Get all conversations for the current user
   */
  async getConversations(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const conversations = await this.messagingService.getUserConversations(
        userId,
        limit,
        offset
      );

      return res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error: any) {
      logger.error('Get conversations error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to retrieve conversations',
      });
    }
  }

  /**
   * Get or create a conversation with another user
   */
  async getOrCreateConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { otherUserId } = req.params;

      const conversation = await this.messagingService.getOrCreateConversation(
        userId,
        otherUserId
      );

      return res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error: any) {
      logger.error('Get/create conversation error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get/create conversation',
      });
    }
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const messages = await this.messagingService.getConversationMessages(
        conversationId,
        userId,
        limit,
        offset
      );

      return res.status(200).json({
        success: true,
        data: messages,
      });
    } catch (error: any) {
      logger.error('Get messages error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to retrieve messages',
      });
    }
  }

  /**
   * Send a message (REST API - for initial send, Socket.io will handle real-time)
   */
  async sendMessage(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { receiver_id, content } = req.body;

      if (!receiver_id || !content) {
        return res.status(400).json({
          success: false,
          message: 'receiver_id and content are required',
        });
      }

      const message = await this.messagingService.sendMessage(userId, {
        receiver_id,
        content,
      });

      return res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message,
      });
    } catch (error: any) {
      logger.error('Send message error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to send message',
      });
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      await this.messagingService.markConversationAsRead(conversationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Conversation marked as read',
      });
    } catch (error: any) {
      logger.error('Mark as read error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to mark conversation as read',
      });
    }
  }

  /**
   * Get total unread count
   */
  async getUnreadCount(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const unreadCount = await this.messagingService.getTotalUnreadCount(userId);

      return res.status(200).json({
        success: true,
        data: { unreadCount },
      });
    } catch (error: any) {
      logger.error('Get unread count error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to get unread count',
      });
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;

      await this.messagingService.deleteConversation(conversationId, userId);

      return res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully',
      });
    } catch (error: any) {
      logger.error('Delete conversation error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to delete conversation',
      });
    }
  }
}
