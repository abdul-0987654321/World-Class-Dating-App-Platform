/**
 * Events List Screen
 * Browse and discover local dating events
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';

interface Event {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: Date;
  time: string;
  location: {
    name: string;
    address: string;
    city: string;
  };
  category: EventCategory;
  attendeeCount: number;
  maxAttendees: number;
  price: number;
  currency: string;
  host: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  isAttending: boolean;
  isBookmarked: boolean;
}

type EventCategory =
  | 'speed-dating'
  | 'singles-mixer'
  | 'outdoor'
  | 'cooking'
  | 'wine-tasting'
  | 'game-night'
  | 'fitness'
  | 'arts'
  | 'virtual';

interface Props {
  navigation: StackNavigationProp<any>;
}

const CATEGORIES: { id: EventCategory; label: string; emoji: string }[] = [
  { id: 'speed-dating', label: 'Speed Dating', emoji: '⚡' },
  { id: 'singles-mixer', label: 'Mixers', emoji: '🎉' },
  { id: 'outdoor', label: 'Outdoor', emoji: '🌳' },
  { id: 'cooking', label: 'Cooking', emoji: '👨‍🍳' },
  { id: 'wine-tasting', label: 'Wine', emoji: '🍷' },
  { id: 'game-night', label: 'Games', emoji: '🎮' },
  { id: 'fitness', label: 'Fitness', emoji: '💪' },
  { id: 'arts', label: 'Arts', emoji: '🎨' },
  { id: 'virtual', label: 'Virtual', emoji: '💻' },
];

// Mock data for demonstration
const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Speed Dating Night',
    description: 'Meet 15+ singles in one night! 5-minute dates with potential matches.',
    imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf',
    date: new Date('2025-12-01'),
    time: '7:00 PM',
    location: {
      name: 'The Social Club',
      address: '123 Main St',
      city: 'San Francisco',
    },
    category: 'speed-dating',
    attendeeCount: 24,
    maxAttendees: 30,
    price: 35,
    currency: 'USD',
    host: {
      id: 'h1',
      name: 'Heartly Events',
      avatarUrl: '',
    },
    isAttending: false,
    isBookmarked: true,
  },
  {
    id: '2',
    title: 'Hiking Singles Adventure',
    description: 'Explore beautiful trails while meeting fellow outdoor enthusiasts.',
    imageUrl: 'https://images.unsplash.com/photo-1551632811-561732d1e306',
    date: new Date('2025-12-05'),
    time: '9:00 AM',
    location: {
      name: 'Twin Peaks Trail',
      address: 'Twin Peaks Blvd',
      city: 'San Francisco',
    },
    category: 'outdoor',
    attendeeCount: 18,
    maxAttendees: 25,
    price: 0,
    currency: 'USD',
    host: {
      id: 'h2',
      name: 'Adventure Singles SF',
      avatarUrl: '',
    },
    isAttending: true,
    isBookmarked: false,
  },
];

const EventsListScreen: React.FC<Props> = ({ navigation }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>(null);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Fetch events from API
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const formatDate = (date: Date): string => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const toggleBookmark = (eventId: string) => {
    setEvents(events.map((e) => (e.id === eventId ? { ...e, isBookmarked: !e.isBookmarked } : e)));
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => navigation.navigate('EventDetails', { eventId: item.id })}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />

      {/* Bookmark button */}
      <TouchableOpacity style={styles.bookmarkButton} onPress={() => toggleBookmark(item.id)}>
        <Text style={styles.bookmarkIcon}>{item.isBookmarked ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>

      {/* Category badge */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryEmoji}>
          {CATEGORIES.find((c) => c.id === item.category)?.emoji}
        </Text>
        <Text style={styles.categoryLabel}>
          {CATEGORIES.find((c) => c.id === item.category)?.label}
        </Text>
      </View>

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            <Text style={styles.timeText}>{item.time}</Text>
          </View>
          {item.isAttending && (
            <View style={styles.attendingBadge}>
              <Text style={styles.attendingText}>Going ✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location.name}, {item.location.city}
          </Text>
        </View>

        <View style={styles.eventFooter}>
          <View style={styles.attendeesContainer}>
            <View style={styles.attendeeAvatars}>
              {[1, 2, 3].map((i) => (
                <View key={i} style={[styles.attendeeAvatar, { marginLeft: i > 1 ? -8 : 0 }]}>
                  <Text style={styles.attendeeEmoji}>👤</Text>
                </View>
              ))}
            </View>
            <Text style={styles.attendeeCount}>
              {item.attendeeCount}/{item.maxAttendees}
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>{item.price === 0 ? 'Free' : `$${item.price}`}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.location.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate('CreateEvent')}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search events..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipSelected]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextSelected]}
          >
            All
          </Text>
        </TouchableOpacity>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryChip,
              selectedCategory === category.id && styles.categoryChipSelected,
            ]}
            onPress={() =>
              setSelectedCategory(selectedCategory === category.id ? null : category.id)
            }
          >
            <Text style={styles.categoryChipEmoji}>{category.emoji}</Text>
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.id && styles.categoryChipTextSelected,
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🎭</Text>
            <Text style={styles.emptyTitle}>No events found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters or check back later</Text>
          </View>
        }
      />
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
  createButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  },
  categoryChipSelected: {
    backgroundColor: '#FF6B6B',
  },
  categoryChipEmoji: {
    fontSize: 14,
    marginRight: 4,
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
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 160,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookmarkIcon: {
    fontSize: 18,
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  attendingBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  attendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeeAvatars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  attendeeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  attendeeEmoji: {
    fontSize: 12,
  },
  attendeeCount: {
    fontSize: 14,
    color: '#666',
  },
  priceContainer: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default EventsListScreen;
