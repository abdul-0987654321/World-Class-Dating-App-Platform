/**
 * FLAMORAL AI Assistant Widget
 * Production-ready conversational AI chat interface
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  assistantService,
  AssistantContext,
  ChatMessage,
  AssistantAction,
} from '@/services/assistant.service';
import { authService } from '@/services/auth.service';

// Simple auth hook that works without context
const useSimpleAuth = () => {
  const [user, setUser] = useState<{ firstName?: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = authService.isAuthenticated();
        setIsAuthenticated(isAuth);
        if (isAuth) {
          const session = await authService.getSession();
          if (session?.user) {
            setUser(session.user);
          }
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  return { user, isAuthenticated };
};

// ============================================================================
// TYPES
// ============================================================================

interface AIAssistantWidgetProps {
  initialContext?: AssistantContext;
  position?: 'bottom-right' | 'bottom-left';
  defaultOpen?: boolean;
  onClose?: () => void;
}

// ============================================================================
// CONTEXT ICONS & LABELS
// ============================================================================

const contextConfig: Record<AssistantContext, { icon: string; label: string; color: string }> = {
  [AssistantContext.ONBOARDING]: { icon: '👋', label: 'Getting Started', color: 'from-green-500 to-emerald-500' },
  [AssistantContext.DATING_ADVICE]: { icon: '💕', label: 'Dating Tips', color: 'from-pink-500 to-rose-500' },
  [AssistantContext.SAFETY_GUIDANCE]: { icon: '🛡️', label: 'Safety', color: 'from-blue-500 to-cyan-500' },
  [AssistantContext.FEATURE_HELP]: { icon: '✨', label: 'Features', color: 'from-purple-500 to-violet-500' },
  [AssistantContext.PROFILE_COACHING]: { icon: '📸', label: 'Profile Help', color: 'from-orange-500 to-amber-500' },
  [AssistantContext.CONVERSATION_TIPS]: { icon: '💬', label: 'Conversation', color: 'from-indigo-500 to-blue-500' },
  [AssistantContext.TROUBLESHOOTING]: { icon: '🔧', label: 'Support', color: 'from-gray-500 to-slate-500' },
  [AssistantContext.GENERAL]: { icon: '🌟', label: 'General', color: 'from-pink-500 to-blue-500' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  initialContext = AssistantContext.GENERAL,
  position = 'bottom-right',
  defaultOpen = false,
  onClose,
}) => {
  // State
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [context, setContext] = useState<AssistantContext>(initialContext);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [actions, setActions] = useState<AssistantAction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, isAuthenticated } = useSimpleAuth();

  // Position classes
  const positionClasses = position === 'bottom-right' ? 'right-6' : 'left-6';

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isMinimized]);

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0 && isAuthenticated) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! 👋 I'm your FLAMORAL Guide. I can help with profile tips, dating advice, safety guidance, or any questions about the app. What would you like help with?`,
        timestamp: new Date().toISOString(),
        context: AssistantContext.GENERAL,
      };
      setMessages([welcomeMessage]);
      setSuggestions([
        'Help me improve my profile',
        'Dating tips for first messages',
        'How do I stay safe?',
      ]);
    }
  }, [isOpen, messages.length, isAuthenticated, user?.firstName]);

  // Send message handler
  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading || isStreaming) return;

    setError(null);
    setInputValue('');
    setSuggestions([]);
    setActions([]);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
      context,
    };
    setMessages(prev => [...prev, userMessage]);

    // Use streaming for real-time feel
    setIsStreaming(true);
    setStreamingContent('');

    try {
      await assistantService.streamMessage(
        text,
        context,
        {
          onChunk: (content) => {
            setStreamingContent(prev => prev + content);
          },
          onDone: (sessionId) => {
            // Finalize the streaming message
            setMessages(prev => [
              ...prev,
              {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: streamingContent,
                timestamp: new Date().toISOString(),
                context,
              },
            ]);
            setStreamingContent('');
            setIsStreaming(false);
          },
          onError: (errorMsg) => {
            setError(errorMsg);
            setIsStreaming(false);
            setStreamingContent('');
          },
        }
      );
    } catch (err) {
      // Fallback to non-streaming if streaming fails
      setIsStreaming(false);
      setStreamingContent('');
      setIsLoading(true);

      try {
        const response = await assistantService.sendMessage(text, context);
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date().toISOString(),
          context: response.data.context,
        };
        setMessages(prev => [...prev, assistantMessage]);
        setSuggestions(response.data.suggestions || []);
        setActions(response.data.actions || []);
      } catch (apiErr) {
        setError(apiErr instanceof Error ? apiErr.message : 'Failed to send message');
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  // Handle action click
  const handleActionClick = (action: AssistantAction) => {
    if (action.href) {
      window.location.href = action.href;
    } else if (action.type === 'quick_reply') {
      handleSendMessage(action.value);
    }
  };

  // Handle context change
  const handleContextChange = (newContext: AssistantContext) => {
    setContext(newContext);
    setShowContextMenu(false);
    // Add context change message
    const contextInfo = contextConfig[newContext];
    const contextMessage: ChatMessage = {
      id: `system-${Date.now()}`,
      role: 'assistant',
      content: `Switching to ${contextInfo.label}. How can I help you with ${contextInfo.label.toLowerCase()}?`,
      timestamp: new Date().toISOString(),
      context: newContext,
    };
    setMessages(prev => [...prev, contextMessage]);
  };

  // Clear chat
  const handleClearChat = async () => {
    try {
      await assistantService.clearHistory();
    } catch {
      // Ignore errors, still clear local state
    }
    setMessages([]);
    setSuggestions([]);
    setActions([]);
    setError(null);
    assistantService.clearSession();
  };

  // Render minimized button
  if (!isOpen || isMinimized) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={`fixed bottom-6 ${positionClasses} z-50 w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all group`}
        aria-label="Open FLAMORAL Guide"
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {/* Notification indicator */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        {/* Tooltip */}
        <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          FLAMORAL Guide
        </span>
      </motion.button>
    );
  }

  // Render full widget
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.9 }}
      className={`fixed bottom-6 ${positionClasses} z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-120px)] flex flex-col bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-pink-500/10 to-blue-500/10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${contextConfig[context].color} flex items-center justify-center`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">FLAMORAL Guide</h3>
            <button
              onClick={() => setShowContextMenu(!showContextMenu)}
              className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {contextConfig[context].icon} {contextConfig[context].label}
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Clear chat"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <button
            onClick={() => setIsMinimized(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Minimize"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onClose?.();
            }}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {showContextMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 left-4 right-4 bg-gray-800 rounded-xl border border-white/10 p-2 z-10 grid grid-cols-2 gap-1"
          >
            {Object.entries(contextConfig).map(([key, config]) => (
              <button
                key={key}
                onClick={() => handleContextChange(key as AssistantContext)}
                className={`flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors ${
                  context === key
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isAuthenticated ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-blue-500/20 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-gray-400 mb-4">Sign in to chat with FLAMORAL Guide</p>
            <a
              href="/login"
              className="px-4 py-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Sign In
            </a>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                      : 'bg-white/10 text-gray-200'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Streaming message */}
            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-white/10 text-gray-200">
                  <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  <span className="inline-block w-1.5 h-4 bg-pink-400 animate-pulse ml-0.5" />
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {(isLoading || (isStreaming && !streamingContent)) && (
              <div className="flex justify-start">
                <div className="bg-white/10 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="flex justify-center">
                <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2 text-red-400 text-sm">
                  {error}
                  <button
                    onClick={() => setError(null)}
                    className="ml-2 text-red-300 hover:text-red-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && isAuthenticated && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-gray-300 hover:text-white transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      {actions.length > 0 && isAuthenticated && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-blue-500/20 hover:from-pink-500/30 hover:to-blue-500/30 border border-pink-500/30 rounded-lg text-xs text-pink-300 hover:text-pink-200 transition-colors flex items-center gap-1"
              >
                {action.label}
                {action.href && (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {isAuthenticated && (
        <div className="p-4 border-t border-white/10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              disabled={isLoading || isStreaming}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading || isStreaming}
              className="px-4 py-3 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </motion.div>
  );
};

export default AIAssistantWidget;
