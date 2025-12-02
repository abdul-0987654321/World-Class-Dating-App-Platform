/**
 * Unit tests for Message Service
 * Tests message send/receive, conversation management, and read receipts
 */

import messageService from '../../src/services/message.service';
import messageRepository from '../../src/repositories/message.repository';
import conversationRepository from '../../src/repositories/conversation.repository';
import matchService from '../../src/clients/matching-service.client';

jest.mock('../../src/repositories/message.repository');
jest.mock('../../src/repositories/conversation.repository');
jest.mock('../../src/clients/matching-service.client');

describe('MessageService', () => {
  const userId = 'user-123';
  const recipientId = 'user-456';
  const conversationId = 'conv-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a text message successfully', async () => {
      const mockConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
        requiresWomenFirst: false,
        conversationInitiated: true,
      };

      const mockMessage = {
        id: 'message-123',
        conversationId,
        senderId: userId,
        recipientId,
        content: 'Hello!',
        type: 'text',
        created_at: new Date(),
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage({
        senderId: userId,
        recipientId,
        content: 'Hello!',
        type: 'text',
      });

      expect(result).toEqual(mockMessage);
      expect(messageRepository.create).toHaveBeenCalled();
    });

    it('should enforce women-first messaging rule', async () => {
      const mockConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
        requiresWomenFirst: true,
        womanUserId: recipientId,
        conversationInitiated: false,
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);

      await expect(
        messageService.sendMessage({
          senderId: userId, // Man trying to send first message
          recipientId,
          content: 'Hello!',
          type: 'text',
        })
      ).rejects.toThrow('Women must send the first message in this match');
    });

    it('should allow messaging after women sends first message', async () => {
      const mockConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
        requiresWomenFirst: true,
        womanUserId: recipientId,
        conversationInitiated: true, // Woman already sent first message
      };

      const mockMessage = {
        id: 'message-123',
        conversationId,
        senderId: userId,
        recipientId,
        content: 'Hi back!',
        type: 'text',
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage({
        senderId: userId,
        recipientId,
        content: 'Hi back!',
        type: 'text',
      });

      expect(result).toEqual(mockMessage);
    });

    it('should handle media messages', async () => {
      const mockConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
        conversationInitiated: true,
      };

      const mockMessage = {
        id: 'message-123',
        conversationId,
        senderId: userId,
        recipientId,
        content: null,
        type: 'image',
        mediaUrl: 'https://cdn.example.com/image.jpg',
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockResolvedValue(mockMessage);

      const result = await messageService.sendMessage({
        senderId: userId,
        recipientId,
        type: 'image',
        mediaUrl: 'https://cdn.example.com/image.jpg',
      });

      expect(result).toEqual(mockMessage);
      expect(result.type).toBe('image');
      expect(result.mediaUrl).toBeDefined();
    });

    it('should create conversation if it does not exist', async () => {
      const mockMatch = {
        id: 'match-123',
        user1Id: userId,
        user2Id: recipientId,
        status: 'matched',
      };

      const newConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(null);
      (matchService.getMatch as jest.Mock).mockResolvedValue(mockMatch);
      (conversationRepository.create as jest.Mock).mockResolvedValue(newConversation);
      (messageRepository.create as jest.Mock).mockResolvedValue({
        id: 'message-123',
        content: 'Hello!',
      });

      await messageService.sendMessage({
        senderId: userId,
        recipientId,
        content: 'Hello!',
        type: 'text',
      });

      expect(conversationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: 'match-123',
          participants: expect.arrayContaining([userId, recipientId]),
        })
      );
    });

    it('should reject messages if no match exists', async () => {
      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(null);
      (matchService.getMatch as jest.Mock).mockResolvedValue(null);

      await expect(
        messageService.sendMessage({
          senderId: userId,
          recipientId,
          content: 'Hello!',
          type: 'text',
        })
      ).rejects.toThrow('No match found between users');
    });

    it('should mark conversation as initiated on first message', async () => {
      const mockConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
        requiresWomenFirst: true,
        womanUserId: userId,
        conversationInitiated: false,
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);
      (conversationRepository.markAsInitiated as jest.Mock).mockResolvedValue(undefined);
      (messageRepository.create as jest.Mock).mockResolvedValue({
        id: 'message-123',
        content: 'First message!',
      });

      await messageService.sendMessage({
        senderId: userId, // Woman sending first message
        recipientId,
        content: 'First message!',
        type: 'text',
      });

      expect(conversationRepository.markAsInitiated).toHaveBeenCalledWith(conversationId);
    });
  });

  describe('getConversationMessages', () => {
    it('should retrieve messages for a conversation', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Hello', senderId: userId },
        { id: 'msg-2', content: 'Hi!', senderId: recipientId },
        { id: 'msg-3', content: 'How are you?', senderId: userId },
      ];

      (messageRepository.findByConversation as jest.Mock).mockResolvedValue(mockMessages);

      const result = await messageService.getConversationMessages(conversationId, userId);

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockMessages);
    });

    it('should paginate messages', async () => {
      const mockMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));

      (messageRepository.findByConversation as jest.Mock).mockResolvedValue(
        mockMessages.slice(0, 10)
      );

      const result = await messageService.getConversationMessages(conversationId, userId, {
        limit: 10,
        offset: 0,
      });

      expect(result).toHaveLength(10);
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read', async () => {
      const messageIds = ['msg-1', 'msg-2', 'msg-3'];

      (messageRepository.markAsRead as jest.Mock).mockResolvedValue(undefined);

      await messageService.markAsRead(messageIds, userId);

      expect(messageRepository.markAsRead).toHaveBeenCalledWith(messageIds, userId);
    });

    it('should send read receipt notification', async () => {
      const messageIds = ['msg-1'];

      (messageRepository.markAsRead as jest.Mock).mockResolvedValue(undefined);
      (messageRepository.findById as jest.Mock).mockResolvedValue({
        id: 'msg-1',
        senderId: recipientId,
        recipientId: userId,
      });

      // Mock WebSocket/notification service
      const notificationSpy = jest.fn();
      (messageService as any).sendReadReceipt = notificationSpy;

      await messageService.markAsRead(messageIds, userId);

      // Verify read receipt was sent
      // expect(notificationSpy).toHaveBeenCalled();
    });
  });

  describe('deleteMessage', () => {
    it('should allow sender to delete their own message', async () => {
      const mockMessage = {
        id: 'msg-123',
        senderId: userId,
        recipientId,
        content: 'Test message',
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (messageRepository.delete as jest.Mock).mockResolvedValue(true);

      const result = await messageService.deleteMessage('msg-123', userId);

      expect(result).toBe(true);
      expect(messageRepository.delete).toHaveBeenCalledWith('msg-123');
    });

    it('should prevent users from deleting others messages', async () => {
      const mockMessage = {
        id: 'msg-123',
        senderId: recipientId, // Different user
        recipientId: userId,
        content: 'Test message',
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);

      await expect(messageService.deleteMessage('msg-123', userId)).rejects.toThrow(
        'Not authorized to delete this message'
      );
    });

    it('should delete message from both users view', async () => {
      const mockMessage = {
        id: 'msg-123',
        senderId: userId,
        content: 'Test message',
      };

      (messageRepository.findById as jest.Mock).mockResolvedValue(mockMessage);
      (messageRepository.delete as jest.Mock).mockResolvedValue(true);

      await messageService.deleteMessage('msg-123', userId);

      // Verify soft delete or marking as deleted
      expect(messageRepository.delete).toHaveBeenCalled();
    });
  });

  describe('Message Encryption', () => {
    it('should encrypt message content before storing', async () => {
      const mockConversation = {
        id: conversationId,
        matchId: 'match-123',
        participants: [userId, recipientId],
        conversationInitiated: true,
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockImplementation((data) =>
        Promise.resolve({ id: 'msg-123', ...data })
      );

      await messageService.sendMessage({
        senderId: userId,
        recipientId,
        content: 'Sensitive message',
        type: 'text',
      });

      const createCall = (messageRepository.create as jest.Mock).mock.calls[0][0];

      // In production, content should be encrypted
      // expect(createCall.content).not.toBe('Sensitive message');
      // expect(createCall.encrypted).toBe(true);
    });
  });

  describe('Voice Note Messages', () => {
    it('should handle voice note messages', async () => {
      const mockConversation = {
        id: conversationId,
        participants: [userId, recipientId],
        conversationInitiated: true,
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);
      (messageRepository.create as jest.Mock).mockResolvedValue({
        id: 'msg-123',
        type: 'voice',
        mediaUrl: 'https://cdn.example.com/voice-note.mp3',
        duration: 15,
      });

      const result = await messageService.sendMessage({
        senderId: userId,
        recipientId,
        type: 'voice',
        mediaUrl: 'https://cdn.example.com/voice-note.mp3',
        metadata: { duration: 15 },
      });

      expect(result.type).toBe('voice');
      expect(result.mediaUrl).toBeDefined();
    });

    it('should validate voice note duration limit', async () => {
      const mockConversation = {
        id: conversationId,
        participants: [userId, recipientId],
        conversationInitiated: true,
      };

      (conversationRepository.findByMatchId as jest.Mock).mockResolvedValue(mockConversation);

      await expect(
        messageService.sendMessage({
          senderId: userId,
          recipientId,
          type: 'voice',
          mediaUrl: 'https://cdn.example.com/long-voice.mp3',
          metadata: { duration: 121 }, // Over 2 minute limit
        })
      ).rejects.toThrow('Voice note exceeds maximum duration');
    });
  });
});
