import { Container } from '@azure/cosmos';
import { createLogger } from '@flamoral/shared';
import { cosmosClient } from '../infrastructure/database/cosmos-client';
import { conversationRepository } from '../domain/repositories/conversation.repository';
import { MessageSearchQuery, MessageSearchResult } from '../types/enhanced-types';
import { Message, MessageType } from '../types';

const logger = createLogger('message-search-service');

export class MessageSearchService {
  private container: Container;

  constructor() {
    this.container = cosmosClient.getMessagesContainer();
  }

  /**
   * Search messages across conversations or within a specific conversation
   */
  async searchMessages(searchQuery: MessageSearchQuery): Promise<MessageSearchResult[]> {
    try {
      const {
        conversationId,
        userId,
        query,
        type,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = searchQuery;

      // Build dynamic query
      let queryText = `SELECT * FROM c WHERE 1=1`;
      const parameters: any[] = [];

      // If no specific conversation, search across all user's conversations
      if (conversationId) {
        queryText += ` AND c.conversationId = @conversationId`;
        parameters.push({ name: '@conversationId', value: conversationId });
      } else {
        // Get all conversations for the user
        const conversations = await conversationRepository.findByUserId(userId);
        const conversationIds = conversations.map(c => c.id);

        if (conversationIds.length === 0) {
          return [];
        }

        queryText += ` AND c.conversationId IN (${conversationIds.map((_, i) => `@convId${i}`).join(',')})`;
        conversationIds.forEach((id, i) => {
          parameters.push({ name: `@convId${i}`, value: id });
        });
      }

      // Filter by user participation (exclude messages deleted for this user)
      queryText += ` AND (NOT IS_DEFINED(c.deletedFor) OR NOT ARRAY_CONTAINS(c.deletedFor, @userId))`;
      parameters.push({ name: '@userId', value: userId });

      // Search query - using CONTAINS for text search
      if (query && query.trim()) {
        queryText += ` AND CONTAINS(LOWER(c.content), LOWER(@query))`;
        parameters.push({ name: '@query', value: query.trim() });
      }

      // Filter by message type
      if (type) {
        queryText += ` AND c.type = @type`;
        parameters.push({ name: '@type', value: type });
      }

      // Date range filter
      if (startDate) {
        queryText += ` AND c.sentAt >= @startDate`;
        parameters.push({ name: '@startDate', value: startDate });
      }

      if (endDate) {
        queryText += ` AND c.sentAt <= @endDate`;
        parameters.push({ name: '@endDate', value: endDate });
      }

      // Order by relevance (most recent first for now)
      queryText += ` ORDER BY c.sentAt DESC`;

      // Pagination
      queryText += ` OFFSET @offset LIMIT @limit`;
      parameters.push({ name: '@offset', value: offset });
      parameters.push({ name: '@limit', value: limit });

      const querySpec = {
        query: queryText,
        parameters,
      };

      const { resources: messages } = await this.container.items
        .query<Message>(querySpec)
        .fetchAll();

      // Convert to search results with highlighted content
      const results: MessageSearchResult[] = messages.map(message => {
        const highlightedContent = query
          ? this.highlightSearchTerm(message.content, query)
          : message.content;

        return {
          message,
          conversationId: message.conversationId,
          matchScore: this.calculateMatchScore(message, query),
          highlightedContent,
        };
      });

      // Sort by match score (higher score first)
      results.sort((a, b) => b.matchScore - a.matchScore);

      logger.info('Message search completed', {
        userId,
        query,
        resultsCount: results.length,
      });

      return results;
    } catch (error: any) {
      logger.error('Failed to search messages:', error);
      throw error;
    }
  }

  /**
   * Search messages within a specific conversation
   */
  async searchInConversation(
    conversationId: string,
    userId: string,
    query: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageSearchResult[]> {
    return this.searchMessages({
      conversationId,
      userId,
      query,
      limit,
      offset,
    });
  }

  /**
   * Search across all conversations
   */
  async searchAllConversations(
    userId: string,
    query: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageSearchResult[]> {
    return this.searchMessages({
      userId,
      query,
      limit,
      offset,
    });
  }

  /**
   * Search messages by type (e.g., find all images)
   */
  async searchByType(
    userId: string,
    type: MessageType,
    conversationId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MessageSearchResult[]> {
    return this.searchMessages({
      userId,
      conversationId,
      query: '',
      type,
      limit,
      offset,
    });
  }

  /**
   * Get shared media in a conversation
   */
  async getSharedMedia(
    conversationId: string,
    userId: string,
    mediaType: 'image' | 'video' | 'gif' | 'voice' | 'file',
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      let type: MessageType;
      switch (mediaType) {
        case 'image':
          type = MessageType.IMAGE;
          break;
        case 'video':
          type = MessageType.VIDEO;
          break;
        case 'gif':
          type = MessageType.GIF;
          break;
        case 'voice':
          type = MessageType.VOICE;
          break;
        case 'file':
          type = MessageType.FILE;
          break;
        default:
          throw new Error('Invalid media type');
      }

      const results = await this.searchByType(userId, type, conversationId, limit, offset);
      return results.map(r => r.message);
    } catch (error: any) {
      logger.error('Failed to get shared media:', error);
      throw error;
    }
  }

  /**
   * Calculate match score for search relevance
   */
  private calculateMatchScore(message: Message, query: string): number {
    if (!query || !query.trim()) {
      return 1; // Default score when no query
    }

    const lowerQuery = query.toLowerCase();
    const lowerContent = message.content.toLowerCase();

    let score = 0;

    // Exact match gets highest score
    if (lowerContent === lowerQuery) {
      score += 10;
    }

    // Contains exact phrase gets high score
    if (lowerContent.includes(lowerQuery)) {
      score += 5;
    }

    // Word matches
    const queryWords = lowerQuery.split(/\s+/);
    const contentWords = lowerContent.split(/\s+/);

    for (const queryWord of queryWords) {
      for (const contentWord of contentWords) {
        if (contentWord === queryWord) {
          score += 2;
        } else if (contentWord.includes(queryWord)) {
          score += 1;
        }
      }
    }

    // Recency bonus (more recent messages get a small boost)
    const daysSinceMessage = (Date.now() - new Date(message.sentAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceMessage < 7) {
      score += 0.5;
    } else if (daysSinceMessage < 30) {
      score += 0.2;
    }

    return score;
  }

  /**
   * Highlight search term in content
   */
  private highlightSearchTerm(content: string, query: string): string {
    if (!query || !query.trim()) {
      return content;
    }

    const regex = new RegExp(`(${query})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Get recent searches for a user (could be cached in Redis)
   */
  async getRecentSearches(userId: string, limit: number = 10): Promise<string[]> {
    // This would typically be stored in Redis cache
    // For now, return empty array
    return [];
  }

  /**
   * Save search query to recent searches
   */
  async saveRecentSearch(userId: string, query: string): Promise<void> {
    // This would typically save to Redis cache
    logger.debug('Saving recent search', { userId, query });
  }
}

export const messageSearchService = new MessageSearchService();
export default messageSearchService;
