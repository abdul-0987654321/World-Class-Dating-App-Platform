/**
 * Chat Screen
 * Full-featured chat interface with real-time messaging, typing indicators,
 * read receipts, image/GIF sending, and more
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { MessageThread } from '@components/messaging/MessageThread';
import { GifPicker } from '@components/messaging/GifPicker';
import { ImagePickerModal } from '@components/messaging/ImagePicker';
import { webSocketService } from '@services/realtime/WebSocketService';
import {
  fetchMessages,
  sendMessage,
  sendImageMessage,
  sendGifMessage,
  markConversationAsRead,
  setCurrentConversation,
  addMessage,
  updateMessageStatus,
  setTypingStatus,
  clearUnreadCount,
} from '@store/slices/messagingSlice';
import type { RootState } from '@store/store';
import type { Message } from '@services/api/MessagingService';

type ChatScreenRouteProp = RouteProp<{ Chat: { conversationId: string } }, 'Chat'>;

export const ChatScreen: React.FC = () => {
  const dispatch = useDispatch();
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<StackNavigationProp<any>>();

  const { conversationId } = route.params;

  // Redux state
  const conversation = useSelector((state: RootState) =>
    state.messaging.conversations.find(c => c.id === conversationId)
  );
  const messages = useSelector((state: RootState) =>
    state.messaging.messages[conversationId] || []
  );
  const typingStatuses = useSelector((state: RootState) =>
    state.messaging.typingStatuses[conversationId] || []
  );
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const isConnected = useSelector((state: RootState) => state.messaging.isConnected);
  const isLoadingMessages = useSelector((state: RootState) => state.messaging.isLoadingMessages);

  // Local state
  const [inputText, setInputText] = useState('');
  const [isGifPickerVisible, setIsGifPickerVisible] = useState(false);
  const [isImagePickerVisible, setIsImagePickerVisible] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Get other user info
  const otherUser = conversation?.participants.find(p => p.id !== currentUserId);

  // Check if other user is typing
  const isOtherUserTyping = typingStatuses.some(
    t => t.userId !== currentUserId && t.isTyping
  );

  useEffect(() => {
    // Set current conversation
    dispatch(setCurrentConversation(conversationId));

    // Fetch messages
    dispatch(fetchMessages({ conversationId }));

    // Mark as read
    dispatch(markConversationAsRead(conversationId));
    dispatch(clearUnreadCount(conversationId));

    // Join conversation room for real-time updates
    if (webSocketService.isConnected()) {
      webSocketService.joinConversation(conversationId);
    }

    // Setup WebSocket listeners
    const unsubscribeNewMessage = webSocketService.on('message:new', (data: any) => {
      if (data.conversationId === conversationId) {
        dispatch(addMessage({ conversationId, message: data.message }));

        // Auto-mark as read
        if (data.message.senderId !== currentUserId) {
          webSocketService.markAsRead(conversationId, [data.message.id]);
        }
      }
    });

    const unsubscribeMessageDelivered = webSocketService.on('message:delivered', (data: any) => {
      if (data.conversationId === conversationId) {
        dispatch(updateMessageStatus({
          conversationId,
          messageId: data.messageId,
          status: 'delivered',
        }));
      }
    });

    const unsubscribeMessageRead = webSocketService.on('message:read', (data: any) => {
      if (data.conversationId === conversationId) {
        data.messageIds.forEach((messageId: string) => {
          dispatch(updateMessageStatus({
            conversationId,
            messageId,
            status: 'read',
          }));
        });
      }
    });

    const unsubscribeTypingStart = webSocketService.on('typing:start', (data: any) => {
      if (data.conversationId === conversationId && data.userId !== currentUserId) {
        dispatch(setTypingStatus({
          conversationId,
          userId: data.userId,
          isTyping: true,
        }));
      }
    });

    const unsubscribeTypingStop = webSocketService.on('typing:stop', (data: any) => {
      if (data.conversationId === conversationId) {
        dispatch(setTypingStatus({
          conversationId,
          userId: data.userId,
          isTyping: false,
        }));
      }
    });

    // Cleanup
    return () => {
      dispatch(setCurrentConversation(null));
      webSocketService.leaveConversation(conversationId);
      unsubscribeNewMessage();
      unsubscribeMessageDelivered();
      unsubscribeMessageRead();
      unsubscribeTypingStart();
      unsubscribeTypingStop();
    };
  }, [conversationId, currentUserId, dispatch]);

  // Handle input text change
  const handleInputChange = useCallback((text: string) => {
    setInputText(text);

    // Send typing indicator
    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      webSocketService.sendTyping(conversationId, true);
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      webSocketService.sendTyping(conversationId, false);
    }, 2000);
  }, [conversationId, isTyping]);

  // Send text message
  const handleSendMessage = useCallback(async () => {
    if (!inputText.trim() || isSending) return;

    const messageContent = inputText.trim();
    const tempId = `temp_${Date.now()}`;

    // Clear input immediately
    setInputText('');

    // Stop typing indicator
    setIsTyping(false);
    webSocketService.sendTyping(conversationId, false);

    // Add optimistic message
    const optimisticMessage: Message = {
      id: tempId,
      conversationId,
      senderId: currentUserId!,
      content: messageContent,
      type: 'text',
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    dispatch(addMessage({ conversationId, message: optimisticMessage }));

    // Send via WebSocket for real-time delivery
    try {
      setIsSending(true);

      // Also send via API for persistence
      await dispatch(sendMessage({
        conversationId,
        content: messageContent,
        type: 'text',
        tempId,
      })).unwrap();

    } catch (error) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, conversationId, currentUserId, dispatch]);

  // Send image message
  const handleSendImage = useCallback(async (image: { uri: string; type: string; name: string }) => {
    try {
      setIsSending(true);
      await dispatch(sendImageMessage({ conversationId, file: image })).unwrap();
      Alert.alert('Success', 'Image sent successfully');
    } catch (error) {
      console.error('Failed to send image:', error);
      Alert.alert('Error', 'Failed to send image. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [conversationId, dispatch]);

  // Send GIF message
  const handleSendGif = useCallback(async (gifUrl: string) => {
    try {
      setIsSending(true);
      await dispatch(sendGifMessage({ conversationId, gifUrl })).unwrap();
    } catch (error) {
      console.error('Failed to send GIF:', error);
      Alert.alert('Error', 'Failed to send GIF. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [conversationId, dispatch]);

  // Handle attachment button press
  const handleAttachmentPress = useCallback(() => {
    setIsImagePickerVisible(true);
  }, []);

  // Handle GIF button press
  const handleGifPress = useCallback(() => {
    setIsGifPickerVisible(true);
  }, []);

  // Handle load more messages
  const handleLoadMore = useCallback(() => {
    // Implement pagination
    // dispatch(fetchMessages({ conversationId, page: currentPage + 1 }));
  }, [conversationId]);

  // Handle image press (open full screen)
  const handleImagePress = useCallback((url: string) => {
    // Navigate to image viewer
    // navigation.navigate('ImageViewer', { imageUrl: url });
  }, []);

  if (!conversation || !otherUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerUserInfo}
            onPress={() => {
              // Navigate to user profile
              // navigation.navigate('Profile', { userId: otherUser.id });
            }}
          >
            <Image source={{ uri: otherUser.photo }} style={styles.headerAvatar} />
            <View>
              <Text style={styles.headerName}>{otherUser.name}</Text>
              <Text style={styles.headerStatus}>
                {otherUser.isOnline ? 'Online' : otherUser.lastSeen ? `Active ${otherUser.lastSeen}` : 'Offline'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreButton}>
            <Text style={styles.moreButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Connection status banner */}
        {!isConnected && (
          <View style={styles.connectionBanner}>
            <Text style={styles.connectionBannerText}>
              Connecting to chat server...
            </Text>
          </View>
        )}

        {/* Messages */}
        <MessageThread
          messages={messages}
          currentUserId={currentUserId!}
          otherUserName={otherUser.name}
          otherUserPhoto={otherUser.photo}
          isTyping={isOtherUserTyping}
          onSendMessage={handleSendMessage}
          onLoadMore={handleLoadMore}
          onImagePress={handleImagePress}
          onAttachmentPress={handleAttachmentPress}
          onGifPress={handleGifPress}
        />

        {/* GIF Picker Modal */}
        <GifPicker
          visible={isGifPickerVisible}
          onClose={() => setIsGifPickerVisible(false)}
          onSelectGif={handleSendGif}
        />

        {/* Image Picker Modal */}
        <ImagePickerModal
          visible={isImagePickerVisible}
          onClose={() => setIsImagePickerVisible(false)}
          onSelectImage={handleSendImage}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backButtonText: {
    fontSize: 28,
    color: '#E91E63',
  },
  headerUserInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  moreButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonText: {
    fontSize: 24,
    color: '#666',
  },
  connectionBanner: {
    backgroundColor: '#FFA726',
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  connectionBannerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default ChatScreen;
