/**
 * Chat Moderation Service
 * Handles content moderation, spam detection, and safety features for messaging
 */

import { createLogger } from '../utils/logger';
import axios from 'axios';

const logger = createLogger('chat-moderation');

// Moderation service URL
const MODERATION_SERVICE_URL = process.env.MODERATION_SERVICE_URL || 'http://moderation-service:3008';

export interface ModerationResult {
  isAllowed: boolean;
  flags: ModerationFlag[];
  action: 'allow' | 'flag' | 'block' | 'auto_block';
  reason?: string;
  confidence: number;
}

export interface ModerationFlag {
  type: 'spam' | 'harassment' | 'scam' | 'explicit' | 'personal_info' | 'prohibited_content' | 'link';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

export interface ReportData {
  reporterId: string;
  reportedUserId: string;
  conversationId: string;
  messageIds?: string[];
  reason: ReportReason;
  details?: string;
}

export type ReportReason =
  | 'harassment'
  | 'spam'
  | 'scam'
  | 'inappropriate_content'
  | 'impersonation'
  | 'threats'
  | 'underage'
  | 'solicitation'
  | 'other';

// Banned words list (basic filter - production would use ML models)
const BANNED_WORDS = [
  // Add production-appropriate banned words
  'placeholder_banned_word',
];

// Scam patterns
const SCAM_PATTERNS = [
  /send.*money|wire.*transfer|western\s*union|bitcoin.*send|crypto.*invest/i,
  /inherited.*millions?|lottery.*winner|prince.*nigeria/i,
  /verify.*identity.*link|click.*here.*urgent|account.*suspended/i,
  /cashapp|venmo|zelle|paypal.*send/i,
  /investment.*guaranteed|double.*your.*money|quick.*profit/i,
];

// Personal info patterns
const PERSONAL_INFO_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN pattern
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/, // Credit card patterns
];

// Spam detection thresholds
const SPAM_CONFIG = {
  maxMessagesPerMinute: 10,
  maxRepeatedContent: 3,
  maxLinksPerMessage: 2,
  minTimeBetweenMessages: 500, // ms
};

// Rate limiting map (in production, use Redis)
const userMessageCounts: Map<string, { count: number; firstMessageTime: number; lastMessageTime: number }> = new Map();
const recentMessages: Map<string, string[]> = new Map();

class ChatModerationService {
  /**
   * Moderate a message before sending
   */
  async moderateMessage(
    content: string,
    senderId: string,
    receiverId: string,
    conversationId: string
  ): Promise<ModerationResult> {
    const flags: ModerationFlag[] = [];

    // 1. Check spam rate limiting
    const spamCheck = this.checkSpamRate(senderId, content);
    if (spamCheck) {
      flags.push(spamCheck);
    }

    // 2. Check for banned words
    const bannedWordCheck = this.checkBannedWords(content);
    if (bannedWordCheck) {
      flags.push(bannedWordCheck);
    }

    // 3. Check for scam patterns
    const scamCheck = this.checkScamPatterns(content);
    if (scamCheck) {
      flags.push(scamCheck);
    }

    // 4. Check for personal information sharing
    const personalInfoCheck = this.checkPersonalInfo(content);
    if (personalInfoCheck) {
      flags.push(personalInfoCheck);
    }

    // 5. Check for external links
    const linkCheck = this.checkLinks(content);
    if (linkCheck) {
      flags.push(linkCheck);
    }

    // 6. Call external moderation service for AI-based content analysis
    try {
      const aiModeration = await this.callAIModerationService(content, senderId);
      if (aiModeration.flags.length > 0) {
        flags.push(...aiModeration.flags);
      }
    } catch (error: any) {
      logger.warn('AI moderation service unavailable:', error.message);
      // Continue with rule-based moderation
    }

    // Determine action based on flags
    const result = this.determineAction(flags);

    // Log moderation decision
    if (flags.length > 0) {
      logger.info(`Message moderated: userId=${senderId}, action=${result.action}, flags=${JSON.stringify(flags)}`);
    }

    return result;
  }

