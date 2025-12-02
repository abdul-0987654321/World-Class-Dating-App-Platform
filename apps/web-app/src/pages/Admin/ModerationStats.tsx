import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  FaCheckCircle,
  FaBan,
  FaExclamationTriangle,
  FaHourglass,
  FaChartLine,
  FaUsers,
  FaShieldAlt,
  FaTrophy,
} from 'react-icons/fa';
import moderationService, { ModerationStatistics } from '../../services/moderation.service';

interface ModerationStats {
  overview: {
    totalModerated: number;
    approved: number;
    rejected: number;
    flagged: number;
    pending: number;
    averageRiskScore: number;
  };
  daily: Array<{
    date: string;
    total: number;
    approved: number;
    rejected: number;
    flagged: number;
  }>;
  violations: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  topViolators: Array<{
    userId: string;
    userName: string;
    userPhoto?: string;
    violationCount: number;
    status: string;
  }>;
  moderatorPerformance: Array<{
    moderatorId: string;
    moderatorName: string;
    reviewCount: number;
    averageReviewTime: number;
  }>;
}

// Helper function to transform ModerationStatistics to ModerationStats
function transformStatistics(data: ModerationStatistics): ModerationStats {
  return {
    overview: {
      totalModerated: data.pendingItems + data.reviewedToday,
      approved: data.approvedToday,
      rejected: data.rejectedToday,
      flagged: data.pendingItems,
      pending: data.pendingItems,
      averageRiskScore: 0,
    },
    daily: [],
    violations: [],
    topViolators: [],
    moderatorPerformance: [],
  };
}

