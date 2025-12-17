/**
 * useCamera Hook
 * Custom hook for camera and photo operations
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { CameraService, MediaAsset, CapturePhotoOptions, CaptureVideoOptions } from '@services/camera/CameraService';

interface UseCameraReturn {
  capturePhoto: (options?: CapturePhotoOptions) => Promise<MediaAsset | null>;
  selectPhotos: (options?: CapturePhotoOptions) => Promise<MediaAsset[]>;
  captureAndCropPhoto: () => Promise<MediaAsset | null>;
  selectAndCropPhoto: () => Promise<MediaAsset | null>;
  selectMultiplePhotos: (maxFiles?: number) => Promise<MediaAsset[]>;
  captureVideo: (options?: CaptureVideoOptions) => Promise<MediaAsset | null>;
  selectVideo: (maxDuration?: number) => Promise<MediaAsset | null>;
  showPhotoSelectionSheet: (onCamera: () => void, onGallery: () => void) => void;
  loading: boolean;
  error: string | null;
}

export const useCamera = (): UseCameraReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const capturePhoto = useCallback(async (options?: CapturePhotoOptions) => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.capturePhoto(options);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to capture photo';
      setError(errorMessage);
      console.error('Error in capturePhoto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPhotos = useCallback(async (options?: CapturePhotoOptions) => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.selectPhotos(options);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to select photos';
      setError(errorMessage);
      console.error('Error in selectPhotos:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const captureAndCropPhoto = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.captureAndCropPhoto();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to capture and crop photo';
      setError(errorMessage);
      console.error('Error in captureAndCropPhoto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectAndCropPhoto = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.selectAndCropPhoto();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to select and crop photo';
      setError(errorMessage);
      console.error('Error in selectAndCropPhoto:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectMultiplePhotos = useCallback(async (maxFiles: number = 6) => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.selectMultiplePhotos(maxFiles);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to select multiple photos';
      setError(errorMessage);
      console.error('Error in selectMultiplePhotos:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const captureVideo = useCallback(async (options?: CaptureVideoOptions) => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.captureVideo(options);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to capture video';
      setError(errorMessage);
      console.error('Error in captureVideo:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectVideo = useCallback(async (maxDuration: number = 30) => {
    try {
      setLoading(true);
      setError(null);
      const result = await CameraService.selectVideo(maxDuration);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to select video';
      setError(errorMessage);
      console.error('Error in selectVideo:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const showPhotoSelectionSheet = useCallback(
    (onCamera: () => void, onGallery: () => void) => {
      CameraService.showPhotoSelectionActionSheet(onCamera, onGallery);
    },
    []
  );

  return {
    capturePhoto,
    selectPhotos,
    captureAndCropPhoto,
    selectAndCropPhoto,
    selectMultiplePhotos,
    captureVideo,
    selectVideo,
    showPhotoSelectionSheet,
    loading,
    error,
  };
};
