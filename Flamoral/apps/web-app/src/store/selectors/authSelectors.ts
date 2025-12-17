/**
 * Auth State Selectors
 * Memoized selectors for authentication state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectAuthState = (state: RootState) => state.auth;

// Memoized selectors
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated
);

export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
);

export const selectAuthToken = createSelector(
  [selectAuthState],
  (auth) => auth.token
);

export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loading
);

export const selectAuthError = createSelector(
  [selectAuthState],
  (auth) => auth.error
);

export const selectUserId = createSelector(
  [selectCurrentUser],
  (user) => user?.id
);

export const selectUserPremiumTier = createSelector(
  [selectCurrentUser],
  (user) => user?.premium_tier || 'FREE'
);

export const selectUserVerification = createSelector(
  [selectCurrentUser],
  (user) => user?.verified
);

export const selectIsUserVerified = createSelector(
  [selectUserVerification],
  (verified) => verified?.phone || verified?.photo || verified?.identity || false
);
