import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiVideo,
  FiCamera,
  FiX,
  FiCheck,
  FiRefreshCw,
  FiUpload,
  FiPlay,
  FiPause,
  FiStopCircle,
  FiRotateCw,
  FiMic,
  FiMicOff,
} from 'react-icons/fi';

interface VideoProfileRecorderProps {
  onSave: (videoBlob: Blob, thumbnailBlob: Blob) => void;
  onClose: () => void;
  maxDuration?: number; // in seconds
  existingVideoUrl?: string;
}

const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
`;

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #000;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: rgba(0, 0, 0, 0.5);
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
`;

const Title = styled.h2`
  color: white;
  font-size: 18px;
  font-weight: 600;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: white;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;
`;

const VideoContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RecordingIndicator = styled.div`
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 0, 0, 0.8);
  padding: 8px 16px;
  border-radius: 20px;
  color: white;
  font-size: 14px;
  font-weight: 600;
`;

const RecordingDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
  animation: ${pulse} 1s infinite;
`;

const TimerBar = styled.div`
  position: absolute;
  top: 60px;
  left: 16px;
  right: 16px;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
`;

const TimerProgress = styled.div<{ progress: number }>`
  height: 100%;
  width: ${({ progress }) => progress}%;
  background: linear-gradient(90deg, #4ecdc4, #95e1d3);
  transition: width 0.1s linear;
`;

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
`;

const MainControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
`;

const RecordButton = styled.button<{ isRecording: boolean }>`
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 4px solid white;
  background: ${({ isRecording }) => (isRecording ? '#FF4444' : 'transparent')};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const InnerRecord = styled.div<{ isRecording: boolean }>`
  width: ${({ isRecording }) => (isRecording ? '24px' : '56px')};
  height: ${({ isRecording }) => (isRecording ? '24px' : '56px')};
  border-radius: ${({ isRecording }) => (isRecording ? '4px' : '50%')};
  background: ${({ isRecording }) => (isRecording ? 'white' : '#FF4444')};
  transition: all 0.3s;
`;

const SideButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 16px;
`;

const ActionButton = styled.button<{ variant: 'primary' | 'secondary' }>`
  padding: 12px 32px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;

  ${({ variant }) =>
    variant === 'primary'
      ? `
      background: linear-gradient(135deg, #4ECDC4, #95E1D3);
      border: none;
      color: white;

      &:hover {
        box-shadow: 0 4px 20px rgba(78, 205, 196, 0.4);
      }
    `
      : `
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;

      &:hover {
        background: rgba(255, 255, 255, 0.2);
      }
    `}
`;

const Prompt = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  padding: 24px;
`;

const PromptIcon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.8;
`;

const PromptText = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const PromptSubtext = styled.p`
  font-size: 14px;
  opacity: 0.8;
`;

const TipsContainer = styled.div`
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow-x: auto;
`;

const TipCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 12px 16px;
  border-radius: 12px;
  min-width: 150px;
  text-align: center;
`;

const TipEmoji = styled.div`
  font-size: 24px;
  margin-bottom: 4px;
`;

const TipText = styled.div`
  color: white;
  font-size: 12px;
`;

const PreviewOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const PlayButton = styled.button`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #333;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const tips = [
  { emoji: '💡', text: 'Good lighting' },
  { emoji: '😊', text: 'Be yourself' },
  { emoji: '🎯', text: 'Keep it short' },
  { emoji: '🗣️', text: 'Speak clearly' },
  { emoji: '📱', text: 'Hold steady' },
];

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading';

export const VideoProfileRecorder: React.FC<VideoProfileRecorderProps> = ({
  onSave,
  onClose,
  maxDuration = 30,
  existingVideoUrl,
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMuted, setIsMuted] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Request camera permission and start stream
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: !isMuted,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
      setHasPermission(true);
    } catch (error) {
      console.error('Failed to access camera:', error);
      setHasPermission(false);
    }
  }, [facingMode, isMuted]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9',
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setState('preview');

      // Set video source for preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(100);
    setState('recording');

    // Start timer
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxDuration - 1) {
          stopRecording();
          return maxDuration;
        }
        return prev + 1;
      });
    }, 1000);
  }, [maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Retake video
  const handleRetake = useCallback(() => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setState('idle');
    startCamera();
  }, [startCamera]);

  // Switch camera
  const handleSwitchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Toggle mute
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  // Save video
  const handleSave = useCallback(async () => {
    if (!recordedBlob || !videoRef.current) return;

    setState('uploading');

    // Generate thumbnail from video
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Seek to middle of video for thumbnail
      videoRef.current.currentTime = videoRef.current.duration / 2;
      await new Promise((resolve) => {
        videoRef.current!.onseeked = resolve;
      });

      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob(
        (thumbnailBlob) => {
          if (thumbnailBlob) {
            onSave(recordedBlob, thumbnailBlob);
          }
        },
        'image/jpeg',
        0.8
      );
    }
  }, [recordedBlob, onSave]);

  // Toggle video playback
  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Initialize camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Restart camera when facing mode changes
  useEffect(() => {
    if (state === 'idle' && hasPermission) {
      stopCamera();
      startCamera();
    }
  }, [facingMode, isMuted]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Container>
      <Header>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>
        <Title>Intro Video</Title>
        <div style={{ width: 40 }} />
      </Header>

      <VideoContainer>
        <Video ref={videoRef} playsInline onEnded={() => setIsPlaying(false)} />

        {hasPermission === false && (
          <Prompt>
            <PromptIcon>
              <FiVideo />
            </PromptIcon>
            <PromptText>Camera Access Required</PromptText>
            <PromptSubtext>Please allow camera access to record your intro video</PromptSubtext>
          </Prompt>
        )}

        {state === 'recording' && (
          <>
            <TimerBar>
              <TimerProgress progress={(recordingTime / maxDuration) * 100} />
            </TimerBar>
            <RecordingIndicator>
              <RecordingDot />
              <span>
                {formatTime(recordingTime)} / {formatTime(maxDuration)}
              </span>
            </RecordingIndicator>
          </>
        )}

        {state === 'preview' && !isPlaying && (
          <PreviewOverlay onClick={togglePlayback}>
            <PlayButton>
              <FiPlay />
            </PlayButton>
          </PreviewOverlay>
        )}
      </VideoContainer>

      {state === 'idle' && hasPermission && (
        <TipsContainer>
          {tips.map((tip, index) => (
            <TipCard key={index}>
              <TipEmoji>{tip.emoji}</TipEmoji>
              <TipText>{tip.text}</TipText>
            </TipCard>
          ))}
        </TipsContainer>
      )}

      <Controls>
        {(state === 'idle' || state === 'recording') && (
          <MainControls>
            <SideButton onClick={handleToggleMute} disabled={state === 'recording'}>
              {isMuted ? <FiMicOff /> : <FiMic />}
            </SideButton>

            <RecordButton
              isRecording={state === 'recording'}
              onClick={state === 'recording' ? stopRecording : startRecording}
              disabled={!hasPermission}
            >
              <InnerRecord isRecording={state === 'recording'} />
            </RecordButton>

            <SideButton onClick={handleSwitchCamera} disabled={state === 'recording'}>
              <FiRotateCw />
            </SideButton>
          </MainControls>
        )}

        {state === 'preview' && (
          <ActionButtons>
            <ActionButton variant="secondary" onClick={handleRetake}>
              <FiRefreshCw /> Retake
            </ActionButton>
            <ActionButton variant="primary" onClick={handleSave}>
              <FiCheck /> Save Video
            </ActionButton>
          </ActionButtons>
        )}

        {state === 'uploading' && (
          <ActionButton variant="primary" disabled>
            <FiUpload /> Uploading...
          </ActionButton>
        )}
      </Controls>
    </Container>
  );
};

export default VideoProfileRecorder;
