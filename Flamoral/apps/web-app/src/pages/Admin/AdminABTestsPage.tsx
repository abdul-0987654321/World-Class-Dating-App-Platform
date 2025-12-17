import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  startDate?: string;
  endDate?: string;
  variants: {
    id: string;
    name: string;
    description: string;
    allocation: number;
    users: number;
    conversions: number;
  }[];
  metrics: {
    primaryMetric: string;
    secondaryMetrics: string[];
  };
  results?: {
    winner?: string;
    confidence: number;
    summary: string;
  };
  createdBy: string;
  createdAt: string;
}

export const AdminABTestsPage: React.FC = () => {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'running' | 'paused' | 'completed'>('all');
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTest, setNewTest] = useState({
    name: '',
    description: '',
    primaryMetric: '',
    variants: [
      { name: 'Control', description: '', allocation: 50 },
      { name: 'Variant A', description: '', allocation: 50 },
    ],
  });

  useEffect(() => {
    fetchTests();
  }, [filter]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/admin/ab-tests?status=${filter !== 'all' ? filter : ''}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setTests(data.data?.tests || []);
      } else {
        // Mock data
        setTests([
          {
            id: '1',
            name: 'New Onboarding Flow',
            description: 'Testing new step-by-step onboarding vs. single-page',
            status: 'running',
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            variants: [
              { id: 'v1', name: 'Control (Single Page)', description: '', allocation: 50, users: 2456, conversions: 1234 },
              { id: 'v2', name: 'Multi-Step', description: '', allocation: 50, users: 2543, conversions: 1589 },
            ],
            metrics: { primaryMetric: 'Profile Completion Rate', secondaryMetrics: ['Time to Complete', 'Drop-off Rate'] },
            createdBy: 'admin@flamoral.com',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: '2',
            name: 'Pricing Page Redesign',
            description: 'Testing new pricing layout and copy',
            status: 'completed',
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            variants: [
              { id: 'v1', name: 'Original', description: '', allocation: 50, users: 5234, conversions: 892 },
              { id: 'v2', name: 'New Design', description: '', allocation: 50, users: 5189, conversions: 1045 },
            ],
            metrics: { primaryMetric: 'Conversion Rate', secondaryMetrics: ['Revenue per User'] },
            results: { winner: 'v2', confidence: 95, summary: 'New design increased conversions by 18%' },
            createdBy: 'admin@flamoral.com',
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch A/B tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/admin/ab-tests', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newTest.name,
          description: newTest.description,
          variants: newTest.variants,
          metrics: {
            primaryMetric: newTest.primaryMetric,
            secondaryMetrics: [],
          },
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        fetchTests();
      }
    } catch (err) {
      console.error('Failed to create test:', err);
    }
  };

  const handleStartTest = async (testId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/admin/ab-tests/${testId}/start`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchTests();
    } catch (err) {
      console.error('Failed to start test:', err);
    }
  };

  const handlePauseTest = async (testId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch(`/api/admin/ab-tests/${testId}/pause`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      fetchTests();
    } catch (err) {
      console.error('Failed to pause test:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      running: 'bg-green-100 text-green-600',
      paused: 'bg-yellow-100 text-yellow-600',
      completed: 'bg-blue-100 text-blue-600',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">A/B Tests</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90"
          >
            Create Test
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-6 overflow-x-auto">
            {[
              { name: 'Overview', path: '/admin' },
              { name: 'Users', path: '/admin/users' },
              { name: 'Analytics', path: '/admin/analytics' },
              { name: 'A/B Tests', path: '/admin/ab-tests', active: true },
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
        {/* Filter */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {(['all', 'draft', 'running', 'paused', 'completed'] as const).map((f) => (
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

        {/* Tests List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <span className="text-4xl mb-4 block">🧪</span>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No A/B tests found</h3>
            <p className="text-gray-500 mb-4">Create your first test to start experimenting</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              Create Test
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedTest(test)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{test.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(test.status)}`}>
                        {test.status}
                      </span>
                    </div>
                    <p className="text-gray-600">{test.description}</p>
                    <p className="text-sm text-gray-400 mt-2">
                      Primary Metric: {test.metrics.primaryMetric}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {test.status === 'draft' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTest(test.id);
                        }}
                        className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        Start
                      </button>
                    )}
                    {test.status === 'running' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePauseTest(test.id);
                        }}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600"
                      >
                        Pause
                      </button>
                    )}
                  </div>
                </div>

                {/* Variants */}
                <div className="grid grid-cols-2 gap-4">
                  {test.variants.map((variant) => {
                    const conversionRate = variant.users > 0 ? (variant.conversions / variant.users * 100).toFixed(2) : 0;
                    return (
                      <div key={variant.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-800">{variant.name}</h4>
                          <span className="text-sm text-gray-500">{variant.allocation}%</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Users</p>
                            <p className="font-semibold">{variant.users.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Conversions</p>
                            <p className="font-semibold">{variant.conversions.toLocaleString()}</p>
                          </div>
                          <div className="col-span-2">
                            <p className="text-gray-500">Conversion Rate</p>
                            <p className="text-lg font-bold text-pink-600">{conversionRate}%</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {test.results && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800">Winner: {test.variants.find(v => v.id === test.results?.winner)?.name}</p>
                    <p className="text-sm text-green-700">{test.results.summary}</p>
                    <p className="text-sm text-green-600">Confidence: {test.results.confidence}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create A/B Test</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Name</label>
                <input
                  type="text"
                  value={newTest.name}
                  onChange={(e) => setNewTest({ ...newTest, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., New Button Color"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTest.description}
                  onChange={(e) => setNewTest({ ...newTest, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Describe what you're testing..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Metric</label>
                <input
                  type="text"
                  value={newTest.primaryMetric}
                  onChange={(e) => setNewTest({ ...newTest, primaryMetric: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  placeholder="e.g., Click-through Rate"
                />
              </div>
              <div className="flex gap-4 mt-6">
                <button
                  onClick={handleCreateTest}
                  disabled={!newTest.name || !newTest.primaryMetric}
                  className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                >
                  Create Test
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border rounded-lg text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminABTestsPage;
