import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Profile } from '../../types';

interface ProfileState {
  currentProfile: Profile | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  currentProfile: null,
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Profile>) => {
      state.currentProfile = action.payload;
    },
    clearProfile: (state) => {
      state.currentProfile = null;
    },
  },
});

export const { setProfile, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
