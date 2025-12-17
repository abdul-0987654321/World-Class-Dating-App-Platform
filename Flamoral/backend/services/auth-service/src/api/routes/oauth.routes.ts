import { Router } from 'express';
import oauthController from '../controllers/oauth.controller';
import { authLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: OAuth
 *   description: OAuth authentication (Google, Facebook, Apple)
 */

/**
 * @swagger
 * /api/auth/oauth/google:
 *   post:
 *     summary: Authenticate with Google
 *     tags: [OAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Google OAuth access token
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid token
 */
router.post(
  '/google',
  authLimiter,
  oauthController.googleAuth.bind(oauthController)
);

/**
 * @swagger
 * /api/auth/oauth/facebook:
 *   post:
 *     summary: Authenticate with Facebook
 *     tags: [OAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Facebook OAuth access token
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid token
 */
router.post(
  '/facebook',
  authLimiter,
  oauthController.facebookAuth.bind(oauthController)
);

/**
 * @swagger
 * /api/auth/oauth/apple:
 *   post:
 *     summary: Authenticate with Apple
 *     tags: [OAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Apple ID token
 *               user:
 *                 type: object
 *                 description: User info (only provided on first sign-in)
 *                 properties:
 *                   name:
 *                     type: object
 *                     properties:
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *     responses:
 *       200:
 *         description: Authentication successful
 *       401:
 *         description: Invalid token
 */
router.post(
  '/apple',
  authLimiter,
  oauthController.appleAuth.bind(oauthController)
);

export default router;
