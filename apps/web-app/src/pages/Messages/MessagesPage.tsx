import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import mockApi from '../../mocks/mockApi';

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
      const data = await mockApi.getConversations();
      setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await mockApi.getMessages(conversationId);
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const message = await mockApi.sendMessage(selectedConversation, newMessage);
      setMessages([...messages, message]);
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
            ConnectSphere
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} className="text-pink-500 font-medium">
              Messages
            </button>
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
          <div className="divide-y">
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
                      <span className="text-xs text-gray-400">
                        {formatTime(conv.lastMessage.sentAt)}
                      </span>
                    )}
                  </div>
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                    {conv.participant.isTyping ? (
                      <span className="text-pink-500">Typing...</span>
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
                  onClick={() => setSelectedConversation(null)}
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
                <div>
                  <p className="font-semibold text-gray-800">{selectedParticipant.name}</p>
                  <p className="text-xs text-gray-500">
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
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                          isMe
                            ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-br-md'
                            : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
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
              <div className="bg-white border-t p-4">
                <div className="flex items-center gap-3">
                  <button className="text-gray-400 hover:text-pink-500">
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
                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p>Select a conversation to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
