import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../../components/Navigation';
import { authTokenService } from '../../services/auth-token.service';

interface ProfileData {
  firstName: string;
  lastName: string;
  bio: string;
  occupation: string;
  company: string;
  education: string;
  school: string;
  city: string;
  hometown: string;
  height: number;
  gender: string;
  lookingFor: string[];
  relationshipGoal: string;
  drinking: string;
  smoking: string;
  children: string;
  religion: string;
  zodiacSign: string;
  languages: string[];
  interests: string[];
  photos: string[];
  prompts: { question: string; answer: string }[];
}

const INTERESTS = [
  'Travel', 'Music', 'Movies', 'Reading', 'Gaming', 'Fitness', 'Cooking', 'Photography',
  'Art', 'Dancing', 'Hiking', 'Yoga', 'Running', 'Swimming', 'Coffee', 'Wine',
  'Dogs', 'Cats', 'Beach', 'Mountains', 'Sports', 'Fashion', 'Technology', 'Nature'
];

const PROMPTS = [
  'My ideal first date would be...',
  'Two truths and a lie...',
  'I\'m looking for someone who...',
  'My most controversial opinion is...',
  'The way to win me over is...',
  'I\'m known for...',
  'My simple pleasures are...',
  'I\'ll know it\'s love when...',
  'Together we could...',
  'I guarantee you that...'
];

