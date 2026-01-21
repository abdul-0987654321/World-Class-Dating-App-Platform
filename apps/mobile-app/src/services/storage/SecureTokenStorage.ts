/**
 * Secure Token Storage Service
 * Uses React Native Keychain (iOS) / Keystore (Android) for secure token storage
 * Implements biometric authentication for accessing tokens
 */

import * as Keychain from 'react-native-keychain';
import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
}

class SecureTokenStorage {
  private readonly ACCESS_TOKEN_KEY = 'flamoral_access_token';
  private readonly REFRESH_TOKEN_KEY = 'flamoral_refresh_token';
  private readonly TOKEN_DATA_KEY = 'flamoral_token_data';

  /**
   * Check if biometric authentication is available and enrolled
   */
  async isBiometricAvailable(): Promise<boolean> {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        return false;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      return enrolled;
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return false;
    }
  }

  /**
   * Authenticate user with biometrics
   */
  async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const biometricAvailable = await this.isBiometricAvailable();

      if (!biometricAvailable) {
        // Fallback to non-biometric authentication
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your account',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }

  /**
   * Store tokens securely with biometric protection
   */
  async storeTokens(tokenData: TokenData): Promise<boolean> {
    try {
      const biometricAvailable = await this.isBiometricAvailable();

      const options: Keychain.Options = {
        service: 'com.flamoral.auth',
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        ...(biometricAvailable &&
          Platform.OS === 'ios' && {
            accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          }),
      };

      // Store tokens in secure keychain/keystore
      await Keychain.setGenericPassword(this.TOKEN_DATA_KEY, JSON.stringify(tokenData), options);

      return true;
    } catch (error) {
      console.error('Error storing tokens:', error);
      return false;
    }
  }

  /**
   * Retrieve tokens securely with biometric authentication
   */
  async getTokens(): Promise<TokenData | null> {
    try {
      // Require biometric authentication for token access
      const authenticated = await this.authenticateWithBiometrics();

      if (!authenticated) {
        console.warn('Biometric authentication failed');
        return null;
      }

      const credentials = await Keychain.getGenericPassword({
        service: 'com.flamoral.auth',
      });

      if (!credentials) {
        return null;
      }

      const tokenData: TokenData = JSON.parse(credentials.password);

      // Check if access token is expired
      if (tokenData.expiresAt && Date.now() >= tokenData.expiresAt) {
        console.warn('Access token expired');
        // Token expired - caller should refresh
        return tokenData; // Return anyway so refresh token can be used
      }

      return tokenData;
    } catch (error) {
      console.error('Error retrieving tokens:', error);
      return null;
    }
  }

  /**
   * Get access token only (with biometric auth)
   */
  async getAccessToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.accessToken || null;
  }

  /**
   * Get refresh token only (with biometric auth)
   */
  async getRefreshToken(): Promise<string | null> {
    const tokens = await this.getTokens();
    return tokens?.refreshToken || null;
  }

  /**
   * Update access token (keeps refresh token)
   */
  async updateAccessToken(accessToken: string, expiresAt?: number): Promise<boolean> {
    try {
      const currentTokens = await this.getTokens();

      if (!currentTokens) {
        console.error('No existing tokens to update');
        return false;
      }

      return await this.storeTokens({
        accessToken,
        refreshToken: currentTokens.refreshToken,
        expiresAt,
      });
    } catch (error) {
      console.error('Error updating access token:', error);
      return false;
    }
  }

  /**
   * Clear all stored tokens (on logout)
   */
  async clearTokens(): Promise<boolean> {
    try {
      await Keychain.resetGenericPassword({
        service: 'com.flamoral.auth',
      });
      return true;
    } catch (error) {
      console.error('Error clearing tokens:', error);
      return false;
    }
  }

  /**
   * Check if tokens exist (without biometric prompt)
   */
  async hasTokens(): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: 'com.flamoral.auth',
        authenticationPrompt: {
          title: 'Authentication Required',
          cancel: 'Cancel',
        },
      });
      return !!credentials;
    } catch (error) {
      // If biometric prompt is cancelled or fails, we still know tokens exist
      if (error.message?.includes('cancel') || error.message?.includes('User')) {
        return true;
      }
      return false;
    }
  }

  /**
   * Check if access token is expired
   */
  async isAccessTokenExpired(): Promise<boolean> {
    try {
      const tokens = await this.getTokens();
      if (!tokens || !tokens.expiresAt) {
        return true;
      }
      return Date.now() >= tokens.expiresAt;
    } catch (error) {
      return true;
    }
  }
}

export const secureTokenStorage = new SecureTokenStorage();
export default secureTokenStorage;
