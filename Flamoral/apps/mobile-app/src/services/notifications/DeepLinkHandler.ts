/**
 * Deep Link Handler
 * Handles deep linking from notifications and external sources
 */

import { Linking } from 'react-native';
import { navigationRef } from '../../navigation/NavigationService';

export interface DeepLinkConfig {
  scheme: string; // e.g., 'flamoral'
  prefix: string; // e.g., 'https://flamoral.app'
}

export class DeepLinkHandler {
  private config: DeepLinkConfig;
  private initialUrl: string | null = null;

  constructor(config: DeepLinkConfig) {
    this.config = config;
  }

  /**
   * Initialize deep link handler
   */
  async initialize(): Promise<void> {
    // Get initial URL (app opened via deep link)
    this.initialUrl = await Linking.getInitialURL();

    if (this.initialUrl) {
      console.log('Initial URL:', this.initialUrl);
      // Handle after navigation is ready
      setTimeout(() => {
        if (this.initialUrl) {
          this.handleDeepLink(this.initialUrl);
        }
      }, 1000);
    }

    // Listen for deep links while app is running
    Linking.addEventListener('url', this.handleUrlEvent);
  }

  /**
   * Handle URL event
   */
  private handleUrlEvent = ({ url }: { url: string }): void => {
    console.log('Deep link received:', url);
    this.handleDeepLink(url);
  };

  /**
   * Handle deep link URL
   */
  handleDeepLink(url: string): void {
    if (!url) return;

    const route = this.parseDeepLink(url);

    if (route) {
      this.navigate(route.screen, route.params);
    }
  }

  /**
   * Parse deep link URL into route
   */
  private parseDeepLink(url: string): { screen: string; params?: any } | null {
    try {
      // Remove scheme and prefix
      let path = url
        .replace(`${this.config.scheme}://`, '')
        .replace(this.config.prefix, '')
        .replace(/^\//, '');

      // Parse path and query params
      const [pathname, queryString] = path.split('?');
      const pathParts = pathname.split('/');

      // Parse query parameters
      const queryParams = this.parseQueryParams(queryString);

      // Route mapping
      const routes: Record<string, { screen: string; parseParams?: (parts: string[], query: any) => any }> = {
        'chat': {
          screen: 'Chat',
          parseParams: (parts, query) => ({
            userId: parts[1] || query.userId,
            chatId: query.chatId,
          }),
        },
        'profile': {
          screen: 'Profile',
          parseParams: (parts, query) => ({
            userId: parts[1] || query.userId,
          }),
        },
        'match': {
          screen: 'Match',
          parseParams: (parts, query) => ({
            matchId: parts[1] || query.matchId,
          }),
        },
        'discover': {
          screen: 'Discover',
        },
        'likes': {
          screen: 'Likes',
        },
        'matches': {
          screen: 'Matches',
        },
        'settings': {
          screen: 'Settings',
          parseParams: (parts) => ({
            section: parts[1],
          }),
        },
        'subscription': {
          screen: 'Subscription',
          parseParams: (parts, query) => ({
            plan: query.plan,
          }),
        },
        'call': {
          screen: 'VideoCall',
          parseParams: (parts, query) => ({
            callId: parts[1] || query.callId,
            userId: query.userId,
          }),
        },
        'verify': {
          screen: 'Verification',
          parseParams: (parts, query) => ({
            token: query.token,
          }),
        },
      };

      const routeKey = pathParts[0];
      const route = routes[routeKey];

      if (!route) {
        console.warn('Unknown deep link route:', routeKey);
        return null;
      }

      const params = route.parseParams
        ? route.parseParams(pathParts, queryParams)
        : queryParams;

      return {
        screen: route.screen,
        params,
      };
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  }

  /**
   * Parse query parameters
   */
  private parseQueryParams(queryString?: string): Record<string, any> {
    if (!queryString) return {};

    const params: Record<string, any> = {};

    queryString.split('&').forEach(param => {
      const [key, value] = param.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    });

    return params;
  }

  /**
   * Navigate to screen
   */
  private navigate(screen: string, params?: any): void {
    if (!navigationRef.current) {
      console.warn('Navigation not ready');
      return;
    }

    try {
      navigationRef.current.navigate(screen as never, params as never);
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }

  /**
   * Build deep link URL
   */
  buildDeepLink(screen: string, params?: Record<string, string>): string {
    const routeMap: Record<string, string> = {
      Chat: 'chat',
      Profile: 'profile',
      Match: 'match',
      Discover: 'discover',
      Likes: 'likes',
      Matches: 'matches',
      Settings: 'settings',
      Subscription: 'subscription',
      VideoCall: 'call',
      Verification: 'verify',
    };

    const route = routeMap[screen] || screen.toLowerCase();
    let url = `${this.config.scheme}://${route}`;

    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Build web deep link URL
   */
  buildWebDeepLink(screen: string, params?: Record<string, string>): string {
    const routeMap: Record<string, string> = {
      Chat: 'chat',
      Profile: 'profile',
      Match: 'match',
      Discover: 'discover',
      Likes: 'likes',
      Matches: 'matches',
      Settings: 'settings',
      Subscription: 'subscription',
      VideoCall: 'call',
      Verification: 'verify',
    };

    const route = routeMap[screen] || screen.toLowerCase();
    let url = `${this.config.prefix}/${route}`;

    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    Linking.removeAllListeners('url');
  }
}

// Default instance
export const deepLinkHandler = new DeepLinkHandler({
  scheme: 'flamoral',
  prefix: 'https://flamoral.app',
});

export default deepLinkHandler;
