import React, { useState, useRef, useCallback, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import {
  FiMic,
  FiX,
  FiSend,
  FiTrash2,
  FiPlay,
  FiPause,
} from 'react-icons/fi';

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
  maxDuration?: number; // in seconds
}

const pulse = keyframes`
  0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4); }
  70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(255, 107, 107, 0); }
  100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
`;

const waveAnimation = keyframes`
  0%, 100% { height: 20%; }
  50% { height: 100%; }
`;

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ theme }) => theme.colors?.backgroundSecondary || '#f5f5f5'};
  border-radius: 24px;
  min-width: 200px;
`;

const RecordButton = styled.button<{ isRecording: boolean }>`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: ${({ isRecording }) =>
    isRecording
      ? 'linear-gradient(135deg, #FF6B6B, #FF8E53)'
      : 'linear-gradient(135deg, #4ECDC4, #95E1D3)'};
  color: white;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  animation: ${({ isRecording }) => (isRecording ? pulse : 'none')} 1.5s infinite;

  &:hover {
    transform: scale(1.05);
  }
`;

const WaveformContainer = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  height: 40px;
  padding: 0 8px;
`;

const WaveBar = styled.div<{ isRecording: boolean; delay: number }>`
  width: 3px;
  height: 20%;
  background: ${({ isRecording }) => (isRecording ? '#FF6B6B' : '#4ECDC4')};
  border-radius: 2px;
  animation: ${({ isRecording }) => (isRecording ? waveAnimation : 'none')} 0.5s
    ease-in-out infinite;
  animation-delay: ${({ delay }) => delay}ms;
`;

const Timer = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors?.text || '#333'};
  min-width: 48px;
  text-align: center;
`;

const ActionButton = styled.button<{ variant?: 'danger' | 'primary' }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: ${({ variant }) =>
    variant === 'danger'
      ? 'rgba(255, 107, 107, 0.1)'
      : variant === 'primary'
      ? 'linear-gradient(135deg, #4ECDC4, #95E1D3)'
      : 'rgba(0, 0, 0, 0.05)'};
  color: ${({ variant }) =>
    variant === 'danger' ? '#FF6B6B' : variant === 'primary' ? 'white' : '#666'};
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Voice Note Player Component
interface VoiceNotePlayerProps {
  audioUrl: string;
  duration: number;
  onDelete?: () => void;
  isOwn?: boolean;
}

const PlayerContainer = styled.div<{ isOwn: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: ${({ isOwn }) =>
    isOwn
      ? 'linear-gradient(135deg, #4ECDC4, #95E1D3)'
      : '#f0f0f0'};
  border-radius: 20px;
  max-width: 280px;
`;

const PlayButtonSmall = styled.button<{ isOwn: boolean }>`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: ${({ isOwn }) => (isOwn ? 'rgba(255, 255, 255, 0.3)' : 'white')};
  color: ${({ isOwn }) => (isOwn ? 'white' : '#4ECDC4')};
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const ProgressContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ProgressBar = styled.div<{ isOwn: boolean }>`
  width: 100%;
  height: 4px;
  background: ${({ isOwn }) => (isOwn ? 'rgba(255, 255, 255, 0.3)' : '#ddd')};
  border-radius: 2px;
  overflow: hidden;
  cursor: pointer;
`;

const Progress = styled.div<{ progress: number; isOwn: boolean }>`
  height: 100%;
  width: ${({ progress }) => progress}%;
  background: ${({ isOwn }) => (isOwn ? 'white' : '#4ECDC4')};
  transition: width 0.1s linear;
`;

const DurationText = styled.span<{ isOwn: boolean }>`
  font-size: 11px;
  color: ${({ isOwn }) => (isOwn ? 'rgba(255, 255, 255, 0.8)' : '#666')};
`;

type RecordingState = 'idle' | 'recording' | 'preview';

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSend,
  onCancel,
  maxDuration = 60,
}) => {
  const [state, setState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setState('preview');

        // Create audio element for preview
        audioRef.current = new Audio(URL.createObjectURL(blob));
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setPlaybackProgress(0);
        };
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            const progress =
              (audioRef.current.currentTime / audioRef.current.duration) * 100;
            setPlaybackProgress(progress);
          }
        };
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
    } catch (error) {
      console.error('Failed to access microphone:', error);
    }
  }, [maxDuration]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Toggle playback
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  // Delete recording
  const handleDelete = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setRecordedBlob(null);
    setRecordingTime(0);
    setPlaybackProgress(0);
    setIsPlaying(false);
    setState('idle');
  }, []);

  // Send recording
  const handleSend = useCallback(() => {
    if (recordedBlob) {
      onSend(recordedBlob, recordingTime);
    }
  }, [recordedBlob, recordingTime, onSend]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate wave bars
  const waveBars = Array.from({ length: 20 }, (_, i) => i);

  return (
    <Container>
      {state === 'idle' && (
        <>
          <RecordButton isRecording={false} onClick={startRecording}>
            <FiMic />
          </RecordButton>
          <ActionButton onClick={onCancel}>
            <FiX />
          </ActionButton>
        </>
      )}

      {state === 'recording' && (
        <>
          <RecordButton isRecording={true} onClick={stopRecording}>
            <FiMic />
          </RecordButton>
          <WaveformContainer>
            {waveBars.map((i) => (
              <WaveBar
                key={i}
                isRecording={true}
                delay={i * 50}
              />
            ))}
          </WaveformContainer>
          <Timer>{formatTime(recordingTime)}</Timer>
          <ActionButton variant="danger" onClick={handleDelete}>
            <FiTrash2 />
          </ActionButton>
        </>
      )}

      {state === 'preview' && (
        <>
          <ActionButton onClick={togglePlayback}>
            {isPlaying ? <FiPause /> : <FiPlay />}
          </ActionButton>
          <WaveformContainer>
            {waveBars.map((i) => (
              <WaveBar
                key={i}
                isRecording={false}
                delay={0}
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  opacity: (i / waveBars.length) * 100 < playbackProgress ? 1 : 0.3,
                }}
              />
            ))}
          </WaveformContainer>
          <Timer>{formatTime(recordingTime)}</Timer>
          <ActionButton variant="danger" onClick={handleDelete}>
            <FiTrash2 />
          </ActionButton>
          <ActionButton variant="primary" onClick={handleSend}>
            <FiSend />
          </ActionButton>
        </>
      )}
    </Container>
  );
};

// Voice Note Player Component for displaying sent/received voice notes
export const VoiceNotePlayer: React.FC<VoiceNotePlayerProps> = ({
  audioUrl,
  duration,
  onDelete,
  isOwn = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audioUrl);

    audioRef.current.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        const prog = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        setProgress(prog);
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl]);

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    audioRef.current.currentTime = percentage * audioRef.current.duration;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <PlayerContainer isOwn={isOwn}>
      <PlayButtonSmall isOwn={isOwn} onClick={togglePlayback}>
        {isPlaying ? <FiPause /> : <FiPlay />}
      </PlayButtonSmall>
      <ProgressContainer>
        <ProgressBar isOwn={isOwn} onClick={handleProgressClick}>
          <Progress progress={progress} isOwn={isOwn} />
        </ProgressBar>
        <DurationText isOwn={isOwn}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </DurationText>
      </ProgressContainer>
    </PlayerContainer>
  );
};

export default VoiceNoteRecorder;
