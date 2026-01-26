import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import { AvatarProvider } from '@/components/AIAvatar/AIAvatarSystem';
import { AIAssistantWidget } from '@/components/AIAssistant';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { FlamoralBackground } from '@/components/theme';
import { OktaProvider } from './providers/OktaProvider';
import { OktaProtectedRoute, PublicOnlyRoute } from './components/auth/OktaProtectedRoute';
import { OktaTokenSync } from './components/auth/OktaTokenSync';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import FuturisticLandingPage from './pages/Landing/FuturisticLandingPage';
import AnimatedLandingPage from './pages/Landing/AnimatedLandingPage';
import { OktaLoginPage } from './pages/Auth/OktaLoginPage';
import { OktaSignupPage } from './pages/Auth/OktaSignupPage';
import { OktaCallbackPage } from './pages/Auth/OktaCallbackPage';
import { ProfileSetupPage } from './pages/Profile/ProfileSetupPage';
import { NotFoundPage } from './pages/NotFound';
import { DiscoveryPage } from './pages/Discovery/DiscoveryPage';
import { DiscoveryFeaturePage } from './pages/Discovery/DiscoveryFeaturePage';
import { MatchesPage } from './pages/Matches/MatchesPage';
import { MessagesPage } from './pages/Messages/MessagesPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ProfileEditPage } from './pages/Profile/ProfileEditPage';
import { SafetyCenterPage } from './pages/Safety/SafetyCenterPage';
import { GamificationPage } from './pages/Gamification/GamificationPage';
import { EnhancedGamificationPage } from './pages/Gamification/EnhancedGamificationPage';
import { CommunitiesPage } from './pages/Communities/CommunitiesPage';
import { SpeedDatingPage } from './pages/SpeedDating/SpeedDatingPage';
import { ReferralPage } from './pages/Referral/ReferralPage';
import { SubscriptionPage } from './pages/Subscription/SubscriptionPage';
import { SubscriptionManagePage } from './pages/Subscription/SubscriptionManagePage';
import { AdvancedFiltersPage } from './pages/Filters/AdvancedFiltersPage';
import { VideoCallPage } from './pages/VideoCall/VideoCallPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { PrivacySettingsPage } from './pages/Settings/PrivacySettingsPage';
import { NotificationSettingsPage } from './pages/Settings/NotificationSettingsPage';
import { PhotoVerificationPage } from './pages/Verification/PhotoVerificationPage';
import { HelpSupportPage } from './pages/Help/HelpSupportPage';
// TierShowcase removed - demo route disabled for production

// Payment Pages
import { CheckoutPage } from './pages/Payment/CheckoutPage';
import { PaymentSuccessPage } from './pages/Payment/PaymentSuccessPage';
import { PaymentCancelPage } from './pages/Payment/PaymentCancelPage';

// Coins
import { CoinShopPage } from './pages/Coins/CoinShopPage';

// Legal Pages
import { PrivacyPolicy } from './pages/Legal/PrivacyPolicy';
import { TermsOfService } from './pages/Legal/TermsOfService';
import { CommunityGuidelines, CookiePolicy, SafetyGuidelines, RefundPolicy } from './pages/Legal';
import { SupportPage } from './pages/Legal/SupportPage';

// Admin Pages
import {
  AdminDashboardPage,
  AdminUsersPage,
  AdminVerificationsPage,
  AdminReportsPage,
  AdminAnalyticsPage,
  AdminModerationPage,
  AdminSettingsPage,
} from './pages/Admin';
import { UnauthorizedPage } from './pages/Unauthorized';

// Loading component
const LoadingScreen: React.FC = () => (
  <div
    className="min-h-screen flex items-center justify-center"
    style={{ backgroundColor: '#14141f' }}
  >
    <div
      className="w-12 h-12 border-3 border-gray-700 border-t-pink-500 rounded-full animate-spin"
      style={{
        borderWidth: '3px',
        borderTopColor: '#D62839',
      }}
    />
  </div>
);

// Landing page with auth redirect
const LandingWithAuth: React.FC = () => {
  const { authState } = useOktaAuth();

  if (!authState || authState.isPending) {
    return <LoadingScreen />;
  }

  if (authState.isAuthenticated) {
    return <Navigate to="/discover" replace />;
  }

  return <AnimatedLandingPage />;
};

