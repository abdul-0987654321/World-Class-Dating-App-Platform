/**
 * Matching Hooks
 * React Query hooks for matching/swiping operations
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { getApiClient } from '../client';

// Types
export interface ProfileCard {
  userId: string;
  name: string;
  age: number;
  bio: string;
  photoUrls: string[];
  city: string;
  distanceKm: number;
  interests: string[];
  prompts: { question: string; answer: string }[];
  compatibilityScore: number;
  commonInterests: string[];
  isVerified: boolean;
  isOnline: boolean;
  lastActive: string;
}

export interface Match {
  id: string;
  userId: string;
  matchedUserId: string;
  matchedUser: MatchedUser;
  matchedAt: string;
  lastMessage?: string;
  lastMessageAt?: string;
  isSuperLike: boolean;
  hasUnread: boolean;
}

export interface MatchedUser {
  id: string;
  name: string;
  photoUrl: string;
  isOnline: boolean;
  lastActive: string;
}

export interface Like {
  id: string;
  fromUserId: string;
  fromUser: {
    id: string;
    blurredPhotoUrl: string;
    photoUrl?: string;
    name?: string;
    age?: number;
  };
  likedAt: string;
  isSuperLike: boolean;
  isRevealed: boolean;
}

export type SwipeAction = 'like' | 'pass' | 'super_like';

export interface SwipeResponse {
  isMatch: boolean;
  match?: Match;
  remainingLikes: number;
  remainingSuperLikes: number;
}

// Query Keys
export const matchingKeys = {
  all: ['matching'] as const,
  recommendations: () => [...matchingKeys.all, 'recommendations'] as const,
  matches: (filter?: string) => [...matchingKeys.all, 'matches', filter] as const,
  likes: () => [...matchingKeys.all, 'likes'] as const,
  stats: () => [...matchingKeys.all, 'stats'] as const,
};

// Hooks
export function useRecommendations() {
  return useInfiniteQuery({
    queryKey: matchingKeys.recommendations(),
    queryFn: async ({ pageParam = '' }) => {
      const response = await getApiClient().get<{
        profiles: ProfileCard[];
        nextCursor: string;
        remainingToday: number;
      }>(`/matching/recommendations${pageParam ? `?cursor=${pageParam}` : ''}`);
      return response;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: '',
  });
}

export function useSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetUserId,
      action,
    }: {
      targetUserId: string;
      action: SwipeAction;
    }) => {
      return getApiClient().post<SwipeResponse>('/matching/swipe', {
        targetUserId,
        action,
      });
    },
    onSuccess: (data) => {
      if (data.isMatch) {
        // Invalidate matches to refresh the list
        queryClient.invalidateQueries({ queryKey: matchingKeys.matches() });
      }
      // Update stats
      queryClient.invalidateQueries({ queryKey: matchingKeys.stats() });
    },
  });
}

export function useMatches(filter?: 'unread' | 'super_likes') {
  return useInfiniteQuery({
    queryKey: matchingKeys.matches(filter),
    queryFn: async ({ pageParam = '' }) => {
      const params = new URLSearchParams();
      if (pageParam) params.append('cursor', pageParam);
      if (filter) params.append('filter', filter);

      return getApiClient().get<{
        matches: Match[];
        nextCursor: string;
        totalCount: number;
      }>(`/matching/matches?${params.toString()}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: '',
  });
}

export function useLikes() {
  return useInfiniteQuery({
    queryKey: matchingKeys.likes(),
    queryFn: async ({ pageParam = '' }) => {
      return getApiClient().get<{
        likes: Like[];
        nextCursor: string;
        totalCount: number;
        canSeeLikes: boolean;
      }>(`/matching/likes${pageParam ? `?cursor=${pageParam}` : ''}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: '',
  });
}

export function useUnmatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (matchId: string) =>
      getApiClient().delete(`/matching/matches/${matchId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.matches() });
    },
  });
}

export function useUndoSwipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => getApiClient().post('/matching/undo'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.stats() });
    },
  });
}

export function useBoostProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (durationMinutes: 30 | 60 | 180) =>
      getApiClient().post<{ expiresAt: string; remainingBoosts: number }>(
        '/matching/boost',
        { durationMinutes }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: matchingKeys.stats() });
    },
  });
}

export function useMatchingStats() {
  return useQuery({
    queryKey: matchingKeys.stats(),
    queryFn: () =>
      getApiClient().get<{
        remainingLikes: number;
        remainingSuperLikes: number;
        remainingBoosts: number;
        likesResetAt: string;
        isPremium: boolean;
      }>('/matching/stats'),
    staleTime: 60 * 1000, // 1 minute
  });
}
