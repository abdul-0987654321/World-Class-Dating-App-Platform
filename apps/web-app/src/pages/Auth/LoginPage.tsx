import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services';
import SocialLoginButtons from '../../components/auth/SocialLoginButtons';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authService.login(email, password);
      navigate('/discover');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillTestAccount = (num: 1 | 2) => {
    if (num === 1) {
      setEmail('test1@flamoral.com');
      setPassword('TestUser1!');
    } else {
      setEmail('test2@flamoral.com');
      setPassword('TestUser2!');
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
              {error}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-flamoral text-ivory py-3 rounded-lg font-semibold hover:shadow-flame transition disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-charcoal-200">
          <p className="text-sm text-charcoal-500 text-center mb-4">Quick login with test accounts:</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => fillTestAccount(1)}
              className="px-4 py-2 bg-charcoal-100 hover:bg-charcoal-200 rounded-lg text-sm font-medium text-charcoal-700 transition"
            >
              Test User 1 (Alex)
            </button>
            <button
              onClick={() => fillTestAccount(2)}
              className="px-4 py-2 bg-charcoal-100 hover:bg-charcoal-200 rounded-lg text-sm font-medium text-charcoal-700 transition"
            >
              Test User 2 (Jordan)
            </button>
          </div>
        </div>

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
