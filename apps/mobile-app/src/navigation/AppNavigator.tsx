import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// Main Tab Screens
import DiscoveryScreen from '@screens/Main/DiscoveryScreen';
import MatchesScreen from '@screens/Main/MatchesScreen';
import MessagesScreen from '@screens/Main/MessagesScreen';
import ProfileScreen from '@screens/Main/ProfileScreen';
import ChatScreen from '@screens/Main/ChatScreen';
import TravelModeScreen from '@screens/Main/TravelModeScreen';
import LikesYouScreen from '@screens/Main/LikesYouScreen';
import WhoViewedMeScreen from '@screens/Main/WhoViewedMeScreen';

// Settings Screens
import SettingsScreen from '@screens/Settings/SettingsScreen';
import AccountSettingsScreen from '@screens/Settings/AccountSettingsScreen';
import PrivacySettingsScreen from '@screens/Settings/PrivacySettingsScreen';
import NotificationSettingsScreen from '@screens/Settings/NotificationSettingsScreen';

// Help Screens
import HelpCenterScreen from '@screens/Help/HelpCenterScreen';
import SafetyTipsScreen from '@screens/Help/SafetyTipsScreen';

// Subscription
import SubscriptionScreen from '@screens/Subscription/SubscriptionScreen';

// Events
import EventsListScreen from '@screens/Events/EventsListScreen';
import EventDetailsScreen from '@screens/Events/EventDetailsScreen';

// Video Call
import VideoCallScreen from '@screens/VideoCall/VideoCallScreen';
import CallHistoryScreen from '@screens/VideoCall/CallHistoryScreen';

// Speed Dating
import {
  SpeedDatingScreen,
  SpeedDatingLobbyScreen,
  SpeedDatingSessionScreen,
  SpeedDatingResultsScreen,
  SpeedDatingHistoryScreen,
} from '@screens/SpeedDating';
import type { SpeedDatingParticipant } from '../types/speedDating.types';

export type MainTabParamList = {
  Discovery: undefined;
  Matches: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  MainTabs: undefined;
  Chat: { matchId: string; matchName: string };
  Settings: undefined;
  AccountSettings: undefined;
  PrivacySettings: undefined;
  NotificationSettings: undefined;
  Subscription: undefined;
  LikesYou: undefined;
  WhoViewedMe: undefined;
  TravelMode: undefined;
  HelpCenter: undefined;
  SafetyTips: undefined;
  EventsList: undefined;
  EventDetails: { eventId: string };
  VideoCall: { callId: string; matchId: string };
  CallHistory: undefined;
  // Speed Dating
  SpeedDating: undefined;
  SpeedDatingLobby: {
    eventId: string;
    eventTitle: string;
    roundDuration: number;
  };
  SpeedDatingSession: {
    eventId: string;
    eventTitle: string;
    roundDuration: number;
    participants: SpeedDatingParticipant[];
  };
  SpeedDatingResults: {
    eventId: string;
    eventTitle: string;
    likes: string[];
    matches: string[];
    roundsCompleted: number;
    totalRounds: number;
  };
  SpeedDatingHistory: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createStackNavigator<AppStackParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      id="MainTabs"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = '';

          switch (route.name) {
            case 'Discovery':
              iconName = focused ? 'flame' : 'flame-outline';
              break;
            case 'Matches':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#FF6B6B',
        tabBarInactiveTintColor: '#999',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: '#E5E5EA',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen
        name="Discovery"
        component={DiscoveryScreen}
        options={{
          tabBarLabel: 'Discover',
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  return (
    <Stack.Navigator
      id="AppStack"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F2F2F7' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />

      {/* Chat & Messaging */}
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          presentation: 'card',
        }}
      />

      {/* Settings */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
      <Stack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
      />

      {/* Premium Features */}
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="LikesYou" component={LikesYouScreen} />
      <Stack.Screen name="WhoViewedMe" component={WhoViewedMeScreen} />
      <Stack.Screen name="TravelMode" component={TravelModeScreen} />

      {/* Help & Safety */}
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <Stack.Screen name="SafetyTips" component={SafetyTipsScreen} />

      {/* Events */}
      <Stack.Screen name="EventsList" component={EventsListScreen} />
      <Stack.Screen name="EventDetails" component={EventDetailsScreen} />

      {/* Video Calls */}
      <Stack.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{
          presentation: 'modal',
        }}
      />
      <Stack.Screen name="CallHistory" component={CallHistoryScreen} />

      {/* Speed Dating */}
      <Stack.Screen name="SpeedDating" component={SpeedDatingScreen} />
      <Stack.Screen name="SpeedDatingLobby" component={SpeedDatingLobbyScreen} />
      <Stack.Screen
        name="SpeedDatingSession"
        component={SpeedDatingSessionScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SpeedDatingResults"
        component={SpeedDatingResultsScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="SpeedDatingHistory" component={SpeedDatingHistoryScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
