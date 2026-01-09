import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authTokenService } from '../../services/auth-token.service';

interface AnalyticsData {
  users: {
    total: number;
    active: number;
    new: number;
    churned: number;
    retention: number;
    byGender: { male: number; female: number; other: number };
    byAge: { [key: string]: number };
    bySubscription: { free: number; gold: number; platinum: number; diamond: number };
  };
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionDuration: number;
    swipesPerUser: number;
    messagesPerUser: number;
  };
  matching: {
    totalMatches: number;
    matchRate: number;
    conversationRate: number;
    avgMatchesToConvo: number;
  };
  revenue: {
    mrr: number;
    arr: number;
    arpu: number;
    ltv: number;
    conversionRate: number;
    churnRate: number;
  };
}

export const AdminAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/analytics?range=${timeRange}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const result = await res.json();
        setData(result.data);
      } else {
        // Mock data for demo
        setData({
          users: {
            total: 125847,
            active: 45231,
            new: 8923,
            churned: 1245,
            retention: 78.5,
            byGender: { male: 62000, female: 58000, other: 5847 },
            byAge: { '18-24': 35000, '25-34': 52000, '35-44': 25000, '45-54': 10000, '55+': 3847 },
            bySubscription: { free: 97391, gold: 18456, platinum: 7500, diamond: 2500 },
          },
          engagement: {
            dailyActiveUsers: 28456,
            weeklyActiveUsers: 45231,
            monthlyActiveUsers: 89234,
            avgSessionDuration: 12.5,
            swipesPerUser: 45.2,
            messagesPerUser: 8.7,
          },
          matching: {
            totalMatches: 892341,
            matchRate: 12.5,
            conversationRate: 68.3,
            avgMatchesToConvo: 3.2,
          },
          revenue: {
            mrr: 425000,
            arr: 5100000,
            arpu: 15.2,
            ltv: 182.4,
            conversionRate: 22.6,
            churnRate: 4.2,
          },
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
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
          <h1 className="text-2xl font-bold text-gray-800">Analytics</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
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
              { name: 'Verifications', path: '/admin/verifications' },
              { name: 'Reports', path: '/admin/reports' },
              { name: 'Analytics', path: '/admin/analytics', active: true },
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
        {/* Revenue Metrics */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Revenue Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">MRR</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(data?.revenue.mrr || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">ARR</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(data?.revenue.arr || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">ARPU</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(data?.revenue.arpu || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">LTV</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(data?.revenue.ltv || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-600">{data?.revenue.conversionRate}%</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Churn Rate</p>
              <p className="text-2xl font-bold text-red-600">{data?.revenue.churnRate}%</p>
            </div>
          </div>
        </section>

        {/* User Metrics */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">User Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Users</p>
              <p className="text-2xl font-bold text-gray-800">{formatNumber(data?.users.total || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Active Users</p>
              <p className="text-2xl font-bold text-blue-600">{formatNumber(data?.users.active || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">New Users</p>
              <p className="text-2xl font-bold text-green-600">+{formatNumber(data?.users.new || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Churned</p>
              <p className="text-2xl font-bold text-red-600">-{formatNumber(data?.users.churned || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Retention</p>
              <p className="text-2xl font-bold text-purple-600">{data?.users.retention}%</p>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Gender Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Gender Distribution</h3>
            <div className="space-y-4">
              {Object.entries(data?.users.byGender || {}).map(([gender, count]) => {
                const total = Object.values(data?.users.byGender || {}).reduce((a, b) => a + b, 0);
                const percentage = ((count / total) * 100).toFixed(1);
                return (
                  <div key={gender}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{gender}</span>
                      <span>{formatNumber(count)} ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          gender === 'male' ? 'bg-blue-500' :
                          gender === 'female' ? 'bg-pink-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Age Distribution</h3>
            <div className="space-y-4">
              {Object.entries(data?.users.byAge || {}).map(([age, count]) => {
                const total = Object.values(data?.users.byAge || {}).reduce((a, b) => a + b, 0);
                const percentage = ((count / total) * 100).toFixed(1);
                return (
                  <div key={age}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{age}</span>
                      <span>{formatNumber(count)} ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Subscription Breakdown */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Subscription Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(data?.users.bySubscription || {}).map(([tier, count]) => {
                const total = Object.values(data?.users.bySubscription || {}).reduce((a, b) => a + b, 0);
                const percentage = ((count / total) * 100).toFixed(1);
                const colors: Record<string, string> = {
                  free: 'bg-gray-400',
                  gold: 'bg-yellow-500',
                  platinum: 'bg-blue-500',
                  diamond: 'bg-purple-500',
                };
                return (
                  <div key={tier}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{tier}</span>
                      <span>{formatNumber(count)} ({percentage}%)</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[tier]}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Engagement</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">DAU</p>
                <p className="text-xl font-bold text-gray-800">{formatNumber(data?.engagement.dailyActiveUsers || 0)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">WAU</p>
                <p className="text-xl font-bold text-gray-800">{formatNumber(data?.engagement.weeklyActiveUsers || 0)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">MAU</p>
                <p className="text-xl font-bold text-gray-800">{formatNumber(data?.engagement.monthlyActiveUsers || 0)}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Avg Session</p>
                <p className="text-xl font-bold text-gray-800">{data?.engagement.avgSessionDuration} min</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Swipes/User</p>
                <p className="text-xl font-bold text-gray-800">{data?.engagement.swipesPerUser}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Messages/User</p>
                <p className="text-xl font-bold text-gray-800">{data?.engagement.messagesPerUser}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Matching Metrics */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Matching Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Total Matches</p>
              <p className="text-2xl font-bold text-pink-600">{formatNumber(data?.matching.totalMatches || 0)}</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Match Rate</p>
              <p className="text-2xl font-bold text-gray-800">{data?.matching.matchRate}%</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Conversation Rate</p>
              <p className="text-2xl font-bold text-green-600">{data?.matching.conversationRate}%</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <p className="text-sm text-gray-500 mb-1">Avg Matches to Convo</p>
              <p className="text-2xl font-bold text-gray-800">{data?.matching.avgMatchesToConvo}</p>
            </div>
          </div>
        </section>

        {/* Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">User Growth Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <span className="text-4xl mb-2 block">📈</span>
              <p className="text-gray-500">User growth chart visualization</p>
              <p className="text-sm text-gray-400">Integrate with Chart.js or Recharts</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalyticsPage;
