/**
 * useUpgradeModal Hook
 * Handles 402 Payment Required errors and shows upgrade modal
 * This is the central place to handle subscription-required actions
 */

import { useState, useCallback, useMemo } from 'react';
import { ApiError } from '../services/api.client';

interface UpgradeModalState {
  isOpen: boolean;
  feature?: string;
  message?: string;
  requiredTier?: string;
}

interface UseUpgradeModalReturn {
  upgradeModalState: UpgradeModalState;
  showUpgradeModal: (feature?: string, message?: string, requiredTier?: string) => void;
  closeUpgradeModal: () => void;
  handleApiError: (error: unknown) => boolean; // Returns true if 402 error was handled
  wrapApiCall: <T>(apiCall: () => Promise<T>, feature?: string) => Promise<T>;
}

/**
 * Hook to handle upgrade modals for premium features
 *
 * Usage:
 * ```tsx
 * const { upgradeModalState, closeUpgradeModal, wrapApiCall } = useUpgradeModal();
 *
 * const handleSuperLike = async () => {
 *   try {
 *     await wrapApiCall(() => api.superLike(userId), 'super_like');
 *   } catch (err) {
 *     // Handle non-402 errors
 *   }
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleSuperLike}>Super Like</button>
 *     <UpgradeModal {...upgradeModalState} onClose={closeUpgradeModal} />
 *   </>
 * );
 * ```
 */
export function useUpgradeModal(): UseUpgradeModalReturn {
  const [upgradeModalState, setUpgradeModalState] = useState<UpgradeModalState>({
    isOpen: false,
  });

  const showUpgradeModal = useCallback(
    (feature?: string, message?: string, requiredTier?: string) => {
      setUpgradeModalState({
        isOpen: true,
        feature,
        message,
        requiredTier,
      });
    },
    []
  );

  const closeUpgradeModal = useCallback(() => {
    setUpgradeModalState({ isOpen: false });
  }, []);

  const handleApiError = useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && error.status === 402) {
        // Extract feature and tier info from error response if available
        const errorData = error.data as Record<string, unknown> | undefined;
        const feature = (errorData?.feature as string) || undefined;
        const message = (errorData?.message as string) || error.message;
        const requiredTier = (errorData?.requiredTier as string) || 'GOLD';

        showUpgradeModal(feature, message, requiredTier);
        return true;
      }
      return false;
    },
    [showUpgradeModal]
  );

  const wrapApiCall = useCallback(
    async <T>(apiCall: () => Promise<T>, feature?: string): Promise<T> => {
      try {
        return await apiCall();
      } catch (error) {
        if (error instanceof ApiError && error.status === 402) {
          const errorData = error.data as Record<string, unknown> | undefined;
          const message = (errorData?.message as string) || error.message;
          const requiredTier = (errorData?.requiredTier as string) || 'GOLD';

          showUpgradeModal(feature, message, requiredTier);
        }
        throw error;
      }
    },
    [showUpgradeModal]
  );

  return useMemo(
    () => ({
      upgradeModalState,
      showUpgradeModal,
      closeUpgradeModal,
      handleApiError,
      wrapApiCall,
    }),
    [upgradeModalState, showUpgradeModal, closeUpgradeModal, handleApiError, wrapApiCall]
  );
}

export default useUpgradeModal;
