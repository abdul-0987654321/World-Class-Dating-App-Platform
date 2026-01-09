/**
 * Integration Example for Admin User Management
 *
 * This file demonstrates how to integrate the user management system
 * into your application routing.
 *
 * SECURITY NOTE: This example uses the RequireAdmin component which
 * verifies admin status via a real API call. Never use hardcoded
 * isAdmin = true patterns in production code.
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { UserManagementPage } from './UserManagementPage';
import { AdminDashboardPage } from './AdminDashboardPage';
import { AdminReportsPage } from './AdminReportsPage';
import { RequireAdmin } from '../../components/auth/RequireAdmin';
import { useAdminAuth } from '../../hooks/useAdminAuth';
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

/**
 * Protected Admin Route Component
 *
 * SECURITY: This component uses RequireAdmin which makes a real API call
 * to verify admin status. The server validates the session/token and returns
 * the actual role. This prevents privilege escalation attacks.
 *
 * DO NOT use patterns like:
 *   const isAdmin = true; // INSECURE - hardcoded
 *   const isAdmin = localStorage.getItem('isAdmin'); // INSECURE - client-side
 *
 * ALWAYS verify admin status via API call to the server.
 */
const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <RequireAdmin
      loginRedirect="/login"
      unauthorizedRedirect="/unauthorized"
    >
      {children}
    </RequireAdmin>
  );
};

/**
 * Example: Using the useAdminAuth hook for conditional rendering
 *
 * This demonstrates how to use the hook when you need admin status
 * in a component that's already within a protected route.
 */
const AdminContentExample: React.FC = () => {
  const { isLoading, isAdmin, permissions } = useAdminAuth();

  // SECURITY: Always check isLoading before trusting isAdmin
  if (isLoading) {
    return <div>Verifying admin access...</div>;
  }

  // SECURITY: Do not render sensitive content until verification completes
  if (!isAdmin) {
    return <Navigate to="/unauthorized" />;
  }

  return (
    <div>
      <h1>Admin Content</h1>
      {/* Safe to render admin content here - server verified */}
      <p>Your permissions: {permissions.join(', ') || 'All'}</p>
    </div>
  );
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

export default AdminRoutes;