const ModerationStatsPage: React.FC = () => {
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadStats();
  }, [dateRange]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const data = await moderationService.getStatistics(
        startDate.toISOString(),
        endDate.toISOString()
      );

      setStats(transformStatistics(data));
      setError(null);
    } catch (err) {
      setError('Failed to load moderation statistics');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <LoadingSpinner />
          <p>Loading statistics...</p>
        </LoadingState>
      </Container>
    );
  }

  if (error || !stats) {
    return (
      <Container>
        <ErrorState>
          <FaExclamationTriangle />
          <h2>Error Loading Statistics</h2>
          <p>{error || 'Failed to load data'}</p>
          <RetryButton onClick={loadStats}>Try Again</RetryButton>
        </ErrorState>
      </Container>
    );
  }

  const approvalRate =
    stats.overview.totalModerated > 0
      ? ((stats.overview.approved / stats.overview.totalModerated) * 100).toFixed(1)
      : '0';

  const rejectionRate =
    stats.overview.totalModerated > 0
      ? ((stats.overview.rejected / stats.overview.totalModerated) * 100).toFixed(1)
      : '0';

  return (
    <Container>
      <Header>
        <HeaderContent>
          <h1>Moderation Statistics</h1>
          <p>Monitor content moderation performance and trends</p>
        </HeaderContent>

        <DateRangeSelector>
          <DateButton $active={dateRange === '7d'} onClick={() => setDateRange('7d')}>
            Last 7 Days
          </DateButton>
          <DateButton $active={dateRange === '30d'} onClick={() => setDateRange('30d')}>
            Last 30 Days
          </DateButton>
          <DateButton $active={dateRange === '90d'} onClick={() => setDateRange('90d')}>
            Last 90 Days
          </DateButton>
        </DateRangeSelector>
      </Header>

      {/* Overview Cards */}
      <StatsGrid>
        <StatCard $color="#3b82f6">
          <StatIcon>
            <FaChartLine />
          </StatIcon>
          <StatContent>
            <StatLabel>Total Moderated</StatLabel>
            <StatValue>{stats.overview.totalModerated.toLocaleString()}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard $color="#10b981">
          <StatIcon>
            <FaCheckCircle />
          </StatIcon>
          <StatContent>
            <StatLabel>Approved</StatLabel>
            <StatValue>{stats.overview.approved.toLocaleString()}</StatValue>
            <StatPercentage>{approvalRate}%</StatPercentage>
          </StatContent>
        </StatCard>

        <StatCard $color="#ef4444">
          <StatIcon>
            <FaBan />
          </StatIcon>
          <StatContent>
            <StatLabel>Rejected</StatLabel>
            <StatValue>{stats.overview.rejected.toLocaleString()}</StatValue>
            <StatPercentage>{rejectionRate}%</StatPercentage>
          </StatContent>
        </StatCard>

        <StatCard $color="#f59e0b">
          <StatIcon>
            <FaExclamationTriangle />
          </StatIcon>
          <StatContent>
            <StatLabel>Flagged for Review</StatLabel>
            <StatValue>{stats.overview.flagged.toLocaleString()}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard $color="#6b7280">
          <StatIcon>
            <FaHourglass />
          </StatIcon>
          <StatContent>
            <StatLabel>Pending</StatLabel>
            <StatValue>{stats.overview.pending.toLocaleString()}</StatValue>
          </StatContent>
        </StatCard>

        <StatCard $color="#8b5cf6">
          <StatIcon>
            <FaShieldAlt />
          </StatIcon>
          <StatContent>
            <StatLabel>Avg Risk Score</StatLabel>
            <StatValue>{(stats.overview.averageRiskScore * 100).toFixed(1)}%</StatValue>
          </StatContent>
        </StatCard>
      </StatsGrid>

      {/* Daily Trend Chart */}
      <Section>
        <SectionHeader>
          <h2>Daily Moderation Trend</h2>
        </SectionHeader>
        <ChartContainer>
          <SimpleBarChart data={stats.daily} />
        </ChartContainer>
      </Section>

      <TwoColumnGrid>
        {/* Violation Breakdown */}
        <Section>
          <SectionHeader>
            <h2>Violation Types</h2>
          </SectionHeader>
          <ViolationList>
            {stats.violations.length > 0 ? (
              stats.violations.map((violation, index) => (
                <ViolationItem key={index}>
                  <ViolationInfo>
                    <ViolationType>{violation.type.replace(/_/g, ' ')}</ViolationType>
                    <ViolationCount>{violation.count} violations</ViolationCount>
                  </ViolationInfo>
                  <ViolationBar>
                    <ViolationBarFill $percentage={violation.percentage} />
                    <ViolationPercentage>{violation.percentage.toFixed(1)}%</ViolationPercentage>
                  </ViolationBar>
                </ViolationItem>
              ))
            ) : (
              <EmptyMessage>No violations in this period</EmptyMessage>
            )}
          </ViolationList>
        </Section>

        {/* Top Violators */}
        <Section>
          <SectionHeader>
            <h2>Top Violators</h2>
          </SectionHeader>
          <ViolatorList>
            {stats.topViolators.length > 0 ? (
              stats.topViolators.map((violator, index) => (
                <ViolatorItem key={violator.userId}>
                  <ViolatorRank $position={index + 1}>#{index + 1}</ViolatorRank>
                  <ViolatorAvatar>
                    {violator.userPhoto ? (
                      <img src={violator.userPhoto} alt={violator.userName} />
                    ) : (
                      <FaUsers />
                    )}
                  </ViolatorAvatar>
                  <ViolatorInfo>
                    <ViolatorName>{violator.userName}</ViolatorName>
                    <ViolatorStats>
                      {violator.violationCount} violations • {violator.status}
                    </ViolatorStats>
                  </ViolatorInfo>
                  <ViolatorBadge $count={violator.violationCount}>
                    {violator.violationCount}
                  </ViolatorBadge>
                </ViolatorItem>
              ))
            ) : (
              <EmptyMessage>No violators in this period</EmptyMessage>
            )}
          </ViolatorList>
        </Section>
      </TwoColumnGrid>

      {/* Moderator Performance */}
      {stats.moderatorPerformance && stats.moderatorPerformance.length > 0 && (
        <Section>
          <SectionHeader>
            <h2>Moderator Performance</h2>
          </SectionHeader>
          <ModeratorTable>
            <thead>
              <tr>
                <th>Moderator</th>
                <th>Reviews</th>
                <th>Avg Review Time</th>
                <th>Performance</th>
              </tr>
            </thead>
            <tbody>
              {stats.moderatorPerformance.map((moderator) => (
                <tr key={moderator.moderatorId}>
                  <td>
                    <ModeratorName>{moderator.moderatorName}</ModeratorName>
                  </td>
                  <td>{moderator.reviewCount.toLocaleString()}</td>
                  <td>{formatTime(moderator.averageReviewTime)}</td>
                  <td>
                    <PerformanceBadge $time={moderator.averageReviewTime}>
                      {moderator.averageReviewTime < 60 ? 'Excellent' : moderator.averageReviewTime < 120 ? 'Good' : 'Average'}
                    </PerformanceBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </ModeratorTable>
        </Section>
      )}
    </Container>
  );
};

// Simple Bar Chart Component
const SimpleBarChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!data || data.length === 0) {
    return <EmptyChart>No data available</EmptyChart>;
  }

  const maxValue = Math.max(...data.map((d) => d.total));

  return (
    <ChartWrapper>
      {data.map((day, index) => {
        const height = maxValue > 0 ? (day.total / maxValue) * 100 : 0;
        const date = new Date(day.date);
        const label = `${date.getMonth() + 1}/${date.getDate()}`;

        return (
          <BarGroup key={index}>
            <BarContainer>
              <Bar $height={height} title={`${day.total} total`}>
                <BarSegment $color="#10b981" $height={(day.approved / day.total) * 100} />
                <BarSegment $color="#f59e0b" $height={(day.flagged / day.total) * 100} />
                <BarSegment $color="#ef4444" $height={(day.rejected / day.total) * 100} />
              </Bar>
            </BarContainer>
            <BarLabel>{label}</BarLabel>
          </BarGroup>
        );
      })}
    </ChartWrapper>
  );
};

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const Container = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 24px;
  flex-wrap: wrap;
