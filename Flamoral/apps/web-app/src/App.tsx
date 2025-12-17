import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { authService } from './services';
import { AvatarProvider } from '@/components/AIAvatar/AIAvatarSystem';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RouteGuard } from './components/RouteGuard';

// Critical pages - direct imports for fastest initial load
import FuturisticLandingPage from './pages/Landing/FuturisticLandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { VerifyEmailPage } from './pages/Auth/VerifyEmailPage';
import { ResendVerificationPage } from './pages/Auth/ResendVerificationPage';
import NotFoundPage from './pages/NotFoundPage';

// Lazy-loaded pages - code splitting for better performance
const LandingPage = lazy(() => import('./pages/Landing/LandingPage'));
const DiscoveryPage = lazy(() => import('./pages/Discovery/DiscoveryPage').then(module => ({ default: module.DiscoveryPage })));
const MatchesPage = lazy(() => import('./pages/Matches/MatchesPage').then(module => ({ default: module.MatchesPage })));
const MessagesPage = lazy(() => import('./pages/Messages/MessagesPage').then(module => ({ default: module.MessagesPage })));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const ProfileEditPage = lazy(() => import('./pages/Profile/ProfileEditPage').then(module => ({ default: module.ProfileEditPage })));
const SafetyCenterPage = lazy(() => import('./pages/Safety/SafetyCenterPage').then(module => ({ default: module.SafetyCenterPage })));
const GamificationPage = lazy(() => import('./pages/Gamification/GamificationPage').then(module => ({ default: module.GamificationPage })));
const CommunitiesPage = lazy(() => import('./pages/Communities/CommunitiesPage').then(module => ({ default: module.CommunitiesPage })));
const SpeedDatingPage = lazy(() => import('./pages/SpeedDating/SpeedDatingPage').then(module => ({ default: module.SpeedDatingPage })));
const ReferralPage = lazy(() => import('./pages/Referral/ReferralPage').then(module => ({ default: module.ReferralPage })));
const SubscriptionPage = lazy(() => import('./pages/Subscription/SubscriptionPage').then(module => ({ default: module.SubscriptionPage })));
const AdvancedFiltersPage = lazy(() => import('./pages/Filters/AdvancedFiltersPage').then(module => ({ default: module.AdvancedFiltersPage })));
const VideoCallPage = lazy(() => import('./pages/VideoCall/VideoCallPage').then(module => ({ default: module.VideoCallPage })));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const PrivacySettingsPage = lazy(() => import('./pages/Settings/PrivacySettingsPage').then(module => ({ default: module.PrivacySettingsPage })));
const NotificationSettingsPage = lazy(() => import('./pages/Settings/NotificationSettingsPage').then(module => ({ default: module.NotificationSettingsPage })));
const PhotoVerificationPage = lazy(() => import('./pages/Verification/PhotoVerificationPage').then(module => ({ default: module.PhotoVerificationPage })));
const HelpSupportPage = lazy(() => import('./pages/Help/HelpSupportPage').then(module => ({ default: module.HelpSupportPage })));
const TierShowcase = lazy(() => import('./pages/TierShowcase'));

// Legal Pages - lazy loaded
const PrivacyPolicy = lazy(() => import('./pages/Legal/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })));
const TermsOfService = lazy(() => import('./pages/Legal/TermsOfService').then(module => ({ default: module.TermsOfService })));

// Admin Pages - lazy loaded (not frequently accessed)
const AdminDashboardPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminUsersPage })));
const AdminVerificationsPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminVerificationsPage })));
const AdminReportsPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminReportsPage })));
const AdminAnalyticsPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminAnalyticsPage })));
const AdminModerationPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminModerationPage })));
const AdminSettingsPage = lazy(() => import('./pages/Admin').then(module => ({ default: module.AdminSettingsPage })));

// Loading component for route transitions
const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto mb-4"></div>
      <p className="text-charcoal-400 text-sm">Loading...</p>
    </div>
  </div>
);

// Error component for lazy loading failures
const LazyLoadError: React.FC<{ error?: Error }> = ({ error }) => (
  <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-flame-900 flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <div className="mb-8">
        <svg
          className="w-24 h-24 mx-auto text-flame-500 opacity-80"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h1 className="text-4xl font-heading font-bold text-white mb-4">
        Failed to Load Page
      </h1>
      <p className="text-charcoal-300 mb-8">
        We couldn't load this page. This might be due to a network issue or the page may be temporarily unavailable.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gradient-to-r from-flame-500 to-ember-500 hover:from-flame-600 hover:to-ember-600 text-white rounded-xl transition-all shadow-lg hover:shadow-flame-500/50"
        >
          Retry
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-xl transition-colors"
        >
          Go to Home
        </button>
      </div>
      {error && import.meta.env.DEV && (
        <div className="mt-8 p-4 bg-charcoal-800 rounded-lg text-left">
          <p className="text-xs text-charcoal-400 font-mono break-all">
            {error.toString()}
          </p>
        </div>
      )}
    </div>
  </div>
);

