/**
 * SEO Audit Service
 * Comprehensive page analysis for SEO optimization
 */

import * as cheerio from 'cheerio';
import axios from 'axios';
import {
  SEOAuditResult,
  SEOIssue,
  SEOWarning,
  SEOCheck,
  SEOMetrics,
  SEORecommendation,
  ContentAnalysis,
  KeywordDensity,
  HeadingItem,
  LinkAnalysis,
  ImageAnalysis,
} from '../types';

// SEO Check codes
const SEO_CODES = {
  TITLE_MISSING: 'TITLE_MISSING',
  TITLE_TOO_SHORT: 'TITLE_TOO_SHORT',
  TITLE_TOO_LONG: 'TITLE_TOO_LONG',
  TITLE_DUPLICATE: 'TITLE_DUPLICATE',
  META_DESC_MISSING: 'META_DESC_MISSING',
  META_DESC_TOO_SHORT: 'META_DESC_TOO_SHORT',
  META_DESC_TOO_LONG: 'META_DESC_TOO_LONG',
  H1_MISSING: 'H1_MISSING',
  H1_MULTIPLE: 'H1_MULTIPLE',
  H1_TOO_LONG: 'H1_TOO_LONG',
  HEADING_ORDER: 'HEADING_ORDER',
  IMG_ALT_MISSING: 'IMG_ALT_MISSING',
  IMG_ALT_EMPTY: 'IMG_ALT_EMPTY',
  CANONICAL_MISSING: 'CANONICAL_MISSING',
  CANONICAL_INVALID: 'CANONICAL_INVALID',
  ROBOTS_BLOCKED: 'ROBOTS_BLOCKED',
  OG_TAGS_MISSING: 'OG_TAGS_MISSING',
  TWITTER_CARDS_MISSING: 'TWITTER_CARDS_MISSING',
  SCHEMA_MISSING: 'SCHEMA_MISSING',
  INTERNAL_LINKS_LOW: 'INTERNAL_LINKS_LOW',
  BROKEN_LINKS: 'BROKEN_LINKS',
  CONTENT_TOO_SHORT: 'CONTENT_TOO_SHORT',
  KEYWORD_STUFFING: 'KEYWORD_STUFFING',
  MOBILE_VIEWPORT_MISSING: 'MOBILE_VIEWPORT_MISSING',
  HTTPS_ISSUES: 'HTTPS_ISSUES',
  HREFLANG_MISSING: 'HREFLANG_MISSING',
  LOAD_TIME_SLOW: 'LOAD_TIME_SLOW',
};

export class SEOAuditService {
  private baseUrl: string;

  constructor(baseUrl: string = 'https://flamoral.com') {
    this.baseUrl = baseUrl;
  }

