/**
 * useSocketConnection Hook
 * Manages app-level WebSocket connection tied to authentication state.
 * When the user is authenticated, connects the socket.
 * When the user logs out, disconnects the socket.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { socketService } from '../services/socket.service';
import { authTokenService } from '../services/auth-token.service';

export function useSocketConnection(): void {
  const { isAuthenticated, isAuthReady } = useAuth();
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (!isAuthReady) return;

    if (isAuthenticated && !isConnectedRef.current) {
      const token = authTokenService.getToken() || '';
      socketService
        .connect(token)
        .then(() => {
          isConnectedRef.current = true;
          // Subscribe to reward updates for real-time coin/streak notifications
          socketService.subscribeToRewards();
        })
        .catch((err) => {
          console.warn('[useSocketConnection] Socket connection failed:', err);
          isConnectedRef.current = false;
        });
    }

    if (!isAuthenticated && isConnectedRef.current) {
      socketService.disconnect();
      isConnectedRef.current = false;
    }

    return () => {
      // Cleanup on unmount
      if (isConnectedRef.current) {
        socketService.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [isAuthenticated, isAuthReady]);
}

export default useSocketConnection;
