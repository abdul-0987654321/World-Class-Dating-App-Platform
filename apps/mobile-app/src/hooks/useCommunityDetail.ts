/**
 * useCommunityDetail Hook
 * Manages single community operations including posts, members, and admin actions
 */

import { useState, useCallback, useEffect } from 'react';
import { httpClient } from '../services/api/httpClient';
import { Community } from './useCommunities';

export interface CommunityPost {
  id: string;
  author: {
    id: string;
    name: string;
    photoUrl: string;
    isVerified?: boolean;
  };
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  createdAt: string;
  isLiked: boolean;
  isPinned?: boolean;
}

export interface CommunityMember {
  id: string;
  name: string;
  photoUrl: string;
  role: 'admin' | 'moderator' | 'member';
  joinedAt: string;
  isOnline?: boolean;
  bio?: string;
}

export interface CommunityRule {
  id: string;
  title: string;
  description: string;
  order: number;
}

interface CommunityDetailState {
  community: Community | null;
  posts: CommunityPost[];
  members: CommunityMember[];
  rules: CommunityRule[];
  loading: boolean;
  postsLoading: boolean;
  membersLoading: boolean;
  error: string | null;
  hasMorePosts: boolean;
  hasMoreMembers: boolean;
  postsPage: number;
  membersPage: number;
  userRole: 'admin' | 'moderator' | 'member' | null;
}

interface UseCommunityDetailReturn extends CommunityDetailState {
  fetchCommunityDetail: (communityId: string) => Promise<void>;
  fetchPosts: (reset?: boolean) => Promise<void>;
  fetchMembers: (reset?: boolean) => Promise<void>;
  createPost: (content: string, imageUrl?: string) => Promise<boolean>;
  deletePost: (postId: string) => Promise<boolean>;
  likePost: (postId: string) => Promise<boolean>;
  pinPost: (postId: string) => Promise<boolean>;
  joinCommunity: () => Promise<boolean>;
  leaveCommunity: () => Promise<boolean>;
  updateCommunity: (updates: Partial<Community>) => Promise<boolean>;
  deleteCommunity: () => Promise<boolean>;
  kickMember: (memberId: string) => Promise<boolean>;
  promoteMember: (memberId: string, role: 'moderator' | 'admin') => Promise<boolean>;
  demoteMember: (memberId: string) => Promise<boolean>;
  addRule: (title: string, description: string) => Promise<boolean>;
  removeRule: (ruleId: string) => Promise<boolean>;
  reportPost: (postId: string, reason: string) => Promise<boolean>;
  reportMember: (memberId: string, reason: string) => Promise<boolean>;
}