  /**
   * Perform comprehensive SEO audit on a URL
   */
  async auditUrl(url: string): Promise<SEOAuditResult> {
    const startTime = Date.now();

    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Flamoral-SEO-Bot/1.0',
        },
      });

      const loadTime = Date.now() - startTime;
      const html = response.data;
      const $ = cheerio.load(html);

      const issues: SEOIssue[] = [];
      const warnings: SEOWarning[] = [];
      const passed: SEOCheck[] = [];

      // Run all checks
      this.checkTitle($, issues, warnings, passed);
      this.checkMetaDescription($, issues, warnings, passed);
      this.checkHeadings($, issues, warnings, passed);
      this.checkImages($, issues, warnings, passed);
      this.checkCanonical($, url, issues, warnings, passed);
      this.checkRobots($, issues, warnings, passed);
      this.checkOpenGraph($, issues, warnings, passed);
      this.checkTwitterCards($, issues, warnings, passed);
      this.checkStructuredData($, issues, warnings, passed);
      this.checkMobileOptimization($, issues, warnings, passed);
      this.checkHTTPS(url, issues, warnings, passed);

      // Calculate metrics
      const metrics = this.calculateMetrics($, loadTime, html.length);

      // Check content quality
      const content = this.analyzeContent($);
      if (content.wordCount < 300) {
        warnings.push({
          code: SEO_CODES.CONTENT_TOO_SHORT,
          severity: 'warning',
          message: `Content is thin (${content.wordCount} words). Aim for at least 300+ words.`,
          suggestion: 'Add more valuable, relevant content to improve SEO.',
        });
      }

      // Check load time
      if (loadTime > 3000) {
        warnings.push({
          code: SEO_CODES.LOAD_TIME_SLOW,
          severity: 'warning',
          message: `Page load time is slow (${(loadTime / 1000).toFixed(2)}s). Aim for under 3 seconds.`,
          suggestion: 'Optimize images, minify CSS/JS, enable caching.',
        });
      }

      // Calculate score
      const score = this.calculateScore(issues, warnings, passed);

      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, warnings, metrics);

      return {
        url,
        timestamp: new Date(),
        score,
        issues,
        warnings,
        passed,
        metrics,
        recommendations,
      };
    } catch (error) {
      throw new Error(
        `Failed to audit URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check title tag
   */
  private checkTitle(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const title = $('title').text().trim();

    if (!title) {
      issues.push({
        code: SEO_CODES.TITLE_MISSING,
        severity: 'critical',
        message: 'Page title is missing.',
        suggestion: 'Add a descriptive title tag to the page.',
      });
      return;
    }

    if (title.length < 30) {
      warnings.push({
        code: SEO_CODES.TITLE_TOO_SHORT,
        severity: 'warning',
        message: `Title is too short (${title.length} chars). Aim for 50-60 characters.`,
        element: title,
        suggestion: 'Expand the title with relevant keywords.',
      });
    } else if (title.length > 60) {
      warnings.push({
        code: SEO_CODES.TITLE_TOO_LONG,
        severity: 'warning',
        message: `Title is too long (${title.length} chars). Keep under 60 characters.`,
        element: title,
        suggestion: 'Shorten the title while keeping key information.',
      });
    } else {
      passed.push({
        code: 'TITLE_OPTIMAL',
        message: `Title length is optimal (${title.length} chars).`,
      });
    }
  }

  /**
   * Check meta description
   */
  private checkMetaDescription(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const description = $('meta[name="description"]').attr('content')?.trim() || '';

    if (!description) {
      issues.push({
        code: SEO_CODES.META_DESC_MISSING,
        severity: 'error',
        message: 'Meta description is missing.',
        suggestion: 'Add a compelling meta description (150-160 chars).',
      });
      return;
    }

    if (description.length < 120) {
      warnings.push({
        code: SEO_CODES.META_DESC_TOO_SHORT,
        severity: 'warning',
        message: `Meta description is too short (${description.length} chars). Aim for 150-160 characters.`,
        element: description,
        suggestion: 'Expand the description with a clear call-to-action.',
      });
    } else if (description.length > 160) {
      warnings.push({
        code: SEO_CODES.META_DESC_TOO_LONG,
        severity: 'warning',
        message: `Meta description is too long (${description.length} chars). Keep under 160 characters.`,
        element: description,
        suggestion: 'Trim the description to avoid truncation in SERPs.',
      });
    } else {
      passed.push({
        code: 'META_DESC_OPTIMAL',
        message: `Meta description length is optimal (${description.length} chars).`,
      });
    }
  }

  /**
   * Check heading structure
   */
  private checkHeadings(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const h1s = $('h1');
    const h2s = $('h2');

    if (h1s.length === 0) {
      issues.push({
        code: SEO_CODES.H1_MISSING,
        severity: 'error',
        message: 'No H1 heading found on the page.',
        suggestion: 'Add a single, descriptive H1 heading.',
      });
    } else if (h1s.length > 1) {
      warnings.push({
        code: SEO_CODES.H1_MULTIPLE,
        severity: 'warning',
        message: `Multiple H1 headings found (${h1s.length}). Use only one H1 per page.`,
        suggestion: 'Convert extra H1s to H2 or lower.',
      });
    } else {
      const h1Text = h1s.first().text().trim();
      if (h1Text.length > 70) {
        warnings.push({
          code: SEO_CODES.H1_TOO_LONG,
          severity: 'warning',
          message: `H1 is too long (${h1Text.length} chars). Keep under 70 characters.`,
          element: h1Text,
        });
      } else {
        passed.push({
          code: 'H1_OPTIMAL',
          message: 'H1 heading is properly configured.',
        });
      }
    }

    // Check heading hierarchy
    let previousLevel = 0;
    let hierarchyValid = true;
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const level = parseInt(el.tagName[1]);
      if (level > previousLevel + 1 && previousLevel !== 0) {
        hierarchyValid = false;
      }
      previousLevel = level;
    });

    if (!hierarchyValid) {
      warnings.push({
        code: SEO_CODES.HEADING_ORDER,
        severity: 'warning',
        message: 'Heading hierarchy is not sequential (skipping levels).',
        suggestion: 'Use headings in proper order: H1 → H2 → H3, etc.',
      });
    }

    if (h2s.length >= 2) {
      passed.push({
        code: 'SUBHEADINGS_PRESENT',
        message: `Good use of subheadings (${h2s.length} H2 tags).`,
      });
    }
  }

  /**
   * Check images
   */
  private checkImages(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const images = $('img');
    const imagesWithoutAlt: string[] = [];
    const imagesWithEmptyAlt: string[] = [];

    images.each((_, img) => {
      const $img = $(img);
      const alt = $img.attr('alt');
      const src = $img.attr('src') || 'unknown';

      if (alt === undefined) {
        imagesWithoutAlt.push(src);
      } else if (alt.trim() === '') {
        imagesWithEmptyAlt.push(src);
      }
    });

    if (imagesWithoutAlt.length > 0) {
      issues.push({
        code: SEO_CODES.IMG_ALT_MISSING,
        severity: 'error',
        message: `${imagesWithoutAlt.length} image(s) missing alt attributes.`,
        element: imagesWithoutAlt.slice(0, 5).join(', '),
        suggestion: 'Add descriptive alt text to all images.',
      });
    }

    if (imagesWithEmptyAlt.length > 0) {
      warnings.push({
        code: SEO_CODES.IMG_ALT_EMPTY,
        severity: 'warning',
        message: `${imagesWithEmptyAlt.length} image(s) have empty alt attributes.`,
        element: imagesWithEmptyAlt.slice(0, 5).join(', '),
        suggestion: 'Add meaningful alt text or mark as decorative.',
      });
    }

    if (imagesWithoutAlt.length === 0 && imagesWithEmptyAlt.length === 0 && images.length > 0) {
      passed.push({
        code: 'IMAGES_ALT_COMPLETE',
        message: `All ${images.length} images have alt attributes.`,
      });
    }
  }

  /**
   * Check canonical tag
   */
  private checkCanonical(
    $: cheerio.CheerioAPI,
    url: string,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const canonical = $('link[rel="canonical"]').attr('href');

    if (!canonical) {
      warnings.push({
        code: SEO_CODES.CANONICAL_MISSING,
        severity: 'warning',
        message: 'Canonical URL is missing.',
        suggestion: 'Add a canonical tag to prevent duplicate content issues.',
      });
    } else {
      try {
        new URL(canonical);
        passed.push({
          code: 'CANONICAL_PRESENT',
          message: 'Canonical URL is properly set.',
        });
      } catch {
        issues.push({
          code: SEO_CODES.CANONICAL_INVALID,
          severity: 'error',
          message: 'Canonical URL is invalid.',
          element: canonical,
          suggestion: 'Use a valid absolute URL for the canonical tag.',
        });
      }
    }
  }

  /**
   * Check robots directives
   */
  private checkRobots(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const robots = $('meta[name="robots"]').attr('content') || '';
    const googlebot = $('meta[name="googlebot"]').attr('content') || '';

    const combined = `${robots} ${googlebot}`.toLowerCase();

    if (combined.includes('noindex')) {
      warnings.push({
        code: SEO_CODES.ROBOTS_BLOCKED,
        severity: 'warning',
        message: 'Page is set to noindex - search engines will not index this page.',
        suggestion: 'Remove noindex if this page should be indexed.',
      });
    } else {
      passed.push({
        code: 'ROBOTS_INDEXABLE',
        message: 'Page is indexable by search engines.',
      });
    }
  }

  /**
   * Check Open Graph tags
   */
  private checkOpenGraph(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    const ogUrl = $('meta[property="og:url"]').attr('content');

    const missing: string[] = [];
    if (!ogTitle) missing.push('og:title');
    if (!ogDescription) missing.push('og:description');
    if (!ogImage) missing.push('og:image');
    if (!ogUrl) missing.push('og:url');

    if (missing.length > 0) {
      warnings.push({
        code: SEO_CODES.OG_TAGS_MISSING,
        severity: 'warning',
        message: `Missing Open Graph tags: ${missing.join(', ')}`,
        suggestion: 'Add Open Graph tags for better social sharing.',
      });
    } else {
      passed.push({
        code: 'OG_TAGS_COMPLETE',
        message: 'All essential Open Graph tags are present.',
      });
    }
  }

  /**
   * Check Twitter Card tags
   */
  private checkTwitterCards(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const twitterCard = $('meta[name="twitter:card"]').attr('content');
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterDescription = $('meta[name="twitter:description"]').attr('content');

    if (!twitterCard) {
      warnings.push({
        code: SEO_CODES.TWITTER_CARDS_MISSING,
        severity: 'warning',
        message: 'Twitter Card tags are missing.',
        suggestion: 'Add Twitter Card meta tags for better Twitter sharing.',
      });
    } else {
      passed.push({
        code: 'TWITTER_CARDS_PRESENT',
        message: 'Twitter Card tags are configured.',
      });
    }
  }

  /**
   * Check structured data
   */
  private checkStructuredData(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const jsonLdScripts = $('script[type="application/ld+json"]');

    if (jsonLdScripts.length === 0) {
      warnings.push({
        code: SEO_CODES.SCHEMA_MISSING,
        severity: 'warning',
        message: 'No structured data (JSON-LD) found on the page.',
        suggestion: 'Add schema.org markup for rich snippets in search results.',
      });
    } else {
      let validSchemas = 0;
      jsonLdScripts.each((_, script) => {
        try {
          JSON.parse($(script).html() || '');
          validSchemas++;
        } catch {
          // Invalid JSON-LD
        }
      });

      if (validSchemas > 0) {
        passed.push({
          code: 'SCHEMA_PRESENT',
          message: `Found ${validSchemas} valid structured data block(s).`,
        });
      }
    }
  }

  /**
   * Check mobile optimization
   */
  private checkMobileOptimization(
    $: cheerio.CheerioAPI,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    const viewport = $('meta[name="viewport"]').attr('content');

    if (!viewport) {
      issues.push({
        code: SEO_CODES.MOBILE_VIEWPORT_MISSING,
        severity: 'error',
        message: 'Viewport meta tag is missing.',
        suggestion: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">',
      });
    } else if (viewport.includes('width=device-width')) {
      passed.push({
        code: 'MOBILE_OPTIMIZED',
        message: 'Page is mobile-optimized with proper viewport.',
      });
    }
  }

  /**
   * Check HTTPS
   */
  private checkHTTPS(
    url: string,
    issues: SEOIssue[],
    warnings: SEOWarning[],
    passed: SEOCheck[]
  ): void {
    if (url.startsWith('https://')) {
      passed.push({
        code: 'HTTPS_ENABLED',
        message: 'Page is served over HTTPS.',
      });
    } else {
      issues.push({
        code: SEO_CODES.HTTPS_ISSUES,
        severity: 'critical',
        message: 'Page is not served over HTTPS.',
        suggestion: 'Enable HTTPS for better security and SEO.',
      });
    }
  }

  /**
   * Calculate SEO metrics
   */
  private calculateMetrics($: cheerio.CheerioAPI, loadTime: number, pageSize: number): SEOMetrics {
    const title = $('title').text().trim();
    const description = $('meta[name="description"]').attr('content')?.trim() || '';

    const images = $('img');
    let imagesWithoutAlt = 0;
    images.each((_, img) => {
      if (!$(img).attr('alt')) imagesWithoutAlt++;
    });

    const internalLinks = $('a[href^="/"], a[href^="' + this.baseUrl + '"]').length;
    const externalLinks = $('a[href^="http"]').length - $('a[href^="' + this.baseUrl + '"]').length;

    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const words = bodyText.split(' ').filter((w) => w.length > 0);

    return {
      titleLength: title.length,
      descriptionLength: description.length,
      h1Count: $('h1').length,
      h2Count: $('h2').length,
      imageCount: images.length,
      imagesWithoutAlt,
      internalLinks,
      externalLinks,
      brokenLinks: 0, // Would require additional requests to verify
      wordCount: words.length,
      readabilityScore: this.calculateReadability(bodyText),
      keywordDensity: this.calculateKeywordDensity(words),
      loadTime,
      pageSize,
    };
  }

  /**
   * Calculate readability score (simplified Flesch-Kincaid)
   */
  private calculateReadability(text: string): number {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const syllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);

    if (sentences.length === 0 || words.length === 0) return 0;

    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    // Flesch Reading Ease formula
    const score = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Count syllables in a word (simplified)
   */
  private countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Calculate keyword density
   */
  private calculateKeywordDensity(words: string[]): Record<string, number> {
    const wordCount: Record<string, number> = {};
    const totalWords = words.length;

    // Count word frequency
    for (const word of words) {
      const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalized.length > 3) {
        // Ignore short words
        wordCount[normalized] = (wordCount[normalized] || 0) + 1;
      }
    }

    // Calculate density and get top keywords
    const density: Record<string, number> = {};
    const sorted = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    for (const [word, count] of sorted) {
      density[word] = Math.round((count / totalWords) * 1000) / 10; // percentage
    }

    return density;
  }

  /**
   * Calculate overall SEO score
   */
  private calculateScore(issues: SEOIssue[], warnings: SEOWarning[], passed: SEOCheck[]): number {
    const criticalPenalty = issues.filter((i) => i.severity === 'critical').length * 15;
    const errorPenalty = issues.filter((i) => i.severity === 'error').length * 10;
    const warningPenalty = warnings.length * 3;
    const passedBonus = passed.length * 2;

    const score = 100 - criticalPenalty - errorPenalty - warningPenalty + passedBonus;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Generate SEO recommendations
   */
  private generateRecommendations(
    issues: SEOIssue[],
    warnings: SEOWarning[],
    metrics: SEOMetrics
  ): SEORecommendation[] {
    const recommendations: SEORecommendation[] = [];

    // Critical issues first
    for (const issue of issues) {
      recommendations.push({
        priority: issue.severity === 'critical' ? 'high' : 'high',
        category: this.getCategory(issue.code),
        title: this.getRecommendationTitle(issue.code),
        description: issue.message,
        impact: 'Direct impact on search rankings and indexability.',
      });
    }

    // Then warnings
    for (const warning of warnings) {
      recommendations.push({
        priority: 'medium',
        category: this.getCategory(warning.code),
        title: this.getRecommendationTitle(warning.code),
        description: warning.message,
        impact: 'May affect click-through rates and user experience.',
      });
    }

    // Content-based recommendations
    if (metrics.wordCount < 500) {
      recommendations.push({
        priority: 'medium',
        category: 'Content',
        title: 'Increase content depth',
        description: `Current word count (${metrics.wordCount}) is below recommended minimum.`,
        impact: 'Longer, comprehensive content tends to rank better.',
      });
    }

    if (metrics.internalLinks < 3) {
      recommendations.push({
        priority: 'low',
        category: 'Links',
        title: 'Add more internal links',
        description: `Only ${metrics.internalLinks} internal links found.`,
        impact:
          'Internal linking helps search engines discover content and distribute page authority.',
      });
    }

    return recommendations;
  }

  /**
   * Get category for SEO code
   */
  private getCategory(code: string): string {
    const categories: Record<string, string> = {
      [SEO_CODES.TITLE_MISSING]: 'Meta Tags',
      [SEO_CODES.TITLE_TOO_SHORT]: 'Meta Tags',
      [SEO_CODES.TITLE_TOO_LONG]: 'Meta Tags',
      [SEO_CODES.META_DESC_MISSING]: 'Meta Tags',
      [SEO_CODES.META_DESC_TOO_SHORT]: 'Meta Tags',
      [SEO_CODES.META_DESC_TOO_LONG]: 'Meta Tags',
      [SEO_CODES.H1_MISSING]: 'Content',
      [SEO_CODES.H1_MULTIPLE]: 'Content',
      [SEO_CODES.HEADING_ORDER]: 'Content',
      [SEO_CODES.IMG_ALT_MISSING]: 'Images',
      [SEO_CODES.IMG_ALT_EMPTY]: 'Images',
      [SEO_CODES.CANONICAL_MISSING]: 'Technical',
      [SEO_CODES.OG_TAGS_MISSING]: 'Social',
      [SEO_CODES.TWITTER_CARDS_MISSING]: 'Social',
      [SEO_CODES.SCHEMA_MISSING]: 'Technical',
      [SEO_CODES.MOBILE_VIEWPORT_MISSING]: 'Mobile',
      [SEO_CODES.HTTPS_ISSUES]: 'Security',
    };
    return categories[code] || 'General';
  }

  /**
   * Get recommendation title for SEO code
   */
  private getRecommendationTitle(code: string): string {
    const titles: Record<string, string> = {
      [SEO_CODES.TITLE_MISSING]: 'Add page title',
      [SEO_CODES.TITLE_TOO_SHORT]: 'Expand page title',
      [SEO_CODES.TITLE_TOO_LONG]: 'Shorten page title',
      [SEO_CODES.META_DESC_MISSING]: 'Add meta description',
      [SEO_CODES.META_DESC_TOO_SHORT]: 'Expand meta description',
      [SEO_CODES.META_DESC_TOO_LONG]: 'Shorten meta description',
      [SEO_CODES.H1_MISSING]: 'Add H1 heading',
      [SEO_CODES.H1_MULTIPLE]: 'Use single H1 heading',
      [SEO_CODES.HEADING_ORDER]: 'Fix heading hierarchy',
      [SEO_CODES.IMG_ALT_MISSING]: 'Add image alt text',
      [SEO_CODES.IMG_ALT_EMPTY]: 'Fill empty alt attributes',
      [SEO_CODES.CANONICAL_MISSING]: 'Add canonical URL',
      [SEO_CODES.OG_TAGS_MISSING]: 'Add Open Graph tags',
      [SEO_CODES.TWITTER_CARDS_MISSING]: 'Add Twitter Card tags',
      [SEO_CODES.SCHEMA_MISSING]: 'Add structured data',
      [SEO_CODES.MOBILE_VIEWPORT_MISSING]: 'Add viewport meta tag',
      [SEO_CODES.HTTPS_ISSUES]: 'Enable HTTPS',
    };
    return titles[code] || 'Fix SEO issue';
  }

  /**
   * Analyze page content
   */
  analyzeContent($: cheerio.CheerioAPI): ContentAnalysis {
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const sentences = bodyText.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = $('p').length;
    const words = bodyText.split(/\s+/).filter((w) => w.length > 0);

    // Heading structure
    const headings: HeadingItem[] = [];
    $('h1, h2, h3, h4, h5, h6').each((_, el) => {
      const level = parseInt(el.tagName[1]);
      const text = $(el).text().trim();
      headings.push({
        level,
        text,
        issues: [],
      });
    });

    // Links analysis
    const links: LinkAnalysis = {
      total: $('a').length,
      internal: $('a[href^="/"], a[href^="' + this.baseUrl + '"]').length,
      external: 0,
      noFollow: $('a[rel*="nofollow"]').length,
      broken: [],
      suggestions: [],
    };
    links.external = links.total - links.internal;

    // Images analysis
    const images: ImageAnalysis = {
      total: $('img').length,
      withAlt: 0,
      withoutAlt: [],
      optimized: 0,
      unoptimized: [],
    };

    $('img').each((_, img) => {
      const $img = $(img);
      const alt = $img.attr('alt');
      const src = $img.attr('src') || '';

      if (alt && alt.trim()) {
        images.withAlt++;
      } else {
        images.withoutAlt.push(src);
      }

      // Check for modern formats
      if (src.match(/\.(webp|avif)$/i)) {
        images.optimized++;
      } else if (src.match(/\.(jpg|jpeg|png|gif)$/i)) {
        images.unoptimized.push(src);
      }
    });

    return {
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs,
      avgWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
      avgSentencesPerParagraph: paragraphs > 0 ? Math.round(sentences.length / paragraphs) : 0,
      readabilityScore: this.calculateReadability(bodyText),
      readabilityGrade: this.getReadabilityGrade(this.calculateReadability(bodyText)),
      keywordDensity: this.getKeywordDensityArray(words),
      headingStructure: headings,
      links,
      images,
    };
  }

  /**
   * Get readability grade from score
   */
  private getReadabilityGrade(score: number): string {
    if (score >= 90) return 'Very Easy (5th grade)';
    if (score >= 80) return 'Easy (6th grade)';
    if (score >= 70) return 'Fairly Easy (7th grade)';
    if (score >= 60) return 'Standard (8th-9th grade)';
    if (score >= 50) return 'Fairly Difficult (10th-12th grade)';
    if (score >= 30) return 'Difficult (College)';
    return 'Very Difficult (Graduate)';
  }

  /**
   * Get keyword density as array
   */
  private getKeywordDensityArray(words: string[]): KeywordDensity[] {
    const density = this.calculateKeywordDensity(words);
    return Object.entries(density).map(([keyword, densityValue]) => ({
      keyword,
      count: Math.round((densityValue / 100) * words.length),
      density: densityValue,
      inTitle: false, // Would need title to check
      inH1: false, // Would need H1 to check
      inMeta: false, // Would need meta to check
      positions: [],
    }));
  }
}

export const seoAuditService = new SEOAuditService();
