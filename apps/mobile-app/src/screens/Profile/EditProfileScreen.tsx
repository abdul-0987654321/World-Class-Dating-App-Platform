/**
 * Edit Profile Screen
 * Main screen for editing user profile information
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FastImage from 'react-native-fast-image';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { CameraService } from '@services/camera/CameraService';
import axios from 'axios';

interface UserProfile {
  id: string;
  name: string;
  age: number;
  bio: string;
  occupation: string;
  company: string;
  school: string;
  location: string;
  photos: string[];
  interests: string[];
  relationshipGoals: string[];
}

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bio, setBio] = useState('');
  const [occupation, setOccupation] = useState('');
  const [company, setCompany] = useState('');
  const [school, setSchool] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await axios.get(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/users/profile`);
      const data = response.data;
      setProfile(data);
      setBio(data.bio || '');
      setOccupation(data.occupation || '');
      setCompany(data.company || '');
      setSchool(data.school || '');
    } catch (error) {
      console.error('Failed to load profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const updates = {
        bio,
        occupation,
        company,
        school,
      };

      await axios.put(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/users/profile`, updates);

      Alert.alert('Success', 'Profile updated successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile changes');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoPress = async (index: number) => {
    CameraService.showPhotoSelectionActionSheet(
      async () => {
        const photo = await CameraService.captureAndCropPhoto();
        if (photo) {
          await uploadPhoto(photo.uri, index);
        }
      },
      async () => {
        const photo = await CameraService.selectAndCropPhoto();
        if (photo) {
          await uploadPhoto(photo.uri, index);
        }
      }
    );
  };

  const uploadPhoto = async (uri: string, index: number) => {
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri,
        type: 'image/jpeg',
        name: `photo_${index}.jpg`,
      } as any);
      formData.append('index', index.toString());

      await axios.post(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/photos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await loadProfile();
      Alert.alert('Success', 'Photo uploaded successfully');
    } catch (error) {
      console.error('Failed to upload photo:', error);
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const handleDeletePhoto = async (index: number) => {
    Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${process.env.EXPO_PUBLIC_API_BASE_URL}/api/users/photos/${index}`);
            await loadProfile();
          } catch (error) {
            console.error('Failed to delete photo:', error);
            Alert.alert('Error', 'Failed to delete photo');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Icon name="close" size={28} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <Text style={styles.sectionSubtitle}>Add at least 2 photos to continue</Text>
          <View style={styles.photosGrid}>
            {[0, 1, 2, 3, 4, 5].map((index) => {
              const hasPhoto = profile?.photos && profile.photos[index];
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.photoBox}
                  onPress={() => handlePhotoPress(index)}
                  onLongPress={() => hasPhoto && handleDeletePhoto(index)}
                >
                  {hasPhoto ? (
                    <>
                      <FastImage
                        source={{ uri: profile.photos[index] }}
                        style={styles.photo}
                        resizeMode={FastImage.resizeMode.cover}
                      />
                      <View style={styles.photoOverlay}>
                        <Icon name="pencil" size={20} color="#FFFFFF" />
                      </View>
                    </>
                  ) : (
                    <View style={styles.addPhotoBox}>
                      <Icon name="plus" size={32} color="#CCCCCC" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* About Me Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Me</Text>
          <TextInput
            style={styles.bioInput}
            placeholder="Write a bit about yourself..."
            placeholderTextColor="#999999"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{bio.length}/500</Text>
        </View>

        {/* Work & Education */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.editRow}
            onPress={() => navigation.navigate('EditOccupation' as never)}
          >
            <View style={styles.editRowLeft}>
              <Icon name="briefcase" size={24} color="#666666" />
              <View style={styles.editRowText}>
                <Text style={styles.editRowLabel}>Occupation</Text>
                <Text style={styles.editRowValue}>{occupation || 'Add your job title'}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editRow}
            onPress={() => navigation.navigate('EditCompany' as never)}
          >
            <View style={styles.editRowLeft}>
              <Icon name="office-building" size={24} color="#666666" />
              <View style={styles.editRowText}>
                <Text style={styles.editRowLabel}>Company</Text>
                <Text style={styles.editRowValue}>{company || 'Add your company'}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editRow}
            onPress={() => navigation.navigate('EditSchool' as never)}
          >
            <View style={styles.editRowLeft}>
              <Icon name="school" size={24} color="#666666" />
              <View style={styles.editRowText}>
                <Text style={styles.editRowLabel}>School</Text>
                <Text style={styles.editRowValue}>{school || 'Add your school'}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>

        {/* Other Sections */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.editRow}
            onPress={() => navigation.navigate('EditInterests' as never)}
          >
            <View style={styles.editRowLeft}>
              <Icon name="heart-multiple" size={24} color="#666666" />
              <View style={styles.editRowText}>
                <Text style={styles.editRowLabel}>Interests</Text>
                <Text style={styles.editRowValue}>{profile?.interests?.length || 0} selected</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editRow}
            onPress={() => navigation.navigate('EditPrompts' as never)}
          >
            <View style={styles.editRowLeft}>
              <Icon name="comment-quote" size={24} color="#666666" />
              <View style={styles.editRowText}>
                <Text style={styles.editRowLabel}>Prompts</Text>
                <Text style={styles.editRowValue}>Show your personality</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editRow}
            onPress={() => navigation.navigate('EditPreferences' as never)}
          >
            <View style={styles.editRowLeft}>
              <Icon name="tune" size={24} color="#666666" />
              <View style={styles.editRowText}>
                <Text style={styles.editRowLabel}>Dating Preferences</Text>
                <Text style={styles.editRowValue}>Who you want to meet</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={24} color="#CCCCCC" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerButton: {
    width: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#F5F5F5',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  photoBox: {
    width: '31%',
    aspectRatio: 0.75,
    margin: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBox: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  bioInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1A1A1A',
    minHeight: 120,
  },
  characterCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  editRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  editRowText: {
    marginLeft: 12,
    flex: 1,
  },
  editRowLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  editRowValue: {
    fontSize: 14,
    color: '#666666',
  },
});

export default EditProfileScreen;
