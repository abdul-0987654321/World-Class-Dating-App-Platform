import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from './store';

// Placeholder imports - these will be implemented from the existing components
// import { LoginPage } from './pages/LoginPage';
// import { RegisterPage } from './pages/RegisterPage';
// import { DiscoveryPage } from './pages/DiscoveryPage';
// import { MatchesPage } from './pages/MatchesPage';
// import { MessagesPage } from './pages/MessagesPage';
// import { ProfilePage } from './pages/ProfilePage';

const App: React.FC = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth?.isAuthenticated || false);

  return (
    <div className="app">
      <Routes>
        {/* Public routes */}
        {!isAuthenticated ? (
          <>
            <Route path="/login" element={<div>Login Page - To be implemented</div>} />
            <Route path="/register" element={<div>Register Page - To be implemented</div>} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            {/* Protected routes */}
            <Route path="/discovery" element={<div>Discovery Page - To be implemented</div>} />
            <Route path="/matches" element={<div>Matches Page - To be implemented</div>} />
            <Route path="/messages" element={<div>Messages Page - To be implemented</div>} />
            <Route path="/messages/:conversationId" element={<div>Message Thread - To be implemented</div>} />
            <Route path="/profile" element={<div>Profile Page - To be implemented</div>} />
            <Route path="*" element={<Navigate to="/discovery" replace />} />
          </>
        )}
      </Routes>
    </div>
  );
};

export default App;
