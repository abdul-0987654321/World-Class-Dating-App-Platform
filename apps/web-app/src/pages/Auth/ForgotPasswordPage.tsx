import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlamoralBackground } from '@/components/theme';

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
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Failed to send reset email. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <FlamoralBackground>
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-fm-surface/80 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-fm-text-primary mb-4">Check Your Email</h1>
            <p className="text-fm-text-secondary mb-6">
              We've sent password reset instructions to <span className="text-fm-text-primary font-medium">{email}</span>
            </p>
            <p className="text-sm text-fm-text-secondary mb-6">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setSubmitted(false)}
                className="text-fm-pink hover:underline"
              >
                try again
              </button>
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-fm-surface/80 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-fm-text-primary mb-2">Reset Password</h1>
            <p className="text-fm-text-secondary">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-fm-text-secondary mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-fm-surface border border-white/10 rounded-lg text-fm-text-primary placeholder-fm-text-secondary/50 focus:ring-2 focus:ring-fm-pink focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          {/* Back to Login */}
          <p className="mt-8 text-center text-sm text-fm-text-secondary">
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
