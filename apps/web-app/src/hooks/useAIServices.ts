/**
 * React Hooks for AI Services
 * Easy-to-use hooks for integrating AI services into React components
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
  ScamDetectionResult,
} from '../services/ai';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Generic async hook helper
function useAsyncOperation<T, A extends unknown[]>(operation: (...args: A) => Promise<T>) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      setState({ data: null, loading: true, error: null });

      try {
        const result = await operation(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Operation failed';
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    [operation]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

// ============ Fraud Detection Hooks ============

export function useFraudCheck() {
  return useAsyncOperation<FraudCheckResult, [FraudCheckRequest]>((request) =>
    fraudDetectionService.checkFraud(request)
  );
}

export function useLocationAnomalyCheck() {
  return useAsyncOperation(
    (userId: string, location: { latitude: number; longitude: number; ip_address?: string }) =>
      fraudDetectionService.checkLocationAnomaly(userId, location)
  );
}

export function useDeviceCheck() {
  return useAsyncOperation((userId: string, device: FraudCheckRequest['device']) =>
    fraudDetectionService.checkDevice(userId, device)
  );
}

export function useProfileFraudAnalysis() {
  return useAsyncOperation((userId: string) => fraudDetectionService.analyzeProfile(userId));
}

// ============ NLP Service Hooks ============

export function useSentimentAnalysis() {
  return useAsyncOperation<SentimentAnalysisResult, [string, string?]>((text, context) =>
    nlpService.analyzeSentiment(text, context as 'message' | 'bio' | 'prompt' | 'general')
  );
}

export function useToxicityDetection() {
  return useAsyncOperation<ToxicityAnalysisResult, [string, boolean?]>((text, strictMode) =>
    nlpService.analyzeToxicity(text, strictMode)
  );
}

export function useSmartReplies() {
  return useAsyncOperation<SmartReplyResult, [{ text: string; sender_id: string }[], string]>(
    (conversation, userId) => nlpService.generateSmartReplies(conversation, userId)
  );
}

export function useConversationAnalysis() {
  return useAsyncOperation<
    ConversationAnalysisResult,
    [{ text: string; sender_id: string; timestamp: string }[]]
  >((messages) => nlpService.analyzeConversation(messages));
}

export function useContentModeration() {
  return useAsyncOperation(
    (text: string, contentType: 'bio' | 'message' | 'prompt' | 'photo_caption') =>
      nlpService.moderateContent(text, contentType)
  );
}

export function useScamDetection() {
  return useAsyncOperation<ScamDetectionResult, [string]>((text) => nlpService.detectScam(text));
}

export function useIcebreakers() {
  return useAsyncOperation((bio: string, targetInterests: string[], senderInterests: string[]) =>
    nlpService.generateIcebreakers(bio, targetInterests, senderInterests)
  );
}

export function useBioAnalysis() {
  return useAsyncOperation((bio: string) => nlpService.analyzeBioQuality(bio));
}

// ============ Photo Analysis Hooks ============

export function usePhotoAnalysis() {
  return useAsyncOperation<
    PhotoAnalysisResult,
    [{ photo_url?: string; photo_base64?: string; user_id: string }]
  >((request) => photoAnalysisService.analyzePhoto(request));
}

export function usePhotoUploadAnalysis() {
  return useAsyncOperation<
    PhotoAnalysisResult,
    [string, File, ('face' | 'quality' | 'moderation' | 'verification' | 'all')[]?]
  >((userId, file, analysisTypes) =>
    photoAnalysisService.uploadAndAnalyze(userId, file, analysisTypes)
  );
}

export function usePhotoModeration() {
  return useAsyncOperation((photoUrl: string) => photoAnalysisService.moderatePhoto(photoUrl));
}

export function usePhotoRanking() {
  return useAsyncOperation((userId: string, photoUrls: string[]) =>
    photoAnalysisService.rankPhotos(userId, photoUrls)
  );
}

export function useFakePhotoDetection() {
  return useAsyncOperation((photoUrl: string) => photoAnalysisService.detectFakePhoto(photoUrl));
}

export function usePhotoSuggestions() {
  return useAsyncOperation((userId: string, photoUrls: string[]) =>
    photoAnalysisService.getPhotoSuggestions(userId, photoUrls)
  );
}

export function useSelfieVerification() {
  return useAsyncOperation((userId: string, selfieFile: File, referencePhotoUrl: string) =>
    photoAnalysisService.verifySelfie(userId, selfieFile, referencePhotoUrl)
  );
}

// ============ Recommendation Hooks ============

export function useRecommendations() {
  return useAsyncOperation<
    RecommendationResult,
    [Parameters<typeof recommendationService.getRecommendations>[0]]
  >((request) => recommendationService.getRecommendations(request));
}

export function useTopPicks() {
  return useAsyncOperation<
    RecommendationResult,
    [string, { latitude: number; longitude: number }, number?]
  >((userId, location, limit) => recommendationService.getTopPicks(userId, location, limit));
}

export function useCompatibility() {
  return useAsyncOperation<CompatibilityResult, [string, string]>((userId, targetUserId) =>
    recommendationService.calculateCompatibility(userId, targetUserId)
  );
}

export function useSimilarProfiles() {
  return useAsyncOperation((userId: string, likedUserId: string, limit?: number) =>
    recommendationService.getSimilarProfiles(userId, likedUserId, limit)
  );
}

export function useSecondLook() {
  return useAsyncOperation<
    RecommendationResult,
    [string, { latitude: number; longitude: number }, number?]
  >((userId, location, limit) => recommendationService.getSecondLook(userId, location, limit));
}

export function useLikedYou() {
  return useAsyncOperation((userId: string, limit?: number, blurred?: boolean) =>
    recommendationService.getLikedYou(userId, limit, blurred)
  );
}

export function useRecommendationStats() {
  return useAsyncOperation((userId: string) =>
    recommendationService.getRecommendationStats(userId)
  );
}

export function useRecommendationExplanation() {
  return useAsyncOperation((userId: string, targetUserId: string) =>
    recommendationService.getRecommendationExplanation(userId, targetUserId)
  );
}

// ============ Combined Hooks ============

/**
 * Hook for comprehensive message safety check
 * Combines toxicity detection and scam detection
 */
