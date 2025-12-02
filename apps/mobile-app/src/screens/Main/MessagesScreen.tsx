/**
 * Messages Screen
 * Shows list of all conversations with real-time updates
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { ConversationList } from '@components/messaging/ConversationList';
import { webSocketService } from '@services/realtime/WebSocketService';
import {
  fetchConversations,
  addMessage,
  updateConversation,
  setPresenceStatus,
  incrementUnreadCount,
  setConnectionStatus,
  addConversation,
} from '@store/slices/messagingSlice';
import type { RootState } from '@store/store';
import type { Conversation } from '@services/api/MessagingService';

const MessagesScreen: React.FC = () => {
  const dispatch = useDispatch();
  const navigation = useNavigation<StackNavigationProp<any>>();

  // Redux state
  const conversations = useSelector((state: RootState) => state.messaging.conversations);
  const unreadCount = useSelector((state: RootState) => state.messaging.unreadCount);
  const isLoading = useSelector((state: RootState) => state.messaging.isLoading);
  const isConnected = useSelector((state: RootState) => state.messaging.isConnected);
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Connect to WebSocket on mount
  useEffect(() => {
    const connectWebSocket = async () => {
      try {
        if (!webSocketService.isConnected()) {
          await webSocketService.connect();
          dispatch(setConnectionStatus(true));
        }
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
        dispatch(setConnectionStatus(false));
      }
    };

    connectWebSocket();

    // Setup WebSocket event listeners
    const unsubscribeConnection = webSocketService.on('connection', (data: any) => {
      dispatch(setConnectionStatus(data.status === 'connected'));
    });

    const unsubscribeNewMessage = webSocketService.on('message:new', (data: any) => {
      const { conversationId, message } = data;

      // Add message to store
      dispatch(addMessage({ conversationId, message }));

      // Increment unread count if not in current conversation
      // (This should be handled by the chat screen when active)
      dispatch(incrementUnreadCount(conversationId));

      // Update conversation's last message
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        dispatch(updateConversation({
          ...conversation,
          lastMessage: {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt,
            type: message.type,
          },
          updatedAt: message.createdAt,
        }));
      }
    });

    const unsubscribePresence = webSocketService.on('presence:update', (data: any) => {
      dispatch(setPresenceStatus(data));
    });

    const unsubscribeNewMatch = webSocketService.on('match:new', (data: any) => {
      // Handle new match - could create a conversation or show notification
      console.log('New match:', data);
    });

    // Cleanup
    return () => {
      unsubscribeConnection();
      unsubscribeNewMessage();
      unsubscribePresence();
      unsubscribeNewMatch();
    };
  }, [dispatch, conversations]);

  // Fetch conversations when screen is focused
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchConversations({}));
    }, [dispatch])
  );

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchConversations({})).unwrap();
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // Handle conversation press
  const handleConversationPress = useCallback((conversation: Conversation) => {
    navigation.navigate('Chat', { conversationId: conversation.id });
  }, [navigation]);

  // Filter conversations by search query
  const filteredConversations = searchQuery
    ? conversations.filter(conv => {
        const otherUser = conv.participants.find(p => p.id !== currentUserId);
        return otherUser?.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : conversations;

  // Get time ago string
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  // Render conversation item
  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUser = item.participants.find(p => p.id !== currentUserId);
    if (!otherUser) return null;

    return (
      <TouchableOpacity
        style={styles.conversationItem}
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: otherUser.photo }} style={styles.avatar} />
          {otherUser.isOnline && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.topRow}>
            <Text style={styles.name}>{otherUser.name}</Text>
            {item.lastMessage && (
              <Text style={styles.timestamp}>
                {getTimeAgo(item.lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <View style={styles.bottomRow}>
            {item.lastMessage ? (
              <Text
                style={[
                  styles.lastMessage,
                  item.unreadCount > 0 && styles.unreadMessage,
                ]}
                numberOfLines={1}
              >
                {item.lastMessage.senderId === currentUserId ? 'You: ' : ''}
                {item.lastMessage.type === 'text'
                  ? item.lastMessage.content
                  : item.lastMessage.type === 'image'
                  ? 'Photo'
                  : item.lastMessage.type === 'gif'
                  ? 'GIF'
                  : 'Voice message'}
              </Text>
            ) : (
              <Text style={styles.lastMessage}>New conversation</Text>
            )}

            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Messages</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>

        {/* Connection Status */}
        {!isConnected && (
          <View style={styles.connectionStatus}>
            <View style={styles.offlineDot} />
            <Text style={styles.connectionStatusText}>Offline - Reconnecting...</Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Conversations List */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : filteredConversations.length > 0 ? (
        <FlatList
          data={filteredConversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#E91E63"
              colors={['#E91E63']}
            />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'No conversations found' : 'No messages yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Try a different search term'
              : 'Start swiping to find your matches!'}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  headerBadge: {
    backgroundColor: '#E91E63',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  offlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFA726',
    marginRight: 6,
  },
  connectionStatusText: {
    fontSize: 12,
    color: '#FFA726',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '600',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default MessagesScreen;
