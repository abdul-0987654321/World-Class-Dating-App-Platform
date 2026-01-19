/**
 * FLAMORAL AI Assistant - Core Service
 * Production-ready AI service with OpenAI/Claude integration
 */

import { v4 as uuidv4 } from 'uuid';
import logger from '../../utils/logger';
import redisCache from '../../infrastructure/cache/redis';
import { sessionMemoryService } from './session-memory.service';
import { buildSystemPrompt, CONTENT_GUARDRAILS, FALLBACK_RESPONSES } from './prompt-templates';
import {
  AssistantContext,
  AssistantRequest,
  AssistantResponse,
  AssistantAction,
  ChatMessage,
  MessageRole,
  UserContext,
  SubscriptionTier,
  RATE_LIMITS,
  AssistantError,
  ErrorCodes,
  StreamChunk,
  AssistantAuditLog,
} from './assistant.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface AIConfig {
  provider: 'openai' | 'anthropic';
  openaiApiKey?: string;
  anthropicApiKey?: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

const getAIConfig = (): AIConfig => ({
  provider: (process.env.AI_PROVIDER as 'openai' | 'anthropic') || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.AI_MODEL || 'gpt-4-turbo-preview',
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '1000', 10),
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
});

// ============================================================================
// RATE LIMITING
// ============================================================================

const RATE_LIMIT_PREFIX = 'assistant:ratelimit:';

interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  limit: number;
}

async function checkRateLimit(
  userId: string,
  tier: SubscriptionTier
): Promise<RateLimitStatus> {
  const config = RATE_LIMITS[tier];
  const now = Date.now();
  const minuteKey = `${RATE_LIMIT_PREFIX}${userId}:minute`;
  const dayKey = `${RATE_LIMIT_PREFIX}${userId}:day`;

  // Check minute limit
  const minuteCount = parseInt((await redisCache.get(minuteKey)) || '0', 10);
  if (minuteCount >= config.requestsPerMinute) {
    const ttl = await redisCache.ttl(minuteKey);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now + ttl * 1000).toISOString(),
      limit: config.requestsPerMinute,
    };
  }

  // Check daily limit (skip for unlimited)
  if (config.requestsPerDay > 0) {
    const dayCount = parseInt((await redisCache.get(dayKey)) || '0', 10);
    if (dayCount >= config.requestsPerDay) {
      const ttl = await redisCache.ttl(dayKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + ttl * 1000).toISOString(),
        limit: config.requestsPerDay,
      };
    }
  }

  return {
    allowed: true,
    remaining: config.requestsPerMinute - minuteCount - 1,
    resetAt: new Date(now + 60000).toISOString(),
    limit: config.requestsPerMinute,
  };
}

async function incrementRateLimit(userId: string): Promise<void> {
  const minuteKey = `${RATE_LIMIT_PREFIX}${userId}:minute`;
  const dayKey = `${RATE_LIMIT_PREFIX}${userId}:day`;

  // Increment minute counter
  const minuteCount = parseInt((await redisCache.get(minuteKey)) || '0', 10);
  await redisCache.set(minuteKey, String(minuteCount + 1), 60);

  // Increment daily counter
  const dayCount = parseInt((await redisCache.get(dayKey)) || '0', 10);
  // Get seconds until midnight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);
  await redisCache.set(dayKey, String(dayCount + 1), secondsUntilMidnight);
}

// ============================================================================
// CONTENT MODERATION
// ============================================================================

function moderateInput(content: string): { safe: boolean; reason?: string } {
  const lowerContent = content.toLowerCase();

  // Check for safety escalation triggers
  for (const trigger of CONTENT_GUARDRAILS.safety_escalation_triggers) {
    if (lowerContent.includes(trigger)) {
      return { safe: true }; // Allow but will trigger safety response
    }
  }

  // Basic profanity/spam detection
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /https?:\/\/[^\s]+/gi, // URLs (potential spam)
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      return { safe: false, reason: 'Message contains potentially harmful content' };
    }
  }

  return { safe: true };
}

function checkSafetyTriggers(content: string): boolean {
  const lowerContent = content.toLowerCase();
  return CONTENT_GUARDRAILS.safety_escalation_triggers.some(trigger =>
    lowerContent.includes(trigger)
  );
}

// ============================================================================
// AI PROVIDER INTEGRATION
// ============================================================================

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  content: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  model: string;
}

async function callOpenAI(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AssistantError(
      `OpenAI API error: ${error.error?.message || response.statusText}`,
      ErrorCodes.AI_PROVIDER_ERROR,
      502,
      true
    );
  }

  const data = await response.json();
  return {
    content: data.choices[0]?.message?.content || '',
    tokensUsed: {
      prompt: data.usage?.prompt_tokens || 0,
      completion: data.usage?.completion_tokens || 0,
      total: data.usage?.total_tokens || 0,
    },
    model: data.model,
  };
}

