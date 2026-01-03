/**
 * Curated Picks Service
 * Handles daily curated picks API interactions
 */

export interface CuratedPickProfile {
  userId: string;
  displayName: string;
  age: number;
  city?: string;
  photos: string[];
  bio?: string;
  interests: string[];
  verified: boolean;
  compatibilityScore: number;
}

export interface CuratedPick {
  pickId: string;
  userId: string;
  score: number;
  reasons: string[];
  category: 'top_pick' | 'high_compatibility' | 'new_user' | 'recently_active' | 'mutual_interest';
  profile: CuratedPickProfile;
}

export interface CuratedPicksResponse {
  picks: CuratedPick[];
  generatedAt: string;
  expiresAt: string;
  remainingPicks: number;
  tier: string;
}

class CuratedPicksService {
  private baseUrl = '/api/v1/discovery/curated-picks';

  /**
   * Get today's curated picks
   */
  async getDailyPicks(): Promise<CuratedPicksResponse> {
    // In mock mode, return mock data
    if (!import.meta.env.VITE_API_URL) {
      return this.getMockPicks();
    }

    const response = await fetch(this.baseUrl, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch curated picks');
    }

    const json = await response.json();
    const data = json.data || json;

    return {
      picks: data.picks || [],
      generatedAt: data.generated_at,
      expiresAt: data.expires_at,
      remainingPicks: data.remaining_picks,
      tier: data.tier,
    };
  }

  /**
   * Mark a pick as viewed
   */
  async markViewed(pickId: string): Promise<void> {
    if (!import.meta.env.VITE_API_URL) return;

    await fetch(`${this.baseUrl}/${pickId}/view`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Mark a pick as acted upon (liked/passed)
   */
  async markActedUpon(pickId: string): Promise<void> {
    if (!import.meta.env.VITE_API_URL) return;

    await fetch(`${this.baseUrl}/${pickId}/action`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Regenerate picks (premium only)
   */
  async regeneratePicks(): Promise<CuratedPicksResponse> {
    if (!import.meta.env.VITE_API_URL) {
      return this.getMockPicks();
    }

    const response = await fetch(`${this.baseUrl}/regenerate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error('Regenerating picks requires Premium subscription');
      }
      throw new Error('Failed to regenerate picks');
    }

    const json = await response.json();
    const data = json.data || json;

    return {
      picks: data.picks || [],
      generatedAt: data.generated_at,
      expiresAt: data.expires_at,
      remainingPicks: data.remaining_picks,
      tier: data.tier,
    };
  }

  /**
   * Mock data for development
   */
  private getMockPicks(): CuratedPicksResponse {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return {
      picks: [
        {
          pickId: 'pick-1',
          userId: 'user-1',
          score: 92,
          reasons: ['Highly compatible', '5 shared interests', 'Lives nearby'],
          category: 'top_pick',
          profile: {
            userId: 'user-1',
            displayName: 'Sarah',
            age: 28,
            city: 'San Francisco',
            photos: ['https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400'],
            bio: 'Coffee enthusiast, book lover, and weekend hiker.',
            interests: ['Hiking', 'Reading', 'Coffee', 'Travel', 'Photography'],
            verified: true,
            compatibilityScore: 92,
          },
        },
        {
          pickId: 'pick-2',
          userId: 'user-2',
          score: 88,
          reasons: ['New to the app', 'Similar lifestyle', 'Active user'],
          category: 'new_user',
          profile: {
            userId: 'user-2',
            displayName: 'Emma',
            age: 26,
            city: 'Los Angeles',
            photos: ['https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400'],
            bio: 'Dog mom. Yoga instructor. Love trying new restaurants.',
            interests: ['Yoga', 'Fitness', 'Foodie', 'Dogs', 'Travel'],
            verified: true,
            compatibilityScore: 88,
          },
        },
        {
          pickId: 'pick-3',
          userId: 'user-3',
          score: 85,
          reasons: ['Online now', 'Quick responder', '4 shared interests'],
          category: 'recently_active',
          profile: {
            userId: 'user-3',
            displayName: 'Olivia',
            age: 30,
            city: 'New York',
            photos: ['https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400'],
            bio: 'NYC artist looking for someone to explore galleries with.',
            interests: ['Art', 'Museums', 'Wine', 'Music', 'Dancing'],
            verified: false,
            compatibilityScore: 85,
          },
        },
        {
          pickId: 'pick-4',
          userId: 'user-4',
          score: 83,
          reasons: ['6 common interests', 'Same relationship goals'],
          category: 'mutual_interest',
          profile: {
            userId: 'user-4',
            displayName: 'Sophia',
            age: 27,
            city: 'Seattle',
            photos: ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400'],
            bio: 'Software engineer by day, amateur chef by night.',
            interests: ['Cooking', 'Tech', 'Gaming', 'Hiking', 'Movies', 'Reading'],
            verified: true,
            compatibilityScore: 83,
          },
        },
        {
          pickId: 'pick-5',
          userId: 'user-5',
          score: 81,
          reasons: ['High compatibility', 'Similar age range'],
          category: 'high_compatibility',
          profile: {
            userId: 'user-5',
            displayName: 'Mia',
            age: 29,
            city: 'Chicago',
            photos: ['https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400'],
            bio: 'Marketing professional. Love live music and brunch.',
            interests: ['Music', 'Brunch', 'Fashion', 'Travel', 'Photography'],
            verified: true,
            compatibilityScore: 81,
          },
        },
      ],
      generatedAt: now.toISOString(),
      expiresAt: tomorrow.toISOString(),
      remainingPicks: 5,
      tier: 'plus',
    };
  }
}

export const curatedPicksService = new CuratedPicksService();
