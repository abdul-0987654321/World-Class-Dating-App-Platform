import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Profile } from '../../types';

interface ProfileState {
  currentProfile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  uploading: boolean;
  uploadProgress: number;
}

const initialState: ProfileState = {
  currentProfile: null,
  profiles: [],
  loading: false,
  error: null,
  lastFetched: null,
  uploading: false,
  uploadProgress: 0,
};

const profileSlice = createSlice({
  name: 'profile',
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
    // Upload progress
    setUploading: (state, action: PayloadAction<boolean>) => {
      state.uploading = action.payload;
      if (!action.payload) {
        state.uploadProgress = 0;
      }
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
    // Set current profile
    setCurrentProfile: (state, action: PayloadAction<Profile>) => {
      state.currentProfile = action.payload;
      state.loading = false;
      state.error = null;
      state.lastFetched = Date.now();
    },
    // Update profile
    updateProfile: (state, action: PayloadAction<Partial<Profile>>) => {
      if (state.currentProfile) {
        state.currentProfile = { ...state.currentProfile, ...action.payload };
      }
    },
    // Set profiles (for discovery/browsing)
    setProfiles: (state, action: PayloadAction<Profile[]>) => {
      state.profiles = action.payload;
      state.loading = false;
      state.error = null;
    },
    // Add profile to list
    addProfile: (state, action: PayloadAction<Profile>) => {
      const exists = state.profiles.some(p => p.id === action.payload.id);
      if (!exists) {
        state.profiles.push(action.payload);
      }
    },
    // Remove profile from list
    removeProfile: (state, action: PayloadAction<string>) => {
      state.profiles = state.profiles.filter(p => p.id !== action.payload);
    },
    // Update profile in list
    updateProfileInList: (state, action: PayloadAction<{ id: string; updates: Partial<Profile> }>) => {
      const index = state.profiles.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.profiles[index] = { ...state.profiles[index], ...action.payload.updates };
      }
    },
    // Clear profile
    clearProfile: (state) => {
      state.currentProfile = null;
      state.profiles = [];
      state.error = null;
      state.lastFetched = null;
      state.uploading = false;
      state.uploadProgress = 0;
    },
  },
});

export const {
  setLoading,
  setError,
  setUploading,
  setUploadProgress,
  setCurrentProfile,
  updateProfile,
  setProfiles,
  addProfile,
  removeProfile,
  updateProfileInList,
  clearProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
