import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  photos: string[];
  profilePhoto?: string;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export const AdminVerificationsPage: React.FC = () => {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/verifications?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setRequests(data.data?.verifications || []);
      } else {
        // Mock data for demo
        setRequests([
          {
            id: '1',
            userId: 'user1',
            userName: 'Emily Chen',
            userEmail: 'emily@example.com',
            photos: [
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
              'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
            ],
            profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
            submittedAt: new Date(Date.now() - 3600000).toISOString(),
            status: 'pending',
          },
          {
            id: '2',
            userId: 'user2',
            userName: 'James Wilson',
            userEmail: 'james@example.com',
            photos: [
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
            ],
            profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
            submittedAt: new Date(Date.now() - 7200000).toISOString(),
            status: 'pending',
          },
          {
            id: '3',
            userId: 'user3',
            userName: 'Sophie Martinez',
            userEmail: 'sophie@example.com',
            photos: [
              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
              'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
            ],
            profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
            submittedAt: new Date(Date.now() - 10800000).toISOString(),
            status: 'pending',
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      const token = authTokenService.getToken();
      await fetch(`/api/admin/verifications/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      // Update local state
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedRequest(null);
    } catch (err) {
      console.error('Failed to approve verification:', err);
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const token = authTokenService.getToken();
      await fetch(`/api/admin/verifications/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      // Update local state
      setRequests(prev => prev.filter(r => r.id !== requestId));
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (err) {
      console.error('Failed to reject verification:', err);
    }
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const REJECTION_REASONS = [
    'Face not clearly visible',
    'Photo quality too low',
    'Does not match profile photos',
    'Poses not completed correctly',
    'Suspicious or manipulated images',
    'Other (please specify)',
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Photo Verifications</h1>
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
              {requests.filter(r => r.status === 'pending').length} pending
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
              { name: 'Moderation', path: '/admin/moderation' },
              { name: 'Verifications', path: '/admin/verifications', active: true },
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
            {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filter === f
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <span className="text-4xl mb-4 block">✅</span>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">All caught up!</h3>
            <p className="text-gray-500">No verification requests to review</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => {
                  setSelectedRequest(request);
                  setCurrentPhotoIndex(0);
                }}
              >
                {/* Preview Image */}
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={request.photos[0]}
                    alt="Verification"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-black/60 text-white px-2 py-1 rounded-full text-sm">
                    {request.photos.length} photos
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {request.userName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{request.userName}</h3>
                      <p className="text-sm text-gray-500">{request.userEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Submitted {formatTime(request.submittedAt)}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      request.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                      request.status === 'approved' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {selectedRequest.userName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedRequest.userName}</h3>
                  <p className="text-gray-500">{selectedRequest.userEmail}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Photo Gallery */}
              <div className="mb-6">
                <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden mb-4">
                  <img
                    src={selectedRequest.photos[currentPhotoIndex]}
                    alt={`Verification photo ${currentPhotoIndex + 1}`}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex gap-2 justify-center">
                  {selectedRequest.photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${
                        currentPhotoIndex === index ? 'border-pink-500' : 'border-transparent'
                      }`}
                    >
                      <img src={photo} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comparison with Profile Photo */}
              {selectedRequest.profilePhoto && (
                <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                  <h4 className="font-semibold text-gray-800 mb-3">Profile Photo Comparison</h4>
                  <div className="flex gap-4 items-center justify-center">
                    <div className="text-center">
                      <img
                        src={selectedRequest.profilePhoto}
                        alt="Profile"
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                      <p className="text-sm text-gray-500 mt-2">Profile Photo</p>
                    </div>
                    <span className="text-2xl">↔️</span>
                    <div className="text-center">
                      <img
                        src={selectedRequest.photos[0]}
                        alt="Verification"
                        className="w-32 h-32 rounded-lg object-cover"
                      />
                      <p className="text-sm text-gray-500 mt-2">Verification Photo</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Pose Checklist */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-3">Verification Checklist</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded text-pink-500 focus:ring-pink-500" />
                    <span>Face clearly visible in all photos</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded text-pink-500 focus:ring-pink-500" />
                    <span>Poses match the required poses</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded text-pink-500 focus:ring-pink-500" />
                    <span>Photos appear unedited/authentic</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 rounded text-pink-500 focus:ring-pink-500" />
                    <span>Person matches profile photo</span>
                  </label>
                </div>
              </div>

              {/* Rejection Reason */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Rejection Reason (if rejecting)</h4>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 mb-2"
                >
                  <option value="">Select a reason...</option>
                  {REJECTION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
                {rejectionReason === 'Other (please specify)' && (
                  <textarea
                    placeholder="Specify the reason..."
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                    rows={2}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => handleApprove(selectedRequest.id)}
                  className="flex-1 py-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition"
                >
                  Approve Verification
                </button>
                <button
                  onClick={() => {
                    if (!rejectionReason) {
                      alert('Please select a rejection reason');
                      return;
                    }
                    handleReject(selectedRequest.id, rejectionReason);
                  }}
                  className="flex-1 py-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
                >
                  Reject Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVerificationsPage;
