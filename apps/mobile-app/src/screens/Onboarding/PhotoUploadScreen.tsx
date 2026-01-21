/**
 * Photo Upload Screen
 * Fifth step of onboarding - upload profile photos
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { OnboardingStackParamList } from './OnboardingNavigator';

type PhotoUploadScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'PhotoUpload'>;
type PhotoUploadScreenRouteProp = RouteProp<OnboardingStackParamList, 'PhotoUpload'>;

interface Props {
  navigation: PhotoUploadScreenNavigationProp;
  route: PhotoUploadScreenRouteProp;
}

const MIN_PHOTOS = 2;
const MAX_PHOTOS = 6;

const PhotoUploadScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender, interestedIn } = route.params;
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photos to upload profile pictures.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async (index: number) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhotos = [...photos];
      if (index < photos.length) {
        newPhotos[index] = result.assets[0].uri;
      } else {
        newPhotos.push(result.assets[0].uri);
      }
      setPhotos(newPhotos);
    }
  };

  const takePhoto = async (index: number) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your camera to take profile pictures.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const newPhotos = [...photos];
      if (index < photos.length) {
        newPhotos[index] = result.assets[0].uri;
      } else {
        newPhotos.push(result.assets[0].uri);
      }
      setPhotos(newPhotos);
    }
  };

  const showImageOptions = (index: number) => {
    Alert.alert('Add Photo', 'Choose how you want to add a photo', [
      { text: 'Take Photo', onPress: () => takePhoto(index) },
      { text: 'Choose from Library', onPress: () => pickImage(index) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removePhoto = (index: number) => {
    Alert.alert('Remove Photo', 'Are you sure you want to remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          const newPhotos = photos.filter((_, i) => i !== index);
          setPhotos(newPhotos);
        },
      },
    ]);
  };

  const uploadPhotoToServer = async (uri: string, index: number): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', {
      uri,
      type: 'image/jpeg',
      name: `photo_${index}.jpg`,
    } as any);

    const response = await axios.post(
      `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/photos/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data.url;
  };

  const handleContinue = async () => {
    if (photos.length < MIN_PHOTOS) return;

    setUploading(true);

    try {
      // Upload all photos to the server
      const uploadedUrls = await Promise.all(
        photos.map((photoUri, index) => uploadPhotoToServer(photoUri, index))
      );

      navigation.navigate('Location', {
        name,
        birthday,
        gender,
        interestedIn,
        photos: uploadedUrls,
      });
    } catch (error) {
      console.error('Failed to upload photos:', error);
      Alert.alert('Upload Failed', 'Failed to upload photos. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const renderPhotoSlot = (index: number) => {
    const photo = photos[index];
    const isMainPhoto = index === 0;

    return (
      <TouchableOpacity
        key={index}
        style={[styles.photoSlot, isMainPhoto && styles.mainPhotoSlot]}
        onPress={() => (photo ? undefined : showImageOptions(index))}
        onLongPress={() => (photo ? removePhoto(index) : undefined)}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo }} style={styles.photo} />
            <TouchableOpacity style={styles.removeButton} onPress={() => removePhoto(index)}>
              <Text style={styles.removeButtonText}>×</Text>
            </TouchableOpacity>
            {isMainPhoto && (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>Main</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptySlot}>
            <Text style={styles.plusIcon}>+</Text>
            {isMainPhoto && <Text style={styles.mainPhotoLabel}>Main Photo</Text>}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '42%' }]} />
          </View>
          <Text style={styles.progressText}>5 of 12</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.questionContainer}>
          <Text style={styles.title}>Add your best photos</Text>
          <Text style={styles.subtitle}>
            Add at least {MIN_PHOTOS} photos to continue. Your first photo will be your main profile
            picture.
          </Text>

          <View style={styles.photosGrid}>
            <View style={styles.mainPhotoContainer}>{renderPhotoSlot(0)}</View>
            <View style={styles.secondaryPhotosContainer}>
              {[1, 2, 3, 4, 5].map((index) => renderPhotoSlot(index))}
            </View>
          </View>

          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>Photo tips:</Text>
            <Text style={styles.tipText}>• Show your face clearly</Text>
            <Text style={styles.tipText}>• Use recent photos</Text>
            <Text style={styles.tipText}>• Avoid group photos as your main</Text>
            <Text style={styles.tipText}>• Include full-body shots</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.photoCount}>
            {photos.length} of {MIN_PHOTOS} required photos
          </Text>
          <TouchableOpacity
            style={[styles.button, photos.length < MIN_PHOTOS && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={photos.length < MIN_PHOTOS || uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                style={[styles.buttonText, photos.length < MIN_PHOTOS && styles.buttonTextDisabled]}
              >
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  progressContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B6B',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    fontSize: 28,
    color: '#1A1A1A',
  },
  questionContainer: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  photosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  mainPhotoContainer: {
    flex: 1,
  },
  secondaryPhotosContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoSlot: {
    aspectRatio: 3 / 4,
    width: '48%',
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  mainPhotoSlot: {
    width: '100%',
    height: 250,
    borderColor: '#FF6B6B',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    fontSize: 32,
    color: '#999',
    fontWeight: '300',
  },
  mainPhotoLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: -2,
  },
  mainBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mainBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tipsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  footer: {
    paddingBottom: 24,
  },
  photoCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#FFD4D4',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextDisabled: {
    color: '#FFB3B3',
  },
});

export default PhotoUploadScreen;
