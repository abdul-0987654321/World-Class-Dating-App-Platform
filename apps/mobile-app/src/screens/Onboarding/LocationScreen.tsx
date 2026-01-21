/**
 * Location Screen
 * Sixth step of onboarding - get user's location
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { OnboardingStackParamList } from './OnboardingNavigator';

type LocationScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Location'>;
type LocationScreenRouteProp = RouteProp<OnboardingStackParamList, 'Location'>;

interface Props {
  navigation: LocationScreenNavigationProp;
  route: LocationScreenRouteProp;
}

interface UserLocation {
  latitude: number;
  longitude: number;
  city: string;
}

const LocationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { name, birthday, gender, interestedIn, photos } = route.params;
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const requestLocation = async () => {
    setLoading(true);
    setError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        Alert.alert(
          'Location Required',
          'Heartly needs your location to show you people nearby. Please enable location access in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocode to get city name
      const [address] = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const city = address?.city || address?.subregion || address?.region || 'Unknown Location';

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        city,
      });
    } catch (err) {
      setError('Failed to get location. Please try again.');
      console.error('Location error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    if (!location) return;

    navigation.navigate('Interests', {
      name,
      birthday,
      gender,
      interestedIn,
      photos,
      location,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '50%' }]} />
          </View>
          <Text style={styles.progressText}>6 of 12</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.questionContainer}>
          <Text style={styles.title}>Where are you located?</Text>
          <Text style={styles.subtitle}>
            We'll show you people nearby. Your exact location is never shared.
          </Text>

          <View style={styles.locationContainer}>
            {location ? (
              <View style={styles.locationCard}>
                <View style={styles.locationIcon}>
                  <Text style={styles.locationIconText}>📍</Text>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationCity}>{location.city}</Text>
                  <Text style={styles.locationCoords}>Location confirmed</Text>
                </View>
                <TouchableOpacity style={styles.changeButton} onPress={requestLocation}>
                  <Text style={styles.changeButtonText}>Update</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.enableLocationButton}
                onPress={requestLocation}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FF6B6B" size="large" />
                ) : (
                  <>
                    <View style={styles.locationIconLarge}>
                      <Text style={styles.locationIconTextLarge}>📍</Text>
                    </View>
                    <Text style={styles.enableLocationText}>Enable Location</Text>
                    <Text style={styles.enableLocationSubtext}>Tap to allow location access</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <View style={styles.privacyContainer}>
            <Text style={styles.privacyTitle}>🔒 Your privacy matters</Text>
            <Text style={styles.privacyText}>
              • Only your city is shown to others{'\n'}• Your exact location is never shared{'\n'}•
              You control your distance preferences
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.button, !location && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!location}
          >
            <Text style={[styles.buttonText, !location && styles.buttonTextDisabled]}>
              Continue
            </Text>
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
    marginBottom: 32,
  },
  locationContainer: {
    marginBottom: 24,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationIconText: {
    fontSize: 24,
  },
  locationInfo: {
    flex: 1,
  },
  locationCity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  locationCoords: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
  },
  changeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  enableLocationButton: {
    padding: 32,
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  locationIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationIconTextLarge: {
    fontSize: 32,
  },
  enableLocationText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  enableLocationSubtext: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    fontSize: 14,
    color: '#FF4444',
    textAlign: 'center',
    marginTop: 12,
  },
  privacyContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  privacyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  footer: {
    paddingBottom: 24,
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

export default LocationScreen;
