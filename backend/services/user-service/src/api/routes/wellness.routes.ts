import { Router } from 'express';
import { WellnessController } from '../controllers/wellness.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const controller = new WellnessController();

/**
 * Wellness Routes
 *
 * Mental health check-in and wellness feature endpoints.
 * All routes require authentication except for public resources.
 */

// =============================================
// PUBLIC ROUTES - No authentication required
// =============================================

/**
 * @route GET /api/v1/wellness/resources
 * @desc Get wellness resources (articles, apps, hotlines)
 * @query category - Filter by resource category
 * @query country - Filter by country code
 * @query crisis - If 'true', only return crisis resources
 * @access Public
 */
router.get('/resources', controller.getResources);

/**
 * @route GET /api/v1/wellness/resources/crisis
 * @desc Get crisis support resources (hotlines, emergency contacts)
 * @query country - Filter by country code
 * @access Public
 */
router.get('/resources/crisis', controller.getCrisisResources);

/**
 * @route GET /api/v1/wellness/affirmations
 * @desc Get positive affirmations
 * @query category - Filter by affirmation category
 * @query mood - Filter by mood tag
 * @query limit - Number of affirmations to return (default 5)
 * @access Public
 */
router.get('/affirmations', controller.getAffirmations);

/**
 * @route GET /api/v1/wellness/prompts
 * @desc Get reflection prompts
 * @query type - Filter by prompt type (daily, weekly, milestone, etc.)
 * @query category - Filter by category
 * @access Public
 */
router.get('/prompts', controller.getReflectionPrompts);

// =============================================
// PROTECTED ROUTES - Authentication required
// =============================================
router.use(authenticate);

// ---------- Dashboard & Overview ----------

/**
 * @route GET /api/v1/wellness/dashboard
 * @desc Get comprehensive wellness dashboard with all key metrics
 * @access Private
 */
router.get('/dashboard', controller.getDashboard);

/**
 * @route GET /api/v1/wellness/score
 * @desc Get user's current wellness score
 * @access Private
 */
router.get('/score', controller.getWellnessScore);

/**
 * @route GET /api/v1/wellness/mood-trend
 * @desc Get mood trend analysis over time
 * @query days - Number of days to analyze (default 30)
 * @access Private
 */
router.get('/mood-trend', controller.getMoodTrend);

// ---------- Check-ins ----------

/**
 * @route POST /api/v1/wellness/check-ins
 * @desc Create a new mental health check-in
 * @body moodScore - Required, 1-10
 * @body energyLevel - Optional, 1-10
 * @body anxietyLevel - Optional, 1-10
 * @body stressLevel - Optional, 1-10
 * @body datingConfidence - Optional, 1-10
 * @body socialSatisfaction - Optional, 1-10
 * @body feelings - Optional, array of feeling tags
 * @body datingExperiences - Optional, array of experience tags
 * @body reflectionNotes - Optional, encrypted text notes
 * @body checkInType - Optional, defaults to 'manual'
 * @access Private
 */
router.post('/check-ins', controller.createCheckIn);

/**
 * @route GET /api/v1/wellness/check-ins
 * @desc Get check-in history
 * @query limit - Number of records to return (default 20)
 * @query offset - Pagination offset
 * @query type - Filter by check-in type
 * @query startDate - Start of date range
 * @query endDate - End of date range
 * @query includeReflections - If 'true', include decrypted reflection notes
 * @access Private
 */
router.get('/check-ins', controller.getCheckInHistory);

// ---------- Mental Health Breaks ----------

/**
 * @route POST /api/v1/wellness/breaks
 * @desc Enable a mental health break (pauses profile visibility)
 * @body duration - Required, number of days (1-90)
 * @body breakType - Optional, type of break
 * @body reason - Optional, encrypted reason
 * @access Private
 */
router.post('/breaks', controller.enableBreak);

/**
 * @route DELETE /api/v1/wellness/breaks
 * @desc End a mental health break early
 * @access Private
 */
router.delete('/breaks', controller.endBreak);

/**
 * @route PUT /api/v1/wellness/breaks/extend
 * @desc Extend current mental health break
 * @body additionalDays - Required, number of days to extend (1-30)
 * @access Private
 */
router.put('/breaks/extend', controller.extendBreak);

/**
 * @route GET /api/v1/wellness/breaks/suggestion
 * @desc Get AI-powered break suggestion based on user patterns
 * @access Private
 */
router.get('/breaks/suggestion', controller.getBreakSuggestion);

// ---------- Personalized Content ----------

/**
 * @route GET /api/v1/wellness/affirmations/personalized
 * @desc Get personalized affirmation based on recent mood
 * @access Private
 */
router.get('/affirmations/personalized', controller.getPersonalizedAffirmation);

/**
 * @route GET /api/v1/wellness/prompts/today
 * @desc Get today's reflection prompt (daily or weekly based on day)
 * @access Private
 */
router.get('/prompts/today', controller.getTodaysPrompt);

/**
 * @route POST /api/v1/wellness/prompts/:promptId/response
 * @desc Save reflection response for a prompt
 * @param promptId - ID of the reflection prompt
 * @body response - Required, the user's reflection text (will be encrypted)
 * @body checkInId - Optional, link to a check-in
 * @access Private
 */
router.post('/prompts/:promptId/response', controller.saveReflectionResponse);

// ---------- Distress Detection ----------

/**
 * @route GET /api/v1/wellness/distress-check
 * @desc Check for distress signals based on user patterns
 * @access Private
 */
router.get('/distress-check', controller.checkDistress);

// ---------- Settings ----------

/**
 * @route GET /api/v1/wellness/settings
 * @desc Get user's wellness settings
 * @access Private
 */
router.get('/settings', controller.getSettings);

/**
 * @route PUT /api/v1/wellness/settings
 * @desc Update wellness settings
 * @body dailyCheckinEnabled - Optional
 * @body weeklyCheckinEnabled - Optional
 * @body preferredCheckinTime - Optional, HH:MM format
 * @body timezone - Optional
 * @body checkinDays - Optional, array of day numbers (1-7)
 * @body reminderNotifications - Optional
 * @body affirmationNotifications - Optional
 * @body resourceSuggestions - Optional
 * @body crisisDetectionEnabled - Optional
 * @body suggestBreaks - Optional
 * @body breakSuggestionThreshold - Optional
 * @body dataRetentionDays - Optional, 7-365
 * @body shareAnonymousStats - Optional
 * @access Private
 */
router.put('/settings', controller.updateSettings);

// ---------- Privacy & Data Management ----------

/**
 * @route GET /api/v1/wellness/export
 * @desc Export all wellness data (GDPR compliance)
 * @access Private
 */
router.get('/export', controller.exportData);

/**
 * @route DELETE /api/v1/wellness/data
 * @desc Delete all wellness data permanently (GDPR compliance)
 * @body confirm - Required, must be "DELETE_ALL_WELLNESS_DATA"
 * @access Private
 */
router.delete('/data', controller.deleteAllData);

// ---------- Internal Tracking ----------

/**
 * @route POST /api/v1/wellness/track-usage
 * @desc Record usage metrics for wellness analysis
 * @body swipesSent - Optional
 * @body matchesReceived - Optional
 * @body rejectionsReceived - Optional
 * @body messagesSent - Optional
 * @body messagesReceived - Optional
 * @body sessionCount - Optional
 * @body totalSessionMinutes - Optional
 * @access Private
 */
router.post('/track-usage', controller.trackUsage);

export default router;
