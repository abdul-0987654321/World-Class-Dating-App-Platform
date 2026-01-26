/**
 * Wellness Hook
 * React hook for managing wellness data, mood check-ins, and readiness assessments
 */

import { useState, useEffect, useCallback } from 'react';
import {
  wellnessService,
  WellnessDashboardData,
  WellnessMetrics,
  MoodCheckin,
  DatingSabbatical,
  ReadinessAssessment,
  RejectionEvent,
  RejectionRecovery,
} from '../services/wellness.service';

interface UseWellnessReturn {
  // Dashboard data
  dashboard: WellnessDashboardData | null;
  metrics: WellnessMetrics | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshDashboard: () => Promise<void>;
  recordMoodCheckin: (checkin: Omit<MoodCheckin, 'id' | 'timestamp'>) => Promise<MoodCheckin>;
  startSabbatical: (data: {
    reason: string;
    plannedDays: number;
    disableNotifications: boolean;
  }) => Promise<DatingSabbatical>;
  endSabbatical: (sabbaticalId: string) => Promise<void>;
  dismissAlert: (alertId: string) => Promise<void>;
  recordRejection: (event: RejectionEvent) => Promise<RejectionRecovery>;
}

export function useWellness(): UseWellnessReturn {
  const [dashboard, setDashboard] = useState<WellnessDashboardData | null>(null);
  const [metrics, setMetrics] = useState<WellnessMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await wellnessService.getDashboard();
      setDashboard(data);
      setMetrics(data.metrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wellness data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const recordMoodCheckin = useCallback(
    async (checkin: Omit<MoodCheckin, 'id' | 'timestamp'>) => {
      const result = await wellnessService.recordMoodCheckin(checkin);
      // Refresh dashboard to reflect new checkin
      await refreshDashboard();
      return result;
    },
    [refreshDashboard]
  );

  const startSabbatical = useCallback(
    async (data: { reason: string; plannedDays: number; disableNotifications: boolean }) => {
      const result = await wellnessService.startSabbatical(data);
      await refreshDashboard();
      return result;
    },
    [refreshDashboard]
  );

  const endSabbatical = useCallback(
    async (sabbaticalId: string) => {
      await wellnessService.endSabbatical(sabbaticalId);
      await refreshDashboard();
    },
    [refreshDashboard]
  );

  const dismissAlert = useCallback(
    async (alertId: string) => {
      await wellnessService.dismissAlert(alertId);
      // Update local state to reflect dismissal
      if (dashboard) {
        setDashboard({
          ...dashboard,
          alerts: dashboard.alerts.map((alert) =>
            alert.id === alertId ? { ...alert, dismissed: true } : alert
          ),
        });
      }
    },
    [dashboard]
  );

  const recordRejection = useCallback(async (event: RejectionEvent) => {
    return wellnessService.recordRejection(event);
  }, []);

  return {
    dashboard,
    metrics,
    isLoading,
    error,
    refreshDashboard,
    recordMoodCheckin,
    startSabbatical,
    endSabbatical,
    dismissAlert,
    recordRejection,
  };
}

// ============================================================================
// Readiness Assessment Hook
// ============================================================================

interface UseReadinessReturn {
  assessment: ReadinessAssessment | null;
  isLoading: boolean;
  error: string | null;
  submitAssessment: (answers: Record<string, unknown>) => Promise<ReadinessAssessment>;
  refreshAssessment: () => Promise<void>;
}

export function useReadiness(): UseReadinessReturn {
  const [assessment, setAssessment] = useState<ReadinessAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAssessment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await wellnessService.getLatestReadinessAssessment();
      setAssessment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load readiness assessment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAssessment();
  }, [refreshAssessment]);

  const submitAssessment = useCallback(async (answers: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const result = await wellnessService.submitReadinessAssessment(answers);
      setAssessment(result);
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    assessment,
    isLoading,
    error,
    submitAssessment,
    refreshAssessment,
  };
}

export default useWellness;
