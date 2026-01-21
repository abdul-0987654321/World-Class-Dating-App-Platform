import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { messagingService, Conversation as ServiceConversation, Message as ServiceMessage } from '../../services';
import FlamoralBackground from '../../components/theme/FlamoralBackground';
import Navigation from '../../components/Navigation';

interface Conversation {
  id: string;
  participant: {
    id: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
    isTyping: boolean;
  };
  lastMessage: any;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  status: string;
}

export const MessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || 'test-user-1';

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && conversations.length > 0) {
      const conv = conversations.find(c => c.participant.id === chatId);
      if (conv) {
        setSelectedConversation(conv.id);
        loadMessages(conv.id);
      }
    }
  }, [searchParams, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const data = await messagingService.getConversations();
      setConversations(data.conversations.map((conv: ServiceConversation) => ({
        id: conv.id,
        participant: {
          id: conv.participant.id,
          name: conv.participant.name,
          photoUrl: conv.participant.photoUrl,
          isOnline: conv.participant.isOnline,
          isTyping: conv.isTyping || false,
        },
        lastMessage: conv.lastMessage,
        unreadCount: conv.unreadCount,
      })));
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await messagingService.getMessages(conversationId);
      setMessages(data.messages.map((msg: ServiceMessage) => ({
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        sentAt: msg.sentAt,
        status: msg.status,
      })));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const message = await messagingService.sendMessage(selectedConversation, newMessage);
      setMessages([...messages, {
        id: message.id,
        senderId: message.senderId,
        content: message.content,
        sentAt: message.sentAt,
        status: message.status,
      }]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectedParticipant = conversations.find(c => c.id === selectedConversation)?.participant;

  if (loading) {
    return (
      <FlamoralBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fm-pink"></div>
        </div>
      </FlamoralBackground>
    );
  }

  return (
    <FlamoralBackground>
      <div className="min-h-screen flex flex-col">
        <Navigation />

        {/* Main Content */}
        <div className="flex-1 flex max-w-6xl mx-auto w-full">
          {/* Conversations List */}
          <div className={`w-full md:w-80 bg-fm-surface/60 backdrop-blur-sm border-r border-white/10 ${selectedConversation ? 'hidden md:block' : ''}`}>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-fm-text-primary">Messages</h2>
            </div>
            <div className="divide-y divide-white/10">
              {conversations.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-fm-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-fm-text-primary mb-2">No conversations yet</h3>
                  <p className="text-fm-text-secondary mb-4">Match with someone to start chatting!</p>
                  <a href="/discover" className="inline-flex items-center gap-2 bg-gradient-to-r from-fm-pink to-fm-blue text-white px-4 py-2 rounded-lg hover:opacity-90 transition">
                    Start Discovering
                  </a>
                </div>
              )}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  data-testid="match"
                  onClick={() => {
                    setSelectedConversation(conv.id);
                    loadMessages(conv.id);
                  }}
                  className={`conversation-item match-card w-full p-4 flex items-center gap-4 hover:bg-white/5 transition text-left ${
                    selectedConversation === conv.id ? 'bg-fm-pink/20' : ''
                  }`}
                >
                  <div className="relative">
                    <img
                      src={conv.participant.photoUrl}
                      alt={conv.participant.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {conv.participant.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-fm-surface rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-fm-text-primary">{conv.participant.name}</p>
                      {conv.lastMessage && (
                        <span className="timestamp text-xs text-fm-text-muted">
                          {formatTime(conv.lastMessage.sentAt)}
                        </span>
                      )}
                    </div>
                    <p className={`message-preview last-message text-sm truncate ${conv.unreadCount > 0 ? 'text-fm-text-primary font-medium' : 'text-fm-text-secondary'}`}>
                      {conv.participant.isTyping ? (
                        <span className="text-fm-pink">Typing...</span>
                      ) : (
                        conv.lastMessage?.content || 'No messages yet'
                      )}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="unread-badge unread-indicator w-5 h-5 bg-fm-pink rounded-full text-white text-xs flex items-center justify-center" data-testid="unread">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className={`flex-1 flex flex-col ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
            {selectedConversation && selectedParticipant ? (
              <>
                {/* Chat Header */}
                <div className="chat-header bg-fm-surface/80 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center gap-4" data-testid="chat-header">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden text-fm-text-secondary"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <img
                    src={selectedParticipant.photoUrl}
                    alt={selectedParticipant.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="name font-semibold text-fm-text-primary">{selectedParticipant.name}</p>
                    <p className="text-xs text-fm-text-secondary">
                      {selectedParticipant.isOnline ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        'Offline'
                      )}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isMe = message.senderId === currentUserId;
                    return (
                      <div
                        key={message.id}
                        data-testid="message"
                        className={`message flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            isMe
                              ? 'bg-gradient-to-r from-fm-pink to-fm-blue text-white rounded-br-md'
                              : 'bg-fm-surface text-fm-text-primary rounded-bl-md border border-white/10'
                          }`}
                        >
                          <p>{message.content}</p>
                          <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-fm-text-muted'}`}>
                            {formatTime(message.sentAt)}
                            {isMe && (
                              <span className="ml-2">
                                {message.status === 'read' ? '✓✓' : message.status === 'delivered' ? '✓✓' : '✓'}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="bg-fm-surface/80 backdrop-blur-sm border-t border-white/10 p-4">
                  <div className="flex items-center gap-3">
                    <button className="text-fm-text-secondary hover:text-fm-pink transition">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 bg-white/10 border border-white/10 rounded-full text-fm-text-primary placeholder-fm-text-muted focus:outline-none focus:ring-2 focus:ring-fm-pink"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="w-10 h-10 bg-gradient-to-r from-fm-pink to-fm-blue rounded-full flex items-center justify-center text-white disabled:opacity-50 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-fm-text-secondary">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <p>Select a conversation to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FlamoralBackground>
  );
};

export default MessagesPage;
