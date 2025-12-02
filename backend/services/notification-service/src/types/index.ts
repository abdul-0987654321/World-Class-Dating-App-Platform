/**
 * Type Definitions
 */

export enum NotificationType {
  NEW_MATCH = 'new_match',
  NEW_MESSAGE = 'new_message',
  NEW_LIKE = 'new_like',
  SUPER_LIKE = 'super_like',
  PROFILE_VIEW = 'profile_view',
  MATCH_EXPIRING = 'match_expiring',
  DAILY_PICKS = 'daily_picks',
  BOOST_ACTIVATED = 'boost_activated',
  SUBSCRIPTION_UPDATE = 'subscription_update',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  PAYMENT_SUCCESS = 'payment_success',
  PAYMENT_FAILED = 'payment_failed',
  PROFILE_BOOST_ACTIVE = 'profile_boost_active',
  VERIFICATION_COMPLETE = 'verification_complete',
  VIDEO_CALL_INCOMING = 'video_call_incoming',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  REMINDER = 'reminder',
  SECURITY_ALERT = 'security_alert',
}

export enum NotificationChannel {
  PUSH = 'push',
  EMAIL = 'email',
  SMS = 'sms',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  scheduledAt?: Date;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  imageUrl?: string;
  deepLink?: string;
  data?: Record<string, any>;
}

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  content: string;
  filename: string;
  type: string;
  disposition: string;
}

export interface SMSNotificationPayload {
  to: string;
  message: string;
}

export interface NotificationPreferences {
  userId: string;

  // Push preferences
  pushEnabled: boolean;
  pushNewMatch: boolean;
  pushNewMessage: boolean;
  pushNewLike: boolean;
  pushSuperLike: boolean;
  pushProfileView: boolean;
  pushBoostExpiring: boolean;
  pushMarketing: boolean;

  // Email preferences
  emailEnabled: boolean;
  emailNewMatch: boolean;
  emailNewMessage: boolean;
  emailWeeklyDigest: boolean;
  emailPromotions: boolean;
  emailProductUpdates: boolean;

  // SMS preferences
  smsEnabled: boolean;
  smsVerification: boolean;
  smsSecurityAlerts: boolean;

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  timezone: string;
}

export interface UserDevice {
  id: string;
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceModel?: string;
  osVersion?: string;
  appVersion?: string;
  isActive: boolean;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationChannel;
  category: string;
  subject?: string;
  title?: string;
  body: string;
  htmlBody?: string;
  variables: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  templateId?: string;
  type: NotificationChannel;
  category: string;
  title?: string;
  body: string;
  data?: any;
  actionUrl?: string;
  imageUrl?: string;
  status: NotificationStatus;
  priority: NotificationPriority;
  errorMessage?: string;
  retryCount: number;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RateLimitInfo {
  userId: string;
  count: number;
  resetAt: Date;
}

// API Request/Response Types
export interface SendNotificationRequest {
  userId: string;
  type: NotificationType;
  channels?: NotificationChannel[];
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  priority?: NotificationPriority;
  scheduledAt?: string;
}

export interface SendNotificationResponse {
  success: boolean;
  notificationId?: string;
  results?: {
    channel: NotificationChannel;
    success: boolean;
    error?: string;
  }[];
  error?: string;
}

export interface GetNotificationsResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export interface UpdatePreferencesRequest {
  pushEnabled?: boolean;
  pushNewMatch?: boolean;
  pushNewMessage?: boolean;
  pushNewLike?: boolean;
  pushSuperLike?: boolean;
  pushProfileView?: boolean;
  pushBoostExpiring?: boolean;
  pushMarketing?: boolean;
  emailEnabled?: boolean;
  emailNewMatch?: boolean;
  emailNewMessage?: boolean;
  emailWeeklyDigest?: boolean;
  emailPromotions?: boolean;
  emailProductUpdates?: boolean;
  smsEnabled?: boolean;
  smsVerification?: boolean;
  smsSecurityAlerts?: boolean;
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}
