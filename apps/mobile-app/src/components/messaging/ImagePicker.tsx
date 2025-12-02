/**
 * Image Picker Component
 * Allows users to select and send images in messages
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

interface ImagePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectImage: (image: { uri: string; type: string; name: string }) => void;
}

export const ImagePickerModal: React.FC<ImagePickerModalProps> = ({
  visible,
  onClose,
  onSelectImage,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.CAMERA
        : PERMISSIONS.ANDROID.CAMERA;

      const result = await request(permission);

      if (result === RESULTS.GRANTED) {
        return true;
      } else if (result === RESULTS.DENIED) {
        Alert.alert(
          'Camera Permission',
          'Please grant camera permission to take photos.',
          [{ text: 'OK' }]
        );
        return false;
      } else if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Camera Permission Blocked',
          'Please enable camera permission in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      return false;
    }
  };

  const requestPhotoLibraryPermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.OS === 'ios'
        ? PERMISSIONS.IOS.PHOTO_LIBRARY
        : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE;

      const result = await request(permission);

      if (result === RESULTS.GRANTED) {
        return true;
      } else if (result === RESULTS.DENIED) {
        Alert.alert(
          'Photo Library Permission',
          'Please grant photo library permission to select images.',
          [{ text: 'OK' }]
        );
        return false;
      } else if (result === RESULTS.BLOCKED) {
        Alert.alert(
          'Photo Library Permission Blocked',
          'Please enable photo library permission in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting photo library permission:', error);
      return false;
    }
  };

  const handleImageResponse = useCallback((response: ImagePickerResponse) => {
    if (response.didCancel) {
      console.log('User cancelled image picker');
      return;
    }

    if (response.errorCode) {
      console.error('ImagePicker Error:', response.errorMessage);
      Alert.alert('Error', 'Failed to select image. Please try again.');
      return;
    }

    if (response.assets && response.assets.length > 0) {
      const asset = response.assets[0];
      if (asset.uri) {
        setSelectedImage(asset.uri);
      }
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 1920,
      maxHeight: 1920,
      saveToPhotos: false,
    };

    launchCamera(options, handleImageResponse);
  }, [handleImageResponse]);

  const handleChooseFromLibrary = useCallback(async () => {
    const hasPermission = await requestPhotoLibraryPermission();
    if (!hasPermission) return;

    const options = {
      mediaType: 'photo' as const,
      quality: 0.8 as const,
      maxWidth: 1920,
      maxHeight: 1920,
      selectionLimit: 1,
    };

    launchImageLibrary(options, handleImageResponse);
  }, [handleImageResponse]);

  const handleSendImage = useCallback(() => {
    if (!selectedImage) return;

    setIsUploading(true);

    // Extract filename from URI
    const uriParts = selectedImage.split('/');
    const fileName = uriParts[uriParts.length - 1];

    // Determine file type
    const fileType = fileName.includes('.png')
      ? 'image/png'
      : fileName.includes('.jpg') || fileName.includes('.jpeg')
      ? 'image/jpeg'
      : 'image/jpg';

    onSelectImage({
      uri: selectedImage,
      type: fileType,
      name: fileName,
    });

    // Reset state
    setSelectedImage(null);
    setIsUploading(false);
    onClose();
  }, [selectedImage, onSelectImage, onClose]);

  const handleCancel = useCallback(() => {
    setSelectedImage(null);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.overlay}>
        <View style={styles.container}>
          {selectedImage ? (
            // Image Preview
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>Send this photo?</Text>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.imageContainer}>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} resizeMode="contain" />
              </View>

              <View style={styles.previewActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.retakeButtonText}>Choose Different Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendImage}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send Photo</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Selection Options
            <View style={styles.optionsContainer}>
              <View style={styles.optionsHeader}>
                <Text style={styles.optionsTitle}>Select Photo</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.options}>
                <TouchableOpacity style={styles.option} onPress={handleTakePhoto}>
                  <View style={styles.optionIcon}>
                    <Text style={styles.optionIconText}>📷</Text>
                  </View>
                  <Text style={styles.optionLabel}>Take Photo</Text>
                  <Text style={styles.optionDescription}>Use your camera</Text>
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                <TouchableOpacity style={styles.option} onPress={handleChooseFromLibrary}>
                  <View style={styles.optionIcon}>
                    <Text style={styles.optionIconText}>🖼️</Text>
                  </View>
                  <Text style={styles.optionLabel}>Choose from Library</Text>
                  <Text style={styles.optionDescription}>Select from your photos</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.cancelOption} onPress={onClose}>
                <Text style={styles.cancelOptionText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  // Options View
  optionsContainer: {
    paddingBottom: 20,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#666',
  },
  options: {
    paddingVertical: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionIconText: {
    fontSize: 28,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 20,
  },
  cancelOption: {
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  // Preview View
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 20,
    color: '#666',
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewActions: {
    padding: 20,
    gap: 12,
  },
  retakeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  sendButton: {
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#E91E63',
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
