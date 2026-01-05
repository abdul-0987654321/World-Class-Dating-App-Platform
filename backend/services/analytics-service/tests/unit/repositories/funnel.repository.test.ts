/**
 * Unit tests for Funnel Repository
 * Tests conversion funnel creation, step updates, and analytics
 */

import { FunnelRepository } from '../../../src/domain/repositories/funnel.repository';
import { dbClient } from '../../../src/infrastructure/database/db-client';

jest.mock('../../../src/infrastructure/database/db-client');

describe('FunnelRepository', () => {
  let funnelRepository: FunnelRepository;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (dbClient.query as jest.Mock) = mockQuery;
    funnelRepository = new FunnelRepository();
  });

  describe('create', () => {
    it('should create a new funnel entry successfully', async () => {
      const sessionId = 'session-123';
      const userId = 'user-456';
      const utmSource = 'google';
      const utmCampaign = 'summer_sale';

      const mockRow = {
        id: 'funnel-123',
        user_id: userId,
        session_id: sessionId,
        utm_source: utmSource,
        utm_campaign: utmCampaign,
        landing_page_view_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        completed: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await funnelRepository.create(sessionId, userId, utmSource, utmCampaign);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversion_funnel'),
        expect.arrayContaining([userId, sessionId, utmSource, utmCampaign])
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('funnel-123');
      expect(result.sessionId).toBe(sessionId);
      expect(result.userId).toBe(userId);
      expect(result.utmSource).toBe(utmSource);
      expect(result.utmCampaign).toBe(utmCampaign);
    });

    it('should create funnel without optional parameters', async () => {
      const sessionId = 'session-456';

      const mockRow = {
        id: 'funnel-456',
        user_id: null,
        session_id: sessionId,
        utm_source: null,
        utm_campaign: null,
        landing_page_view_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        completed: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await funnelRepository.create(sessionId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([null, sessionId, null, null])
      );

      expect(result.userId).toBeNull();
      expect(result.utmSource).toBeNull();
    });
  });

  describe('updateStep', () => {
    it('should update registration completed step with time calculation', async () => {
      const sessionId = 'session-123';
      const timestamp = new Date();

      // Mock finding existing funnel
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-123',
            session_id: sessionId,
            landing_page_view_at: new Date(timestamp.getTime() - 120000), // 2 minutes ago
          },
        ],
      });

      // Mock updating funnel
      const mockUpdatedRow = {
        id: 'funnel-123',
        session_id: sessionId,
        registration_completed_at: timestamp,
        time_to_register: 120, // 2 minutes in seconds
        completed: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      const result = await funnelRepository.updateStep({
        sessionId,
        step: 'registrationCompletedAt',
        timestamp,
      });

      expect(result).toBeDefined();
      expect(result.registrationCompletedAt).toBeDefined();
      expect(result.timeToRegister).toBe(120);
    });

    it('should update email verified step with time calculation', async () => {
      const sessionId = 'session-email';
      const timestamp = new Date();
      const registrationTime = new Date(timestamp.getTime() - 300000); // 5 minutes ago

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-email',
            session_id: sessionId,
            landing_page_view_at: new Date(),
            registration_completed_at: registrationTime,
          },
        ],
      });

      const mockUpdatedRow = {
        id: 'funnel-email',
        session_id: sessionId,
        email_verified_at: timestamp,
        time_to_verify: 300,
        completed: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      const result = await funnelRepository.updateStep({
        sessionId,
        step: 'emailVerifiedAt',
        timestamp,
      });

      expect(result.emailVerifiedAt).toBeDefined();
      expect(result.timeToVerify).toBe(300);
    });

    it('should update profile completed step with time calculation', async () => {
      const sessionId = 'session-profile';
      const timestamp = new Date();
      const emailVerifiedTime = new Date(timestamp.getTime() - 600000); // 10 minutes ago

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-profile',
            session_id: sessionId,
            email_verified_at: emailVerifiedTime,
          },
        ],
      });

      const mockUpdatedRow = {
        id: 'funnel-profile',
        session_id: sessionId,
        profile_completed_at: timestamp,
        time_to_profile: 600,
        completed: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      const result = await funnelRepository.updateStep({
        sessionId,
        step: 'profileCompletedAt',
        timestamp,
      });

      expect(result.profileCompletedAt).toBeDefined();
      expect(result.timeToProfile).toBe(600);
    });

    it('should update first match step with time calculation', async () => {
      const sessionId = 'session-match';
      const timestamp = new Date();
      const profileCompletedTime = new Date(timestamp.getTime() - 86400000); // 1 day ago

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-match',
            session_id: sessionId,
            profile_completed_at: profileCompletedTime,
          },
        ],
      });

      const mockUpdatedRow = {
        id: 'funnel-match',
        session_id: sessionId,
        first_match_at: timestamp,
        time_to_match: 86400,
        completed: false,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      const result = await funnelRepository.updateStep({
        sessionId,
        step: 'firstMatchAt',
        timestamp,
      });

      expect(result.firstMatchAt).toBeDefined();
      expect(result.timeToMatch).toBe(86400);
    });

    it('should mark funnel as completed on subscription purchase', async () => {
      const sessionId = 'session-subscribe';
      const timestamp = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-subscribe',
            session_id: sessionId,
            registration_completed_at: new Date(timestamp.getTime() - 172800000), // 2 days ago
          },
        ],
      });

      const mockUpdatedRow = {
        id: 'funnel-subscribe',
        session_id: sessionId,
        subscription_purchased_at: timestamp,
        time_to_subscribe: 172800,
        completed: true,
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      const result = await funnelRepository.updateStep({
        sessionId,
        step: 'subscriptionPurchasedAt',
        timestamp,
      });

      expect(result.subscriptionPurchasedAt).toBeDefined();
      expect(result.completed).toBe(true);
    });

    it('should create new funnel if it does not exist', async () => {
      const sessionId = 'session-new';
      const userId = 'user-new';

      // First call: funnel doesn't exist
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Create new funnel
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-new',
            session_id: sessionId,
            user_id: userId,
            landing_page_view_at: new Date(),
          },
        ],
      });

      // Now find it again
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-new',
            session_id: sessionId,
            user_id: userId,
            landing_page_view_at: new Date(),
          },
        ],
      });

      // Update step
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-new',
            session_id: sessionId,
            registration_started_at: new Date(),
          },
        ],
      });

      const result = await funnelRepository.updateStep({
        sessionId,
        userId,
        step: 'registrationStartedAt',
      });

      expect(result).toBeDefined();
      expect(result.registrationStartedAt).toBeDefined();
    });

    it('should throw error for invalid step', async () => {
      const sessionId = 'session-invalid';

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'funnel-123', session_id: sessionId }],
      });

      await expect(
        funnelRepository.updateStep({
          sessionId,
          step: 'invalidStep' as any,
        })
      ).rejects.toThrow('Invalid funnel step');
    });

    it('should update user ID if not already set', async () => {
      const sessionId = 'session-userid';
      const userId = 'user-new';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'funnel-userid',
            session_id: sessionId,
            user_id: null, // Not set yet
            landing_page_view_at: new Date(),
          },
        ],
      });

      const mockUpdatedRow = {
        id: 'funnel-userid',
        session_id: sessionId,
        user_id: userId,
        registration_completed_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedRow] });

      const result = await funnelRepository.updateStep({
        sessionId,
        userId,
        step: 'registrationCompletedAt',
      });

      expect(result.userId).toBe(userId);
    });
  });

  describe('markDroppedAt', () => {
    it('should mark funnel as dropped at specific step', async () => {
      const sessionId = 'session-dropped';
      const step = 'email_entered';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await funnelRepository.markDroppedAt(sessionId, step);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversion_funnel'),
        [step, sessionId]
      );
    });
  });

  describe('findBySessionId', () => {
    it('should find funnel by session ID', async () => {
      const sessionId = 'session-find';

      const mockRow = {
        id: 'funnel-find',
        session_id: sessionId,
        user_id: 'user-123',
        landing_page_view_at: new Date(),
        registration_started_at: new Date(),
        completed: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await funnelRepository.findBySessionId(sessionId);

      expect(mockQuery).toHaveBeenCalledWith(expect.any(String), [sessionId]);

      expect(result).toBeDefined();
      expect(result?.sessionId).toBe(sessionId);
      expect(result?.userId).toBe('user-123');
    });

    it('should return null when funnel not found', async () => {
      const sessionId = 'session-notfound';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await funnelRepository.findBySessionId(sessionId);

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find most recent funnel for user', async () => {
      const userId = 'user-123';

      const mockRow = {
        id: 'funnel-user',
        session_id: 'session-latest',
        user_id: userId,
        landing_page_view_at: new Date(),
        completed: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await funnelRepository.findByUserId(userId);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [userId]
      );

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
    });

    it('should return null when no funnel found for user', async () => {
      const userId = 'user-nofunnel';

      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await funnelRepository.findByUserId(userId);

      expect(result).toBeNull();
    });
  });

  describe('getConversionRates', () => {
    it('should return conversion rates by UTM source', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            utm_source: 'google',
            total_sessions: '1000',
            landing_views: '950',
            registrations_started: '500',
            registrations_completed: '300',
            emails_verified: '250',
            profiles_completed: '200',
            first_matches: '150',
            subscriptions: '50',
            registration_rate: '31.58',
            profile_completion_rate: '66.67',
            subscription_rate: '16.67',
          },
          {
            utm_source: 'facebook',
            total_sessions: '800',
            landing_views: '780',
            registrations_started: '400',
            registrations_completed: '240',
            emails_verified: '200',
            profiles_completed: '160',
            first_matches: '120',
            subscriptions: '40',
            registration_rate: '30.77',
            profile_completion_rate: '66.67',
            subscription_rate: '16.67',
          },
        ],
      });

      const result = await funnelRepository.getConversionRates();

      expect(result).toBeDefined();
      expect(result.length).toBe(2);

      const googleData = result.find((r) => r.utmSource === 'google');
      expect(googleData).toBeDefined();
      expect(googleData?.totalSessions).toBe(1000);
      expect(googleData?.landingViews).toBe(950);
      expect(googleData?.registrationRate).toBeCloseTo(31.58, 2);
      expect(googleData?.subscriptionRate).toBeCloseTo(16.67, 2);
    });

    it('should filter by UTM source when provided', async () => {
      const utmSource = 'google';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            utm_source: 'google',
            total_sessions: '1000',
            landing_views: '950',
            registrations_started: '500',
            registrations_completed: '300',
            emails_verified: '250',
            profiles_completed: '200',
            first_matches: '150',
            subscriptions: '50',
            registration_rate: '31.58',
            profile_completion_rate: '66.67',
            subscription_rate: '16.67',
          },
        ],
      });

      const result = await funnelRepository.getConversionRates(utmSource);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('utm_source = $'),
        expect.arrayContaining([utmSource])
      );

      expect(result.length).toBe(1);
      expect(result[0].utmSource).toBe('google');
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockQuery.mockResolvedValueOnce({ rows: [] });

      await funnelRepository.getConversionRates(undefined, startDate, endDate);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at >= $'),
        expect.arrayContaining([startDate, endDate])
      );
    });

    it('should handle null UTM source as direct traffic', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            utm_source: null,
            total_sessions: '500',
            landing_views: '480',
            registrations_started: '200',
            registrations_completed: '120',
            emails_verified: '100',
            profiles_completed: '80',
            first_matches: '60',
            subscriptions: '20',
            registration_rate: '25.00',
            profile_completion_rate: '66.67',
            subscription_rate: '16.67',
          },
        ],
      });

      const result = await funnelRepository.getConversionRates();

      expect(result[0].utmSource).toBe('direct');
    });
  });

  describe('getAverageTimings', () => {
    it('should return average timing for each funnel step', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            avg_time_to_register: '120',
            avg_time_to_verify: '300',
            avg_time_to_profile: '600',
            avg_time_to_match: '86400',
            avg_time_to_subscribe: '172800',
          },
        ],
      });

      const result = await funnelRepository.getAverageTimings();

      expect(result).toBeDefined();
      expect(result.avgTimeToRegister).toBe(120);
      expect(result.avgTimeToVerify).toBe(300);
      expect(result.avgTimeToProfile).toBe(600);
      expect(result.avgTimeToMatch).toBe(86400);
      expect(result.avgTimeToSubscribe).toBe(172800);
    });

    it('should filter by UTM source', async () => {
      const utmSource = 'facebook';

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            avg_time_to_register: '150',
            avg_time_to_verify: '360',
            avg_time_to_profile: '720',
            avg_time_to_match: '90000',
            avg_time_to_subscribe: '180000',
          },
        ],
      });

      const result = await funnelRepository.getAverageTimings(utmSource);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('utm_source = $'),
        [utmSource]
      );

      expect(result.avgTimeToRegister).toBe(150);
    });

    it('should handle null values', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            avg_time_to_register: null,
            avg_time_to_verify: null,
            avg_time_to_profile: null,
            avg_time_to_match: null,
            avg_time_to_subscribe: null,
          },
        ],
      });

      const result = await funnelRepository.getAverageTimings();

      expect(result.avgTimeToRegister).toBe(0);
      expect(result.avgTimeToVerify).toBe(0);
      expect(result.avgTimeToProfile).toBe(0);
      expect(result.avgTimeToMatch).toBe(0);
      expect(result.avgTimeToSubscribe).toBe(0);
    });
  });

  describe('getDropoffAnalysis', () => {
    it('should return dropoff analysis by step', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          { step: 'registration_started', count: '200', percentage: '20.00' },
          { step: 'email_entered', count: '150', percentage: '15.00' },
          { step: 'password_created', count: '100', percentage: '10.00' },
          { step: 'profile_started', count: '80', percentage: '8.00' },
          { step: 'photo_uploaded', count: '50', percentage: '5.00' },
        ],
      });

      const result = await funnelRepository.getDropoffAnalysis();

      expect(result).toBeDefined();
      expect(result.length).toBe(5);

      result.forEach((dropoff) => {
        expect(dropoff.step).toBeDefined();
        expect(dropoff.count).toBeGreaterThanOrEqual(0);
        expect(dropoff.percentage).toBeGreaterThanOrEqual(0);
      });

      // Should be sorted by count descending
      expect(result[0].step).toBe('registration_started');
      expect(result[0].count).toBe(200);
    });

    it('should filter by UTM source', async () => {
      const utmSource = 'google';

      mockQuery.mockResolvedValueOnce({
        rows: [
          { step: 'registration_started', count: '100', percentage: '10.00' },
        ],
      });

      await funnelRepository.getDropoffAnalysis(utmSource);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('utm_source = $'),
        [utmSource]
      );
    });

    it('should return empty array when no dropoffs', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await funnelRepository.getDropoffAnalysis();

      expect(result).toBeDefined();
      expect(result.length).toBe(0);
    });
  });

  describe('mapRowToFunnel', () => {
    it('should correctly map all fields from database row', async () => {
      const mockRow = {
        id: 'funnel-complete',
        user_id: 'user-123',
        session_id: 'session-123',
        landing_page_view_at: new Date('2025-01-01T10:00:00'),
        registration_started_at: new Date('2025-01-01T10:01:00'),
        email_entered_at: new Date('2025-01-01T10:01:30'),
        password_created_at: new Date('2025-01-01T10:02:00'),
        registration_completed_at: new Date('2025-01-01T10:02:30'),
        email_verified_at: new Date('2025-01-01T10:05:00'),
        profile_started_at: new Date('2025-01-01T10:06:00'),
        photo_uploaded_at: new Date('2025-01-01T10:08:00'),
        profile_completed_at: new Date('2025-01-01T10:12:00'),
        first_match_at: new Date('2025-01-02T15:00:00'),
        first_message_at: new Date('2025-01-02T15:05:00'),
        subscription_purchased_at: new Date('2025-01-03T12:00:00'),
        time_to_register: 150,
        time_to_verify: 150,
        time_to_profile: 420,
        time_to_match: 104280,
        time_to_subscribe: 180000,
        dropped_at_step: null,
        completed: true,
        utm_source: 'google',
        utm_campaign: 'summer_sale',
        created_at: new Date('2025-01-01T10:00:00'),
        updated_at: new Date('2025-01-03T12:00:00'),
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await funnelRepository.findBySessionId('session-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('funnel-complete');
      expect(result?.userId).toBe('user-123');
      expect(result?.sessionId).toBe('session-123');
      expect(result?.landingPageViewAt).toBeInstanceOf(Date);
      expect(result?.registrationStartedAt).toBeInstanceOf(Date);
      expect(result?.emailEnteredAt).toBeInstanceOf(Date);
      expect(result?.passwordCreatedAt).toBeInstanceOf(Date);
      expect(result?.registrationCompletedAt).toBeInstanceOf(Date);
      expect(result?.emailVerifiedAt).toBeInstanceOf(Date);
      expect(result?.profileStartedAt).toBeInstanceOf(Date);
      expect(result?.photoUploadedAt).toBeInstanceOf(Date);
      expect(result?.profileCompletedAt).toBeInstanceOf(Date);
      expect(result?.firstMatchAt).toBeInstanceOf(Date);
      expect(result?.firstMessageAt).toBeInstanceOf(Date);
      expect(result?.subscriptionPurchasedAt).toBeInstanceOf(Date);
      expect(result?.timeToRegister).toBe(150);
      expect(result?.timeToVerify).toBe(150);
      expect(result?.timeToProfile).toBe(420);
      expect(result?.timeToMatch).toBe(104280);
      expect(result?.timeToSubscribe).toBe(180000);
      expect(result?.droppedAtStep).toBeNull();
      expect(result?.completed).toBe(true);
      expect(result?.utmSource).toBe('google');
      expect(result?.utmCampaign).toBe('summer_sale');
    });
  });
});
