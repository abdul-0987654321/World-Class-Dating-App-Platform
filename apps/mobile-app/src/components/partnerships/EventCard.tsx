import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

interface Event {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  description?: string;
  category: string;
  venue?: {
    name: string;
    address: {
      city: string;
      state: string;
    };
  };
  startDateTime: string;
  imageUrls: string[];
  priceRange: {
    min: number;
    max: number;
    currency: string;
  };
  isDateFriendly: boolean;
  isSoldOut: boolean;
}

interface EventCardProps {
  event: Event;
  onPress: (event: Event) => void;
  onGetTickets?: (event: Event) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export const EventCard: React.FC<EventCardProps> = ({ event, onPress, onGetTickets }) => {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const formatPrice = (min: number, max: number, currency: string): string => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    });
    if (min === max) {
      return formatter.format(min);
    }
    return `${formatter.format(min)} - ${formatter.format(max)}`;
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      concerts: 'M',
      sports: 'S',
      theater: 'T',
      comedy: 'C',
      festivals: 'F',
      experiences: 'E',
      classes: 'CL',
      food_drink: 'FD',
    };
    return icons[category] || 'E';
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(event)} activeOpacity={0.9}>
      <Image
        source={{
          uri: event.imageUrls[0] || 'https://via.placeholder.com/400x200',
        }}
        style={styles.image}
        resizeMode="cover"
      />

      {event.isDateFriendly && (
        <View style={styles.dateFriendlyBadge}>
          <Text style={styles.dateFriendlyText}>Perfect for Dates</Text>
        </View>
      )}

      {event.isSoldOut && (
        <View style={styles.soldOutOverlay}>
          <Text style={styles.soldOutText}>SOLD OUT</Text>
        </View>
      )}

      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{event.category.replace('_', ' ').toUpperCase()}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={2}>
          {event.name}
        </Text>

        <View style={styles.dateTimeContainer}>
          <Text style={styles.dateTimeText}>{formatDate(event.startDateTime)}</Text>
        </View>

        {event.venue && (
          <View style={styles.venueContainer}>
            <Text style={styles.venueName} numberOfLines={1}>
              {event.venue.name}
            </Text>
            <Text style={styles.venueLocation}>
              {event.venue.address.city}, {event.venue.address.state}
            </Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.price}>
            {formatPrice(event.priceRange.min, event.priceRange.max, event.priceRange.currency)}
          </Text>

          {onGetTickets && !event.isSoldOut && (
            <TouchableOpacity style={styles.ticketButton} onPress={() => onGetTickets(event)}>
              <Text style={styles.ticketButtonText}>Get Tickets</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  image: {
    width: '100%',
    height: 160,
  },
  dateFriendlyBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateFriendlyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
  },
  content: {
    padding: 16,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  venueContainer: {
    marginBottom: 12,
  },
  venueName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  venueLocation: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  ticketButton: {
    backgroundColor: '#5C6BC0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ticketButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EventCard;
