/**
 * Video Call Screen for React Native
 * Main video/audio calling interface
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  AppState,
  AppStateStatus,
} from 'react-native';
import { RtcSurfaceView, VideoCanvas } from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AgoraService, { NetworkQuality } from '../../services/AgoraService';
import BackgroundTimer from 'react-native-background-timer';

const { width, height } = Dimensions.get('window');

interface VideoCallScreenProps {
  callId: string;
  channelName: string;
  agoraToken: string;
  agoraAppId: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  callType: 'video' | 'audio';
  currentUserId: number;
  onCallEnd: () => void;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  callId,
  channelName,
  agoraToken,
  agoraAppId,
  participantId,
  participantName,
  participantAvatar,
  callType,
  currentUserId,
  onCallEnd,
}) => {
  const [agoraService] = useState(() => new AgoraService(agoraAppId));
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [remoteUsers, setRemoteUsers] = useState<number[]>([]);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(null);

  const durationTimerRef = useRef<number | null>(null);
  const controlsTimeoutRef = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  /**
   * Initialize Agora and join channel
   */
  useEffect(() => {
    const initCall = async () => {
      try {
        await agoraService.initialize();

        await agoraService.joinChannel(channelName, agoraToken, currentUserId, {
          video: callType === 'video',
          audio: true,
          videoQuality: 'high',
          enableBeauty: true,
          enableNoiseSuppression: true,
        });

        // Enable speaker by default
        await agoraService.enableSpeaker(true);

        startDurationTimer();
      } catch (error) {
        console.error('Failed to initialize call:', error);
        onCallEnd();
      }
    };

    initCall();

    return () => {
      stopDurationTimer();
      agoraService.destroy();
    };
  }, []);

  /**
   * Setup Agora event listeners
   */
  useEffect(() => {
    const handleUserJoined = (uid: number) => {
      setRemoteUsers((prev) => [...prev, uid]);
      setIsConnected(true);
    };

    const handleUserLeft = (uid: number) => {
      setRemoteUsers((prev) => prev.filter((id) => id !== uid));
      if (remoteUsers.length === 1) {
        setIsConnected(false);
      }
    };

    const handleNetworkQuality = (quality: NetworkQuality) => {
      setNetworkQuality(quality);
    };

    const handleError = (error: any) => {
      console.error('Agora error:', error);
      onCallEnd();
    };

    agoraService.on('user-joined', handleUserJoined);
    agoraService.on('user-left', handleUserLeft);
    agoraService.on('network-quality', handleNetworkQuality);
    agoraService.on('error', handleError);

    return () => {
      agoraService.off('user-joined', handleUserJoined);
      agoraService.off('user-left', handleUserLeft);
      agoraService.off('network-quality', handleNetworkQuality);
      agoraService.off('error', handleError);
    };
  }, [agoraService]);

  /**
   * Handle app state changes (background/foreground)
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - resume video if needed
    } else if (nextAppState.match(/inactive|background/)) {
      // App went to background - keep call active
    }
    appState.current = nextAppState;
  };

  /**
   * Start duration timer
   */
  const startDurationTimer = () => {
    durationTimerRef.current = BackgroundTimer.setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  };

  /**
   * Stop duration timer
   */
  const stopDurationTimer = () => {
    if (durationTimerRef.current) {
      BackgroundTimer.clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
  };

  /**
   * Auto-hide controls
   */
  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = BackgroundTimer.setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        BackgroundTimer.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  /**
   * Toggle microphone
   */
  const handleToggleMute = useCallback(async () => {
    try {
      const enabled = await agoraService.toggleMicrophone();
      setIsMuted(!enabled);
    } catch (error) {
      console.error('Failed to toggle mute:', error);
    }
  }, []);

  /**
   * Toggle camera
   */
  const handleToggleVideo = useCallback(async () => {
    try {
      const enabled = await agoraService.toggleCamera();
      setIsVideoEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle video:', error);
    }
  }, []);

  /**
   * Switch camera
   */
  const handleSwitchCamera = useCallback(async () => {
    try {
      await agoraService.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('Failed to switch camera:', error);
    }
  }, [isFrontCamera]);

  /**
   * Toggle speaker
   */
  const handleToggleSpeaker = useCallback(async () => {
    try {
      const newState = !isSpeakerEnabled;
      await agoraService.enableSpeaker(newState);
      setIsSpeakerEnabled(newState);
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
    }
  }, [isSpeakerEnabled]);

  /**
   * End call
   */
  const handleEndCall = useCallback(async () => {
    try {
      stopDurationTimer();
      await agoraService.leaveChannel();
      onCallEnd();
    } catch (error) {
      console.error('Failed to end call:', error);
      onCallEnd();
    }
  }, []);

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get network quality color
   */
  const getNetworkQualityColor = (): string => {
    if (!networkQuality) return '#10b981';
    const avgQuality = Math.max(networkQuality.txQuality, networkQuality.rxQuality);
    if (avgQuality <= 2) return '#10b981'; // green
    if (avgQuality <= 3) return '#3b82f6'; // blue
    if (avgQuality <= 4) return '#f59e0b'; // orange
    return '#ef4444'; // red
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Remote Video */}
      <View style={styles.remoteVideoContainer}>
        {isConnected && remoteUsers.length > 0 && callType === 'video' ? (
          <RtcSurfaceView
            style={styles.remoteVideo}
            canvas={{
              uid: remoteUsers[0],
              renderMode: 1,
              mirrorMode: 0,
            }}
          />
        ) : (
          <View style={styles.placeholderContainer}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{participantName[0]?.toUpperCase()}</Text>
            </View>
            <Text style={styles.participantName}>{participantName}</Text>
            <Text style={styles.statusText}>
              {isConnected ? 'Audio connected' : 'Connecting...'}
            </Text>
          </View>
        )}
      </View>

      {/* Local Video (PIP) */}
      {isVideoEnabled && callType === 'video' && (
        <View style={styles.localVideoContainer}>
          <RtcSurfaceView
            style={styles.localVideo}
            canvas={{
              uid: 0,
              renderMode: 1,
              mirrorMode: isFrontCamera ? 2 : 0,
            }}
          />
        </View>
      )}

      {/* Top Bar */}
      {showControls && (
        <View style={styles.topBar}>
          <View style={styles.callInfo}>
            <Text style={styles.topParticipantName}>{participantName}</Text>
            <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
          </View>
          <View style={styles.networkIndicator}>
            <Icon name="signal-cellular-alt" size={20} color={getNetworkQualityColor()} />
          </View>
        </View>
      )}

      {/* Controls */}
      <TouchableOpacity
        style={styles.touchableArea}
        activeOpacity={1}
        onPress={() => setShowControls(!showControls)}
      >
        {showControls && (
          <View style={styles.controlsContainer}>
            <View style={styles.controls}>
              {/* Mute */}
              <TouchableOpacity
                style={[styles.controlButton, isMuted && styles.controlButtonActive]}
                onPress={handleToggleMute}
              >
                <Icon name={isMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
                <Text style={styles.controlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>

              {/* Video Toggle */}
              {callType === 'video' && (
                <TouchableOpacity
                  style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
                  onPress={handleToggleVideo}
                >
                  <Icon
                    name={isVideoEnabled ? 'videocam' : 'videocam-off'}
                    size={28}
                    color="#fff"
                  />
                  <Text style={styles.controlLabel}>{isVideoEnabled ? 'Stop' : 'Start'}</Text>
                </TouchableOpacity>
              )}

              {/* End Call */}
              <TouchableOpacity
                style={[styles.controlButton, styles.endCallButton]}
                onPress={handleEndCall}
              >
                <Icon name="call-end" size={28} color="#fff" />
                <Text style={styles.controlLabel}>End</Text>
              </TouchableOpacity>

              {/* Speaker */}
              <TouchableOpacity
                style={[styles.controlButton, !isSpeakerEnabled && styles.controlButtonActive]}
                onPress={handleToggleSpeaker}
              >
                <Icon name={isSpeakerEnabled ? 'volume-up' : 'volume-off'} size={28} color="#fff" />
                <Text style={styles.controlLabel}>Speaker</Text>
              </TouchableOpacity>

              {/* Switch Camera */}
              {callType === 'video' && isVideoEnabled && (
                <TouchableOpacity style={styles.controlButton} onPress={handleSwitchCamera}>
                  <Icon name="flip-camera-ios" size={28} color="#fff" />
                  <Text style={styles.controlLabel}>Flip</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  remoteVideo: {
    flex: 1,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ec4899',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  participantName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  localVideoContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  localVideo: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  callInfo: {
    flex: 1,
  },
  topParticipantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  networkIndicator: {
    padding: 8,
  },
  touchableArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
  },
  endCallButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
  },
  controlLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#fff',
    marginTop: 4,
    textTransform: 'uppercase',
  },
});

export default VideoCallScreen;
