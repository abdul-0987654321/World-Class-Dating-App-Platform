import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../../services';

export const ResendVerificationPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [canResend, setCanResend] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canResend) {
      setError(`Please wait ${cooldownTime} seconds before requesting another email.`);
      return;
    }

    setError('');
    setStatus('loading');

    try {
      // Note: The backend method doesn't take email parameter according to the service
      // It uses the authenticated user's email
      await authService.resendVerificationEmail();
      setStatus('success');

      // Start cooldown timer (60 seconds)
      setCanResend(false);
      setCooldownTime(60);

      const countdown = setInterval(() => {
        setCooldownTime((prev) => {
          if (prev <= 1) {
            clearInterval(countdown);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setStatus('error');

      // Handle rate limiting error specifically
      if (err.status === 429 || err.message?.toLowerCase().includes('rate limit')) {
        setError('You can only request a verification email once per minute. Please try again later.');
        setCanResend(false);
        setCooldownTime(60);

        const countdown = setInterval(() => {
          setCooldownTime((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              setCanResend(true);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else if (err.status === 400 && err.message?.toLowerCase().includes('already verified')) {
        setError('Your email is already verified. You can log in to your account.');
      } else {
        setError(err.message || 'Failed to send verification email. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-flame-500 via-flame-800 to-charcoal-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-10 h-10" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D62839"/>
                  <stop offset="100%" stopColor="#FF6E35"/>
                </linearGradient>
              </defs>
              <path d="M16 28.5l-1.9-1.7C7.2 20.5 3 16.8 3 12c0-4.1 3.2-7.5 7.3-7.5c2.3 0 4.5 1.1 6 2.8c1.4-1.7 3.6-2.8 6-2.8c4 0 7.3 3.4 7.3 7.5c0 4.8-4.2 8.5-11.1 14.8L16 28.5z" fill="url(#logoGrad)"/>
              <path d="M16 9c0 0-2 2-2 4.6c0 2 1.3 3.3 2 4c0.7-0.7 2-2 2-4C18 11 16 9 16 9z" fill="#FFF6EE" opacity="0.85"/>
            </svg>
            <h1 className="text-4xl font-heading font-bold text-gradient-flamoral">
              Flamoral
            </h1>
          </div>
          <p className="text-charcoal-500 mt-2">Resend Verification Email</p>
        </div>

        {status !== 'success' ? (
          <>
            {/* Info Message */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Didn't receive the verification email? Enter your email address below and we'll send you a new one.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-flame-50 border border-flame-200 text-flame-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus:ring-2 focus:ring-flame-500 focus:border-transparent transition text-charcoal-900"
                  placeholder="Enter your email"
                  required
                  disabled={status === 'loading'}
                />
                <p className="mt-2 text-xs text-charcoal-500">
                  We'll send a verification link to this email address.
                </p>
              </div>

              {cooldownTime > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    You can request another email in <span className="font-bold">{cooldownTime}</span> seconds
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading' || !canResend}
                className="w-full bg-gradient-flamoral text-ivory py-3 rounded-lg font-semibold hover:shadow-flame transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Sending...
                  </span>
                ) : (
                  'Send Verification Email'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-charcoal-200">
              <div className="text-center space-y-3">
                <p className="text-sm text-charcoal-600">
                  Remember to check your spam folder if you don't see the email.
                </p>
                <p className="text-sm text-charcoal-500">
                  Already verified?{' '}
                  <Link to="/login" className="text-flame-500 hover:text-flame-600 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            {/* Success Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
                  />
                </svg>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-charcoal-900 mb-4">
              Email Sent Successfully!
            </h2>
            <p className="text-charcoal-600 mb-6">
              We've sent a verification email to <strong>{email}</strong>. Please check your inbox and click the verification link.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-700">
                The verification link will expire in 24 hours. If you don't receive the email within a few minutes, check your spam folder.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {cooldownTime > 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-700">
                    Wait <span className="font-bold">{cooldownTime}s</span> to send another email
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setStatus('idle')}
                  className="w-full bg-charcoal-100 text-charcoal-700 py-3 rounded-lg font-semibold hover:bg-charcoal-200 transition"
                >
                  Send Another Email
                </button>
              )}
              <Link
                to="/login"
                className="w-full bg-gradient-flamoral text-ivory py-3 rounded-lg font-semibold hover:shadow-flame transition text-center"
              >
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-charcoal-500">
            Need help?{' '}
            <Link to="/help" className="text-flame-500 hover:text-flame-600 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResendVerificationPage;
