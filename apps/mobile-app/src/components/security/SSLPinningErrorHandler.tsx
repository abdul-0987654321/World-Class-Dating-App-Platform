/**
 * SSL Pinning Error Handler Component
 * Displays user-friendly error messages for SSL certificate validation failures
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { SSLPinningErrorType } from '../../services/network/SecureHttpClient';

interface SSLPinningErrorHandlerProps {
  visible: boolean;
  errorType: SSLPinningErrorType | null;
  errorMessage?: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const SSLPinningErrorHandler: React.FC<SSLPinningErrorHandlerProps> = ({
  visible,
  errorType,
  errorMessage,
  onDismiss,
  onRetry,
}) => {
  const getErrorDetails = () => {
    switch (errorType) {
      case SSLPinningErrorType.CERTIFICATE_MISMATCH:
        return {
          title: 'Security Warning',
          message:
            'We detected a potential security issue with the connection. This may indicate a man-in-the-middle attack or network interference.',
          recommendations: [
            'Disconnect from public WiFi and use cellular data',
            'Ensure you are not using a VPN or proxy',
            'Update the app to the latest version',
            'Contact support if the issue persists',
          ],
          severity: 'critical',
        };

      case SSLPinningErrorType.EXPIRED_CERTIFICATE:
        return {
          title: 'Update Required',
          message:
            'The security certificate has expired. Please update the app to continue using Flamoral securely.',
          recommendations: [
            'Update the app from the App Store/Play Store',
            'If already on latest version, contact support',
          ],
          severity: 'high',
        };

      case SSLPinningErrorType.UNTRUSTED_CERTIFICATE:
        return {
          title: 'Untrusted Connection',
          message:
            'The server certificate is not trusted. This is a serious security issue and we cannot establish a secure connection.',
          recommendations: [
            'Do not proceed on public WiFi',
            'Switch to cellular data',
            'Disable any VPN or proxy services',
            'Contact support immediately',
          ],
          severity: 'critical',
        };

      case SSLPinningErrorType.HOSTNAME_MISMATCH:
        return {
          title: 'Connection Error',
          message:
            'The server hostname does not match the certificate. This may indicate a security issue.',
          recommendations: [
            'Check your internet connection',
            'Avoid using public WiFi',
            'Contact support if the issue continues',
          ],
          severity: 'high',
        };

      case SSLPinningErrorType.INVALID_CERTIFICATE:
        return {
          title: 'Invalid Certificate',
          message:
            'The server certificate is invalid or malformed. We cannot establish a secure connection.',
          recommendations: [
            'Update the app to the latest version',
            'Switch to a different network',
            'Contact support',
          ],
          severity: 'high',
        };

      default:
        return {
          title: 'Connection Error',
          message:
            errorMessage || 'Unable to establish a secure connection. Please try again.',
          recommendations: [
            'Check your internet connection',
            'Try again in a few moments',
            'Contact support if the issue persists',
          ],
          severity: 'medium',
        };
    }
  };

  const handleContactSupport = () => {
    // Open email or support page
    const supportEmail = 'support@flamoral.com';
    const subject = `SSL Security Issue - ${errorType || 'Unknown'}`;
    const body = `I'm experiencing a security error:\n\nError Type: ${errorType}\nMessage: ${errorMessage}\n\nPlease help resolve this issue.`;

    const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    Linking.canOpenURL(mailtoUrl).then(supported => {
      if (supported) {
        Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Support Contact',
          `Please email us at ${supportEmail} with details about this error.`,
          [{ text: 'OK' }]
        );
      }
    });
  };

  const handleUpdateApp = () => {
    // Open app store
    const appStoreUrl = Platform.select({
      ios: 'itms-apps://apps.apple.com/app/id<YOUR_APP_ID>',
      android: 'market://details?id=com.flamoral.app',
    });

    if (appStoreUrl) {
      Linking.canOpenURL(appStoreUrl).then(supported => {
        if (supported) {
          Linking.openURL(appStoreUrl);
        } else {
          Alert.alert(
            'Update Required',
            'Please update the app from your app store.',
            [{ text: 'OK' }]
          );
        }
      });
    }
  };

  if (!visible) return null;

  const errorDetails = getErrorDetails();
  const isCritical = errorDetails.severity === 'critical';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Error Icon */}
          <View
            style={[
              styles.iconContainer,
              isCritical ? styles.criticalIcon : styles.warningIcon,
            ]}
          >
            <Text style={styles.iconText}>{isCritical ? '🔒' : '⚠️'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{errorDetails.title}</Text>

          {/* Message */}
          <Text style={styles.message}>{errorDetails.message}</Text>

          {/* Recommendations */}
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>What you can do:</Text>
            {errorDetails.recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {onRetry && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={onRetry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            )}

            {errorType === SSLPinningErrorType.EXPIRED_CERTIFICATE && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleUpdateApp}
              >
                <Text style={styles.primaryButtonText}>Update App</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.supportButton]}
              onPress={handleContactSupport}
            >
              <Text style={styles.supportButtonText}>Contact Support</Text>
            </TouchableOpacity>

            {!isCritical && (
              <TouchableOpacity
                style={[styles.button, styles.dismissButton]}
                onPress={onDismiss}
              >
                <Text style={styles.dismissButtonText}>Close</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Security Notice */}
          {isCritical && (
            <View style={styles.securityNotice}>
              <Text style={styles.securityNoticeText}>
                For your security, we cannot proceed with this connection. Your data
                protection is our priority.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  criticalIcon: {
    backgroundColor: '#FFE5E5',
  },
  warningIcon: {
    backgroundColor: '#FFF4E5',
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#4A4A4A',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  recommendationsContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#4A4A4A',
    marginRight: 8,
    marginTop: 2,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: '#4A4A4A',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF4458',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#4A90E2',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  supportButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#4A90E2',
  },
  supportButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    backgroundColor: '#F0F0F0',
  },
  dismissButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  securityNotice: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF4E5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  securityNoticeText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default SSLPinningErrorHandler;
