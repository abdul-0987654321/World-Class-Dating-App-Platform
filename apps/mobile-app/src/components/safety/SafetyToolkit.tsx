import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  Modal,
  Switch,
} from 'react-native';
import { Button } from '../common/Button';

export type ReportReason =
  | 'inappropriate_photos'
  | 'harassment'
  | 'spam'
  | 'fake_profile'
  | 'underage'
  | 'scam'
  | 'offline_behavior'
  | 'other';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface SafetySettings {
  shareLocationWithEmergencyContact: boolean;
  enableSafetyTimer: boolean;
  safetyTimerDuration: number; // in minutes
  hideFromFacebookFriends: boolean;
  requirePhotoVerification: boolean;
}

export interface BlockedUser {
  id: string;
  name: string;
  blockedAt: Date;
}

interface SafetyToolkitProps {
  emergencyContacts: EmergencyContact[];
  blockedUsers: BlockedUser[];
  safetySettings: SafetySettings;
  onAddEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => Promise<void>;
  onRemoveEmergencyContact: (contactId: string) => Promise<void>;
  onUpdateSafetySettings: (settings: SafetySettings) => Promise<void>;
  onReportUser: (userId: string, reason: ReportReason, details: string) => Promise<void>;
  onBlockUser: (userId: string) => Promise<void>;
  onUnblockUser: (userId: string) => Promise<void>;
  onStartSafetyTimer: () => void;
}

