/**
 * Integration Example for Admin User Management
 *
 * This file demonstrates how to integrate the user management system
 * into your application routing.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserManagementPage } from './UserManagementPage';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminReportsPage } from './AdminReportsPage';
// ... other admin pages

// Example: Admin Layout Component
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Navigation Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-xl font-bold mb-6">Admin Panel</h2>
        <nav className="space-y-2">
          <a href="/admin" className="block px-4 py-2 rounded hover:bg-gray-100">
            Dashboard
          </a>
          <a href="/admin/users" className="block px-4 py-2 rounded hover:bg-gray-100">
            User Management
          </a>
          <a href="/admin/reports" className="block px-4 py-2 rounded hover:bg-gray-100">
            Reports
          </a>
          {/* Add more navigation items */}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64">
        {children}
      </main>
    </div>
  );
};

// Example: Protected Route Component
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if user is authenticated and has admin role
  const isAuthenticated = true; // Replace with actual auth check
  const isAdmin = true; // Replace with actual role check

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};

// Example: Admin Routes Configuration
export const AdminRoutes: React.FC = () => {
  return (
    <ProtectedAdminRoute>
      <AdminLayout>
        <Routes>
          {/* Dashboard */}
          <Route path="/" element={<AdminDashboardPage />} />

          {/* User Management - NEW */}
          <Route path="/users" element={<UserManagementPage />} />

          {/* Other Admin Routes */}
          <Route path="/reports" element={<AdminReportsPage />} />
          {/* Add more routes */}

          {/* Redirect unknown routes */}
          <Route path="*" element={<Navigate to="/admin" />} />
        </Routes>
      </AdminLayout>
    </ProtectedAdminRoute>
  );
};

// Example: App.tsx Integration
/*
import { AdminRoutes } from './pages/Admin/INTEGRATION_EXAMPLE';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes *\/}
          <Route path="/login" element={<LoginPage />} />

          {/* User Routes *\/}
          <Route path="/*" element={<UserRoutes />} />

          {/* Admin Routes - Prefix with /admin *\/}
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </BrowserRouter>

      {/* Toast Container for notifications *\/}
      <ToastContainer position="top-right" />
    </QueryClientProvider>
  );
}
*/

// Example: Direct Usage (without routing)
/*
import { UserManagementPage } from './pages/Admin/UserManagementPage';

function AdminPanel() {
  return <UserManagementPage />;
}
*/

// Example: Using Individual Components
/*
import { useState } from 'react';
import { UserManagementDashboard } from './pages/Admin/UserManagementDashboard';
import { UserDetailView, UserModerationActions } from './components/Admin';
import type { AdminUser } from './services/admin-user.service';

function CustomAdminPage() {
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  return (
    <div>
      {!selectedUser ? (
        <UserManagementDashboard onSelectUser={setSelectedUser} />
      ) : (
        <div>
          <UserDetailView userId={selectedUser.id} />
          <UserModerationActions user={selectedUser} />
        </div>
      )}
    </div>
  );
}
*/

export default AdminRoutes;
