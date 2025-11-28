import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface NotificationSettings {
  push: {
    matches: boolean;
    messages: boolean;
    likes: boolean;
    superLikes: boolean;
    profileViews: boolean;
  };
  email: {
    matches: boolean;
    messages: boolean;
    weeklyDigest: boolean;
    promotions: boolean;
    securityAlerts: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export const NotificationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotificationSettings>({
    push: {
      matches: true,
      messages: true,
      likes: true,
      superLikes: true,
      profileViews: false,
    },
    email: {
      matches: true,
      messages: false,
      weeklyDigest: true,
      promotions: false,
      securityAlerts: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/users/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.notifications) {
          // Map to our format
          setSettings((prev) => ({
            ...prev,
            push: {
              matches: data.data.notifications.matches,
              messages: data.data.notifications.messages,
              likes: data.data.notifications.likes,
              superLikes: data.data.notifications.superLikes,
              profileViews: false,
            },
            email: {
              ...prev.email,
              promotions: data.data.notifications.promotions,
              weeklyDigest: data.data.notifications.emailDigest,
            },
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notifications: {
            matches: settings.push.matches,
            messages: settings.push.messages,
            likes: settings.push.likes,
            superLikes: settings.push.superLikes,
            promotions: settings.email.promotions,
            emailDigest: settings.email.weeklyDigest,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save notification settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const Toggle: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
  }> = ({ checked, onChange, label, description }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-800">{label}</p>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full transition ${checked ? 'bg-pink-500' : 'bg-gray-300'}`}
      >
        <div
          className={`absolute w-5 h-5 bg-white rounded-full shadow transition transform top-0.5 ${
            checked ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Profile
        </button>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Notification Settings</h1>

        {/* Push Notifications */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Push Notifications</h2>
          </div>
          <Toggle
            checked={settings.push.matches}
            onChange={(v) => setSettings({ ...settings, push: { ...settings.push, matches: v } })}
            label="New Matches"
            description="Get notified when you have a new match"
          />
          <Toggle
            checked={settings.push.messages}
            onChange={(v) => setSettings({ ...settings, push: { ...settings.push, messages: v } })}
            label="Messages"
            description="Get notified for new messages"
          />
          <Toggle
            checked={settings.push.likes}
            onChange={(v) => setSettings({ ...settings, push: { ...settings.push, likes: v } })}
            label="Likes"
            description="Get notified when someone likes you"
          />
          <Toggle
            checked={settings.push.superLikes}
            onChange={(v) => setSettings({ ...settings, push: { ...settings.push, superLikes: v } })}
            label="Super Likes"
            description="Get notified for super likes"
          />
          <Toggle
            checked={settings.push.profileViews}
            onChange={(v) => setSettings({ ...settings, push: { ...settings.push, profileViews: v } })}
            label="Profile Views"
            description="Get notified when someone views your profile"
          />
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Email Notifications</h2>
          </div>
          <Toggle
            checked={settings.email.matches}
            onChange={(v) => setSettings({ ...settings, email: { ...settings.email, matches: v } })}
            label="New Matches"
            description="Receive an email when you match with someone"
          />
          <Toggle
            checked={settings.email.messages}
            onChange={(v) => setSettings({ ...settings, email: { ...settings.email, messages: v } })}
            label="Unread Messages"
            description="Get email reminders for unread messages"
          />
          <Toggle
            checked={settings.email.weeklyDigest}
            onChange={(v) => setSettings({ ...settings, email: { ...settings.email, weeklyDigest: v } })}
            label="Weekly Digest"
            description="Receive a weekly summary of your activity"
          />
          <Toggle
            checked={settings.email.promotions}
            onChange={(v) => setSettings({ ...settings, email: { ...settings.email, promotions: v } })}
            label="Promotions & Offers"
            description="Receive promotional emails and special offers"
          />
          <Toggle
            checked={settings.email.securityAlerts}
            onChange={(v) => setSettings({ ...settings, email: { ...settings.email, securityAlerts: v } })}
            label="Security Alerts"
            description="Important security notifications (recommended)"
          />
        </div>

        {/* Quiet Hours */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Quiet Hours</h2>
          </div>
          <Toggle
            checked={settings.quietHours.enabled}
            onChange={(v) => setSettings({ ...settings, quietHours: { ...settings.quietHours, enabled: v } })}
            label="Enable Quiet Hours"
            description="Pause notifications during specified hours"
          />
          {settings.quietHours.enabled && (
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input
                  type="time"
                  value={settings.quietHours.start}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHours: { ...settings.quietHours, start: e.target.value } })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input
                  type="time"
                  value={settings.quietHours.end}
                  onChange={(e) =>
                    setSettings({ ...settings, quietHours: { ...settings.quietHours, end: e.target.value } })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </main>
    </div>
  );
};

export default NotificationSettingsPage;
