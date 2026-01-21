import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
  TextStyle,
  ViewStyle,
  ImageStyle,
} from 'react-native';

type StyleTypes = ViewStyle | TextStyle | ImageStyle;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Profile {
  id: string;
  name: string;
  age: number;
  bio?: string;
  photos: string[];
  distance?: number;
  occupation?: string;
  verified?: boolean;
}

interface SwipeCardProps {
  profile: Profile;
  onSwipeLeft: (profile: Profile) => void;
  onSwipeRight: (profile: Profile) => void;
  onSwipeUp: (profile: Profile) => void; // Super like
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  profile,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
}) => {
  const position = useRef(new Animated.ValueXY()).current;
  const swipeDirection = useRef<string | null>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });

      // Determine swipe direction
      if (Math.abs(gesture.dx) > Math.abs(gesture.dy)) {
        swipeDirection.current = gesture.dx > 0 ? 'right' : 'left';
      } else if (gesture.dy < -50) {
        swipeDirection.current = 'up';
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const SWIPE_THRESHOLD = 120;
      const SUPER_LIKE_THRESHOLD = -100;

      // Super like (swipe up)
      if (gesture.dy < SUPER_LIKE_THRESHOLD) {
        forceSwipe('up');
      }
      // Swipe right (like)
      else if (gesture.dx > SWIPE_THRESHOLD) {
        forceSwipe('right');
      }
      // Swipe left (pass)
      else if (gesture.dx < -SWIPE_THRESHOLD) {
        forceSwipe('left');
      }
      // Return to original position
      else {
        resetPosition();
      }
    },
  });

  const forceSwipe = (direction: 'left' | 'right' | 'up') => {
    const x =
      direction === 'left' ? -SCREEN_WIDTH * 1.5 : direction === 'right' ? SCREEN_WIDTH * 1.5 : 0;
    const y = direction === 'up' ? -SCREEN_HEIGHT : 0;

    Animated.timing(position, {
      toValue: { x, y },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      if (direction === 'left') onSwipeLeft(profile);
      else if (direction === 'right') onSwipeRight(profile);
      else if (direction === 'up') onSwipeUp(profile);

      position.setValue({ x: 0, y: 0 });
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
  };

  const getCardStyle = () => {
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
      outputRange: ['-10deg', '0deg', '10deg'],
      extrapolate: 'clamp',
    });

    return {
      ...position.getLayout(),
      transform: [{ rotate }],
    };
  };

  const getLikeOpacity = () => {
    return position.x.interpolate({
      inputRange: [0, SCREEN_WIDTH / 4],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
  };

  const getNopeOpacity = () => {
    return position.x.interpolate({
      inputRange: [-SCREEN_WIDTH / 4, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  const getSuperLikeOpacity = () => {
    return position.y.interpolate({
      inputRange: [-SCREEN_HEIGHT / 4, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
  };

  return (
    <Animated.View style={[styles.card, getCardStyle()]} {...panResponder.panHandlers}>
      {/* Like Label */}
      <Animated.View style={[styles.likeLabel, { opacity: getLikeOpacity() }]}>
        <Text style={styles.likeLabelText}>LIKE</Text>
      </Animated.View>

      {/* Nope Label */}
      <Animated.View style={[styles.nopeLabel, { opacity: getNopeOpacity() }]}>
        <Text style={styles.nopeLabelText}>NOPE</Text>
      </Animated.View>

      {/* Super Like Label */}
      <Animated.View style={[styles.superLikeLabel, { opacity: getSuperLikeOpacity() }]}>
        <Text style={styles.superLikeLabelText}>SUPER LIKE</Text>
      </Animated.View>

      {/* Profile Image */}
      <Image
        source={{ uri: profile.photos[0] || 'https://via.placeholder.com/400' }}
        style={styles.image}
        resizeMode="cover"
      />

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

        {profile.occupation && <Text style={styles.occupation}>{profile.occupation}</Text>}

        {profile.distance !== undefined && (
          <Text style={styles.distance}>{profile.distance} km away</Text>
        )}

        {profile.bio && (
          <Text style={styles.bio} numberOfLines={2}>
            {profile.bio}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => forceSwipe('left')}
        >
          <Text style={styles.actionButtonText}>✕</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.superLikeButton]}
          onPress={() => forceSwipe('up')}
        >
          <Text style={styles.actionButtonText}>★</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => forceSwipe('right')}
        >
          <Text style={styles.actionButtonText}>♥</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  likeLabel: {
    position: 'absolute',
    top: 50,
    left: 40,
    zIndex: 1000,
    borderWidth: 4,
    borderColor: '#4CAF50',
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: '-30deg' }],
  },
  likeLabelText: {
    color: '#4CAF50',
    fontSize: 32,
    fontWeight: 'bold',
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    right: 40,
    zIndex: 1000,
    borderWidth: 4,
    borderColor: '#F44336',
    borderRadius: 10,
    padding: 10,
    transform: [{ rotate: '30deg' }],
  },
  nopeLabelText: {
    color: '#F44336',
    fontSize: 32,
    fontWeight: 'bold',
  },
  superLikeLabel: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    zIndex: 1000,
    borderWidth: 4,
    borderColor: '#2196F3',
    borderRadius: 10,
    padding: 10,
  },
  superLikeLabelText: {
    color: '#2196F3',
    fontSize: 24,
    fontWeight: 'bold',
  },
  infoContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedBadge: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    width: 24,
    height: 24,
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
    marginBottom: 4,
  },
  distance: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.8,
  },
  bio: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 40,
  },
  actionButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#F44336',
  },
  superLikeButton: {
    borderWidth: 2,
    borderColor: '#2196F3',
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  actionButtonText: {
    fontSize: 28,
    fontWeight: 'bold' as const,
  },
});
