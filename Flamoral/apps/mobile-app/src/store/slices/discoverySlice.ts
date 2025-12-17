import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DiscoveryProfile, DiscoveryFilters, Match } from '../../types';

interface DiscoveryState {
  profiles: DiscoveryProfile[];
  currentProfileIndex: number;
  filters: DiscoveryFilters;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  superLikesRemaining: number;
  rewindsRemaining: number;
  boostsRemaining: number;
}

const initialState: DiscoveryState = {
  profiles: [],
  currentProfileIndex: 0,
  filters: {
    distanceMax: 50,
    ageMin: 18,
    ageMax: 99,
    educationLevels: [],
    relationshipGoals: [],
    smokingPreferences: [],
    drinkingPreferences: [],
    exercisePreferences: [],
    interests: [],
    sexualOrientations: [],
    verifiedOnly: false,
    showRecentlyActive: true,
  },
  loading: false,
  error: null,
  hasMore: true,
  superLikesRemaining: 5,
  rewindsRemaining: 0,
  boostsRemaining: 0,
};

const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    setProfiles: (state, action: PayloadAction<DiscoveryProfile[]>) => {
      state.profiles = action.payload;
      state.currentProfileIndex = 0;
      state.loading = false;
    },
    addProfiles: (state, action: PayloadAction<DiscoveryProfile[]>) => {
      state.profiles = [...state.profiles, ...action.payload];
      state.loading = false;
    },
    nextProfile: (state) => {
      if (state.currentProfileIndex < state.profiles.length - 1) {
        state.currentProfileIndex += 1;
      }
    },
    previousProfile: (state) => {
      if (state.currentProfileIndex > 0) {
        state.currentProfileIndex -= 1;
      }
    },
    removeCurrentProfile: (state) => {
      state.profiles = state.profiles.filter((_, index) => index !== state.currentProfileIndex);
    },
    setFilters: (state, action: PayloadAction<DiscoveryFilters>) => {
      state.filters = action.payload;
    },
    updateFilters: (state, action: PayloadAction<Partial<DiscoveryFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    setHasMore: (state, action: PayloadAction<boolean>) => {
      state.hasMore = action.payload;
    },
    setSuperLikes: (state, action: PayloadAction<number>) => {
      state.superLikesRemaining = action.payload;
    },
    decrementSuperLikes: (state) => {
      if (state.superLikesRemaining > 0) {
        state.superLikesRemaining -= 1;
      }
    },
    setRewinds: (state, action: PayloadAction<number>) => {
      state.rewindsRemaining = action.payload;
    },
    decrementRewinds: (state) => {
      if (state.rewindsRemaining > 0) {
        state.rewindsRemaining -= 1;
      }
    },
    setBoosts: (state, action: PayloadAction<number>) => {
      state.boostsRemaining = action.payload;
    },
    decrementBoosts: (state) => {
      if (state.boostsRemaining > 0) {
        state.boostsRemaining -= 1;
      }
    },
    resetDiscovery: (state) => {
      state.profiles = [];
      state.currentProfileIndex = 0;
      state.loading = false;
      state.error = null;
      state.hasMore = true;
    },
  },
});

export const {
  setProfiles,
  addProfiles,
  nextProfile,
  previousProfile,
  removeCurrentProfile,
  setFilters,
  updateFilters,
  setLoading,
  setError,
  setHasMore,
  setSuperLikes,
  decrementSuperLikes,
  setRewinds,
  decrementRewinds,
  setBoosts,
  decrementBoosts,
  resetDiscovery,
} = discoverySlice.actions;

export default discoverySlice.reducer;
