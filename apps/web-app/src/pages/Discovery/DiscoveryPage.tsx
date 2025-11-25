import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mockApi from '../../mocks/mockApi';

interface Profile {
  userId: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  distance: number;
  city: string;
  interests: string[];
  verified: boolean;
  compatibilityScore: number;
}

export const DiscoveryPage: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  useEffect(() => {
    loadProfiles();
    loadStats();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await mockApi.getRecommendations();
      setProfiles(data.profiles);
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await mockApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass' | 'super_like') => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      const result = await mockApi.swipe(profile.userId, action);

      if (result.isMatch) {
        setMatchedProfile(result.match);
        setShowMatch(true);
      } else {
        nextProfile();
      }
    } catch (err) {
      console.error('Swipe failed:', err);
    }
  };

  const nextProfile = () => {
    setCurrentPhotoIndex(0);
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadProfiles();
      setCurrentIndex(0);
    }
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            ConnectSphere
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-pink-500 font-medium">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">
              Messages
            </button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">
              Profile
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Stats Bar */}
        {stats && (
          <div className="bg-white rounded-xl p-4 mb-4 flex justify-around text-center shadow-sm">
            <div>
              <p className="text-2xl font-bold text-pink-500">{stats.remainingLikes}</p>
              <p className="text-xs text-gray-500">Likes Left</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-500">{stats.remainingSuperLikes}</p>
              <p className="text-xs text-gray-500">Super Likes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-500">{stats.remainingBoosts}</p>
              <p className="text-xs text-gray-500">Boosts</p>
            </div>
          </div>
        )}

        {/* Profile Card */}
        {currentProfile ? (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Photo */}
            <div className="relative aspect-[3/4]">
              <img
                src={currentProfile.photos[currentPhotoIndex]}
                alt={currentProfile.name}
                className="w-full h-full object-cover"
              />

              {/* Photo Navigation Dots */}
              {currentProfile.photos.length > 1 && (
                <div className="absolute top-4 left-0 right-0 flex justify-center gap-1">
                  {currentProfile.photos.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPhotoIndex(idx)}
                      className={`h-1 rounded-full transition-all ${
                        idx === currentPhotoIndex ? 'w-8 bg-white' : 'w-4 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Photo Navigation Areas */}
              <div className="absolute inset-0 flex">
                <button
                  className="flex-1"
                  onClick={() => setCurrentPhotoIndex(Math.max(0, currentPhotoIndex - 1))}
                />
                <button
                  className="flex-1"
                  onClick={() => setCurrentPhotoIndex(Math.min(currentProfile.photos.length - 1, currentPhotoIndex + 1))}
                />
              </div>

              {/* Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-6 pt-20">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">
                    {currentProfile.name}, {currentProfile.age}
                  </h2>
                  {currentProfile.verified && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm mt-1">
                  {currentProfile.city} • {currentProfile.distance} km away
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-pink-500/80 text-white text-xs px-2 py-1 rounded-full">
                    {currentProfile.compatibilityScore}% Match
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="p-6">
              <p className="text-gray-700">{currentProfile.bio}</p>

              <div className="mt-4">
                <p className="text-sm font-medium text-gray-500 mb-2">Interests</p>
                <div className="flex flex-wrap gap-2">
                  {currentProfile.interests.map((interest, idx) => (
                    <span
                      key={idx}
                      className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 p-6 pt-0">
              <button
                onClick={() => handleSwipe('pass')}
                className="w-16 h-16 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:border-red-400 hover:text-red-500 transition shadow-md"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <button
                onClick={() => handleSwipe('super_like')}
                className="w-14 h-14 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-blue-400 hover:border-blue-400 hover:text-blue-500 transition shadow-md"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </button>

              <button
                onClick={() => handleSwipe('like')}
                className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white shadow-lg hover:opacity-90 transition"
              >
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">💫</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No more profiles</h2>
            <p className="text-gray-500">Check back later for new matches!</p>
          </div>
        )}
      </main>

      {/* Match Modal */}
      {showMatch && matchedProfile && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center animate-bounce-slow">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
              It's a Match!
            </h2>
            <p className="text-gray-600 mb-6">
              You and {matchedProfile.matchedUser.name} liked each other!
            </p>
            <img
              src={matchedProfile.matchedUser.photoUrl}
              alt={matchedProfile.matchedUser.name}
              className="w-24 h-24 rounded-full mx-auto mb-6 object-cover border-4 border-pink-500"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowMatch(false);
                  navigate('/messages');
                }}
                className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Send Message
              </button>
              <button
                onClick={() => {
                  setShowMatch(false);
                  nextProfile();
                }}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Keep Swiping
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryPage;
