/**
 * Rewards Routes
 * API routes for daily login rewards and streaks
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { RewardsController } from '../controllers/rewards.controller';

export function createRewardsRoutes(dbPool: Pool): Router {
  const router = Router();
  const controller = new RewardsController(dbPool);

  /**
   * @route GET /api/rewards/streak
   * @desc Get user's current streak status
   * @access Private
   */
  router.get('/streak', controller.getStreakStatus);

  /**
   * @route POST /api/rewards/login
   * @desc Record user login and update streak
   * @access Private
   */
  router.post('/login', controller.recordLogin);

  /**
   * @route POST /api/rewards/claim
   * @desc Claim daily reward
   * @access Private
   */
  router.post('/claim', controller.claimDailyReward);

  /**
   * @route GET /api/rewards/calendar
   * @desc Get the 7-day reward calendar
   * @access Private
   */
  router.get('/calendar', controller.getRewardCalendar);

  /**
   * @route GET /api/rewards/history
   * @desc Get user's reward claim history
   * @access Private
   */
  router.get('/history', controller.getRewardHistory);

  /**
   * @route GET /api/rewards/stats
   * @desc Get user's reward statistics
   * @access Private
   */
  router.get('/stats', controller.getRewardStats);

  return router;
}
