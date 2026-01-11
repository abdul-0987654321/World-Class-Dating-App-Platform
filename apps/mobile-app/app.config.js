/**
 * Expo configuration for Flamoral mobile app
 * Uses environment variables with EXPO_PUBLIC_ prefix for runtime configuration
 *
 * IMPORTANT: Set EXPO_PUBLIC_EAS_PROJECT_ID environment variable for builds to appear on Expo dashboard.
 * Get your project ID from: https://expo.dev/accounts/flamoral/projects/flamoral
 * Or run: eas init
 */

// EAS Project ID - Required for builds to appear on Expo dashboard
const EAS_PROJECT_ID = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
if (!EAS_PROJECT_ID) {
  console.warn(
    '\x1b[33mWARNING: EXPO_PUBLIC_EAS_PROJECT_ID is not set.\x1b[0m\n' +
      'Builds will not appear on Expo dashboard.\n' +
      'Get your project ID from: https://expo.dev/accounts/flamoral/projects/flamoral\n' +
      'Or run: eas init'
  );
}

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.flamoral.app.dev';
  }
  if (IS_PREVIEW) {
    return 'com.flamoral.app.preview';
  }
  return 'com.flamoral.app';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'Flamoral (Dev)';
  }
  if (IS_PREVIEW) {
    return 'Flamoral (Preview)';
  }
  return 'Flamoral';
};

export default {
  name: getAppName(),
  slug: 'flamoral',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'flamoral',
  owner: 'flamoral',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  platforms: ['ios', 'android'],
  ios: {
    bundleIdentifier: getUniqueIdentifier(),
    buildNumber: '1',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription:
        'Take photos to add to your profile and verify your identity',
      NSPhotoLibraryUsageDescription:
        'Choose photos from your library to add to your profile',
      NSLocationWhenInUseUsageDescription:
        'We use your location to show you potential matches nearby',
      NSUserNotificationsUsageDescription:
        'Get notified when you have new matches and messages',
      NSMicrophoneUsageDescription:
        'Enable audio for video calls with your matches',
      UIBackgroundModes: ['voip', 'remote-notification'],
    },
    config: {
      usesNonExemptEncryption: false,
    },
    associatedDomains: ['applinks:flamoral.com', 'applinks:*.flamoral.com'],
  },
  android: {
    package: getUniqueIdentifier(),
    versionCode: 1,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFFFFF',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.INTERNET',
      'android.permission.RECORD_AUDIO',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'flamoral.com',
            pathPrefix: '/app',
          },
          {
            scheme: 'flamoral',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      {
        cameraPermission:
          'Take photos to add to your profile and verify your identity',
        microphonePermission: 'Enable audio for video calls with your matches',
        recordAudioAndroid: true,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Choose photos from your library to add to your profile',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'We use your location to show you potential matches nearby',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: '#FF4B6E',
      },
    ],
  ],
  updates: {
    enabled: true,
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 0,
    url: EAS_PROJECT_ID ? `https://u.expo.dev/${EAS_PROJECT_ID}` : undefined,
  },
  // For bare workflow, runtime version must be a string, not a policy
  runtimeVersion: '1.0.0',
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.flamoral.com',
    authIssuer: process.env.EXPO_PUBLIC_AUTH_ISSUER || 'https://auth.flamoral.com',
    stripePublishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'wss://ws.flamoral.com',
    eas: {
      projectId: EAS_PROJECT_ID,
    },
  },
};
