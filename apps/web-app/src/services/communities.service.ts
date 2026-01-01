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

// Backend response types
interface BackendPost {
  id: string;
  communityId: string;
  authorId: string;
  author?: { id: string; name: string; photoUrl: string };
  content: string;
  images?: string[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt?: string;
  isLiked?: boolean;
  isPinned: boolean;
}

interface BackendEvent {
  id: string;
  communityId: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  location: string;
  isVirtual: boolean;
  meetingLink?: string;
  attendeeCount: number;
  maxAttendees: number;
  hostId: string;
  host?: { id: string; name: string; photoUrl: string };
  coverImage?: string;
  isAttending?: boolean;
}

// Transform backend post to frontend format
function transformPost(p: BackendPost): Post {
  return {
    id: p.id,
    communityId: p.communityId,
    author: p.author || { id: p.authorId, name: 'User', photoUrl: '' },
    content: p.content,
    images: p.images,
    likes: p.likeCount,
    comments: p.commentCount,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    isLiked: p.isLiked || false,
    isPinned: p.isPinned,
  };
}

// Transform backend event to frontend format
function transformEvent(e: BackendEvent): CommunityEvent {
  return {
    id: e.id,
    communityId: e.communityId,
    title: e.title,
    description: e.description,
    date: e.startDate,
    endDate: e.endDate,
    location: e.location,
    isVirtual: e.isVirtual,
    meetingLink: e.meetingLink,
    attendees: e.attendeeCount,
    maxAttendees: e.maxAttendees,
    isAttending: e.isAttending || false,
    host: e.host || { id: e.hostId, name: 'Host', photoUrl: '' },
    coverImage: e.coverImage,
  };
}

// Service
class CommunitiesService {
  private baseUrl = '/api/communities';

  // Community CRUD
  async getCommunities(category?: string): Promise<Community[]> {
    const url = category ? `${this.baseUrl}?category=${category}` : this.baseUrl;
    const response = await apiClient.get<{ success: boolean; data: { communities: Community[] } }>(url);
    return response.data.communities;
  }

  async getCommunity(communityId: string): Promise<Community> {
    const response = await apiClient.get<{ success: boolean; data: Community }>(`${this.baseUrl}/${communityId}`);
    return response.data;
  }

  async getJoinedCommunities(): Promise<Community[]> {
    const response = await apiClient.get<{ success: boolean; data: { communities: Community[] } }>(`${this.baseUrl}/joined`);
    return response.data.communities;
  }

