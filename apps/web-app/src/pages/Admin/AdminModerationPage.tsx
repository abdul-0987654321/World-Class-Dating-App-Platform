import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface FlaggedContent {
  id: string;
  type: 'photo' | 'bio' | 'message' | 'prompt';
  userId: string;
  userName: string;
  content: string;
  imageUrl?: string;
  reason: string;
  flaggedAt: string;
  autoDetected: boolean;
  confidenceScore?: number;
}

export const AdminModerationPage: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'photo' | 'bio' | 'message' | 'prompt'>('all');
  const [selectedItem, setSelectedItem] = useState<FlaggedContent | null>(null);

  useEffect(() => {
    fetchFlaggedContent();
  }, [filter]);

  const fetchFlaggedContent = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/v1/admin/moderation?type=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFlaggedContent(data.data?.content || []);
      } else {
        // Mock data for demo
        setFlaggedContent([
          {
            id: '1',
            type: 'photo',
            userId: 'user1',
            userName: 'Alex Johnson',
            content: 'Profile photo',
            imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            reason: 'Potential nudity detected',
            flaggedAt: new Date(Date.now() - 3600000).toISOString(),
            autoDetected: true,
            confidenceScore: 0.78,
          },
          {
            id: '2',
            type: 'bio',
            userId: 'user2',
            userName: 'Sarah Williams',
            content:
              'Looking for someone special! Contact me on Instagram @suspicious_account or WhatsApp +1234567890',
            reason: 'External contact information',
            flaggedAt: new Date(Date.now() - 7200000).toISOString(),
            autoDetected: true,
            confidenceScore: 0.95,
          },
          {
            id: '3',
            type: 'message',
            userId: 'user3',
            userName: 'Mike Brown',
            content: 'Hey, check out this website for free coins: scam-link.com',
            reason: 'Suspicious link detected',
            flaggedAt: new Date(Date.now() - 10800000).toISOString(),
            autoDetected: true,
            confidenceScore: 0.92,
          },
          {
            id: '4',
            type: 'prompt',
            userId: 'user4',
            userName: 'Emma Davis',
            content:
              "My ideal first date is... something I can't say here without getting banned 😏",
            reason: 'Potentially inappropriate content',
            flaggedAt: new Date(Date.now() - 14400000).toISOString(),
            autoDetected: true,
            confidenceScore: 0.65,
          },
          {
            id: '5',
            type: 'photo',
            userId: 'user5',
            userName: 'John Smith',
            content: 'Gallery photo 3',
            imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
            reason: 'Possible stock photo',
            flaggedAt: new Date(Date.now() - 18000000).toISOString(),
            autoDetected: true,
            confidenceScore: 0.71,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch flagged content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (contentId: string, action: 'approve' | 'remove' | 'warn') => {
    try {
      const token = authTokenService.getToken();
      await fetch(`/api/v1/admin/moderation/${contentId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      setFlaggedContent((prev) => prev.filter((c) => c.id !== contentId));
      setSelectedItem(null);
    } catch (err) {
      console.error(`Failed to ${action} content:`, err);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      photo: '📷',
      bio: '📝',
      message: '💬',
      prompt: '❓',
    };
    return icons[type] || '📄';
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Content Moderation</h1>
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
              {flaggedContent.length} flagged
            </span>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { name: 'Overview', path: '/admin' },
              { name: 'Users', path: '/admin/users' },
              { name: 'Moderation', path: '/admin/moderation', active: true },
              { name: 'Verifications', path: '/admin/verifications' },
              { name: 'Reports', path: '/admin/reports' },
              { name: 'Analytics', path: '/admin/analytics' },
              { name: 'Settings', path: '/admin/settings' },
            ].map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`py-4 px-2 border-b-2 whitespace-nowrap ${
                  item.active
                    ? 'border-pink-500 text-pink-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'photo', 'bio', 'message', 'prompt'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'All Content' : f + 's'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : flaggedContent.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <span className="text-4xl mb-4 block">✅</span>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">All clear!</h3>
            <p className="text-gray-500">No flagged content to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flaggedContent.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                {item.imageUrl ? (
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={item.imageUrl}
                      alt="Flagged content"
                      className="w-full h-full object-cover blur-md"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <span className="text-white bg-red-500 px-3 py-1 rounded-full text-sm">
                        Flagged Content
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 min-h-[150px]">
                    <p className="text-gray-600 line-clamp-4">{item.content}</p>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getTypeIcon(item.type)}</span>
                    <span className="text-sm font-medium text-gray-800 capitalize">
                      {item.type}
                    </span>
                    {item.autoDetected && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        Auto-detected
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{item.reason}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.userName}</span>
                    <span className="text-gray-400">{formatTime(item.flaggedAt)}</span>
                  </div>
                  {item.confidenceScore && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Confidence</span>
                        <span>{(item.confidenceScore * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.confidenceScore > 0.8
                              ? 'bg-red-500'
                              : item.confidenceScore > 0.6
                                ? 'bg-orange-500'
                                : 'bg-yellow-500'
                          }`}
                          style={{ width: `${item.confidenceScore * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getTypeIcon(selectedItem.type)}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800 capitalize">
                    {selectedItem.type} Content
                  </h3>
                  <p className="text-gray-500">{selectedItem.userName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Content Preview */}
              {selectedItem.imageUrl ? (
                <div className="mb-6">
                  <img
                    src={selectedItem.imageUrl}
                    alt="Content to review"
                    className="w-full max-h-96 object-contain rounded-xl bg-gray-100"
                  />
                </div>
              ) : (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <p className="text-gray-800">{selectedItem.content}</p>
                </div>
              )}

              {/* Flag Details */}
              <div className="mb-6 p-4 bg-red-50 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-2">Flag Reason</h4>
                <p className="text-gray-600">{selectedItem.reason}</p>
                {selectedItem.confidenceScore && (
                  <p className="text-sm text-gray-500 mt-2">
                    AI Confidence: {(selectedItem.confidenceScore * 100).toFixed(0)}%
                  </p>
                )}
              </div>

              {/* User Info */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-2">User</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedItem.userName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedItem.userName}</p>
                    <p className="text-sm text-gray-500">ID: {selectedItem.userId}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleAction(selectedItem.id, 'approve')}
                  className="py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleAction(selectedItem.id, 'warn')}
                  className="py-4 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition"
                >
                  Warn User
                </button>
                <button
                  onClick={() => handleAction(selectedItem.id, 'remove')}
                  className="py-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminModerationPage;
