/// <reference types="jest" />
/**
 * Unit tests for Conversation Controller
 * Tests conversation management, creation, retrieval, and deletion
 */

import { Response } from 'express';
import { ConversationController } from '../../../src/api/controllers/conversation.controller';
import { AuthRequest } from '../../../src/api/middleware/auth.middleware';
import { conversationRepository } from '../../../src/domain/repositories/conversation.repository';
import { messageRepository } from '../../../src/domain/repositories/message.repository';

jest.mock('../../../src/domain/repositories/conversation.repository');
jest.mock('../../../src/domain/repositories/message.repository');
jest.mock('@flamoral/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('ConversationController', () => {
  let conversationController: ConversationController;
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  const userId = 'user-123';
  const otherUserId = 'user-456';
  const conversationId = 'conv-789';

  beforeEach(() => {
    jest.clearAllMocks();
    conversationController = new ConversationController();

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

  describe('getConversations', () => {
    it('should return all conversations for user', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          participant1Id: userId,
          participant2Id: 'user-2',
          lastMessageAt: new Date(),
        },
        {
          id: 'conv-2',
          participant1Id: 'user-3',
          participant2Id: userId,
          lastMessageAt: new Date(),
        },
      ];

      (conversationRepository.findByUserId as jest.Mock).mockResolvedValue(mockConversations);
      (conversationRepository.getOtherParticipant as jest.Mock)
        .mockReturnValueOnce('user-2')
        .mockReturnValueOnce('user-3');
      (messageRepository.getUnreadCount as jest.Mock)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      await conversationController.getConversations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          conversations: expect.arrayContaining([
            expect.objectContaining({
              id: 'conv-1',
              otherUserId: 'user-2',
              unreadCount: 5,
            }),
            expect.objectContaining({
              id: 'conv-2',
              otherUserId: 'user-3',
              unreadCount: 0,
            }),
          ]),
          pagination: {
            total: 2,
            limit: 50,
            offset: 0,
            hasMore: false,
          },
        },
      });
    });

    it('should apply pagination correctly', async () => {
      const mockConversations = Array.from({ length: 100 }, (_, i) => ({
        id: `conv-${i}`,
        participant1Id: userId,
        participant2Id: `user-${i}`,
      }));

      mockRequest.query = { limit: '10', offset: '20' };
      (conversationRepository.findByUserId as jest.Mock).mockResolvedValue(mockConversations);
      (conversationRepository.getOtherParticipant as jest.Mock).mockReturnValue('other-user');
      (messageRepository.getUnreadCount as jest.Mock).mockResolvedValue(0);

      await conversationController.getConversations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            conversations: expect.arrayContaining([
              expect.objectContaining({ id: 'conv-20' }),
            ]),
            pagination: {
              total: 100,
              limit: 10,
              offset: 20,
              hasMore: true,
            },
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      (conversationRepository.findByUserId as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await conversationController.getConversations(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve conversations',
      });
    });
  });

  describe('getConversation', () => {
    it('should return a specific conversation', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: otherUserId,
        createdAt: new Date(),
      };

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (conversationRepository.getOtherParticipant as jest.Mock).mockReturnValue(otherUserId);
      (messageRepository.getUnreadCount as jest.Mock).mockResolvedValue(3);

      await conversationController.getConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.findById).toHaveBeenCalledWith(conversationId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: conversationId,
          otherUserId,
          unreadCount: 3,
        }),
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(null);

      await conversationController.getConversation(
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

      await conversationController.getConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Not authorized to view this conversation',
      });
    });
  });

  describe('createConversation', () => {
    it('should create a new conversation', async () => {
      const participantId = otherUserId;
      mockRequest.body = { participantId };

      (conversationRepository.findByParticipants as jest.Mock).mockResolvedValue(null);
      (conversationRepository.create as jest.Mock).mockImplementation((conv) =>
        Promise.resolve({ ...conv, id: conversationId })
      );

      await conversationController.createConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          participant1Id: userId,
          participant2Id: participantId,
          createdAt: expect.any(Date),
        })
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({ id: conversationId }),
        message: 'Conversation created successfully',
      });
    });

    it('should return existing conversation if already exists', async () => {
      const existingConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: otherUserId,
      };

      mockRequest.body = { participantId: otherUserId };
      (conversationRepository.findByParticipants as jest.Mock).mockResolvedValue(
        existingConversation
      );

      await conversationController.createConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.create).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: existingConversation,
        message: 'Conversation already exists',
      });
    });

    it('should return 400 if participantId missing', async () => {
      mockRequest.body = {};

      await conversationController.createConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'participantId is required',
      });
    });

    it('should return 400 if trying to create conversation with self', async () => {
      mockRequest.body = { participantId: userId };

      await conversationController.createConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Cannot create conversation with yourself',
      });
    });
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation', async () => {
      const existingConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: otherUserId,
      };

      mockRequest.params = { otherUserId };
      (conversationRepository.findByParticipants as jest.Mock).mockResolvedValue(
        existingConversation
      );

      await conversationController.getOrCreateConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.create).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: existingConversation,
      });
    });

    it('should create new conversation if not exists', async () => {
      mockRequest.params = { otherUserId };
      (conversationRepository.findByParticipants as jest.Mock).mockResolvedValue(null);
      (conversationRepository.create as jest.Mock).mockImplementation((conv) =>
        Promise.resolve({ ...conv, id: conversationId })
      );

      await conversationController.getOrCreateConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.create).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should return 400 if trying to get conversation with self', async () => {
      mockRequest.params = { otherUserId: userId };

      await conversationController.getOrCreateConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation successfully', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: otherUserId,
      };

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (conversationRepository.delete as jest.Mock).mockResolvedValue(undefined);

      await conversationController.deleteConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(conversationRepository.delete).toHaveBeenCalledWith(conversationId);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Conversation deleted successfully',
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(null);

      await conversationController.deleteConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(conversationRepository.delete).not.toHaveBeenCalled();
    });

    it('should return 403 if user not authorized', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: 'other-user-1',
        participant2Id: 'other-user-2',
      };

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);

      await conversationController.deleteConversation(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(conversationRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark all messages as read', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: otherUserId,
      };

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.markConversationAsRead as jest.Mock).mockResolvedValue(undefined);
      (conversationRepository.resetUnreadCount as jest.Mock).mockResolvedValue(undefined);

      await conversationController.markAsRead(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(messageRepository.markConversationAsRead).toHaveBeenCalledWith(
        conversationId,
        userId,
        expect.any(Date)
      );
      expect(conversationRepository.resetUnreadCount).toHaveBeenCalledWith(
        conversationId,
        userId
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Conversation marked as read',
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(null);

      await conversationController.markAsRead(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(messageRepository.markConversationAsRead).not.toHaveBeenCalled();
    });

    it('should return 403 if user not authorized', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: 'other-user-1',
        participant2Id: 'other-user-2',
      };

      mockRequest.params = { conversationId };
      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);

      await conversationController.markAsRead(
        mockRequest as AuthRequest,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(messageRepository.markConversationAsRead).not.toHaveBeenCalled();
    });
  });
});
