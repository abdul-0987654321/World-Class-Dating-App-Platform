import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaFilter, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import moderationService, { ModerationQueueItem } from '../../services/moderation.service';
import ModerationStatusBadge from '../../components/Moderation/ModerationStatusBadge';
import { toast } from 'react-toastify';

const ModerationQueue: React.FC = () => {
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    status: 'flagged',
    priority: '',
  });
  const [selectedItem, setSelectedItem] = useState<ModerationQueueItem | null>(null);

  useEffect(() => {
    loadQueue();
  }, [filter]);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const items = await moderationService.getModerationQueue(filter);
      setQueueItems(items);
    } catch (error: any) {
      toast.error('Failed to load moderation queue');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#ef4444';
      case 'high':
        return '#f59e0b';
      case 'medium':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const handleReview = (item: ModerationQueueItem) => {
    setSelectedItem(item);
  };

  return (
    <Container>
      <Header>
        <Title>
          <FaExclamationTriangle />
          Moderation Queue
        </Title>
        <HeaderActions>
          <RefreshButton onClick={loadQueue}>
            <FaSync />
            Refresh
          </RefreshButton>
        </HeaderActions>
      </Header>

      <Filters>
        <FilterGroup>
          <FilterLabel>Status</FilterLabel>
          <FilterSelect
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All</option>
            <option value="flagged">Flagged</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
          </FilterSelect>
        </FilterGroup>

        <FilterGroup>
          <FilterLabel>Priority</FilterLabel>
          <FilterSelect
            value={filter.priority}
            onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
          >
            <option value="">All</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </FilterSelect>
        </FilterGroup>
      </Filters>

      {loading ? (
        <LoadingState>Loading moderation queue...</LoadingState>
      ) : queueItems.length === 0 ? (
        <EmptyState>
          <FaExclamationTriangle />
          <h3>No items in queue</h3>
          <p>All content has been reviewed!</p>
        </EmptyState>
      ) : (
        <QueueTable>
          <thead>
            <tr>
              <th>Content</th>
              <th>User</th>
              <th>Risk Score</th>
              <th>Violations</th>
              <th>Priority</th>
              <th>Flagged At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueItems.map((item) => (
              <tr key={item.id}>
                <ContentCell>
                  {item.contentType === 'image' && item.contentUrl ? (
                    <ContentPreview>
                      <img src={item.contentUrl} alt="Content" />
                      <ContentType>{item.contentType}</ContentType>
                    </ContentPreview>
                  ) : (
                    <TextContent>
                      <ContentType>{item.contentType}</ContentType>
                      <TextPreview>{item.contentText?.substring(0, 100)}...</TextPreview>
                    </TextContent>
                  )}
                </ContentCell>

                <UserCell>
                  {item.userPhoto && <UserPhoto src={item.userPhoto} alt={item.userName} />}
                  <UserName>{item.userName || 'Unknown User'}</UserName>
                </UserCell>

                <RiskCell>
                  <RiskScore $score={item.riskScore}>
                    {(item.riskScore * 100).toFixed(0)}%
                  </RiskScore>
                </RiskCell>

                <ViolationsCell>
                  {item.violations.length > 0 ? (
                    <ViolationsList>
                      {item.violations.slice(0, 2).map((v, idx) => (
                        <ViolationTag key={idx}>{v.replace('_', ' ')}</ViolationTag>
                      ))}
                      {item.violations.length > 2 && (
                        <MoreViolations>+{item.violations.length - 2} more</MoreViolations>
                      )}
                    </ViolationsList>
                  ) : (
                    <span>None detected</span>
                  )}
                </ViolationsCell>

                <PriorityCell>
                  <PriorityBadge $color={getPriorityColor(item.priority)}>
                    {item.priority.toUpperCase()}
                  </PriorityBadge>
                </PriorityCell>

                <TimeCell>{new Date(item.flaggedAt).toLocaleString()}</TimeCell>

                <ActionsCell>
                  <ReviewButton onClick={() => handleReview(item)}>Review</ReviewButton>
                </ActionsCell>
              </tr>
            ))}
          </tbody>
        </QueueTable>
      )}

      {selectedItem && (
        <ReviewModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onReviewed={loadQueue}
        />
      )}
    </Container>
  );
};

