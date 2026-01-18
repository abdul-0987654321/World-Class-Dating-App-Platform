import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { discoveryService, DiscoveryProfile } from '../../services';
import { Navigation } from '../../components/Navigation';
import FlamoralBackground from '../../components/theme/FlamoralBackground';
import { AIAvatarSystem } from '../../components/AIAvatar/AIAvatarSystem';
import { useCoach } from '../../hooks';
import { CoachButton } from '../../components/coach';

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
  const [showDateIdeas, setShowDateIdeas] = useState(false);

  // AI Coach Hook
  const {
    dateIdeas,
    loading: coachLoading,
    remainingUses,
    generateDateIdeas,
    clearSuggestions,
  } = useCoach();

  useEffect(() => {
    loadProfiles();
    loadStats();
  }, []);

  const loadProfiles = async () => {
    try {
      const data = await discoveryService.getRecommendations();
      // Transform DiscoveryProfile to local Profile format
      setProfiles(data.profiles.map((p: DiscoveryProfile) => ({
        userId: p.user_id,
        name: p.first_name,
        age: p.age,
        bio: p.bio || '',
        photos: p.photos.map((photo) => photo.url),
        distance: p.distance || 0,
        city: p.city || '',
        interests: p.interests,
        verified: p.is_verified,
        compatibilityScore: p.compatibility_score || 0,
      })));
    } catch (err) {
      console.error('Failed to load profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await discoveryService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleSwipe = async (action: 'like' | 'pass' | 'super_like') => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      const result = await discoveryService.swipe(profile.userId, action);

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
    setShowDateIdeas(false);
    clearSuggestions();
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadProfiles();
      setCurrentIndex(0);
    }
  };

  // AI Coach handler for date ideas
  const handleGetDateIdeas = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    await generateDateIdeas({
      matchId: profile.userId,
      sharedInterests: profile.interests.slice(0, 3),
      budgetRange: 'medium',
      dateNumber: 1,
    });
    setShowDateIdeas(true);
  }, [profiles, currentIndex, generateDateIdeas]);

  const currentProfile = profiles[currentIndex];

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
        <Navigation />

        {/* Main Content */}
        <main className="max-w-lg mx-auto px-4 py-6">
          {/* Stats Bar */}
          {stats && (
            <div className="bg-fm-surface/60 backdrop-blur-sm rounded-xl p-4 mb-4 flex justify-around text-center border border-white/10">
              <div>
                <p className="text-2xl font-bold text-fm-pink">{stats.remainingLikes}</p>
                <p className="text-xs text-fm-text-secondary">Likes Left</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-fm-blue">{stats.remainingSuperLikes}</p>
                <p className="text-xs text-fm-text-secondary">Super Likes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{stats.remainingBoosts}</p>
                <p className="text-xs text-fm-text-secondary">Boosts</p>
              </div>
            </div>
          )}

          {/* Profile Card */}
          {currentProfile ? (
            <div className="bg-fm-surface/80 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
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
                      <span className="bg-fm-blue text-white text-xs px-2 py-0.5 rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-white/80 text-sm mt-1">
                    {currentProfile.city} • {currentProfile.distance} km away
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-fm-pink/80 text-white text-xs px-2 py-1 rounded-full">
                      {currentProfile.compatibilityScore}% Match
                    </span>
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-6">
                <p className="text-fm-text-primary">{currentProfile.bio}</p>

                <div className="mt-4">
                  <p className="text-sm font-medium text-fm-text-secondary mb-2">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.map((interest, idx) => (
                      <span
                        key={idx}
                        className="bg-white/10 text-fm-text-primary px-3 py-1 rounded-full text-sm border border-white/10"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AI Coach - Date Ideas */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <CoachButton
                    variant="date"
                    onClick={handleGetDateIdeas}
                    disabled={coachLoading}
                    remainingUses={remainingUses ?? undefined}
                  />

                  {/* Date Ideas Display */}
                  {showDateIdeas && dateIdeas?.ideas && dateIdeas.ideas.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-fm-text-primary flex items-center gap-2">
                          <span className="text-lg">💡</span> AI-Powered Date Ideas
                        </h4>
                        <button
                          onClick={() => {
                            setShowDateIdeas(false);
                            clearSuggestions();
                          }}
                          className="text-xs text-fm-text-secondary hover:text-fm-text-primary"
                        >
                          Dismiss
                        </button>
                      </div>
                      {dateIdeas.ideas.map((idea, idx) => (
                        <div
                          key={idx}
                          className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg p-4 border border-white/10"
                        >
                          <h5 className="font-semibold text-fm-text-primary">{idea.title}</h5>
                          <p className="text-sm text-fm-text-secondary mt-1">{idea.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs text-fm-text-secondary">
                            <span className="bg-white/10 px-2 py-1 rounded">{idea.category}</span>
                            <span className="bg-white/10 px-2 py-1 rounded">{idea.estimatedCost}</span>
                            <span className="bg-white/10 px-2 py-1 rounded">{idea.duration}</span>
                          </div>
                          {idea.tips && idea.tips.length > 0 && (
                            <ul className="mt-2 text-xs text-fm-text-secondary list-disc list-inside">
                              {idea.tips.map((tip, tidx) => (
                                <li key={tidx}>{tip}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {coachLoading && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-fm-text-secondary">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Getting date ideas...
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4 p-6 pt-0">
                <button
                  onClick={() => handleSwipe('pass')}
                  className="w-16 h-16 bg-fm-surface border-2 border-white/20 rounded-full flex items-center justify-center text-fm-text-secondary hover:border-red-400 hover:text-red-500 transition"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <button
                  onClick={() => handleSwipe('super_like')}
                  className="w-14 h-14 bg-fm-surface border-2 border-white/20 rounded-full flex items-center justify-center text-fm-blue hover:border-fm-blue transition"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>

                <button
                  onClick={() => handleSwipe('like')}
                  className="w-16 h-16 bg-gradient-to-r from-fm-pink to-rose-500 rounded-full flex items-center justify-center text-white shadow-lg hover:opacity-90 transition"
                >
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-fm-surface/60 backdrop-blur-sm rounded-2xl border border-white/10 p-8 text-center">
              <div className="text-6xl mb-4">💫</div>
              <h2 className="text-xl font-bold text-fm-text-primary mb-2">No more profiles</h2>
              <p className="text-fm-text-secondary">Check back later for new matches!</p>
            </div>
          )}
        </main>

        {/* Match Modal */}
        {showMatch && matchedProfile && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-fm-surface rounded-2xl max-w-sm w-full p-8 text-center border border-white/10 animate-bounce-slow">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-fm-pink to-fm-blue bg-clip-text text-transparent mb-2">
                It's a Match!
              </h2>
              <p className="text-fm-text-secondary mb-6">
                You and {matchedProfile.matchedUser.name} liked each other!
              </p>
              <img
                src={matchedProfile.matchedUser.photoUrl}
                alt={matchedProfile.matchedUser.name}
                className="w-24 h-24 rounded-full mx-auto mb-6 object-cover border-4 border-fm-pink"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowMatch(false);
                    navigate('/messages');
                  }}
                  className="flex-1 bg-gradient-to-r from-fm-pink to-fm-blue text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Send Message
                </button>
                <button
                  onClick={() => {
                    setShowMatch(false);
                    nextProfile();
                  }}
                  className="flex-1 bg-white/10 text-fm-text-primary py-3 rounded-lg font-semibold hover:bg-white/20 transition border border-white/10"
                >
                  Keep Swiping
                </button>
              </div>
            </div>
          </div>
        )}

        <AIAvatarSystem initialContext="discovery" />
      </div>
    </FlamoralBackground>
  );
};

export default DiscoveryPage;
