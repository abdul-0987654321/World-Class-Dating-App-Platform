import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Message, Conversation } from '../services/messaging.service';

interface MessageThreadProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  isTyping?: boolean;
  loading?: boolean;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  conversation,
  messages,
  currentUserId,
  onSendMessage,
  onTyping,
  onStopTyping,
  isTyping = false,
  loading = false,
}) => {
  const [messageInput, setMessageInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageInput(e.target.value);

    // Trigger typing indicator
    onTyping();

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of no input
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  };

  const handleSendMessage = () => {
    const trimmedMessage = messageInput.trim();
    if (!trimmedMessage) return;

    onSendMessage(trimmedMessage);
    setMessageInput('');
    onStopTyping();

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: messageDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  // Helper to get message date
  const getMessageDate = (msg: Message) => msg.created_at || msg.sentAt;

  // Helper to get sender ID
  const getSenderId = (msg: Message) => msg.sender_id || msg.senderId;

  // Helper to check if message is read
  const isMessageRead = (msg: Message) => msg.is_read || msg.status === 'read';

  // Get other user (handle both formats)
  const otherUser = conversation.other_user || conversation.participant;
  const otherUserPhoto = otherUser?.photo_url || otherUser?.photoUrl;

  const shouldShowDateDivider = (currentMsg: Message, previousMsg?: Message) => {
    if (!previousMsg) return true;
    const currentDate = new Date(getMessageDate(currentMsg)).toDateString();
    const previousDate = new Date(getMessageDate(previousMsg)).toDateString();
    return currentDate !== previousDate;
  };

  return (
    <Container>
      <Header>
        <Avatar>
          {otherUserPhoto ? (
            <AvatarImage src={otherUserPhoto} alt={otherUser?.name || 'User'} />
          ) : (
            <AvatarPlaceholder>
              {(otherUser?.name || 'U').charAt(0).toUpperCase()}
            </AvatarPlaceholder>
          )}
        </Avatar>
        <UserInfo>
          <UserName>{otherUser?.name || 'User'}</UserName>
        </UserInfo>
      </Header>

      <MessagesContainer>
        {loading ? (
          <LoadingText>Loading messages...</LoadingText>
        ) : messages.length === 0 ? (
          <EmptyState>
            <EmptyText>No messages yet. Say hi! 👋</EmptyText>
          </EmptyState>
        ) : (
          <>
            {messages.map((message, index) => {
              const msgDate = getMessageDate(message);
              const msgSenderId = getSenderId(message);
              const msgIsRead = isMessageRead(message);

              return (
                <React.Fragment key={message.id}>
                  {shouldShowDateDivider(message, messages[index - 1]) && (
                    <DateDivider>
                      <DateLabel>{formatDate(new Date(msgDate))}</DateLabel>
                    </DateDivider>
                  )}
                  <MessageBubbleWrapper $isOwn={msgSenderId === currentUserId}>
                    <MessageBubble $isOwn={msgSenderId === currentUserId}>
                      <MessageContent>{message.content}</MessageContent>
                      <MessageTime>
                        {formatTime(new Date(msgDate))}
                        {msgSenderId === currentUserId && msgIsRead && (
                          <ReadIndicator> · Read</ReadIndicator>
                        )}
                      </MessageTime>
                    </MessageBubble>
                  </MessageBubbleWrapper>
                </React.Fragment>
              );
            })}
            {isTyping && (
              <MessageBubbleWrapper $isOwn={false}>
                <TypingIndicator>
                  <TypingDot delay={0} />
                  <TypingDot delay={0.2} />
                  <TypingDot delay={0.4} />
                </TypingIndicator>
              </MessageBubbleWrapper>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </MessagesContainer>

      <InputContainer>
        <MessageTextArea
          value={messageInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
        />
        <SendButton onClick={handleSendMessage} disabled={!messageInput.trim()}>
          Send
        </SendButton>
      </InputContainer>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 12px;
  overflow: hidden;
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
  font-size: 18px;
  font-weight: 600;
`;

const UserInfo = styled.div`
  flex: 1;
`;

const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;

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
  text-align: center;
  color: #666;
  font-size: 14px;
  margin: 40px 0;
`;

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
`;

const EmptyText = styled.div`
  font-size: 14px;
  color: #999;
`;

const DateDivider = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
`;

const DateLabel = styled.div`
  background: #e9ecef;
  color: #666;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 500;
`;

const MessageBubbleWrapper = styled.div<{ $isOwn: boolean }>`
  display: flex;
  justify-content: ${(props) => (props.$isOwn ? 'flex-end' : 'flex-start')};
  margin-bottom: 8px;
`;

const MessageBubble = styled.div<{ $isOwn: boolean }>`
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  background: ${(props) => (props.$isOwn ? '#007bff' : '#f1f3f5')};
  color: ${(props) => (props.$isOwn ? 'white' : '#333')};
  word-wrap: break-word;
`;

const MessageContent = styled.div`
  font-size: 15px;
  line-height: 1.4;
  white-space: pre-wrap;
`;

const MessageTime = styled.div`
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.7;
  display: flex;
  align-items: center;
`;

const ReadIndicator = styled.span`
  margin-left: 4px;
`;

const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: #f1f3f5;
  border-radius: 18px;
`;

const TypingDot = styled.div<{ delay: number }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  animation: bounce 1.4s infinite ease-in-out;
  animation-delay: ${(props) => props.delay}s;

  @keyframes bounce {
    0%,
    60%,
    100% {
      transform: translateY(0);
    }
    30% {
      transform: translateY(-8px);
    }
  }
`;

const InputContainer = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background: white;
  flex-shrink: 0;
`;

const MessageTextArea = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  font-size: 15px;
  font-family: inherit;
  resize: none;
  max-height: 120px;
  min-height: 44px;

  &:focus {
    outline: none;
    border-color: #007bff;
  }
`;

const SendButton = styled.button`
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  align-self: flex-end;

  &:hover:not(:disabled) {
    background: #0056b3;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;
