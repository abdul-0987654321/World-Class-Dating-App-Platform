import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SpeedDatingSession } from '../../components/speed-dating';
import { authTokenService } from '../../services/auth-token.service';

interface SpeedDatingEvent {
  id: string;
  title: string;
  description: string;
  theme: string;
  date: string;
  duration: number;
  roundDuration: number;
  maxParticipants: number;
  currentParticipants: number;
  ageRange: { min: number; max: number };
  status: 'upcoming' | 'live' | 'completed';
  isRegistered: boolean;
  price: number;
  host: { name: string; photoUrl: string };
}

interface Match {
  id: string;
  user: { id: string; name: string; photoUrl: string; age: number };
  matchedAt: string;
  eventId: string;
}

// Mock participants for demo
const getMockParticipants = () => [
  { id: 'p1', name: 'Emma', age: 28, photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', bio: 'Adventure seeker & coffee lover' },
  { id: 'p2', name: 'Sophie', age: 26, photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400', bio: 'Art enthusiast, yoga practitioner' },
  { id: 'p3', name: 'Olivia', age: 29, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', bio: 'Tech professional, loves hiking' },
  { id: 'p4', name: 'Mia', age: 27, photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', bio: 'Foodie, travel blogger' },
  { id: 'p5', name: 'Charlotte', age: 30, photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400', bio: 'Book lover, wine connoisseur' },
];

export const SpeedDatingPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'matches'>('upcoming');
  const [events, setEvents] = useState<SpeedDatingEvent[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SpeedDatingEvent | null>(null);
  const [activeSession, setActiveSession] = useState<SpeedDatingEvent | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = authTokenService.getToken();
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

      const eventsRes = await fetch('/api/speed-dating/events', { headers });
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.data?.events || getDefaultEvents());
      } else {
        setEvents(getDefaultEvents());
      }

      setMatches(getDefaultMatches());
    } catch (err) {
      console.error('Failed to load speed dating data:', err);
      setEvents(getDefaultEvents());
      setMatches(getDefaultMatches());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultEvents = (): SpeedDatingEvent[] => [
    {
      id: '1',
      title: 'Friday Night Mixers',
      description: 'Meet new people in quick 5-minute video dates. Fun icebreakers included!',
      theme: 'General',
      date: '2025-11-29T20:00:00',
      duration: 90,
      roundDuration: 5,
      maxParticipants: 50,
      currentParticipants: 38,
      ageRange: { min: 25, max: 35 },
      status: 'upcoming',
      isRegistered: true,
      price: 0,
      host: { name: 'Flamoral Team', photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100' },
    },
    {
      id: '2',
      title: 'Tech Professionals Meetup',
      description: 'Speed dating for tech enthusiasts. Find someone who speaks your language!',
      theme: 'Tech',
      date: '2025-11-30T19:00:00',
      duration: 60,
      roundDuration: 4,
      maxParticipants: 30,
      currentParticipants: 22,
      ageRange: { min: 23, max: 40 },
      status: 'upcoming',
      isRegistered: false,
      price: 5,
      host: { name: 'TechConnect', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
    },
    {
      id: '3',
      title: 'Foodies & Wine Lovers',
      description: 'Bond over your love for great food and wine. Virtual wine tasting included!',
      theme: 'Food & Wine',
      date: '2025-12-01T18:00:00',
      duration: 75,
      roundDuration: 5,
      maxParticipants: 40,
      currentParticipants: 35,
      ageRange: { min: 28, max: 45 },
      status: 'upcoming',
      isRegistered: false,
      price: 10,
      host: { name: 'Wine Club NYC', photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100' },
    },
    {
      id: '4',
      title: 'Live Now: Weekend Vibes',
      description: 'Jump into live speed dates happening right now!',
      theme: 'General',
      date: new Date().toISOString(),
      duration: 60,
      roundDuration: 4,
      maxParticipants: 40,
      currentParticipants: 32,
      ageRange: { min: 21, max: 35 },
      status: 'live',
      isRegistered: false,
      price: 0,
      host: { name: 'Flamoral Team', photoUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100' },
    },
  ];

  const getDefaultMatches = (): Match[] => [
    { id: '1', user: { id: 'u1', name: 'Emma', photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', age: 28 }, matchedAt: '2025-11-24T20:30:00', eventId: 'e1' },
    { id: '2', user: { id: 'u2', name: 'Sophie', photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100', age: 26 }, matchedAt: '2025-11-22T19:45:00', eventId: 'e2' },
  ];

  const handleRegister = (eventId: string) => {
    setEvents(events.map(e =>
      e.id === eventId
        ? { ...e, isRegistered: !e.isRegistered, currentParticipants: e.isRegistered ? e.currentParticipants - 1 : e.currentParticipants + 1 }
        : e
    ));
  };

  const handleJoinLive = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setActiveSession(event);
    }
  };

  const handleSessionEnd = (matchedIds: string[]) => {
    // In a real app, send matchedIds to the server
    setActiveSession(null);
    setActiveTab('matches');
    // Show success message
    alert(`Session complete! You liked ${matchedIds.length} people. Check your matches tab for results!`);
  };

  const handleLeaveSession = () => {
    if (window.confirm('Are you sure you want to leave the session? You won\'t be able to rejoin.')) {
      setActiveSession(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getTimeUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
    return 'Starting soon';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const liveEvents = events.filter(e => e.status === 'live');

  // Render active session if one exists
  if (activeSession) {
    return (
      <SpeedDatingSession
        config={{
          eventId: activeSession.id,
          eventTitle: activeSession.title,
          roundDuration: activeSession.roundDuration * 60, // Convert to seconds
          breakDuration: 5, // 5 seconds between rounds
          totalRounds: 5,
          participants: getMockParticipants(),
        }}
        onSessionEnd={handleSessionEnd}
        onLeaveSession={handleLeaveSession}
      />
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
            <button onClick={() => navigate('/speed-dating')} className="text-pink-500 font-medium">Speed Dating</button>
            <button onClick={() => navigate('/communities')} className="text-gray-600 hover:text-pink-500">Communities</button>
            <button onClick={() => navigate('/profile')} className="text-gray-600 hover:text-pink-500">Profile</button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl p-8 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Speed Dating</h2>
              <p className="text-lg opacity-90">Meet more people in less time with video speed dates</p>
              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎥</span>
                  <span>Video Dates</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⏱️</span>
                  <span>5-min Rounds</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💘</span>
                  <span>Instant Matches</span>
                </div>
              </div>
            </div>
            {liveEvents.length > 0 && (
              <div className="text-center">
                <div className="animate-pulse bg-white/20 rounded-full px-4 py-2 mb-2">
                  <span className="text-red-300">● LIVE NOW</span>
                </div>
                <button
                  onClick={() => handleJoinLive(liveEvents[0].id)}
                  className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-purple-50 transition"
                >
                  Join Now
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl p-1 flex mb-6 shadow-sm">
          {(['upcoming', 'live', 'matches'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab === 'live' && liveEvents.length > 0 && (
                <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
              )}
              {tab} {tab === 'matches' && `(${matches.length})`}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingEvents.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <span className="text-6xl">📅</span>
                <h3 className="text-xl font-bold text-gray-800 mt-4">No upcoming events</h3>
                <p className="text-gray-500 mt-2">Check back soon for new speed dating sessions!</p>
              </div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center">
                        <span className="text-3xl">
                          {event.theme === 'Tech' ? '💻' : event.theme === 'Food & Wine' ? '🍷' : '💕'}
                        </span>
                      </div>
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
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {event.duration} min ({event.roundDuration} min/round)
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {event.currentParticipants}/{event.maxParticipants}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="bg-pink-100 text-pink-600 text-xs px-2 py-1 rounded-full">Ages {event.ageRange.min}-{event.ageRange.max}</span>
                          <span className="bg-purple-100 text-purple-600 text-xs px-2 py-1 rounded-full">{getTimeUntil(event.date)}</span>
                          {event.price > 0 && (
                            <span className="bg-amber-100 text-amber-600 text-xs px-2 py-1 rounded-full">${event.price}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <button
                        onClick={() => handleRegister(event.id)}
                        className={`px-6 py-3 rounded-xl font-medium transition ${
                          event.isRegistered
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90'
                        }`}
                      >
                        {event.isRegistered ? 'Registered ✓' : event.price > 0 ? `Register ($${event.price})` : 'Register Free'}
                      </button>
                      <div className="mt-2 flex items-center justify-end gap-2">
                        <img src={event.host.photoUrl} alt={event.host.name} className="w-6 h-6 rounded-full" />
                        <span className="text-xs text-gray-400">Hosted by {event.host.name}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'live' && (
          <div className="space-y-4">
            {liveEvents.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <span className="text-6xl">📺</span>
                <h3 className="text-xl font-bold text-gray-800 mt-4">No live events right now</h3>
                <p className="text-gray-500 mt-2">Check back during scheduled event times!</p>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600"
                >
                  View Upcoming Events
                </button>
              </div>
            ) : (
              liveEvents.map((event) => (
                <div key={event.id} className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="animate-pulse bg-red-500 w-3 h-3 rounded-full" />
                        <span className="font-bold">LIVE NOW</span>
                      </div>
                      <h3 className="text-2xl font-bold">{event.title}</h3>
                      <p className="opacity-90 mt-1">{event.description}</p>
                      <div className="flex items-center gap-4 mt-4">
                        <span>{event.currentParticipants} participants</span>
                        <span>•</span>
                        <span>{event.roundDuration} min rounds</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoinLive(event.id)}
                      className="bg-white text-purple-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-purple-50 transition flex items-center gap-2"
                    >
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Join Now
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'matches' && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <span className="text-6xl">💘</span>
                <h3 className="text-xl font-bold text-gray-800 mt-4">No speed dating matches yet</h3>
                <p className="text-gray-500 mt-2">Join a speed dating event to find your matches!</p>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className="mt-4 px-6 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600"
                >
                  View Upcoming Events
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Your Speed Dating Matches</h3>
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                        <div className="flex items-center gap-4">
                          <img
                            src={match.user.photoUrl}
                            alt={match.user.name}
                            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg"
                          />
                          <div>
                            <h4 className="font-bold text-gray-800">{match.user.name}, {match.user.age}</h4>
                            <p className="text-sm text-gray-500">
                              Matched on {new Date(match.matchedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate('/messages')}
                            className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 transition"
                          >
                            Message
                          </button>
                          <button className="px-4 py-2 bg-white text-gray-600 rounded-lg font-medium hover:bg-gray-100 transition border">
                            View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* How It Works */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">How Speed Dating Matches Work</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">1</span>
                      </div>
                      <h4 className="font-medium text-gray-800">Video Date</h4>
                      <p className="text-sm text-gray-500 mt-1">Have a quick video chat with each participant</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">2</span>
                      </div>
                      <h4 className="font-medium text-gray-800">Express Interest</h4>
                      <p className="text-sm text-gray-500 mt-1">Mark who you'd like to connect with</p>
                    </div>
                    <div className="text-center p-4">
                      <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">3</span>
                      </div>
                      <h4 className="font-medium text-gray-800">Get Matched</h4>
                      <p className="text-sm text-gray-500 mt-1">If mutual interest, you're matched!</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SpeedDatingPage;
