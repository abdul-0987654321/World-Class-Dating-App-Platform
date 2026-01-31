/**
 * Video Call Screen for Web App
 * Agora WebRTC integration for browser-based video calling
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  IRemoteVideoTrack,
  IRemoteAudioTrack,
  IAgoraRTC,
} from 'agora-rtc-sdk-ng';
import './VideoCallScreen.css';

/** Lazily loads the Agora RTC SDK to reduce initial bundle size */
let _agoraRTC: IAgoraRTC | null = null;
async function getAgoraRTC(): Promise<IAgoraRTC> {
  if (!_agoraRTC) {
    const module = await import('agora-rtc-sdk-ng');
    _agoraRTC = module.default;
  }
  return _agoraRTC;
}

interface VideoCallScreenProps {
  channelName: string;
  token: string;
  appId: string;
  userId: number;
  userName: string;
  isAudioOnly?: boolean;
  enableHD?: boolean;
  maxDuration?: number;
  onCallEnd: () => void;
}

const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  channelName,
  token,
  appId,
  userId,
  userName,
  isAudioOnly = false,
  enableHD = false,
  maxDuration,
  onCallEnd,
}) => {
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(!isAudioOnly);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionState, setConnectionState] = useState<string>('CONNECTING');
  const [networkQuality, setNetworkQuality] = useState<'excellent' | 'good' | 'fair' | 'poor'>(
    'good'
  );

  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize and join channel
   */
  const initializeCall = useCallback(async () => {
    try {
      // Lazily load Agora SDK and create client
      const AgoraRTC = await getAgoraRTC();
      const rtcClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(rtcClient);

      // Set encoding configuration
      if (!isAudioOnly) {
        if (enableHD) {
          await rtcClient.setVideoEncoderConfiguration({
            width: 1280,
            height: 720,
            frameRate: 30,
            bitrateMin: 1000,
            bitrateMax: 2000,
          });
        } else {
          await rtcClient.setVideoEncoderConfiguration({
            width: 640,
            height: 480,
            frameRate: 15,
            bitrateMin: 400,
            bitrateMax: 800,
          });
        }
      }

      // Join channel
      await rtcClient.join(appId, channelName, token, userId);

      // Create and publish local tracks
      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      setLocalAudioTrack(audioTrack);

      if (!isAudioOnly) {
        const videoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: enableHD ? '720p_1' : '480p_1',
        });
        setLocalVideoTrack(videoTrack);

        // Play local video
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        await rtcClient.publish([audioTrack, videoTrack]);
      } else {
        await rtcClient.publish([audioTrack]);
      }

      setConnectionState('CONNECTED');

      // Start duration timer
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => {
          const newDuration = prev + 1;

          // Check max duration
          if (maxDuration && newDuration >= maxDuration * 60) {
            handleEndCall();
          }

          return newDuration;
        });
      }, 1000);
    } catch (error) {
      console.error('Initialize call error:', error);
      setConnectionState('FAILED');
    }
  }, [appId, channelName, token, userId, isAudioOnly, enableHD, maxDuration]);

  /**
   * Handle remote users
   */
  useEffect(() => {
    if (!client) return;

    const handleUserPublished = async (user: any, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);

      if (mediaType === 'video') {
        setRemoteUsers((prev) => {
          const existingUser = prev.find((u) => u.uid === user.uid);
          if (existingUser) {
            return prev.map((u) => (u.uid === user.uid ? user : u));
          }
          return [...prev, user];
        });

        // Play remote video
        if (remoteVideoRef.current) {
          user.videoTrack?.play(remoteVideoRef.current);
        }
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    };

    const handleUserUnpublished = (user: any) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    const handleUserLeft = (user: any) => {
      setRemoteUsers((prev) => prev.filter((u) => u.uid !== user.uid));
    };

    const handleConnectionStateChange = (state: string) => {
      setConnectionState(state);
    };

    const handleNetworkQuality = (stats: any) => {
      const { uplinkNetworkQuality, downlinkNetworkQuality } = stats;
      const avgQuality = Math.max(uplinkNetworkQuality, downlinkNetworkQuality);

      if (avgQuality <= 2) {
        setNetworkQuality('excellent');
      } else if (avgQuality <= 3) {
        setNetworkQuality('good');
      } else if (avgQuality <= 4) {
        setNetworkQuality('fair');
      } else {
        setNetworkQuality('poor');
      }
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);
    client.on('connection-state-change', handleConnectionStateChange);
    client.on('network-quality', handleNetworkQuality);

    return () => {
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);
      client.off('connection-state-change', handleConnectionStateChange);
      client.off('network-quality', handleNetworkQuality);
    };
  }, [client]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    initializeCall();

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }
    };
  }, [initializeCall]);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(async () => {
    if (localAudioTrack) {
      await localAudioTrack.setEnabled(!isMuted);
      setIsMuted(!isMuted);
    }
  }, [localAudioTrack, isMuted]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (localVideoTrack) {
      await localVideoTrack.setEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  }, [localVideoTrack, isVideoEnabled]);

  /**
   * Switch camera (front/back) - for mobile web
   */
  const switchCamera = useCallback(async () => {
    if (localVideoTrack) {
      try {
        await localVideoTrack.setDevice(isFrontCamera ? 'back' : 'front');
        setIsFrontCamera(!isFrontCamera);
      } catch (error) {
        console.error('Switch camera error:', error);
      }
    }
  }, [localVideoTrack, isFrontCamera]);

  /**
   * End call
   */
  const handleEndCall = useCallback(async () => {
    try {
      // Stop duration timer
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
      }

      // Stop and close local tracks
      localAudioTrack?.stop();
      localAudioTrack?.close();
      localVideoTrack?.stop();
      localVideoTrack?.close();

      // Leave channel
      await client?.leave();

      onCallEnd();
    } catch (error) {
      console.error('End call error:', error);
      onCallEnd();
    }
  }, [client, localAudioTrack, localVideoTrack, onCallEnd]);

  /**
   * Format duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-call-screen">
      {/* Remote video container */}
      <div className="remote-video-container">
        {remoteUsers.length > 0 ? (
          <div ref={remoteVideoRef} className="remote-video" />
        ) : (
          <div className="remote-video-placeholder">
            <div className="avatar-large">
              <span>{userName[0]?.toUpperCase()}</span>
            </div>
            <p className="connecting-text">
              {connectionState === 'CONNECTED' ? 'Waiting for user...' : 'Connecting...'}
            </p>
          </div>
        )}
      </div>

      {/* Local video container (PIP) */}
      {!isAudioOnly && isVideoEnabled && (
        <div className="local-video-container">
          <div ref={localVideoRef} className="local-video" />
        </div>
      )}

      {/* Top bar */}
      <div className="top-bar">
        <div className="call-info">
          <span className="user-name">{userName}</span>
          <span className="call-duration">{formatDuration(callDuration)}</span>
        </div>
        <div className="network-indicator">
          <span className={`network-quality network-${networkQuality}`}>
            {networkQuality === 'excellent' && '📶'}
            {networkQuality === 'good' && '📶'}
            {networkQuality === 'fair' && '📶'}
            {networkQuality === 'poor' && '📶'}
          </span>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="bottom-controls">
        <button
          className={`control-button ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          <span className="icon">{isMuted ? '🔇' : '🎤'}</span>
          <span className="label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {!isAudioOnly && (
          <button
            className={`control-button ${!isVideoEnabled ? 'active' : ''}`}
            onClick={toggleVideo}
            title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
          >
            <span className="icon">{isVideoEnabled ? '📹' : '📷'}</span>
            <span className="label">{isVideoEnabled ? 'Stop' : 'Start'}</span>
          </button>
        )}

        <button className="control-button end-call" onClick={handleEndCall} title="End Call">
          <span className="icon">📞</span>
          <span className="label">End</span>
        </button>

        {!isAudioOnly && (
          <button className="control-button" onClick={switchCamera} title="Switch Camera">
            <span className="icon">🔄</span>
            <span className="label">Flip</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoCallScreen;
