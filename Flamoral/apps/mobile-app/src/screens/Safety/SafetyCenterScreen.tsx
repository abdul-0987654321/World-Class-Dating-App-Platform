import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { safetyService } from '../../services/safety.service';

export const SafetyCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [verificationStatus, setVerificationStatus] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [security, verification] = await Promise.all([
        safetyService.getSecuritySettings(),
        safetyService.getVerificationStatus(),
      ]);
      setSecuritySettings(security);
      setVerificationStatus(verification);
    } catch (error) {
      console.error('Failed to load safety data:', error);
      Alert.alert('Error', 'Failed to load safety settings');
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (setting: string, value: boolean) => {
    try {
      await safetyService.updateSecuritySettings({ [setting]: value });
      setSecuritySettings({ ...securitySettings, [setting]: value });
    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF4458" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Icon name="shield-check" size={48} color="#FF4458" />
        <Text style={styles.headerTitle}>Safety Center</Text>
        <Text style={styles.headerSubtitle}>
          Your safety and security are our top priorities
        </Text>
      </View>

      {/* Verification Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PhotoVerification' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon
              name={verificationStatus?.photoVerified ? 'check-decagram' : 'camera'}
              size={24}
              color={verificationStatus?.photoVerified ? '#4CAF50' : '#FF4458'}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Photo Verification</Text>
            <Text style={styles.cardDescription}>
              {verificationStatus?.photoVerified
                ? 'Verified - Get the blue checkmark'
                : 'Verify your identity with a selfie'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('PhoneVerification' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon
              name={verificationStatus?.phoneVerified ? 'check-circle' : 'phone'}
              size={24}
              color={verificationStatus?.phoneVerified ? '#4CAF50' : '#FF4458'}
            />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Phone Verification</Text>
            <Text style={styles.cardDescription}>
              {verificationStatus?.phoneVerified
                ? 'Phone number verified'
                : 'Verify your phone number'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Security Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('TwoFactorAuth' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="two-factor-authentication" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Two-Factor Authentication</Text>
            <Text style={styles.cardDescription}>
              {securitySettings?.twoFactorEnabled
                ? 'Enabled - Extra layer of security'
                : 'Add an extra layer of security'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('BiometricAuth' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="fingerprint" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Biometric Login</Text>
            <Text style={styles.cardDescription}>
              Use Face ID or fingerprint to log in
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Icon name="lock" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Login Notifications</Text>
            <Text style={styles.cardDescription}>
              Get notified of new login attempts
            </Text>
          </View>
          <Switch
            value={securitySettings?.loginNotifications || false}
            onValueChange={(value) => toggleSetting('loginNotifications', value)}
            trackColor={{ false: '#E0E0E0', true: '#FF4458' }}
          />
        </View>
      </View>

      {/* Privacy Controls */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('BlockedUsers' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="block-helper" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Blocked Users</Text>
            <Text style={styles.cardDescription}>
              Manage your blocked users list
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Icon name="incognito" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Incognito Mode</Text>
            <Text style={styles.cardDescription}>
              Browse profiles without being seen
            </Text>
          </View>
          <Switch
            value={securitySettings?.incognitoMode || false}
            onValueChange={(value) => toggleSetting('incognitoMode', value)}
            trackColor={{ false: '#E0E0E0', true: '#FF4458' }}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            <Icon name="eye-off" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Hide Last Active</Text>
            <Text style={styles.cardDescription}>
              Don't show when you were last active
            </Text>
          </View>
          <Switch
            value={securitySettings?.hideLastActive || false}
            onValueChange={(value) => toggleSetting('hideLastActive', value)}
            trackColor={{ false: '#E0E0E0', true: '#FF4458' }}
          />
        </View>
      </View>

      {/* Safety Resources */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety Resources</Text>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('SafetyTips' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="lightbulb" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Safety Tips</Text>
            <Text style={styles.cardDescription}>
              Learn how to stay safe while dating
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('EmergencyContacts' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="phone-alert" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Emergency Contacts</Text>
            <Text style={styles.cardDescription}>
              Set up trusted contacts for emergencies
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('CrisisResources' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="help-circle" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Crisis Resources</Text>
            <Text style={styles.cardDescription}>
              Find help and support services
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Community Guidelines */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('CommunityGuidelines' as never)}
        >
          <View style={styles.cardIcon}>
            <Icon name="book-open-variant" size={24} color="#FF4458" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Community Guidelines</Text>
            <Text style={styles.cardDescription}>
              Read our community standards
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.supportSection}>
        <Icon name="shield-alert" size={32} color="#FF4458" />
        <Text style={styles.supportText}>
          Need immediate help? Contact our safety team 24/7
        </Text>
        <TouchableOpacity
          style={styles.supportButton}
          onPress={() => Alert.alert('Safety Team', 'safety@flamoral.com')}
        >
          <Text style={styles.supportButtonText}>Contact Safety Team</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  supportSection: {
    alignItems: 'center',
    padding: 24,
    marginTop: 24,
    marginHorizontal: 16,
    backgroundColor: '#FFF5F7',
    borderRadius: 12,
    marginBottom: 32,
  },
  supportText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: '#FF4458',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SafetyCenterScreen;
