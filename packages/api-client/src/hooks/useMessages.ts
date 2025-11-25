/**
 * Messages Hooks
 * React Query hooks for messaging operations
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { getApiClient } from '../client';

// Types
export interface Conversation {
  id: string;
  matchId: string;
  participants: Participant[];
  lastMessage?: Message;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Participant {
  userId: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  lastSeen: string;
  isTyping: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  contentType: 'text' | 'image' | 'gif' | 'audio' | 'video' | 'voice_note';
  status: 'sending' | 'sent' | 'delivered' | 'read';
  metadata?: MessageMetadata;
  replyToId?: string;
  replyTo?: Message;
  reactions: Reaction[];
  sentAt: string;
  deliveredAt?: string;
  readAt?: string;
  isEdited: boolean;
  isDeleted: boolean;
}

export interface MessageMetadata {
  mediaUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  waveform?: number[];
  gifUrl?: string;
}

export interface Reaction {
  userId: string;
  emoji: string;
  createdAt: string;
}

// Query Keys
export const messageKeys = {
  all: ['messages'] as const,
  conversations: (filter?: string) => [...messageKeys.all, 'conversations', filter] as const,
  conversation: (id: string) => [...messageKeys.all, 'conversation', id] as const,
  messages: (conversationId: string) => [...messageKeys.all, conversationId] as const,
  unreadCount: () => [...messageKeys.all, 'unread'] as const,
};

// Hooks
export function useConversations(unreadOnly?: boolean) {
  return useInfiniteQuery({
    queryKey: messageKeys.conversations(unreadOnly ? 'unread' : undefined),
    queryFn: async ({ pageParam = '' }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);
      if (unreadOnly) params.append('unreadOnly', 'true');

      return getApiClient().get<{
        conversations: Conversation[];
        nextCursor: string;
        totalUnread: number;
      }>(`/messages/conversations?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: '',
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () =>
      getApiClient().get<Conversation>(`/messages/conversations/${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: messageKeys.messages(conversationId),
    queryFn: async ({ pageParam = '' }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('before', pageParam);
      params.append('limit', '50');

      return getApiClient().get<{
        messages: Message[];
        hasMore: boolean;
      }>(`/messages/conversations/${conversationId}/messages?${params.toString()}`);
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined;
      const allMessages = pages.flatMap((p) => p.messages);
      return allMessages[allMessages.length - 1]?.id;
    },
    enabled: !!conversationId,
    initialPageParam: '',
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      contentType = 'text',
      replyToId,
      metadata,
    }: {
      conversationId: string;
      content: string;
      contentType?: string;
      replyToId?: string;
      metadata?: MessageMetadata;
    }) => {
      return getApiClient().post<Message>(
        `/messages/conversations/${conversationId}/messages`,
        { content, contentType, replyToId, metadata }
      );
    },
    onMutate: async ({ conversationId, content }) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: messageKeys.messages(conversationId),
      });

      const tempMessage: Message = {
        id: `temp_${Date.now()}`,
        conversationId,
        senderId: 'me', // Will be replaced
        content,
        contentType: 'text',
        status: 'sending',
        reactions: [],
        sentAt: new Date().toISOString(),
        isEdited: false,
        isDeleted: false,
      };

      queryClient.setQueryData(
        messageKeys.messages(conversationId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            pages: [
              {
                ...old.pages[0],
                messages: [tempMessage, ...old.pages[0].messages],
              },
              ...old.pages.slice(1),
            ],
          };
        }
      );

      return { tempMessage };
    },
    onSuccess: (newMessage, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
    },
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) =>
      getApiClient().post(
        `/messages/conversations/${conversationId}/read`,
        { messageId }
      ),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(conversationId),
      });
      queryClient.invalidateQueries({
        queryKey: messageKeys.unreadCount(),
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) =>
      getApiClient().delete(
        `/messages/conversations/${conversationId}/messages/${messageId}`
      ),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(conversationId),
      });
    },
  });
}

export function useReactToMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      messageId,
      emoji,
    }: {
      conversationId: string;
      messageId: string;
      emoji: string;
    }) =>
      getApiClient().post(
        `/messages/conversations/${conversationId}/messages/${messageId}/reactions`,
        { emoji }
      ),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(conversationId),
      });
    },
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: () =>
      getApiClient().get<{ totalUnread: number }>('/messages/unread-count'),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

export function useMuteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      conversationId,
      muted,
    }: {
      conversationId: string;
      muted: boolean;
    }) =>
      getApiClient().patch(`/messages/conversations/${conversationId}`, {
        isMuted: muted,
      }),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(conversationId),
      });
    },
  });
}
