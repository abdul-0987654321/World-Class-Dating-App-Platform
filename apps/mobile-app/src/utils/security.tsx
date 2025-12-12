/**
 * Mobile Security Utilities
 *
 * Features:
 * - Root/Jailbreak Detection
 * - Screenshot Protection
 * - Device Integrity Checks
 */

import { Platform, Alert } from 'react-native';
import JailMonkey from 'jail-monkey';
import * as ScreenCapture from 'react-native-screen-capture';
import logger from './logger';

export interface SecurityCheck {
  isRooted: boolean;
  isJailbroken: boolean;
  isDebugMode: boolean;
  canMockLocation: boolean;
  isOnExternalStorage: boolean;
  hasXposed: boolean;
  hasFrida: boolean;
  hasSuspiciousApps: boolean;
}

/**
 * Perform comprehensive device security check
 */
export const performSecurityCheck = (): SecurityCheck => {
  const checks: SecurityCheck = {
    isRooted: false,
    isJailbroken: false,
    isDebugMode: false,
    canMockLocation: false,
    isOnExternalStorage: false,
    hasXposed: false,
    hasFrida: false,
    hasSuspiciousApps: false,
  };

  try {
    // Check for jailbreak/root
    checks.isJailbroken = JailMonkey.isJailBroken();
    checks.isRooted = checks.isJailbroken; // JailMonkey handles both

    // Check if app can mock location
    checks.canMockLocation = JailMonkey.canMockLocation?.() || false;

    // Check if running on external storage (Android)
    if (Platform.OS === 'android') {
      checks.isOnExternalStorage = JailMonkey.isOnExternalStorage?.() || false;
    }

    // Check for debugging
    checks.isDebugMode = JailMonkey.isDebugged?.() || false;

    // Check for hooking frameworks
    checks.hasXposed = JailMonkey.hookDetected?.() || false;
    checks.hasFrida = JailMonkey.hookDetected?.() || false;

    // Check for suspicious apps
    checks.hasSuspiciousApps = JailMonkey.AdbEnabled?.() || false;

    // Log security check results (sanitized)
    logger.info('Security check completed', {
      platform: Platform.OS,
      hasSecurityIssues: checks.isRooted || checks.isJailbroken,
    });

    return checks;
  } catch (error) {
    logger.error('Security check failed', error as Error);
    return checks;
  }
};

/**
 * Check if device is compromised
 */
export const isDeviceCompromised = (): boolean => {
  const checks = performSecurityCheck();

  return (
    checks.isRooted ||
    checks.isJailbroken ||
    checks.hasXposed ||
    checks.hasFrida
  );
};

/**
 * Show security warning to user
 */
export const showSecurityWarning = (onDismiss?: () => void): void => {
  Alert.alert(
    'Security Warning',
    'For your security, this app cannot run on jailbroken or rooted devices. This helps protect your personal information and prevents unauthorized access.',
    [
      {
        text: 'Understood',
        onPress: onDismiss,
        style: 'cancel',
      },
    ],
    { cancelable: false }
  );
};

/**
 * Enforce security policy
 * Returns true if app should continue, false if it should exit
 */
export const enforceSecurityPolicy = (): boolean => {
  const isCompromised = isDeviceCompromised();

  if (isCompromised) {
    logger.warn('Device compromised - security policy enforced');
    showSecurityWarning();
    return false;
  }

  return true;
};

/**
 * Screenshot Protection Manager
 */
class ScreenshotProtectionManager {
  private static instance: ScreenshotProtectionManager;
  private isProtectionEnabled: boolean = false;
  private screenshotListener: any = null;

  private constructor() {}

  public static getInstance(): ScreenshotProtectionManager {
    if (!ScreenshotProtectionManager.instance) {
      ScreenshotProtectionManager.instance = new ScreenshotProtectionManager();
    }
    return ScreenshotProtectionManager.instance;
  }

  /**
   * Enable screenshot protection for sensitive screens
   */
  public enableProtection(): void {
    if (this.isProtectionEnabled) {
      return;
    }

    try {
      // Add screenshot detection listener
      this.screenshotListener = ScreenCapture.addListener(() => {
        logger.warn('Screenshot detected on protected screen');
        this.onScreenshotDetected();
      });

      // Platform-specific protection
      if (Platform.OS === 'android') {
        // Android: Set secure flag to prevent screenshots
        // This would require native module implementation
        // For now, we just detect screenshots
      } else if (Platform.OS === 'ios') {
        // iOS: Screenshot detection via listener
        // Cannot prevent screenshots on iOS, but can detect them
      }

      this.isProtectionEnabled = true;
      logger.debug('Screenshot protection enabled');
    } catch (error) {
      logger.error('Failed to enable screenshot protection', error as Error);
    }
  }

  /**
   * Disable screenshot protection
   */
  public disableProtection(): void {
    if (!this.isProtectionEnabled) {
      return;
    }

    try {
      if (this.screenshotListener) {
        this.screenshotListener.remove();
        this.screenshotListener = null;
      }

      this.isProtectionEnabled = false;
      logger.debug('Screenshot protection disabled');
    } catch (error) {
      logger.error('Failed to disable screenshot protection', error as Error);
    }
  }

  /**
   * Handle screenshot detection
   */
  private onScreenshotDetected(): void {
    // Log the event
    logger.warn('Screenshot taken on sensitive screen');

    // Optionally show warning to user
    Alert.alert(
      'Screenshot Detected',
      'Please note that screenshots of sensitive information may compromise your account security.',
      [{ text: 'OK' }]
    );

    // Could also report to backend for security monitoring
  }

  /**
   * Check if protection is currently enabled
   */
  public isEnabled(): boolean {
    return this.isProtectionEnabled;
  }
}

// Export singleton instance
export const screenshotProtection = ScreenshotProtectionManager.getInstance();

/**
 * HOC to protect a component with screenshot detection
 */
export const withScreenshotProtection = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => {
    React.useEffect(() => {
      screenshotProtection.enableProtection();

      return () => {
        screenshotProtection.disableProtection();
      };
    }, []);

    return <Component {...props} />;
  };
};

/**
 * Hook for screenshot protection in functional components
 */
export const useScreenshotProtection = (enabled: boolean = true): void => {
  React.useEffect(() => {
    if (enabled) {
      screenshotProtection.enableProtection();
    }

    return () => {
      if (enabled) {
        screenshotProtection.disableProtection();
      }
    };
  }, [enabled]);
};

/**
 * Sensitive screens that should have screenshot protection
 */
export enum ProtectedScreen {
  PAYMENT = 'payment',
  BANK_DETAILS = 'bank_details',
  PERSONAL_INFO = 'personal_info',
  SETTINGS = 'settings',
  VERIFICATION = 'verification',
  MESSAGES = 'messages',
}

/**
 * Check if a screen should be protected
 */
export const shouldProtectScreen = (screenName: string): boolean => {
  const protectedScreens = Object.values(ProtectedScreen);
  return protectedScreens.includes(screenName as ProtectedScreen);
};

// Re-export React for use in this file
import React from 'react';
