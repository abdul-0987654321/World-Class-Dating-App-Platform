/**
 * Services Index
 * Centralized exports for all service clients
 */

// API Infrastructure
export { API_CONFIG, getAuthHeaders, getMultipartHeaders } from './api/config';
export { httpClient, default as HttpClient } from './api/httpClient';
export type { ApiResponse, RequestOptions } from './api/httpClient';

// API Services
export { discoveryService } from './api/discovery.service';
export { default as DiscoveryService } from './api/discovery.service';
export { matchService } from './api/match.service';
export { messagingService } from './api/MessagingService';
export { encryptionKeysAPI } from './api/encryptionKeysAPI';

// AI Services
export * from './ai';

// Encryption Services
export * from './encryption';

// Offline Services
export * from './offline';

// Realtime Services
export * from './realtime';

// Notification Services
export { notificationService } from './notifications/NotificationService';
export { DeepLinkHandler } from './notifications/DeepLinkHandler';

// Payment Services
export { paymentService } from './payments/PaymentService';

// Video Call Services
export { default as videoCallService } from './videoCallService';

// Mode Service
export { modeService } from './mode.service';

// Safety Service
export { safetyService } from './safety.service';
export type { SecuritySettings, VerificationStatus, ReportUserParams } from './safety.service';
