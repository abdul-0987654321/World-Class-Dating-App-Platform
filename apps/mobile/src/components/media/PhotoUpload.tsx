import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Button } from '../common/Button';

// Note: These would be imported from react-native-image-picker and react-native-image-crop-picker
// For now, using type definitions
interface ImagePickerResponse {
  assets?: Array<{
    uri: string;
    type?: string;
    fileName?: string;
    fileSize?: number;
  }>;
  didCancel?: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export interface ProfilePhoto {
  id: string;
  url: string;
  thumbnailUrl?: string;
  order: number;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface PhotoUploadProps {
  photos: ProfilePhoto[];
  maxPhotos?: number;
  onPhotosChange: (photos: ProfilePhoto[]) => void;
  onPhotoUpload: (file: any) => Promise<{ url: string; thumbnailUrl: string }>;
  onPhotoDelete: (photoId: string) => Promise<void>;
  onPhotoReorder: (photos: ProfilePhoto[]) => Promise<void>;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photos,
  maxPhotos = 6,
  onPhotosChange,
  onPhotoUpload,
  onPhotoDelete,
  onPhotoReorder,
}) => {
  const [uploadingPhotos, setUploadingPhotos] = useState<Set<string>>(new Set());
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    if (photos.length >= maxPhotos) {
      Alert.alert('Maximum Photos', `You can only upload up to ${maxPhotos} photos.`);
      return;
    }

    try {
      // Note: In a real implementation, this would use react-native-image-picker
      // For now, showing the interface structure

      Alert.alert(
        'Select Photo',
        `This would open the ${source === 'camera' ? 'camera' : 'photo gallery'}`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'OK',
            onPress: () => handleImageSelected(source),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const handleImageSelected = async (source: 'camera' | 'gallery') => {
    // This is a placeholder - in production, this would handle the actual image selection
    // using react-native-image-picker and react-native-image-crop-picker

    // Example implementation:
    /*
    import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
    import ImagePicker from 'react-native-image-crop-picker';

    const result = await (source === 'camera'
      ? launchCamera({ mediaType: 'photo', quality: 0.8 })
      : launchImageLibrary({ mediaType: 'photo', quality: 0.8 })
    );

    if (result.assets && result.assets[0]) {
      const croppedImage = await ImagePicker.openCropper({
        path: result.assets[0].uri,
        width: 1080,
        height: 1080,
        cropping: true,
        cropperCircleOverlay: false,
        compressImageQuality: 0.8,
      });

      await handlePhotoUpload(croppedImage);
    }
    */
  };

  const handlePhotoUpload = async (imageData: any) => {
    const tempId = `temp-${Date.now()}`;

    // Add temporary photo with loading state
    const tempPhoto: ProfilePhoto = {
      id: tempId,
      url: imageData.uri || '',
      order: photos.length,
      isUploading: true,
      uploadProgress: 0,
    };

    const updatedPhotos = [...photos, tempPhoto];
    onPhotosChange(updatedPhotos);
    setUploadingPhotos((prev) => new Set(prev).add(tempId));

    try {
      // Simulate upload progress (in production, this would be real progress)
      const progressInterval = setInterval(() => {
        const photo = updatedPhotos.find((p) => p.id === tempId);
        if (photo && photo.uploadProgress !== undefined && photo.uploadProgress < 90) {
          photo.uploadProgress += 10;
          onPhotosChange([...updatedPhotos]);
        }
      }, 200);

      // Upload to backend (Azure Blob Storage)
      const { url, thumbnailUrl } = await onPhotoUpload(imageData);

      clearInterval(progressInterval);

      // Replace temporary photo with actual photo
      const finalPhoto: ProfilePhoto = {
        id: `photo-${Date.now()}`,
        url,
        thumbnailUrl,
        order: photos.length,
        isUploading: false,
      };

      const finalPhotos = updatedPhotos.map((p) =>
        p.id === tempId ? finalPhoto : p
      );

      onPhotosChange(finalPhotos);
      setUploadingPhotos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    } catch (error) {
      Alert.alert('Upload Failed', 'Failed to upload photo. Please try again.');
      console.error('Photo upload error:', error);

      // Remove temporary photo
      const filteredPhotos = updatedPhotos.filter((p) => p.id !== tempId);
      onPhotosChange(filteredPhotos);
      setUploadingPhotos((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await onPhotoDelete(photoId);
              const filteredPhotos = photos
                .filter((p) => p.id !== photoId)
                .map((p, index) => ({ ...p, order: index }));
              onPhotosChange(filteredPhotos);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete photo. Please try again.');
              console.error('Photo delete error:', error);
            }
          },
        },
      ]
    );
  };

  const handleReorderStart = (photoId: string) => {
    setDraggedPhotoId(photoId);
  };

  const handleReorderDrop = async (targetPhotoId: string) => {
    if (!draggedPhotoId || draggedPhotoId === targetPhotoId) {
      setDraggedPhotoId(null);
      return;
    }

    const draggedIndex = photos.findIndex((p) => p.id === draggedPhotoId);
    const targetIndex = photos.findIndex((p) => p.id === targetPhotoId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPhotoId(null);
      return;
    }

    const reorderedPhotos = [...photos];
    const [draggedPhoto] = reorderedPhotos.splice(draggedIndex, 1);
    reorderedPhotos.splice(targetIndex, 0, draggedPhoto);

    const updatedPhotos = reorderedPhotos.map((p, index) => ({
      ...p,
      order: index,
    }));

    onPhotosChange(updatedPhotos);
    setDraggedPhotoId(null);

    try {
      await onPhotoReorder(updatedPhotos);
    } catch (error) {
      Alert.alert('Error', 'Failed to save photo order. Please try again.');
      console.error('Photo reorder error:', error);
      // Revert to original order
      onPhotosChange(photos);
    }
  };

  const renderPhotoSlot = (photo?: ProfilePhoto, index?: number) => {
    const isUploading = photo?.isUploading;
    const isPrimaryPhoto = index === 0;

    return (
      <TouchableOpacity
        key={photo?.id || `empty-${index}`}
        style={[
          styles.photoSlot,
          isPrimaryPhoto && styles.primaryPhotoSlot,
          draggedPhotoId === photo?.id && styles.draggedPhotoSlot,
        ]}
        onPress={() => {
          if (photo) {
            // Show photo options (delete, set as primary, etc.)
            showPhotoOptions(photo);
          } else {
            // Show picker options
            showPickerOptions();
          }
        }}
        onLongPress={() => photo && handleReorderStart(photo.id)}
        disabled={isUploading}
      >
        {photo ? (
          <>
            <Image
              source={{ uri: photo.thumbnailUrl || photo.url }}
              style={styles.photo}
              resizeMode="cover"
            />
            {isUploading && (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator size="large" color="#FFF" />
                {photo.uploadProgress !== undefined && (
                  <Text style={styles.uploadProgress}>{photo.uploadProgress}%</Text>
                )}
              </View>
            )}
            {isPrimaryPhoto && !isUploading && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>Main Photo</Text>
              </View>
            )}
            {!isUploading && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeletePhoto(photo.id)}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.emptySlot}>
            <Text style={styles.emptySlotIcon}>+</Text>
            <Text style={styles.emptySlotText}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const showPickerOptions = () => {
    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        {
          text: 'Take Photo',
          onPress: () => handlePickImage('camera'),
        },
        {
          text: 'Choose from Gallery',
          onPress: () => handlePickImage('gallery'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const showPhotoOptions = (photo: ProfilePhoto) => {
    const isNotPrimary = photos.findIndex((p) => p.id === photo.id) !== 0;

    Alert.alert(
      'Photo Options',
      'What would you like to do?',
      [
        isNotPrimary && {
          text: 'Set as Main Photo',
          onPress: () => setAsPrimaryPhoto(photo),
        },
        {
          text: 'Delete Photo',
          onPress: () => handleDeletePhoto(photo.id),
          style: 'destructive',
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ].filter(Boolean) as any
    );
  };

  const setAsPrimaryPhoto = async (photo: ProfilePhoto) => {
    const currentIndex = photos.findIndex((p) => p.id === photo.id);
    if (currentIndex === -1 || currentIndex === 0) return;

    const reorderedPhotos = [...photos];
    const [selectedPhoto] = reorderedPhotos.splice(currentIndex, 1);
    reorderedPhotos.unshift(selectedPhoto);

    const updatedPhotos = reorderedPhotos.map((p, index) => ({
      ...p,
      order: index,
    }));

    onPhotosChange(updatedPhotos);

    try {
      await onPhotoReorder(updatedPhotos);
    } catch (error) {
      Alert.alert('Error', 'Failed to set as main photo. Please try again.');
      console.error('Set primary photo error:', error);
      onPhotosChange(photos);
    }
  };

  const sortedPhotos = [...photos].sort((a, b) => a.order - b.order);
  const emptySlots = Math.max(0, maxPhotos - photos.length);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Photos</Text>
        <Text style={styles.subtitle}>
          {photos.length}/{maxPhotos} photos
        </Text>
      </View>

      <Text style={styles.infoText}>
        Add at least 2 photos to get started. Your first photo is your main profile
        photo. Tap and hold to reorder.
      </Text>

      <ScrollView
        contentContainerStyle={styles.photosGrid}
        showsVerticalScrollIndicator={false}
      >
        {sortedPhotos.map((photo, index) => renderPhotoSlot(photo, index))}
        {[...Array(emptySlots)].map((_, index) => renderPhotoSlot(undefined, index))}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          All photos are reviewed to ensure they meet our community guidelines.
        </Text>
        {photos.length >= 2 && (
          <Button
            title="Continue"
            onPress={() => {
              // Navigate to next step
            }}
            fullWidth
            style={styles.continueButton}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  photoSlot: {
    width: '48%',
    aspectRatio: 3 / 4,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  primaryPhotoSlot: {
    width: '100%',
    aspectRatio: 4 / 5,
    marginBottom: 16,
  },
  draggedPhotoSlot: {
    opacity: 0.5,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadProgress: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#E91E63',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  primaryBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E0E0',
  },
  emptySlotIcon: {
    fontSize: 48,
    color: '#999',
    marginBottom: 8,
  },
  emptySlotText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  continueButton: {
    marginTop: 8,
  },
});
