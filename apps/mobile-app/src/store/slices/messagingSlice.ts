import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { messagingService, Conversation, Message } from '../../services/api/MessagingService';

interface TypingStatus {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface PresenceStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
}

interface MessagingState {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Record<string, Message[]>;
  typingStatuses: Record<string, TypingStatus[]>;
  presenceStatuses: Record<string, PresenceStatus>;
  unreadCount: number;
  unreadByConversation: Record<string, number>;
  isLoading: boolean;
  isLoadingMessages: boolean;
  error: string | null;
  isConnected: boolean;
}

const initialState: MessagingState = {
  conversations: [],
  currentConversationId: null,
  messages: {},
  typingStatuses: {},
  presenceStatuses: {},
  unreadCount: 0,
  unreadByConversation: {},
  isLoading: false,
  isLoadingMessages: false,
  error: null,
  isConnected: false,
};

// Async thunks
export const fetchConversations = createAsyncThunk(
  'messaging/fetchConversations',
  async (params: { page?: number; limit?: number } = {}) => {
    const response = await messagingService.getConversations(params);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch conversations');
    }
    return response.data!;
  }
);

export const fetchMessages = createAsyncThunk(
  'messaging/fetchMessages',
  async ({ conversationId, page = 1 }: { conversationId: string; page?: number }) => {
    const response = await messagingService.getMessages({ conversationId, page, limit: 50 });
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to fetch messages');
    }
    return { conversationId, messages: response.data! };
  }
);

export const sendMessage = createAsyncThunk(
  'messaging/sendMessage',
  async (payload: {
    conversationId: string;
    content: string;
    type: 'text' | 'image' | 'gif' | 'voice';
    mediaUrl?: string;
    tempId?: string;
  }) => {
    const response = await messagingService.sendMessage(payload);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to send message');
    }
    return {
      conversationId: payload.conversationId,
      message: response.data!,
      tempId: payload.tempId,
    };
  }
);

export const sendImageMessage = createAsyncThunk(
  'messaging/sendImageMessage',
  async ({
    conversationId,
    file,
  }: {
    conversationId: string;
    file: { uri: string; type: string; name: string };
  }) => {
    const response = await messagingService.sendImage(conversationId, file);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to send image');
    }
    return { conversationId, message: response.data! };
  }
);

export const sendGifMessage = createAsyncThunk(
  'messaging/sendGifMessage',
  async ({ conversationId, gifUrl }: { conversationId: string; gifUrl: string }) => {
    const response = await messagingService.sendGif(conversationId, gifUrl);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to send GIF');
    }
    return { conversationId, message: response.data! };
  }
);

export const markConversationAsRead = createAsyncThunk(
  'messaging/markConversationAsRead',
  async (conversationId: string) => {
    const response = await messagingService.markConversationAsRead(conversationId);
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to mark as read');
    }
    return conversationId;
  }
);

