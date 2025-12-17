/**
 * Matching State Selectors
 * Memoized selectors for matching state
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// Base selectors
export const selectMatchingState = (state: RootState) => state.matching;

// Memoized selectors
export const selectMatches = createSelector(
  [selectMatchingState],
  (matching) => matching.matches
);

export const selectCurrentMatch = createSelector(
  [selectMatchingState],
  (matching) => matching.currentMatch
);

export const selectMatchingLoading = createSelector(
  [selectMatchingState],
  (matching) => matching.loading
);

export const selectMatchingError = createSelector(
  [selectMatchingState],
  (matching) => matching.error
);

export const selectMatchById = (matchId: string) =>
  createSelector([selectMatches], (matches) =>
    matches.find((m) => m.id === matchId)
  );

export const selectMatchesCount = createSelector(
  [selectMatches],
  (matches) => matches.length
);

export const selectUnreadMatchesCount = createSelector(
  [selectMatches],
  (matches) => matches.filter((m) => m.hasUnread).length
);

export const selectSortedMatches = createSelector(
  [selectMatches],
  (matches) => {
    return [...matches].sort((a, b) => {
      // Sort by last message date, most recent first
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return dateB - dateA;
    });
  }
);

export const selectIsMatchingStale = createSelector(
  [selectMatchingState],
  (matching) => {
    if (!matching.lastFetched) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - matching.lastFetched > fiveMinutes;
  }
);
