import { authTokenService } from '@/services/auth-token.service';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaFlag,
  FaSearch,
  FaFilter,
  FaEye,
  FaUserCheck,
  FaUserTimes,
} from 'react-icons/fa';

interface AdminVerificationDashboardProps {
  adminId: string;
}

interface DuplicateFlag {
  id: string;
  userId: string;
  matchingUserId: string;
  confidenceScore: number;
  status: 'flagged' | 'reviewed' | 'confirmed' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  userDetails: {
    name: string;
    email: string;
    photoUrl: string;
  };
  matchingUserDetails: {
    name: string;
    email: string;
    photoUrl: string;
  };
}

interface VerificationAttempt {
  id: string;
  userId: string;
  mediaId: string;
  attemptType: string;
  result: string;
  errorMessage?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  userDetails: {
    name: string;
    email: string;
  };
}

interface DashboardStats {
  totalFlags: number;
  pendingReview: number;
  confirmedDuplicates: number;
  dismissedFlags: number;
  totalAttempts: number;
  successfulVerifications: number;
  failedVerifications: number;
}

const AdminVerificationDashboard: React.FC<AdminVerificationDashboardProps> = ({
  adminId,
}) => {
  const [activeTab, setActiveTab] = useState<'duplicates' | 'attempts'>('duplicates');
  const [duplicateFlags, setDuplicateFlags] = useState<DuplicateFlag[]>([]);
  const [verificationAttempts, setVerificationAttempts] = useState<VerificationAttempt[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFlag, setSelectedFlag] = useState<DuplicateFlag | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchDuplicateFlags(),
        fetchVerificationAttempts(),
        fetchStats(),
      ]);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDuplicateFlags = async () => {
    try {
      const response = await fetch('/api/admin/verification/duplicate-flags', {
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDuplicateFlags(data.flags || []);
      }
    } catch (error) {
      console.error('Failed to fetch duplicate flags:', error);
    }
  };

  const fetchVerificationAttempts = async () => {
    try {
      const response = await fetch('/api/admin/verification/attempts', {
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationAttempts(data.attempts || []);
      }
    } catch (error) {
      console.error('Failed to fetch verification attempts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/verification/stats', {
        headers: {
          ...authTokenService.getAuthorizationHeader(),
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleReviewFlag = async (flagId: string, action: 'confirmed' | 'dismissed') => {
    try {
      const response = await fetch(`/api/admin/verification/duplicate-flags/${flagId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authTokenService.getAuthorizationHeader(),
        },
        body: JSON.stringify({
          status: action,
          reviewedBy: adminId,
          reviewNotes,
        }),
      });

      if (response.ok) {
        await fetchDuplicateFlags();
        await fetchStats();
        setSelectedFlag(null);
        setReviewNotes('');
      }
    } catch (error) {
      console.error('Failed to review flag:', error);
    }
  };

  const filteredFlags = duplicateFlags.filter((flag) => {
    if (filterStatus !== 'all' && flag.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        flag.userDetails.name.toLowerCase().includes(query) ||
        flag.userDetails.email.toLowerCase().includes(query) ||
        flag.matchingUserDetails.name.toLowerCase().includes(query) ||
        flag.matchingUserDetails.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const renderStats = () => {
    if (!stats) return null;

    return (
      <StatsGrid>
        <StatCard>
          <StatValue>{stats.totalFlags}</StatValue>
          <StatLabel>Total Flags</StatLabel>
          <StatIcon>
            <FaFlag color="#f59e0b" />
          </StatIcon>
        </StatCard>
        <StatCard>
          <StatValue $warning>{stats.pendingReview}</StatValue>
          <StatLabel>Pending Review</StatLabel>
          <StatIcon>
            <FaEye color="#3b82f6" />
          </StatIcon>
        </StatCard>
        <StatCard>
          <StatValue $error>{stats.confirmedDuplicates}</StatValue>
          <StatLabel>Confirmed Duplicates</StatLabel>
          <StatIcon>
            <FaTimesCircle color="#ef4444" />
          </StatIcon>
        </StatCard>
        <StatCard>
          <StatValue $success>{stats.dismissedFlags}</StatValue>
          <StatLabel>Dismissed</StatLabel>
          <StatIcon>
            <FaCheckCircle color="#10b981" />
          </StatIcon>
        </StatCard>
      </StatsGrid>
    );
  };

  const renderDuplicateFlags = () => (
    <>
      <FilterBar>
        <SearchBox>
          <FaSearch color="#9ca3af" />
          <SearchInput
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SearchBox>
        <FilterSelect
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="flagged">Flagged</option>
          <option value="reviewed">Reviewed</option>
          <option value="confirmed">Confirmed</option>
          <option value="dismissed">Dismissed</option>
        </FilterSelect>
      </FilterBar>

      <FlagsContainer>
        {filteredFlags.length === 0 ? (
          <EmptyState>
            <FaFlag size={48} color="#d1d5db" />
            <EmptyText>No duplicate flags found</EmptyText>
          </EmptyState>
        ) : (
          filteredFlags.map((flag) => (
            <FlagCard key={flag.id} $status={flag.status}>
              <FlagHeader>
                <StatusBadge $status={flag.status}>
                  {flag.status}
                </StatusBadge>
                <ConfidenceScore $score={flag.confidenceScore}>
                  {Math.round(flag.confidenceScore * 100)}% match
                </ConfidenceScore>
              </FlagHeader>

              <FlagContent>
                <UserComparison>
                  <UserCard>
                    <UserPhoto src={flag.userDetails.photoUrl} alt={flag.userDetails.name} />
                    <UserInfo>
                      <UserName>{flag.userDetails.name}</UserName>
                      <UserEmail>{flag.userDetails.email}</UserEmail>
                    </UserInfo>
                  </UserCard>

                  <ComparisonArrow>⇄</ComparisonArrow>

                  <UserCard>
                    <UserPhoto src={flag.matchingUserDetails.photoUrl} alt={flag.matchingUserDetails.name} />
                    <UserInfo>
                      <UserName>{flag.matchingUserDetails.name}</UserName>
                      <UserEmail>{flag.matchingUserDetails.email}</UserEmail>
                    </UserInfo>
                  </UserCard>
                </UserComparison>

                <FlagMeta>
                  <MetaItem>
                    Flagged: {new Date(flag.createdAt).toLocaleDateString()}
                  </MetaItem>
                  {flag.reviewedAt && (
                    <MetaItem>
                      Reviewed: {new Date(flag.reviewedAt).toLocaleDateString()}
                    </MetaItem>
                  )}
                  {flag.reviewNotes && (
                    <ReviewNotes>Notes: {flag.reviewNotes}</ReviewNotes>
                  )}
                </FlagMeta>
              </FlagContent>

              {flag.status === 'flagged' && (
                <FlagActions>
                  <ActionButton
                    $confirm
                    onClick={() => {
                      setSelectedFlag(flag);
                      setReviewNotes('');
                    }}
                  >
                    <FaEye />
                    <span>Review</span>
                  </ActionButton>
                </FlagActions>
              )}
            </FlagCard>
          ))
        )}
      </FlagsContainer>
    </>
  );

  const renderVerificationAttempts = () => (
    <AttemptsContainer>
      {verificationAttempts.length === 0 ? (
        <EmptyState>
          <FaCheckCircle size={48} color="#d1d5db" />
          <EmptyText>No verification attempts found</EmptyText>
        </EmptyState>
      ) : (
        <AttemptsTable>
          <thead>
            <tr>
              <TableHeader>User</TableHeader>
              <TableHeader>Type</TableHeader>
              <TableHeader>Result</TableHeader>
              <TableHeader>IP Address</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Actions</TableHeader>
            </tr>
          </thead>
          <tbody>
            {verificationAttempts.map((attempt) => (
              <TableRow key={attempt.id}>
                <TableCell>
                  <UserInfo>
                    <UserName>{attempt.userDetails.name}</UserName>
                    <UserEmail>{attempt.userDetails.email}</UserEmail>
                  </UserInfo>
                </TableCell>
                <TableCell>
                  <TypeBadge>{attempt.attemptType}</TypeBadge>
                </TableCell>
                <TableCell>
                  <ResultBadge $result={attempt.result}>
                    {attempt.result === 'success' ? <FaCheckCircle /> : <FaTimesCircle />}
                    <span>{attempt.result}</span>
                  </ResultBadge>
                </TableCell>
                <TableCell>{attempt.ipAddress}</TableCell>
                <TableCell>
                  {new Date(attempt.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <ViewButton>
                    <FaEye />
                    <span>Details</span>
                  </ViewButton>
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </AttemptsTable>
      )}
    </AttemptsContainer>
  );

  const renderReviewModal = () => {
    if (!selectedFlag) return null;

    return (
      <ModalOverlay onClick={() => setSelectedFlag(null)}>
        <ModalContent onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <ModalTitle>Review Duplicate Flag</ModalTitle>
            <CloseButton onClick={() => setSelectedFlag(null)}>×</CloseButton>
          </ModalHeader>

          <ModalBody>
            <UserComparison>
              <UserCard>
                <UserPhoto src={selectedFlag.userDetails.photoUrl} alt={selectedFlag.userDetails.name} />
                <UserInfo>
                  <UserName>{selectedFlag.userDetails.name}</UserName>
                  <UserEmail>{selectedFlag.userDetails.email}</UserEmail>
                </UserInfo>
              </UserCard>

              <ComparisonArrow>⇄</ComparisonArrow>

              <UserCard>
                <UserPhoto src={selectedFlag.matchingUserDetails.photoUrl} alt={selectedFlag.matchingUserDetails.name} />
                <UserInfo>
                  <UserName>{selectedFlag.matchingUserDetails.name}</UserName>
                  <UserEmail>{selectedFlag.matchingUserDetails.email}</UserEmail>
                </UserInfo>
              </UserCard>
            </UserComparison>

            <ConfidenceInfo>
              Match Confidence: <strong>{Math.round(selectedFlag.confidenceScore * 100)}%</strong>
            </ConfidenceInfo>

            <NotesSection>
              <NotesLabel>Review Notes</NotesLabel>
              <NotesTextarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about this review..."
                rows={4}
              />
            </NotesSection>
          </ModalBody>

          <ModalFooter>
            <DismissButton onClick={() => handleReviewFlag(selectedFlag.id, 'dismissed')}>
              <FaUserCheck />
              <span>Dismiss (Not Duplicate)</span>
            </DismissButton>
            <ConfirmButton onClick={() => handleReviewFlag(selectedFlag.id, 'confirmed')}>
              <FaUserTimes />
              <span>Confirm Duplicate</span>
            </ConfirmButton>
          </ModalFooter>
        </ModalContent>
      </ModalOverlay>
    );
  };

  if (loading) {
    return (
      <Container>
        <LoadingSpinner>Loading dashboard...</LoadingSpinner>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Verification Dashboard</Title>
        <Subtitle>Manage photo verifications and duplicate profiles</Subtitle>
      </Header>

      {renderStats()}

      <Tabs>
        <Tab
          $active={activeTab === 'duplicates'}
          onClick={() => setActiveTab('duplicates')}
        >
          <FaFlag />
          <span>Duplicate Flags</span>
          {stats && stats.pendingReview > 0 && (
            <TabBadge>{stats.pendingReview}</TabBadge>
          )}
        </Tab>
        <Tab
          $active={activeTab === 'attempts'}
          onClick={() => setActiveTab('attempts')}
        >
          <FaCheckCircle />
          <span>Verification Attempts</span>
        </Tab>
      </Tabs>

      <TabContent>
        {activeTab === 'duplicates' && renderDuplicateFlags()}
        {activeTab === 'attempts' && renderVerificationAttempts()}
      </TabContent>

      {renderReviewModal()}
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: #6b7280;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  position: relative;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 24px;
  overflow: hidden;
`;

const StatValue = styled.div<{ $success?: boolean; $warning?: boolean; $error?: boolean }>`
  font-size: 36px;
  font-weight: 700;
  color: ${props =>
    props.$success ? '#10b981' :
    props.$warning ? '#f59e0b' :
    props.$error ? '#ef4444' :
    '#111827'};
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
`;

const StatIcon = styled.div`
  position: absolute;
  top: 24px;
  right: 24px;
  opacity: 0.2;
  font-size: 48px;
`;

const Tabs = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 2px solid #e5e7eb;
  margin-bottom: 24px;
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  border: none;
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  margin-bottom: -2px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #3b82f6;
  }
`;

const TabBadge = styled.span`
  background-color: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 9999px;
  min-width: 20px;
  text-align: center;
`;

const TabContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
`;

const FilterBar = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
`;

const SearchBox = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 16px;
`;

const SearchInput = styled.input`
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  color: #111827;
  outline: none;

  &::placeholder {
    color: #9ca3af;
  }
`;

const FilterSelect = styled.select`
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  background: white;
  cursor: pointer;
  outline: none;

  &:focus {
    border-color: #3b82f6;
  }
`;

const FlagsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FlagCard = styled.div<{ $status: string }>`
  background: white;
  border: 1px solid ${props => {
    switch (props.$status) {
      case 'confirmed': return '#fecaca';
      case 'dismissed': return '#d1fae5';
      default: return '#e5e7eb';
    }
  }};
  border-radius: 12px;
  padding: 20px;
`;

const FlagHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  background-color: ${props => {
    switch (props.$status) {
      case 'confirmed': return '#fef2f2';
      case 'dismissed': return '#d1fae5';
      case 'reviewed': return '#e0e7ff';
      default: return '#fef3c7';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'confirmed': return '#991b1b';
      case 'dismissed': return '#065f46';
      case 'reviewed': return '#3730a3';
      default: return '#92400e';
    }
  }};
`;

const ConfidenceScore = styled.span<{ $score: number }>`
  font-size: 14px;
  font-weight: 600;
  color: ${props => props.$score >= 0.9 ? '#ef4444' : props.$score >= 0.7 ? '#f59e0b' : '#10b981'};
`;

const FlagContent = styled.div`
  margin-bottom: 16px;
`;

const UserComparison = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
`;

const UserCard = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f9fafb;
  padding: 12px;
  border-radius: 8px;
`;

const UserPhoto = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 4px;
`;

const UserEmail = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const ComparisonArrow = styled.div`
  font-size: 24px;
  color: #9ca3af;
  flex-shrink: 0;
`;

const FlagMeta = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetaItem = styled.div`
  font-size: 12px;
  color: #6b7280;
`;

const ReviewNotes = styled.div`
  font-size: 12px;
  color: #374151;
  font-style: italic;
  margin-top: 8px;
  padding: 8px;
  background: #f3f4f6;
  border-radius: 4px;
`;

const FlagActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ActionButton = styled.button<{ $confirm?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: ${props => props.$confirm ? '#3b82f6' : 'white'};
  color: ${props => props.$confirm ? 'white' : '#374151'};
  border: 1px solid ${props => props.$confirm ? '#3b82f6' : '#d1d5db'};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: ${props => props.$confirm ? '#2563eb' : '#f9fafb'};
  }
`;

const AttemptsContainer = styled.div``;

const AttemptsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  border-bottom: 2px solid #e5e7eb;
`;

const TableRow = styled.tr`
  border-bottom: 1px solid #e5e7eb;

  &:hover {
    background-color: #f9fafb;
  }
`;

const TableCell = styled.td`
  padding: 16px 12px;
  font-size: 14px;
  color: #374151;
`;

const TypeBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  background-color: #e0e7ff;
  color: #3730a3;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
`;

const ResultBadge = styled.span<{ $result: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background-color: ${props => props.$result === 'success' ? '#d1fae5' : '#fef2f2'};
  color: ${props => props.$result === 'success' ? '#065f46' : '#991b1b'};
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
`;

const ViewButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  color: #3b82f6;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    text-decoration: underline;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  gap: 16px;
`;

const EmptyText = styled.p`
  font-size: 16px;
  color: #6b7280;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: #111827;
`;

const CloseButton = styled.button`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const ConfidenceInfo = styled.div`
  padding: 16px;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 24px;
  font-size: 14px;
  color: #1e40af;
  text-align: center;

  strong {
    font-weight: 700;
    color: #1e3a8a;
  }
`;

const NotesSection = styled.div``;

const NotesLabel = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
`;

const NotesTextarea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 14px;
  color: #111827;
  resize: vertical;
  outline: none;

  &:focus {
    border-color: #3b82f6;
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e5e7eb;
`;

const DismissButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  color: #10b981;
  border: 2px solid #10b981;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #d1fae5;
  }
`;

const ConfirmButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: #ef4444;
  color: white;
  border: 2px solid #ef4444;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #dc2626;
    border-color: #dc2626;
  }
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 64px;
  font-size: 16px;
  color: #6b7280;
`;

export default AdminVerificationDashboard;
