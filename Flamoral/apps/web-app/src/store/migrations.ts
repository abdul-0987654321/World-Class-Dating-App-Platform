/**
 * Redux Persist Migrations
 * Handle state migrations when updating state structure
 */

import { PersistedState } from 'redux-persist';
import { AuthState } from './slices/authSlice';

// Define the shape of the persisted state
interface PersistedRootState extends PersistedState {
  auth?: AuthState;
}

/**
 * State migrations
 * Add new migrations when changing the state structure
 */
export const migrations = {
  // Version 0 to 1: Initial migration
  0: (state: PersistedRootState): PersistedRootState => {
    return {
      ...state,
      _persist: {
        version: 1,
        rehydrated: true,
      },
    };
  },
  // Add more migrations as needed
  // 1: (state: PersistedRootState): PersistedRootState => {
  //   return {
  //     ...state,
  //     // migration logic here
  //   };
  // },
};

/**
 * Migration function for redux-persist
 */
export const migrate = (state: any, currentVersion: number): Promise<any> => {
  return new Promise((resolve) => {
    try {
      let migratedState = state;
      const persistVersion = state?._persist?.version || 0;

      // Apply all migrations from the persisted version to the current version
      for (let version = persistVersion; version < currentVersion; version++) {
        if (migrations[version]) {
          migratedState = migrations[version](migratedState);
        }
      }

      resolve(migratedState);
    } catch (error) {
      console.error('[Redux Persist] Migration failed:', error);
      // Return undefined to trigger a purge and start fresh
      resolve(undefined);
    }
  });
};
