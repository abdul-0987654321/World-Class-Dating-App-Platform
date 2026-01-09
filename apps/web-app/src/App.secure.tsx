import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { DiscoveryPage } from './pages/Discovery/DiscoveryPage';
import { MatchesPage } from './pages/Matches/MatchesPage';
import { MessagesPage } from './pages/Messages/MessagesPage';
import { ProfilePage } from './pages/Profile/ProfilePage';
import { ProfileEditPage } from './pages/Profile/ProfileEditPage';
import { SafetyCenterPage } from './pages/Safety/SafetyCenterPage';
import { GamificationPage } from './pages/Gamification/GamificationPage';
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

// Legal Pages
import { PrivacyPolicy } from './pages/Legal/PrivacyPolicy';
import { TermsOfService } from './pages/Legal/TermsOfService';

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

import { authService } from './services/auth.service';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { UnauthorizedPage } from './pages/Unauthorized';

// Auth check hook - SECURE VERSION (no localStorage)
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Attempt to fetch current user - will fail if not authenticated
      // Authentication is via httpOnly cookies, not localStorage
      await authService.getCurrentUser();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  return { isAuthenticated, setIsAuthenticated };
};

// Protected Route wrapper - SECURE VERSION
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Verify authentication via API call - uses httpOnly cookies
      await authService.getCurrentUser();
      setIsAuth(true);
    } catch (error) {
      setIsAuth(false);
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
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

        {/* Public demo route */}
        <Route path="/tier-showcase" element={<TierShowcase />} />

        {/* Legal pages - public */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* Unauthorized page for admin access denied */}
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

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

        {/* Default redirect */}
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/discover" : "/login"} replace />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