// App Routes (inside OktaProvider context)
const AppRoutes: React.FC = () => {
  return (
    <>
      {/* AI Assistant Widget */}
      <AIAssistantWidget position="bottom-right" />

      <FlamoralBackground fixed withNoise>
        <AvatarProvider>
          <Routes>
            {/* Landing page - public (animated premium design) */}
            <Route path="/" element={<LandingWithAuth />} />

            {/* Legacy Landing pages - fallback */}
            <Route
              path="/landing-simple"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <LandingPage />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/landing-old"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <FuturisticLandingPage />
                </PublicOnlyRoute>
              }
            />

            {/* Auth routes - Okta handles these */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <OktaLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/login/*" element={<OktaLoginPage />} />
            <Route path="/login/callback" element={<OktaCallbackPage />} />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <OktaSignupPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/signup/*" element={<OktaSignupPage />} />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <OktaSignupPage />
                </PublicOnlyRoute>
              }
            />

            {/* Profile setup - after signup */}
            <Route
              path="/profile-setup"
              element={
                <OktaProtectedRoute>
                  <ProfileSetupPage />
                </OktaProtectedRoute>
              }
            />

            {/* Legal pages - public */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            <Route path="/safety-guidelines" element={<SafetyGuidelines />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/support" element={<SupportPage />} />

            {/* Unauthorized page for admin access denied */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected routes */}
            <Route
              path="/discover"
              element={
                <OktaProtectedRoute requireProfileComplete>
                  <DiscoveryFeaturePage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/discover/simple"
              element={
                <OktaProtectedRoute requireProfileComplete>
                  <DiscoveryPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <OktaProtectedRoute requireProfileComplete>
                  <MatchesPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <OktaProtectedRoute requireProfileComplete>
                  <MessagesPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <OktaProtectedRoute>
                  <ProfilePage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/safety"
              element={
                <OktaProtectedRoute>
                  <SafetyCenterPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/rewards"
              element={
                <OktaProtectedRoute>
                  <EnhancedGamificationPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/rewards/old"
              element={
                <OktaProtectedRoute>
                  <GamificationPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/communities"
              element={
                <OktaProtectedRoute>
                  <CommunitiesPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/speed-dating"
              element={
                <OktaProtectedRoute>
                  <SpeedDatingPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <OktaProtectedRoute>
                  <ReferralPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <OktaProtectedRoute>
                  <SubscriptionPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/subscription/manage"
              element={
                <OktaProtectedRoute>
                  <SubscriptionManagePage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/premium"
              element={
                <OktaProtectedRoute>
                  <SubscriptionPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <OktaProtectedRoute>
                  <CheckoutPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <OktaProtectedRoute>
                  <PaymentSuccessPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/payment/cancel"
              element={
                <OktaProtectedRoute>
                  <PaymentCancelPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/coins"
              element={
                <OktaProtectedRoute>
                  <CoinShopPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/filters"
              element={
                <OktaProtectedRoute>
                  <AdvancedFiltersPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/video-call/:matchId"
              element={
                <OktaProtectedRoute>
                  <VideoCallPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <OktaProtectedRoute>
                  <SettingsPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <OktaProtectedRoute>
                  <ProfileEditPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/verification"
              element={
                <OktaProtectedRoute>
                  <PhotoVerificationPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/privacy"
              element={
                <OktaProtectedRoute>
                  <PrivacySettingsPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <OktaProtectedRoute>
                  <NotificationSettingsPage />
                </OktaProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <OktaProtectedRoute>
                  <HelpSupportPage />
                </OktaProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminDashboardPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <AdminUsersPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/verifications"
              element={
                <RequireAdmin>
                  <AdminVerificationsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <RequireAdmin>
                  <AdminReportsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/analytics"
              element={
                <RequireAdmin>
                  <AdminAnalyticsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/moderation"
              element={
                <RequireAdmin>
                  <AdminModerationPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/settings"
              element={
                <RequireAdmin>
                  <AdminSettingsPage />
                </RequireAdmin>
              }
            />

            {/* 404 Not Found */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AvatarProvider>
      </FlamoralBackground>
    </>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <OktaProvider>
        <OktaTokenSync>
          <AppRoutes />
        </OktaTokenSync>
      </OktaProvider>
    </BrowserRouter>
  );
};

export default App;
