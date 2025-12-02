/**
 * Mobile App Notification Configuration
 */

export const notificationConfig = {
  // Deep linking
  scheme: 'flamoral',
  prefix: 'https://flamoral.app',

  // Notification channels (Android)
  channels: {
    default: {
      id: 'default',
      name: 'General Notifications',
      importance: 'high',
      sound: 'default',
    },
    messages: {
      id: 'messages',
      name: 'Messages',
      importance: 'high',
      sound: 'message_sound',
      vibration: [0, 250, 250, 250],
    },
    matches: {
      id: 'matches',
      name: 'Matches',
      importance: 'high',
      sound: 'match_sound',
      vibration: [0, 400, 200, 400],
    },
    calls: {
      id: 'calls',
      name: 'Video Calls',
      importance: 'high',
      sound: 'call_sound',
      vibration: [0, 500, 200, 500, 200, 500],
    },
    social: {
      id: 'social',
      name: 'Likes & Views',
      importance: 'default',
      sound: 'default',
    },
  },

  // Notification types
  types: {
    NEW_MATCH: 'new_match',
    NEW_MESSAGE: 'new_message',
    SUPER_LIKE: 'super_like',
    PROFILE_VIEW: 'profile_view',
    MATCH_EXPIRING: 'match_expiring',
    DAILY_PICKS: 'daily_picks',
    BOOST_ACTIVATED: 'boost_activated',
    SUBSCRIPTION_EXPIRING: 'subscription_expiring',
    VIDEO_CALL_INCOMING: 'video_call_incoming',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
  },

  // Auto-cancel timeout (ms) - time before notification is auto-dismissed
  autoCancelTimeout: 10000, // 10 seconds

  // Badge update interval (ms)
  badgeUpdateInterval: 60000, // 1 minute

  // Enable/disable features
  features: {
    foregroundNotifications: true,
    backgroundNotifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    badgeEnabled: true,
    inAppNotifications: true,
  },
};

export default notificationConfig;
