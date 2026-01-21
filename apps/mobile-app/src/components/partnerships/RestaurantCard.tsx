import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

interface Restaurant {
  id: string;
  partnerId: string;
  externalId: string;
  name: string;
  cuisine: string[];
  priceRange: number;
  rating?: number;
  reviewCount?: number;
  address: {
    city: string;
    state: string;
  };
  imageUrls: string[];
  isDateNight: boolean;
  romanticScore?: number;
  distance?: number;
}

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress: (restaurant: Restaurant) => void;
  onBook?: (restaurant: Restaurant) => void;
}

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 32;

export const RestaurantCard: React.FC<RestaurantCardProps> = ({ restaurant, onPress, onBook }) => {
  const getPriceLabel = (range: number): string => {
    return '$'.repeat(range);
  };

  const formatDistance = (miles?: number): string => {
    if (!miles) return '';
    return miles < 1 ? `${Math.round(miles * 10) / 10} mi` : `${Math.round(miles)} mi`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(restaurant)}
      activeOpacity={0.9}
    >
      <Image
        source={{
          uri: restaurant.imageUrls[0] || 'https://via.placeholder.com/400x200',
        }}
        style={styles.image}
        resizeMode="cover"
      />

      {restaurant.isDateNight && (
        <View style={styles.dateNightBadge}>
          <Text style={styles.dateNightText}>Date Night</Text>
        </View>
      )}

      {restaurant.romanticScore && restaurant.romanticScore >= 8 && (
        <View style={styles.romanticBadge}>
          <Text style={styles.romanticText}>Romantic</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {restaurant.name}
          </Text>
          <Text style={styles.price}>{getPriceLabel(restaurant.priceRange)}</Text>
        </View>

        <View style={styles.cuisineContainer}>
          {restaurant.cuisine.slice(0, 3).map((c, index) => (
            <View key={c} style={styles.cuisineTag}>
              <Text style={styles.cuisineText}>{c}</Text>
            </View>
          ))}
        </View>

        <View style={styles.infoRow}>
          {restaurant.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.starIcon}>*</Text>
              <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
              {restaurant.reviewCount && (
                <Text style={styles.reviewCount}>({restaurant.reviewCount})</Text>
              )}
            </View>
          )}

          <Text style={styles.location}>
            {restaurant.address.city}, {restaurant.address.state}
          </Text>

          {restaurant.distance && (
            <Text style={styles.distance}>{formatDistance(restaurant.distance)}</Text>
          )}
        </View>

        {onBook && (
          <TouchableOpacity style={styles.bookButton} onPress={() => onBook(restaurant)}>
            <Text style={styles.bookButtonText}>Book a Table</Text>
          </TouchableOpacity>
        )}
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
    height: 180,
  },
  dateNightBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dateNightText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  romanticBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF1493',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  romanticText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cuisineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  cuisineTag: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  cuisineText: {
    fontSize: 12,
    color: '#666666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  starIcon: {
    fontSize: 14,
    color: '#FFD700',
    marginRight: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewCount: {
    fontSize: 12,
    color: '#999999',
    marginLeft: 4,
  },
  location: {
    fontSize: 13,
    color: '#666666',
    marginRight: 8,
  },
  distance: {
    fontSize: 13,
    color: '#999999',
  },
  bookButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RestaurantCard;
