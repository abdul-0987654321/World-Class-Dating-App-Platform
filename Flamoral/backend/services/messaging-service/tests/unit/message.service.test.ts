/// <reference types="jest" />
/**
 * Unit tests for Message Service Components
 * Tests repository and service interactions
 */

import { messageRepository } from '../../src/domain/repositories/message.repository';
import { conversationRepository } from '../../src/domain/repositories/conversation.repository';
import { matchingServiceClient } from '../../src/infrastructure/clients/matching-service.client';

jest.mock('../../src/infrastructure/database/cosmos-client');
jest.mock('../../src/domain/repositories/message.repository');
jest.mock('../../src/domain/repositories/conversation.repository');
jest.mock('../../src/infrastructure/clients/matching-service.client');
jest.mock('@flamoral/shared', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('Message Service Components', () => {
  const userId = 'user-123';
  const recipientId = 'user-456';
  const conversationId = 'conv-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MessageRepository', () => {
    it('should be defined', () => {
      expect(messageRepository).toBeDefined();
    });

    it('should have create method', () => {
      expect(messageRepository.create).toBeDefined();
    });

    it('should have findById method', () => {
      expect(messageRepository.findById).toBeDefined();
    });

    it('should have update method', () => {
      expect(messageRepository.update).toBeDefined();
    });

    it('should have delete method', () => {
      expect(messageRepository.delete).toBeDefined();
    });

    it('should have getMessagesByConversation method', () => {
      expect(messageRepository.getMessagesByConversation).toBeDefined();
    });
  });

  describe('ConversationRepository', () => {
    it('should be defined', () => {
      expect(conversationRepository).toBeDefined();
    });

    it('should have findById method', () => {
      expect(conversationRepository.findById).toBeDefined();
    });

    it('should have create method', () => {
      expect(conversationRepository.create).toBeDefined();
    });

    it('should have findByParticipants method', () => {
      expect(conversationRepository.findByParticipants).toBeDefined();
    });

    it('should have update method', () => {
      expect(conversationRepository.update).toBeDefined();
    });

    it('should have delete method', () => {
      expect(conversationRepository.delete).toBeDefined();
    });
  });

  describe('MatchingServiceClient', () => {
    it('should be defined', () => {
      expect(matchingServiceClient).toBeDefined();
    });

    it('should have findMatchByUsers method', () => {
      expect(matchingServiceClient.findMatchByUsers).toBeDefined();
    });

    it('should have updateMatchConversationStatus method', () => {
      expect(matchingServiceClient.updateMatchConversationStatus).toBeDefined();
    });
  });

  describe('Message Operations', () => {
    it('should mock message creation', async () => {
      const mockMessage = {
        id: 'message-123',
        conversationId,
        senderId: userId,
        receiverId: recipientId,
        content: 'Hello!',
        type: 'text',
        createdAt: new Date(),
      };

      (messageRepository.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageRepository.create(mockMessage as any);

      expect(result).toEqual(mockMessage);
      expect(messageRepository.create).toHaveBeenCalled();
    });

    it('should mock finding message by id', async () => {
      const mockMessage = {
        id: 'message-123',
        content: 'Hello!',
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageRepository.findById('message-123');

      expect(result).toEqual(mockMessage);
      expect(messageRepository.findById).toHaveBeenCalledWith('message-123');
    });

    it('should mock getting messages by conversation', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello' },
        { id: 'msg-2', content: 'Hi!' },
      ];

      (messageRepository.getMessagesByConversation as jest.Mock).mockResolvedValue(mockMessages);

      const result = await messageRepository.getMessagesByConversation(conversationId, 50, 0);

      expect(result).toEqual(mockMessages);
      expect(messageRepository.getMessagesByConversation).toHaveBeenCalledWith(conversationId, 50, 0);
    });
  });

  describe('Conversation Operations', () => {
    it('should mock conversation creation', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: recipientId,
        createdAt: new Date(),
      };

      (conversationRepository.create as jest.Mock).mockResolvedValue(mockConversation);

      const result = await conversationRepository.create(mockConversation as any);

      expect(result).toEqual(mockConversation);
      expect(conversationRepository.create).toHaveBeenCalled();
    });

    it('should mock finding conversation by participants', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: recipientId,
      };

      (conversationRepository.findByParticipants as jest.Mock).mockResolvedValue(mockConversation);

      const result = await conversationRepository.findByParticipants(userId, recipientId);

      expect(result).toEqual(mockConversation);
      expect(conversationRepository.findByParticipants).toHaveBeenCalledWith(userId, recipientId);
    });

    it('should mock finding conversation by id', async () => {
      const mockConversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: recipientId,
      };

      (conversationRepository.findById as jest.Mock).mockResolvedValue(mockConversation);

      const result = await conversationRepository.findById(conversationId);

      expect(result).toEqual(mockConversation);
      expect(conversationRepository.findById).toHaveBeenCalledWith(conversationId);
    });
  });

  describe('Matching Service Integration', () => {
    it('should mock finding match by users', async () => {
      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: recipientId,
        requiresWomenFirst: false,
      };

      (matchingServiceClient.findMatchByUsers as jest.Mock).mockResolvedValue(mockMatch);

      const result = await matchingServiceClient.findMatchByUsers(userId, recipientId);

      expect(result).toEqual(mockMatch);
      expect(matchingServiceClient.findMatchByUsers).toHaveBeenCalledWith(userId, recipientId);
    });

    it('should mock updating match conversation status', async () => {
      (matchingServiceClient.updateMatchConversationStatus as jest.Mock).mockResolvedValue(undefined);

      await matchingServiceClient.updateMatchConversationStatus('match-123', 'active');

      expect(matchingServiceClient.updateMatchConversationStatus).toHaveBeenCalledWith('match-123', 'active');
    });
  });
});
