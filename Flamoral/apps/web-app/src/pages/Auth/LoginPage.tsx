import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authService } from '../../services';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);

  // Get the return URL from location state or default to /discover
  const from = (location.state as any)?.from?.pathname || '/discover';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowResendLink(false);
    setLoading(true);

    try {
      const response = await authService.login(email, password);

      // Check if user needs email verification
      if (response.user && !response.user.isVerified) {
        setError('Please verify your email address before logging in. Check your inbox for the verification link.');
        setShowResendLink(true);
        setLoading(false);
        return;
      }

      // Navigate to the return URL or default to /discover
      navigate(from, { replace: true });
    } catch (err: any) {
      // Check for specific verification error
      if (err.message?.toLowerCase().includes('verify') || err.message?.toLowerCase().includes('verification') || err.message?.toLowerCase().includes('not verified')) {
        setError('Please verify your email address to continue. Check your inbox for the verification link.');
        setShowResendLink(true);
      } else {
        setError(err.message || 'Login failed');
      }
    } finally {
      setLoading(false);
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
          <p className="text-charcoal-500 mt-2">Where Passion Meets Connection</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-flame-50 border border-flame-200 text-flame-600 px-4 py-3 rounded-lg text-sm">
              <p className="mb-2">{error}</p>
              {showResendLink && (
                <Link
                  to="/resend-verification"
                  className="text-flame-700 hover:text-flame-800 font-medium underline inline-block"
                >
                  Resend verification email
                </Link>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus:ring-2 focus:ring-flame-500 focus:border-transparent transition text-charcoal-900"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-charcoal-300 rounded-lg focus:ring-2 focus:ring-flame-500 focus:border-transparent transition text-charcoal-900"
              placeholder="Enter your password"
              required
            />
            <div className="mt-2 text-right">
              <Link to="/forgot-password" className="text-sm text-charcoal-500 hover:text-flame-500 transition">
                Forgot Password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-flamoral text-ivory py-3 rounded-lg font-semibold hover:shadow-flame transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

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

        <div className="mt-6 text-center">
          <p className="text-sm text-charcoal-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-flame-500 hover:text-flame-600 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
