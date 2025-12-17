import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FiPlay, FiPause } from 'react-icons/fi';

interface VoicePlayerProps {
  audioUrl: string;
  duration: number;
  waveformData?: number[];
  onPlaybackComplete?: () => void;
  compact?: boolean;
  className?: string;
}

const VoicePlayer: React.FC<VoicePlayerProps> = ({
  audioUrl,
  duration,
  waveformData = [],
  onPlaybackComplete,
  compact = false,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (onPlaybackComplete) {
        onPlaybackComplete();
      }
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [onPlaybackComplete]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        await audio.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;

    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (compact) {
    return (
      <CompactContainer className={className}>
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        <CompactPlayButton onClick={togglePlay} disabled={isLoading}>
          {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
        </CompactPlayButton>

        <CompactWaveform>
          {waveformData.length > 0 ? (
            waveformData.slice(0, 30).map((amplitude, index) => {
              const barProgress = (index / 30) * 100;
              const isActive = barProgress <= progress;

              return (
                <CompactWaveformBar
                  key={index}
                  height={Math.max(3, amplitude / 3)}
                  isActive={isActive}
                />
              );
            })
          ) : (
            <ProgressBarMini progress={progress} />
          )}
        </CompactWaveform>

        <CompactTime>
          {isPlaying ? formatTime(currentTime) : formatTime(duration)}
        </CompactTime>
      </CompactContainer>
    );
  }

  return (
    <Container className={className}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <PlayButton onClick={togglePlay} disabled={isLoading}>
        {isPlaying ? <FiPause size={24} /> : <FiPlay size={24} />}
      </PlayButton>

      <ContentArea>
        {waveformData.length > 0 ? (
          <WaveformContainer>
            {waveformData.map((amplitude, index) => {
              const barProgress = (index / waveformData.length) * 100;
              const isActive = barProgress <= progress;

              return (
                <WaveformBar
                  key={index}
                  height={Math.max(4, amplitude / 2)}
                  isActive={isActive}
                />
              );
            })}
          </WaveformContainer>
        ) : (
          <ProgressContainer>
            <ProgressBar progress={progress} />
            <Scrubber
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              step="0.1"
              onChange={handleSeek}
            />
          </ProgressContainer>
        )}

        <TimeDisplay>
          <CurrentTime>{formatTime(currentTime)}</CurrentTime>
          <Duration>/ {formatTime(duration)}</Duration>
        </TimeDisplay>
      </ContentArea>
    </Container>
  );
};

const Container = styled.div`
  background: #f9fafb;
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 500px;
  width: 100%;
`;

const PlayButton = styled.button`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  transition: transform 0.2s;

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    margin-left: ${(props) => (props.children?.[0]?.type === FiPlay ? '2px' : '0')};
  }
`;

const ContentArea = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const WaveformContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  height: 48px;
`;

const WaveformBar = styled.div<{ height: number; isActive: boolean }>`
  flex: 1;
  max-width: 3px;
  height: ${(props) => props.height}%;
  background: ${(props) => (props.isActive ? '#ef4444' : '#d1d5db')};
  border-radius: 2px;
  transition: background 0.2s;
`;

const ProgressContainer = styled.div`
  position: relative;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressBar = styled.div<{ progress: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${(props) => props.progress}%;
  background: linear-gradient(90deg, #ef4444, #f97316);
  transition: width 0.1s linear;
`;

const Scrubber = styled.input`
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
  padding: 0;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
    border: none;
  }

  &:hover {
    opacity: 0.3;
  }
`;

const TimeDisplay = styled.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
`;

const CurrentTime = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  font-family: monospace;
`;

const Duration = styled.span`
  font-size: 12px;
  color: #9ca3af;
  font-family: monospace;
`;

// Compact styles
const CompactContainer = styled.div`
  background: #f9fafb;
  border-radius: 20px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 200px;
`;

const CompactPlayButton = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 0.2s;

  &:hover:not(:disabled) {
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    margin-left: ${(props) => (props.children?.[0]?.type === FiPlay ? '1px' : '0')};
  }
`;

const CompactWaveform = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 1px;
  height: 24px;
`;

const CompactWaveformBar = styled.div<{ height: number; isActive: boolean }>`
  flex: 1;
  max-width: 2px;
  height: ${(props) => props.height}px;
  background: ${(props) => (props.isActive ? '#ef4444' : '#d1d5db')};
  border-radius: 1px;
  transition: background 0.2s;
`;

const ProgressBarMini = styled.div<{ progress: number }>`
  height: 4px;
  width: 100%;
  background: #e5e7eb;
  border-radius: 2px;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: ${(props) => props.progress}%;
    background: linear-gradient(90deg, #ef4444, #f97316);
    transition: width 0.1s linear;
  }
`;

const CompactTime = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  font-family: monospace;
  min-width: 40px;
  text-align: right;
  flex-shrink: 0;
`;

export default VoicePlayer;
