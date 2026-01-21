/**
 * Services Configuration
 * Re-exports API configuration for services
 */

export * from './api/config';
export { default } from './api/config';

// Export commonly needed constants
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.flamoral.com';
export const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.flamoral.com';
export const MESSAGING_SERVICE_URL =
  process.env.EXPO_PUBLIC_MESSAGING_SERVICE_URL || 'http://localhost:3003';
