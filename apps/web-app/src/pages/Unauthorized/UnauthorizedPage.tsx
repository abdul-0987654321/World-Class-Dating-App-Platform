/**
 * UnauthorizedPage
 *
 * Displayed when a user tries to access a resource they don't have permission for,
 * particularly admin routes without admin privileges.
 */

import React from 'react';
import { Link } from 'react-router-dom';

export const UnauthorizedPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md text-center border border-white/20">
        <div className="text-7xl mb-6 opacity-80">403</div>
        <h1 className="text-3xl font-bold text-white mb-3">Access Denied</h1>
        <p className="text-white/70 mb-8 text-lg">
          You do not have permission to access this page. Admin privileges are required.
        </p>
        <div className="space-y-3">
          <Link
            to="/discover"
            className="block w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition font-semibold"
          >
            Return to Home
          </Link>
          <Link
            to="/login"
            className="block w-full px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition font-semibold border border-white/20"
          >
            Sign in with Different Account
          </Link>
        </div>
        <p className="mt-6 text-white/50 text-sm">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
