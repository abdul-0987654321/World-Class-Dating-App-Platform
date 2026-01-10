/**
 * Community Events Screen
 * Displays community events with RSVP functionality
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Share,
  Linking,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useCommunityEvents, CommunityEvent, EventAttendee } from '../../hooks/useCommunityEvents';

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<
    { CommunityEvents: { communityId?: string; eventId?: string } },
    'CommunityEvents'
  >;
}

type TabType = 'upcoming' | 'attending' | 'past';

const CommunityEventsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { communityId, eventId } = route.params || {};
  const [activeTab, setActiveTab] = useState<TabType>('upcoming');
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const {
    events,
    upcomingEvents,
    myEvents,
    eventAttendees,
    loading,
    attendeesLoading,
    fetchEvents,
    fetchEventDetail,
    fetchEventAttendees,
    rsvpEvent,
    bookmarkEvent,
    shareEvent,
    refreshEvents,
  } = useCommunityEvents(communityId);

  useEffect(() => {
    if (eventId) {
      fetchEventDetail(eventId).then(() => {
        const event = events.find((e) => e.id === eventId);
        if (event) {
          setSelectedEvent(event);
          setShowEventDetail(true);
        }
      });
    }
  }, [eventId, events, fetchEventDetail]);

  const handleEventPress = useCallback(async (event: CommunityEvent) => {
    setSelectedEvent(event);
    setShowEventDetail(true);
    await fetchEventAttendees(event.id);
  }, [fetchEventAttendees]);

  const handleRsvp = useCallback(async (event: CommunityEvent) => {
    const newStatus = event.isAttending ? 'not_going' : 'going';
    const success = await rsvpEvent(event.id, newStatus);

    if (success && selectedEvent?.id === event.id) {
      setSelectedEvent((prev) =>
        prev
          ? {
              ...prev,
              isAttending: !prev.isAttending,
              attendees: prev.isAttending
                ? Math.max(0, prev.attendees - 1)
                : prev.attendees + 1,
            }
          : null
      );
    }
  }, [rsvpEvent, selectedEvent]);

  const handleBookmark = useCallback(async (event: CommunityEvent) => {
    await bookmarkEvent(event.id);
    if (selectedEvent?.id === event.id) {
      setSelectedEvent((prev) =>
        prev ? { ...prev, isBookmarked: !prev.isBookmarked } : null
      );
    }
  }, [bookmarkEvent, selectedEvent]);

  const handleShare = useCallback(async (event: CommunityEvent) => {
    try {
      const result = await shareEvent(event.id);
      if (result) {
        await Share.share({
          title: event.title,
          message: `Check out this event: ${event.title}\n\n${result.shareUrl}`,
          url: result.shareUrl,
        });
      }
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  }, [shareEvent]);

  const handleOpenMap = useCallback((event: CommunityEvent) => {
    if (event.isVirtual) {
      if (event.virtualLink) {
        Linking.openURL(event.virtualLink);
      }
    } else {
      const { latitude, longitude, address, city } = event.location;
      if (latitude && longitude) {
        const url = `https://maps.google.com/?q=${latitude},${longitude}`;
        Linking.openURL(url);
      } else {
        const query = encodeURIComponent(`${address}, ${city}`);
        Linking.openURL(`https://maps.google.com/?q=${query}`);
      }
    }
  }, []);

  const handleCreateEvent = useCallback(() => {
    navigation.navigate('CreateEvent', { communityId });
  }, [navigation, communityId]);

  const formatEventDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatEventTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatShortDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDisplayedEvents = (): CommunityEvent[] => {
    switch (activeTab) {
      case 'attending':
        return myEvents;
      case 'past':
        return events.filter((e) => e.status === 'completed');
      default:
        return upcomingEvents;
    }
  };

  const renderEventCard = ({ item }: { item: CommunityEvent }) => (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={() => handleEventPress(item)}
      activeOpacity={0.9}
    >
      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.eventImage} />
      )}
      <TouchableOpacity
        style={styles.bookmarkButton}
        onPress={() => handleBookmark(item)}
      >
        <Icon
          name={item.isBookmarked ? 'heart' : 'heart-outline'}
          size={20}
          color={item.isBookmarked ? '#FF6B6B' : '#fff'}
        />
      </TouchableOpacity>

      {item.status === 'cancelled' && (
        <View style={styles.cancelledBadge}>
          <Text style={styles.cancelledText}>Cancelled</Text>
        </View>
      )}

      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBadge}>
            <Text style={styles.eventDateText}>{formatShortDate(item.date)}</Text>
            <Text style={styles.eventTimeText}>{item.time}</Text>
          </View>
          {item.isAttending && (
            <View style={styles.goingBadge}>
              <Icon name="checkmark-circle" size={14} color="#4CAF50" />
              <Text style={styles.goingText}>Going</Text>
            </View>
          )}
        </View>

        <Text style={styles.eventTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <View style={styles.eventLocation}>
          <Icon
            name={item.isVirtual ? 'videocam-outline' : 'location-outline'}
            size={14}
            color="#666"
          />
          <Text style={styles.eventLocationText} numberOfLines={1}>
            {item.isVirtual ? 'Virtual Event' : `${item.location.name}, ${item.location.city}`}
          </Text>
        </View>

        <View style={styles.eventFooter}>
          <View style={styles.attendeesInfo}>
            <View style={styles.attendeeAvatars}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.attendeeAvatar, { marginLeft: i > 1 ? -8 : 0 }]}
                >
                  <Icon name="person" size={10} color="#999" />
                </View>
              ))}
            </View>
            <Text style={styles.attendeesText}>
              {item.attendees}/{item.maxAttendees}
            </Text>
          </View>

          <View style={styles.priceTag}>
            <Text style={styles.priceText}>
              {item.price === 0 ? 'Free' : `$${item.price}`}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAttendee = ({ item }: { item: EventAttendee }) => (
    <TouchableOpacity
      style={styles.attendeeItem}
      onPress={() => navigation.navigate('Profile', { userId: item.id })}
    >
      <Image
        source={{ uri: item.photoUrl || 'https://via.placeholder.com/40' }}
        style={styles.attendeePhoto}
      />
      <Text style={styles.attendeeName} numberOfLines={1}>
        {item.name}
      </Text>
      {item.rsvpStatus === 'maybe' && (
        <View style={styles.maybeBadge}>
          <Text style={styles.maybeText}>Maybe</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEventDetail = () => {
    if (!selectedEvent) return null;

    return (
      <Modal
        visible={showEventDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEventDetail(false)}
      >
        <SafeAreaView style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setShowEventDetail(false)}>
              <Icon name="close" size={28} color="#1A1A1A" />
            </TouchableOpacity>
            <View style={styles.detailHeaderActions}>
              <TouchableOpacity
                style={styles.detailHeaderButton}
                onPress={() => handleBookmark(selectedEvent)}
              >
                <Icon
                  name={selectedEvent.isBookmarked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={selectedEvent.isBookmarked ? '#FF6B6B' : '#666'}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.detailHeaderButton}
                onPress={() => handleShare(selectedEvent)}
              >
                <Icon name="share-outline" size={24} color="#666" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedEvent.imageUrl && (
              <Image
                source={{ uri: selectedEvent.imageUrl }}
                style={styles.detailImage}
              />
            )}

            <View style={styles.detailContent}>
              {selectedEvent.status === 'cancelled' && (
                <View style={styles.cancelledBanner}>
                  <Icon name="alert-circle" size={20} color="#FF3B30" />
                  <Text style={styles.cancelledBannerText}>
                    This event has been cancelled
                  </Text>
                </View>
              )}

              <Text style={styles.detailTitle}>{selectedEvent.title}</Text>

              <View style={styles.detailMeta}>
                <View style={styles.detailMetaItem}>
                  <Icon name="calendar-outline" size={20} color="#FF6B6B" />
                  <View>
                    <Text style={styles.detailMetaLabel}>Date & Time</Text>
                    <Text style={styles.detailMetaValue}>
                      {formatEventDate(selectedEvent.date)}
                    </Text>
                    <Text style={styles.detailMetaSubvalue}>
                      {formatEventTime(selectedEvent.date)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.detailMetaItem}
                  onPress={() => handleOpenMap(selectedEvent)}
                >
                  <Icon
                    name={selectedEvent.isVirtual ? 'videocam-outline' : 'location-outline'}
                    size={20}
                    color="#FF6B6B"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailMetaLabel}>
                      {selectedEvent.isVirtual ? 'Virtual Event' : 'Location'}
                    </Text>
                    <Text style={styles.detailMetaValue}>
                      {selectedEvent.isVirtual
                        ? 'Join Online'
                        : selectedEvent.location.name}
                    </Text>
                    {!selectedEvent.isVirtual && (
                      <Text style={styles.detailMetaSubvalue}>
                        {selectedEvent.location.address}, {selectedEvent.location.city}
                      </Text>
                    )}
                  </View>
                  <Icon name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>About</Text>
                <Text style={styles.detailDescription}>
                  {selectedEvent.description}
                </Text>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailSectionTitle}>
                    Attendees ({selectedEvent.attendees})
                  </Text>
                  <Text style={styles.spotsText}>
                    {selectedEvent.maxAttendees - selectedEvent.attendees} spots left
                  </Text>
                </View>

                {attendeesLoading ? (
                  <ActivityIndicator color="#FF6B6B" style={{ marginVertical: 20 }} />
                ) : (
                  <FlatList
                    horizontal
                    data={eventAttendees}
                    renderItem={renderAttendee}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.attendeesList}
                    ListEmptyComponent={
                      <Text style={styles.noAttendeesText}>
                        No attendees yet. Be the first to RSVP!
                      </Text>
                    }
                  />
                )}
              </View>

              {selectedEvent.tags && selectedEvent.tags.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Tags</Text>
                  <View style={styles.tagsContainer}>
                    {selectedEvent.tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {selectedEvent.status !== 'cancelled' && (
            <View style={styles.detailFooter}>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price</Text>
                <Text style={styles.detailPrice}>
                  {selectedEvent.price === 0 ? 'Free' : `$${selectedEvent.price}`}
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.rsvpButton,
                  selectedEvent.isAttending && styles.rsvpButtonAttending,
                ]}
                onPress={() => handleRsvp(selectedEvent)}
              >
                <Text
                  style={[
                    styles.rsvpButtonText,
                    selectedEvent.isAttending && styles.rsvpButtonTextAttending,
                  ]}
                >
                  {selectedEvent.isAttending ? 'Cancel RSVP' : 'RSVP Now'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    );
  };

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
        <Text style={styles.headerTitle}>Events</Text>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
          <Icon name="add" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['upcoming', 'attending', 'past'] as TabType[]).map((tab) => (
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

      {/* Events List */}
      <FlatList
        data={getDisplayedEvents()}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => refreshEvents(communityId)}
            tintColor="#FF6B6B"
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#FF6B6B" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Icon name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'attending'
                  ? 'You have not RSVP\'d to any events yet'
                  : 'Check back later for upcoming events'}
              </Text>
            </View>
          )
        }
      />

      {/* Event Detail Modal */}
      {renderEventDetail()}
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
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  createButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  tabActive: {
    backgroundColor: '#FF6B6B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 150,
  },
  bookmarkButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelledBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelledText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
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
  eventDateBadge: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  eventTimeText: {
    fontSize: 11,
    color: '#FF6B6B',
    marginTop: 2,
  },
  goingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  goingText: {
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  attendeesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendeeAvatars: {
    flexDirection: 'row',
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
  attendeesText: {
    fontSize: 13,
    color: '#666',
  },
  priceTag: {
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loader: {
    marginTop: 48,
  },
  // Detail Modal Styles
  detailContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailHeaderButton: {
    padding: 8,
  },
  detailImage: {
    width: '100%',
    height: 200,
  },
  detailContent: {
    padding: 20,
  },
  cancelledBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  cancelledBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF3B30',
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  detailMeta: {
    gap: 16,
    marginBottom: 24,
  },
  detailMetaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailMetaLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  detailMetaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  detailMetaSubvalue: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  spotsText: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
  },
  attendeesList: {
    paddingVertical: 8,
    gap: 16,
  },
  attendeeItem: {
    alignItems: 'center',
    width: 70,
  },
  attendeePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 6,
  },
  attendeeName: {
    fontSize: 12,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  maybeBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  maybeText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '500',
  },
  noAttendeesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    color: '#666',
  },
  detailFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  priceContainer: {
    marginRight: 16,
  },
  priceLabel: {
    fontSize: 12,
    color: '#999',
  },
  detailPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rsvpButton: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rsvpButtonAttending: {
    backgroundColor: '#F5F5F5',
  },
  rsvpButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  rsvpButtonTextAttending: {
    color: '#666',
  },
});

export default CommunityEventsScreen;
