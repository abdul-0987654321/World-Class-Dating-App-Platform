import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';
import { authTokenService } from '../../services/auth-token.service';

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
      const token = authTokenService.getToken();
      const res = await fetch('/api/users/settings', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      }

      // Load account info
      const userRes = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
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
      const token = authTokenService.getToken();
      await fetch('/api/users/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = authTokenService.getToken();
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
      const token = authTokenService.getToken();
      await fetch('/api/users/account', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
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
        checked ? 'bg-pink-500' : 'bg-gray-300'
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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['notifications', 'privacy', 'discovery', 'account'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeTab === tab
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-xl shadow-sm divide-y">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">New Matches</p>
                <p className="text-sm text-gray-500">Get notified when you have a new match</p>
              </div>
              <ToggleSwitch
                checked={settings.notifications.matches}
                onChange={(v) => handleToggle('notifications', 'matches', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Messages</p>
                <p className="text-sm text-gray-500">Get notified for new messages</p>
              </div>
              <ToggleSwitch
                checked={settings.notifications.messages}
                onChange={(v) => handleToggle('notifications', 'messages', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Likes</p>
                <p className="text-sm text-gray-500">Get notified when someone likes you</p>
              </div>
              <ToggleSwitch
                checked={settings.notifications.likes}
                onChange={(v) => handleToggle('notifications', 'likes', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Super Likes</p>
                <p className="text-sm text-gray-500">Get notified for super likes</p>
              </div>
              <ToggleSwitch
                checked={settings.notifications.superLikes}
                onChange={(v) => handleToggle('notifications', 'superLikes', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Promotions</p>
                <p className="text-sm text-gray-500">Receive promotional notifications</p>
              </div>
              <ToggleSwitch
                checked={settings.notifications.promotions}
                onChange={(v) => handleToggle('notifications', 'promotions', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Email Digest</p>
                <p className="text-sm text-gray-500">Weekly summary of your activity</p>
              </div>
              <ToggleSwitch
                checked={settings.notifications.emailDigest}
                onChange={(v) => handleToggle('notifications', 'emailDigest', v)}
              />
            </div>
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="bg-white rounded-xl shadow-sm divide-y">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Show Online Status</p>
                <p className="text-sm text-gray-500">Let others see when you're online</p>
              </div>
              <ToggleSwitch
                checked={settings.privacy.showOnlineStatus}
                onChange={(v) => handleToggle('privacy', 'showOnlineStatus', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Show Distance</p>
                <p className="text-sm text-gray-500">Show your distance to others</p>
              </div>
              <ToggleSwitch
                checked={settings.privacy.showDistance}
                onChange={(v) => handleToggle('privacy', 'showDistance', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Show Age</p>
                <p className="text-sm text-gray-500">Display your age on profile</p>
              </div>
              <ToggleSwitch
                checked={settings.privacy.showAge}
                onChange={(v) => handleToggle('privacy', 'showAge', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Read Receipts</p>
                <p className="text-sm text-gray-500">Show when you've read messages</p>
              </div>
              <ToggleSwitch
                checked={settings.privacy.readReceipts}
                onChange={(v) => handleToggle('privacy', 'readReceipts', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800 flex items-center gap-2">
                  Incognito Mode
                  <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">Premium</span>
                </p>
                <p className="text-sm text-gray-500">Browse profiles without being seen</p>
              </div>
              <ToggleSwitch
                checked={settings.privacy.incognitoMode}
                onChange={(v) => handleToggle('privacy', 'incognitoMode', v)}
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Hide from Search</p>
                <p className="text-sm text-gray-500">Don't appear in discovery</p>
              </div>
              <ToggleSwitch
                checked={settings.privacy.hideFromSearch}
                onChange={(v) => handleToggle('privacy', 'hideFromSearch', v)}
              />
            </div>
          </div>
        )}

        {/* Discovery Tab */}
        {activeTab === 'discovery' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm divide-y">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Show Me in Discovery</p>
                  <p className="text-sm text-gray-500">Allow others to discover your profile</p>
                </div>
                <ToggleSwitch
                  checked={settings.discovery.showMe}
                  onChange={(v) => handleToggle('discovery', 'showMe', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Pause Discovery</p>
                  <p className="text-sm text-gray-500">Take a break from matching</p>
                </div>
                <ToggleSwitch
                  checked={settings.discovery.discoveryPaused}
                  onChange={(v) => handleToggle('discovery', 'discoveryPaused', v)}
                />
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800 flex items-center gap-2">
                    Global Mode
                    <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">Premium</span>
                  </p>
                  <p className="text-sm text-gray-500">Match with people worldwide</p>
                </div>
                <ToggleSwitch
                  checked={settings.discovery.globalMode}
                  onChange={(v) => handleToggle('discovery', 'globalMode', v)}
                />
              </div>
            </div>

            <button
              onClick={() => navigate('/filters')}
              className="w-full bg-white rounded-xl shadow-sm p-4 flex items-center justify-between hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Advanced Filters</p>
                  <p className="text-sm text-gray-500">Customize your discovery preferences</p>
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
            <div className="bg-white rounded-xl shadow-sm divide-y">
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-medium text-gray-800">{settings.account.email || 'Not set'}</p>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-500 mb-1">Phone</p>
                <p className="font-medium text-gray-800">{settings.account.phone || 'Not set'}</p>
              </div>
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-800">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Add extra security to your account</p>
                </div>
                <ToggleSwitch
                  checked={settings.account.twoFactorEnabled}
                  onChange={(v) => handleToggle('account', 'twoFactorEnabled', v)}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm divide-y">
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
              >
                <span className="font-medium text-gray-800">Change Password</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <button
                onClick={() => navigate('/safety/data-export')}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
              >
                <span className="font-medium text-gray-800">Download My Data</span>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm divide-y">
              <button
                onClick={handleLogout}
                className="w-full p-4 text-left text-orange-500 font-medium hover:bg-orange-50 transition"
              >
                Sign Out
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="w-full p-4 text-left text-red-500 font-medium hover:bg-red-50 transition"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowChangePasswordModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                className="flex-1 py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
              >
                Change Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Account?</h3>
              <p className="text-gray-500 mb-6">
                This action cannot be undone. All your data, matches, and conversations will be permanently deleted.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
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
