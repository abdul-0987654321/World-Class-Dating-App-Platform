import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Match } from '@connectsphere/types';

interface MatchingState {
  matches: Match[];
  currentMatch: Match | null;
  loading: boolean;
  error: string | null;
}

const initialState: MatchingState = {
  matches: [],
  currentMatch: null,
  loading: false,
  error: null,
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
    removeMatch: (state, action: PayloadAction<string>) => {
      state.matches = state.matches.filter(match => match.id !== action.payload);
    },
    setCurrentMatch: (state, action: PayloadAction<Match | null>) => {
      state.currentMatch = action.payload;
    },
  },
});

export const { setMatches, addMatch, removeMatch, setCurrentMatch } = matchingSlice.actions;
export default matchingSlice.reducer;
