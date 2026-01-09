/**
 * useMediaMessaging Hook
 *
 * Custom React hook for handling media messaging features:
 * - Photo sharing with upload progress and compression
 * - Voice message recording and playback
 * - GIF search and selection
 * - Typing indicators with WebSocket integration
 */

import { authTokenService } from '@/services/auth-token.service';
import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '../services/api.client';

// Types
export interface PhotoUploadResult {
  success: boolean;
  messageId?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface VoiceMessageResult {
  success: boolean;
  messageId?: string;
  mediaUrl?: string;
  duration?: number;
  transcription?: string;
  waveform?: number[];
  error?: string;
}

export interface GifResult {
  id: string;
  url: string;
  previewUrl: string;
  width: number;
  height: number;
  title?: string;
  source?: 'giphy' | 'tenor';
}

export interface TypingUser {
  userId: string;
  userName?: string;
  startedAt: Date;
}

export interface MediaFormats {
  photo: {
    formats: string[];
    maxFileSize: number;
    maxFileSizeMB: number;
  };
  voice: {
    formats: string[];
    maxFileSize: number;
    maxDuration: number;
    maxDurationFormatted: string;
  };
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp';
}

interface UseMediaMessagingOptions {
  conversationId: string;
  onPhotoSent?: (result: PhotoUploadResult) => void;
  onVoiceSent?: (result: VoiceMessageResult) => void;
  onTypingChange?: (users: TypingUser[]) => void;
  onError?: (error: string) => void;
  /** Socket instance for real-time updates */
  socket?: {
    on: (event: string, callback: (...args: any[]) => void) => void;
    off: (event: string, callback: (...args: any[]) => void) => void;
    emit: (event: string, ...args: any[]) => void;
    connected?: boolean;
  } | null;
  /** Whether socket is connected */
  isSocketConnected?: boolean;
}

// Image compression utility
async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; width: number; height: number }> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85,
    format = 'jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions maintaining aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // Use better image smoothing for quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      const mimeType = format === 'webp' ? 'image/webp' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width, height });
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL from file
    img.src = URL.createObjectURL(file);
  });
}

// Get image dimensions
async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

// Create thumbnail from file
async function createThumbnail(
  file: File,
  maxSize: number = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    img.onload = () => {
      let { width, height } = img;
      const ratio = Math.min(maxSize / width, maxSize / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      canvas.width = width;
      canvas.height = height;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, width, height);

      // Return as data URL for immediate display
      resolve(canvas.toDataURL('image/jpeg', 0.6));
      URL.revokeObjectURL(img.src);
    };

    img.onerror = () => {
      reject(new Error('Failed to create thumbnail'));
      URL.revokeObjectURL(img.src);
    };

    img.src = URL.createObjectURL(file);
  });
}

