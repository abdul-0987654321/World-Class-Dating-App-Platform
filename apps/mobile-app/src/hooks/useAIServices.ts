/**
 * React Hooks for AI Services
 * Provides easy-to-use hooks for integrating AI services into components
 */

import { useState, useCallback } from 'react';
import {
  fraudDetectionService,
  nlpService,
  photoAnalysisService,
  recommendationService,
  FraudCheckRequest,
  FraudCheckResult,
  SentimentAnalysisResult,
  ToxicityAnalysisResult,
  PhotoAnalysisResult,
  RecommendationResult,
  CompatibilityResult,
  ConversationAnalysisResult,
  SmartReplyResult,
} from '../services/ai';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic async hook helper
function useAsyncOperation<T, A extends any[]>(
  operation: (...args: A) => Promise<{ success: boolean; data?: T; error?: { message: string } }>
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (...args: A): Promise<T | null> => {
    setState({ data: null, loading: true, error: null });

    const result = await operation(...args);

    if (result.success && result.data) {
      setState({ data: result.data, loading: false, error: null });
      return result.data;
    } else {
      setState({ data: null, loading: false, error: result.error?.message || 'Operation failed' });
      return null;
    }
  }, [operation]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// ============ Fraud Detection Hooks ============

export function useFraudCheck() {
  return useAsyncOperation<FraudCheckResult, [FraudCheckRequest]>(
    (request) => fraudDetectionService.checkFraud(request)
  );
}

export function useLocationAnomalyCheck() {
  return useAsyncOperation<any, [string, { latitude: number; longitude: number; ip_address?: string }]>(
    (userId, location) => fraudDetectionService.checkLocationAnomaly(userId, location)
  );
}

export function useDeviceCheck() {
  return useAsyncOperation<any, [string, FraudCheckRequest['device']]>(
    (userId, device) => fraudDetectionService.checkDevice(userId, device)
  );
}

// ============ NLP Service Hooks ============

export function useSentimentAnalysis() {
  return useAsyncOperation<SentimentAnalysisResult, [string, string?]>(
    (text, context) => nlpService.analyzeSentiment({ text, context: context as any })
  );
}

export function useToxicityDetection() {
  return useAsyncOperation<ToxicityAnalysisResult, [string, boolean?]>(
    (text, strictMode) => nlpService.analyzeToxicity({ text, strict_mode: strictMode })
  );
}

export function useSmartReplies() {
  return useAsyncOperation<SmartReplyResult, [{ text: string; sender_id: string }[], string]>(
    (conversation, userId) => nlpService.generateSmartReplies(conversation, userId)
  );
}

export function useConversationAnalysis() {
  return useAsyncOperation<ConversationAnalysisResult, [{ text: string; sender_id: string; timestamp: string }[]]>(
    (messages) => nlpService.analyzeConversation(messages)
  );
}

export function useContentModeration() {
  return useAsyncOperation<{ approved: boolean; reason?: string; issues: string[] }, [string, string]>(
    (text, contentType) => nlpService.moderateContent(text, contentType as any)
  );
}

export function useScamDetection() {
  return useAsyncOperation<{ is_scam: boolean; confidence: number; indicators: string[] }, [string]>(
    (text) => nlpService.detectScam(text)
  );
}

export function useIcebreakers() {
  return useAsyncOperation<{ icebreakers: { text: string; type: string; confidence: number }[] }, [string, string[], string[]]>(
    (bio, targetInterests, senderInterests) => nlpService.generateIcebreakers(bio, targetInterests, senderInterests)
  );
}

export function useBioAnalysis() {
  return useAsyncOperation<{
    quality_score: number;
    strengths: string[];
    improvements: string[];
    suggested_additions: string[];
  }, [string]>(
    (bio) => nlpService.analyzeBioQuality(bio)
  );
}

// ============ Photo Analysis Hooks ============

export function usePhotoAnalysis() {
  return useAsyncOperation<PhotoAnalysisResult, [{ photo_url?: string; photo_base64?: string; user_id: string }]>(
    (request) => photoAnalysisService.analyzePhoto(request)
  );
}

export function usePhotoModeration() {
  return useAsyncOperation<any, [string]>(
    (photoUrl) => photoAnalysisService.moderatePhoto(photoUrl)
  );
}

export function usePhotoRanking() {
  return useAsyncOperation<any, [string, string[]]>(
    (userId, photoUrls) => photoAnalysisService.rankPhotos(userId, photoUrls)
  );
}

export function useFakePhotoDetection() {
  return useAsyncOperation<{
    is_fake: boolean;
    confidence: number;
    detection_type: string;
    indicators: string[];
  }, [string]>(
    (photoUrl) => photoAnalysisService.detectFakePhoto(photoUrl)
  );
}

export function usePhotoSuggestions() {
  return useAsyncOperation<any, [string, string[]]>(
    (userId, photoUrls) => photoAnalysisService.getPhotoSuggestions(userId, photoUrls)
  );
}

// ============ Recommendation Hooks ============

export function useRecommendations() {
  return useAsyncOperation<RecommendationResult, [any]>(
    (request) => recommendationService.getRecommendations(request)
  );
}

export function useTopPicks() {
  return useAsyncOperation<RecommendationResult, [string, { latitude: number; longitude: number }, number?]>(
    (userId, location, limit) => recommendationService.getTopPicks(userId, location, limit)
  );
}

export function useCompatibility() {
  return useAsyncOperation<CompatibilityResult, [string, string]>(
    (userId, targetUserId) => recommendationService.calculateCompatibility(userId, targetUserId)
  );
}

export function useSimilarProfiles() {
  return useAsyncOperation<any[], [string, string, number?]>(
    (userId, likedUserId, limit) => recommendationService.getSimilarProfiles(userId, likedUserId, limit)
  );
}

export function useSecondLook() {
  return useAsyncOperation<RecommendationResult, [string, { latitude: number; longitude: number }, number?]>(
    (userId, location, limit) => recommendationService.getSecondLook(userId, location, limit)
  );
}

export function useLikedYou() {
  return useAsyncOperation<{
    profiles: any[];
    total_count: number;
    requires_premium: boolean;
  }, [string, number?, boolean?]>(
    (userId, limit, blurred) => recommendationService.getLikedYou(userId, limit, blurred)
  );
}

export function useRecommendationStats() {
  return useAsyncOperation<{
    total_shown: number;
    total_liked: number;
    match_rate: number;
    avg_compatibility: number;
  }, [string]>(
    (userId) => recommendationService.getRecommendationStats(userId)
  );
}

// ============ Combined Hooks ============

/**
 * Hook for comprehensive message safety check
 * Combines toxicity detection and scam detection
 */
export function useMessageSafetyCheck() {
  const [state, setState] = useState<{
    data: { toxicity: ToxicityAnalysisResult | null; scam: any | null } | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const checkMessage = useCallback(async (text: string) => {
    setState({ data: null, loading: true, error: null });

    try {
      const [toxicityResult, scamResult] = await Promise.all([
        nlpService.analyzeToxicity({ text }),
        nlpService.detectScam(text),
      ]);

      const data = {
        toxicity: toxicityResult.success ? toxicityResult.data! : null,
        scam: scamResult.success ? scamResult.data! : null,
      };

      setState({ data, loading: false, error: null });
      return data;
    } catch (error: any) {
      setState({ data: null, loading: false, error: error.message });
      return null;
    }
  }, []);

  return { ...state, checkMessage };
}

/**
 * Hook for comprehensive profile verification
 * Combines photo analysis and fraud detection
 */
export function useProfileVerification() {
  const [state, setState] = useState<{
    data: any | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const verifyProfile = useCallback(async (
    userId: string,
    photoUrl: string,
    location?: { latitude: number; longitude: number }
  ) => {
    setState({ data: null, loading: true, error: null });

    try {
      const promises: Promise<any>[] = [
        photoAnalysisService.analyzePhoto({ photo_url: photoUrl, user_id: userId }),
        photoAnalysisService.detectFakePhoto(photoUrl),
      ];

      if (location) {
        promises.push(
          fraudDetectionService.checkFraud({
            user_id: userId,
            location: { ...location },
          })
        );
      }

      const results = await Promise.all(promises);

      const data = {
        photoAnalysis: results[0].success ? results[0].data : null,
        fakeDetection: results[1].success ? results[1].data : null,
        fraudCheck: results[2]?.success ? results[2].data : null,
      };

      setState({ data, loading: false, error: null });
      return data;
    } catch (error: any) {
      setState({ data: null, loading: false, error: error.message });
      return null;
    }
  }, []);

  return { ...state, verifyProfile };
}
