import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface PrivacySettings {
  profile_visibility: 'public' | 'matches_only' | 'hidden';
  show_online_status: boolean;
  show_last_active: boolean;
  show_distance: boolean;
  show_age: boolean;
  incognito_mode: boolean;
  hide_from_search: boolean;
  block_contacts: boolean;
  allow_screenshots: boolean;
}

export const PrivacySettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    show_online_status: true,
    show_last_active: true,
    show_distance: true,
    show_age: true,
    incognito_mode: false,
    hide_from_search: false,
    block_contacts: false,
    allow_screenshots: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/safety/privacy-settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load privacy settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = authTokenService.getToken();
      await fetch('/api/safety/privacy-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
    } catch (err) {
      console.error('Failed to save privacy settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const Toggle: React.FC<{
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
    description?: string;
    premium?: boolean;
  }> = ({ checked, onChange, label, description, premium }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1">
        <p className="font-medium text-gray-800 flex items-center gap-2">
          {label}
          {premium && (
            <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">Premium</span>
          )}
        </p>
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

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Privacy Settings</h1>

        {/* Profile Visibility */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Profile Visibility</h2>
          <div className="space-y-3">
            {(['public', 'matches_only', 'hidden'] as const).map((visibility) => (
              <label
                key={visibility}
                className={`flex items-center p-4 rounded-lg border cursor-pointer transition ${
                  settings.profile_visibility === visibility
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={settings.profile_visibility === visibility}
                  onChange={() => setSettings({ ...settings, profile_visibility: visibility })}
                  className="sr-only"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 capitalize">{visibility.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-500">
                    {visibility === 'public' && 'Anyone can see your profile'}
                    {visibility === 'matches_only' && 'Only your matches can see your profile'}
                    {visibility === 'hidden' && 'Your profile is hidden from everyone'}
                  </p>
                </div>
                {settings.profile_visibility === visibility && (
                  <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Display Settings */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Display Settings</h2>
          <Toggle
            checked={settings.show_online_status}
            onChange={(v) => setSettings({ ...settings, show_online_status: v })}
            label="Show Online Status"
            description="Let others see when you're online"
          />
          <Toggle
            checked={settings.show_last_active}
            onChange={(v) => setSettings({ ...settings, show_last_active: v })}
            label="Show Last Active"
            description="Display when you were last active"
          />
          <Toggle
            checked={settings.show_distance}
            onChange={(v) => setSettings({ ...settings, show_distance: v })}
            label="Show Distance"
            description="Display how far away you are from others"
          />
          <Toggle
            checked={settings.show_age}
            onChange={(v) => setSettings({ ...settings, show_age: v })}
            label="Show Age"
            description="Display your age on your profile"
          />
        </div>

        {/* Advanced Privacy */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Advanced Privacy</h2>
          <Toggle
            checked={settings.incognito_mode}
            onChange={(v) => setSettings({ ...settings, incognito_mode: v })}
            label="Incognito Mode"
            description="Browse profiles without appearing in their views"
            premium
          />
          <Toggle
            checked={settings.hide_from_search}
            onChange={(v) => setSettings({ ...settings, hide_from_search: v })}
            label="Hide from Search"
            description="Don't appear in search results"
          />
          <Toggle
            checked={settings.block_contacts}
            onChange={(v) => setSettings({ ...settings, block_contacts: v })}
            label="Block Phone Contacts"
            description="Prevent people in your contacts from seeing you"
          />
          <Toggle
            checked={!settings.allow_screenshots}
            onChange={(v) => setSettings({ ...settings, allow_screenshots: !v })}
            label="Block Screenshots"
            description="Prevent others from taking screenshots of your profile"
            premium
          />
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

export default PrivacySettingsPage;
