/**
 * Enhanced Discovery Page for Web App
 * Includes all advanced features: Boost, Super Like, Undo, Advanced Filters, Top Picks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  X,
  Star,
  RotateCcw,
  Filter,
  Zap,
  Crown,
  MapPin,
  Shield,
  TrendingUp,
  Info,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../services/api.client';
import {
  DISCOVERY_ENDPOINTS,
  BOOST_ENDPOINTS,
} from '../../config/api.config';

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
  compatibilityScore?: number;
  commonInterests?: string[];
  occupation?: string;
  education?: string;
  height?: number;
}

interface AdvancedFilters {
  minAge: number;
  maxAge: number;
  maxDistance: number;
  showVerifiedOnly: boolean;
  heightMin?: number;
  heightMax?: number;
  education?: string[];
  religion?: string[];
  smoking?: string[];
  drinking?: string[];
}

interface DiscoveryStats {
  likesSent: number | null;
  likesReceived: number | null;
  matches: number | null;
  profileViews: number | null;
  whoLikedYouCount: number | null;
}

export const EnhancedDiscoveryPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Features state
  const [showMatch, setShowMatch] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [showSuperLikeModal, setShowSuperLikeModal] = useState(false);
  const [superLikeMessage, setSuperLikeMessage] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [hasActiveBoost, setHasActiveBoost] = useState(false);
  const [boostTimeRemaining, setBoostTimeRemaining] = useState(0);
  const [superLikeQuota, setSuperLikeQuota] = useState({ remaining: 1, total: 1 });

  // Stats
  const [stats, setStats] = useState<DiscoveryStats>({
    likesSent: null,
    likesReceived: null,
    matches: null,
    profileViews: null,
    whoLikedYouCount: null,
  });

  // Filters
  const [filters, setFilters] = useState<AdvancedFilters>({
    minAge: 18,
    maxAge: 50,
    maxDistance: 50,
    showVerifiedOnly: false,
  });

  useEffect(() => {
    loadProfiles();
    loadSuperLikeQuota();
    checkActiveBoost();
    loadStats();
    setupKeyboardShortcuts();

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  const setupKeyboardShortcuts = () => {
    document.addEventListener('keydown', handleKeyPress);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handleSwipeLeft();
    if (e.key === 'ArrowRight') handleSwipeRight();
    if (e.key === 'ArrowUp') handleSuperLike();
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) handleUndo();
  };

  const generateMockProfiles = (): Profile[] => {
    return Array.from({ length: 20 }, (_, i) => ({
      userId: `user-${i}`,
      name: ['Emma', 'Sophia', 'Olivia', 'Ava', 'Isabella'][i % 5],
      age: 24 + (i % 10),
      bio: 'Coffee lover, adventure seeker, and dog mom.',
      photos: [`https://i.pravatar.cc/600?img=${i + 1}`],
      distance: Math.floor(Math.random() * 30) + 1,
      city: 'New York, NY',
      interests: ['Travel', 'Coffee', 'Hiking', 'Music'],
      verified: i % 3 === 0,
      compatibilityScore: Math.floor(Math.random() * 40) + 60,
      commonInterests: ['Travel', 'Coffee'],
      occupation: 'Marketing Manager',
      education: 'Bachelors Degree',
      height: 165 + (i % 20),
    }));
  };

  const loadProfiles = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.get<{ data: { recommendations: Profile[] } }>(
        DISCOVERY_ENDPOINTS.FEED,
        {
          // Pass filters as query params would be handled by the API client
        }
      );
      const recommendations = response.data?.recommendations || response.data || [];
      setProfiles(Array.isArray(recommendations) ? recommendations : []);
    } catch (error) {
      console.error('Failed to load profiles:', error);
      if (import.meta.env.DEV) {
        console.warn('DEV MODE: Falling back to mock profiles');
        const mockProfiles = generateMockProfiles();
        setProfiles(mockProfiles);
      } else {
        setErrorMessage('Unable to load profiles. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSuperLikeQuota = async () => {
    try {
      const response = await apiClient.get<{ data: { remaining: number; total: number } }>(
        DISCOVERY_ENDPOINTS.SUPER_LIKE_INFO
      );
      setSuperLikeQuota(response.data || { remaining: 1, total: 1 });
    } catch (error) {
      console.error('Failed to load quota:', error);
      // Graceful fallback - keep default quota
      setSuperLikeQuota({ remaining: 1, total: 1 });
    }
  };

  const checkActiveBoost = async () => {
    try {
      const response = await apiClient.get<{ data: { active: boolean; expiresAt?: string } }>(
        BOOST_ENDPOINTS.ACTIVE
      );
      const boostData = response.data;
      setHasActiveBoost(boostData?.active || false);
      if (boostData?.expiresAt) {
        const remaining = Math.max(0, Math.floor((new Date(boostData.expiresAt).getTime() - Date.now()) / 1000));
        setBoostTimeRemaining(remaining);
      }
    } catch (error) {
      console.error('Failed to check boost:', error);
      // Graceful fallback - no active boost
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get<{ data: DiscoveryStats }>(DISCOVERY_ENDPOINTS.STATS);
      setStats(response.data || {
        likesSent: null,
        likesReceived: null,
        matches: null,
        profileViews: null,
        whoLikedYouCount: null,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Keep stats as null (loading/unknown state)
    }
  };

  const handleSwipeLeft = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    setUndoStack((prev) => [...prev, { profile, action: 'pass', index: currentIndex }]);

    // Update UI immediately
    nextProfile();

    try {
      await apiClient.post(DISCOVERY_ENDPOINTS.PASS, { targetUserId: profile.userId }, { skipRetry: true });
    } catch (error) {
      console.error('Failed to record pass:', error);
      // UI already updated - swipe still works locally
    }
  }, [profiles, currentIndex]);

  const handleSwipeRight = useCallback(async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    setUndoStack((prev) => [...prev, { profile, action: 'like', index: currentIndex }]);

    try {
      const response = await apiClient.post<{ data: { matched: boolean } }>(
        DISCOVERY_ENDPOINTS.LIKE,
        { targetUserId: profile.userId },
        { skipRetry: true }
      );

      if (response.data?.matched) {
        setMatchedProfile(profile);
        setShowMatch(true);
      } else {
        nextProfile();
      }
    } catch (error) {
      console.error('Failed to like:', error);
      // Fallback: still advance to next profile
      nextProfile();
    }
  }, [profiles, currentIndex]);

  const handleSuperLike = () => {
    if (superLikeQuota.remaining <= 0) {
      alert('No Super Likes remaining. Upgrade to premium!');
      return;
    }
    setShowSuperLikeModal(true);
  };

  const confirmSuperLike = async () => {
    const profile = profiles[currentIndex];
    if (!profile) return;

    try {
      await apiClient.post(
        DISCOVERY_ENDPOINTS.SUPER_LIKE,
        {
          targetUserId: profile.userId,
          message: superLikeMessage || undefined,
        },
        { skipRetry: true }
      );

      setShowSuperLikeModal(false);
      setSuperLikeMessage('');
      setSuperLikeQuota((prev) => ({ ...prev, remaining: prev.remaining - 1 }));
      setUndoStack((prev) => [...prev, { profile, action: 'super_like', index: currentIndex }]);
      nextProfile();
    } catch (error) {
      console.error('Failed to Super Like:', error);
      // Still update UI locally on failure in dev
      if (import.meta.env.DEV) {
        setShowSuperLikeModal(false);
        setSuperLikeMessage('');
        setSuperLikeQuota((prev) => ({ ...prev, remaining: prev.remaining - 1 }));
        setUndoStack((prev) => [...prev, { profile, action: 'super_like', index: currentIndex }]);
        nextProfile();
      }
    }
  };

  const handleUndo = async () => {
    if (undoStack.length === 0) {
      alert('Nothing to undo');
      return;
    }

    const lastAction = undoStack[undoStack.length - 1];

    try {
      await apiClient.post(DISCOVERY_ENDPOINTS.REWIND, {}, { skipRetry: true });
    } catch (error) {
      console.error('Failed to undo on server:', error);
      // Still undo locally
    }

    setUndoStack((prev) => prev.slice(0, -1));
    setCurrentIndex(lastAction.index);
  };

  const activateBoost = async () => {
    if (!window.confirm('Activate Boost for 30 minutes?\n\n10x more profile views!')) {
      return;
    }

    try {
      await apiClient.post(BOOST_ENDPOINTS.ACTIVATE, {}, { skipRetry: true });
      setHasActiveBoost(true);
      setBoostTimeRemaining(30 * 60);
      alert('Boost activated! Your profile is now 10x more visible!');
    } catch (error: any) {
      console.error('Failed to activate boost:', error);
      if (import.meta.env.DEV) {
        // In dev mode, simulate boost activation
        setHasActiveBoost(true);
        setBoostTimeRemaining(30 * 60);
        alert('DEV: Boost activated (mock)!');
      } else {
        alert(error.message || 'Failed to activate boost. Please try again.');
      }
    }
  };

  const nextProfile = () => {
    setCurrentPhotoIndex(0);
    setCurrentIndex((prev) => prev + 1);
  };

  const currentProfile = profiles[currentIndex];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Finding perfect matches...</p>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Something Went Wrong</h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={loadProfiles}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full font-semibold hover:shadow-lg transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No More Profiles</h2>
          <p className="text-gray-600 mb-6">Check back later for more matches!</p>
          <button
            onClick={loadProfiles}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full font-semibold hover:shadow-lg transition"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-red-500 bg-clip-text text-transparent">
                Discovery
              </h1>
              {hasActiveBoost && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-semibold">Boost Active</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/discover')}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full hover:shadow-lg transition"
              >
                <Crown className="w-5 h-5" />
                <span className="font-semibold">Top Picks</span>
              </button>

              <button
                onClick={() => setShowFiltersModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full transition"
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </button>

              <button
                onClick={activateBoost}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-full hover:shadow-lg transition"
              >
                <Zap className="w-5 h-5" />
                <span>Boost</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-12 gap-8">
          {/* Left Sidebar - Stats */}
          <div className="col-span-3 space-y-4">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-4">Your Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Likes Sent</span>
                  <span className="font-bold">{stats.likesSent ?? '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Likes Received</span>
                  <span className="font-bold text-pink-500">{stats.likesReceived ?? '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Matches</span>
                  <span className="font-bold text-green-500">{stats.matches ?? '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <Star className="w-8 h-8 mb-3" />
              <h3 className="font-semibold mb-2">Super Likes</h3>
              <p className="text-sm opacity-90 mb-3">
                {superLikeQuota.remaining} of {superLikeQuota.total} remaining
              </p>
              <p className="text-xs opacity-75">Resets daily at midnight</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold mb-3">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div>&larr; Pass</div>
                <div>&rarr; Like</div>
                <div>&uarr; Super Like</div>
                <div>Ctrl+Z Undo</div>
              </div>
            </div>
          </div>

          {/* Center - Profile Card */}
          <div className="col-span-6">
            <div className="relative">
              {/* Profile Card */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-2xl">
                {/* Image */}
                <div className="relative h-[600px]">
                  <img
                    src={currentProfile.photos[currentPhotoIndex]}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover"
                  />

                  {/* Photo Navigation */}
                  {currentProfile.photos.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentPhotoIndex((prev) => Math.max(0, prev - 1))}
                        disabled={currentPhotoIndex === 0}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full disabled:opacity-50"
                      >
                        <ChevronLeft className="w-6 h-6" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPhotoIndex((prev) =>
                            Math.min(currentProfile.photos.length - 1, prev + 1)
                          )
                        }
                        disabled={currentPhotoIndex === currentProfile.photos.length - 1}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full disabled:opacity-50"
                      >
                        <ChevronRight className="w-6 h-6" />
                      </button>

                      {/* Photo Indicators */}
                      <div className="absolute top-4 left-4 right-4 flex space-x-2">
                        {currentProfile.photos.map((_, index) => (
                          <div
                            key={index}
                            className={`flex-1 h-1 rounded-full ${
                              index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                    {currentProfile.compatibilityScore && (
                      <div className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-semibold">
                          {currentProfile.compatibilityScore}% Match
                        </span>
                      </div>
                    )}
                  </div>

                  {currentProfile.verified && (
                    <div className="absolute top-4 right-4">
                      <Shield className="w-8 h-8 text-blue-500 fill-current" />
                    </div>
                  )}

                  {/* Profile Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-3xl font-bold">
                        {currentProfile.name}, {currentProfile.age}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-5 h-5" />
                        <span>{currentProfile.distance} km away</span>
                      </div>
                    </div>

                    <p className="text-lg opacity-90 mb-2">{currentProfile.occupation}</p>

                    {currentProfile.commonInterests &&
                      currentProfile.commonInterests.length > 0 && (
                        <div className="flex items-center space-x-2 mb-3">
                          <Heart className="w-4 h-4 text-pink-500" />
                          <span className="text-sm">
                            You both like {currentProfile.commonInterests.join(', ')}
                          </span>
                        </div>
                      )}

                    <p className="mb-4 line-clamp-3">{currentProfile.bio}</p>

                    <div className="flex flex-wrap gap-2">
                      {currentProfile.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-sm"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-4 mt-8">
                <button
                  onClick={handleUndo}
                  disabled={undoStack.length === 0}
                  className="w-14 h-14 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-lg flex items-center justify-center transition"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="w-6 h-6 text-yellow-500" />
                </button>

                <button
                  onClick={handleSwipeLeft}
                  className="w-16 h-16 bg-white hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110"
                  title="Pass (←)"
                >
                  <X className="w-8 h-8 text-red-500" />
                </button>

                <button
                  onClick={handleSuperLike}
                  className="w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-2xl rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110 relative"
                  title="Super Like (↑)"
                >
                  <Star className="w-7 h-7 text-white fill-current" />
                  {superLikeQuota.remaining > 0 && (
                    <div className="absolute -top-1 -right-1 bg-pink-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                      {superLikeQuota.remaining}
                    </div>
                  )}
                </button>

                <button
                  onClick={handleSwipeRight}
                  className="w-16 h-16 bg-white hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition transform hover:scale-110"
                  title="Like (→)"
                >
                  <Heart className="w-8 h-8 text-green-500" />
                </button>

                <button
                  onClick={() => {}}
                  className="w-14 h-14 bg-white hover:bg-gray-50 rounded-full shadow-lg flex items-center justify-center transition"
                  title="More Info"
                >
                  <Info className="w-6 h-6 text-purple-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Who Liked You */}
          <div className="col-span-3">
            <div className="bg-gradient-to-br from-pink-500 to-red-500 rounded-2xl p-6 text-white shadow-lg">
              <h3 className="font-semibold mb-4">Who Liked You</h3>
              <div className="text-4xl font-bold mb-2">{stats.whoLikedYouCount ?? '-'}</div>
              <p className="text-sm opacity-90 mb-4">See everyone who likes you</p>
              <button
                onClick={() => navigate('/discover')}
                className="w-full py-2 bg-white text-pink-500 rounded-full font-semibold hover:shadow-lg transition"
              >
                View All
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm mt-4">
              <h3 className="font-semibold mb-4">Profile Views</h3>
              <div className="text-3xl font-bold text-pink-500 mb-2">{stats.profileViews ?? '-'}</div>
              <p className="text-sm text-gray-600 mb-4">in the last 7 days</p>
              <button
                onClick={() => navigate('/discover')}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-full font-semibold transition"
              >
                View Insights
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Super Like Modal */}
      {showSuperLikeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-white fill-current" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Super Like {currentProfile.name}</h2>
              <p className="text-gray-600">Stand out and send a message!</p>
            </div>

            <textarea
              className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none mb-2"
              rows={4}
              placeholder="Write a message (optional)..."
              value={superLikeMessage}
              onChange={(e) => setSuperLikeMessage(e.target.value)}
              maxLength={500}
            />

            <div className="text-right text-sm text-gray-500 mb-6">
              {superLikeMessage.length}/500
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowSuperLikeModal(false);
                  setSuperLikeMessage('');
                }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-full font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuperLike}
                className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span>Send Super Like</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Match Modal */}
      {showMatch && matchedProfile && (
        <div className="fixed inset-0 bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center z-50 p-4">
          <div className="text-center text-white">
            <h1 className="text-6xl font-bold mb-4">It's a Match!</h1>
            <p className="text-2xl mb-8">You and {matchedProfile.name} liked each other</p>
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => {
                  setShowMatch(false);
                  navigate('/matches');
                }}
                className="px-8 py-4 bg-white text-pink-500 rounded-full font-bold text-lg hover:shadow-2xl transition"
              >
                Send Message
              </button>
              <button
                onClick={() => {
                  setShowMatch(false);
                  nextProfile();
                }}
                className="px-8 py-4 bg-white/20 backdrop-blur text-white rounded-full font-bold text-lg hover:bg-white/30 transition"
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

export default EnhancedDiscoveryPage;
