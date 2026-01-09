import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserEmail: string;
  reason: string;
  category: 'harassment' | 'spam' | 'fake_profile' | 'inappropriate_content' | 'scam' | 'underage' | 'other';
  description: string;
  evidence?: string[];
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
}

export const AdminReportsPage: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<'pending' | 'investigating' | 'resolved' | 'dismissed' | 'all'>('pending');
  const [resolution, setResolution] = useState('');
  const [action, setAction] = useState<'warn' | 'suspend' | 'ban' | 'dismiss'>('warn');

  useEffect(() => {
    fetchReports();
  }, [filter]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const res = await fetch(`/api/admin/reports?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setReports(data.data?.reports || []);
      } else {
        // Mock data for demo
        setReports([
          {
            id: '1',
            reporterId: 'user1',
            reporterName: 'Alex Johnson',
            reportedUserId: 'user2',
            reportedUserName: 'Suspicious Mike',
            reportedUserEmail: 'mike@example.com',
            reason: 'Fake Profile',
            category: 'fake_profile',
            description: 'This profile seems to be using stock photos. The images look too professional and don\'t match the claimed location.',
            evidence: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'],
            status: 'pending',
            priority: 'high',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            reporterId: 'user3',
            reporterName: 'Sarah Williams',
            reportedUserId: 'user4',
            reportedUserName: 'John Doe',
            reportedUserEmail: 'john@example.com',
            reason: 'Harassment',
            category: 'harassment',
            description: 'Sent multiple aggressive messages after I said I wasn\'t interested. Very uncomfortable.',
            status: 'pending',
            priority: 'critical',
            createdAt: new Date(Date.now() - 1800000).toISOString(),
          },
          {
            id: '3',
            reporterId: 'user5',
            reporterName: 'Emma Davis',
            reportedUserId: 'user6',
            reportedUserName: 'Scam Account',
            reportedUserEmail: 'scam@example.com',
            reason: 'Scam/Fraud',
            category: 'scam',
            description: 'Asked for money, claimed to need help with medical bills. Typical romance scam pattern.',
            status: 'investigating',
            priority: 'critical',
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: '4',
            reporterId: 'user7',
            reporterName: 'Michael Brown',
            reportedUserId: 'user8',
            reportedUserName: 'Spam Bot',
            reportedUserEmail: 'bot@example.com',
            reason: 'Spam',
            category: 'spam',
            description: 'Sending promotional links and advertisements in messages.',
            status: 'pending',
            priority: 'medium',
            createdAt: new Date(Date.now() - 10800000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (reportId: string, action: string, resolution: string) => {
    try {
      const token = authTokenService.getToken();
      await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, resolution }),
      });

      // Update local state
      setReports(prev => prev.filter(r => r.id !== reportId));
      setSelectedReport(null);
      setResolution('');
    } catch (err) {
      console.error('Failed to resolve report:', err);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-orange-100 text-orange-700',
      critical: 'bg-red-100 text-red-700',
    };
    return badges[priority] || badges.low;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      harassment: '😠',
      spam: '📧',
      fake_profile: '🎭',
      inappropriate_content: '🚫',
      scam: '💸',
      underage: '⚠️',
      other: '❓',
    };
    return icons[category] || '❓';
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
            <h1 className="text-2xl font-bold text-gray-800">User Reports</h1>
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-medium">
              {reports.filter(r => r.status === 'pending').length} pending
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
              { name: 'Verifications', path: '/admin/verifications' },
              { name: 'Reports', path: '/admin/reports', active: true },
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
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">Pending</div>
            <div className="text-2xl font-bold text-orange-500">{reports.filter(r => r.status === 'pending').length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">Critical</div>
            <div className="text-2xl font-bold text-red-500">{reports.filter(r => r.priority === 'critical').length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">Investigating</div>
            <div className="text-2xl font-bold text-blue-500">{reports.filter(r => r.status === 'investigating').length}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">Resolved Today</div>
            <div className="text-2xl font-bold text-green-500">{reports.filter(r => r.status === 'resolved').length}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {(['pending', 'investigating', 'resolved', 'dismissed', 'all'] as const).map((f) => (
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

        {/* Reports List */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <span className="text-4xl mb-4 block">✅</span>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No reports to review</h3>
            <p className="text-gray-500">All reports have been handled</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer"
                onClick={() => setSelectedReport(report)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                      {getCategoryIcon(report.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-800">{report.reason}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityBadge(report.priority)}`}>
                          {report.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{report.reportedUserName}</span> reported by {report.reporterName}
                      </p>
                      <p className="text-sm text-gray-500 line-clamp-2">{report.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      report.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                      report.status === 'investigating' ? 'bg-blue-100 text-blue-600' :
                      report.status === 'resolved' ? 'bg-green-100 text-green-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {report.status}
                    </span>
                    <p className="text-sm text-gray-400 mt-2">{formatTime(report.createdAt)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-2xl">
                  {getCategoryIcon(selectedReport.category)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedReport.reason}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityBadge(selectedReport.priority)}`}>
                    {selectedReport.priority} priority
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Reported User */}
              <div className="mb-6 p-4 bg-red-50 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-2">Reported User</h4>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {selectedReport.reportedUserName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedReport.reportedUserName}</p>
                    <p className="text-sm text-gray-500">{selectedReport.reportedUserEmail}</p>
                  </div>
                </div>
              </div>

              {/* Reporter */}
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <h4 className="font-semibold text-gray-800 mb-2">Reported By</h4>
                <p className="text-gray-600">{selectedReport.reporterName}</p>
                <p className="text-sm text-gray-500">{formatTime(selectedReport.createdAt)}</p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Description</h4>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-xl">{selectedReport.description}</p>
              </div>

              {/* Evidence */}
              {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">Evidence</h4>
                  <div className="flex gap-2 flex-wrap">
                    {selectedReport.evidence.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Evidence ${index + 1}`}
                        className="w-24 h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Action Selection */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-3">Take Action</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'warn', label: 'Send Warning', desc: 'Warn the user', color: 'bg-yellow-100 border-yellow-300' },
                    { value: 'suspend', label: 'Suspend Account', desc: '7-day suspension', color: 'bg-orange-100 border-orange-300' },
                    { value: 'ban', label: 'Ban User', desc: 'Permanent ban', color: 'bg-red-100 border-red-300' },
                    { value: 'dismiss', label: 'Dismiss Report', desc: 'No action needed', color: 'bg-gray-100 border-gray-300' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAction(opt.value as any)}
                      className={`p-4 rounded-xl border-2 text-left transition ${
                        action === opt.value ? opt.color : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Notes */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">Resolution Notes</h4>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Add notes about how this report was handled..."
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500"
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (!resolution) {
                      alert('Please add resolution notes');
                      return;
                    }
                    handleResolve(selectedReport.id, action, resolution);
                  }}
                  className="flex-1 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition"
                >
                  Confirm Action
                </button>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="px-8 py-4 border rounded-xl text-gray-600 hover:bg-gray-50 transition"
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

export default AdminReportsPage;
