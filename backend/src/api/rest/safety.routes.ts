/**
 * Safety, Privacy & Integrity Routes
 * Comprehensive API endpoints for all safety features
 */

import { Router, Request, Response } from 'express';
import { AuthMiddleware } from '../../middleware/auth.middleware.enhanced';
import { logger } from '../../utils/logger';
import { db } from '../../config/database.config';
import {
  UserRepository,
  ProfileRepository,
  SafetyRepository,
} from '../../repositories';
import {
  IdentityVerificationService,
  AccountSecurityService,
  ContentModerationService,
  PhysicalSafetyService,
  DataPrivacyService,
  VulnerablePopulationProtectionService,
} from '../../services/core';

const router = Router();

// Initialize repositories
const userRepo = new UserRepository(db);
const profileRepo = new ProfileRepository(db);
const safetyRepo = new SafetyRepository(db);

// Initialize services
const identityService = new IdentityVerificationService(safetyRepo, userRepo);
const securityService = new AccountSecurityService(safetyRepo, userRepo);
const moderationService = new ContentModerationService(safetyRepo, userRepo);
const physicalSafetyService = new PhysicalSafetyService(safetyRepo, userRepo);
const privacyService = new DataPrivacyService(safetyRepo, userRepo, profileRepo);
const vulnerableProtectionService = new VulnerablePopulationProtectionService(safetyRepo, userRepo);

// ============================================
// Identity Verification Routes
// ============================================

/**
 * GET /api/safety/verification/status
 * Get user's verification status
 */
