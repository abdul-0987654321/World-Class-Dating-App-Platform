import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services';
import { AvatarProvider } from '@/components/AIAvatar/AIAvatarSystem';
import { RequireAdmin } from '@/components/auth/RequireAdmin';
import { FlamoralBackground } from '@/components/theme';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import FuturisticLandingPage from './pages/Landing/FuturisticLandingPage';
import AnimatedLandingPage from './pages/Landing/AnimatedLandingPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
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
import { AdvancedFiltersPage } from './pages/Filters/AdvancedFiltersPage';
import { VideoCallPage } from './pages/VideoCall/VideoCallPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { PrivacySettingsPage } from './pages/Settings/PrivacySettingsPage';
import { NotificationSettingsPage } from './pages/Settings/NotificationSettingsPage';
import { PhotoVerificationPage } from './pages/Verification/PhotoVerificationPage';
import { HelpSupportPage } from './pages/Help/HelpSupportPage';
import TierShowcase from './pages/TierShowcase';

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

// Auth check hook - uses httpOnly cookie based authentication
// SECURITY: Properly handles async auth state initialization
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // First check local state (for UI responsiveness)
        const localAuth = authService.isAuthenticated();

        if (localAuth) {
          // If we have local auth state, verify it's still valid by checking session
          // This handles cases where the httpOnly cookie expired
          try {
            const session = await authService.getSession();
            setIsAuthenticated(session?.isAuthenticated ?? false);
          } catch {
            // Session check failed, clear local state
            setIsAuthenticated(false);
          }
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, []);

  return { isAuthenticated, setIsAuthenticated, isAuthReady };
};

// Auth context for sharing auth state across components
const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  isAuthReady: boolean;
}>({ isAuthenticated: false, isAuthReady: false });

// Protected Route wrapper - uses auth context to ensure auth state is ready
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAuthReady } = React.useContext(AuthContext);

  // SECURITY: Don't render protected content until auth state is verified
  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fm-pink"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated, isAuthReady } = useAuth();

  // Provide auth context to all child components
  // NOTE: Public routes render immediately, protected routes wait for auth
  const authContextValue = React.useMemo(
    () => ({ isAuthenticated: isAuthenticated ?? false, isAuthReady }),
    [isAuthenticated, isAuthReady]
  );

  return (
    <BrowserRouter>
      <FlamoralBackground fixed withNoise>
        <AuthContext.Provider value={authContextValue}>
          <AvatarProvider>
            <Routes>
          {/* Landing page - public (animated premium design) */}
          <Route path="/" element={
            isAuthenticated ? <Navigate to="/discover" replace /> : <AnimatedLandingPage />
          } />

        {/* Legacy Landing pages - fallback */}
        <Route path="/landing-simple" element={
          isAuthenticated ? <Navigate to="/discover" replace /> : <LandingPage />
        } />
        <Route path="/landing-old" element={
          isAuthenticated ? <Navigate to="/discover" replace /> : <FuturisticLandingPage />
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
        <Route path="/forgot-password" element={
          isAuthenticated ? <Navigate to="/discover" replace /> : <ForgotPasswordPage />
        } />

        {/* Public demo route */}
        <Route path="/tier-showcase" element={<TierShowcase />} />

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
        <Route path="/discover" element={
          <ProtectedRoute><DiscoveryFeaturePage /></ProtectedRoute>
        } />
        <Route path="/discover/simple" element={
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
          <ProtectedRoute><EnhancedGamificationPage /></ProtectedRoute>
        } />
        <Route path="/rewards/old" element={
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
        <Route path="/checkout" element={
          <ProtectedRoute><CheckoutPage /></ProtectedRoute>
        } />
        <Route path="/payment/success" element={
          <ProtectedRoute><PaymentSuccessPage /></ProtectedRoute>
        } />
        <Route path="/payment/cancel" element={
          <ProtectedRoute><PaymentCancelPage /></ProtectedRoute>
        } />
        <Route path="/coins" element={
          <ProtectedRoute><CoinShopPage /></ProtectedRoute>
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

        {/* Admin routes */}
        <Route path="/admin" element={
          <RequireAdmin><AdminDashboardPage /></RequireAdmin>
        } />
        <Route path="/admin/users" element={
          <RequireAdmin><AdminUsersPage /></RequireAdmin>
        } />
        <Route path="/admin/verifications" element={
          <RequireAdmin><AdminVerificationsPage /></RequireAdmin>
        } />
        <Route path="/admin/reports" element={
          <RequireAdmin><AdminReportsPage /></RequireAdmin>
        } />
        <Route path="/admin/analytics" element={
          <RequireAdmin><AdminAnalyticsPage /></RequireAdmin>
        } />
        <Route path="/admin/moderation" element={
          <RequireAdmin><AdminModerationPage /></RequireAdmin>
        } />
        <Route path="/admin/settings" element={
          <RequireAdmin><AdminSettingsPage /></RequireAdmin>
        } />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </AvatarProvider>
        </AuthContext.Provider>
      </FlamoralBackground>
    </BrowserRouter>
  );
};

export default App;
