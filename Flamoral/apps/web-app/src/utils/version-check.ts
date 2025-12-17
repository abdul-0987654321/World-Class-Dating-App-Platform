/**
 * Version Check Utility
 * Detects new app versions and prompts user to reload
 */

interface VersionInfo {
  version: string;
  buildDate: string;
  commit: string;
  environment: string;
  features?: Record<string, boolean>;
}

const VERSION_STORAGE_KEY = 'flamoral-app-version';
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Check for new version
 */
export async function checkVersion(): Promise<void> {
  try {
    // Add cache buster to ensure fresh version info
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.warn('Failed to fetch version info:', response.status);
      return;
    }

    const versionInfo: VersionInfo = await response.json();
    const currentVersion = localStorage.getItem(VERSION_STORAGE_KEY);

    console.log('[Version] Current:', currentVersion, 'Latest:', versionInfo.version);

    // First time - just store version
    if (!currentVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, versionInfo.version);
      return;
    }

    // Version changed - prompt user
    if (currentVersion !== versionInfo.version) {
      console.log('[Version] New version available:', versionInfo.version);

      const shouldReload = window.confirm(
        `A new version of Flamoral is available (${versionInfo.version}).\n\n` +
        'Would you like to reload to get the latest features and improvements?'
      );

      if (shouldReload) {
        // Update version first
        localStorage.setItem(VERSION_STORAGE_KEY, versionInfo.version);

        // Clear service worker cache
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.update();
          }
        }

        // Hard reload to bypass cache
        window.location.reload();
      }
    }
  } catch (error) {
    console.error('[Version] Check failed:', error);
  }
}

/**
 * Start periodic version checking
 */
export function startVersionCheck(): void {
  // Check immediately
  checkVersion();

  // Check periodically
  setInterval(checkVersion, CHECK_INTERVAL);

  // Check when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  });

  console.log('[Version] Started periodic checks (every 5 minutes)');
}

/**
 * Get current version info
 */
export function getCurrentVersion(): string | null {
  return localStorage.getItem(VERSION_STORAGE_KEY);
}

/**
 * Clear version info (for testing)
 */
export function clearVersionInfo(): void {
  localStorage.removeItem(VERSION_STORAGE_KEY);
}
