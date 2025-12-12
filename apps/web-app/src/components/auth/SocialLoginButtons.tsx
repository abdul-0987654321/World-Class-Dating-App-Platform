import React, { useState } from 'react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import AppleSignin from 'react-apple-signin-auth';
import { useSocialAuth } from '../../hooks/useSocialAuth';

interface SocialLoginButtonsProps {
  onSuccess?: (isNewUser: boolean, needsProfileSetup: boolean) => void;
  onError?: (error: Error) => void;
}

const SocialLoginButtonsContent: React.FC<SocialLoginButtonsProps> = ({ onSuccess, onError }) => {
  const { loginWithGoogle, loginWithApple, loginWithFacebook } = useSocialAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading('google');
      try {
        const result = await loginWithGoogle({
          access_token: tokenResponse.access_token,
        });

        if (onSuccess) {
          onSuccess(result.isNewUser, result.needsProfileSetup);
        }
      } catch (error: any) {
        console.error('Google login error:', error);
        if (onError) {
          onError(error);
        }
      } finally {
        setLoading(null);
      }
    },
    onError: (error) => {
      console.error('Google login error:', error);
      if (onError) {
        onError(new Error('Google login failed'));
      }
    },
  });

  const handleAppleLogin = async (response: any) => {
    setLoading('apple');
    try {
      const result = await loginWithApple({
        code: response.authorization.code,
        id_token: response.authorization.id_token,
        user: response.user,
      });

      if (onSuccess) {
        onSuccess(result.isNewUser, result.needsProfileSetup);
      }
    } catch (error: any) {
      console.error('Apple login error:', error);
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading('facebook');
    try {
      // Initialize Facebook SDK
      await new Promise((resolve) => {
        window.fbAsyncInit = function () {
          window.FB.init({
            appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
            cookie: true,
            xfbml: true,
            version: 'v18.0',
          });
          resolve(true);
        };

        // Load Facebook SDK
        if (!document.getElementById('facebook-jssdk')) {
          const script = document.createElement('script');
          script.id = 'facebook-jssdk';
          script.src = 'https://connect.facebook.net/en_US/sdk.js';
          document.body.appendChild(script);
        }
      });

      // Login with Facebook
      window.FB.login(
        async (response: any) => {
          if (response.authResponse) {
            try {
              const result = await loginWithFacebook({
                access_token: response.authResponse.accessToken,
              });

              if (onSuccess) {
                onSuccess(result.isNewUser, result.needsProfileSetup);
              }
            } catch (error: any) {
              console.error('Facebook login error:', error);
              if (onError) {
                onError(error);
              }
            }
          } else {
            console.log('Facebook login cancelled');
          }
          setLoading(null);
        },
        { scope: 'public_profile,email' }
      );
    } catch (error: any) {
      console.error('Facebook login error:', error);
      if (onError) {
        onError(error);
      }
      setLoading(null);
    }
  };

  return (
    <div className="w-full mt-6">
      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-charcoal-300 flex-grow"></div>
        <span className="px-4 text-sm text-charcoal-500">Or continue with</span>
        <div className="border-t border-charcoal-300 flex-grow"></div>
      </div>

      <div className="flex justify-center gap-4">
        {/* Google Button */}
        <button
          onClick={() => handleGoogleLogin()}
          disabled={loading !== null}
          className="flex items-center justify-center w-14 h-14 rounded-full border border-charcoal-300 bg-white hover:bg-charcoal-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Sign in with Google"
        >
          {loading === 'google' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-flame-500"></div>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          )}
        </button>

        {/* Apple Button */}
        <AppleSignin
          authOptions={{
            clientId: import.meta.env.VITE_APPLE_CLIENT_ID || '',
            scope: 'email name',
            redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI || '',
            state: 'state',
            nonce: 'nonce',
            usePopup: true,
          }}
          onSuccess={handleAppleLogin}
          onError={(error: any) => {
            console.error('Apple login error:', error);
            if (onError) {
              onError(new Error('Apple login failed'));
            }
          }}
          render={(props: any) => (
            <button
              {...props}
              disabled={loading !== null}
              className="flex items-center justify-center w-14 h-14 rounded-full border border-charcoal-300 bg-black hover:bg-charcoal-900 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="Sign in with Apple"
            >
              {loading === 'apple' ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
            </button>
          )}
        />

        {/* Facebook Button */}
        <button
          onClick={handleFacebookLogin}
          disabled={loading !== null}
          className="flex items-center justify-center w-14 h-14 rounded-full border border-charcoal-300 bg-[#1877F2] hover:bg-[#166FE5] transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          title="Sign in with Facebook"
        >
          {loading === 'facebook' ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = (props) => {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <SocialLoginButtonsContent {...props} />
    </GoogleOAuthProvider>
  );
};

// Extend Window interface for Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export default SocialLoginButtons;
