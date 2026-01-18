/**
 * Enhanced Messages Page
 * Full-featured messaging experience with WeChat/WhatsApp style features
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  messagingService,
  socketService,
  Conversation as ServiceConversation,
  Message as ServiceMessage,
} from '../../services';
import {
  EnhancedMessageInput,
  MediaMessage,
  GiftMessage,
  ReactionPicker,
  MessageReactions,
  ImageLightbox,
  VirtualGift,
  MediaContent,
  Reaction,
} from '../../components/messaging';
import { authTokenService } from '../../services/auth-token.service';
import { useCoach } from '../../hooks';
import { CoachButton, SuggestionCard } from '../../components/coach';

interface Participant {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  isTyping: boolean;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  sentAt: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'video' | 'voice' | 'gif' | 'gift';
  media?: MediaContent;
  gift?: VirtualGift;
  reactions?: { emoji: string; count: number; userReacted: boolean }[];
  replyTo?: string;
}

interface Conversation {
  id: string;
  participant: Participant;
  lastMessage?: Message;
  unreadCount: number;
}

export const EnhancedMessagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // AI Coach Hook
  const {
    icebreakers,
    responseSuggestions,
    isLoading: coachLoading,
    remainingUses,
    getIcebreakers,
    getResponseSuggestions,
    clearSuggestions,
  } = useCoach();

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeReactionMessage, setActiveReactionMessage] = useState<string | null>(null);
  const [showCoachSuggestions, setShowCoachSuggestions] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = JSON.parse(localStorage.getItem('currentUser') || '{}')?.id || 'test-user-1';

  // Derived state
  const selectedParticipant = conversations.find((c) => c.id === selectedConversation)?.participant;

  // Load conversations
  useEffect(() => {
    loadConversations();
    setupSocketListeners();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Handle URL params
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && conversations.length > 0) {
      const conv = conversations.find((c) => c.participant.id === chatId);
      if (conv) {
        setSelectedConversation(conv.id);
        loadMessages(conv.id);
      }
    }
  }, [searchParams, conversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const setupSocketListeners = () => {
    const token = authTokenService.getToken() || '';
    socketService.connect(token).catch(console.error);

    // Listen for new messages
    socketService.onAnyMessage((message) => {
      setMessages((prev) => [...prev, transformMessage(message)]);
      updateConversationLastMessage(message);
    });

    // Listen for typing indicators
    socketService.onTyping(({ conversationId, userId, isTyping }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? { ...conv, participant: { ...conv.participant, isTyping } }
            : conv
        )
      );
    });

    // Listen for online status
    socketService.onOnlineStatus(({ userId, isOnline }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.participant.id === userId
            ? { ...conv, participant: { ...conv.participant, isOnline } }
            : conv
        )
      );
    });
  };

  const loadConversations = async () => {
    try {
      const data = await messagingService.getConversations();
      setConversations(
        data.conversations.map((conv: ServiceConversation) => ({
          id: conv.id,
          participant: {
            id: conv.participant.id,
            name: conv.participant.name,
            photoUrl: conv.participant.photoUrl,
            isOnline: conv.participant.isOnline,
            isTyping: false,
          },
          lastMessage: conv.lastMessage ? transformMessage(conv.lastMessage) : undefined,
          unreadCount: conv.unreadCount,
        }))
      );
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await messagingService.getMessages(conversationId);
      setMessages(data.messages.map(transformMessage));

      // Join socket room
      socketService.joinConversation(conversationId);

      // Mark as read
      const unreadIds = data.messages
        .filter((m: ServiceMessage) => m.senderId !== currentUserId && m.status !== 'read')
        .map((m: ServiceMessage) => m.id);

      if (unreadIds.length > 0) {
        await messagingService.markAsRead(conversationId, unreadIds);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const transformMessage = (msg: any): Message => ({
    id: msg.id,
    senderId: msg.senderId || msg.sender_id,
    content: msg.content,
    sentAt: msg.sentAt || msg.created_at,
    status: msg.status || (msg.is_read ? 'read' : 'sent'),
    type: msg.type || 'text',
    media: msg.mediaUrl
      ? {
          type: msg.type as any,
          url: msg.mediaUrl,
          thumbnailUrl: msg.thumbnailUrl,
          duration: msg.duration,
        }
      : undefined,
    gift: msg.gift,
    reactions: msg.reactions || [],
    replyTo: msg.replyTo,
  });

  const updateConversationLastMessage = (message: any) => {
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === message.conversationId
          ? {
              ...conv,
              lastMessage: transformMessage(message),
              unreadCount:
                message.senderId !== currentUserId ? conv.unreadCount + 1 : conv.unreadCount,
            }
          : conv
      )
    );
  };

  // Message handlers
  const handleSendMessage = async (content: string, type = 'text') => {
    if (!selectedConversation) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      content,
      sentAt: new Date().toISOString(),
      status: 'sending',
      type: type as any,
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const message = await messagingService.sendMessage(selectedConversation, content, type);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? transformMessage(message) : m))
      );
    } catch (err) {
      console.error('Failed to send message:', err);
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? { ...m, status: 'sent' as const } : m))
      );
    }
  };

  const handleSendMedia = async (file: File, type: 'image' | 'video') => {
    if (!selectedConversation) return;

    // Create form data for upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', selectedConversation);
    formData.append('type', type);

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      content: '',
      sentAt: new Date().toISOString(),
      status: 'sending',
      type,
      media: {
        type,
        url: URL.createObjectURL(file),
      },
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      // This would call the media upload API
      const response = await fetch('/api/messaging/media', {
        method: 'POST',
        body: formData,
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });
      const message = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? transformMessage(message) : m))
      );
    } catch (err) {
      console.error('Failed to send media:', err);
    }
  };

  const handleSendGif = async (gifUrl: string, previewUrl: string) => {
    if (!selectedConversation) return;
    handleSendMessage(gifUrl, 'gif');
  };

  const handleSendVoiceNote = async (audioBlob: Blob, duration: number) => {
    if (!selectedConversation) return;

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice.webm');
    formData.append('conversationId', selectedConversation);
    formData.append('duration', duration.toString());

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      content: '',
      sentAt: new Date().toISOString(),
      status: 'sending',
      type: 'voice',
      media: {
        type: 'voice',
        url: URL.createObjectURL(audioBlob),
        duration,
      },
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch('/api/messaging/voice', {
        method: 'POST',
        body: formData,
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });
      const message = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? transformMessage(message) : m))
      );
    } catch (err) {
      console.error('Failed to send voice note:', err);
    }
  };

  const handleSendGift = async (gift: VirtualGift) => {
    if (!selectedConversation) return;

    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId,
      content: `Sent a ${gift.name}`,
      sentAt: new Date().toISOString(),
      status: 'sending',
      type: 'gift',
      gift,
      reactions: [],
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const response = await fetch('/api/messaging/gifts', {
        method: 'POST',
        body: JSON.stringify({
          conversationId: selectedConversation,
          giftId: gift.id,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...authTokenService.getAuthorizationHeader(),
        },
      });
      const message = await response.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticMessage.id ? transformMessage(message) : m))
      );
    } catch (err) {
      console.error('Failed to send gift:', err);
    }
  };

  const handleReaction = async (messageId: string, reaction: Reaction) => {
    try {
      await fetch(`/api/messaging/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji: reaction.emoji }),
        headers: {
          'Content-Type': 'application/json',
          ...authTokenService.getAuthorizationHeader(),
        },
      });

      // Update local state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: updateReactions(m.reactions || [], reaction.emoji),
              }
            : m
        )
      );
    } catch (err) {
      console.error('Failed to add reaction:', err);
    }

    setActiveReactionMessage(null);
  };

  const updateReactions = (
    reactions: { emoji: string; count: number; userReacted: boolean }[],
    emoji: string
  ) => {
    const existing = reactions.find((r) => r.emoji === emoji);
    if (existing) {
      if (existing.userReacted) {
        // Remove reaction
        return reactions
          .map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count - 1, userReacted: false }
              : r
          )
          .filter((r) => r.count > 0);
      } else {
        // Add reaction
        return reactions.map((r) =>
          r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r
        );
      }
    } else {
      return [...reactions, { emoji, count: 1, userReacted: true }];
    }
  };

  const handleTypingStart = useCallback(() => {
    if (selectedConversation) {
      socketService.sendTyping(selectedConversation, true);
    }
  }, [selectedConversation]);

  const handleTypingStop = useCallback(() => {
    if (selectedConversation) {
      socketService.sendTyping(selectedConversation, false);
    }
  }, [selectedConversation]);

  // AI Coach handlers
  const handleGetIcebreakers = useCallback(async () => {
    if (!selectedParticipant) return;

    await getIcebreakers({
      targetUserId: selectedParticipant.id,
      targetProfile: {
        name: selectedParticipant.name,
      },
      style: 'casual',
    });
    setShowCoachSuggestions(true);
  }, [selectedParticipant, getIcebreakers]);

  const handleGetResponseSuggestions = useCallback(async () => {
    if (!selectedConversation || !selectedParticipant || messages.length === 0) return;

    const recentMessages = messages.slice(-5).map((m) => ({
      content: m.content,
      senderId: m.senderId,
      timestamp: m.sentAt,
    }));

    await getResponseSuggestions({
      conversationId: selectedConversation,
      recentMessages,
      targetProfile: {
        name: selectedParticipant.name,
      },
      tone: 'friendly',
    });
    setShowCoachSuggestions(true);
  }, [selectedConversation, selectedParticipant, messages, getResponseSuggestions]);

  const handleSelectSuggestion = (suggestion: string) => {
    handleSendMessage(suggestion);
    setShowCoachSuggestions(false);
    clearSuggestions();
  };

  const handleDismissSuggestions = () => {
    setShowCoachSuggestions(false);
    clearSuggestions();
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">
              Matches
            </button>
            <button className="text-pink-500 font-medium">Messages</button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">
              Profile
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex max-w-6xl mx-auto w-full">
        {/* Conversations List */}
        <div className={`w-full md:w-80 bg-white border-r ${selectedConversation ? 'hidden md:block' : ''}`}>
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">Messages</h2>
          </div>
          <div className="divide-y overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv.id);
                  loadMessages(conv.id);
                }}
                className={`w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition text-left ${
                  selectedConversation === conv.id ? 'bg-pink-50' : ''
                }`}
              >
                <div className="relative">
                  <img
                    src={conv.participant.photoUrl}
                    alt={conv.participant.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conv.participant.isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-800">{conv.participant.name}</p>
                    {conv.lastMessage && (
                      <span className="text-xs text-gray-400">{formatTime(conv.lastMessage.sentAt)}</span>
                    )}
                  </div>
                  <p
                    className={`text-sm truncate ${
                      conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {conv.participant.isTyping ? (
                      <span className="text-pink-500">Typing...</span>
                    ) : conv.lastMessage?.type === 'gift' ? (
                      <span>🎁 Sent a gift</span>
                    ) : conv.lastMessage?.type === 'voice' ? (
                      <span>🎤 Voice message</span>
                    ) : conv.lastMessage?.type === 'image' ? (
                      <span>📷 Photo</span>
                    ) : conv.lastMessage?.type === 'gif' ? (
                      <span>GIF</span>
                    ) : (
                      conv.lastMessage?.content || 'No messages yet'
                    )}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 bg-pink-500 rounded-full text-white text-xs flex items-center justify-center">
                    {conv.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-gray-50 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation && selectedParticipant ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
                <button
                  onClick={() => {
                    socketService.leaveConversation(selectedConversation);
                    setSelectedConversation(null);
                  }}
                  className="md:hidden text-gray-600"
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
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">{selectedParticipant.name}</p>
                  <p className="text-xs text-gray-500">
                    {selectedParticipant.isTyping ? (
                      <span className="text-pink-500">Typing...</span>
                    ) : selectedParticipant.isOnline ? (
                      <span className="text-green-500">Online</span>
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
                  <button className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => {
                  const isMe = message.senderId === currentUserId;

                  return (
                    <div key={message.id} className="group">
                      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className="relative max-w-[70%]">
                          {/* Message Content */}
                          {message.type === 'gift' && message.gift ? (
                            <GiftMessage
                              gift={message.gift}
                              senderName={isMe ? 'You' : selectedParticipant.name}
                              isFromMe={isMe}
                            />
                          ) : message.media ? (
                            <MediaMessage
                              media={message.media}
                              isFromMe={isMe}
                              onImageClick={setLightboxImage}
                            />
                          ) : (
                            <div
                              className={`px-4 py-2 rounded-2xl ${
                                isMe
                                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-md'
                                  : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                              }`}
                              onDoubleClick={() => setActiveReactionMessage(message.id)}
                            >
                              <p>{message.content}</p>
                              <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                                {formatTime(message.sentAt)}
                                {isMe && (
                                  <span className="ml-2">
                                    {message.status === 'read'
                                      ? '✓✓'
                                      : message.status === 'delivered'
                                      ? '✓✓'
                                      : message.status === 'sending'
                                      ? '...'
                                      : '✓'}
                                  </span>
                                )}
                              </p>
                            </div>
                          )}

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className={`mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                              <MessageReactions
                                reactions={message.reactions}
                                onReactionClick={(emoji) =>
                                  handleReaction(message.id, { emoji, name: emoji })
                                }
                              />
                            </div>
                          )}

                          {/* Reaction Button (on hover) */}
                          <button
                            onClick={() => setActiveReactionMessage(message.id)}
                            className={`absolute -bottom-2 ${
                              isMe ? '-left-8' : '-right-8'
                            } opacity-0 group-hover:opacity-100 p-1 bg-white rounded-full shadow-lg transition-opacity`}
                          >
                            <span className="text-sm">😊</span>
                          </button>

                          {/* Reaction Picker */}
                          {activeReactionMessage === message.id && (
                            <div className={`absolute ${isMe ? 'right-0' : 'left-0'}`}>
                              <ReactionPicker
                                isOpen={true}
                                onSelect={(reaction) => handleReaction(message.id, reaction)}
                                onClose={() => setActiveReactionMessage(null)}
                                position="top"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Coach Suggestions */}
              {showCoachSuggestions && (icebreakers.length > 0 || responseSuggestions.length > 0) && (
                <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-t">
                  <SuggestionCard
                    suggestions={icebreakers.length > 0 ? icebreakers : responseSuggestions}
                    onSelect={handleSelectSuggestion}
                    onDismiss={handleDismissSuggestions}
                    type={icebreakers.length > 0 ? 'icebreaker' : 'response'}
                  />
                </div>
              )}

              {/* AI Coach Buttons */}
              <div className="px-4 py-2 bg-white border-t flex items-center gap-2">
                {messages.length === 0 ? (
                  <CoachButton
                    variant="icebreaker"
                    onClick={handleGetIcebreakers}
                    disabled={coachLoading}
                    remainingUses={remainingUses}
                  />
                ) : (
                  <CoachButton
                    variant="response"
                    onClick={handleGetResponseSuggestions}
                    disabled={coachLoading || messages.length === 0}
                    remainingUses={remainingUses}
                  />
                )}
                {coachLoading && (
                  <span className="text-sm text-gray-500 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Getting suggestions...
                  </span>
                )}
              </div>

              {/* Enhanced Message Input */}
              <EnhancedMessageInput
                onSendMessage={handleSendMessage}
                onSendMedia={handleSendMedia}
                onSendGif={handleSendGif}
                onSendVoiceNote={handleSendVoiceNote}
                onSendGift={handleSendGift}
                onTypingStart={handleTypingStart}
                onTypingStop={handleTypingStop}
                recipientName={selectedParticipant.name}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Start chatting with your matches</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox url={lightboxImage} onClose={() => setLightboxImage(null)} />
      )}
    </div>
  );
};

export default EnhancedMessagesPage;
