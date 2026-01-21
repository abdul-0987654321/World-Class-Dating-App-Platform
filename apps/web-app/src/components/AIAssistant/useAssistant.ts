/**
 * FLAMORAL AI Assistant - React Hook
 * Custom hook for managing assistant state and interactions
 */

import { useState, useCallback, useEffect } from 'react';
import {
  assistantService,
  AssistantContext,
  ChatMessage,
  AssistantAction,
  UsageStats,
} from '@/services/assistant.service';

export interface UseAssistantOptions {
  initialContext?: AssistantContext;
  autoLoad?: boolean;
}

export interface UseAssistantReturn {
  // State
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  context: AssistantContext;
  suggestions: string[];
  actions: AssistantAction[];
  usage: UsageStats | null;
  sessionId: string | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  streamMessage: (message: string) => Promise<void>;
  setContext: (context: AssistantContext) => void;
  clearHistory: () => Promise<void>;
  clearError: () => void;
  loadHistory: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

export function useAssistant(options: UseAssistantOptions = {}): UseAssistantReturn {
  const { initialContext = AssistantContext.GENERAL, autoLoad = false } = options;

  // State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContextState] = useState<AssistantContext>(initialContext);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [streamingContent, setStreamingContent] = useState('');

  // Get session ID
  const sessionId = assistantService.getSessionId();

  // Load history on mount if autoLoad
  useEffect(() => {
    if (autoLoad && sessionId) {
      loadHistory();
    }
  }, [autoLoad, sessionId]);

  // Load conversation history
  const loadHistory = useCallback(async () => {
    const sid = assistantService.getSessionId();
    if (!sid) return;

    try {
      setIsLoading(true);
      const history = await assistantService.getHistory(sid);
      setMessages(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh usage stats
  const refreshUsage = useCallback(async () => {
    try {
      const stats = await assistantService.getUsage();
      setUsage(stats);
    } catch (err) {
      // Silently fail - usage is not critical
      console.warn('Failed to load usage stats:', err);
    }
  }, []);

  // Send message (non-streaming)
  const sendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading || isStreaming) return;

      setError(null);
      setSuggestions([]);
      setActions([]);

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        context,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await assistantService.sendMessage(message, context);

        // Add assistant response
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date().toISOString(),
          context: response.data.context,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setSuggestions(response.data.suggestions || []);
        setActions(response.data.actions || []);

        // Update context if changed
        if (response.data.context !== context) {
          setContextState(response.data.context);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message');
        // Remove the optimistic user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [context, isLoading, isStreaming]
  );

  // Stream message
  const streamMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isLoading || isStreaming) return;

      setError(null);
      setSuggestions([]);
      setActions([]);

      // Add user message
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        context,
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent('');

      let fullContent = '';

      try {
        await assistantService.streamMessage(message, context, {
          onChunk: (content) => {
            fullContent += content;
            setStreamingContent(fullContent);
          },
          onDone: () => {
            // Add complete assistant message
            const assistantMessage: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: fullContent,
              timestamp: new Date().toISOString(),
              context,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingContent('');
            setIsStreaming(false);
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setIsStreaming(false);
            setStreamingContent('');
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Stream failed');
        setIsStreaming(false);
        setStreamingContent('');
      }
    },
    [context, isLoading, isStreaming]
  );

  // Set context
  const setContext = useCallback((newContext: AssistantContext) => {
    setContextState(newContext);
  }, []);

  // Clear history
  const clearHistory = useCallback(async () => {
    try {
      await assistantService.clearHistory();
      setMessages([]);
      setSuggestions([]);
      setActions([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    context,
    suggestions,
    actions,
    usage,
    sessionId,

    // Actions
    sendMessage,
    streamMessage,
    setContext,
    clearHistory,
    clearError,
    loadHistory,
    refreshUsage,
  };
}

export default useAssistant;
