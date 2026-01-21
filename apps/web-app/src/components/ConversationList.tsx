import React from 'react';
import styled from 'styled-components';
import { Conversation } from '../services/messaging.service';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversationId?: string;
  onConversationSelect: (conversation: Conversation) => void;
  loading?: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onConversationSelect,
  loading = false,
}) => {
  const formatTime = (date?: Date | string) => {
    if (!date) return '';
    const messageDate = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <Container>
        <LoadingText>Loading conversations...</LoadingText>
      </Container>
    );
  }

  if (conversations.length === 0) {
    return (
      <Container>
        <EmptyState>
          <EmptyIcon>💬</EmptyIcon>
          <EmptyTitle>No messages yet</EmptyTitle>
          <EmptyText>Start a conversation with your matches!</EmptyText>
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      {conversations.map((conversation) => (
        <ConversationItem
          key={conversation.id}
          $isSelected={conversation.id === selectedConversationId}
          onClick={() => onConversationSelect(conversation)}
        >
          <Avatar>
            {conversation.participant.photoUrl ? (
              <AvatarImage
                src={conversation.participant.photoUrl}
                alt={conversation.participant.name}
              />
            ) : (
              <AvatarPlaceholder>
                {conversation.participant.name.charAt(0).toUpperCase()}
              </AvatarPlaceholder>
            )}
          </Avatar>

          <ConversationContent>
            <ConversationHeader>
              <UserName>{conversation.participant.name}</UserName>
              <TimeStamp>{formatTime(conversation.lastMessage?.sentAt)}</TimeStamp>
            </ConversationHeader>

            <ConversationPreview>
              <LastMessage $hasUnread={conversation.unreadCount > 0}>
                {conversation.lastMessage?.content || 'No messages yet'}
              </LastMessage>
              {conversation.unreadCount > 0 && (
                <UnreadBadge>{conversation.unreadCount}</UnreadBadge>
              )}
            </ConversationPreview>
          </ConversationContent>
        </ConversationItem>
      ))}
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: white;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const LoadingText = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  height: 100%;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`;

const EmptyTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
`;

const EmptyText = styled.p`
  font-size: 14px;
  color: #666;
  margin: 0;
`;

const ConversationItem = styled.div<{ $isSelected: boolean }>`
  display: flex;
  padding: 16px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
  background-color: ${(props) => (props.$isSelected ? '#f8f9fa' : 'transparent')};

  &:hover {
    background-color: ${(props) => (props.$isSelected ? '#f8f9fa' : '#fafafa')};
  }
`;

const Avatar = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 16px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: 600;
`;

const ConversationContent = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const ConversationHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TimeStamp = styled.div`
  font-size: 12px;
  color: #999;
  margin-left: 8px;
  flex-shrink: 0;
`;

const ConversationPreview = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LastMessage = styled.div<{ $hasUnread: boolean }>`
  font-size: 14px;
  color: ${(props) => (props.$hasUnread ? '#333' : '#666')};
  font-weight: ${(props) => (props.$hasUnread ? '500' : '400')};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const UnreadBadge = styled.div`
  background: #ff3b30;
  color: white;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: 8px;
  flex-shrink: 0;
  min-width: 20px;
  text-align: center;
`;
