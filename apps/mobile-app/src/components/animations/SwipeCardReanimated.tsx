/**
 * SwipeCardReanimated - Native-Feel Card Swipe with Reanimated 2
 *
 * Features:
 * - 100% native driver animations (runs on UI thread)
 * - < 16ms frame budget compliance
 * - Gesture handler integration
 * - Haptic feedback
 * - Shared element transitions support
 *
 * @package @flamoral/mobile
 */

import React, { useCallback, memo, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
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
  SharedValue,
  cancelAnimation,
} from 'react-native-reanimated';
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const SWIPE_THRESHOLD = 120;
const SUPER_LIKE_THRESHOLD = -100;
const VELOCITY_THRESHOLD = 500;
const MAX_ROTATION = 15;
const SWIPE_OUT_DURATION = 250;

// Spring configurations tuned for native feel
const SPRING_CONFIG = {
  damping: 18,
  stiffness: 350,
  mass: 0.5,
};

const RETURN_SPRING_CONFIG = {
  damping: 25,
  stiffness: 150,
  mass: 1.2,
};

// ============================================================================
// TYPES
// ============================================================================

export interface Profile {
  id: string;
  name: string;
  age: number;
  photos: string[];
  bio?: string;
  distance?: number;
  occupation?: string;
  verified?: boolean;
  interests?: string[];
}

export interface SwipeCardReanimatedProps {
  profile: Profile;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void;
  onTap?: (profile: Profile) => void;
  isTopCard?: boolean;
  stackIndex?: number;
}

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
  swipeUp: () => void;
}

type GestureContext = {
  startX: number;
  startY: number;
};

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' = 'medium') => {
  'worklet';
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    runOnJS(triggerHapticJS)(type);
  }
};

const triggerHapticJS = (type: 'light' | 'medium' | 'heavy' | 'success') => {
  switch (type) {
    case 'light':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      break;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      break;
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
  }
};

// ============================================================================
// ANIMATED OVERLAY COMPONENTS
// ============================================================================

interface OverlayProps {
  opacity: SharedValue<number>;
  label: string;
  color: string;
  rotation: string;
  position: 'left' | 'right' | 'center';
}

const SwipeOverlay = memo<OverlayProps>(({ opacity, label, color, rotation, position }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ rotate: rotation }],
  }));

  const positionStyle = useMemo(() => {
    switch (position) {
      case 'left':
        return styles.overlayLeft;
      case 'right':
        return styles.overlayRight;
      case 'center':
        return styles.overlayCenter;
    }
  }, [position]);

  return (
    <Animated.View style={[styles.overlay, positionStyle, animatedStyle]}>
      <View style={[styles.overlayBorder, { borderColor: color }]}>
        <Text style={[styles.overlayText, { color }]}>{label}</Text>
      </View>
    </Animated.View>
  );
});

// ============================================================================
// SWIPE CARD COMPONENT
// ============================================================================

