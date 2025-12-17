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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-pink-500 font-medium">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Messages
            </button>
            <button onClick={() => navigate('/profile')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Profile
            </button>
            <button onClick={() => navigate('/safety')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Safety
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="bg-white/5 backdrop-blur-xl rounded-xl p-1 flex mb-6 border border-white/10">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                : 'text-gray-400 hover:bg-white/5'
            }`}
          >
            Matches ({matches.length})
          </button>
          <button
            onClick={() => setActiveTab('likes')}
            className={`flex-1 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'likes'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/20'
                : 'text-gray-400 hover:bg-white/5'
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
              <h2 className="text-lg font-semibold text-white mb-3">New Matches</h2>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {matches.filter(m => !m.lastMessage).map((match) => (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/messages?chat=${match.matchedUser.id}`)}
                    className="flex-shrink-0 text-center group"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity animate-pulse"></div>
                      <img
                        src={match.matchedUser.photoUrl}
                        alt={match.matchedUser.name}
                        className="relative w-20 h-20 rounded-full object-cover border-2 border-pink-500 group-hover:border-pink-400 transition-all"
                      />
                      {match.matchedUser.isOnline && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0A0A0A] shadow-lg shadow-green-500/50" />
                      )}
                    </div>
                    <p className="text-sm font-medium text-white mt-2">{match.matchedUser.name}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Message History */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Messages</h2>
              <div className="space-y-2">
                {matches.filter(m => m.lastMessage).map((match) => (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/messages?chat=${match.matchedUser.id}`)}
                    className="w-full bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4 hover:border-pink-500/30 transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img
                          src={match.matchedUser.photoUrl}
                          alt={match.matchedUser.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-white/20 group-hover:border-pink-500/50 transition-all"
                        />
                        {match.matchedUser.isOnline && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0A0A0A] shadow-lg shadow-green-500/50" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white">{match.matchedUser.name}</h3>
                          {match.lastMessageAt && (
                            <span className="text-xs text-gray-500">{formatTime(match.lastMessageAt)}</span>
                          )}
                        </div>
                        <p className={`text-sm truncate ${match.hasUnread ? 'text-gray-300 font-medium' : 'text-gray-400'}`}>
                          {match.lastMessage}
                        </p>
                      </div>
                      {match.hasUnread && (
                        <div className="w-2 h-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex-shrink-0 shadow-lg shadow-pink-500/50" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Likes Tab */}
        {activeTab === 'likes' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">💖</div>
              <h2 className="text-xl font-bold text-white">{likes.length} people like you!</h2>
              <p className="text-gray-400 text-sm mt-1">
                Upgrade to Premium to see who likes you
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {likes.map((like) => (
                <div key={like.id} className="relative group">
                  <div className="relative overflow-hidden rounded-xl border border-white/20 group-hover:border-pink-500/30 transition-all">
                    <img
                      src={like.fromUser.blurredPhotoUrl}
                      alt="Someone likes you"
                      className="w-full aspect-square object-cover blur-sm"
                    />
                    {like.isSuperLike && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs px-2 py-1 rounded-full shadow-lg shadow-blue-500/50">
                        Super Like
                      </span>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-4xl">🔒</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40">
              Upgrade to Premium
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MatchesPage;
