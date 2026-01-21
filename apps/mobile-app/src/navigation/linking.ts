import { LinkingOptions } from '@react-navigation/native';

/**
 * Deep linking configuration for the app
 * Supports universal links and custom URL schemes
 */

const linking: LinkingOptions<any> = {
  prefixes: ['flamoral://', 'https://flamoral.com', 'https://*.flamoral.com'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
          Onboarding: 'onboarding',
        },
      },
      Main: {
        screens: {
          MainTabs: {
            screens: {
              Discovery: 'discover',
              Matches: 'matches',
              Messages: 'messages',
              Profile: 'profile',
            },
          },
          Chat: {
            path: 'chat/:matchId',
            parse: {
              matchId: (matchId: string) => matchId,
            },
          },
          Settings: 'settings',
          AccountSettings: 'settings/account',
          PrivacySettings: 'settings/privacy',
          NotificationSettings: 'settings/notifications',
          Subscription: 'subscription',
          LikesYou: 'likes-you',
          WhoViewedMe: 'who-viewed-me',
          TravelMode: 'travel-mode',
          HelpCenter: 'help',
          SafetyTips: 'safety',
          EventsList: 'events',
          EventDetails: {
            path: 'events/:eventId',
            parse: {
              eventId: (eventId: string) => eventId,
            },
          },
          VideoCall: {
            path: 'video-call/:callId/:matchId',
            parse: {
              callId: (callId: string) => callId,
              matchId: (matchId: string) => matchId,
            },
          },
          CallHistory: 'call-history',
        },
      },
    },
  },
};

/**
 * URL handling examples:
 *
 * flamoral://chat/123 -> Opens chat with match ID 123
 * flamoral://events/456 -> Opens event details for event ID 456
 * flamoral://subscription -> Opens subscription screen
 * flamoral://likes-you -> Opens likes you screen
 *
 * https://flamoral.com/chat/123
 * https://flamoral.com/events/456
 * https://flamoral.com/subscription
 */

export default linking;
