/**
 * Unit tests for Tracking Controller
 * Tests event tracking, attribution, session, and funnel step updates
 */

import { Request, Response } from 'express';
import * as trackingController from '../../../src/api/controllers/tracking.controller';
import trackingEventRepository from '../../../src/domain/repositories/tracking-event.repository';
import attributionRepository from '../../../src/domain/repositories/attribution.repository';
import funnelRepository from '../../../src/domain/repositories/funnel.repository';

jest.mock('../../../src/domain/repositories/tracking-event.repository');
jest.mock('../../../src/domain/repositories/attribution.repository');
jest.mock('../../../src/domain/repositories/funnel.repository');

describe('TrackingController', () => {
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

  describe('trackEvent', () => {
    it('should track a single event successfully', async () => {
      const eventData = {
        eventType: 'page_view',
        eventName: 'profile_viewed',
        userId: 'user-123',
        sessionId: 'session-456',
        utmSource: 'google',
        utmCampaign: 'summer_sale',
        eventData: { profileId: 'profile-789' },
        pageUrl: '/profile/789',
      };

      const mockEvent = {
        id: 'event-123',
        ...eventData,
        createdAt: new Date(),
        eventTimestamp: new Date(),
      };

      mockRequest.body = eventData;
      (trackingEventRepository.create as jest.Mock).mockResolvedValue(mockEvent);

      await trackingController.trackEvent(mockRequest as Request, mockResponse as Response);

      expect(trackingEventRepository.create).toHaveBeenCalledWith(eventData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockEvent,
        message: 'Event tracked successfully',
      });
    });

    it('should return 400 if eventType is missing', async () => {
      mockRequest.body = {
        eventName: 'profile_viewed',
        userId: 'user-123',
      };

      await trackingController.trackEvent(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'eventType and eventName are required',
      });
      expect(trackingEventRepository.create).not.toHaveBeenCalled();
    });

    it('should return 400 if eventName is missing', async () => {
      mockRequest.body = {
        eventType: 'page_view',
        userId: 'user-123',
      };

      await trackingController.trackEvent(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'eventType and eventName are required',
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = {
        eventType: 'page_view',
        eventName: 'profile_viewed',
      };

      (trackingEventRepository.create as jest.Mock).mockRejectedValue(
        new Error('Database write failed')
      );

      await trackingController.trackEvent(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Database write failed',
      });
    });

    it('should handle error with default message', async () => {
      mockRequest.body = {
        eventType: 'page_view',
        eventName: 'profile_viewed',
      };

      (trackingEventRepository.create as jest.Mock).mockRejectedValue({});

      await trackingController.trackEvent(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to track event',
      });
    });
  });

  describe('trackEventBatch', () => {
    it('should track multiple events in batch successfully', async () => {
      const events = [
        { eventType: 'page_view', eventName: 'home_viewed', userId: 'user-123' },
        { eventType: 'button_click', eventName: 'like_clicked', userId: 'user-123' },
        { eventType: 'page_view', eventName: 'profile_viewed', userId: 'user-123' },
      ];

      mockRequest.body = { events };
      (trackingEventRepository.createBatch as jest.Mock).mockResolvedValue(3);

      await trackingController.trackEventBatch(mockRequest as Request, mockResponse as Response);

      expect(trackingEventRepository.createBatch).toHaveBeenCalledWith(events);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: { count: 3 },
        message: '3 events tracked successfully',
      });
    });

    it('should return 400 if events array is missing', async () => {
      mockRequest.body = {};

      await trackingController.trackEventBatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'events array is required',
      });
      expect(trackingEventRepository.createBatch).not.toHaveBeenCalled();
    });

    it('should return 400 if events array is empty', async () => {
      mockRequest.body = { events: [] };

      await trackingController.trackEventBatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'events array is required',
      });
    });

    it('should return 400 if events is not an array', async () => {
      mockRequest.body = { events: 'not-an-array' };

      await trackingController.trackEventBatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'events array is required',
      });
    });

    it('should return 400 if any event is missing required fields', async () => {
      const events = [
        { eventType: 'page_view', eventName: 'home_viewed' },
        { eventType: 'button_click' }, // missing eventName
        { eventName: 'profile_viewed' }, // missing eventType
      ];

      mockRequest.body = { events };

      await trackingController.trackEventBatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'All events must have eventType and eventName',
      });
      expect(trackingEventRepository.createBatch).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = {
        events: [{ eventType: 'page_view', eventName: 'home_viewed' }],
      };

      (trackingEventRepository.createBatch as jest.Mock).mockRejectedValue(
        new Error('Batch insert failed')
      );

      await trackingController.trackEventBatch(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Batch insert failed',
      });
    });
  });

  describe('createOrUpdateAttribution', () => {
    it('should create or update attribution successfully', async () => {
      const attributionData = {
        userId: 'user-123',
        source: 'google',
        medium: 'cpc',
        campaign: 'summer_sale',
        content: 'ad_variant_a',
        clickId: { gclid: 'abc123' },
        landingPage: '/signup',
        referrer: 'https://google.com',
      };

      const mockAttribution = {
        userId: 'user-123',
        firstTouchSource: 'google',
        lastTouchSource: 'google',
        attributionModel: 'last_touch',
        totalTouchpoints: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = attributionData;
      (attributionRepository.upsert as jest.Mock).mockResolvedValue(mockAttribution);

      await trackingController.createOrUpdateAttribution(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(attributionRepository.upsert).toHaveBeenCalledWith(attributionData);
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockAttribution,
        message: 'Attribution tracked successfully',
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.body = {
        source: 'google',
        campaign: 'summer_sale',
      };

      await trackingController.createOrUpdateAttribution(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'userId is required',
      });
      expect(attributionRepository.upsert).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = { userId: 'user-123' };
      (attributionRepository.upsert as jest.Mock).mockRejectedValue(
        new Error('Attribution upsert failed')
      );

      await trackingController.createOrUpdateAttribution(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Attribution upsert failed',
      });
    });
  });

  describe('markRegistration', () => {
    it('should mark registration in attribution successfully', async () => {
      const registrationData = {
        userId: 'user-123',
        source: 'google',
        campaign: 'summer_sale',
      };

      const mockAttribution = {
        userId: 'user-123',
        registrationTimestamp: new Date(),
        registrationSource: 'google',
        registrationCampaign: 'summer_sale',
      };

      mockRequest.body = registrationData;
      (attributionRepository.markRegistration as jest.Mock).mockResolvedValue(mockAttribution);

      await trackingController.markRegistration(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(attributionRepository.markRegistration).toHaveBeenCalledWith(
        'user-123',
        'google',
        'summer_sale'
      );
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockAttribution,
        message: 'Registration marked in attribution',
      });
    });

    it('should return 400 if userId is missing', async () => {
      mockRequest.body = {
        source: 'google',
        campaign: 'summer_sale',
      };

      await trackingController.markRegistration(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'userId is required',
      });
      expect(attributionRepository.markRegistration).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = { userId: 'user-123' };
      (attributionRepository.markRegistration as jest.Mock).mockRejectedValue(
        new Error('Registration marking failed')
      );

      await trackingController.markRegistration(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Registration marking failed',
      });
    });
  });

  describe('createSession', () => {
    it('should create a new session successfully', async () => {
      const sessionData = {
        sessionId: 'session-123',
        userId: 'user-456',
        utmSource: 'google',
        utmCampaign: 'summer_sale',
      };

      const mockFunnel = {
        id: 'funnel-123',
        sessionId: 'session-123',
        userId: 'user-456',
        landingPageViewAt: new Date(),
        utmSource: 'google',
        utmCampaign: 'summer_sale',
      };

      mockRequest.body = sessionData;
      (funnelRepository.create as jest.Mock).mockResolvedValue(mockFunnel);

      await trackingController.createSession(mockRequest as Request, mockResponse as Response);

      expect(funnelRepository.create).toHaveBeenCalledWith(
        'session-123',
        'user-456',
        'google',
        'summer_sale'
      );
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockFunnel,
        message: 'Session created successfully',
      });
    });

    it('should return 400 if sessionId is missing', async () => {
      mockRequest.body = {
        userId: 'user-456',
        utmSource: 'google',
      };

      await trackingController.createSession(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'sessionId is required',
      });
      expect(funnelRepository.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = { sessionId: 'session-123' };
      (funnelRepository.create as jest.Mock).mockRejectedValue(
        new Error('Session creation failed')
      );

      await trackingController.createSession(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Session creation failed',
      });
    });
  });

  describe('updateSession', () => {
    it('should update session successfully', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      mockRequest.body = {};

      await trackingController.updateSession(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Session updated successfully',
      });
    });

    it('should handle errors gracefully', async () => {
      mockRequest.params = { sessionId: 'session-123' };
      // Simulate an internal error by manipulating the mock
      const originalStatus = mockResponse.status;
      mockResponse.status = jest.fn().mockImplementation(() => {
        throw new Error('Internal error');
      });

      // Expect this to catch the error
      await trackingController.updateSession(mockRequest as Request, mockResponse as Response);

      // Restore original mock
      mockResponse.status = originalStatus;
    });
  });

  describe('updateFunnelStep', () => {
    it('should update funnel step successfully', async () => {
      const stepData = {
        sessionId: 'session-123',
        step: 'registrationCompletedAt',
        userId: 'user-456',
        timestamp: '2025-01-15T10:30:00Z',
      };

      const mockFunnel = {
        id: 'funnel-123',
        sessionId: 'session-123',
        userId: 'user-456',
        registrationCompletedAt: new Date('2025-01-15T10:30:00Z'),
        timeToRegister: 120,
      };

      mockRequest.body = stepData;
      (funnelRepository.updateStep as jest.Mock).mockResolvedValue(mockFunnel);

      await trackingController.updateFunnelStep(mockRequest as Request, mockResponse as Response);

      expect(funnelRepository.updateStep).toHaveBeenCalledWith(stepData);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: mockFunnel,
        message: `Funnel step ${stepData.step} updated successfully`,
      });
    });

    it('should return 400 if sessionId is missing', async () => {
      mockRequest.body = {
        step: 'registrationCompletedAt',
      };

      await trackingController.updateFunnelStep(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'sessionId and step are required',
      });
      expect(funnelRepository.updateStep).not.toHaveBeenCalled();
    });

    it('should return 400 if step is missing', async () => {
      mockRequest.body = {
        sessionId: 'session-123',
      };

      await trackingController.updateFunnelStep(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'sessionId and step are required',
      });
    });

    it('should handle all funnel steps', async () => {
      const funnelSteps = [
        'landingPageViewAt',
        'registrationStartedAt',
        'emailEnteredAt',
        'passwordCreatedAt',
        'registrationCompletedAt',
        'emailVerifiedAt',
        'profileStartedAt',
        'photoUploadedAt',
        'profileCompletedAt',
        'firstMatchAt',
        'firstMessageAt',
        'subscriptionPurchasedAt',
      ];

      for (const step of funnelSteps) {
        jest.clearAllMocks();

        mockRequest.body = {
          sessionId: 'session-123',
          step,
        };

        (funnelRepository.updateStep as jest.Mock).mockResolvedValue({
          id: 'funnel-123',
          sessionId: 'session-123',
          [step]: new Date(),
        });

        await trackingController.updateFunnelStep(mockRequest as Request, mockResponse as Response);

        expect(funnelRepository.updateStep).toHaveBeenCalled();
        expect(statusMock).toHaveBeenCalledWith(200);
      }
    });

    it('should handle errors gracefully', async () => {
      mockRequest.body = {
        sessionId: 'session-123',
        step: 'registrationCompletedAt',
      };

      (funnelRepository.updateStep as jest.Mock).mockRejectedValue(
        new Error('Funnel update failed')
      );

      await trackingController.updateFunnelStep(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Funnel update failed',
      });
    });
  });
});
