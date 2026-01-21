import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read';
export type MessageType = 'text' | 'image' | 'voice' | 'gif';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  voiceDuration?: number; // in seconds
  status?: MessageStatus;
  createdAt: Date;
  readAt?: Date;
}

interface MessageThreadProps {
  messages: Message[];
  currentUserId: string;
  otherUserName: string;
  otherUserPhoto: string;
  isTyping?: boolean;
  onSendMessage: (content: string, type: MessageType) => void;
  onLoadMore?: () => void;
  onImagePress?: (url: string) => void;
  onAttachmentPress?: () => void;
  onVoiceNotePress?: () => void;
  onGifPress?: () => void;
  canSendMessage?: boolean;
  waitingForFirstMessage?: boolean;
  requiresWomenFirst?: boolean;
  matchExpiresAt?: Date;
}

export const MessageThread: React.FC<MessageThreadProps> = ({
  messages,
  currentUserId,
  otherUserName,
  otherUserPhoto,
  isTyping = false,
  onSendMessage,
  onLoadMore,
  onImagePress,
  onAttachmentPress,
  onVoiceNotePress,
  onGifPress,
  canSendMessage = true,
  waitingForFirstMessage = false,
  requiresWomenFirst = false,
  matchExpiresAt,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingAnimation = useRef(new Animated.Value(0)).current;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Animate typing indicator
  useEffect(() => {
    if (isTyping) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(typingAnimation, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      typingAnimation.setValue(0);
    }
  }, [isTyping, typingAnimation]);

  const handleSend = () => {
    if (inputText.trim().length === 0 || isSending) return;

    setIsSending(true);
    onSendMessage(inputText.trim(), 'text');
    setInputText('');
    setIsSending(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isSentByMe = item.senderId === currentUserId;
    const showTimestamp = shouldShowTimestamp(item, messages);

    return (
      <View style={styles.messageWrapper}>
        {showTimestamp && (
          <Text style={styles.timestampSeparator}>{formatTimestamp(item.createdAt)}</Text>
        )}
        <View
          style={[
            styles.messageContainer,
            isSentByMe ? styles.sentMessageContainer : styles.receivedMessageContainer,
          ]}
        >
          {!isSentByMe && <Image source={{ uri: otherUserPhoto }} style={styles.messageAvatar} />}

          <View style={styles.messageContent}>
            {item.type === 'text' && (
              <View
                style={[
                  styles.messageBubble,
                  isSentByMe ? styles.sentBubble : styles.receivedBubble,
                ]}
              >
                <Text
                  style={[styles.messageText, isSentByMe ? styles.sentText : styles.receivedText]}
                >
                  {item.content}
                </Text>
                <View style={styles.messageFooter}>
                  <Text
                    style={[styles.messageTime, isSentByMe ? styles.sentTime : styles.receivedTime]}
                  >
                    {formatMessageTime(item.createdAt)}
                  </Text>
                  {isSentByMe && renderMessageStatus(item.status)}
                </View>
              </View>
            )}

            {item.type === 'image' && item.mediaUrl && (
              <TouchableOpacity onPress={() => onImagePress && onImagePress(item.mediaUrl!)}>
                <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
                <View style={[styles.imageMessageFooter, isSentByMe && styles.sentImageFooter]}>
                  <Text style={styles.imageMessageTime}>{formatMessageTime(item.createdAt)}</Text>
                  {isSentByMe && renderMessageStatus(item.status)}
                </View>
              </TouchableOpacity>
            )}

            {item.type === 'voice' && (
              <View
                style={[
                  styles.voiceNoteBubble,
                  isSentByMe ? styles.sentBubble : styles.receivedBubble,
                ]}
              >
                <TouchableOpacity style={styles.voicePlayButton}>
                  <Text style={styles.voicePlayIcon}>▶</Text>
                </TouchableOpacity>
                <View style={styles.voiceWaveform}>
                  {[...Array(20)].map((_, i) => (
                    <View key={i} style={styles.voiceBar} />
                  ))}
                </View>
                <Text
                  style={[styles.voiceDuration, isSentByMe ? styles.sentText : styles.receivedText]}
                >
                  {formatDuration(item.voiceDuration || 0)}
                </Text>
                <View style={styles.messageFooter}>
                  <Text
                    style={[styles.messageTime, isSentByMe ? styles.sentTime : styles.receivedTime]}
                  >
                    {formatMessageTime(item.createdAt)}
                  </Text>
                  {isSentByMe && renderMessageStatus(item.status)}
                </View>
              </View>
            )}

            {item.type === 'gif' && item.mediaUrl && (
              <TouchableOpacity>
                <Image source={{ uri: item.mediaUrl }} style={styles.messageGif} />
                <View style={[styles.imageMessageFooter, isSentByMe && styles.sentImageFooter]}>
                  <Text style={styles.imageMessageTime}>{formatMessageTime(item.createdAt)}</Text>
                  {isSentByMe && renderMessageStatus(item.status)}
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderMessageStatus = (status?: MessageStatus) => {
    if (!status) return null;

    let icon = '';
    let color = '#999';

    switch (status) {
      case 'sending':
        return <ActivityIndicator size="small" color="#999" />;
      case 'sent':
        icon = '✓';
        color = '#999';
        break;
      case 'delivered':
        icon = '✓✓';
        color = '#999';
        break;
      case 'read':
        icon = '✓✓';
        color = '#E91E63';
        break;
    }

    return <Text style={[styles.messageStatus, { color }]}>{icon}</Text>;
  };

  const renderTypingIndicator = () => {
    if (!isTyping) return null;

    const dotOpacity = typingAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <View style={styles.typingContainer}>
        <Image source={{ uri: otherUserPhoto }} style={styles.messageAvatar} />
        <View style={styles.typingBubble}>
          <Animated.View style={[styles.typingDot, { opacity: dotOpacity }]} />
          <Animated.View
            style={[
              styles.typingDot,
              {
                opacity: dotOpacity,
                marginLeft: 4,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.typingDot,
              {
                opacity: dotOpacity,
                marginLeft: 4,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderWomenFirstBanner = () => {
    if (!waitingForFirstMessage || !requiresWomenFirst) return null;

    return (
      <View style={styles.womenFirstBanner}>
        <Text style={styles.womenFirstIcon}>💬</Text>
        <View style={styles.womenFirstTextContainer}>
          <Text style={styles.womenFirstTitle}>Waiting for her to message first</Text>
          <Text style={styles.womenFirstSubtitle}>
            In heterosexual matches, women send the first message
          </Text>
          {matchExpiresAt && (
            <Text style={styles.womenFirstExpiry}>
              Match expires in {getTimeRemaining(matchExpiresAt)}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderTypingIndicator}
      />

      {renderWomenFirstBanner()}

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={[styles.attachmentButton, !canSendMessage && styles.disabledButton]}
          onPress={onAttachmentPress}
          disabled={!canSendMessage}
        >
          <Text style={styles.attachmentIcon}>+</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.input, !canSendMessage && styles.disabledInput]}
          placeholder={
            canSendMessage ? `Message ${otherUserName}...` : 'Waiting for her to message first...'
          }
          placeholderTextColor="#999"
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
          editable={canSendMessage}
        />

        {inputText.trim().length === 0 ? (
          <View style={styles.mediaButtons}>
            <TouchableOpacity
              style={[styles.mediaButton, !canSendMessage && styles.disabledButton]}
              onPress={onVoiceNotePress}
              disabled={!canSendMessage}
            >
              <Text style={styles.mediaIcon}>🎤</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediaButton, !canSendMessage && styles.disabledButton]}
              onPress={onGifPress}
              disabled={!canSendMessage}
            >
              <Text style={styles.mediaIcon}>GIF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.sendButton, (!canSendMessage || isSending) && styles.disabledSendButton]}
            onPress={handleSend}
            disabled={!canSendMessage || isSending}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

// Helper functions
function shouldShowTimestamp(message: Message, allMessages: Message[]): boolean {
  const index = allMessages.findIndex((m) => m.id === message.id);
  if (index === 0) return true;

  const prevMessage = allMessages[index - 1];
  const timeDiff = message.createdAt.getTime() - prevMessage.createdAt.getTime();

  // Show timestamp if more than 30 minutes between messages
  return timeDiff > 30 * 60 * 1000;
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (messageDate.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }

  return messageDate.toLocaleDateString('en-US', options);
}

function formatMessageTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getTimeRemaining(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();

  if (diff <= 0) return 'expired';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  messageList: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  messageWrapper: {
    marginBottom: 8,
  },
  timestampSeparator: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginVertical: 16,
    fontWeight: '500',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 4,
  },
  sentMessageContainer: {
    justifyContent: 'flex-end',
  },
  receivedMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageContent: {
    maxWidth: '75%',
  },
  messageBubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 6,
  },
  sentBubble: {
    backgroundColor: '#E91E63',
    borderBottomRightRadius: 4,
  },
  receivedBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    marginBottom: 4,
  },
  sentText: {
    color: '#FFF',
  },
  receivedText: {
    color: '#333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  messageTime: {
    fontSize: 10,
    marginRight: 4,
  },
  sentTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  receivedTime: {
    color: '#999',
  },
  messageStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  messageGif: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  imageMessageFooter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sentImageFooter: {
    backgroundColor: 'rgba(233, 30, 99, 0.8)',
  },
  imageMessageTime: {
    fontSize: 10,
    color: '#FFF',
    marginRight: 4,
  },
  voiceNoteBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 200,
  },
  voicePlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  voicePlayIcon: {
    fontSize: 16,
    color: '#333',
  },
  voiceWaveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    marginRight: 8,
  },
  voiceBar: {
    width: 2,
    height: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginRight: 2,
  },
  voiceDuration: {
    fontSize: 12,
    marginRight: 8,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 8,
    marginLeft: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#999',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  attachmentButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  attachmentIcon: {
    fontSize: 24,
    color: '#666',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
  },
  mediaButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },
  mediaButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  mediaIcon: {
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#E91E63',
    marginLeft: 8,
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledInput: {
    backgroundColor: '#F9F9F9',
    opacity: 0.7,
  },
  disabledSendButton: {
    backgroundColor: '#CCC',
    opacity: 0.6,
  },
  womenFirstBanner: {
    backgroundColor: '#FFF5E6',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  womenFirstIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  womenFirstTextContainer: {
    flex: 1,
  },
  womenFirstTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  womenFirstSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  womenFirstExpiry: {
    fontSize: 12,
    color: '#E91E63',
    fontWeight: '500',
  },
});
