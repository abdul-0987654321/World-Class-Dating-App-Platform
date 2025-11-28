import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Profile } from '../../types';

interface ProfileState {
  currentProfile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  error: string | null;
}

const initialState: ProfileState = {
  currentProfile: null,
  profiles: [],
  loading: false,
  error: null,
};

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setCurrentProfile: (state, action: PayloadAction<Profile>) => {
      state.currentProfile = action.payload;
    },
    updateProfile: (state, action: PayloadAction<Partial<Profile>>) => {
      if (state.currentProfile) {
        state.currentProfile = { ...state.currentProfile, ...action.payload };
      }
    },
    setProfiles: (state, action: PayloadAction<Profile[]>) => {
      state.profiles = action.payload;
    },
    clearProfile: (state) => {
      state.currentProfile = null;
      state.profiles = [];
    },
  },
});

export const { setCurrentProfile, updateProfile, setProfiles, clearProfile } = profileSlice.actions;
export default profileSlice.reducer;
