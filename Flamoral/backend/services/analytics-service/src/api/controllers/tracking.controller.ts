/**
 * Tracking Controller
 * Handles event tracking, attribution, session, and funnel tracking
 */

import { Request, Response } from 'express';
import trackingEventRepository from '../../domain/repositories/tracking-event.repository';
import attributionRepository from '../../domain/repositories/attribution.repository';
import funnelRepository from '../../domain/repositories/funnel.repository';
import {
  CreateTrackingEventRequest,
  CreateAttributionRequest,
  UpdateFunnelStepRequest,
  ApiResponse,
} from '../../types';

/**
 * Track a single event
 * POST /api/tracking/event
 */
export async function trackEvent(req: Request, res: Response) {
  try {
    const eventData: CreateTrackingEventRequest = req.body;

    // Validate required fields
    if (!eventData.eventType || !eventData.eventName) {
      return res.status(400).json({
        success: false,
        error: 'eventType and eventName are required',
      });
    }

    // Create tracking event
    const event = await trackingEventRepository.create(eventData);

    res.status(201).json({
      success: true,
      data: event,
      message: 'Event tracked successfully',
    });
  } catch (error: any) {
    console.error('Track event error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track event',
    });
  }
}

/**
 * Track multiple events in batch
 * POST /api/tracking/events
 */
export async function trackEventBatch(req: Request, res: Response) {
  try {
    const { events } = req.body;

    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'events array is required',
      });
    }

    // Validate all events
    for (const event of events) {
      if (!event.eventType || !event.eventName) {
        return res.status(400).json({
          success: false,
          error: 'All events must have eventType and eventName',
        });
      }
    }

    // Create events in batch
    const count = await trackingEventRepository.createBatch(events);

    res.status(201).json({
      success: true,
      data: { count },
      message: `${count} events tracked successfully`,
    });
  } catch (error: any) {
    console.error('Track events batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track events',
    });
  }
}

/**
 * Create or update user attribution
 * POST /api/tracking/attribution
 */
export async function createOrUpdateAttribution(req: Request, res: Response) {
  try {
    const data: CreateAttributionRequest = req.body;

    // Validate required fields
    if (!data.userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    // Create or update attribution
    const attribution = await attributionRepository.upsert(data);

    res.status(201).json({
      success: true,
      data: attribution,
      message: 'Attribution tracked successfully',
    });
  } catch (error: any) {
    console.error('Attribution tracking error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to track attribution',
    });
  }
}

/**
 * Mark user registration in attribution
 * POST /api/tracking/attribution/registration
 */
export async function markRegistration(req: Request, res: Response) {
  try {
    const { userId, source, campaign } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required',
      });
    }

    const attribution = await attributionRepository.markRegistration(
      userId,
      source,
      campaign
    );

    res.status(200).json({
      success: true,
      data: attribution,
      message: 'Registration marked in attribution',
    });
  } catch (error: any) {
    console.error('Mark registration error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark registration',
    });
  }
}

/**
 * Create a new session
 * POST /api/tracking/session
 */
export async function createSession(req: Request, res: Response) {
  try {
    const { sessionId, userId, utmSource, utmCampaign } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required',
      });
    }

    // Create funnel entry with landing page view
    const funnel = await funnelRepository.create(
      sessionId,
      userId,
      utmSource,
      utmCampaign
    );

    res.status(201).json({
      success: true,
      data: funnel,
      message: 'Session created successfully',
    });
  } catch (error: any) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create session',
    });
  }
}

/**
 * Update session
 * PUT /api/tracking/session/:sessionId
 */
export async function updateSession(req: Request, res: Response) {
  try {
    const { sessionId } = req.params;
    // Session updates would go here (extend funnel or session table)

    res.status(200).json({
      success: true,
      message: 'Session updated successfully',
    });
  } catch (error: any) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update session',
    });
  }
}

/**
 * Update funnel step
 * POST /api/tracking/funnel/step
 */
export async function updateFunnelStep(req: Request, res: Response) {
  try {
    const data: UpdateFunnelStepRequest = req.body;

    // Validate required fields
    if (!data.sessionId || !data.step) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and step are required',
      });
    }

    // Update funnel step
    const funnel = await funnelRepository.updateStep(data);

    res.status(200).json({
      success: true,
      data: funnel,
      message: `Funnel step ${data.step} updated successfully`,
    });
  } catch (error: any) {
    console.error('Update funnel step error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update funnel step',
    });
  }
}
