/**
 * Services Index
 * Centralized exports for all service clients
 */

// API Infrastructure
export { API_CONFIG, getAuthHeaders, getMultipartHeaders } from './api/config';
export { httpClient, default as HttpClient } from './api/httpClient';
export type { ApiResponse, RequestOptions } from './api/httpClient';

// API Services
export { DiscoveryService, discoveryService } from './api/discovery.service';
export { MatchService, matchService } from './api/match.service';
export { MessagingService } from './api/MessagingService';
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
export { NotificationService } from './notifications/NotificationService';
export { DeepLinkHandler } from './notifications/DeepLinkHandler';

// Payment Services
export { PaymentService } from './payments/PaymentService';

// Video Call Services
export { videoCallService, VideoCallService } from './videoCallService';

// Mode Service
export { modeService } from './mode.service';

// Safety Service
export { safetyService } from './safety.service';
export type { SecuritySettings, VerificationStatus, ReportUserParams } from './safety.service';
