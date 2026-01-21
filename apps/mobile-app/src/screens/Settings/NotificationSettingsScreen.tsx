import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

interface NotificationToggleProps {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  icon: string;
}

const NotificationToggle: React.FC<NotificationToggleProps> = ({
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

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // Push Notifications
  const [pushEnabled, setPushEnabled] = useState(true);
  const [newMatches, setNewMatches] = useState(true);
  const [newMessages, setNewMessages] = useState(true);
  const [likes, setLikes] = useState(true);
  const [superLikes, setSuperLikes] = useState(true);
  const [profileViews, setProfileViews] = useState(false);

  // Email Notifications
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailMatches, setEmailMatches] = useState(true);
  const [emailMessages, setEmailMessages] = useState(false);
  const [emailPromotions, setEmailPromotions] = useState(true);
  const [emailTips, setEmailTips] = useState(true);

  // SMS Notifications
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [smsMatches, setSmsMatches] = useState(false);
  const [smsVerification, setSmsVerification] = useState(true);

  // App Notifications
  const [sounds, setSounds] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [badge, setBadge] = useState(true);

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
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PUSH NOTIFICATIONS</Text>
          <View style={styles.sectionContent}>
            <NotificationToggle
              icon="notifications-outline"
              title="Enable Push Notifications"
              subtitle="Receive notifications on this device"
              value={pushEnabled}
              onValueChange={setPushEnabled}
            />
            {pushEnabled && (
              <>
                <NotificationToggle
                  icon="heart-outline"
                  title="New Matches"
                  subtitle="When you get a new match"
                  value={newMatches}
                  onValueChange={setNewMatches}
                />
                <NotificationToggle
                  icon="chatbubble-outline"
                  title="New Messages"
                  subtitle="When you receive a message"
                  value={newMessages}
                  onValueChange={setNewMessages}
                />
                <NotificationToggle
                  icon="flame-outline"
                  title="Likes"
                  subtitle="When someone likes you"
                  value={likes}
                  onValueChange={setLikes}
                />
                <NotificationToggle
                  icon="star-outline"
                  title="Super Likes"
                  subtitle="When someone super likes you"
                  value={superLikes}
                  onValueChange={setSuperLikes}
                />
                <NotificationToggle
                  icon="eye-outline"
                  title="Profile Views"
                  subtitle="When someone views your profile"
                  value={profileViews}
                  onValueChange={setProfileViews}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EMAIL NOTIFICATIONS</Text>
          <View style={styles.sectionContent}>
            <NotificationToggle
              icon="mail-outline"
              title="Enable Email Notifications"
              subtitle="Receive updates via email"
              value={emailEnabled}
              onValueChange={setEmailEnabled}
            />
            {emailEnabled && (
              <>
                <NotificationToggle
                  icon="heart-outline"
                  title="Match Notifications"
                  subtitle="Daily match summaries"
                  value={emailMatches}
                  onValueChange={setEmailMatches}
                />
                <NotificationToggle
                  icon="chatbubble-outline"
                  title="Message Notifications"
                  subtitle="Unread message reminders"
                  value={emailMessages}
                  onValueChange={setEmailMessages}
                />
                <NotificationToggle
                  icon="pricetag-outline"
                  title="Promotions & Offers"
                  subtitle="Special deals and discounts"
                  value={emailPromotions}
                  onValueChange={setEmailPromotions}
                />
                <NotificationToggle
                  icon="bulb-outline"
                  title="Dating Tips"
                  subtitle="Expert advice and tips"
                  value={emailTips}
                  onValueChange={setEmailTips}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SMS NOTIFICATIONS</Text>
          <View style={styles.sectionContent}>
            <NotificationToggle
              icon="phone-portrait-outline"
              title="Enable SMS Notifications"
              subtitle="Receive text message updates"
              value={smsEnabled}
              onValueChange={setSmsEnabled}
            />
            {smsEnabled && (
              <>
                <NotificationToggle
                  icon="heart-outline"
                  title="Match Notifications"
                  subtitle="Get notified about new matches"
                  value={smsMatches}
                  onValueChange={setSmsMatches}
                />
                <NotificationToggle
                  icon="shield-checkmark-outline"
                  title="Verification Codes"
                  subtitle="Security and login codes"
                  value={smsVerification}
                  onValueChange={setSmsVerification}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>APP SETTINGS</Text>
          <View style={styles.sectionContent}>
            <NotificationToggle
              icon="volume-high-outline"
              title="Sounds"
              subtitle="Play notification sounds"
              value={sounds}
              onValueChange={setSounds}
            />
            <NotificationToggle
              icon="phone-portrait-outline"
              title="Vibration"
              subtitle="Vibrate for notifications"
              value={vibration}
              onValueChange={setVibration}
            />
            <NotificationToggle
              icon="notifications-circle-outline"
              title="Badge Count"
              subtitle="Show unread count on app icon"
              value={badge}
              onValueChange={setBadge}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUIET HOURS</Text>
          <View style={styles.sectionContent}>
            <TouchableOpacity
              style={styles.actionItem}
              accessibilityRole="button"
              accessibilityLabel="Set quiet hours"
            >
              <Icon name="moon-outline" size={24} color="#FF6B6B" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Do Not Disturb</Text>
                <Text style={styles.actionSubtitle}>Not set</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#C7C7CC" />
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            Set quiet hours to pause notifications during specific times
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Icon name="information-circle" size={24} color="#007AFF" />
          <Text style={styles.infoText}>
            Some notifications may still come through for important account or security updates,
            even if disabled.
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
  helperText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 16,
    marginTop: 8,
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

export default NotificationSettingsScreen;
