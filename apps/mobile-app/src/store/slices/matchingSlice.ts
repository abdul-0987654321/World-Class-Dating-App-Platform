import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Match, DiscoveryProfile } from '../../types';

interface MatchingState {
  matches: Match[];
  discoveryProfiles: DiscoveryProfile[];
  loading: boolean;
}

const initialState: MatchingState = {
  matches: [],
  discoveryProfiles: [],
  loading: false,
};

const matchingSlice = createSlice({
  name: 'matching',
  initialState,
  reducers: {
    setMatches: (state, action: PayloadAction<Match[]>) => {
      state.matches = action.payload;
    },
    addMatch: (state, action: PayloadAction<Match>) => {
      state.matches.unshift(action.payload);
    },
    setDiscoveryProfiles: (state, action: PayloadAction<DiscoveryProfile[]>) => {
      state.discoveryProfiles = action.payload;
    },
    removeDiscoveryProfile: (state, action: PayloadAction<string>) => {
      state.discoveryProfiles = state.discoveryProfiles.filter((p) => p.id !== action.payload);
    },
  },
});

export const { setMatches, addMatch, setDiscoveryProfiles, removeDiscoveryProfile } =
  matchingSlice.actions;
export default matchingSlice.reducer;
