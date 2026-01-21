import React from 'react';
import {
  FaFlag,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaShieldAlt,
} from 'react-icons/fa';
import { useUserReports } from '../../hooks/useAdminUsers';

interface UserReportsViewProps {
  userId: string;
}

export const UserReportsView: React.FC<UserReportsViewProps> = ({ userId }) => {
  const { data: reports, isLoading, error } = useUserReports(userId);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
      pending: {
        icon: <FaClock />,
        className: 'bg-yellow-100 text-yellow-700',
        label: 'Pending',
      },
      investigating: {
        icon: <FaExclamationTriangle />,
        className: 'bg-orange-100 text-orange-700',
        label: 'Investigating',
      },
      resolved: {
        icon: <FaCheckCircle />,
        className: 'bg-green-100 text-green-700',
        label: 'Resolved',
      },
      dismissed: {
        icon: <FaTimesCircle />,
        className: 'bg-gray-100 text-gray-700',
        label: 'Dismissed',
      },
      action_taken: {
        icon: <FaShieldAlt />,
        className: 'bg-blue-100 text-blue-700',
        label: 'Action Taken',
      },
    };

    const badge = badges[status] || badges.pending;

    return (
      <span
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
      >
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      harassment: 'bg-red-100 text-red-700',
      spam: 'bg-orange-100 text-orange-700',
      inappropriate_content: 'bg-purple-100 text-purple-700',
      fake_profile: 'bg-pink-100 text-pink-700',
      scam: 'bg-red-100 text-red-700',
      underage: 'bg-red-100 text-red-700',
      impersonation: 'bg-orange-100 text-orange-700',
      hate_speech: 'bg-red-100 text-red-700',
      violence: 'bg-red-100 text-red-700',
      other: 'bg-gray-100 text-gray-700',
    };

    const color = colors[category] || colors.other;
    const label = category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{label}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading reports. Please try again.</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="text-center py-12">
        <FaFlag className="mx-auto text-6xl text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No reports found</p>
        <p className="text-gray-400 text-sm mt-2">This user has not been reported</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">User Reports ({reports.length})</h3>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <FaFlag className="text-red-500" />
          <span>{reports.filter((r) => r.status === 'pending').length} pending</span>
        </div>
      </div>

      <div className="space-y-3">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                {report.reporter.profilePhoto ? (
                  <img
                    src={report.reporter.profilePhoto}
                    alt={`${report.reporter.firstName} ${report.reporter.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-semibold text-sm">
                    {report.reporter.firstName[0]}
                    {report.reporter.lastName[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {report.reporter.firstName} {report.reporter.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Reported {new Date(report.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {getStatusBadge(report.status)}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Category:</span>
                {getCategoryBadge(report.category)}
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-1">Description:</p>
                <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded">{report.description}</p>
              </div>

              {report.actionTaken && (
                <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <div className="flex items-start gap-2">
                    <FaShieldAlt className="text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Action Taken</p>
                      <p className="text-sm text-blue-700 mt-1">{report.actionTaken}</p>
                      {report.resolvedAt && (
                        <p className="text-xs text-blue-600 mt-1">
                          Resolved on {new Date(report.resolvedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Report ID: {report.id}</span>
              <span>
                {report.status === 'pending'
                  ? 'Awaiting review'
                  : report.status === 'investigating'
                    ? 'Under investigation'
                    : `Closed: ${report.status}`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Report Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            <p className="text-xs text-gray-600">Total Reports</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {reports.filter((r) => r.status === 'pending').length}
            </p>
            <p className="text-xs text-gray-600">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {reports.filter((r) => r.status === 'resolved' || r.status === 'action_taken').length}
            </p>
            <p className="text-xs text-gray-600">Resolved</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">
              {reports.filter((r) => r.status === 'dismissed').length}
            </p>
            <p className="text-xs text-gray-600">Dismissed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserReportsView;
