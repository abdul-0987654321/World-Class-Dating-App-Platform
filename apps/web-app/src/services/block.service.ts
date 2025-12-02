/**
 * Block Service
 * Handles user blocking functionality
 */

export interface BlockedUser {
  id: string;
  userId: string;
  blockedUserId: string;
  blockedId?: string; // Alias for blockedUserId
  blockedAt: string;
  createdAt?: string; // Alias for blockedAt
  reason?: string;
  blockedUser?: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    profilePhoto?: string; // Alias for photoUrl
  };
}

export interface BlockResponse {
  success: boolean;
  message: string;
}

class BlockService {
  private isMock = !import.meta.env.VITE_API_URL;

  async blockUser(userId: string, reason?: string): Promise<BlockResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        message: 'User blocked successfully',
      };
    }

    const response = await fetch('/api/users/block', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, reason }),
    });

    if (!response.ok) {
      throw new Error('Failed to block user');
    }

    return response.json();
  }

  async unblockUser(userId: string): Promise<BlockResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        message: 'User unblocked successfully',
      };
    }

    const response = await fetch(`/api/users/block/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to unblock user');
    }

    return response.json();
  }

  async getBlockedUsers(): Promise<{ users: BlockedUser[]; totalCount: number }> {
    if (this.isMock) {
      return { users: [], totalCount: 0 };
    }

    const response = await fetch('/api/users/blocked', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch blocked users');
    }

    return response.json();
  }

  async isUserBlocked(userId: string): Promise<boolean> {
    if (this.isMock) {
      return false;
    }

    const response = await fetch(`/api/users/block/check/${userId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check block status');
    }

    const result = await response.json();
    return result.isBlocked;
  }
}

export const blockService = new BlockService();
export default blockService;