router.get('/verification/status', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const status = await identityService.getUserVerificationStatus(req.user!.userId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    logger.error('Get verification status error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/verification/submit
 * Submit verification request
 */
router.post('/verification/submit', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { type, documents, socialProvider, socialToken } = req.body;

    const verification = await identityService.submitVerification({
      userId: req.user!.userId,
      type,
      documents,
      socialProvider,
      socialToken,
    });

    res.json({ success: true, data: verification });
  } catch (error: any) {
    logger.error('Submit verification error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/verification/analyze-photo
 * Analyze a photo for authenticity
 */
router.post('/verification/analyze-photo', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { photoData } = req.body;
    const analysis = await identityService.analyzePhoto(photoData);
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    logger.error('Photo analysis error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ============================================
// Account Security Routes
// ============================================

/**
 * GET /api/safety/security/settings
 * Get security settings
 */
router.get('/security/settings', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const settings = await securityService.getSecuritySettings(req.user!.userId);
    // Remove sensitive fields
    const safeSettings = {
      ...settings,
      two_factor_secret: undefined,
      backup_codes: undefined,
    };
    res.json({ success: true, data: safeSettings });
  } catch (error: any) {
    logger.error('Get security settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/safety/security/settings
 * Update security settings
 */
router.put('/security/settings', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const settings = await securityService.updateSecuritySettings(req.user!.userId, updates);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    logger.error('Update security settings error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/security/2fa/setup
 * Setup two-factor authentication
 */
router.post('/security/2fa/setup', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { method } = req.body;
    const result = await securityService.setupTwoFactor(req.user!.userId, method);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('2FA setup error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/security/2fa/verify
 * Verify and enable 2FA
 */
router.post('/security/2fa/verify', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const result = await securityService.verifyAndEnableTwoFactor(req.user!.userId, code);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('2FA verify error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/security/2fa/disable
 * Disable 2FA
 */
router.post('/security/2fa/disable', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    const result = await securityService.disableTwoFactor(req.user!.userId, password);
    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('2FA disable error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/security/2fa/backup-codes
 * Regenerate backup codes
 */
router.post('/security/2fa/backup-codes', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const codes = await securityService.regenerateBackupCodes(req.user!.userId);
    res.json({ success: true, data: { codes } });
  } catch (error: any) {
    logger.error('Backup codes error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/safety/security/sessions
 * Get active sessions
 */
router.get('/security/sessions', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const sessions = await securityService.getUserSessions(req.user!.userId);
    res.json({ success: true, data: sessions });
  } catch (error: any) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /api/safety/security/sessions/:sessionId
 * Revoke a session
 */
router.delete('/security/sessions/:sessionId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    await securityService.revokeSession(req.user!.userId, req.params.sessionId);
    res.json({ success: true, data: { message: 'Session revoked' } });
  } catch (error: any) {
    logger.error('Revoke session error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/security/sessions/revoke-all
 * Revoke all other sessions
 */
router.post('/security/sessions/revoke-all', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { currentSessionId } = req.body;
    const count = await securityService.revokeAllOtherSessions(req.user!.userId, currentSessionId);
    res.json({ success: true, data: { revokedCount: count } });
  } catch (error: any) {
    logger.error('Revoke all sessions error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ============================================
// Content Moderation & Reporting Routes
// ============================================

/**
 * POST /api/safety/report
 * Submit a report against a user
 */
router.post('/report', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { reportedUserId, category, description, evidence, contentId, contentType } = req.body;

    const report = await moderationService.submitReport({
      reporterId: req.user!.userId,
      reportedUserId,
      category,
      description,
      evidence,
      contentId,
      contentType,
    });

    res.json({ success: true, data: report });
  } catch (error: any) {
    logger.error('Submit report error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/block
 * Block a user
 */
router.post('/block', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { blockedUserId, blockType, reason } = req.body;

    const block = await moderationService.blockUser(
      req.user!.userId,
      blockedUserId,
      blockType,
      reason
    );

    res.json({ success: true, data: block });
  } catch (error: any) {
    logger.error('Block user error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /api/safety/block/:userId
 * Unblock a user
 */
router.delete('/block/:userId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    await moderationService.unblockUser(req.user!.userId, req.params.userId);
    res.json({ success: true, data: { message: 'User unblocked' } });
  } catch (error: any) {
    logger.error('Unblock user error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/safety/blocked
 * Get blocked users list
 */
router.get('/blocked', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const blockedUsers = await moderationService.getBlockedUsers(req.user!.userId);
    res.json({ success: true, data: blockedUsers });
  } catch (error: any) {
    logger.error('Get blocked users error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/moderate/content
 * Moderate content before publishing
 */
router.post('/moderate/content', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { contentType, contentId, content } = req.body;

    const result = await moderationService.moderateContent(
      req.user!.userId,
      contentType,
      contentId,
      content
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    logger.error('Moderate content error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ============================================
// Physical Safety Routes
// ============================================

/**
 * GET /api/safety/emergency-contacts
 * Get emergency contacts
 */
router.get('/emergency-contacts', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const contacts = await physicalSafetyService.getEmergencyContacts(req.user!.userId);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    logger.error('Get emergency contacts error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/emergency-contacts
 * Add emergency contact
 */
router.post('/emergency-contacts', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const contact = await physicalSafetyService.addEmergencyContact(req.user!.userId, req.body);
    res.json({ success: true, data: contact });
  } catch (error: any) {
    logger.error('Add emergency contact error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /api/safety/emergency-contacts/:contactId
 * Remove emergency contact
 */
router.delete('/emergency-contacts/:contactId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    await physicalSafetyService.removeEmergencyContact(req.user!.userId, req.params.contactId);
    res.json({ success: true, data: { message: 'Contact removed' } });
  } catch (error: any) {
    logger.error('Remove emergency contact error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/check-in
 * Create a safety check-in
 */
router.post('/check-in', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const checkIn = await physicalSafetyService.createSafetyCheckIn({
      userId: req.user!.userId,
      ...req.body,
    });
    res.json({ success: true, data: checkIn });
  } catch (error: any) {
    logger.error('Create check-in error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/check-in/:checkInId/confirm
 * Confirm check-in (I'm safe)
 */
router.post('/check-in/:checkInId/confirm', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const checkIn = await physicalSafetyService.performCheckIn(
      req.params.checkInId,
      req.user!.userId
    );
    res.json({ success: true, data: checkIn });
  } catch (error: any) {
    logger.error('Confirm check-in error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/check-in/:checkInId/complete
 * Complete check-in (date ended safely)
 */
router.post('/check-in/:checkInId/complete', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const checkIn = await physicalSafetyService.completeSafetyCheckIn(
      req.params.checkInId,
      req.user!.userId
    );
    res.json({ success: true, data: checkIn });
  } catch (error: any) {
    logger.error('Complete check-in error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/safety/check-in/active
 * Get active check-ins
 */
router.get('/check-in/active', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const checkIns = await physicalSafetyService.getActiveCheckIns(req.user!.userId);
    res.json({ success: true, data: checkIns });
  } catch (error: any) {
    logger.error('Get active check-ins error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/sos
 * Trigger SOS alert
 */
router.post('/sos', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { location } = req.body;
    await physicalSafetyService.triggerSOSAlert(req.user!.userId, location);
    res.json({ success: true, data: { message: 'SOS alert sent to emergency contacts' } });
  } catch (error: any) {
    logger.error('SOS alert error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/location-share
 * Start sharing location
 */
router.post('/location-share', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const share = await physicalSafetyService.startLocationShare(req.user!.userId, req.body);
    res.json({ success: true, data: share });
  } catch (error: any) {
    logger.error('Start location share error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/safety/location-share/:shareId
 * Update shared location
 */
router.put('/location-share/:shareId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { location } = req.body;
    const share = await physicalSafetyService.updateSharedLocation(
      req.params.shareId,
      req.user!.userId,
      location
    );
    res.json({ success: true, data: share });
  } catch (error: any) {
    logger.error('Update location share error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * DELETE /api/safety/location-share/:shareId
 * Stop sharing location
 */
router.delete('/location-share/:shareId', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    await physicalSafetyService.stopLocationShare(req.params.shareId, req.user!.userId);
    res.json({ success: true, data: { message: 'Location sharing stopped' } });
  } catch (error: any) {
    logger.error('Stop location share error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/safety/tips
 * Get safety tips
 */
router.get('/tips', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as 'before' | 'during' | 'after' | undefined;
    const tips = physicalSafetyService.getDateSafetyTips(category);
    res.json({ success: true, data: tips });
  } catch (error: any) {
    logger.error('Get safety tips error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * GET /api/safety/resources
 * Get emergency resources
 */
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const country = (req.query.country as string) || 'US';
    const resources = physicalSafetyService.getLocalEmergencyResources(country);
    res.json({ success: true, data: resources });
  } catch (error: any) {
    logger.error('Get emergency resources error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// ============================================
// Privacy Routes
// ============================================

/**
 * GET /api/safety/privacy/settings
 * Get privacy settings
 */
router.get('/privacy/settings', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const settings = await privacyService.getPrivacySettings(req.user!.userId);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    logger.error('Get privacy settings error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * PUT /api/safety/privacy/settings
 * Update privacy settings
 */
router.put('/privacy/settings', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const settings = await privacyService.updatePrivacySettings(req.user!.userId, req.body);
    res.json({ success: true, data: settings });
  } catch (error: any) {
    logger.error('Update privacy settings error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/privacy/incognito/enable
 * Enable incognito mode
 */
router.post('/privacy/incognito/enable', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    await privacyService.enableIncognitoMode(req.user!.userId);
    res.json({ success: true, data: { message: 'Incognito mode enabled' } });
  } catch (error: any) {
    logger.error('Enable incognito error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/privacy/incognito/disable
 * Disable incognito mode
 */
router.post('/privacy/incognito/disable', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    await privacyService.disableIncognitoMode(req.user!.userId);
    res.json({ success: true, data: { message: 'Incognito mode disabled' } });
  } catch (error: any) {
    logger.error('Disable incognito error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/privacy/export
 * Request data export
 */
router.post('/privacy/export', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const format = req.body.format || 'json';
    const request = await privacyService.requestDataExport(req.user!.userId, format);
    res.json({ success: true, data: request });
  } catch (error: any) {
    logger.error('Request data export error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/privacy/delete
 * Request account deletion
 */
router.post('/privacy/delete', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { type, reason, selectiveData } = req.body;
    const request = await privacyService.requestAccountDeletion(
      req.user!.userId,
      type,
      reason,
      selectiveData
    );
    res.json({ success: true, data: request });
  } catch (error: any) {
    logger.error('Request deletion error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/privacy/consent
 * Record consent
 */
router.post('/privacy/consent', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { consentType, version, consented } = req.body;
    const record = await privacyService.recordConsent(
      req.user!.userId,
      consentType,
      version,
      consented,
      req.ip,
      req.headers['user-agent']
    );
    res.json({ success: true, data: record });
  } catch (error: any) {
    logger.error('Record consent error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

// ============================================
// Wellbeing & Crisis Resources Routes
// ============================================

/**
 * GET /api/safety/crisis/resources
 * Get crisis resources
 */
router.get('/crisis/resources', async (req: Request, res: Response) => {
  try {
    const country = (req.query.country as string) || 'US';
    const type = req.query.type as any;
    const resources = vulnerableProtectionService.getCrisisResources(country, type);
    res.json({ success: true, data: resources });
  } catch (error: any) {
    logger.error('Get crisis resources error:', error);
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/crisis/resource-clicked
 * Record that a crisis resource was clicked
 */
router.post('/crisis/resource-clicked', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { resourceId } = req.body;
    await vulnerableProtectionService.recordResourceClick(resourceId);
    res.json({ success: true, data: { message: 'Recorded' } });
  } catch (error: any) {
    logger.error('Record resource click error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

/**
 * POST /api/safety/wellbeing/analyze
 * Analyze text for wellbeing concerns (internal use)
 */
router.post('/wellbeing/analyze', AuthMiddleware.verifyToken, async (req: Request, res: Response) => {
  try {
    const { text, context } = req.body;
    const analysis = await vulnerableProtectionService.analyzeTextForWellbeing(
      req.user!.userId,
      text,
      context
    );
    res.json({ success: true, data: analysis });
  } catch (error: any) {
    logger.error('Wellbeing analysis error:', error);
    res.status(400).json({ success: false, error: { message: error.message } });
  }
});

export default router;
