/**
 * Call History Screen
 * Display user's video/audio call history
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import videoCallService, { VideoCallRecord } from '../../services/videoCallService';

interface Props {
  navigation: StackNavigationProp<any>;
}

const CallHistoryScreen: React.FC<Props> = ({ navigation }) => {
  const [calls, setCalls] = useState<VideoCallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const limit = 20;

  /**
   * Load call history
   */
  const loadCallHistory = useCallback(async (refresh: boolean = false) => {
    const currentOffset = refresh ? 0 : offset;

    try {
      if (refresh) {
        setRefreshing(true);
      } else if (currentOffset === 0) {
        setLoading(true);
      }

      const response = await videoCallService.getCallHistory(limit, currentOffset);

      if (response.success) {
        if (refresh) {
          setCalls(response.calls);
        } else {
          setCalls((prev) => [...prev, ...response.calls]);
        }

        setHasMore(response.pagination.hasMore);
        setOffset(refresh ? limit : currentOffset + limit);
      }
    } catch (error) {
      console.error('Load call history error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset]);

  useEffect(() => {
    loadCallHistory();
  }, []);

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    loadCallHistory(true);
  };

  /**
   * Load more calls
   */
  const loadMore = () => {
    if (!loading && hasMore) {
      loadCallHistory();
    }
  };

  /**
   * Format call duration
   */
  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins === 0) {
      return `0:${secs.toString().padStart(2, '0')}`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Format call date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Get call icon based on type and status
   */
  const getCallIcon = (call: VideoCallRecord): { icon: string; color: string } => {
    const isVideo = call.callType === 'video';
    const isMissed = call.status === 'missed' || call.status === 'declined';
    const isCompleted = call.status === 'completed';

    if (isMissed) {
      return { icon: isVideo ? '📹' : '📞', color: '#FF4444' };
    } else if (isCompleted) {
      return { icon: isVideo ? '📹' : '📞', color: '#4CAF50' };
    } else {
      return { icon: isVideo ? '📹' : '📞', color: '#999' };
    }
  };

  /**
   * Get call status text
   */
  const getStatusText = (call: VideoCallRecord): string => {
    if (call.status === 'completed') {
      return formatDuration(call.duration);
    } else if (call.status === 'missed') {
      return call.isCaller ? 'Cancelled' : 'Missed';
    } else if (call.status === 'declined') {
      return 'Declined';
    } else if (call.status === 'cancelled') {
      return 'Cancelled';
    }
    return call.status;
  };

  /**
   * Handle call item press
   */
  const handleCallPress = (call: VideoCallRecord) => {
    // Navigate to user profile or call again
    // navigation.navigate('Profile', { userId: call.otherUser.id });
  };

  /**
   * Handle call again
   */
  const handleCallAgain = (call: VideoCallRecord) => {
    navigation.navigate('VideoCall', {
      userId: call.otherUser.id,
      userName: `${call.otherUser.firstName} ${call.otherUser.lastName}`,
      callType: call.callType,
    });
  };

  /**
   * Render call item
   */
  const renderCallItem = ({ item }: { item: VideoCallRecord }) => {
    const { icon, color } = getCallIcon(item);

    return (
      <TouchableOpacity
        style={styles.callItem}
        onPress={() => handleCallPress(item)}
      >
        <View style={styles.callAvatar}>
          <Text style={styles.callAvatarText}>
            {item.otherUser.firstName[0]?.toUpperCase()}
          </Text>
        </View>

        <View style={styles.callInfo}>
          <View style={styles.callHeader}>
            <Text style={styles.callName}>
              {item.otherUser.firstName} {item.otherUser.lastName}
            </Text>
            {item.hdEnabled && (
              <View style={styles.hdBadge}>
                <Text style={styles.hdText}>HD</Text>
              </View>
            )}
          </View>

          <View style={styles.callDetails}>
            <Text style={[styles.callIcon, { color }]}>{icon}</Text>
            <Text style={styles.callType}>
              {item.isCaller ? 'Outgoing' : 'Incoming'} {item.callType}
            </Text>
            <Text style={styles.callDot}>•</Text>
            <Text style={styles.callDate}>{formatDate(item.initiatedAt)}</Text>
          </View>

          {item.connectionQuality && (
            <Text style={styles.callQuality}>
              Quality: {item.connectionQuality}
            </Text>
          )}
        </View>

        <View style={styles.callActions}>
          <Text style={[styles.callStatus, { color }]}>
            {getStatusText(item)}
          </Text>
          <TouchableOpacity
            style={styles.callAgainButton}
            onPress={() => handleCallAgain(item)}
          >
            <Text style={styles.callAgainIcon}>📞</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => {
    if (loading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📞</Text>
        <Text style={styles.emptyTitle}>No Call History</Text>
        <Text style={styles.emptyText}>
          Your video and audio call history will appear here
        </Text>
      </View>
    );
  };

  /**
   * Render footer
   */
  const renderFooter = () => {
    if (!loading || calls.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#FF6B6B" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && calls.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : (
        <FlatList
          data={calls}
          renderItem={renderCallItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B6B"
            />
          }
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  callAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  callInfo: {
    flex: 1,
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  callName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  hdBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hdText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  callDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  callIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  callType: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  callDot: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 4,
  },
  callDate: {
    fontSize: 14,
    color: '#999',
  },
  callQuality: {
    fontSize: 12,
    color: '#999',
    textTransform: 'capitalize',
  },
  callActions: {
    alignItems: 'flex-end',
  },
  callStatus: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  callAgainButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callAgainIcon: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default CallHistoryScreen;
