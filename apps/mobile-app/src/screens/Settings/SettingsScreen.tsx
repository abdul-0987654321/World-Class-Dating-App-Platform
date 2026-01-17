import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth, TokenStorage, ACCESS_TOKEN_KEY } from '@hooks/useAuth';

type SettingsNavigationProp = StackNavigationProp<any>;

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  dangerous?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showChevron = true,
  value,
  onValueChange,
  dangerous = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !onValueChange}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.settingLeft}>
        <Icon
          name={icon}
          size={24}
          color={dangerous ? '#FF3B30' : '#FF6B6B'}
          style={styles.settingIcon}
        />
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, dangerous && styles.dangerText]}>
            {title}
          </Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {onValueChange ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: '#D1D1D6', true: '#FF6B6B' }}
          thumbColor="#FFFFFF"
          accessibilityLabel={`Toggle ${title}`}
        />
      ) : (
        showChevron && <Icon name="chevron-forward" size={20} color="#C7C7CC" />
      )}
    </TouchableOpacity>
  );
};

// Legal URLs
const LEGAL_URLS = {
  TERMS_OF_SERVICE: 'https://flamoral.com/terms-of-service',
  PRIVACY_POLICY: 'https://flamoral.com/privacy-policy',
};

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<SettingsNavigationProp>();
  const { logout } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' as never }],
              });
            } catch (error) {
              console.error('Logout error:', error);
              // Still navigate to auth on error - clear local state
              await TokenStorage.clear();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' as never }],
              });
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. All your data, matches, and messages will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              // Get token for authenticated API call
              const token = await TokenStorage.getItem(ACCESS_TOKEN_KEY);

              // Call account deletion API
              const response = await fetch('https://api.flamoral.com/api/v1/auth/account', {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) {
                throw new Error('Failed to delete account');
              }

              // Clear all local storage
              await TokenStorage.clear();

              Alert.alert(
                'Account Deleted',
                'Your account has been permanently deleted.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' as never }],
                      });
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Delete account error:', error);
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again or contact support.'
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleOpenTerms = () => {
    Linking.openURL(LEGAL_URLS.TERMS_OF_SERVICE).catch((err) => {
      console.error('Failed to open Terms of Service:', err);
      Alert.alert('Error', 'Could not open Terms of Service');
    });
  };

  const handleOpenPrivacy = () => {
    Linking.openURL(LEGAL_URLS.PRIVACY_POLICY).catch((err) => {
      console.error('Failed to open Privacy Policy:', err);
      Alert.alert('Error', 'Could not open Privacy Policy');
    });
  };

  const handleLocation = () => {
    navigation.navigate('LocationSettings' as never);
  };

  const handleDiscoveryPreferences = () => {
    navigation.navigate('DiscoveryPreferences' as never);
  };

  const handlePaymentMethods = () => {
    // Navigate to subscription which handles payments
    navigation.navigate('Subscription' as never);
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: Platform.OS === 'ios'
          ? 'Check out Flamoral - Find meaningful connections! https://apps.apple.com/app/flamoral/id123456789'
          : 'Check out Flamoral - Find meaningful connections! https://play.google.com/store/apps/details?id=com.flamoral.app',
        title: 'Share Flamoral',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleRateApp = () => {
    const appStoreUrl = Platform.OS === 'ios'
      ? 'https://apps.apple.com/app/flamoral/id123456789?action=write-review'
      : 'https://play.google.com/store/apps/details?id=com.flamoral.app';

    Linking.openURL(appStoreUrl).catch((err) => {
      console.error('Failed to open app store:', err);
      Alert.alert('Error', 'Could not open app store');
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      accessibilityLabel="Settings screen"
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="person-outline"
            title="Account Settings"
            subtitle="Edit profile, change password"
            onPress={() => navigation.navigate('AccountSettings')}
          />
          <SettingItem
            icon="shield-checkmark-outline"
            title="Privacy Settings"
            subtitle="Control your visibility"
            onPress={() => navigation.navigate('PrivacySettings')}
          />
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Manage notification preferences"
            onPress={() => navigation.navigate('NotificationSettings')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DISCOVERY</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="location-outline"
            title="Location"
            subtitle="Change your location"
            onPress={handleLocation}
          />
          <SettingItem
            icon="filter-outline"
            title="Discovery Preferences"
            subtitle="Age range, distance, and more"
            onPress={handleDiscoveryPreferences}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREMIUM</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="star-outline"
            title="Subscription"
            subtitle="Manage your premium subscription"
            onPress={() => navigation.navigate('Subscription')}
          />
          <SettingItem
            icon="card-outline"
            title="Payment Methods"
            subtitle="Manage payment information"
            onPress={handlePaymentMethods}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HELP & SUPPORT</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="FAQs and support"
            onPress={() => navigation.navigate('HelpCenter')}
          />
          <SettingItem
            icon="shield-outline"
            title="Safety Tips"
            subtitle="Stay safe while dating"
            onPress={() => navigation.navigate('SafetyTips')}
          />
          <SettingItem
            icon="document-text-outline"
            title="Terms of Service"
            onPress={handleOpenTerms}
          />
          <SettingItem
            icon="lock-closed-outline"
            title="Privacy Policy"
            onPress={handleOpenPrivacy}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="information-circle-outline"
            title="App Version"
            subtitle="1.0.0"
            showChevron={false}
          />
          <SettingItem
            icon="share-social-outline"
            title="Share Flamoral"
            onPress={handleShareApp}
          />
          <SettingItem
            icon="star-half-outline"
            title="Rate Us"
            onPress={handleRateApp}
          />
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionContent}>
          <SettingItem
            icon="log-out-outline"
            title="Logout"
            onPress={handleLogout}
            dangerous
            showChevron={false}
          />
          <SettingItem
            icon="trash-outline"
            title="Delete Account"
            onPress={handleDeleteAccount}
            dangerous
            showChevron={false}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 44,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6D6D72',
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  dangerText: {
    color: '#FF3B30',
  },
});

export default SettingsScreen;
