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
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 blur-xl opacity-50 animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Flamoral
          </h1>
          <nav className="flex items-center gap-6">
            <button onClick={() => navigate('/discover')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} className="text-gray-400 hover:text-pink-500 transition-colors">
              Messages
            </button>
            <button onClick={() => navigate('/profile')} className="text-transparent bg-gradient-to-r from-pink-500 to-blue-500 bg-clip-text font-medium">
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
        {/* Profile Header */}
        <div className="relative bg-gradient-to-br from-pink-500/20 via-purple-500/10 to-blue-500/20 rounded-3xl overflow-hidden mb-6 border border-white/10">
          <div className="backdrop-blur-xl p-8">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-blue-500 animate-pulse opacity-50 blur-xl" />
              <img
                src={user.photos?.[0] || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop'}
                alt={user.name}
                className="relative w-full h-full rounded-full object-cover border-4 border-white/20 shadow-2xl"
              />
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-pink-500/50 transition-all hover:scale-110">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="text-3xl font-bold text-white text-center">{user.name}, {user.age}</h2>
              {user.verified?.photo && (
                <span className="relative">
                  <div className="absolute inset-0 bg-blue-500 blur-md opacity-50 rounded-full" />
                  <span className="relative bg-gradient-to-r from-blue-400 to-blue-600 text-white text-xs px-3 py-1 rounded-full flex items-center gap-1 border border-blue-300/30">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-gray-300 mb-4">
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {user.location?.city}, {user.location?.state}
              </span>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {user.occupation}
              </span>
            </div>

            {/* Subscription Badge */}
            <div className="relative inline-flex items-center justify-center w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 blur-lg opacity-30" />
              <div className="relative inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Premium Member
              </div>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">About Me</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-transparent bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text hover:from-pink-400 hover:to-purple-400 text-sm font-medium transition-all"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <div>
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full p-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 focus:bg-white/10 transition-all"
                rows={4}
                placeholder="Tell us about yourself..."
              />
              <button
                onClick={handleSaveBio}
                className="mt-3 px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-pink-500/50"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-gray-300">{user.bio}</p>
          )}
        </div>

        {/* Interests */}
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests?.map((interest: string, idx: number) => (
              <span
                key={idx}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full opacity-0 group-hover:opacity-20 blur transition-opacity" />
                <span className="relative bg-gradient-to-r from-pink-500/20 to-purple-500/20 text-pink-300 border border-pink-500/30 px-4 py-2 rounded-full text-sm font-medium hover:border-pink-400/50 transition-all">
                  {interest}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Your Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="relative bg-gradient-to-br from-pink-500/10 to-pink-500/5 border border-pink-500/20 rounded-xl p-4 group hover:border-pink-500/40 transition-all">
              <div className="absolute inset-0 bg-pink-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="relative text-3xl font-bold bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                {user.coinBalance}
              </p>
              <p className="relative text-sm text-gray-400 mt-1">Coins</p>
            </div>
            <div className="relative bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-4 group hover:border-purple-500/40 transition-all">
              <div className="absolute inset-0 bg-purple-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="relative text-3xl font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                12
              </p>
              <p className="relative text-sm text-gray-400 mt-1">Matches</p>
            </div>
            <div className="relative bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 group hover:border-blue-500/40 transition-all">
              <div className="absolute inset-0 bg-blue-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <p className="relative text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                48
              </p>
              <p className="relative text-sm text-gray-400 mt-1">Likes</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mb-6">
          <button onClick={() => navigate('/settings')} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-all group border-b border-white/10">
            <span className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center border border-gray-500/30 group-hover:border-gray-400/50 transition-all">
                <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              Account Settings
            </span>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/safety')} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-all group border-b border-white/10">
            <span className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center border border-pink-500/30 group-hover:border-pink-400/50 transition-all">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              Safety Center
            </span>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/privacy')} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-all group border-b border-white/10">
            <span className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center border border-purple-500/30 group-hover:border-purple-400/50 transition-all">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              Privacy Settings
            </span>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/notifications')} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-all group border-b border-white/10">
            <span className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center border border-blue-500/30 group-hover:border-blue-400/50 transition-all">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              Notification Settings
            </span>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => navigate('/help')} className="w-full p-4 flex items-center justify-between text-left hover:bg-white/5 transition-all group">
            <span className="text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border border-green-500/30 group-hover:border-green-400/50 transition-all">
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Help & Support
            </span>
            <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="relative w-full py-3 text-red-400 font-medium hover:text-red-300 bg-black/40 backdrop-blur-xl border border-red-500/20 hover:border-red-500/40 rounded-xl transition-all hover:bg-red-500/10 group"
        >
          <div className="absolute inset-0 bg-red-500/5 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
          <span className="relative">Sign Out</span>
        </button>
      </main>
    </div>
  );
};

export default ProfilePage;