export function useMessageSafetyCheck() {
  const [state, setState] = useState<{
    data: { toxicity: ToxicityAnalysisResult | null; scam: ScamDetectionResult | null } | null;
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
      const [toxicity, scam] = await Promise.all([
        nlpService.analyzeToxicity(text),
        nlpService.detectScam(text),
      ]);

      const data = { toxicity, scam };
      setState({ data, loading: false, error: null });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Safety check failed';
      setState({ data: null, loading: false, error: message });
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
    data: {
      photoAnalysis: PhotoAnalysisResult | null;
      fakeDetection: Awaited<ReturnType<typeof photoAnalysisService.detectFakePhoto>> | null;
      fraudCheck: FraudCheckResult | null;
    } | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const verifyProfile = useCallback(
    async (
      userId: string,
      photoUrl: string,
      location?: { latitude: number; longitude: number }
    ) => {
      setState({ data: null, loading: true, error: null });

      try {
        const promises: Promise<unknown>[] = [
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
          photoAnalysis: results[0] as PhotoAnalysisResult,
          fakeDetection: results[1] as Awaited<
            ReturnType<typeof photoAnalysisService.detectFakePhoto>
          >,
          fraudCheck: (results[2] as FraudCheckResult) || null,
        };

        setState({ data, loading: false, error: null });
        return data;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Verification failed';
        setState({ data: null, loading: false, error: message });
        return null;
      }
    },
    []
  );

  return { ...state, verifyProfile };
}

/**
 * Hook for profile quality assessment
 * Combines bio analysis and photo suggestions
 */
export function useProfileQualityAssessment() {
  const [state, setState] = useState<{
    data: {
      bioAnalysis: Awaited<ReturnType<typeof nlpService.analyzeBioQuality>> | null;
      photoSuggestions: Awaited<ReturnType<typeof photoAnalysisService.getPhotoSuggestions>> | null;
    } | null;
    loading: boolean;
    error: string | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });

  const assessProfile = useCallback(async (userId: string, bio: string, photoUrls: string[]) => {
    setState({ data: null, loading: true, error: null });

    try {
      const [bioAnalysis, photoSuggestions] = await Promise.all([
        nlpService.analyzeBioQuality(bio),
        photoAnalysisService.getPhotoSuggestions(userId, photoUrls),
      ]);

      const data = { bioAnalysis, photoSuggestions };
      setState({ data, loading: false, error: null });
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Assessment failed';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, assessProfile };
}
