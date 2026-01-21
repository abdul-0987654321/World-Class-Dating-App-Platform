import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface Settings {
  general: {
    appName: string;
    supportEmail: string;
    maintenanceMode: boolean;
    registrationOpen: boolean;
  };
  matching: {
    minAge: number;
    maxAge: number;
    maxDistance: number;
    swipesPerDay: {
      free: number;
      gold: number;
      platinum: number;
      diamond: number;
    };
    superLikesPerDay: {
      free: number;
      gold: number;
      platinum: number;
      diamond: number;
    };
  };
  moderation: {
    autoModeration: boolean;
    photoModeration: boolean;
    messageModeration: boolean;
    profanityFilter: boolean;
    spamDetection: boolean;
    confidenceThreshold: number;
  };
  subscriptions: {
    goldPrice: number;
    platinumPrice: number;
    diamondPrice: number;
    trialDays: number;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  };
}

export const AdminSettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'general' | 'matching' | 'moderation' | 'subscriptions' | 'notifications'
  >('general');
  const [settings, setSettings] = useState<Settings>({
    general: {
      appName: 'Flamoral',
      supportEmail: 'support@flamoral.com',
      maintenanceMode: false,
      registrationOpen: true,
    },
    matching: {
      minAge: 18,
      maxAge: 100,
      maxDistance: 100,
      swipesPerDay: { free: 50, gold: 100, platinum: 200, diamond: -1 },
      superLikesPerDay: { free: 1, gold: 5, platinum: 10, diamond: -1 },
    },
    moderation: {
      autoModeration: true,
      photoModeration: true,
      messageModeration: true,
      profanityFilter: true,
      spamDetection: true,
      confidenceThreshold: 0.75,
    },
    subscriptions: {
      goldPrice: 14.99,
      platinumPrice: 29.99,
      diamondPrice: 49.99,
      trialDays: 7,
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      marketingEmails: false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = authTokenService.getToken();
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'matching', name: 'Matching', icon: '💕' },
    { id: 'moderation', name: 'Moderation', icon: '🛡️' },
    { id: 'subscriptions', name: 'Subscriptions', icon: '💎' },
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { name: 'Overview', path: '/admin' },
              { name: 'Users', path: '/admin/users' },
              { name: 'Moderation', path: '/admin/moderation' },
              { name: 'Verifications', path: '/admin/verifications' },
              { name: 'Reports', path: '/admin/reports' },
              { name: 'Analytics', path: '/admin/analytics' },
              { name: 'Settings', path: '/admin/settings', active: true },
            ].map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`py-4 px-2 border-b-2 whitespace-nowrap ${
                  item.active
                    ? 'border-pink-500 text-pink-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition ${
                    activeTab === tab.id
                      ? 'bg-pink-50 text-pink-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">General Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
                    <input
                      type="text"
                      value={settings.general.appName}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          general: { ...s.general, appName: e.target.value },
                        }))
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Support Email
                    </label>
                    <input
                      type="email"
                      value={settings.general.supportEmail}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          general: { ...s.general, supportEmail: e.target.value },
                        }))
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="flex items-center justify-between py-4 border-t">
                    <div>
                      <h3 className="font-medium text-gray-800">Maintenance Mode</h3>
                      <p className="text-sm text-gray-500">
                        Temporarily disable the app for maintenance
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          general: { ...s.general, maintenanceMode: !s.general.maintenanceMode },
                        }))
                      }
                      className={`w-14 h-8 rounded-full transition ${settings.general.maintenanceMode ? 'bg-red-500' : 'bg-gray-200'}`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow transform transition ${settings.general.maintenanceMode ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between py-4 border-t">
                    <div>
                      <h3 className="font-medium text-gray-800">Registration Open</h3>
                      <p className="text-sm text-gray-500">Allow new users to sign up</p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          general: { ...s.general, registrationOpen: !s.general.registrationOpen },
                        }))
                      }
                      className={`w-14 h-8 rounded-full transition ${settings.general.registrationOpen ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full shadow transform transition ${settings.general.registrationOpen ? 'translate-x-7' : 'translate-x-1'}`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Matching Settings */}
            {activeTab === 'matching' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Matching Settings</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Minimum Age
                      </label>
                      <input
                        type="number"
                        value={settings.matching.minAge}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            matching: { ...s.matching, minAge: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Age
                      </label>
                      <input
                        type="number"
                        value={settings.matching.maxAge}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            matching: { ...s.matching, maxAge: parseInt(e.target.value) },
                          }))
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Distance (miles)
                    </label>
                    <input
                      type="number"
                      value={settings.matching.maxDistance}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          matching: { ...s.matching, maxDistance: parseInt(e.target.value) },
                        }))
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-800 mb-4">
                      Daily Swipe Limits (-1 for unlimited)
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {(['free', 'gold', 'platinum', 'diamond'] as const).map((tier) => (
                        <div key={tier}>
                          <label className="block text-sm text-gray-500 mb-1 capitalize">
                            {tier}
                          </label>
                          <input
                            type="number"
                            value={settings.matching.swipesPerDay[tier]}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                matching: {
                                  ...s.matching,
                                  swipesPerDay: {
                                    ...s.matching.swipesPerDay,
                                    [tier]: parseInt(e.target.value),
                                  },
                                },
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="font-medium text-gray-800 mb-4">
                      Daily Super Likes (-1 for unlimited)
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {(['free', 'gold', 'platinum', 'diamond'] as const).map((tier) => (
                        <div key={tier}>
                          <label className="block text-sm text-gray-500 mb-1 capitalize">
                            {tier}
                          </label>
                          <input
                            type="number"
                            value={settings.matching.superLikesPerDay[tier]}
                            onChange={(e) =>
                              setSettings((s) => ({
                                ...s,
                                matching: {
                                  ...s.matching,
                                  superLikesPerDay: {
                                    ...s.matching.superLikesPerDay,
                                    [tier]: parseInt(e.target.value),
                                  },
                                },
                              }))
                            }
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Moderation Settings */}
            {activeTab === 'moderation' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Moderation Settings</h2>
                <div className="space-y-4">
                  {[
                    {
                      key: 'autoModeration',
                      label: 'Auto Moderation',
                      desc: 'Automatically flag content for review',
                    },
                    {
                      key: 'photoModeration',
                      label: 'Photo Moderation',
                      desc: 'Scan photos for inappropriate content',
                    },
                    {
                      key: 'messageModeration',
                      label: 'Message Moderation',
                      desc: 'Scan messages for violations',
                    },
                    {
                      key: 'profanityFilter',
                      label: 'Profanity Filter',
                      desc: 'Filter profane language in bios and prompts',
                    },
                    {
                      key: 'spamDetection',
                      label: 'Spam Detection',
                      desc: 'Detect and block spam accounts',
                    },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-4 border-b">
                      <div>
                        <h3 className="font-medium text-gray-800">{item.label}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            moderation: {
                              ...s.moderation,
                              [item.key]: !s.moderation[item.key as keyof typeof s.moderation],
                            },
                          }))
                        }
                        className={`w-14 h-8 rounded-full transition ${settings.moderation[item.key as keyof typeof settings.moderation] ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow transform transition ${settings.moderation[item.key as keyof typeof settings.moderation] ? 'translate-x-7' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  ))}
                  <div className="pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confidence Threshold (
                      {(settings.moderation.confidenceThreshold * 100).toFixed(0)}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.moderation.confidenceThreshold}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          moderation: {
                            ...s.moderation,
                            confidenceThreshold: parseFloat(e.target.value),
                          },
                        }))
                      }
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Content flagged above this confidence level will be queued for review
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Settings */}
            {activeTab === 'subscriptions' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">Subscription Pricing</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gold ($/month)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.subscriptions.goldPrice}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            subscriptions: {
                              ...s.subscriptions,
                              goldPrice: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platinum ($/month)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.subscriptions.platinumPrice}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            subscriptions: {
                              ...s.subscriptions,
                              platinumPrice: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Diamond ($/month)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={settings.subscriptions.diamondPrice}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            subscriptions: {
                              ...s.subscriptions,
                              diamondPrice: parseFloat(e.target.value),
                            },
                          }))
                        }
                        className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Free Trial Days
                    </label>
                    <input
                      type="number"
                      value={settings.subscriptions.trialDays}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          subscriptions: {
                            ...s.subscriptions,
                            trialDays: parseInt(e.target.value),
                          },
                        }))
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notification Settings */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-6">
                  Default Notification Settings
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      key: 'emailNotifications',
                      label: 'Email Notifications',
                      desc: 'Send email notifications by default',
                    },
                    {
                      key: 'pushNotifications',
                      label: 'Push Notifications',
                      desc: 'Enable push notifications by default',
                    },
                    {
                      key: 'marketingEmails',
                      label: 'Marketing Emails',
                      desc: 'Opt users into marketing emails by default',
                    },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-4 border-b">
                      <div>
                        <h3 className="font-medium text-gray-800">{item.label}</h3>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            notifications: {
                              ...s.notifications,
                              [item.key]:
                                !s.notifications[item.key as keyof typeof s.notifications],
                            },
                          }))
                        }
                        className={`w-14 h-8 rounded-full transition ${settings.notifications[item.key as keyof typeof settings.notifications] ? 'bg-green-500' : 'bg-gray-200'}`}
                      >
                        <div
                          className={`w-6 h-6 bg-white rounded-full shadow transform transition ${settings.notifications[item.key as keyof typeof settings.notifications] ? 'translate-x-7' : 'translate-x-1'}`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminSettingsPage;
