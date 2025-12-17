/**
 * Notification Settings Component
 * UI for managing push notification preferences
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import axios from 'axios';

interface NotificationPreferences {
  pushNotificationsEnabled: boolean;
  emailNotificationsEnabled: boolean;
  smsNotificationsEnabled: boolean;
  notifyNewMatches: boolean;
  notifyNewMessages: boolean;
  notifyLikes: boolean;
  notifySuperLikes: boolean;
  notifyMessageRead: boolean;
  notifyProfileViews: boolean;
}

interface NotificationSettingsProps {
  className?: string;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({ className }) => {
  const {
    isSupported,
    permission,
    isRegistered,
    requestPermission,
    registerDevice,
    unregisterDevice,
    error: pushError,
  } = usePushNotifications();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    pushNotificationsEnabled: false,
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: false,
    notifyNewMatches: true,
    notifyNewMessages: true,
    notifyLikes: true,
    notifySuperLikes: true,
    notifyMessageRead: true,
    notifyProfileViews: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Load notification preferences
   */
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await axios.get('/api/settings/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          setPreferences(response.data.preferences);
        }
      } catch (err) {
        console.error('Error loading notification preferences:', err);
      }
    };

    loadPreferences();
  }, []);

  /**
   * Update notification preferences
   */
  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem('token');
      if (!token) {
        setError('User not authenticated');
        return;
      }

      const response = await axios.patch(
        '/api/settings/notifications',
        updates,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data.success) {
        setPreferences((prev) => ({ ...prev, ...updates }));
        setSuccess('Preferences updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.data.error || 'Failed to update preferences');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update preferences');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle push notifications
   */
  const togglePushNotifications = async () => {
    if (!isSupported) {
      setError('Push notifications not supported in this browser');
      return;
    }

    if (!preferences.pushNotificationsEnabled) {
      // Enable push notifications
      const granted = permission === 'granted' || (await requestPermission());

      if (!granted) {
        setError('Notification permission denied');
        return;
      }

      const registered = await registerDevice();
      if (registered) {
        await updatePreferences({ pushNotificationsEnabled: true });
      }
    } else {
      // Disable push notifications
      await unregisterDevice();
      await updatePreferences({ pushNotificationsEnabled: false });
    }
  };

  /**
   * Toggle notification type
   */
  const toggleNotificationType = async (type: keyof NotificationPreferences) => {
    const newValue = !preferences[type];
    await updatePreferences({ [type]: newValue });
  };

  return (
    <Container className={className}>
      <Header>
        <Title>Notification Preferences</Title>
        <Subtitle>Choose how you want to be notified</Subtitle>
      </Header>

      {(error || pushError) && (
        <ErrorMessage>{error || pushError}</ErrorMessage>
      )}

      {success && <SuccessMessage>{success}</SuccessMessage>}

      {/* Push Notifications Toggle */}
      <Section>
        <SectionTitle>Push Notifications</SectionTitle>
        {!isSupported && (
          <WarningMessage>
            Push notifications are not supported in this browser
          </WarningMessage>
        )}
        <SettingRow>
          <SettingInfo>
            <SettingLabel>Enable Push Notifications</SettingLabel>
            <SettingDescription>
              Receive real-time notifications on this device
            </SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.pushNotificationsEnabled}
            onChange={togglePushNotifications}
            disabled={!isSupported || loading}
          />
        </SettingRow>

        {permission && permission !== 'granted' && (
          <PermissionNote>
            Browser permission: <strong>{permission}</strong>
            {permission === 'denied' && (
              <span> - You need to enable notifications in your browser settings</span>
            )}
          </PermissionNote>
        )}

        {isRegistered && (
          <StatusBadge>Device registered for notifications</StatusBadge>
        )}
      </Section>

      {/* Email Notifications */}
      <Section>
        <SectionTitle>Email Notifications</SectionTitle>
        <SettingRow>
          <SettingInfo>
            <SettingLabel>Enable Email Notifications</SettingLabel>
            <SettingDescription>
              Receive notifications via email
            </SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.emailNotificationsEnabled}
            onChange={() => toggleNotificationType('emailNotificationsEnabled')}
            disabled={loading}
          />
        </SettingRow>
      </Section>

      {/* SMS Notifications */}
      <Section>
        <SectionTitle>SMS Notifications</SectionTitle>
        <SettingRow>
          <SettingInfo>
            <SettingLabel>Enable SMS Notifications</SettingLabel>
            <SettingDescription>
              Receive important notifications via SMS
            </SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.smsNotificationsEnabled}
            onChange={() => toggleNotificationType('smsNotificationsEnabled')}
            disabled={loading}
          />
        </SettingRow>
      </Section>

      {/* Notification Types */}
      <Section>
        <SectionTitle>What to Notify Me About</SectionTitle>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>New Matches 🎉</SettingLabel>
            <SettingDescription>When you get a new match</SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.notifyNewMatches}
            onChange={() => toggleNotificationType('notifyNewMatches')}
            disabled={loading}
          />
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>New Messages 💬</SettingLabel>
            <SettingDescription>When someone sends you a message</SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.notifyNewMessages}
            onChange={() => toggleNotificationType('notifyNewMessages')}
            disabled={loading}
          />
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Likes 💕</SettingLabel>
            <SettingDescription>When someone likes your profile</SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.notifyLikes}
            onChange={() => toggleNotificationType('notifyLikes')}
            disabled={loading}
          />
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Super Likes ⭐</SettingLabel>
            <SettingDescription>When someone super likes you</SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.notifySuperLikes}
            onChange={() => toggleNotificationType('notifySuperLikes')}
            disabled={loading}
          />
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Message Read Receipts ✓</SettingLabel>
            <SettingDescription>When someone reads your message</SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.notifyMessageRead}
            onChange={() => toggleNotificationType('notifyMessageRead')}
            disabled={loading}
          />
        </SettingRow>

        <SettingRow>
          <SettingInfo>
            <SettingLabel>Profile Views 👀</SettingLabel>
            <SettingDescription>When someone views your profile</SettingDescription>
          </SettingInfo>
          <Toggle
            checked={preferences.notifyProfileViews}
            onChange={() => toggleNotificationType('notifyProfileViews')}
            disabled={loading}
          />
        </SettingRow>
      </Section>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.div`
  margin-bottom: 30px;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 14px;
  color: #666;
`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
`;

const SettingRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border-bottom: none;
  }
`;

const SettingInfo = styled.div`
  flex: 1;
`;

const SettingLabel = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
`;

const SettingDescription = styled.div`
  font-size: 14px;
  color: #666;
`;

const Toggle = styled.input.attrs({ type: 'checkbox' })`
  width: 50px;
  height: 26px;
  position: relative;
  appearance: none;
  background: ${(props) => (props.checked ? '#4ECDC4' : '#ccc')};
  border-radius: 13px;
  outline: none;
  cursor: pointer;
  transition: background 0.3s;

  &:before {
    content: '';
    position: absolute;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: ${(props) => (props.checked ? '26px' : '2px')};
    transition: left 0.3s;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  background: #fee;
  color: #c33;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SuccessMessage = styled.div`
  background: #efe;
  color: #3c3;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const WarningMessage = styled.div`
  background: #fff3cd;
  color: #856404;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const PermissionNote = styled.div`
  font-size: 13px;
  color: #666;
  margin-top: 12px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;

  strong {
    color: #333;
    text-transform: capitalize;
  }
`;

const StatusBadge = styled.div`
  display: inline-block;
  padding: 6px 12px;
  background: #e8f5e9;
  color: #2e7d32;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  margin-top: 12px;
`;

export default NotificationSettings;
