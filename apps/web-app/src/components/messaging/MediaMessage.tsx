/**
 * Media Message Component
 * Displays different types of media messages (images, videos, voice notes, GIFs)
 */

import React, { useState, useRef, useEffect } from 'react';

export interface MediaContent {
  type: 'image' | 'video' | 'voice' | 'gif';
  url: string;
  thumbnailUrl?: string;
  duration?: number; // for voice/video in seconds
  width?: number;
  height?: number;
  fileName?: string;
}

interface MediaMessageProps {
  media: MediaContent;
  isFromMe: boolean;
  onImageClick?: (url: string) => void;
}

export const MediaMessage: React.FC<MediaMessageProps> = ({ media, isFromMe, onImageClick }) => {
  switch (media.type) {
    case 'image':
      return (
        <ImageMessage
          url={media.url}
          thumbnailUrl={media.thumbnailUrl}
          isFromMe={isFromMe}
          onClick={onImageClick}
        />
      );
    case 'video':
      return (
        <VideoMessage
          url={media.url}
          thumbnailUrl={media.thumbnailUrl}
          duration={media.duration}
          isFromMe={isFromMe}
        />
      );
    case 'voice':
      return <VoiceMessage url={media.url} duration={media.duration} isFromMe={isFromMe} />;
    case 'gif':
      return <GifMessage url={media.url} isFromMe={isFromMe} onClick={onImageClick} />;
    default:
      return null;
  }
};

// Image Message
interface ImageMessageProps {
  url: string;
  thumbnailUrl?: string;
  isFromMe: boolean;
  onClick?: (url: string) => void;
}

const ImageMessage: React.FC<ImageMessageProps> = ({ url, thumbnailUrl, isFromMe, onClick }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      className={`max-w-xs rounded-xl overflow-hidden cursor-pointer ${
        isFromMe ? 'rounded-br-md' : 'rounded-bl-md'
      }`}
      onClick={() => onClick?.(url)}
    >
      <div className="relative bg-gray-100">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-pulse bg-gray-200 w-full h-full" />
          </div>
        )}
        <img
          src={thumbnailUrl || url}
          alt="Shared image"
          className={`w-full h-auto transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          loading="lazy"
        />
        {/* Download indicator */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(url, '_blank');
            }}
            className="p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Video Message
interface VideoMessageProps {
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  isFromMe: boolean;
}

const VideoMessage: React.FC<VideoMessageProps> = ({ url, thumbnailUrl, duration, isFromMe }) => {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  return (
    <div
      className={`max-w-xs rounded-xl overflow-hidden ${
        isFromMe ? 'rounded-br-md' : 'rounded-bl-md'
      }`}
    >
      <div className="relative bg-black">
        <video
          ref={videoRef}
          src={url}
          poster={thumbnailUrl}
          className="w-full h-auto"
          onEnded={() => setPlaying(false)}
          playsInline
        />
        {!playing && (
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
          >
            <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-800 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </button>
        )}
        {/* Duration badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white">
            {formatDuration(duration)}
          </div>
        )}
      </div>
    </div>
  );
};

// Voice Message
interface VoiceMessageProps {
  url: string;
  duration?: number;
  isFromMe: boolean;
}

const VoiceMessage: React.FC<VoiceMessageProps> = ({ url, duration, isFromMe }) => {
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setAudioDuration(audio.duration);
    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-2xl min-w-[200px] ${
        isFromMe
          ? 'bg-gradient-to-r from-pink-500 to-purple-600 rounded-br-md'
          : 'bg-white shadow-sm rounded-bl-md'
      }`}
    >
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* Play/Pause Button */}
      <button
        onClick={togglePlay}
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
          isFromMe ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-600'
        }`}
      >
        {playing ? (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Waveform / Progress */}
      <div className="flex-1">
        <div className="relative h-8 flex items-center gap-0.5">
          {/* Fake waveform bars */}
          {Array.from({ length: 20 }).map((_, i) => {
            const height = Math.random() * 70 + 30;
            const isActive = (i / 20) * 100 <= progress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-colors ${
                  isFromMe
                    ? isActive
                      ? 'bg-white'
                      : 'bg-white/40'
                    : isActive
                      ? 'bg-pink-500'
                      : 'bg-gray-200'
                }`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
        <div className={`text-xs mt-1 ${isFromMe ? 'text-white/80' : 'text-gray-500'}`}>
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </div>
      </div>
    </div>
  );
};

// GIF Message
interface GifMessageProps {
  url: string;
  isFromMe: boolean;
  onClick?: (url: string) => void;
}

const GifMessage: React.FC<GifMessageProps> = ({ url, isFromMe, onClick }) => {
  return (
    <div
      className={`max-w-xs rounded-xl overflow-hidden cursor-pointer ${
        isFromMe ? 'rounded-br-md' : 'rounded-bl-md'
      }`}
      onClick={() => onClick?.(url)}
    >
      <div className="relative">
        <img src={url} alt="GIF" className="w-full h-auto" loading="lazy" />
        {/* GIF badge */}
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 rounded text-xs text-white font-bold">
          GIF
        </div>
      </div>
    </div>
  );
};

// Image Lightbox for viewing full-size images
interface ImageLightboxProps {
  url: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ url, onClose }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full"
        onClick={onClose}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <img
        src={url}
        alt="Full size"
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

export default MediaMessage;
