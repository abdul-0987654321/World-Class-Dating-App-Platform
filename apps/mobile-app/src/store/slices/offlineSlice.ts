/**
 * Offline Redux Slice
 * Manages offline data caching and sync state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface CachedProfile {
  id: string;
  data: any;
  cachedAt: number;
  expiresAt: number;
}

interface PendingAction {
  id: string;
  type: 'like' | 'pass' | 'super_like' | 'message' | 'unmatch';
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  cachedProfiles: Record<string, CachedProfile>;
  pendingActions: PendingAction[];
  lastSyncTime: number | null;
  syncing: boolean;
  syncError: string | null;
}

const initialState: OfflineState = {
  isOnline: true,
  cachedProfiles: {},
  pendingActions: [],
  lastSyncTime: null,
  syncing: false,
  syncError: null,
};

// Cache keys
const CACHE_KEYS = {
  PROFILES: 'cached_profiles',
  PENDING_ACTIONS: 'pending_actions',
  LAST_SYNC: 'last_sync_time',
};

// Cache duration (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

// Async thunks
export const loadCachedData = createAsyncThunk('offline/loadCachedData', async () => {
  try {
    const [profilesStr, actionsStr, lastSyncStr] = await Promise.all([
      AsyncStorage.getItem(CACHE_KEYS.PROFILES),
      AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS),
      AsyncStorage.getItem(CACHE_KEYS.LAST_SYNC),
    ]);

    const profiles = profilesStr ? JSON.parse(profilesStr) : {};
    const actions = actionsStr ? JSON.parse(actionsStr) : [];
    const lastSync = lastSyncStr ? parseInt(lastSyncStr, 10) : null;

    // Clean expired profiles
    const now = Date.now();
    const validProfiles: Record<string, CachedProfile> = {};

    Object.entries(profiles).forEach(([id, profile]: [string, any]) => {
      if (profile.expiresAt > now) {
        validProfiles[id] = profile;
      }
    });

    return {
      profiles: validProfiles,
      actions,
      lastSync,
    };
  } catch (error) {
    console.error('Failed to load cached data:', error);
    return {
      profiles: {},
      actions: [],
      lastSync: null,
    };
  }
});

export const cacheProfile = createAsyncThunk(
  'offline/cacheProfile',
  async ({ id, data }: { id: string; data: any }, { getState }) => {
    const state = getState() as { offline: OfflineState };
    const now = Date.now();

    const cachedProfile: CachedProfile = {
      id,
      data,
      cachedAt: now,
      expiresAt: now + CACHE_DURATION,
    };

    const updatedProfiles = {
      ...state.offline.cachedProfiles,
      [id]: cachedProfile,
    };

    await AsyncStorage.setItem(CACHE_KEYS.PROFILES, JSON.stringify(updatedProfiles));

    return cachedProfile;
  }
);

export const queueAction = createAsyncThunk(
  'offline/queueAction',
  async ({ type, data }: { type: PendingAction['type']; data: any }, { getState }) => {
    const state = getState() as { offline: OfflineState };

    const action: PendingAction = {
      id: `${type}_${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const updatedActions = [...state.offline.pendingActions, action];

    await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(updatedActions));

    return action;
  }
);

export const syncPendingActions = createAsyncThunk(
  'offline/syncPendingActions',
  async (_, { getState, dispatch }) => {
    const state = getState() as { offline: OfflineState };

    if (!state.offline.isOnline || state.offline.pendingActions.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    const failedActions: PendingAction[] = [];

    for (const action of state.offline.pendingActions) {
      try {
        // Send action to server based on type
        switch (action.type) {
          case 'like':
            await axios.post(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/swipes/like`,
              action.data
            );
            break;
          case 'pass':
            await axios.post(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/swipes/pass`,
              action.data
            );
            break;
          case 'super_like':
            await axios.post(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/swipes/super-like`,
              action.data
            );
            break;
          case 'message':
            await axios.post(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/messages`, action.data);
            break;
          case 'unmatch':
            await axios.delete(
              `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/matches/${action.data.matchId}`
            );
            break;
        }

        synced++;
      } catch (error) {
        console.error('Failed to sync action:', action.id, error);

        // Retry up to 3 times
        if (action.retryCount < 3) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        }

        failed++;
      }
    }

    // Update pending actions
    await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(failedActions));

    // Update last sync time
    const now = Date.now();
    await AsyncStorage.setItem(CACHE_KEYS.LAST_SYNC, now.toString());

    return { synced, failed };
  }
);

export const clearCache = createAsyncThunk('offline/clearCache', async () => {
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEYS.PROFILES),
    AsyncStorage.removeItem(CACHE_KEYS.PENDING_ACTIONS),
  ]);
});

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;

      // Auto-sync when coming back online
      if (action.payload && state.pendingActions.length > 0) {
        state.syncing = true;
      }
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter((a) => a.id !== action.payload);
    },
    clearSyncError: (state) => {
      state.syncError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Load cached data
      .addCase(loadCachedData.fulfilled, (state, action) => {
        state.cachedProfiles = action.payload.profiles;
        state.pendingActions = action.payload.actions;
        state.lastSyncTime = action.payload.lastSync;
      })

      // Cache profile
      .addCase(cacheProfile.fulfilled, (state, action) => {
        state.cachedProfiles[action.payload.id] = action.payload;
      })

      // Queue action
      .addCase(queueAction.fulfilled, (state, action) => {
        state.pendingActions.push(action.payload);
      })

      // Sync pending actions
      .addCase(syncPendingActions.pending, (state) => {
        state.syncing = true;
        state.syncError = null;
      })
      .addCase(syncPendingActions.fulfilled, (state, action) => {
        state.syncing = false;
        state.lastSyncTime = Date.now();

        // Remove synced actions
        if (action.payload.synced > 0) {
          // Actions are already filtered in the thunk
          // This just updates the sync time
        }
      })
      .addCase(syncPendingActions.rejected, (state, action) => {
        state.syncing = false;
        state.syncError = action.error.message || 'Sync failed';
      })

      // Clear cache
      .addCase(clearCache.fulfilled, (state) => {
        state.cachedProfiles = {};
        state.pendingActions = [];
        state.lastSyncTime = null;
      });
  },
});

export const { setOnlineStatus, removePendingAction, clearSyncError } = offlineSlice.actions;

export default offlineSlice.reducer;
