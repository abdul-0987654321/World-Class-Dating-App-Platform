/**
 * API Services Index
 * Re-exports all API services and utilities
 */

export * from './config';
export * from './httpClient';
export { httpClient as api, httpClient as default } from './httpClient';
export * from './discovery.service';
export * from './match.service';
export * from './MessagingService';
export * from './messaging';
// Note: apiClient re-exports httpClient, so we only export the default to avoid duplicate ApiResponse
export { default as ApiClient } from './apiClient';
export * from './encryptionKeysAPI';
