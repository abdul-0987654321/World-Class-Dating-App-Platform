import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from '../common/Button';

export interface PrivacyPreferences {
  showOnlineStatus: boolean;
  showDistance: boolean;
  showAge: boolean;
  showLastActive: boolean;
  incognitoMode: boolean;
  allowScreenshots: boolean;
  shareReadReceipts: boolean;
  shareTypingIndicator: boolean;
  allowProfileIndexing: boolean;
}

interface PrivacySettingsProps {
  preferences: PrivacyPreferences;
  subscriptionTier: 'free' | 'premium' | 'premium_plus';
  onSave: (preferences: PrivacyPreferences) => Promise<void>;
  onRequestDataDownload: () => void;
  onDeleteAccount: () => void;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({
  preferences: initialPreferences,
  subscriptionTier,
  onSave,
  onRequestDataDownload,
  onDeleteAccount,
}) => {
  const [preferences, setPreferences] = useState<PrivacyPreferences>(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const isPremium = subscriptionTier === 'premium' || subscriptionTier === 'premium_plus';

  const updatePreference = <K extends keyof PrivacyPreferences>(
    key: K,
    value: PrivacyPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(preferences);
      setHasChanges(false);
      Alert.alert('Success', 'Your privacy settings have been saved.');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to save settings. Please try again.'
      );
      console.error('Save preferences error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIncognitoToggle = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Incognito mode is available for Premium members. Upgrade to browse invisibly.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => {} },
        ]
      );
      return;
    }

    if (!preferences.incognitoMode) {
      Alert.alert(
        'Enable Incognito Mode?',
        'Your profile will be hidden from discovery. Only people you swipe right on will see you.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => updatePreference('incognitoMode', true),
          },
        ]
      );
    } else {
      updatePreference('incognitoMode', false);
    }
  };

  const handleDataDownload = () => {
    Alert.alert(
      'Download Your Data',
      'We will prepare a copy of your data (profile, messages, photos) and email you a download link within 48 hours.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Download',
          onPress: () => {
            onRequestDataDownload();
            Alert.alert(
              'Request Submitted',
              'You will receive an email with your data within 48 hours.'
            );
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data, matches, and messages will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are You Sure?',
              'Type DELETE to confirm account deletion',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Confirm Delete',
                  style: 'destructive',
                  onPress: onDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const renderToggle = (
    label: string,
    value: boolean,
    onToggle: () => void,
    description?: string,
    isPremiumFeature: boolean = false
  ) => {
    return (
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <View style={styles.labelContainer}>
            <Text style={styles.settingLabel}>{label}</Text>
            {isPremiumFeature && !isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            )}
          </View>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E0E0E0', true: '#FFC0CB' }}
          thumbColor={value ? '#E91E63' : '#F5F5F5'}
          disabled={isPremiumFeature && !isPremium}
        />
      </View>
    );
  };

  const renderActionButton = (
    label: string,
    description: string,
    onPress: () => void,
    variant: 'default' | 'danger' = 'default'
  ) => {
    return (
      <TouchableOpacity
        style={[
          styles.actionButton,
          variant === 'danger' && styles.actionButtonDanger,
        ]}
        onPress={onPress}
      >
        <View style={styles.actionButtonInfo}>
          <Text
            style={[
              styles.actionButtonLabel,
              variant === 'danger' && styles.actionButtonLabelDanger,
            ]}
          >
            {label}
          </Text>
          <Text style={styles.actionButtonDescription}>{description}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Visibility */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Visibility</Text>
          <Text style={styles.sectionDescription}>
            Control what information others can see
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Show Online Status',
              preferences.showOnlineStatus,
              () =>
                updatePreference('showOnlineStatus', !preferences.showOnlineStatus),
              'Let others see when you are online'
            )}
            <View style={styles.divider} />
            {renderToggle(
              'Show Distance',
              preferences.showDistance,
              () => updatePreference('showDistance', !preferences.showDistance),
              'Display your approximate distance to others'
            )}
            <View style={styles.divider} />
            {renderToggle(
              'Show Age',
              preferences.showAge,
              () => updatePreference('showAge', !preferences.showAge),
              'Display your age on your profile'
            )}
            <View style={styles.divider} />
            {renderToggle(
              'Show Last Active',
              preferences.showLastActive,
              () => updatePreference('showLastActive', !preferences.showLastActive),
              'Let others see when you were last active'
            )}
          </View>
        </View>

        {/* Discovery Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discovery</Text>
          <Text style={styles.sectionDescription}>
            Control how your profile appears in discovery
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Incognito Mode',
              preferences.incognitoMode,
              handleIncognitoToggle,
              'Only people you like can see your profile',
              true
            )}
            <View style={styles.divider} />
            {renderToggle(
              'Allow Profile Indexing',
              preferences.allowProfileIndexing,
              () =>
                updatePreference(
                  'allowProfileIndexing',
                  !preferences.allowProfileIndexing
                ),
              'Show my profile in search results and recommendations'
            )}
          </View>
        </View>

        {/* Communication Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication</Text>
          <Text style={styles.sectionDescription}>
            Manage message and interaction privacy
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Share Read Receipts',
              preferences.shareReadReceipts,
              () =>
                updatePreference('shareReadReceipts', !preferences.shareReadReceipts),
              'Let others see when you read their messages'
            )}
            <View style={styles.divider} />
            {renderToggle(
              'Share Typing Indicator',
              preferences.shareTypingIndicator,
              () =>
                updatePreference(
                  'shareTypingIndicator',
                  !preferences.shareTypingIndicator
                ),
              'Show when you are typing a message'
            )}
          </View>
        </View>

        {/* Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Text style={styles.sectionDescription}>
            Additional security settings
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Allow Screenshots',
              preferences.allowScreenshots,
              () =>
                updatePreference('allowScreenshots', !preferences.allowScreenshots),
              'Prevent others from taking screenshots of your profile'
            )}
          </View>
        </View>

        {/* Data & Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Account</Text>
          <Text style={styles.sectionDescription}>
            Manage your personal data and account
          </Text>

          <View style={styles.settingsCard}>
            {renderActionButton(
              'Download My Data',
              'Get a copy of your profile, messages, and activity',
              handleDataDownload
            )}
            <View style={styles.divider} />
            {renderActionButton(
              'Delete My Account',
              'Permanently delete your account and all data',
              handleDeleteAccount,
              'danger'
            )}
          </View>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.infoIcon}>🔒</Text>
          <Text style={styles.infoText}>
            We take your privacy seriously. Your personal information is never sold
            to third parties. For more details, see our Privacy Policy.
          </Text>
          <TouchableOpacity>
            <Text style={styles.infoLink}>Read Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {hasChanges && (
        <View style={styles.footer}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  settingsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
  },
  settingDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionButtonDanger: {
    backgroundColor: '#FFF5F5',
  },
  actionButtonInfo: {
    flex: 1,
    marginRight: 16,
  },
  actionButtonLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  actionButtonLabelDanger: {
    color: '#F44336',
  },
  actionButtonDescription: {
    fontSize: 13,
    color: '#999',
    lineHeight: 18,
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoLink: {
    fontSize: 14,
    color: '#1B5E20',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
});
