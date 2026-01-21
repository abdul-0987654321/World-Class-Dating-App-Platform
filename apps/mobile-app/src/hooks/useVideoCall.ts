/**
 * useVideoCall Hook
 * Manages Agora video calling functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import RtcEngine, {
  ChannelProfile,
  ClientRole,
  RtcEngineContext,
  VideoCanvas,
  VideoMirrorMode,
} from 'react-native-agora';
import { Platform, PermissionsAndroid } from 'react-native';
import InCallManager from 'react-native-incall-manager';

export interface VideoCallConfig {
  appId: string;
  channel: string;
  token: string;
  uid?: number;
  isAudioOnly?: boolean;
  enableHD?: boolean;
}

export interface CallStats {
  duration: number;
  bitrate: number;
  packetLoss: number;
  quality: 'poor' | 'fair' | 'good' | 'excellent';
}

export const useVideoCall = (config?: VideoCallConfig) => {
  const [engine, setEngine] = useState<RtcEngine | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [callStats, setCallStats] = useState<CallStats>({
    duration: 0,
    bitrate: 0,
    packetLoss: 0,
    quality: 'good',
  });

  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Request camera and microphone permissions
   */
  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.CAMERA,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ]);

        return (
          granted['android.permission.CAMERA'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.RECORD_AUDIO'] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.error('Permission error:', err);
        return false;
      }
    }
    return true;
  };

  /**
   * Initialize Agora RTC Engine
   */
  const initializeEngine = useCallback(
    async (appId: string) => {
      try {
        const hasPermission = await requestPermissions();
        if (!hasPermission) {
          throw new Error('Permissions not granted');
        }

        const rtcEngine = await RtcEngine.createWithContext(new RtcEngineContext(appId));

        // Enable video if not audio-only
        if (!config?.isAudioOnly) {
          await rtcEngine.enableVideo();
        }

        await rtcEngine.enableAudio();

        // Set channel profile
        await rtcEngine.setChannelProfile(ChannelProfile.Communication);

        // Set client role
        await rtcEngine.setClientRole(ClientRole.Broadcaster);

        // Enable HD if premium user
        if (config?.enableHD) {
          await rtcEngine.setVideoEncoderConfiguration({
            dimensions: { width: 1280, height: 720 },
            frameRate: 30,
            bitrate: 2000,
            minBitrate: 1000,
            orientationMode: 0,
            degradationPreference: 2,
            mirrorMode: 0,
          });
        } else {
          // Standard definition
          await rtcEngine.setVideoEncoderConfiguration({
            dimensions: { width: 640, height: 480 },
            frameRate: 15,
            bitrate: 800,
            minBitrate: 400,
            orientationMode: 0,
            degradationPreference: 2,
            mirrorMode: 0,
          });
        }

        // Event listeners
        rtcEngine.addListener('UserJoined', (uid, elapsed) => {
          setRemoteUids((prev) => [...prev, uid]);
        });

        rtcEngine.addListener('UserOffline', (uid, reason) => {
          setRemoteUids((prev) => prev.filter((id) => id !== uid));
        });

        rtcEngine.addListener('JoinChannelSuccess', (channel, uid, elapsed) => {
          setIsJoined(true);

          // Start duration timer
          durationTimerRef.current = setInterval(() => {
            setCallDuration((prev) => prev + 1);
          }, 1000);

          // Start stats collection
          statsTimerRef.current = setInterval(() => {
            collectCallStats(rtcEngine);
          }, 2000);
        });

        rtcEngine.addListener('RemoteVideoStateChanged', (uid, state, reason, elapsed) => {
          // Video state changed - no action needed
        });

        rtcEngine.addListener('NetworkQuality', (uid, txQuality, rxQuality) => {
          // Update quality based on network
          const quality =
            txQuality <= 2 && rxQuality <= 2
              ? 'excellent'
              : txQuality <= 4 && rxQuality <= 4
                ? 'good'
                : txQuality <= 5 && rxQuality <= 5
                  ? 'fair'
                  : 'poor';

          setCallStats((prev) => ({ ...prev, quality }));
        });

        rtcEngine.addListener('Error', (errorCode) => {
          console.error('Agora error:', errorCode);
        });

        setEngine(rtcEngine);
        return rtcEngine;
      } catch (error) {
        console.error('Engine initialization error:', error);
        throw error;
      }
    },
    [config]
  );

  /**
   * Join a video call channel
   */
  const joinChannel = useCallback(
    async (channel: string, token: string, uid?: number) => {
      if (!engine) {
        throw new Error('Engine not initialized');
      }

      try {
        // Start call manager
        InCallManager.start({ media: config?.isAudioOnly ? 'audio' : 'video' });
        InCallManager.setForceSpeakerphoneOn(isSpeakerOn);

        await engine.joinChannel(token, channel, null, uid || 0);
      } catch (error) {
        console.error('Join channel error:', error);
        throw error;
      }
    },
    [engine, config, isSpeakerOn]
  );

  /**
   * Leave the current channel
   */
  const leaveChannel = useCallback(async () => {
    if (!engine) return;

    try {
      await engine.leaveChannel();
      setIsJoined(false);
      setRemoteUids([]);

      // Stop timers
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
      }

      // Stop call manager
      InCallManager.stop();
    } catch (error) {
      console.error('Leave channel error:', error);
      throw error;
    }
  }, [engine]);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(async () => {
    if (!engine) return;

    try {
      await engine.muteLocalAudioStream(!isMuted);
      setIsMuted(!isMuted);
      InCallManager.setMicrophoneMute(!isMuted);
    } catch (error) {
      console.error('Toggle mute error:', error);
    }
  }, [engine, isMuted]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (!engine || config?.isAudioOnly) return;

    try {
      await engine.muteLocalVideoStream(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('Toggle video error:', error);
    }
  }, [engine, isVideoEnabled, config]);

  /**
   * Switch camera (front/back)
   */
  const switchCamera = useCallback(async () => {
    if (!engine || config?.isAudioOnly) return;

    try {
      await engine.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('Switch camera error:', error);
    }
  }, [engine, isFrontCamera, config]);

  /**
   * Toggle speaker on/off
   */
  const toggleSpeaker = useCallback(() => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);
    InCallManager.setForceSpeakerphoneOn(newSpeakerState);
  }, [isSpeakerOn]);

  /**
   * Collect call statistics
   */
  const collectCallStats = useCallback(async (rtcEngine: RtcEngine) => {
    try {
      // Get RTC stats
      const stats = await rtcEngine.getRtcStats();

      setCallStats((prev) => ({
        ...prev,
        duration: stats.totalDuration,
        bitrate: stats.txKBitRate + stats.rxKBitRate,
        packetLoss: (stats.txPacketLossRate + stats.rxPacketLossRate) / 2,
      }));
    } catch (error) {
      console.error('Stats collection error:', error);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (engine) {
        engine.destroy();
      }
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
      }
      InCallManager.stop();
    };
  }, [engine]);

  /**
   * Auto-initialize if config is provided
   */
  useEffect(() => {
    if (config?.appId && !engine) {
      initializeEngine(config.appId);
    }
  }, [config, engine, initializeEngine]);

  return {
    engine,
    isJoined,
    remoteUids,
    isMuted,
    isVideoEnabled,
    isSpeakerOn,
    isFrontCamera,
    callDuration,
    callStats,
    initializeEngine,
    joinChannel,
    leaveChannel,
    toggleMute,
    toggleVideo,
    switchCamera,
    toggleSpeaker,
  };
};
