import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-flame-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <svg
            className="w-32 h-32 mx-auto text-flame-500 opacity-80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* 404 Text */}
        <h1 className="text-6xl font-heading font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Page Not Found</h2>
        <p className="text-charcoal-300 mb-8">
          The page you're looking for doesn't exist or has been moved.
          <br />
          <span className="text-sm text-charcoal-400 block mt-2">
            Path: {location.pathname}
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-charcoal-700 hover:bg-charcoal-600 text-white rounded-xl transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gradient-to-r from-flame-500 to-ember-500 hover:from-flame-600 hover:to-ember-600 text-white rounded-xl transition-all shadow-lg hover:shadow-flame-500/50"
          >
            Go to Home
          </button>
        </div>

        {/* Help Text */}
        <p className="text-charcoal-400 text-sm mt-8">
          Need help?{' '}
          <button
            onClick={() => navigate('/help')}
            className="text-flame-400 hover:text-flame-300 underline"
          >
            Contact Support
          </button>
        </p>
      </div>
    </div>
  );
};

export default NotFoundPage;
