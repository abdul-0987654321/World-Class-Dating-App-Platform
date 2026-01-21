/**
 * Core Web Vitals Monitoring Service
 * Tracks LCP, FID, CLS, TTFB, FCP, and INP metrics
 */

import {
  CoreWebVitals,
  WebVitalMetric,
  SEOHealthScore,
  SEOScoreBreakdown,
  SEOScoreTrend,
} from '../types';

// Thresholds based on Google's Core Web Vitals guidelines
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // milliseconds
  FID: { good: 100, poor: 300 }, // milliseconds
  CLS: { good: 0.1, poor: 0.25 }, // score
  TTFB: { good: 800, poor: 1800 }, // milliseconds
  FCP: { good: 1800, poor: 3000 }, // milliseconds
  INP: { good: 200, poor: 500 }, // milliseconds
};

export class CoreWebVitalsService {
  /**
   * Generate client-side Core Web Vitals measurement script
   */
  getClientScript(): string {
    return `
<!-- Core Web Vitals Measurement -->
<script type="module">
import {onCLS, onFID, onLCP, onFCP, onTTFB, onINP} from 'https://unpkg.com/web-vitals@3/dist/web-vitals.attribution.js?module';

const vitalsEndpoint = '/api/seo/vitals';

function sendToAnalytics(metric) {
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    attribution: metric.attribution,
    url: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now()
  });

  // Use sendBeacon for reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon(vitalsEndpoint, body);
  } else {
    fetch(vitalsEndpoint, {
      body,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true
    });
  }
}

// Measure all Core Web Vitals
onCLS(sendToAnalytics);
onFID(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
onINP(sendToAnalytics);
</script>`;
  }

