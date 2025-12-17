import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';

interface FilterSettings {
  ageRange: { min: number; max: number };
  distance: number;
  gender: string[];
  lookingFor: string[];
  height: { min: number; max: number };
  education: string[];
  religion: string[];
  drinking: string[];
  smoking: string[];
  children: string[];
  zodiacSign: string[];
  languages: string[];
  verifiedOnly: boolean;
  withPhotosOnly: boolean;
  activeRecently: boolean;
  hasPrompts: boolean;
}

const defaultFilters: FilterSettings = {
  ageRange: { min: 18, max: 50 },
  distance: 50,
  gender: ['female'],
  lookingFor: ['relationship', 'dating'],
  height: { min: 150, max: 200 },
  education: [],
  religion: [],
  drinking: [],
  smoking: [],
  children: [],
  zodiacSign: [],
  languages: [],
  verifiedOnly: false,
  withPhotosOnly: true,
  activeRecently: false,
  hasPrompts: false,
};

const GENDER_OPTIONS = ['male', 'female', 'non-binary', 'other'];
const LOOKING_FOR_OPTIONS = ['relationship', 'dating', 'friends', 'not sure'];
const EDUCATION_OPTIONS = ['High School', 'Some College', 'Bachelor\'s', 'Master\'s', 'PhD', 'Trade School'];
const RELIGION_OPTIONS = ['Christian', 'Muslim', 'Jewish', 'Hindu', 'Buddhist', 'Agnostic', 'Atheist', 'Other', 'Prefer not to say'];
const DRINKING_OPTIONS = ['Never', 'Socially', 'Regularly', 'Prefer not to say'];
const SMOKING_OPTIONS = ['Never', 'Sometimes', 'Regularly', 'Prefer not to say'];
const CHILDREN_OPTIONS = ['Have and want more', 'Have and don\'t want more', 'Don\'t have and want', 'Don\'t have and don\'t want', 'Not sure'];
const ZODIAC_OPTIONS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const LANGUAGE_OPTIONS = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Russian'];

