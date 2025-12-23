/**
 * Unit tests for Message Controller
 * Tests message sending, retrieving, updating, deleting, and status management
 */

import { Response } from 'express';
import { MessageController } from '../../../src/api/controllers/message.controller';
import { AuthRequest } from '../../../src/api/middleware/auth.middleware';
import { messageRepository } from '../../../src/domain/repositories/message.repository';
import { conversationRepository } from '../../../src/domain/repositories/conversation.repository';
import { messageEventsService } from '../../../src/domain/services/message-events.service';
import { realtimeHttpClient } from '../../../src/infrastructure/clients/realtime-http.client';
import { matchingServiceClient } from '../../../src/infrastructure/clients/matching-service.client';
import { MessageType, MessageStatus } from '../../../src/types';

jest.mock('../../../src/domain/repositories/message.repository');
jest.mock('../../../src/domain/repositories/conversation.repository');
jest.mock('../../../src/domain/services/message-events.service');
jest.mock('../../../src/infrastructure/clients/realtime-http.client');
jest.mock('../../../src/infrastructure/clients/matching-service.client');
jest.mock('@flamoral/backend-shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('MessageController', () => {
  let messageController: MessageController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';
  const receiverId = 'user-456';
  const conversationId = 'conv-789';
  const messageId = 'msg-001';

  beforeEach(() => {
    jest.clearAllMocks();
    messageController = new MessageController();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: { userId } as any,
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    } as Partial<Response>;
  });

  describe('getMessages', () => {
    it('should return messages for a conversation', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
      };

      const mockMessages = [
        { id: 'msg-1', content: 'Hello', senderId: userId, receiverId },
        { id: 'msg-2', content: 'Hi there', senderId: receiverId, receiverId: userId },
      ];

      mockRequest.params = { conversationId };
      mockRequest.query = { limit: '50', offset: '0' };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.getMessagesByConversation as jest.Mock).mockResolvedValue(mockMessages);

      await messageController.getMessages(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.findById).toHaveBeenCalledWith(conversationId);
      expect(messageRepository.getMessagesByConversation).toHaveBeenCalledWith(
        conversationId,
        50,
        0
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          messages: mockMessages,
          pagination: {
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        },
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(null);

      await messageController.getMessages(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Conversation not found',
      });
    });

    it('should return 403 if user not authorized', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: 'other-user-1',
        participant2Id: 'other-user-2',
      };

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);

      await messageController.getMessages(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Not authorized to view this conversation',
      });
    });

    it('should filter out deleted messages for user', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
      };

      const mockMessages = [
        { id: 'msg-1', content: 'Hello', deletedFor: [] },
        { id: 'msg-2', content: 'Deleted', deletedFor: [userId] },
        { id: 'msg-3', content: 'Visible', deletedFor: [receiverId] },
      ];

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.getMessagesByConversation as jest.Mock).mockResolvedValue(mockMessages);

      await messageController.getMessages(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ id: 'msg-1' }),
            expect.objectContaining({ id: 'msg-3' }),
          ]),
        }),
      });
    });
  });

  describe('sendMessage', () => {
    it('should send a message successfully', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
        conversationInitiated: true,
        requiresWomenFirst: false,
      };

      const messageContent = 'Hello, how are you?';
      mockRequest.body = {
        conversationId,
        receiverId,
        content: messageContent,
        type: MessageType.TEXT,
      };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockImplementation((msg) =>
        Promise.resolve({ ...msg, id: messageId })
      );
      (conversationRepository.updateLastMessage as jest.Mock).mockResolvedValue(undefined);
      (conversationRepository.incrementUnreadCount as jest.Mock).mockResolvedValue(undefined);
      (realtimeHttpClient.publishMessage as jest.Mock).mockResolvedValue(undefined);
      (messageEventsService.publishNewMessage as jest.Mock).mockResolvedValue(undefined);

      await messageController.sendMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(messageRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          content: messageContent,
          senderId: userId,
          receiverId,
          type: MessageType.TEXT,
          status: MessageStatus.SENT,
        })
      );
      expect(conversationRepository.updateLastMessage).toHaveBeenCalled();
      expect(conversationRepository.incrementUnreadCount).toHaveBeenCalledWith(
        conversationId,
        receiverId
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should return 400 if receiverId or content missing', async () => {
      mockRequest.body = { conversationId };

      await messageController.sendMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'receiverId and content are required',
      });
    });

    it('should create conversation if it does not exist', async () => {
      mockRequest.body = {
        receiverId,
        content: 'Hello',
      };

      (conversationRepository.findByParticipants as jest.Mock).mockResolvedValue(null);
      (matchingServiceClient.findMatchByUsers as jest.Mock).mockResolvedValue({
        id: 'match-123',
        requiresWomenFirst: false,
      });
      (conversationRepository.create as jest.Mock).mockImplementation((conv) =>
        Promise.resolve({ ...conv, id: conversationId })
      );
      (messageRepository.create as jest.Mock).mockImplementation((msg) =>
        Promise.resolve({ ...msg, id: messageId })
      );
      (conversationRepository.updateLastMessage as jest.Mock).mockResolvedValue(undefined);
      (conversationRepository.incrementUnreadCount as jest.Mock).mockResolvedValue(undefined);
      (realtimeHttpClient.publishMessage as jest.Mock).mockResolvedValue(undefined);
      (messageEventsService.publishNewMessage as jest.Mock).mockResolvedValue(undefined);

      await messageController.sendMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.create).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('should enforce women-first messaging rule', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
        conversationInitiated: false,
        requiresWomenFirst: true,
        womanUserId: receiverId,
      };

      mockRequest.body = {
        conversationId,
        receiverId,
        content: 'Hello',
      };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);

      await messageController.sendMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'In heterosexual matches, only women can send the first message. Please wait for her to message you first.',
        code: 'WOMEN_FIRST_MESSAGING_REQUIRED',
        data: expect.objectContaining({
          requiresWomenFirst: true,
          waitingFor: receiverId,
        }),
      });
    });

    it('should mark conversation as initiated after first message', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
        conversationInitiated: false,
        requiresWomenFirst: true,
        womanUserId: userId, // Current user is the woman
      };

      const matchInfo = { id: 'match-123', requiresWomenFirst: true, womanUserId: userId };

      mockRequest.body = {
        conversationId,
        receiverId,
        content: 'Hello',
      };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockImplementation((msg) =>
        Promise.resolve({ ...msg, id: messageId })
      );
      (conversationRepository.update as jest.Mock).mockResolvedValue(undefined);
      (conversationRepository.updateLastMessage as jest.Mock).mockResolvedValue(undefined);
      (conversationRepository.incrementUnreadCount as jest.Mock).mockResolvedValue(undefined);
      (matchingServiceClient.updateMatchConversationStatus as jest.Mock).mockResolvedValue(
        undefined
      );
      (realtimeHttpClient.publishMessage as jest.Mock).mockResolvedValue(undefined);
      (messageEventsService.publishNewMessage as jest.Mock).mockResolvedValue(undefined);

      await messageController.sendMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.update).toHaveBeenCalledWith(conversationId, {
        conversationInitiated: true,
        firstMessageSentBy: userId,
      });
      expect(statusMock).toHaveBeenCalledWith(201);
    });
  });

  describe('getMessage', () => {
    it('should return a specific message', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
      };

      const mockMessage = {
        id: messageId,
        content: 'Hello',
        senderId: userId,
        receiverId,
        deletedFor: [],
      };

      mockRequest.params = { messageId };
      mockRequest.query = { conversationId };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      await messageController.getMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockMessage,
      });
    });

    it('should return 404 if message was deleted for user', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
      };

      const mockMessage = {
        id: messageId,
        content: 'Hello',
        deletedFor: [userId],
      };

      mockRequest.params = { messageId };
      mockRequest.query = { conversationId };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      await messageController.getMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  describe('updateMessage', () => {
    it('should update message content', async () => {
      const mockMessage = {
        id: messageId,
        senderId: userId,
        receiverId,
        content: 'Old content',
      };

      const updatedMessage = {
        ...mockMessage,
        content: 'Updated content',
      };

      mockRequest.params = { messageId };
      mockRequest.body = {
        conversationId,
        content: 'Updated content',
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (messageRepository.update as jest.Mock).mockResolvedValue(updatedMessage);

      await messageController.updateMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(messageRepository.update).toHaveBeenCalledWith(messageId, conversationId, {
        content: 'Updated content',
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 403 if not the sender', async () => {
      const mockMessage = {
        id: messageId,
        senderId: receiverId, // Different user
        receiverId: userId,
        content: 'Old content',
      };

      mockRequest.params = { messageId };
      mockRequest.body = {
        conversationId,
        content: 'Updated content',
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      await messageController.updateMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(messageRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message for user', async () => {
      const mockMessage = {
        id: messageId,
        senderId: receiverId,
        receiverId: userId,
      };

      mockRequest.params = { messageId };
      mockRequest.body = {
        conversationId,
        deleteForAll: false,
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (messageRepository.markAsDeleted as jest.Mock).mockResolvedValue(undefined);

      await messageController.deleteMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(messageRepository.markAsDeleted).toHaveBeenCalledWith(
        messageId,
        conversationId,
        userId
      );
      expect(messageRepository.delete).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should hard delete message if sender deletes for all', async () => {
      const mockMessage = {
        id: messageId,
        senderId: userId,
        receiverId,
      };

      mockRequest.params = { messageId };
      mockRequest.body = {
        conversationId,
        deleteForAll: true,
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (messageRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await messageController.deleteMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(messageRepository.delete).toHaveBeenCalledWith(messageId, conversationId);
      expect(messageRepository.markAsDeleted).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 403 if not sender or receiver', async () => {
      const mockMessage = {
        id: messageId,
        senderId: 'other-user-1',
        receiverId: 'other-user-2',
      };

      mockRequest.params = { messageId };
      mockRequest.body = { conversationId };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      await messageController.deleteMessage(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status to delivered', async () => {
      const mockMessage = {
        id: messageId,
        senderId: userId,
        receiverId,
        status: MessageStatus.SENT,
      };

      mockRequest.params = { messageId };
      mockRequest.body = {
        conversationId,
        status: MessageStatus.DELIVERED,
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (messageRepository.update as jest.Mock).mockResolvedValue({
        ...mockMessage,
        status: MessageStatus.DELIVERED,
        deliveredAt: new Date(),
      });

      await messageController.updateMessageStatus(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(messageRepository.update).toHaveBeenCalledWith(messageId, conversationId, {
        status: MessageStatus.DELIVERED,
        deliveredAt: expect.any(Date),
      });
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 403 if not the receiver', async () => {
      const mockMessage = {
        id: messageId,
        senderId: userId,
        receiverId: 'other-user',
        status: MessageStatus.SENT,
      };

      mockRequest.params = { messageId };
      mockRequest.body = {
        conversationId,
        status: MessageStatus.READ,
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      await messageController.updateMessageStatus(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread message count', async () => {
      const mockConversations = [
        { id: 'conv-1' },
        { id: 'conv-2' },
        { id: 'conv-3' },
      ];

      (conversationRepository.findByUserId as jest.Mock).mockResolvedValue(mockConversations);
      (messageRepository.getUnreadCount as jest.Mock)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      await messageController.getUnreadCount(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          unreadCount: 8, // 5 + 3 + 0
        },
      });
    });
  });
});
