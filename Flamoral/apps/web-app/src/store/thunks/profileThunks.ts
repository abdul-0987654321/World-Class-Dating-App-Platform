/**
 * Profile Async Thunks
 * Handle async operations for profile management
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { profileService } from '../../services';
import {
  setLoading,
  setError,
  setCurrentProfile,
  setProfiles,
  setUploading,
  setUploadProgress,
} from '../slices/profileSlice';
import type { Profile } from '../../types';

/**
 * Fetch current user's profile
 */
export const fetchCurrentProfile = createAsyncThunk<
  Profile,
  void,
  { rejectValue: string }
>(
  'profile/fetchCurrent',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const profile = await profileService.getCurrentProfile();
      dispatch(setCurrentProfile(profile));
      return profile;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch profile';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Update profile
 */
export const updateUserProfile = createAsyncThunk<
  Profile,
  Partial<Profile>,
  { rejectValue: string }
>(
  'profile/update',
  async (updates, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const profile = await profileService.updateProfile(updates);
      dispatch(setCurrentProfile(profile));
      return profile;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to update profile';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Upload profile photo
 */
export const uploadProfilePhoto = createAsyncThunk<
  { photoUrl: string },
  File,
  { rejectValue: string }
>(
  'profile/uploadPhoto',
  async (file, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setUploading(true));

      const response = await profileService.uploadPhoto(file, (progress) => {
        dispatch(setUploadProgress(progress));
      });

      dispatch(setUploading(false));
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to upload photo';
      dispatch(setUploading(false));
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Delete profile photo
 */
export const deleteProfilePhoto = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>(
  'profile/deletePhoto',
  async (photoId, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const response = await profileService.deletePhoto(photoId);
      dispatch(setLoading(false));
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete photo';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch discovery profiles
 */
export const fetchDiscoveryProfiles = createAsyncThunk<
  Profile[],
  { filters?: any; limit?: number },
  { rejectValue: string }
>(
  'profile/fetchDiscovery',
  async ({ filters, limit = 20 }, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const profiles = await profileService.getDiscoveryProfiles(filters, limit);
      dispatch(setProfiles(profiles));
      return profiles;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch profiles';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Fetch profile by ID
 */
export const fetchProfileById = createAsyncThunk<
  Profile,
  string,
  { rejectValue: string }
>(
  'profile/fetchById',
  async (profileId, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const profile = await profileService.getProfileById(profileId);
      dispatch(setLoading(false));
      return profile;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch profile';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);
