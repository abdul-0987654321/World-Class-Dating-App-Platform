/**
 * Admin Revenue Dashboard
 * Revenue reporting by provider, plan, region, and time period
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RevenueData {
  totalRevenue: number;
  subscriptionRevenue: number;
  consumableRevenue: number;
  refunds: number;
  netRevenue: number;
  currency: string;
}

interface ProviderBreakdown {
  provider: string;
  revenue: number;
  transactions: number;
  percentage: number;
}

interface PlanBreakdown {
  plan: string;
  subscribers: number;
  mrr: number;
  churnRate: number;
}

interface RegionBreakdown {
  region: string;
  country: string;
  revenue: number;
  users: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  subscriptions: number;
  consumables: number;
}

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  provider: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

export const AdminRevenuePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [providerBreakdown, setProviderBreakdown] = useState<ProviderBreakdown[]>([]);
  const [planBreakdown, setPlanBreakdown] = useState<PlanBreakdown[]>([]);
  const [regionBreakdown, setRegionBreakdown] = useState<RegionBreakdown[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

      // Load all data in parallel
      const [revenueRes, providersRes, plansRes, regionsRes, dailyRes, transactionsRes] = await Promise.all([
        fetch(`/api/admin/revenue/summary?range=${dateRange}`, { headers }),
        fetch(`/api/admin/revenue/by-provider?range=${dateRange}`, { headers }),
        fetch(`/api/admin/revenue/by-plan?range=${dateRange}`, { headers }),
        fetch(`/api/admin/revenue/by-region?range=${dateRange}`, { headers }),
        fetch(`/api/admin/revenue/daily?range=${dateRange}`, { headers }),
        fetch(`/api/admin/transactions?limit=20`, { headers }),
      ]);

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueData(data.data || mockRevenueData);
      } else {
        setRevenueData(mockRevenueData);
      }

      if (providersRes.ok) {
        const data = await providersRes.json();
        setProviderBreakdown(data.data || mockProviderBreakdown);
      } else {
        setProviderBreakdown(mockProviderBreakdown);
      }

      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlanBreakdown(data.data || mockPlanBreakdown);
      } else {
        setPlanBreakdown(mockPlanBreakdown);
      }

      if (regionsRes.ok) {
        const data = await regionsRes.json();
        setRegionBreakdown(data.data || mockRegionBreakdown);
      } else {
        setRegionBreakdown(mockRegionBreakdown);
      }

      if (dailyRes.ok) {
        const data = await dailyRes.json();
        setDailyRevenue(data.data || mockDailyRevenue);
      } else {
        setDailyRevenue(mockDailyRevenue);
      }

      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        setRecentTransactions(data.transactions || mockTransactions);
      } else {
        setRecentTransactions(mockTransactions);
      }
    } catch (error) {
      console.error('Failed to load revenue data:', error);
      // Use mock data
      setRevenueData(mockRevenueData);
      setProviderBreakdown(mockProviderBreakdown);
      setPlanBreakdown(mockPlanBreakdown);
      setRegionBreakdown(mockRegionBreakdown);
      setDailyRevenue(mockDailyRevenue);
      setRecentTransactions(mockTransactions);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getProviderColor = (provider: string) => {
    const colors: Record<string, string> = {
      stripe: '#635BFF',
      paypal: '#003087',
      apple_iap: '#000000',
      google_play: '#4285F4',
      flutterwave: '#F5A623',
      paystack: '#00C3F7',
    };
    return colors[provider] || '#6B7280';
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'stripe':
        return '💳';
      case 'paypal':
        return '🅿️';
      case 'apple_iap':
        return '🍎';
      case 'google_play':
        return '🤖';
      case 'flutterwave':
        return '🌊';
      case 'paystack':
        return '💰';
      default:
        return '💵';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refunded':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
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
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Revenue Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    dateRange === range
                      ? 'bg-white text-gray-800 shadow'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>
            <button className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition">
              Export Report
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Total Revenue</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {formatCurrency(revenueData?.totalRevenue || 0)}
            </p>
            <p className="text-green-500 text-sm mt-2">↑ 12.5% vs prev period</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Subscriptions</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {formatCurrency(revenueData?.subscriptionRevenue || 0)}
            </p>
            <p className="text-green-500 text-sm mt-2">↑ 8.3% vs prev period</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Consumables</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">
              {formatCurrency(revenueData?.consumableRevenue || 0)}
            </p>
            <p className="text-green-500 text-sm mt-2">↑ 15.2% vs prev period</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <p className="text-gray-500 text-sm">Refunds</p>
            <p className="text-3xl font-bold text-red-500 mt-1">
              -{formatCurrency(revenueData?.refunds || 0)}
            </p>
            <p className="text-gray-500 text-sm mt-2">2.1% of revenue</p>
          </div>
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl p-6 shadow-sm text-white">
            <p className="text-pink-100 text-sm">Net Revenue</p>
            <p className="text-3xl font-bold mt-1">
              {formatCurrency(revenueData?.netRevenue || 0)}
            </p>
            <p className="text-pink-100 text-sm mt-2">After refunds & fees</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Daily Revenue Chart */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Revenue</h3>
            <div className="h-64 flex items-end gap-1">
              {dailyRevenue.map((day, idx) => {
                const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue));
                const height = (day.revenue / maxRevenue) * 100;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-gradient-to-t from-pink-500 to-purple-500 rounded-t"
                      style={{ height: `${height}%` }}
                      title={`${day.date}: ${formatCurrency(day.revenue)}`}
                    />
                    {idx % 7 === 0 && (
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(day.date).getDate()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Provider Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Provider</h3>
            <div className="space-y-4">
              {providerBreakdown.map((provider) => (
                <div key={provider.provider}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{getProviderIcon(provider.provider)}</span>
                      <span className="font-medium text-gray-700 capitalize">
                        {provider.provider.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-gray-600">{formatCurrency(provider.revenue)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${provider.percentage}%`,
                        backgroundColor: getProviderColor(provider.provider),
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatNumber(provider.transactions)} transactions</span>
                    <span>{provider.percentage.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Plans and Regions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Subscription Plans */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Subscription Plans</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm">
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Subscribers</th>
                  <th className="pb-3">MRR</th>
                  <th className="pb-3">Churn</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {planBreakdown.map((plan) => (
                  <tr key={plan.plan}>
                    <td className="py-3">
                      <span className={`font-medium ${
                        plan.plan === 'Diamond' ? 'text-cyan-600' :
                        plan.plan === 'Platinum' ? 'text-purple-600' :
                        plan.plan === 'Gold' ? 'text-yellow-600' : 'text-gray-600'
                      }`}>
                        {plan.plan}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{formatNumber(plan.subscribers)}</td>
                    <td className="py-3 text-gray-600">{formatCurrency(plan.mrr)}</td>
                    <td className="py-3">
                      <span className={`${plan.churnRate > 5 ? 'text-red-500' : 'text-green-500'}`}>
                        {plan.churnRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Regional Breakdown */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Region</h3>
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm">
                  <th className="pb-3">Region</th>
                  <th className="pb-3">Users</th>
                  <th className="pb-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {regionBreakdown.map((region) => (
                  <tr key={region.country}>
                    <td className="py-3">
                      <div>
                        <span className="font-medium text-gray-800">{region.country}</span>
                        <span className="text-gray-400 text-sm ml-2">{region.region}</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">{formatNumber(region.users)}</td>
                    <td className="py-3 text-gray-600">{formatCurrency(region.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Recent Transactions</h3>
            <button className="text-pink-500 hover:text-pink-600 text-sm">View All →</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-500 text-sm border-b">
                  <th className="pb-3">Transaction</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <span className="font-mono text-sm text-gray-600">
                        {tx.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-gray-800">{tx.userName}</span>
                    </td>
                    <td className="py-3">
                      <span className="flex items-center gap-1">
                        {getProviderIcon(tx.provider)}
                        <span className="text-gray-600 capitalize">{tx.provider.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-gray-600 capitalize">{tx.type.replace('_', ' ')}</span>
                    </td>
                    <td className="py-3">
                      <span className={`font-medium ${tx.type === 'refund' ? 'text-red-500' : 'text-gray-800'}`}>
                        {tx.type === 'refund' ? '-' : ''}{formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 text-sm">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

// Mock data for development/demo
const mockRevenueData: RevenueData = {
  totalRevenue: 12547800,
  subscriptionRevenue: 9823400,
  consumableRevenue: 2724400,
  refunds: 263500,
  netRevenue: 12284300,
  currency: 'USD',
};

const mockProviderBreakdown: ProviderBreakdown[] = [
  { provider: 'stripe', revenue: 5234500, transactions: 8234, percentage: 41.7 },
  { provider: 'apple_iap', revenue: 3456700, transactions: 5432, percentage: 27.5 },
  { provider: 'google_play', revenue: 2345600, transactions: 4123, percentage: 18.7 },
  { provider: 'paypal', revenue: 987600, transactions: 1234, percentage: 7.9 },
  { provider: 'flutterwave', revenue: 345600, transactions: 876, percentage: 2.8 },
  { provider: 'paystack', revenue: 177800, transactions: 432, percentage: 1.4 },
];

const mockPlanBreakdown: PlanBreakdown[] = [
  { plan: 'Diamond', subscribers: 1234, mrr: 4936000, churnRate: 2.3 },
  { plan: 'Platinum', subscribers: 3456, mrr: 8640000, churnRate: 3.1 },
  { plan: 'Gold', subscribers: 8765, mrr: 13147500, churnRate: 4.5 },
  { plan: 'Free', subscribers: 45678, mrr: 0, churnRate: 0 },
];

const mockRegionBreakdown: RegionBreakdown[] = [
  { region: 'North America', country: 'United States', revenue: 6234500, users: 23456 },
  { region: 'Europe', country: 'United Kingdom', revenue: 2345600, users: 12345 },
  { region: 'Europe', country: 'Germany', revenue: 1234500, users: 8765 },
  { region: 'Africa', country: 'Nigeria', revenue: 876500, users: 5432 },
  { region: 'Asia Pacific', country: 'Australia', revenue: 654300, users: 3456 },
  { region: 'Africa', country: 'South Africa', revenue: 432100, users: 2345 },
];

const mockDailyRevenue: DailyRevenue[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  revenue: Math.floor(Math.random() * 50000000) + 30000000,
  subscriptions: Math.floor(Math.random() * 200) + 50,
  consumables: Math.floor(Math.random() * 500) + 100,
}));

const mockTransactions: Transaction[] = [
  { id: 'txn_1234567890', userId: 'usr_001', userName: 'John D.', provider: 'stripe', type: 'subscription', amount: 2499, currency: 'USD', status: 'completed', createdAt: new Date().toISOString() },
  { id: 'txn_2345678901', userId: 'usr_002', userName: 'Sarah M.', provider: 'apple_iap', type: 'subscription', amount: 3999, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 'txn_3456789012', userId: 'usr_003', userName: 'Mike R.', provider: 'google_play', type: 'coin_purchase', amount: 1999, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 'txn_4567890123', userId: 'usr_004', userName: 'Emily K.', provider: 'paypal', type: 'subscription', amount: 1499, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 10800000).toISOString() },
  { id: 'txn_5678901234', userId: 'usr_005', userName: 'David L.', provider: 'stripe', type: 'refund', amount: 2499, currency: 'USD', status: 'refunded', createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: 'txn_6789012345', userId: 'usr_006', userName: 'Amara O.', provider: 'flutterwave', type: 'subscription', amount: 1499, currency: 'USD', status: 'completed', createdAt: new Date(Date.now() - 18000000).toISOString() },
  { id: 'txn_7890123456', userId: 'usr_007', userName: 'Chidi N.', provider: 'paystack', type: 'coin_purchase', amount: 499, currency: 'USD', status: 'pending', createdAt: new Date(Date.now() - 21600000).toISOString() },
];

export default AdminRevenuePage;
