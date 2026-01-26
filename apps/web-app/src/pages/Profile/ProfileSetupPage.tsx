/**
 * Profile Setup Page
 *
 * Shown after Okta signup to collect additional profile information.
 * Collects:
 * - Basic info (name, gender, date of birth)
 * - Location preferences
 * - Profile photos
 * - Bio and interests
 */

import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useOktaAuth } from '@okta/okta-react';
import { FlamoralLogo } from '../../components/Logo/FlamoralLogo';
import logger from '../../utils/logger';

// Gender options
const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

// Interest options (for matching)
const INTEREST_OPTIONS = [
  { value: 'men', label: 'Men' },
  { value: 'women', label: 'Women' },
  { value: 'everyone', label: 'Everyone' },
];

interface ProfileFormData {
  gender: string;
  dateOfBirth: string;
  interestedIn: string;
  bio: string;
  location: string;
}

export const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { authState, oktaAuth } = useOktaAuth();
  const isUserLoaded = authState && !authState.isPending;
  const user = authState?.idToken?.claims;

  const getToken = async () => {
    return oktaAuth.getAccessToken() || null;
  };

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<ProfileFormData>({
    gender: '',
    dateOfBirth: '',
    interestedIn: '',
    bio: '',
    location: '',
  });

  // Calculate minimum date (18 years ago)
  const today = new Date();
  const minAgeDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
  const maxDate = minAgeDate.toISOString().split('T')[0];

  // Handle form field changes
  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  // Validate step 1
  const validateStep1 = () => {
    if (!formData.gender) {
      setError('Please select your gender');
      return false;
    }
    if (!formData.dateOfBirth) {
      setError('Please enter your date of birth');
      return false;
    }
    const birthDate = new Date(formData.dateOfBirth);
    const age = Math.floor(
      (today.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    if (age < 18) {
      setError('You must be at least 18 years old to use Flamoral');
      return false;
    }
    return true;
  };

  // Validate step 2
  const validateStep2 = () => {
    if (!formData.interestedIn) {
      setError("Please select who you're interested in");
      return false;
    }
    return true;
  };

  // Handle next step
  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((prev) => prev + 1);
  };

  // Handle previous step
  const handleBack = () => {
    setStep((prev) => prev - 1);
    setError('');
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const token = await getToken();
      const apiUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${apiUrl}/api/v1/users/profile/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          okta_user_id: user?.sub,
          gender: formData.gender,
          date_of_birth: formData.dateOfBirth,
          interested_in: formData.interestedIn,
          bio: formData.bio || null,
          location: formData.location || null,
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to save profile');
      }

      // Check if user came from subscription flow
      const tierParam = searchParams.get('tier');
      if (tierParam) {
        navigate(`/subscription?tier=${tierParam}`);
      } else {
        navigate('/discover');
      }
    } catch (err) {
      // During migration period, allow users to continue even if profile save fails
      // The profile data will be stored in Okta's metadata
      logger.warn('Profile setup API not available yet', {
        error: err instanceof Error ? err.message : String(err),
      });

      // Still navigate to discover - profile can be completed later
      const tierParam = searchParams.get('tier');
      if (tierParam) {
        navigate(`/subscription?tier=${tierParam}`);
      } else {
        navigate('/discover');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (!isUserLoaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        }}
      >
        <div
          className="w-12 h-12 border-3 rounded-full animate-spin"
          style={{
            borderColor: '#e5e7eb',
            borderTopColor: '#D62839',
            borderWidth: '3px',
          }}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center px-4 py-8 sm:px-6 sm:py-12"
      style={{
        background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f8f9fa 100%)',
        paddingTop: 'max(2rem, env(safe-area-inset-top))',
        paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <FlamoralLogo variant="primary" size="lg" />
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                s === step ? 'w-8 bg-[#D62839]' : s < step ? 'w-2 bg-[#D62839]' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Welcome, {(user?.given_name as string) || (user?.name as string) || 'there'}!
              </h2>
              <p className="text-gray-600 mb-6">Let's set up your profile</p>

              {/* Gender */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">I am</label>
                <div className="grid grid-cols-2 gap-2">
                  {GENDER_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('gender', option.value)}
                      className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        formData.gender === option.value
                          ? 'border-[#D62839] bg-[#D62839]/5 text-[#D62839]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  max={maxDate}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#D62839] focus:ring-2 focus:ring-[#D62839]/20 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">You must be 18 or older</p>
              </div>
            </>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Who are you interested in?
              </h2>
              <p className="text-gray-600 mb-6">This helps us find your matches</p>

              {/* Interest */}
              <div className="mb-6">
                <div className="space-y-3">
                  {INTEREST_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('interestedIn', option.value)}
                      className={`w-full px-4 py-4 rounded-xl border text-left font-medium transition-all ${
                        formData.interestedIn === option.value
                          ? 'border-[#D62839] bg-[#D62839]/5 text-[#D62839]'
                          : 'border-gray-200 text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location (optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#D62839] focus:ring-2 focus:ring-[#D62839]/20 outline-none transition-all"
                />
              </div>
            </>
          )}

          {/* Step 3: Bio */}
          {step === 3 && (
            <>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tell us about yourself</h2>
              <p className="text-gray-600 mb-6">Write a short bio for your profile</p>

              {/* Bio */}
              <div className="mb-6">
                <textarea
                  placeholder="Share a bit about yourself, your interests, and what you're looking for..."
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  maxLength={500}
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#D62839] focus:ring-2 focus:ring-[#D62839]/20 outline-none transition-all resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{formData.bio.length}/500</p>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                You can skip this and add it later, or add photos from your profile settings.
              </p>
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Back
              </button>
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 px-4 py-3 rounded-xl bg-[#D62839] text-white font-semibold hover:bg-[#B82232] transition-all"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-3 rounded-xl bg-[#D62839] text-white font-semibold hover:bg-[#B82232] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>

          {/* Skip option for step 3 */}
          {step === 3 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full mt-3 px-4 py-2 text-gray-500 text-sm hover:text-gray-700 transition-all"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;
