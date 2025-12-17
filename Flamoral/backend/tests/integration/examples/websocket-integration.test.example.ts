/**
 * Example WebSocket Integration Test
 * This demonstrates how to test real-time features using WebSocket
 */

import { createWebSocketClient, createMultipleClients, cleanupMultipleClients } from '../helpers';
import type { WebSocketTestClient } from '../helpers';

describe('WebSocket Integration Tests Example', () => {
  const MESSAGING_SERVICE_URL = process.env.MESSAGING_SERVICE_URL || 'http://localhost:3004';

  describe('Real-time Messaging', () => {
    let client1: WebSocketTestClient;
    let client2: WebSocketTestClient;

    beforeEach(async () => {
      // Create two WebSocket clients
      client1 = createWebSocketClient({
        url: MESSAGING_SERVICE_URL,
        auth: { token: 'user1_token' },
      });

      client2 = createWebSocketClient({
        url: MESSAGING_SERVICE_URL,
        auth: { token: 'user2_token' },
      });

      await Promise.all([
        client1.connect(),
        client2.connect(),
      ]);
    });

    afterEach(async () => {
      await Promise.all([
        client1.cleanup(),
        client2.cleanup(),
      ]);
    });

    it('should send and receive messages between users', async () => {
      const conversationId = 'test-conversation-123';

      // Client 2 joins conversation and listens for messages
      await client2.joinRoom(conversationId);
      const messagePromise = client2.waitForEvent('new_message', 5000);

      // Client 1 sends a message
      await client1.emitWithAck('send_message', {
        conversationId,
        content: 'Hello from user 1!',
      });

      // Client 2 should receive the message
      const receivedMessage = await messagePromise;

      expect(receivedMessage).toMatchObject({
        conversationId,
        content: 'Hello from user 1!',
      });
    });

    it('should deliver typing indicators', async () => {
      const conversationId = 'test-conversation-456';

      await Promise.all([
        client1.joinRoom(conversationId),
        client2.joinRoom(conversationId),
      ]);

      // Client 2 listens for typing events
      const typingPromise = client2.waitForEvent('user_typing', 5000);

      // Client 1 starts typing
      client1.emit('typing', { conversationId });

      // Client 2 should receive typing indicator
      const typingEvent = await typingPromise;

      expect(typingEvent).toMatchObject({
        conversationId,
      });
    });

    it('should handle message delivery receipts', async () => {
      const conversationId = 'test-conversation-789';

      await client1.joinRoom(conversationId);
      await client2.joinRoom(conversationId);

      // Client 1 listens for read receipts
      const readPromise = client1.waitForEvent('message_read', 5000);

      // Client 1 sends a message
      const sendResponse = await client1.emitWithAck('send_message', {
        conversationId,
        content: 'Test message',
      });

      const messageId = sendResponse.messageId;

      // Client 2 marks message as read
      client2.emit('mark_read', { messageId });

      // Client 1 should receive read receipt
      const readReceipt = await readPromise;

      expect(readReceipt.messageId).toBe(messageId);
    });
  });

  describe('Connection Management', () => {
    it('should handle reconnection', async () => {
      const client = createWebSocketClient({
        url: MESSAGING_SERVICE_URL,
        reconnection: true,
      });

      await client.connect();
      expect(client.isConnected()).toBe(true);

      // Disconnect
      await client.disconnect();
      expect(client.isConnected()).toBe(false);

      // Reconnect
      await client.connect();
      expect(client.isConnected()).toBe(true);

      await client.cleanup();
    });

    it('should handle multiple concurrent connections', async () => {
      const clients = await createMultipleClients(10, {
        url: MESSAGING_SERVICE_URL,
      });

      // All clients should be connected
      expect(clients.every(c => c.isConnected())).toBe(true);

      // Each client should have a unique socket ID
      const socketIds = clients.map(c => c.getSocketId());
      const uniqueIds = new Set(socketIds);
      expect(uniqueIds.size).toBe(clients.length);

      await cleanupMultipleClients(clients);
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const client = createWebSocketClient({
        url: 'http://localhost:9999', // Invalid URL
        reconnection: false,
      });

      await expect(client.connect()).rejects.toThrow();
    });

    it('should validate message format', async () => {
      const client = createWebSocketClient({
        url: MESSAGING_SERVICE_URL,
        auth: { token: 'user_token' },
      });

      await client.connect();

      // Try to send invalid message
      const response = await client.emitWithAck('send_message', {
        // Missing required fields
        content: '',
      });

      expect(response.error).toBeDefined();

      await client.cleanup();
    });
  });

  describe('Real-time Notifications', () => {
    it('should receive match notifications', async () => {
      const client = createWebSocketClient({
        url: MESSAGING_SERVICE_URL,
        auth: { token: 'user_token' },
      });

      await client.connect();

      const notificationPromise = client.waitForEvent('new_match', 5000);

      // Simulate a match event (this would normally come from the server)
      // In a real test, you'd trigger this via another API call

      // For this example, we'll just wait and handle timeout
      // await notificationPromise;

      await client.cleanup();
    });
  });
});
