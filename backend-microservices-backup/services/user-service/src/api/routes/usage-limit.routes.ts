import { Router } from 'express';
import { UsageLimitController } from '../controllers/usage-limit.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { resourceTypeParamsSchema } from '../validators/usage-limit.validator';

const router = Router();
const usageLimitController = new UsageLimitController();

router.get('/limits', authenticate, usageLimitController.getUserLimits.bind(usageLimitController));
router.get('/check/:resourceType', authenticate, validate(resourceTypeParamsSchema, 'params'), usageLimitController.checkLimit.bind(usageLimitController));
router.get('/usage/:resourceType', authenticate, validate(resourceTypeParamsSchema, 'params'), usageLimitController.getResourceUsage.bind(usageLimitController));

export default router;