// Scroll restoration component
const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Restore scroll to top on route change, unless there's a hash
    if (!window.location.hash) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    }
  }, [pathname, search]);

  return null;
};

// Route preloading for better performance
const preloadRoute = (importFn: () => Promise<any>) => {
  importFn();
};

// Preload critical routes on mount
const usePreloadRoutes = () => {
  useEffect(() => {
    // Preload most visited routes after initial render
    const timeout = setTimeout(() => {
      // Preload discovery and matches pages (most accessed after login)
      preloadRoute(() => import('./pages/Discovery/DiscoveryPage'));
      preloadRoute(() => import('./pages/Matches/MatchesPage'));
      preloadRoute(() => import('./pages/Messages/MessagesPage'));
      preloadRoute(() => import('./pages/Profile/ProfilePage'));
    }, 2000); // Delay to not interfere with initial load

    return () => clearTimeout(timeout);
  }, []);
};

// Auth check hook - uses httpOnly cookie based authentication
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check auth via authService (uses sessionStorage for user data, httpOnly cookies for tokens)
    setIsAuthenticated(authService.isAuthenticated());
  }, []);

  return { isAuthenticated, setIsAuthenticated };
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();
  usePreloadRoutes(); // Preload critical routes

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return <RouteLoadingFallback />;
  }

  return (
    <ErrorBoundary fallback={<LazyLoadError />}>
      <BrowserRouter>
        <RouteGuard>
          <ScrollToTop />
          <AvatarProvider>
            <ErrorBoundary fallback={<LazyLoadError />}>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
              {/* Landing page - public */}
              <Route path="/" element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <FuturisticLandingPage />
              } />

              {/* Old Landing page - fallback */}
              <Route path="/landing-old" element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <LandingPage />
              } />

              {/* Public routes */}
              <Route path="/login" element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <LoginPage />
              } />
              <Route path="/register" element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <SignupPage />
              } />
              <Route path="/signup" element={
                isAuthenticated ? <Navigate to="/discover" replace /> : <SignupPage />
              } />

              {/* Email verification routes - public */}
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/resend-verification" element={<ResendVerificationPage />} />

              {/* Public demo route */}
              <Route path="/tier-showcase" element={<TierShowcase />} />

              {/* Legal pages - public */}
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />

              {/* Protected routes */}
              <Route path="/discover" element={
                <ProtectedRoute><DiscoveryPage /></ProtectedRoute>
              } />
              <Route path="/matches" element={
                <ProtectedRoute><MatchesPage /></ProtectedRoute>
              } />
              <Route path="/messages" element={
                <ProtectedRoute><MessagesPage /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute><ProfilePage /></ProtectedRoute>
              } />
              <Route path="/safety" element={
                <ProtectedRoute><SafetyCenterPage /></ProtectedRoute>
              } />
              <Route path="/rewards" element={
                <ProtectedRoute><GamificationPage /></ProtectedRoute>
              } />
              <Route path="/communities" element={
                <ProtectedRoute><CommunitiesPage /></ProtectedRoute>
              } />
              <Route path="/speed-dating" element={
                <ProtectedRoute><SpeedDatingPage /></ProtectedRoute>
              } />
              <Route path="/referrals" element={
                <ProtectedRoute><ReferralPage /></ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute><SubscriptionPage /></ProtectedRoute>
              } />
              <Route path="/filters" element={
                <ProtectedRoute><AdvancedFiltersPage /></ProtectedRoute>
              } />
              <Route path="/video-call/:matchId" element={
                <ProtectedRoute><VideoCallPage /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><SettingsPage /></ProtectedRoute>
              } />
              <Route path="/profile/edit" element={
                <ProtectedRoute><ProfileEditPage /></ProtectedRoute>
              } />
              <Route path="/verification" element={
                <ProtectedRoute><PhotoVerificationPage /></ProtectedRoute>
              } />
              <Route path="/privacy" element={
                <ProtectedRoute><PrivacySettingsPage /></ProtectedRoute>
              } />
              <Route path="/notifications" element={
                <ProtectedRoute><NotificationSettingsPage /></ProtectedRoute>
              } />
              <Route path="/help" element={
                <ProtectedRoute><HelpSupportPage /></ProtectedRoute>
              } />

              {/* Admin routes - require admin access */}
              <Route path="/admin" element={
                <ProtectedRoute requireAdmin={true}><AdminDashboardPage /></ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireAdmin={true}><AdminUsersPage /></ProtectedRoute>
              } />
              <Route path="/admin/verifications" element={
                <ProtectedRoute requireAdmin={true}><AdminVerificationsPage /></ProtectedRoute>
              } />
              <Route path="/admin/reports" element={
                <ProtectedRoute requireAdmin={true}><AdminReportsPage /></ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requireAdmin={true}><AdminAnalyticsPage /></ProtectedRoute>
              } />
              <Route path="/admin/moderation" element={
                <ProtectedRoute requireAdmin={true}><AdminModerationPage /></ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requireAdmin={true}><AdminSettingsPage /></ProtectedRoute>
              } />

              {/* 404 Not Found - catch all */}
              <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </AvatarProvider>
        </RouteGuard>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
