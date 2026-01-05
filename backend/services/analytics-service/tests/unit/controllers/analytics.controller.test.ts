/**
 * Unit tests for Analytics Controller
 * Tests funnel conversion rates, attribution, and events by source
 */

import { Request, Response } from 'express';
import * as analyticsController from '../../../src/api/controllers/analytics.controller';
import funnelRepository from '../../../src/domain/repositories/funnel.repository';
import attributionRepository from '../../../src/domain/repositories/attribution.repository';
import trackingEventRepository from '../../../src/domain/repositories/tracking-event.repository';

jest.mock('../../../src/domain/repositories/funnel.repository');
jest.mock('../../../src/domain/repositories/attribution.repository');
jest.mock('../../../src/domain/repositories/tracking-event.repository');

describe('AnalyticsController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    statusMock = jest.fn().mockReturnThis();
    jsonMock = jest.fn().mockReturnThis();

    mockRequest = {
      params: {},
      query: {},
      body: {},
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('getFunnelConversionRates', () => {
    it('should return funnel conversion rates successfully', async () => {
      const mockConversionRates = [
        {
          utmSource: 'google',
          totalSessions: 1000,
          landingViews: 950,
          registrationsStarted: 500,
          registrationsCompleted: 300,
          emailsVerified: 250,
          profilesCompleted: 200,
          firstMatches: 150,
          subscriptions: 50,
          registrationRate: 31.58,
          profileCompletionRate: 66.67,
          subscriptionRate: 16.67,
        },
        {
          utmSource: 'facebook',
          totalSessions: 800,
          landingViews: 780,
          registrationsStarted: 400,
          registrationsCompleted: 240,
          emailsVerified: 200,
          profilesCompleted: 160,
          firstMatches: 120,
          subscriptions: 40,
          registrationRate: 30.77,
          profileCompletionRate: 66.67,
          subscriptionRate: 16.67,
        },
      ];

      mockRequest.query = {
        utmSource: 'google',
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (funnelRepository.getConversionRates as jest.Mock).mockResolvedValue(mockConversionRates);

      await analyticsController.getFunnelConversionRates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(funnelRepository.getConversionRates).toHaveBeenCalledWith(
        'google',
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockConversionRates,
      });
    });

    it('should work without query parameters', async () => {
      mockRequest.query = {};
      (funnelRepository.getConversionRates as jest.Mock).mockResolvedValue([]);

      await analyticsController.getFunnelConversionRates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(funnelRepository.getConversionRates).toHaveBeenCalledWith(
        undefined,
        undefined,
        undefined
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (funnelRepository.getConversionRates as jest.Mock).mockRejectedValue(
        new Error('Database connection error')
      );

      await analyticsController.getFunnelConversionRates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Database connection error',
      });
    });

    it('should handle error with default message', async () => {
      mockRequest.query = {};
      (funnelRepository.getConversionRates as jest.Mock).mockRejectedValue({});

      await analyticsController.getFunnelConversionRates(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get conversion rates',
      });
    });
  });

  describe('getAttributionSummary', () => {
    it('should return attribution summary successfully', async () => {
      const mockAttributionSummary = [
        {
          firstTouchSource: 'google',
          lastTouchSource: 'direct',
          totalUsers: 500,
          registeredUsers: 300,
          avgTouchpoints: 2.5,
          conversionRate: 60,
        },
        {
          firstTouchSource: 'facebook',
          lastTouchSource: 'email',
          totalUsers: 400,
          registeredUsers: 200,
          avgTouchpoints: 3.2,
          conversionRate: 50,
        },
      ];

      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (attributionRepository.getAttributionSummary as jest.Mock).mockResolvedValue(
        mockAttributionSummary
      );

      await analyticsController.getAttributionSummary(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(attributionRepository.getAttributionSummary).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockAttributionSummary,
      });
    });

    it('should work without date parameters', async () => {
      mockRequest.query = {};
      (attributionRepository.getAttributionSummary as jest.Mock).mockResolvedValue([]);

      await analyticsController.getAttributionSummary(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(attributionRepository.getAttributionSummary).toHaveBeenCalledWith(
        undefined,
        undefined
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (attributionRepository.getAttributionSummary as jest.Mock).mockRejectedValue(
        new Error('Query failed')
      );

      await analyticsController.getAttributionSummary(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Query failed',
      });
    });
  });

  describe('getEventsBySource', () => {
    it('should return events grouped by source successfully', async () => {
      const mockEventsBySource = [
        {
          source: 'google',
          eventCount: 5000,
          uniqueUsers: 1000,
        },
        {
          source: 'facebook',
          eventCount: 4000,
          uniqueUsers: 800,
        },
        {
          source: 'direct',
          eventCount: 3000,
          uniqueUsers: 600,
        },
      ];

      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      (trackingEventRepository.getEventsBySource as jest.Mock).mockResolvedValue(mockEventsBySource);

      await analyticsController.getEventsBySource(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(trackingEventRepository.getEventsBySource).toHaveBeenCalledWith(
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEventsBySource,
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (trackingEventRepository.getEventsBySource as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      await analyticsController.getEventsBySource(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Database error',
      });
    });
  });

  describe('getDropoffAnalysis', () => {
    it('should return dropoff analysis successfully', async () => {
      const mockDropoffAnalysis = [
        { step: 'registration_started', count: 200, percentage: 20 },
        { step: 'email_entered', count: 150, percentage: 15 },
        { step: 'password_created', count: 100, percentage: 10 },
        { step: 'profile_started', count: 80, percentage: 8 },
        { step: 'photo_uploaded', count: 50, percentage: 5 },
      ];

      mockRequest.query = { utmSource: 'google' };
      (funnelRepository.getDropoffAnalysis as jest.Mock).mockResolvedValue(mockDropoffAnalysis);

      await analyticsController.getDropoffAnalysis(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(funnelRepository.getDropoffAnalysis).toHaveBeenCalledWith('google');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockDropoffAnalysis,
      });
    });

    it('should work without utmSource parameter', async () => {
      mockRequest.query = {};
      (funnelRepository.getDropoffAnalysis as jest.Mock).mockResolvedValue([]);

      await analyticsController.getDropoffAnalysis(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(funnelRepository.getDropoffAnalysis).toHaveBeenCalledWith(undefined);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (funnelRepository.getDropoffAnalysis as jest.Mock).mockRejectedValue(
        new Error('Analysis failed')
      );

      await analyticsController.getDropoffAnalysis(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Analysis failed',
      });
    });
  });

  describe('getAverageTimings', () => {
    it('should return average timings successfully', async () => {
      const mockTimings = {
        avgTimeToRegister: 120, // 2 minutes
        avgTimeToVerify: 300, // 5 minutes
        avgTimeToProfile: 600, // 10 minutes
        avgTimeToMatch: 86400, // 1 day
        avgTimeToSubscribe: 172800, // 2 days
      };

      mockRequest.query = { utmSource: 'google' };
      (funnelRepository.getAverageTimings as jest.Mock).mockResolvedValue(mockTimings);

      await analyticsController.getAverageTimings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(funnelRepository.getAverageTimings).toHaveBeenCalledWith('google');
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockTimings,
      });
    });

    it('should work without utmSource parameter', async () => {
      mockRequest.query = {};
      (funnelRepository.getAverageTimings as jest.Mock).mockResolvedValue({
        avgTimeToRegister: 0,
        avgTimeToVerify: 0,
        avgTimeToProfile: 0,
        avgTimeToMatch: 0,
        avgTimeToSubscribe: 0,
      });

      await analyticsController.getAverageTimings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(funnelRepository.getAverageTimings).toHaveBeenCalledWith(undefined);
      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should handle errors gracefully', async () => {
      mockRequest.query = {};
      (funnelRepository.getAverageTimings as jest.Mock).mockRejectedValue(
        new Error('Timing calculation failed')
      );

      await analyticsController.getAverageTimings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Timing calculation failed',
      });
    });

    it('should handle error with default message', async () => {
      mockRequest.query = {};
      (funnelRepository.getAverageTimings as jest.Mock).mockRejectedValue({});

      await analyticsController.getAverageTimings(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to get average timings',
      });
    });
  });
});
