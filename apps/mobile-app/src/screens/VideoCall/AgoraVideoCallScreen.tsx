/**
 * Agora Video Call Screen
 * Full implementation with Agora SDK integration
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { RtcLocalView, RtcRemoteView, VideoRenderMode } from 'react-native-agora';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useVideoCall } from '../../hooks/useVideoCall';
import videoCallService from '../../services/videoCallService';
import CallControls from '../../components/VideoCall/CallControls';
import { useSocket } from '../../hooks/useSocket';

const { width, height } = Dimensions.get('window');

interface VideoCallParams {
  callId?: string;
  userId: string;
  userName: string;
  callType: 'video' | 'audio';
  isIncoming?: boolean;
  channelName?: string;
  token?: string;
  appId?: string;
}

interface Props {
  navigation: StackNavigationProp<any>;
  route: RouteProp<{ VideoCall: VideoCallParams }, 'VideoCall'>;
}

type CallState = 'idle' | 'ringing' | 'connecting' | 'connected' | 'ended';

const AgoraVideoCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const {
    userId,
    userName,
    callType,
    isIncoming,
    callId: initialCallId,
    channelName: initialChannel,
    token: initialToken,
    appId: initialAppId,
  } = route.params;

  const [callState, setCallState] = useState<CallState>(isIncoming ? 'ringing' : 'idle');
  const [callId, setCallId] = useState<string | undefined>(initialCallId);
  const [channelName, setChannelName] = useState<string | undefined>(initialChannel);
  const [token, setToken] = useState<string | undefined>(initialToken);
  const [appId, setAppId] = useState<string | undefined>(initialAppId);
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState<number | undefined>();
  const [remainingMinutes, setRemainingMinutes] = useState<number | undefined>();

  const socket = useSocket();
  const controlsTimer = useRef<NodeJS.Timeout | null>(null);
  const durationTimer = useRef<NodeJS.Timeout | null>(null);
  const maxDurationWarningShown = useRef(false);

  const {
    isJoined,
    remoteUids,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    isFrontCamera,
    callStats,
    initializeEngine,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
  } = useVideoCall({
    appId: appId!,
    channel: channelName!,
    token: token!,
    isAudioOnly: callType === 'audio',
    enableHD: false, // Can be determined by subscription tier
  });

  /**
   * Initialize call
   */
  const initiateCall = useCallback(async () => {
    try {
      setCallState('connecting');

      const response = await videoCallService.initiateCall(
        userId,
        callType,
        false // HD setting
      );

      if (response.success) {
        setCallId(response.callId);
        setChannelName(response.channelName);
        setToken(response.token);
        setAppId(response.appId);
        setMaxDuration(response.maxDuration);
        setRemainingMinutes(response.remainingMinutes);

        // Initialize Agora engine
        await initializeEngine(response.appId!);

        // Join channel
        await joinChannel(response.channelName!, response.token!);

        // Notify receiver via socket
        socket?.emit('call_initiated', {
          callId: response.callId,
          callerId: socket.userId,
          receiverId: userId,
          callType,
        });

        setCallState('ringing');
      } else {
        Alert.alert('Call Failed', response.error || 'Unable to initiate call');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Initiate call error:', error);
      Alert.alert('Error', 'Failed to start call');
      navigation.goBack();
    }
  }, [userId, callType, socket, initializeEngine, joinChannel]);

  /**
   * Accept incoming call
   */
  const acceptCall = useCallback(async () => {
    try {
      setCallState('connecting');

      const response = await videoCallService.acceptCall(callId!);

      if (response.success) {
        setChannelName(response.channelName);
        setToken(response.token);

        // Initialize Agora engine
        if (appId) {
          await initializeEngine(appId);
          await joinChannel(response.channelName!, response.token!);
        }

        // Notify caller via socket
        socket?.emit('call_accepted', {
          callId,
          callerId: userId,
          receiverId: socket.userId,
        });

        setCallState('connected');
      } else {
        Alert.alert('Call Failed', response.error || 'Unable to accept call');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Accept call error:', error);
      Alert.alert('Error', 'Failed to accept call');
      navigation.goBack();
    }
  }, [callId, appId, userId, socket, initializeEngine, joinChannel]);

  /**
   * Reject incoming call
   */
  const rejectCall = useCallback(async () => {
    try {
      if (callId) {
        await videoCallService.rejectCall(callId);

        // Notify caller via socket
        socket?.emit('call_rejected', {
          callId,
          callerId: userId,
          receiverId: socket.userId,
          reason: 'declined',
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Reject call error:', error);
      navigation.goBack();
    }
  }, [callId, userId, socket, navigation]);

  /**
   * End active call
   */
  const endCall = useCallback(async () => {
    try {
      // Leave Agora channel
      await leaveChannel();

      // End call on backend
      if (callId) {
        await videoCallService.endCall(callId, 'completed', {
          avgBitrate: callStats.bitrate,
          packetLoss: callStats.packetLoss,
          quality: callStats.quality,
        });

        // Notify other party via socket
        socket?.emit('call_ended', {
          callId,
          callerId: socket.userId,
          receiverId: userId,
          duration: callDuration,
        });
      }

      setCallState('ended');

      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    } catch (error) {
      console.error('End call error:', error);
      navigation.goBack();
    }
  }, [callId, userId, socket, callDuration, callStats, leaveChannel]);

  /**
   * Handle end call confirmation
   */
  const handleEndCallPress = useCallback(() => {
    Alert.alert('End Call', 'Are you sure you want to end this call?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Call',
        style: 'destructive',
        onPress: endCall,
      },
    ]);
  }, [endCall]);

  /**
   * Auto-hide controls
   */
  useEffect(() => {
    if (callState === 'connected' && showControls) {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }

      controlsTimer.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }

    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [callState, showControls]);

  /**
   * Track call duration
   */
  useEffect(() => {
    if (callState === 'connected') {
      durationTimer.current = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;

          // Check max duration warning (5 minutes before limit)
          if (
            maxDuration &&
            !maxDurationWarningShown.current &&
            newDuration >= (maxDuration - 5) * 60
          ) {
            maxDurationWarningShown.current = true;
            Alert.alert(
              'Call Limit',
              `You have ${maxDuration - Math.floor(newDuration / 60)} minutes remaining on this call.`,
              [{ text: 'OK' }]
            );
          }

          // Auto-end call at max duration
          if (maxDuration && newDuration >= maxDuration * 60) {
            Alert.alert(
              'Call Ended',
              'Your call duration limit has been reached. Upgrade to premium for unlimited calls.',
              [{ text: 'OK', onPress: endCall }]
            );
          }

          return newDuration;
        });
      }, 1000);
    }

    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
      }
    };
  }, [callState, maxDuration, endCall]);

  /**
   * Socket event listeners
   */
  useEffect(() => {
    if (!socket) return;

    // Call accepted
    socket.on('call_accepted', () => {
      setCallState('connected');
    });

    // Call rejected
    socket.on('call_rejected', () => {
      Alert.alert('Call Declined', 'The user declined your call');
      navigation.goBack();
    });

    // Call ended by other party
    socket.on('call_ended', () => {
      Alert.alert('Call Ended', 'The other party ended the call');
      leaveChannel();
      navigation.goBack();
    });

    // Call busy
    socket.on('call_busy', () => {
      Alert.alert('User Busy', 'The user is currently on another call');
      navigation.goBack();
    });

    return () => {
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_ended');
      socket.off('call_busy');
    };
  }, [socket, navigation, leaveChannel]);

  /**
   * Initialize call on mount
   */
  useEffect(() => {
    if (!isIncoming && !callId) {
      initiateCall();
    }
  }, []);

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Toggle controls visibility
   */
  const toggleControls = () => {
    setShowControls((prev) => !prev);
  };

  /**
   * Render different call states
   */
  const renderContent = () => {
    if (callState === 'idle' || callState === 'connecting') {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.statusText}>Connecting...</Text>
        </View>
      );
    }

    if (callState === 'ringing') {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.statusText}>{isIncoming ? 'Incoming call...' : 'Ringing...'}</Text>

          {isIncoming ? (
            <View style={styles.incomingActions}>
              <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
                <Text style={styles.buttonIcon}>✕</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
                <Text style={styles.buttonIcon}>✓</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      );
    }

    if (callState === 'connected') {
      return (
        <TouchableOpacity
          style={styles.connectedContainer}
          activeOpacity={1}
          onPress={toggleControls}
        >
          {/* Remote video */}
          {callType === 'video' && remoteUids.length > 0 ? (
            <RtcRemoteView.SurfaceView
              uid={remoteUids[0]}
              channelId={channelName!}
              renderMode={VideoRenderMode.Hidden}
              style={styles.remoteVideo}
            />
          ) : (
            <View style={styles.remoteVideoPlaceholder}>
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarTextLarge}>{userName[0]?.toUpperCase()}</Text>
              </View>
            </View>
          )}

          {/* Local video */}
          {callType === 'video' && isVideoEnabled && (
            <View style={styles.localVideoContainer}>
              <RtcLocalView.SurfaceView
                renderMode={VideoRenderMode.Hidden}
                style={styles.localVideo}
                mirror={isFrontCamera}
              />
            </View>
          )}

          {/* Top bar */}
          {showControls && (
            <SafeAreaView style={styles.topBar}>
              <Text style={styles.callInfo}>{userName}</Text>
              <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
            </SafeAreaView>
          )}

          {/* Bottom controls */}
          {showControls && (
            <CallControls
              isMuted={isMuted}
              isVideoEnabled={isVideoEnabled}
              isSpeakerOn={isSpeakerOn}
              isAudioOnly={callType === 'audio'}
              showSwitchCamera={callType === 'video'}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onToggleSpeaker={toggleSpeaker}
              onSwitchCamera={switchCamera}
              onEndCall={handleEndCallPress}
              style={styles.bottomControls}
            />
          )}
        </TouchableOpacity>
      );
    }

    if (callState === 'ended') {
      return (
        <View style={styles.centerContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.statusText}>Call ended</Text>
          <Text style={styles.durationText}>{formatDuration(callDuration)}</Text>
        </View>
      );
    }

    return null;
  };

  return <View style={styles.container}>{renderContent()}</View>;
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
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  avatarLarge: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
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
  incomingActions: {
    flexDirection: 'row',
    gap: 48,
  },
  rejectButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonIcon: {
    fontSize: 32,
    color: '#fff',
  },
  connectedContainer: {
    flex: 1,
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  callInfo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  callDuration: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 2,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default AgoraVideoCallScreen;
