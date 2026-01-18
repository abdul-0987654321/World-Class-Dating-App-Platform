/**
 * AI Dating Coach Hook
 * Provides easy access to AI coaching features with loading states and caching
 */

import { useState, useCallback } from 'react';
import { coachService } from '../services';
import type {
  IcebreakerRequest,
  IcebreakerResponse,
  ResponseSuggestionRequest,
  ResponseSuggestionResponse,
  ProfileTipRequest,
  ProfileTipResponse,
  DateIdeaRequest,
  DateIdeaResponse,
  UsageResponse,
} from '../services';

interface UseCoachState {
  loading: boolean;
  error: string | null;
  remainingUses: number | null;
}

interface UseCoachReturn extends UseCoachState {
  // Icebreakers
  generateIcebreakers: (request: IcebreakerRequest) => Promise<IcebreakerResponse | null>;
  icebreakerSuggestions: string[];

  // Response suggestions
  generateResponses: (request: ResponseSuggestionRequest) => Promise<ResponseSuggestionResponse | null>;
  responseSuggestions: string[];

  // Profile tips
  getProfileTips: (request: ProfileTipRequest) => Promise<ProfileTipResponse | null>;
  profileTips: ProfileTipResponse | null;

  // Date ideas
  generateDateIdeas: (request: DateIdeaRequest) => Promise<DateIdeaResponse | null>;
  dateIdeas: DateIdeaResponse | null;

  // Usage tracking
  checkUsage: () => Promise<UsageResponse | null>;
  usage: UsageResponse | null;

  // Utility
  clearSuggestions: () => void;
  clearError: () => void;
}

export const useCoach = (): UseCoachReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingUses, setRemainingUses] = useState<number | null>(null);

  const [icebreakerSuggestions, setIcebreakerSuggestions] = useState<string[]>([]);
  const [responseSuggestions, setResponseSuggestions] = useState<string[]>([]);
  const [profileTips, setProfileTips] = useState<ProfileTipResponse | null>(null);
  const [dateIdeas, setDateIdeas] = useState<DateIdeaResponse | null>(null);
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  const generateIcebreakers = useCallback(async (request: IcebreakerRequest): Promise<IcebreakerResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await coachService.generateIcebreakers(request);
      setIcebreakerSuggestions(response.suggestions);
      setRemainingUses(response.remainingUses);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate icebreakers';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateResponses = useCallback(async (request: ResponseSuggestionRequest): Promise<ResponseSuggestionResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await coachService.generateResponseSuggestions(request);
      setResponseSuggestions(response.suggestions);
      setRemainingUses(response.remainingUses);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate response suggestions';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getProfileTips = useCallback(async (request: ProfileTipRequest): Promise<ProfileTipResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await coachService.getProfileTips(request);
      setProfileTips(response);
      setRemainingUses(response.remainingUses);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get profile tips';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateDateIdeas = useCallback(async (request: DateIdeaRequest): Promise<DateIdeaResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await coachService.generateDateIdeas(request);
      setDateIdeas(response);
      setRemainingUses(response.remainingUses);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate date ideas';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkUsage = useCallback(async (): Promise<UsageResponse | null> => {
    try {
      const response = await coachService.getUsage();
      setUsage(response);
      setRemainingUses(response.remaining);
      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check usage';
      setError(message);
      return null;
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setIcebreakerSuggestions([]);
    setResponseSuggestions([]);
    setProfileTips(null);
    setDateIdeas(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    remainingUses,
    generateIcebreakers,
    icebreakerSuggestions,
    generateResponses,
    responseSuggestions,
    getProfileTips,
    profileTips,
    generateDateIdeas,
    dateIdeas,
    checkUsage,
    usage,
    clearSuggestions,
    clearError,
  };
};

export default useCoach;