  /**
   * Check for spam based on message frequency
   */
  private checkSpamRate(userId: string, content: string): ModerationFlag | null {
    const now = Date.now();
    const userStats = userMessageCounts.get(userId);

    if (userStats) {
      const timeSinceFirstMessage = now - userStats.firstMessageTime;
      const timeSinceLastMessage = now - userStats.lastMessageTime;

      // Check message rate
      if (timeSinceFirstMessage < 60000 && userStats.count >= SPAM_CONFIG.maxMessagesPerMinute) {
        return {
          type: 'spam',
          severity: 'high',
          details: 'Too many messages sent in a short time',
        };
      }

      // Check for rapid-fire messages
      if (timeSinceLastMessage < SPAM_CONFIG.minTimeBetweenMessages) {
        return {
          type: 'spam',
          severity: 'medium',
          details: 'Messages sent too quickly',
        };
      }

      // Update stats
      if (timeSinceFirstMessage >= 60000) {
        userMessageCounts.set(userId, { count: 1, firstMessageTime: now, lastMessageTime: now });
      } else {
        userMessageCounts.set(userId, {
          count: userStats.count + 1,
          firstMessageTime: userStats.firstMessageTime,
          lastMessageTime: now,
        });
      }
    } else {
      userMessageCounts.set(userId, { count: 1, firstMessageTime: now, lastMessageTime: now });
    }

    // Check for repeated content
    const userRecentMessages = recentMessages.get(userId) || [];
    const contentHash = content.toLowerCase().trim();
    const repeatCount = userRecentMessages.filter((m) => m === contentHash).length;

    if (repeatCount >= SPAM_CONFIG.maxRepeatedContent) {
      return {
        type: 'spam',
        severity: 'medium',
        details: 'Repeated message content detected',
      };
    }

    // Update recent messages (keep last 10)
    userRecentMessages.push(contentHash);
    if (userRecentMessages.length > 10) {
      userRecentMessages.shift();
    }
    recentMessages.set(userId, userRecentMessages);

    return null;
  }

  /**
   * Check for banned words
   */
  private checkBannedWords(content: string): ModerationFlag | null {
    const lowerContent = content.toLowerCase();

    for (const word of BANNED_WORDS) {
      if (lowerContent.includes(word.toLowerCase())) {
        return {
          type: 'prohibited_content',
          severity: 'high',
          details: 'Message contains prohibited content',
        };
      }
    }

    return null;
  }

  /**
   * Check for scam patterns
   */
  private checkScamPatterns(content: string): ModerationFlag | null {
    for (const pattern of SCAM_PATTERNS) {
      if (pattern.test(content)) {
        return {
          type: 'scam',
          severity: 'critical',
          details: 'Potential scam detected',
        };
      }
    }

    return null;
  }

  /**
   * Check for personal information sharing
   */
  private checkPersonalInfo(content: string): ModerationFlag | null {
    for (const pattern of PERSONAL_INFO_PATTERNS) {
      if (pattern.test(content)) {
        return {
          type: 'personal_info',
          severity: 'medium',
          details: 'Message may contain personal information',
        };
      }
    }

    return null;
  }

  /**
   * Check for external links
   */
  private checkLinks(content: string): ModerationFlag | null {
    // Match URLs with protocol
    const urlPattern = /https?:\/\/[^\s]+/gi;
    const links: string[] = content.match(urlPattern) || [];

    // Also match shortened URLs without protocol (e.g., bit.ly/something)
    const suspiciousDomains = ['bit.ly', 'tinyurl', 'shorturl', 'goo.gl', 't.co', 'is.gd', 'ow.ly', 'buff.ly', 'rebrand.ly'];
    const shortUrlPattern = new RegExp(
      `(?:${suspiciousDomains.map(d => d.replace('.', '\\.')).join('|')})\\/[^\\s]*`,
      'gi'
    );
    const shortLinks: string[] = content.match(shortUrlPattern) || [];

    const allLinks = [...links, ...shortLinks];

    if (allLinks.length > SPAM_CONFIG.maxLinksPerMessage) {
      return {
        type: 'link',
        severity: 'medium',
        details: 'Too many links in message',
      };
    }

    // Check for suspicious domains in full URLs
    const hasSuspiciousFullUrl = links.some((link: string) =>
      suspiciousDomains.some((domain: string) => link.toLowerCase().includes(domain))
    );

    // Check if any short URLs were found (they're inherently suspicious)
    if (hasSuspiciousFullUrl || shortLinks.length > 0) {
      return {
        type: 'link',
        severity: 'medium',
        details: 'Shortened or suspicious link detected',
      };
    }

    return null;
  }

