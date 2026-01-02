import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import safetyService, {
  VerificationStatus,
  SecuritySettings,
  PrivacySettings,
  EmergencyContact,
  SafetyTip,
  CrisisResource,
} from '../../services/safety.service';
import FlamoralBackground from '../../components/theme/FlamoralBackground';

type TabType = 'verification' | 'security' | 'privacy' | 'emergency' | 'resources';

export const SafetyCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('verification');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // State for each section
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [safetyTips, setSafetyTips] = useState<SafetyTip[]>([]);
  const [crisisResources, setCrisisResources] = useState<CrisisResource[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Default fallback data when API fails
  const getDefaultVerificationStatus = (): VerificationStatus => ({
    userId: 'default-user',
    emailVerified: true,
    phoneVerified: false,
    governmentIdVerified: false,
    selfieVerified: false,
    livenessVerified: false,
    videoVerified: false,
    biometricVerified: false,
    socialMediaVerified: [],
    verificationScore: 20,
    overallVerificationLevel: 'basic',
  });

  const getDefaultSecuritySettings = (): SecuritySettings => ({
    id: 'default-settings',
    user_id: 'default-user',
    two_factor_enabled: false,
    two_factor_method: null,
    login_alerts_enabled: true,
    new_device_alerts_enabled: true,
    suspicious_activity_alerts_enabled: true,
    allowed_login_countries: [],
    trusted_devices: [],
  });

  const getDefaultPrivacySettings = (): PrivacySettings => ({
    id: 'default-privacy',
    user_id: 'default-user',
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

  const getDefaultSafetyTips = (): SafetyTip[] => [
    { tip: 'Video chat before meeting in person', category: 'before', priority: 'high' },
    { tip: 'Tell a friend where you\'re going', category: 'before', priority: 'high' },
    { tip: 'Meet in a public place', category: 'during', priority: 'high' },
    { tip: 'Trust your instincts', category: 'during', priority: 'medium' },
    { tip: 'Check in with friends after the date', category: 'after', priority: 'medium' },
  ];

  const getDefaultCrisisResources = (): CrisisResource[] => [
    {
      type: 'domestic_violence',
      name: 'National Domestic Violence Hotline',
      contact: '1-800-799-7233',
      country: 'US',
      description: '24/7 confidential support for domestic violence survivors',
      hours: '24/7',
      website: 'https://www.thehotline.org',
    },
    {
      type: 'sexual_assault',
      name: 'RAINN Sexual Assault Hotline',
      contact: '1-800-656-4673',
      country: 'US',
      description: 'Free, confidential support for sexual assault survivors',
      hours: '24/7',
      website: 'https://www.rainn.org',
    },
    {
      type: 'suicide_hotline',
      name: 'National Suicide Prevention Lifeline',
      contact: '988',
      country: 'US',
      description: 'Free and confidential emotional support for people in crisis',
      hours: '24/7',
      website: 'https://988lifeline.org',
    },
    {
      type: 'crisis_text',
      name: 'Crisis Text Line',
      contact: 'Text HOME to 741741',
      country: 'US',
      description: 'Free crisis counseling via text message',
      hours: '24/7',
      website: 'https://www.crisistextline.org',
    },
    {
      type: 'human_trafficking',
      name: 'National Human Trafficking Hotline',
      contact: '1-888-373-7888',
      country: 'US',
      description: 'Anti-trafficking hotline for reporting tips and seeking help',
      hours: '24/7',
      website: 'https://humantraffickinghotline.org',
    },
    {
      type: 'lgbtq_support',
      name: 'Trans Lifeline',
      contact: '1-877-565-8860',
      country: 'US',
      description: 'Peer support for transgender people in crisis',
      hours: '24/7',
      website: 'https://translifeline.org',
    },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        safetyService.getVerificationStatus(),
        safetyService.getSecuritySettings(),
        safetyService.getPrivacySettings(),
        safetyService.getEmergencyContacts(),
        safetyService.getSafetyTips(),
        safetyService.getCrisisResources(),
      ]);

      // Use results or fallbacks
      setVerificationStatus(results[0].status === 'fulfilled' ? results[0].value : getDefaultVerificationStatus());
      setSecuritySettings(results[1].status === 'fulfilled' ? results[1].value : getDefaultSecuritySettings());
      setPrivacySettings(results[2].status === 'fulfilled' ? results[2].value : getDefaultPrivacySettings());
      setEmergencyContacts(results[3].status === 'fulfilled' ? results[3].value : []);
      setSafetyTips(results[4].status === 'fulfilled' ? results[4].value : getDefaultSafetyTips());
      setCrisisResources(results[5].status === 'fulfilled' ? results[5].value : getDefaultCrisisResources());
    } catch (err) {
      console.error('Failed to load safety data:', err);
      // Set all defaults on complete failure
      setVerificationStatus(getDefaultVerificationStatus());
      setSecuritySettings(getDefaultSecuritySettings());
      setPrivacySettings(getDefaultPrivacySettings());
      setEmergencyContacts([]);
      setSafetyTips(getDefaultSafetyTips());
      setCrisisResources(getDefaultCrisisResources());
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSecurity = async (updates: Partial<SecuritySettings>) => {
    try {
      setSaving(true);
      const updated = await safetyService.updateSecuritySettings(updates);
      setSecuritySettings(updated);
    } catch (err) {
      console.error('Failed to update security settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrivacy = async (updates: Partial<PrivacySettings>) => {
    try {
      setSaving(true);
      const updated = await safetyService.updatePrivacySettings(updates);
      setPrivacySettings(updated);
    } catch (err) {
      console.error('Failed to update privacy settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEmergencyContact = async (contact: Omit<EmergencyContact, 'id' | 'user_id'>) => {
    try {
      setSaving(true);
      const newContact = await safetyService.addEmergencyContact(contact);
      setEmergencyContacts([...emergencyContacts, newContact]);
    } catch (err) {
      console.error('Failed to add emergency contact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveEmergencyContact = async (contactId: string) => {
    try {
      setSaving(true);
      await safetyService.removeEmergencyContact(contactId);
      setEmergencyContacts(emergencyContacts.filter(c => c.id !== contactId));
    } catch (err) {
      console.error('Failed to remove emergency contact:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSOS = async () => {
    if (window.confirm('This will alert your emergency contacts. Continue?')) {
      try {
        await safetyService.triggerSOS();
        alert('SOS alert sent to your emergency contacts.');
      } catch (err) {
        console.error('Failed to trigger SOS:', err);
        alert('Failed to send SOS alert. Please try again.');
      }
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'verification',
      label: 'Verification',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'security',
      label: 'Security',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'privacy',
      label: 'Privacy',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
    },
    {
      id: 'emergency',
      label: 'Emergency',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      id: 'resources',
      label: 'Resources',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  if (loading) {
    return (
      <FlamoralBackground>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fm-pink"></div>
        </div>
      </FlamoralBackground>
    );
  }

  return (
    <FlamoralBackground>
      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-fm-surface/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-fm-pink to-fm-blue bg-clip-text text-transparent">
              Flamoral
            </h1>
            <nav className="flex items-center gap-6">
              <button onClick={() => navigate('/discover')} className="text-fm-text-secondary hover:text-fm-pink transition">
                Discover
              </button>
              <button onClick={() => navigate('/matches')} className="text-fm-text-secondary hover:text-fm-pink transition">
                Matches
              </button>
              <button onClick={() => navigate('/messages')} className="text-fm-text-secondary hover:text-fm-pink transition">
                Messages
              </button>
              <button onClick={() => navigate('/profile')} className="text-fm-text-secondary hover:text-fm-pink transition">
                Profile
              </button>
              <button onClick={() => navigate('/safety')} className="text-fm-pink font-medium">
                Safety
              </button>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* Page Title */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-fm-text-primary">Safety Center</h2>
            <p className="mt-1 text-fm-text-secondary">
              Manage your verification, security, privacy settings, and access safety resources.
            </p>
          </div>

          {/* SOS Button */}
          <div className="rounded-xl p-4 mb-6 flex items-center justify-between bg-red-500/10 border border-red-500/30">
            <div>
              <h3 className="font-semibold text-red-400">Emergency SOS</h3>
              <p className="text-sm text-red-300">Instantly alert your emergency contacts</p>
            </div>
            <button
              onClick={handleTriggerSOS}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-full transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              SOS
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="bg-fm-surface/60 backdrop-blur-sm rounded-xl mb-6 overflow-hidden border border-white/10">
            <div className="flex border-b border-white/10">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition ${
                    activeTab === tab.id ? 'border-b-2 border-fm-pink bg-fm-pink/10 text-fm-pink' : 'text-fm-text-secondary hover:text-fm-text-primary hover:bg-white/5'
                  }`}
                >
                  {tab.icon}
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'verification' && (
                <VerificationTab status={verificationStatus} />
              )}
              {activeTab === 'security' && (
                <SecurityTab
                  settings={securitySettings}
                  onUpdate={handleUpdateSecurity}
                  saving={saving}
                />
              )}
              {activeTab === 'privacy' && (
                <PrivacyTab
                  settings={privacySettings}
                  onUpdate={handleUpdatePrivacy}
                  saving={saving}
                />
              )}
              {activeTab === 'emergency' && (
                <EmergencyTab
                  contacts={emergencyContacts}
                  onAdd={handleAddEmergencyContact}
                  onRemove={handleRemoveEmergencyContact}
                  saving={saving}
                />
              )}
              {activeTab === 'resources' && (
                <ResourcesTab tips={safetyTips} resources={crisisResources} />
              )}
            </div>
          </div>
        </main>
      </div>
    </FlamoralBackground>
  );
};

// Verification Tab Component
const VerificationTab: React.FC<{ status: VerificationStatus | null }> = ({ status }) => {
  if (!status) return <p className="text-fm-text-secondary">Unable to load verification status.</p>;

  const verificationItems = [
    { label: 'Email', verified: status.emailVerified, icon: '📧' },
    { label: 'Phone', verified: status.phoneVerified, icon: '📱' },
    { label: 'Government ID', verified: status.governmentIdVerified, icon: '🪪' },
    { label: 'Selfie', verified: status.selfieVerified, icon: '🤳' },
    { label: 'Liveness Check', verified: status.livenessVerified, icon: '👁️' },
    { label: 'Video', verified: status.videoVerified, icon: '🎥' },
    { label: 'Biometric', verified: status.biometricVerified, icon: '🔐' },
  ];

  const levelColors = {
    none: 'bg-white/10 text-fm-text-secondary',
    basic: 'bg-fm-blue/20 text-fm-blue',
    standard: 'bg-green-500/20 text-green-400',
    enhanced: 'bg-purple-500/20 text-purple-400',
    premium: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
  };

  return (
    <div className="space-y-6">
      {/* Verification Score */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-fm-pink to-purple-600 text-white text-2xl font-bold mb-3">
          {status.verificationScore}%
        </div>
        <h3 className="text-lg font-semibold text-fm-text-primary">Verification Score</h3>
        <span className={`inline-block mt-2 px-4 py-1 rounded-full text-sm font-medium ${levelColors[status.overallVerificationLevel]}`}>
          {status.overallVerificationLevel.charAt(0).toUpperCase() + status.overallVerificationLevel.slice(1)} Level
        </span>
      </div>

      {/* Verification Items */}
      <div className="grid gap-3">
        {verificationItems.map((item, idx) => (
          <div
            key={idx}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              item.verified ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/10'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-medium text-fm-text-primary">{item.label}</span>
            </div>
            {item.verified ? (
              <span className="flex items-center gap-1 text-green-400 font-medium">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            ) : (
              <button className="text-fm-pink hover:opacity-80 font-medium text-sm transition">
                Verify Now
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Social Media Verification */}
      {status.socialMediaVerified.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-fm-text-primary mb-3">Linked Social Accounts</h4>
          <div className="flex flex-wrap gap-2">
            {status.socialMediaVerified.map((platform, idx) => (
              <span key={idx} className="bg-fm-blue/20 text-fm-blue px-3 py-1 rounded-full text-sm">
                {platform}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Security Tab Component
const SecurityTab: React.FC<{
  settings: SecuritySettings | null;
  onUpdate: (updates: Partial<SecuritySettings>) => void;
  saving: boolean;
}> = ({ settings, onUpdate, saving }) => {
  if (!settings) return <p className="text-fm-text-secondary">Unable to load security settings.</p>;

  const Toggle: React.FC<{
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-fm-text-primary">{label}</p>
        {description && <p className="text-sm text-fm-text-muted">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? 'bg-fm-pink' : 'bg-white/20'
        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Two-Factor Authentication</h3>
        <Toggle
          enabled={settings.two_factor_enabled}
          onChange={(value) => onUpdate({ two_factor_enabled: value })}
          label="Enable 2FA"
          description="Add an extra layer of security to your account"
        />
        {settings.two_factor_enabled && (
          <p className="text-sm text-fm-text-secondary mt-2">
            Method: {settings.two_factor_method || 'Not configured'}
          </p>
        )}
      </div>

      {/* Login Alerts */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Login Alerts</h3>
        <div className="space-y-2">
          <Toggle
            enabled={settings.login_alerts_enabled}
            onChange={(value) => onUpdate({ login_alerts_enabled: value })}
            label="Login Alerts"
            description="Get notified when someone logs into your account"
          />
          <Toggle
            enabled={settings.new_device_alerts_enabled}
            onChange={(value) => onUpdate({ new_device_alerts_enabled: value })}
            label="New Device Alerts"
            description="Get notified when a new device accesses your account"
          />
          <Toggle
            enabled={settings.suspicious_activity_alerts_enabled}
            onChange={(value) => onUpdate({ suspicious_activity_alerts_enabled: value })}
            label="Suspicious Activity Alerts"
            description="Get notified about unusual account activity"
          />
        </div>
      </div>

      {/* Trusted Devices */}
      <div>
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Trusted Devices</h3>
        {settings.trusted_devices.length > 0 ? (
          <ul className="space-y-2">
            {settings.trusted_devices.map((device, idx) => (
              <li key={idx} className="flex items-center justify-between bg-white/5 p-3 rounded-lg border border-white/10">
                <span className="text-fm-text-secondary">{device}</span>
                <button className="text-red-400 hover:text-red-300 text-sm transition">Remove</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-fm-text-muted">No trusted devices configured.</p>
        )}
      </div>
    </div>
  );
};

// Privacy Tab Component
const PrivacyTab: React.FC<{
  settings: PrivacySettings | null;
  onUpdate: (updates: Partial<PrivacySettings>) => void;
  saving: boolean;
}> = ({ settings, onUpdate, saving }) => {
  if (!settings) return <p className="text-fm-text-secondary">Unable to load privacy settings.</p>;

  const Toggle: React.FC<{
    enabled: boolean;
    onChange: (value: boolean) => void;
    label: string;
    description?: string;
  }> = ({ enabled, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-medium text-fm-text-primary">{label}</p>
        {description && <p className="text-sm text-fm-text-muted">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          enabled ? 'bg-fm-pink' : 'bg-white/20'
        } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Profile Visibility</h3>
        <div className="space-y-2">
          {(['public', 'matches_only', 'hidden'] as const).map(visibility => (
            <label
              key={visibility}
              className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${
                settings.profile_visibility === visibility
                  ? 'border-fm-pink bg-fm-pink/10'
                  : 'border-white/10 hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="visibility"
                checked={settings.profile_visibility === visibility}
                onChange={() => onUpdate({ profile_visibility: visibility })}
                className="sr-only"
              />
              <span className="font-medium text-fm-text-primary capitalize">
                {visibility.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Display Settings */}
      <div className="border-b border-white/10 pb-6">
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Display Settings</h3>
        <div className="space-y-2">
          <Toggle
            enabled={settings.show_online_status}
            onChange={(value) => onUpdate({ show_online_status: value })}
            label="Show Online Status"
            description="Let others see when you're online"
          />
          <Toggle
            enabled={settings.show_last_active}
            onChange={(value) => onUpdate({ show_last_active: value })}
            label="Show Last Active"
            description="Display when you were last active"
          />
          <Toggle
            enabled={settings.show_distance}
            onChange={(value) => onUpdate({ show_distance: value })}
            label="Show Distance"
            description="Display how far away you are from others"
          />
          <Toggle
            enabled={settings.show_age}
            onChange={(value) => onUpdate({ show_age: value })}
            label="Show Age"
            description="Display your age on your profile"
          />
        </div>
      </div>

      {/* Advanced Privacy */}
      <div>
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Advanced Privacy</h3>
        <div className="space-y-2">
          <Toggle
            enabled={settings.incognito_mode}
            onChange={(value) => onUpdate({ incognito_mode: value })}
            label="Incognito Mode"
            description="Browse profiles without appearing in their views"
          />
          <Toggle
            enabled={settings.hide_from_search}
            onChange={(value) => onUpdate({ hide_from_search: value })}
            label="Hide from Search"
            description="Don't appear in search results"
          />
          <Toggle
            enabled={settings.block_contacts}
            onChange={(value) => onUpdate({ block_contacts: value })}
            label="Block Phone Contacts"
            description="Prevent people in your contacts from seeing you"
          />
          <Toggle
            enabled={!settings.allow_screenshots}
            onChange={(value) => onUpdate({ allow_screenshots: !value })}
            label="Block Screenshots"
            description="Prevent others from taking screenshots of your profile"
          />
        </div>
      </div>
    </div>
  );
};

// Emergency Tab Component
const EmergencyTab: React.FC<{
  contacts: EmergencyContact[];
  onAdd: (contact: Omit<EmergencyContact, 'id' | 'user_id'>) => void;
  onRemove: (id: string) => void;
  saving: boolean;
}> = ({ contacts, onAdd, onRemove, saving }) => {
  const [showForm, setShowForm] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: '',
    is_primary: false,
    notify_on_sos: true,
    notify_on_checkin_miss: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(newContact);
    setNewContact({
      name: '',
      phone: '',
      email: '',
      relationship: '',
      is_primary: false,
      notify_on_sos: true,
      notify_on_checkin_miss: true,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-fm-text-primary">Emergency Contacts</h3>
          <p className="text-sm text-fm-text-secondary">People who will be notified in case of emergency</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-fm-pink hover:opacity-90 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Contact
        </button>
      </div>

      {/* Add Contact Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 rounded-lg p-4 space-y-4 border border-white/10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-fm-text-secondary mb-1">Name</label>
              <input
                type="text"
                required
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/10 rounded-lg focus:ring-2 focus:ring-fm-pink focus:outline-none text-fm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fm-text-secondary mb-1">Phone</label>
              <input
                type="tel"
                required
                value={newContact.phone}
                onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/10 rounded-lg focus:ring-2 focus:ring-fm-pink focus:outline-none text-fm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fm-text-secondary mb-1">Email</label>
              <input
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/10 rounded-lg focus:ring-2 focus:ring-fm-pink focus:outline-none text-fm-text-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fm-text-secondary mb-1">Relationship</label>
              <select
                required
                value={newContact.relationship}
                onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                className="w-full p-2 bg-white/10 border border-white/10 rounded-lg focus:ring-2 focus:ring-fm-pink focus:outline-none text-fm-text-primary"
              >
                <option value="" className="bg-fm-surface">Select...</option>
                <option value="family" className="bg-fm-surface">Family</option>
                <option value="friend" className="bg-fm-surface">Friend</option>
                <option value="partner" className="bg-fm-surface">Partner</option>
                <option value="other" className="bg-fm-surface">Other</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newContact.is_primary}
                onChange={(e) => setNewContact({ ...newContact, is_primary: e.target.checked })}
                className="rounded text-fm-pink focus:ring-fm-pink bg-white/10 border-white/20"
              />
              <span className="text-sm text-fm-text-secondary">Primary contact</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newContact.notify_on_sos}
                onChange={(e) => setNewContact({ ...newContact, notify_on_sos: e.target.checked })}
                className="rounded text-fm-pink focus:ring-fm-pink bg-white/10 border-white/20"
              />
              <span className="text-sm text-fm-text-secondary">Notify on SOS</span>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-fm-pink hover:opacity-90 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Contact'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-white/10 hover:bg-white/20 text-fm-text-primary px-4 py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Contacts List */}
      {contacts.length > 0 ? (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                contact.is_primary ? 'border-fm-pink/50 bg-fm-pink/10' : 'border-white/10 bg-white/5'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-fm-text-primary">{contact.name}</p>
                  {contact.is_primary && (
                    <span className="bg-fm-pink text-white text-xs px-2 py-0.5 rounded-full">Primary</span>
                  )}
                </div>
                <p className="text-sm text-fm-text-secondary">{contact.phone}</p>
                <p className="text-xs text-fm-text-muted capitalize">{contact.relationship}</p>
              </div>
              <button
                onClick={() => onRemove(contact.id)}
                disabled={saving}
                className="text-red-400 hover:text-red-300 disabled:opacity-50 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto text-fm-text-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="text-fm-text-muted">No emergency contacts added yet.</p>
          <p className="text-sm text-fm-text-muted">Add someone you trust to be notified in emergencies.</p>
        </div>
      )}
    </div>
  );
};

// Resources Tab Component
const ResourcesTab: React.FC<{
  tips: SafetyTip[];
  resources: CrisisResource[];
}> = ({ tips, resources }) => {
  const tipsByCategory = {
    before: tips.filter(t => t.category === 'before'),
    during: tips.filter(t => t.category === 'during'),
    after: tips.filter(t => t.category === 'after'),
  };

  return (
    <div className="space-y-8">
      {/* Safety Tips */}
      <div>
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Safety Tips for Dating</h3>

        {/* Before Meeting */}
        <div className="mb-6">
          <h4 className="font-medium text-fm-text-secondary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-fm-blue/20 text-fm-blue flex items-center justify-center text-sm">1</span>
            Before Meeting
          </h4>
          <ul className="space-y-2 pl-8">
            {tipsByCategory.before.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-2 ${
                  tip.priority === 'high' ? 'bg-red-500' : tip.priority === 'medium' ? 'bg-yellow-500' : 'bg-fm-text-muted'
                }`} />
                <span className="text-fm-text-secondary">{tip.tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* During Meeting */}
        <div className="mb-6">
          <h4 className="font-medium text-fm-text-secondary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm">2</span>
            During the Date
          </h4>
          <ul className="space-y-2 pl-8">
            {tipsByCategory.during.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-2 ${
                  tip.priority === 'high' ? 'bg-red-500' : tip.priority === 'medium' ? 'bg-yellow-500' : 'bg-fm-text-muted'
                }`} />
                <span className="text-fm-text-secondary">{tip.tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* After Meeting */}
        <div>
          <h4 className="font-medium text-fm-text-secondary mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">3</span>
            After the Date
          </h4>
          <ul className="space-y-2 pl-8">
            {tipsByCategory.after.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className={`w-2 h-2 rounded-full mt-2 ${
                  tip.priority === 'high' ? 'bg-red-500' : tip.priority === 'medium' ? 'bg-yellow-500' : 'bg-fm-text-muted'
                }`} />
                <span className="text-fm-text-secondary">{tip.tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Crisis Resources */}
      <div>
        <h3 className="text-lg font-semibold text-fm-text-primary mb-4">Crisis Resources</h3>
        <p className="text-sm text-fm-text-secondary mb-4">
          If you or someone you know is in immediate danger, please call 911.
        </p>
        <div className="grid gap-4">
          {resources.map((resource, idx) => {
            // Check if contact is a phone number (starts with digit or 1-)
            const isPhoneNumber = /^[0-9\-\(\)\s\+]+$/.test(resource.contact.replace(/\s/g, ''));
            // Format phone for tel: link (remove non-digits except +)
            const telLink = resource.contact.replace(/[^\d+]/g, '');

            return (
              <div key={idx} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-fm-pink/50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-fm-text-primary text-lg">{resource.name}</h4>
                    <p className="text-sm text-fm-text-secondary mt-1">{resource.description}</p>
                    {resource.hours && (
                      <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        Available {resource.hours}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {isPhoneNumber ? (
                      <a
                        href={`tel:${telLink}`}
                        className="bg-fm-pink hover:opacity-90 text-white px-4 py-2.5 rounded-lg transition flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        Call {resource.contact}
                      </a>
                    ) : (
                      <a
                        href={`sms:741741&body=HOME`}
                        className="bg-fm-blue hover:opacity-90 text-white px-4 py-2.5 rounded-lg transition flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {resource.contact}
                      </a>
                    )}
                    {resource.website && (
                      <a
                        href={resource.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fm-pink hover:opacity-80 text-sm inline-flex items-center justify-center gap-1 py-1 transition"
                      >
                        Visit website
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional help text */}
        <div className="mt-6 p-4 bg-fm-pink/10 rounded-lg border border-fm-pink/30">
          <p className="text-sm text-fm-text-secondary">
            <strong className="text-fm-text-primary">Remember:</strong> Your safety is our priority. If you encounter any concerning behavior on Flamoral, please use the in-app reporting tools or contact our safety team at{' '}
            <a href="mailto:safety@flamoral.com" className="text-fm-pink hover:opacity-80 font-medium transition">
              safety@flamoral.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SafetyCenterPage;
