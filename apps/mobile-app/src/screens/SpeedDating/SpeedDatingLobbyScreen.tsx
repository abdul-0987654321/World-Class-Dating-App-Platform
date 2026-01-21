/**
 * SpeedDatingLobbyScreen - Waiting room before speed dating session starts
 * Shows queue status, participants preview, and countdown to session
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Dimensions,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSpeedDating } from '../../hooks/useSpeedDating';
import type { SpeedDatingParticipant } from '../../types/speedDating.types';

const { width, height } = Dimensions.get('window');

interface LobbyParams {
  eventId: string;
  eventTitle: string;
  roundDuration: number;
}

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ SpeedDatingLobby: LobbyParams }, 'SpeedDatingLobby'>;
}

// Mock participants for preview
const getMockParticipants = (): SpeedDatingParticipant[] => [
  {
    id: 'p1',
    name: 'Emma',
    age: 28,
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    bio: 'Adventure seeker & coffee lover',
  },
  {
    id: 'p2',
    name: 'Sophie',
    age: 26,
    photoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    bio: 'Art enthusiast, yoga practitioner',
  },
  {
    id: 'p3',
    name: 'Olivia',
    age: 29,
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    bio: 'Tech professional, loves hiking',
  },
  {
    id: 'p4',
    name: 'Mia',
    age: 27,
    photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    bio: 'Foodie, travel blogger',
  },
  {
    id: 'p5',
    name: 'Charlotte',
    age: 30,
    photoUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400',
    bio: 'Book lover, wine connoisseur',
  },
  {
    id: 'p6',
    name: 'Isabella',
    age: 25,
    photoUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    bio: 'Music lover, concert enthusiast',
  },
];

type LobbyState = 'joining' | 'waiting' | 'matching' | 'ready';

const SpeedDatingLobbyScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, eventTitle, roundDuration } = route.params;

  const [lobbyState, setLobbyState] = useState<LobbyState>('joining');
  const [queuePosition, setQueuePosition] = useState(0);
  const [totalInQueue, setTotalInQueue] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [participants, setParticipants] = useState<SpeedDatingParticipant[]>([]);

  const { joinQueue, leaveQueue, queueStatus } = useSpeedDating();

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Join the queue on mount
   */
  useEffect(() => {
    const initLobby = async () => {
      try {
        await joinQueue(eventId);
        setParticipants(getMockParticipants());
        setLobbyState('waiting');

        // Animate entrance
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();

        // Simulate queue updates
        simulateQueueProgress();
      } catch (error) {
        Alert.alert('Error', 'Failed to join the lobby. Please try again.');
        navigation.goBack();
      }
    };

    initLobby();

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  /**
   * Simulate queue progress for demo
   */
  const simulateQueueProgress = () => {
    setQueuePosition(3);
    setTotalInQueue(12);

    // Progress through queue
    setTimeout(() => setQueuePosition(2), 5000);
    setTimeout(() => setQueuePosition(1), 10000);
    setTimeout(() => {
      setLobbyState('matching');
      setTimeout(() => {
        setLobbyState('ready');
        startCountdown(10);
      }, 3000);
    }, 15000);
  };

  /**
   * Start countdown before session
   */
  const startCountdown = (seconds: number) => {
    setCountdownSeconds(seconds);

    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          // Navigate to session
          navigation.replace('SpeedDatingSession', {
            eventId,
            eventTitle,
            roundDuration: roundDuration * 60, // Convert to seconds
            participants,
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /**
   * Pulse animation for waiting state
   */
  useEffect(() => {
    if (lobbyState === 'waiting' || lobbyState === 'matching') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [lobbyState, pulseAnim]);

  /**
   * Handle leave lobby
   */
  const handleLeave = useCallback(() => {
    Alert.alert(
      'Leave Lobby',
      'Are you sure you want to leave? You will lose your spot in the queue.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            await leaveQueue();
            navigation.goBack();
          },
        },
      ]
    );
  }, [leaveQueue, navigation]);

  /**
   * Render participant avatar
   */
  const renderParticipant = ({ item, index }: { item: SpeedDatingParticipant; index: number }) => (
    <Animated.View
      style={[
        styles.participantItem,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [50 + index * 10, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Image source={{ uri: item.photoUrl }} style={styles.participantPhoto} />
      <Text style={styles.participantName}>{item.name}</Text>
      <Text style={styles.participantAge}>{item.age}</Text>
    </Animated.View>
  );

  /**
   * Render joining state
   */
  if (lobbyState === 'joining') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.joiningText}>Joining lobby...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleLeave}>
          <Icon name="close" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.eventTitle}>{eventTitle}</Text>
          <Text style={styles.roundInfo}>{roundDuration} min rounds</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Status Card */}
        <LinearGradient
          colors={
            lobbyState === 'ready'
              ? ['#4CAF50', '#66BB6A']
              : lobbyState === 'matching'
                ? ['#8B5CF6', '#A78BFA']
                : ['#FF6B6B', '#FF8E8E']
          }
          style={styles.statusCard}
        >
          <Animated.View
            style={[styles.statusIconContainer, { transform: [{ scale: pulseAnim }] }]}
          >
            {lobbyState === 'waiting' && <Text style={styles.statusIcon}>⏳</Text>}
            {lobbyState === 'matching' && <Text style={styles.statusIcon}>💫</Text>}
            {lobbyState === 'ready' && <Text style={styles.statusIcon}>🎉</Text>}
          </Animated.View>

          <Text style={styles.statusTitle}>
            {lobbyState === 'waiting' && 'Waiting in Queue'}
            {lobbyState === 'matching' && 'Finding Your Matches'}
            {lobbyState === 'ready' && 'Get Ready!'}
          </Text>

          <Text style={styles.statusSubtitle}>
            {lobbyState === 'waiting' && `Position ${queuePosition} of ${totalInQueue}`}
            {lobbyState === 'matching' && 'Pairing participants...'}
            {lobbyState === 'ready' && `Starting in ${countdownSeconds}s`}
          </Text>

          {lobbyState === 'ready' && (
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownNumber}>{countdownSeconds}</Text>
            </View>
          )}
        </LinearGradient>

        {/* Queue Progress */}
        {lobbyState === 'waiting' && (
          <View style={styles.queueProgress}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((totalInQueue - queuePosition + 1) / totalInQueue) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.estimatedTime}>Estimated wait: ~{queuePosition * 15}s</Text>
          </View>
        )}

        {/* Participants Preview */}
        <View style={styles.participantsSection}>
          <Text style={styles.sectionTitle}>Participants ({participants.length})</Text>
          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.participantsList}
          />
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Quick Tips</Text>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>📷</Text>
            <Text style={styles.tipText}>Make sure your camera and mic are working</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>💡</Text>
            <Text style={styles.tipText}>Find a quiet, well-lit space</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipIcon}>😊</Text>
            <Text style={styles.tipText}>Be yourself and have fun!</Text>
          </View>
        </View>
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
          <Text style={styles.leaveButtonText}>Leave Queue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  joiningText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  roundInfo: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  statusIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 40,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
  },
  countdownCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 4,
    borderColor: '#fff',
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  queueProgress: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 4,
  },
  estimatedTime: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  participantsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  participantsList: {
    paddingRight: 16,
  },
  participantItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  participantPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  participantAge: {
    fontSize: 12,
    color: '#666',
  },
  tipsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  bottomAction: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  leaveButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4444',
  },
});

export default SpeedDatingLobbyScreen;
