/**
 * Video Call Screen
 * Main screen for video calling in React Native
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { RTCView, MediaStream } from 'react-native-webrtc';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface VideoCallParams {
  callId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  isIncoming?: boolean;
  offer?: RTCSessionDescriptionInit;
}

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ VideoCall: VideoCallParams }, 'VideoCall'>;
}

type CallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';

const VideoCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId, userName, userAvatar, isIncoming, callId, offer } = route.params;

  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Animation for ringing state
  useEffect(() => {
    if (callState === 'ringing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [callState]);

  // Duration timer
  useEffect(() => {
    if (callState === 'connected') {
      durationInterval.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, [callState]);

  // Auto-hide controls
  useEffect(() => {
    if (callState === 'connected' && showControls) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [callState, showControls]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAcceptCall = useCallback(async () => {
    setCallState('connecting');
    // In production: Accept call via VideoCallClient
    setTimeout(() => setCallState('connected'), 1500);
  }, []);

  const handleRejectCall = useCallback(() => {
    // In production: Reject call via VideoCallClient
    navigation.goBack();
  }, [navigation]);

  const handleEndCall = useCallback(() => {
    Alert.alert(
      'End Call',
      'Are you sure you want to end this call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Call',
          style: 'destructive',
          onPress: () => {
            setCallState('ended');
            // In production: End call via VideoCallClient
            setTimeout(() => navigation.goBack(), 1000);
          },
        },
      ]
    );
  }, [navigation]);

  const handleStartCall = useCallback(async () => {
    setCallState('ringing');
    // In production: Start call via VideoCallClient
    // Simulate connection for demo
    setTimeout(() => setCallState('connecting'), 2000);
    setTimeout(() => setCallState('connected'), 3500);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    // In production: Toggle via VideoCallClient
  }, []);

  const toggleVideo = useCallback(() => {
    setIsVideoEnabled((prev) => !prev);
    // In production: Toggle via VideoCallClient
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerOn((prev) => !prev);
    // In production: Toggle speaker via InCallManager
  }, []);

  const switchCamera = useCallback(() => {
    setIsFrontCamera((prev) => !prev);
    // In production: Switch camera via VideoCallClient
  }, []);

  const toggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  // Render different states
  const renderIdleState = () => (
    <View style={styles.centerContainer}>
      <View style={styles.avatarLarge}>
        <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.userName}>{userName}</Text>
      <Text style={styles.statusText}>Ready to call</Text>

      <View style={styles.callActionsRow}>
        <TouchableOpacity
          style={[styles.callButton, styles.videoCallButton]}
          onPress={handleStartCall}
        >
          <Text style={styles.callButtonIcon}>📹</Text>
          <Text style={styles.callButtonText}>Video Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.callButton, styles.audioCallButton]}
          onPress={() => {
            setIsVideoEnabled(false);
            handleStartCall();
          }}
        >
          <Text style={styles.callButtonIcon}>📞</Text>
          <Text style={styles.callButtonText}>Audio Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRingingState = () => (
    <View style={styles.centerContainer}>
      <Animated.View
        style={[
          styles.avatarLarge,
          styles.avatarRinging,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
      </Animated.View>
      <Text style={styles.userName}>{userName}</Text>
      <Text style={styles.statusText}>
        {isIncoming ? 'Incoming call...' : 'Calling...'}
      </Text>

      {isIncoming ? (
        <View style={styles.incomingActions}>
          <TouchableOpacity
            style={[styles.roundButton, styles.rejectButton]}
            onPress={handleRejectCall}
          >
            <Text style={styles.roundButtonIcon}>✕</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roundButton, styles.acceptButton]}
            onPress={handleAcceptCall}
          >
            <Text style={styles.roundButtonIcon}>✓</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.roundButton, styles.rejectButton, styles.cancelButton]}
          onPress={handleRejectCall}
        >
          <Text style={styles.roundButtonIcon}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderConnectingState = () => (
    <View style={styles.centerContainer}>
      <View style={styles.avatarLarge}>
        <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.userName}>{userName}</Text>
      <Text style={styles.statusText}>Connecting...</Text>

      <View style={styles.loadingDots}>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={styles.dot} />
        ))}
      </View>
    </View>
  );

  const renderConnectedState = () => (
    <TouchableOpacity
      style={styles.connectedContainer}
      activeOpacity={1}
      onPress={toggleControls}
    >
      {/* Remote Video (Full Screen) */}
      <View style={styles.remoteVideoContainer}>
        {remoteStream ? (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.remoteVideoPlaceholder}>
            <View style={styles.avatarXLarge}>
              <Text style={styles.avatarTextLarge}>{userName[0]?.toUpperCase()}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Local Video (Picture-in-Picture) */}
      <View style={styles.localVideoContainer}>
        {isVideoEnabled && localStream ? (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
            mirror={isFrontCamera}
          />
        ) : (
          <View style={styles.localVideoOff}>
            <Text style={styles.localVideoOffText}>📷</Text>
          </View>
        )}
      </View>

      {/* Top Info Bar */}
      {showControls && (
        <SafeAreaView style={styles.topBar}>
          <TouchableOpacity
            style={styles.minimizeButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.minimizeIcon}>↓</Text>
          </TouchableOpacity>

          <View style={styles.callInfo}>
            <Text style={styles.callInfoName}>{userName}</Text>
            <Text style={styles.callInfoDuration}>{formatDuration(callDuration)}</Text>
          </View>

          <TouchableOpacity style={styles.switchCameraButton} onPress={switchCamera}>
            <Text style={styles.switchCameraIcon}>🔄</Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}

      {/* Bottom Controls */}
      {showControls && (
        <View style={styles.bottomControls}>
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
            <Text style={styles.controlLabel}>{isVideoEnabled ? 'Stop Video' : 'Start Video'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.endCallButton]}
            onPress={handleEndCall}
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
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEndedState = () => (
    <View style={styles.centerContainer}>
      <View style={styles.avatarLarge}>
        <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
      </View>
      <Text style={styles.userName}>{userName}</Text>
      <Text style={styles.statusText}>Call ended</Text>
      <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {callState === 'idle' && renderIdleState()}
      {callState === 'ringing' && renderRingingState()}
      {callState === 'connecting' && renderConnectingState()}
      {callState === 'connected' && renderConnectedState()}
      {callState === 'ended' && renderEndedState()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarRinging: {
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarXLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  avatarTextLarge: {
    fontSize: 64,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 32,
  },
  durationText: {
    fontSize: 20,
    color: '#FF6B6B',
    fontWeight: '600',
    marginTop: 16,
  },
  callActionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    gap: 8,
  },
  videoCallButton: {
    backgroundColor: '#FF6B6B',
  },
  audioCallButton: {
    backgroundColor: '#4CAF50',
  },
  callButtonIcon: {
    fontSize: 24,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 48,
  },
  roundButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FF4444',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    marginTop: 32,
  },
  roundButtonIcon: {
    fontSize: 32,
    color: '#fff',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF6B6B',
  },
  connectedContainer: {
    flex: 1,
  },
  remoteVideoContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  remoteVideo: {
    flex: 1,
  },
  remoteVideoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
  },
  localVideoContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 16,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: {
    flex: 1,
  },
  localVideoOff: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideoOffText: {
    fontSize: 32,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  minimizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  minimizeIcon: {
    fontSize: 20,
    color: '#fff',
  },
  callInfo: {
    alignItems: 'center',
  },
  callInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  callInfoDuration: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  switchCameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  switchCameraIcon: {
    fontSize: 20,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  controlButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 70,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  endCallButton: {
    backgroundColor: '#FF4444',
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  controlLabel: {
    fontSize: 12,
    color: '#fff',
  },
});

export default VideoCallScreen;
