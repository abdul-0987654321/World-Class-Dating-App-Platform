/**
 * Ads Services Export
 * Central export for all ad-related services
 */

// Types
export * from './types';

// Services
export { AdManager, default as adManager } from './AdManager';
export { AdService, default as adService } from './AdService';
export { AdAnalytics, default as adAnalytics } from './AdAnalytics';

// Re-export convenience functions
import AdManager from './AdManager';
import AdService from './AdService';
import AdAnalytics from './AdAnalytics';

/**
 * Initialize all ad services
 */
export async function initializeAds(): Promise<void> {
  await AdManager.initialize();
  await AdService.initialize();
  console.log('[Ads] All services initialized');
}

/**
 * Check if ads should be shown for current user
 */
export function shouldShowAds(): boolean {
  return AdManager.shouldShowAds();
}

/**
 * Record a user action (for frequency capping)
 */
export function recordUserAction(): void {
  AdManager.recordAction();
}

/**
 * Show an interstitial ad if available and frequency cap allows
 */
export async function showInterstitialIfReady(): Promise<boolean> {
  if (!AdManager.canShowInterstitial()) {
    return false;
  }
  return AdService.showInterstitialAd();
}

/**
 * Get available rewards for video ads
 */
export async function getAvailableRewards() {
  return AdService.getAvailableRewards();
}

/**
 * Watch a rewarded video ad
 */
export async function watchRewardedAd(rewardId: string) {
  return AdService.showRewardedAd(rewardId);
}

/**
 * Get analytics summary
 */
export async function getAdAnalytics() {
  return AdAnalytics.getTodaySummary();
}

/**
 * Sync analytics to backend
 */
export async function syncAdAnalytics(): Promise<void> {
  await AdAnalytics.syncToBackend();
}
