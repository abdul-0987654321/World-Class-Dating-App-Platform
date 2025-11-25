import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Pages
import { LoginPage } from './pages/Auth/LoginPage';
import { DiscoveryPage } from './pages/Discovery/DiscoveryPage';
import { MatchesPage } from './pages/Matches/MatchesPage';
import { MessagesPage } from './pages/Messages/MessagesPage';
import { ProfilePage } from './pages/Profile/ProfilePage';

// Auth check hook
const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
  }, []);

  return { isAuthenticated, setIsAuthenticated };
};

// Protected Route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('authToken');

  if (!token) {
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

        {/* Default redirect */}
        <Route path="*" element={
          <Navigate to={isAuthenticated ? "/discover" : "/login"} replace />
        } />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
