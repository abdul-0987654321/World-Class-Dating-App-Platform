/**
 * Messaging Async Thunks
 * Handle async operations for messaging
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { messagingService } from '../../services';
import { setLoading, setError, setConversations, setMessages, addMessage } from '../slices/messagingSlice';
import type { Conversation, Message } from '../../types';

/**
 * Fetch all conversations
 */
export const fetchConversations = createAsyncThunk<
  Conversation[],
  void,
  { rejectValue: string }
>(
  'messaging/fetchConversations',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const conversations = await messagingService.getConversations();
      dispatch(setConversations(conversations));
      return conversations;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch conversations';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch messages for a conversation
 */
export const fetchMessages = createAsyncThunk<
  Message[],
  { conversationId: string; limit?: number; before?: string },
  { rejectValue: string }
>(
  'messaging/fetchMessages',
  async ({ conversationId, limit = 50, before }, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const messages = await messagingService.getMessages(conversationId, limit, before);
      dispatch(setMessages(messages));
      return messages;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch messages';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Send a message
 */
export const sendMessage = createAsyncThunk<
  Message,
  { conversationId: string; content: string; type?: 'text' | 'image' | 'voice' | 'video' },
  { rejectValue: string }
>(
  'messaging/sendMessage',
  async ({ conversationId, content, type = 'text' }, { rejectWithValue, dispatch }) => {
    try {
      const message = await messagingService.sendMessage(conversationId, content, type);
      dispatch(addMessage(message));
      return message;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send message';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Mark conversation as read
 */
export const markAsRead = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>(
  'messaging/markAsRead',
  async (conversationId, { rejectWithValue, dispatch }) => {
    try {
      const response = await messagingService.markAsRead(conversationId);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to mark as read';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete a message
 */
export const deleteMessage = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>(
  'messaging/deleteMessage',
  async (messageId, { rejectWithValue, dispatch }) => {
    try {
      const response = await messagingService.deleteMessage(messageId);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete message';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Upload media for message
 */
export const uploadMessageMedia = createAsyncThunk<
  { url: string; type: string },
  { file: File; type: 'image' | 'voice' | 'video' },
  { rejectValue: string }
>(
  'messaging/uploadMedia',
  async ({ file, type }, { rejectWithValue, dispatch }) => {
    try {
      const response = await messagingService.uploadMedia(file, type);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to upload media';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);
