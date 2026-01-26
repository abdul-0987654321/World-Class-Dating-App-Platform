/**
 * Okta Login Page
 *
 * Uses Okta Sign-In Widget with Flamoral branding.
 * Supports:
 * - Email/password login
 * - Social logins (Google, Apple, etc.)
 * - MFA verification
 * - Session management
 */

import React, { useEffect, useRef } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import OktaSignIn from '@okta/okta-signin-widget';
import '@okta/okta-signin-widget/css/okta-sign-in.min.css';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';

const OKTA_CLIENT_ID = import.meta.env.VITE_OKTA_CLIENT_ID;
const OKTA_DOMAIN = import.meta.env.VITE_OKTA_DOMAIN;
const OKTA_REDIRECT_URI =
  import.meta.env.VITE_OKTA_REDIRECT_URI || `${window.location.origin}/login/callback`;

export const OktaLoginPage: React.FC = () => {
  const { oktaAuth, authState } = useOktaAuth();
  const location = useLocation();
  const widgetRef = useRef<HTMLDivElement>(null);

  // Get redirect path from location state
  const from = (location.state as { from?: string })?.from || '/discover';

  useEffect(() => {
    if (!widgetRef.current) return;

    const widget = new OktaSignIn({
      baseUrl: `https://${OKTA_DOMAIN}`,
      clientId: OKTA_CLIENT_ID,
      redirectUri: OKTA_REDIRECT_URI,
      authParams: {
        issuer: `https://${OKTA_DOMAIN}/oauth2/default`,
        scopes: ['openid', 'profile', 'email'],
        pkce: true,
      },
      useInteractionCodeFlow: true,
      features: {
        registration: false, // Disable registration on login page
        rememberMe: true,
        selfServiceUnlock: true,
        multiOptionalFactorEnroll: true,
      },
      colors: {
        brand: '#D62839',
      },
      i18n: {
        en: {
          'primaryauth.title': 'Sign in to Flamoral',
          'primaryauth.submit': 'Sign In',
        },
      },
    });

    widget
      .showSignInToGetTokens({
        el: widgetRef.current,
      })
      .then((tokens) => {
        oktaAuth.handleLoginRedirect(tokens);
      })
      .catch((err) => {
        console.error('Sign in error:', err);
      });

    return () => {
      widget.remove();
    };
  }, [oktaAuth]);

  // Loading state
  if (!authState) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        }}
      >
        <div
          className="w-12 h-12 border-3 rounded-full animate-spin"
          style={{
            borderColor: '#2d2d3d',
            borderTopColor: '#D62839',
            borderWidth: '3px',
          }}
        />
      </div>
    );
  }

  // Already signed in - redirect
  if (authState.isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-1/4 -left-24 w-72 h-72 rounded-full filter blur-3xl opacity-30 animate-pulse"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)' }}
        />
        <div
          className="absolute bottom-1/4 -right-24 w-72 h-72 rounded-full filter blur-3xl opacity-30 animate-pulse"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
            animationDelay: '2s',
          }}
        />
      </div>

      {/* Main card */}
      <div className="relative w-full max-w-md">
        {/* Logo header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <FlamoralLogo variant="horizontal" size="lg" />
          </Link>
          <p className="text-gray-400 text-sm">Welcome back! Sign in to continue.</p>
        </div>

        {/* Okta Sign-In Widget container */}
        <div
          ref={widgetRef}
          className="okta-signin-wrapper"
          style={
            {
              '--okta-primary-color': '#D62839',
            } as React.CSSProperties
          }
        />

        {/* Additional links */}
        <div className="mt-6 text-center">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="text-[#D62839] hover:text-[#B82232] font-semibold transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>

        {/* Terms */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs">
            By continuing, you agree to our{' '}
            <Link to="/terms-of-service" className="text-gray-400 hover:text-white underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-gray-400 hover:text-white underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      {/* Custom styles for Okta widget */}
      <style>{`
        .okta-signin-wrapper #okta-sign-in {
          margin: 0 auto;
          border: none;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border-radius: 1.5rem;
        }
        .okta-signin-wrapper #okta-sign-in .auth-content {
          padding: 2rem;
        }
        .okta-signin-wrapper #okta-sign-in .o-form-button-bar .button-primary {
          background: #D62839;
          border-color: #D62839;
          border-radius: 0.75rem;
          min-height: 48px;
          font-weight: 600;
        }
        .okta-signin-wrapper #okta-sign-in .o-form-button-bar .button-primary:hover {
          background: #B82232;
          border-color: #B82232;
        }
        .okta-signin-wrapper #okta-sign-in .o-form-input-name-identifier input,
        .okta-signin-wrapper #okta-sign-in .o-form-input-name-credentials\\.passcode input {
          border-radius: 0.75rem;
        }
        .okta-signin-wrapper #okta-sign-in .link {
          color: #D62839;
        }
        .okta-signin-wrapper #okta-sign-in .link:hover {
          color: #B82232;
        }
      `}</style>
    </div>
  );
};

export default OktaLoginPage;
