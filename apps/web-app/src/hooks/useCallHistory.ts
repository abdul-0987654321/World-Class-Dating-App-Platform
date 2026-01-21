/**
 * useCallHistory Hook
 * React hook for managing call history state and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CallHistoryItem } from '../components/VideoCall/CallHistory';
import {
  callHistoryService,
  CallHistoryFilters,
  CallHistoryResponse,
} from '../services/call-history.service';

interface UseCallHistoryOptions {
  autoLoad?: boolean;
  pageSize?: number;
  initialFilter?: 'all' | 'missed' | 'video' | 'audio';
}

interface UseCallHistoryReturn {
  // Data
  calls: CallHistoryItem[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCalls: number;
  unseenMissedCount: number;

  // Actions
  loadCalls: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  deleteCall: (callId: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  markMissedCallsSeen: () => Promise<void>;
  refresh: () => Promise<void>;
  setFilter: (filter: 'all' | 'missed' | 'video' | 'audio') => void;

  // Filter state
  currentFilter: 'all' | 'missed' | 'video' | 'audio';
}

export function useCallHistory(options: UseCallHistoryOptions = {}): UseCallHistoryReturn {
  const { autoLoad = true, pageSize = 20, initialFilter = 'all' } = options;

  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCalls, setTotalCalls] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentFilter, setCurrentFilter] = useState<'all' | 'missed' | 'video' | 'audio'>(
    initialFilter
  );
  const [unseenMissedCount, setUnseenMissedCount] = useState(0);

  const isLoadingRef = useRef(false);

  // Build filters based on current state
  const buildFilters = useCallback((): CallHistoryFilters => {
    const filters: CallHistoryFilters = {
      page: currentPage,
      limit: pageSize,
    };

    switch (currentFilter) {
      case 'missed':
        filters.status = 'missed';
        break;
      case 'video':
        filters.callType = 'video';
        break;
      case 'audio':
        filters.callType = 'audio';
        break;
      default:
        // 'all' - no additional filters
        break;
    }

    return filters;
  }, [currentPage, pageSize, currentFilter]);

  // Load calls
  const loadCalls = useCallback(
    async (reset = false) => {
      if (isLoadingRef.current) return;

      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      try {
        const page = reset ? 1 : currentPage;
        const filters = { ...buildFilters(), page };

        const response: CallHistoryResponse = await callHistoryService.getCallHistory(filters);

        if (reset) {
          setCalls(response.calls);
          setCurrentPage(1);
        } else {
          setCalls((prev) => [...prev, ...response.calls]);
        }

        setTotalCalls(response.total);
        setHasMore(response.hasMore);

        if (!reset && response.hasMore) {
          setCurrentPage((prev) => prev + 1);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load call history';
        setError(message);
        console.error('Error loading call history:', err);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [buildFilters, currentPage]
  );

  // Load more (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    setCurrentPage((prev) => prev + 1);
  }, [hasMore, isLoading]);

  // Effect to load when page changes
  useEffect(() => {
    if (currentPage > 1) {
      loadCalls(false);
    }
  }, [currentPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete a call
  const deleteCall = useCallback(async (callId: string) => {
    try {
      await callHistoryService.deleteCall(callId);
      setCalls((prev) => prev.filter((call) => call.callId !== callId));
      setTotalCalls((prev) => prev - 1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete call';
      setError(message);
      throw err;
    }
  }, []);

  // Clear all history
  const clearHistory = useCallback(async () => {
    try {
      await callHistoryService.clearHistory();
      setCalls([]);
      setTotalCalls(0);
      setHasMore(false);
      setCurrentPage(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear history';
      setError(message);
      throw err;
    }
  }, []);

  // Mark missed calls as seen
  const markMissedCallsSeen = useCallback(async () => {
    try {
      await callHistoryService.markMissedCallsSeen();
      setUnseenMissedCount(0);
    } catch (err) {
      console.error('Error marking calls as seen:', err);
    }
  }, []);

  // Refresh call history
  const refresh = useCallback(async () => {
    setCurrentPage(1);
    await loadCalls(true);
    // Also refresh unseen count
    try {
      const count = await callHistoryService.getUnseenMissedCallsCount();
      setUnseenMissedCount(count);
    } catch (err) {
      console.error('Error fetching unseen count:', err);
    }
  }, [loadCalls]);

  // Set filter and reload
  const setFilter = useCallback(
    (filter: 'all' | 'missed' | 'video' | 'audio') => {
      if (filter === currentFilter) return;
      setCurrentFilter(filter);
      setCalls([]);
      setCurrentPage(1);
      setHasMore(true);
    },
    [currentFilter]
  );

  // Effect to reload when filter changes
  useEffect(() => {
    loadCalls(true);
  }, [currentFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    if (autoLoad) {
      loadCalls(true);

      // Also load unseen count
      callHistoryService
        .getUnseenMissedCallsCount()
        .then((count) => setUnseenMissedCount(count))
        .catch((err) => console.error('Error fetching unseen count:', err));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    calls,
    isLoading,
    error,
    hasMore,
    totalCalls,
    unseenMissedCount,
    loadCalls,
    loadMore,
    deleteCall,
    clearHistory,
    markMissedCallsSeen,
    refresh,
    setFilter,
    currentFilter,
  };
}

export default useCallHistory;
