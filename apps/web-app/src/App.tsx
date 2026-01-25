import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { AvatarProvider } from '@/components/AIAvatar/AIAvatarSystem';
import { AIAssistantWidget } from '@/components/AIAssistant';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { FlamoralBackground } from '@/components/theme';
import { ClerkProvider } from './providers/ClerkProvider';
import { ClerkProtectedRoute, PublicOnlyRoute } from './components/auth/ClerkProtectedRoute';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import FuturisticLandingPage from './pages/Landing/FuturisticLandingPage';
import AnimatedLandingPage from './pages/Landing/AnimatedLandingPage';
import { ClerkLoginPage } from './pages/Auth/ClerkLoginPage';
import { ClerkSignupPage } from './pages/Auth/ClerkSignupPage';
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
        borderTopColor: '#FF6B7A',
      }}
    />
  </div>
);

// Landing page with auth redirect
const LandingWithAuth: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (isSignedIn) {
    return <Navigate to="/discover" replace />;
  }

  return <AnimatedLandingPage />;
};

// App Routes (inside ClerkProvider context)
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

            {/* Auth routes - Clerk handles these */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <ClerkLoginPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/login/*" element={<ClerkLoginPage />} />
            <Route
              path="/signup"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <ClerkSignupPage />
                </PublicOnlyRoute>
              }
            />
            <Route path="/signup/*" element={<ClerkSignupPage />} />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute redirectTo="/discover">
                  <ClerkSignupPage />
                </PublicOnlyRoute>
              }
            />

            {/* Profile setup - after signup */}
            <Route
              path="/profile-setup"
              element={
                <ClerkProtectedRoute>
                  <ProfileSetupPage />
                </ClerkProtectedRoute>
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
                <ClerkProtectedRoute requireProfileComplete>
                  <DiscoveryFeaturePage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/discover/simple"
              element={
                <ClerkProtectedRoute requireProfileComplete>
                  <DiscoveryPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/matches"
              element={
                <ClerkProtectedRoute requireProfileComplete>
                  <MatchesPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ClerkProtectedRoute requireProfileComplete>
                  <MessagesPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ClerkProtectedRoute>
                  <ProfilePage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/safety"
              element={
                <ClerkProtectedRoute>
                  <SafetyCenterPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/rewards"
              element={
                <ClerkProtectedRoute>
                  <EnhancedGamificationPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/rewards/old"
              element={
                <ClerkProtectedRoute>
                  <GamificationPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/communities"
              element={
                <ClerkProtectedRoute>
                  <CommunitiesPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/speed-dating"
              element={
                <ClerkProtectedRoute>
                  <SpeedDatingPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/referrals"
              element={
                <ClerkProtectedRoute>
                  <ReferralPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/subscription"
              element={
                <ClerkProtectedRoute>
                  <SubscriptionPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/subscription/manage"
              element={
                <ClerkProtectedRoute>
                  <SubscriptionManagePage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/premium"
              element={
                <ClerkProtectedRoute>
                  <SubscriptionPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ClerkProtectedRoute>
                  <CheckoutPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/payment/success"
              element={
                <ClerkProtectedRoute>
                  <PaymentSuccessPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/payment/cancel"
              element={
                <ClerkProtectedRoute>
                  <PaymentCancelPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/coins"
              element={
                <ClerkProtectedRoute>
                  <CoinShopPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/filters"
              element={
                <ClerkProtectedRoute>
                  <AdvancedFiltersPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/video-call/:matchId"
              element={
                <ClerkProtectedRoute>
                  <VideoCallPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ClerkProtectedRoute>
                  <SettingsPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/profile/edit"
              element={
                <ClerkProtectedRoute>
                  <ProfileEditPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/verification"
              element={
                <ClerkProtectedRoute>
                  <PhotoVerificationPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/privacy"
              element={
                <ClerkProtectedRoute>
                  <PrivacySettingsPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ClerkProtectedRoute>
                  <NotificationSettingsPage />
                </ClerkProtectedRoute>
              }
            />
            <Route
              path="/help"
              element={
                <ClerkProtectedRoute>
                  <HelpSupportPage />
                </ClerkProtectedRoute>
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
      <ClerkProvider>
        <AppRoutes />
      </ClerkProvider>
    </BrowserRouter>
  );
};

export default App;