// Review Modal Component (simplified - full version would be more complex)
const ReviewModal: React.FC<{
  item: ModerationQueueItem;
  onClose: () => void;
  onReviewed: () => void;
}> = ({ item, onClose, onReviewed }) => {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await moderationService.reviewContent({
        moderationLogId: item.id,
        action: 'approve',
        notes,
        moderatorId: 'current-user-id', // Get from auth context
      });
      toast.success('Content approved');
      onReviewed();
      onClose();
    } catch (error) {
      toast.error('Failed to approve content');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      await moderationService.reviewContent({
        moderationLogId: item.id,
        action: 'reject',
        notes,
        moderatorId: 'current-user-id',
      });
      toast.success('Content rejected');
      onReviewed();
      onClose();
    } catch (error) {
      toast.error('Failed to reject content');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <h2>Review Content</h2>
        </ModalHeader>

        <ModalBody>
          {item.contentType === 'image' && item.contentUrl && (
            <ContentImage src={item.contentUrl} alt="Content to review" />
          )}

          {item.contentText && <ContentText>{item.contentText}</ContentText>}

          <InfoGrid>
            <InfoItem>
              <InfoLabel>Risk Score:</InfoLabel>
              <InfoValue>{(item.riskScore * 100).toFixed(0)}%</InfoValue>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Priority:</InfoLabel>
              <InfoValue>{item.priority}</InfoValue>
            </InfoItem>

            <InfoItem>
              <InfoLabel>Violations:</InfoLabel>
              <InfoValue>{item.violations.join(', ') || 'None'}</InfoValue>
            </InfoItem>

            <InfoItem>
              <InfoLabel>User:</InfoLabel>
              <InfoValue>{item.userName || 'Unknown'}</InfoValue>
            </InfoItem>
          </InfoGrid>

          <NotesSection>
            <label>Review Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              rows={4}
            />
          </NotesSection>
        </ModalBody>

        <ModalFooter>
          <CancelButton onClick={onClose} disabled={submitting}>
            Cancel
          </CancelButton>
          <RejectButton onClick={handleReject} disabled={submitting}>
            Reject
          </RejectButton>
          <ApproveButton onClick={handleApprove} disabled={submitting}>
            Approve
          </ApproveButton>
        </ModalFooter>
      </ModalContent>
    </ModalOverlay>
  );
};

// Styled Components
const Container = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;

  svg {
    color: #f59e0b;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 12px;
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #2563eb;
  }

  svg {
    font-size: 14px;
  }
`;

const Filters = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const FilterLabel = styled.label`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: white;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #3b82f6;
  }
`;

const QueueTable = styled.table`
  width: 100%;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

  th {
    background: #f9fafb;
    padding: 12px;
    text-align: left;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  td {
    padding: 12px;
    border-top: 1px solid #e5e7eb;
  }

  tr:hover {
    background: #f9fafb;
  }
`;

const ContentCell = styled.td``;

const ContentPreview = styled.div`
  position: relative;

  img {
    width: 80px;
    height: 80px;
    object-fit: cover;
    border-radius: 8px;
  }
`;

const ContentType = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-top: 4px;
`;

const TextContent = styled.div``;

const TextPreview = styled.p`
  font-size: 13px;
  color: #374151;
  margin: 4px 0 0 0;
  max-width: 200px;
`;

const UserCell = styled.td`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const UserPhoto = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
`;

const UserName = styled.span`
  font-weight: 500;
  color: #111827;
`;

const RiskCell = styled.td``;

const RiskScore = styled.span<{ $score: number }>`
  font-weight: 700;
  font-size: 16px;
  color: ${(props) => {
    if (props.$score >= 0.9) return '#ef4444';
    if (props.$score >= 0.7) return '#f59e0b';
    if (props.$score >= 0.5) return '#3b82f6';
    return '#10b981';
  }};
`;

const ViolationsCell = styled.td``;

const ViolationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ViolationTag = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: #991b1b;
  background: #fee2e2;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
  text-transform: capitalize;
  max-width: fit-content;
`;

const MoreViolations = styled.span`
  font-size: 11px;
  color: #6b7280;
  font-style: italic;
`;

const PriorityCell = styled.td``;

const PriorityBadge = styled.span<{ $color: string }>`
  font-size: 11px;
  font-weight: 700;
  color: white;
  background: ${(props) => props.$color};
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-block;
`;

const TimeCell = styled.td`
  font-size: 13px;
  color: #6b7280;
`;

const ActionsCell = styled.td``;

const ReviewButton = styled.button`
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #2563eb;
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;
  font-size: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #6b7280;

  svg {
    font-size: 48px;
    color: #d1d5db;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 20px;
    color: #111827;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
`;

// Modal Styles
const ModalOverlay = styled.div`
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
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
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

const ContentImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 12px;
  margin-bottom: 24px;
`;

const ContentText = styled.div`
  background: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  margin-bottom: 24px;
`;

const InfoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
`;

const InfoItem = styled.div``;

const InfoLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
`;

const InfoValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #111827;
`;

const NotesSection = styled.div`
  label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 8px;
  }

  textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    font-family: inherit;
    resize: vertical;

    &:focus {
      outline: none;
      border-color: #3b82f6;
    }
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

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const RejectButton = styled.button`
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #dc2626;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ApproveButton = styled.button`
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #059669;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export default ModerationQueue;
