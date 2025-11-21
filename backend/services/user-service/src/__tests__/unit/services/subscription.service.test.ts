import { SubscriptionService } from '../../../domain/services/subscription.service';
import { SubscriptionRepository } from '../../../infrastructure/repositories/subscription.repository';
import { SubscriptionFeatureRepository } from '../../../infrastructure/repositories/subscription-feature.repository';

// Mock the repositories
jest.mock('../../../infrastructure/repositories/subscription.repository');
jest.mock('../../../infrastructure/repositories/subscription-feature.repository');

describe('SubscriptionService', () => {
  let subscriptionService: SubscriptionService;
  let mockSubscriptionRepository: jest.Mocked<SubscriptionRepository>;
  let mockFeatureRepository: jest.Mocked<SubscriptionFeatureRepository>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create mock instances
    mockSubscriptionRepository = new SubscriptionRepository() as jest.Mocked<SubscriptionRepository>;
    mockFeatureRepository = new SubscriptionFeatureRepository() as jest.Mocked<SubscriptionFeatureRepository>;

    // Create service with mocked dependencies
    subscriptionService = new SubscriptionService(
      mockSubscriptionRepository,
      mockFeatureRepository
    );
  });

  describe('getCurrentSubscription', () => {
    it('should return subscription for existing user', async () => {
      const userId = 'user-123';
      const mockSubscription = {
        id: 'sub-123',
        userId,
        tier: 'mid',
        status: 'active',
        cancelAtPeriodEnd: false,
      };

      mockSubscriptionRepository.findByUserId.mockResolvedValue(mockSubscription as any);

      const result = await subscriptionService.getCurrentSubscription(userId);

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptionRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should create free tier subscription for new user', async () => {
      const userId = 'user-123';

      mockSubscriptionRepository.findByUserId.mockResolvedValue(null);
      mockSubscriptionRepository.create.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'free',
        status: 'active',
      } as any);

      const result = await subscriptionService.getCurrentSubscription(userId);

      expect(result.tier).toBe('free');
      expect(mockSubscriptionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          tier: 'free',
          status: 'active',
        })
      );
    });
  });

  describe('updateTier', () => {
    it('should upgrade user to higher tier', async () => {
      const userId = 'user-123';
      const newTier = 'ultra';

      const existingSubscription = {
        id: 'sub-123',
        userId,
        tier: 'basic',
        status: 'active',
      };

      mockSubscriptionRepository.findByUserId.mockResolvedValue(existingSubscription as any);
      mockSubscriptionRepository.update.mockResolvedValue({
        ...existingSubscription,
        tier: newTier,
      } as any);

      const result = await subscriptionService.updateTier(userId, newTier as any);

      expect(result.tier).toBe(newTier);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        existingSubscription.id,
        expect.objectContaining({ tier: newTier })
      );
    });

    it('should throw error when downgrading below free', async () => {
      const userId = 'user-123';

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'free',
      } as any);

      await expect(
        subscriptionService.updateTier(userId, 'free' as any)
      ).rejects.toThrow();
    });
  });

  describe('getSubscriptionFeatures', () => {
    it('should return features for user tier', async () => {
      const userId = 'user-123';
      const mockFeatures = [
        { key: 'daily_swipes_limit', value: '-1' },
        { key: 'see_who_liked_you', value: 'true' },
      ];

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
      } as any);

      mockFeatureRepository.findByTier.mockResolvedValue(mockFeatures as any);

      const result = await subscriptionService.getSubscriptionFeatures(userId);

      expect(result).toEqual(mockFeatures);
      expect(mockFeatureRepository.findByTier).toHaveBeenCalledWith('mid');
    });
  });

  describe('checkFeatureAccess', () => {
    it('should return true for feature user has access to', async () => {
      const userId = 'user-123';
      const featureKey = 'incognito_mode';

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
      } as any);

      mockFeatureRepository.findByTierAndKey.mockResolvedValue({
        key: featureKey,
        value: 'true',
        valueType: 'boolean',
      } as any);

      const result = await subscriptionService.checkFeatureAccess(userId, featureKey);

      expect(result).toBe(true);
    });

    it('should return false for feature user does not have access to', async () => {
      const userId = 'user-123';
      const featureKey = 'incognito_mode';

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'free',
      } as any);

      mockFeatureRepository.findByTierAndKey.mockResolvedValue({
        key: featureKey,
        value: 'false',
        valueType: 'boolean',
      } as any);

      const result = await subscriptionService.checkFeatureAccess(userId, featureKey);

      expect(result).toBe(false);
    });

    it('should parse integer feature values correctly', async () => {
      const userId = 'user-123';
      const featureKey = 'daily_swipes_limit';

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'basic',
      } as any);

      mockFeatureRepository.findByTierAndKey.mockResolvedValue({
        key: featureKey,
        value: '-1',
        valueType: 'integer',
      } as any);

      const result = await subscriptionService.checkFeatureAccess(userId, featureKey);

      expect(result).toBe(-1);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription immediately', async () => {
      const userId = 'user-123';
      const immediately = true;

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
        status: 'active',
      } as any);

      mockSubscriptionRepository.update.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'free',
        status: 'canceled',
      } as any);

      const result = await subscriptionService.cancelSubscription(userId, immediately);

      expect(result.tier).toBe('free');
      expect(mockSubscriptionRepository.update).toHaveBeenCalled();
    });

    it('should cancel subscription at period end', async () => {
      const userId = 'user-123';
      const immediately = false;

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
        status: 'active',
      } as any);

      mockSubscriptionRepository.update.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
        status: 'active',
        cancelAtPeriodEnd: true,
      } as any);

      const result = await subscriptionService.cancelSubscription(userId, immediately);

      expect(result.cancelAtPeriodEnd).toBe(true);
      expect(result.tier).toBe('mid');
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate canceled subscription', async () => {
      const userId = 'user-123';

      mockSubscriptionRepository.findByUserId.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
        status: 'active',
        cancelAtPeriodEnd: true,
      } as any);

      mockSubscriptionRepository.update.mockResolvedValue({
        id: 'sub-123',
        userId,
        tier: 'mid',
        status: 'active',
        cancelAtPeriodEnd: false,
      } as any);

      const result = await subscriptionService.reactivateSubscription(userId);

      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(mockSubscriptionRepository.update).toHaveBeenCalledWith(
        'sub-123',
        expect.objectContaining({ cancelAtPeriodEnd: false })
      );
    });
  });
});