  /**
   * Rate a metric value based on thresholds
   */
  rateMetric(
    name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP',
    value: number
  ): WebVitalMetric['rating'] {
    const threshold = THRESHOLDS[name];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Create a WebVitalMetric object
   */
  createMetric(
    name: 'LCP' | 'FID' | 'CLS' | 'TTFB' | 'FCP' | 'INP',
    value: number,
    percentile?: number
  ): WebVitalMetric {
    return {
      value,
      rating: this.rateMetric(name, value),
      percentile,
    };
  }

  /**
   * Process raw vitals data into CoreWebVitals object
   */
  processVitals(
    rawData: Array<{
      name: string;
      value: number;
      url: string;
      timestamp: number;
    }>,
    device: 'desktop' | 'mobile'
  ): CoreWebVitals {
    const metrics: Record<string, number[]> = {
      LCP: [],
      FID: [],
      CLS: [],
      TTFB: [],
      FCP: [],
      INP: [],
    };

    // Group values by metric name
    for (const entry of rawData) {
      if (metrics[entry.name]) {
        metrics[entry.name].push(entry.value);
      }
    }

    // Calculate 75th percentile (p75) for each metric
    const getP75 = (values: number[]): number => {
      if (values.length === 0) return 0;
      const sorted = [...values].sort((a, b) => a - b);
      const index = Math.ceil(sorted.length * 0.75) - 1;
      return sorted[index];
    };

    return {
      url: rawData[0]?.url || '',
      recordedAt: new Date(),
      device,
      lcp: this.createMetric('LCP', getP75(metrics.LCP)),
      fid: this.createMetric('FID', getP75(metrics.FID)),
      cls: this.createMetric('CLS', getP75(metrics.CLS)),
      ttfb: this.createMetric('TTFB', getP75(metrics.TTFB)),
      fcp: this.createMetric('FCP', getP75(metrics.FCP)),
      inp: this.createMetric('INP', getP75(metrics.INP)),
    };
  }

  /**
   * Generate recommendations based on Core Web Vitals
   */
  getRecommendations(vitals: CoreWebVitals): Array<{
    metric: string;
    issue: string;
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
  }> {
    const recommendations: Array<{
      metric: string;
      issue: string;
      recommendation: string;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    // LCP recommendations
    if (vitals.lcp.rating !== 'good') {
      recommendations.push({
        metric: 'LCP',
        issue: `Largest Contentful Paint is ${vitals.lcp.rating} (${vitals.lcp.value}ms)`,
        recommendation:
          'Optimize images, use CDN, preload critical resources, optimize server response time',
        priority: vitals.lcp.rating === 'poor' ? 'high' : 'medium',
      });
    }

    // FID recommendations
    if (vitals.fid.rating !== 'good') {
      recommendations.push({
        metric: 'FID',
        issue: `First Input Delay is ${vitals.fid.rating} (${vitals.fid.value}ms)`,
        recommendation: 'Break up long tasks, optimize JavaScript execution, use web workers',
        priority: vitals.fid.rating === 'poor' ? 'high' : 'medium',
      });
    }

    // CLS recommendations
    if (vitals.cls.rating !== 'good') {
      recommendations.push({
        metric: 'CLS',
        issue: `Cumulative Layout Shift is ${vitals.cls.rating} (${vitals.cls.value})`,
        recommendation:
          'Set explicit dimensions for images/videos, avoid inserting content above existing content, use transform animations',
        priority: vitals.cls.rating === 'poor' ? 'high' : 'medium',
      });
    }

    // TTFB recommendations
    if (vitals.ttfb.rating !== 'good') {
      recommendations.push({
        metric: 'TTFB',
        issue: `Time to First Byte is ${vitals.ttfb.rating} (${vitals.ttfb.value}ms)`,
        recommendation: 'Optimize server processing, use CDN, enable caching, upgrade hosting',
        priority: vitals.ttfb.rating === 'poor' ? 'high' : 'medium',
      });
    }

    // FCP recommendations
    if (vitals.fcp.rating !== 'good') {
      recommendations.push({
        metric: 'FCP',
        issue: `First Contentful Paint is ${vitals.fcp.rating} (${vitals.fcp.value}ms)`,
        recommendation: 'Eliminate render-blocking resources, minify CSS, use critical CSS inline',
        priority: vitals.fcp.rating === 'poor' ? 'high' : 'low',
      });
    }

    // INP recommendations
    if (vitals.inp.rating !== 'good') {
      recommendations.push({
        metric: 'INP',
        issue: `Interaction to Next Paint is ${vitals.inp.rating} (${vitals.inp.value}ms)`,
        recommendation:
          'Optimize event handlers, reduce JavaScript complexity, use requestIdleCallback',
        priority: vitals.inp.rating === 'poor' ? 'high' : 'medium',
      });
    }

    return recommendations;
  }

  /**
   * Calculate performance score (0-100) from Core Web Vitals
   */
  calculatePerformanceScore(vitals: CoreWebVitals): number {
    const weights = {
      lcp: 25,
      fid: 15,
      cls: 25,
      ttfb: 10,
      fcp: 15,
      inp: 10,
    };

    const getRatingScore = (rating: WebVitalMetric['rating']): number => {
      switch (rating) {
        case 'good':
          return 100;
        case 'needs-improvement':
          return 60;
        case 'poor':
          return 20;
      }
    };

    let totalScore = 0;
    let totalWeight = 0;

    for (const [metric, weight] of Object.entries(weights)) {
      const vital = vitals[metric as keyof CoreWebVitals];
      if (vital && typeof vital === 'object' && 'rating' in vital) {
        totalScore += getRatingScore(vital.rating) * weight;
        totalWeight += weight;
      }
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Generate Page Speed Insights API request URL
   */
  getPageSpeedInsightsUrl(
    url: string,
    strategy: 'mobile' | 'desktop' = 'mobile',
    apiKey?: string
  ): string {
    const baseUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
    const params = new URLSearchParams({
      url,
      strategy,
      category: 'performance',
    });

    if (apiKey) {
      params.append('key', apiKey);
    }

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Parse PageSpeed Insights API response
   */
  parsePageSpeedResponse(response: Record<string, unknown>): Partial<CoreWebVitals> {
    const metrics = (
      response as { lighthouseResult?: { audits?: Record<string, { numericValue?: number }> } }
    ).lighthouseResult?.audits;

    if (!metrics) {
      return {};
    }

    return {
      lcp: metrics['largest-contentful-paint']?.numericValue
        ? this.createMetric('LCP', metrics['largest-contentful-paint'].numericValue)
        : undefined,
      fcp: metrics['first-contentful-paint']?.numericValue
        ? this.createMetric('FCP', metrics['first-contentful-paint'].numericValue)
        : undefined,
      cls: metrics['cumulative-layout-shift']?.numericValue
        ? this.createMetric('CLS', metrics['cumulative-layout-shift'].numericValue)
        : undefined,
      ttfb: metrics['server-response-time']?.numericValue
        ? this.createMetric('TTFB', metrics['server-response-time'].numericValue)
        : undefined,
    };
  }
}

/**
 * SEO Health Score Calculator
 * Aggregates all SEO metrics into a comprehensive score
 */
export class SEOHealthScoreService {
  /**
   * Calculate comprehensive SEO health score
   */
  calculateHealthScore(data: {
    auditScore: number;
    performanceScore: number;
    mobileScore: number;
    securityScore: number;
    accessibilityScore: number;
    backlinkScore: number;
    contentScore: number;
  }): SEOHealthScore {
    const weights = {
      technical: 0.2,
      content: 0.2,
      performance: 0.2,
      mobile: 0.15,
      security: 0.1,
      accessibility: 0.1,
      backlinks: 0.05,
    };

    const scores = {
      technical: data.auditScore,
      content: data.contentScore,
      performance: data.performanceScore,
      mobile: data.mobileScore,
      security: data.securityScore,
      accessibility: data.accessibilityScore,
      backlinks: data.backlinkScore,
    };

    // Calculate weighted overall score
    const overall = Math.round(
      scores.technical * weights.technical +
        scores.content * weights.content +
        scores.performance * weights.performance +
        scores.mobile * weights.mobile +
        scores.security * weights.security +
        scores.accessibility * weights.accessibility +
        scores.backlinks * weights.backlinks
    );

    // Generate breakdown
    const breakdown: SEOScoreBreakdown[] = [
      { category: 'Technical SEO', score: scores.technical, maxScore: 100, issues: 0, passed: 0 },
      { category: 'Content Quality', score: scores.content, maxScore: 100, issues: 0, passed: 0 },
      { category: 'Performance', score: scores.performance, maxScore: 100, issues: 0, passed: 0 },
      {
        category: 'Mobile Optimization',
        score: scores.mobile,
        maxScore: 100,
        issues: 0,
        passed: 0,
      },
      { category: 'Security', score: scores.security, maxScore: 100, issues: 0, passed: 0 },
      {
        category: 'Accessibility',
        score: scores.accessibility,
        maxScore: 100,
        issues: 0,
        passed: 0,
      },
      { category: 'Backlinks', score: scores.backlinks, maxScore: 100, issues: 0, passed: 0 },
    ];

    return {
      overall,
      technical: scores.technical,
      content: scores.content,
      performance: scores.performance,
      mobile: scores.mobile,
      security: scores.security,
      accessibility: scores.accessibility,
      backlinks: scores.backlinks,
      breakdown,
      trend: [], // Would be populated from historical data
    };
  }

  /**
   * Get score rating text
   */
  getScoreRating(score: number): {
    rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
    label: string;
    color: string;
  } {
    if (score >= 90) {
      return { rating: 'excellent', label: 'Excellent', color: '#00C853' };
    }
    if (score >= 70) {
      return { rating: 'good', label: 'Good', color: '#64DD17' };
    }
    if (score >= 50) {
      return { rating: 'fair', label: 'Needs Improvement', color: '#FFD600' };
    }
    if (score >= 30) {
      return { rating: 'poor', label: 'Poor', color: '#FF9100' };
    }
    return { rating: 'critical', label: 'Critical', color: '#FF1744' };
  }

  /**
   * Generate improvement priorities
   */
  getImprovementPriorities(healthScore: SEOHealthScore): Array<{
    category: string;
    currentScore: number;
    potentialGain: number;
    priority: 'high' | 'medium' | 'low';
  }> {
    const priorities: Array<{
      category: string;
      currentScore: number;
      potentialGain: number;
      priority: 'high' | 'medium' | 'low';
    }> = [];

    const categories = [
      { name: 'Technical SEO', score: healthScore.technical, weight: 0.2 },
      { name: 'Content Quality', score: healthScore.content, weight: 0.2 },
      { name: 'Performance', score: healthScore.performance, weight: 0.2 },
      { name: 'Mobile Optimization', score: healthScore.mobile, weight: 0.15 },
      { name: 'Security', score: healthScore.security, weight: 0.1 },
      { name: 'Accessibility', score: healthScore.accessibility, weight: 0.1 },
      { name: 'Backlinks', score: healthScore.backlinks, weight: 0.05 },
    ];

    for (const cat of categories) {
      if (cat.score < 90) {
        const potentialGain = Math.round((100 - cat.score) * cat.weight);
        priorities.push({
          category: cat.name,
          currentScore: cat.score,
          potentialGain,
          priority: cat.score < 50 ? 'high' : cat.score < 70 ? 'medium' : 'low',
        });
      }
    }

    // Sort by potential gain (highest first)
    return priorities.sort((a, b) => b.potentialGain - a.potentialGain);
  }
}

export const coreWebVitalsService = new CoreWebVitalsService();
export const seoHealthScoreService = new SEOHealthScoreService();
