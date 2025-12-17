import React, { useState, useRef, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { FiMic, FiSquare, FiPlay, FiPause, FiTrash2, FiCheck, FiAlertCircle } from 'react-icons/fi';

interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
  maxDurationInSeconds?: number;
  context?: 'profile' | 'prompt' | 'message';
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDurationInSeconds = 60,
  context = 'message',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const startRecording = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup audio context for visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setWaveformData([]);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDurationInSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);

      // Start waveform visualization
      visualizeAudio();
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Microphone permission denied. Please allow microphone access.');
      } else {
        setError('Failed to start recording. Please try again.');
      }
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !isRecording) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average amplitude
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const normalized = (average / 255) * 100;

      setWaveformData((prev) => [...prev, normalized].slice(-60));

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDurationInSeconds) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setPlaybackTime(0);
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl('');
    setWaveformData([]);
    setRecordingTime(0);
    setPlaybackTime(0);
  };

  const handleSubmit = () => {
    if (audioBlob && recordingTime >= 1) {
      onRecordingComplete(audioBlob, recordingTime);
    } else {
      setError('Recording must be at least 1 second long.');
    }
  };

  const handleCancel = () => {
    cleanup();
    if (onCancel) {
      onCancel();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getContextTitle = (): string => {
    switch (context) {
      case 'profile':
        return 'Record Voice Intro';
      case 'prompt':
        return 'Answer with Voice';
      case 'message':
        return 'Voice Message';
      default:
        return 'Voice Recording';
    }
  };

  return (
    <Container>
      <Header>
        <Title>{getContextTitle()}</Title>
      </Header>

      <WaveformContainer>
        {waveformData.length > 0 || audioBlob ? (
          <Waveform>
            {waveformData.map((amplitude, index) => (
              <WaveformBar
                key={index}
                height={Math.max(4, amplitude)}
                isActive={isRecording && !isPaused}
              />
            ))}
          </Waveform>
        ) : (
          <WaveformPlaceholder>
            <FiMic size={48} />
            <PlaceholderText>Tap the button below to start recording</PlaceholderText>
          </WaveformPlaceholder>
        )}
      </WaveformContainer>

      <TimeDisplay>
        <CurrentTime isRecording={isRecording}>
          {formatTime(audioBlob ? playbackTime : recordingTime)}
        </CurrentTime>
        <MaxTime>/ {formatTime(maxDurationInSeconds)}</MaxTime>
      </TimeDisplay>

      {error && (
        <ErrorMessage>
          <FiAlertCircle />
          {error}
        </ErrorMessage>
      )}

      <Controls>
        {!audioBlob ? (
          isRecording ? (
            <RecordingControls>
              <SmallButton onClick={isPaused ? resumeRecording : pauseRecording}>
                {isPaused ? <FiPlay size={20} /> : <FiPause size={20} />}
              </SmallButton>
              <StopButton onClick={stopRecording}>
                <FiSquare size={24} />
              </StopButton>
              <SmallButton onClick={handleCancel}>
                <FiTrash2 size={20} />
              </SmallButton>
            </RecordingControls>
          ) : (
            <RecordButton onClick={startRecording}>
              <FiMic size={28} />
            </RecordButton>
          )
        ) : (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              onTimeUpdate={handleAudioTimeUpdate}
              onEnded={handleAudioEnded}
            />
            <PlaybackControls>
              <SmallButton onClick={togglePlayback}>
                {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
              </SmallButton>
              <SmallButton onClick={deleteRecording}>
                <FiTrash2 size={20} />
              </SmallButton>
              <SubmitButton onClick={handleSubmit}>
                <FiCheck size={20} />
                Use Recording
              </SubmitButton>
            </PlaybackControls>
          </>
        )}
      </Controls>

      <Hints>
        {!isRecording && !audioBlob && (
          <>
            <HintText>• Find a quiet place</HintText>
            <HintText>• Speak clearly and naturally</HintText>
            <HintText>• Max {maxDurationInSeconds} seconds</HintText>
          </>
        )}
        {isRecording && (
          <HintText>{isPaused ? 'Recording paused' : 'Recording in progress...'}</HintText>
        )}
        {audioBlob && <HintText>Listen to your recording and submit when ready</HintText>}
      </Hints>
    </Container>
  );
};

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
`;

const Container = styled.div`
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
`;

const Header = styled.div`
  margin-bottom: 24px;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
`;

const WaveformContainer = styled.div`
  background: #f9fafb;
  border-radius: 12px;
  padding: 32px;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const Waveform = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  height: 100px;
  width: 100%;
`;

const WaveformBar = styled.div<{ height: number; isActive: boolean }>`
  flex: 1;
  max-width: 4px;
  height: ${(props) => props.height}%;
  background: ${(props) => (props.isActive ? '#ef4444' : '#d1d5db')};
  border-radius: 2px;
  transition: background 0.2s;
`;

const WaveformPlaceholder = styled.div`
  text-align: center;
  color: #9ca3af;

  svg {
    margin-bottom: 16px;
  }
`;

const PlaceholderText = styled.p`
  font-size: 14px;
  color: #6b7280;
`;

const TimeDisplay = styled.div`
  text-align: center;
  margin-bottom: 24px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
`;

const CurrentTime = styled.span<{ isRecording: boolean }>`
  font-size: 48px;
  font-weight: 700;
  color: ${(props) => (props.isRecording ? '#ef4444' : '#1f2937')};
  font-family: monospace;
`;

const MaxTime = styled.span`
  font-size: 20px;
  color: #9ca3af;
  font-family: monospace;
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
`;

const RecordButton = styled.button`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  transition: transform 0.2s;
  animation: ${pulse} 2s infinite;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const RecordingControls = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const PlaybackControls = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;
`;

const SmallButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  border: none;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #1f2937;
  }
`;

const StopButton = styled.button`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 12px 24px;
  border-radius: 8px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
`;

const ErrorMessage = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #dc2626;
  font-size: 14px;
  margin-bottom: 16px;

  svg {
    flex-shrink: 0;
  }
`;

const Hints = styled.div`
  background: #f0fdf4;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
`;

const HintText = styled.p`
  font-size: 13px;
  color: #047857;
  margin: 4px 0;
`;

export default VoiceRecorder;