async function callAnthropic(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  // Extract system message
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const otherMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.anthropicApiKey!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model.includes('claude') ? config.model : 'claude-3-opus-20240229',
      max_tokens: config.maxTokens,
      system: systemMessage,
      messages: otherMessages,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new AssistantError(
      `Anthropic API error: ${error.error?.message || response.statusText}`,
      ErrorCodes.AI_PROVIDER_ERROR,
      502,
      true
    );
  }

  const data = await response.json();
  return {
    content: data.content[0]?.text || '',
    tokensUsed: {
      prompt: data.usage?.input_tokens || 0,
      completion: data.usage?.output_tokens || 0,
      total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
    },
    model: data.model,
  };
}

async function generateAIResponse(
  messages: AIMessage[],
  config: AIConfig
): Promise<AIResponse> {
  if (config.provider === 'anthropic' && config.anthropicApiKey) {
    return callAnthropic(messages, config);
  } else if (config.openaiApiKey) {
    return callOpenAI(messages, config);
  } else {
    throw new AssistantError(
      'No AI provider configured',
      ErrorCodes.AI_PROVIDER_ERROR,
      500
    );
  }
}

// ============================================================================
// SUGGESTION GENERATION
// ============================================================================

function generateSuggestions(
  context: AssistantContext,
  content: string
): string[] {
  const suggestions: Record<AssistantContext, string[]> = {
    [AssistantContext.ONBOARDING]: [
      'How do I upload photos?',
      'What makes a good bio?',
      'How does matching work?',
    ],
    [AssistantContext.DATING_ADVICE]: [
      'How do I start a conversation?',
      'When should I ask for a date?',
      'How do I handle rejection?',
    ],
    [AssistantContext.SAFETY_GUIDANCE]: [
      'How do I report someone?',
      'What are red flags to watch for?',
      'Tips for a safe first date?',
    ],
    [AssistantContext.FEATURE_HELP]: [
      'What is a Super Like?',
      'How does Boost work?',
      'What are premium features?',
    ],
    [AssistantContext.PROFILE_COACHING]: [
      'Review my profile',
      'Best photo tips?',
      'How to write prompts?',
    ],
    [AssistantContext.CONVERSATION_TIPS]: [
      'Good opening lines?',
      'How to keep it interesting?',
      'When to suggest a video call?',
    ],
    [AssistantContext.TROUBLESHOOTING]: [
      'App is not working',
      'I can\'t see my matches',
      'Payment issue',
    ],
    [AssistantContext.GENERAL]: [
      'Help with my profile',
      'Dating tips',
      'How to stay safe',
    ],
  };

  return suggestions[context] || suggestions[AssistantContext.GENERAL];
}