export const AdvancedFiltersPage: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<FilterSettings>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic', 'preferences']));

  useEffect(() => {
    loadFilters();
  }, []);

  const loadFilters = async () => {
    try {
      const res = await fetch('/api/v1/discovery/preferences', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setFilters({ ...defaultFilters, ...data.data });
        }
      }
    } catch (err) {
      console.error('Failed to load filters:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/v1/discovery/preferences', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters),
      });
      navigate('/discover');
    } catch (err) {
      console.error('Failed to save filters:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFilters(defaultFilters);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleArrayValue = (key: keyof FilterSettings, value: string) => {
    const current = filters[key] as string[];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    setFilters({ ...filters, [key]: newValues });
  };

  const SectionHeader: React.FC<{ title: string; section: string; icon: React.ReactNode }> = ({ title, section, icon }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-pink-500">{icon}</span>
        <span className="font-semibold text-gray-800">{title}</span>
      </div>
      <svg
        className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.has(section) ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );

  const MultiSelect: React.FC<{ options: string[]; selected: string[]; onToggle: (value: string) => void }> = ({
    options,
    selected,
    onToggle,
  }) => (
    <div className="flex flex-wrap gap-2">
      {options.map(option => (
        <button
          key={option}
          onClick={() => onToggle(option)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition ${
            selected.includes(option)
              ? 'bg-pink-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {option}
        </button>
      ))}
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
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Discovery Filters</h1>
            <p className="text-gray-500">Customize who you see</p>
          </div>
          <button
            onClick={handleReset}
            className="text-pink-500 hover:text-pink-600 text-sm font-medium"
          >
            Reset All
          </button>
        </div>

        {/* Filter Sections */}
        <div className="space-y-4">
          {/* Basic Filters */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Basic Filters"
              section="basic"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
            />
            {expandedSections.has('basic') && (
              <div className="p-4 space-y-6">
                {/* Age Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age Range: {filters.ageRange.min} - {filters.ageRange.max}
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="18"
                      max="100"
                      value={filters.ageRange.min}
                      onChange={(e) => setFilters({
                        ...filters,
                        ageRange: { ...filters.ageRange, min: parseInt(e.target.value) }
                      })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <span className="text-sm text-gray-500 w-8">{filters.ageRange.min}</span>
                    <span className="text-gray-400">-</span>
                    <input
                      type="range"
                      min="18"
                      max="100"
                      value={filters.ageRange.max}
                      onChange={(e) => setFilters({
                        ...filters,
                        ageRange: { ...filters.ageRange, max: parseInt(e.target.value) }
                      })}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                    />
                    <span className="text-sm text-gray-500 w-8">{filters.ageRange.max}</span>
                  </div>
                </div>

                {/* Distance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maximum Distance: {filters.distance} km
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    value={filters.distance}
                    onChange={(e) => setFilters({ ...filters, distance: parseInt(e.target.value) })}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>1 km</span>
                    <span>500 km</span>
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Show Me</label>
                  <MultiSelect
                    options={GENDER_OPTIONS}
                    selected={filters.gender}
                    onToggle={(v) => toggleArrayValue('gender', v)}
                  />
                </div>

                {/* Looking For */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Looking For</label>
                  <MultiSelect
                    options={LOOKING_FOR_OPTIONS}
                    selected={filters.lookingFor}
                    onToggle={(v) => toggleArrayValue('lookingFor', v)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Height */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Height Preference"
              section="height"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>}
            />
            {expandedSections.has('height') && (
              <div className="p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height Range: {filters.height.min} cm - {filters.height.max} cm
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="120"
                    max="220"
                    value={filters.height.min}
                    onChange={(e) => setFilters({
                      ...filters,
                      height: { ...filters.height, min: parseInt(e.target.value) }
                    })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-sm text-gray-500 w-12">{filters.height.min} cm</span>
                  <span className="text-gray-400">-</span>
                  <input
                    type="range"
                    min="120"
                    max="220"
                    value={filters.height.max}
                    onChange={(e) => setFilters({
                      ...filters,
                      height: { ...filters.height, max: parseInt(e.target.value) }
                    })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
                  />
                  <span className="text-sm text-gray-500 w-12">{filters.height.max} cm</span>
                </div>
              </div>
            )}
          </div>

          {/* Lifestyle */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Lifestyle"
              section="lifestyle"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
            />
            {expandedSections.has('lifestyle') && (
              <div className="p-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Drinking</label>
                  <MultiSelect
                    options={DRINKING_OPTIONS}
                    selected={filters.drinking}
                    onToggle={(v) => toggleArrayValue('drinking', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Smoking</label>
                  <MultiSelect
                    options={SMOKING_OPTIONS}
                    selected={filters.smoking}
                    onToggle={(v) => toggleArrayValue('smoking', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
                  <MultiSelect
                    options={CHILDREN_OPTIONS}
                    selected={filters.children}
                    onToggle={(v) => toggleArrayValue('children', v)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Education & Religion */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Background"
              section="background"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
            />
            {expandedSections.has('background') && (
              <div className="p-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
                  <MultiSelect
                    options={EDUCATION_OPTIONS}
                    selected={filters.education}
                    onToggle={(v) => toggleArrayValue('education', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
                  <MultiSelect
                    options={RELIGION_OPTIONS}
                    selected={filters.religion}
                    onToggle={(v) => toggleArrayValue('religion', v)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fun Stuff */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              title="More About Them"
              section="more"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
            />
            {expandedSections.has('more') && (
              <div className="p-4 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zodiac Sign</label>
                  <MultiSelect
                    options={ZODIAC_OPTIONS}
                    selected={filters.zodiacSign}
                    onToggle={(v) => toggleArrayValue('zodiacSign', v)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Languages</label>
                  <MultiSelect
                    options={LANGUAGE_OPTIONS}
                    selected={filters.languages}
                    onToggle={(v) => toggleArrayValue('languages', v)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Premium Filters */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <SectionHeader
              title="Premium Filters"
              section="premium"
              icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>}
            />
            {expandedSections.has('premium') && (
              <div className="p-4 space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">Verified profiles only</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.verifiedOnly}
                      onChange={(e) => setFilters({ ...filters, verifiedOnly: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition ${filters.verifiedOnly ? 'bg-pink-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${filters.verifiedOnly ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                    </div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">With photos only</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.withPhotosOnly}
                      onChange={(e) => setFilters({ ...filters, withPhotosOnly: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition ${filters.withPhotosOnly ? 'bg-pink-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${filters.withPhotosOnly ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                    </div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">Active recently (last 7 days)</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.activeRecently}
                      onChange={(e) => setFilters({ ...filters, activeRecently: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition ${filters.activeRecently ? 'bg-pink-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${filters.activeRecently ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                    </div>
                  </div>
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-gray-700">Has answered prompts</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={filters.hasPrompts}
                      onChange={(e) => setFilters({ ...filters, hasPrompts: e.target.checked })}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition ${filters.hasPrompts ? 'bg-pink-500' : 'bg-gray-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition transform ${filters.hasPrompts ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                    </div>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={() => navigate('/discover')}
            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Apply Filters'}
          </button>
        </div>
      </main>
    </div>
  );
};

export default AdvancedFiltersPage;