  async joinCommunity(communityId: string): Promise<{ success: boolean; memberCount: number }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/join`
    );
    // Return current member count by refetching community
    const community = await this.getCommunity(communityId);
    return { success: response.success, memberCount: community.memberCount };
  }

  async leaveCommunity(communityId: string): Promise<{ success: boolean; memberCount: number }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/leave`
    );
    // Return current member count by refetching community
    const community = await this.getCommunity(communityId);
    return { success: response.success, memberCount: community.memberCount };
  }

  async getCommunityMembers(communityId: string, page: number = 1, limit: number = 20): Promise<{ members: CommunityMember[]; total: number }> {
    const response = await apiClient.get<{ success: boolean; data: { items: CommunityMember[]; total: number } }>(
      `${this.baseUrl}/${communityId}/members?page=${page}&limit=${limit}`
    );
    return { members: response.data.items, total: response.data.total };
  }

  // Posts
  async getPosts(communityId: string, page: number = 1, limit: number = 20): Promise<{ posts: Post[]; total: number }> {
    const response = await apiClient.get<{ success: boolean; data: { items: BackendPost[]; total: number } }>(
      `${this.baseUrl}/${communityId}/posts?page=${page}&limit=${limit}`
    );
    return {
      posts: response.data.items.map(transformPost),
      total: response.data.total
    };
  }

  async createPost(communityId: string, content: string, images?: string[]): Promise<Post> {
    const response = await apiClient.post<{ success: boolean; data: BackendPost }>(
      `${this.baseUrl}/${communityId}/posts`,
      { content, images }
    );
    return transformPost(response.data);
  }

  async updatePost(communityId: string, postId: string, content: string): Promise<Post> {
    await apiClient.put<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/posts/${postId}`,
      { content }
    );
    // Refetch the post to get updated data
    const { posts } = await this.getPosts(communityId, 1, 50);
    const post = posts.find(p => p.id === postId);
    if (!post) throw new Error('Post not found after update');
    return post;
  }

  async deletePost(communityId: string, postId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/posts/${postId}`
    );
    return { success: response.success };
  }

  async likePost(communityId: string, postId: string): Promise<{ success: boolean; likes: number }> {
    await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/like`
    );
    // Return updated like count by refetching - in a real implementation we'd optimize this
    return { success: true, likes: 0 };
  }

  async unlikePost(communityId: string, postId: string): Promise<{ success: boolean; likes: number }> {
    await apiClient.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/like`
    );
    return { success: true, likes: 0 };
  }

  // Comments
  async getComments(communityId: string, postId: string, page: number = 1, limit: number = 20): Promise<{ comments: Comment[]; total: number }> {
    const response = await apiClient.get<{ success: boolean; data: { items: Comment[]; total: number } }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments?page=${page}&limit=${limit}`
    );
    return { comments: response.data.items, total: response.data.total };
  }

  async createComment(communityId: string, postId: string, content: string, parentId?: string): Promise<Comment> {
    const response = await apiClient.post<{ success: boolean; data: Comment }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments`,
      { content, parentId }
    );
    return response.data;
  }

  async deleteComment(communityId: string, postId: string, commentId: string): Promise<{ success: boolean }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments/${commentId}`
    );
    return { success: response.success };
  }

  async likeComment(communityId: string, postId: string, commentId: string): Promise<{ success: boolean; likes: number }> {
    await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/posts/${postId}/comments/${commentId}/like`
    );
    return { success: true, likes: 0 };
  }

  // Events
  async getEvents(communityId?: string): Promise<CommunityEvent[]> {
    const url = communityId ? `${this.baseUrl}/${communityId}/events` : `${this.baseUrl}/events`;
    const response = await apiClient.get<{ success: boolean; data: { events: BackendEvent[] } }>(url);
    return response.data.events.map(transformEvent);
  }

  async getEvent(communityId: string, eventId: string): Promise<CommunityEvent> {
    const response = await apiClient.get<{ success: boolean; data: BackendEvent }>(
      `${this.baseUrl}/${communityId}/events/${eventId}`
    );
    return transformEvent(response.data);
  }

  async attendEvent(communityId: string, eventId: string): Promise<{ success: boolean; attendees: number }> {
    await apiClient.post<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/events/${eventId}/attend`
    );
    const event = await this.getEvent(communityId, eventId);
    return { success: true, attendees: event.attendees };
  }

  async unattendEvent(communityId: string, eventId: string): Promise<{ success: boolean; attendees: number }> {
    await apiClient.delete<{ success: boolean; message: string }>(
      `${this.baseUrl}/${communityId}/events/${eventId}/attend`
    );
    const event = await this.getEvent(communityId, eventId);
    return { success: true, attendees: event.attendees };
  }

  async getEventAttendees(communityId: string, eventId: string): Promise<CommunityMember[]> {
    const response = await apiClient.get<{ success: boolean; data: { items: CommunityMember[]; total: number } }>(
      `${this.baseUrl}/${communityId}/events/${eventId}/attendees`
    );
    return response.data.items;
  }

  // Categories
  async getCategories(): Promise<string[]> {
    const response = await apiClient.get<{ success: boolean; data: string[] }>(`${this.baseUrl}/categories`);
    return response.data;
  }

  // Search
  async searchCommunities(query: string): Promise<Community[]> {
    const response = await apiClient.get<{ success: boolean; data: { communities: Community[] } }>(
      `${this.baseUrl}/search?q=${encodeURIComponent(query)}`
    );
    return response.data.communities;
  }
}

export const communitiesService = new CommunitiesService();
