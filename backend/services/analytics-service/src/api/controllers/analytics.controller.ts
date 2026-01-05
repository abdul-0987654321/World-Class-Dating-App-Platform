/**
 * Analytics Controller
 * Handles analytics queries and reporting
 */

import { createLogger } from '@flamoral/backend-shared';
import { Request, Response } from 'express';

import attributionRepository from '../../domain/repositories/attribution.repository';
import funnelRepository from '../../domain/repositories/funnel.repository';
import trackingEventRepository from '../../domain/repositories/tracking-event.repository';

const logger = createLogger('analytics-controller');

/**
 * Get funnel conversion rates
 * GET /api/analytics/funnel/conversion-rates
 */
export async function getFunnelConversionRates(req: Request, res: Response) {
  try {
    const { utmSource, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const conversionRates = await funnelRepository.getConversionRates(
      utmSource as string,
      start,
      end
    );

    res.status(200).json({
      success: true,
      data: conversionRates,
    });
  } catch (error: any) {
    logger.error('Get funnel conversion rates error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get conversion rates',
    });
  }
}

/**
 * Get attribution summary
 * GET /api/analytics/attribution/summary
 */
export async function getAttributionSummary(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const attributionSummary = await attributionRepository.getAttributionSummary(start, end);

    res.status(200).json({
      success: true,
      data: attributionSummary,
    });
  } catch (error: any) {
    logger.error('Get attribution summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get attribution summary',
    });
  }
}

/**
 * Get events grouped by source
 * GET /api/analytics/events/by-source
 */
export async function getEventsBySource(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const eventsBySource = await trackingEventRepository.getEventsBySource(start, end);

    res.status(200).json({
      success: true,
      data: eventsBySource,
    });
  } catch (error: any) {
    logger.error('Get events by source error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get events by source',
    });
  }
}

/**
 * Get drop-off analysis
 * GET /api/analytics/funnel/dropoff
 */
export async function getDropoffAnalysis(req: Request, res: Response) {
  try {
    const { utmSource } = req.query;

    const dropoffAnalysis = await funnelRepository.getDropoffAnalysis(utmSource as string);

    res.status(200).json({
      success: true,
      data: dropoffAnalysis,
    });
  } catch (error: any) {
    logger.error('Get drop-off analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get drop-off analysis',
    });
  }
}

/**
 * Get average timings for funnel steps
 * GET /api/analytics/funnel/timings
 */
export async function getAverageTimings(req: Request, res: Response) {
  try {
    const { utmSource } = req.query;

    const timings = await funnelRepository.getAverageTimings(utmSource as string);

    res.status(200).json({
      success: true,
      data: timings,
    });
  } catch (error: any) {
    logger.error('Get average timings error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get average timings',
    });
  }
}
