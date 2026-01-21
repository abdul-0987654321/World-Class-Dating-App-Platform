import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

interface PrivacyToggleProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon: string;
}

const PrivacyToggle: React.FC<PrivacyToggleProps> = ({
  title,
  subtitle,
  value,
  onValueChange,
  icon,
}) => {
  return (
    <View style={styles.toggleItem}>
      <Icon name={icon} size={24} color="#FF6B6B" style={styles.toggleIcon} />
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#D1D1D6', true: '#FF6B6B' }}
        thumbColor="#FFFFFF"
        accessibilityLabel={`Toggle ${title}`}
      />
    </View>
  );
};

const PrivacySettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // Profile Visibility
  const [showAge, setShowAge] = useState(true);
  const [showDistance, setShowDistance] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showRecentActivity, setShowRecentActivity] = useState(false);

  // Discovery Settings
  const [discoverable, setDiscoverable] = useState(true);
  const [showInGlobalMode, setShowInGlobalMode] = useState(false);
  const [incognitoMode, setIncognitoMode] = useState(false);

  // Data Privacy
  const [allowDataCollection, setAllowDataCollection] = useState(true);
  const [shareWithThirdParty, setShareWithThirdParty] = useState(false);
  const [personalizedAds, setPersonalizedAds] = useState(true);

  // Blocking & Reporting
  const [autoBlock, setAutoBlock] = useState(true);

  const handleIncognitoToggle = (value: boolean) => {
    if (value) {
      Alert.alert(
        'Incognito Mode',
        'You will only be visible to people you like. This is a premium feature.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: () => setIncognitoMode(true),
          },
        ]
      );
    } else {
      setIncognitoMode(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevron-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROFILE VISIBILITY</Text>
          <View style={styles.sectionContent}>
            <PrivacyToggle
              icon="calendar-outline"
              title="Show Age"
              subtitle="Display your age on your profile"
              value={showAge}
              onValueChange={setShowAge}
            />
            <PrivacyToggle
              icon="location-outline"
              title="Show Distance"
              subtitle="Display distance from other users"
              value={showDistance}
              onValueChange={setShowDistance}
            />
            <PrivacyToggle
              icon="radio-outline"
              title="Show Online Status"
              subtitle="Let others see when you're active"
              value={showOnlineStatus}
              onValueChange={setShowOnlineStatus}
            />
            <PrivacyToggle
              icon="time-outline"
              title="Show Recent Activity"
              subtitle="Display your last active time"
              value={showRecentActivity}
              onValueChange={setShowRecentActivity}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DISCOVERY</Text>
          <View style={styles.sectionContent}>
            <PrivacyToggle
              icon="eye-outline"
              title="Discoverable"
              subtitle="Allow others to find you"
              value={discoverable}
              onValueChange={setDiscoverable}
            />
            <PrivacyToggle
              icon="globe-outline"
              title="Show in Global Mode"
              subtitle="Appear in Travel Mode for others"
              value={showInGlobalMode}
              onValueChange={setShowInGlobalMode}
            />
            <PrivacyToggle
              icon="eye-off-outline"
              title="Incognito Mode"
              subtitle="Only visible to people you like (Premium)"
              value={incognitoMode}
              onValueChange={handleIncognitoToggle}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>READ RECEIPTS</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity style={styles.selectableItem} accessibilityRole="button">
              <View style={styles.radioContainer}>
                <Icon name="checkmark-circle" size={24} color="#FF6B6B" style={styles.radioIcon} />
                <View style={styles.radioText}>
                  <Text style={styles.radioTitle}>Everyone</Text>
                  <Text style={styles.radioSubtitle}>
                    All matches can see when you read messages
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectableItem} accessibilityRole="button">
              <View style={styles.radioContainer}>
                <Icon name="ellipse-outline" size={24} color="#C7C7CC" style={styles.radioIcon} />
                <View style={styles.radioText}>
                  <Text style={styles.radioTitle}>Matches Only</Text>
                  <Text style={styles.radioSubtitle}>Only people you've matched with can see</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.selectableItem} accessibilityRole="button">
              <View style={styles.radioContainer}>
                <Icon name="ellipse-outline" size={24} color="#C7C7CC" style={styles.radioIcon} />
                <View style={styles.radioText}>
                  <Text style={styles.radioTitle}>No One</Text>
                  <Text style={styles.radioSubtitle}>Hide read receipts from everyone</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA & PRIVACY</Text>
          <View style={styles.sectionContent}>
            <PrivacyToggle
              icon="analytics-outline"
              title="Analytics"
              subtitle="Help improve app experience"
              value={allowDataCollection}
              onValueChange={setAllowDataCollection}
            />
            <PrivacyToggle
              icon="share-outline"
              title="Share with Partners"
              subtitle="Share data with trusted partners"
              value={shareWithThirdParty}
              onValueChange={setShareWithThirdParty}
            />
            <PrivacyToggle
              icon="megaphone-outline"
              title="Personalized Ads"
              subtitle="Show ads based on your interests"
              value={personalizedAds}
              onValueChange={setPersonalizedAds}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BLOCKING & SAFETY</Text>
          <View style={styles.sectionContent}>
            <PrivacyToggle
              icon="shield-checkmark-outline"
              title="Auto-Block Suspicious Users"
              subtitle="Automatically block flagged accounts"
              value={autoBlock}
              onValueChange={setAutoBlock}
            />

            <TouchableOpacity
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="View blocked users"
            >
              <Icon name="ban-outline" size={24} color="#FF6B6B" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Blocked Users</Text>
                <Text style={styles.actionSubtitle}>Manage blocked accounts</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="View reported users"
            >
              <Icon name="flag-outline" size={24} color="#FF6B6B" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Reported Users</Text>
                <Text style={styles.actionSubtitle}>View your reports</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Icon name="information-circle" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            We take your privacy seriously. Learn more about how we protect your data in our Privacy
            Policy.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 40,
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
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  toggleIcon: {
    marginRight: 12,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  selectableItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioIcon: {
    marginRight: 12,
  },
  radioText: {
    flex: 1,
  },
  radioTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },
  radioSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default PrivacySettingsScreen;
