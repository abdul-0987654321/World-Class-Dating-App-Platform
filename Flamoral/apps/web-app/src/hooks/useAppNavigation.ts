/**
 * useAppNavigation Hook
 * Type-safe navigation hook with route constants
 */

import { useNavigate, NavigateOptions } from 'react-router-dom';
import { ROUTES, buildVideoCallRoute } from '../utils/routing';

export const useAppNavigation = () => {
  const navigate = useNavigate();

  return {
    // Navigate to specific routes with type safety
    goToHome: (options?: NavigateOptions) => navigate(ROUTES.HOME, options),
    goToLogin: (options?: NavigateOptions) => navigate(ROUTES.LOGIN, options),
    goToRegister: (options?: NavigateOptions) => navigate(ROUTES.REGISTER, options),
    goToDiscover: (options?: NavigateOptions) => navigate(ROUTES.DISCOVER, options),
    goToMatches: (options?: NavigateOptions) => navigate(ROUTES.MATCHES, options),
    goToMessages: (options?: NavigateOptions) => navigate(ROUTES.MESSAGES, options),
    goToProfile: (options?: NavigateOptions) => navigate(ROUTES.PROFILE, options),
    goToProfileEdit: (options?: NavigateOptions) => navigate(ROUTES.PROFILE_EDIT, options),
    goToSafety: (options?: NavigateOptions) => navigate(ROUTES.SAFETY, options),
    goToRewards: (options?: NavigateOptions) => navigate(ROUTES.REWARDS, options),
    goToCommunities: (options?: NavigateOptions) => navigate(ROUTES.COMMUNITIES, options),
    goToSpeedDating: (options?: NavigateOptions) => navigate(ROUTES.SPEED_DATING, options),
    goToReferrals: (options?: NavigateOptions) => navigate(ROUTES.REFERRALS, options),
    goToSubscription: (options?: NavigateOptions) => navigate(ROUTES.SUBSCRIPTION, options),
    goToFilters: (options?: NavigateOptions) => navigate(ROUTES.FILTERS, options),
    goToVideoCall: (matchId: string, options?: NavigateOptions) =>
      navigate(buildVideoCallRoute(matchId), options),
    goToSettings: (options?: NavigateOptions) => navigate(ROUTES.SETTINGS, options),
    goToVerification: (options?: NavigateOptions) => navigate(ROUTES.VERIFICATION, options),
    goToPrivacySettings: (options?: NavigateOptions) => navigate(ROUTES.PRIVACY_SETTINGS, options),
    goToNotificationSettings: (options?: NavigateOptions) =>
      navigate(ROUTES.NOTIFICATION_SETTINGS, options),
    goToHelp: (options?: NavigateOptions) => navigate(ROUTES.HELP, options),

    // Admin routes
    goToAdmin: (options?: NavigateOptions) => navigate(ROUTES.ADMIN, options),
    goToAdminUsers: (options?: NavigateOptions) => navigate(ROUTES.ADMIN_USERS, options),
    goToAdminVerifications: (options?: NavigateOptions) =>
      navigate(ROUTES.ADMIN_VERIFICATIONS, options),
    goToAdminReports: (options?: NavigateOptions) => navigate(ROUTES.ADMIN_REPORTS, options),
    goToAdminAnalytics: (options?: NavigateOptions) => navigate(ROUTES.ADMIN_ANALYTICS, options),
    goToAdminModeration: (options?: NavigateOptions) => navigate(ROUTES.ADMIN_MODERATION, options),
    goToAdminSettings: (options?: NavigateOptions) => navigate(ROUTES.ADMIN_SETTINGS, options),

    // Generic navigation
    goTo: (path: string, options?: NavigateOptions) => navigate(path, options),
    goBack: () => navigate(-1),
    goForward: () => navigate(1),
  };
};
