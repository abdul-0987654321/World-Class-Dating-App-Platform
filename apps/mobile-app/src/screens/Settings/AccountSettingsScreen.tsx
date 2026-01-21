import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

const AccountSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('user@example.com');
  const [phone, setPhone] = useState('+1 (555) 123-4567');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    Alert.alert('Success', 'Account settings saved successfully');
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'A password reset link will be sent to your email.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Link',
        onPress: () => Alert.alert('Success', 'Password reset link sent to your email.'),
      },
    ]);
  };

  const handleChangeEmail = () => {
    Alert.alert('Change Email', 'A verification link will be sent to your new email address.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: () => Alert.alert('Success', 'Verification link sent to your new email.'),
      },
    ]);
  };

  const handleChangePhone = () => {
    Alert.alert('Change Phone', 'You will receive a verification code on your new phone number.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: () => Alert.alert('Success', 'Verification code sent to your new phone.'),
      },
    ]);
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
        <Text style={styles.headerTitle}>Account Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EMAIL</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email address"
            />
            <TouchableOpacity
              onPress={handleChangeEmail}
              style={styles.editButton}
              accessibilityRole="button"
              accessibilityLabel="Change email"
            >
              <Text style={styles.editButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>
            This email is used for login and important notifications
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PHONE NUMBER</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              editable={isEditing}
              keyboardType="phone-pad"
              accessibilityLabel="Phone number"
            />
            <TouchableOpacity
              onPress={handleChangePhone}
              style={styles.editButton}
              accessibilityRole="button"
              accessibilityLabel="Change phone"
            >
              <Text style={styles.editButtonText}>Change</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.helperText}>Used for account verification and security</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PASSWORD</Text>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleChangePassword}
            accessibilityRole="button"
            accessibilityLabel="Change password"
          >
            <Icon name="key-outline" size={24} color="#FF6B6B" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Change Password</Text>
              <Text style={styles.actionSubtitle}>Last changed 30 days ago</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VERIFICATION</Text>
          <View style={styles.verificationContainer}>
            <View style={styles.verificationItem}>
              <Icon
                name="checkmark-circle"
                size={24}
                color="#34C759"
                style={styles.verificationIcon}
              />
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>Email Verified</Text>
                <Text style={styles.verificationDate}>Verified on Jan 15, 2024</Text>
              </View>
            </View>

            <View style={styles.verificationItem}>
              <Icon
                name="checkmark-circle"
                size={24}
                color="#34C759"
                style={styles.verificationIcon}
              />
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>Phone Verified</Text>
                <Text style={styles.verificationDate}>Verified on Jan 15, 2024</Text>
              </View>
            </View>

            <View style={styles.verificationItem}>
              <Icon
                name="shield-checkmark"
                size={24}
                color="#34C759"
                style={styles.verificationIcon}
              />
              <View style={styles.verificationText}>
                <Text style={styles.verificationTitle}>Photo Verified</Text>
                <Text style={styles.verificationDate}>Verified on Jan 16, 2024</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONNECTED ACCOUNTS</Text>
          <TouchableOpacity style={styles.actionItem} accessibilityRole="button">
            <Icon name="logo-apple" size={24} color="#000" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Apple</Text>
              <Text style={styles.actionSubtitle}>Connected</Text>
            </View>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} accessibilityRole="button">
            <Icon name="logo-google" size={24} color="#EA4335" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Google</Text>
              <Text style={styles.actionSubtitle}>Connected</Text>
            </View>
            <Text style={styles.disconnectText}>Disconnect</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} accessibilityRole="button">
            <Icon name="logo-facebook" size={24} color="#1877F2" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Facebook</Text>
              <Text style={styles.actionSubtitle}>Not connected</Text>
            </View>
            <Text style={styles.connectText}>Connect</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DATA MANAGEMENT</Text>
          <TouchableOpacity
            style={styles.actionItem}
            accessibilityRole="button"
            accessibilityLabel="Download my data"
          >
            <Icon name="download-outline" size={24} color="#FF6B6B" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Download My Data</Text>
              <Text style={styles.actionSubtitle}>Get a copy of your information</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            accessibilityRole="button"
            accessibilityLabel="Clear cache"
          >
            <Icon name="trash-outline" size={24} color="#FF6B6B" />
            <View style={styles.actionText}>
              <Text style={styles.actionTitle}>Clear Cache</Text>
              <Text style={styles.actionSubtitle}>Free up storage space</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editButtonText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 16,
    marginTop: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  verificationContainer: {
    backgroundColor: '#FFFFFF',
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  verificationIcon: {
    marginRight: 12,
  },
  verificationText: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000',
  },
  verificationDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  disconnectText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  connectText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
});

export default AccountSettingsScreen;
