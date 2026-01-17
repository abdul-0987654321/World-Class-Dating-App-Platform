/**
 * Incoming Call Overlay
 * Full-screen overlay shown when receiving an incoming call
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
  Platform,
  Vibration,
} from 'react-native';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

interface IncomingCallOverlayProps {
  callerName: string;
  callerAvatar?: string;
  isVideoCall: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallOverlay: React.FC<IncomingCallOverlayProps> = ({
  callerName,
  callerAvatar,
  isVideoCall,
  onAccept,
  onReject,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Vibrate pattern
    const vibrationPattern = [0, 500, 200, 500, 200, 500];
    const vibrationInterval = setInterval(() => {
      Vibration.vibrate(vibrationPattern);
    }, 3000);
    Vibration.vibrate(vibrationPattern);

    // Entry animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => {
      clearInterval(vibrationInterval);
      Vibration.cancel();
    };
  }, []);

  const handleAccept = () => {
    Vibration.cancel();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onAccept());
  };

  const handleReject = () => {
    Vibration.cancel();
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => onReject());
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* @ts-expect-error BlurView has JSX element type incompatibility with React 18 types */}
      <BlurView intensity={90} tint="dark" style={styles.blur}>
        <View style={styles.content}>
          {/* Animated rings behind avatar */}
          <View style={styles.ringsContainer}>
            {[1, 2, 3].map((ring) => (
              <Animated.View
                key={ring}
                style={[
                  styles.ring,
                  {
                    width: 120 + ring * 40,
                    height: 120 + ring * 40,
                    borderRadius: (120 + ring * 40) / 2,
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.15],
                      outputRange: [0.3 - ring * 0.08, 0.15 - ring * 0.04],
                    }),
                    transform: [
                      {
                        scale: pulseAnim.interpolate({
                          inputRange: [1, 1.15],
                          outputRange: [1, 1 + ring * 0.05],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}

            {/* Avatar */}
            <Animated.View
              style={[
                styles.avatarContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              {callerAvatar ? (
                <Image source={{ uri: callerAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {callerName[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </Animated.View>
          </View>

          {/* Call info */}
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callType}>
            {isVideoCall ? 'Incoming Video Call' : 'Incoming Voice Call'}
          </Text>

          {/* Call actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>✕</Text>
              </View>
              <Text style={styles.actionLabel}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={handleAccept}
              activeOpacity={0.8}
            >
              <View style={styles.actionIconContainer}>
                <Text style={styles.actionIcon}>
                  {isVideoCall ? '📹' : '📞'}
                </Text>
              </View>
              <Text style={styles.actionLabel}>Accept</Text>
            </TouchableOpacity>
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionIcon}>💬</Text>
              <Text style={styles.quickActionText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickAction}>
              <Text style={styles.quickActionIcon}>⏰</Text>
              <Text style={styles.quickActionText}>Remind me</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  blur: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  ringsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  callerName: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  callType: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 48,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 64,
    marginBottom: 48,
  },
  actionButton: {
    alignItems: 'center',
  },
  rejectButton: {},
  acceptButton: {},
  actionIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 32,
  },
  actionLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 32,
  },
  quickAction: {
    alignItems: 'center',
    padding: 12,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
});

export default IncomingCallOverlay;
