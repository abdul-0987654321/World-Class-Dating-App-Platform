/**
 * Communities Service
 * Handles all community-related API calls including posts, events, and membership
 */

import { apiClient } from './api.client';

// Types
export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  coverImage?: string;
  memberCount: number;
  postCount: number;
  isJoined: boolean;
  category: string;
  color: string;
  createdAt: string;
  rules?: string[];
  moderators?: CommunityMember[];
}

export interface CommunityMember {
  id: string;
  userId: string;
  name: string;
  photoUrl: string;
  role: 'member' | 'moderator' | 'admin';
  joinedAt: string;
}

export interface Post {
  id: string;
  communityId: string;
  author: {
    id: string;
    name: string;
    photoUrl: string;
  };
  content: string;
  images?: string[];
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt?: string;
  isLiked: boolean;
  isPinned: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  author: {
    id: string;
    name: string;
    photoUrl: string;
  };
  content: string;
  likes: number;
  createdAt: string;
  isLiked: boolean;
  replies?: Comment[];
}

export interface CommunityEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  location: string;
  isVirtual: boolean;
  meetingLink?: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
  host: {
    id: string;
    name: string;
    photoUrl: string;
  };
  coverImage?: string;
}

// Service
class CommunitiesService {
  private baseUrl = '/api/v1/communities';

  // Community CRUD
  async getCommunities(category?: string): Promise<Community[]> {
    const url = category ? `${this.baseUrl}?category=${category}` : this.baseUrl;
    const response = await apiClient.get<{ data: { communities: Community[] } }>(url);
    return response.data.communities;
  }

  async getCommunity(communityId: string): Promise<Community> {
    const response = await apiClient.get<{ data: Community }>(`${this.baseUrl}/${communityId}`);
    return response.data;
  }

  async getJoinedCommunities(): Promise<Community[]> {
    const response = await apiClient.get<{ data: { communities: Community[] } }>(`${this.baseUrl}/joined`);
    return response.data.communities;
  }

  async joinCommunity(communityId: string): Promise<{ success: boolean; memberCount: number }> {
    const response = await apiClient.post<{ data: { success: boolean; memberCount: number } }>(
      `${this.baseUrl}/${communityId}/join`
    );
    return response.data;
  }

  async leaveCommunity(communityId: string): Promise<{ success: boolean; memberCount: number }> {
    const response = await apiClient.post<{ data: { success: boolean; memberCount: number } }>(
      `${this.baseUrl}/${communityId}/leave`
    );
    return response.data;
  }

  async getCommunityMembers(communityId: string, page: number = 1, limit: number = 20): Promise<{ members: CommunityMember[]; total: number }> {
    const response = await apiClient.get<{ data: { members: CommunityMember[]; total: number } }>(
      `${this.baseUrl}/${communityId}/members?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  // Posts
  async getPosts(communityId: string, page: number = 1, limit: number = 20): Promise<{ posts: Post[]; total: number }> {
    const response = await apiClient.get<{ data: { posts: Post[]; total: number } }>(
      `${this.baseUrl}/${communityId}/posts?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async createPost(communityId: string, content: string, images?: string[]): Promise<Post> {
    const response = await apiClient.post<{ data: Post }>(
      `${this.baseUrl}/${communityId}/posts`,
      { content, images }
    );
    return response.data;
  }

  async updatePost(communityId: string, postId: string, content: string): Promise<Post> {
    const response = await apiClient.put<{ data: Post }>(
      `${this.baseUrl}/${communityId}/posts/${postId}`,
      { content }
    );
    return response.data;
  }

  async deletePost(communityId: string, postId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ data: { success: boolean } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}`
    );
    return response.data;
  }

  async likePost(communityId: string, postId: string): Promise<{ success: boolean; likes: number }> {
    const response = await apiClient.post<{ data: { success: boolean; likes: number } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/like`
    );
    return response.data;
  }

  async unlikePost(communityId: string, postId: string): Promise<{ success: boolean; likes: number }> {
    const response = await apiClient.delete<{ data: { success: boolean; likes: number } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/like`
    );
    return response.data;
  }

  // Comments
  async getComments(communityId: string, postId: string, page: number = 1, limit: number = 20): Promise<{ comments: Comment[]; total: number }> {
    const response = await apiClient.get<{ data: { comments: Comment[]; total: number } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments?page=${page}&limit=${limit}`
    );
    return response.data;
  }

  async createComment(communityId: string, postId: string, content: string, parentId?: string): Promise<Comment> {
    const response = await apiClient.post<{ data: Comment }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments`,
      { content, parentId }
    );
    return response.data;
  }

  async deleteComment(communityId: string, postId: string, commentId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ data: { success: boolean } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments/${commentId}`
    );
    return response.data;
  }

  async likeComment(communityId: string, postId: string, commentId: string): Promise<{ success: boolean; likes: number }> {
    const response = await apiClient.post<{ data: { success: boolean; likes: number } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments/${commentId}/like`
    );
    return response.data;
  }

  // Events
  async getEvents(communityId?: string): Promise<CommunityEvent[]> {
    const url = communityId ? `${this.baseUrl}/${communityId}/events` : `${this.baseUrl}/events`;
    const response = await apiClient.get<{ data: { events: CommunityEvent[] } }>(url);
    return response.data.events;
  }

  async getEvent(communityId: string, eventId: string): Promise<CommunityEvent> {
    const response = await apiClient.get<{ data: CommunityEvent }>(
      `${this.baseUrl}/${communityId}/events/${eventId}`
    );
    return response.data;
  }

  async attendEvent(communityId: string, eventId: string): Promise<{ success: boolean; attendees: number }> {
    const response = await apiClient.post<{ data: { success: boolean; attendees: number } }>(
      `${this.baseUrl}/${communityId}/events/${eventId}/attend`
    );
    return response.data;
  }

  async unattendEvent(communityId: string, eventId: string): Promise<{ success: boolean; attendees: number }> {
    const response = await apiClient.delete<{ data: { success: boolean; attendees: number } }>(
      `${this.baseUrl}/${communityId}/events/${eventId}/attend`
    );
    return response.data;
  }

  async getEventAttendees(communityId: string, eventId: string): Promise<CommunityMember[]> {
    const response = await apiClient.get<{ data: { attendees: CommunityMember[] } }>(
      `${this.baseUrl}/${communityId}/events/${eventId}/attendees`
    );
    return response.data.attendees;
  }

  // Categories
  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<{ data: { categories: string[] } }>(`${this.baseUrl}/categories`);
    return response.data.categories;
  }

  // Search
  async searchCommunities(query: string): Promise<Community[]> {
    const response = await apiClient.get<{ data: { communities: Community[] } }>(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
    );
    return response.data.communities;
  }
}

export const communitiesService = new CommunitiesService();
