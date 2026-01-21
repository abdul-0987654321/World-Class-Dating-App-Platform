/**
 * SpeedDatingSessionScreen - Active speed dating session with video
 * Handles timer-based session rotation, video calls, and voting
 */

import React, { useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
  StatusBar,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { RtcLocalView, RtcRemoteView, VideoRenderMode } from 'react-native-agora';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSpeedDatingSession } from '../../hooks/useSpeedDatingSession';
import type {
  SpeedDatingParticipant,
  SpeedDatingSessionConfig,
} from '../../types/speedDating.types';

const { width, height } = Dimensions.get('window');

interface SessionParams {
  eventId: string;
  eventTitle: string;
  roundDuration: number;
  participants: SpeedDatingParticipant[];
}

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ SpeedDatingSession: SessionParams }, 'SpeedDatingSession'>;
}

const SpeedDatingSessionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { eventId, eventTitle, roundDuration, participants } = route.params;

  const config: SpeedDatingSessionConfig = {
    eventId,
    eventTitle,
    roundDuration,
    breakDuration: 5,
    totalRounds: participants.length,
    participants,
  };

  const {
    // Session state
    sessionState,
    currentRound,
    timeRemaining,
    currentPartner,
    likes,

    // Video state
    engine,
    isJoined,
    remoteUids,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    isFrontCamera,
    callStats,

    // Actions
    startSession,
    vote,
    leaveSession,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,

    // Helpers
    formatTime,
    getTimerColor,
    getProgress,
  } = useSpeedDatingSession({
    config,
    onSessionEnd: (likedIds, matchedIds) => {
      navigation.replace('SpeedDatingResults', {
        eventId,
        eventTitle,
        likes: likedIds,
        matches: matchedIds,
        roundsCompleted: currentRound,
        totalRounds: participants.length,
      });
    },
    onRoundChange: (round, partner) => {
      // Round change handled by UI update
    },
    onMatchFound: (partnerId) => {
      // Match notification is handled by the hook
    },
  });

  // Animation values
  const timerPulseAnim = useRef(new Animated.Value(1)).current;
  const voteScaleAnim = useRef(new Animated.Value(1)).current;
  const countdownScaleAnim = useRef(new Animated.Value(0.5)).current;

  /**
   * Animate timer when low
   */
  useEffect(() => {
    if (timeRemaining <= 10 && sessionState === 'active') {
      Animated.sequence([
        Animated.timing(timerPulseAnim, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(timerPulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeRemaining, sessionState, timerPulseAnim]);

  /**
   * Countdown animation
   */
  useEffect(() => {
    if (sessionState === 'countdown') {
      Animated.sequence([
        Animated.timing(countdownScaleAnim, {
          toValue: 1.5,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(countdownScaleAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [timeRemaining, sessionState, countdownScaleAnim]);

  /**
   * Handle leave session
   */
  const handleLeave = useCallback(() => {
    Alert.alert('Leave Session', "Are you sure you want to leave? You won't be able to rejoin.", [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: leaveSession,
      },
    ]);
  }, [leaveSession]);

  /**
   * Handle vote with animation
   */
  const handleVote = (liked: boolean) => {
    Animated.sequence([
      Animated.timing(voteScaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(voteScaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(voteScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      vote(liked);
    });
  };

  /**
   * Render waiting state
   */
  const renderWaitingState = () => (
    <View style={styles.waitingContainer}>
      <LinearGradient colors={['#FF6B6B', '#8B5CF6']} style={styles.waitingGradient}>
        <View style={styles.waitingContent}>
          <View style={styles.waitingIcon}>
            <Text style={styles.waitingEmoji}>🎥</Text>
          </View>
          <Text style={styles.waitingTitle}>{eventTitle}</Text>
          <Text style={styles.waitingSubtitle}>
            You'll have {Math.round(roundDuration / 60)} minutes with each person.
          </Text>
          <Text style={styles.waitingParticipants}>
            {participants.length} participants are ready!
          </Text>

          <TouchableOpacity style={styles.startButton} onPress={startSession}>
            <Text style={styles.startButtonText}>Start Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={handleLeave}>
            <Text style={styles.cancelButtonText}>Leave</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  /**
   * Render countdown state
   */
  const renderCountdownState = () => (
    <View style={styles.countdownContainer}>
      <Animated.View
        style={[styles.countdownNumber, { transform: [{ scale: countdownScaleAnim }] }]}
      >
        <Text style={styles.countdownText}>{timeRemaining}</Text>
      </Animated.View>
      <Text style={styles.countdownLabel}>Get ready to meet {currentPartner?.name}!</Text>
    </View>
  );

  /**
   * Render ended state
   */
  const renderEndedState = () => (
    <View style={styles.endedContainer}>
      <LinearGradient colors={['#FF6B6B', '#8B5CF6']} style={styles.endedGradient}>
        <Text style={styles.endedEmoji}>🎉</Text>
        <Text style={styles.endedTitle}>Session Complete!</Text>
        <Text style={styles.endedSubtitle}>
          You met {participants.length} people and liked {likes.size}!
        </Text>
        <View style={styles.endedInfo}>
          <Text style={styles.endedInfoText}>
            {likes.size > 0
              ? `You'll be notified if any of your ${likes.size} likes match with you!`
              : 'No worries, there are more events coming up!'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.seeResultsButton}
          onPress={() =>
            navigation.replace('SpeedDatingResults', {
              eventId,
              eventTitle,
              likes: Array.from(likes),
              matches: [],
              roundsCompleted: currentRound,
              totalRounds: participants.length,
            })
          }
        >
          <Text style={styles.seeResultsButtonText}>See Results</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  /**
   * Render voting overlay
   */
  const renderVotingOverlay = () => (
    <View style={styles.votingOverlay}>
      <Animated.View style={[styles.votingCard, { transform: [{ scale: voteScaleAnim }] }]}>
        <Image source={{ uri: currentPartner?.photoUrl }} style={styles.votingPhoto} />
        <Text style={styles.votingTitle}>Did you connect with {currentPartner?.name}?</Text>
        <Text style={styles.votingSubtitle}>If you both like each other, you'll be matched!</Text>
        <View style={styles.votingButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={() => handleVote(false)}>
            <Text style={styles.skipButtonEmoji}>👋</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.likeButton} onPress={() => handleVote(true)}>
            <Text style={styles.likeButtonEmoji}>❤️</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );

  /**
   * Render active session
   */
  const renderActiveSession = () => (
    <View style={styles.sessionContainer}>
      <StatusBar barStyle="light-content" />

      {/* Top Bar */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topBarContent}>
          {/* Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.roundText}>
              Round {currentRound} of {participants.length}
            </Text>
            <View style={styles.progressDots}>
              {participants.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.progressDot,
                    idx < currentRound && styles.progressDotCompleted,
                    idx === currentRound - 1 && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Timer */}
          <Animated.View
            style={[styles.timerContainer, { transform: [{ scale: timerPulseAnim }] }]}
          >
            <Text style={[styles.timerText, { color: getTimerColor() }]}>
              {formatTime(timeRemaining)}
            </Text>
            <Text style={styles.timerLabel}>
              {sessionState === 'break' ? 'Next round in...' : 'Time remaining'}
            </Text>
          </Animated.View>

          {/* Leave Button */}
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
            <Icon name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Video Area */}
      <View style={styles.videoArea}>
        {/* Remote Video / Partner */}
        <View style={styles.remoteVideoContainer}>
          {remoteUids.length > 0 ? (
            <RtcRemoteView.SurfaceView
              style={styles.remoteVideo}
              uid={remoteUids[0]}
              channelId=""
              renderMode={VideoRenderMode.Hidden}
            />
          ) : (
            <Image
              source={{ uri: currentPartner?.photoUrl }}
              style={styles.remoteVideoPlaceholder}
            />
          )}

          {/* Partner Info */}
          <View style={styles.partnerInfo}>
            <Text style={styles.partnerName}>
              {currentPartner?.name}, {currentPartner?.age}
            </Text>
            {currentPartner?.bio && <Text style={styles.partnerBio}>{currentPartner.bio}</Text>}
          </View>

          {/* Timer Overlay when low */}
          {timeRemaining <= 10 && sessionState === 'active' && (
            <View style={styles.timerOverlay}>
              <Text style={styles.timerOverlayText}>{timeRemaining}</Text>
            </View>
          )}
        </View>

        {/* Local Video (PiP) */}
        <View style={styles.localVideoContainer}>
          {isVideoEnabled && engine ? (
            <RtcLocalView.SurfaceView
              style={styles.localVideo}
              channelId=""
              renderMode={VideoRenderMode.Hidden}
            />
          ) : (
            <View style={styles.localVideoOff}>
              <Text style={styles.localVideoOffText}>📷</Text>
            </View>
          )}
        </View>
      </View>

      {/* Controls Bar */}
      <SafeAreaView style={styles.controlsBar}>
        <View style={styles.controlsContent}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
            <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            <Text style={styles.controlIcon}>{isVideoEnabled ? '📹' : '📷'}</Text>
            <Text style={styles.controlLabel}>{isVideoEnabled ? 'Stop' : 'Start'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleLeave}
          >
            <Text style={styles.controlIcon}>📞</Text>
            <Text style={styles.controlLabel}>End</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={toggleSpeaker}
          >
            <Text style={styles.controlIcon}>{isSpeakerOn ? '🔊' : '🔈'}</Text>
            <Text style={styles.controlLabel}>Speaker</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={switchCamera}>
            <Text style={styles.controlIcon}>🔄</Text>
            <Text style={styles.controlLabel}>Flip</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Voting Overlay */}
      {sessionState === 'voting' && renderVotingOverlay()}
    </View>
  );

  // Render based on session state
  if (sessionState === 'waiting') {
    return renderWaitingState();
  }

  if (sessionState === 'countdown') {
    return <View style={styles.countdownFullScreen}>{renderCountdownState()}</View>;
  }

  if (sessionState === 'ended') {
    return renderEndedState();
  }

  // Active, break, or voting states
  return renderActiveSession();
};

const styles = StyleSheet.create({
  // Waiting State
  waitingContainer: {
    flex: 1,
  },
  waitingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  waitingContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  waitingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  waitingEmoji: {
    fontSize: 40,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  waitingSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  waitingParticipants: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
  },
  startButton: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#999',
    fontSize: 16,
  },

  // Countdown State
  countdownFullScreen: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
  },
  countdownNumber: {
    marginBottom: 24,
  },
  countdownText: {
    fontSize: 120,
    fontWeight: '700',
    color: '#fff',
  },
  countdownLabel: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },

  // Ended State
  endedContainer: {
    flex: 1,
  },
  endedGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  endedEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  endedTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  endedSubtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 24,
    textAlign: 'center',
  },
  endedInfo: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    maxWidth: 320,
  },
  endedInfoText: {
    fontSize: 15,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 22,
  },
  seeResultsButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 30,
  },
  seeResultsButtonText: {
    color: '#8B5CF6',
    fontSize: 18,
    fontWeight: '700',
  },

  // Active Session
  sessionContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressSection: {
    flex: 1,
  },
  roundText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  progressDots: {
    flexDirection: 'row',
    gap: 4,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  progressDotActive: {
    backgroundColor: '#FF6B6B',
  },
  timerContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 32,
    fontWeight: '700',
  },
  timerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  leaveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Video Area
  videoArea: {
    flex: 1,
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#2A2A2A',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    resizeMode: 'cover',
  },
  partnerInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '70%',
  },
  partnerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  partnerBio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  timerOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
  },
  timerOverlayText: {
    fontSize: 100,
    fontWeight: '700',
    color: '#FF4444',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 120,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: {
    flex: 1,
  },
  localVideoOff: {
    flex: 1,
    backgroundColor: '#444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoOffText: {
    fontSize: 32,
  },

  // Controls Bar
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  controlButton: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 60,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  endCallButton: {
    backgroundColor: '#FF4444',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },

  // Voting Overlay
  votingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  votingCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  votingPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: '#FF6B6B',
  },
  votingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  votingSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 28,
  },
  votingButtons: {
    flexDirection: 'row',
    gap: 32,
  },
  skipButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonEmoji: {
    fontSize: 32,
  },
  likeButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonEmoji: {
    fontSize: 32,
  },
});

export default SpeedDatingSessionScreen;