export const SafetyToolkit: React.FC<SafetyToolkitProps> = ({
  emergencyContacts,
  blockedUsers,
  safetySettings: initialSettings,
  onAddEmergencyContact,
  onRemoveEmergencyContact,
  onUpdateSafetySettings,
  onReportUser,
  onBlockUser,
  onUnblockUser,
  onStartSafetyTimer,
}) => {
  const [safetySettings, setSafetySettings] = useState<SafetySettings>(initialSettings);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });
  const [reportDetails, setReportDetails] = useState({
    reason: 'inappropriate_photos' as ReportReason,
    details: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  const updateSetting = async <K extends keyof SafetySettings>(
    key: K,
    value: SafetySettings[K]
  ) => {
    const newSettings = { ...safetySettings, [key]: value };
    setSafetySettings(newSettings);

    try {
      await onUpdateSafetySettings(newSettings);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update settings');
      // Revert on error
      setSafetySettings(safetySettings);
    }
  };

  const handleAddEmergencyContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Required Fields', 'Please enter name and phone number');
      return;
    }

    setIsLoading(true);
    try {
      await onAddEmergencyContact(newContact);
      setNewContact({ name: '', phone: '', relationship: '' });
      setShowAddContactModal(false);
      Alert.alert('Success', 'Emergency contact added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add contact');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveEmergencyContact = (contact: EmergencyContact) => {
    Alert.alert(
      'Remove Emergency Contact',
      `Remove ${contact.name} from your emergency contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await onRemoveEmergencyContact(contact.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove contact');
            }
          },
        },
      ]
    );
  };

  const handleCallEmergency = (contact: EmergencyContact) => {
    Alert.alert('Call Emergency Contact', `Call ${contact.name} at ${contact.phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: () => {
          Linking.openURL(`tel:${contact.phone}`);
        },
      },
    ]);
  };

  const handleUnblockUser = (user: BlockedUser) => {
    Alert.alert(
      'Unblock User',
      `Unblock ${user.name}? They will be able to see your profile and contact you again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await onUnblockUser(user.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to unblock user');
            }
          },
        },
      ]
    );
  };

  const reportReasons: { value: ReportReason; label: string; icon: string }[] = [
    { value: 'inappropriate_photos', label: 'Inappropriate Photos', icon: '📸' },
    { value: 'harassment', label: 'Harassment or Bullying', icon: '⚠️' },
    { value: 'spam', label: 'Spam or Solicitation', icon: '📧' },
    { value: 'fake_profile', label: 'Fake Profile', icon: '🎭' },
    { value: 'underage', label: 'Underage User', icon: '🔞' },
    { value: 'scam', label: 'Scam or Fraud', icon: '💰' },
    { value: 'offline_behavior', label: 'Offline Behavior', icon: '🚨' },
    { value: 'other', label: 'Other', icon: '📝' },
  ];

  const safetyResources = [
    {
      title: 'National Domestic Violence Hotline',
      phone: '1-800-799-7233',
      description: '24/7 support for victims of domestic violence',
    },
    {
      title: 'Crisis Text Line',
      phone: 'Text HOME to 741741',
      description: 'Free 24/7 crisis support via text',
    },
    {
      title: 'RAINN Sexual Assault Hotline',
      phone: '1-800-656-4673',
      description: '24/7 support for survivors of sexual assault',
    },
  ];

  const renderEmergencyContactsSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <Text style={styles.sectionDescription}>
          Add trusted contacts who can be notified in case of emergency
        </Text>
      </View>

      {emergencyContacts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👥</Text>
          <Text style={styles.emptyStateTitle}>No Emergency Contacts</Text>
          <Text style={styles.emptyStateText}>
            Add contacts who can be reached in case of emergency
          </Text>
        </View>
      ) : (
        <View style={styles.contactsList}>
          {emergencyContacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactDetails}>
                  {contact.phone}
                  {contact.relationship && ` • ${contact.relationship}`}
                </Text>
              </View>
              <View style={styles.contactActions}>
                <TouchableOpacity
                  onPress={() => handleCallEmergency(contact)}
                  style={styles.contactActionButton}
                >
                  <Text style={styles.contactActionIcon}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemoveEmergencyContact(contact)}
                  style={styles.contactActionButton}
                >
                  <Text style={styles.contactActionIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Button
        title="Add Emergency Contact"
        onPress={() => setShowAddContactModal(true)}
        variant="outline"
        icon="+"
        fullWidth
        style={styles.addButton}
      />
    </View>
  );

  const renderSafetyTimerSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Safety Timer</Text>
        <Text style={styles.sectionDescription}>
          Set a timer for dates - emergency contacts will be notified if you don't check in
        </Text>
      </View>

      <View style={styles.timerCard}>
        <View style={styles.timerHeader}>
          <Text style={styles.timerIcon}>⏰</Text>
          <View style={styles.timerInfo}>
            <Text style={styles.timerTitle}>Date Safety Timer</Text>
            <Text style={styles.timerDescription}>
              Currently set for {safetySettings.safetyTimerDuration} minutes
            </Text>
          </View>
        </View>

        <Button
          title="Start Safety Timer"
          onPress={onStartSafetyTimer}
          variant="success"
          icon="▶"
          fullWidth
          style={styles.timerButton}
        />

        <Text style={styles.timerNote}>
          💡 Your emergency contacts will be notified if you don't check in when the timer expires
        </Text>
      </View>
    </View>
  );

  const renderSafetySettingsSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Safety Settings</Text>
        <Text style={styles.sectionDescription}>Control how your safety features work</Text>
      </View>

      <View style={styles.settingsCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Share Location</Text>
            <Text style={styles.settingDescription}>
              Share your location with emergency contacts during safety timer
            </Text>
          </View>
          <Switch
            value={safetySettings.shareLocationWithEmergencyContact}
            onValueChange={(value) => updateSetting('shareLocationWithEmergencyContact', value)}
            trackColor={{ false: '#E0E0E0', true: '#FFC0CB' }}
            thumbColor={safetySettings.shareLocationWithEmergencyContact ? '#E91E63' : '#F5F5F5'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Hide from Facebook Friends</Text>
            <Text style={styles.settingDescription}>
              Your profile won't be shown to your Facebook friends
            </Text>
          </View>
          <Switch
            value={safetySettings.hideFromFacebookFriends}
            onValueChange={(value) => updateSetting('hideFromFacebookFriends', value)}
            trackColor={{ false: '#E0E0E0', true: '#FFC0CB' }}
            thumbColor={safetySettings.hideFromFacebookFriends ? '#E91E63' : '#F5F5F5'}
          />
        </View>

        <View style={styles.settingDivider} />

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Require Photo Verification</Text>
            <Text style={styles.settingDescription}>
              Only show verified profiles in your matches
            </Text>
          </View>
          <Switch
            value={safetySettings.requirePhotoVerification}
            onValueChange={(value) => updateSetting('requirePhotoVerification', value)}
            trackColor={{ false: '#E0E0E0', true: '#FFC0CB' }}
            thumbColor={safetySettings.requirePhotoVerification ? '#E91E63' : '#F5F5F5'}
          />
        </View>
      </View>
    </View>
  );

  const renderBlockedUsersSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Blocked Users</Text>
        <Text style={styles.sectionDescription}>{blockedUsers.length} blocked</Text>
      </View>

      {blockedUsers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🚫</Text>
          <Text style={styles.emptyStateTitle}>No Blocked Users</Text>
          <Text style={styles.emptyStateText}>
            Users you block won't be able to see or contact you
          </Text>
        </View>
      ) : (
        <View style={styles.blockedList}>
          {blockedUsers.map((user) => (
            <View key={user.id} style={styles.blockedCard}>
              <View style={styles.blockedInfo}>
                <Text style={styles.blockedName}>{user.name}</Text>
                <Text style={styles.blockedDate}>
                  Blocked {user.blockedAt.toLocaleDateString()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleUnblockUser(user)}>
                <Text style={styles.unblockButton}>Unblock</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderSafetyResourcesSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Safety Resources</Text>
        <Text style={styles.sectionDescription}>24/7 support hotlines and resources</Text>
      </View>

      <View style={styles.resourcesList}>
        {safetyResources.map((resource, index) => (
          <TouchableOpacity
            key={index}
            style={styles.resourceCard}
            onPress={() => {
              if (resource.phone.startsWith('Text')) {
                Alert.alert('Crisis Text Line', resource.phone);
              } else {
                Linking.openURL(`tel:${resource.phone.replace(/[^0-9]/g, '')}`);
              }
            }}
          >
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>{resource.title}</Text>
              <Text style={styles.resourcePhone}>{resource.phone}</Text>
              <Text style={styles.resourceDescription}>{resource.description}</Text>
            </View>
            <Text style={styles.resourceIcon}>📞</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.emergencyCard}>
        <Text style={styles.emergencyIcon}>🚨</Text>
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyTitle}>In Immediate Danger?</Text>
          <Text style={styles.emergencyDescription}>
            Call 911 or your local emergency services immediately
          </Text>
        </View>
        <TouchableOpacity style={styles.emergencyButton} onPress={() => Linking.openURL('tel:911')}>
          <Text style={styles.emergencyButtonText}>Call 911</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddContactModal = () => (
    <Modal
      visible={showAddContactModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowAddContactModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
            <TouchableOpacity
              onPress={() => setShowAddContactModal(false)}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Contact name"
                placeholderTextColor="#999"
                value={newContact.name}
                onChangeText={(text) => setNewContact({ ...newContact, name: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={newContact.phone}
                onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Relationship (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Friend, Family, Partner"
                placeholderTextColor="#999"
                value={newContact.relationship}
                onChangeText={(text) => setNewContact({ ...newContact, relationship: text })}
              />
            </View>

            <Button
              title="Add Contact"
              onPress={handleAddEmergencyContact}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.modalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Safety Center</Text>
          <Text style={styles.subtitle}>
            Your safety is our priority. Use these tools to stay safe while dating.
          </Text>
        </View>

        {renderEmergencyContactsSection()}
        {renderSafetyTimerSection()}
        {renderSafetySettingsSection()}
        {renderBlockedUsersSection()}
        {renderSafetyResourcesSection()}

        {/* Safety Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Safety Tips</Text>
          <Text style={styles.tipText}>• Meet in public places for first dates</Text>
          <Text style={styles.tipText}>• Tell a friend where you're going</Text>
          <Text style={styles.tipText}>• Don't share personal info too quickly</Text>
          <Text style={styles.tipText}>• Trust your instincts</Text>
          <Text style={styles.tipText}>• Report suspicious behavior</Text>
        </View>
      </ScrollView>

      {renderAddContactModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
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
  },
  // Emergency Contacts
  contactsList: {
    gap: 12,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  contactDetails: {
    fontSize: 14,
    color: '#666',
  },
  contactActions: {
    flexDirection: 'row',
    gap: 12,
  },
  contactActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactActionIcon: {
    fontSize: 20,
  },
  addButton: {
    marginTop: 8,
  },
  // Safety Timer
  timerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  timerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  timerInfo: {
    flex: 1,
  },
  timerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  timerDescription: {
    fontSize: 14,
    color: '#666',
  },
  timerButton: {
    marginBottom: 12,
  },
  timerNote: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Settings
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
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 16,
  },
  // Blocked Users
  blockedList: {
    gap: 12,
  },
  blockedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  blockedInfo: {
    flex: 1,
  },
  blockedName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  blockedDate: {
    fontSize: 13,
    color: '#999',
  },
  unblockButton: {
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '500',
  },
  // Resources
  resourcesList: {
    gap: 12,
    marginBottom: 16,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  resourceInfo: {
    flex: 1,
    marginRight: 12,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  resourcePhone: {
    fontSize: 15,
    color: '#E91E63',
    fontWeight: '500',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  resourceIcon: {
    fontSize: 24,
  },
  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  emergencyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  emergencyInfo: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginBottom: 4,
  },
  emergencyDescription: {
    fontSize: 13,
    color: '#C62828',
    lineHeight: 18,
  },
  emergencyButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  emergencyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty States
  emptyState: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  // Tips Section
  tipsSection: {
    margin: 20,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 22,
    marginBottom: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
  },
  modalButton: {
    marginTop: 8,
  },
});
