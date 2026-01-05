/**
 * Device Routes
 * Endpoints for device registration and management
 */

import { Router } from 'express';

import { requireAuth } from '../../middleware/auth';
import { deviceController } from '../controllers/device.controller';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Device registration and management
router.post('/register', deviceController.registerDevice.bind(deviceController));
router.delete('/unregister', deviceController.unregisterDevice.bind(deviceController));
router.put('/update', deviceController.updateDevice.bind(deviceController));
router.put('/ping', deviceController.pingDevice.bind(deviceController));

// Device queries
router.get('/', deviceController.getUserDevices.bind(deviceController));
router.get('/stats', deviceController.getDeviceStats.bind(deviceController));
router.get('/:deviceId', deviceController.getDeviceById.bind(deviceController));

// Device deletion
router.delete('/', deviceController.deleteAllDevices.bind(deviceController));
router.delete('/platform/:platform', deviceController.deactivateByPlatform.bind(deviceController));

export default router;
