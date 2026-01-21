/**
 * Flamoral React Native Profile Card Component
 * Premium swipeable profile card for dating app
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
// Note: Install react-native-linear-gradient or expo-linear-gradient
// import LinearGradient from 'react-native-linear-gradient';

// Fallback gradient component
const LinearGradient: React.FC<{
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  style?: any;
  children?: React.ReactNode;
}> = ({ colors, style, children }) => (
  <View style={[style, { backgroundColor: colors[colors.length - 1] }]}>{children}</View>
);

// ============================================
// Types
// ============================================

export interface ProfileCardProps {
  name: string;
  age: number;
  location?: string;
  imageUrl: string | ImageSourcePropType;
  isVerified?: boolean;
  isOnline?: boolean;
  bio?: string;
  distance?: string;
  interests?: string[];
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
  onPress?: () => void;
}

// ============================================
// Colors
// ============================================

const colors = {
  flameRed: '#D62839',
  emberOrange: '#FF6E35',
  velvetWine: '#7A1020',
  richCharcoal: '#1A1A1A',
  emberGold: '#D9A657',
  softIvory: '#FFF6EE',
  smokeGrey: '#C4C4C4',
  success: '#2ECC71',
  info: '#3498DB',
  error: '#E74C3C',
  white: '#FFFFFF',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// ============================================
// Component
// ============================================

export const ProfileCard: React.FC<ProfileCardProps> = ({
  name,
  age,
  location,
  imageUrl,
  isVerified = false,
  isOnline = false,
  bio,
  distance,
  interests = [],
  onLike,
  onPass,
  onSuperLike,
  onPress,
}) => {
  const imageSource = typeof imageUrl === 'string' ? { uri: imageUrl } : imageUrl;

  return (
    <View style={styles.container}>
      {/* Main Card */}
      <TouchableOpacity activeOpacity={0.95} onPress={onPress} style={styles.card}>
        {/* Image */}
        <Image source={imageSource} style={styles.image} resizeMode="cover" />

        {/* Gradient Overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(26, 26, 26, 0.3)', 'rgba(26, 26, 26, 0.85)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.overlay}
        />

        {/* Online Indicator */}
        {isOnline && <View style={styles.onlineIndicator} />}

        {/* Profile Info */}
        <View style={styles.infoContainer}>
          {/* Name Row */}
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {name}, {age}
            </Text>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>

          {/* Location */}
          {location && (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.location}>
                {location}
                {distance && <Text style={styles.distance}> • {distance}</Text>}
              </Text>
            </View>
          )}

          {/* Bio */}
          {bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {bio}
            </Text>
          )}

          {/* Interests */}
          {interests.length > 0 && (
            <View style={styles.interestsContainer}>
              {interests.slice(0, 4).map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Pass Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={onPass}
          activeOpacity={0.8}
        >
          <Text style={styles.passIcon}>✕</Text>
        </TouchableOpacity>

        {/* Super Like Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.superLikeButton]}
          onPress={onSuperLike}
          activeOpacity={0.8}
        >
          <Text style={styles.superLikeIcon}>★</Text>
        </TouchableOpacity>

        {/* Like Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={onLike}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.flameRed, colors.emberOrange]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.likeButtonGradient}
          >
            <Text style={styles.likeIcon}>♥</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: 'center',
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.richCharcoal,
    shadowColor: colors.richCharcoal,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  onlineIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 14,
    height: 14,
    backgroundColor: colors.success,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontFamily: 'PlayfairDisplay-Bold',
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  verifiedIcon: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  location: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: colors.white,
    opacity: 0.9,
  },
  distance: {
    opacity: 0.7,
  },
  bio: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.white,
    opacity: 0.9,
    marginBottom: 12,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 100,
  },
  interestText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    color: colors.white,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.richCharcoal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  passButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.smokeGrey,
  },
  passIcon: {
    fontSize: 24,
    color: colors.smokeGrey,
    fontWeight: '300',
  },
  superLikeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.info,
  },
  superLikeIcon: {
    fontSize: 20,
    color: colors.info,
  },
  likeButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  likeButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  likeIcon: {
    fontSize: 28,
    color: colors.white,
  },
});

export default ProfileCard;
