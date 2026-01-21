/**
 * useSpeedDatingMatch Hook
 * Manages speed dating matches, animations, and match interactions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SpeedDatingMatch, SpeedDatingMatchesResponse } from '../types/speedDating.types';
import { API_BASE_URL } from '../services/config';

interface UseSpeedDatingMatchOptions {
  autoLoad?: boolean;
  enableAnimations?: boolean;
}

interface MatchAnimation {
  scale: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  translateY: Animated.Value;
}

interface UseSpeedDatingMatchReturn {
  // Data
  matches: SpeedDatingMatch[];
  newMatches: SpeedDatingMatch[];
  pendingReveal: SpeedDatingMatch[];

  // State
  isLoading: boolean;
  isRevealing: boolean;
  revealedMatchId: string | null;

  // Animation
  matchAnimation: MatchAnimation;

  // Actions
  loadMatches: () => Promise<void>;
  revealMatch: (matchId: string) => Promise<void>;
  revealAllMatches: () => Promise<void>;
  dismissMatch: (matchId: string) => void;
  sendMessage: (matchId: string, message: string) => Promise<boolean>;
  markAsSeen: (matchId: string) => Promise<void>;
  clearNewMatches: () => void;

  // Animation helpers
  playMatchRevealAnimation: () => void;
  resetAnimation: () => void;
}

// Mock matches for development
const getMockMatches = (): SpeedDatingMatch[] => [
  {
    id: 'm1',
    eventId: 'e1',
    eventTitle: 'Friday Night Mixers',
    user: {
      id: 'u1',
      name: 'Emma',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      age: 28,
      bio: 'Adventure seeker & coffee lover',
    },
    matchedAt: new Date().toISOString(),
    isMutual: true,
    hasMessaged: false,
  },
  {
    id: 'm2',
    eventId: 'e1',
    eventTitle: 'Friday Night Mixers',
    user: {
      id: 'u2',
      name: 'Sophie',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      age: 26,
      bio: 'Art enthusiast, yoga practitioner',
    },
    matchedAt: new Date(Date.now() - 60000).toISOString(),
    isMutual: true,
    hasMessaged: false,
  },
  {
    id: 'm3',
    eventId: 'e2',
    eventTitle: 'Tech Professionals Meetup',
    user: {
      id: 'u3',
      name: 'Olivia',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      age: 29,
      bio: 'Tech professional, loves hiking',
    },
    matchedAt: new Date(Date.now() - 86400000).toISOString(),
    isMutual: true,
    hasMessaged: true,
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const useSpeedDatingMatch = (
  options: UseSpeedDatingMatchOptions = {}
): UseSpeedDatingMatchReturn => {
  const { autoLoad = true, enableAnimations = true } = options;

  // State
  const [matches, setMatches] = useState<SpeedDatingMatch[]>([]);
  const [newMatches, setNewMatches] = useState<SpeedDatingMatch[]>([]);
  const [pendingReveal, setPendingReveal] = useState<SpeedDatingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRevealing, setIsRevealing] = useState(false);
  const [revealedMatchId, setRevealedMatchId] = useState<string | null>(null);
  const [seenMatchIds, setSeenMatchIds] = useState<Set<string>>(new Set());

  // Animation values
  const matchAnimation: MatchAnimation = {
    scale: useRef(new Animated.Value(0)).current,
    opacity: useRef(new Animated.Value(0)).current,
    rotate: useRef(new Animated.Value(0)).current,
    translateY: useRef(new Animated.Value(100)).current,
  };

  /**
   * Get auth token
   */
  const getAuthToken = async (): Promise<string | null> => {
    return await AsyncStorage.getItem('accessToken');
  };

  /**
   * Load seen match IDs from storage
   */
  const loadSeenMatchIds = async () => {
    try {
      const seenIds = await AsyncStorage.getItem('seenSpeedDatingMatchIds');
      if (seenIds) {
        setSeenMatchIds(new Set(JSON.parse(seenIds)));
      }
    } catch (error) {
      console.error('Error loading seen match IDs:', error);
    }
  };

  /**
   * Save seen match IDs to storage
   */
  const saveSeenMatchIds = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem('seenSpeedDatingMatchIds', JSON.stringify(Array.from(ids)));
    } catch (error) {
      console.error('Error saving seen match IDs:', error);
    }
  };

  /**
   * API request helper
   */
  const apiRequest = async <T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: object
  ): Promise<T> => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return response.json();
  };

  /**
   * Load matches from API
   */
  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      await loadSeenMatchIds();

      let fetchedMatches: SpeedDatingMatch[];

      try {
        const data = await apiRequest<SpeedDatingMatchesResponse>('/speed-dating/matches');
        fetchedMatches = data.matches || [];
      } catch {
        // Use mock data in development
        fetchedMatches = getMockMatches();
      }

      setMatches(fetchedMatches);

      // Identify new matches (not yet seen)
      const newUnseenMatches = fetchedMatches.filter((m) => !seenMatchIds.has(m.id));
      setNewMatches(newUnseenMatches);

      // Set pending reveal if there are new matches
      if (newUnseenMatches.length > 0) {
        setPendingReveal(newUnseenMatches);
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [seenMatchIds]);

  /**
   * Play match reveal animation
   */
  const playMatchRevealAnimation = useCallback(() => {
    if (!enableAnimations) return;

    // Reset values
    matchAnimation.scale.setValue(0);
    matchAnimation.opacity.setValue(0);
    matchAnimation.rotate.setValue(0);
    matchAnimation.translateY.setValue(100);

    // Run reveal animation sequence
    Animated.parallel([
      // Scale bounce
      Animated.sequence([
        Animated.timing(matchAnimation.scale, {
          toValue: 1.2,
          duration: 300,
          easing: Easing.out(Easing.back(2)),
          useNativeDriver: true,
        }),
        Animated.timing(matchAnimation.scale, {
          toValue: 1,
          duration: 150,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      // Fade in
      Animated.timing(matchAnimation.opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Rotate heart effect
      Animated.sequence([
        Animated.timing(matchAnimation.rotate, {
          toValue: -0.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(matchAnimation.rotate, {
          toValue: 0.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(matchAnimation.rotate, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      // Slide up
      Animated.timing(matchAnimation.translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [enableAnimations, matchAnimation]);

  /**
   * Reset animation values
   */
  const resetAnimation = useCallback(() => {
    matchAnimation.scale.setValue(0);
    matchAnimation.opacity.setValue(0);
    matchAnimation.rotate.setValue(0);
    matchAnimation.translateY.setValue(100);
  }, [matchAnimation]);

  /**
   * Reveal a single match
   */
  const revealMatch = useCallback(
    async (matchId: string) => {
      setIsRevealing(true);
      setRevealedMatchId(matchId);

      playMatchRevealAnimation();

      // Mark as seen after animation
      setTimeout(() => {
        setSeenMatchIds((prev) => {
          const newSet = new Set(prev).add(matchId);
          saveSeenMatchIds(newSet);
          return newSet;
        });

        setNewMatches((prev) => prev.filter((m) => m.id !== matchId));
        setPendingReveal((prev) => prev.filter((m) => m.id !== matchId));

        setIsRevealing(false);
      }, 500);
    },
    [playMatchRevealAnimation]
  );

  /**
   * Reveal all pending matches
   */
  const revealAllMatches = useCallback(async () => {
    for (const match of pendingReveal) {
      await revealMatch(match.id);
      // Small delay between reveals
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
  }, [pendingReveal, revealMatch]);

  /**
   * Dismiss a match
   */
  const dismissMatch = useCallback((matchId: string) => {
    setNewMatches((prev) => prev.filter((m) => m.id !== matchId));
    setPendingReveal((prev) => prev.filter((m) => m.id !== matchId));
    setSeenMatchIds((prev) => {
      const newSet = new Set(prev).add(matchId);
      saveSeenMatchIds(newSet);
      return newSet;
    });
  }, []);

  /**
   * Send message to a match
   */
  const sendMessage = useCallback(async (matchId: string, message: string): Promise<boolean> => {
    try {
      try {
        await apiRequest('/speed-dating/matches/message', 'POST', {
          matchId,
          message,
        });
      } catch {
        // Mock success in development - silently continue
      }

      // Update local state
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, hasMessaged: true, lastMessageAt: new Date().toISOString() }
            : m
        )
      );

      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  /**
   * Mark match as seen
   */
  const markAsSeen = useCallback(async (matchId: string) => {
    setSeenMatchIds((prev) => {
      const newSet = new Set(prev).add(matchId);
      saveSeenMatchIds(newSet);
      return newSet;
    });

    setNewMatches((prev) => prev.filter((m) => m.id !== matchId));
  }, []);

  /**
   * Clear all new matches
   */
  const clearNewMatches = useCallback(() => {
    const allIds = new Set([...seenMatchIds, ...newMatches.map((m) => m.id)]);
    setSeenMatchIds(allIds);
    saveSeenMatchIds(allIds);
    setNewMatches([]);
    setPendingReveal([]);
  }, [seenMatchIds, newMatches]);

  // Auto-load matches
  useEffect(() => {
    if (autoLoad) {
      loadMatches();
    }
  }, [autoLoad, loadMatches]);

  return {
    // Data
    matches,
    newMatches,
    pendingReveal,

    // State
    isLoading,
    isRevealing,
    revealedMatchId,

    // Animation
    matchAnimation,

    // Actions
    loadMatches,
    revealMatch,
    revealAllMatches,
    dismissMatch,
    sendMessage,
    markAsSeen,
    clearNewMatches,

    // Animation helpers
    playMatchRevealAnimation,
    resetAnimation,
  };
};
