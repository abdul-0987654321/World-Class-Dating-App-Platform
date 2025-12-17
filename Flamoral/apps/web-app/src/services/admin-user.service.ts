/**
 * Admin User Service
 * Handles admin-level user management operations
 */

import apiClient from './api.client';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  bio?: string;
  age?: number;
  gender?: string;
  location?: string;
  subscription: 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  isSuspended: boolean;
  suspendedUntil?: string;
  createdAt: string;
  lastActive: string;
  reportCount: number;
  totalMatches: number;
  totalMessages: number;
  photosCount: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  phoneVerified?: boolean;
  emailVerified?: boolean;
}

export interface AdminUserActivity {
  userId: string;
  lastLogin: string;
  lastActive: string;
  totalLogins: number;
  totalSwipes: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  totalReports: number;
  totalReportsReceived: number;
  deviceInfo?: {
    platform?: string;
    browser?: string;
    lastIP?: string;
  };
}

export interface UserMatch {
  id: string;
  matchedUserId: string;
  matchedUser: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  matchedAt: string;
  lastMessageAt?: string;
  messageCount: number;
  isBlocked: boolean;
}

export interface UserConversation {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: string;
  };
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserReport {
  id: string;
  reporterId: string;
  reporter: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhoto?: string;
  };
  reportedUserId: string;
  category: string;
  description: string;
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed' | 'action_taken';
  createdAt: string;
  resolvedAt?: string;
  actionTaken?: string;
}

export interface ModerationAction {
  type: 'warn' | 'suspend' | 'ban' | 'unban' | 'unsuspend';
  reason: string;
  duration?: number; // for suspensions, in days
  adminId: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  age?: number;
  gender?: string;
  location?: string;
  isVerified?: boolean;
}

export interface SubscriptionUpdateRequest {
  tier: 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  duration?: number; // in months, if applicable
  reason: string;
}

export interface UsersListParams {
  page?: number;
  limit?: number;
  search?: string;
  filter?: 'all' | 'verified' | 'premium' | 'banned' | 'reported' | 'suspended' | 'active';
  sortBy?: 'createdAt' | 'lastActive' | 'reportCount' | 'firstName';
  sortOrder?: 'asc' | 'desc';
}

