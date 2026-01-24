import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { useSocialAuth } from '@hooks/useSocialAuth';
import {
  AUTH_COLORS,
  AUTH_TYPOGRAPHY,
  AUTH_SPACING,
  AUTH_SHADOWS,
  moderateScale,
} from '../../styles/auth.styles';

// Get Google client IDs from app config
const GOOGLE_WEB_CLIENT_ID =
  Constants.expoConfig?.extra?.googleWebClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '';
const GOOGLE_IOS_CLIENT_ID =
  Constants.expoConfig?.extra?.googleIosClientId || process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

interface SocialLoginButtonsProps {
  onSuccess?: (isNewUser: boolean, needsProfileSetup: boolean) => void;
  onError?: (error: Error) => void;
  style?: any;
}

const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({ onSuccess, onError, style }) => {
  const { loginWithGoogle, loginWithApple, loginWithFacebook } = useSocialAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading('google');
    try {
      // Configure Google Sign In
      await GoogleSignin.configure({
        webClientId: GOOGLE_WEB_CLIENT_ID,
        iosClientId: GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
      });

      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();

      // Get user info and tokens
      const userInfo = await GoogleSignin.signIn();

      // Get tokens
      const tokens = await GoogleSignin.getTokens();

      // Send to backend
      const result = await loginWithGoogle({
        id_token: userInfo.idToken || tokens.idToken,
        access_token: tokens.accessToken,
      });

      if (onSuccess) {
        onSuccess(result.isNewUser, result.needsProfileSetup);
      }
    } catch (error: any) {
      console.error('Google login error:', error);

      let errorMessage = 'Google login failed';

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errorMessage = 'Login cancelled';
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errorMessage = 'Login already in progress';
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMessage = 'Google Play Services not available';
      }

      Alert.alert('Google Login Failed', errorMessage);
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Error', 'Apple Sign In is only available on iOS devices');
      return;
    }

    setLoading('apple');
    try {
      // Perform Apple login request
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });

      // Get credential state
      const credentialState = await appleAuth.getCredentialStateForUser(
        appleAuthRequestResponse.user
      );

      if (credentialState === appleAuth.State.AUTHORIZED) {
        // Send to backend
        const result = await loginWithApple({
          code: appleAuthRequestResponse.authorizationCode || '',
          id_token: appleAuthRequestResponse.identityToken || '',
          user: appleAuthRequestResponse.fullName
            ? {
                name: {
                  firstName: appleAuthRequestResponse.fullName.givenName || undefined,
                  lastName: appleAuthRequestResponse.fullName.familyName || undefined,
                },
                email: appleAuthRequestResponse.email || undefined,
              }
            : undefined,
        });

        if (onSuccess) {
          onSuccess(result.isNewUser, result.needsProfileSetup);
        }
      } else {
        throw new Error('Apple Sign In failed - credential not authorized');
      }
    } catch (error: any) {
      console.error('Apple login error:', error);

      if (error.code !== appleAuth.Error.CANCELED) {
        Alert.alert('Apple Sign In Failed', error.message || 'Failed to sign in with Apple');
        if (onError) {
          onError(error);
        }
      }
    } finally {
      setLoading(null);
    }
  };

  const handleFacebookLogin = async () => {
    setLoading('facebook');
    try {
      // Attempt login with permissions
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

      if (result.isCancelled) {
        setLoading(null);
        return;
      }

      // Get access token
      const data = await AccessToken.getCurrentAccessToken();

      if (!data) {
        throw new Error('Failed to get Facebook access token');
      }

      // Send to backend
      const authResult = await loginWithFacebook({
        access_token: data.accessToken,
      });

      if (onSuccess) {
        onSuccess(authResult.isNewUser, authResult.needsProfileSetup);
      }
    } catch (error: any) {
      console.error('Facebook login error:', error);
      Alert.alert('Facebook Login Failed', error.message || 'Failed to login with Facebook');
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.divider} accessibilityElementsHidden importantForAccessibility="no">
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View
        style={styles.buttonContainer}
        accessibilityRole="group"
        accessibilityLabel="Social login options"
      >
        {/* Google Button */}
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={loading !== null}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            loading === 'google' ? 'Signing in with Google' : 'Continue with Google'
          }
          accessibilityState={{ disabled: loading !== null, busy: loading === 'google' }}
          accessibilityHint="Sign in using your Google account"
        >
          {loading === 'google' ? (
            <ActivityIndicator color={AUTH_COLORS.text.primary} size="small" />
          ) : (
            <GoogleIcon />
          )}
        </TouchableOpacity>

        {/* Apple Button - iOS only */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={loading !== null}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              loading === 'apple' ? 'Signing in with Apple' : 'Continue with Apple'
            }
            accessibilityState={{ disabled: loading !== null, busy: loading === 'apple' }}
            accessibilityHint="Sign in using your Apple ID"
          >
            {loading === 'apple' ? (
              <ActivityIndicator color={AUTH_COLORS.text.inverse} size="small" />
            ) : (
              <AppleIcon />
            )}
          </TouchableOpacity>
        )}

        {/* Facebook Button */}
        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={handleFacebookLogin}
          disabled={loading !== null}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            loading === 'facebook' ? 'Signing in with Facebook' : 'Continue with Facebook'
          }
          accessibilityState={{ disabled: loading !== null, busy: loading === 'facebook' }}
          accessibilityHint="Sign in using your Facebook account"
        >
          {loading === 'facebook' ? (
            <ActivityIndicator color={AUTH_COLORS.text.inverse} size="small" />
          ) : (
            <FacebookIcon />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Social Media Icons (simple representations)
const GoogleIcon = () => (
  <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
    <Text style={[styles.iconText, styles.googleIconText]}>G</Text>
  </View>
);

const AppleIcon = () => (
  <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
    <Text style={[styles.iconText, styles.appleIconText]}></Text>
  </View>
);

const FacebookIcon = () => (
  <View style={styles.icon} accessibilityElementsHidden importantForAccessibility="no">
    <Text style={[styles.iconText, styles.facebookIconText]}>f</Text>
  </View>
);

// Styles using shared design tokens for consistency
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: AUTH_SPACING.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: AUTH_SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AUTH_COLORS.border.default,
  },
  dividerText: {
    marginHorizontal: AUTH_SPACING.sm,
    color: AUTH_COLORS.text.secondary,
    fontSize: AUTH_TYPOGRAPHY.fontSize.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: AUTH_SPACING.lg,
  },
  socialButton: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AUTH_COLORS.border.default,
    backgroundColor: AUTH_COLORS.background,
    ...AUTH_SHADOWS.md,
    minWidth: moderateScale(60),
    minHeight: moderateScale(60),
  },
  googleButton: {
    backgroundColor: AUTH_COLORS.social.google,
  },
  appleButton: {
    backgroundColor: AUTH_COLORS.social.apple,
    borderColor: AUTH_COLORS.social.apple,
  },
  facebookButton: {
    backgroundColor: AUTH_COLORS.social.facebook,
    borderColor: AUTH_COLORS.social.facebook,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: AUTH_TYPOGRAPHY.fontSize['2xl'],
    fontWeight: AUTH_TYPOGRAPHY.fontWeight.bold,
  },
  googleIconText: {
    color: AUTH_COLORS.text.primary,
  },
  appleIconText: {
    color: AUTH_COLORS.text.inverse,
  },
  facebookIconText: {
    color: AUTH_COLORS.text.inverse,
  },
});

export default SocialLoginButtons;
