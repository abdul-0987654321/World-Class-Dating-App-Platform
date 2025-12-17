import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../../services';
import { LoadingSpinner } from '../../components/common';

export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('Verification token is missing. Please check your email link.');
        return;
      }

      try {
        await authService.verifyEmail(token);
        setStatus('success');

        // Start countdown timer for redirect
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              // Check if user is authenticated
              if (authService.isAuthenticated()) {
                navigate('/discover', { replace: true });
              } else {
                navigate('/login', { replace: true });
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      } catch (err: any) {
        setStatus('error');
        setError(
          err.message ||
          'Verification failed. The link may be expired or invalid.'
        );
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

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
          <p className="text-charcoal-500 mt-2">Email Verification</p>
        </div>

        {/* Content based on status */}
        <div className="text-center">
          {status === 'verifying' && (
            <div className="py-8">
              <LoadingSpinner size="lg" />
              <p className="text-charcoal-600 mt-4">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
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
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-charcoal-900 mb-4">
                Email Verified Successfully!
              </h2>
              <p className="text-charcoal-600 mb-6">
                Your email has been verified. You can now access all features of Flamoral.
              </p>

              <div className="bg-flame-50 border border-flame-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-charcoal-600">
                  Redirecting in <span className="font-bold text-flame-600">{countdown}</span> seconds...
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    if (authService.isAuthenticated()) {
                      navigate('/discover', { replace: true });
                    } else {
                      navigate('/login', { replace: true });
                    }
                  }}
                  className="w-full bg-gradient-flamoral text-ivory py-3 rounded-lg font-semibold hover:shadow-flame transition"
                >
                  {authService.isAuthenticated() ? 'Go to Dashboard' : 'Continue to Login'}
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              {/* Error Icon */}
              <div className="mb-6 flex justify-center">
                <div className="w-20 h-20 bg-flame-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-flame-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-charcoal-900 mb-4">
                Verification Failed
              </h2>

              <div className="bg-flame-50 border border-flame-200 text-flame-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>

              <p className="text-charcoal-600 mb-6 text-sm">
                The verification link may have expired or already been used.
                You can request a new verification email.
              </p>

              <div className="flex flex-col gap-3">
                <Link
                  to="/resend-verification"
                  className="w-full bg-gradient-flamoral text-ivory py-3 rounded-lg font-semibold hover:shadow-flame transition text-center"
                >
                  Resend Verification Email
                </Link>
                <Link
                  to="/login"
                  className="w-full bg-charcoal-100 text-charcoal-700 py-3 rounded-lg font-semibold hover:bg-charcoal-200 transition text-center"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}
        </div>

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

export default VerifyEmailPage;
