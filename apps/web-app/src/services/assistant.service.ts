/**
 * FLAMORAL AI Assistant - Frontend Service
 * Handles communication with the AI assistant backend
 */

import apiClient from './api.client';

// ============================================================================
// TYPES
// ============================================================================

export enum AssistantContext {
  ONBOARDING = 'onboarding',
  DATING_ADVICE = 'dating_advice',
  SAFETY_GUIDANCE = 'safety_guidance',
  FEATURE_HELP = 'feature_help',
  PROFILE_COACHING = 'profile_coaching',
  CONVERSATION_TIPS = 'conversation_tips',
  TROUBLESHOOTING = 'troubleshooting',
  GENERAL = 'general',
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  context?: AssistantContext;
  isStreaming?: boolean;
}

export interface AssistantAction {
  type: 'link' | 'button' | 'quick_reply';
  label: string;
  value: string;
  href?: string;
}

export interface AssistantResponse {
  success: boolean;
  data: {
    message: string;
    sessionId: string;
    context: AssistantContext;
    suggestions?: string[];
    actions?: AssistantAction[];
    metadata: {
      tokensUsed: number;
      responseTime: number;
      model: string;
    };
  };
}

export interface UsageStats {
  requestsToday: number;
  requestsRemaining: number;
  tokensUsedToday: number;
  tier: string;
}

export interface ContextInfo {
  id: string;
  name: string;
  description: string;
}

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onDone: (sessionId: string) => void;
  onError: (error: string) => void;
}

// ============================================================================
// SERVICE
// ============================================================================

class AssistantService {
  private baseUrl = '/api/v1/assistant';
  private currentSessionId: string | null = null;

  /**
   * Send a message and get a response
   */
  async sendMessage(
    message: string,
    context: AssistantContext = AssistantContext.GENERAL,
    sessionId?: string
  ): Promise<AssistantResponse> {
    const response = await apiClient.post<AssistantResponse>(`${this.baseUrl}/message`, {
      message,
      context,
      sessionId: sessionId || this.currentSessionId,
    });

    // Store session ID for continuity
    if (response.data.sessionId) {
      this.currentSessionId = response.data.sessionId;
    }

    return response;
  }

  /**
   * Send a message and stream the response
   */
  async streamMessage(
    message: string,
    context: AssistantContext = AssistantContext.GENERAL,
    callbacks: StreamCallbacks,
    sessionId?: string
  ): Promise<void> {
    const apiUrl = import.meta.env.VITE_API_URL || '';

    try {
      const response = await fetch(`${apiUrl}${this.baseUrl}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for auth
        body: JSON.stringify({
          message,
          context,
          sessionId: sessionId || this.currentSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || 'Stream request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'content') {
                callbacks.onChunk(data.content);
              } else if (data.type === 'done') {
                this.currentSessionId = data.sessionId;
                callbacks.onDone(data.sessionId);
              } else if (data.type === 'error') {
                callbacks.onError(data.error);
              }
            } catch {
              // Ignore parse errors for partial data
            }
          }
        }
      }
    } catch (error) {
      callbacks.onError(error instanceof Error ? error.message : 'Stream failed');
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: { messages: ChatMessage[] };
    }>(`${this.baseUrl}/history/${sessionId}`);

    return response.data.messages;
  }

  /**
   * Clear conversation history
   */
  async clearHistory(sessionId?: string): Promise<void> {
    const sid = sessionId || this.currentSessionId;
    if (!sid) return;

    await apiClient.delete(`${this.baseUrl}/history/${sid}`);
    if (sid === this.currentSessionId) {
      this.currentSessionId = null;
    }
  }

  /**
   * Get usage statistics
   */
  async getUsage(): Promise<UsageStats> {
    const response = await apiClient.get<{
      success: boolean;
      data: UsageStats;
    }>(`${this.baseUrl}/usage`);

    return response.data;
  }

  /**
   * Get available contexts
   */
  async getContexts(): Promise<ContextInfo[]> {
    const response = await apiClient.get<{
      success: boolean;
      data: ContextInfo[];
    }>(`${this.baseUrl}/contexts`);

    return response.data;
  }

  /**
   * Submit feedback for a message
   */
  async submitFeedback(
    sessionId: string,
    messageId: string,
    rating: 'helpful' | 'not_helpful',
    feedback?: string
  ): Promise<void> {
    await apiClient.post(`${this.baseUrl}/feedback`, {
      sessionId,
      messageId,
      rating,
      feedback,
    });
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Set session ID (for restoring sessions)
   */
  setSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  /**
   * Clear session
   */
  clearSession(): void {
    this.currentSessionId = null;
  }
}

// Export singleton
export const assistantService = new AssistantService();
export default assistantService;
