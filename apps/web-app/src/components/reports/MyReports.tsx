import React, { useEffect, useState } from 'react';
import { reportService, Report, ReportStatus } from '../../services/report.service';

export const MyReports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | undefined>(undefined);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 10;

  useEffect(() => {
    fetchReports();
  }, [statusFilter]);

  const fetchReports = async (loadMore = false) => {
    try {
      setLoading(true);
      const currentOffset = loadMore ? offset : 0;
      const data = await reportService.getMyReports({
        limit,
        offset: currentOffset,
        status: statusFilter,
      });

      if (loadMore) {
        setReports([...reports, ...data.reports]);
      } else {
        setReports(data.reports);
      }

      setTotal(data.total);
      setHasMore(data.reports.length + currentOffset < data.total);

      if (loadMore) {
        setOffset(currentOffset + limit);
      } else {
        setOffset(0);
      }
    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchReports(true);
  };

  const getStatusBadge = (status: ReportStatus) => {
    const statusConfig = {
      pending: { color: '#f59e0b', label: 'Pending' },
      investigating: { color: '#3b82f6', label: 'Investigating' },
      resolved: { color: '#10b981', label: 'Resolved' },
      dismissed: { color: '#6b7280', label: 'Dismissed' },
      action_taken: { color: '#8b5cf6', label: 'Action Taken' },
    };

    const config = statusConfig[status];
    return (
      <span
        className="status-badge"
        style={{ '--status-color': config.color } as React.CSSProperties}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (date: Date | string): string => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatReportType = (type: string): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && reports.length === 0) {
    return (
      <div className="my-reports">
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Loading reports...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-reports">
      <div className="reports-header">
        <h2>My Reports</h2>
        <div className="filter-section">
          <label>Filter by status:</label>
          <select
            value={statusFilter || ''}
            onChange={(e) => setStatusFilter((e.target.value as ReportStatus) || undefined)}
            className="status-filter"
          >
            <option value="">All Reports</option>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
            <option value="action_taken">Action Taken</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {reports.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Reports Found</h3>
          <p>
            {statusFilter
              ? `You don't have any ${statusFilter} reports.`
              : "You haven't submitted any reports yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="reports-list">
            {reports.map((report) => {
              const user = report.reportedUser;
              const photoUrl = user?.profilePhoto || user?.photoUrl;
              const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Unknown';
              const lastName = user?.lastName || user?.name?.split(' ')[1] || '';
              const reportType = report.reportType || report.category;
              const actionTaken = report.actionTaken || report.resolution;

              return (
                <div key={report.id} className="report-card">
                  <div className="report-header-row">
                    <div className="report-user">
                      <div className="user-avatar">
                        {photoUrl ? (
                          <img src={photoUrl} alt={firstName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {firstName.charAt(0)}
                            {lastName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="user-info">
                        <h4>
                          {firstName} {lastName}
                        </h4>
                        <span className="report-date">{formatDate(report.createdAt)}</span>
                      </div>
                    </div>
                    {getStatusBadge(report.status)}
                  </div>

                  <div className="report-details">
                    <div className="detail-row">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{formatReportType(reportType)}</span>
                    </div>

                    {report.description && (
                      <div className="detail-row">
                        <span className="detail-label">Description:</span>
                        <span className="detail-value">{report.description}</span>
                      </div>
                    )}

                    {actionTaken && (
                      <div className="action-taken">
                        <span className="action-label">Action Taken:</span>
                        <span className="action-value">{actionTaken}</span>
                      </div>
                    )}

                    {report.resolvedAt && (
                      <div className="detail-row">
                        <span className="detail-label">Resolved:</span>
                        <span className="detail-value">{formatDate(report.resolvedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <div className="load-more-section">
              <button className="load-more-button" onClick={handleLoadMore} disabled={loading}>
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        .my-reports {
          background: white;
          border-radius: 16px;
          padding: 2rem;
        }

        .reports-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .reports-header h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0;
        }

        .filter-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .filter-section label {
          font-size: 0.95rem;
          font-weight: 600;
          color: #6b7280;
        }

        .status-filter {
          padding: 0.5rem 1rem;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-size: 0.95rem;
          color: #1f2937;
          background: white;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .status-filter:hover {
          border-color: #8b5cf6;
        }

        .status-filter:focus {
          outline: none;
          border-color: #8b5cf6;
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: #6b7280;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #8b5cf6;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          background: #fee2e2;
          border: 2px solid #ef4444;
          color: #991b1b;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #991b1b;
          cursor: pointer;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          background: #f9fafb;
          border-radius: 12px;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .empty-state p {
          font-size: 1rem;
          color: #6b7280;
          margin: 0;
        }

        .reports-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .report-card {
          padding: 1.5rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.3s ease;
        }

        .report-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }

        .report-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          gap: 1rem;
        }

        .report-user {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .user-avatar {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          overflow: hidden;
          background: #e5e7eb;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          font-weight: 700;
          font-size: 1.125rem;
        }

        .user-info h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.25rem 0;
        }

        .report-date {
          font-size: 0.875rem;
          color: #9ca3af;
        }

        .status-badge {
          padding: 0.5rem 1rem;
          background: var(--status-color);
          color: white;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: capitalize;
          white-space: nowrap;
        }

        .report-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .detail-row {
          display: flex;
          gap: 0.5rem;
          font-size: 0.95rem;
        }

        .detail-label {
          font-weight: 600;
          color: #6b7280;
          min-width: 100px;
        }

        .detail-value {
          color: #1f2937;
          flex: 1;
        }

        .action-taken {
          padding: 1rem;
          background: #d1fae5;
          border-left: 4px solid #10b981;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .action-label {
          font-weight: 600;
          color: #065f46;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .action-value {
          color: #047857;
          font-size: 0.95rem;
        }

        .load-more-section {
          text-align: center;
          margin-top: 1.5rem;
        }

        .load-more-button {
          padding: 0.875rem 2rem;
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .load-more-button:hover:not(:disabled) {
          border-color: #8b5cf6;
          color: #8b5cf6;
          background: #f5f3ff;
        }

        .load-more-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .my-reports {
            padding: 1rem;
          }

          .reports-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .filter-section {
            width: 100%;
            flex-direction: column;
            align-items: flex-start;
          }

          .status-filter {
            width: 100%;
          }

          .report-header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .detail-row {
            flex-direction: column;
            gap: 0.25rem;
          }

          .detail-label {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
};
