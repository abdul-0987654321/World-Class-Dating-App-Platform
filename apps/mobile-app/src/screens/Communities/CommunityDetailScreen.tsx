/**
 * Community Detail Screen
 * Shows community info, posts feed, and member interactions
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCommunityDetail, CommunityPost, CommunityRule } from '../../hooks/useCommunityDetail';

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ CommunityDetail: { communityId: string } }, 'CommunityDetail'>;
}

type TabType = 'posts' | 'about' | 'events';

const CommunityDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { communityId } = route.params;
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [newPostText, setNewPostText] = useState('');
  const [showPostModal, setShowPostModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const {
    community,
    posts,
    rules,
    loading,
    postsLoading,
    userRole,
    createPost,
    deletePost,
    likePost,
    pinPost,
    joinCommunity,
    leaveCommunity,
    fetchPosts,
    reportPost,
  } = useCommunityDetail(communityId);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [200, 80],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100, 150],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const handleJoinToggle = useCallback(async () => {
    if (community?.isJoined) {
      Alert.alert(
        'Leave Community',
        `Are you sure you want to leave ${community.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: leaveCommunity },
        ]
      );
    } else {
      await joinCommunity();
    }
  }, [community, joinCommunity, leaveCommunity]);

  const handleCreatePost = useCallback(async () => {
    if (!newPostText.trim()) return;

    const success = await createPost(newPostText);
    if (success) {
      setNewPostText('');
      setShowPostModal(false);
    } else {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    }
  }, [newPostText, createPost]);

  const handleLikePost = useCallback(async (postId: string) => {
    await likePost(postId);
  }, [likePost]);

  const handlePostOptions = useCallback((post: CommunityPost) => {
    setSelectedPost(post);
    setShowPostOptions(true);
  }, []);

  const handleDeletePost = useCallback(async () => {
    if (!selectedPost) return;

    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePost(selectedPost.id);
            setShowPostOptions(false);
            setSelectedPost(null);
          },
        },
      ]
    );
  }, [selectedPost, deletePost]);

  const handleReportPost = useCallback(async () => {
    if (!selectedPost) return;

    Alert.prompt(
      'Report Post',
      'Please describe why you are reporting this post:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async (reason) => {
            if (reason) {
              await reportPost(selectedPost.id, reason);
              Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
            }
            setShowPostOptions(false);
            setSelectedPost(null);
          },
        },
      ],
      'plain-text'
    );
  }, [selectedPost, reportPost]);

  const handlePinPost = useCallback(async () => {
    if (!selectedPost) return;
    await pinPost(selectedPost.id);
    setShowPostOptions(false);
    setSelectedPost(null);
  }, [selectedPost, pinPost]);

  const navigateToMembers = useCallback(() => {
    navigation.navigate('CommunityMembers', { communityId });
  }, [navigation, communityId]);

  const navigateToEvents = useCallback(() => {
    navigation.navigate('CommunityEvents', { communityId });
  }, [navigation, communityId]);

  const navigateToSettings = useCallback(() => {
    navigation.navigate('CommunitySettings', { communityId });
  }, [navigation, communityId]);

  const formatTimeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const renderPost = ({ item }: { item: CommunityPost }) => (
    <View style={styles.postCard}>
      {item.isPinned && (
        <View style={styles.pinnedBadge}>
          <Icon name="pin" size={12} color="#FF6B6B" />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.postAuthor}>
          <Image
            source={{
              uri: item.author.photoUrl || 'https://via.placeholder.com/40',
            }}
            style={styles.authorAvatar}
          />
          <View>
            <View style={styles.authorNameRow}>
              <Text style={styles.authorName}>{item.author.name}</Text>
              {item.author.isVerified && (
                <Icon name="checkmark-circle" size={14} color="#2196F3" />
              )}
            </View>
            <Text style={styles.postTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.postOptionsButton}
          onPress={() => handlePostOptions(item)}
        >
          <Icon name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.postContent}>{item.content}</Text>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.postAction}
          onPress={() => handleLikePost(item.id)}
        >
          <Icon
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={item.isLiked ? '#FF6B6B' : '#666'}
          />
          <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
            {item.likes}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Icon name="chatbubble-outline" size={20} color="#666" />
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Icon name="share-outline" size={22} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRule = ({ item, index }: { item: CommunityRule; index: number }) => (
    <View style={styles.ruleItem}>
      <View style={styles.ruleNumber}>
        <Text style={styles.ruleNumberText}>{index + 1}</Text>
      </View>
      <View style={styles.ruleContent}>
        <Text style={styles.ruleTitle}>{item.title}</Text>
        <Text style={styles.ruleDescription}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPostsTab = () => (
    <View style={styles.tabContent}>
      {community?.isJoined && (
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => setShowPostModal(true)}
        >
          <Icon name="create-outline" size={20} color="#FF6B6B" />
          <Text style={styles.createPostText}>Share something with the community...</Text>
        </TouchableOpacity>
      )}

      {posts.length === 0 && !postsLoading ? (
        <View style={styles.emptyPosts}>
          <Icon name="newspaper-outline" size={48} color="#ccc" />
          <Text style={styles.emptyPostsTitle}>No posts yet</Text>
          <Text style={styles.emptyPostsSubtitle}>
            Be the first to share something!
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={postsLoading}
              onRefresh={() => fetchPosts(true)}
              tintColor="#FF6B6B"
            />
          }
          onEndReached={() => fetchPosts()}
          onEndReachedThreshold={0.5}
        />
      )}
    </View>
  );

  const renderAboutTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {/* Description */}
      <View style={styles.aboutSection}>
        <Text style={styles.aboutSectionTitle}>About</Text>
        <Text style={styles.aboutDescription}>{community?.description}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatMemberCount(community?.memberCount || 0)}
          </Text>
          <Text style={styles.statLabel}>Members</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{posts.length}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {new Date(community?.createdAt || '').toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.statLabel}>Created</Text>
        </View>
      </View>

      {/* Rules */}
      <View style={styles.rulesSection}>
        <Text style={styles.aboutSectionTitle}>Community Rules</Text>
        {rules.map((rule, index) => (
          <View key={rule.id}>{renderRule({ item: rule, index })}</View>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={navigateToMembers}>
          <Icon name="people-outline" size={24} color="#FF6B6B" />
          <Text style={styles.quickActionText}>View Members</Text>
          <Icon name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickAction} onPress={navigateToEvents}>
          <Icon name="calendar-outline" size={24} color="#FF6B6B" />
          <Text style={styles.quickActionText}>View Events</Text>
          <Icon name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
        {userRole === 'admin' && (
          <TouchableOpacity style={styles.quickAction} onPress={navigateToSettings}>
            <Icon name="settings-outline" size={24} color="#FF6B6B" />
            <Text style={styles.quickActionText}>Community Settings</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );

  if (loading || !community) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <View style={styles.headerOverlay} />
        <View style={[styles.communityHeader, { backgroundColor: community.color }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          {userRole === 'admin' && (
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={navigateToSettings}
            >
              <Icon name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}

          <Animated.View style={[styles.headerContent, { opacity: headerOpacity }]}>
            <View style={styles.communityIconLarge}>
              <Icon name={community.icon} size={36} color="#fff" />
            </View>
            <Text style={styles.communityName}>{community.name}</Text>
            <Text style={styles.communityMembers}>
              {formatMemberCount(community.memberCount)} members
            </Text>
          </Animated.View>
        </View>
      </Animated.View>

      {/* Join Button */}
      <View style={styles.joinSection}>
        <TouchableOpacity
          style={[
            styles.joinButton,
            community.isJoined && styles.joinedButton,
          ]}
          onPress={handleJoinToggle}
        >
          <Icon
            name={community.isJoined ? 'checkmark-circle' : 'add-circle'}
            size={20}
            color={community.isJoined ? '#666' : '#fff'}
          />
          <Text
            style={[
              styles.joinButtonText,
              community.isJoined && styles.joinedButtonText,
            ]}
          >
            {community.isJoined ? 'Joined' : 'Join Community'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['posts', 'about'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'posts' && renderPostsTab()}
      {activeTab === 'about' && renderAboutTab()}

      {/* Create Post Modal */}
      <Modal
        visible={showPostModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPostModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPostModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Post</Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={!newPostText.trim()}
            >
              <Text
                style={[
                  styles.modalPost,
                  !newPostText.trim() && styles.modalPostDisabled,
                ]}
              >
                Post
              </Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.postInput}
            placeholder="What's on your mind?"
            placeholderTextColor="#999"
            multiline
            value={newPostText}
            onChangeText={setNewPostText}
            autoFocus
          />
        </KeyboardAvoidingView>
      </Modal>

      {/* Post Options Modal */}
      <Modal
        visible={showPostOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPostOptions(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowPostOptions(false)}
        >
          <View style={styles.optionsContainer}>
            {(userRole === 'admin' || userRole === 'moderator') && (
              <>
                <TouchableOpacity style={styles.optionItem} onPress={handlePinPost}>
                  <Icon name="pin" size={22} color="#666" />
                  <Text style={styles.optionText}>
                    {selectedPost?.isPinned ? 'Unpin Post' : 'Pin Post'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.optionItem, styles.optionItemDanger]}
                  onPress={handleDeletePost}
                >
                  <Icon name="trash" size={22} color="#FF3B30" />
                  <Text style={styles.optionTextDanger}>Delete Post</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.optionItem} onPress={handleReportPost}>
              <Icon name="flag" size={22} color="#666" />
              <Text style={styles.optionText}>Report Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItemCancel}
              onPress={() => setShowPostOptions(false)}
            >
              <Text style={styles.optionTextCancel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    overflow: 'hidden',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 1,
  },
  communityHeader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  settingsButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  communityIconLarge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  communityName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  communityMembers: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  joinSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  joinedButton: {
    backgroundColor: '#F5F5F5',
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  joinedButtonText: {
    color: '#666',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    paddingVertical: 14,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#999',
  },
  tabTextActive: {
    color: '#FF6B6B',
  },
  tabContent: {
    flex: 1,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  createPostText: {
    fontSize: 15,
    color: '#999',
    flex: 1,
  },
  postCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 4,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  authorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  postTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  postOptionsButton: {
    padding: 4,
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  likedText: {
    color: '#FF6B6B',
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyPostsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyPostsSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  aboutSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  aboutSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  aboutDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  statsSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },
  rulesSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  ruleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  ruleContent: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  ruleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  quickActions: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    marginBottom: 24,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalCancel: {
    fontSize: 16,
    color: '#666',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalPost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  modalPostDisabled: {
    color: '#ccc',
  },
  postInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    textAlignVertical: 'top',
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: 34,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionItemDanger: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  optionTextDanger: {
    fontSize: 16,
    color: '#FF3B30',
  },
  optionItemCancel: {
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  optionTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

export default CommunityDetailScreen;
