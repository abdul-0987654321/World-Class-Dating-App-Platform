import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services';
import { FlamoralBackground } from '@/components/theme';

type VerificationState = 'loading' | 'success' | 'error' | 'expired' | 'already_verified';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('error');
      setError('No verification token provided. Please check your email link.');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      await authService.verifyEmail(verificationToken);
      setState('success');

      // Redirect to discover page after 3 seconds
      setTimeout(() => {
        navigate('/discover');
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';

      if (errorMessage.toLowerCase().includes('expired')) {
        setState('expired');
        setError('Your verification link has expired. Please request a new one.');
      } else if (errorMessage.toLowerCase().includes('already verified')) {
        setState('already_verified');
      } else if (errorMessage.toLowerCase().includes('invalid')) {
        setState('error');
        setError('Invalid verification token. Please check your email link or request a new one.');
      } else {
        setState('error');
        setError(errorMessage || 'Email verification failed. Please try again.');
      }
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendSuccess(false);

    try {
      await authService.resendVerificationEmail();
      setResendSuccess(true);
    } catch (err) {
      setError('Failed to resend verification email. Please try again later.');
    } finally {
      setResendLoading(false);
    }
  };

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-fm-pink/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-fm-pink animate-spin"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-3 sm:mb-4">
              Verifying Your Email
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary">
              Please wait while we verify your email address...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-3 sm:mb-4">
              Email Verified!
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary mb-4 sm:mb-6">
              Your email has been successfully verified. You can now access all features of
              Flamoral.
            </p>
            <p className="text-xs sm:text-sm text-fm-text-secondary mb-4 sm:mb-6">
              Redirecting you to the app...
            </p>
            <Link
              to="/discover"
              className="inline-block px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Start Discovering
            </Link>
          </div>
        );

      case 'already_verified':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-blue-400"
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
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-3 sm:mb-4">
              Already Verified
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary mb-4 sm:mb-6">
              Your email address has already been verified. You're all set!
            </p>
            <Link
              to="/discover"
              className="inline-block px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Go to App
            </Link>
          </div>
        );

      case 'expired':
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-3 sm:mb-4">
              Link Expired
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary mb-4 sm:mb-6 break-words">
              {error}
            </p>

            {resendSuccess ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <p className="text-green-400 text-sm sm:text-base">
                  A new verification email has been sent. Please check your inbox.
                </p>
              </div>
            ) : (
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            )}

            <p className="mt-4 sm:mt-6 text-xs sm:text-sm text-fm-text-secondary">
              <Link to="/login" className="text-fm-pink hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        );

      case 'error':
      default:
        return (
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <svg
                className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-red-400"
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
            <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-3 sm:mb-4">
              Verification Failed
            </h1>
            <p className="text-sm sm:text-base text-fm-text-secondary mb-4 sm:mb-6 break-words">
              {error}
            </p>

            <div className="space-y-3 sm:space-y-4">
              {resendSuccess ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 sm:p-4">
                  <p className="text-green-400 text-sm sm:text-base">
                    A new verification email has been sent. Please check your inbox.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {resendLoading ? 'Sending...' : 'Request New Verification Link'}
                </button>
              )}

              <p className="text-xs sm:text-sm text-fm-text-secondary">
                <Link to="/login" className="text-fm-pink hover:underline">
                  Back to Login
                </Link>
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <FlamoralBackground>
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
        <div className="w-full max-w-[calc(100%-2rem)] sm:max-w-md bg-fm-surface/80 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/10 p-5 sm:p-6 md:p-8">
          {renderContent()}
        </div>
      </div>
    </FlamoralBackground>
  );
};

export default VerifyEmailPage;
