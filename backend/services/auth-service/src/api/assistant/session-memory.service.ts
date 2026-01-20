/**
 * FLAMORAL AI Assistant - Session Memory Service
 * Redis-backed conversation history and session state management
 */

import { v4 as uuidv4 } from 'uuid';
import redisCache from '../../infrastructure/cache/redis';
import logger from '../../utils/logger';
import {
  SessionMemory,
  ChatMessage,
  MessageRole,
  AssistantContext,
  AssistantError,
  ErrorCodes,
} from './assistant.types';

// ============================================================================
// CONSTANTS
// ============================================================================

const SESSION_PREFIX = 'assistant:session:';
const USER_SESSIONS_PREFIX = 'assistant:user_sessions:';
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds
const MAX_HISTORY_LENGTH = 50; // Max messages to keep in memory
const MAX_SESSIONS_PER_USER = 10;

// ============================================================================
// SESSION MEMORY SERVICE
// ============================================================================

class SessionMemoryService {
  /**
   * Create a new conversation session
   */
  async createSession(userId: string, context: AssistantContext): Promise<SessionMemory> {
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + SESSION_TTL * 1000).toISOString();

    const session: SessionMemory = {
      sessionId,
      userId,
      history: [],
      context,
      userSummary: '',
      topics: [],
      sentiment: 'neutral',
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    // Store the session
    await this.saveSession(session);

    // Track session for user
    await this.trackUserSession(userId, sessionId);

    logger.info('Created new assistant session', {
      sessionId,
      userId,
      context,
    });

    return session;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<SessionMemory | null> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      const data = await redisCache.get(key);

      if (!data) {
        return null;
      }

      return JSON.parse(data) as SessionMemory;
    } catch (error) {
      logger.error('Failed to get session', { sessionId, error });
      return null;
    }
  }

  /**
   * Get or create a session for a user
   */
  async getOrCreateSession(
    userId: string,
    sessionId?: string,
    context: AssistantContext = AssistantContext.GENERAL
  ): Promise<SessionMemory> {
    // Try to get existing session
    if (sessionId) {
      const existingSession = await this.getSession(sessionId);
      if (existingSession && existingSession.userId === userId) {
        return existingSession;
      }
    }

    // Get most recent session for user
    const recentSession = await this.getMostRecentSession(userId);
    if (recentSession) {
      // Update context if different
      if (recentSession.context !== context) {
        recentSession.context = context;
        await this.saveSession(recentSession);
      }
      return recentSession;
    }

    // Create new session
    return this.createSession(userId, context);
  }

  /**
   * Add a message to session history
   */
  async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    context?: AssistantContext,
    metadata?: Record<string, unknown>
  ): Promise<ChatMessage> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new AssistantError(
        'Session not found',
        ErrorCodes.SESSION_NOT_FOUND,
        404
      );
    }

    const message: ChatMessage = {
      id: uuidv4(),
      role,
      content,
      timestamp: new Date().toISOString(),
      context,
      metadata,
    };

    // Add message to history
    session.history.push(message);

    // Trim history if too long
    if (session.history.length > MAX_HISTORY_LENGTH) {
      // Keep system messages and trim oldest user/assistant messages
      const systemMessages = session.history.filter(m => m.role === MessageRole.SYSTEM);
      const otherMessages = session.history.filter(m => m.role !== MessageRole.SYSTEM);
      session.history = [
        ...systemMessages,
        ...otherMessages.slice(-MAX_HISTORY_LENGTH + systemMessages.length),
      ];
    }

    // Update metadata
    session.updatedAt = new Date().toISOString();
    if (context) {
      session.context = context;
    }

    // Extract topics from user messages
    if (role === MessageRole.USER) {
      const newTopics = this.extractTopics(content);
      session.topics = [...new Set([...session.topics, ...newTopics])].slice(-10);
    }

    // Update sentiment based on recent messages
    session.sentiment = this.analyzeSentiment(session.history.slice(-5));

    await this.saveSession(session);

    return message;
  }

  /**
   * Get conversation history for AI context
   */
  async getConversationHistory(
    sessionId: string,
    maxMessages: number = 10
  ): Promise<ChatMessage[]> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return [];
    }

    // Return most recent messages
    return session.history.slice(-maxMessages);
  }

  /**
   * Update session context
   */
  async updateContext(sessionId: string, context: AssistantContext): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new AssistantError(
        'Session not found',
        ErrorCodes.SESSION_NOT_FOUND,
        404
      );
    }

    session.context = context;
    session.updatedAt = new Date().toISOString();
    await this.saveSession(session);
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      // Remove from user's session list
      await this.removeUserSession(session.userId, sessionId);
    }

    const key = `${SESSION_PREFIX}${sessionId}`;
    await redisCache.del(key);

    logger.info('Deleted assistant session', { sessionId });
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<string[]> {
    try {
      const key = `${USER_SESSIONS_PREFIX}${userId}`;
      const data = await redisCache.get(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to get user sessions', { userId, error });
      return [];
    }
  }

  /**
   * Get the most recent session for a user
   */
  async getMostRecentSession(userId: string): Promise<SessionMemory | null> {
    const sessionIds = await this.getUserSessions(userId);
    if (sessionIds.length === 0) {
      return null;
    }

    // Get most recent session (last in the list)
    const sessionId = sessionIds[sessionIds.length - 1];
    return this.getSession(sessionId);
  }

  /**
   * Get session statistics for a user
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    activeSession: string | null;
    topics: string[];
  }> {
    const sessionIds = await this.getUserSessions(userId);
    let totalMessages = 0;
    const allTopics: string[] = [];
    let activeSession: string | null = null;

    for (const sessionId of sessionIds) {
      const session = await this.getSession(sessionId);
      if (session) {
        totalMessages += session.history.length;
        allTopics.push(...session.topics);
        activeSession = sessionId; // Last valid session is active
      }
    }

    return {
      totalSessions: sessionIds.length,
      totalMessages,
      activeSession,
      topics: [...new Set(allTopics)],
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async saveSession(session: SessionMemory): Promise<void> {
    const key = `${SESSION_PREFIX}${session.sessionId}`;
    await redisCache.set(key, JSON.stringify(session), SESSION_TTL);
  }

  private async trackUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${USER_SESSIONS_PREFIX}${userId}`;
    let sessions = await this.getUserSessions(userId);

    // Add new session
    sessions.push(sessionId);

    // Limit number of sessions per user
    if (sessions.length > MAX_SESSIONS_PER_USER) {
      // Delete oldest sessions
      const toDelete = sessions.slice(0, sessions.length - MAX_SESSIONS_PER_USER);
      for (const oldSessionId of toDelete) {
        await redisCache.del(`${SESSION_PREFIX}${oldSessionId}`);
      }
      sessions = sessions.slice(-MAX_SESSIONS_PER_USER);
    }

    await redisCache.set(key, JSON.stringify(sessions), SESSION_TTL);
  }

  private async removeUserSession(userId: string, sessionId: string): Promise<void> {
    const key = `${USER_SESSIONS_PREFIX}${userId}`;
    let sessions = await this.getUserSessions(userId);
    sessions = sessions.filter(id => id !== sessionId);
    await redisCache.set(key, JSON.stringify(sessions), SESSION_TTL);
  }

  private extractTopics(content: string): string[] {
    const topics: string[] = [];
    const lowerContent = content.toLowerCase();

    // Topic detection patterns
    const topicPatterns: [RegExp, string][] = [
      [/profile|bio|photo|picture/i, 'profile'],
      [/match|matches|matching/i, 'matching'],
      [/message|chat|conversation/i, 'messaging'],
      [/date|dating|meet|meeting/i, 'dating'],
      [/safe|safety|scam|fake|suspicious/i, 'safety'],
      [/premium|subscribe|subscription|upgrade/i, 'subscription'],
      [/verify|verification|badge/i, 'verification'],
      [/help|support|issue|problem/i, 'support'],
      [/like|swipe|super like/i, 'discovery'],
      [/video|call/i, 'video_calls'],
    ];

    for (const [pattern, topic] of topicPatterns) {
      if (pattern.test(lowerContent)) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private analyzeSentiment(messages: ChatMessage[]): 'positive' | 'neutral' | 'negative' {
    const userMessages = messages.filter(m => m.role === MessageRole.USER);
    if (userMessages.length === 0) return 'neutral';

    const content = userMessages.map(m => m.content.toLowerCase()).join(' ');

    // Simple keyword-based sentiment analysis
    const positiveWords = ['thanks', 'great', 'awesome', 'love', 'perfect', 'helpful', 'amazing', 'excited'];
    const negativeWords = ['frustrated', 'angry', 'annoyed', 'hate', 'terrible', 'awful', 'disappointed', 'upset'];

    let score = 0;
    for (const word of positiveWords) {
      if (content.includes(word)) score++;
    }
    for (const word of negativeWords) {
      if (content.includes(word)) score--;
    }

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }
}

// Export singleton instance
export const sessionMemoryService = new SessionMemoryService();
export default sessionMemoryService;
