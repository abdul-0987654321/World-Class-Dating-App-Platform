/**
 * SharedElementTransition - Smooth Screen Transitions for React Native
 *
 * Features:
 * - Profile card to detail page transitions
 * - Match celebration shared elements
 * - Photo gallery zoom transitions
 * - Native driver performance
 *
 * @package @flamoral/mobile
 */

import React, { useCallback, memo, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Dimensions, TouchableOpacity, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  runOnJS,
  SharedTransition,
  SharedTransitionType,
} from 'react-native-reanimated';

// ============================================================================
// CONSTANTS
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const TRANSITION_DURATION = 300;

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.8,
};

// ============================================================================
// TYPES
// ============================================================================

export interface SharedElementProps {
  id: string;
  children: React.ReactNode;
  style?: object;
}

export interface ProfileTransitionProps {
  profile: {
    id: string;
    name: string;
    photo: string;
  };
  source: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  onTransitionComplete?: () => void;
}

export interface PhotoZoomProps {
  photo: string;
  thumbnailRef: React.RefObject<View>;
  visible: boolean;
  onClose: () => void;
}

// ============================================================================
// SHARED TRANSITION CONFIGURATION
// ============================================================================

/**
 * Default shared transition for Reanimated 3
 * Use with react-navigation's shared element transitions
 */
export const defaultSharedTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    originX: withSpring(values.targetOriginX, SPRING_CONFIG),
    originY: withSpring(values.targetOriginY, SPRING_CONFIG),
    width: withSpring(values.targetWidth, SPRING_CONFIG),
    height: withSpring(values.targetHeight, SPRING_CONFIG),
    borderRadius: withSpring(values.targetBorderRadius || 0, SPRING_CONFIG),
  };
}).defaultTransitionType(SharedTransitionType.ANIMATION);

/**
 * Fading shared transition
 */
export const fadingSharedTransition = SharedTransition.custom((values) => {
  'worklet';
  return {
    originX: withTiming(values.targetOriginX, { duration: TRANSITION_DURATION }),
    originY: withTiming(values.targetOriginY, { duration: TRANSITION_DURATION }),
    width: withTiming(values.targetWidth, { duration: TRANSITION_DURATION }),
    height: withTiming(values.targetHeight, { duration: TRANSITION_DURATION }),
    opacity: withTiming(1, { duration: TRANSITION_DURATION / 2 }),
  };
});

// ============================================================================
// PROFILE CARD TO DETAIL TRANSITION
// ============================================================================

export const ProfileTransitionOverlay = memo<ProfileTransitionProps>(
  ({ profile, source, onTransitionComplete }) => {
    const progress = useSharedValue(0);
    const imageScale = useSharedValue(1);

    // Target dimensions (full screen)
    const targetWidth = SCREEN_WIDTH;
    const targetHeight = SCREEN_HEIGHT * 0.6;
    const targetX = 0;
    const targetY = 0;

    useEffect(() => {
      // Start transition
      progress.value = withTiming(1, { duration: TRANSITION_DURATION }, (finished) => {
        if (finished && onTransitionComplete) {
          runOnJS(onTransitionComplete)();
        }
      });
    }, [progress, onTransitionComplete]);

    const animatedContainerStyle = useAnimatedStyle(() => {
      const width = interpolate(
        progress.value,
        [0, 1],
        [source.width, targetWidth],
        Extrapolate.CLAMP
      );

      const height = interpolate(
        progress.value,
        [0, 1],
        [source.height, targetHeight],
        Extrapolate.CLAMP
      );

      const x = interpolate(progress.value, [0, 1], [source.x, targetX], Extrapolate.CLAMP);

      const y = interpolate(progress.value, [0, 1], [source.y, targetY], Extrapolate.CLAMP);

      const borderRadius = interpolate(progress.value, [0, 1], [20, 0], Extrapolate.CLAMP);

      return {
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        borderRadius,
        overflow: 'hidden',
      };
    });

    const overlayStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
    }));

    return (
      <View style={StyleSheet.absoluteFill}>
        {/* Background overlay */}
        <Animated.View style={[styles.overlay, overlayStyle]} />

        {/* Transitioning image */}
        <Animated.View style={animatedContainerStyle}>
          <Image
            source={{ uri: profile.photo }}
            style={styles.transitionImage}
            resizeMode="cover"
          />
        </Animated.View>
      </View>
    );
  }
);

ProfileTransitionOverlay.displayName = 'ProfileTransitionOverlay';

// ============================================================================
// PHOTO ZOOM TRANSITION
// ============================================================================

