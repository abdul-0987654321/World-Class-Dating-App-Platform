import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_PROFILES_KEY = '@flamoral:cached_profiles';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedProfile {
  id: string;
  data: any;
  cachedAt: number;
  expiresAt: number;
}

class ProfileCache {
  private cache: Map<string, CachedProfile> = new Map();

  async initialize(): Promise<void> {
    try {
      const storedCache = await AsyncStorage.getItem(CACHED_PROFILES_KEY);
      if (storedCache) {
        const parsed: CachedProfile[] = JSON.parse(storedCache);
        const now = Date.now();

        // Only load non-expired profiles
        parsed.forEach((profile) => {
          if (profile.expiresAt > now) {
            this.cache.set(profile.id, profile);
          }
        });
      }
    } catch (error) {
      console.error('Failed to initialize profile cache:', error);
    }
  }

  async cacheProfile(id: string, data: any): Promise<void> {
    const now = Date.now();
    const cachedProfile: CachedProfile = {
      id,
      data,
      cachedAt: now,
      expiresAt: now + CACHE_EXPIRY_MS,
    };

    this.cache.set(id, cachedProfile);
    await this.persist();
  }

  async getCachedProfile(id: string): Promise<any | null> {
    const cached = this.cache.get(id);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      this.cache.delete(id);
      await this.persist();
      return null;
    }

    return cached.data;
  }

  async cacheMultipleProfiles(profiles: { id: string; data: any }[]): Promise<void> {
    const now = Date.now();

    profiles.forEach(({ id, data }) => {
      this.cache.set(id, {
        id,
        data,
        cachedAt: now,
        expiresAt: now + CACHE_EXPIRY_MS,
      });
    });

    await this.persist();
  }

  async removeProfile(id: string): Promise<void> {
    this.cache.delete(id);
    await this.persist();
  }

  async clearExpired(): Promise<void> {
    const now = Date.now();
    let hasExpired = false;

    this.cache.forEach((profile, id) => {
      if (profile.expiresAt < now) {
        this.cache.delete(id);
        hasExpired = true;
      }
    });

    if (hasExpired) {
      await this.persist();
    }
  }

  async clearAll(): Promise<void> {
    this.cache.clear();
    await AsyncStorage.removeItem(CACHED_PROFILES_KEY);
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private async persist(): Promise<void> {
    try {
      const cacheArray = Array.from(this.cache.values());
      await AsyncStorage.setItem(CACHED_PROFILES_KEY, JSON.stringify(cacheArray));
    } catch (error) {
      console.error('Failed to persist profile cache:', error);
    }
  }

  async getCacheStats(): Promise<{
    total: number;
    expired: number;
    active: number;
  }> {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    this.cache.forEach((profile) => {
      if (profile.expiresAt < now) {
        expired++;
      } else {
        active++;
      }
    });

    return {
      total: this.cache.size,
      expired,
      active,
    };
  }
}

export default new ProfileCache();
