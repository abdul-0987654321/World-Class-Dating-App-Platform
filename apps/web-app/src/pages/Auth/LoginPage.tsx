import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate('/discover');
    } catch (err: unknown) {
      // Provide user-friendly error messages based on error type
      let errorMessage = 'Login failed. Please try again.';

      if (err instanceof Error) {
        // Handle specific error types
        if (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('connect')
        ) {
          errorMessage =
            'Unable to connect to server. Please check your internet connection and try again.';
        } else if (err.message.includes('timeout') || err.message.includes('timed out')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (err.message) {
          errorMessage = err.message;
        }
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMessage = (err as { message: string }).message || errorMessage;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {/* Animated background gradient orbs - responsive sizing */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 -left-16 sm:-left-24 md:-left-32 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 rounded-full filter blur-3xl opacity-30 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
        />
        <div
          className="absolute bottom-1/4 -right-16 sm:-right-24 md:-right-32 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 rounded-full filter blur-3xl opacity-30 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            animationDelay: '2s',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] max-w-[37.5rem] h-[80vw] max-h-[37.5rem] rounded-full filter blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }}
        />
      </div>

      {/* Grid pattern overlay - responsive grid size */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: 'clamp(2rem, 5vw, 3.125rem) clamp(2rem, 5vw, 3.125rem)',
        }}
      />

      {/* Main card - responsive width and padding */}
      <div
        className="relative w-full max-w-[calc(100%-2rem)] sm:max-w-md md:max-w-lg backdrop-blur-xl rounded-2xl sm:rounded-3xl border shadow-2xl overflow-hidden"
        style={{
          background: 'rgba(26, 26, 46, 0.8)',
          borderColor: 'rgba(139, 92, 246, 0.2)',
          boxShadow: '0 0 60px rgba(236, 72, 153, 0.15), 0 0 100px rgba(139, 92, 246, 0.1)',
        }}
      >
        {/* Top gradient line */}
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)' }}
        />

        <div className="p-4 sm:p-6 md:p-8">
          {/* Logo */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex items-center justify-center mb-2 sm:mb-3">
              <FlamoralLogo variant="horizontal" size="lg" />
            </div>
            <p className="text-gray-400 text-xs sm:text-sm tracking-wide">
              Where Passion Meets Connection.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm border"
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="break-words">{error}</span>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="login-email"
                className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2"
              >
                Email <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <input
                  id="login-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-4 rounded-lg sm:rounded-xl transition-all duration-300 text-white placeholder-gray-500 focus:outline-none focus:ring-2 text-sm sm:text-base"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(236, 72, 153, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your email"
                  required
                  aria-required="true"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs sm:text-sm font-medium text-gray-300 mb-1.5 sm:mb-2"
              >
                Password <span className="text-pink-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-4 rounded-lg sm:rounded-xl transition-all duration-300 text-white placeholder-gray-500 focus:outline-none focus:ring-2 text-sm sm:text-base"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(236, 72, 153, 0.5)';
                    e.target.style.boxShadow = '0 0 20px rgba(236, 72, 153, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(139, 92, 246, 0.2)';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your password"
                  required
                  aria-required="true"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-xs sm:text-sm text-gray-400 hover:text-pink-400 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="relative w-full py-4 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base text-white overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              style={{
                background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #3b82f6 100%)',
              }}
              aria-busy={loading}
            >
              {/* Hover shimmer effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, #f472b6 0%, #a78bfa 50%, #60a5fa 100%)',
                }}
              />
              {/* Glow on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                }}
              />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Social Login */}
          <SocialLoginButtons
            onSuccess={(isNewUser, needsProfileSetup) => {
              if (needsProfileSetup) {
                navigate('/profile-setup');
              } else {
                navigate('/discover');
              }
            }}
            onError={(error) => {
              setError(error.message || 'Social login failed');
            }}
          />

          {/* Sign up link */}
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold transition-colors"
                style={{
                  background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom gradient line */}
        <div
          className="h-0.5 sm:h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)' }}
        />
      </div>
    </div>
  );
};

export default LoginPage;