export const PhotoZoomModal = memo<PhotoZoomProps>(({ photo, thumbnailRef, visible, onClose }) => {
  const progress = useSharedValue(0);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const thumbnailPosition = useRef({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (visible) {
      // Measure thumbnail position
      thumbnailRef.current?.measure((x, y, width, height, pageX, pageY) => {
        thumbnailPosition.current = { x: pageX, y: pageY, width, height };
        progress.value = withSpring(1, SPRING_CONFIG);
      });
    } else {
      progress.value = withTiming(0, { duration: 200 });
    }
  }, [visible, progress, thumbnailRef]);

  const handleClose = useCallback(() => {
    progress.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [progress, onClose]);

  const containerStyle = useAnimatedStyle(() => {
    const { x, y, width, height } = thumbnailPosition.current;

    const imageWidth = interpolate(
      progress.value,
      [0, 1],
      [width, SCREEN_WIDTH],
      Extrapolate.CLAMP
    );

    const imageHeight = interpolate(
      progress.value,
      [0, 1],
      [height, SCREEN_HEIGHT],
      Extrapolate.CLAMP
    );

    const imageX = interpolate(progress.value, [0, 1], [x, 0], Extrapolate.CLAMP);

    const imageY = interpolate(progress.value, [0, 1], [y, 0], Extrapolate.CLAMP);

    return {
      position: 'absolute',
      left: imageX + translateX.value,
      top: imageY + translateY.value,
      width: imageWidth,
      height: imageHeight,
      transform: [{ scale: scale.value }],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    backgroundColor: `rgba(0, 0, 0, ${interpolate(progress.value, [0, 1], [0, 0.95])})`,
  }));

  if (!visible && progress.value === 0) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Dark overlay */}
      <Animated.View style={[StyleSheet.absoluteFill, overlayStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
      </Animated.View>

      {/* Zoomed image */}
      <Animated.View style={containerStyle}>
        <Image source={{ uri: photo }} style={styles.zoomedImage} resizeMode="contain" />
      </Animated.View>

      {/* Close button */}
      <Animated.View style={[styles.closeButton, { opacity: progress }]}>
        <TouchableOpacity onPress={handleClose}>
          <View style={styles.closeButtonInner}>
            <Animated.Text style={styles.closeButtonText}>&#10005;</Animated.Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
});

PhotoZoomModal.displayName = 'PhotoZoomModal';

// ============================================================================
// MATCH CELEBRATION SHARED ELEMENT
// ============================================================================

export interface MatchTransitionProps {
  userPhoto: string;
  matchPhoto: string;
  visible: boolean;
  onAnimationComplete?: () => void;
}

export const MatchTransitionOverlay = memo<MatchTransitionProps>(
  ({ userPhoto, matchPhoto, visible, onAnimationComplete }) => {
    const progress = useSharedValue(0);
    const heartScale = useSharedValue(0);
    const leftImageX = useSharedValue(-SCREEN_WIDTH);
    const rightImageX = useSharedValue(SCREEN_WIDTH);

    useEffect(() => {
      if (visible) {
        // Animate images in from sides
        leftImageX.value = withSpring(SCREEN_WIDTH * 0.15, SPRING_CONFIG);
        rightImageX.value = withSpring(SCREEN_WIDTH * 0.55, SPRING_CONFIG);

        // Fade in overlay
        progress.value = withTiming(1, { duration: 300 });

        // Pop heart after images arrive
        setTimeout(() => {
          heartScale.value = withSpring(1, {
            damping: 8,
            stiffness: 100,
          });
        }, 200);

        // Notify completion
        setTimeout(() => {
          onAnimationComplete?.();
        }, 600);
      } else {
        progress.value = withTiming(0, { duration: 200 });
        heartScale.value = 0;
        leftImageX.value = -SCREEN_WIDTH;
        rightImageX.value = SCREEN_WIDTH;
      }
    }, [visible, progress, heartScale, leftImageX, rightImageX, onAnimationComplete]);

    const overlayStyle = useAnimatedStyle(() => ({
      opacity: progress.value,
    }));

    const leftImageStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: leftImageX.value }],
    }));

    const rightImageStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: rightImageX.value - SCREEN_WIDTH * 0.55 }],
    }));

    const heartStyle = useAnimatedStyle(() => ({
      transform: [{ scale: heartScale.value }],
      opacity: heartScale.value,
    }));

    if (!visible && progress.value === 0) {
      return null;
    }

    return (
      <Animated.View style={[StyleSheet.absoluteFill, styles.matchOverlay, overlayStyle]}>
        {/* User image */}
        <Animated.View style={[styles.matchImageContainer, leftImageStyle]}>
          <Image source={{ uri: userPhoto }} style={styles.matchImage} />
        </Animated.View>

        {/* Heart */}
        <Animated.View style={[styles.heartContainer, heartStyle]}>
          <Animated.Text style={styles.heartEmoji}>&#128149;</Animated.Text>
        </Animated.View>

        {/* Match image */}
        <Animated.View style={[styles.matchImageContainer, rightImageStyle]}>
          <Image source={{ uri: matchPhoto }} style={styles.matchImage} />
        </Animated.View>
      </Animated.View>
    );
  }
);

MatchTransitionOverlay.displayName = 'MatchTransitionOverlay';

// ============================================================================
// UTILITY HOOK: useMeasure
// ============================================================================

export const useMeasure = () => {
  const ref = useRef<View>(null);

  const measure = useCallback((): Promise<{
    x: number;
    y: number;
    width: number;
    height: number;
  }> => {
    return new Promise((resolve) => {
      if (ref.current) {
        ref.current.measure((x, y, width, height, pageX, pageY) => {
          resolve({ x: pageX, y: pageY, width, height });
        });
      } else {
        resolve({ x: 0, y: 0, width: 0, height: 0 });
      }
    });
  }, []);

  return { ref, measure };
};

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  transitionImage: {
    width: '100%',
    height: '100%',
  },
  zoomedImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: 20,
    zIndex: 10,
  },
  closeButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  matchOverlay: {
    backgroundColor: 'rgba(233, 30, 99, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  matchImage: {
    width: '100%',
    height: '100%',
  },
  heartContainer: {
    marginHorizontal: 20,
  },
  heartEmoji: {
    fontSize: 50,
  },
});

export default {
  ProfileTransitionOverlay,
  PhotoZoomModal,
  MatchTransitionOverlay,
  defaultSharedTransition,
  fadingSharedTransition,
  useMeasure,
};
