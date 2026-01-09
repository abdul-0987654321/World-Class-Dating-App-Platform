import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  subscription: 'FREE' | 'GOLD' | 'PLATINUM' | 'DIAMOND';
  isVerified: boolean;
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  lastActive: string;
  reportCount: number;
}

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'premium' | 'banned' | 'reported'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchUsers();
  }, [page, filter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/users?page=${page}&filter=${filter}&search=${search}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setUsers(data.data?.users || []);
        setTotalPages(data.data?.totalPages || 1);
      } else {
        // Mock data for demo
        setUsers([
          { id: '1', email: 'alex@example.com', firstName: 'Alex', lastName: 'Johnson', subscription: 'GOLD', isVerified: true, isActive: true, isBanned: false, createdAt: '2024-01-15', lastActive: new Date().toISOString(), reportCount: 0 },
          { id: '2', email: 'sarah@example.com', firstName: 'Sarah', lastName: 'Williams', subscription: 'PLATINUM', isVerified: true, isActive: true, isBanned: false, createdAt: '2024-02-20', lastActive: new Date(Date.now() - 3600000).toISOString(), reportCount: 0 },
          { id: '3', email: 'mike@example.com', firstName: 'Mike', lastName: 'Brown', subscription: 'FREE', isVerified: false, isActive: true, isBanned: false, createdAt: '2024-03-10', lastActive: new Date(Date.now() - 86400000).toISOString(), reportCount: 2 },
          { id: '4', email: 'emma@example.com', firstName: 'Emma', lastName: 'Davis', subscription: 'DIAMOND', isVerified: true, isActive: true, isBanned: false, createdAt: '2024-01-05', lastActive: new Date().toISOString(), reportCount: 0 },
          { id: '5', email: 'john@example.com', firstName: 'John', lastName: 'Smith', subscription: 'FREE', isVerified: false, isActive: false, isBanned: true, createdAt: '2024-02-01', lastActive: new Date(Date.now() - 604800000).toISOString(), reportCount: 5 },
        ]);
        setTotalPages(5);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (userId: string, action: 'ban' | 'unban' | 'verify' | 'delete' | 'reset_password') => {
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        fetchUsers();
        setShowModal(false);
      }
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
    }
  };

  const getSubscriptionBadge = (sub: string) => {
    const badges: Record<string, string> = {
      FREE: 'bg-gray-100 text-gray-600',
      GOLD: 'bg-yellow-100 text-yellow-700',
      PLATINUM: 'bg-blue-100 text-blue-700',
      DIAMOND: 'bg-purple-100 text-purple-700',
    };
    return badges[sub] || badges.FREE;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatLastActive = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 5) return 'Online';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { name: 'Overview', path: '/admin' },
              { name: 'Users', path: '/admin/users', active: true },
              { name: 'Moderation', path: '/admin/moderation' },
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
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="flex gap-2">
              {(['all', 'verified', 'premium', 'banned', 'reported'] as const).map((f) => (
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
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">User</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">Status</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">Subscription</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">Joined</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">Last Active</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">Reports</th>
                      <th className="text-left py-4 px-6 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                              {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                              <div className="font-medium text-gray-800 flex items-center gap-2">
                                {user.firstName} {user.lastName}
                                {user.isVerified && (
                                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {user.isBanned ? (
                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-sm">Banned</span>
                          ) : user.isActive ? (
                            <span className="px-2 py-1 bg-green-100 text-green-600 rounded-full text-sm">Active</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">Inactive</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-1 rounded-full text-sm ${getSubscriptionBadge(user.subscription)}`}>
                            {user.subscription}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">{formatDate(user.createdAt)}</td>
                        <td className="py-4 px-6">
                          <span className={formatLastActive(user.lastActive) === 'Online' ? 'text-green-600' : 'text-gray-600'}>
                            {formatLastActive(user.lastActive)}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {user.reportCount > 0 ? (
                            <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-sm">
                              {user.reportCount}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowModal(true);
                            }}
                            className="px-3 py-1 text-pink-600 hover:bg-pink-50 rounded-lg"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t flex items-center justify-between">
                <p className="text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* User Management Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Manage User</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
                {selectedUser.firstName[0]}{selectedUser.lastName[0]}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800">{selectedUser.firstName} {selectedUser.lastName}</h4>
                <p className="text-gray-500">{selectedUser.email}</p>
                <p className="text-sm text-gray-400">ID: {selectedUser.id}</p>
              </div>
            </div>

            <div className="space-y-3">
              {!selectedUser.isVerified && (
                <button
                  onClick={() => handleAction(selectedUser.id, 'verify')}
                  className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  Verify User
                </button>
              )}

              {selectedUser.isBanned ? (
                <button
                  onClick={() => handleAction(selectedUser.id, 'unban')}
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                >
                  Unban User
                </button>
              ) : (
                <button
                  onClick={() => handleAction(selectedUser.id, 'ban')}
                  className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
                >
                  Ban User
                </button>
              )}

              <button
                onClick={() => handleAction(selectedUser.id, 'reset_password')}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Reset Password
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                    handleAction(selectedUser.id, 'delete');
                  }
                }}
                className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Delete User
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full mt-4 py-3 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
