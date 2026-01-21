/**
 * SEO API Controller
 * Handles all SEO-related API endpoints
 */

import { Request, Response } from 'express';
import { sitemapService, SitemapService } from '../../services/sitemap.service';
import { seoAuditService, SEOAuditService } from '../../services/seo-audit.service';
import { redirectService, RedirectService } from '../../services/redirect.service';
import {
  coreWebVitalsService,
  seoHealthScoreService,
} from '../../services/core-web-vitals.service';

export class SEOController {
  // ========================================================================
  // SITEMAP ENDPOINTS
  // ========================================================================

  /**
   * GET /api/seo/sitemap.xml - Get main sitemap
   */
  async getSitemap(req: Request, res: Response): Promise<void> {
    try {
      const sitemap = sitemapService.generateStaticSitemap();
      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate sitemap' });
    }
  }

  /**
   * GET /api/seo/sitemap/blog.xml - Get blog sitemap
   */
  async getBlogSitemap(req: Request, res: Response): Promise<void> {
    try {
      // In production, this would fetch from database
      const posts: Array<{ slug: string; publishedAt: string; updatedAt?: string }> = [];
      const sitemap = sitemapService.generateBlogSitemap(posts);
      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate blog sitemap' });
    }
  }

  /**
   * GET /api/seo/robots.txt - Get robots.txt
   */
  async getRobotsTxt(req: Request, res: Response): Promise<void> {
    try {
      const robotsTxt = sitemapService.generateRobotsTxt({
        sitemapUrls: [
          'https://flamoral.com/sitemap.xml',
          'https://flamoral.com/sitemap-static.xml',
        ],
      });
      res.set('Content-Type', 'text/plain');
      res.send(robotsTxt);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate robots.txt' });
    }
  }

  // ========================================================================
  // AUDIT ENDPOINTS
  // ========================================================================

