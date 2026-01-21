/**
 * AI-Powered SEO Automation Service
 * Generates meta tags, content suggestions, keyword recommendations, and automated SEO improvements
 */

import { MetaTags, KeywordSuggestion, SEORecommendation, ContentAnalysis } from '../types';

// Common dating-related keywords for context
const DATING_KEYWORDS = [
  'dating',
  'relationships',
  'love',
  'match',
  'connection',
  'singles',
  'romance',
  'online dating',
  'dating app',
  'meet people',
  'find love',
  'partner',
  'compatibility',
  'verified profiles',
  'safe dating',
  'video chat',
  'premium dating',
  'serious relationships',
];

// Title templates for different page types
const TITLE_TEMPLATES: Record<string, string[]> = {
  home: [
    '{brand} - {tagline} | Premium Dating',
    '{brand} | Find Your Perfect Match Today',
    'Meet Your Match on {brand} - {tagline}',
  ],
  features: [
    '{feature} - Dating Features | {brand}',
    'Discover {feature} on {brand} Dating',
    '{brand} Features: {feature} for Better Matches',
  ],
  pricing: [
    'Pricing & Plans | {brand} Dating',
    '{brand} Subscription Plans - Find Your Plan',
    'Premium Dating Plans | {brand}',
  ],
  about: [
    'About {brand} - Our Mission & Story',
    'Meet the Team Behind {brand} Dating',
    'About Us | {brand} Dating Platform',
  ],
  safety: [
    'Safety Center | {brand} Dating',
    'Stay Safe While Dating | {brand}',
    'Your Safety Matters | {brand} Dating Platform',
  ],
  blog: [
    '{title} | {brand} Dating Blog',
    '{title} - Dating Tips & Advice',
    'Dating Insights: {title} | {brand}',
  ],
};

// Description templates
const DESCRIPTION_TEMPLATES: Record<string, string[]> = {
  home: [
    'Join {brand} and find meaningful connections with verified singles. {highlight} Start your journey to love today.',
    'Discover {brand}, the premium dating app for {audience}. {highlight} Sign up free and meet your match.',
    '{brand} brings you {highlight}. Join millions finding love with verified profiles and smart matching.',
  ],
  features: [
    'Explore {feature} on {brand}. {benefit} Experience dating the way it should be.',
    '{brand} offers {feature} to help you find your perfect match. {benefit}',
    'Discover how {feature} on {brand} can transform your dating experience. {benefit}',
  ],
  pricing: [
    'Compare {brand} subscription plans. Get unlimited likes, see who likes you, and unlock premium features.',
    'Choose the perfect {brand} plan for you. From free to Platinum - find features that match your dating goals.',
    '{brand} pricing: Essential, Premium, and Platinum plans. Start free, upgrade when you are ready.',
  ],
  safety: [
    'Your safety is our priority at {brand}. Learn about our verification process, safety features, and community guidelines.',
    '{brand} keeps you safe with photo verification, identity checks, and 24/7 moderation. Date with confidence.',
    'Stay protected while dating on {brand}. Discover our safety tools, reporting features, and trusted community.',
  ],
};

export class AISEOService {
  private brand: string;
  private tagline: string;

  constructor(brand: string = 'Flamoral', tagline: string = 'Where Passion Meets Connection') {
    this.brand = brand;
    this.tagline = tagline;
  }