const messagingSlice = createSlice({
  name: 'messaging',
  initialState,
  reducers: {
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },
    setCurrentConversation: (state, action: PayloadAction<string | null>) => {
      state.currentConversationId = action.payload;
    },
    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find((c) => c.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },
    updateConversation: (state, action: PayloadAction<Conversation>) => {
      const index = state.conversations.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.conversations[index] = action.payload;
      }
    },
    setMessages: (
      state,
      action: PayloadAction<{ conversationId: string; messages: Message[] }>
    ) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },
    addMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }

      // Check if message already exists
      const exists = state.messages[conversationId].find((m) => m.id === message.id);
      if (!exists) {
        state.messages[conversationId].push(message);

        // Update conversation last message
        const conversation = state.conversations.find((c) => c.id === conversationId);
        if (conversation) {
          conversation.lastMessage = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt,
            type: message.type,
          };
          conversation.updatedAt = message.createdAt;
        }
      }
    },
    updateMessage: (state, action: PayloadAction<{ conversationId: string; message: Message }>) => {
      const { conversationId, message } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const index = messages.findIndex((m) => m.id === message.id);
        if (index !== -1) {
          messages[index] = message;
        }
      }
    },
    updateMessageStatus: (
      state,
      action: PayloadAction<{
        conversationId: string;
        messageId: string;
        status: 'sent' | 'delivered' | 'read';
      }>
    ) => {
      const { conversationId, messageId, status } = action.payload;
      const messages = state.messages[conversationId];
      if (messages) {
        const message = messages.find((m) => m.id === messageId);
        if (message) {
          message.status = status;
          if (status === 'read') {
            message.readAt = new Date().toISOString();
          } else if (status === 'delivered') {
            message.deliveredAt = new Date().toISOString();
          }
        }
      }
    },
    setTypingStatus: (state, action: PayloadAction<TypingStatus>) => {
      const { conversationId, userId, isTyping } = action.payload;
      if (!state.typingStatuses[conversationId]) {
        state.typingStatuses[conversationId] = [];
      }

      const existing = state.typingStatuses[conversationId].find((t) => t.userId === userId);
      if (isTyping) {
        if (existing) {
          existing.isTyping = true;
        } else {
          state.typingStatuses[conversationId].push(action.payload);
        }
      } else {
        state.typingStatuses[conversationId] = state.typingStatuses[conversationId].filter(
          (t) => t.userId !== userId
        );
      }
    },
    setPresenceStatus: (state, action: PayloadAction<PresenceStatus>) => {
      state.presenceStatuses[action.payload.userId] = action.payload;

      // Update conversations with user presence
      state.conversations.forEach((conversation) => {
        const participant = conversation.participants.find((p) => p.id === action.payload.userId);
        if (participant) {
          participant.isOnline = action.payload.status === 'online';
          participant.lastSeen = action.payload.lastSeen;
        }
      });
    },
    setUnreadCount: (
      state,
      action: PayloadAction<{ total: number; byConversation: Record<string, number> }>
    ) => {
      state.unreadCount = action.payload.total;
      state.unreadByConversation = action.payload.byConversation;
    },
    incrementUnreadCount: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      state.unreadCount += 1;
      state.unreadByConversation[conversationId] =
        (state.unreadByConversation[conversationId] || 0) + 1;

      // Update conversation unread count
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      }
    },
    clearUnreadCount: (state, action: PayloadAction<string>) => {
      const conversationId = action.payload;
      const count = state.unreadByConversation[conversationId] || 0;
      state.unreadCount = Math.max(0, state.unreadCount - count);
      state.unreadByConversation[conversationId] = 0;

      // Update conversation unread count
      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    },
    setConnectionStatus: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder.addCase(fetchConversations.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      state.isLoading = false;
      state.conversations = action.payload;
    });
    builder.addCase(fetchConversations.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch conversations';
    });

    // Fetch messages
    builder.addCase(fetchMessages.pending, (state) => {
      state.isLoadingMessages = true;
      state.error = null;
    });
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      state.isLoadingMessages = false;
      const { conversationId, messages } = action.payload;
      state.messages[conversationId] = messages;
    });
    builder.addCase(fetchMessages.rejected, (state, action) => {
      state.isLoadingMessages = false;
      state.error = action.error.message || 'Failed to fetch messages';
    });

    // Send message
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const { conversationId, message, tempId } = action.payload;

      // Replace temp message if exists
      if (tempId && state.messages[conversationId]) {
        const tempIndex = state.messages[conversationId].findIndex((m) => m.id === tempId);
        if (tempIndex !== -1) {
          state.messages[conversationId][tempIndex] = message;
          return;
        }
      }

      // Otherwise add new message
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    });

    // Send image message
    builder.addCase(sendImageMessage.fulfilled, (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    });

    // Send GIF message
    builder.addCase(sendGifMessage.fulfilled, (state, action) => {
      const { conversationId, message } = action.payload;
      if (!state.messages[conversationId]) {
        state.messages[conversationId] = [];
      }
      state.messages[conversationId].push(message);
    });

    // Mark conversation as read
    builder.addCase(markConversationAsRead.fulfilled, (state, action) => {
      const conversationId = action.payload;
      const count = state.unreadByConversation[conversationId] || 0;
      state.unreadCount = Math.max(0, state.unreadCount - count);
      state.unreadByConversation[conversationId] = 0;

      const conversation = state.conversations.find((c) => c.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
      }
    });
  },
});

export const {
  setConversations,
  setCurrentConversation,
  addConversation,
  updateConversation,
  setMessages,
  addMessage,
  updateMessage,
  updateMessageStatus,
  setTypingStatus,
  setPresenceStatus,
  setUnreadCount,
  incrementUnreadCount,
  clearUnreadCount,
  setConnectionStatus,
  clearError,
} = messagingSlice.actions;

export default messagingSlice.reducer;
