/**
 * Date Safety Guardian Controller
 * Handles all safety-related HTTP requests for the "Guardian Angel" feature
 *
 * Features:
 * - Trusted contact management
 * - Date session management
 * - Check-in system
 * - Panic alert functionality
 */

import { Request, Response } from 'express';

import { dateSafetyGuardianService, VenueInfo } from '../../services/date-safety-guardian.service';
import logger from '../../utils/logger';
import {
  CreateTrustedContactDto,
  CreateDateSessionDto,
  CheckInDto,
  PanicAlertDto,
  EndDateSessionDto,
  VerifyContactDto,
  validateCreateTrustedContactDto,
  validateCreateDateSessionDto,
  validateCheckInDto,
  validatePanicAlertDto,
  validateEndDateSessionDto,
  validateVerifyContactDto,
  SafetyApiResponse,
  TrustedContactResponse,
  DateSessionResponse,
} from '../dto/safety.dto';

const controllerLogger = logger.child({ controller: 'safety' });

export class SafetyController {
  // ============================================
  // TRUSTED CONTACTS
  // ============================================

  /**
   * POST /api/v1/safety/trusted-contacts
   * Add a new trusted contact
   */
  async addTrustedContact(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const dto: CreateTrustedContactDto = req.body;

      // Validate input
      const validation = validateCreateTrustedContactDto(dto);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        } as SafetyApiResponse);
        return;
      }

      // Check if feature is enabled for user
      if (!dateSafetyGuardianService.isEnabled(userId)) {
        res.status(403).json({
          success: false,
          error: 'Date Safety Guardian feature is not available for your account yet',
        } as SafetyApiResponse);
        return;
      }

      const contact = await dateSafetyGuardianService.addTrustedContact(userId, {
        name: dto.name.trim(),
        phone: dto.phone.replace(/[\s\-\(\)]/g, ''),
        email: dto.email?.trim(),
        relationship: dto.relationship,
        priority: dto.priority || 1,
      });

      const response: TrustedContactResponse = {
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        relationship: contact.relationship,
        priority: contact.priority,
        isVerified: contact.isVerified,
        verifiedAt: contact.verifiedAt?.toISOString(),
        createdAt: contact.createdAt.toISOString(),
      };

      controllerLogger.info('Trusted contact added', { userId, contactId: contact.id });

      res.status(201).json({
        success: true,
        data: response,
      } as SafetyApiResponse<TrustedContactResponse>);
    } catch (error: any) {
      controllerLogger.error('Error adding trusted contact', { error: error.message });

      if (error.message.includes('Maximum trusted contacts limit')) {
        res.status(400).json({
          success: false,
          error: error.message,
        } as SafetyApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * GET /api/v1/safety/trusted-contacts
   * Get all trusted contacts for the authenticated user
   */
  async getTrustedContacts(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // Check if feature is enabled for user
      if (!dateSafetyGuardianService.isEnabled(userId)) {
        res.status(403).json({
          success: false,
          error: 'Date Safety Guardian feature is not available for your account yet',
        } as SafetyApiResponse);
        return;
      }

      const contacts = dateSafetyGuardianService.getTrustedContacts(userId);

      const response: TrustedContactResponse[] = contacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        phone: contact.phone,
        email: contact.email,
        relationship: contact.relationship,
        priority: contact.priority,
        isVerified: contact.isVerified,
        verifiedAt: contact.verifiedAt?.toISOString(),
        createdAt: contact.createdAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: response,
      } as SafetyApiResponse<TrustedContactResponse[]>);
    } catch (error: any) {
      controllerLogger.error('Error getting trusted contacts', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * DELETE /api/v1/safety/trusted-contacts/:id
   * Remove a trusted contact
   */
  async removeTrustedContact(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const contactId = req.params.id;

      if (!contactId) {
        res.status(400).json({
          success: false,
          error: 'Contact ID is required',
        } as SafetyApiResponse);
        return;
      }

      const removed = dateSafetyGuardianService.removeTrustedContact(userId, contactId);

      if (!removed) {
        res.status(404).json({
          success: false,
          error: 'Trusted contact not found',
        } as SafetyApiResponse);
        return;
      }

      controllerLogger.info('Trusted contact removed', { userId, contactId });

      res.status(200).json({
        success: true,
        data: { message: 'Trusted contact removed successfully' },
      } as SafetyApiResponse);
    } catch (error: any) {
      controllerLogger.error('Error removing trusted contact', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * POST /api/v1/safety/trusted-contacts/:id/verify
   * Verify a trusted contact with verification code
   */
  async verifyTrustedContact(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const contactId = req.params.id;
      const dto: VerifyContactDto = req.body;

      if (!contactId) {
        res.status(400).json({
          success: false,
          error: 'Contact ID is required',
        } as SafetyApiResponse);
        return;
      }

      // Validate input
      const validation = validateVerifyContactDto(dto);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        } as SafetyApiResponse);
        return;
      }

      const verified = dateSafetyGuardianService.verifyContact(
        userId,
        contactId,
        dto.verificationCode
      );

      if (!verified) {
        res.status(400).json({
          success: false,
          error: 'Invalid verification code or contact not found',
        } as SafetyApiResponse);
        return;
      }

      controllerLogger.info('Trusted contact verified', { userId, contactId });

      res.status(200).json({
        success: true,
        data: { message: 'Contact verified successfully' },
      } as SafetyApiResponse);
    } catch (error: any) {
      controllerLogger.error('Error verifying trusted contact', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  // ============================================
  // DATE SESSIONS
  // ============================================

  /**
   * POST /api/v1/safety/date-sessions
   * Create a new date session
   */
  async createDateSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const dto: CreateDateSessionDto = req.body;

      // Validate input
      const validation = validateCreateDateSessionDto(dto);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        } as SafetyApiResponse);
        return;
      }

      // Check if feature is enabled for user
      if (!dateSafetyGuardianService.isEnabled(userId)) {
        res.status(403).json({
          success: false,
          error: 'Date Safety Guardian feature is not available for your account yet',
        } as SafetyApiResponse);
        return;
      }

      // Check for verified trusted contacts
      const contacts = dateSafetyGuardianService.getTrustedContacts(userId);
      const verifiedContacts = contacts.filter(c => c.isVerified);
      if (verifiedContacts.length === 0) {
        res.status(400).json({
          success: false,
          error: 'You must have at least one verified trusted contact before creating a date session',
        } as SafetyApiResponse);
        return;
      }

      const venue: VenueInfo | undefined = dto.venue ? {
        name: dto.venue.name.trim(),
        address: dto.venue.address.trim(),
        coordinates: dto.venue.coordinates,
        type: dto.venue.type,
      } : undefined;

      const session = dateSafetyGuardianService.createDateSession(
        userId,
        dto.matchId,
        dto.matchName.trim(),
        new Date(dto.scheduledAt),
        venue,
        dto.checkInIntervalMinutes
      );

      const response: DateSessionResponse = {
        id: session.id,
        matchId: session.matchId,
        matchName: session.matchName,
        status: session.status,
        venue: session.venue,
        scheduledAt: session.scheduledAt.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        checkInIntervalMinutes: session.checkInIntervalMinutes,
        lastCheckInAt: session.lastCheckInAt?.toISOString(),
        missedCheckIns: session.missedCheckIns,
        safetyRating: session.safetyRating,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };

      controllerLogger.info('Date session created', { userId, sessionId: session.id });

      res.status(201).json({
        success: true,
        data: response,
      } as SafetyApiResponse<DateSessionResponse>);
    } catch (error: any) {
      controllerLogger.error('Error creating date session', { error: error.message });

      if (error.message.includes('active date session already exists')) {
        res.status(400).json({
          success: false,
          error: error.message,
        } as SafetyApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * POST /api/v1/safety/date-sessions/:id/start
   * Start a date session
   */
  async startDateSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        } as SafetyApiResponse);
        return;
      }

      // Verify the session belongs to this user
      const activeSession = dateSafetyGuardianService.getActiveSession(userId);
      if (!activeSession || activeSession.id !== sessionId) {
        res.status(404).json({
          success: false,
          error: 'Session not found or does not belong to this user',
        } as SafetyApiResponse);
        return;
      }

      const session = await dateSafetyGuardianService.startDateSession(sessionId);

      const response: DateSessionResponse = {
        id: session.id,
        matchId: session.matchId,
        matchName: session.matchName,
        status: session.status,
        venue: session.venue,
        scheduledAt: session.scheduledAt.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        checkInIntervalMinutes: session.checkInIntervalMinutes,
        lastCheckInAt: session.lastCheckInAt?.toISOString(),
        missedCheckIns: session.missedCheckIns,
        safetyRating: session.safetyRating,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };

      controllerLogger.info('Date session started', { userId, sessionId });

      res.status(200).json({
        success: true,
        data: response,
      } as SafetyApiResponse<DateSessionResponse>);
    } catch (error: any) {
      controllerLogger.error('Error starting date session', { error: error.message });

      if (error.message === 'Session not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        } as SafetyApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * POST /api/v1/safety/date-sessions/:id/check-in
   * Perform a check-in during a date
   */
  async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;
      const dto: CheckInDto = req.body;

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        } as SafetyApiResponse);
        return;
      }

      // Validate input
      const validation = validateCheckInDto(dto);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        } as SafetyApiResponse);
        return;
      }

      // Verify the session belongs to this user
      const activeSession = dateSafetyGuardianService.getActiveSession(userId);
      if (!activeSession || activeSession.id !== sessionId) {
        res.status(404).json({
          success: false,
          error: 'Session not found or does not belong to this user',
        } as SafetyApiResponse);
        return;
      }

      const result = await dateSafetyGuardianService.checkIn(
        sessionId,
        dto.safetyRating,
        dto.notes
      );

      controllerLogger.info('Check-in completed', { userId, sessionId });

      res.status(200).json({
        success: true,
        data: {
          message: result.message,
          nextCheckInAt: result.nextCheckInAt.toISOString(),
        },
      } as SafetyApiResponse);
    } catch (error: any) {
      controllerLogger.error('Error during check-in', { error: error.message });

      if (error.message === 'Session not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        } as SafetyApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * POST /api/v1/safety/date-sessions/:id/end
   * End a date session safely
   */
  async endDateSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;
      const dto: EndDateSessionDto = req.body || {};

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        } as SafetyApiResponse);
        return;
      }

      // Validate input
      const validation = validateEndDateSessionDto(dto);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          errors: validation.errors,
        } as SafetyApiResponse);
        return;
      }

      // Verify the session belongs to this user
      const activeSession = dateSafetyGuardianService.getActiveSession(userId);
      if (!activeSession || activeSession.id !== sessionId) {
        res.status(404).json({
          success: false,
          error: 'Session not found or does not belong to this user',
        } as SafetyApiResponse);
        return;
      }

      const session = await dateSafetyGuardianService.endDateSession(sessionId, dto.safetyRating);

      const response: DateSessionResponse = {
        id: session.id,
        matchId: session.matchId,
        matchName: session.matchName,
        status: session.status,
        venue: session.venue,
        scheduledAt: session.scheduledAt.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        checkInIntervalMinutes: session.checkInIntervalMinutes,
        lastCheckInAt: session.lastCheckInAt?.toISOString(),
        missedCheckIns: session.missedCheckIns,
        safetyRating: session.safetyRating,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };

      controllerLogger.info('Date session ended safely', { userId, sessionId });

      res.status(200).json({
        success: true,
        data: response,
      } as SafetyApiResponse<DateSessionResponse>);
    } catch (error: any) {
      controllerLogger.error('Error ending date session', { error: error.message });

      if (error.message === 'Session not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        } as SafetyApiResponse);
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * POST /api/v1/safety/date-sessions/:id/panic
   * Trigger a panic alert (CRITICAL ENDPOINT)
   */
  async triggerPanicAlert(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;
      const dto: PanicAlertDto = req.body || {};

      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: 'Session ID is required',
        } as SafetyApiResponse);
        return;
      }

      // Validate input (but be lenient - this is an emergency endpoint)
      const validation = validatePanicAlertDto(dto);
      if (!validation.valid) {
        // Log validation errors but don't block the panic alert
        controllerLogger.warn('Panic alert with validation issues', {
          userId,
          sessionId,
          errors: validation.errors,
        });
      }

      // Verify the session belongs to this user
      const activeSession = dateSafetyGuardianService.getActiveSession(userId);
      if (!activeSession || activeSession.id !== sessionId) {
        // Even if session not found, try to alert based on user's contacts
        controllerLogger.error('PANIC: Session not found but attempting alert', { userId, sessionId });

        res.status(404).json({
          success: false,
          error: 'Session not found - please contact emergency services directly',
        } as SafetyApiResponse);
        return;
      }

      const result = await dateSafetyGuardianService.triggerPanicAlert(
        sessionId,
        dto.currentLocation
      );

      // Log panic event with high severity
      controllerLogger.error('PANIC ALERT TRIGGERED', {
        userId,
        sessionId,
        alertsSent: result.alertsSent,
        location: dto.currentLocation,
      });

      res.status(200).json({
        success: true,
        data: {
          message: result.message,
          alertsSent: result.alertsSent,
          emergencyServicesNotified: result.emergencyServicesNotified,
        },
      } as SafetyApiResponse);
    } catch (error: any) {
      controllerLogger.error('CRITICAL: Error triggering panic alert', { error: error.message });

      // Even on error, respond quickly - this is an emergency
      res.status(500).json({
        success: false,
        error: 'Error sending alerts - please contact emergency services directly (911)',
      } as SafetyApiResponse);
    }
  }

  /**
   * GET /api/v1/safety/date-sessions/active
   * Get the active date session for the authenticated user
   */
  async getActiveSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      // Check if feature is enabled for user
      if (!dateSafetyGuardianService.isEnabled(userId)) {
        res.status(403).json({
          success: false,
          error: 'Date Safety Guardian feature is not available for your account yet',
        } as SafetyApiResponse);
        return;
      }

      const session = dateSafetyGuardianService.getActiveSession(userId);

      if (!session) {
        res.status(200).json({
          success: true,
          data: null,
        } as SafetyApiResponse);
        return;
      }

      const response: DateSessionResponse = {
        id: session.id,
        matchId: session.matchId,
        matchName: session.matchName,
        status: session.status,
        venue: session.venue,
        scheduledAt: session.scheduledAt.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        checkInIntervalMinutes: session.checkInIntervalMinutes,
        lastCheckInAt: session.lastCheckInAt?.toISOString(),
        missedCheckIns: session.missedCheckIns,
        safetyRating: session.safetyRating,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      };

      res.status(200).json({
        success: true,
        data: response,
      } as SafetyApiResponse<DateSessionResponse>);
    } catch (error: any) {
      controllerLogger.error('Error getting active session', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * GET /api/v1/safety/date-sessions/history
   * Get date session history for the authenticated user
   */
  async getSessionHistory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      // Check if feature is enabled for user
      if (!dateSafetyGuardianService.isEnabled(userId)) {
        res.status(403).json({
          success: false,
          error: 'Date Safety Guardian feature is not available for your account yet',
        } as SafetyApiResponse);
        return;
      }

      const sessions = dateSafetyGuardianService.getSessionHistory(userId, limit);

      const response: DateSessionResponse[] = sessions.map(session => ({
        id: session.id,
        matchId: session.matchId,
        matchName: session.matchName,
        status: session.status,
        venue: session.venue,
        scheduledAt: session.scheduledAt.toISOString(),
        startedAt: session.startedAt?.toISOString(),
        endedAt: session.endedAt?.toISOString(),
        checkInIntervalMinutes: session.checkInIntervalMinutes,
        lastCheckInAt: session.lastCheckInAt?.toISOString(),
        missedCheckIns: session.missedCheckIns,
        safetyRating: session.safetyRating,
        notes: session.notes,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: response,
      } as SafetyApiResponse<DateSessionResponse[]>);
    } catch (error: any) {
      controllerLogger.error('Error getting session history', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }

  /**
   * GET /api/v1/safety/status
   * Get safety feature status for the authenticated user
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user.id;

      const isEnabled = dateSafetyGuardianService.isEnabled(userId);
      const contacts = isEnabled ? dateSafetyGuardianService.getTrustedContacts(userId) : [];
      const activeSession = isEnabled ? dateSafetyGuardianService.getActiveSession(userId) : null;

      res.status(200).json({
        success: true,
        data: {
          featureEnabled: isEnabled,
          trustedContactsCount: contacts.length,
          verifiedContactsCount: contacts.filter(c => c.isVerified).length,
          hasActiveSession: activeSession !== null,
          activeSessionId: activeSession?.id,
          activeSessionStatus: activeSession?.status,
        },
      } as SafetyApiResponse);
    } catch (error: any) {
      controllerLogger.error('Error getting safety status', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
      } as SafetyApiResponse);
    }
  }
}

export const safetyController = new SafetyController();
