import React from 'react';
import styled from 'styled-components';
import { FaBan, FaExclamationCircle } from 'react-icons/fa';
import { format } from 'date-fns';

interface UserRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  restriction: {
    restricted: boolean;
    reason?: string;
    endsAt?: string;
  };
}

const UserRestrictionModal: React.FC<UserRestrictionModalProps> = ({
  isOpen,
  onClose,
  restriction,
}) => {
  if (!isOpen || !restriction.restricted) return null;

  const isSuspended = !!restriction.endsAt;
  const isPermanentBan = !restriction.endsAt;

  return (
    <Overlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Header $type={isSuspended ? 'suspended' : 'banned'}>
          {isSuspended ? <FaExclamationCircle /> : <FaBan />}
          <h2>{isSuspended ? 'Account Suspended' : 'Account Banned'}</h2>
        </Header>

        <Content>
          <Message>{restriction.reason || 'Your account has been restricted.'}</Message>

          {isSuspended && restriction.endsAt && (
            <SuspensionInfo>
              <InfoLabel>Suspension ends:</InfoLabel>
              <InfoValue>
                {format(new Date(restriction.endsAt), 'MMMM dd, yyyy at h:mm a')}
              </InfoValue>
              <TimeRemaining>{getTimeRemaining(new Date(restriction.endsAt))}</TimeRemaining>
            </SuspensionInfo>
          )}

          {isPermanentBan && (
            <BanInfo>
              <FaBan />
              <p>This ban is permanent and cannot be reversed.</p>
            </BanInfo>
          )}

          <GuidelinesSection>
            <h3>Community Guidelines</h3>
            <p>
              To maintain a safe and respectful environment, we enforce strict community guidelines.
              Please review our{' '}
              <a href="/community-guidelines" target="_blank">
                Community Guidelines
              </a>{' '}
              to understand what's expected.
            </p>
          </GuidelinesSection>

          {isSuspended && (
            <AppealsSection>
              <h3>Think this is a mistake?</h3>
              <p>
                If you believe this suspension was made in error, you can{' '}
                <a href="/appeal" target="_blank">
                  submit an appeal
                </a>
                .
              </p>
            </AppealsSection>
          )}
        </Content>

        <Footer>
          <CloseButton onClick={onClose}>{isSuspended ? 'I Understand' : 'Close'}</CloseButton>
        </Footer>
      </Modal>
    </Overlay>
  );
};

// Helper function to get time remaining
const getTimeRemaining = (endDate: Date): string => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) return 'Suspension has ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ${hours} hour${hours > 1 ? 's' : ''} remaining`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''} remaining`;
  }
};

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const Modal = styled.div`
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
`;

const Header = styled.div<{ $type: 'suspended' | 'banned' }>`
  background: ${(props) => (props.$type === 'suspended' ? '#f59e0b' : '#ef4444')};
  color: white;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 16px 16px 0 0;

  svg {
    font-size: 28px;
  }

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
  }
`;

const Content = styled.div`
  padding: 24px;
`;

const Message = styled.p`
  font-size: 16px;
  line-height: 1.6;
  color: #374151;
  margin: 0 0 24px 0;
`;

const SuspensionInfo = styled.div`
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
`;

const InfoLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
`;

const InfoValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #78350f;
  margin-bottom: 8px;
`;

const TimeRemaining = styled.div`
  font-size: 14px;
  color: #92400e;
  font-weight: 500;
`;

const BanInfo = styled.div`
  background: #fee2e2;
  border: 2px solid #ef4444;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #991b1b;

  svg {
    font-size: 24px;
    flex-shrink: 0;
  }

  p {
    margin: 0;
    font-weight: 600;
  }
`;

const GuidelinesSection = styled.div`
  margin-bottom: 24px;

  h3 {
    font-size: 16px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    line-height: 1.6;
    color: #6b7280;
    margin: 0;
  }

  a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const AppealsSection = styled.div`
  background: #f3f4f6;
  border-radius: 12px;
  padding: 16px;

  h3 {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    margin: 0 0 8px 0;
  }

  p {
    font-size: 14px;
    line-height: 1.6;
    color: #6b7280;
    margin: 0;
  }

  a {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const Footer = styled.div`
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled.button`
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

export default UserRestrictionModal;
