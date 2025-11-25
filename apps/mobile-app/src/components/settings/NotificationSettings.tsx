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

export interface NotificationPreferences {
  push: {
    enabled: boolean;
    newMatches: boolean;
    newMessages: boolean;
    likes: boolean;
    superLikes: boolean;
    promotions: boolean;
  };
  email: {
    enabled: boolean;
    newMatches: boolean;
    weeklyDigest: boolean;
    promotions: boolean;
    productUpdates: boolean;
  };
  sms: {
    enabled: boolean;
    newMatches: boolean;
    importantUpdates: boolean;
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
  };
}

interface NotificationSettingsProps {
  preferences: NotificationPreferences;
  onSave: (preferences: NotificationPreferences) => Promise<void>;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  preferences: initialPreferences,
  onSave,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updatePreference = <K extends keyof NotificationPreferences>(
    category: K,
    key: keyof NotificationPreferences[K],
    value: any
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(preferences);
      setHasChanges(false);
      Alert.alert('Success', 'Your notification settings have been saved.');
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

  const handleReset = () => {
    Alert.alert(
      'Reset to Defaults',
      'This will reset all notification settings to defaults. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPreferences({
              push: {
                enabled: true,
                newMatches: true,
                newMessages: true,
                likes: true,
                superLikes: true,
                promotions: false,
              },
              email: {
                enabled: true,
                newMatches: true,
                weeklyDigest: true,
                promotions: false,
                productUpdates: false,
              },
              sms: {
                enabled: false,
                newMatches: false,
                importantUpdates: false,
              },
              doNotDisturb: {
                enabled: false,
                startTime: '22:00',
                endTime: '08:00',
              },
            });
            setHasChanges(true);
          },
        },
      ]
    );
  };

  const renderToggle = (
    label: string,
    value: boolean,
    onToggle: () => void,
    description?: string
  ) => {
    return (
      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingLabel}>{label}</Text>
          {description && (
            <Text style={styles.settingDescription}>{description}</Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: '#E0E0E0', true: '#FFC0CB' }}
          thumbColor={value ? '#E91E63' : '#F5F5F5'}
        />
      </View>
    );
  };

  const renderTimeSelector = (
    label: string,
    time: string,
    onPress: () => void
  ) => {
    return (
      <TouchableOpacity style={styles.settingRow} onPress={onPress}>
        <Text style={styles.settingLabel}>{label}</Text>
        <View style={styles.timeDisplay}>
          <Text style={styles.timeText}>{time}</Text>
          <Text style={styles.chevron}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Push Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          <Text style={styles.sectionDescription}>
            Receive alerts on your device for important activities
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Enable Push Notifications',
              preferences.push.enabled,
              () => updatePreference('push', 'enabled', !preferences.push.enabled),
              'Master switch for all push notifications'
            )}

            <View style={styles.divider} />

            <View
              style={[
                styles.subSettings,
                !preferences.push.enabled && styles.subSettingsDisabled,
              ]}
            >
              {renderToggle(
                'New Matches',
                preferences.push.newMatches,
                () =>
                  updatePreference('push', 'newMatches', !preferences.push.newMatches)
              )}
              {renderToggle(
                'New Messages',
                preferences.push.newMessages,
                () =>
                  updatePreference('push', 'newMessages', !preferences.push.newMessages)
              )}
              {renderToggle(
                'Likes',
                preferences.push.likes,
                () => updatePreference('push', 'likes', !preferences.push.likes)
              )}
              {renderToggle(
                'Super Likes',
                preferences.push.superLikes,
                () =>
                  updatePreference('push', 'superLikes', !preferences.push.superLikes)
              )}
              {renderToggle(
                'Promotions & Offers',
                preferences.push.promotions,
                () =>
                  updatePreference('push', 'promotions', !preferences.push.promotions)
              )}
            </View>
          </View>
        </View>

        {/* Email Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Email Notifications</Text>
          <Text style={styles.sectionDescription}>
            Receive updates and summaries via email
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Enable Email Notifications',
              preferences.email.enabled,
              () => updatePreference('email', 'enabled', !preferences.email.enabled),
              'Master switch for all email notifications'
            )}

            <View style={styles.divider} />

            <View
              style={[
                styles.subSettings,
                !preferences.email.enabled && styles.subSettingsDisabled,
              ]}
            >
              {renderToggle(
                'New Matches',
                preferences.email.newMatches,
                () =>
                  updatePreference('email', 'newMatches', !preferences.email.newMatches)
              )}
              {renderToggle(
                'Weekly Digest',
                preferences.email.weeklyDigest,
                () =>
                  updatePreference('email', 'weeklyDigest', !preferences.email.weeklyDigest),
                'Summary of your week on ConnectSphere'
              )}
              {renderToggle(
                'Promotions & Offers',
                preferences.email.promotions,
                () =>
                  updatePreference('email', 'promotions', !preferences.email.promotions)
              )}
              {renderToggle(
                'Product Updates',
                preferences.email.productUpdates,
                () =>
                  updatePreference(
                    'email',
                    'productUpdates',
                    !preferences.email.productUpdates
                  ),
                'New features and improvements'
              )}
            </View>
          </View>
        </View>

        {/* SMS Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SMS Notifications</Text>
          <Text style={styles.sectionDescription}>
            Receive text messages for critical updates
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Enable SMS Notifications',
              preferences.sms.enabled,
              () => updatePreference('sms', 'enabled', !preferences.sms.enabled),
              'Standard messaging rates may apply'
            )}

            <View style={styles.divider} />

            <View
              style={[
                styles.subSettings,
                !preferences.sms.enabled && styles.subSettingsDisabled,
              ]}
            >
              {renderToggle(
                'New Matches',
                preferences.sms.newMatches,
                () =>
                  updatePreference('sms', 'newMatches', !preferences.sms.newMatches)
              )}
              {renderToggle(
                'Important Updates',
                preferences.sms.importantUpdates,
                () =>
                  updatePreference(
                    'sms',
                    'importantUpdates',
                    !preferences.sms.importantUpdates
                  ),
                'Security alerts and account changes'
              )}
            </View>
          </View>
        </View>

        {/* Do Not Disturb */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Do Not Disturb</Text>
          <Text style={styles.sectionDescription}>
            Pause notifications during specific hours
          </Text>

          <View style={styles.settingsCard}>
            {renderToggle(
              'Enable Do Not Disturb',
              preferences.doNotDisturb.enabled,
              () =>
                updatePreference(
                  'doNotDisturb',
                  'enabled',
                  !preferences.doNotDisturb.enabled
                ),
              'No notifications during set hours'
            )}

            <View style={styles.divider} />

            <View
              style={[
                styles.subSettings,
                !preferences.doNotDisturb.enabled && styles.subSettingsDisabled,
              ]}
            >
              {renderTimeSelector(
                'Start Time',
                preferences.doNotDisturb.startTime,
                () => {
                  // Open time picker (would integrate with native picker)
                  Alert.alert(
                    'Time Picker',
                    'Time picker would open here. Integration with native DateTimePicker required.'
                  );
                }
              )}
              {renderTimeSelector(
                'End Time',
                preferences.doNotDisturb.endTime,
                () => {
                  Alert.alert(
                    'Time Picker',
                    'Time picker would open here. Integration with native DateTimePicker required.'
                  );
                }
              )}
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset to Defaults</Text>
        </TouchableOpacity>
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
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
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
  subSettings: {
    opacity: 1,
  },
  subSettingsDisabled: {
    opacity: 0.4,
    pointerEvents: 'none',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
    marginRight: 8,
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
  resetButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#E91E63',
    fontWeight: '600',
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
