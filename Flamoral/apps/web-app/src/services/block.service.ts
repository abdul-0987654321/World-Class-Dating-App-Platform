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
  // Only enable mock mode in development when API URL is not set
  private isMock = import.meta.env.MODE === 'development' &&
                   import.meta.env.VITE_USE_MOCKS === 'true' &&
                   !import.meta.env.VITE_API_URL;

  async blockUser(userId: string, reason?: string): Promise<BlockResponse> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        message: 'User blocked successfully',
      };
    }

    const response = await fetch('/api/v1/users/block', {
      method: 'POST',
      credentials: 'include',
      headers: {
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

    const response = await fetch(`/api/v1/users/block/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
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

    const response = await fetch('/api/v1/users/blocked', {
      credentials: 'include',
      headers: {
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

    const response = await fetch(`/api/v1/users/block/check/${userId}`, {
      credentials: 'include',
      headers: {
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
