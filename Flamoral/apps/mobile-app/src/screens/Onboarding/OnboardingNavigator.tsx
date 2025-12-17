/**
 * Onboarding Navigator
 * Handles the multi-step onboarding flow for new users
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import NameScreen from './NameScreen';
import BirthdayScreen from './BirthdayScreen';
import GenderScreen from './GenderScreen';
import InterestedInScreen from './InterestedInScreen';
import PhotoUploadScreen from './PhotoUploadScreen';
import LocationScreen from './LocationScreen';
import InterestsScreen from './InterestsScreen';
import PromptsScreen from './PromptsScreen';
import RelationshipGoalsScreen from './RelationshipGoalsScreen';
import LifestyleScreen from './LifestyleScreen';
import NotificationPermissionScreen from './NotificationPermissionScreen';
import OnboardingCompleteScreen from './OnboardingCompleteScreen';

export type OnboardingStackParamList = {
  Name: undefined;
  Birthday: { name: string };
  Gender: { name: string; birthday: string };
  InterestedIn: { name: string; birthday: string; gender: string };
  PhotoUpload: {
    name: string;
    birthday: string;
    gender: string;
    interestedIn: string[];
  };
  Location: {
    name: string;
    birthday: string;
    gender: string;
    interestedIn: string[];
    photos: string[];
  };
  Interests: {
    name: string;
    birthday: string;
    gender: string;
    interestedIn: string[];
    photos: string[];
    location: { latitude: number; longitude: number; city: string };
  };
  Prompts: {
    name: string;
    birthday: string;
    gender: string;
    interestedIn: string[];
    photos: string[];
    location: { latitude: number; longitude: number; city: string };
    interests: string[];
  };
  RelationshipGoals: {
    name: string;
    birthday: string;
    gender: string;
    interestedIn: string[];
    photos: string[];
    location: { latitude: number; longitude: number; city: string };
    interests: string[];
    prompts: { promptId: string; answer: string }[];
  };
  Lifestyle: {
    name: string;
    birthday: string;
    gender: string;
    interestedIn: string[];
    photos: string[];
    location: { latitude: number; longitude: number; city: string };
    interests: string[];
    prompts: { promptId: string; answer: string }[];
    relationshipGoal: string;
  };
  NotificationPermission: {
    profileData: OnboardingProfileData;
  };
  OnboardingComplete: {
    profileData: OnboardingProfileData;
  };
};

export interface OnboardingProfileData {
  name: string;
  birthday: string;
  gender: string;
  interestedIn: string[];
  photos: string[];
  location: { latitude: number; longitude: number; city: string };
  interests: string[];
  prompts: { promptId: string; answer: string }[];
  relationshipGoal: string;
  lifestyle: {
    smoking: string;
    drinking: string;
    exercise: string;
    diet: string;
    pets: string;
  };
}

const Stack = createStackNavigator<OnboardingStackParamList>();

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
        gestureEnabled: false,
        animationEnabled: true,
        cardStyleInterpolator: ({ current }) => ({
          cardStyle: {
            opacity: current.progress,
          },
        }),
      }}
    >
      <Stack.Screen name="Name" component={NameScreen} />
      <Stack.Screen name="Birthday" component={BirthdayScreen} />
      <Stack.Screen name="Gender" component={GenderScreen} />
      <Stack.Screen name="InterestedIn" component={InterestedInScreen} />
      <Stack.Screen name="PhotoUpload" component={PhotoUploadScreen} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Interests" component={InterestsScreen} />
      <Stack.Screen name="Prompts" component={PromptsScreen} />
      <Stack.Screen name="RelationshipGoals" component={RelationshipGoalsScreen} />
      <Stack.Screen name="Lifestyle" component={LifestyleScreen} />
      <Stack.Screen name="NotificationPermission" component={NotificationPermissionScreen} />
      <Stack.Screen name="OnboardingComplete" component={OnboardingCompleteScreen} />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
