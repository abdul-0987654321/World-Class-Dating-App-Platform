import React from 'react';
import { Link } from 'react-router-dom';
import { FlamoralBackground } from '@/components/theme';

export const NotFoundPage: React.FC = () => {
  return (
    <FlamoralBackground>
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          {/* 404 Icon */}
          <div className="mb-8">
            <div className="text-8xl font-bold bg-gradient-to-r from-fm-pink via-fm-blue to-purple-500 bg-clip-text text-transparent">
              404
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-bold text-fm-text-primary mb-4">
            Page Not Found
          </h1>

          {/* Description */}
          <p className="text-fm-text-secondary mb-8">
            Oops! The page you're looking for doesn't exist or has been moved. Let's get you back on
            track.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Go Home
            </Link>
            <Link
              to="/discover"
              className="px-6 py-3 bg-fm-surface border border-white/10 text-fm-text-primary font-semibold rounded-lg hover:bg-white/5 transition-colors"
            >
              Start Discovering
            </Link>
          </div>

          {/* Help Link */}
          <p className="mt-8 text-sm text-fm-text-secondary">
            Need help?{' '}
            <Link to="/support" className="text-fm-pink hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </FlamoralBackground>
  );
};

export default NotFoundPage;
