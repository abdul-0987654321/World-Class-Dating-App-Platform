import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchingService, Match as ServiceMatch, Like as ServiceLike } from '../../services';

interface Match {
  id: string;
  matchedUser: {
    id: string;
    name: string;
    photoUrl: string;
    isOnline: boolean;
  };
  matchedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasUnread: boolean;
}

interface Like {
  id: string;
  fromUser: {
    blurredPhotoUrl: string;
    name: string | null;
    age: number | null;
  };
  isSuperLike: boolean;
  isRevealed: boolean;
  likedAt: string;
}

export const MatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'likes'>('matches');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matchesData, likesData] = await Promise.all([
        matchingService.getMatches(),
        matchingService.getLikes(),
      ]);
      // Transform to local format
      setMatches(matchesData.matches.map((m: ServiceMatch) => ({
        id: m.id,
        matchedUser: {
          id: m.matchedUser.id,
          name: m.matchedUser.name,
          photoUrl: m.matchedUser.photoUrl,
          isOnline: m.matchedUser.isOnline,
        },
        matchedAt: m.matchedAt,
        lastMessage: m.lastMessage?.content || null,
        lastMessageAt: m.lastMessageAt || null,
        hasUnread: m.hasUnread,
      })));
      setLikes(likesData.likes.map((l: ServiceLike) => ({
        id: l.id,
        fromUser: {
          blurredPhotoUrl: l.user.photoUrl,
          name: l.isBlurred ? null : l.user.name,
          age: l.isBlurred ? null : l.user.age || null,
        },
        isSuperLike: l.isSuperLike,
        isRevealed: !l.isBlurred,
        likedAt: l.likedAt,
      })));
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
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
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-pink-500 font-medium">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">
              Messages
            </button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">
              Profile
            </button>
            <button onClick={() => navigate('/safety')} className="text-gray-600 hover:text-pink-500">
              Safety
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 flex mb-6 shadow-sm">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Matches ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-3 rounded-lg font-medium transition ${
              activeTab === 'likes'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Likes ({likes.length})
          </button>
        </div>

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="space-y-4">
            {/* New Matches - Horizontal Scroll */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">New Matches</h2>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {matches.filter(m => !m.lastMessage).map((match) => (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/messages?chat=${match.matchedUser.id}`)}
                    className="flex-shrink-0 text-center"
                  >
                    <div className="relative">
                      <img
                        src={match.matchedUser.photoUrl}
                        alt={match.matchedUser.name}
                        className="w-20 h-20 rounded-full object-cover border-2 border-pink-500"
                      />
                      {match.matchedUser.isOnline && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 mt-2">{match.matchedUser.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Message History */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Messages</h2>
              <div className="bg-white rounded-xl shadow-sm divide-y">
                {matches.filter(m => m.lastMessage).map((match) => (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/messages?chat=${match.matchedUser.id}`)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 transition text-left"
                  >
                    <div className="relative">
                      <img
                        src={match.matchedUser.photoUrl}
                        alt={match.matchedUser.name}
                        className="w-14 h-14 rounded-full object-cover"
                      />
                      {match.matchedUser.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-800">{match.matchedUser.name}</p>
                        {match.lastMessageAt && (
                          <span className="text-xs text-gray-400">{formatTime(match.lastMessageAt)}</span>
                        )}
                      </div>
                      <p className={`text-sm truncate ${match.hasUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                        {match.lastMessage}
                      </p>
                    </div>
                    {match.hasUnread && (
                      <span className="w-3 h-3 bg-pink-500 rounded-full flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Likes Tab */}
        {activeTab === 'likes' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">💖</div>
              <h2 className="text-xl font-bold text-gray-800">{likes.length} people like you!</h2>
              <p className="text-gray-500 text-sm mt-1">
                Upgrade to Premium to see who likes you
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {likes.map((like) => (
                <div key={like.id} className="relative">
                  <img
                    src={like.fromUser.blurredPhotoUrl}
                    alt="Someone likes you"
                    className="w-full aspect-square rounded-xl object-cover blur-sm"
                  />
                  {like.isSuperLike && (
                    <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Super Like
                    </span>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">🔒</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/subscription')}
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              Upgrade to Premium
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchesPage;
