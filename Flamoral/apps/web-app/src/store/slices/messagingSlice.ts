import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Message, Conversation } from '../../types';

interface MessagingState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  typingUsers: Record<string, boolean>; // conversationId -> isTyping
  lastFetched: number | null;
}

const initialState: MessagingState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  unreadCount: 0,
  typingUsers: {},
  lastFetched: null,
};

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    // Set conversations
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
      // Calculate unread count
      state.unreadCount = action.payload.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
    },
    // Add or update conversation
    upsertConversation: (state, action: PayloadAction<Conversation>) => {
      const index = state.conversations.findIndex(c => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = action.payload;
      } else {
        state.conversations.unshift(action.payload);
      }
      // Recalculate unread count
      state.unreadCount = state.conversations.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
    },
    // Set current conversation
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
    },
    // Set messages
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
      state.loading = false;
      state.error = null;
    },
    // Add message
    addMessage: (state, action: PayloadAction<Message>) => {
      // Check if message already exists
      const exists = state.messages.some(m => m.id === action.payload.id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    // Update message
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) => {
      const index = state.messages.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...action.payload.updates };
      }
    },
    // Delete message
    deleteMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter(m => m.id !== action.payload);
    },
    // Mark conversation as read
    markConversationAsRead: (state, action: PayloadAction<string>) => {
      const conversation = state.conversations.find(c => c.id === action.payload);
      if (conversation && conversation.unreadCount) {
        state.unreadCount -= conversation.unreadCount;
        conversation.unreadCount = 0;
      }
      if (state.currentConversation?.id === action.payload) {
        state.currentConversation.unreadCount = 0;
      }
    },
    // Set typing status
    setTypingStatus: (state, action: PayloadAction<{ conversationId: string; isTyping: boolean }>) => {
      state.typingUsers[action.payload.conversationId] = action.payload.isTyping;
    },
    // Clear messages
    clearMessages: (state) => {
      state.messages = [];
      state.currentConversation = null;
    },
    // Clear all messaging state
    clearMessagingState: (state) => {
      state.conversations = [];
      state.currentConversation = null;
      state.messages = [];
      state.unreadCount = 0;
      state.typingUsers = {};
      state.error = null;
      state.lastFetched = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setConversations,
  upsertConversation,
  setCurrentConversation,
  setMessages,
  addMessage,
  updateMessage,
  deleteMessage,
  markConversationAsRead,
  setTypingStatus,
  clearMessages,
  clearMessagingState,
} = messagingSlice.actions;

export default messagingSlice.reducer;
