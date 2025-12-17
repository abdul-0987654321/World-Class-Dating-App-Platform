/**
 * Media Service
 * Handles media uploads, processing, and CDN integration
 */

import apiClient from './api.client';
import { getMediaUrl, getOptimizedImageUrl, getThumbnailUrl } from '../utils/cdn';

export interface MediaUploadResponse {
  id: string;
  url: string;
  thumbnailUrl: string;
  standardUrl: string;
  hdUrl: string;
  originalUrl: string;
  type: 'image' | 'video' | 'audio';
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface VideoUploadResponse extends MediaUploadResponse {
  type: 'video';
  duration: number;
  thumbnails: string[];
}

export interface MediaUploadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
  isPrimary?: boolean;
  tags?: string[];
}

export interface ImageOptimizationSettings {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

class MediaService {
  private readonly MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  private readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

  /**
   * Upload a photo
   */
  async uploadPhoto(
    file: File,
    options: MediaUploadOptions = {}
  ): Promise<MediaUploadResponse> {
    // Validate file
    this.validateImage(file);

    // Create form data
    const formData = new FormData();
    formData.append('photo', file);

    if (options.isPrimary !== undefined) {
      formData.append('isPrimary', String(options.isPrimary));
    }

    if (options.tags && options.tags.length > 0) {
      formData.append('tags', JSON.stringify(options.tags));
    }

    // Upload with progress tracking
    const response = await this.uploadWithProgress(
      '/api/v1/media/photos',
      formData,
      options.onProgress,
      options.signal
    );

    // Convert blob URLs to CDN URLs
    return this.processCdnUrls(response);
  }

  /**
   * Upload a video
   */
  async uploadVideo(
    file: File,
    options: MediaUploadOptions = {}
  ): Promise<VideoUploadResponse> {
    // Validate file
    this.validateVideo(file);

    // Create form data
    const formData = new FormData();
    formData.append('video', file);

    if (options.tags && options.tags.length > 0) {
      formData.append('tags', JSON.stringify(options.tags));
    }

    // Upload with progress tracking
    const response = await this.uploadWithProgress(
      '/api/v1/media/videos',
      formData,
      options.onProgress,
      options.signal
    );

    // Convert blob URLs to CDN URLs
    return this.processCdnUrls(response) as VideoUploadResponse;
  }

  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(
    file: File,
    isPrimary: boolean = false,
    onProgress?: (progress: number) => void
  ): Promise<MediaUploadResponse> {
    return this.uploadPhoto(file, { isPrimary, onProgress });
  }

  /**
   * Upload verification photo
   */
  async uploadVerificationPhoto(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<MediaUploadResponse> {
    this.validateImage(file);

    const formData = new FormData();
    formData.append('photo', file);

    const response = await this.uploadWithProgress(
      '/api/v1/verification/photo',
      formData,
      onProgress
    );

    return this.processCdnUrls(response);
  }

  /**
   * Delete media by ID
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await apiClient.delete(`/api/v1/media/${mediaId}`);
  }

  /**
   * Get media by ID
   */
  async getMedia(mediaId: string): Promise<MediaUploadResponse> {
    const response = await apiClient.get<MediaUploadResponse>(`/api/v1/media/${mediaId}`);
    return this.processCdnUrls(response);
  }

  /**
   * Get user's media
   */
  async getUserMedia(
    userId: string,
    type?: 'image' | 'video'
  ): Promise<MediaUploadResponse[]> {
    const params = type ? { type } : {};
    const response = await apiClient.get<MediaUploadResponse[]>(
      `/api/v1/media/user/${userId}`,
      params
    );
    return response.map((media) => this.processCdnUrls(media));
  }

  /**
   * Optimize image before upload
   */
  async optimizeImage(
    file: File,
    settings: ImageOptimizationSettings = {}
  ): Promise<File> {
    const {
      maxWidth = 1920,
      maxHeight = 1920,
      quality = 0.85,
      format = 'jpeg',
    } = settings;

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();

        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to optimize image'));
                return;
              }

              const optimizedFile = new File([blob], file.name, {
                type: `image/${format}`,
                lastModified: Date.now(),
              });

              resolve(optimizedFile);
            },
            `image/${format}`,
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate image file
   */
  private validateImage(file: File): void {
    if (!this.ALLOWED_IMAGE_TYPES.includes(file.type)) {
      throw new Error(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
      );
    }

    if (file.size > this.MAX_IMAGE_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.MAX_IMAGE_SIZE / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Validate video file
   */
  private validateVideo(file: File): void {
    if (!this.ALLOWED_VIDEO_TYPES.includes(file.type)) {
      throw new Error(
        'Invalid file type. Only MP4, QuickTime, and WebM videos are allowed.'
      );
    }

    if (file.size > this.MAX_VIDEO_SIZE) {
      throw new Error(
        `File size exceeds maximum allowed size of ${this.MAX_VIDEO_SIZE / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Upload with progress tracking
   */
  private async uploadWithProgress(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            onProgress(progress);
          }
        });
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid response from server'));
          }
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      // Open request
      xhr.open('POST', url);

      // Auth is handled via httpOnly cookies (credentials: 'include')
      // No need to manually set Authorization header
      xhr.withCredentials = true;

      // Send request
      xhr.send(formData);
    });
  }

  /**
   * Process CDN URLs in media response
   */
  private processCdnUrls<T extends MediaUploadResponse>(media: T): T {
    return {
      ...media,
      url: getMediaUrl(media.url),
      thumbnailUrl: media.thumbnailUrl ? getMediaUrl(media.thumbnailUrl) : media.thumbnailUrl,
      standardUrl: media.standardUrl ? getMediaUrl(media.standardUrl) : media.standardUrl,
      hdUrl: media.hdUrl ? getMediaUrl(media.hdUrl) : media.hdUrl,
      originalUrl: media.originalUrl ? getMediaUrl(media.originalUrl) : media.originalUrl,
      ...(media.type === 'video' && (media as VideoUploadResponse).thumbnails
        ? {
            thumbnails: (media as VideoUploadResponse).thumbnails.map((thumb) =>
              getMediaUrl(thumb)
            ),
          }
        : {}),
    };
  }

  /**
   * Generate thumbnail from video
   */
  async generateVideoThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        // Seek to 1 second or 10% of video duration
        video.currentTime = Math.min(1, video.duration * 0.1);
      };

      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          0.85
        );
      };

      video.onerror = () => reject(new Error('Failed to load video'));

      video.src = URL.createObjectURL(file);
    });
  }
}

export const mediaService = new MediaService();
export default mediaService;
