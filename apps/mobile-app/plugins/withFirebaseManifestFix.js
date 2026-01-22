/**
 * Expo config plugin to fix Firebase manifest merger conflict
 *
 * Fixes the error:
 * Attribute meta-data#com.google.firebase.messaging.default_notification_color@resource
 * value=(@color/notification_icon_color) from AndroidManifest.xml
 * is also present at [:react-native-firebase_messaging] AndroidManifest.xml value=(@color/white).
 *
 * This adds tools:replace="android:resource" to the meta-data element using
 * withAndroidManifest which modifies the in-memory representation.
 */
const { withAndroidManifest } = require('expo/config-plugins');

function withFirebaseManifestFix(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure tools namespace is declared
    if (!manifest.manifest.$) {
      manifest.manifest.$ = {};
    }
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Find the application node
    const application = manifest.manifest.application?.[0];
    if (!application) {
      console.warn('[withFirebaseManifestFix] No application node found in AndroidManifest.xml');
      return config;
    }

    // Ensure meta-data array exists
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Check if the Firebase notification color meta-data exists
    let found = false;
    for (const metaData of application['meta-data']) {
      const name = metaData.$?.['android:name'];
      if (name === 'com.google.firebase.messaging.default_notification_color') {
        // Add tools:replace to override the value from react-native-firebase_messaging
        metaData.$['tools:replace'] = 'android:resource';
        found = true;
        console.log(
          '[withFirebaseManifestFix] Added tools:replace to existing Firebase notification color meta-data'
        );
        break;
      }
    }

    // If not found, add it with tools:replace already set
    // This will be merged with expo-notifications' addition
    if (!found) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_color',
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource',
        },
      });
      console.log(
        '[withFirebaseManifestFix] Added Firebase notification color meta-data with tools:replace'
      );
    }

    return config;
  });
}

module.exports = withFirebaseManifestFix;
