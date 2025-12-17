/**
 * Messaging API Endpoints
 * RTK Query endpoints for messaging
 */

import { baseApi } from './baseApi';
import type { Conversation, Message } from '../../types';

export const messagingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getConversations: builder.query<Conversation[], void>({
      query: () => '/api/conversations',
      providesTags: ['Conversation'],
    }),
    getMessages: builder.query<
      Message[],
      { conversationId: string; limit?: number; before?: string }
    >({
      query: ({ conversationId, limit = 50, before }) => ({
        url: `/api/conversations/${conversationId}/messages`,
        params: { limit, before },
      }),
      providesTags: (result, error, { conversationId }) => [
        { type: 'Message', id: conversationId },
      ],
    }),
    sendMessage: builder.mutation<
      Message,
      { conversationId: string; content: string; type?: 'text' | 'image' | 'voice' | 'video' }
    >({
      query: ({ conversationId, content, type = 'text' }) => ({
        url: `/api/conversations/${conversationId}/messages`,
        method: 'POST',
        body: { content, type },
      }),
      invalidatesTags: (result, error, { conversationId }) => [
        { type: 'Message', id: conversationId },
        'Conversation',
      ],
    }),
    markAsRead: builder.mutation<{ success: boolean }, string>({
      query: (conversationId) => ({
        url: `/api/conversations/${conversationId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['Conversation'],
    }),
    deleteMessage: builder.mutation<{ success: boolean }, string>({
      query: (messageId) => ({
        url: `/api/messages/${messageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Message'],
    }),
    uploadMessageMedia: builder.mutation<
      { url: string; type: string },
      { file: FormData; type: 'image' | 'voice' | 'video' }
    >({
      query: ({ file, type }) => ({
        url: `/api/messages/upload/${type}`,
        method: 'POST',
        body: file,
      }),
    }),
  }),
});

export const {
  useGetConversationsQuery,
  useGetMessagesQuery,
  useSendMessageMutation,
  useMarkAsReadMutation,
  useDeleteMessageMutation,
  useUploadMessageMediaMutation,
} = messagingApi;
