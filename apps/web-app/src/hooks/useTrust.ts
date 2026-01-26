/**
 * Trust Hooks
 * React hooks for trust scores, ratings, and endorsements
 */

import { useState, useEffect, useCallback } from 'react';
import {
  trustService,
  TrustScore,
  TrustProfile,
  UserRating,
  RatingStats,
  Endorsement,
  RatingCategory,
  EndorsementType,
} from '../services/trust.service';

// ============================================================================
// Trust Score Hook
// ============================================================================

interface UseTrustScoreReturn {
  trustScore: TrustScore | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTrustScore(): UseTrustScoreReturn {
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await trustService.getMyTrustScore();
      setTrustScore(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trust score');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    trustScore,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Trust Profile Hook
// ============================================================================

interface UseTrustProfileReturn {
  profile: TrustProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useTrustProfile(userId: string): UseTrustProfileReturn {
  const [profile, setProfile] = useState<TrustProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await trustService.getTrustProfile(userId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trust profile');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    profile,
    isLoading,
    error,
    refresh,
  };
}

// ============================================================================
// Ratings Hook
// ============================================================================

interface UseRatingsReturn {
  ratings: UserRating[];
  stats: RatingStats | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submitRating: (data: {
    toUserId: string;
    conversationId?: string;
    rating: 1 | 2 | 3 | 4 | 5;
    categories: RatingCategory[];
    comment?: string;
    isAnonymous?: boolean;
  }) => Promise<UserRating>;
}

export function useRatings(targetUserId?: string): UseRatingsReturn {
  const [ratings, setRatings] = useState<UserRating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [ratingsData, statsData] = await Promise.all([
        trustService.getMyRatings(),
        targetUserId ? trustService.getRatingStats(targetUserId) : Promise.resolve(null),
      ]);

      setRatings(ratingsData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ratings');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submitRating = useCallback(
    async (data: {
      toUserId: string;
      conversationId?: string;
      rating: 1 | 2 | 3 | 4 | 5;
      categories: RatingCategory[];
      comment?: string;
      isAnonymous?: boolean;
    }) => {
      const rating = await trustService.submitRating(data);
      await refresh();
      return rating;
    },
    [refresh]
  );

  return {
    ratings,
    stats,
    isLoading,
    error,
    refresh,
    submitRating,
  };
}

// ============================================================================
// Endorsements Hook
// ============================================================================

interface UseEndorsementsReturn {
  endorsements: Endorsement[];
  counts: Record<EndorsementType, number> | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  giveEndorsement: (data: {
    toUserId: string;
    type: EndorsementType;
    message?: string;
  }) => Promise<Endorsement>;
}

export function useEndorsements(targetUserId?: string): UseEndorsementsReturn {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [counts, setCounts] = useState<Record<EndorsementType, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [endorsementsData, countsData] = await Promise.all([
        trustService.getMyEndorsements(),
        targetUserId ? trustService.getEndorsementCounts(targetUserId) : Promise.resolve(null),
      ]);

      setEndorsements(endorsementsData);
      setCounts(countsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load endorsements');
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const giveEndorsement = useCallback(
    async (data: { toUserId: string; type: EndorsementType; message?: string }) => {
      const endorsement = await trustService.giveEndorsement(data);
      await refresh();
      return endorsement;
    },
    [refresh]
  );

  return {
    endorsements,
    counts,
    isLoading,
    error,
    refresh,
    giveEndorsement,
  };
}

export default useTrustScore;