  /**
   * Generate optimized meta title for a page
   */
  generateTitle(pageType: string, context?: Record<string, string>): string {
    const templates = TITLE_TEMPLATES[pageType] || TITLE_TEMPLATES.home;
    const template = templates[Math.floor(Math.random() * templates.length)];

    let title = template.replace('{brand}', this.brand).replace('{tagline}', this.tagline);

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        title = title.replace(`{${key}}`, value);
      });
    }

    // Ensure title is within optimal length (50-60 characters)
    if (title.length > 60) {
      title = title.substring(0, 57) + '...';
    }

    return title;
  }

  /**
   * Generate optimized meta description for a page
   */
  generateDescription(pageType: string, context?: Record<string, string>): string {
    const templates = DESCRIPTION_TEMPLATES[pageType] || DESCRIPTION_TEMPLATES.home;
    const template = templates[Math.floor(Math.random() * templates.length)];

    let description = template.replace('{brand}', this.brand);

    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        description = description.replace(`{${key}}`, value);
      });
    }

    // Clean up any unreplaced placeholders
    description = description
      .replace(/\{[^}]+\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Ensure description is within optimal length (150-160 characters)
    if (description.length > 160) {
      description = description.substring(0, 157) + '...';
    } else if (description.length < 120) {
      description += ' Start your journey today.';
    }

    return description;
  }

  /**
   * Generate complete meta tags for a page
   */
  generateMetaTags(pageType: string, context?: Record<string, string>): MetaTags {
    return {
      title: this.generateTitle(pageType, context),
      description: this.generateDescription(pageType, context),
      keywords: this.generateKeywords(pageType, context?.keywords?.split(',') || []),
      robots: {
        index: pageType !== 'admin' && pageType !== 'settings',
        follow: true,
      },
      og: {
        title: this.generateTitle(pageType, context),
        description: this.generateDescription(pageType, context),
        type: pageType === 'blog' ? 'article' : 'website',
        siteName: this.brand,
      },
      twitter: {
        card: 'summary_large_image',
        site: `@${this.brand.toLowerCase()}`,
        title: this.generateTitle(pageType, context),
        description: this.generateDescription(pageType, context),
      },
    };
  }

  /**
   * Generate relevant keywords for a page
   */
  generateKeywords(pageType: string, additionalKeywords: string[] = []): string[] {
    const baseKeywords = ['dating app', 'online dating', this.brand.toLowerCase()];

    const pageKeywords: Record<string, string[]> = {
      home: ['find love', 'meet singles', 'dating platform', 'match', 'relationships'],
      features: [
        'dating features',
        'video chat',
        'verified profiles',
        'matching algorithm',
        'premium features',
      ],
      pricing: ['dating subscription', 'premium dating', 'dating plans', 'membership'],
      safety: ['safe dating', 'verified profiles', 'dating safety', 'identity verification'],
      blog: ['dating tips', 'relationship advice', 'dating guide', 'love advice'],
      about: ['dating company', 'dating mission', 'meet team'],
    };

    const allKeywords = [...baseKeywords, ...(pageKeywords[pageType] || []), ...additionalKeywords];

    // Remove duplicates and limit to 10 keywords
    return [...new Set(allKeywords)].slice(0, 10);
  }

  /**
   * Generate keyword suggestions based on seed keyword
   */
  generateKeywordSuggestions(seedKeyword: string, count: number = 10): KeywordSuggestion[] {
    const suggestions: KeywordSuggestion[] = [];

    // Long-tail variations
    const longTailPrefixes = ['best', 'top', 'free', 'premium', 'new', 'popular'];
    const longTailSuffixes = [
      'app',
      'platform',
      'site',
      'service',
      'for singles',
      'near me',
      '2026',
    ];

    longTailPrefixes.forEach((prefix) => {
      suggestions.push({
        keyword: `${prefix} ${seedKeyword}`,
        type: 'long-tail',
        relevance: 0.8 + Math.random() * 0.2,
      });
    });

    longTailSuffixes.forEach((suffix) => {
      suggestions.push({
        keyword: `${seedKeyword} ${suffix}`,
        type: 'long-tail',
        relevance: 0.7 + Math.random() * 0.3,
      });
    });

    // Question variations
    const questionPrefixes = ['how to', 'what is the best', 'where to find', 'is', 'why'];
    questionPrefixes.forEach((prefix) => {
      suggestions.push({
        keyword: `${prefix} ${seedKeyword}`,
        type: 'question',
        relevance: 0.6 + Math.random() * 0.4,
      });
    });

    // Related keywords (simplified LSI)
    const related = this.findRelatedKeywords(seedKeyword);
    related.forEach((kw) => {
      suggestions.push({
        keyword: kw,
        type: 'related',
        relevance: 0.5 + Math.random() * 0.5,
      });
    });

    // Sort by relevance and return top count
    return suggestions.sort((a, b) => b.relevance - a.relevance).slice(0, count);
  }

  /**
   * Find related keywords (simplified semantic analysis)
   */
  private findRelatedKeywords(keyword: string): string[] {
    const keywordRelations: Record<string, string[]> = {
      dating: ['relationships', 'romance', 'love', 'singles', 'match', 'connection'],
      app: ['platform', 'service', 'site', 'application', 'mobile'],
      premium: ['paid', 'subscription', 'membership', 'pro', 'elite'],
      free: ['no cost', 'trial', 'basic', 'starter'],
      safety: ['security', 'verification', 'protection', 'privacy', 'trust'],
      video: ['video chat', 'video call', 'face-to-face', 'virtual date'],
      match: ['compatibility', 'connection', 'partner', 'algorithm'],
    };

    const words = keyword.toLowerCase().split(' ');
    const related: string[] = [];

    words.forEach((word) => {
      if (keywordRelations[word]) {
        related.push(...keywordRelations[word]);
      }
    });

    return [...new Set(related)];
  }

  /**
   * Analyze content and provide SEO improvement suggestions
   */
  analyzeContentForSEO(
    content: string,
    targetKeyword?: string
  ): {
    score: number;
    suggestions: SEORecommendation[];
    keywordAnalysis: {
      density: number;
      occurrences: number;
      inFirstParagraph: boolean;
      inHeadings: boolean;
    };
  } {
    const suggestions: SEORecommendation[] = [];
    let score = 100;

    const words = content.toLowerCase().split(/\s+/);
    const wordCount = words.length;
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

    // Word count analysis
    if (wordCount < 300) {
      score -= 20;
      suggestions.push({
        priority: 'high',
        category: 'Content',
        title: 'Increase content length',
        description: `Content has only ${wordCount} words. Aim for at least 300-500 words for better SEO.`,
        impact: 'Longer content tends to rank better in search results.',
      });
    } else if (wordCount < 500) {
      score -= 10;
      suggestions.push({
        priority: 'medium',
        category: 'Content',
        title: 'Consider adding more content',
        description: `Content has ${wordCount} words. Consider expanding to 500+ words for comprehensive coverage.`,
        impact: 'More comprehensive content can improve topical authority.',
      });
    }

    // Sentence length analysis
    const avgSentenceLength = words.length / sentences.length;
    if (avgSentenceLength > 25) {
      score -= 5;
      suggestions.push({
        priority: 'low',
        category: 'Readability',
        title: 'Shorten sentences',
        description: `Average sentence length is ${Math.round(avgSentenceLength)} words. Aim for 15-20 words per sentence.`,
        impact: 'Shorter sentences improve readability and user engagement.',
      });
    }

    // Paragraph analysis
    if (paragraphs.length < 3) {
      score -= 5;
      suggestions.push({
        priority: 'low',
        category: 'Structure',
        title: 'Add more paragraphs',
        description: 'Content has few paragraphs. Break up text into smaller, scannable sections.',
        impact: 'Better formatting improves user experience and time on page.',
      });
    }

    // Keyword analysis
    let keywordAnalysis = {
      density: 0,
      occurrences: 0,
      inFirstParagraph: false,
      inHeadings: false,
    };

    if (targetKeyword) {
      const keywordLower = targetKeyword.toLowerCase();
      const keywordRegex = new RegExp(keywordLower, 'gi');
      const matches = content.match(keywordRegex) || [];

      keywordAnalysis.occurrences = matches.length;
      keywordAnalysis.density = (matches.length / wordCount) * 100;
      keywordAnalysis.inFirstParagraph =
        paragraphs[0]?.toLowerCase().includes(keywordLower) || false;

      // Check keyword density
      if (keywordAnalysis.density === 0) {
        score -= 20;
        suggestions.push({
          priority: 'high',
          category: 'Keywords',
          title: 'Add target keyword',
          description: `Target keyword "${targetKeyword}" not found in content. Include it naturally throughout.`,
          impact: 'Keywords help search engines understand page topic.',
        });
      } else if (keywordAnalysis.density < 0.5) {
        score -= 10;
        suggestions.push({
          priority: 'medium',
          category: 'Keywords',
          title: 'Increase keyword usage',
          description: `Keyword density is ${keywordAnalysis.density.toFixed(2)}%. Aim for 1-2% for optimal SEO.`,
          impact: 'Appropriate keyword density signals relevance to search engines.',
        });
      } else if (keywordAnalysis.density > 3) {
        score -= 15;
        suggestions.push({
          priority: 'high',
          category: 'Keywords',
          title: 'Reduce keyword stuffing',
          description: `Keyword density is ${keywordAnalysis.density.toFixed(2)}%. High density may trigger spam filters.`,
          impact: 'Over-optimization can hurt rankings.',
        });
      }

      // Check first paragraph
      if (!keywordAnalysis.inFirstParagraph) {
        score -= 5;
        suggestions.push({
          priority: 'medium',
          category: 'Keywords',
          title: 'Add keyword to introduction',
          description:
            'Include target keyword in the first paragraph for better relevance signals.',
          impact: 'Keywords in introduction help establish page topic early.',
        });
      }
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      suggestions,
      keywordAnalysis,
    };
  }

  /**
   * Generate SEO-optimized content outline
   */
  generateContentOutline(
    topic: string,
    targetKeyword: string
  ): {
    title: string;
    headings: string[];
    keyPoints: string[];
    suggestedWordCount: number;
  } {
    // Generate SEO-friendly title variations
    const titleVariations = [
      `${topic}: A Complete Guide for ${new Date().getFullYear()}`,
      `How ${topic} Can Transform Your Dating Life`,
      `The Ultimate Guide to ${topic} | Expert Tips`,
      `${topic}: Everything You Need to Know`,
    ];

    // Generate heading structure
    const headings = [
      `What is ${topic}?`,
      `Why ${topic} Matters for Online Dating`,
      `Key Benefits of ${topic}`,
      `How to Get Started with ${topic}`,
      `Common Mistakes to Avoid`,
      `Expert Tips for Success`,
      `Frequently Asked Questions`,
    ];

    // Generate key points
    const keyPoints = [
      `Include the target keyword "${targetKeyword}" in the first 100 words`,
      'Use short paragraphs (3-4 sentences) for better readability',
      'Include internal links to related pages on Flamoral',
      'Add relevant statistics and data to support claims',
      'Include a clear call-to-action at the end',
      'Use bullet points and numbered lists for scannable content',
      'Add alt text to all images with the target keyword',
    ];

    return {
      title: titleVariations[0],
      headings,
      keyPoints,
      suggestedWordCount: 1500,
    };
  }

  /**
   * Generate internal linking suggestions
   */
  generateInternalLinkSuggestions(
    content: string,
    existingPages: Array<{ url: string; title: string; keywords: string[] }>
  ): Array<{
    anchorText: string;
    suggestedPage: string;
    relevanceScore: number;
  }> {
    const suggestions: Array<{
      anchorText: string;
      suggestedPage: string;
      relevanceScore: number;
    }> = [];

    const contentLower = content.toLowerCase();

    existingPages.forEach((page) => {
      page.keywords.forEach((keyword) => {
        if (contentLower.includes(keyword.toLowerCase())) {
          suggestions.push({
            anchorText: keyword,
            suggestedPage: page.url,
            relevanceScore: 0.5 + Math.random() * 0.5,
          });
        }
      });
    });

    // Sort by relevance and deduplicate by URL
    const seen = new Set<string>();
    return suggestions
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .filter((s) => {
        if (seen.has(s.suggestedPage)) return false;
        seen.add(s.suggestedPage);
        return true;
      })
      .slice(0, 5);
  }

  /**
   * Generate automated SEO audit schedule recommendations
   */
  generateAuditSchedule(): {
    daily: string[];
    weekly: string[];
    monthly: string[];
    quarterly: string[];
  } {
    return {
      daily: [
        'Monitor Core Web Vitals',
        'Check for crawl errors in Search Console',
        'Review 404 error pages',
        'Monitor keyword ranking changes',
      ],
      weekly: [
        'Review and optimize underperforming pages',
        'Check broken links',
        'Analyze competitor content',
        'Review backlink profile',
        'Update sitemap if needed',
      ],
      monthly: [
        'Full site SEO audit',
        'Content gap analysis',
        'Update meta descriptions for top pages',
        'Review redirect chains',
        'Analyze search traffic trends',
        'Check mobile usability issues',
      ],
      quarterly: [
        'Comprehensive keyword research',
        'Content strategy review',
        'Technical SEO deep dive',
        'Schema markup audit',
        'Competitor analysis report',
        'Performance benchmarking',
      ],
    };
  }
}

export const aiSeoService = new AISEOService();
