/**
 * Camera Service
 * Handles photo and video capture with proper permissions
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse, CameraOptions, ImageLibraryOptions } from 'react-native-image-picker';
import ImageCropPicker, { Image as CroppedImage, Options as CropOptions } from 'react-native-image-crop-picker';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

export interface CapturePhotoOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  allowsEditing?: boolean;
  cameraType?: 'front' | 'back';
  multiple?: boolean;
  maxFiles?: number;
}

export interface CaptureVideoOptions {
  maxDuration?: number;
  quality?: 'low' | 'medium' | 'high';
  cameraType?: 'front' | 'back';
}

export interface MediaAsset {
  uri: string;
  type: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number;
}

class CameraServiceClass {
  /**
   * Request camera permission
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'Flamoral needs access to your camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const permission: Permission = PERMISSIONS.IOS.CAMERA;
        const result = await request(permission);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  }

  /**
   * Request photo library permission
   */
  async requestPhotoLibraryPermission(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
      } else {
        const permission: Permission = PERMISSIONS.IOS.PHOTO_LIBRARY;
        const result = await request(permission);
        return result === RESULTS.GRANTED;
      }
    } catch (error) {
      console.error('Error requesting photo library permission:', error);
      return false;
    }
  }

  /**
   * Capture photo with camera
   */
  async capturePhoto(options: CapturePhotoOptions = {}): Promise<MediaAsset | null> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to take photos. Please enable it in settings.'
        );
        return null;
      }

      const cameraOptions: CameraOptions = {
        mediaType: 'photo',
        maxWidth: options.maxWidth || 1200,
        maxHeight: options.maxHeight || 1200,
        quality: options.quality || 0.8,
        cameraType: options.cameraType || 'back',
        saveToPhotos: false,
      };

      const response: ImagePickerResponse = await launchCamera(cameraOptions);

      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return null;
      }

      const asset = response.assets[0];

      return {
        uri: asset.uri!,
        type: asset.type || 'image/jpeg',
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      };
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      return null;
    }
  }

  /**
   * Select photo from gallery
   */
  async selectPhotos(options: CapturePhotoOptions = {}): Promise<MediaAsset[]> {
    try {
      const hasPermission = await this.requestPhotoLibraryPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Photo library permission is required. Please enable it in settings.'
        );
        return [];
      }

      const libraryOptions: ImageLibraryOptions = {
        mediaType: 'photo',
        maxWidth: options.maxWidth || 1200,
        maxHeight: options.maxHeight || 1200,
        quality: options.quality || 0.8,
        selectionLimit: options.multiple ? (options.maxFiles || 6) : 1,
      };

      const response: ImagePickerResponse = await launchImageLibrary(libraryOptions);

      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return [];
      }

      return response.assets.map(asset => ({
        uri: asset.uri!,
        type: asset.type || 'image/jpeg',
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      }));
    } catch (error) {
      console.error('Error selecting photos:', error);
      Alert.alert('Error', 'Failed to select photos. Please try again.');
      return [];
    }
  }

  /**
   * Capture and crop photo for profile picture
   */
  async captureAndCropPhoto(): Promise<MediaAsset | null> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        return null;
      }

      const image: CroppedImage = await ImageCropPicker.openCamera({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: true,
        includeBase64: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      return {
        uri: image.path,
        type: image.mime,
        fileName: image.filename,
        fileSize: image.size,
        width: image.width,
        height: image.height,
      };
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Error capturing and cropping photo:', error);
        Alert.alert('Error', 'Failed to capture photo. Please try again.');
      }
      return null;
    }
  }

  /**
   * Select and crop photo from gallery
   */
  async selectAndCropPhoto(): Promise<MediaAsset | null> {
    try {
      const hasPermission = await this.requestPhotoLibraryPermission();
      if (!hasPermission) {
        return null;
      }

      const image: CroppedImage = await ImageCropPicker.openPicker({
        width: 800,
        height: 800,
        cropping: true,
        cropperCircleOverlay: true,
        includeBase64: false,
        compressImageQuality: 0.8,
        mediaType: 'photo',
      });

      return {
        uri: image.path,
        type: image.mime,
        fileName: image.filename,
        fileSize: image.size,
        width: image.width,
        height: image.height,
      };
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Error selecting and cropping photo:', error);
        Alert.alert('Error', 'Failed to select photo. Please try again.');
      }
      return null;
    }
  }

  /**
   * Select multiple photos for profile
   */
  async selectMultiplePhotos(maxFiles: number = 6): Promise<MediaAsset[]> {
    try {
      const hasPermission = await this.requestPhotoLibraryPermission();
      if (!hasPermission) {
        return [];
      }

      const images: CroppedImage[] = await ImageCropPicker.openPicker({
        multiple: true,
        maxFiles,
        mediaType: 'photo',
        compressImageQuality: 0.8,
        includeBase64: false,
      });

      return images.map(image => ({
        uri: image.path,
        type: image.mime,
        fileName: image.filename,
        fileSize: image.size,
        width: image.width,
        height: image.height,
      }));
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Error selecting multiple photos:', error);
        Alert.alert('Error', 'Failed to select photos. Please try again.');
      }
      return [];
    }
  }

  /**
   * Capture video with camera
   */
  async captureVideo(options: CaptureVideoOptions = {}): Promise<MediaAsset | null> {
    try {
      const hasPermission = await this.requestCameraPermission();
      if (!hasPermission) {
        Alert.alert(
          'Permission Denied',
          'Camera permission is required to record videos. Please enable it in settings.'
        );
        return null;
      }

      const cameraOptions: CameraOptions = {
        mediaType: 'video',
        videoQuality: options.quality || 'medium',
        durationLimit: options.maxDuration || 30,
        cameraType: options.cameraType || 'back',
        saveToPhotos: false,
      };

      const response: ImagePickerResponse = await launchCamera(cameraOptions);

      if (response.didCancel || !response.assets || response.assets.length === 0) {
        return null;
      }

      const asset = response.assets[0];

      return {
        uri: asset.uri!,
        type: asset.type || 'video/mp4',
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
      };
    } catch (error) {
      console.error('Error capturing video:', error);
      Alert.alert('Error', 'Failed to capture video. Please try again.');
      return null;
    }
  }

  /**
   * Select video from gallery
   */
  async selectVideo(maxDuration: number = 30): Promise<MediaAsset | null> {
    try {
      const hasPermission = await this.requestPhotoLibraryPermission();
      if (!hasPermission) {
        return null;
      }

      const video: CroppedImage = await ImageCropPicker.openPicker({
        mediaType: 'video',
        compressVideoPreset: 'MediumQuality',
      });

      if (video.duration && video.duration > maxDuration * 1000) {
        Alert.alert(
          'Video Too Long',
          `Please select a video shorter than ${maxDuration} seconds.`
        );
        return null;
      }

      return {
        uri: video.path,
        type: video.mime,
        fileName: video.filename,
        fileSize: video.size,
        width: video.width,
        height: video.height,
        duration: video.duration ? video.duration / 1000 : undefined,
      };
    } catch (error: any) {
      if (error.code !== 'E_PICKER_CANCELLED') {
        console.error('Error selecting video:', error);
        Alert.alert('Error', 'Failed to select video. Please try again.');
      }
      return null;
    }
  }

  /**
   * Show photo selection action sheet
   */
  showPhotoSelectionActionSheet(
    onCamera: () => void,
    onGallery: () => void
  ): void {
    Alert.alert(
      'Select Photo',
      'Choose a photo from:',
      [
        {
          text: 'Camera',
          onPress: onCamera,
        },
        {
          text: 'Photo Library',
          onPress: onGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }
}

export const CameraService = new CameraServiceClass();
