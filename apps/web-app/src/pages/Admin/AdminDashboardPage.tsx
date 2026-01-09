import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  totalMatches: number;
  matchesToday: number;
  totalMessages: number;
  messagesToday: number;
  pendingVerifications: number;
  pendingReports: number;
  revenue: {
    today: number;
    month: number;
    total: number;
  };
}

interface RecentActivity {
  id: string;
  type: 'signup' | 'match' | 'report' | 'subscription' | 'verification';
  description: string;
  timestamp: string;
  userId?: string;
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/dashboard?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setStats(data.data?.stats);
        setActivities(data.data?.activities || []);
      } else {
        // Mock data for demo
        setStats({
          totalUsers: 125847,
          activeUsers: 45231,
          newUsersToday: 892,
          premiumUsers: 28456,
          totalMatches: 892341,
          matchesToday: 4521,
          totalMessages: 5892341,
          messagesToday: 89234,
          pendingVerifications: 156,
          pendingReports: 23,
          revenue: {
            today: 15892,
            month: 425000,
            total: 2850000,
          },
        });
        setActivities([
          { id: '1', type: 'signup', description: 'New user registered: alex_demo', timestamp: new Date().toISOString() },
          { id: '2', type: 'subscription', description: 'Premium subscription: Gold Plan', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
          { id: '3', type: 'report', description: 'User report submitted: Inappropriate content', timestamp: new Date(Date.now() - 15 * 60000).toISOString() },
          { id: '4', type: 'match', description: 'New match created between users', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
          { id: '5', type: 'verification', description: 'Photo verification submitted', timestamp: new Date(Date.now() - 45 * 60000).toISOString() },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'signup': return { icon: '👤', color: 'bg-blue-100 text-blue-600' };
      case 'match': return { icon: '💕', color: 'bg-pink-100 text-pink-600' };
      case 'report': return { icon: '⚠️', color: 'bg-red-100 text-red-600' };
      case 'subscription': return { icon: '💎', color: 'bg-purple-100 text-purple-600' };
      case 'verification': return { icon: '✓', color: 'bg-green-100 text-green-600' };
    }
  };

  const formatTime = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
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
      {/* Admin Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
            <span className="bg-flame-50 text-flame-500 px-3 py-1 rounded-full text-sm font-medium">
              Flamoral
            </span>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={() => navigate('/discover')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Exit Admin
            </button>
          </div>
        </div>
      </header>

      {/* Admin Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { name: 'Overview', path: '/admin', active: true },
              { name: 'Users', path: '/admin/users' },
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
        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Users</span>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatNumber(stats?.totalUsers || 0)}</div>
            <div className="text-sm text-green-600 mt-1">+{stats?.newUsersToday || 0} today</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Active Users</span>
              <span className="text-2xl">🟢</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatNumber(stats?.activeUsers || 0)}</div>
            <div className="text-sm text-gray-500 mt-1">{((stats?.activeUsers || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% of total</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Premium Users</span>
              <span className="text-2xl">💎</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatNumber(stats?.premiumUsers || 0)}</div>
            <div className="text-sm text-purple-600 mt-1">{((stats?.premiumUsers || 0) / (stats?.totalUsers || 1) * 100).toFixed(1)}% conversion</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Today's Revenue</span>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatCurrency(stats?.revenue.today || 0)}</div>
            <div className="text-sm text-gray-500 mt-1">MTD: {formatCurrency(stats?.revenue.month || 0)}</div>
          </div>
        </div>

        {/* Second Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Matches</span>
              <span className="text-2xl">💕</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatNumber(stats?.totalMatches || 0)}</div>
            <div className="text-sm text-pink-600 mt-1">+{formatNumber(stats?.matchesToday || 0)} today</div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Total Messages</span>
              <span className="text-2xl">💬</span>
            </div>
            <div className="text-3xl font-bold text-gray-800">{formatNumber(stats?.totalMessages || 0)}</div>
            <div className="text-sm text-blue-600 mt-1">+{formatNumber(stats?.messagesToday || 0)} today</div>
          </div>

          <Link to="/admin/verifications" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Pending Verifications</span>
              <span className="text-2xl">📸</span>
            </div>
            <div className="text-3xl font-bold text-orange-500">{stats?.pendingVerifications || 0}</div>
            <div className="text-sm text-orange-600 mt-1">Requires attention</div>
          </Link>

          <Link to="/admin/reports" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">Pending Reports</span>
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="text-3xl font-bold text-red-500">{stats?.pendingReports || 0}</div>
            <div className="text-sm text-red-600 mt-1">Requires review</div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {activities.map((activity) => {
                const { icon, color } = getActivityIcon(activity.type);
                return (
                  <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-gray-50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                      <span>{icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800">{activity.description}</p>
                      <p className="text-sm text-gray-500">{formatTime(activity.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-800">Quick Actions</h2>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <Link
                to="/admin/verifications"
                className="p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition"
              >
                <span className="text-2xl mb-2 block">📸</span>
                <h3 className="font-semibold text-gray-800">Review Verifications</h3>
                <p className="text-sm text-gray-500">{stats?.pendingVerifications} pending</p>
              </Link>

              <Link
                to="/admin/reports"
                className="p-4 bg-red-50 rounded-xl hover:bg-red-100 transition"
              >
                <span className="text-2xl mb-2 block">🚨</span>
                <h3 className="font-semibold text-gray-800">Handle Reports</h3>
                <p className="text-sm text-gray-500">{stats?.pendingReports} to review</p>
              </Link>

              <Link
                to="/admin/users"
                className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition"
              >
                <span className="text-2xl mb-2 block">👥</span>
                <h3 className="font-semibold text-gray-800">User Management</h3>
                <p className="text-sm text-gray-500">Search & manage users</p>
              </Link>

              <Link
                to="/admin/analytics"
                className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition"
              >
                <span className="text-2xl mb-2 block">📊</span>
                <h3 className="font-semibold text-gray-800">View Analytics</h3>
                <p className="text-sm text-gray-500">Detailed metrics</p>
              </Link>

              <Link
                to="/admin/moderation"
                className="p-4 bg-green-50 rounded-xl hover:bg-green-100 transition"
              >
                <span className="text-2xl mb-2 block">🛡️</span>
                <h3 className="font-semibold text-gray-800">Content Moderation</h3>
                <p className="text-sm text-gray-500">Review flagged content</p>
              </Link>

              <Link
                to="/admin/settings"
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
              >
                <span className="text-2xl mb-2 block">⚙️</span>
                <h3 className="font-semibold text-gray-800">System Settings</h3>
                <p className="text-sm text-gray-500">Configure platform</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Revenue Chart Placeholder */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue Overview</h2>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <span className="text-4xl mb-2 block">📈</span>
              <p className="text-gray-500">Revenue chart visualization</p>
              <p className="text-sm text-gray-400">Integrate with Chart.js or Recharts</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Today</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(stats?.revenue.today || 0)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(stats?.revenue.month || 0)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">All Time</p>
              <p className="text-xl font-bold text-gray-800">{formatCurrency(stats?.revenue.total || 0)}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboardPage;
