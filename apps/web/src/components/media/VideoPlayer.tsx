import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { FiPlay, FiPause, FiVolume2, FiVolumeX, FiMaximize, FiMinimize } from 'react-icons/fi';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  onEnd?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  thumbnailUrl,
  autoPlay = false,
  muted = false,
  loop = false,
  controls = true,
  onEnd,
  onError,
  className,
}) => {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(muted);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      if (onEnd) onEnd();
    };

    const handleError = (e: Event) => {
      setIsLoading(false);
      if (onError) {
        onError(new Error('Video failed to load'));
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
    };
  }, [onEnd, onError]);

  useEffect(() => {
    if (isPlaying && controls) {
      // Auto-hide controls after 3 seconds of inactivity
      resetControlsTimeout();
    } else {
      setShowControls(true);
    }
  }, [isPlaying, controls]);

  const resetControlsTimeout = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setShowControls(true);

    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }

    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!isFullscreen) {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    if (controls) {
      resetControlsTimeout();
    }
  };

  return (
    <Container
      ref={containerRef}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }}
    >
      <Video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        autoPlay={autoPlay}
        muted={muted}
        loop={loop}
        onClick={togglePlay}
      />

      {isLoading && (
        <LoadingOverlay>
          <Spinner />
        </LoadingOverlay>
      )}

      {!isPlaying && !isLoading && (
        <PlayOverlay onClick={togglePlay}>
          <PlayButton>
            <FiPlay size={48} />
          </PlayButton>
        </PlayOverlay>
      )}

      {controls && showControls && !isLoading && (
        <Controls>
          <ProgressContainer>
            <ProgressBar
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
            />
          </ProgressContainer>

          <ControlsRow>
            <LeftControls>
              <ControlButton onClick={togglePlay}>
                {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
              </ControlButton>

              <TimeDisplay>
                {formatTime(currentTime)} / {formatTime(duration)}
              </TimeDisplay>
            </LeftControls>

            <RightControls>
              <ControlButton onClick={toggleMute}>
                {isMuted ? <FiVolumeX size={20} /> : <FiVolume2 size={20} />}
              </ControlButton>

              <ControlButton onClick={toggleFullscreen}>
                {isFullscreen ? <FiMinimize size={20} /> : <FiMaximize size={20} />}
              </ControlButton>
            </RightControls>
          </ControlsRow>
        </Controls>
      )}
    </Container>
  );
};

const Container = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;

  &:fullscreen {
    border-radius: 0;
  }
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const PlayOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  transition: opacity 0.2s;

  &:hover {
    background: rgba(0, 0, 0, 0.4);
  }
`;

const PlayButton = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }

  svg {
    margin-left: 4px;
  }
`;

const Controls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 16px;
  transition: opacity 0.3s;
`;

const ProgressContainer = styled.div`
  margin-bottom: 12px;
`;

const ProgressBar = styled.input`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #ef4444;
    cursor: pointer;
    border: none;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const LeftControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const RightControls = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.1);
  }
`;

const TimeDisplay = styled.span`
  color: white;
  font-size: 14px;
  font-weight: 500;
  font-family: monospace;
`;

export default VideoPlayer;