export interface UsersListResponse {
  users: AdminUser[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

class AdminUserService {
  private baseUrl = '/api/v1/admin/users';
  // Only enable mock mode in development when API URL is not set
  private isMock = import.meta.env.MODE === 'development' &&
                   import.meta.env.VITE_USE_MOCKS === 'true' &&
                   !import.meta.env.VITE_API_URL;

  // Mock data generation
  private generateMockUsers(count: number = 20): AdminUser[] {
    const firstNames = ['Alex', 'Sarah', 'Mike', 'Emma', 'John', 'Lisa', 'David', 'Maria', 'Chris', 'Anna'];
    const lastNames = ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas'];
    const tiers: Array<'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND'> = ['FREE', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const locations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Miami, FL'];

    return Array.from({ length: count }, (_, i) => ({
      id: `user-${i + 1}`,
      email: `user${i + 1}@example.com`,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      profilePhoto: `https://randomuser.me/api/portraits/${i % 2 === 0 ? 'men' : 'women'}/${i % 50}.jpg`,
      bio: `Passionate about life and making connections. Looking for someone special.`,
      age: 25 + (i % 20),
      gender: i % 2 === 0 ? 'male' : 'female',
      location: locations[i % locations.length],
      subscription: tiers[i % tiers.length],
      isVerified: i % 3 === 0,
      isActive: i % 5 !== 0,
      isBanned: i % 20 === 0,
      isSuspended: i % 15 === 0,
      suspendedUntil: i % 15 === 0 ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      createdAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)).toISOString(),
      lastActive: new Date(Date.now() - (i * 60 * 60 * 1000)).toISOString(),
      reportCount: i % 10 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
      totalMatches: Math.floor(Math.random() * 50),
      totalMessages: Math.floor(Math.random() * 200),
      photosCount: Math.floor(Math.random() * 8) + 1,
      phoneVerified: i % 2 === 0,
      emailVerified: i % 3 === 0,
    }));
  }

  async getUsers(params: UsersListParams = {}): Promise<UsersListResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));

      const {
        page = 1,
        limit = 10,
        search = '',
        filter = 'all',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      let users = this.generateMockUsers(50);

      // Apply filters
      if (filter !== 'all') {
        users = users.filter(u => {
          switch (filter) {
            case 'verified': return u.isVerified;
            case 'premium': return u.subscription !== 'FREE';
            case 'banned': return u.isBanned;
            case 'reported': return u.reportCount > 0;
            case 'suspended': return u.isSuspended;
            case 'active': return u.isActive && !u.isBanned && !u.isSuspended;
            default: return true;
          }
        });
      }

      // Apply search
      if (search) {
        const searchLower = search.toLowerCase();
        users = users.filter(u =>
          u.firstName.toLowerCase().includes(searchLower) ||
          u.lastName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower) ||
          u.id.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting
      users.sort((a, b) => {
        let aVal: any = a[sortBy as keyof AdminUser];
        let bVal: any = b[sortBy as keyof AdminUser];

        if (sortBy === 'createdAt' || sortBy === 'lastActive') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });

      const totalCount = users.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = (page - 1) * limit;
      const paginatedUsers = users.slice(startIndex, startIndex + limit);

      return {
        users: paginatedUsers,
        totalCount,
        totalPages,
        currentPage: page,
      };
    }

    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    return apiClient.get<UsersListResponse>(`${this.baseUrl}?${queryParams.toString()}`);
  }

  async getUserById(userId: string): Promise<AdminUser> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const users = this.generateMockUsers(50);
      const user = users.find(u => u.id === userId) || users[0];
      return user;
    }

    return apiClient.get<AdminUser>(`${this.baseUrl}/${userId}`);
  }

  async getUserActivity(userId: string): Promise<AdminUserActivity> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        userId,
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        totalLogins: Math.floor(Math.random() * 100) + 20,
        totalSwipes: Math.floor(Math.random() * 500) + 100,
        totalLikes: Math.floor(Math.random() * 200) + 50,
        totalMatches: Math.floor(Math.random() * 50) + 10,
        totalMessages: Math.floor(Math.random() * 300) + 50,
        totalReports: Math.floor(Math.random() * 3),
        totalReportsReceived: Math.floor(Math.random() * 5),
        deviceInfo: {
          platform: 'Web',
          browser: 'Chrome 120',
          lastIP: '192.168.1.' + Math.floor(Math.random() * 255),
        },
      };
    }

    return apiClient.get<AdminUserActivity>(`${this.baseUrl}/${userId}/activity`);
  }

  async getUserMatches(userId: string): Promise<UserMatch[]> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const matchCount = Math.floor(Math.random() * 10) + 1;
      return Array.from({ length: matchCount }, (_, i) => ({
        id: `match-${i + 1}`,
        matchedUserId: `user-${100 + i}`,
        matchedUser: {
          id: `user-${100 + i}`,
          firstName: ['Emma', 'Lisa', 'Maria', 'Anna', 'Sophie'][i % 5],
          lastName: ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson'][i % 5],
          profilePhoto: `https://randomuser.me/api/portraits/women/${i % 50}.jpg`,
        },
        matchedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        lastMessageAt: i % 2 === 0 ? new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString() : undefined,
        messageCount: i % 2 === 0 ? Math.floor(Math.random() * 50) : 0,
        isBlocked: false,
      }));
    }

    return apiClient.get<UserMatch[]>(`${this.baseUrl}/${userId}/matches`);
  }

  async getUserConversations(userId: string): Promise<UserConversation[]> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const convCount = Math.floor(Math.random() * 8) + 1;
      return Array.from({ length: convCount }, (_, i) => ({
        id: `conv-${i + 1}`,
        participants: [userId, `user-${200 + i}`],
        lastMessage: i % 2 === 0 ? {
          content: 'Hey, how are you doing?',
          senderId: i % 4 === 0 ? userId : `user-${200 + i}`,
          timestamp: new Date(Date.now() - i * 60 * 60 * 1000).toISOString(),
        } : undefined,
        messageCount: Math.floor(Math.random() * 50),
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
      }));
    }

    return apiClient.get<UserConversation[]>(`${this.baseUrl}/${userId}/conversations`);
  }

  async getUserReports(userId: string): Promise<UserReport[]> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const reportCount = Math.floor(Math.random() * 5);
      return Array.from({ length: reportCount }, (_, i) => ({
        id: `report-${i + 1}`,
        reporterId: `user-${300 + i}`,
        reporter: {
          id: `user-${300 + i}`,
          firstName: ['John', 'Mike', 'David', 'Chris', 'Tom'][i % 5],
          lastName: ['Brown', 'Davis', 'Miller', 'Wilson', 'Moore'][i % 5],
          profilePhoto: `https://randomuser.me/api/portraits/men/${i % 50}.jpg`,
        },
        reportedUserId: userId,
        category: ['harassment', 'spam', 'inappropriate_content', 'fake_profile'][i % 4],
        description: 'User violated community guidelines',
        status: ['pending', 'investigating', 'resolved', 'dismissed'][i % 4] as any,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        resolvedAt: i % 2 === 0 ? new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString() : undefined,
        actionTaken: i % 2 === 0 ? 'User warned' : undefined,
      }));
    }

    return apiClient.get<UserReport[]>(`${this.baseUrl}/${userId}/reports`);
  }

  async updateUser(userId: string, data: UpdateUserRequest): Promise<AdminUser> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = await this.getUserById(userId);
      return { ...user, ...data };
    }

    return apiClient.patch<AdminUser>(`${this.baseUrl}/${userId}`, data);
  }

  async performModerationAction(userId: string, action: ModerationAction): Promise<void> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Moderation action performed:', { userId, action });
      return;
    }

    await apiClient.post<void>(`${this.baseUrl}/${userId}/moderation`, action);
  }

  async updateSubscription(userId: string, data: SubscriptionUpdateRequest): Promise<AdminUser> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = await this.getUserById(userId);
      return {
        ...user,
        subscription: data.tier,
        subscriptionStartDate: new Date().toISOString(),
        subscriptionEndDate: data.duration ? new Date(Date.now() + data.duration * 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      };
    }

    return apiClient.post<AdminUser>(`${this.baseUrl}/${userId}/subscription`, data);
  }

  async deleteUser(userId: string): Promise<void> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('User deleted:', userId);
      return;
    }

    await apiClient.delete<void>(`${this.baseUrl}/${userId}`);
  }

  async verifyUser(userId: string): Promise<AdminUser> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const user = await this.getUserById(userId);
      return { ...user, isVerified: true };
    }

    return apiClient.post<AdminUser>(`${this.baseUrl}/${userId}/verify`);
  }

  async resetPassword(userId: string): Promise<void> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Password reset for user:', userId);
      return;
    }

    await apiClient.post<void>(`${this.baseUrl}/${userId}/reset-password`);
  }
}

export const adminUserService = new AdminUserService();
export default adminUserService;
