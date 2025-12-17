/**
 * Privacy Service
 * Handles privacy settings and preferences
 */

export interface PrivacySettings {
  hideLastActive: boolean;
  hideDistance: boolean;
  hideOnlineStatus: boolean;
  hideFromSearch: boolean;
  incognitoMode: boolean;
  blockScreenshots: boolean;
  showAge: boolean;
  showLocation: boolean;
  // Aliases for component compatibility
  showDistance?: boolean; // Inverse of hideDistance
  onlineStatus?: string; // String version for presets display
  profileVisibility?: string; // String version for presets display
}

export interface IncognitoSession {
  enabled: boolean;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface PrivacyPreset {
  id: string;
  name: string;
  description: string;
  settings: Partial<PrivacySettings>;
}

class PrivacyService {
  // Only enable mock mode in development when API URL is not set
  private isMock = import.meta.env.MODE === 'development' &&
                   import.meta.env.VITE_USE_MOCKS === 'true' &&
                   !import.meta.env.VITE_API_URL;

  async getSettings(): Promise<PrivacySettings> {
    if (this.isMock) {
      return {
        hideLastActive: false,
        hideDistance: false,
        hideOnlineStatus: false,
        hideFromSearch: false,
        incognitoMode: false,
        blockScreenshots: false,
        showAge: true,
        showLocation: true,
      };
    }

    const response = await fetch('/api/v1/privacy/settings', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch privacy settings');
    }

    return response.json();
  }

  async updateSettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        hideLastActive: false,
        hideDistance: false,
        hideOnlineStatus: false,
        hideFromSearch: false,
        incognitoMode: false,
        blockScreenshots: false,
        showAge: true,
        showLocation: true,
        ...settings,
      };
    }

    const response = await fetch('/api/v1/privacy/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error('Failed to update privacy settings');
    }

    return response.json();
  }

  async toggleIncognito(enabled: boolean): Promise<{ success: boolean; expiresAt?: string }> {
    if (this.isMock) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        success: true,
        expiresAt: enabled ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
      };
    }

    const response = await fetch('/api/v1/privacy/incognito', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled }),
    });

    if (!response.ok) {
      throw new Error('Failed to toggle incognito mode');
    }

    return response.json();
  }

  getPresets(): PrivacyPreset[] {
    return [
      {
        id: 'open',
        name: 'Open',
        description: 'Maximum visibility - show everything',
        settings: {
          hideLastActive: false,
          hideDistance: false,
          hideOnlineStatus: false,
          hideFromSearch: false,
          showAge: true,
          showLocation: true,
        },
      },
      {
        id: 'balanced',
        name: 'Balanced',
        description: 'Hide when you were last active',
        settings: {
          hideLastActive: true,
          hideDistance: false,
          hideOnlineStatus: false,
          hideFromSearch: false,
          showAge: true,
          showLocation: true,
        },
      },
      {
        id: 'private',
        name: 'Private',
        description: 'Hide activity status and distance',
        settings: {
          hideLastActive: true,
          hideDistance: true,
          hideOnlineStatus: true,
          hideFromSearch: false,
          showAge: true,
          showLocation: false,
        },
      },
      {
        id: 'ghost',
        name: 'Ghost Mode',
        description: 'Maximum privacy - appear offline',
        settings: {
          hideLastActive: true,
          hideDistance: true,
          hideOnlineStatus: true,
          hideFromSearch: true,
          incognitoMode: true,
          showAge: false,
          showLocation: false,
        },
      },
    ];
  }
}

export const privacyService = new PrivacyService();
export default privacyService;
