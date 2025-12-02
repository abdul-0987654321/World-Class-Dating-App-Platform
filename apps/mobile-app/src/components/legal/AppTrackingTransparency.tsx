import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/Ionicons';

interface AppTrackingTransparencyProps {
  visible: boolean;
  onComplete: (granted: boolean) => void;
}

const AppTrackingTransparency: React.FC<AppTrackingTransparencyProps> = ({
  visible,
  onComplete,
}) => {
  const handleAllow = async () => {
    if (Platform.OS === 'ios') {
      try {
        const result = await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
        onComplete(result === RESULTS.GRANTED);
      } catch (error) {
        console.error('Failed to request tracking permission:', error);
        onComplete(false);
      }
    } else {
      // Android doesn't require this permission
      onComplete(true);
    }
  };

  const handleDeny = () => {
    onComplete(false);
  };

  // Only show on iOS 14.5+
  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleDeny}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Icon name="analytics-outline" size={64} color="#FF6B6B" />
          </View>

          <Text style={styles.title}>
            Help Us Improve Your Experience
          </Text>

          <Text style={styles.description}>
            We'd like to use data from other companies' apps and websites to
            provide you with a better, more personalized experience. This
            includes:
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Icon
                name="checkmark-circle"
                size={20}
                color="#34C759"
                style={styles.benefitIcon}
              />
              <Text style={styles.benefitText}>
                Personalized match recommendations
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Icon
                name="checkmark-circle"
                size={20}
                color="#34C759"
                style={styles.benefitIcon}
              />
              <Text style={styles.benefitText}>
                Relevant content and features
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Icon
                name="checkmark-circle"
                size={20}
                color="#34C759"
                style={styles.benefitIcon}
              />
              <Text style={styles.benefitText}>
                Better ads (if applicable)
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <Icon
                name="checkmark-circle"
                size={20}
                color="#34C759"
                style={styles.benefitIcon}
              />
              <Text style={styles.benefitText}>
                Improved app performance
              </Text>
            </View>
          </View>

          <View style={styles.privacyNote}>
            <Icon name="lock-closed" size={16} color="#8E8E93" />
            <Text style={styles.privacyText}>
              Your privacy is important to us. Learn more in our Privacy Policy.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.allowButton}
            onPress={handleAllow}
            accessibilityRole="button"
            accessibilityLabel="Allow tracking"
          >
            <Text style={styles.allowButtonText}>Allow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.denyButton}
            onPress={handleDeny}
            accessibilityRole="button"
            accessibilityLabel="Ask app not to track"
          >
            <Text style={styles.denyButtonText}>Ask App Not To Track</Text>
          </TouchableOpacity>

          <Text style={styles.footnote}>
            You can change this setting anytime in your device settings.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsList: {
    marginBottom: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
    lineHeight: 16,
  },
  allowButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  allowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  denyButton: {
    backgroundColor: '#F2F2F7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  denyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  footnote: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AppTrackingTransparency;
