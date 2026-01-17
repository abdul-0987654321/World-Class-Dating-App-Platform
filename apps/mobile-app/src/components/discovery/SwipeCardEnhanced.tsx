import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_THRESHOLD = 120;
const SUPER_LIKE_THRESHOLD = -100;

interface Profile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  distance?: number;
  occupation?: string;
  verified?: boolean;
  interests?: string[];
}

interface SwipeCardEnhancedProps {
  profile: Profile;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void;
  onViewProfile?: (profile: Profile) => void;
}

type GestureContext = {
  startX: number;
  startY: number;
};

export const SwipeCardEnhanced: React.FC<SwipeCardEnhancedProps> = ({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onViewProfile,
}) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const forceSwipe = (direction: 'left' | 'right' | 'up') => {
    'worklet';
    const x = direction === 'left' ? -SCREEN_WIDTH * 1.5 : direction === 'right' ? SCREEN_WIDTH * 1.5 : 0;
    const y = direction === 'up' ? -SCREEN_HEIGHT * 1.5 : 0;

    translateX.value = withTiming(x, { duration: 250 }, () => {
      if (direction === 'left') runOnJS(onSwipeLeft)(profile);
      else if (direction === 'right') runOnJS(onSwipeRight)(profile);
      else if (direction === 'up') runOnJS(onSwipeUp)(profile);
    });

    translateY.value = withTiming(y, { duration: 250 });
  };

  const gestureHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent, GestureContext>({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: (event) => {
      const { translationX, translationY, velocityX, velocityY } = event;

      // Check for super like (swipe up)
      if (translationY < SUPER_LIKE_THRESHOLD && Math.abs(translationX) < Math.abs(translationY)) {
        forceSwipe('up');
        return;
      }

      // Check for like/pass (swipe right/left)
      if (Math.abs(translationX) > SWIPE_THRESHOLD || Math.abs(velocityX) > 500) {
        if (translationX > 0) {
          forceSwipe('right');
        } else {
          forceSwipe('left');
        }
        return;
      }

      // Return to original position
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  });

  const cardAnimatedStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      [-10, 0, 10],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [0, SCREEN_WIDTH / 4],
      [0, 1],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const nopeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateX.value,
      [-SCREEN_WIDTH / 4, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const superLikeOpacityStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-SCREEN_HEIGHT / 4, 0],
      [1, 0],
      Extrapolate.CLAMP
    );
    return { opacity };
  });

  const handlePhotoTap = (event: any) => {
    const tapX = event.nativeEvent.locationX;
    const cardWidth = SCREEN_WIDTH - 40;

    if (tapX > cardWidth / 2 && currentPhotoIndex < profile.photos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1);
    } else if (tapX <= cardWidth / 2 && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1);
    }
  };

  const handleLike = () => {
    translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 250 }, () => {
      runOnJS(onSwipeRight)(profile);
    });
  };

  const handlePass = () => {
    translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 250 }, () => {
      runOnJS(onSwipeLeft)(profile);
    });
  };

  const handleSuperLike = () => {
    translateY.value = withTiming(-SCREEN_HEIGHT * 1.5, { duration: 250 }, () => {
      runOnJS(onSwipeUp)(profile);
    });
  };

  return (
    // @ts-expect-error PanGestureHandler has JSX element type incompatibility with React 18 types
    <PanGestureHandler onGestureEvent={gestureHandler}>
      <Animated.View style={[styles.card, cardAnimatedStyle]}>
        {/* Swipe Labels */}
        <Animated.View style={[styles.likeLabel, likeOpacityStyle]}>
          <Text style={styles.likeLabelText}>LIKE</Text>
        </Animated.View>

        <Animated.View style={[styles.nopeLabel, nopeOpacityStyle]}>
          <Text style={styles.nopeLabelText}>NOPE</Text>
        </Animated.View>

        <Animated.View style={[styles.superLikeLabel, superLikeOpacityStyle]}>
          <Text style={styles.superLikeLabelText}>SUPER LIKE</Text>
        </Animated.View>

        {/* Photo with tap navigation */}
        <Pressable onPress={handlePhotoTap} style={styles.imageContainer}>
          <Image
            source={{ uri: profile.photos[currentPhotoIndex] || 'https://via.placeholder.com/400' }}
            style={styles.image}
            resizeMode="cover"
          />

          {/* Photo indicators */}
          {profile.photos.length > 1 && (
            <View style={styles.photoIndicators}>
              {profile.photos.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.photoIndicator,
                    index === currentPhotoIndex && styles.photoIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}

          {/* Gradient overlay for text readability */}
          <View style={styles.gradientOverlay} />
        </Pressable>

        {/* Profile Info */}
        <View style={styles.infoContainer}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {profile.name}, {profile.age}
            </Text>
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedIcon}>✓</Text>
              </View>
            )}
          </View>

          {profile.occupation && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>💼</Text>
              <Text style={styles.occupation}>{profile.occupation}</Text>
            </View>
          )}

          {profile.distance !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.distance}>{profile.distance} km away</Text>
            </View>
          )}

          {profile.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {profile.bio}
            </Text>
          )}

          {/* Interests preview */}
          {profile.interests && profile.interests.length > 0 && (
            <View style={styles.interestsPreview}>
              {profile.interests.slice(0, 3).map((interest, index) => (
                <View key={index} style={styles.interestTag}>
                  <Text style={styles.interestText}>{interest}</Text>
                </View>
              ))}
              {profile.interests.length > 3 && (
                <View style={styles.interestTag}>
                  <Text style={styles.interestText}>+{profile.interests.length - 3}</Text>
                </View>
              )}
            </View>
          )}

          {/* View profile button */}
          {onViewProfile && (
            <TouchableOpacity
              style={styles.viewProfileButton}
              onPress={() => onViewProfile(profile)}
            >
              <Text style={styles.viewProfileText}>View Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={handlePass}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, styles.passButtonText]}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.superLikeButton]}
            onPress={handleSuperLike}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, styles.superLikeButtonText]}>★</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.likeButton]}
            onPress={handleLike}
            activeOpacity={0.7}
          >
            <Text style={[styles.actionButtonText, styles.likeButtonText]}>♥</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  photoIndicators: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 4,
  },
  photoIndicator: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1.5,
  },
  photoIndicatorActive: {
    backgroundColor: '#FFF',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
  },
  likeLabel: {
    position: 'absolute',
    top: 60,
    left: 30,
    zIndex: 1000,
    borderWidth: 5,
    borderColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: '-20deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  likeLabelText: {
    color: '#4CAF50',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  nopeLabel: {
    position: 'absolute',
    top: 60,
    right: 30,
    zIndex: 1000,
    borderWidth: 5,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    transform: [{ rotate: '20deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  nopeLabelText: {
    color: '#F44336',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  superLikeLabel: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    zIndex: 1000,
    borderWidth: 5,
    borderColor: '#2196F3',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  superLikeLabelText: {
    color: '#2196F3',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  verifiedIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  occupation: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  distance: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bio: {
    fontSize: 15,
    color: '#fff',
    marginTop: 8,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  interestsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  interestTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  interestText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  viewProfileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  viewProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 30,
    gap: 16,
  },
  actionButton: {
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  passButton: {
    width: 56,
    height: 56,
    borderWidth: 2.5,
    borderColor: '#F44336',
  },
  superLikeButton: {
    width: 64,
    height: 64,
    borderWidth: 2.5,
    borderColor: '#2196F3',
  },
  likeButton: {
    width: 56,
    height: 56,
    borderWidth: 2.5,
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  passButtonText: {
    color: '#F44336',
  },
  superLikeButtonText: {
    color: '#2196F3',
  },
  likeButtonText: {
    color: '#4CAF50',
  },
});