  /**
   * Call AI moderation service
   */
  private async callAIModerationService(content: string, userId: string): Promise<{ flags: ModerationFlag[] }> {
    const response = await axios.post(
      `${MODERATION_SERVICE_URL}/api/moderation/analyze`,
      {
        content,
        userId,
        type: 'chat_message',
      },
      {
        timeout: 3000,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Auth': process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
        },
      }
    );

    const flags: ModerationFlag[] = [];

    if (response.data.categories) {
      for (const [category, score] of Object.entries(response.data.categories)) {
        if ((score as number) > 0.7) {
          flags.push({
            type: this.mapCategory(category),
            severity: (score as number) > 0.9 ? 'critical' : 'high',
            details: `AI detected: ${category}`,
          });
        }
      }
    }

    return { flags };
  }

  /**
   * Map AI category to moderation flag type
   */
  private mapCategory(category: string): ModerationFlag['type'] {
    const mapping: Record<string, ModerationFlag['type']> = {
      hate: 'harassment',
      sexual: 'explicit',
      violence: 'harassment',
      harassment: 'harassment',
      'self-harm': 'prohibited_content',
      'sexual/minors': 'prohibited_content',
    };

    return mapping[category] || 'prohibited_content';
  }

  /**
   * Determine action based on flags
   */
  private determineAction(flags: ModerationFlag[]): ModerationResult {
    if (flags.length === 0) {
      return {
        isAllowed: true,
        flags: [],
        action: 'allow',
        confidence: 1.0,
      };
    }

    // Critical severity = auto block
    const hasCritical = flags.some((f) => f.severity === 'critical');
    if (hasCritical) {
      return {
        isAllowed: false,
        flags,
        action: 'auto_block',
        reason: 'Critical content policy violation',
        confidence: 0.95,
      };
    }

    // High severity = block
    const hasHigh = flags.some((f) => f.severity === 'high');
    if (hasHigh) {
      return {
        isAllowed: false,
        flags,
        action: 'block',
        reason: 'Content policy violation',
        confidence: 0.85,
      };
    }

    // Medium severity = flag for review but allow
    const hasMedium = flags.some((f) => f.severity === 'medium');
    if (hasMedium) {
      return {
        isAllowed: true,
        flags,
        action: 'flag',
        reason: 'Content flagged for review',
        confidence: 0.7,
      };
    }

    // Low severity = allow
    return {
      isAllowed: true,
      flags,
      action: 'allow',
      confidence: 0.9,
    };
  }

  /**
   * Report a message or conversation
   */
  async reportContent(data: ReportData): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      // Store report in database
      const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Send to moderation service
      await axios.post(
        `${MODERATION_SERVICE_URL}/api/reports`,
        {
          id: reportId,
          ...data,
          createdAt: new Date().toISOString(),
          status: 'pending',
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Auth': process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
          },
        }
      );

      logger.info(`Report created: ${reportId}, reason: ${data.reason}`);

      return { success: true, reportId };
    } catch (error: any) {
      logger.error('Failed to create report:', error);
      return { success: false, error: 'Failed to submit report' };
    }
  }

  /**
   * Block a user in messaging
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    conversationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Send to user service to handle blocking
      await axios.post(
        `${process.env.USER_SERVICE_URL || 'http://user-service:3001'}/api/blocks`,
        {
          blockerId,
          blockedId,
          context: 'messaging',
          conversationId,
          createdAt: new Date().toISOString(),
        },
        {
          timeout: 5000,
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Auth': process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
          },
        }
      );

      logger.info(`User blocked: ${blockerId} blocked ${blockedId}`);

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to block user:', error);
      return { success: false, error: 'Failed to block user' };
    }
  }

  /**
   * Check if user is blocked
   */
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${process.env.USER_SERVICE_URL || 'http://user-service:3001'}/api/blocks/check`,
        {
          params: { userId1, userId2 },
          timeout: 3000,
          headers: {
            'X-Service-Auth': process.env.INTERNAL_SERVICE_KEY || 'internal-service-key',
          },
        }
      );

      return response.data.isBlocked || false;
    } catch (error: any) {
      logger.error('Failed to check block status:', error);
      return false;
    }
  }
}

export const chatModerationService = new ChatModerationService();
export default chatModerationService;
