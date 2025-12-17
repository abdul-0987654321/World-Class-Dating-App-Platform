import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MatchedProfile {
  id: string;
  name: string;
  photo: string;
  age?: number;
}

interface MatchModalProps {
  visible: boolean;
  userPhoto?: string;
  matchedProfile: MatchedProfile | null;
  onSendMessage: () => void;
  onKeepSwiping: () => void;
  onClose: () => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  visible,
  userPhoto,
  matchedProfile,
  onSendMessage,
  onKeepSwiping,
  onClose,
}) => {
  const overlayOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const titleRotate = useSharedValue(-180);
  const leftImageScale = useSharedValue(0);
  const rightImageScale = useSharedValue(0);
  const heartScale = useSharedValue(0);
  const contentTranslateY = useSharedValue(50);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Reset all values
      overlayOpacity.value = 0;
      titleScale.value = 0;
      titleRotate.value = -180;
      leftImageScale.value = 0;
      rightImageScale.value = 0;
      heartScale.value = 0;
      contentTranslateY.value = 50;
      contentOpacity.value = 0;

      // Animate entrance
      overlayOpacity.value = withTiming(1, { duration: 300 });

      // Title animation - bouncy entrance with rotation
      titleScale.value = withDelay(
        200,
        withSpring(1, {
          damping: 8,
          stiffness: 100,
        })
      );
      titleRotate.value = withDelay(
        200,
        withSpring(0, {
          damping: 10,
          stiffness: 80,
        })
      );

      // Left image (user)
      leftImageScale.value = withDelay(
        400,
        withSpring(1, {
          damping: 10,
          stiffness: 100,
        })
      );

      // Right image (match)
      rightImageScale.value = withDelay(
        500,
        withSpring(1, {
          damping: 10,
          stiffness: 100,
        })
      );

      // Heart animation - pop and pulse
      heartScale.value = withDelay(
        600,
        withSequence(
          withSpring(1.2, { damping: 8, stiffness: 100 }),
          withSpring(1, { damping: 10, stiffness: 150 }),
          withSequence(
            withTiming(1.1, { duration: 500 }),
            withTiming(1, { duration: 500 })
          )
        )
      );

      // Content (message/subtitle)
      contentTranslateY.value = withDelay(700, withSpring(0));
      contentOpacity.value = withDelay(700, withTiming(1, { duration: 400 }));
    } else {
      // Animate exit
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: titleScale.value },
      { rotate: `${titleRotate.value}deg` },
    ],
  }));

  const leftImageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: leftImageScale.value }],
  }));

  const rightImageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rightImageScale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
    opacity: contentOpacity.value,
  }));

  if (!matchedProfile) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="transparent" barStyle="light-content" />

      <Animated.View style={[styles.overlay, overlayAnimatedStyle]}>
        <View style={styles.container}>
          {/* Confetti/Celebration Background */}
          <View style={styles.celebrationContainer}>
            {[...Array(20)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.confetti,
                  {
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    backgroundColor: ['#E91E63', '#2196F3', '#4CAF50', '#FFC107'][i % 4],
                    transform: [{ rotate: `${Math.random() * 360}deg` }],
                  },
                ]}
              />
            ))}
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            {/* Title */}
            <Animated.View style={titleAnimatedStyle}>
              <Text style={styles.title}>It's a Match!</Text>
            </Animated.View>

            {/* Profile Images */}
            <View style={styles.imagesContainer}>
              {/* User Image */}
              <Animated.View style={[styles.imageWrapper, leftImageAnimatedStyle]}>
                <Image
                  source={{
                    uri: userPhoto || 'https://via.placeholder.com/200',
                  }}
                  style={styles.profileImage}
                />
              </Animated.View>

              {/* Heart Icon */}
              <Animated.View style={[styles.heartContainer, heartAnimatedStyle]}>
                <Text style={styles.heartIcon}>💕</Text>
              </Animated.View>

              {/* Match Image */}
              <Animated.View style={[styles.imageWrapper, rightImageAnimatedStyle]}>
                <Image
                  source={{ uri: matchedProfile.photo }}
                  style={styles.profileImage}
                />
              </Animated.View>
            </View>

            {/* Subtitle */}
            <Animated.View style={contentAnimatedStyle}>
              <Text style={styles.subtitle}>
                You and {matchedProfile.name} liked each other!
              </Text>
              <Text style={styles.message}>
                Start a conversation and make a connection
              </Text>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View style={[styles.actionsContainer, contentAnimatedStyle]}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onSendMessage}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Send Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onKeepSwiping}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>Keep Swiping</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(233, 30, 99, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  celebrationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.7,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 30,
    width: '100%',
  },
  title: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    width: '100%',
  },
  imageWrapper: {
    borderRadius: 75,
    borderWidth: 5,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  heartContainer: {
    marginHorizontal: 20,
    zIndex: 10,
  },
  heartIcon: {
    fontSize: 60,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 40,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  actionsContainer: {
    width: '100%',
    gap: 14,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#E91E63',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
});
