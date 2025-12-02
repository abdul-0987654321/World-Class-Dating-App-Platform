import { Router } from 'express';
import { TravelModeController } from '../controllers/travel-mode.controller';
import { Knex } from 'knex';

export function createTravelModeRoutes(db: Knex): Router {
  const router = Router();
  const controller = new TravelModeController(db);

  // Travel mode status and overview
  router.get('/status', controller.getTravelModeStatus);
  router.get('/features/premium', controller.getPremiumTravelFeatures);

  // Travel destinations
  router.post('/destinations', controller.createTravelDestination);
  router.get('/destinations', controller.getTravelDestinations);
  router.get('/destinations/active', controller.getActiveTravelDestination);
  router.put('/destinations/:destinationId', controller.updateTravelDestination);
  router.delete('/destinations/:destinationId', controller.cancelTravelDestination);

  // Travel mode settings
  router.get('/settings', controller.getTravelModeSettings);
  router.put('/settings', controller.updateTravelModeSettings);

  // Passport feature (change location anytime)
  router.post('/passport/change-location', controller.changeLocationWithPassport);
  router.get('/passport/history', controller.getLocationHistory);

  // Travel history
  router.get('/history', controller.getTravelHistory);

  // Popular destinations
  router.get('/popular-destinations', controller.getPopularDestinations);

  // Travel buddy preferences
  router.get('/travel-buddy/preferences', controller.getTravelBuddyPreferences);
  router.put('/travel-buddy/preferences', controller.updateTravelBuddyPreferences);

  return router;
}
