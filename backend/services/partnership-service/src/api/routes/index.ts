import express from 'express';
import restaurantRoutes from './restaurant.routes';
import eventRoutes from './event.routes';
import giftRoutes from './gift.routes';
import affiliateRoutes from './affiliate.routes';
import datePlannerRoutes from './date-planner.routes';
import partnerAdminRoutes from './partner-admin.routes';
import orderRoutes from './order.routes';

const router = express.Router();

// Public partner routes (for app users)
router.use('/restaurants', restaurantRoutes);
router.use('/events', eventRoutes);
router.use('/gifts', giftRoutes);
router.use('/date-plans', datePlannerRoutes);
router.use('/orders', orderRoutes);

// Admin routes (for partner management)
router.use('/admin/partners', partnerAdminRoutes);
router.use('/admin/affiliates', affiliateRoutes);

export default router;
