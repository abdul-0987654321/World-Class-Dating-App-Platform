/**
 * Notification Permission Screen
 * Eleventh step of onboarding - request notification permissions
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { OnboardingStackParamList } from './OnboardingNavigator';

type NotificationPermissionScreenNavigationProp = StackNavigationProp<
  OnboardingStackParamList,
  'NotificationPermission'
>;
type NotificationPermissionScreenRouteProp = RouteProp<
  OnboardingStackParamList,
  'NotificationPermission'
>;

interface Props {
  navigation: NotificationPermissionScreenNavigationProp;
  route: NotificationPermissionScreenRouteProp;
}

interface NotificationBenefit {
  emoji: string;
  title: string;
  description: string;
}

const NOTIFICATION_BENEFITS: NotificationBenefit[] = [
  {
    emoji: '💬',
    title: 'New messages',
    description: "Know when someone you're interested in sends you a message",
  },
  {
    emoji: '❤️',
    title: 'New matches',
    description: 'Get excited when you match with someone new',
  },
  {
    emoji: '👀',
    title: 'Profile views',
    description: "See who's checking out your profile",
  },
  {
    emoji: '⭐',
    title: 'Super likes',
    description: "Don't miss when someone really likes you",
  },
];

const NotificationPermissionScreen: React.FC<Props> = ({ navigation, route }) => {
  const { profileData } = route.params;
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();

      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === 'granted') {
        setPermissionGranted(true);

        // Get push token for the device
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF6B6B',
          });
        }

        // In production, send token to backend
        // const token = await Notifications.getExpoPushTokenAsync();
        // await sendPushTokenToBackend(token.data);
      }

      // Continue regardless of permission status
      handleContinue();
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      handleContinue();
    }
  };

  const handleContinue = () => {
    navigation.navigate('OnboardingComplete', { profileData });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '92%' }]} />
          </View>
          <Text style={styles.progressText}>11 of 12</Text>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.illustrationContainer}>
          <View style={styles.bellIcon}>
            <Text style={styles.bellEmoji}>🔔</Text>
          </View>
        </View>

        <Text style={styles.title}>Never miss a connection</Text>
        <Text style={styles.subtitle}>
          Turn on notifications to know when exciting things happen
        </Text>

        <View style={styles.benefitsContainer}>
          {NOTIFICATION_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitEmoji}>{benefit.emoji}</Text>
              </View>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDescription}>{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Enable Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleContinue}>
            <Text style={styles.skipButtonText}>Not now</Text>
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
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  bellIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellEmoji: {
    fontSize: 48,
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
    marginBottom: 32,
  },
  benefitsContainer: {
    flex: 1,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  benefitEmoji: {
    fontSize: 24,
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  benefitDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    paddingBottom: 24,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
});

export default NotificationPermissionScreen;
