/// <reference types="jest" />
import { CoinService } from '../../../domain/services/coin.service';
import { CoinBalanceRepository } from '../../../infrastructure/repositories/coin-balance.repository';
import { CoinTransactionRepository } from '../../../infrastructure/repositories/coin-transaction.repository';
import { CoinProductRepository } from '../../../infrastructure/repositories/coin-product.repository';

// Mock the repositories
jest.mock('../../../infrastructure/repositories/coin-balance.repository');
jest.mock('../../../infrastructure/repositories/coin-transaction.repository');
jest.mock('../../../infrastructure/repositories/coin-product.repository');

describe('CoinService', () => {
  let coinService: CoinService;
  let mockBalanceRepository: jest.Mocked<CoinBalanceRepository>;
  let mockTransactionRepository: jest.Mocked<CoinTransactionRepository>;
  let mockProductRepository: jest.Mocked<CoinProductRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBalanceRepository = new CoinBalanceRepository() as jest.Mocked<CoinBalanceRepository>;
    mockTransactionRepository = new CoinTransactionRepository() as jest.Mocked<CoinTransactionRepository>;
    mockProductRepository = new CoinProductRepository() as jest.Mocked<CoinProductRepository>;

    coinService = new CoinService(
      mockBalanceRepository,
      mockTransactionRepository,
      mockProductRepository
    );
  });

  describe('getBalance', () => {
    it('should return balance for existing user', async () => {
      const userId = 'user-123';
      const mockBalance = {
        id: 'balance-123',
        userId,
        balance: 500,
      };

      mockBalanceRepository.findByUserId.mockResolvedValue(mockBalance as any);

      const result = await coinService.getBalance(userId);

      expect(result).toEqual(mockBalance);
      expect(mockBalanceRepository.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should create balance for new user', async () => {
      const userId = 'user-123';

      mockBalanceRepository.findByUserId.mockResolvedValue(null);
      mockBalanceRepository.create.mockResolvedValue({
        id: 'balance-123',
        userId,
        balance: 0,
      } as any);

      const result = await coinService.getBalance(userId);

      expect(result.balance).toBe(0);
      expect(mockBalanceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          balance: 0,
        })
      );
    });
  });

  describe('purchaseCoins', () => {
    it('should add coins to user balance', async () => {
      const userId = 'user-123';
      const productSku = 'COIN_PACK_MEDIUM';
      const stripePaymentId = 'pi_123';

      const mockProduct = {
        sku: productSku,
        amount: 500,
        bonusCoins: 50,
      };

      const mockBalance = {
        id: 'balance-123',
        userId,
        balance: 100,
      };

      mockProductRepository.findBySku.mockResolvedValue(mockProduct as any);
      mockBalanceRepository.findByUserId.mockResolvedValue(mockBalance as any);
      mockBalanceRepository.update.mockResolvedValue({
        ...mockBalance,
        balance: 650, // 100 + 500 + 50 bonus
      } as any);

      const result = await coinService.purchaseCoins(userId, productSku, stripePaymentId);

      expect(result.balance).toBe(650);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: 550, // includes bonus
          type: 'purchase',
        })
      );
    });

    it('should throw error for invalid product', async () => {
      const userId = 'user-123';
      const productSku = 'INVALID_SKU';
      const stripePaymentId = 'pi_123';

      mockProductRepository.findBySku.mockResolvedValue(null);

      await expect(
        coinService.purchaseCoins(userId, productSku, stripePaymentId)
      ).rejects.toThrow();
    });
  });

  describe('spendCoins', () => {
    it('should deduct coins from balance', async () => {
      const userId = 'user-123';
      const amount = 50;
      const reason = 'Profile boost purchase';

      const mockBalance = {
        id: 'balance-123',
        userId,
        balance: 500,
      };

      mockBalanceRepository.findByUserId.mockResolvedValue(mockBalance as any);
      mockBalanceRepository.update.mockResolvedValue({
        ...mockBalance,
        balance: 450,
      } as any);

      const result = await coinService.spendCoins(userId, amount, reason);

      expect(result.balance).toBe(450);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: -50,
          type: 'spent',
          reason,
        })
      );
    });

    it('should throw error for insufficient balance', async () => {
      const userId = 'user-123';
      const amount = 600;
      const reason = 'Purchase';

      mockBalanceRepository.findByUserId.mockResolvedValue({
        id: 'balance-123',
        userId,
        balance: 500,
      } as any);

      await expect(
        coinService.spendCoins(userId, amount, reason)
      ).rejects.toThrow('Insufficient balance');
    });

    it('should throw error for negative amount', async () => {
      const userId = 'user-123';
      const amount = -50;
      const reason = 'Purchase';

      await expect(
        coinService.spendCoins(userId, amount, reason)
      ).rejects.toThrow();
    });
  });

  describe('claimDailyReward', () => {
    it('should give daily reward to user', async () => {
      const userId = 'user-123';
      const rewardAmount = 10;

      const mockBalance = {
        id: 'balance-123',
        userId,
        balance: 100,
      };

      // Mock that user hasn't claimed today
      mockTransactionRepository.findLatestDailyReward.mockResolvedValue(null);
      mockBalanceRepository.findByUserId.mockResolvedValue(mockBalance as any);
      mockBalanceRepository.update.mockResolvedValue({
        ...mockBalance,
        balance: 110,
      } as any);

      const result = await coinService.claimDailyReward(userId);

      expect(result.reward).toBe(rewardAmount);
      expect(result.balance.balance).toBe(110);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          amount: rewardAmount,
          type: 'reward',
          reason: 'Daily reward',
        })
      );
    });

    it('should throw error if already claimed today', async () => {
      const userId = 'user-123';

      // Mock that user has claimed today
      mockTransactionRepository.findLatestDailyReward.mockResolvedValue({
        id: 'txn-123',
        userId,
        createdAt: new Date(),
      } as any);

      await expect(
        coinService.claimDailyReward(userId)
      ).rejects.toThrow('Daily reward already claimed');
    });
  });

  describe('getTransactionHistory', () => {
    it('should return paginated transactions', async () => {
      const userId = 'user-123';
      const mockTransactions = [
        { id: 'txn-1', amount: 100, type: 'purchase' },
        { id: 'txn-2', amount: -50, type: 'spent' },
      ];

      mockTransactionRepository.findByUserId.mockResolvedValue({
        transactions: mockTransactions,
        total: 2,
      } as any);

      const result = await coinService.getTransactionHistory(userId, { limit: 20, offset: 0 });

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(2);
      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ limit: 20, offset: 0 })
      );
    });

    it('should filter by transaction type', async () => {
      const userId = 'user-123';
      const type = 'purchase';

      mockTransactionRepository.findByUserId.mockResolvedValue({
        transactions: [],
        total: 0,
      } as any);

      await coinService.getTransactionHistory(userId, { type });

      expect(mockTransactionRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ type })
      );
    });
  });

  describe('getTransactionSummary', () => {
    it('should return summary of all transactions', async () => {
      const userId = 'user-123';
      const mockSummary = {
        totalPurchases: 1000,
        totalSpent: 300,
        totalRewards: 50,
        currentBalance: 750,
      };

      mockTransactionRepository.getSummary.mockResolvedValue(mockSummary as any);
      mockBalanceRepository.findByUserId.mockResolvedValue({
        balance: 750,
      } as any);

      const result = await coinService.getTransactionSummary(userId);

      expect(result).toEqual(mockSummary);
      expect(mockTransactionRepository.getSummary).toHaveBeenCalledWith(userId);
    });
  });

  describe('getProducts', () => {
    it('should return all active products', async () => {
      const mockProducts = [
        { sku: 'COIN_PACK_SMALL', amount: 100, price: 4.99 },
        { sku: 'COIN_PACK_MEDIUM', amount: 500, price: 19.99 },
      ];

      mockProductRepository.findAllActive.mockResolvedValue(mockProducts as any);

      const result = await coinService.getProducts();

      expect(result).toEqual(mockProducts);
      expect(mockProductRepository.findAllActive).toHaveBeenCalled();
    });
  });
});
