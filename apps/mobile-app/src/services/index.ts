/**
 * Services Index
 * Centralized exports for all service clients
 */

// API Infrastructure
export { API_CONFIG, getAuthHeaders, getMultipartHeaders } from './api/config';
export { httpClient, default as HttpClient } from './api/httpClient';
export type { ApiResponse, RequestOptions } from './api/httpClient';

// AI Services
export * from './ai';
