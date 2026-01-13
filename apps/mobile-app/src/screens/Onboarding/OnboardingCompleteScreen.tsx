/**
 * Onboarding Complete Screen
 * Final step of onboarding - show success and start using the app
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingStackParamList } from './OnboardingNavigator';
import { createApiClient, ProfileApi } from '../../api/client';

type OnboardingCompleteScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'OnboardingComplete'>;
type OnboardingCompleteScreenRouteProp = RouteProp<OnboardingStackParamList, 'OnboardingComplete'>;

interface Props {
  navigation: OnboardingCompleteScreenNavigationProp;
  route: OnboardingCompleteScreenRouteProp;
}

const { width } = Dimensions.get('window');

const OnboardingCompleteScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profileData } = route.params;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate the success icon
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Confetti animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Submit profile data to backend
    submitProfile();
  }, []);

  const submitProfile = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const apiClient = createApiClient({
        getToken: async () => AsyncStorage.getItem('accessToken'),
      });
      const profileApi = new ProfileApi(apiClient);

      await profileApi.createProfile({
        name: profileData.name,
        birthday: profileData.birthday,
        gender: profileData.gender,
        interestedIn: profileData.interestedIn || [],
        photos: profileData.photos || [],
        interests: profileData.interests || [],
        prompts: profileData.prompts || [],
        location: profileData.location,
        lifestyle: profileData.lifestyle,
        relationshipGoals: profileData.relationshipGoals,
      });

      console.log('Profile created successfully');
    } catch (error: any) {
      console.error('Failed to create profile:', error);
      setSubmitError(error?.message || 'Failed to create profile');
      // Don't block the user - they can still proceed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartExploring = () => {
    // Navigate to main app
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainApp' as never }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
          <Text style={styles.progressText}>Complete!</Text>
        </View>

        {/* Confetti decoration */}
        <View style={styles.confettiContainer}>
          {[...Array(20)].map((_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  left: Math.random() * width,
                  backgroundColor: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF8DC7'][
                    index % 5
                  ],
                  transform: [
                    {
                      translateY: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 400],
                      }),
                    },
                    {
                      rotate: confettiAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', `${360 * (index % 2 === 0 ? 1 : -1)}deg`],
                      }),
                    },
                  ],
                  opacity: confettiAnim.interpolate({
                    inputRange: [0, 0.8, 1],
                    outputRange: [1, 1, 0],
                  }),
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.successContainer}>
          <Animated.View
            style={[
              styles.successIcon,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Text style={styles.successEmoji}>🎉</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.textContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>You're all set, {profileData.name}!</Text>
            <Text style={styles.subtitle}>
              Your profile is ready. Time to start meeting amazing people.
            </Text>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            styles.statsContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.photos.length}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.interests.length}</Text>
              <Text style={styles.statLabel}>Interests</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profileData.prompts.length}</Text>
              <Text style={styles.statLabel}>Prompts</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.tipsContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Text style={styles.tipsTitle}>Quick tips to get started:</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>👆</Text>
            <Text style={styles.tipText}>Swipe right to like, left to pass</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>⭐</Text>
            <Text style={styles.tipText}>Super like to stand out</Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipEmoji}>💬</Text>
            <Text style={styles.tipText}>Send a message when you match</Text>
          </View>
        </Animated.View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleStartExploring}
          >
            <Text style={styles.buttonText}>Start Exploring</Text>
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
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: '600',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 64,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    marginTop: 32,
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    padding: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B6B',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5E5',
  },
  tipsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipEmoji: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 24,
    paddingTop: 16,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
});

export default OnboardingCompleteScreen;
