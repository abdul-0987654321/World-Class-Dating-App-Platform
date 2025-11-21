import React, { useState } from 'react';
import styled from 'styled-components';
import {
  FaUserSlash,
  FaUserCheck,
  FaBan,
  FaUndo,
  FaHistory,
  FaExclamationTriangle,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import axios from 'axios';

const MODERATION_API_URL = import.meta.env.VITE_MODERATION_SERVICE_URL || 'http://localhost:3008';

interface UserModerationStatus {
  userId: string;
  status: 'active' | 'suspended' | 'banned';
  totalViolations: number;
  severeViolations: number;
  warningsIssued: number;
  suspensionCount: number;
  permanentlyBanned: boolean;
  currentSuspensionEndsAt?: string;
  bannedAt?: string;
  bannedReason?: string;
  lastAdminAction?: string;
  lastAdminActionBy?: string;
  lastAdminActionAt?: string;
  lastAdminActionReason?: string;
}

interface Violation {
  id: string;
  userId: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  contentId: string;
  contentType: string;
  action: string;
  createdAt: string;
}

const UserManagement: React.FC = () => {
  const [searchUserId, setSearchUserId] = useState('');
  const [userStatus, setUserStatus] = useState<UserModerationStatus | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [suspensionDays, setSuspensionDays] = useState(7);
  const [actionReason, setActionReason] = useState('');

  // Get current admin ID from auth context (mock for now)
  const adminId = 'current-admin-id'; // TODO: Get from auth context

  const searchUser = async () => {
    if (!searchUserId.trim()) {
      toast.error('Please enter a user ID');
      return;
    }

    setLoading(true);
    try {
      // Fetch user status
      const statusResponse = await axios.get(
        `${MODERATION_API_URL}/api/moderation/user/${searchUserId}/status`
      );
      setUserStatus(statusResponse.data);

      // Fetch violation history
      const violationsResponse = await axios.get(
        `${MODERATION_API_URL}/api/moderation/user/${searchUserId}/violations`
      );
      setViolations(violationsResponse.data.violations || []);

      toast.success('User data loaded');
    } catch (error: any) {
      toast.error('Failed to load user data');
      console.error(error);
      setUserStatus(null);
      setViolations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async () => {
    if (!searchUserId || !actionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await axios.post(`${MODERATION_API_URL}/api/moderation/admin/suspend`, {
        userId: searchUserId,
        suspensionDays,
        reason: actionReason,
        adminId,
      });

      toast.success(`User suspended for ${suspensionDays} days`);
      setShowSuspendModal(false);
      setActionReason('');
      await searchUser(); // Refresh user data
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to suspend user');
    }
  };

  const handleUnsuspendUser = async () => {
    if (!searchUserId || !actionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await axios.post(`${MODERATION_API_URL}/api/moderation/admin/unsuspend`, {
        userId: searchUserId,
        adminId,
        reason: actionReason,
      });

      toast.success('User unsuspended');
      setActionReason('');
      await searchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unsuspend user');
    }
  };

  const handleBanUser = async () => {
    if (!searchUserId || !actionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await axios.post(`${MODERATION_API_URL}/api/moderation/admin/ban`, {
        userId: searchUserId,
        reason: actionReason,
        adminId,
      });

      toast.success('User permanently banned');
      setShowBanModal(false);
      setActionReason('');
      await searchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to ban user');
    }
  };

  const handleUnbanUser = async () => {
    if (!searchUserId || !actionReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await axios.post(`${MODERATION_API_URL}/api/moderation/admin/unban`, {
        userId: searchUserId,
        adminId,
        reason: actionReason,
      });

      toast.success('User unbanned');
      setActionReason('');
      await searchUser();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to unban user');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#10b981';
      case 'suspended':
        return '#f59e0b';
      case 'banned':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <FaUserSlash />
          User Management
        </Title>
      </Header>

      <SearchSection>
        <SearchInput
          type="text"
          placeholder="Enter User ID..."
          value={searchUserId}
          onChange={(e) => setSearchUserId(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && searchUser()}
        />
        <SearchButton onClick={searchUser} disabled={loading}>
          {loading ? 'Loading...' : 'Search'}
        </SearchButton>
      </SearchSection>

      {userStatus && (
        <>
          <UserCard>
            <UserHeader>
              <UserInfo>
                <UserId>{userStatus.userId}</UserId>
                <StatusBadge $color={getStatusColor(userStatus.status)}>
                  {userStatus.status.toUpperCase()}
                </StatusBadge>
              </UserInfo>

              <ActionsGroup>
                {userStatus.status === 'active' && (
                  <>
                    <ActionButton
                      $color="#f59e0b"
                      onClick={() => setShowSuspendModal(true)}
                    >
                      <FaUserSlash />
                      Suspend
                    </ActionButton>
                    <ActionButton
                      $color="#ef4444"
                      onClick={() => setShowBanModal(true)}
                    >
                      <FaBan />
                      Ban
                    </ActionButton>
                  </>
                )}

                {userStatus.status === 'suspended' && (
                  <ActionButton
                    $color="#10b981"
                    onClick={() => {
                      const reason = prompt('Enter reason for unsuspension:');
                      if (reason) {
                        setActionReason(reason);
                        handleUnsuspendUser();
                      }
                    }}
                  >
                    <FaUserCheck />
                    Unsuspend
                  </ActionButton>
                )}

                {userStatus.status === 'banned' && (
                  <ActionButton
                    $color="#10b981"
                    onClick={() => {
                      const reason = prompt('Enter reason for unban:');
                      if (reason) {
                        setActionReason(reason);
                        handleUnbanUser();
                      }
                    }}
                  >
                    <FaUndo />
                    Unban
                  </ActionButton>
                )}
              </ActionsGroup>
            </UserHeader>

            <UserStats>
              <StatItem>
                <StatLabel>Total Violations</StatLabel>
                <StatValue>{userStatus.totalViolations}</StatValue>
              </StatItem>

              <StatItem>
                <StatLabel>Severe Violations</StatLabel>
                <StatValue $color="#ef4444">{userStatus.severeViolations}</StatValue>
              </StatItem>

              <StatItem>
                <StatLabel>Warnings Issued</StatLabel>
                <StatValue $color="#f59e0b">{userStatus.warningsIssued}</StatValue>
              </StatItem>

              <StatItem>
                <StatLabel>Suspension Count</StatLabel>
                <StatValue>{userStatus.suspensionCount}</StatValue>
              </StatItem>
            </UserStats>

            {userStatus.currentSuspensionEndsAt && (
              <InfoBox $color="#f59e0b">
                <FaExclamationTriangle />
                <div>
                  <strong>Active Suspension</strong>
                  <p>
                    Ends: {new Date(userStatus.currentSuspensionEndsAt).toLocaleString()}
                  </p>
                </div>
              </InfoBox>
            )}

            {userStatus.bannedAt && (
              <InfoBox $color="#ef4444">
                <FaBan />
                <div>
                  <strong>Permanently Banned</strong>
                  <p>
                    Date: {new Date(userStatus.bannedAt).toLocaleString()}
                    <br />
                    Reason: {userStatus.bannedReason || 'No reason provided'}
                  </p>
                </div>
              </InfoBox>
            )}

            {userStatus.lastAdminAction && (
              <AdminActionBox>
                <ActionLabel>Last Admin Action:</ActionLabel>
                <ActionValue>{userStatus.lastAdminAction}</ActionValue>
                {userStatus.lastAdminActionBy && (
                  <ActionDetail>By: {userStatus.lastAdminActionBy}</ActionDetail>
                )}
                {userStatus.lastAdminActionAt && (
                  <ActionDetail>
                    At: {new Date(userStatus.lastAdminActionAt).toLocaleString()}
                  </ActionDetail>
                )}
                {userStatus.lastAdminActionReason && (
                  <ActionDetail>Reason: {userStatus.lastAdminActionReason}</ActionDetail>
                )}
              </AdminActionBox>
            )}
          </UserCard>

          <ViolationsSection>
            <SectionHeader>
              <h2>
                <FaHistory />
                Violation History ({violations.length})
              </h2>
            </SectionHeader>

            {violations.length === 0 ? (
              <EmptyState>No violations found</EmptyState>
            ) : (
              <ViolationsTable>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Content Type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((violation) => (
                    <tr key={violation.id}>
                      <td>{new Date(violation.createdAt).toLocaleString()}</td>
                      <td>
                        <ViolationType>{violation.violationType.replace(/_/g, ' ')}</ViolationType>
                      </td>
                      <td>
                        <SeverityBadge $color={getSeverityColor(violation.severity)}>
                          {violation.severity.toUpperCase()}
                        </SeverityBadge>
                      </td>
                      <td>{violation.contentType}</td>
                      <td>{violation.action}</td>
                    </tr>
                  ))}
                </tbody>
              </ViolationsTable>
            )}
          </ViolationsSection>
        </>
      )}

      {!userStatus && !loading && (
        <EmptyState>
          <FaUserSlash />
          <p>Search for a user to manage their account</p>
        </EmptyState>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <Modal onClick={() => setShowSuspendModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Suspend User</h2>
            </ModalHeader>
            <ModalBody>
              <FormGroup>
                <label>Suspension Duration (days)</label>
                <input
                  type="number"
                  value={suspensionDays}
                  onChange={(e) => setSuspensionDays(Number(e.target.value))}
                  min="1"
                  max="365"
                />
              </FormGroup>

              <FormGroup>
                <label>Reason for Suspension</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={4}
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={() => setShowSuspendModal(false)}>
                Cancel
              </CancelButton>
              <ConfirmButton $color="#f59e0b" onClick={handleSuspendUser}>
                Suspend User
              </ConfirmButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Ban Modal */}
      {showBanModal && (
        <Modal onClick={() => setShowBanModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h2>Permanently Ban User</h2>
            </ModalHeader>
            <ModalBody>
              <WarningBox>
                <FaExclamationTriangle />
                <p>
                  <strong>Warning:</strong> This action will permanently ban the user. They
                  will not be able to access the platform.
                </p>
              </WarningBox>

              <FormGroup>
                <label>Reason for Ban</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Enter detailed reason..."
                  rows={4}
                />
              </FormGroup>
            </ModalBody>
            <ModalFooter>
              <CancelButton onClick={() => setShowBanModal(false)}>Cancel</CancelButton>
              <ConfirmButton $color="#ef4444" onClick={handleBanUser}>
                Permanently Ban
              </ConfirmButton>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
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
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;

  svg {
    color: #ef4444;
  }
`;

const SearchSection = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
`;

const SearchInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #d1d5db;
  border-radius: 8px;
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const SearchButton = styled.button`
  padding: 12px 32px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #2563eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const UserCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
`;

const UserHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const UserId = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: #111827;
`;

const StatusBadge = styled.span<{ $color: string }>`
  background: ${(props) => props.$color};
  color: white;
  padding: 6px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
`;

const ActionsGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const ActionButton = styled.button<{ $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: ${(props) => props.$color};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  svg {
    font-size: 16px;
  }
`;

const UserStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatItem = styled.div`
  text-align: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
`;

const StatValue = styled.div<{ $color?: string }>`
  font-size: 32px;
  font-weight: 700;
  color: ${(props) => props.$color || '#111827'};
`;

const InfoBox = styled.div<{ $color: string }>`
  display: flex;
  align-items: start;
  gap: 16px;
  padding: 16px;
  background: ${(props) => `${props.$color}15`};
  border-left: 4px solid ${(props) => props.$color};
  border-radius: 8px;
  margin-bottom: 16px;

  svg {
    color: ${(props) => props.$color};
    font-size: 24px;
    flex-shrink: 0;
  }

  strong {
    display: block;
    margin-bottom: 4px;
    color: #111827;
  }

  p {
    font-size: 14px;
    color: #374151;
    margin: 0;
  }
`;

const AdminActionBox = styled.div`
  background: #f3f4f6;
  padding: 16px;
  border-radius: 8px;
`;

const ActionLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 8px;
`;

const ActionValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 8px;
`;

const ActionDetail = styled.div`
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
`;

const ViolationsSection = styled.div`
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SectionHeader = styled.div`
  margin-bottom: 20px;

  h2 {
    font-size: 20px;
    font-weight: 700;
    color: #111827;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
  }
`;

const ViolationsTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    text-align: left;
    padding: 12px;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
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

const ViolationType = styled.div`
  font-weight: 600;
  color: #111827;
  text-transform: capitalize;
`;

const SeverityBadge = styled.span<{ $color: string }>`
  background: ${(props) => props.$color};
  color: white;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
  color: #6b7280;

  svg {
    font-size: 64px;
    color: #d1d5db;
    margin-bottom: 16px;
  }

  p {
    font-size: 16px;
    margin: 8px 0 0 0;
  }
`;

// Modal Styles
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
`;

const ModalHeader = styled.div`
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;

  h2 {
    margin: 0;
    font-size: 24px;
    color: #111827;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  input,
  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
  }

  textarea {
    resize: vertical;
  }
`;

const WarningBox = styled.div`
  display: flex;
  align-items: start;
  gap: 12px;
  padding: 16px;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 8px;
  margin-bottom: 20px;

  svg {
    color: #f59e0b;
    font-size: 24px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-size: 14px;
    color: #92400e;
  }
`;

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
`;

const CancelButton = styled.button`
  padding: 10px 20px;
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #e5e7eb;
  }
`;

const ConfirmButton = styled.button<{ $color: string }>`
  padding: 10px 20px;
  background: ${(props) => props.$color};
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

export default UserManagement;
