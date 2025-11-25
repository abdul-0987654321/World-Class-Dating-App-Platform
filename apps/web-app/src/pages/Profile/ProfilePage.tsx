import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import mockApi from '../../mocks/mockApi';

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
      const data = await mockApi.getCurrentUser();
      setUser(data);
      setEditedBio(data.bio);
    } catch (err) {
      console.error('Failed to load user:', err);
      navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await mockApi.logout();
    navigate('/login');
  };

  const handleSaveBio = async () => {
    try {
      await mockApi.updateProfile({ bio: editedBio });
      setUser({ ...user, bio: editedBio });
      setEditing(false);
    } catch (err) {
      console.error('Failed to save bio:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
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
            <button onClick={() => navigate('/discover')} className="text-gray-600 hover:text-pink-500">
              Discover
            </button>
            <button onClick={() => navigate('/matches')} className="text-gray-600 hover:text-pink-500">
              Matches
            </button>
            <button onClick={() => navigate('/messages')} className="text-gray-600 hover:text-pink-500">
              Messages
            </button>
            <button onClick={() => navigate('/profile')} className="text-pink-500 font-medium">
              Profile
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-pink-500 to-purple-600" />
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
              <h2 className="text-2xl font-bold text-gray-800">{user.name}, {user.age}</h2>
              {user.verified?.photo && (
                <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
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
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Premium Member
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">About Me</h3>
            <button
              onClick={() => setEditing(!editing)}
              className="text-pink-500 hover:text-pink-600 text-sm font-medium"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editing ? (
            <div>
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                rows={4}
              />
              <button
                onClick={handleSaveBio}
                className="mt-3 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition"
              >
                Save
              </button>
            </div>
          ) : (
            <p className="text-gray-600">{user.bio}</p>
          )}
        </div>

        {/* Interests */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Interests</h3>
          <div className="flex flex-wrap gap-2">
            {user.interests?.map((interest: string, idx: number) => (
              <span
                key={idx}
                className="bg-pink-100 text-pink-700 px-4 py-2 rounded-full text-sm font-medium"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-pink-500">{user.coinBalance}</p>
              <p className="text-sm text-gray-500">Coins</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-purple-500">12</p>
              <p className="text-sm text-gray-500">Matches</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-500">48</p>
              <p className="text-sm text-gray-500">Likes</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm divide-y mb-6">
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition">
            <span className="text-gray-800">Account Settings</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition">
            <span className="text-gray-800">Privacy Settings</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition">
            <span className="text-gray-800">Notification Settings</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition">
            <span className="text-gray-800">Help & Support</span>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 text-red-500 font-medium hover:bg-red-50 rounded-xl transition"
        >
          Sign Out
        </button>
      </main>
    </div>
  );
};

export default ProfilePage;