`;

const HeaderContent = styled.div`
  h1 {
    font-size: 32px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }
`;

const DateRangeSelector = styled.div`
  display: flex;
  gap: 8px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 8px;
`;

const DateButton = styled.button<{ $active: boolean }>`
  background: ${(props) => (props.$active ? 'white' : 'transparent')};
  color: ${(props) => (props.$active ? '#111827' : '#6b7280')};
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: ${(props) => (props.$active ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none')};

  &:hover {
    background: ${(props) => (props.$active ? 'white' : '#e5e7eb')};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
`;

const StatCard = styled.div<{ $color: string }>`
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 16px;
  border-left: 4px solid ${(props) => props.$color};
`;

const StatIcon = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: ${(props) => `${props.color}15`};
  color: ${(props) => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const StatContent = styled.div`
  flex: 1;
`;

const StatLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
`;

const StatValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #111827;
`;

const StatPercentage = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
`;

const Section = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const SectionHeader = styled.div`
  margin-bottom: 20px;

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }
`;

const TwoColumnGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
`;

const ChartContainer = styled.div`
  width: 100%;
  height: 300px;
`;

const ChartWrapper = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  height: 100%;
  padding: 20px 0;
`;

const BarGroup = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const BarContainer = styled.div`
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
`;

const Bar = styled.div<{ $height: number }>`
  width: 100%;
  height: ${(props) => props.$height}%;
  background: #e5e7eb;
  border-radius: 4px 4px 0 0;
  min-height: 4px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  transition: height 0.3s ease;
  cursor: pointer;

  &:hover {
    opacity: 0.8;
  }
`;

const BarSegment = styled.div<{ $color: string; $height: number }>`
  width: 100%;
  height: ${(props) => props.$height}%;
  background: ${(props) => props.$color};
  transition: height 0.3s ease;
`;

const BarLabel = styled.div`
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
`;

const EmptyChart = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
  font-size: 16px;
`;

const ViolationList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const ViolationItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ViolationInfo = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ViolationType = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  text-transform: capitalize;
`;

const ViolationCount = styled.div`
  font-size: 14px;
  color: #6b7280;
`;

const ViolationBar = styled.div`
  position: relative;
  height: 8px;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
`;

const ViolationBarFill = styled.div<{ $percentage: number }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${(props) => props.$percentage}%;
  background: linear-gradient(90deg, #ef4444, #f59e0b);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ViolationPercentage = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  font-weight: 700;
  color: #111827;
`;

const ViolatorList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ViolatorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
`;

const ViolatorRank = styled.div<{ $position: number }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(props) => {
    if (props.$position === 1) return '#fbbf24';
    if (props.$position === 2) return '#d1d5db';
    if (props.$position === 3) return '#f97316';
    return '#f3f4f6';
  }};
  color: ${(props) => (props.$position <= 3 ? 'white' : '#6b7280')};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
`;

const ViolatorAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #e5e7eb;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const ViolatorInfo = styled.div`
  flex: 1;
`;

const ViolatorName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
`;

const ViolatorStats = styled.div`
  font-size: 12px;
  color: #6b7280;
  text-transform: capitalize;
`;

const ViolatorBadge = styled.div<{ $count: number }>`
  padding: 6px 12px;
  border-radius: 9999px;
  background: ${(props) => {
    if (props.$count >= 10) return '#fee2e2';
    if (props.$count >= 5) return '#fef3c7';
    return '#dbeafe';
  }};
  color: ${(props) => {
    if (props.$count >= 10) return '#991b1b';
    if (props.$count >= 5) return '#92400e';
    return '#1e40af';
  }};
  font-size: 14px;
  font-weight: 700;
`;

const ModeratorTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #e5e7eb;
  }

  td {
    padding: 16px 12px;
    border-bottom: 1px solid #e5e7eb;
    font-size: 14px;
    color: #374151;
  }

  tr:last-child td {
    border-bottom: none;
  }
`;

const ModeratorName = styled.div`
  font-weight: 600;
  color: #111827;
`;

const PerformanceBadge = styled.div<{ $time: number }>`
  display: inline-block;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  background: ${(props) => {
    if (props.$time < 60) return '#d1fae5';
    if (props.$time < 120) return '#dbeafe';
    return '#fef3c7';
  }};
  color: ${(props) => {
    if (props.$time < 60) return '#065f46';
    if (props.$time < 120) return '#1e40af';
    return '#92400e';
  }};
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: #6b7280;

  p {
    margin-top: 16px;
    font-size: 16px;
  }
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
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
  padding: 64px 24px;
  text-align: center;
  color: #ef4444;

  svg {
    font-size: 64px;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 16px;
    margin: 0 0 24px 0;
    color: #6b7280;
  }
`;

const RetryButton = styled.button`
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #2563eb;
  }
`;

export default ModerationStatsPage;