function generateActions(context: AssistantContext): AssistantAction[] {
  const actions: Record<AssistantContext, AssistantAction[]> = {
    [AssistantContext.ONBOARDING]: [
      { type: 'link', label: 'Complete Profile', value: 'profile', href: '/profile/edit' },
      { type: 'link', label: 'Add Photos', value: 'photos', href: '/profile/photos' },
    ],
    [AssistantContext.SAFETY_GUIDANCE]: [
      { type: 'link', label: 'Safety Hub', value: 'safety', href: '/safety' },
      { type: 'link', label: 'Report User', value: 'report', href: '/help/report' },
    ],
    [AssistantContext.PROFILE_COACHING]: [
      { type: 'link', label: 'Edit Profile', value: 'edit', href: '/profile/edit' },
      { type: 'link', label: 'View My Profile', value: 'view', href: '/profile' },
    ],
    [AssistantContext.TROUBLESHOOTING]: [
      { type: 'link', label: 'Contact Support', value: 'support', href: '/help/contact' },
      { type: 'link', label: 'FAQ', value: 'faq', href: '/help' },
    ],
    [AssistantContext.DATING_ADVICE]: [],
    [AssistantContext.FEATURE_HELP]: [],
    [AssistantContext.CONVERSATION_TIPS]: [],
    [AssistantContext.GENERAL]: [],
  };

  return actions[context] || [];
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logAudit(log: Omit<AssistantAuditLog, 'id' | 'timestamp'>): Promise<void> {
  const auditLog: AssistantAuditLog = {
    id: uuidv4(),
    ...log,
    timestamp: new Date().toISOString(),
  };

  // Store in Redis with 30-day expiry for audit trail
  const key = `assistant:audit:${auditLog.userId}:${auditLog.id}`;
  await redisCache.set(key, JSON.stringify(auditLog), 30 * 24 * 60 * 60);

  logger.info('Assistant audit log', {
    action: log.action,
    userId: log.userId,
    sessionId: log.sessionId,
    context: log.context,
  });
}

// ============================================================================
// MAIN SERVICE
// ============================================================================

class AssistantService {
  /**
   * Process a user message and generate AI response
   */
  async processMessage(
    userId: string,
    request: AssistantRequest,
    userContext?: UserContext
  ): Promise<AssistantResponse> {
    const startTime = Date.now();
    const config = getAIConfig();

    // Get user tier
    const tier = userContext?.profile.premiumTier || SubscriptionTier.FREE;

    // Check rate limit
    const rateLimitStatus = await checkRateLimit(userId, tier);
    if (!rateLimitStatus.allowed) {
      throw new AssistantError(
        FALLBACK_RESPONSES.rate_limited,
        ErrorCodes.RATE_LIMIT_EXCEEDED,
        429
      );
    }

    // Moderate input
    const moderation = moderateInput(request.message);
    if (!moderation.safe) {
      throw new AssistantError(
        FALLBACK_RESPONSES.content_blocked,
        ErrorCodes.CONTENT_MODERATION,
        400
      );
    }

    // Get or create session
    const context = request.context || AssistantContext.GENERAL;
    const session = await sessionMemoryService.getOrCreateSession(
      userId,
      request.sessionId,
      context
    );

    // Add user message to history
    await sessionMemoryService.addMessage(
      session.sessionId,
      MessageRole.USER,
      request.message,
      context
    );

    try {
      // Check for safety triggers
      if (checkSafetyTriggers(request.message)) {
        // Return safety response immediately
        const safetyResponse = CONTENT_GUARDRAILS.safety_response;

        await sessionMemoryService.addMessage(
          session.sessionId,
          MessageRole.ASSISTANT,
          safetyResponse,
          AssistantContext.SAFETY_GUIDANCE
        );

        await logAudit({
          userId,
          sessionId: session.sessionId,
          action: 'response_generated',
          context: AssistantContext.SAFETY_GUIDANCE,
          responseTime: Date.now() - startTime,
          metadata: { safetytrigger: true },
        });

        return {
          success: true,
          data: {
            message: safetyResponse,
            sessionId: session.sessionId,
            context: AssistantContext.SAFETY_GUIDANCE,
            suggestions: ['How do I report someone?', 'Contact support'],
            actions: [
              { type: 'link', label: 'Safety Hub', value: 'safety', href: '/safety' },
              { type: 'link', label: 'Report', value: 'report', href: '/help/report' },
            ],
            metadata: {
              tokensUsed: 0,
              responseTime: Date.now() - startTime,
              model: 'safety-fallback',
            },
          },
        };
      }

      // Build conversation history for AI
      const history = await sessionMemoryService.getConversationHistory(
        session.sessionId,
        10
      );

      // Build system prompt
      const systemPrompt = buildSystemPrompt({
        context,
        user: userContext,
        conversationTopics: session.topics,
        messageCount: history.length,
      });

      // Build messages for AI
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({
          role: msg.role === MessageRole.USER ? 'user' as const : 'assistant' as const,
          content: msg.content,
        })),
      ];

      // Generate AI response
      const aiResponse = await generateAIResponse(messages, config);

      // Add assistant response to history
      await sessionMemoryService.addMessage(
        session.sessionId,
        MessageRole.ASSISTANT,
        aiResponse.content,
        context,
        { tokensUsed: aiResponse.tokensUsed.total }
      );

      // Increment rate limit
      await incrementRateLimit(userId);

      // Log audit
      await logAudit({
        userId,
        sessionId: session.sessionId,
        action: 'response_generated',
        context,
        inputTokens: aiResponse.tokensUsed.prompt,
        outputTokens: aiResponse.tokensUsed.completion,
        responseTime: Date.now() - startTime,
        model: aiResponse.model,
      });

      return {
        success: true,
        data: {
          message: aiResponse.content,
          sessionId: session.sessionId,
          context,
          suggestions: generateSuggestions(context, aiResponse.content),
          actions: generateActions(context),
          metadata: {
            tokensUsed: aiResponse.tokensUsed.total,
            responseTime: Date.now() - startTime,
            model: aiResponse.model,
          },
        },
      };
    } catch (error) {
      // Log error
      logger.error('Assistant error', {
        userId,
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Re-throw if it's already an AssistantError
      if (error instanceof AssistantError) {
        throw error;
      }

      // Return fallback response for other errors
      const fallbackMessage = FALLBACK_RESPONSES.error;

      await sessionMemoryService.addMessage(
        session.sessionId,
        MessageRole.ASSISTANT,
        fallbackMessage,
        context
      );

      return {
        success: true,
        data: {
          message: fallbackMessage,
          sessionId: session.sessionId,
          context,
          suggestions: generateSuggestions(AssistantContext.GENERAL, ''),
          actions: [],
          metadata: {
            tokensUsed: 0,
            responseTime: Date.now() - startTime,
            model: 'fallback',
          },
        },
      };
    }
  }

  /**
   * Stream a response for real-time display
   */
  async *streamMessage(
    userId: string,
    request: AssistantRequest,
    userContext?: UserContext
  ): AsyncGenerator<StreamChunk> {
    const startTime = Date.now();
    const config = getAIConfig();

    // Get user tier
    const tier = userContext?.profile.premiumTier || SubscriptionTier.FREE;

    // Check rate limit
    const rateLimitStatus = await checkRateLimit(userId, tier);
    if (!rateLimitStatus.allowed) {
      yield { type: 'error', error: FALLBACK_RESPONSES.rate_limited };
      return;
    }

    // Moderate input
    const moderation = moderateInput(request.message);
    if (!moderation.safe) {
      yield { type: 'error', error: FALLBACK_RESPONSES.content_blocked };
      return;
    }

    // Get or create session
    const context = request.context || AssistantContext.GENERAL;
    const session = await sessionMemoryService.getOrCreateSession(
      userId,
      request.sessionId,
      context
    );

    // Add user message to history
    await sessionMemoryService.addMessage(
      session.sessionId,
      MessageRole.USER,
      request.message,
      context
    );

    try {
      // Check for safety triggers
      if (checkSafetyTriggers(request.message)) {
        const safetyResponse = CONTENT_GUARDRAILS.safety_response;
        for (const char of safetyResponse) {
          yield { type: 'content', content: char };
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        yield { type: 'done', sessionId: session.sessionId };
        return;
      }

      // Build conversation history for AI
      const history = await sessionMemoryService.getConversationHistory(
        session.sessionId,
        10
      );

      // Build system prompt
      const systemPrompt = buildSystemPrompt({
        context,
        user: userContext,
        conversationTopics: session.topics,
        messageCount: history.length,
      });

      // For streaming, we'll use non-streaming API and simulate streaming
      // In production, use proper streaming API endpoints
      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        ...history.map(msg => ({
          role: msg.role === MessageRole.USER ? 'user' as const : 'assistant' as const,
          content: msg.content,
        })),
      ];

      const aiResponse = await generateAIResponse(messages, config);
      const fullResponse = aiResponse.content;

      // Stream the response word by word
      const words = fullResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        yield { type: 'content', content: (i > 0 ? ' ' : '') + words[i] };
        await new Promise(resolve => setTimeout(resolve, 30));
      }

      // Add assistant response to history
      await sessionMemoryService.addMessage(
        session.sessionId,
        MessageRole.ASSISTANT,
        fullResponse,
        context
      );

      // Increment rate limit
      await incrementRateLimit(userId);

      yield { type: 'done', sessionId: session.sessionId };
    } catch (error) {
      logger.error('Assistant streaming error', {
        userId,
        sessionId: session.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      yield { type: 'error', error: FALLBACK_RESPONSES.error };
    }
  }

  /**
   * Get session history
   */
  async getHistory(userId: string, sessionId: string): Promise<ChatMessage[]> {
    const session = await sessionMemoryService.getSession(sessionId);
    if (!session || session.userId !== userId) {
      throw new AssistantError(
        'Session not found',
        ErrorCodes.SESSION_NOT_FOUND,
        404
      );
    }
    return session.history;
  }

  /**
   * Clear session history
   */
  async clearHistory(userId: string, sessionId: string): Promise<void> {
    await sessionMemoryService.deleteSession(sessionId);
    await logAudit({
      userId,
      sessionId,
      action: 'session_expired',
      context: AssistantContext.GENERAL,
    });
  }

  /**
   * Get usage statistics
   */
  async getUsageStats(userId: string, tier: SubscriptionTier): Promise<{
    requestsToday: number;
    requestsRemaining: number;
    tokensUsedToday: number;
    tier: SubscriptionTier;
  }> {
    const config = RATE_LIMITS[tier];
    const dayKey = `${RATE_LIMIT_PREFIX}${userId}:day`;
    const tokensKey = `assistant:tokens:${userId}:day`;

    const requestsToday = parseInt((await redisCache.get(dayKey)) || '0', 10);
    const tokensUsedToday = parseInt((await redisCache.get(tokensKey)) || '0', 10);

    return {
      requestsToday,
      requestsRemaining: config.requestsPerDay < 0 ? -1 : Math.max(0, config.requestsPerDay - requestsToday),
      tokensUsedToday,
      tier,
    };
  }
}

// Export singleton instance
export const assistantService = new AssistantService();
export default assistantService;
