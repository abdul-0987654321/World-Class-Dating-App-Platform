import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { useSocialAuth } from '@hooks/useSocialAuth';

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
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.buttonContainer}>
        {/* Google Button */}
        <TouchableOpacity
          style={[styles.socialButton, styles.googleButton]}
          onPress={handleGoogleLogin}
          disabled={loading !== null}
        >
          <GoogleIcon />
          {loading === 'google' && <Text style={styles.loadingText}>...</Text>}
        </TouchableOpacity>

        {/* Apple Button - iOS only */}
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={handleAppleLogin}
            disabled={loading !== null}
          >
            <AppleIcon />
            {loading === 'apple' && <Text style={styles.loadingText}>...</Text>}
          </TouchableOpacity>
        )}

        {/* Facebook Button */}
        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={handleFacebookLogin}
          disabled={loading !== null}
        >
          <FacebookIcon />
          {loading === 'facebook' && <Text style={styles.loadingText}>...</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Social Media Icons (simple SVG representations)
const GoogleIcon = () => (
  <View style={styles.icon}>
    <Text style={styles.iconText}>G</Text>
  </View>
);

const AppleIcon = () => (
  <View style={styles.icon}>
    <Text style={styles.iconText}></Text>
  </View>
);

const FacebookIcon = () => (
  <View style={styles.icon}>
    <Text style={styles.iconText}>f</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#666',
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#fff',
  },
  appleButton: {
    backgroundColor: '#000',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  loadingText: {
    position: 'absolute',
    bottom: -20,
    fontSize: 12,
    color: '#666',
  },
});

export default SocialLoginButtons;
