import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services';
import { FlamoralBackground } from '@/components/theme';

type ResetState = 'form' | 'loading' | 'success' | 'error' | 'expired' | 'invalid_token';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ResetState>('form');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setState('invalid_token');
      setError('No reset token provided. Please request a new password reset link.');
    }
  }, [token]);

  const validatePassword = (password: string): { valid: boolean; message: string } => {
    if (password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters' };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain an uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain a lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain a number' };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return { valid: false, message: 'Password must contain a special character' };
    }
    return { valid: true, message: '' };
  };

  const getPasswordStrength = (
    password: string
  ): { strength: number; label: string; color: string } => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength: 1, label: 'Weak', color: 'bg-red-500' };
    if (strength <= 4) return { strength: 2, label: 'Medium', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Strong', color: 'bg-green-500' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    setError('');

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setFormErrors({ password: passwordValidation.message });
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setFormErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    if (!token) {
      setState('invalid_token');
      return;
    }

    setState('loading');

    try {
      await authService.resetPassword(token, newPassword);
      setState('success');

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';

      if (errorMessage.toLowerCase().includes('expired')) {
        setState('expired');
        setError('Your password reset link has expired. Please request a new one.');
      } else if (
        errorMessage.toLowerCase().includes('invalid') ||
        errorMessage.toLowerCase().includes('token')
      ) {
        setState('invalid_token');
        setError('Invalid or expired reset link. Please request a new password reset.');
      } else if (errorMessage.toLowerCase().includes('breached')) {
        setState('form');
        setFormErrors({
          password:
            'This password has been found in data breaches. Please choose a different password.',
        });
      } else {
        setState('error');
        setError(errorMessage || 'Password reset failed. Please try again.');
      }
    }
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-fm-pink/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-fm-pink animate-spin" viewBox="0 0 24 24">
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
            <h1 className="text-2xl font-bold text-fm-text-primary mb-4">Resetting Password</h1>
            <p className="text-fm-text-secondary">Please wait...</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-green-400"
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
            <h1 className="text-2xl font-bold text-fm-text-primary mb-4">Password Reset!</h1>
            <p className="text-fm-text-secondary mb-6">
              Your password has been successfully reset. You can now log in with your new password.
            </p>
            <p className="text-sm text-fm-text-secondary mb-6">Redirecting to login...</p>
            <Link
              to="/login"
              className="inline-block px-6 py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Go to Login
            </Link>
          </div>
        );

      case 'expired':
      case 'invalid_token':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-amber-400"
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
            <h1 className="text-2xl font-bold text-fm-text-primary mb-4">
              {state === 'expired' ? 'Link Expired' : 'Invalid Link'}
            </h1>
            <p className="text-fm-text-secondary mb-6">{error}</p>
            <Link
              to="/forgot-password"
              className="inline-block px-6 py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Request New Reset Link
            </Link>
            <p className="mt-6 text-sm text-fm-text-secondary">
              <Link to="/login" className="text-fm-pink hover:underline">
                Back to Login
              </Link>
            </p>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-400"
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
            <h1 className="text-2xl font-bold text-fm-text-primary mb-4">Reset Failed</h1>
            <p className="text-fm-text-secondary mb-6">{error}</p>
            <button
              onClick={() => setState('form')}
              className="px-6 py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <p className="mt-6 text-sm text-fm-text-secondary">
              <Link to="/forgot-password" className="text-fm-pink hover:underline">
                Request new reset link
              </Link>
            </p>
          </div>
        );

      case 'form':
      default:
        return (
          <>
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-2xl font-bold text-fm-text-primary mb-2">
                Create New Password
              </h1>
              <p className="text-sm sm:text-base text-fm-text-secondary">
                Your new password must be different from previously used passwords.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-xs sm:text-sm font-medium text-fm-text-secondary mb-1.5 sm:mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-fm-surface border rounded-lg text-sm sm:text-base text-fm-text-primary placeholder-fm-text-secondary/50 focus:ring-2 focus:ring-fm-pink focus:border-transparent transition pr-12 ${
                      formErrors.password ? 'border-red-500' : 'border-white/10'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-fm-text-secondary hover:text-fm-text-primary"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-400 text-sm mt-1">{formErrors.password}</p>
                )}

                {/* Password strength indicator */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-fm-surface rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all`}
                          style={{ width: `${(passwordStrength.strength / 3) * 100}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          passwordStrength.strength === 1
                            ? 'text-red-400'
                            : passwordStrength.strength === 2
                              ? 'text-yellow-400'
                              : 'text-green-400'
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Password requirements */}
                <div className="mt-3 text-xs text-fm-text-secondary space-y-1">
                  <p className={newPassword.length >= 8 ? 'text-green-400' : ''}>
                    {newPassword.length >= 8 ? '\u2713' : '\u25CB'} At least 8 characters
                  </p>
                  <p className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>
                    {/[A-Z]/.test(newPassword) ? '\u2713' : '\u25CB'} One uppercase letter
                  </p>
                  <p className={/[a-z]/.test(newPassword) ? 'text-green-400' : ''}>
                    {/[a-z]/.test(newPassword) ? '\u2713' : '\u25CB'} One lowercase letter
                  </p>
                  <p className={/[0-9]/.test(newPassword) ? 'text-green-400' : ''}>
                    {/[0-9]/.test(newPassword) ? '\u2713' : '\u25CB'} One number
                  </p>
                  <p className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-400' : ''}>
                    {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? '\u2713' : '\u25CB'} One special
                    character
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs sm:text-sm font-medium text-fm-text-secondary mb-1.5 sm:mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-fm-surface border rounded-lg text-sm sm:text-base text-fm-text-primary placeholder-fm-text-secondary/50 focus:ring-2 focus:ring-fm-pink focus:border-transparent transition ${
                    formErrors.confirmPassword ? 'border-red-500' : 'border-white/10'
                  }`}
                />
                {formErrors.confirmPassword && (
                  <p className="text-red-400 text-xs sm:text-sm mt-1">
                    {formErrors.confirmPassword}
                  </p>
                )}
                {confirmPassword && (
                  <p
                    className={`text-xs sm:text-sm mt-1 ${
                      newPassword === confirmPassword ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {newPassword === confirmPassword
                      ? '\u2713 Passwords match'
                      : '\u2717 Passwords do not match'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-fm-pink to-fm-blue text-white text-sm sm:text-base font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Reset Password
              </button>
            </form>

            <p className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-fm-text-secondary">
              Remember your password?{' '}
              <Link to="/login" className="text-fm-pink hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </>
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

export default ResetPasswordPage;
