import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, profileService } from '../../services';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedBio, setEditedBio] = useState('');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      // First try to get from localStorage (set during login)
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        // Merge with profile data format
        setUser({
          id: userData.id,
          name: userData.firstName || userData.name,
          age: 28, // Default age
          email: userData.email,
          bio: userData.bio || 'Tell us about yourself...',
          occupation: userData.occupation || 'Not specified',
          location: { city: userData.city || 'Not specified', state: '' },
          photos: userData.photos || ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'],
          interests: userData.interests || ['Travel', 'Music', 'Food'],
          verified: { photo: userData.isVerified },
          coinBalance: userData.coinBalance || 100,
          premiumTier: userData.premiumTier || userData.subscription || 'FREE',
        });
        setEditedBio(userData.bio || '');
      } else {
        // Fallback to API call
        const data = await authService.getCurrentUser();
        setUser({
          id: data.id,
          name: data.firstName,
          age: 28,
          email: data.email,
          bio: '',
          occupation: '',
          location: { city: '', state: '' },
          photos: [data.photoUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'],
          interests: [],
          verified: { photo: data.isVerified },
          coinBalance: data.coinBalance || 0,
          premiumTier: data.premiumTier || 'FREE',
        });
      }
    } catch (err) {
      console.error('Failed to load user:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const handleSaveBio = async () => {
    try {
      await profileService.updateProfile({ bio: editedBio });
      setUser({ ...user, bio: editedBio });
      // Update localStorage as well
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        localStorage.setItem('currentUser', JSON.stringify({ ...userData, bio: editedBio }));
      }
      setEditing(false);
    } catch (err) {
      console.error('Failed to save bio:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-page)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-pink)' }}></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--surface-card)', borderColor: 'var(--border-subtle)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold" style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">
              Messages
            </button>
            <button onClick={() => navigate('/profile')} style={{ color: 'var(--accent-pink)' }} className="font-medium">
              Profile
            </button>
            <button onClick={() => navigate('/safety')} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-80">
              Safety
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: 'var(--surface-card)' }}>
          <div className="h-32" style={{ background: 'var(--accent-gradient)' }} />
          <div className="px-6 pb-6">
            <div className="relative -mt-16 mb-4">
              <img
                src={user.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'}
                alt={user.name}
                className="w-32 h-32 rounded-full border-4 border-white object-cover shadow-lg"
              />
              <button className="absolute bottom-2 right-2 w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{user.name}, {user.age}</h2>
              {user.verified?.photo && (
                <span className="text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--accent-cyan)' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {user.location?.city}, {user.location?.state}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.occupation}
              </span>
            </div>

            {/* Subscription Badge */}
            <div className="inline-flex items-center gap-2 text-white px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ background: 'linear-gradient(135deg, var(--coin-primary) 0%, #C77A45 100%)' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Premium Member
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--surface-card)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>About Me</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-sm font-medium"
              style={{ color: 'var(--accent-pink)' }}
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <div>
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full p-3 rounded-lg focus:ring-2 focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                rows={4}
              />
              <button
                onClick={handleSaveBio}
                className="mt-3 px-4 py-2 text-white rounded-lg transition hover:opacity-90"
                style={{ background: 'var(--accent-gradient)' }}
              >
                Save
              </button>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>{user.bio}</p>
          )}
        </div>

        {/* Interests */}
        <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--surface-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests?.map((interest: string, idx: number) => (
              <span
                key={idx}
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ background: 'rgba(255, 46, 147, 0.2)', color: 'var(--accent-pink)' }}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl p-6 mb-6" style={{ background: 'var(--surface-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Your Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--coin-primary)' }}>{user.coinBalance}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Coins</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-purple)' }}>12</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Matches</p>
            </div>
            <div className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-2xl font-bold" style={{ color: 'var(--accent-cyan)' }}>48</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Likes</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'var(--surface-card)' }}>
          <button onClick={() => navigate('/settings')} className="w-full p-4 flex items-center justify-between text-left transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Account Settings
            </span>
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/safety')} className="w-full p-4 flex items-center justify-between text-left transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--accent-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Safety Center
            </span>
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/privacy')} className="w-full p-4 flex items-center justify-between text-left transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Privacy Settings
            </span>
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/notifications')} className="w-full p-4 flex items-center justify-between text-left transition hover:bg-white/5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--accent-cyan)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Notification Settings
            </span>
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/help')} className="w-full p-4 flex items-center justify-between text-left transition hover:bg-white/5">
            <span className="flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Help & Support
            </span>
            <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 text-red-400 font-medium rounded-xl transition"
          style={{ background: 'rgba(239, 68, 68, 0.1)' }}
        >
          Sign Out
        </button>
      </main>
    </div>
  );
};

export default ProfilePage;
