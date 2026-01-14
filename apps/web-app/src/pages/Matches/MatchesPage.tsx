import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { matchingService, Match as ServiceMatch, Like as ServiceLike } from '../../services';
import FlamoralBackground from '../../components/theme/FlamoralBackground';
import Navigation from '../../components/Navigation';

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
        <main className="max-w-2xl mx-auto px-4 py-6">
          {/* Tabs */}
          <div className="bg-fm-surface/60 backdrop-blur-sm rounded-xl p-1 flex mb-6 border border-white/10">
            <button
              onClick={() => setActiveTab('matches')}
              className={`flex-1 py-3 rounded-lg font-medium transition ${
                activeTab === 'matches'
                  ? 'bg-gradient-to-r from-fm-pink to-fm-blue text-white'
                  : 'text-fm-text-secondary hover:text-fm-text-primary hover:bg-white/5'
              }`}
            >
              Matches ({matches.length})
            </button>
            <button
              onClick={() => setActiveTab('likes')}
              className={`flex-1 py-3 rounded-lg font-medium transition ${
                activeTab === 'likes'
                  ? 'bg-gradient-to-r from-fm-pink to-fm-blue text-white'
                  : 'text-fm-text-secondary hover:text-fm-text-primary hover:bg-white/5'
              }`}
            >
              Likes ({likes.length})
            </button>
          </div>

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="space-y-6">
              {/* New Matches - Horizontal Scroll */}
              <div>
                <h2 className="text-lg font-semibold text-fm-text-primary mb-3">New Matches</h2>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {matches.filter(m => !m.lastMessage).length === 0 ? (
                    <p className="text-fm-text-secondary text-sm">No new matches yet. Keep swiping!</p>
                  ) : (
                    matches.filter(m => !m.lastMessage).map((match) => (
                      <button
                        key={match.id}
                        onClick={() => navigate(`/messages?chat=${match.matchedUser.id}`)}
                        className="flex-shrink-0 text-center group"
                      >
                        <div className="relative">
                          <img
                            src={match.matchedUser.photoUrl}
                            alt={match.matchedUser.name}
                            className="w-20 h-20 rounded-full object-cover border-2 border-fm-pink group-hover:border-fm-blue transition"
                          />
                          {match.matchedUser.isOnline && (
                            <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-fm-background rounded-full" />
                          )}
                        </div>
                        <p className="text-sm font-medium text-fm-text-primary mt-2">{match.matchedUser.name}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Message History */}
              <div>
                <h2 className="text-lg font-semibold text-fm-text-primary mb-3">Messages</h2>
                <div className="bg-fm-surface/60 backdrop-blur-sm rounded-xl border border-white/10 divide-y divide-white/10">
                  {matches.filter(m => m.lastMessage).length === 0 ? (
                    <p className="text-fm-text-secondary text-sm p-4">No messages yet. Start a conversation!</p>
                  ) : (
                    matches.filter(m => m.lastMessage).map((match) => (
                      <button
                        key={match.id}
                        onClick={() => navigate(`/messages?chat=${match.matchedUser.id}`)}
                        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition text-left"
                      >
                        <div className="relative">
                          <img
                            src={match.matchedUser.photoUrl}
                            alt={match.matchedUser.name}
                            className="w-14 h-14 rounded-full object-cover"
                          />
                          {match.matchedUser.isOnline && (
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-fm-surface rounded-full" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-fm-text-primary">{match.matchedUser.name}</p>
                            {match.lastMessageAt && (
                              <span className="text-xs text-fm-text-muted">{formatTime(match.lastMessageAt)}</span>
                            )}
                          </div>
                          <p className={`text-sm truncate ${match.hasUnread ? 'text-fm-text-primary font-medium' : 'text-fm-text-secondary'}`}>
                            {match.lastMessage}
                          </p>
                        </div>
                        {match.hasUnread && (
                          <span className="w-3 h-3 bg-fm-pink rounded-full flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Likes Tab */}
          {activeTab === 'likes' && (
            <div className="bg-fm-surface/60 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">💖</div>
                <h2 className="text-xl font-bold text-fm-text-primary">{likes.length} people like you!</h2>
                <p className="text-fm-text-secondary text-sm mt-1">
                  Upgrade to Premium to see who likes you
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {likes.map((like) => (
                  <div key={like.id} className="relative">
                    <img
                      src={like.fromUser.blurredPhotoUrl}
                      alt="Someone likes you"
                      className="w-full aspect-square rounded-xl object-cover blur-md opacity-70"
                    />
                    {like.isSuperLike && (
                      <span className="absolute top-2 right-2 bg-fm-blue text-white text-xs px-2 py-1 rounded-full">
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
                className="w-full mt-6 bg-gradient-to-r from-fm-pink to-fm-blue text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Upgrade to Premium
              </button>
            </div>
          )}
        </main>
      </div>
    </FlamoralBackground>
  );
};

export default MatchesPage;
