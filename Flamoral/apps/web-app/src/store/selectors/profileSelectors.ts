/**
 * Profile State Selectors
 * Memoized selectors for profile state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectProfileState = (state: RootState) => state.profile;

// Memoized selectors
export const selectCurrentProfile = createSelector(
  [selectProfileState],
  (profile) => profile.currentProfile
);

export const selectProfiles = createSelector(
  [selectProfileState],
  (profile) => profile.profiles
);

export const selectProfileLoading = createSelector(
  [selectProfileState],
  (profile) => profile.loading
);

export const selectProfileError = createSelector(
  [selectProfileState],
  (profile) => profile.error
);

export const selectProfileUploading = createSelector(
  [selectProfileState],
  (profile) => profile.uploading
);

export const selectUploadProgress = createSelector(
  [selectProfileState],
  (profile) => profile.uploadProgress
);

export const selectProfileById = (profileId: string) =>
  createSelector([selectProfiles], (profiles) =>
    profiles.find((p) => p.id === profileId)
  );

export const selectIsProfileStale = createSelector(
  [selectProfileState],
  (profile) => {
    if (!profile.lastFetched) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - profile.lastFetched > fiveMinutes;
  }
);
