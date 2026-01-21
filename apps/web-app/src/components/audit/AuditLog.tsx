/**
 * Audit Log Component
 * Displays user's activity audit log fetched from GET /audit/logs
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {
  FaSearch,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
  FaSpinner,
  FaExclamationTriangle,
  FaUserShield,
  FaSignInAlt,
  FaSignOutAlt,
  FaEdit,
  FaTrash,
  FaHeart,
  FaEnvelope,
  FaCreditCard,
  FaLock,
  FaUnlock,
  FaEye,
  FaPhone,
  FaCog,
} from 'react-icons/fa';
import apiClient, { ApiError } from '../../services/api.client';

interface AuditLogEntry {
  id: string;
  action: string;
  category: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  status: 'success' | 'failure' | 'pending';
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface AuditLogProps {
  userId?: string;
  showFilters?: boolean;
  pageSize?: number;
}

const ACTION_ICONS: Record<string, React.ElementType> = {
  login: FaSignInAlt,
  logout: FaSignOutAlt,
  profile_update: FaEdit,
  account_delete: FaTrash,
  match: FaHeart,
  message_sent: FaEnvelope,
  payment: FaCreditCard,
  password_change: FaLock,
  password_reset: FaUnlock,
  profile_view: FaEye,
  call_initiated: FaPhone,
  settings_change: FaCog,
  default: FaUserShield,
};

const CATEGORY_COLORS: Record<string, string> = {
  auth: '#3b82f6',
  profile: '#10b981',
  matching: '#f59e0b',
  messaging: '#8b5cf6',
  payment: '#ec4899',
  security: '#ef4444',
  settings: '#6b7280',
  default: '#9ca3af',
};

const AuditLog: React.FC<AuditLogProps> = ({ userId, showFilters = true, pageSize = 20 }) => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', pageSize.toString());

      if (searchQuery) {
        params.append('search', searchQuery);
      }
      if (categoryFilter) {
        params.append('category', categoryFilter);
      }
      if (dateRange.start) {
        params.append('startDate', dateRange.start);
      }
      if (dateRange.end) {
        params.append('endDate', dateRange.end);
      }

      const endpoint = userId
        ? `/api/audit/logs/${userId}?${params.toString()}`
        : `/api/audit/logs?${params.toString()}`;

      const response = await apiClient.get<{ success: boolean; data: AuditLogResponse }>(endpoint);

      if (response.success && response.data) {
        setLogs(response.data.logs);
        setTotalPages(response.data.pagination.totalPages);
        setTotal(response.data.pagination.total);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 402) {
          setError('Audit log access requires a premium subscription');
        } else if (err.status === 403) {
          setError('You do not have permission to view audit logs');
        } else {
          setError(err.message || 'Failed to load audit logs');
        }
      } else {
        setError('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, page, pageSize, searchQuery, categoryFilter, dateRange]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || ACTION_ICONS.default;
    return <Icon />;
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && logs.length === 0) {
    return (
      <Container>
        <LoadingState>
          <FaSpinner className="spin" />
          <span>Loading audit logs...</span>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <FaExclamationTriangle />
          <span>{error}</span>
          <RetryButton onClick={fetchLogs}>Try Again</RetryButton>
        </ErrorState>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <FaUserShield />
          <span>Activity Log</span>
        </Title>
        <TotalCount>{total} entries</TotalCount>
      </Header>

      {showFilters && (
        <Filters>
          <SearchForm onSubmit={handleSearch}>
            <SearchInput
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <SearchButton type="submit">
              <FaSearch />
            </SearchButton>
          </SearchForm>

          <FilterSelect
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            <option value="auth">Authentication</option>
            <option value="profile">Profile</option>
            <option value="matching">Matching</option>
            <option value="messaging">Messaging</option>
            <option value="payment">Payment</option>
            <option value="security">Security</option>
            <option value="settings">Settings</option>
          </FilterSelect>

          <DateInput
            type="date"
            value={dateRange.start || ''}
            onChange={(e) => {
              setDateRange((prev) => ({ ...prev, start: e.target.value }));
              setPage(1);
            }}
            placeholder="Start date"
          />
          <DateInput
            type="date"
            value={dateRange.end || ''}
            onChange={(e) => {
              setDateRange((prev) => ({ ...prev, end: e.target.value }));
              setPage(1);
            }}
            placeholder="End date"
          />
        </Filters>
      )}

      {logs.length === 0 ? (
        <EmptyState>
          <FaFilter />
          <span>No audit log entries found</span>
        </EmptyState>
      ) : (
        <>
          <LogList>
            {logs.map((log) => (
              <LogEntry key={log.id}>
                <LogIcon $color={getCategoryColor(log.category)}>
                  {getActionIcon(log.action)}
                </LogIcon>
                <LogContent>
                  <LogAction>{formatAction(log.action)}</LogAction>
                  <LogMeta>
                    <CategoryBadge $color={getCategoryColor(log.category)}>
                      {log.category}
                    </CategoryBadge>
                    <LogTimestamp>{formatDate(log.timestamp)}</LogTimestamp>
                    {log.ipAddress && <LogIp>IP: {log.ipAddress}</LogIp>}
                  </LogMeta>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <LogMetadata>
                      {Object.entries(log.metadata)
                        .slice(0, 3)
                        .map(([key, value]) => (
                          <MetadataItem key={key}>
                            <span>{key}:</span> {String(value)}
                          </MetadataItem>
                        ))}
                    </LogMetadata>
                  )}
                </LogContent>
                <LogStatus $status={log.status}>
                  {log.status === 'success'
                    ? 'Success'
                    : log.status === 'failure'
                      ? 'Failed'
                      : 'Pending'}
                </LogStatus>
              </LogEntry>
            ))}
          </LogList>

          <Pagination>
            <PageButton onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <FaChevronLeft />
            </PageButton>
            <PageInfo>
              Page {page} of {totalPages}
            </PageInfo>
            <PageButton
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <FaChevronRight />
            </PageButton>
          </Pagination>
        </>
      )}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin: 0;

  svg {
    color: #3b82f6;
  }
`;

const TotalCount = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const Filters = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const SearchForm = styled.form`
  display: flex;
  flex: 1;
  min-width: 200px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  border-right: none;
  border-radius: 8px 0 0 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const SearchButton = styled.button`
  padding: 10px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;

  &:hover {
    background-color: #2563eb;
  }
`;

const FilterSelect = styled.select`
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  background-color: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const DateInput = styled.input`
  padding: 10px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const LogList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const LogEntry = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
  background-color: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
`;

const LogIcon = styled.div<{ $color: string }>`
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background-color: ${(props) => props.$color}15;
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
`;

const LogContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const LogAction = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const LogMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const CategoryBadge = styled.span<{ $color: string }>`
  padding: 2px 8px;
  background-color: ${(props) => props.$color}20;
  color: ${(props) => props.$color};
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
`;

const LogTimestamp = styled.span`
  font-size: 13px;
  color: #6b7280;
`;

const LogIp = styled.span`
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
`;

const LogMetadata = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f3f4f6;
  flex-wrap: wrap;
`;

const MetadataItem = styled.span`
  font-size: 12px;
  color: #6b7280;

  span {
    color: #9ca3af;
  }
`;

const LogStatus = styled.div<{ $status: string }>`
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;

  background-color: ${(props) =>
    props.$status === 'success' ? '#dcfce7' : props.$status === 'failure' ? '#fee2e2' : '#fef3c7'};
  color: ${(props) =>
    props.$status === 'success' ? '#166534' : props.$status === 'failure' ? '#991b1b' : '#92400e'};
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
`;

const PageButton = styled.button`
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background-color: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background-color: #f9fafb;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: 14px;
  color: #6b7280;
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #6b7280;

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #ef4444;
  text-align: center;

  svg {
    font-size: 32px;
  }
`;

const RetryButton = styled.button`
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 8px;

  &:hover {
    background-color: #2563eb;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 48px;
  color: #9ca3af;
  text-align: center;

  svg {
    font-size: 32px;
  }
`;

export default AuditLog;
