/**
 * useSpeedDatingSession Hook
 * Manages active speed dating session state, timers, and video integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, PermissionsAndroid, Vibration } from 'react-native';
import RtcEngine, {
  ChannelProfile,
  ClientRole,
  RtcEngineContext,
} from 'react-native-agora';
import InCallManager from 'react-native-incall-manager';
import type {
  SpeedDatingSession,
  SpeedDatingSessionConfig,
  SpeedDatingParticipant,
  SpeedDatingRound,
  SpeedDatingVideoConfig,
  SpeedDatingCallStats,
} from '../types/speedDating.types';

type SessionState = 'waiting' | 'countdown' | 'active' | 'break' | 'voting' | 'ended';

interface UseSpeedDatingSessionOptions {
  config: SpeedDatingSessionConfig;
  videoConfig?: SpeedDatingVideoConfig;
  onSessionEnd?: (likes: string[], matches: string[]) => void;
  onRoundChange?: (round: number, partner: SpeedDatingParticipant) => void;
  onMatchFound?: (partnerId: string) => void;
}

interface UseSpeedDatingSessionReturn {
  // Session state
  sessionState: SessionState;
  currentRound: number;
  timeRemaining: number;
  currentPartner: SpeedDatingParticipant | null;
  likes: Set<string>;
  rounds: SpeedDatingRound[];

  // Video state
  engine: RtcEngine | null;
  isJoined: boolean;
  remoteUids: number[];
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerOn: boolean;
  isFrontCamera: boolean;
  callStats: SpeedDatingCallStats;

  // Actions
  startSession: () => void;
  vote: (like: boolean) => void;
  skipRound: () => void;
  leaveSession: () => void;
  toggleMute: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;

  // Helpers
  formatTime: (seconds: number) => string;
  getTimerColor: () => string;
  getProgress: () => number;
}

export const useSpeedDatingSession = (
  options: UseSpeedDatingSessionOptions
): UseSpeedDatingSessionReturn => {
  const { config, videoConfig, onSessionEnd, onRoundChange, onMatchFound } = options;

  // Session state
  const [sessionState, setSessionState] = useState<SessionState>('waiting');
  const [currentRound, setCurrentRound] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(config.roundDuration);
  const [currentPartnerIndex, setCurrentPartnerIndex] = useState(0);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [rounds, setRounds] = useState<SpeedDatingRound[]>([]);

  // Video state
  const [engine, setEngine] = useState<RtcEngine | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callStats, setCallStats] = useState<SpeedDatingCallStats>({
    duration: 0,
    bitrate: 0,
    packetLoss: 0,
    quality: 'good',
  });

  // Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Current partner
  const currentPartner = config.participants[currentPartnerIndex] || null;

  /**
   * Request camera and microphone permissions (Android)
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
  const initializeEngine = useCallback(async () => {
    if (!videoConfig?.appId) return null;

    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Camera/microphone permissions not granted');
      }

      const rtcEngine = await RtcEngine.createWithContext(
        new RtcEngineContext(videoConfig.appId)
      );

      await rtcEngine.enableVideo();
      await rtcEngine.enableAudio();
      await rtcEngine.setChannelProfile(ChannelProfile.Communication);
      await rtcEngine.setClientRole(ClientRole.Broadcaster);

      // Configure video quality
      const videoSettings = videoConfig.enableHD
        ? { dimensions: { width: 1280, height: 720 }, frameRate: 30, bitrate: 2000 }
        : { dimensions: { width: 640, height: 480 }, frameRate: 15, bitrate: 800 };

      await rtcEngine.setVideoEncoderConfiguration({
        ...videoSettings,
        minBitrate: 400,
        orientationMode: 0,
        degradationPreference: 2,
        mirrorMode: 0,
      });

      // Event listeners
      rtcEngine.addListener('UserJoined', (uid) => {
        setRemoteUids(prev => [...prev, uid]);
      });

      rtcEngine.addListener('UserOffline', (uid) => {
        setRemoteUids(prev => prev.filter(id => id !== uid));
      });

      rtcEngine.addListener('JoinChannelSuccess', (channel, uid) => {
        setIsJoined(true);
      });

      rtcEngine.addListener('NetworkQuality', (uid, txQuality, rxQuality) => {
        const quality = txQuality <= 2 && rxQuality <= 2
          ? 'excellent'
          : txQuality <= 4 && rxQuality <= 4
          ? 'good'
          : txQuality <= 5 && rxQuality <= 5
          ? 'fair'
          : 'poor';

        setCallStats(prev => ({ ...prev, quality }));
      });

      rtcEngine.addListener('Error', (errorCode) => {
        console.error('Agora error:', errorCode);
      });

      setEngine(rtcEngine);
      return rtcEngine;
    } catch (error) {
      console.error('Engine initialization error:', error);
      return null;
    }
  }, [videoConfig]);

  /**
   * Join video channel for current round
   */
  const joinChannel = useCallback(async () => {
    if (!engine || !videoConfig) return;

    try {
      InCallManager.start({ media: 'video' });
      InCallManager.setForceSpeakerphoneOn(isSpeakerOn);

      await engine.joinChannel(
        videoConfig.token,
        videoConfig.channel,
        null,
        videoConfig.uid || 0
      );
    } catch (error) {
      console.error('Join channel error:', error);
    }
  }, [engine, videoConfig, isSpeakerOn]);

  /**
   * Leave current video channel
   */
  const leaveChannel = useCallback(async () => {
    if (!engine) return;

    try {
      await engine.leaveChannel();
      setIsJoined(false);
      setRemoteUids([]);
      InCallManager.stop();
    } catch (error) {
      console.error('Leave channel error:', error);
    }
  }, [engine]);

  /**
   * Play haptic feedback
   */
  const playHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    const patterns = {
      light: [0, 50],
      medium: [0, 100],
      heavy: [0, 100, 50, 100],
    };
    Vibration.vibrate(patterns[type]);
  };

  /**
   * Start the session
   */
  const startSession = useCallback(() => {
    setSessionState('countdown');
    setTimeRemaining(3);
    setCurrentRound(1);
    playHaptic('medium');

    // Initialize video if config provided
    if (videoConfig) {
      initializeEngine().then(joinChannel);
    }
  }, [videoConfig, initializeEngine, joinChannel]);

  /**
   * Handle voting (like/skip)
   */
  const vote = useCallback((like: boolean) => {
    if (!currentPartner) return;

    if (like) {
      setLikes(prev => new Set(prev).add(currentPartner.id));
      playHaptic('heavy');

      // Check for mutual match (in real app, this would come from server)
      // Simulating match detection
      if (Math.random() > 0.5) {
        onMatchFound?.(currentPartner.id);
      }
    }

    // Record round
    const round: SpeedDatingRound = {
      roundNumber: currentRound,
      partnerId: currentPartner.id,
      partner: currentPartner,
      startTime: new Date(Date.now() - config.roundDuration * 1000).toISOString(),
      endTime: new Date().toISOString(),
      liked: like,
    };
    setRounds(prev => [...prev, round]);

    // Move to break or end
    setSessionState('break');
    setTimeRemaining(config.breakDuration);
    playHaptic('light');
  }, [currentPartner, currentRound, config.roundDuration, config.breakDuration, onMatchFound]);

  /**
   * Skip current round
   */
  const skipRound = useCallback(() => {
    vote(false);
  }, [vote]);

  /**
   * Leave session early
   */
  const leaveSession = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    leaveChannel();

    setSessionState('ended');
    onSessionEnd?.(Array.from(likes), []);
  }, [leaveChannel, likes, onSessionEnd]);

  /**
   * Toggle microphone
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
   * Toggle video
   */
  const toggleVideo = useCallback(async () => {
    if (!engine) return;

    try {
      await engine.muteLocalVideoStream(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    } catch (error) {
      console.error('Toggle video error:', error);
    }
  }, [engine, isVideoEnabled]);

  /**
   * Toggle speaker
   */
  const toggleSpeaker = useCallback(() => {
    const newState = !isSpeakerOn;
    setIsSpeakerOn(newState);
    InCallManager.setForceSpeakerphoneOn(newState);
  }, [isSpeakerOn]);

  /**
   * Switch camera
   */
  const switchCamera = useCallback(async () => {
    if (!engine) return;

    try {
      await engine.switchCamera();
      setIsFrontCamera(!isFrontCamera);
    } catch (error) {
      console.error('Switch camera error:', error);
    }
  }, [engine, isFrontCamera]);

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Get timer color based on time remaining
   */
  const getTimerColor = (): string => {
    if (timeRemaining <= 10) return '#FF4444';
    if (timeRemaining <= 30) return '#FFAA00';
    return '#4CAF50';
  };

  /**
   * Get session progress percentage
   */
  const getProgress = (): number => {
    return (currentRound / config.totalRounds) * 100;
  };

  // Timer effect
  useEffect(() => {
    if (sessionState !== 'active' && sessionState !== 'break' && sessionState !== 'countdown') {
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          if (sessionState === 'countdown') {
            playHaptic('medium');
            setSessionState('active');
            return config.roundDuration;
          } else if (sessionState === 'active') {
            playHaptic('heavy');
            setSessionState('voting');
            return 0;
          } else if (sessionState === 'break') {
            // Move to next partner
            if (currentPartnerIndex < config.participants.length - 1) {
              setCurrentPartnerIndex(prev => prev + 1);
              setCurrentRound(prev => prev + 1);
              setSessionState('countdown');

              // Notify about round change
              const nextPartner = config.participants[currentPartnerIndex + 1];
              onRoundChange?.(currentRound + 1, nextPartner);

              return 3; // 3 second countdown
            } else {
              // Session ended
              setSessionState('ended');
              onSessionEnd?.(Array.from(likes), []);
              return 0;
            }
          }
        }

        // Warning at 10 seconds
        if (prev === 11 && sessionState === 'active') {
          playHaptic('light');
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [
    sessionState,
    currentPartnerIndex,
    currentRound,
    config,
    likes,
    onRoundChange,
    onSessionEnd,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (engine) {
        engine.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current);
      }
      InCallManager.stop();
    };
  }, [engine]);

  return {
    // Session state
    sessionState,
    currentRound,
    timeRemaining,
    currentPartner,
    likes,
    rounds,

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
    skipRound,
    leaveSession,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,

    // Helpers
    formatTime,
    getTimerColor,
    getProgress,
  };
};
