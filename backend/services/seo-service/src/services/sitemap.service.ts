/**
 * Sitemap Generation Service
 * Handles dynamic XML sitemap generation with support for images, videos, and hreflang
 */

import { SitemapUrl, SitemapConfig, SitemapImage, SitemapVideo, SitemapAlternate } from '../types';

const DEFAULT_CONFIG: SitemapConfig = {
  baseUrl: 'https://flamoral.com',
  outputPath: '/public/sitemaps',
  maxUrlsPerSitemap: 50000,
  excludePatterns: ['/api/', '/admin/', '/settings/', '/messages/', '/checkout/', '/payment/'],
  defaultChangefreq: 'weekly',
  defaultPriority: 0.5,
};

export class SitemapService {
  private config: SitemapConfig;

  constructor(config: Partial<SitemapConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate XML for a single URL entry
   */
  private generateUrlXml(url: SitemapUrl): string {
    const { loc, lastmod, changefreq, priority, images, videos, alternates } = url;

    let xml = '  <url>\n';
    xml += `    <loc>${this.escapeXml(loc)}</loc>\n`;

    if (lastmod) {
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
    }
    if (changefreq) {
      xml += `    <changefreq>${changefreq}</changefreq>\n`;
    }
    if (priority !== undefined) {
      xml += `    <priority>${priority.toFixed(1)}</priority>\n`;
    }

    // Add image entries
    if (images && images.length > 0) {
      for (const image of images) {
        xml += this.generateImageXml(image);
      }
    }

    // Add video entries
    if (videos && videos.length > 0) {
      for (const video of videos) {
        xml += this.generateVideoXml(video);
      }
    }

    // Add hreflang alternates
    if (alternates && alternates.length > 0) {
      for (const alt of alternates) {
        xml += `    <xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${this.escapeXml(alt.href)}" />\n`;
      }
    }

    xml += '  </url>\n';
    return xml;
  }

  /**
   * Generate XML for image sitemap entry
   */
  private generateImageXml(image: SitemapImage): string {
    let xml = '    <image:image>\n';
    xml += `      <image:loc>${this.escapeXml(image.loc)}</image:loc>\n`;
    if (image.caption) {
      xml += `      <image:caption>${this.escapeXml(image.caption)}</image:caption>\n`;
    }
    if (image.title) {
      xml += `      <image:title>${this.escapeXml(image.title)}</image:title>\n`;
    }
    if (image.geoLocation) {
      xml += `      <image:geo_location>${this.escapeXml(image.geoLocation)}</image:geo_location>\n`;
    }
    if (image.license) {
      xml += `      <image:license>${this.escapeXml(image.license)}</image:license>\n`;
    }
    xml += '    </image:image>\n';
    return xml;
  }

  /**
   * Generate XML for video sitemap entry
   */
  private generateVideoXml(video: SitemapVideo): string {
    let xml = '    <video:video>\n';
    xml += `      <video:thumbnail_loc>${this.escapeXml(video.thumbnailLoc)}</video:thumbnail_loc>\n`;
    xml += `      <video:title>${this.escapeXml(video.title)}</video:title>\n`;
    xml += `      <video:description>${this.escapeXml(video.description)}</video:description>\n`;

    if (video.contentLoc) {
      xml += `      <video:content_loc>${this.escapeXml(video.contentLoc)}</video:content_loc>\n`;
    }
    if (video.playerLoc) {
      xml += `      <video:player_loc>${this.escapeXml(video.playerLoc)}</video:player_loc>\n`;
    }
    if (video.duration) {
      xml += `      <video:duration>${video.duration}</video:duration>\n`;
    }
    if (video.expirationDate) {
      xml += `      <video:expiration_date>${video.expirationDate}</video:expiration_date>\n`;
    }
    if (video.rating !== undefined) {
      xml += `      <video:rating>${video.rating}</video:rating>\n`;
    }
    if (video.viewCount !== undefined) {
      xml += `      <video:view_count>${video.viewCount}</video:view_count>\n`;
    }
    if (video.publicationDate) {
      xml += `      <video:publication_date>${video.publicationDate}</video:publication_date>\n`;
    }
    if (video.familyFriendly !== undefined) {
      xml += `      <video:family_friendly>${video.familyFriendly ? 'yes' : 'no'}</video:family_friendly>\n`;
    }
    if (video.tags && video.tags.length > 0) {
      for (const tag of video.tags.slice(0, 32)) {
        // Max 32 tags per video
        xml += `      <video:tag>${this.escapeXml(tag)}</video:tag>\n`;
      }
    }
    if (video.category) {
      xml += `      <video:category>${this.escapeXml(video.category)}</video:category>\n`;
    }
    if (video.live !== undefined) {
      xml += `      <video:live>${video.live ? 'yes' : 'no'}</video:live>\n`;
    }
    if (video.requiresSubscription !== undefined) {
      xml += `      <video:requires_subscription>${video.requiresSubscription ? 'yes' : 'no'}</video:requires_subscription>\n`;
    }

    xml += '    </video:video>\n';
    return xml;
  }

  /**
   * Generate complete sitemap XML
   */
  public generateSitemap(urls: SitemapUrl[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
    xml += '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n';
    xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n';
    xml += '        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"\n';
    xml += '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n';
    xml += '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n';
    xml += '        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n\n';

    for (const url of urls) {
      xml += this.generateUrlXml(url);
    }

    xml += '</urlset>';
    return xml;
  }

  /**
   * Generate sitemap index for multiple sitemaps
   */
  public generateSitemapIndex(sitemaps: { loc: string; lastmod?: string }[]): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n\n';

    for (const sitemap of sitemaps) {
      xml += '  <sitemap>\n';
      xml += `    <loc>${this.escapeXml(sitemap.loc)}</loc>\n`;
      if (sitemap.lastmod) {
        xml += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
      }
      xml += '  </sitemap>\n';
    }

    xml += '</sitemapindex>';
    return xml;
  }

  /**
   * Generate static pages sitemap
   */
  public generateStaticSitemap(): string {
    const staticPages: SitemapUrl[] = [
      { loc: `${this.config.baseUrl}/`, changefreq: 'daily', priority: 1.0 },
      { loc: `${this.config.baseUrl}/features`, changefreq: 'weekly', priority: 0.9 },
      { loc: `${this.config.baseUrl}/pricing`, changefreq: 'weekly', priority: 0.9 },
      { loc: `${this.config.baseUrl}/about`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${this.config.baseUrl}/how-it-works`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${this.config.baseUrl}/success-stories`, changefreq: 'weekly', priority: 0.8 },
      { loc: `${this.config.baseUrl}/safety`, changefreq: 'monthly', priority: 0.7 },
      { loc: `${this.config.baseUrl}/blog`, changefreq: 'daily', priority: 0.7 },
      { loc: `${this.config.baseUrl}/help`, changefreq: 'weekly', priority: 0.6 },
      { loc: `${this.config.baseUrl}/faq`, changefreq: 'weekly', priority: 0.6 },
      { loc: `${this.config.baseUrl}/contact`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${this.config.baseUrl}/download`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${this.config.baseUrl}/register`, changefreq: 'monthly', priority: 0.8 },
      { loc: `${this.config.baseUrl}/login`, changefreq: 'monthly', priority: 0.6 },
      { loc: `${this.config.baseUrl}/privacy`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${this.config.baseUrl}/terms`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${this.config.baseUrl}/cookies`, changefreq: 'monthly', priority: 0.4 },
      { loc: `${this.config.baseUrl}/community-guidelines`, changefreq: 'monthly', priority: 0.5 },
      { loc: `${this.config.baseUrl}/careers`, changefreq: 'weekly', priority: 0.5 },
      { loc: `${this.config.baseUrl}/press`, changefreq: 'monthly', priority: 0.5 },
    ];

    // Add lastmod to all entries
    const today = new Date().toISOString().split('T')[0];
    staticPages.forEach((page) => {
      page.lastmod = today;
    });

    return this.generateSitemap(staticPages);
  }

  /**
   * Generate blog posts sitemap
   */
  public generateBlogSitemap(
    posts: Array<{ slug: string; publishedAt: string; updatedAt?: string }>
  ): string {
    const urls: SitemapUrl[] = posts.map((post) => ({
      loc: `${this.config.baseUrl}/blog/${post.slug}`,
      lastmod: post.updatedAt || post.publishedAt,
      changefreq: 'monthly' as const,
      priority: 0.6,
    }));

    return this.generateSitemap(urls);
  }

  /**
   * Generate help articles sitemap
   */
  public generateHelpSitemap(
    articles: Array<{ slug: string; category: string; updatedAt: string }>
  ): string {
    const urls: SitemapUrl[] = articles.map((article) => ({
      loc: `${this.config.baseUrl}/help/${article.category}/${article.slug}`,
      lastmod: article.updatedAt,
      changefreq: 'monthly' as const,
      priority: 0.5,
    }));

    return this.generateSitemap(urls);
  }

  /**
   * Generate success stories sitemap
   */
  public generateSuccessStoriesSitemap(
    stories: Array<{ id: string; publishedAt: string }>
  ): string {
    const urls: SitemapUrl[] = stories.map((story) => ({
      loc: `${this.config.baseUrl}/success-stories/${story.id}`,
      lastmod: story.publishedAt,
      changefreq: 'yearly' as const,
      priority: 0.6,
    }));

    return this.generateSitemap(urls);
  }

  /**
   * Check if URL should be excluded from sitemap
   */
  public shouldExclude(url: string): boolean {
    return this.config.excludePatterns.some((pattern) => url.includes(pattern));
  }

  /**
   * Split URLs into multiple sitemaps if needed
   */
  public splitIntoChunks(urls: SitemapUrl[]): SitemapUrl[][] {
    const chunks: SitemapUrl[][] = [];
    for (let i = 0; i < urls.length; i += this.config.maxUrlsPerSitemap) {
      chunks.push(urls.slice(i, i + this.config.maxUrlsPerSitemap));
    }
    return chunks;
  }

  /**
   * Escape special XML characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate robots.txt content
   */
  public generateRobotsTxt(
    options: {
      disallowPatterns?: string[];
      allowPatterns?: string[];
      crawlDelay?: number;
      sitemapUrls?: string[];
    } = {}
  ): string {
    const {
      disallowPatterns = this.config.excludePatterns,
      allowPatterns = ['/'],
      crawlDelay,
      sitemapUrls = [`${this.config.baseUrl}/sitemap.xml`],
    } = options;

    let content = '# Flamoral Dating Platform - robots.txt\n';
    content += `# Generated: ${new Date().toISOString()}\n\n`;

    // User-agent rules
    content += 'User-agent: *\n';

    for (const pattern of allowPatterns) {
      content += `Allow: ${pattern}\n`;
    }

    for (const pattern of disallowPatterns) {
      content += `Disallow: ${pattern}\n`;
    }

    if (crawlDelay) {
      content += `Crawl-delay: ${crawlDelay}\n`;
    }

    content += '\n';

    // Sitemap declarations
    for (const sitemapUrl of sitemapUrls) {
      content += `Sitemap: ${sitemapUrl}\n`;
    }

    content += `\nHost: ${this.config.baseUrl.replace(/^https?:\/\//, '')}\n`;

    return content;
  }
}

export const sitemapService = new SitemapService();
