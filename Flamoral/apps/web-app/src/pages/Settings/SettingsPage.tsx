import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface Settings {
  notifications: {
    matches: boolean;
    messages: boolean;
    likes: boolean;
    superLikes: boolean;
    promotions: boolean;
    emailDigest: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showDistance: boolean;
    showAge: boolean;
    readReceipts: boolean;
    incognitoMode: boolean;
    hideFromSearch: boolean;
  };
  discovery: {
    showMe: boolean;
    discoveryPaused: boolean;
    globalMode: boolean;
  };
  account: {
    email: string;
    phone: string;
    twoFactorEnabled: boolean;
  };
}

const defaultSettings: Settings = {
  notifications: {
    matches: true,
    messages: true,
    likes: true,
    superLikes: true,
    promotions: false,
    emailDigest: true,
  },
  privacy: {
    showOnlineStatus: true,
    showDistance: true,
    showAge: true,
    readReceipts: true,
    incognitoMode: false,
    hideFromSearch: false,
  },
  discovery: {
    showMe: true,
    discoveryPaused: false,
    globalMode: false,
  },
  account: {
    email: '',
    phone: '',
    twoFactorEnabled: false,
  },
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'privacy' | 'discovery' | 'account'>('notifications');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/v1/users/settings', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }

      // Load account info
      const userRes = await fetch('/api/v1/auth/me', {
        credentials: 'include',
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        if (userData.data) {
          setSettings(prev => ({
            ...prev,
            account: {
              ...prev.account,
              email: userData.data.email || '',
              phone: userData.data.phone || '',
              twoFactorEnabled: userData.data.twoFactorEnabled || false,
            },
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/v1/users/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (category: keyof Settings, key: string, value: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as object),
        [key]: value,
      },
    }));
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        setShowChangePasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        alert('Password changed successfully');
      } else {
        alert('Failed to change password. Please check your current password.');
      }
    } catch (err) {
      console.error('Failed to change password:', err);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await fetch('/api/v1/users/account', {
        method: 'DELETE',
        credentials: 'include',
      });
      localStorage.clear();
      navigate('/login');
    } catch (err) {
      console.error('Failed to delete account:', err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean }> = ({
    checked,
    onChange,
    disabled = false,
  }) => (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition ${
        checked ? 'bg-gradient-to-r from-pink-500 to-purple-600' : 'bg-white/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div
        className={`absolute w-5 h-5 bg-white rounded-full shadow transition transform ${
          checked ? 'translate-x-6' : 'translate-x-0.5'
        } top-0.5`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['notifications', 'privacy', 'discovery', 'account'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Notification Preferences</h2>
              <p className="text-sm text-gray-400">Choose what updates you want to receive</p>
            </div>
            <div className="divide-y divide-white/10">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">New Matches</h3>
                  <p className="text-sm text-gray-400">Get notified when you have a new match</p>
                </div>
                <ToggleSwitch
                  checked={settings.notifications.matches}
                  onChange={(v) => handleToggle('notifications', 'matches', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Messages</h3>
                  <p className="text-sm text-gray-400">Get notified for new messages</p>
                </div>
                <ToggleSwitch
                  checked={settings.notifications.messages}
                  onChange={(v) => handleToggle('notifications', 'messages', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Likes</h3>
                  <p className="text-sm text-gray-400">Get notified when someone likes you</p>
                </div>
                <ToggleSwitch
                  checked={settings.notifications.likes}
                  onChange={(v) => handleToggle('notifications', 'likes', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Super Likes</h3>
                  <p className="text-sm text-gray-400">Get notified for super likes</p>
                </div>
                <ToggleSwitch
                  checked={settings.notifications.superLikes}
                  onChange={(v) => handleToggle('notifications', 'superLikes', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Promotions</h3>
                  <p className="text-sm text-gray-400">Receive promotional notifications</p>
                </div>
                <ToggleSwitch
                  checked={settings.notifications.promotions}
                  onChange={(v) => handleToggle('notifications', 'promotions', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Email Digest</h3>
                  <p className="text-sm text-gray-400">Weekly summary of your activity</p>
                </div>
                <ToggleSwitch
                  checked={settings.notifications.emailDigest}
                  onChange={(v) => handleToggle('notifications', 'emailDigest', v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Privacy Controls</h2>
              <p className="text-sm text-gray-400">Manage your visibility and privacy settings</p>
            </div>
            <div className="divide-y divide-white/10">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Show Online Status</h3>
                  <p className="text-sm text-gray-400">Let others see when you're online</p>
                </div>
                <ToggleSwitch
                  checked={settings.privacy.showOnlineStatus}
                  onChange={(v) => handleToggle('privacy', 'showOnlineStatus', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Show Distance</h3>
                  <p className="text-sm text-gray-400">Show your distance to others</p>
                </div>
                <ToggleSwitch
                  checked={settings.privacy.showDistance}
                  onChange={(v) => handleToggle('privacy', 'showDistance', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Show Age</h3>
                  <p className="text-sm text-gray-400">Display your age on profile</p>
                </div>
                <ToggleSwitch
                  checked={settings.privacy.showAge}
                  onChange={(v) => handleToggle('privacy', 'showAge', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Read Receipts</h3>
                  <p className="text-sm text-gray-400">Show when you've read messages</p>
                </div>
                <ToggleSwitch
                  checked={settings.privacy.readReceipts}
                  onChange={(v) => handleToggle('privacy', 'readReceipts', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium flex items-center gap-2">
                    Incognito Mode
                    <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">Premium</span>
                  </h3>
                  <p className="text-sm text-gray-400">Browse profiles without being seen</p>
                </div>
                <ToggleSwitch
                  checked={settings.privacy.incognitoMode}
                  onChange={(v) => handleToggle('privacy', 'incognitoMode', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Hide from Search</h3>
                  <p className="text-sm text-gray-400">Don't appear in discovery</p>
                </div>
                <ToggleSwitch
                  checked={settings.privacy.hideFromSearch}
                  onChange={(v) => handleToggle('privacy', 'hideFromSearch', v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Discovery Tab */}
        {activeTab === 'discovery' && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Discovery Settings</h2>
                <p className="text-sm text-gray-400">Control how you appear to others</p>
              </div>
              <div className="divide-y divide-white/10">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Show Me in Discovery</h3>
                    <p className="text-sm text-gray-400">Allow others to discover your profile</p>
                  </div>
                  <ToggleSwitch
                    checked={settings.discovery.showMe}
                    onChange={(v) => handleToggle('discovery', 'showMe', v)}
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Pause Discovery</h3>
                    <p className="text-sm text-gray-400">Take a break from matching</p>
                  </div>
                  <ToggleSwitch
                    checked={settings.discovery.discoveryPaused}
                    onChange={(v) => handleToggle('discovery', 'discoveryPaused', v)}
                  />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium flex items-center gap-2">
                      Global Mode
                      <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded-full border border-purple-500/30">Premium</span>
                    </h3>
                    <p className="text-sm text-gray-400">Match with people worldwide</p>
                  </div>
                  <ToggleSwitch
                    checked={settings.discovery.globalMode}
                    onChange={(v) => handleToggle('discovery', 'globalMode', v)}
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/filters')}
              className="w-full bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 flex items-center justify-between hover:bg-white/10 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center border border-pink-500/30">
                  <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">Advanced Filters</p>
                  <p className="text-sm text-gray-400">Customize your discovery preferences</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-4">
            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Account Information</h2>
                <p className="text-sm text-gray-400">Your personal details and credentials</p>
              </div>
              <div className="divide-y divide-white/10">
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-1">Email</p>
                  <p className="font-medium text-white">{settings.account.email || 'Not set'}</p>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-400 mb-1">Phone</p>
                  <p className="font-medium text-white">{settings.account.phone || 'Not set'}</p>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-medium">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-400">Add extra security to your account</p>
                  </div>
                  <ToggleSwitch
                    checked={settings.account.twoFactorEnabled}
                    onChange={(v) => handleToggle('account', 'twoFactorEnabled', v)}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/10">
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition text-left"
              >
                <span className="font-medium text-white">Change Password</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/safety/data-export')}
                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition text-left"
              >
                <span className="font-medium text-white">Download My Data</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden divide-y divide-white/10">
              <button
                onClick={handleLogout}
                className="w-full p-4 text-left text-orange-400 font-medium hover:bg-orange-500/10 transition"
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full p-4 text-left text-red-400 font-medium hover:bg-red-500/10 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </main>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-white mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="flex-1 py-3 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 transition"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Delete Account?</h3>
              <p className="text-gray-400 mb-6">
                This action cannot be undone. All your data, matches, and conversations will be permanently deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-white/5 text-gray-300 rounded-lg hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
