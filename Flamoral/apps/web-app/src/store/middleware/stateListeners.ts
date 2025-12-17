/**
 * State Listeners
 * Handle automatic state synchronization and cleanup
 */

import { createListenerMiddleware, addListener } from '@reduxjs/toolkit';
import type { TypedStartListening, TypedAddListener } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import { logout } from '../slices/authSlice';
import { clearProfile } from '../slices/profileSlice';
import { clearMatches } from '../slices/matchingSlice';
import { clearMessagingState } from '../slices/messagingSlice';
import { clearCall } from '../slices/callSlice';

// Create the middleware
export const listenerMiddleware = createListenerMiddleware();

// Define typed versions of listener functions
type AppStartListening = TypedStartListening<RootState, AppDispatch>;
export const startAppListening = listenerMiddleware.startListening as AppStartListening;
export const addAppListener = addListener as TypedAddListener<RootState, AppDispatch>;

/**
 * Clear all state on logout
 */
startAppListening({
  actionCreator: logout,
  effect: async (action, listenerApi) => {
    // Clear all state slices
    listenerApi.dispatch(clearProfile());
    listenerApi.dispatch(clearMatches());
    listenerApi.dispatch(clearMessagingState());
    listenerApi.dispatch(clearCall());

    console.log('[State Listeners] Cleared all state on logout');
  },
});

/**
 * Log state changes in development
 */
if (process.env.NODE_ENV === 'development') {
  startAppListening({
    predicate: (action, currentState, previousState) => {
      // Log any state change
      return true;
    },
    effect: (action, listenerApi) => {
      console.log('[State Change]', action.type);
    },
  });
}
