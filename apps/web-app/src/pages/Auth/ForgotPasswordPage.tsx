import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlamoralBackground } from '@/components/theme';
import { authService } from '../../services';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword(email);
      // Always show success for security reasons (don't reveal if email exists)
      setSubmitted(true);
    } catch (err) {
      // Still show success message for security - backend returns success
      // regardless of whether email exists to prevent email enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <FlamoralBackground>
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
          <div className="w-full max-w-[calc(100%-2rem)] sm:max-w-md bg-fm-surface/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 p-5 sm:p-6 md:p-8 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-3 sm:mb-4">
              Check Your Email
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary mb-4 sm:mb-6 break-words">
              We've sent password reset instructions to{' '}
              <span className="text-fm-text-primary font-medium break-all">{email}</span>
            </p>
            <p className="text-xs sm:text-sm text-fm-text-secondary mb-4 sm:mb-6">
              Didn't receive the email? Check your spam folder or{' '}
              <button onClick={() => setSubmitted(false)} className="text-fm-pink hover:underline">
                try again
              </button>
            </p>
            <Link
              to="/login"
              className="inline-block px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </FlamoralBackground>
    );
  }

  return (
    <FlamoralBackground>
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-[calc(100%-2rem)] sm:max-w-md bg-fm-surface/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 p-5 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-2">
              Reset Password
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-xs sm:text-sm break-words">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-xs sm:text-sm font-medium text-fm-text-secondary mb-1.5 sm:mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-fm-surface border border-white/10 rounded-lg text-sm sm:text-base text-fm-text-primary placeholder-fm-text-secondary/50 focus:ring-2 focus:ring-fm-pink focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-fm-text-secondary">
            Remember your password?{' '}
            <Link to="/login" className="text-fm-pink hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </FlamoralBackground>
  );
};

export default ForgotPasswordPage;
