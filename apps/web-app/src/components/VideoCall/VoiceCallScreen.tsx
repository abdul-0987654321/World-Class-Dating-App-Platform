/**
 * Voice Call Screen
 * UI component for voice-only calls with audio controls
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCallScreenProps {
  callId: string;
  participantName: string;
  participantAvatar?: string;
  isMuted: boolean;
  isRemoteMuted: boolean;
  duration: number;
  status: 'ringing' | 'connecting' | 'connected' | 'ended';
  networkQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  onToggleMute: () => void;
  onEndCall: () => void;
  onSwitchToVideo?: () => void;
  audioLevel?: number; // 0-1 for visual feedback
  remoteAudioLevel?: number;
}

type AudioOutputDevice = 'speaker' | 'earpiece' | 'bluetooth';

const VoiceCallScreen: React.FC<VoiceCallScreenProps> = ({
  callId,
  participantName,
  participantAvatar,
  isMuted,
  isRemoteMuted,
  duration,
  status,
  networkQuality = 'good',
  onToggleMute,
  onEndCall,
  onSwitchToVideo,
  audioLevel = 0,
  remoteAudioLevel = 0,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [audioOutput, setAudioOutput] = useState<AudioOutputDevice>('speaker');
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [isHoldActive, setIsHoldActive] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Initialize audio context for volume control
  useEffect(() => {
    if (status === 'connected' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error('Failed to create audio context:', error);
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [status]);

  // Get available audio output devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        setAvailableDevices(audioOutputs);
      } catch (error) {
        console.error('Failed to enumerate audio devices:', error);
      }
    };

    getDevices();

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, []);

  // Toggle speaker/earpiece
  const toggleSpeaker = useCallback(async () => {
    try {
      // Use Web Audio API to route audio
      const audioElements = document.querySelectorAll('audio, video');

      if ('setSinkId' in HTMLMediaElement.prototype) {
        // Find speaker or earpiece device
        const targetDevice = isSpeakerOn
          ? availableDevices.find(d => d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('handset'))
          : availableDevices.find(d => d.label.toLowerCase().includes('speaker') || d.deviceId === 'default');

        if (targetDevice) {
          for (const element of audioElements) {
            await (element as any).setSinkId(targetDevice.deviceId);
          }
          setAudioOutput(isSpeakerOn ? 'earpiece' : 'speaker');
        }
      }

      setIsSpeakerOn(!isSpeakerOn);
    } catch (error) {
      console.error('Failed to toggle speaker:', error);
      // Still toggle the state for UI feedback even if device switch fails
      setIsSpeakerOn(!isSpeakerOn);
    }
  }, [isSpeakerOn, availableDevices]);

  // Select specific audio device
  const selectAudioDevice = useCallback(async (deviceId: string) => {
    try {
      const audioElements = document.querySelectorAll('audio, video');

      if ('setSinkId' in HTMLMediaElement.prototype) {
        for (const element of audioElements) {
          await (element as any).setSinkId(deviceId);
        }

        const device = availableDevices.find(d => d.deviceId === deviceId);
        if (device) {
          if (device.label.toLowerCase().includes('bluetooth')) {
            setAudioOutput('bluetooth');
          } else if (device.label.toLowerCase().includes('speaker')) {
            setAudioOutput('speaker');
            setIsSpeakerOn(true);
          } else {
            setAudioOutput('earpiece');
            setIsSpeakerOn(false);
          }
        }
      }

      setShowDeviceSelector(false);
    } catch (error) {
      console.error('Failed to select audio device:', error);
    }
  }, [availableDevices]);

  // Toggle hold
  const toggleHold = useCallback(() => {
    setIsHoldActive(!isHoldActive);
    // In a real implementation, this would pause audio/video tracks
    // and notify the signaling server
  }, [isHoldActive]);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get status text
  const getStatusText = (): string => {
    if (isHoldActive) {
      return 'On Hold';
    }
    switch (status) {
      case 'ringing':
        return 'Calling...';
      case 'connecting':
        return 'Connecting...';
      case 'connected':
        return formatDuration(duration);
      case 'ended':
        return 'Call Ended';
      default:
        return '';
    }
  };

  // Network quality icon
  const getNetworkIcon = () => {
    const iconColors = {
      excellent: 'text-green-400',
      good: 'text-green-400',
      fair: 'text-yellow-400',
      poor: 'text-red-400',
    };

    const barCounts = {
      excellent: 4,
      good: 3,
      fair: 2,
      poor: 1,
    };

    const color = iconColors[networkQuality];
    const bars = barCounts[networkQuality];

    return (
      <div className={`flex items-end gap-0.5 ${color}`}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-1 rounded-sm transition-all ${
              i <= bars ? 'bg-current' : 'bg-white/30'
            }`}
            style={{ height: `${i * 4}px` }}
          />
        ))}
      </div>
    );
  };

  // Audio output icon
  const getAudioOutputIcon = () => {
    switch (audioOutput) {
      case 'bluetooth':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400">
            <path fill="currentColor" d="M14.24 12.01l2.32 2.32c.28-.72.44-1.51.44-2.33s-.16-1.59-.44-2.32l-2.32 2.33zm1.88-4.4l.9-.9c-.58-.93-1.3-1.78-2.14-2.5l-1.42 1.42c.59.49 1.1 1.04 1.52 1.65l1.14 .33zm4.18 .93c-.6-1.41-1.48-2.67-2.57-3.73l-1.04 1.04c.95.87 1.71 1.92 2.24 3.09l1.37-.4zm-7.76-.06L10.5 4.5 9 6v6.5l-2.5 2.5v1.5l6-5.79V18l1.5 1.5 2.04-2.04c.54-.54.87-1.28.87-2.1 0-1.64-1.34-2.96-3-2.96H12l2.54-2.52z"/>
          </svg>
        );
      case 'speaker':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-400">
            <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/60">
            <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z"/>
          </svg>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(236, 72, 153, 0.3) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.3) 0%, transparent 50%)`,
        }} />
      </div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-between py-12 px-6">
        {/* Top bar with network quality and audio output */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getNetworkIcon()}
            <span className="text-white/60 text-sm capitalize">{networkQuality}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio output indicator */}
            <button
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
              className="p-2 rounded-full hover:bg-white/10 transition flex items-center gap-2"
            >
              {getAudioOutputIcon()}
              <span className="text-white/60 text-xs capitalize hidden sm:inline">
                {audioOutput}
              </span>
            </button>

            {/* Menu button */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-white/10 transition"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
                <path fill="currentColor" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Main content - Avatar and status */}
        <div className="flex flex-col items-center">
          {/* Avatar with audio visualization */}
          <div className="relative mb-6">
            {/* Audio level ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
              animate={{
                scale: status === 'connected' && !isHoldActive ? 1 + remoteAudioLevel * 0.3 : 1,
                opacity: status === 'connected' && !isHoldActive ? 0.6 + remoteAudioLevel * 0.4 : 0.3,
              }}
              transition={{ duration: 0.1 }}
              style={{ margin: '-8px' }}
            />

            {/* Ringing animation */}
            {status === 'ringing' && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-pink-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{ margin: '-16px' }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-purple-500"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                  style={{ margin: '-16px' }}
                />
              </>
            )}

            {/* Connecting animation */}
            {status === 'connecting' && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ margin: '-12px' }}
              />
            )}

            {/* Hold indicator */}
            {isHoldActive && (
              <motion.div
                className="absolute inset-0 rounded-full border-4 border-yellow-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ margin: '-12px' }}
              />
            )}

            {/* Avatar */}
            <div className={`relative w-40 h-40 rounded-full overflow-hidden border-4 ${
              isHoldActive ? 'border-yellow-500/50' : 'border-white/20'
            } ${isHoldActive ? 'grayscale' : ''}`}>
              {participantAvatar ? (
                <img
                  src={participantAvatar}
                  alt={participantName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl font-bold text-white">
                    {participantName[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Muted indicator for remote */}
            {isRemoteMuted && status === 'connected' && (
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                  <path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Participant name */}
          <h2 className="text-3xl font-bold text-white mb-2">{participantName}</h2>

          {/* Status */}
          <p className={`text-lg ${isHoldActive ? 'text-yellow-400' : 'text-white/60'}`}>
            {getStatusText()}
          </p>
        </div>

        {/* Bottom controls */}
        <div className="w-full max-w-md">
          <div className="flex items-center justify-center gap-6">
            {/* Mute button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleMute}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition ${
                isMuted ? 'bg-red-500' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isMuted ? (
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                </svg>
              )}
            </motion.button>

            {/* Speaker button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSpeaker}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition ${
                isSpeakerOn ? 'bg-blue-500' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {isSpeakerOn ? (
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              )}
            </motion.button>

            {/* End call button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onEndCall}
              className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition shadow-lg shadow-red-500/30"
            >
              <svg viewBox="0 0 24 24" className="w-9 h-9 text-white">
                <path fill="currentColor" d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
            </motion.button>

            {/* Switch to video button */}
            {onSwitchToVideo && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onSwitchToVideo}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
              >
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white">
                  <path fill="currentColor" d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/>
                </svg>
              </motion.button>
            )}
          </div>

          {/* Labels */}
          <div className="flex items-center justify-center gap-6 mt-4">
            <span className="text-white/60 text-sm w-16 text-center">
              {isMuted ? 'Unmute' : 'Mute'}
            </span>
            <span className="text-white/60 text-sm w-16 text-center">
              Speaker
            </span>
            <span className="text-white/60 text-sm w-20 text-center">
              End
            </span>
            {onSwitchToVideo && (
              <span className="text-white/60 text-sm w-16 text-center">
                Video
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Audio device selector dropdown */}
      <AnimatePresence>
        {showDeviceSelector && availableDevices.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-20 right-4 bg-gray-800 rounded-xl p-2 shadow-xl min-w-48"
          >
            <p className="text-white/60 text-xs px-3 py-2 uppercase tracking-wide">Audio Output</p>
            {availableDevices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => selectAudioDevice(device.deviceId)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/10 rounded-lg transition text-left"
              >
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  {device.label.toLowerCase().includes('bluetooth') ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-400">
                      <path fill="currentColor" d="M14.24 12.01l2.32 2.32c.28-.72.44-1.51.44-2.33s-.16-1.59-.44-2.32l-2.32 2.33zm1.88-4.4l.9-.9c-.58-.93-1.3-1.78-2.14-2.5l-1.42 1.42c.59.49 1.1 1.04 1.52 1.65l1.14 .33z"/>
                    </svg>
                  ) : device.label.toLowerCase().includes('speaker') ? (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
                      <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="w-4 h-4 text-white">
                      <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z"/>
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">
                    {device.label || 'Unknown Device'}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* More options menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMenu(false)}
            />

            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-3xl p-6"
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />

              <div className="flex flex-col gap-2">
                <button
                  onClick={toggleHold}
                  className="flex items-center gap-4 p-4 hover:bg-white/10 rounded-xl transition"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isHoldActive ? 'bg-yellow-500' : 'bg-white/10'
                  }`}>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                      <path fill="currentColor" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  </div>
                  <span className="text-white font-medium">
                    {isHoldActive ? 'Resume Call' : 'Hold Call'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowDeviceSelector(true);
                  }}
                  className="flex items-center gap-4 p-4 hover:bg-white/10 rounded-xl transition"
                >
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white">
                      <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                    </svg>
                  </div>
                  <span className="text-white font-medium">Audio Output</span>
                </button>

                <button
                  onClick={() => setShowMenu(false)}
                  className="flex items-center justify-center p-4 mt-4 bg-white/10 rounded-xl transition hover:bg-white/20"
                >
                  <span className="text-white font-medium">Cancel</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceCallScreen;
