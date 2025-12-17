/**
 * Socket Middleware
 * Integrates WebSocket events with Redux state
 */

import { Middleware } from '@reduxjs/toolkit';
import { socketService } from '../../services';
import { addMessage, upsertConversation, setTypingStatus } from '../slices/messagingSlice';
import { addMatch } from '../slices/matchingSlice';
import { loginSuccess, logout } from '../slices/authSlice';
import type { RootState } from '../index';

let socketInitialized = false;

export const socketMiddleware: Middleware<{}, RootState> = (store) => {
  return (next) => (action) => {
    const result = next(action);

    // Initialize socket on successful login
    if (loginSuccess.match(action) && !socketInitialized) {
      const token = action.payload.token;

      socketService.connect(token)
        .then(() => {
          console.log('[Socket Middleware] Connected to WebSocket');

          // Subscribe to new messages
          socketService.onAnyMessage((message) => {
            store.dispatch(addMessage(message));
          });

          // Subscribe to typing indicators
          socketService.onTyping((data) => {
            store.dispatch(setTypingStatus({
              conversationId: data.conversationId,
              isTyping: data.isTyping,
            }));
          });

          // Subscribe to new matches
          socketService.onMatch((match) => {
            store.dispatch(addMatch(match));
          });

          socketInitialized = true;
        })
        .catch((error) => {
          console.error('[Socket Middleware] Failed to connect:', error);
        });
    }

    // Disconnect socket on logout
    if (logout.match(action)) {
      socketService.disconnect();
      socketInitialized = false;
      console.log('[Socket Middleware] Disconnected from WebSocket');
    }

    return result;
  };
};
