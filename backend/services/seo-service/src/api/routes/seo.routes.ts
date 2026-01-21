/**
 * SEO API Routes
 */

import { Router } from 'express';
import { seoController } from '../controllers/seo.controller';

const router = Router();

// ========================================================================
// SITEMAP ROUTES
// ========================================================================

router.get('/sitemap.xml', (req, res) => seoController.getSitemap(req, res));
router.get('/sitemap/blog.xml', (req, res) => seoController.getBlogSitemap(req, res));
router.get('/robots.txt', (req, res) => seoController.getRobotsTxt(req, res));

// ========================================================================
// AUDIT ROUTES
// ========================================================================

router.post('/audit', (req, res) => seoController.runAudit(req, res));
router.post('/analyze-content', (req, res) => seoController.analyzeContent(req, res));

// ========================================================================
// REDIRECT ROUTES
// ========================================================================

router.get('/redirects', (req, res) => seoController.getRedirects(req, res));
router.post('/redirects', (req, res) => seoController.createRedirect(req, res));
router.put('/redirects/:id', (req, res) => seoController.updateRedirect(req, res));
router.delete('/redirects/:id', (req, res) => seoController.deleteRedirect(req, res));
router.post('/redirects/bulk', (req, res) => seoController.bulkImportRedirects(req, res));
router.get('/redirects/export/:format', (req, res) => seoController.exportRedirects(req, res));
router.get('/redirects/statistics', (req, res) => seoController.getRedirectStatistics(req, res));
router.get('/redirects/chains', (req, res) => seoController.getRedirectChains(req, res));

// ========================================================================
// CORE WEB VITALS ROUTES
// ========================================================================

router.post('/vitals', (req, res) => seoController.recordVitals(req, res));
router.get('/vitals/script', (req, res) => seoController.getVitalsScript(req, res));
router.get('/vitals/report', (req, res) => seoController.getVitalsReport(req, res));

// ========================================================================
// HEALTH SCORE ROUTES
// ========================================================================

router.get('/health', (req, res) => seoController.getHealthScore(req, res));
router.get('/health/priorities', (req, res) => seoController.getImprovementPriorities(req, res));

// ========================================================================
// SCHEMA MARKUP ROUTES
// ========================================================================

router.post('/schema/validate', (req, res) => seoController.validateSchema(req, res));
router.post('/schema/generate', (req, res) => seoController.generateSchema(req, res));

// ========================================================================
// KEYWORD ROUTES
// ========================================================================

router.post('/keywords/analyze', (req, res) => seoController.analyzeKeywords(req, res));
router.post('/keywords/suggestions', (req, res) => seoController.getKeywordSuggestions(req, res));

export default router;
