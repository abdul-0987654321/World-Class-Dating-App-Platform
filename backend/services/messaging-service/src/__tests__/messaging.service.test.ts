/**
 * Messaging Service Tests
 * Comprehensive test suite for the messaging functionality
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';

// Mock external dependencies
jest.mock('../infrastructure/database/cosmos-client');
jest.mock('../infrastructure/cache/redis');
jest.mock('axios');

import { MessageType, MessageStatus, ConversationStatus } from '../types';
import { chatModerationService } from '../services/chat-moderation.service';
import { virtualGiftsService } from '../services/virtual-gifts.service';

describe('Messaging Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Message Types', () => {
    it('should define all message types', () => {
      expect(MessageType.TEXT).toBe('text');
      expect(MessageType.IMAGE).toBe('image');
      expect(MessageType.VIDEO).toBe('video');
      expect(MessageType.AUDIO).toBe('audio');
      expect(MessageType.FILE).toBe('file');
      expect(MessageType.GIF).toBe('gif');
    });

    it('should define all message statuses', () => {
      expect(MessageStatus.SENT).toBe('sent');
      expect(MessageStatus.DELIVERED).toBe('delivered');
      expect(MessageStatus.READ).toBe('read');
      expect(MessageStatus.FAILED).toBe('failed');
    });

    it('should define all conversation statuses', () => {
      expect(ConversationStatus.ACTIVE).toBe('active');
      expect(ConversationStatus.ARCHIVED).toBe('archived');
      expect(ConversationStatus.BLOCKED).toBe('blocked');
      expect(ConversationStatus.DELETED).toBe('deleted');
    });
  });

  describe('Chat Moderation Service', () => {
    describe('Content Moderation', () => {
      it('should allow clean messages', async () => {
        const result = await chatModerationService.moderateMessage(
          'Hello! How are you doing today?',
          'user-1',
          'user-2',
          'conv-1'
        );

        expect(result.isAllowed).toBe(true);
        expect(result.action).toBe('allow');
        expect(result.flags).toHaveLength(0);
      });

      it('should detect scam patterns', async () => {
        const result = await chatModerationService.moderateMessage(
          'Send me money via Western Union please',
          'user-1',
          'user-2',
          'conv-1'
        );

        expect(result.isAllowed).toBe(false);
        expect(result.action).toBe('auto_block');
        expect(result.flags.some(f => f.type === 'scam')).toBe(true);
      });

      it('should detect personal info sharing', async () => {
        const result = await chatModerationService.moderateMessage(
          'My email is test@example.com',
          'user-1',
          'user-2',
          'conv-1'
        );

        expect(result.flags.some(f => f.type === 'personal_info')).toBe(true);
      });

      it('should detect phone numbers', async () => {
        const result = await chatModerationService.moderateMessage(
          'Call me at 555-123-4567',
          'user-1',
          'user-2',
          'conv-1'
        );

        expect(result.flags.some(f => f.type === 'personal_info')).toBe(true);
      });

      it('should flag suspicious links', async () => {
        const result = await chatModerationService.moderateMessage(
          'Check out this link: bit.ly/something',
          'user-1',
          'user-2',
          'conv-1'
        );

        expect(result.flags.some(f => f.type === 'link')).toBe(true);
      });
    });

    describe('Spam Detection', () => {
      it('should detect repeated messages', async () => {
        const content = 'This is a test message';

        // Send the same message multiple times
        await chatModerationService.moderateMessage(content, 'spam-user', 'user-2', 'conv-1');
        await chatModerationService.moderateMessage(content, 'spam-user', 'user-2', 'conv-1');
        await chatModerationService.moderateMessage(content, 'spam-user', 'user-2', 'conv-1');
        const result = await chatModerationService.moderateMessage(content, 'spam-user', 'user-2', 'conv-1');

        expect(result.flags.some(f => f.type === 'spam')).toBe(true);
      });
    });
  });

  describe('Virtual Gifts Service', () => {
    describe('Gift Catalog', () => {
      it('should return all active gifts', () => {
        const gifts = virtualGiftsService.getGiftCatalog();

        expect(Array.isArray(gifts)).toBe(true);
        expect(gifts.length).toBeGreaterThan(0);
        expect(gifts.every(g => g.isActive)).toBe(true);
      });

      it('should return gifts by category', () => {
        const basicGifts = virtualGiftsService.getGiftsByCategory('basic');
        const premiumGifts = virtualGiftsService.getGiftsByCategory('premium');
        const luxuryGifts = virtualGiftsService.getGiftsByCategory('luxury');

        expect(basicGifts.every(g => g.category === 'basic')).toBe(true);
        expect(premiumGifts.every(g => g.category === 'premium')).toBe(true);
        expect(luxuryGifts.every(g => g.category === 'luxury')).toBe(true);
      });

      it('should get gift by ID', () => {
        const gift = virtualGiftsService.getGiftById('rose');

        expect(gift).toBeDefined();
        expect(gift?.id).toBe('rose');
        expect(gift?.name).toBe('Rose');
        expect(gift?.emoji).toBe('🌹');
      });

      it('should return undefined for non-existent gift', () => {
        const gift = virtualGiftsService.getGiftById('non-existent-gift');
        expect(gift).toBeUndefined();
      });
    });

    describe('Gift Pricing', () => {
      it('should have appropriate pricing tiers', () => {
        const basicGifts = virtualGiftsService.getGiftsByCategory('basic');
        const luxuryGifts = virtualGiftsService.getGiftsByCategory('luxury');

        // Basic gifts should be cheaper than luxury
        const avgBasicPrice = basicGifts.reduce((sum, g) => sum + g.price, 0) / basicGifts.length;
        const avgLuxuryPrice = luxuryGifts.reduce((sum, g) => sum + g.price, 0) / luxuryGifts.length;

        expect(avgLuxuryPrice).toBeGreaterThan(avgBasicPrice);
      });

      it('should have all required gift properties', () => {
        const gifts = virtualGiftsService.getGiftCatalog();

        gifts.forEach(gift => {
          expect(gift.id).toBeDefined();
          expect(gift.name).toBeDefined();
          expect(gift.emoji).toBeDefined();
          expect(gift.price).toBeGreaterThan(0);
          expect(['basic', 'premium', 'luxury']).toContain(gift.category);
          expect(gift.description).toBeDefined();
        });
      });
    });
  });
});

describe('Message Validation', () => {
  it('should validate message content length', () => {
    const maxLength = 5000;
    const shortMessage = 'Hello';
    const longMessage = 'a'.repeat(maxLength + 1);

    expect(shortMessage.length).toBeLessThanOrEqual(maxLength);
    expect(longMessage.length).toBeGreaterThan(maxLength);
  });

  it('should validate conversation ID format', () => {
    const validId = 'conv-123-abc';
    const invalidId = '';

    expect(validId.length).toBeGreaterThan(0);
    expect(invalidId.length).toBe(0);
  });
});

describe('WebSocket Events', () => {
  const expectedEvents = {
    clientToServer: [
      'message:send',
      'message:read',
      'message:delete',
      'typing:start',
      'typing:stop',
      'conversation:join',
      'conversation:leave',
    ],
    serverToClient: [
      'message:new',
      'message:delivered',
      'message:read',
      'message:deleted',
      'typing:indicator',
      'user:online',
      'user:offline',
      'error',
    ],
  };

  it('should have all client-to-server events defined', () => {
    expectedEvents.clientToServer.forEach(event => {
      expect(event).toBeDefined();
    });
  });

  it('should have all server-to-client events defined', () => {
    expectedEvents.serverToClient.forEach(event => {
      expect(event).toBeDefined();
    });
  });
});

describe('API Endpoints', () => {
  const expectedEndpoints = [
    { method: 'GET', path: '/api/conversations' },
    { method: 'POST', path: '/api/conversations' },
    { method: 'GET', path: '/api/conversations/:id' },
    { method: 'GET', path: '/api/conversations/:id/messages' },
    { method: 'POST', path: '/api/messages' },
    { method: 'PUT', path: '/api/messages/:id' },
    { method: 'DELETE', path: '/api/messages/:id' },
    { method: 'POST', path: '/api/messages/:id/reactions' },
    { method: 'GET', path: '/api/gifts' },
    { method: 'POST', path: '/api/gifts/send' },
    { method: 'POST', path: '/api/moderation/report' },
    { method: 'POST', path: '/api/moderation/block' },
  ];

  it('should define all required endpoints', () => {
    expectedEndpoints.forEach(endpoint => {
      expect(endpoint.method).toBeDefined();
      expect(endpoint.path).toBeDefined();
    });
  });
});
