/**
 * Matching Async Thunks
 * Handle async operations for matching
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { matchingService } from '../../services';
import { setLoading, setError, setMatches, addMatch } from '../slices/matchingSlice';
import type { Match } from '../../types';

/**
 * Fetch all matches
 */
export const fetchMatches = createAsyncThunk<
  Match[],
  void,
  { rejectValue: string }
>(
  'matching/fetchAll',
  async (_, { rejectWithValue, dispatch }) => {
    try {
      dispatch(setLoading(true));
      const matches = await matchingService.getMatches();
      dispatch(setMatches(matches));
      return matches;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to fetch matches';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Send a like
 */
export const sendLike = createAsyncThunk<
  { match?: Match; liked: boolean },
  string,
  { rejectValue: string }
>(
  'matching/sendLike',
  async (userId, { rejectWithValue, dispatch }) => {
    try {
      const response = await matchingService.likeUser(userId);

      // If it's a match, add to matches
      if (response.match) {
        dispatch(addMatch(response.match));
      }

      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send like';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Send a pass/dislike
 */
export const sendPass = createAsyncThunk<
  { passed: boolean },
  string,
  { rejectValue: string }
>(
  'matching/sendPass',
  async (userId, { rejectWithValue, dispatch }) => {
    try {
      const response = await matchingService.passUser(userId);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send pass';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Send a super like
 */
export const sendSuperLike = createAsyncThunk<
  { match?: Match; superLiked: boolean },
  string,
  { rejectValue: string }
>(
  'matching/sendSuperLike',
  async (userId, { rejectWithValue, dispatch }) => {
    try {
      const response = await matchingService.superLikeUser(userId);

      // If it's a match, add to matches
      if (response.match) {
        dispatch(addMatch(response.match));
      }

      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to send super like';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);

/**
 * Unmatch a user
 */
export const unmatchUser = createAsyncThunk<
  { success: boolean },
  string,
  { rejectValue: string }
>(
  'matching/unmatch',
  async (matchId, { rejectWithValue, dispatch }) => {
    try {
      const response = await matchingService.unmatch(matchId);
      return response;
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to unmatch';
      dispatch(setError(message));
      return rejectWithValue(message);
    }
  }
);
