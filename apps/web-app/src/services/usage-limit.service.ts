/**
 * Usage Limit Service
 * Handles daily limits and usage tracking
 */

export interface LimitInfo {
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  isReached: boolean;
}

export interface UserLimits {
  likes?: LimitInfo;
  super_likes?: LimitInfo;
  rewinds?: LimitInfo;
  swipes?: LimitInfo;
  [key: string]: LimitInfo | undefined;
}

export interface UsageLimits {
  likes: {
    used: number;
    limit: number;
    resetsAt: string;
    unlimited: boolean;
  };
  superLikes: {
    used: number;
    limit: number;
    resetsAt: string;
    unlimited: boolean;
  };
  messages: {
    used: number;
    limit: number;
    resetsAt: string;
    unlimited: boolean;
  };
  boosts: {
    used: number;
    limit: number;
    resetsAt: string;
    unlimited: boolean;
  };
  rewinds: {
    used: number;
    limit: number;
    resetsAt: string;
    unlimited: boolean;
  };
}

export interface LimitStatus {
  canPerformAction: boolean;
  remaining: number;
  resetsAt?: string;
  upgradeRequired?: boolean;
}

class UsageLimitService {
  private isMock = !import.meta.env.VITE_API_URL;

  async getLimits(): Promise<UsageLimits> {
    if (this.isMock) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0);
      const resetsAt = resetTime.toISOString();

      return {
        likes: {
          used: 45,
          limit: 100,
          resetsAt,
          unlimited: false,
        },
        superLikes: {
          used: 2,
          limit: 5,
          resetsAt,
          unlimited: false,
        },
        messages: {
          used: 0,
          limit: -1,
          resetsAt,
          unlimited: true,
        },
        boosts: {
          used: 0,
          limit: 1,
          resetsAt,
          unlimited: false,
        },
        rewinds: {
          used: 3,
          limit: 5,
          resetsAt,
          unlimited: false,
        },
      };
    }

    const response = await fetch('/api/limits', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch usage limits');
    }

    return response.json();
  }

  async checkLimit(action: 'like' | 'super_like' | 'message' | 'boost' | 'rewind'): Promise<LimitStatus> {
    if (this.isMock) {
      const limits = await this.getLimits();
      const actionMap: Record<string, keyof UsageLimits> = {
        like: 'likes',
        super_like: 'superLikes',
        message: 'messages',
        boost: 'boosts',
        rewind: 'rewinds',
      };

      const limit = limits[actionMap[action]];
      const remaining = limit.unlimited ? Infinity : limit.limit - limit.used;

      return {
        canPerformAction: limit.unlimited || remaining > 0,
        remaining: limit.unlimited ? -1 : remaining,
        resetsAt: limit.resetsAt,
        upgradeRequired: !limit.unlimited && remaining <= 0,
      };
    }

    const response = await fetch(`/api/limits/check/${action}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check limit');
    }

    return response.json();
  }

  async incrementUsage(action: 'like' | 'super_like' | 'message' | 'boost' | 'rewind'): Promise<LimitStatus> {
    if (this.isMock) {
      // In mock mode, just return updated status
      return this.checkLimit(action);
    }

    const response = await fetch(`/api/limits/use/${action}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to increment usage');
    }

    return response.json();
  }

  getTimeUntilReset(resetsAt: string): { hours: number; minutes: number; seconds: number } {
    const now = new Date();
    const reset = new Date(resetsAt);
    const diffMs = Math.max(0, reset.getTime() - now.getTime());

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }

  formatTimeUntilReset(resetsAt: string): string {
    const { hours, minutes } = this.getTimeUntilReset(resetsAt);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  async getUserLimits(): Promise<UserLimits> {
    if (this.isMock) {
      const resetTime = new Date();
      resetTime.setHours(24, 0, 0, 0);

      return {
        likes: {
          used: 45,
          limit: 100,
          remaining: 55,
          resetAt: resetTime,
          isReached: false,
        },
        super_likes: {
          used: 4,
          limit: 5,
          remaining: 1,
          resetAt: resetTime,
          isReached: false,
        },
        rewinds: {
          used: 3,
          limit: 5,
          remaining: 2,
          resetAt: resetTime,
          isReached: false,
        },
      };
    }

    const response = await fetch('/api/limits/user', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user limits');
    }

    return response.json();
  }
}

export const usageLimitService = new UsageLimitService();
export default usageLimitService;
