/**
 * Messaging State Selectors
 * Memoized selectors for messaging state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectMessagingState = (state: RootState) => state.messaging;

// Memoized selectors
export const selectConversations = createSelector(
  [selectMessagingState],
  (messaging) => messaging.conversations
);

export const selectCurrentConversation = createSelector(
  [selectMessagingState],
  (messaging) => messaging.currentConversation
);

export const selectMessages = createSelector(
  [selectMessagingState],
  (messaging) => messaging.messages
);

export const selectMessagingLoading = createSelector(
  [selectMessagingState],
  (messaging) => messaging.loading
);

export const selectMessagingError = createSelector(
  [selectMessagingState],
  (messaging) => messaging.error
);

export const selectUnreadCount = createSelector(
  [selectMessagingState],
  (messaging) => messaging.unreadCount
);

export const selectTypingUsers = createSelector(
  [selectMessagingState],
  (messaging) => messaging.typingUsers
);

export const selectConversationById = (conversationId: string) =>
  createSelector([selectConversations], (conversations) =>
    conversations.find((c) => c.id === conversationId)
  );

export const selectSortedConversations = createSelector(
  [selectConversations],
  (conversations) => {
    return [...conversations].sort((a, b) => {
      // Sort by last message date, most recent first
      const dateA = a.lastMessage?.sentAt ? new Date(a.lastMessage.sentAt).getTime() : 0;
      const dateB = b.lastMessage?.sentAt ? new Date(b.lastMessage.sentAt).getTime() : 0;
      return dateB - dateA;
    });
  }
);

export const selectSortedMessages = createSelector(
  [selectMessages],
  (messages) => {
    return [...messages].sort((a, b) => {
      // Sort by sent date, oldest first (for chat display)
      const dateA = new Date(a.sentAt).getTime();
      const dateB = new Date(b.sentAt).getTime();
      return dateA - dateB;
    });
  }
);

export const selectUnreadConversations = createSelector(
  [selectConversations],
  (conversations) => conversations.filter((c) => c.unreadCount > 0)
);

export const selectIsTypingInConversation = (conversationId: string) =>
  createSelector(
    [selectTypingUsers],
    (typingUsers) => typingUsers[conversationId] || false
  );

export const selectIsMessagingStale = createSelector(
  [selectMessagingState],
  (messaging) => {
    if (!messaging.lastFetched) return true;
    const oneMinute = 60 * 1000;
    return Date.now() - messaging.lastFetched > oneMinute;
  }
);
