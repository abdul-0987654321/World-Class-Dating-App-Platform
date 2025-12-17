/**
 * Dashboard Service
 * Single source of truth for user data from /me/dashboard endpoint
 */

export interface DashboardProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string | null;
  bio: string | null;
  occupation: string | null;
  location: string | null;
}

export interface DashboardVerification {
  email: string;
  phone: string;
  identity: string;
  selfie: string;
  liveness: string;
  video: string;
  biometric: string;
  isFullyVerified: boolean;
}

export interface DashboardSubscription {
  tier: string;
  status: string;
  expiresAt: string | null;
  features: string[];
}

export interface DashboardStats {
  coinsBalance: number;
  matchesCount: number;
  likesReceivedCount: number;
}

export interface DashboardEntitlements {
  videoCalls: {
    canMakeVideoCalls: boolean;
    canMakeAudioCalls: boolean;
    maxMinutesPerCall: number;
    callsPerDay: number;
    remainingCallsToday: number;
  };
  limits: {
    swipesToday: number;
    superLikesToday: number;
    boostsToday: number;
    resetsAt: string | null;
  };
}

export interface DashboardData {
  profile: DashboardProfile;
  verification: DashboardVerification;
  subscription: DashboardSubscription;
  stats: DashboardStats;
  entitlements: DashboardEntitlements;
  memberSince: string;
}

class DashboardService {
  private baseUrl = '/api/v1/me';
  private cachedData: DashboardData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Get unified dashboard data
   * This is the single source of truth for user data
   */
  async getDashboard(forceRefresh: boolean = false): Promise<DashboardData> {
    // Return cached data if not expired and not forcing refresh
    if (!forceRefresh && this.cachedData && Date.now() < this.cacheExpiry) {
      return this.cachedData;
    }

    const response = await fetch(`${this.baseUrl}/dashboard`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch dashboard data');
    }

    const data = await response.json();

    // Cache the data
    this.cachedData = data;
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return data;
  }

  /**
   * Get just the profile from dashboard
   */
  async getProfile(): Promise<DashboardProfile> {
    const dashboard = await this.getDashboard();
    return dashboard.profile;
  }

  /**
   * Get just the stats from dashboard
   */
  async getStats(): Promise<DashboardStats> {
    const dashboard = await this.getDashboard();
    return dashboard.stats;
  }

  /**
   * Get just the subscription info from dashboard
   */
  async getSubscription(): Promise<DashboardSubscription> {
    const dashboard = await this.getDashboard();
    return dashboard.subscription;
  }

  /**
   * Get just the entitlements from dashboard
   */
  async getEntitlements(): Promise<DashboardEntitlements> {
    const dashboard = await this.getDashboard();
    return dashboard.entitlements;
  }

  /**
   * Get verification status from dashboard
   */
  async getVerificationStatus(): Promise<DashboardVerification> {
    const dashboard = await this.getDashboard();
    return dashboard.verification;
  }

  /**
   * Invalidate cache (call after profile updates, subscription changes, etc.)
   */
  invalidateCache(): void {
    this.cachedData = null;
    this.cacheExpiry = 0;
  }
}

export const dashboardService = new DashboardService();
