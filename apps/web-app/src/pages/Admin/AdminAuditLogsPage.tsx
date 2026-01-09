import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
}

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    adminId: '',
    startDate: '',
    endDate: '',
    page: 1,
  });
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [filters.page, filters.action, filters.resource]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = authTokenService.getToken();
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.resource) params.append('resource', filters.resource);
      if (filters.adminId) params.append('adminId', filters.adminId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', filters.page.toString());

      const res = await fetch(`/api/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(data.data?.logs || []);
        setTotalPages(Math.ceil((data.data?.total || 0) / (data.data?.limit || 50)));
      } else {
        // Mock data
        setLogs([
          {
            id: '1',
            adminId: 'admin1',
            adminEmail: 'admin@flamoral.com',
            action: 'ban_user',
            resource: 'user',
            resourceId: 'user123',
            changes: { reason: 'Inappropriate behavior', duration: 604800 },
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '2',
            adminId: 'admin1',
            adminEmail: 'admin@flamoral.com',
            action: 'approve_content',
            resource: 'photo',
            resourceId: 'photo456',
            changes: null,
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date(Date.now() - 7200000).toISOString(),
          },
          {
            id: '3',
            adminId: 'mod1',
            adminEmail: 'moderator@flamoral.com',
            action: 'resolve_report',
            resource: 'report',
            resourceId: 'report789',
            changes: { action: 'warn', resolution: 'User warned for minor violation' },
            ipAddress: '192.168.1.2',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date(Date.now() - 10800000).toISOString(),
          },
          {
            id: '4',
            adminId: 'admin1',
            adminEmail: 'admin@flamoral.com',
            action: 'update_settings',
            resource: 'settings',
            changes: { swipesPerDay: { free: 50, gold: 100 } },
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date(Date.now() - 14400000).toISOString(),
          },
          {
            id: '5',
            adminId: 'support1',
            adminEmail: 'support@flamoral.com',
            action: 'close_ticket',
            resource: 'ticket',
            resourceId: 'ticket101',
            changes: { status: 'closed', resolution: 'Issue resolved' },
            ipAddress: '192.168.1.3',
            userAgent: 'Mozilla/5.0...',
            timestamp: new Date(Date.now() - 18000000).toISOString(),
          },
        ]);
        setTotalPages(5);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    // Export logs to CSV
    const csv = [
      ['Timestamp', 'Admin', 'Action', 'Resource', 'Resource ID', 'IP Address'].join(','),
      ...logs.map(log =>
        [
          log.timestamp,
          log.adminEmail,
          log.action,
          log.resource,
          log.resourceId || '',
          log.ipAddress,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString()}.csv`;
    a.click();
  };

  const getActionColor = (action: string) => {
    if (action.includes('delete') || action.includes('ban')) return 'text-red-600 bg-red-50';
    if (action.includes('create') || action.includes('approve')) return 'text-green-600 bg-green-50';
    if (action.includes('update') || action.includes('edit')) return 'text-blue-600 bg-blue-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
          >
            Export CSV
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
              { name: 'Audit Logs', path: '/admin/audit-logs', active: true },
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
        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-800 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Actions</option>
                <option value="ban_user">Ban User</option>
                <option value="unban_user">Unban User</option>
                <option value="delete_user">Delete User</option>
                <option value="approve_content">Approve Content</option>
                <option value="remove_content">Remove Content</option>
                <option value="resolve_report">Resolve Report</option>
                <option value="update_settings">Update Settings</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Resource</label>
              <select
                value={filters.resource}
                onChange={(e) => setFilters({ ...filters, resource: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              >
                <option value="">All Resources</option>
                <option value="user">User</option>
                <option value="photo">Photo</option>
                <option value="report">Report</option>
                <option value="settings">Settings</option>
                <option value="ticket">Ticket</option>
                <option value="ab_test">A/B Test</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value, page: 1 })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
          <button
            onClick={fetchLogs}
            className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Apply Filters
          </button>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-gray-500">Timestamp</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-500">Admin</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-500">Action</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-500">Resource</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-500">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="py-4 px-6 text-sm text-gray-600">
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">
                          <p className="font-medium text-gray-800">{log.adminEmail}</p>
                          <p className="text-gray-500">{log.ipAddress}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getActionColor(log.action)}`}>
                          {formatAction(log.action)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm">
                          <p className="font-medium text-gray-800 capitalize">{log.resource}</p>
                          {log.resourceId && (
                            <p className="text-gray-500 font-mono text-xs">{log.resourceId.substring(0, 8)}...</p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <button className="text-pink-600 hover:text-pink-700 text-sm">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <p className="text-gray-500">Page {filters.page} of {totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                  disabled={filters.page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: Math.min(totalPages, filters.page + 1) })}
                  disabled={filters.page === totalPages}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">Audit Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Admin</p>
                  <p className="font-medium text-gray-800">{selectedLog.adminEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Timestamp</p>
                  <p className="font-medium text-gray-800">{formatTime(selectedLog.timestamp)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Action</p>
                  <p className="font-medium text-gray-800">{formatAction(selectedLog.action)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource</p>
                  <p className="font-medium text-gray-800 capitalize">{selectedLog.resource}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Resource ID</p>
                  <p className="font-medium text-gray-800 font-mono text-sm">{selectedLog.resourceId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IP Address</p>
                  <p className="font-medium text-gray-800">{selectedLog.ipAddress}</p>
                </div>
              </div>

              {selectedLog.changes && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Changes</p>
                  <pre className="p-4 bg-gray-50 rounded-lg overflow-auto text-sm">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-2">User Agent</p>
                <p className="text-sm text-gray-800 font-mono bg-gray-50 p-3 rounded-lg break-all">
                  {selectedLog.userAgent}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLogsPage;
