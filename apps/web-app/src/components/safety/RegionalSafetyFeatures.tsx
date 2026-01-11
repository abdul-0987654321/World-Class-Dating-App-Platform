/**
 * Regional Safety Features Component
 * Provides enhanced safety features based on user's region
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface SafetyMode {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
}

interface EmergencyContact {
  name: string;
  number: string;
  description: string;
}

interface RegionalSafetyConfig {
  region: string;
  showLgbtqSafetyMode: boolean;
  showWomensSafetyFeatures: boolean;
  emergencyContacts: EmergencyContact[];
}

// ============================================================================
// ICONS
// ============================================================================

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const ExitIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

// ============================================================================
// LGBTQ+ SAFETY MODE COMPONENT
// ============================================================================

interface LgbtqSafetyModeProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export const LgbtqSafetyMode: React.FC<LgbtqSafetyModeProps> = ({ enabled, onToggle }) => {
  const features = [
    { icon: <LockIcon />, text: 'Hide app icon from home screen' },
    { icon: <ExitIcon />, text: 'Quick exit button to switch apps instantly' },
    { icon: <ShieldIcon />, text: 'Decoy app appearance option' },
    { icon: <LockIcon />, text: 'Location fuzzing (approximate location only)' },
    { icon: <ShieldIcon />, text: 'Profile hidden outside your region' },
  ];

  return (
    <div className="bg-base-charcoal/80 backdrop-blur-sm rounded-3xl p-6 border border-base-dark-gray">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white">
            <ShieldIcon />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Privacy Mode</h3>
            <p className="text-sm text-gray-400">Enhanced privacy protection</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={`relative w-14 h-8 rounded-full transition-colors duration-300 ${
            enabled ? 'bg-gradient-pink-blue' : 'bg-base-dark-gray'
          }`}
        >
          <motion.div
            className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow"
            animate={{ x: enabled ? 24 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 text-gray-300">
                <div className="w-8 h-8 bg-base-dark-gray rounded-lg flex items-center justify-center text-green-400">
                  {feature.icon}
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
            <p className="text-xs text-gray-500 mt-4 pt-4 border-t border-base-dark-gray">
              Your safety is our priority. These features help protect your privacy in regions where being yourself might put you at risk.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================================
// WOMEN'S SAFETY FEATURES COMPONENT
// ============================================================================

interface WomensSafetyFeaturesProps {
  onShareDateDetails: () => void;
  onSetCheckIn: () => void;
  onAddEmergencyContact: () => void;
}

export const WomensSafetyFeatures: React.FC<WomensSafetyFeaturesProps> = ({
  onShareDateDetails,
  onSetCheckIn,
  onAddEmergencyContact,
}) => {
  return (
    <div className="bg-base-charcoal/80 backdrop-blur-sm rounded-3xl p-6 border border-base-dark-gray">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-gradient-blue-green rounded-xl flex items-center justify-center text-white">
          <HeartIcon />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Safety Features</h3>
          <p className="text-sm text-gray-400">Stay safe when meeting someone new</p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onShareDateDetails}
          className="w-full flex items-center justify-between p-4 bg-base-dark-gray/50 rounded-xl hover:bg-base-dark-gray transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center text-pink-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Share Date Details</p>
              <p className="text-sm text-gray-400">Send location & time to trusted contact</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onSetCheckIn}
          className="w-full flex items-center justify-between p-4 bg-base-dark-gray/50 rounded-xl hover:bg-base-dark-gray transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Set Check-In Reminder</p>
              <p className="text-sm text-gray-400">Get reminded to check in during date</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          onClick={onAddEmergencyContact}
          className="w-full flex items-center justify-between p-4 bg-base-dark-gray/50 rounded-xl hover:bg-base-dark-gray transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center text-green-400">
              <PhoneIcon />
            </div>
            <div className="text-left">
              <p className="text-white font-medium">Emergency Contacts</p>
              <p className="text-sm text-gray-400">Quick dial in case of emergency</p>
            </div>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="mt-4 p-3 bg-green-500/10 rounded-xl border border-green-500/20">
        <p className="text-sm text-green-400 flex items-center space-x-2">
          <ShieldIcon />
          <span>Video verification recommended before meeting</span>
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// EMERGENCY CONTACTS COMPONENT
// ============================================================================

interface EmergencyContactsProps {
  contacts: EmergencyContact[];
  userContacts: { name: string; phone: string }[];
  onAddContact: () => void;
  onCallEmergency: (number: string) => void;
}

export const EmergencyContacts: React.FC<EmergencyContactsProps> = ({
  contacts,
  userContacts,
  onAddContact,
  onCallEmergency,
}) => {
  return (
    <div className="bg-base-charcoal/80 backdrop-blur-sm rounded-3xl p-6 border border-base-dark-gray">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white">
          <PhoneIcon />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Emergency Contacts</h3>
          <p className="text-sm text-gray-400">Quick access when you need help</p>
        </div>
      </div>

      {/* Official Emergency Numbers */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Official Emergency Lines</h4>
        <div className="space-y-2">
          {contacts.map((contact, index) => (
            <button
              key={index}
              onClick={() => onCallEmergency(contact.number)}
              className="w-full flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center text-white">
                  <PhoneIcon />
                </div>
                <div className="text-left">
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-400">{contact.description}</p>
                </div>
              </div>
              <span className="text-red-400 font-bold">{contact.number}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Personal Emergency Contacts */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Your Trusted Contacts</h4>
        {userContacts.length > 0 ? (
          <div className="space-y-2">
            {userContacts.map((contact, index) => (
              <button
                key={index}
                onClick={() => onCallEmergency(contact.phone)}
                className="w-full flex items-center justify-between p-3 bg-base-dark-gray/50 rounded-xl hover:bg-base-dark-gray transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-white">{contact.name}</span>
                </div>
                <span className="text-gray-400">{contact.phone}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 mb-3">No trusted contacts added yet</p>
        )}
        <button
          onClick={onAddContact}
          className="w-full mt-2 p-3 border-2 border-dashed border-base-dark-gray rounded-xl text-gray-400 hover:border-pink-500/50 hover:text-pink-400 transition-colors"
        >
          + Add Trusted Contact
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// QUICK EXIT BUTTON COMPONENT
// ============================================================================

interface QuickExitButtonProps {
  enabled: boolean;
  decoyUrl?: string;
}

export const QuickExitButton: React.FC<QuickExitButtonProps> = ({
  enabled,
  decoyUrl = 'https://www.google.com/search?q=weather',
}) => {
  const handleQuickExit = () => {
    // Replace current history entry and redirect
    window.location.replace(decoyUrl);
  };

  if (!enabled) return null;

  return (
    <button
      onClick={handleQuickExit}
      className="fixed bottom-6 left-6 z-50 w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg flex items-center justify-center transition-colors"
      aria-label="Quick exit"
      title="Quick exit - opens neutral website"
    >
      <ExitIcon />
    </button>
  );
};

// ============================================================================
// MAIN REGIONAL SAFETY COMPONENT
// ============================================================================

interface RegionalSafetyFeaturesProps {
  region: string;
  userGender?: 'male' | 'female' | 'non-binary' | 'other';
  config?: RegionalSafetyConfig;
}

export const RegionalSafetyFeatures: React.FC<RegionalSafetyFeaturesProps> = ({
  region,
  userGender,
  config,
}) => {
  const [lgbtqSafetyEnabled, setLgbtqSafetyEnabled] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Default config based on region
  const defaultConfig: RegionalSafetyConfig = {
    region,
    showLgbtqSafetyMode: ['MENA', 'SSA', 'RU', 'CN'].some(r => region.includes(r)),
    showWomensSafetyFeatures: true,
    emergencyContacts: [
      { name: 'Emergency Services', number: '112', description: 'Police, Fire, Ambulance' },
      { name: 'RAINN Hotline', number: '1-800-656-4673', description: 'Sexual Assault Support' },
    ],
  };

  const safetyConfig = config || defaultConfig;

  const handleShareDateDetails = () => {
    // Implement share date details modal
  };

  const handleSetCheckIn = () => {
    // Implement check-in reminder
  };

  const handleAddEmergencyContact = () => {
    // Implement add contact modal
  };

  const handleCallEmergency = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Exit Button - Always visible when LGBTQ mode enabled */}
      <QuickExitButton enabled={lgbtqSafetyEnabled} />

      {/* LGBTQ+ Safety Mode - Only in certain regions */}
      {safetyConfig.showLgbtqSafetyMode && (
        <LgbtqSafetyMode
          enabled={lgbtqSafetyEnabled}
          onToggle={setLgbtqSafetyEnabled}
        />
      )}

      {/* Women's Safety Features */}
      {safetyConfig.showWomensSafetyFeatures && (
        <WomensSafetyFeatures
          onShareDateDetails={handleShareDateDetails}
          onSetCheckIn={handleSetCheckIn}
          onAddEmergencyContact={handleAddEmergencyContact}
        />
      )}

      {/* Emergency Contacts */}
      <EmergencyContacts
        contacts={safetyConfig.emergencyContacts}
        userContacts={[]}
        onAddContact={handleAddEmergencyContact}
        onCallEmergency={handleCallEmergency}
      />

      {/* Toggle to show all features */}
      <button
        onClick={() => setShowAllFeatures(!showAllFeatures)}
        className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors"
      >
        {showAllFeatures ? 'Show less' : 'Show all safety features'}
      </button>
    </div>
  );
};

export default RegionalSafetyFeatures;
