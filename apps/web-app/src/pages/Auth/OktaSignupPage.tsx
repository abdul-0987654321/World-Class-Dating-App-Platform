/**
 * Okta Signup Page
 *
 * Uses Okta Sign-In Widget in registration mode with Flamoral branding.
 * Supports:
 * - Email/password registration
 * - Social signups (Google, Apple, etc.)
 * - Email verification
 * - MFA setup
 */

import React, { useEffect, useRef } from 'react';
import { useOktaAuth } from '@okta/okta-react';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import OktaSignIn from '@okta/okta-signin-widget';
import '@okta/okta-signin-widget/css/okta-sign-in.min.css';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';

const OKTA_CLIENT_ID = import.meta.env.VITE_OKTA_CLIENT_ID;
const OKTA_DOMAIN = import.meta.env.VITE_OKTA_DOMAIN;
const OKTA_REDIRECT_URI =
  import.meta.env.VITE_OKTA_REDIRECT_URI || `${window.location.origin}/login/callback`;

export const OktaSignupPage: React.FC = () => {
  const { oktaAuth, authState } = useOktaAuth();
  const [searchParams] = useSearchParams();
  const tierParam = searchParams.get('tier');
  const widgetRef = useRef<HTMLDivElement>(null);

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
        registration: true, // Enable registration
        rememberMe: true,
        selfServiceUnlock: true,
        multiOptionalFactorEnroll: true,
      },
      // Start in registration mode
      registration: {
        parseSchema: (schema, onSuccess) => {
          // Customize registration schema if needed
          onSuccess(schema);
        },
        preSubmit: (postData, onSuccess) => {
          onSuccess(postData);
        },
        postSubmit: (response, onSuccess) => {
          onSuccess(response);
        },
      },
      colors: {
        brand: '#D62839',
      },
      i18n: {
        en: {
          'primaryauth.title': 'Create your Flamoral account',
          'registration.signup.text': 'Create Account',
          'registration.signup.label': 'Already have an account?',
          'registration.signup.linkText': 'Sign In',
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
        console.error('Sign up error:', err);
      });

    // Show registration form by default
    setTimeout(() => {
      const registerLink = document.querySelector('.registration-link') as HTMLElement;
      if (registerLink) {
        registerLink.click();
      }
    }, 100);

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
          background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        }}
      >
        <div
          className="w-12 h-12 border-3 rounded-full animate-spin"
          style={{
            borderColor: '#e5e7eb',
            borderTopColor: '#D62839',
            borderWidth: '3px',
          }}
        />
      </div>
    );
  }

  // Already signed in - redirect
  if (authState.isAuthenticated) {
    if (tierParam) {
      return <Navigate to={`/subscription?tier=${tierParam}`} replace />;
    }
    return <Navigate to="/profile-setup" replace />;
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12 relative overflow-x-hidden"
      style={{
        background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* Main content */}
      <div className="relative w-full max-w-md sm:max-w-lg">
        {/* Logo header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center mb-4">
            <FlamoralLogo variant="primary" size="lg" showTagline={true} />
          </Link>
          <p className="text-gray-600 text-base font-medium">
            {tierParam
              ? `Join Flamoral ${tierParam.charAt(0).toUpperCase() + tierParam.slice(1)}`
              : 'Create your account'}
          </p>
        </div>

        {/* Okta Sign-Up Widget container */}
        <div
          ref={widgetRef}
          className="okta-signup-wrapper"
          style={
            {
              '--okta-primary-color': '#D62839',
            } as React.CSSProperties
          }
        />

        {/* Additional links */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-sm">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-[#D62839] hover:text-[#B82232] font-semibold transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Terms */}
        <div className="mt-6 text-center">
          <p className="text-gray-500 text-xs leading-relaxed">
            By signing up, you agree to our{' '}
            <Link to="/terms-of-service" className="text-[#D62839] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-[#D62839] hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      {/* Custom styles for Okta widget */}
      <style>{`
        .okta-signup-wrapper #okta-sign-in {
          margin: 0 auto;
          border: 1px solid #e5e7eb;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          border-radius: 1.5rem;
        }
        .okta-signup-wrapper #okta-sign-in .auth-content {
          padding: 2rem;
        }
        .okta-signup-wrapper #okta-sign-in .o-form-button-bar .button-primary {
          background: #D62839;
          border-color: #D62839;
          border-radius: 0.75rem;
          min-height: 48px;
          font-weight: 600;
        }
        .okta-signup-wrapper #okta-sign-in .o-form-button-bar .button-primary:hover {
          background: #B82232;
          border-color: #B82232;
        }
        .okta-signup-wrapper #okta-sign-in .o-form-input input {
          border-radius: 0.75rem;
        }
        .okta-signup-wrapper #okta-sign-in .link {
          color: #D62839;
        }
        .okta-signup-wrapper #okta-sign-in .link:hover {
          color: #B82232;
        }
        .okta-signup-wrapper #okta-sign-in .social-auth-button {
          border-radius: 0.75rem;
        }
      `}</style>
    </div>
  );
};

export default OktaSignupPage;
