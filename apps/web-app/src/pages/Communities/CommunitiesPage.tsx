import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  memberCount: number;
  isJoined: boolean;
  category: string;
  color: string;
}

interface Post {
  id: string;
  author: { id: string; name: string; photoUrl: string };
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
  isLiked: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
}

export const CommunitiesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'discover' | 'joined' | 'events'>('discover');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = authTokenService.getToken();
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const [communitiesRes, eventsRes] = await Promise.all([
        fetch('/api/communities', { headers }),
        fetch('/api/communities/events', { headers }).catch(() => null),
      ]);

      if (communitiesRes.ok) {
        const data = await communitiesRes.json();
        setCommunities(data.data?.communities || getDefaultCommunities());
      } else {
        setCommunities(getDefaultCommunities());
      }

      if (eventsRes?.ok) {
        const data = await eventsRes.json();
        setEvents(data.data?.events || getDefaultEvents());
      } else {
        setEvents(getDefaultEvents());
      }

      setPosts(getDefaultPosts());
    } catch (err) {
      console.error('Failed to load communities:', err);
      setCommunities(getDefaultCommunities());
      setEvents(getDefaultEvents());
      setPosts(getDefaultPosts());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultCommunities = (): Community[] => [
    { id: '1', name: 'Travel Lovers', description: 'Share your travel adventures and find companions', icon: '✈️', memberCount: 15420, isJoined: true, category: 'Lifestyle', color: 'from-blue-400 to-cyan-400' },
    { id: '2', name: 'Foodies Unite', description: 'Discover restaurants and share recipes', icon: '🍕', memberCount: 12890, isJoined: true, category: 'Food', color: 'from-orange-400 to-red-400' },
    { id: '3', name: 'Fitness Fanatics', description: 'Workout buddies and fitness tips', icon: '💪', memberCount: 9870, isJoined: false, category: 'Health', color: 'from-green-400 to-emerald-400' },
    { id: '4', name: 'Book Club', description: 'Discuss your favorite reads', icon: '📚', memberCount: 7650, isJoined: false, category: 'Culture', color: 'from-purple-400 to-pink-400' },
    { id: '5', name: 'Pet Parents', description: 'Share your furry friends', icon: '🐕', memberCount: 11230, isJoined: true, category: 'Pets', color: 'from-amber-400 to-orange-400' },
    { id: '6', name: 'Movie Buffs', description: 'Film discussions and recommendations', icon: '🎬', memberCount: 8900, isJoined: false, category: 'Entertainment', color: 'from-red-400 to-pink-400' },
    { id: '7', name: 'Music Lovers', description: 'Share playlists and concert experiences', icon: '🎵', memberCount: 10450, isJoined: false, category: 'Music', color: 'from-indigo-400 to-purple-400' },
    { id: '8', name: 'Outdoor Adventures', description: 'Hiking, camping, and nature exploration', icon: '🏕️', memberCount: 6780, isJoined: false, category: 'Adventure', color: 'from-green-500 to-teal-400' },
    { id: '9', name: 'Tech Enthusiasts', description: 'Latest gadgets and tech discussions', icon: '💻', memberCount: 5430, isJoined: false, category: 'Technology', color: 'from-gray-600 to-gray-400' },
    { id: '10', name: 'Art & Design', description: 'Creative inspiration and art sharing', icon: '🎨', memberCount: 4560, isJoined: false, category: 'Art', color: 'from-pink-400 to-rose-400' },
  ];

  const getDefaultEvents = (): Event[] => [
    { id: '1', title: 'Travel Meetup - NYC', description: 'Meet fellow travelers in Central Park', date: '2025-12-01T14:00:00', location: 'Central Park, NYC', attendees: 45, maxAttendees: 100, isAttending: true },
    { id: '2', title: 'Foodie Crawl - Brooklyn', description: 'Explore the best eateries in Brooklyn', date: '2025-12-05T18:00:00', location: 'Brooklyn, NYC', attendees: 28, maxAttendees: 40, isAttending: false },
    { id: '3', title: 'Group Hike - Bear Mountain', description: 'Weekend hiking adventure', date: '2025-12-08T08:00:00', location: 'Bear Mountain State Park', attendees: 15, maxAttendees: 25, isAttending: false },
    { id: '4', title: 'Book Club Meeting', description: 'Discussing "The Midnight Library"', date: '2025-12-10T19:00:00', location: 'Virtual / Zoom', attendees: 32, maxAttendees: 50, isAttending: true },
  ];

  const getDefaultPosts = (): Post[] => [
    { id: '1', author: { id: '1', name: 'Sarah', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' }, content: 'Just booked my trip to Bali! Anyone been there recently? Looking for recommendations! 🌴', likes: 45, comments: 12, createdAt: '2025-11-26T10:00:00', isLiked: true },
    { id: '2', author: { id: '2', name: 'Mike', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }, content: 'Found this amazing ramen place downtown. The spicy miso is incredible! 🍜', likes: 32, comments: 8, createdAt: '2025-11-26T08:30:00', isLiked: false },
    { id: '3', author: { id: '3', name: 'Emma', photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' }, content: 'Morning hike at sunrise. Best way to start the weekend! Who wants to join next time?', likes: 67, comments: 15, createdAt: '2025-11-25T16:00:00', isLiked: true },
  ];

  const handleJoinCommunity = (communityId: string) => {
    setCommunities(communities.map(c =>
      c.id === communityId ? { ...c, isJoined: !c.isJoined, memberCount: c.isJoined ? c.memberCount - 1 : c.memberCount + 1 } : c
    ));
  };

  const handleLikePost = (postId: string) => {
    setPosts(posts.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const handleAttendEvent = (eventId: string) => {
    setEvents(events.map(e =>
      e.id === eventId ? { ...e, isAttending: !e.isAttending, attendees: e.isAttending ? e.attendees - 1 : e.attendees + 1 } : e
    ));
  };

  const handleCreatePost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: Date.now().toString(),
      author: { id: 'me', name: 'You', photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
      content: newPost,
      likes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      isLiked: false,
    };
    setPosts([post, ...posts]);
    setNewPost('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
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
          <nav className="flex items-center gap-4">
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">Discover</button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">Matches</button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">Messages</button>
            <button onClick={() => navigate('/communities')} className="text-pink-500 font-medium">Communities</button>
            <button onClick={() => navigate('/rewards')} className="text-gray-600 hover:text-pink-500">Rewards</button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Page Title */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Communities</h2>
          <p className="text-gray-600">Connect with people who share your interests</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 flex mb-6 shadow-sm">
          {(['discover', 'joined', 'events'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSelectedCommunity(null); }}
              className={`flex-1 py-3 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'joined' ? `My Communities (${communities.filter(c => c.isJoined).length})` : tab}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Communities List */}
          <div className={`${selectedCommunity ? 'w-1/3' : 'w-full'} transition-all`}>
            {activeTab === 'discover' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {communities.map((community) => (
                  <div
                    key={community.id}
                    onClick={() => setSelectedCommunity(community)}
                    className={`bg-white rounded-xl p-6 shadow-sm cursor-pointer hover:shadow-md transition ${
                      selectedCommunity?.id === community.id ? 'ring-2 ring-pink-500' : ''
                    }`}
                  >
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${community.color} flex items-center justify-center mb-4`}>
                      <span className="text-3xl">{community.icon}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{community.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{community.description}</p>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-sm text-gray-400">{community.memberCount.toLocaleString()} members</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinCommunity(community.id); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          community.isJoined
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-pink-500 text-white hover:bg-pink-600'
                        }`}
                      >
                        {community.isJoined ? 'Joined' : 'Join'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'joined' && (
              <div className="space-y-4">
                {communities.filter(c => c.isJoined).length === 0 ? (
                  <div className="bg-white rounded-xl p-8 text-center">
                    <span className="text-6xl">🏠</span>
                    <h3 className="text-xl font-bold text-gray-800 mt-4">No communities yet</h3>
                    <p className="text-gray-500 mt-2">Explore and join communities to connect with like-minded people</p>
                    <button
                      onClick={() => setActiveTab('discover')}
                      className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600"
                    >
                      Explore Communities
                    </button>
                  </div>
                ) : (
                  communities.filter(c => c.isJoined).map((community) => (
                    <div
                      key={community.id}
                      onClick={() => setSelectedCommunity(community)}
                      className={`bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition flex items-center gap-4 ${
                        selectedCommunity?.id === community.id ? 'ring-2 ring-pink-500' : ''
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${community.color} flex items-center justify-center`}>
                        <span className="text-2xl">{community.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">{community.name}</h3>
                        <p className="text-sm text-gray-400">{community.memberCount.toLocaleString()} members</p>
                      </div>
                      <span className="text-pink-500 text-sm">View →</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'events' && (
              <div className="space-y-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-gray-800">{event.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {formatDate(event.date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            {event.location}
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-pink-500 h-2 rounded-full"
                                style={{ width: `${(event.attendees / event.maxAttendees) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-500">{event.attendees}/{event.maxAttendees}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAttendEvent(event.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                          event.isAttending
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-pink-500 text-white hover:bg-pink-600'
                        }`}
                      >
                        {event.isAttending ? 'Going ✓' : 'Attend'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Community Detail */}
          {selectedCommunity && (
            <div className="w-2/3 bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Community Header */}
              <div className={`bg-gradient-to-r ${selectedCommunity.color} p-6 text-white`}>
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{selectedCommunity.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedCommunity.name}</h3>
                    <p className="opacity-90">{selectedCommunity.memberCount.toLocaleString()} members</p>
                  </div>
                </div>
                <p className="mt-4 opacity-90">{selectedCommunity.description}</p>
              </div>

              {/* Create Post */}
              {selectedCommunity.isJoined && (
                <div className="p-4 border-b">
                  <div className="flex gap-3">
                    <img
                      src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100"
                      alt="You"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Share something with the community..."
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                        rows={2}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={handleCreatePost}
                          disabled={!newPost.trim()}
                          className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Posts Feed */}
              <div className="divide-y max-h-96 overflow-y-auto">
                {posts.map((post) => (
                  <div key={post.id} className="p-4">
                    <div className="flex gap-3">
                      <img
                        src={post.author.photoUrl}
                        alt={post.author.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{post.author.name}</span>
                          <span className="text-sm text-gray-400">{formatTimeAgo(post.createdAt)}</span>
                        </div>
                        <p className="text-gray-700 mt-1">{post.content}</p>
                        <div className="flex items-center gap-4 mt-3">
                          <button
                            onClick={() => handleLikePost(post.id)}
                            className={`flex items-center gap-1 text-sm ${post.isLiked ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                          >
                            <svg className="w-5 h-5" fill={post.isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.likes}
                          </button>
                          <button className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {post.comments}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CommunitiesPage;
