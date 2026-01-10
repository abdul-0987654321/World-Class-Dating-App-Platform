/**
 * Community Members Screen
 * Displays list of community members with admin management capabilities
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCommunityDetail, CommunityMember } from '../../hooks/useCommunityDetail';

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ CommunityMembers: { communityId: string } }, 'CommunityMembers'>;
}

type FilterType = 'all' | 'admins' | 'moderators' | 'online';

const CommunityMembersScreen: React.FC<Props> = ({ navigation, route }) => {
  const { communityId } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState<FilterType>('all');
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);
  const [showMemberOptions, setShowMemberOptions] = useState(false);

  const {
    community,
    members,
    membersLoading,
    userRole,
    fetchMembers,
    kickMember,
    promoteMember,
    demoteMember,
    reportMember,
  } = useCommunityDetail(communityId);

  useEffect(() => {
    fetchMembers(true);
  }, [fetchMembers]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleMemberPress = useCallback((member: CommunityMember) => {
    // Navigate to member's profile
    navigation.navigate('Profile', { userId: member.id });
  }, [navigation]);

  const handleMemberLongPress = useCallback((member: CommunityMember) => {
    if (userRole === 'admin' || userRole === 'moderator') {
      setSelectedMember(member);
      setShowMemberOptions(true);
    }
  }, [userRole]);

  const handleKickMember = useCallback(async () => {
    if (!selectedMember) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${selectedMember.name} from this community?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await kickMember(selectedMember.id);
            if (success) {
              Alert.alert('Success', 'Member has been removed.');
            }
            setShowMemberOptions(false);
            setSelectedMember(null);
          },
        },
      ]
    );
  }, [selectedMember, kickMember]);

  const handlePromoteMember = useCallback(async (role: 'moderator' | 'admin') => {
    if (!selectedMember) return;

    Alert.alert(
      'Promote Member',
      `Promote ${selectedMember.name} to ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            const success = await promoteMember(selectedMember.id, role);
            if (success) {
              Alert.alert('Success', `${selectedMember.name} is now a ${role}.`);
            }
            setShowMemberOptions(false);
            setSelectedMember(null);
          },
        },
      ]
    );
  }, [selectedMember, promoteMember]);

  const handleDemoteMember = useCallback(async () => {
    if (!selectedMember) return;

    Alert.alert(
      'Demote Member',
      `Remove ${selectedMember.name}'s special role?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          onPress: async () => {
            const success = await demoteMember(selectedMember.id);
            if (success) {
              Alert.alert('Success', `${selectedMember.name} is now a regular member.`);
            }
            setShowMemberOptions(false);
            setSelectedMember(null);
          },
        },
      ]
    );
  }, [selectedMember, demoteMember]);

  const handleReportMember = useCallback(async () => {
    if (!selectedMember) return;

    Alert.prompt(
      'Report Member',
      `Why are you reporting ${selectedMember.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: async (reason) => {
            if (reason) {
              await reportMember(selectedMember.id, reason);
              Alert.alert('Reported', 'Thank you for your report. We will review it shortly.');
            }
            setShowMemberOptions(false);
            setSelectedMember(null);
          },
        },
      ],
      'plain-text'
    );
  }, [selectedMember, reportMember]);

  const handleMessageMember = useCallback(() => {
    if (!selectedMember) return;
    navigation.navigate('Chat', { userId: selectedMember.id });
    setShowMemberOptions(false);
    setSelectedMember(null);
  }, [selectedMember, navigation]);

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.bio?.toLowerCase().includes(searchQuery.toLowerCase());

    let matchesFilter = true;
    switch (filterBy) {
      case 'admins':
        matchesFilter = member.role === 'admin';
        break;
      case 'moderators':
        matchesFilter = member.role === 'moderator';
        break;
      case 'online':
        matchesFilter = member.isOnline === true;
        break;
    }

    return matchesSearch && matchesFilter;
  });

  const formatJoinDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'admin':
        return { backgroundColor: '#FFE5E5', color: '#FF6B6B' };
      case 'moderator':
        return { backgroundColor: '#E5F3FF', color: '#2196F3' };
      default:
        return null;
    }
  };

  const renderMember = ({ item }: { item: CommunityMember }) => {
    const roleBadge = getRoleBadgeStyle(item.role);

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => handleMemberPress(item)}
        onLongPress={() => handleMemberLongPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.memberAvatarContainer}>
          <Image
            source={{ uri: item.photoUrl || 'https://via.placeholder.com/50' }}
            style={styles.memberAvatar}
          />
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.name}</Text>
            {roleBadge && (
              <View style={[styles.roleBadge, { backgroundColor: roleBadge.backgroundColor }]}>
                <Text style={[styles.roleBadgeText, { color: roleBadge.color }]}>
                  {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                </Text>
              </View>
            )}
          </View>
          {item.bio && (
            <Text style={styles.memberBio} numberOfLines={1}>
              {item.bio}
            </Text>
          )}
          <Text style={styles.memberJoined}>Joined {formatJoinDate(item.joinedAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => {
            setSelectedMember(item);
            handleMessageMember();
          }}
        >
          <Icon name="chatbubble-outline" size={20} color="#FF6B6B" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'admins', 'moderators', 'online'] as FilterType[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, filterBy === filter && styles.filterChipActive]}
            onPress={() => setFilterBy(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                filterBy === filter && styles.filterChipTextActive,
              ]}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Member Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredMembers.length} {filteredMembers.length === 1 ? 'member' : 'members'}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Members</Text>
          <Text style={styles.headerSubtitle}>{community?.name}</Text>
        </View>
      </View>

      <FlatList
        data={filteredMembers}
        renderItem={renderMember}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={membersLoading}
            onRefresh={() => fetchMembers(true)}
            tintColor="#FF6B6B"
          />
        }
        onEndReached={() => fetchMembers()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          membersLoading ? (
            <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={48} color="#ccc" />
              <Text style={styles.emptyTitle}>No members found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search or filters
              </Text>
            </View>
          )
        }
      />

      {/* Member Options Modal */}
      <Modal
        visible={showMemberOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMemberOptions(false)}
      >
        <TouchableOpacity
          style={styles.optionsOverlay}
          activeOpacity={1}
          onPress={() => setShowMemberOptions(false)}
        >
          <View style={styles.optionsContainer}>
            {selectedMember && (
              <>
                <View style={styles.optionsHeader}>
                  <Image
                    source={{ uri: selectedMember.photoUrl || 'https://via.placeholder.com/50' }}
                    style={styles.optionsAvatar}
                  />
                  <Text style={styles.optionsName}>{selectedMember.name}</Text>
                </View>

                <TouchableOpacity style={styles.optionItem} onPress={handleMessageMember}>
                  <Icon name="chatbubble-outline" size={22} color="#666" />
                  <Text style={styles.optionText}>Send Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => handleMemberPress(selectedMember)}
                >
                  <Icon name="person-outline" size={22} color="#666" />
                  <Text style={styles.optionText}>View Profile</Text>
                </TouchableOpacity>

                {userRole === 'admin' && selectedMember.role === 'member' && (
                  <>
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handlePromoteMember('moderator')}
                    >
                      <Icon name="shield-outline" size={22} color="#2196F3" />
                      <Text style={[styles.optionText, { color: '#2196F3' }]}>
                        Make Moderator
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handlePromoteMember('admin')}
                    >
                      <Icon name="star-outline" size={22} color="#FF6B6B" />
                      <Text style={[styles.optionText, { color: '#FF6B6B' }]}>
                        Make Admin
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {userRole === 'admin' && selectedMember.role !== 'member' && selectedMember.role !== 'admin' && (
                  <TouchableOpacity style={styles.optionItem} onPress={handleDemoteMember}>
                    <Icon name="arrow-down-outline" size={22} color="#666" />
                    <Text style={styles.optionText}>Remove Role</Text>
                  </TouchableOpacity>
                )}

                {(userRole === 'admin' || userRole === 'moderator') && selectedMember.role === 'member' && (
                  <TouchableOpacity
                    style={[styles.optionItem, styles.optionItemDanger]}
                    onPress={handleKickMember}
                  >
                    <Icon name="remove-circle-outline" size={22} color="#FF3B30" />
                    <Text style={styles.optionTextDanger}>Remove from Community</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.optionItem} onPress={handleReportMember}>
                  <Icon name="flag-outline" size={22} color="#666" />
                  <Text style={styles.optionText}>Report Member</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionItemCancel}
                  onPress={() => setShowMemberOptions(false)}
                >
                  <Text style={styles.optionTextCancel}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#1A1A1A',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipActive: {
    backgroundColor: '#FF6B6B',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  countText: {
    fontSize: 13,
    color: '#999',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  memberAvatarContainer: {
    position: 'relative',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
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
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  memberBio: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  memberJoined: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
  },
  loader: {
    marginTop: 48,
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
  optionsHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  optionsAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  optionsName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
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

export default CommunityMembersScreen;