export function useMediaMessaging(options: UseMediaMessagingOptions) {
  const {
    conversationId,
    onPhotoSent,
    onVoiceSent,
    onTypingChange,
    onError,
    socket,
    isSocketConnected = false,
  } = options;

  // State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [supportedFormats, setSupportedFormats] = useState<MediaFormats | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    localPreview: string;
    localThumbnail: string;
  } | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch supported formats on mount
  useEffect(() => {
    fetchSupportedFormats();
  }, []);

  // Listen for typing indicators from WebSocket
  useEffect(() => {
    if (!socket || !isSocketConnected) return;

    const handleTypingIndicator = (data: {
      conversationId: string;
      userId: string;
      userName?: string;
      isTyping: boolean;
      timestamp: string | Date;
    }) => {
      if (data.conversationId !== conversationId) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          // Add or update typing user
          const existing = prev.find((u) => u.userId === data.userId);
          if (existing) {
            return prev.map((u) =>
              u.userId === data.userId
                ? { ...u, userName: data.userName, startedAt: new Date(data.timestamp) }
                : u
            );
          }
          return [
            ...prev,
            {
              userId: data.userId,
              userName: data.userName,
              startedAt: new Date(data.timestamp),
            },
          ];
        } else {
          // Remove user from typing
          return prev.filter((u) => u.userId !== data.userId);
        }
      });
    };

    socket.on('typing:indicator', handleTypingIndicator);
    // Also listen for the alternative event name
    socket.on('typing', handleTypingIndicator);

    return () => {
      socket.off('typing:indicator', handleTypingIndicator);
      socket.off('typing', handleTypingIndicator);
    };
  }, [socket, isSocketConnected, conversationId]);

  // Auto-remove stale typing users (after 5 seconds without update)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) =>
        prev.filter((user) => now - user.startedAt.getTime() < 5000)
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Notify parent of typing changes
  useEffect(() => {
    onTypingChange?.(typingUsers);
  }, [typingUsers, onTypingChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
      // Send stop typing on unmount
      if (isTypingRef.current && conversationId) {
        sendTypingIndicator(false);
      }
    };
  }, [conversationId]);

  /**
   * Fetch supported media formats and limits
   */
  const fetchSupportedFormats = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: MediaFormats }>(
        '/api/v1/media/supported-formats'
      );
      if (response.success) {
        setSupportedFormats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch supported formats:', error);
      // Set defaults if API fails
      setSupportedFormats({
        photo: {
          formats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
          maxFileSize: 10 * 1024 * 1024,
          maxFileSizeMB: 10,
        },
        voice: {
          formats: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav'],
          maxFileSize: 25 * 1024 * 1024,
          maxDuration: 120,
          maxDurationFormatted: '2:00',
        },
      });
    }
  };

  /**
   * Compress and prepare photo for upload
   */
  const preparePhoto = useCallback(
    async (
      file: File,
      compressionOptions?: CompressionOptions
    ): Promise<{
      blob: Blob;
      width: number;
      height: number;
      localPreview: string;
      localThumbnail: string;
    }> => {
      setIsCompressing(true);

      try {
        // Create local preview and thumbnail for immediate display
        const localPreview = URL.createObjectURL(file);
        const localThumbnail = await createThumbnail(file);

        // Check if compression is needed
        const needsCompression =
          file.size > 500 * 1024 || // Larger than 500KB
          !['image/jpeg', 'image/webp'].includes(file.type);

        let result: { blob: Blob; width: number; height: number };

        if (needsCompression) {
          result = await compressImage(file, {
            maxWidth: compressionOptions?.maxWidth || 1920,
            maxHeight: compressionOptions?.maxHeight || 1920,
            quality: compressionOptions?.quality || 0.85,
            format: compressionOptions?.format || 'jpeg',
          });
        } else {
          // Just get dimensions without compression
          const dimensions = await getImageDimensions(file);
          result = {
            blob: file,
            width: dimensions.width,
            height: dimensions.height,
          };
        }

        return {
          ...result,
          localPreview,
          localThumbnail,
        };
      } finally {
        setIsCompressing(false);
      }
    },
    []
  );

  /**
   * Upload and send a photo message
   */
  const sendPhoto = useCallback(
    async (
      file: File,
      compressionOptions?: CompressionOptions
    ): Promise<PhotoUploadResult> => {
      if (!conversationId) {
        return { success: false, error: 'No conversation selected' };
      }

      // Validate file type
      const supportedTypes = supportedFormats?.photo.formats || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      if (!supportedTypes.includes(file.type)) {
        const error = 'Unsupported image format. Please use JPEG, PNG, GIF, or WebP.';
        onError?.(error);
        return { success: false, error };
      }

      // Validate file size (before compression)
      const maxSize = supportedFormats?.photo.maxFileSize || 10 * 1024 * 1024;
      if (file.size > maxSize * 2) {
        // Allow 2x max since we'll compress
        const error = `Image is too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB.`;
        onError?.(error);
        return { success: false, error };
      }

      setIsUploading(true);
      setUploadProgress(0);

      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController();

      try {
        // Compress and prepare the image
        const prepared = await preparePhoto(file, compressionOptions);

        // Store pending upload for preview
        setPendingUpload({
          file,
          localPreview: prepared.localPreview,
          localThumbnail: prepared.localThumbnail,
        });

        setUploadProgress(10); // Compression complete

        // Create form data
        const formData = new FormData();
        formData.append(
          'photo',
          prepared.blob,
          file.name.replace(/\.[^.]+$/, '.jpg')
        );

        // Upload with progress tracking
        const response = await uploadWithProgress(
          `/api/v1/conversations/${conversationId}/messages/photo`,
          formData,
          (progress) => setUploadProgress(10 + progress * 0.9), // 10-100%
          abortControllerRef.current.signal
        );

        const result: PhotoUploadResult = {
          success: true,
          messageId: response.data?.id,
          mediaUrl: response.data?.metadata?.mediaUrl,
          thumbnailUrl: response.data?.metadata?.thumbnailUrl,
          width: prepared.width,
          height: prepared.height,
        };

        // Cleanup local preview URLs
        URL.revokeObjectURL(prepared.localPreview);

        onPhotoSent?.(result);
        return result;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Upload cancelled' };
        }
        const errorMessage = error.response?.data?.error || error.message || 'Failed to send photo';
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setPendingUpload(null);
        abortControllerRef.current = null;
      }
    },
    [conversationId, supportedFormats, preparePhoto, onPhotoSent, onError]
  );

  /**
   * Cancel ongoing upload
   */
  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsUploading(false);
    setUploadProgress(0);
    setPendingUpload(null);
  }, []);

  /**
   * Upload file with progress tracking
   */
  async function uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = event.loaded / event.total;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ success: true });
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject({ response: { data: errorData }, message: errorData.error });
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        const abortError = new Error('Upload aborted');
        abortError.name = 'AbortError';
        reject(abortError);
      });

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      xhr.open('POST', url);

      // Add auth header
      const token = authTokenService.getToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.send(formData);
    });
  }

  /**
   * Start recording a voice message
   */
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use opus codec for better compression
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const maxDuration = supportedFormats?.voice.maxDuration || 120;
          if (prev >= maxDuration - 1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 1;
        });
      }, 1000);

      return true;
    } catch (error: any) {
      console.error('Failed to start recording:', error);
      let errorMessage = 'Failed to access microphone';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Microphone access denied. Please grant permission.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No microphone found on this device.';
      }
      onError?.(errorMessage);
      return false;
    }
  }, [supportedFormats, onError]);

  /**
   * Stop recording and return the audio blob
   */
  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        setIsRecording(false);
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsRecording(false);
        resolve(blob);

        // Stop all tracks
        const stream = mediaRecorderRef.current?.stream;
        stream?.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.stop();
    });
  }, []);

  /**
   * Cancel recording without sending
   */
  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      const stream = mediaRecorderRef.current.stream;
      stream.getTracks().forEach((track) => track.stop());
    }

    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  /**
   * Send a voice message
   */
  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob): Promise<VoiceMessageResult> => {
      if (!conversationId) {
        return { success: false, error: 'No conversation selected' };
      }

      if (audioBlob.size === 0) {
        return { success: false, error: 'Recording is empty' };
      }

      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        const extension = audioBlob.type.includes('webm') ? 'webm' : 'mp4';
        formData.append('voice', audioBlob, `voice-message.${extension}`);

        const response = await uploadWithProgress(
          `/api/v1/conversations/${conversationId}/messages/voice`,
          formData,
          (progress) => setUploadProgress(progress * 100),
          undefined
        );

        const result: VoiceMessageResult = {
          success: true,
          messageId: response.data?.id,
          mediaUrl: response.data?.metadata?.mediaUrl,
          duration: response.data?.metadata?.duration,
          waveform: response.data?.metadata?.waveform,
          transcription:
            response.data?.content !== '[Voice Message]'
              ? response.data?.content
              : undefined,
        };

        onVoiceSent?.(result);
        return result;
      } catch (error: any) {
        const errorMessage =
          error.response?.data?.error || error.message || 'Failed to send voice message';
        onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        setRecordingDuration(0);
      }
    },
    [conversationId, onVoiceSent, onError]
  );

  /**
   * Record and send voice message in one action
   */
  const recordAndSendVoice = useCallback(async (): Promise<VoiceMessageResult> => {
    const blob = await stopRecording();
    if (!blob) {
      return { success: false, error: 'No recording to send' };
    }
    return sendVoiceMessage(blob);
  }, [stopRecording, sendVoiceMessage]);

  /**
   * Search for GIFs
   */
  const searchGifs = useCallback(
    async (query: string, limit: number = 20): Promise<GifResult[]> => {
      try {
        const response = await apiClient.get<{ success: boolean; data: any[] }>(
          `/api/v1/gifs/search?query=${encodeURIComponent(query)}&limit=${limit}`
        );

        if (response.success) {
          return response.data.map((gif: any) => ({
            id: gif.giphyId || gif.tenorId || gif.id,
            url: gif.gifUrl || gif.url,
            previewUrl: gif.gifPreviewUrl || gif.previewUrl,
            width: gif.width,
            height: gif.height,
            title: gif.title,
            source: gif.giphyId ? 'giphy' : 'tenor',
          }));
        }
        return [];
      } catch (error) {
        console.error('Failed to search GIFs:', error);
        return [];
      }
    },
    []
  );

  /**
   * Get trending GIFs
   */
  const getTrendingGifs = useCallback(async (limit: number = 20): Promise<GifResult[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>(
        `/api/v1/gifs/trending?limit=${limit}`
      );

      if (response.success) {
        return response.data.map((gif: any) => ({
          id: gif.giphyId || gif.tenorId || gif.id,
          url: gif.gifUrl || gif.url,
          previewUrl: gif.gifPreviewUrl || gif.previewUrl,
          width: gif.width,
          height: gif.height,
          title: gif.title,
          source: gif.giphyId ? 'giphy' : 'tenor',
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get trending GIFs:', error);
      return [];
    }
  }, []);

  /**
   * Get GIF categories
   */
  const getGifCategories = useCallback(async (): Promise<string[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: string[] }>(
        '/api/v1/gifs/categories'
      );
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error('Failed to get GIF categories:', error);
      return [];
    }
  }, []);

  /**
   * Send typing indicator via HTTP (fallback when socket unavailable)
   */
  const sendTypingIndicatorHttp = useCallback(
    async (isTyping: boolean) => {
      if (!conversationId) return;

      try {
        await apiClient.post(`/api/v1/conversations/${conversationId}/typing`, {
          isTyping,
        });
      } catch (error) {
        console.error('Failed to send typing indicator via HTTP:', error);
      }
    },
    [conversationId]
  );

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;

      // Use WebSocket if available, otherwise fall back to HTTP
      if (socket && isSocketConnected) {
        if (isTyping) {
          socket.emit('typing:start', { conversationId });
        } else {
          socket.emit('typing:stop', { conversationId });
        }
      } else {
        sendTypingIndicatorHttp(isTyping);
      }
    },
    [conversationId, socket, isSocketConnected, sendTypingIndicatorHttp]
  );

  /**
   * Start typing - debounced to prevent excessive updates
   */
  const startTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingIndicator(true);
    }

    // Auto-stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingIndicator(false);
      }
    }, 3000);
  }, [sendTypingIndicator]);

  /**
   * Stop typing
   */
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      sendTypingIndicator(false);
    }
  }, [sendTypingIndicator]);

  /**
   * Format recording duration for display
   */
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * Get maximum recording duration
   */
  const getMaxRecordingDuration = useCallback((): number => {
    return supportedFormats?.voice.maxDuration || 120;
  }, [supportedFormats]);

  /**
   * Check if file type is supported
   */
  const isPhotoSupported = useCallback(
    (file: File): boolean => {
      const supportedTypes = supportedFormats?.photo.formats || [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ];
      return supportedTypes.includes(file.type);
    },
    [supportedFormats]
  );

  return {
    // Photo sharing
    sendPhoto,
    preparePhoto,
    cancelUpload,
    isUploading,
    uploadProgress,
    isCompressing,
    pendingUpload,
    isPhotoSupported,

    // Voice messages
    startRecording,
    stopRecording,
    cancelRecording,
    sendVoiceMessage,
    recordAndSendVoice,
    isRecording,
    recordingDuration,
    formatDuration,
    getMaxRecordingDuration,

    // GIF integration
    searchGifs,
    getTrendingGifs,
    getGifCategories,

    // Typing indicators
    startTyping,
    stopTyping,
    typingUsers,

    // Supported formats
    supportedFormats,
  };
}

export default useMediaMessaging;
