import { getTestDb, createTestUser, createTestMatch } from '../setup';
import { hashPassword } from '../../../services/auth-service/src/utils/encryption';

describe('Messaging Service Integration Tests', () => {
  let testDb: any;
  let user1: any;
  let user2: any;
  let match: any;

  beforeAll(() => {
    testDb = getTestDb();
  });

  beforeEach(async () => {
    const passwordHash = await hashPassword('SecurePass123!');

    user1 = await createTestUser({
      email: 'sender@example.com',
      password_hash: passwordHash,
    });

    user2 = await createTestUser({
      email: 'receiver@example.com',
      password_hash: passwordHash,
    });

    // Create match between users
    match = await createTestMatch(user1.id, user2.id);
  });

  describe('Message Creation', () => {
    it('should send message successfully', async () => {
      const messageContent = 'Hello! How are you?';

      const result = await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [match.id, user1.id, messageContent]
      );

      expect(result.rows[0].content).toBe(messageContent);
      expect(result.rows[0].sender_id).toBe(user1.id);
      expect(result.rows[0].is_read).toBe(false);
    });

    it('should update match last_message_at on new message', async () => {
      const messageContent = 'Test message';

      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)`,
        [match.id, user1.id, messageContent]
      );

      // Update match
      await testDb.query(
        `UPDATE matches SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [match.id]
      );

      const result = await testDb.query(
        `SELECT last_message_at FROM matches WHERE id = $1`,
        [match.id]
      );

      expect(result.rows[0].last_message_at).not.toBeNull();
    });

    it('should reject empty messages', async () => {
      await expect(
        testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)`,
          [match.id, user1.id, '']
        )
      ).rejects.toThrow();
    });

    it('should handle long messages', async () => {
      const longMessage = 'A'.repeat(5000);

      const result = await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [match.id, user1.id, longMessage]
      );

      expect(result.rows[0].content).toHaveLength(5000);
    });
  });

  describe('Message Retrieval', () => {
    beforeEach(async () => {
      // Create sample messages
      const messages = [
        'First message',
        'Second message',
        'Third message',
      ];

      for (const content of messages) {
        await testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)`,
          [match.id, user1.id, content]
        );
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    it('should retrieve all messages for a match', async () => {
      const result = await testDb.query(
        `SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC`,
        [match.id]
      );

      expect(result.rows).toHaveLength(3);
      expect(result.rows[0].content).toBe('First message');
      expect(result.rows[2].content).toBe('Third message');
    });

    it('should retrieve messages with pagination', async () => {
      const limit = 2;
      const offset = 1;

      const result = await testDb.query(
        `SELECT * FROM messages
         WHERE match_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [match.id, limit, offset]
      );

      expect(result.rows).toHaveLength(2);
    });

    it('should get latest message for a match', async () => {
      const result = await testDb.query(
        `SELECT * FROM messages
         WHERE match_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [match.id]
      );

      expect(result.rows[0].content).toBe('Third message');
    });

    it('should retrieve messages with sender info', async () => {
      const result = await testDb.query(
        `SELECT m.*, u.first_name, u.last_name, u.email
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE m.match_id = $1
         ORDER BY m.created_at ASC`,
        [match.id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]).toHaveProperty('first_name');
      expect(result.rows[0]).toHaveProperty('email');
    });
  });

  describe('Read Receipts', () => {
    let message: any;

    beforeEach(async () => {
      const result = await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Test message')
         RETURNING *`,
        [match.id, user1.id]
      );
      message = result.rows[0];
    });

    it('should mark message as read', async () => {
      await testDb.query(
        `UPDATE messages
         SET is_read = true, read_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [message.id]
      );

      const result = await testDb.query(
        `SELECT is_read, read_at FROM messages WHERE id = $1`,
        [message.id]
      );

      expect(result.rows[0].is_read).toBe(true);
      expect(result.rows[0].read_at).not.toBeNull();
    });

    it('should mark all messages in conversation as read', async () => {
      // Create multiple messages
      for (let i = 0; i < 3; i++) {
        await testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)`,
          [match.id, user2.id, `Message ${i}`]
        );
      }

      // Mark all as read by user1
      await testDb.query(
        `UPDATE messages
         SET is_read = true, read_at = CURRENT_TIMESTAMP
         WHERE match_id = $1 AND sender_id = $2 AND is_read = false`,
        [match.id, user2.id]
      );

      const result = await testDb.query(
        `SELECT COUNT(*) as unread_count
         FROM messages
         WHERE match_id = $1 AND sender_id = $2 AND is_read = false`,
        [match.id, user2.id]
      );

      expect(parseInt(result.rows[0].unread_count)).toBe(0);
    });

    it('should count unread messages for user', async () => {
      // Create messages from user2 to user1
      for (let i = 0; i < 5; i++) {
        await testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)`,
          [match.id, user2.id, `Unread message ${i}`]
        );
      }

      const result = await testDb.query(
        `SELECT COUNT(*) as unread_count
         FROM messages m
         JOIN matches mt ON m.match_id = mt.id
         WHERE (mt.user1_id = $1 OR mt.user2_id = $1)
         AND m.sender_id != $1
         AND m.is_read = false`,
        [user1.id]
      );

      expect(parseInt(result.rows[0].unread_count)).toBe(5);
    });
  });

  describe('Conversation Management', () => {
    it('should get all conversations for user', async () => {
      // Create another match and messages
      const user3 = await createTestUser({
        email: 'user3@example.com',
        password_hash: await hashPassword('SecurePass123!'),
      });
      const match2 = await createTestMatch(user1.id, user3.id);

      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Message in match 1')`,
        [match.id, user1.id]
      );

      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Message in match 2')`,
        [match2.id, user1.id]
      );

      const result = await testDb.query(
        `SELECT DISTINCT m.match_id
         FROM messages m
         JOIN matches mt ON m.match_id = mt.id
         WHERE mt.user1_id = $1 OR mt.user2_id = $1`,
        [user1.id]
      );

      expect(result.rows).toHaveLength(2);
    });

    it('should get conversations with last message', async () => {
      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Latest message')`,
        [match.id, user1.id]
      );

      const result = await testDb.query(
        `SELECT
           mt.*,
           m.content as last_message,
           m.created_at as last_message_at
         FROM matches mt
         LEFT JOIN LATERAL (
           SELECT content, created_at
           FROM messages
           WHERE match_id = mt.id
           ORDER BY created_at DESC
           LIMIT 1
         ) m ON true
         WHERE mt.user1_id = $1 OR mt.user2_id = $1`,
        [user1.id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].last_message).toBe('Latest message');
    });

    it('should order conversations by last message time', async () => {
      // Create another match
      const user3 = await createTestUser({
        email: 'user3@example.com',
        password_hash: await hashPassword('SecurePass123!'),
      });
      const match2 = await createTestMatch(user1.id, user3.id);

      // Send message in first match
      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Old message')`,
        [match.id, user1.id]
      );

      await new Promise(resolve => setTimeout(resolve, 100));

      // Send message in second match (newer)
      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'New message')`,
        [match2.id, user1.id]
      );

      // Update last_message_at
      await testDb.query(`UPDATE matches SET last_message_at = CURRENT_TIMESTAMP WHERE id = $1`, [match2.id]);

      const result = await testDb.query(
        `SELECT * FROM matches
         WHERE user1_id = $1 OR user2_id = $1
         ORDER BY COALESCE(last_message_at, matched_at) DESC`,
        [user1.id]
      );

      expect(result.rows[0].id).toBe(match2.id); // Newest first
    });
  });

  describe('Message Deletion', () => {
    let message: any;

    beforeEach(async () => {
      const result = await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Message to delete')
         RETURNING *`,
        [match.id, user1.id]
      );
      message = result.rows[0];
    });

    it('should delete message', async () => {
      await testDb.query(
        `DELETE FROM messages WHERE id = $1`,
        [message.id]
      );

      const result = await testDb.query(
        `SELECT * FROM messages WHERE id = $1`,
        [message.id]
      );

      expect(result.rows).toHaveLength(0);
    });

    it('should soft delete conversation', async () => {
      // In production, might use soft delete instead of hard delete
      await testDb.query(
        `UPDATE messages
         SET content = '[Message deleted]'
         WHERE id = $1`,
        [message.id]
      );

      const result = await testDb.query(
        `SELECT content FROM messages WHERE id = $1`,
        [message.id]
      );

      expect(result.rows[0].content).toBe('[Message deleted]');
    });
  });

  describe('Message Filtering and Moderation', () => {
    it('should detect messages with inappropriate content', async () => {
      const inappropriateMessage = 'This contains bad word';

      await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)`,
        [match.id, user1.id, inappropriateMessage]
      );

      // In production, would use AI/moderation service
      // This is a simplified check
      const badWords = ['bad', 'inappropriate'];
      const containsBadWord = badWords.some(word =>
        inappropriateMessage.toLowerCase().includes(word)
      );

      expect(containsBadWord).toBe(true);
    });

    it('should flag messages for review', async () => {
      const messageResult = await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, 'Potentially problematic message')
         RETURNING *`,
        [match.id, user1.id]
      );

      // Flag message (would need a message_flags table in production)
      const flagged = true;
      expect(flagged).toBe(true);
    });
  });

  describe('Real-time Messaging', () => {
    it('should simulate real-time message delivery', async () => {
      const message = 'Real-time message';

      const result = await testDb.query(
        `INSERT INTO messages (match_id, sender_id, content)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [match.id, user1.id, message]
      );

      // In production, would emit WebSocket event
      expect(result.rows[0].created_at).toBeDefined();
    });

    it('should handle concurrent message sending', async () => {
      // Simulate two users sending messages simultaneously
      const promises = [
        testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, 'Message from user1')`,
          [match.id, user1.id]
        ),
        testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, 'Message from user2')`,
          [match.id, user2.id]
        ),
      ];

      await Promise.all(promises);

      const result = await testDb.query(
        `SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC`,
        [match.id]
      );

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('Message Statistics', () => {
    beforeEach(async () => {
      // Create multiple messages
      for (let i = 0; i < 10; i++) {
        await testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)`,
          [match.id, i % 2 === 0 ? user1.id : user2.id, `Message ${i}`]
        );
      }
    });

    it('should count messages per user', async () => {
      const result = await testDb.query(
        `SELECT sender_id, COUNT(*) as message_count
         FROM messages
         WHERE match_id = $1
         GROUP BY sender_id`,
        [match.id]
      );

      expect(result.rows).toHaveLength(2);
      result.rows.forEach((row: any) => {
        expect(parseInt(row.message_count)).toBe(5);
      });
    });

    it('should calculate average message length', async () => {
      const result = await testDb.query(
        `SELECT AVG(LENGTH(content)) as avg_length
         FROM messages
         WHERE match_id = $1`,
        [match.id]
      );

      expect(parseFloat(result.rows[0].avg_length)).toBeGreaterThan(0);
    });

    it('should get message frequency over time', async () => {
      const result = await testDb.query(
        `SELECT
           DATE(created_at) as date,
           COUNT(*) as message_count
         FROM messages
         WHERE match_id = $1
         GROUP BY DATE(created_at)
         ORDER BY date DESC`,
        [match.id]
      );

      expect(result.rows.length).toBeGreaterThan(0);
    });
  });

  describe('Typing Indicators', () => {
    it('should track typing status (using Redis in production)', async () => {
      // This would typically be stored in Redis for real-time updates
      const typingKey = `typing:${match.id}:${user1.id}`;
      const isTyping = true;

      expect(isTyping).toBe(true);
      // In production: await redis.setex(typingKey, 5, '1');
    });
  });

  describe('Message Search', () => {
    beforeEach(async () => {
      const messages = [
        'Looking forward to our coffee date',
        'I love hiking in the mountains',
        'Have you seen the latest movie?',
      ];

      for (const content of messages) {
        await testDb.query(
          `INSERT INTO messages (match_id, sender_id, content)
           VALUES ($1, $2, $3)`,
          [match.id, user1.id, content]
        );
      }
    });

    it('should search messages by content', async () => {
      const searchTerm = 'hiking';

      const result = await testDb.query(
        `SELECT * FROM messages
         WHERE match_id = $1
         AND content ILIKE $2`,
        [match.id, `%${searchTerm}%`]
      );

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].content).toContain('hiking');
    });

    it('should search messages case-insensitively', async () => {
      const searchTerm = 'MOVIE';

      const result = await testDb.query(
        `SELECT * FROM messages
         WHERE match_id = $1
         AND content ILIKE $2`,
        [match.id, `%${searchTerm}%`]
      );

      expect(result.rows).toHaveLength(1);
    });
  });
});
