import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Match } from '../../types';

interface MatchingState {
  matches: Match[];
  currentMatch: Match | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

const initialState: MatchingState = {
  matches: [],
  currentMatch: null,
  loading: false,
  error: null,
  lastFetched: null,
};

const matchingSlice = createSlice({
  name: 'matching',
  initialState,
  reducers: {
    // Loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    // Error handling
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    // Set matches
    setMatches: (state, action: PayloadAction<Match[]>) => {
      state.matches = action.payload;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    // Add match
    addMatch: (state, action: PayloadAction<Match>) => {
      // Check if match already exists
      const exists = state.matches.some(m => m.id === action.payload.id);
      if (!exists) {
        state.matches.unshift(action.payload);
      }
    },
    // Remove match
    removeMatch: (state, action: PayloadAction<string>) => {
      state.matches = state.matches.filter(match => match.id !== action.payload);
      if (state.currentMatch?.id === action.payload) {
        state.currentMatch = null;
      }
    },
    // Set current match
    setCurrentMatch: (state, action: PayloadAction<Match | null>) => {
      state.currentMatch = action.payload;
    },
    // Update match
    updateMatch: (state, action: PayloadAction<{ id: string; updates: Partial<Match> }>) => {
      const index = state.matches.findIndex(m => m.id === action.payload.id);
      if (index !== -1) {
        state.matches[index] = { ...state.matches[index], ...action.payload.updates };
      }
      if (state.currentMatch?.id === action.payload.id) {
        state.currentMatch = { ...state.currentMatch, ...action.payload.updates };
      }
    },
    // Clear matches
    clearMatches: (state) => {
      state.matches = [];
      state.currentMatch = null;
      state.error = null;
      state.lastFetched = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setMatches,
  addMatch,
  removeMatch,
  setCurrentMatch,
  updateMatch,
  clearMatches,
} = matchingSlice.actions;

export default matchingSlice.reducer;
