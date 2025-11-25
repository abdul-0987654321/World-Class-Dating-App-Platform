/**
 * Event Details Screen
 * Detailed view of a single event
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

const { width } = Dimensions.get('window');

interface EventDetails {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  images: string[];
  date: Date;
  time: string;
  duration: string;
  location: {
    name: string;
    address: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  category: string;
  attendeeCount: number;
  maxAttendees: number;
  price: number;
  currency: string;
  host: {
    id: string;
    name: string;
    avatarUrl: string;
    bio: string;
    eventsHosted: number;
  };
  attendees: Array<{
    id: string;
    name: string;
    avatarUrl: string;
  }>;
  requirements: string[];
  whatToExpect: string[];
  isAttending: boolean;
  isBookmarked: boolean;
}

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ EventDetails: { eventId: string } }, 'EventDetails'>;
}

// Mock event data
const MOCK_EVENT: EventDetails = {
  id: '1',
  title: 'Speed Dating Night - Ages 25-35',
  description: 'Join us for an exciting evening of meeting new people! Our professional speed dating event brings together 30 amazing singles for an evening of fun, connection, and potential romance.\n\nEach date lasts 5 minutes, giving you just enough time to make a first impression. After the event, log into your Heartly app to see your matches!',
  imageUrl: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf',
  images: [
    'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf',
    'https://images.unsplash.com/photo-1530103862676-de8c9debad1d',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7',
  ],
  date: new Date('2025-12-01'),
  time: '7:00 PM - 10:00 PM',
  duration: '3 hours',
  location: {
    name: 'The Social Club',
    address: '123 Main Street',
    city: 'San Francisco, CA 94102',
    coordinates: { lat: 37.7749, lng: -122.4194 },
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
    bio: 'Professional event organizers specializing in singles events since 2020.',
    eventsHosted: 127,
  },
  attendees: [
    { id: '1', name: 'Sarah', avatarUrl: '' },
    { id: '2', name: 'Mike', avatarUrl: '' },
    { id: '3', name: 'Emma', avatarUrl: '' },
    { id: '4', name: 'John', avatarUrl: '' },
    { id: '5', name: 'Lisa', avatarUrl: '' },
  ],
  requirements: [
    'Be between ages 25-35',
    'Bring a valid ID',
    'Arrive 15 minutes early for check-in',
  ],
  whatToExpect: [
    'Meet 15+ singles in one evening',
    'Complimentary drink on arrival',
    'Matches revealed in-app next day',
    'Safe, inclusive environment',
  ],
  isAttending: false,
  isBookmarked: true,
};

const EventDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId } = route.params;
  const [event, setEvent] = useState<EventDetails>(MOCK_EVENT);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this event: ${event.title} on Heartly!`,
        url: `heartly://events/${event.id}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleBookmark = () => {
    setEvent({ ...event, isBookmarked: !event.isBookmarked });
  };

  const handleJoinEvent = () => {
    if (event.attendeeCount >= event.maxAttendees) {
      Alert.alert('Event Full', 'This event has reached maximum capacity.');
      return;
    }

    Alert.alert(
      'Join Event',
      `Confirm your attendance to "${event.title}" for $${event.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Join',
          onPress: () => {
            setEvent({
              ...event,
              isAttending: true,
              attendeeCount: event.attendeeCount + 1,
            });
            Alert.alert('Success', "You're going! See you there!");
          },
        },
      ]
    );
  };

  const handleLeaveEvent = () => {
    Alert.alert(
      'Leave Event',
      'Are you sure you want to cancel your attendance?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            setEvent({
              ...event,
              isAttending: false,
              attendeeCount: event.attendeeCount - 1,
            });
          },
        },
      ]
    );
  };

  const spotsLeft = event.maxAttendees - event.attendeeCount;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: event.images[selectedImageIndex] }}
            style={styles.heroImage}
          />

          {/* Back button */}
          <SafeAreaView style={styles.headerOverlay}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
                <Text style={styles.actionIcon}>📤</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleBookmark}>
                <Text style={styles.actionIcon}>
                  {event.isBookmarked ? '❤️' : '🤍'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          {/* Image thumbnails */}
          <View style={styles.imageThumbnails}>
            {event.images.map((img, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedImageIndex(index)}
              >
                <Image
                  source={{ uri: img }}
                  style={[
                    styles.thumbnail,
                    selectedImageIndex === index && styles.thumbnailActive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.content}>
          {/* Date & Category */}
          <View style={styles.metaRow}>
            <View style={styles.dateBadge}>
              <Text style={styles.dateText}>{formatDate(event.date)}</Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>⚡ Speed Dating</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{event.title}</Text>

          {/* Spots indicator */}
          <View style={styles.spotsContainer}>
            <View style={styles.spotsBar}>
              <View
                style={[
                  styles.spotsFill,
                  { width: `${(event.attendeeCount / event.maxAttendees) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.spotsText}>
              {spotsLeft} spots left • {event.attendeeCount} attending
            </Text>
          </View>

          {/* Quick Info Cards */}
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📍</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{event.location.name}</Text>
                <Text style={styles.infoSubvalue}>{event.location.city}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🕐</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{event.time}</Text>
                <Text style={styles.infoSubvalue}>{event.duration}</Text>
              </View>
            </View>
          </View>

          {/* Host */}
          <TouchableOpacity style={styles.hostCard}>
            <View style={styles.hostAvatar}>
              <Text style={styles.hostAvatarText}>
                {event.host.name[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostLabel}>Hosted by</Text>
              <Text style={styles.hostName}>{event.host.name}</Text>
              <Text style={styles.hostStats}>
                {event.host.eventsHosted} events hosted
              </Text>
            </View>
            <Text style={styles.hostArrow}>→</Text>
          </TouchableOpacity>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this event</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>

          {/* What to expect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What to expect</Text>
            {event.whatToExpect.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listIcon}>✓</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Requirements */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Requirements</Text>
            {event.requirements.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.listIcon}>•</Text>
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Attendees */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Who's going</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.attendeesScroll}
            >
              {event.attendees.map((attendee) => (
                <View key={attendee.id} style={styles.attendeeCard}>
                  <View style={styles.attendeeAvatar}>
                    <Text style={styles.attendeeAvatarText}>
                      {attendee.name[0]?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.attendeeName}>{attendee.name}</Text>
                </View>
              ))}
              <View style={styles.moreAttendees}>
                <Text style={styles.moreAttendeesText}>
                  +{event.attendeeCount - 5}
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Price</Text>
          <Text style={styles.priceValue}>
            {event.price === 0 ? 'Free' : `$${event.price}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.ctaButton,
            event.isAttending && styles.ctaButtonAttending,
          ]}
          onPress={event.isAttending ? handleLeaveEvent : handleJoinEvent}
        >
          <Text style={[
            styles.ctaButtonText,
            event.isAttending && styles.ctaButtonTextAttending,
          ]}>
            {event.isAttending ? "You're Going ✓" : 'Join Event'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  imageContainer: {
    position: 'relative',
  },
  heroImage: {
    width: width,
    height: 300,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#1A1A1A',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  imageThumbnails: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    gap: 8,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: '#fff',
  },
  content: {
    padding: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dateBadge: {
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  categoryBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  spotsContainer: {
    marginBottom: 20,
  },
  spotsBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    marginBottom: 8,
  },
  spotsFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 3,
  },
  spotsText: {
    fontSize: 14,
    color: '#666',
  },
  infoCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 12,
    borderRadius: 12,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  infoSubvalue: {
    fontSize: 12,
    color: '#666',
  },
  hostCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  hostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  hostAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  hostInfo: {
    flex: 1,
  },
  hostLabel: {
    fontSize: 12,
    color: '#999',
  },
  hostName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  hostStats: {
    fontSize: 14,
    color: '#666',
  },
  hostArrow: {
    fontSize: 20,
    color: '#999',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: '700',
  },
  listText: {
    flex: 1,
    fontSize: 16,
    color: '#444',
    lineHeight: 22,
  },
  attendeesScroll: {
    gap: 12,
  },
  attendeeCard: {
    alignItems: 'center',
  },
  attendeeAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  attendeeAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  attendeeName: {
    fontSize: 14,
    color: '#666',
  },
  moreAttendees: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreAttendeesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  priceContainer: {},
  priceLabel: {
    fontSize: 12,
    color: '#999',
  },
  priceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  ctaButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
  },
  ctaButtonAttending: {
    backgroundColor: '#E8F5E9',
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  ctaButtonTextAttending: {
    color: '#4CAF50',
  },
});

export default EventDetailsScreen;
