/**
 * useCommunities Hook
 * Manages communities list, discovery, join/leave operations, and search
 */

import { useState, useCallback, useEffect } from 'react';
import { httpClient, ApiResponse } from '../services/api/httpClient';

export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  coverImageUrl?: string;
  memberCount: number;
  isJoined: boolean;
  category: string;
  color: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    photoUrl: string;
  };
  rules?: string[];
  tags?: string[];
}

export interface CommunityCategory {
  id: string;
  name: string;
  icon: string;
  communityCount: number;
}

interface CommunitiesState {
  communities: Community[];
  joinedCommunities: Community[];
  categories: CommunityCategory[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;
}

interface UseCommunitiesReturn extends CommunitiesState {
  fetchCommunities: (reset?: boolean) => Promise<void>;
  fetchJoinedCommunities: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  searchCommunities: (query: string) => Promise<Community[]>;
  joinCommunity: (communityId: string) => Promise<boolean>;
  leaveCommunity: (communityId: string) => Promise<boolean>;
  refreshCommunities: () => Promise<void>;
  filterByCategory: (categoryId: string | null) => void;
}

const DEFAULT_COMMUNITIES: Community[] = [
  { id: '1', name: 'Travel Lovers', description: 'Share your travel adventures and find companions', icon: 'airplane', memberCount: 15420, isJoined: true, category: 'Lifestyle', color: '#3B82F6', isPrivate: false, createdAt: '2024-01-15T00:00:00Z', createdBy: { id: 'u1', name: 'Admin', photoUrl: '' } },
  { id: '2', name: 'Foodies Unite', description: 'Discover restaurants and share recipes', icon: 'restaurant', memberCount: 12890, isJoined: true, category: 'Food', color: '#F97316', isPrivate: false, createdAt: '2024-01-10T00:00:00Z', createdBy: { id: 'u2', name: 'Admin', photoUrl: '' } },
  { id: '3', name: 'Fitness Fanatics', description: 'Workout buddies and fitness tips', icon: 'fitness', memberCount: 9870, isJoined: false, category: 'Health', color: '#22C55E', isPrivate: false, createdAt: '2024-01-08T00:00:00Z', createdBy: { id: 'u3', name: 'Admin', photoUrl: '' } },
  { id: '4', name: 'Book Club', description: 'Discuss your favorite reads', icon: 'book', memberCount: 7650, isJoined: false, category: 'Culture', color: '#A855F7', isPrivate: false, createdAt: '2024-01-05T00:00:00Z', createdBy: { id: 'u4', name: 'Admin', photoUrl: '' } },
  { id: '5', name: 'Pet Parents', description: 'Share your furry friends', icon: 'paw', memberCount: 11230, isJoined: true, category: 'Pets', color: '#EAB308', isPrivate: false, createdAt: '2024-01-12T00:00:00Z', createdBy: { id: 'u5', name: 'Admin', photoUrl: '' } },
  { id: '6', name: 'Movie Buffs', description: 'Film discussions and recommendations', icon: 'film', memberCount: 8900, isJoined: false, category: 'Entertainment', color: '#EF4444', isPrivate: false, createdAt: '2024-01-03T00:00:00Z', createdBy: { id: 'u6', name: 'Admin', photoUrl: '' } },
  { id: '7', name: 'Music Lovers', description: 'Share playlists and concert experiences', icon: 'musical-notes', memberCount: 10450, isJoined: false, category: 'Music', color: '#8B5CF6', isPrivate: false, createdAt: '2024-01-01T00:00:00Z', createdBy: { id: 'u7', name: 'Admin', photoUrl: '' } },
  { id: '8', name: 'Outdoor Adventures', description: 'Hiking, camping, and nature exploration', icon: 'leaf', memberCount: 6780, isJoined: false, category: 'Adventure', color: '#14B8A6', isPrivate: false, createdAt: '2024-02-01T00:00:00Z', createdBy: { id: 'u8', name: 'Admin', photoUrl: '' } },
  { id: '9', name: 'Tech Enthusiasts', description: 'Latest gadgets and tech discussions', icon: 'hardware-chip', memberCount: 5430, isJoined: false, category: 'Technology', color: '#6366F1', isPrivate: false, createdAt: '2024-02-05T00:00:00Z', createdBy: { id: 'u9', name: 'Admin', photoUrl: '' } },
  { id: '10', name: 'Art & Design', description: 'Creative inspiration and art sharing', icon: 'color-palette', memberCount: 4560, isJoined: false, category: 'Art', color: '#EC4899', isPrivate: false, createdAt: '2024-02-10T00:00:00Z', createdBy: { id: 'u10', name: 'Admin', photoUrl: '' } },
];

const DEFAULT_CATEGORIES: CommunityCategory[] = [
  { id: 'lifestyle', name: 'Lifestyle', icon: 'heart', communityCount: 45 },
  { id: 'food', name: 'Food & Drink', icon: 'restaurant', communityCount: 32 },
  { id: 'health', name: 'Health & Fitness', icon: 'fitness', communityCount: 28 },
  { id: 'culture', name: 'Culture', icon: 'book', communityCount: 24 },
  { id: 'entertainment', name: 'Entertainment', icon: 'film', communityCount: 38 },
  { id: 'music', name: 'Music', icon: 'musical-notes', communityCount: 21 },
  { id: 'technology', name: 'Technology', icon: 'hardware-chip', communityCount: 15 },
  { id: 'art', name: 'Art & Design', icon: 'color-palette', communityCount: 19 },
];

export function useCommunities(): UseCommunitiesReturn {
  const [state, setState] = useState<CommunitiesState>({
    communities: [],
    joinedCommunities: [],
    categories: [],
    loading: true,
    refreshing: false,
    error: null,
    hasMore: true,
    page: 1,
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const fetchCommunities = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : state.page;

    if (!reset && state.loading) return;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: null,
      page: currentPage,
    }));

    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await httpClient.get<{ communities: Community[]; hasMore: boolean }>(
        `/api/communities?${params.toString()}`
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          communities: reset
            ? response.data!.communities
            : [...prev.communities, ...response.data!.communities],
          hasMore: response.data!.hasMore,
          loading: false,
          page: currentPage + 1,
        }));
      } else {
        // Use default data if API fails
        setState((prev) => ({
          ...prev,
          communities: DEFAULT_COMMUNITIES,
          hasMore: false,
          loading: false,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching communities:', error);
      setState((prev) => ({
        ...prev,
        communities: DEFAULT_COMMUNITIES,
        loading: false,
        error: error.message || 'Failed to fetch communities',
        hasMore: false,
      }));
    }
  }, [state.page, state.loading, selectedCategory]);

  const fetchJoinedCommunities = useCallback(async () => {
    try {
      const response = await httpClient.get<{ communities: Community[] }>(
        '/api/communities/joined'
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          joinedCommunities: response.data!.communities,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          joinedCommunities: DEFAULT_COMMUNITIES.filter((c) => c.isJoined),
        }));
      }
    } catch (error) {
      console.error('Error fetching joined communities:', error);
      setState((prev) => ({
        ...prev,
        joinedCommunities: DEFAULT_COMMUNITIES.filter((c) => c.isJoined),
      }));
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await httpClient.get<{ categories: CommunityCategory[] }>(
        '/api/communities/categories'
      );

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          categories: response.data!.categories,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          categories: DEFAULT_CATEGORIES,
        }));
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setState((prev) => ({
        ...prev,
        categories: DEFAULT_CATEGORIES,
      }));
    }
  }, []);

  const searchCommunities = useCallback(async (query: string): Promise<Community[]> => {
    if (!query.trim()) {
      return state.communities;
    }

    try {
      const response = await httpClient.get<{ communities: Community[] }>(
        `/api/communities/search?q=${encodeURIComponent(query)}`
      );

      if (response.success && response.data) {
        return response.data.communities;
      }

      // Fallback to local search
      const lowerQuery = query.toLowerCase();
      return state.communities.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.description.toLowerCase().includes(lowerQuery) ||
          c.category.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      // Fallback to local search
      const lowerQuery = query.toLowerCase();
      return state.communities.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.description.toLowerCase().includes(lowerQuery) ||
          c.category.toLowerCase().includes(lowerQuery)
      );
    }
  }, [state.communities]);

  const joinCommunity = useCallback(async (communityId: string): Promise<boolean> => {
    try {
      const response = await httpClient.post(`/api/communities/${communityId}/join`);

      if (response.success) {
        setState((prev) => ({
          ...prev,
          communities: prev.communities.map((c) =>
            c.id === communityId
              ? { ...c, isJoined: true, memberCount: c.memberCount + 1 }
              : c
          ),
          joinedCommunities: [
            ...prev.joinedCommunities,
            prev.communities.find((c) => c.id === communityId)!,
          ].filter(Boolean),
        }));
        return true;
      }

      // Optimistic update for demo
      setState((prev) => ({
        ...prev,
        communities: prev.communities.map((c) =>
          c.id === communityId
            ? { ...c, isJoined: true, memberCount: c.memberCount + 1 }
            : c
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error joining community:', error);
      // Optimistic update for demo
      setState((prev) => ({
        ...prev,
        communities: prev.communities.map((c) =>
          c.id === communityId
            ? { ...c, isJoined: true, memberCount: c.memberCount + 1 }
            : c
        ),
      }));
      return true;
    }
  }, []);

  const leaveCommunity = useCallback(async (communityId: string): Promise<boolean> => {
    try {
      const response = await httpClient.post(`/api/communities/${communityId}/leave`);

      if (response.success) {
        setState((prev) => ({
          ...prev,
          communities: prev.communities.map((c) =>
            c.id === communityId
              ? { ...c, isJoined: false, memberCount: Math.max(0, c.memberCount - 1) }
              : c
          ),
          joinedCommunities: prev.joinedCommunities.filter((c) => c.id !== communityId),
        }));
        return true;
      }

      // Optimistic update for demo
      setState((prev) => ({
        ...prev,
        communities: prev.communities.map((c) =>
          c.id === communityId
            ? { ...c, isJoined: false, memberCount: Math.max(0, c.memberCount - 1) }
            : c
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error leaving community:', error);
      // Optimistic update for demo
      setState((prev) => ({
        ...prev,
        communities: prev.communities.map((c) =>
          c.id === communityId
            ? { ...c, isJoined: false, memberCount: Math.max(0, c.memberCount - 1) }
            : c
        ),
      }));
      return true;
    }
  }, []);

  const refreshCommunities = useCallback(async () => {
    setState((prev) => ({ ...prev, refreshing: true }));
    await Promise.all([fetchCommunities(true), fetchJoinedCommunities(), fetchCategories()]);
    setState((prev) => ({ ...prev, refreshing: false }));
  }, [fetchCommunities, fetchJoinedCommunities, fetchCategories]);

  const filterByCategory = useCallback((categoryId: string | null) => {
    setSelectedCategory(categoryId);
    setState((prev) => ({ ...prev, page: 1, communities: [] }));
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCommunities(true);
    fetchJoinedCommunities();
    fetchCategories();
  }, []);

  // Re-fetch when category changes
  useEffect(() => {
    if (selectedCategory !== null) {
      fetchCommunities(true);
    }
  }, [selectedCategory]);

  return {
    ...state,
    fetchCommunities,
    fetchJoinedCommunities,
    fetchCategories,
    searchCommunities,
    joinCommunity,
    leaveCommunity,
    refreshCommunities,
    filterByCategory,
  };
}

export default useCommunities;
