/// <reference types="jest" />
import request from 'supertest';
import express, { Application } from 'express';
import coinRoutes from '../../api/routes/coin.routes';
import { authenticate } from '../../api/middleware/auth.middleware';
import {
  setupTestDatabase,
  teardownTestDatabase,
  cleanTables,
  createTestUserWithProfile,
  getTestDb,
  insertTestData,
  findRecord,
  countRecords,
} from '../helpers/db-helpers';
import { createMockCoinProduct, createMockCoinTransaction } from '../helpers/test-data';

/**
 * E2E Tests for Coin API
 *
 * These tests verify the complete coin system including balance management,
 * transactions, purchases, and daily rewards with a real database.
 */
describe('Coin API E2E Tests', () => {
  let app: Application;
  let testUser: any;

  beforeAll(async () => {
    await setupTestDatabase();

    app = express();
    app.use(express.json());

    jest.mock('../../api/middleware/auth.middleware', () => ({
      authenticate: jest.fn((req, _res, next) => {
        req.user = { id: testUser.user.id, email: testUser.user.email };
        next();
      }),
    }));

    app.use('/api/coins', coinRoutes);

    app.use((err: any, _req: any, res: any, _next: any) => {
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
      });
    });
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    await cleanTables(
      'coin_transactions',
      'coin_balances',
      'subscriptions',
      'users',
      'profiles',
      'privacy_settings'
    );

    testUser = await createTestUserWithProfile({
      email: 'coin-test@example.com',
      first_name: 'Coin',
      last_name: 'Test',
    });

    (authenticate as jest.Mock).mockImplementation((req, _res, next) => {
      req.user = { id: testUser.user.id, email: testUser.user.email };
      next();
    });
  });

  describe('GET /api/coins/balance', () => {
    it('should return initial balance of 0', async () => {
      const response = await request(app)
        .get('/api/coins/balance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(0);
      expect(response.body.data.user_id).toBe(testUser.user.id);
    });

    it('should return updated balance after transaction', async () => {
      const db = getTestDb();

      // Update balance directly
      await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .update({ balance: 500 });

      const response = await request(app)
        .get('/api/coins/balance')
        .expect(200);

      expect(response.body.data.balance).toBe(500);
    });
  });

  describe('GET /api/coins/products', () => {
    it('should return seeded coin products', async () => {
      const response = await request(app)
        .get('/api/coins/products')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const product = response.body.data[0];
      expect(product).toHaveProperty('sku');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('amount');
      expect(product).toHaveProperty('price');
      expect(product).toHaveProperty('is_active', true);
    });

    it('should only return active products', async () => {
      const db = getTestDb();

      // Deactivate all products
      await db('coin_products').update({ is_active: false });

      const response = await request(app)
        .get('/api/coins/products')
        .expect(200);

      expect(response.body.data.length).toBe(0);
    });
  });

  describe('POST /api/coins/purchase', () => {
    it('should purchase coins and update balance', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: 'COIN_PACK_SMALL',
          stripePaymentId: 'pi_test_12345',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBeGreaterThan(0);

      // Verify balance in database
      const db = getTestDb();
      const balance = await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .first();

      expect(balance.balance).toBe(100); // COIN_PACK_SMALL amount

      // Verify transaction was created
      const transaction = await db('coin_transactions')
        .where({ user_id: testUser.user.id })
        .first();

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('purchase');
      expect(transaction.amount).toBe(100);
      expect(transaction.reference_type).toBe('stripe_payment');
      expect(transaction.reference_id).toBe('pi_test_12345');
    });

    it('should add bonus coins for larger packs', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: 'COIN_PACK_MEDIUM',
          stripePaymentId: 'pi_test_67890',
        })
        .expect(200);

      // COIN_PACK_MEDIUM: 500 coins + 50 bonus = 550 total
      expect(response.body.data.balance).toBe(550);
    });

    it('should reject invalid product SKU', async () => {
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: 'INVALID_SKU',
          stripePaymentId: 'pi_test_999',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject duplicate stripe payment ID', async () => {
      const paymentId = 'pi_test_unique_123';

      // First purchase
      await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: 'COIN_PACK_SMALL',
          stripePaymentId: paymentId,
        })
        .expect(200);

      // Attempt duplicate purchase
      const response = await request(app)
        .post('/api/coins/purchase')
        .send({
          productSku: 'COIN_PACK_SMALL',
          stripePaymentId: paymentId,
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already processed');
    });
  });

  describe('POST /api/coins/spend', () => {
    beforeEach(async () => {
      // Give user some coins
      const db = getTestDb();
      await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .update({ balance: 500 });
    });

    it('should spend coins and decrease balance', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 50,
          reason: 'Profile boost',
          referenceType: 'boost',
          referenceId: 'boost-123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.balance).toBe(450);

      // Verify transaction
      const db = getTestDb();
      const transaction = await db('coin_transactions')
        .where({ user_id: testUser.user.id, type: 'spent' })
        .first();

      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(-50);
      expect(transaction.reason).toBe('Profile boost');
      expect(transaction.reference_type).toBe('boost');
    });

    it('should reject spending more than balance', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: 1000,
          reason: 'Insufficient balance test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Insufficient balance');

      // Verify balance unchanged
      const db = getTestDb();
      const balance = await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .first();

      expect(balance.balance).toBe(500);
    });

    it('should reject negative amounts', async () => {
      const response = await request(app)
        .post('/api/coins/spend')
        .send({
          amount: -50,
          reason: 'Negative test',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/coins/transactions', () => {
    beforeEach(async () => {
      const db = getTestDb();

      // Create multiple transactions
      const transactions = [
        createMockCoinTransaction(testUser.user.id, {
          amount: 100,
          type: 'purchase',
          created_at: new Date('2024-01-01'),
        }),
        createMockCoinTransaction(testUser.user.id, {
          amount: -50,
          type: 'spent',
          created_at: new Date('2024-01-02'),
        }),
        createMockCoinTransaction(testUser.user.id, {
          amount: 10,
          type: 'reward',
          created_at: new Date('2024-01-03'),
        }),
      ];

      await db('coin_transactions').insert(transactions);
    });

    it('should return paginated transaction history', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?limit=10&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transactions).toBeDefined();
      expect(response.body.data.transactions.length).toBe(3);
      expect(response.body.data.total).toBe(3);
    });

    it('should filter by transaction type', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?type=spent')
        .expect(200);

      expect(response.body.data.transactions.length).toBe(1);
      expect(response.body.data.transactions[0].type).toBe('spent');
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/coins/transactions?limit=2')
        .expect(200);

      expect(response.body.data.transactions.length).toBe(2);
    });

    it('should order by created_at DESC', async () => {
      const response = await request(app)
        .get('/api/coins/transactions')
        .expect(200);

      const transactions = response.body.data.transactions;
      expect(new Date(transactions[0].created_at).getTime()).toBeGreaterThanOrEqual(
        new Date(transactions[1].created_at).getTime()
      );
    });
  });

  describe('GET /api/coins/transactions/summary', () => {
    beforeEach(async () => {
      const db = getTestDb();

      await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .update({ balance: 250 });

      const transactions = [
        createMockCoinTransaction(testUser.user.id, {
          amount: 200,
          type: 'purchase',
        }),
        createMockCoinTransaction(testUser.user.id, {
          amount: 100,
          type: 'purchase',
        }),
        createMockCoinTransaction(testUser.user.id, {
          amount: -50,
          type: 'spent',
        }),
        createMockCoinTransaction(testUser.user.id, {
          amount: 10,
          type: 'reward',
        }),
        createMockCoinTransaction(testUser.user.id, {
          amount: -10,
          type: 'spent',
        }),
      ];

      await db('coin_transactions').insert(transactions);
    });

    it('should return accurate transaction summary', async () => {
      const response = await request(app)
        .get('/api/coins/transactions/summary')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        totalPurchases: 300, // 200 + 100
        totalSpent: 60, // 50 + 10
        totalRewards: 10,
        currentBalance: 250,
      });
    });
  });

  describe('POST /api/coins/daily-reward', () => {
    it('should claim daily reward successfully', async () => {
      const response = await request(app)
        .post('/api/coins/daily-reward')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reward).toBe(10);
      expect(response.body.data.balance).toBe(10);
      expect(response.body.data.nextClaimTime).toBeDefined();

      // Verify transaction created
      const db = getTestDb();
      const transaction = await db('coin_transactions')
        .where({
          user_id: testUser.user.id,
          type: 'reward',
          reference_type: 'daily_reward',
        })
        .first();

      expect(transaction).toBeDefined();
      expect(transaction.amount).toBe(10);
    });

    it('should reject claiming twice in same day', async () => {
      // First claim
      await request(app).post('/api/coins/daily-reward').expect(200);

      // Second claim (should fail)
      const response = await request(app)
        .post('/api/coins/daily-reward')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already claimed');

      // Verify only one transaction exists
      const count = await countRecords('coin_transactions', {
        user_id: testUser.user.id,
        type: 'reward',
        reference_type: 'daily_reward',
      });

      expect(count).toBe(1);
    });
  });

  describe('Database Transaction Integrity', () => {
    it('should rollback on failed purchase', async () => {
      const db = getTestDb();
      const initialBalance = await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .first();

      // Attempt purchase with invalid payment
      try {
        await request(app)
          .post('/api/coins/purchase')
          .send({
            productSku: 'INVALID_SKU',
            stripePaymentId: 'pi_fail',
          });
      } catch (error) {
        // Expected to fail
      }

      // Verify balance unchanged
      const finalBalance = await db('coin_balances')
        .where({ user_id: testUser.user.id })
        .first();

      expect(finalBalance.balance).toBe(initialBalance.balance);

      // Verify no transaction created
      const count = await countRecords('coin_transactions', {
        user_id: testUser.user.id,
        reference_id: 'pi_fail',
      });

      expect(count).toBe(0);
    });
  });
});