export const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    bio: '',
    occupation: '',
    company: '',
    education: '',
    school: '',
    city: '',
    hometown: '',
    height: 170,
    gender: '',
    lookingFor: [],
    relationshipGoal: '',
    drinking: '',
    smoking: '',
    children: '',
    religion: '',
    zodiacSign: '',
    languages: [],
    interests: [],
    photos: [],
    prompts: [],
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'photos' | 'basics' | 'about' | 'lifestyle' | 'prompts'>('photos');
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = authTokenService.getToken();
      const res = await fetch('/api/profiles/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data) {
          setProfile({ ...profile, ...data.data });
        }
      }

      // Also load from currentUser in localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setProfile(prev => ({
          ...prev,
          firstName: userData.firstName || prev.firstName,
          bio: userData.bio || prev.bio,
          photos: userData.photos || prev.photos,
          interests: userData.interests || prev.interests,
        }));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = authTokenService.getToken();
      await fetch('/api/profiles/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profile),
      });

      // Update localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        localStorage.setItem('currentUser', JSON.stringify({
          ...userData,
          firstName: profile.firstName,
          bio: profile.bio,
          photos: profile.photos,
          interests: profile.interests,
        }));
      }

      navigate('/profile');
    } catch (err) {
      console.error('Failed to save profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', files[0]);

      const token = authTokenService.getToken();
      const res = await fetch('/api/profiles/photos', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data?.url) {
          setProfile(prev => ({
            ...prev,
            photos: [...prev.photos, data.data.url],
          }));
        }
      } else {
        // Fallback: use local URL for demo
        const url = URL.createObjectURL(files[0]);
        setProfile(prev => ({
          ...prev,
          photos: [...prev.photos, url],
        }));
      }
    } catch (err) {
      console.error('Failed to upload photo:', err);
      // Fallback: use local URL for demo
      if (files[0]) {
        const url = URL.createObjectURL(files[0]);
        setProfile(prev => ({
          ...prev,
          photos: [...prev.photos, url],
        }));
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setProfile(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleReorderPhotos = (fromIndex: number, toIndex: number) => {
    const newPhotos = [...profile.photos];
    const [removed] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, removed);
    setProfile(prev => ({ ...prev, photos: newPhotos }));
  };

  const toggleInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const addPrompt = (question: string) => {
    if (profile.prompts.length >= 3) return;
    setProfile(prev => ({
      ...prev,
      prompts: [...prev.prompts, { question, answer: '' }],
    }));
    setShowAddPrompt(false);
  };

  const updatePromptAnswer = (index: number, answer: string) => {
    const newPrompts = [...profile.prompts];
    newPrompts[index].answer = answer;
    setProfile(prev => ({ ...prev, prompts: newPrompts }));
  };

  const removePrompt = (index: number) => {
    setProfile(prev => ({
      ...prev,
      prompts: prev.prompts.filter((_, i) => i !== index),
    }));
  };

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
          <h1 className="text-2xl font-bold text-gray-800">Edit Profile</h1>
          <button
            onClick={() => navigate('/profile')}
            className="text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(['photos', 'basics', 'about', 'lifestyle', 'prompts'] as const).map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeSection === section
                  ? 'bg-pink-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        {/* Photos Section */}
        {activeSection === 'photos' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Photos</h2>
            <p className="text-gray-500 text-sm mb-4">Add up to 6 photos. Drag to reorder.</p>

            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map(index => (
                <div
                  key={index}
                  className={`aspect-[3/4] rounded-xl border-2 border-dashed ${
                    profile.photos[index]
                      ? 'border-transparent'
                      : 'border-gray-300 hover:border-pink-300'
                  } relative overflow-hidden bg-gray-50 transition cursor-pointer`}
                  onClick={() => !profile.photos[index] && fileInputRef.current?.click()}
                >
                  {profile.photos[index] ? (
                    <>
                      <img
                        src={profile.photos[index]}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemovePhoto(index);
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {index === 0 && (
                        <span className="absolute bottom-2 left-2 bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                          Main
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs">Add Photo</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {uploadingPhoto && (
              <div className="mt-4 text-center text-gray-500">Uploading photo...</div>
            )}
          </div>
        )}

        {/* Basics Section */}
        {activeSection === 'basics' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
              <input
                type="text"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={4}
                maxLength={500}
                placeholder="Tell people about yourself..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
              />
              <p className="text-sm text-gray-400 mt-1">{profile.bio.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Occupation</label>
              <input
                type="text"
                value={profile.occupation}
                onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                placeholder="e.g. Software Engineer"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
              <input
                type="text"
                value={profile.company}
                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                placeholder="Where do you work?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Education</label>
              <select
                value={profile.education}
                onChange={(e) => setProfile({ ...profile, education: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select education level</option>
                <option value="high_school">High School</option>
                <option value="some_college">Some College</option>
                <option value="bachelors">Bachelor's Degree</option>
                <option value="masters">Master's Degree</option>
                <option value="phd">PhD</option>
                <option value="trade">Trade School</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
              <input
                type="text"
                value={profile.school}
                onChange={(e) => setProfile({ ...profile, school: e.target.value })}
                placeholder="Where did you study?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="Where do you live?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
              <input
                type="number"
                value={profile.height}
                onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) || 0 })}
                min={100}
                max={250}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* About Section (Interests) */}
        {activeSection === 'about' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Interests</h2>
            <p className="text-gray-500 text-sm mb-4">Select up to 10 interests</p>

            <div className="flex flex-wrap gap-2">
              {INTERESTS.map(interest => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  disabled={!profile.interests.includes(interest) && profile.interests.length >= 10}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                    profile.interests.includes(interest)
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>

            <p className="text-sm text-gray-400 mt-4">{profile.interests.length}/10 selected</p>
          </div>
        )}

        {/* Lifestyle Section */}
        {activeSection === 'lifestyle' && (
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Relationship Goal</label>
              <select
                value={profile.relationshipGoal}
                onChange={(e) => setProfile({ ...profile, relationshipGoal: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select your goal</option>
                <option value="relationship">Long-term relationship</option>
                <option value="casual">Casual dating</option>
                <option value="friends">Friends</option>
                <option value="not_sure">Not sure yet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Drinking</label>
              <select
                value={profile.drinking}
                onChange={(e) => setProfile({ ...profile, drinking: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select option</option>
                <option value="never">Never</option>
                <option value="socially">Socially</option>
                <option value="regularly">Regularly</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Smoking</label>
              <select
                value={profile.smoking}
                onChange={(e) => setProfile({ ...profile, smoking: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select option</option>
                <option value="never">Never</option>
                <option value="sometimes">Sometimes</option>
                <option value="regularly">Regularly</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Children</label>
              <select
                value={profile.children}
                onChange={(e) => setProfile({ ...profile, children: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select option</option>
                <option value="have_want_more">Have and want more</option>
                <option value="have_no_more">Have and don't want more</option>
                <option value="want">Don't have and want</option>
                <option value="no_want">Don't have and don't want</option>
                <option value="not_sure">Not sure</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Religion</label>
              <select
                value={profile.religion}
                onChange={(e) => setProfile({ ...profile, religion: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select option</option>
                <option value="christian">Christian</option>
                <option value="muslim">Muslim</option>
                <option value="jewish">Jewish</option>
                <option value="hindu">Hindu</option>
                <option value="buddhist">Buddhist</option>
                <option value="agnostic">Agnostic</option>
                <option value="atheist">Atheist</option>
                <option value="other">Other</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zodiac Sign</label>
              <select
                value={profile.zodiacSign}
                onChange={(e) => setProfile({ ...profile, zodiacSign: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="">Select your sign</option>
                {['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'].map(sign => (
                  <option key={sign} value={sign.toLowerCase()}>{sign}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Prompts Section */}
        {activeSection === 'prompts' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">Prompts</h2>
              <p className="text-gray-500 text-sm mb-4">Add up to 3 prompts to show your personality</p>

              {profile.prompts.map((prompt, index) => (
                <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-pink-500">{prompt.question}</p>
                    <button
                      onClick={() => removePrompt(index)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={prompt.answer}
                    onChange={(e) => updatePromptAnswer(index, e.target.value)}
                    placeholder="Write your answer..."
                    rows={3}
                    maxLength={200}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">{prompt.answer.length}/200</p>
                </div>
              ))}

              {profile.prompts.length < 3 && (
                <button
                  onClick={() => setShowAddPrompt(true)}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-pink-300 hover:text-pink-500 transition"
                >
                  + Add a prompt
                </button>
              )}
            </div>
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-6 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </main>

      {/* Add Prompt Modal */}
      {showAddPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Choose a Prompt</h3>
              <button onClick={() => setShowAddPrompt(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-96">
              {PROMPTS.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => addPrompt(prompt)}
                  disabled={profile.prompts.some(p => p.question === prompt)}
                  className="w-full p-4 text-left hover:bg-gray-50 transition border-b disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEditPage;
