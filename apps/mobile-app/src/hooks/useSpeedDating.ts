/**
 * useSpeedDating Hook
 * Manages speed dating events, registration, and queue management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  SpeedDatingEvent,
  SpeedDatingMatch,
  SpeedDatingQueueStatus,
  SpeedDatingEventsResponse,
  SpeedDatingMatchesResponse,
  SpeedDatingRegistrationResponse,
} from '../types/speedDating.types';

const API_BASE_URL = 'https://api.flamoral.com';

interface UseSpeedDatingOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseSpeedDatingReturn {
  // Data
  events: SpeedDatingEvent[];
  liveEvents: SpeedDatingEvent[];
  upcomingEvents: SpeedDatingEvent[];
  matches: SpeedDatingMatch[];
  queueStatus: SpeedDatingQueueStatus | null;

  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  loadEvents: () => Promise<void>;
  loadMatches: () => Promise<void>;
  refreshData: () => Promise<void>;
  registerForEvent: (eventId: string) => Promise<SpeedDatingRegistrationResponse>;
  unregisterFromEvent: (eventId: string) => Promise<boolean>;
  joinQueue: (eventId: string) => Promise<SpeedDatingQueueStatus>;
  leaveQueue: () => Promise<void>;
  joinLiveEvent: (eventId: string) => Promise<boolean>;
}

// Mock data for development
const getMockEvents = (): SpeedDatingEvent[] => [
  {
    id: '1',
    title: 'Friday Night Mixers',
    description: 'Meet new people in quick 5-minute video dates. Fun icebreakers included!',
    theme: 'General',
    date: new Date(Date.now() + 86400000).toISOString(),
    duration: 90,
    roundDuration: 5,
    maxParticipants: 50,
    currentParticipants: 38,
    ageRange: { min: 25, max: 35 },
    status: 'upcoming',
    isRegistered: true,
    price: 0,
    host: {
      name: 'Flamoral Team',
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100',
    },
  },
  {
    id: '2',
    title: 'Tech Professionals Meetup',
    description: 'Speed dating for tech enthusiasts. Find someone who speaks your language!',
    theme: 'Tech',
    date: new Date(Date.now() + 172800000).toISOString(),
    duration: 60,
    roundDuration: 4,
    maxParticipants: 30,
    currentParticipants: 22,
    ageRange: { min: 23, max: 40 },
    status: 'upcoming',
    isRegistered: false,
    price: 5,
    host: {
      name: 'TechConnect',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
    },
  },
  {
    id: '3',
    title: 'Foodies & Wine Lovers',
    description: 'Bond over your love for great food and wine. Virtual wine tasting included!',
    theme: 'Food & Wine',
    date: new Date(Date.now() + 259200000).toISOString(),
    duration: 75,
    roundDuration: 5,
    maxParticipants: 40,
    currentParticipants: 35,
    ageRange: { min: 28, max: 45 },
    status: 'upcoming',
    isRegistered: false,
    price: 10,
    host: {
      name: 'Wine Club NYC',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
    },
  },
  {
    id: '4',
    title: 'Live Now: Weekend Vibes',
    description: 'Jump into live speed dates happening right now!',
    theme: 'General',
    date: new Date().toISOString(),
    duration: 60,
    roundDuration: 4,
    maxParticipants: 40,
    currentParticipants: 32,
    ageRange: { min: 21, max: 35 },
    status: 'live',
    isRegistered: false,
    price: 0,
    host: {
      name: 'Flamoral Team',
      photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100',
    },
  },
];

const getMockMatches = (): SpeedDatingMatch[] => [
  {
    id: '1',
    eventId: 'e1',
    eventTitle: 'Friday Night Mixers',
    user: {
      id: 'u1',
      name: 'Emma',
      photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
      age: 28,
      bio: 'Adventure seeker & coffee lover',
    },
    matchedAt: new Date(Date.now() - 86400000).toISOString(),
    isMutual: true,
    hasMessaged: false,
  },
  {
    id: '2',
    eventId: 'e2',
    eventTitle: 'Tech Professionals Meetup',
    user: {
      id: 'u2',
      name: 'Sophie',
      photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      age: 26,
      bio: 'Art enthusiast, yoga practitioner',
    },
    matchedAt: new Date(Date.now() - 172800000).toISOString(),
    isMutual: true,
    hasMessaged: true,
    lastMessageAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const useSpeedDating = (options: UseSpeedDatingOptions = {}): UseSpeedDatingReturn => {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [events, setEvents] = useState<SpeedDatingEvent[]>([]);
  const [matches, setMatches] = useState<SpeedDatingMatch[]>([]);
  const [queueStatus, setQueueStatus] = useState<SpeedDatingQueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queuePollingRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Get auth token from storage
   */
  const getAuthToken = async (): Promise<string | null> => {
    return await AsyncStorage.getItem('accessToken');
  };

  /**
   * Make authenticated API request
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }

    return response.json();
  };

  /**
   * Load speed dating events
   */
  const loadEvents = useCallback(async () => {
    try {
      setError(null);

      // Try API first, fall back to mock data
      try {
        const data = await apiRequest<SpeedDatingEventsResponse>('/speed-dating/events');
        setEvents(data.events || []);
      } catch {
        // Use mock data in development
        setEvents(getMockEvents());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load events';
      setError(message);
      console.error('Error loading speed dating events:', err);
    }
  }, []);

  /**
   * Load speed dating matches
   */
  const loadMatches = useCallback(async () => {
    try {
      // Try API first, fall back to mock data
      try {
        const data = await apiRequest<SpeedDatingMatchesResponse>('/speed-dating/matches');
        setMatches(data.matches || []);
      } catch {
        // Use mock data in development
        setMatches(getMockMatches());
      }
    } catch (err) {
      console.error('Error loading speed dating matches:', err);
    }
  }, []);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadEvents(), loadMatches()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [loadEvents, loadMatches]);

  /**
   * Register for an event
   */
  const registerForEvent = useCallback(
    async (eventId: string): Promise<SpeedDatingRegistrationResponse> => {
      try {
        // Try API first
        try {
          const response = await apiRequest<SpeedDatingRegistrationResponse>(
            '/speed-dating/events/register',
            'POST',
            { eventId }
          );

          // Update local state
          setEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? { ...e, isRegistered: true, currentParticipants: e.currentParticipants + 1 }
                : e
            )
          );

          return response;
        } catch {
          // Mock registration for development
          setEvents((prev) =>
            prev.map((e) =>
              e.id === eventId
                ? { ...e, isRegistered: true, currentParticipants: e.currentParticipants + 1 }
                : e
            )
          );

          return {
            success: true,
            eventId,
            registrationId: `reg_${Date.now()}`,
            message: 'Successfully registered for event',
          };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to register';
        throw new Error(message);
      }
    },
    []
  );

  /**
   * Unregister from an event
   */
  const unregisterFromEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      try {
        await apiRequest('/speed-dating/events/unregister', 'POST', { eventId });
      } catch {
        // Mock unregistration for development
      }

      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? {
                ...e,
                isRegistered: false,
                currentParticipants: Math.max(0, e.currentParticipants - 1),
              }
            : e
        )
      );

      return true;
    } catch (err) {
      console.error('Error unregistering from event:', err);
      return false;
    }
  }, []);

  /**
   * Join the matching queue for an event
   */
  const joinQueue = useCallback(async (eventId: string): Promise<SpeedDatingQueueStatus> => {
    try {
      // Try API first
      try {
        const status = await apiRequest<SpeedDatingQueueStatus>(
          '/speed-dating/queue/join',
          'POST',
          { eventId }
        );
        setQueueStatus(status);

        // Start polling for queue updates
        startQueuePolling(eventId);

        return status;
      } catch {
        // Mock queue status for development
        const mockStatus: SpeedDatingQueueStatus = {
          position: 3,
          totalInQueue: 12,
          estimatedWaitTime: 45,
          isMatching: false,
        };
        setQueueStatus(mockStatus);
        return mockStatus;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join queue';
      throw new Error(message);
    }
  }, []);

  /**
   * Leave the matching queue
   */
  const leaveQueue = useCallback(async () => {
    try {
      try {
        await apiRequest('/speed-dating/queue/leave', 'POST');
      } catch {
        // Mock leave queue for development
      }

      setQueueStatus(null);
      stopQueuePolling();
    } catch (err) {
      console.error('Error leaving queue:', err);
    }
  }, []);

  /**
   * Join a live event
   */
  const joinLiveEvent = useCallback(async (eventId: string): Promise<boolean> => {
    try {
      try {
        await apiRequest('/speed-dating/events/join-live', 'POST', { eventId });
      } catch {
        // Mock join for development
      }
      return true;
    } catch (err) {
      console.error('Error joining live event:', err);
      return false;
    }
  }, []);

  /**
   * Start polling for queue updates
   */
  const startQueuePolling = (eventId: string) => {
    stopQueuePolling();

    queuePollingRef.current = setInterval(async () => {
      try {
        const status = await apiRequest<SpeedDatingQueueStatus>(
          `/speed-dating/queue/status?eventId=${eventId}`
        );
        setQueueStatus(status);

        // Stop polling if matched
        if (status.isMatching) {
          stopQueuePolling();
        }
      } catch {
        // Continue polling on error
      }
    }, 5000);
  };

  /**
   * Stop polling for queue updates
   */
  const stopQueuePolling = () => {
    if (queuePollingRef.current) {
      clearInterval(queuePollingRef.current);
      queuePollingRef.current = null;
    }
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadEvents(), loadMatches()]);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [loadEvents, loadMatches]);

  // Auto-refresh timer
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshTimerRef.current = setInterval(() => {
        refreshData();
      }, refreshInterval);
    }

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
      stopQueuePolling();
    };
  }, [autoRefresh, refreshInterval, refreshData]);

  // Computed values
  const liveEvents = events.filter((e) => e.status === 'live');
  const upcomingEvents = events.filter((e) => e.status === 'upcoming');

  return {
    events,
    liveEvents,
    upcomingEvents,
    matches,
    queueStatus,
    isLoading,
    isRefreshing,
    error,
    loadEvents,
    loadMatches,
    refreshData,
    registerForEvent,
    unregisterFromEvent,
    joinQueue,
    leaveQueue,
    joinLiveEvent,
  };
};
