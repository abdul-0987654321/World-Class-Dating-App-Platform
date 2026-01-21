/**
 * Services Configuration
 * Re-exports API configuration for services
 *
 * IMPORTANT: This is the single source of truth for API URLs in the mobile app.
 * All URLs must be configured via environment variables (EXPO_PUBLIC_* prefix).
 * See .env.example for required environment variables.
 */

export {
  API_CONFIG,
  getAuthHeaders,
  getMultipartHeaders,
  API_BASE_URL,
  WS_BASE_URL,
  MESSAGING_SERVICE_URL,
} from './api/config';
export { default } from './api/config';
