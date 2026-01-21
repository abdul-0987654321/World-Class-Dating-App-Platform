import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaExclamationTriangle, FaBan, FaCheckCircle, FaClock, FaShieldAlt } from 'react-icons/fa';
import { format } from 'date-fns';
import moderationService, { ModerationStatus } from '../../services/moderation.service';

interface Violation {
  id: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  contentType: string;
  contentId: string;
  reason: string;
  actionTaken: string;
  createdAt: string;
}

interface UserModerationRecord {
  userId: string;
  status: 'active' | 'warned' | 'suspended' | 'banned';
  totalViolations: number;
  severeViolations: number;
  lastViolationAt?: string;
  warningsIssued: number;
  suspensionCount: number;
  currentSuspensionEndsAt?: string;
  permanentlyBanned: boolean;
  bannedAt?: string;
  bannedReason?: string;
}

const ViolationHistory: React.FC = () => {
  const [moderationRecord, setModerationRecord] = useState<UserModerationRecord | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In a real app, get userId from auth context
  const userId = localStorage.getItem('userId') || '';

  useEffect(() => {
    loadViolationHistory();
  }, []);

  const loadViolationHistory = async () => {
    try {
      setLoading(true);
      const [statusData, violationsData] = await Promise.all([
        moderationService.getUserStatus(userId),
        // Assuming we'll add this endpoint to the service
        fetch(`/api/moderation/user/${userId}/violations`).then((r) => r.json()),
      ]);

      setModerationRecord(statusData as unknown as UserModerationRecord);
      setViolations(violationsData);
      setError(null);
    } catch (err) {
      setError('Failed to load violation history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { icon: FaCheckCircle, color: '#10b981', text: 'Good Standing', bgColor: '#d1fae5' };
      case 'warned':
        return {
          icon: FaExclamationTriangle,
          color: '#f59e0b',
          text: 'Warned',
          bgColor: '#fef3c7',
        };
      case 'suspended':
        return { icon: FaClock, color: '#ef4444', text: 'Suspended', bgColor: '#fee2e2' };
      case 'banned':
        return { icon: FaBan, color: '#991b1b', text: 'Banned', bgColor: '#fecaca' };
      default:
        return {
          icon: FaShieldAlt,
          color: '#6b7280',
          text: 'Unknown',
          bgColor: '#f3f4f6',
        };
    }
  };

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'low':
        return { color: '#3b82f6', text: 'Low', bgColor: '#dbeafe' };
      case 'medium':
        return { color: '#f59e0b', text: 'Medium', bgColor: '#fef3c7' };
      case 'high':
        return { color: '#ef4444', text: 'High', bgColor: '#fee2e2' };
      case 'critical':
        return { color: '#991b1b', text: 'Critical', bgColor: '#fecaca' };
      default:
        return { color: '#6b7280', text: 'Unknown', bgColor: '#f3f4f6' };
    }
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <LoadingSpinner />
          <p>Loading your moderation history...</p>
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>
          <FaExclamationTriangle />
          <h2>Error Loading History</h2>
          <p>{error}</p>
          <RetryButton onClick={loadViolationHistory}>Try Again</RetryButton>
        </ErrorState>
      </Container>
    );
  }

  if (!moderationRecord) {
    return (
      <Container>
        <EmptyState>
          <FaShieldAlt />
          <h2>No Moderation Record</h2>
          <p>Your account has no moderation history.</p>
        </EmptyState>
      </Container>
    );
  }

  const statusConfig = getStatusConfig(moderationRecord.status);
  const StatusIcon = statusConfig.icon;

  return (
    <Container>
      <Header>
        <h1>Moderation History</h1>
        <p>View your account standing and violation history</p>
      </Header>

      {/* Account Status Card */}
      <StatusCard $bgColor={statusConfig.bgColor}>
        <StatusHeader>
          <StatusIconWrapper $color={statusConfig.color}>
            <StatusIcon />
          </StatusIconWrapper>
          <div>
            <StatusTitle>Account Status</StatusTitle>
            <StatusValue $color={statusConfig.color}>{statusConfig.text}</StatusValue>
          </div>
        </StatusHeader>

        <StatusGrid>
          <StatusItem>
            <StatusLabel>Total Violations</StatusLabel>
            <StatusNumber>{moderationRecord.totalViolations}</StatusNumber>
          </StatusItem>

          <StatusItem>
            <StatusLabel>Severe Violations</StatusLabel>
            <StatusNumber>{moderationRecord.severeViolations}</StatusNumber>
          </StatusItem>

          <StatusItem>
            <StatusLabel>Warnings Issued</StatusLabel>
            <StatusNumber>{moderationRecord.warningsIssued}</StatusNumber>
          </StatusItem>

          <StatusItem>
            <StatusLabel>Times Suspended</StatusLabel>
            <StatusNumber>{moderationRecord.suspensionCount}</StatusNumber>
          </StatusItem>
        </StatusGrid>

        {moderationRecord.currentSuspensionEndsAt && (
          <SuspensionAlert>
            <FaClock />
            <div>
              <strong>Current Suspension</strong>
              <p>
                Your account is suspended until{' '}
                {format(
                  new Date(moderationRecord.currentSuspensionEndsAt),
                  'MMMM dd, yyyy at h:mm a'
                )}
              </p>
            </div>
          </SuspensionAlert>
        )}

        {moderationRecord.permanentlyBanned && (
          <BanAlert>
            <FaBan />
            <div>
              <strong>Account Permanently Banned</strong>
              <p>
                Banned on{' '}
                {moderationRecord.bannedAt &&
                  format(new Date(moderationRecord.bannedAt), 'MMMM dd, yyyy')}
              </p>
              {moderationRecord.bannedReason && <p>Reason: {moderationRecord.bannedReason}</p>}
            </div>
          </BanAlert>
        )}
      </StatusCard>

      {/* Violations Timeline */}
      <Section>
        <SectionHeader>
          <h2>Violation History</h2>
          {violations.length > 0 && (
            <ViolationCount>{violations.length} total violations</ViolationCount>
          )}
        </SectionHeader>

        {violations.length === 0 ? (
          <EmptyViolations>
            <FaCheckCircle />
            <h3>No Violations</h3>
            <p>You have a clean record. Keep following our community guidelines!</p>
          </EmptyViolations>
        ) : (
          <Timeline>
            {violations.map((violation, index) => {
              const severityConfig = getSeverityConfig(violation.severity);
              return (
                <TimelineItem key={violation.id}>
                  <TimelineDot $color={severityConfig.color} />
                  {index < violations.length - 1 && <TimelineLine />}

                  <ViolationCard>
                    <ViolationHeader>
                      <ViolationTitle>
                        <ViolationType>{violation.violationType.replace(/_/g, ' ')}</ViolationType>
                        <SeverityBadge
                          $color={severityConfig.color}
                          $bgColor={severityConfig.bgColor}
                        >
                          {severityConfig.text} Severity
                        </SeverityBadge>
                      </ViolationTitle>
                      <ViolationDate>
                        {format(new Date(violation.createdAt), 'MMM dd, yyyy h:mm a')}
                      </ViolationDate>
                    </ViolationHeader>

                    <ViolationBody>
                      <ViolationDetail>
                        <DetailLabel>Content Type:</DetailLabel>
                        <DetailValue>{violation.contentType}</DetailValue>
                      </ViolationDetail>

                      <ViolationDetail>
                        <DetailLabel>Reason:</DetailLabel>
                        <DetailValue>{violation.reason}</DetailValue>
                      </ViolationDetail>

                      <ViolationDetail>
                        <DetailLabel>Action Taken:</DetailLabel>
                        <ActionTaken>{violation.actionTaken}</ActionTaken>
                      </ViolationDetail>
                    </ViolationBody>
                  </ViolationCard>
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </Section>

      {/* Community Guidelines */}
      <GuidelinesCard>
        <FaShieldAlt />
        <div>
          <h3>Stay in Good Standing</h3>
          <p>
            Review our{' '}
            <a href="/community-guidelines" target="_blank">
              Community Guidelines
            </a>{' '}
            to understand what's expected. Multiple violations may result in account suspension or
            permanent ban.
          </p>
        </div>
      </GuidelinesCard>
    </Container>
  );
};

const Container = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  margin-bottom: 32px;

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

const StatusCard = styled.div<{ $bgColor: string }>`
  background: ${(props) => props.$bgColor};
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
`;

const StatusIconWrapper = styled.div<{ $color: string }>`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${(props) => props.$color};
  font-size: 32px;
`;

const StatusTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const StatusValue = styled.div<{ $color: string }>`
  font-size: 24px;
  font-weight: 700;
  color: ${(props) => props.$color};
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
`;

const StatusItem = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
`;

const StatusLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
`;

const StatusNumber = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: #111827;
`;

const SuspensionAlert = styled.div`
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #92400e;

  svg {
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    display: block;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  p {
    font-size: 14px;
    margin: 0;
    line-height: 1.5;
  }
`;

const BanAlert = styled.div`
  background: #fee2e2;
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #991b1b;

  svg {
    font-size: 24px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    display: block;
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  p {
    font-size: 14px;
    margin: 4px 0 0 0;
    line-height: 1.5;
  }
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
    margin: 0;
  }
`;

const ViolationCount = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  background: #f3f4f6;
  padding: 6px 12px;
  border-radius: 9999px;
`;

const EmptyViolations = styled.div`
  background: #d1fae5;
  border-radius: 16px;
  padding: 48px 24px;
  text-align: center;
  color: #065f46;

  svg {
    font-size: 64px;
    margin-bottom: 16px;
    color: #10b981;
  }

  h3 {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 16px;
    margin: 0;
    opacity: 0.8;
  }
`;

const Timeline = styled.div`
  position: relative;
`;

const TimelineItem = styled.div`
  position: relative;
  padding-left: 48px;
  padding-bottom: 32px;

  &:last-child {
    padding-bottom: 0;
  }
`;

const TimelineDot = styled.div<{ $color: string }>`
  position: absolute;
  left: 0;
  top: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: ${(props) => props.$color};
  border: 4px solid white;
  box-shadow: 0 0 0 2px ${(props) => props.$color};
  z-index: 2;
`;

const TimelineLine = styled.div`
  position: absolute;
  left: 9px;
  top: 28px;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
  z-index: 1;
`;

const ViolationCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`;

const ViolationHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 16px;
`;

const ViolationTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const ViolationType = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #111827;
  text-transform: capitalize;
`;

const SeverityBadge = styled.div<{ $color: string; $bgColor: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${(props) => props.$color};
  background: ${(props) => props.$bgColor};
  padding: 4px 8px;
  border-radius: 9999px;
`;

const ViolationDate = styled.div`
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
`;

const ViolationBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ViolationDetail = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const DetailLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  min-width: 100px;
`;

const DetailValue = styled.div`
  font-size: 14px;
  color: #374151;
  flex: 1;
`;

const ActionTaken = styled.div`
  font-size: 14px;
  color: #374151;
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 8px;
  flex: 1;
`;

const GuidelinesCard = styled.div`
  background: #eff6ff;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  color: #1e40af;

  svg {
    font-size: 32px;
    flex-shrink: 0;
    margin-top: 4px;
  }

  h3 {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    margin: 0;
    line-height: 1.6;
  }

  a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;
  color: #6b7280;

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
    margin: 0;
  }
`;

export default ViolationHistory;
