/**
 * Matching API Endpoints
 * RTK Query endpoints for matching
 */

import { baseApi } from './baseApi';
import type { Match } from '../../types';

export const matchingApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMatches: builder.query<Match[], void>({
      query: () => '/api/matches',
      providesTags: ['Match'],
    }),
    likeUser: builder.mutation<{ match?: Match; liked: boolean }, string>({
      query: (userId) => ({
        url: `/api/matching/like/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Match'],
    }),
    passUser: builder.mutation<{ passed: boolean }, string>({
      query: (userId) => ({
        url: `/api/matching/pass/${userId}`,
        method: 'POST',
      }),
    }),
    superLikeUser: builder.mutation<{ match?: Match; superLiked: boolean }, string>({
      query: (userId) => ({
        url: `/api/matching/super-like/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: ['Match'],
    }),
    unmatch: builder.mutation<{ success: boolean }, string>({
      query: (matchId) => ({
        url: `/api/matches/${matchId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Match', 'Conversation'],
    }),
  }),
});

export const {
  useGetMatchesQuery,
  useLikeUserMutation,
  usePassUserMutation,
  useSuperLikeUserMutation,
  useUnmatchMutation,
} = matchingApi;