  /**
   * POST /api/seo/audit - Run SEO audit on URL
   */
  async runAudit(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.body;

      if (!url) {
        res.status(400).json({ error: 'URL is required' });
        return;
      }

      const result = await seoAuditService.auditUrl(url);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to run SEO audit',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/seo/analyze-content - Analyze page content
   */
  async analyzeContent(req: Request, res: Response): Promise<void> {
    try {
      const { url, html } = req.body;

      if (!url && !html) {
        res.status(400).json({ error: 'Either URL or HTML content is required' });
        return;
      }

      // If URL provided, fetch and analyze
      // If HTML provided, analyze directly
      // For now, we'll return a placeholder response
      res.json({
        message: 'Content analysis endpoint',
        url,
        hasHtml: !!html,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze content' });
    }
  }

  // ========================================================================
  // REDIRECT ENDPOINTS
  // ========================================================================

  /**
   * GET /api/seo/redirects - Get all redirects
   */
  async getRedirects(req: Request, res: Response): Promise<void> {
    try {
      const { enabled, type, sortBy, sortOrder, limit, offset } = req.query;

      const result = redirectService.getAll({
        enabled: enabled !== undefined ? enabled === 'true' : undefined,
        type: type ? (parseInt(type as string) as 301 | 302 | 307 | 308) : undefined,
        sortBy: sortBy as 'source' | 'hits' | 'createdAt' | 'updatedAt' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch redirects' });
    }
  }

  /**
   * POST /api/seo/redirects - Create redirect
   */
  async createRedirect(req: Request, res: Response): Promise<void> {
    try {
      const { source, destination, type, notes } = req.body;

      if (!source || !destination) {
        res.status(400).json({ error: 'Source and destination are required' });
        return;
      }

      const redirect = redirectService.create({ source, destination, type, notes });
      res.status(201).json(redirect);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to create redirect',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/seo/redirects/:id - Update redirect
   */
  async updateRedirect(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const redirect = redirectService.update(id, updates);
      res.json(redirect);
    } catch (error) {
      res.status(400).json({
        error: 'Failed to update redirect',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/seo/redirects/:id - Delete redirect
   */
  async deleteRedirect(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = redirectService.delete(id);

      if (deleted) {
        res.status(204).send();
      } else {
        res.status(404).json({ error: 'Redirect not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete redirect' });
    }
  }

  /**
   * POST /api/seo/redirects/bulk - Bulk import redirects
   */
  async bulkImportRedirects(req: Request, res: Response): Promise<void> {
    try {
      const { redirects } = req.body;

      if (!Array.isArray(redirects)) {
        res.status(400).json({ error: 'Redirects must be an array' });
        return;
      }

      const result = redirectService.bulkImport(redirects);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to import redirects' });
    }
  }

  /**
   * GET /api/seo/redirects/export/:format - Export redirects
   */
  async exportRedirects(req: Request, res: Response): Promise<void> {
    try {
      const { format } = req.params;
      const validFormats = ['json', 'csv', 'nginx', 'apache', 'netlify', 'vercel'];

      if (!validFormats.includes(format)) {
        res
          .status(400)
          .json({ error: `Invalid format. Valid formats: ${validFormats.join(', ')}` });
        return;
      }

      const exported = redirectService.export(
        format as 'json' | 'csv' | 'nginx' | 'apache' | 'netlify' | 'vercel'
      );

      const contentTypes: Record<string, string> = {
        json: 'application/json',
        csv: 'text/csv',
        nginx: 'text/plain',
        apache: 'text/plain',
        netlify: 'text/plain',
        vercel: 'application/json',
      };

      res.set('Content-Type', contentTypes[format]);
      res.set(
        'Content-Disposition',
        `attachment; filename=redirects.${format === 'nginx' || format === 'apache' || format === 'netlify' ? 'txt' : format}`
      );
      res.send(exported);
    } catch (error) {
      res.status(500).json({ error: 'Failed to export redirects' });
    }
  }

  /**
   * GET /api/seo/redirects/statistics - Get redirect statistics
   */
  async getRedirectStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = redirectService.getStatistics();
      res.json(statistics);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch redirect statistics' });
    }
  }

  /**
   * GET /api/seo/redirects/chains - Get redirect chains
   */
  async getRedirectChains(req: Request, res: Response): Promise<void> {
    try {
      const chains = redirectService.getRedirectChains();
      res.json(chains);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch redirect chains' });
    }
  }

  // ========================================================================
  // CORE WEB VITALS ENDPOINTS
  // ========================================================================

  /**
   * POST /api/seo/vitals - Record Core Web Vitals
   */
  async recordVitals(req: Request, res: Response): Promise<void> {
    try {
      const vitalsData = req.body;

      // In production, this would store in database
      // For now, just acknowledge receipt
      res.status(202).json({ received: true, timestamp: Date.now() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to record vitals' });
    }
  }

  /**
   * GET /api/seo/vitals/script - Get Core Web Vitals tracking script
   */
  async getVitalsScript(req: Request, res: Response): Promise<void> {
    try {
      const script = coreWebVitalsService.getClientScript();
      res.set('Content-Type', 'text/html');
      res.send(script);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate vitals script' });
    }
  }

  /**
   * GET /api/seo/vitals/report - Get Core Web Vitals report
   */
  async getVitalsReport(req: Request, res: Response): Promise<void> {
    try {
      const { url, startDate, endDate, device } = req.query;

      // In production, this would fetch from database
      res.json({
        url,
        period: { start: startDate, end: endDate },
        device,
        metrics: {
          lcp: { value: 2100, rating: 'good' },
          fid: { value: 50, rating: 'good' },
          cls: { value: 0.08, rating: 'good' },
          ttfb: { value: 600, rating: 'good' },
          fcp: { value: 1500, rating: 'good' },
          inp: { value: 150, rating: 'good' },
        },
        score: 92,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch vitals report' });
    }
  }

  // ========================================================================
  // HEALTH SCORE ENDPOINTS
  // ========================================================================

  /**
   * GET /api/seo/health - Get SEO health score
   */
  async getHealthScore(req: Request, res: Response): Promise<void> {
    try {
      // In production, this would aggregate real data
      const healthScore = seoHealthScoreService.calculateHealthScore({
        auditScore: 85,
        performanceScore: 90,
        mobileScore: 88,
        securityScore: 95,
        accessibilityScore: 82,
        backlinkScore: 70,
        contentScore: 80,
      });

      res.json(healthScore);
    } catch (error) {
      res.status(500).json({ error: 'Failed to calculate health score' });
    }
  }

  /**
   * GET /api/seo/health/priorities - Get improvement priorities
   */
  async getImprovementPriorities(req: Request, res: Response): Promise<void> {
    try {
      const healthScore = seoHealthScoreService.calculateHealthScore({
        auditScore: 85,
        performanceScore: 90,
        mobileScore: 88,
        securityScore: 95,
        accessibilityScore: 82,
        backlinkScore: 70,
        contentScore: 80,
      });

      const priorities = seoHealthScoreService.getImprovementPriorities(healthScore);
      res.json(priorities);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch improvement priorities' });
    }
  }

  // ========================================================================
  // SCHEMA MARKUP ENDPOINTS
  // ========================================================================

  /**
   * POST /api/seo/schema/validate - Validate JSON-LD schema
   */
  async validateSchema(req: Request, res: Response): Promise<void> {
    try {
      const { schema } = req.body;

      if (!schema) {
        res.status(400).json({ error: 'Schema is required' });
        return;
      }

      // Basic validation
      const errors: string[] = [];

      if (!schema['@context']) {
        errors.push('Missing @context property');
      }
      if (!schema['@type']) {
        errors.push('Missing @type property');
      }

      res.json({
        valid: errors.length === 0,
        errors,
        schema,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to validate schema' });
    }
  }

  /**
   * POST /api/seo/schema/generate - Generate schema markup
   */
  async generateSchema(req: Request, res: Response): Promise<void> {
    try {
      const { type, data } = req.body;

      if (!type || !data) {
        res.status(400).json({ error: 'Type and data are required' });
        return;
      }

      // Schema generation would happen here based on type
      const schema = {
        '@context': 'https://schema.org',
        '@type': type,
        ...data,
      };

      res.json({ schema });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate schema' });
    }
  }

  // ========================================================================
  // KEYWORD ENDPOINTS
  // ========================================================================

  /**
   * POST /api/seo/keywords/analyze - Analyze keywords for content
   */
  async analyzeKeywords(req: Request, res: Response): Promise<void> {
    try {
      const { content, targetKeywords } = req.body;

      if (!content) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      // Basic keyword analysis
      const words = content.toLowerCase().split(/\s+/);
      const wordCount: Record<string, number> = {};

      for (const word of words) {
        const cleaned = word.replace(/[^a-z0-9]/g, '');
        if (cleaned.length > 3) {
          wordCount[cleaned] = (wordCount[cleaned] || 0) + 1;
        }
      }

      const density = Object.entries(wordCount)
        .map(([word, count]) => ({
          word,
          count,
          density: ((count / words.length) * 100).toFixed(2),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const targetAnalysis = targetKeywords?.map((keyword: string) => ({
        keyword,
        count: wordCount[keyword.toLowerCase()] || 0,
        density: wordCount[keyword.toLowerCase()]
          ? ((wordCount[keyword.toLowerCase()] / words.length) * 100).toFixed(2)
          : '0.00',
      }));

      res.json({
        wordCount: words.length,
        topKeywords: density,
        targetKeywords: targetAnalysis,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to analyze keywords' });
    }
  }

  /**
   * POST /api/seo/keywords/suggestions - Get keyword suggestions
   */
  async getKeywordSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { seedKeyword, count = 10 } = req.body;

      if (!seedKeyword) {
        res.status(400).json({ error: 'Seed keyword is required' });
        return;
      }

      // In production, this would use an API or ML model
      // For now, return placeholder suggestions
      const suggestions = [
        { keyword: `${seedKeyword} tips`, type: 'related', relevance: 0.9 },
        { keyword: `best ${seedKeyword}`, type: 'long-tail', relevance: 0.85 },
        { keyword: `how to ${seedKeyword}`, type: 'question', relevance: 0.8 },
        { keyword: `${seedKeyword} guide`, type: 'related', relevance: 0.75 },
        { keyword: `${seedKeyword} for beginners`, type: 'long-tail', relevance: 0.7 },
      ];

      res.json({ seedKeyword, suggestions: suggestions.slice(0, count) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get keyword suggestions' });
    }
  }
}

export const seoController = new SEOController();