const DEFAULT_POSTS: CommunityPost[] = [
  {
    id: '1',
    author: { id: '1', name: 'Sarah', photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg', isVerified: true },
    content: 'Just booked my trip to Bali! Anyone been there recently? Looking for recommendations!',
    likes: 45,
    comments: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isLiked: true,
  },
  {
    id: '2',
    author: { id: '2', name: 'Mike', photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
    content: 'Found this amazing ramen place downtown. The spicy miso is incredible!',
    likes: 32,
    comments: 8,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    isLiked: false,
  },
  {
    id: '3',
    author: { id: '3', name: 'Emma', photoUrl: 'https://randomuser.me/api/portraits/women/2.jpg', isVerified: true },
    content: 'Morning hike at sunrise. Best way to start the weekend! Who wants to join next time?',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400',
    likes: 67,
    comments: 15,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isLiked: true,
  },
];

const DEFAULT_MEMBERS: CommunityMember[] = [
  { id: '1', name: 'Sarah Johnson', photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg', role: 'admin', joinedAt: '2024-01-15T00:00:00Z', isOnline: true },
  { id: '2', name: 'Mike Chen', photoUrl: 'https://randomuser.me/api/portraits/men/1.jpg', role: 'moderator', joinedAt: '2024-01-20T00:00:00Z', isOnline: true },
  { id: '3', name: 'Emma Wilson', photoUrl: 'https://randomuser.me/api/portraits/women/2.jpg', role: 'member', joinedAt: '2024-02-01T00:00:00Z', isOnline: false },
  { id: '4', name: 'James Brown', photoUrl: 'https://randomuser.me/api/portraits/men/2.jpg', role: 'member', joinedAt: '2024-02-15T00:00:00Z', isOnline: false },
  { id: '5', name: 'Olivia Davis', photoUrl: 'https://randomuser.me/api/portraits/women/3.jpg', role: 'member', joinedAt: '2024-03-01T00:00:00Z', isOnline: true },
];

const DEFAULT_RULES: CommunityRule[] = [
  { id: '1', title: 'Be Respectful', description: 'Treat all members with respect. No harassment or bullying.', order: 1 },
  { id: '2', title: 'Stay On Topic', description: 'Keep posts relevant to the community theme.', order: 2 },
  { id: '3', title: 'No Spam', description: 'Avoid promotional content or repetitive posts.', order: 3 },
];

export function useCommunityDetail(communityId?: string): UseCommunityDetailReturn {
  const [state, setState] = useState<CommunityDetailState>({
    community: null,
    posts: [],
    members: [],
    rules: [],
    loading: true,
    postsLoading: false,
    membersLoading: false,
    error: null,
    hasMorePosts: true,
    hasMoreMembers: true,
    postsPage: 1,
    membersPage: 1,
    userRole: null,
  });

  const fetchCommunityDetail = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await httpClient.get<{
        community: Community;
        userRole: 'admin' | 'moderator' | 'member' | null;
        rules: CommunityRule[];
      }>(`/api/communities/${id}`);

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          community: response.data!.community,
          userRole: response.data!.userRole,
          rules: response.data!.rules || DEFAULT_RULES,
          loading: false,
        }));
      } else {
        // Use mock data for demo
        setState((prev) => ({
          ...prev,
          community: {
            id,
            name: 'Travel Lovers',
            description: 'Share your travel adventures and find companions',
            icon: 'airplane',
            memberCount: 15420,
            isJoined: true,
            category: 'Lifestyle',
            color: '#3B82F6',
            isPrivate: false,
            createdAt: '2024-01-15T00:00:00Z',
            createdBy: { id: 'u1', name: 'Admin', photoUrl: '' },
          },
          userRole: 'member',
          rules: DEFAULT_RULES,
          loading: false,
        }));
      }
    } catch (error: any) {
      console.error('Error fetching community detail:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch community',
      }));
    }
  }, []);

  const fetchPosts = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : state.postsPage;

    if (!state.community) return;
    if (!reset && state.postsLoading) return;

    setState((prev) => ({
      ...prev,
      postsLoading: true,
      postsPage: currentPage,
    }));

    try {
      const response = await httpClient.get<{
        posts: CommunityPost[];
        hasMore: boolean;
      }>(`/api/communities/${state.community.id}/posts?page=${currentPage}&limit=20`);

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          posts: reset ? response.data!.posts : [...prev.posts, ...response.data!.posts],
          hasMorePosts: response.data!.hasMore,
          postsLoading: false,
          postsPage: currentPage + 1,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          posts: DEFAULT_POSTS,
          hasMorePosts: false,
          postsLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setState((prev) => ({
        ...prev,
        posts: DEFAULT_POSTS,
        postsLoading: false,
        hasMorePosts: false,
      }));
    }
  }, [state.community, state.postsPage, state.postsLoading]);

  const fetchMembers = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : state.membersPage;

    if (!state.community) return;
    if (!reset && state.membersLoading) return;

    setState((prev) => ({
      ...prev,
      membersLoading: true,
      membersPage: currentPage,
    }));

    try {
      const response = await httpClient.get<{
        members: CommunityMember[];
        hasMore: boolean;
      }>(`/api/communities/${state.community.id}/members?page=${currentPage}&limit=20`);

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          members: reset ? response.data!.members : [...prev.members, ...response.data!.members],
          hasMoreMembers: response.data!.hasMore,
          membersLoading: false,
          membersPage: currentPage + 1,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          members: DEFAULT_MEMBERS,
          hasMoreMembers: false,
          membersLoading: false,
        }));
      }
    } catch (error) {
      console.error('Error fetching members:', error);
      setState((prev) => ({
        ...prev,
        members: DEFAULT_MEMBERS,
        membersLoading: false,
        hasMoreMembers: false,
      }));
    }
  }, [state.community, state.membersPage, state.membersLoading]);

  const createPost = useCallback(async (content: string, imageUrl?: string): Promise<boolean> => {
    if (!state.community) return false;

    try {
      const response = await httpClient.post(`/api/communities/${state.community.id}/posts`, {
        content,
        imageUrl,
      });

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          posts: [response.data as CommunityPost, ...prev.posts],
        }));
        return true;
      }

      // Optimistic update for demo
      const newPost: CommunityPost = {
        id: Date.now().toString(),
        author: { id: 'me', name: 'You', photoUrl: '' },
        content,
        imageUrl,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
        isLiked: false,
      };
      setState((prev) => ({
        ...prev,
        posts: [newPost, ...prev.posts],
      }));
      return true;
    } catch (error) {
      console.error('Error creating post:', error);
      return false;
    }
  }, [state.community]);

  const deletePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!state.community) return false;

    try {
      await httpClient.delete(`/api/communities/${state.community.id}/posts/${postId}`);
      setState((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p.id !== postId),
      }));
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      // Optimistic update
      setState((prev) => ({
        ...prev,
        posts: prev.posts.filter((p) => p.id !== postId),
      }));
      return true;
    }
  }, [state.community]);

  const likePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!state.community) return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/posts/${postId}/like`);
      setState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
            : p
        ),
      }));
      return true;
    } catch (error) {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId
            ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
            : p
        ),
      }));
      return true;
    }
  }, [state.community]);

  const pinPost = useCallback(async (postId: string): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/posts/${postId}/pin`);
      setState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId ? { ...p, isPinned: !p.isPinned } : p
        ),
      }));
      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        posts: prev.posts.map((p) =>
          p.id === postId ? { ...p, isPinned: !p.isPinned } : p
        ),
      }));
      return true;
    }
  }, [state.community, state.userRole]);

  const joinCommunity = useCallback(async (): Promise<boolean> => {
    if (!state.community) return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/join`);
      setState((prev) => ({
        ...prev,
        community: prev.community
          ? { ...prev.community, isJoined: true, memberCount: prev.community.memberCount + 1 }
          : null,
        userRole: 'member',
      }));
      return true;
    } catch (error) {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        community: prev.community
          ? { ...prev.community, isJoined: true, memberCount: prev.community.memberCount + 1 }
          : null,
        userRole: 'member',
      }));
      return true;
    }
  }, [state.community]);

  const leaveCommunity = useCallback(async (): Promise<boolean> => {
    if (!state.community) return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/leave`);
      setState((prev) => ({
        ...prev,
        community: prev.community
          ? { ...prev.community, isJoined: false, memberCount: Math.max(0, prev.community.memberCount - 1) }
          : null,
        userRole: null,
      }));
      return true;
    } catch (error) {
      // Optimistic update
      setState((prev) => ({
        ...prev,
        community: prev.community
          ? { ...prev.community, isJoined: false, memberCount: Math.max(0, prev.community.memberCount - 1) }
          : null,
        userRole: null,
      }));
      return true;
    }
  }, [state.community]);

  const updateCommunity = useCallback(async (updates: Partial<Community>): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      const response = await httpClient.patch(`/api/communities/${state.community.id}`, updates);
      if (response.success) {
        setState((prev) => ({
          ...prev,
          community: prev.community ? { ...prev.community, ...updates } : null,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating community:', error);
      return false;
    }
  }, [state.community, state.userRole]);

  const deleteCommunity = useCallback(async (): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      await httpClient.delete(`/api/communities/${state.community.id}`);
      return true;
    } catch (error) {
      console.error('Error deleting community:', error);
      return false;
    }
  }, [state.community, state.userRole]);

  const kickMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!state.community || !['admin', 'moderator'].includes(state.userRole || '')) return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/members/${memberId}/kick`);
      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
        community: prev.community
          ? { ...prev.community, memberCount: Math.max(0, prev.community.memberCount - 1) }
          : null,
      }));
      return true;
    } catch (error) {
      console.error('Error kicking member:', error);
      return false;
    }
  }, [state.community, state.userRole]);

  const promoteMember = useCallback(async (memberId: string, role: 'moderator' | 'admin'): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/members/${memberId}/promote`, { role });
      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, role } : m
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error promoting member:', error);
      return false;
    }
  }, [state.community, state.userRole]);

  const demoteMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/members/${memberId}/demote`);
      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, role: 'member' } : m
        ),
      }));
      return true;
    } catch (error) {
      console.error('Error demoting member:', error);
      return false;
    }
  }, [state.community, state.userRole]);

  const addRule = useCallback(async (title: string, description: string): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      const response = await httpClient.post(`/api/communities/${state.community.id}/rules`, {
        title,
        description,
      });

      if (response.success && response.data) {
        setState((prev) => ({
          ...prev,
          rules: [...prev.rules, response.data as CommunityRule],
        }));
        return true;
      }

      // Optimistic update
      const newRule: CommunityRule = {
        id: Date.now().toString(),
        title,
        description,
        order: state.rules.length + 1,
      };
      setState((prev) => ({
        ...prev,
        rules: [...prev.rules, newRule],
      }));
      return true;
    } catch (error) {
      console.error('Error adding rule:', error);
      return false;
    }
  }, [state.community, state.userRole, state.rules]);

  const removeRule = useCallback(async (ruleId: string): Promise<boolean> => {
    if (!state.community || state.userRole !== 'admin') return false;

    try {
      await httpClient.delete(`/api/communities/${state.community.id}/rules/${ruleId}`);
      setState((prev) => ({
        ...prev,
        rules: prev.rules.filter((r) => r.id !== ruleId),
      }));
      return true;
    } catch (error) {
      console.error('Error removing rule:', error);
      return false;
    }
  }, [state.community, state.userRole]);

  const reportPost = useCallback(async (postId: string, reason: string): Promise<boolean> => {
    if (!state.community) return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/posts/${postId}/report`, {
        reason,
      });
      return true;
    } catch (error) {
      console.error('Error reporting post:', error);
      return false;
    }
  }, [state.community]);

  const reportMember = useCallback(async (memberId: string, reason: string): Promise<boolean> => {
    if (!state.community) return false;

    try {
      await httpClient.post(`/api/communities/${state.community.id}/members/${memberId}/report`, {
        reason,
      });
      return true;
    } catch (error) {
      console.error('Error reporting member:', error);
      return false;
    }
  }, [state.community]);

  // Initial fetch when communityId is provided
  useEffect(() => {
    if (communityId) {
      fetchCommunityDetail(communityId);
    }
  }, [communityId]);

  // Fetch posts when community is loaded
  useEffect(() => {
    if (state.community && state.posts.length === 0) {
      fetchPosts(true);
    }
  }, [state.community]);

  return {
    ...state,
    fetchCommunityDetail,
    fetchPosts,
    fetchMembers,
    createPost,
    deletePost,
    likePost,
    pinPost,
    joinCommunity,
    leaveCommunity,
    updateCommunity,
    deleteCommunity,
    kickMember,
    promoteMember,
    demoteMember,
    addRule,
    removeRule,
    reportPost,
    reportMember,
  };
}

export default useCommunityDetail;
