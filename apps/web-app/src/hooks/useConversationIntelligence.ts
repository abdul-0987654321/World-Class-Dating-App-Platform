/**
 * Conversation Intelligence Hook
 * React hook for managing connection scores, ghost prevention, and intent signaling
 */

import { useState, useEffect, useCallback } from 'react';
import {
  conversationIntelligenceService,
  ConnectionScore,
  ConversationAnalysis,
  ConversationSuggestion,
  GhostRiskAssessment,
  GracefulExitRequest,
  GracefulExitResponse,
  UserIntent,
  IntentMatch,
  IntentOption,
  AggregatedFeedback,
} from '../services/conversation-intelligence.service';

// ============================================================================
// Connection Score Hook
// ============================================================================

interface UseConnectionScoreReturn {
  score: ConnectionScore | null;
  analysis: ConversationAnalysis | null;
  suggestions: ConversationSuggestion[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  dismissSuggestion: (suggestionId: string) => Promise<void>;
}

export function useConnectionScore(conversationId: string): UseConnectionScoreReturn {
  const [score, setScore] = useState<ConnectionScore | null>(null);
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [suggestions, setSuggestions] = useState<ConversationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsLoading(true);
      setError(null);

      const [scoreData, analysisData, suggestionsData] = await Promise.all([
        conversationIntelligenceService.getConnectionScore(conversationId),
        conversationIntelligenceService.getConversationAnalysis(conversationId),
        conversationIntelligenceService.getSuggestions(conversationId),
      ]);

      setScore(scoreData);
      setAnalysis(analysisData);
      setSuggestions(suggestionsData.filter((s) => !s.dismissed));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connection data');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const dismissSuggestion = useCallback(async (suggestionId: string) => {
    await conversationIntelligenceService.dismissSuggestion(suggestionId);
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
  }, []);

  return {
    score,
    analysis,
    suggestions,
    isLoading,
    error,
    refresh,
    dismissSuggestion,
  };
}

// ============================================================================
// Ghost Prevention Hook
// ============================================================================

interface UseGhostPreventionReturn {
  riskAssessment: GhostRiskAssessment | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  initiateGracefulExit: (request: GracefulExitRequest) => Promise<GracefulExitResponse>;
}

export function useGhostPrevention(conversationId: string): UseGhostPreventionReturn {
  const [riskAssessment, setRiskAssessment] = useState<GhostRiskAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!conversationId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await conversationIntelligenceService.assessGhostRisk(conversationId);
      setRiskAssessment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assess ghost risk');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const initiateGracefulExit = useCallback(
    async (request: GracefulExitRequest) => {
      return conversationIntelligenceService.initiateGracefulExit(conversationId, request);
    },
    [conversationId]
  );

  return {
    riskAssessment,
    isLoading,
    error,
    refresh,
    initiateGracefulExit,
  };
}

// ============================================================================
// Intent Signaling Hook
// ============================================================================

interface UseIntentReturn {
  intent: UserIntent | null;
  intentOptions: IntentOption[];
  isLoading: boolean;
  error: string | null;
  updateIntent: (data: {
    conversationId?: string;
    intent: UserIntent['intent'];
    availableTimeframe?: string;
    preferredDateTypes?: string[];
    notes?: string;
  }) => Promise<UserIntent>;
  checkMatch: (conversationId: string, otherUserId: string) => Promise<IntentMatch>;
  refresh: () => Promise<void>;
}

export function useIntent(conversationId?: string): UseIntentReturn {
  const [intent, setIntent] = useState<UserIntent | null>(null);
  const [intentOptions, setIntentOptions] = useState<IntentOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [intentData, optionsData] = await Promise.all([
        conversationIntelligenceService.getIntent(conversationId),
        conversationIntelligenceService.getIntentOptions(),
      ]);

      setIntent(intentData);
      setIntentOptions(optionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load intent data');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateIntent = useCallback(
    async (data: {
      conversationId?: string;
      intent: UserIntent['intent'];
      availableTimeframe?: string;
      preferredDateTypes?: string[];
      notes?: string;
    }) => {
      const result = await conversationIntelligenceService.updateIntent(data);
      setIntent(result);
      return result;
    },
    []
  );

  const checkMatch = useCallback(async (convId: string, otherUserId: string) => {
    return conversationIntelligenceService.checkIntentMatch(convId, otherUserId);
  }, []);

  return {
    intent,
    intentOptions,
    isLoading,
    error,
    updateIntent,
    checkMatch,
    refresh,
  };
}

// ============================================================================
// Aggregated Feedback Hook
// ============================================================================

interface UseFeedbackReturn {
  feedback: AggregatedFeedback | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFeedback(): UseFeedbackReturn {
  const [feedback, setFeedback] = useState<AggregatedFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await conversationIntelligenceService.getAggregatedFeedback();
      setFeedback(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feedback');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    feedback,
    isLoading,
    error,
    refresh,
  };
}

export default useConnectionScore;
