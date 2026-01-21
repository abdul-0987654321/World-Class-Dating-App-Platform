/**
 * Communities Screen
 * Main communities list with discovery, joined communities, and events tabs
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCommunities, Community, CommunityCategory } from '../../hooks/useCommunities';
import { useCommunityEvents, CommunityEvent } from '../../hooks/useCommunityEvents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'discover' | 'joined' | 'events';

interface Props {
  navigation: StackNavigationProp<any>;
}

const CommunitiesScreen: React.FC<Props> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Community[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    communities,
    joinedCommunities,
    categories,
    loading: communitiesLoading,
    refreshing,
    joinCommunity,
    leaveCommunity,
    refreshCommunities,
    searchCommunities,
    filterByCategory,
  } = useCommunities();

  const {
    upcomingEvents,
    myEvents,
    loading: eventsLoading,
    rsvpEvent,
    bookmarkEvent,
  } = useCommunityEvents();

  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        const results = await searchCommunities(query);
        setSearchResults(results);
      } else {
        setSearchResults(null);
      }
    },
    [searchCommunities]
  );

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      setSelectedCategory(categoryId);
      filterByCategory(categoryId);
    },
    [filterByCategory]
  );

  const handleJoinToggle = useCallback(
    async (community: Community) => {
      if (community.isJoined) {
        await leaveCommunity(community.id);
      } else {
        await joinCommunity(community.id);
      }
    },
    [joinCommunity, leaveCommunity]
  );

  const handleCommunityPress = useCallback(
    (community: Community) => {
      navigation.navigate('CommunityDetail', { communityId: community.id });
    },
    [navigation]
  );

  const handleEventPress = useCallback(
    (event: CommunityEvent) => {
      navigation.navigate('CommunityEvents', { eventId: event.id });
    },
    [navigation]
  );

  const handleCreateCommunity = useCallback(() => {
    navigation.navigate('CreateCommunity');
  }, [navigation]);

  const handleRsvp = useCallback(
    async (eventId: string, currentStatus: boolean) => {
      await rsvpEvent(eventId, currentStatus ? 'not_going' : 'going');
    },
    [rsvpEvent]
  );

  const displayedCommunities = useMemo(() => {
    if (searchResults) return searchResults;
    return communities;
  }, [searchResults, communities]);

  const formatEventDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMemberCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderCategoryChip = ({ item }: { item: CommunityCategory }) => (
    <TouchableOpacity
      style={[styles.categoryChip, selectedCategory === item.id && styles.categoryChipSelected]}
      onPress={() => handleCategorySelect(selectedCategory === item.id ? null : item.id)}
    >
      <Icon name={item.icon} size={16} color={selectedCategory === item.id ? '#fff' : '#666'} />
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item.id && styles.categoryChipTextSelected,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderCommunityCard = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => handleCommunityPress(item)}
      activeOpacity={0.9}
    >
      <View style={[styles.communityIcon, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={28} color="#fff" />
      </View>
      <View style={styles.communityContent}>
        <Text style={styles.communityName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.communityDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.communityMeta}>
          <Icon name="people-outline" size={14} color="#999" />
          <Text style={styles.communityMemberCount}>
            {formatMemberCount(item.memberCount)} members
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.joinButton, item.isJoined && styles.joinedButton]}
        onPress={() => handleJoinToggle(item)}
      >
        <Text style={[styles.joinButtonText, item.isJoined && styles.joinedButtonText]}>
          {item.isJoined ? 'Joined' : 'Join'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderJoinedCommunity = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.joinedCommunityCard}
      onPress={() => handleCommunityPress(item)}
      activeOpacity={0.9}
    >
      <View style={[styles.joinedCommunityIcon, { backgroundColor: item.color }]}>
        <Icon name={item.icon} size={22} color="#fff" />
      </View>
      <View style={styles.joinedCommunityContent}>
        <Text style={styles.joinedCommunityName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.joinedCommunityMembers}>
          {formatMemberCount(item.memberCount)} members
        </Text>
      </View>
      <Icon name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  const renderEventCard = ({ item }: { item: CommunityEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
      activeOpacity={0.9}
    >
      {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />}
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBadge}>
            <Text style={styles.eventDateText}>{formatEventDate(item.date)}</Text>
          </View>
          {item.isAttending && (
            <View style={styles.attendingBadge}>
              <Icon name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.attendingText}>Going</Text>
            </View>
          )}
        </View>
        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.eventLocation}>
          <Icon name="location-outline" size={14} color="#666" />
          <Text style={styles.eventLocationText} numberOfLines={1}>
            {item.isVirtual ? 'Virtual Event' : `${item.location.name}, ${item.location.city}`}
          </Text>
        </View>
        <View style={styles.eventFooter}>
          <View style={styles.attendeesInfo}>
            <Icon name="people-outline" size={14} color="#666" />
            <Text style={styles.attendeesText}>
              {item.attendees}/{item.maxAttendees}
            </Text>
          </View>
          <View style={styles.priceInfo}>
            <Text style={styles.priceText}>{item.price === 0 ? 'Free' : `$${item.price}`}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.rsvpButton, item.isAttending && styles.rsvpButtonAttending]}
          onPress={() => handleRsvp(item.id, item.isAttending)}
        >
          <Text style={[styles.rsvpButtonText, item.isAttending && styles.rsvpButtonTextAttending]}>
            {item.isAttending ? 'Cancel RSVP' : 'RSVP'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDiscoverTab = () => (
    <View style={styles.tabContent}>
      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
          onPress={() => handleCategorySelect(null)}
        >
          <Text
            style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <View key={category.id}>{renderCategoryChip({ item: category })}</View>
        ))}
      </ScrollView>

      {/* Communities List */}
      <FlatList
        data={displayedCommunities}
        renderItem={renderCommunityCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCommunities}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          communitiesLoading ? (
            <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No communities found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search or create your own community
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={handleCreateCommunity}>
                <Text style={styles.createButtonText}>Create Community</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </View>
  );

  const renderJoinedTab = () => (
    <View style={styles.tabContent}>
      {joinedCommunities.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="home-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No communities yet</Text>
          <Text style={styles.emptySubtitle}>
            Explore and join communities to connect with like-minded people
          </Text>
          <TouchableOpacity style={styles.exploreButton} onPress={() => setActiveTab('discover')}>
            <Text style={styles.exploreButtonText}>Explore Communities</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={joinedCommunities}
          renderItem={renderJoinedCommunity}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshCommunities}
              tintColor="#FF6B6B"
            />
          }
        />
      )}
    </View>
  );

  const renderEventsTab = () => (
    <View style={styles.tabContent}>
      <FlatList
        data={upcomingEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshCommunities}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          eventsLoading ? (
            <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No upcoming events</Text>
              <Text style={styles.emptySubtitle}>Join communities to discover exciting events</Text>
            </View>
          )
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communities</Text>
        <TouchableOpacity style={styles.createIconButton} onPress={handleCreateCommunity}>
          <Icon name="add-circle-outline" size={28} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search communities..."
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

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['discover', 'joined', 'events'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'joined'
                ? `My Communities (${joinedCommunities.length})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'discover' && renderDiscoverTab()}
      {activeTab === 'joined' && renderJoinedTab()}
      {activeTab === 'events' && renderEventsTab()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  createIconButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    fontSize: 16,
    color: '#1A1A1A',
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B6B',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  communityIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  communityContent: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  communityDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  communityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityMemberCount: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  joinButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  joinedButton: {
    backgroundColor: '#F0F0F0',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  joinedButtonText: {
    color: '#666',
  },
  joinedCommunityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  joinedCommunityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  joinedCommunityContent: {
    flex: 1,
  },
  joinedCommunityName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  joinedCommunityMembers: {
    fontSize: 13,
    color: '#999',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 140,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDateBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  attendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  eventLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  eventLocationText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeesText: {
    fontSize: 13,
    color: '#666',
  },
  priceInfo: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rsvpButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rsvpButtonAttending: {
    backgroundColor: '#F5F5F5',
  },
  rsvpButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  rsvpButtonTextAttending: {
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  exploreButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 20,
  },
  exploreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  loader: {
    marginTop: 48,
  },
});

export default CommunitiesScreen;