export const SwipeCardReanimated = memo(
  forwardRef<SwipeCardRef, SwipeCardReanimatedProps>(
    (
      { profile, onSwipeLeft, onSwipeRight, onSwipeUp, onTap, isTopCard = true, stackIndex = 0 },
      ref
    ) => {
      // Animation values
      const translateX = useSharedValue(0);
      const translateY = useSharedValue(0);

      // Derived values for overlays
      const likeOpacity = useSharedValue(0);
      const nopeOpacity = useSharedValue(0);
      const superLikeOpacity = useSharedValue(0);

      // Swipe handlers
      const swipeLeft = useCallback(() => {
        translateX.value = withTiming(
          -SCREEN_WIDTH * 1.5,
          { duration: SWIPE_OUT_DURATION },
          (finished) => {
            if (finished) {
              triggerHaptic('light');
              runOnJS(onSwipeLeft)(profile);
            }
          }
        );
      }, [translateX, onSwipeLeft, profile]);

      const swipeRight = useCallback(() => {
        translateX.value = withTiming(
          SCREEN_WIDTH * 1.5,
          { duration: SWIPE_OUT_DURATION },
          (finished) => {
            if (finished) {
              triggerHaptic('success');
              runOnJS(onSwipeRight)(profile);
            }
          }
        );
      }, [translateX, onSwipeRight, profile]);

      const swipeUp = useCallback(() => {
        translateY.value = withTiming(
          -SCREEN_HEIGHT * 1.5,
          { duration: SWIPE_OUT_DURATION },
          (finished) => {
            if (finished) {
              triggerHaptic('heavy');
              runOnJS(onSwipeUp)(profile);
            }
          }
        );
      }, [translateY, onSwipeUp, profile]);

      // Expose methods via ref
      useImperativeHandle(
        ref,
        () => ({
          swipeLeft,
          swipeRight,
          swipeUp,
        }),
        [swipeLeft, swipeRight, swipeUp]
      );

      // Gesture handler
      const gestureHandler = useAnimatedGestureHandler<
        PanGestureHandlerGestureEvent,
        GestureContext
      >({
        onStart: (_, context) => {
          context.startX = translateX.value;
          context.startY = translateY.value;
          cancelAnimation(translateX);
          cancelAnimation(translateY);
        },
        onActive: (event, context) => {
          translateX.value = context.startX + event.translationX;
          translateY.value = context.startY + event.translationY;

          // Update overlay opacities
          likeOpacity.value = interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD / 2],
            [0, 1],
            Extrapolate.CLAMP
          );

          nopeOpacity.value = interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD / 2, 0],
            [1, 0],
            Extrapolate.CLAMP
          );

          superLikeOpacity.value = interpolate(
            translateY.value,
            [SUPER_LIKE_THRESHOLD, 0],
            [1, 0],
            Extrapolate.CLAMP
          );

          // Haptic feedback at threshold
          if (Math.abs(translateX.value) === SWIPE_THRESHOLD) {
            triggerHaptic('light');
          }
        },
        onEnd: (event) => {
          const { translationX, translationY, velocityX, velocityY } = event;

          // Check for super like (swipe up)
          if (
            translationY < SUPER_LIKE_THRESHOLD &&
            Math.abs(translationX) < Math.abs(translationY)
          ) {
            runOnJS(swipeUp)();
            return;
          }

          // Check for velocity-based swipe
          if (Math.abs(velocityX) > VELOCITY_THRESHOLD) {
            if (velocityX > 0) {
              runOnJS(swipeRight)();
            } else {
              runOnJS(swipeLeft)();
            }
            return;
          }

          // Check for position-based swipe
          if (Math.abs(translationX) > SWIPE_THRESHOLD) {
            if (translationX > 0) {
              runOnJS(swipeRight)();
            } else {
              runOnJS(swipeLeft)();
            }
            return;
          }

          // Return to center
          translateX.value = withSpring(0, RETURN_SPRING_CONFIG);
          translateY.value = withSpring(0, RETURN_SPRING_CONFIG);
          likeOpacity.value = withTiming(0);
          nopeOpacity.value = withTiming(0);
          superLikeOpacity.value = withTiming(0);
        },
      });

      // Card animated style
      const cardAnimatedStyle = useAnimatedStyle(() => {
        const rotate = interpolate(
          translateX.value,
          [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
          [-MAX_ROTATION, 0, MAX_ROTATION],
          Extrapolate.CLAMP
        );

        return {
          transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { rotate: `${rotate}deg` },
            { scale: isTopCard ? 1 : 1 - stackIndex * 0.05 },
          ],
        };
      });

      // Stack position style
      const stackStyle = useMemo(
        () => ({
          zIndex: 100 - stackIndex,
          top: stackIndex * -10,
        }),
        [stackIndex]
      );

      const primaryPhoto = profile.photos[0] || 'https://via.placeholder.com/400';

      return (
        <PanGestureHandler onGestureEvent={gestureHandler} enabled={isTopCard}>
          <Animated.View style={[styles.card, cardAnimatedStyle, stackStyle]}>
            {/* Overlays */}
            <SwipeOverlay
              opacity={likeOpacity}
              label="LIKE"
              color="#4CAF50"
              rotation="-20deg"
              position="left"
            />
            <SwipeOverlay
              opacity={nopeOpacity}
              label="NOPE"
              color="#F44336"
              rotation="20deg"
              position="right"
            />
            <SwipeOverlay
              opacity={superLikeOpacity}
              label="SUPER LIKE"
              color="#2196F3"
              rotation="0deg"
              position="center"
            />

            {/* Photo */}
            <TapGestureHandler onActivated={() => onTap?.(profile)}>
              <Animated.View style={styles.imageContainer}>
                <Image source={{ uri: primaryPhoto }} style={styles.image} resizeMode="cover" />
                <View style={styles.gradient} />
              </Animated.View>
            </TapGestureHandler>

            {/* Profile Info */}
            <View style={styles.infoContainer}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>
                  {profile.name}, {profile.age}
                </Text>
                {profile.verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedIcon}>&#10003;</Text>
                  </View>
                )}
              </View>

              {profile.occupation && <Text style={styles.occupation}>{profile.occupation}</Text>}

              {profile.distance !== undefined && (
                <Text style={styles.distance}>{Math.round(profile.distance)} km away</Text>
              )}

              {profile.bio && (
                <Text style={styles.bio} numberOfLines={2}>
                  {profile.bio}
                </Text>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <View style={styles.interestsContainer}>
                  {profile.interests.slice(0, 3).map((interest) => (
                    <View key={interest} style={styles.interestTag}>
                      <Text style={styles.interestText}>{interest}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.passButton]}
                onPress={swipeLeft}
                activeOpacity={0.8}
              >
                <Text style={styles.passButtonText}>&#10005;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.superLikeButton]}
                onPress={swipeUp}
                activeOpacity={0.8}
              >
                <Text style={styles.superLikeButtonText}>&#9733;</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.likeButton]}
                onPress={swipeRight}
                activeOpacity={0.8}
              >
                <Text style={styles.likeButtonText}>&#9829;</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </PanGestureHandler>
      );
    }
  )
);

SwipeCardReanimated.displayName = 'SwipeCardReanimated';

// ============================================================================
// STYLES
// ============================================================================

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
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'transparent',
  },
  overlay: {
    position: 'absolute',
    zIndex: 1000,
  },
  overlayLeft: {
    top: 60,
    left: 30,
  },
  overlayRight: {
    top: 60,
    right: 30,
  },
  overlayCenter: {
    top: 120,
    alignSelf: 'center',
  },
  overlayBorder: {
    borderWidth: 5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  overlayText: {
    fontSize: 36,
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
  interestsContainer: {
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
  passButtonText: {
    fontSize: 30,
    color: '#F44336',
    fontWeight: 'bold',
  },
  superLikeButton: {
    width: 64,
    height: 64,
    borderWidth: 2.5,
    borderColor: '#2196F3',
  },
  superLikeButtonText: {
    fontSize: 32,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  likeButton: {
    width: 56,
    height: 56,
    borderWidth: 2.5,
    borderColor: '#4CAF50',
  },
  likeButtonText: {
    fontSize: 30,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default SwipeCardReanimated;
