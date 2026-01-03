/**
 * Safety Services Index
 * Export all safety-related services for easy importing
 */

// Harassment Detection
export {
  harassmentDetectionService,
  HarassmentDetectionResult,
  ConversationRiskProfile,
} from '../harassment-detection.service';

// Enhanced Block Service
export {
  enhancedBlockService,
  BlockAuditLog,
  BulkBlockResult,
  EnhancedBlockResult,
} from '../enhanced-block.service';

// Panic Button Service
export {
  panicButtonService,
  PanicLocation,
  PanicEventOptions,
  PanicEvent,
  EmergencyResources,
} from '../panic-button.service';

// Admin Safety Dashboard
export {
  adminSafetyDashboardService,
  ReportQueueItem,
  UserSafetyProfile,
  SafetyDashboardStats,
  ModeratorAction,
} from '../admin-safety-dashboard.service';

// Real-time Moderation
export {
  realtimeModerationService,
  ModerationDecision,
  ContentToModerate,
  ModerationQueueItem,
} from '../realtime-moderation.service';

/**
 * Safety Feature Summary:
 *
 * 1. BLOCK USER FUNCTIONALITY
 *    - Enhanced block with audit logging
 *    - Block and report in one action
 *    - Unmatch and block
 *    - Bulk block multiple users
 *    - Auto-block for harassment
 *    - Block statistics for admin
 *
 * 2. REPORT/FLAG USER SYSTEM
 *    - Submit reports with evidence
 *    - AI-assisted report categorization
 *    - Report priority scoring
 *    - Moderation queue management
 *    - Bulk report resolution
 *
 * 3. PANIC BUTTON / EMERGENCY
 *    - One-tap panic button
 *    - Location tracking and sharing
 *    - Emergency services (911) integration
 *    - Live location updates
 *    - Escalation to support team
 *    - Audio recording option
 *    - Crisis resources
 *
 * 4. HARASSMENT DETECTION AI
 *    - Real-time content analysis
 *    - Pattern-based detection for:
 *      - Direct threats
 *      - Sexual harassment
 *      - Stalking behavior
 *      - Blackmail/coercion
 *      - Manipulation
 *      - Hate speech
 *      - Pressure tactics
 *    - Risk scoring (0-1 scale)
 *    - Automatic flagging and blocking
 *    - Review queue for moderators
 *
 * 5. ADMIN DASHBOARD
 *    - Comprehensive safety statistics
 *    - Report moderation queue
 *    - Harassment detection review
 *    - User safety profiles
 *    - Moderator action logging
 *    - Take action on users (warn, suspend, ban)
 *
 * 6. REAL-TIME CONTENT MODERATION
 *    - Instant message moderation
 *    - Profile content moderation
 *    - Automatic flagging and queuing
 *    - Moderation queue management
 *    - Processing statistics
 */
