# Flamoral Dating Platform - API Contracts & Schema Definitions

**Date**: 2025-12-12
**Version**: 1.0.0
**Purpose**: Define request/response schemas and data contracts for all API endpoints

---

## Table of Contents

1. [Authentication Contracts](#1-authentication-contracts)
2. [User Profile Contracts](#2-user-profile-contracts)
3. [Matching & Discovery Contracts](#3-matching--discovery-contracts)
4. [Messaging Contracts](#4-messaging-contracts)
5. [Media Contracts](#5-media-contracts)
6. [Payment & Subscription Contracts](#6-payment--subscription-contracts)
7. [Notification Contracts](#7-notification-contracts)
8. [Moderation Contracts](#8-moderation-contracts)
9. [Analytics Contracts](#9-analytics-contracts)
10. [Common Schemas](#10-common-schemas)
11. [Error Response Schemas](#11-error-response-schemas)

---

## 1. Authentication Contracts

### 1.1 Register User

**Endpoint**: `POST /api/auth/register`

**Request Schema**:
```typescript
interface RegisterRequest {
  email: string;                    // Required, valid email format
  password: string;                 // Required, min 8 chars, must contain uppercase, lowercase, number
  firstName: string;                // Required, 1-50 chars
  lastName: string;                 // Required, 1-50 chars
  dateOfBirth: string;              // Required, ISO 8601 date, must be 18+ years old
  gender: 'male' | 'female' | 'non-binary' | 'other';  // Required
  phoneNumber?: string;             // Optional, E.164 format
  deviceData?: {
    deviceId: string;               // Unique device identifier
    deviceType: 'ios' | 'android' | 'web';
    pushToken?: string;             // FCM/APNS token
    deviceName?: string;            // e.g., "iPhone 13 Pro"
  };
}
```

**Response Schema** (Success - 201):
```typescript
interface RegisterResponse {
  success: true;
  message: string;
  data: {
    accessToken: string;            // JWT access token
    refreshToken: string;           // JWT refresh token
    expiresIn: number;              // Token expiration in seconds (86400 = 24h)
    user: UserProfile;              // See User Profile schema
  };
}
```

**Validation Rules**:
- Email must be unique
- Password: min 8 chars, max 128, at least 1 uppercase, 1 lowercase, 1 number
- Age: Must be 18 or older
- Phone number: Must be unique if provided

---

### 1.2 Login

**Endpoint**: `POST /api/auth/login`

**Request Schema**:
```typescript
interface LoginRequest {
  email: string;                    // Required
  password: string;                 // Required
  deviceData?: {
    deviceId: string;
    deviceType: 'ios' | 'android' | 'web';
    pushToken?: string;
  };
}
```

**Response Schema** (Success - 200):
```typescript
interface LoginResponse {
  success: true;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: UserProfile;
    session: {
      id: string;
      createdAt: string;            // ISO 8601 timestamp
      expiresAt: string;
      ip: string;
      userAgent: string;
    };
  };
}
```

**Error Cases**:
- `401 Unauthorized`: Invalid credentials
- `401 Unauthorized`: Account locked due to multiple failed attempts
- `403 Forbidden`: Account deactivated
- `422 Validation Error`: Missing required fields

---

### 1.3 Refresh Token

**Endpoint**: `POST /api/auth/refresh-token`

**Request Schema**:
```typescript
interface RefreshTokenRequest {
  refreshToken: string;             // Required, valid refresh token
}
```

**Response Schema** (Success - 200):
```typescript
interface RefreshTokenResponse {
  success: true;
  message: string;
  data: {
    accessToken: string;            // New access token
    refreshToken: string;           // New refresh token (token rotation)
    expiresIn: number;
  };
}
```

---

### 1.4 Logout

**Endpoint**: `POST /api/auth/logout`

**Headers**:
```
Authorization: Bearer <access_token>
```

**Request Schema**: No body required

**Response Schema** (Success - 200):
```typescript
interface LogoutResponse {
  success: true;
  message: "Logout successful";
}
```

---

### 1.5 Password Reset Flow

**Request Password Reset**: `POST /api/auth/forgot-password`

**Request Schema**:
```typescript
interface ForgotPasswordRequest {
  email: string;                    // Required
}
```

**Response Schema** (Success - 200):
```typescript
interface ForgotPasswordResponse {
  success: true;
  message: "If an account exists with this email, a password reset link will be sent";
}
```

---

**Reset Password**: `POST /api/auth/reset-password`

**Request Schema**:
```typescript
interface ResetPasswordRequest {
  token: string;                    // Required, password reset token from email
  newPassword: string;              // Required, same validation as registration
}
```

**Response Schema** (Success - 200):
```typescript
interface ResetPasswordResponse {
  success: true;
  message: "Password reset successfully";
}
```

---

## 2. User Profile Contracts

### 2.1 User Profile Schema

```typescript
interface UserProfile {
  id: string;                       // UUID
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;             // Auto-generated or custom
  dateOfBirth: string;              // ISO 8601 date
  age: number;                      // Calculated from dateOfBirth
  gender: 'male' | 'female' | 'non-binary' | 'other';
  bio?: string;                     // Max 500 characters
  occupation?: string;
  education?: string;
  company?: string;
  school?: string;

  // Location
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    state?: string;
    country: string;
    formattedAddress?: string;
  };

  // Photos
  photos: ProfilePhoto[];           // Array of photos (max 9)
  primaryPhoto?: ProfilePhoto;      // Main profile photo

  // Preferences
  preferences: UserPreferences;

  // Settings
  settings: UserSettings;

  // Status
  isVerified: boolean;              // Email verified
  isProfileVerified: boolean;       // Photo/identity verified
  isPremium: boolean;
  isActive: boolean;

  // Metrics
  profileCompleteness: number;      // 0-100%

  // Timestamps
  createdAt: string;                // ISO 8601
  updatedAt: string;
  lastActiveAt: string;
}
```

### 2.2 Profile Photo Schema

```typescript
interface ProfilePhoto {
  id: string;                       // UUID
  url: string;                      // CDN URL
  thumbnailUrl: string;             // Thumbnail version
  width: number;
  height: number;
  isPrimary: boolean;
  order: number;                    // Display order (0-8)
  uploadedAt: string;
  moderationStatus: 'pending' | 'approved' | 'rejected';
  blurHash?: string;                // BlurHash for progressive loading
}
```

### 2.3 User Preferences Schema

```typescript
interface UserPreferences {
  // Discovery preferences
  ageMin: number;                   // Min 18
  ageMax: number;                   // Max 100
  maxDistance: number;              // In kilometers (1-100)
  genderPreference: ('male' | 'female' | 'non-binary' | 'other')[];

  // Advanced filters
  showMe: 'everyone' | 'verified-only';
  heightMin?: number;               // In cm
  heightMax?: number;
  educationPreference?: string[];

  // Privacy
  showOnlineStatus: boolean;
  showDistance: boolean;
  showAge: boolean;
  incognitoMode: boolean;           // Premium feature

  // Notifications
  pauseDiscovery: boolean;          // Snooze account
}
```

### 2.4 User Settings Schema

```typescript
interface UserSettings {
  // Notifications
  notifications: {
    push: {
      enabled: boolean;
      newMatches: boolean;
      newMessages: boolean;
      profileLikes: boolean;
      superLikes: boolean;
    };
    email: {
      enabled: boolean;
      newsletter: boolean;
      weeklyDigest: boolean;
      promotions: boolean;
    };
    sms: {
      enabled: boolean;
    };
  };

  // Privacy
  privacy: {
    showMeInDiscovery: boolean;
    blockScreenshots: boolean;       // Mobile only
    readReceipts: boolean;
    typingIndicators: boolean;
  };

  // Language & Locale
  language: string;                  // ISO 639-1 code (e.g., 'en', 'es')
  timezone: string;                  // IANA timezone

  // Accessibility
  accessibility: {
    fontSize: 'small' | 'medium' | 'large';
    highContrast: boolean;
  };
}
```

---

### 2.5 Get Current User Profile

**Endpoint**: `GET /api/users/me`

**Response Schema** (Success - 200):
```typescript
interface GetProfileResponse {
  success: true;
  data: UserProfile;
}
```

---

### 2.6 Update User Profile

**Endpoint**: `PUT /api/users/me`

**Request Schema**:
```typescript
interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  bio?: string;                     // Max 500 chars
  occupation?: string;
  education?: string;
  company?: string;
  school?: string;
  location?: {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
  };
}
```

**Response Schema** (Success - 200):
```typescript
interface UpdateProfileResponse {
  success: true;
  message: string;
  data: UserProfile;
}
```

---

### 2.7 Upload Profile Photo

**Endpoint**: `POST /api/users/me/photos`

**Request**: Multipart form data
- `file`: File (required) - JPG, PNG, or WEBP, max 10MB
- `order`: number (optional) - Display order

**Response Schema** (Success - 201):
```typescript
interface UploadPhotoResponse {
  success: true;
  message: string;
  data: {
    photo: ProfilePhoto;
    profileCompleteness: number;    // Updated completeness %
  };
}
```

---

## 3. Matching & Discovery Contracts

### 3.1 Discovery Profile Schema

```typescript
interface DiscoveryProfile {
  id: string;
  firstName: string;
  age: number;
  bio?: string;
  occupation?: string;
  education?: string;

  photos: {
    id: string;
    url: string;
    thumbnailUrl: string;
    blurHash?: string;
  }[];

  distance: number;                 // In km
  compatibilityScore?: number;      // 0-100, premium feature

  badges: ProfileBadge[];           // e.g., 'verified', 'new', 'popular'

  interests?: string[];

  lastActiveAt: string;             // ISO 8601
  isOnline: boolean;
}
```

### 3.2 Profile Badge Schema

```typescript
interface ProfileBadge {
  type: 'verified' | 'new' | 'popular' | 'premium' | 'active';
  label: string;
  color: string;                    // Hex color code
  icon?: string;                    // Icon name or URL
}
```

---

### 3.3 Get Discovery Recommendations

**Endpoint**: `GET /api/discovery/recommendations`

**Query Parameters**:
- `limit`: number (default: 20, max: 100)
- `offset`: number (default: 0)

**Response Schema** (Success - 200):
```typescript
interface DiscoveryRecommendationsResponse {
  success: true;
  data: {
    profiles: DiscoveryProfile[];
    hasMore: boolean;
    nextOffset: number;
    total?: number;                 // Total available (premium feature)
  };
}
```

---

### 3.4 Search Profiles

**Endpoint**: `POST /api/discovery/search`

**Request Schema**:
```typescript
interface SearchProfilesRequest {
  filters: {
    ageMin?: number;
    ageMax?: number;
    distance?: number;
    gender?: string[];
    verified?: boolean;
    hasPhoto?: boolean;
  };
  limit?: number;
  offset?: number;
}
```

**Response Schema** (Success - 200):
```typescript
interface SearchProfilesResponse {
  success: true;
  data: {
    profiles: DiscoveryProfile[];
    count: number;
    total: number;
  };
}
```

---

### 3.5 Like Profile

**Endpoint**: `POST /api/likes`

**Request Schema**:
```typescript
interface LikeProfileRequest {
  targetUserId: string;             // UUID of profile to like
  timestamp?: string;               // ISO 8601, for analytics
}
```

**Response Schema** (Success - 201):
```typescript
interface LikeProfileResponse {
  success: true;
  data: {
    liked: true;
    isMatch: boolean;               // True if mutual like
    match?: Match;                  // If isMatch = true
    remainingLikes?: number;        // For free users
  };
}
```

---

### 3.6 Super Like Profile

**Endpoint**: `POST /api/super-likes`

**Request Schema**:
```typescript
interface SuperLikeRequest {
  targetUserId: string;
  timestamp?: string;
}
```

**Response Schema** (Success - 201):
```typescript
interface SuperLikeResponse {
  success: true;
  data: {
    superLiked: true;
    isMatch: boolean;
    match?: Match;
    remainingSuperLikes: number;    // Daily limit
    nextResetAt: string;            // ISO 8601, when quota resets
  };
}
```

**Error Cases**:
- `403 Forbidden`: No super likes remaining (free users)
- `402 Payment Required`: Premium feature (if not subscribed)

---

### 3.7 Match Schema

```typescript
interface Match {
  id: string;                       // UUID
  matchedUser: {
    id: string;
    firstName: string;
    age: number;
    photos: {
      id: string;
      url: string;
    }[];
    bio?: string;
    distance: number;
  };
  matchedAt: string;                // ISO 8601
  lastActivityAt: string;
  compatibilityScore?: number;      // 0-100
  unreadMessages: number;
  conversationId?: string;          // UUID of conversation

  // Match expiration (free users)
  expiresAt?: string;               // ISO 8601, 24h from match
  isExpired: boolean;
  canExtend: boolean;               // Premium feature
}
```

---

### 3.8 Get Matches

**Endpoint**: `GET /api/matches`

**Query Parameters**:
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response Schema** (Success - 200):
```typescript
interface GetMatchesResponse {
  success: true;
  data: {
    matches: Match[];
    count: number;
    total: number;
    newMatchesCount: number;        // Unread matches
  };
}
```

---

### 3.9 Boost Profile

**Endpoint**: `POST /api/boost`

**Request Schema**: No body required

**Response Schema** (Success - 201):
```typescript
interface BoostResponse {
  success: true;
  data: {
    boosted: true;
    boostExpiresAt: string;         // ISO 8601, typically +30 minutes
    nextBoostAvailableAt?: string;  // For premium users with monthly boost
    profileViews: number;           // Estimated views during boost
  };
}
```

**Error Cases**:
- `402 Payment Required`: No boosts available
- `429 Too Many Requests`: Boost already active

---

## 4. Messaging Contracts

### 4.1 Conversation Schema

```typescript
interface Conversation {
  id: string;                       // UUID
  participantIds: string[];         // Always 2 users
  otherUser: {
    id: string;
    firstName: string;
    age: number;
    primaryPhoto?: {
      url: string;
      thumbnailUrl: string;
    };
    isOnline: boolean;
    lastSeenAt: string;
  };

  lastMessage?: Message;
  unreadCount: number;

  createdAt: string;
  updatedAt: string;
  lastActivityAt: string;
}
```

### 4.2 Message Schema

```typescript
interface Message {
  id: string;                       // UUID
  conversationId: string;
  senderId: string;
  recipientId: string;

  content: string;                  // Max 2000 chars
  type: 'text' | 'image' | 'gif' | 'voice' | 'video';

  // For rich media
  media?: {
    url: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
    duration?: number;              // For voice/video
    mimeType: string;
  };

  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

  // Read receipts
  deliveredAt?: string;
  readAt?: string;

  // Metadata
  replyTo?: string;                 // Message ID this is replying to
  isEdited: boolean;
  editedAt?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

### 4.3 Get Conversations

**Endpoint**: `GET /api/conversations`

**Query Parameters**:
- `limit`: number (default: 20)
- `offset`: number (default: 0)

**Response Schema** (Success - 200):
```typescript
interface GetConversationsResponse {
  success: true;
  data: {
    conversations: Conversation[];
    totalUnread: number;
    hasMore: boolean;
  };
}
```

---

### 4.4 Send Message

**Endpoint**: `POST /api/messages`

**Request Schema**:
```typescript
interface SendMessageRequest {
  conversationId: string;           // UUID
  content: string;                  // Required for text, max 2000 chars
  type: 'text' | 'image' | 'gif' | 'voice';

  // For image/gif/voice
  mediaUrl?: string;                // URL from media service
  mediaMetadata?: {
    width?: number;
    height?: number;
    duration?: number;
    mimeType?: string;
  };

  replyTo?: string;                 // Message ID

  // Client-generated ID for deduplication
  clientId?: string;
}
```

**Response Schema** (Success - 201):
```typescript
interface SendMessageResponse {
  success: true;
  data: {
    message: Message;
    conversation: Conversation;     // Updated conversation with new last message
  };
}
```

---

### 4.5 Get Conversation Messages

**Endpoint**: `GET /api/conversations/:conversationId/messages`

**Query Parameters**:
- `limit`: number (default: 50, max: 100)
- `offset`: number (default: 0)
- `before`: string (optional) - ISO 8601 timestamp, get messages before this time

**Response Schema** (Success - 200):
```typescript
interface GetMessagesResponse {
  success: true;
  data: {
    messages: Message[];            // Ordered newest to oldest
    hasMore: boolean;
    oldestTimestamp: string;        // For pagination
  };
}
```

---

### 4.6 Mark Conversation as Read

**Endpoint**: `PUT /api/conversations/:conversationId/read`

**Request Schema**: No body required

**Response Schema** (Success - 200):
```typescript
interface MarkReadResponse {
  success: true;
  data: {
    conversationId: string;
    messagesMarkedRead: number;
  };
}
```

---

## 5. Media Contracts

### 5.1 Upload Image

**Endpoint**: `POST /api/media/upload/image`

**Request**: Multipart form data
- `file`: File (required) - JPG, PNG, WEBP, max 10MB
- `purpose`: string - 'profile' | 'message' | 'verification'

**Response Schema** (Success - 201):
```typescript
interface UploadImageResponse {
  success: true;
  data: {
    mediaId: string;                // UUID
    url: string;                    // CDN URL
    thumbnailUrl: string;
    width: number;
    height: number;
    fileSize: number;               // In bytes
    mimeType: string;
    blurHash?: string;

    processingStatus: 'pending' | 'processing' | 'completed';
    moderationStatus: 'pending' | 'approved' | 'rejected';
  };
}
```

---

### 5.2 Media Item Schema

```typescript
interface MediaItem {
  id: string;                       // UUID
  userId: string;
  type: 'image' | 'video' | 'audio';
  purpose: 'profile' | 'message' | 'verification';

  originalUrl: string;
  url: string;                      // Processed/optimized URL
  thumbnailUrl?: string;

  width: number;
  height: number;
  fileSize: number;
  mimeType: string;

  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  moderationStatus: 'pending' | 'approved' | 'rejected' | 'flagged';

  metadata?: {
    blurHash?: string;
    dominantColor?: string;
    faces?: number;                 // Face count from AI analysis
    aiLabels?: string[];            // Content labels
  };

  uploadedAt: string;
  processedAt?: string;
}
```

---

## 6. Payment & Subscription Contracts

### 6.1 Subscription Plan Schema

```typescript
interface SubscriptionPlan {
  id: string;                       // UUID
  name: string;                     // e.g., "Premium", "Premium Plus"
  tier: 'free' | 'premium' | 'premium_plus';

  pricing: {
    monthly: {
      amount: number;               // In cents (e.g., 1999 = $19.99)
      currency: string;             // ISO 4217 code (e.g., "USD")
      stripePriceId?: string;
    };
    quarterly?: {
      amount: number;
      currency: string;
      savings: number;              // % savings vs monthly
      stripePriceId?: string;
    };
    yearly?: {
      amount: number;
      currency: string;
      savings: number;
      stripePriceId?: string;
    };
  };

  features: {
    unlimitedLikes: boolean;
    superLikesPerDay: number;       // 0 for free, 5 for premium, unlimited for plus
    boostsPerMonth: number;
    seeWhoLikedYou: boolean;
    rewind: boolean;
    noAds: boolean;
    prioritySupport: boolean;
    advancedFilters: boolean;
    incognitoMode: boolean;
    readReceipts: boolean;
    passportMode: boolean;          // Change location
  };

  isActive: boolean;
  displayOrder: number;
}
```

---

### 6.2 Get Subscription Plans

**Endpoint**: `GET /api/subscriptions/plans`

**Response Schema** (Success - 200):
```typescript
interface GetPlansResponse {
  success: true;
  data: {
    plans: SubscriptionPlan[];
    currentPlan?: string;           // Plan ID if user has active subscription
  };
}
```

---

### 6.3 User Subscription Schema

```typescript
interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;           // Nested plan details

  status: 'active' | 'canceled' | 'past_due' | 'expired' | 'trialing';

  billing: {
    interval: 'monthly' | 'quarterly' | 'yearly';
    amount: number;
    currency: string;
    nextBillingDate: string;        // ISO 8601
    lastBillingDate?: string;
  };

  paymentMethod?: {
    id: string;
    type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
    last4?: string;                 // Last 4 digits of card
    brand?: string;                 // Visa, Mastercard, etc.
  };

  // Stripe-specific
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;

  startDate: string;
  endDate?: string;                 // If canceled
  canceledAt?: string;
  willCancelAt?: string;            // Scheduled cancellation

  trialEnd?: string;                // If in trial period

  createdAt: string;
  updatedAt: string;
}
```

---

### 6.4 Create Subscription

**Endpoint**: `POST /api/subscriptions`

**Request Schema**:
```typescript
interface CreateSubscriptionRequest {
  planId: string;                   // UUID
  interval: 'monthly' | 'quarterly' | 'yearly';
  paymentMethodId: string;          // Stripe payment method ID
  promoCode?: string;
}
```

**Response Schema** (Success - 201):
```typescript
interface CreateSubscriptionResponse {
  success: true;
  data: {
    subscription: UserSubscription;
    invoice?: {
      id: string;
      amountDue: number;
      currency: string;
      status: 'paid' | 'open' | 'void';
      invoiceUrl: string;
    };
  };
}
```

---

### 6.5 In-App Product Schema

```typescript
interface InAppProduct {
  id: string;
  type: 'super_likes' | 'boosts' | 'coins';
  name: string;
  description: string;

  quantity: number;                 // e.g., 5 super likes

  pricing: {
    amount: number;
    currency: string;
    stripePriceId?: string;

    // Mobile app stores
    appleSKU?: string;
    googleSKU?: string;
  };

  bonus?: {
    type: string;
    amount: number;                 // e.g., +2 bonus super likes
  };

  isActive: boolean;
  displayOrder: number;
}
```

---

### 6.6 Purchase Product

**Endpoint**: `POST /api/purchases`

**Request Schema**:
```typescript
interface PurchaseProductRequest {
  productId: string;                // UUID
  paymentMethodId?: string;         // Stripe payment method (web)

  // For mobile app stores
  platform?: 'ios' | 'android';
  receipt?: string;                 // App store receipt
  transactionId?: string;           // App store transaction ID
}
```

**Response Schema** (Success - 201):
```typescript
interface PurchaseProductResponse {
  success: true;
  data: {
    purchase: {
      id: string;
      productId: string;
      product: InAppProduct;
      amount: number;
      currency: string;
      status: 'completed' | 'pending' | 'failed';
      createdAt: string;
    };
    balance: {
      superLikes: number;
      boosts: number;
      coins: number;
    };
  };
}
```

---

## 7. Notification Contracts

### 7.1 Notification Schema

```typescript
interface Notification {
  id: string;                       // UUID
  userId: string;
  type: 'match' | 'message' | 'like' | 'super_like' | 'profile_view' | 'system';

  title: string;
  body: string;

  data: {
    // Type-specific data
    matchId?: string;
    conversationId?: string;
    messageId?: string;
    fromUserId?: string;
    fromUserName?: string;
    fromUserPhoto?: string;
  };

  actionUrl?: string;               // Deep link URL

  isRead: boolean;
  readAt?: string;

  priority: 'low' | 'normal' | 'high';

  createdAt: string;
  expiresAt?: string;               // For time-sensitive notifications
}
```

---

### 7.2 Get Notifications

**Endpoint**: `GET /api/notifications`

**Query Parameters**:
- `limit`: number (default: 20)
- `offset`: number (default: 0)
- `unread`: boolean (filter unread only)

**Response Schema** (Success - 200):
```typescript
interface GetNotificationsResponse {
  success: true;
  data: {
    notifications: Notification[];
    unreadCount: number;
    hasMore: boolean;
  };
}
```

---

### 7.3 Notification Settings Schema

```typescript
interface NotificationSettings {
  push: {
    enabled: boolean;
    newMatches: boolean;
    newMessages: boolean;
    profileLikes: boolean;
    superLikes: boolean;
    matchExpiring: boolean;

    // Quiet hours
    quietHours: {
      enabled: boolean;
      startTime: string;            // HH:mm format (e.g., "22:00")
      endTime: string;              // HH:mm format (e.g., "08:00")
    };
  };

  email: {
    enabled: boolean;
    newMatches: boolean;
    newMessages: boolean;
    weeklyDigest: boolean;
    promotions: boolean;
    newsletter: boolean;
  };

  sms: {
    enabled: boolean;
    securityAlerts: boolean;
  };

  inApp: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
}
```

---

## 8. Moderation Contracts

### 8.1 Report Schema

```typescript
interface Report {
  id: string;                       // UUID
  reporterId: string;
  reportedUserId: string;
  reportedContentType?: 'profile' | 'photo' | 'message';
  reportedContentId?: string;

  reason: 'inappropriate_content' | 'fake_profile' | 'harassment' |
          'spam' | 'underage' | 'offline_behavior' | 'other';
  description?: string;             // Max 1000 chars

  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  resolution?: string;

  evidence?: {
    screenshots: string[];          // Media IDs
    additionalInfo: string;
  };

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;              // Admin ID
}
```

---

### 8.2 Submit Report

**Endpoint**: `POST /api/moderation/reports`

**Request Schema**:
```typescript
interface SubmitReportRequest {
  reportedUserId: string;           // UUID
  reportedContentType?: 'profile' | 'photo' | 'message';
  reportedContentId?: string;
  reason: string;                   // One of the enum values
  description?: string;
  evidence?: {
    screenshots?: string[];         // Media IDs
  };
}
```

**Response Schema** (Success - 201):
```typescript
interface SubmitReportResponse {
  success: true;
  message: string;
  data: {
    report: Report;
  };
}
```

---

### 8.3 Content Moderation Schema

```typescript
interface ModerationResult {
  contentId: string;
  contentType: 'text' | 'image' | 'profile';
  status: 'pending' | 'approved' | 'rejected' | 'flagged';

  aiAnalysis?: {
    isSafe: boolean;
    confidence: number;             // 0-1
    labels: string[];               // Detected content labels
    nsfw: boolean;
    toxic: boolean;
    spam: boolean;
  };

  humanReview?: {
    reviewedBy: string;             // Admin ID
    reviewedAt: string;
    notes?: string;
  };

  createdAt: string;
  updatedAt: string;
}
```

---

## 9. Analytics Contracts

### 9.1 User Analytics Dashboard

**Endpoint**: `GET /api/analytics/dashboard`

**Response Schema** (Success - 200):
```typescript
interface AnalyticsDashboardResponse {
  success: true;
  data: {
    profileViews: {
      total: number;
      last7Days: number;
      last30Days: number;
      trend: 'up' | 'down' | 'stable';
      percentChange: number;
    };

    likes: {
      received: number;
      sent: number;
      matchRate: number;            // % of likes that became matches
    };

    matches: {
      total: number;
      new: number;                  // In last 7 days
      active: number;               // With recent messages
    };

    messages: {
      sent: number;
      received: number;
      responseRate: number;         // %
      avgResponseTime: number;      // In minutes
    };

    engagement: {
      activeMinutes: number;        // Last 7 days
      swipes: number;
      conversationsStarted: number;
    };
  };
}
```

---

### 9.2 Track Event

**Endpoint**: `POST /api/analytics/events`

**Request Schema**:
```typescript
interface TrackEventRequest {
  eventType: string;                // e.g., 'profile_view', 'swipe_right'
  properties?: Record<string, any>; // Event-specific data
  timestamp?: string;               // ISO 8601, defaults to now
}
```

**Response Schema** (Success - 201):
```typescript
interface TrackEventResponse {
  success: true;
  message: "Event tracked successfully";
}
```

---

## 10. Common Schemas

### 10.1 Pagination Metadata

```typescript
interface PaginationMeta {
  page: number;                     // Current page (1-indexed)
  limit: number;                    // Items per page
  total: number;                    // Total items
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

### 10.2 Location

```typescript
interface Location {
  latitude: number;                 // -90 to 90
  longitude: number;                // -180 to 180
  city: string;
  state?: string;
  country: string;                  // ISO 3166-1 alpha-2 code
  formattedAddress?: string;
  accuracy?: number;                // In meters
}
```

### 10.3 Timestamp Fields

```typescript
interface Timestamps {
  createdAt: string;                // ISO 8601 format
  updatedAt: string;
  deletedAt?: string;               // Soft delete
}
```

---

## 11. Error Response Schemas

### 11.1 Standard Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;                   // Machine-readable error code
    message: string;                // Human-readable message
    details?: any;                  // Additional error context
    field?: string;                 // For validation errors
    statusCode: number;             // HTTP status code
  };
  meta?: {
    timestamp: string;
    requestId: string;              // For debugging
  };
}
```

### 11.2 Validation Error Response

```typescript
interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      field: string;
      message: string;
      value?: any;
      constraint?: string;
    }[];
  };
}
```

### 11.3 Common Error Codes

```typescript
enum ErrorCode {
  // Authentication (401)
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Authorization (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PREMIUM_REQUIRED = 'PREMIUM_REQUIRED',

  // Validation (422)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PASSWORD = 'INVALID_PASSWORD',

  // Not Found (404)
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',

  // Conflict (409)
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  ALREADY_MATCHED = 'ALREADY_MATCHED',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DAILY_LIMIT_REACHED = 'DAILY_LIMIT_REACHED',

  // Server (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

---

## 12. WebSocket Contracts

### 12.1 WebSocket Connection

**URL**: `ws://localhost:3000/ws`
**Authentication**: Query parameter `?token=<JWT>`

### 12.2 WebSocket Events (Client → Server)

```typescript
// Join conversation room
interface JoinConversationEvent {
  type: 'join_conversation';
  data: {
    conversationId: string;
  };
}

// Send typing indicator
interface TypingEvent {
  type: 'typing';
  data: {
    conversationId: string;
    isTyping: boolean;
  };
}

// Mark message as read
interface ReadReceiptEvent {
  type: 'read_receipt';
  data: {
    messageId: string;
    conversationId: string;
  };
}
```

### 12.3 WebSocket Events (Server → Client)

```typescript
// New message
interface NewMessageEvent {
  type: 'new_message';
  data: {
    message: Message;
    conversation: Conversation;
  };
}

// Message status update
interface MessageStatusEvent {
  type: 'message_status';
  data: {
    messageId: string;
    status: 'sent' | 'delivered' | 'read';
  };
}

// Typing indicator
interface TypingIndicatorEvent {
  type: 'typing_indicator';
  data: {
    conversationId: string;
    userId: string;
    isTyping: boolean;
  };
}

// New match
interface NewMatchEvent {
  type: 'new_match';
  data: {
    match: Match;
  };
}

// User online status
interface OnlineStatusEvent {
  type: 'online_status';
  data: {
    userId: string;
    isOnline: boolean;
    lastSeenAt?: string;
  };
}
```

---

**End of API Contracts Document**
