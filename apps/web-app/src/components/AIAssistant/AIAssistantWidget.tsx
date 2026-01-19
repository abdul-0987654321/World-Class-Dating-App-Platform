/**
 * FLAMORAL AI Assistant Widget
 * Simplified version for reliable rendering
 */

import React, { useState, useEffect, useRef } from 'react';
import { authService } from '@/services/auth.service';

// ============================================================================
// TYPES
// ============================================================================

interface AIAssistantWidgetProps {
  position?: 'bottom-right' | 'bottom-left';
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = authService.isAuthenticated();
        setIsAuthenticated(isAuth);
        if (isAuth) {
          const session = await authService.getSession();
          if (session?.user?.firstName) {
            setUserName(session.user.firstName);
          }
        }
      } catch {
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, []);

  // Add welcome message when opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `Hi${userName ? ` ${userName}` : ''}! 👋 I'm your FLAMORAL Guide. I can help with profile tips, dating advice, safety guidance, or any questions about the app. What would you like help with?`,
      }]);
    }
  }, [isOpen, userName]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Simulate response (backend needs to be deployed for real responses)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I'm here to help! The AI backend is being set up. Once it's ready, I'll be able to give you personalized advice about your profile, dating tips, safety guidance, and more. In the meantime, feel free to explore FLAMORAL!",
      }]);
      setIsLoading(false);
    }, 1000);
  };

  const positionClass = position === 'bottom-right' ? 'right-6' : 'left-6';

  // Minimized button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 ${positionClass} z-[9999] w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all`}
        aria-label="Open FLAMORAL Guide"
        style={{ zIndex: 9999 }}
      >
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </button>
    );
  }

  // Open chat panel
  return (
    <div
      className={`fixed bottom-6 ${positionClass} z-[9999] w-80 h-[450px] flex flex-col bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden`}
      style={{ zIndex: 9999 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-pink-500/20 to-blue-500/20 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-blue-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">FLAMORAL Guide</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 text-gray-400 hover:text-white rounded"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!isAuthenticated ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm mb-3">Sign in to chat with FLAMORAL Guide</p>
            <a
              href="/login"
              className="inline-block px-4 py-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white text-sm rounded-lg hover:opacity-90"
            >
              Sign In
            </a>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-xl px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      {isAuthenticated && (
        <div className="p-3 border-t border-gray-700">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask me anything..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-3 py-2 bg-gradient-to-r from-pink-500 to-blue-500 text-white rounded-lg disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWidget;
