/**
 * SEO Service Types
 */

// Sitemap Types
export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: SitemapImage[];
  videos?: SitemapVideo[];
  alternates?: SitemapAlternate[];
}

export interface SitemapImage {
  loc: string;
  caption?: string;
  title?: string;
  geoLocation?: string;
  license?: string;
}

export interface SitemapVideo {
  thumbnailLoc: string;
  title: string;
  description: string;
  contentLoc?: string;
  playerLoc?: string;
  duration?: number;
  expirationDate?: string;
  rating?: number;
  viewCount?: number;
  publicationDate?: string;
  familyFriendly?: boolean;
  restriction?: { relationship: 'allow' | 'deny'; countries: string[] };
  platform?: { relationship: 'allow' | 'deny'; platforms: string[] };
  requiresSubscription?: boolean;
  uploader?: { name: string; info?: string };
  live?: boolean;
  tags?: string[];
  category?: string;
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapConfig {
  baseUrl: string;
  outputPath: string;
  maxUrlsPerSitemap: number;
  excludePatterns: string[];
  defaultChangefreq: SitemapUrl['changefreq'];
  defaultPriority: number;
}

// Meta Tags Types
export interface MetaTags {
  title: string;
  description: string;
  keywords?: string[];
  robots?: RobotsDirective;
  canonical?: string;
  og?: OpenGraphTags;
  twitter?: TwitterCardTags;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  locale?: string;
  alternateLocales?: string[];
}

export interface RobotsDirective {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  noimageindex?: boolean;
  maxSnippet?: number;
  maxImagePreview?: 'none' | 'standard' | 'large';
  maxVideoPreview?: number;
}

export interface OpenGraphTags {
  title?: string;
  description?: string;
  type?: 'website' | 'article' | 'profile' | 'product' | 'video' | 'music';
  url?: string;
  image?: string | OpenGraphImage;
  video?: string | OpenGraphVideo;
  audio?: string;
  siteName?: string;
  locale?: string;
  determiner?: 'a' | 'an' | 'the' | 'auto' | '';
  article?: OpenGraphArticle;
  profile?: OpenGraphProfile;
  product?: OpenGraphProduct;
}

export interface OpenGraphImage {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
  alt?: string;
}

export interface OpenGraphVideo {
  url: string;
  secureUrl?: string;
  type?: string;
  width?: number;
  height?: number;
}

export interface OpenGraphArticle {
  publishedTime?: string;
  modifiedTime?: string;
  expirationTime?: string;
  author?: string[];
  section?: string;
  tag?: string[];
}

export interface OpenGraphProfile {
  firstName?: string;
  lastName?: string;
  username?: string;
  gender?: string;
}

export interface OpenGraphProduct {
  price?: { amount: number; currency: string };
  availability?: 'in stock' | 'out of stock' | 'preorder';
  condition?: 'new' | 'refurbished' | 'used';
  retailerId?: string;
}

export interface TwitterCardTags {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  siteId?: string;
  creator?: string;
  creatorId?: string;
  title?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  player?: TwitterPlayer;
  app?: TwitterApp;
}

export interface TwitterPlayer {
  url: string;
  width: number;
  height: number;
  stream?: string;
}

export interface TwitterApp {
  nameIphone?: string;
  idIphone?: string;
  urlIphone?: string;
  nameIpad?: string;
  idIpad?: string;
  urlIpad?: string;
  nameGoogleplay?: string;
  idGoogleplay?: string;
  urlGoogleplay?: string;
  country?: string;
}

// Schema Markup Types
export interface SchemaMarkup {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

export interface OrganizationSchema extends SchemaMarkup {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: ContactPointSchema[];
  address?: PostalAddressSchema;
}

export interface ContactPointSchema {
  '@type': 'ContactPoint';
  telephone?: string;
  email?: string;
  contactType: string;
  availableLanguage?: string[];
  areaServed?: string;
}

export interface PostalAddressSchema {
  '@type': 'PostalAddress';
  streetAddress?: string;
  addressLocality?: string;
  addressRegion?: string;
  postalCode?: string;
  addressCountry: string;
}

export interface WebSiteSchema extends SchemaMarkup {
  '@type': 'WebSite';
  name: string;
  url: string;
  potentialAction?: SearchActionSchema;
}

export interface SearchActionSchema {
  '@type': 'SearchAction';
  target: { '@type': 'EntryPoint'; urlTemplate: string };
  'query-input': string;
}

export interface BreadcrumbSchema extends SchemaMarkup {
  '@type': 'BreadcrumbList';
  itemListElement: BreadcrumbItemSchema[];
}

export interface BreadcrumbItemSchema {
  '@type': 'ListItem';
  position: number;
  name: string;
  item: string;
}

export interface ArticleSchema extends SchemaMarkup {
  '@type': 'Article' | 'NewsArticle' | 'BlogPosting';
  headline: string;
  description?: string;
  image?: string | string[];
  datePublished: string;
  dateModified?: string;
  author: PersonSchema | OrganizationSchema;
  publisher: OrganizationSchema;
  mainEntityOfPage?: string | WebPageSchema;
}

export interface PersonSchema extends SchemaMarkup {
  '@type': 'Person';
  name: string;
  url?: string;
  image?: string;
}

export interface WebPageSchema extends SchemaMarkup {
  '@type': 'WebPage';
  '@id': string;
}

export interface FAQSchema extends SchemaMarkup {
  '@type': 'FAQPage';
  mainEntity: FAQItemSchema[];
}

export interface FAQItemSchema {
  '@type': 'Question';
  name: string;
  acceptedAnswer: {
    '@type': 'Answer';
    text: string;
  };
}

export interface ProductSchema extends SchemaMarkup {
  '@type': 'Product';
  name: string;
  description?: string;
  image?: string | string[];
  brand?: BrandSchema;
  offers?: OfferSchema | OfferSchema[];
  aggregateRating?: AggregateRatingSchema;
  review?: ReviewSchema[];
}

export interface BrandSchema {
  '@type': 'Brand';
  name: string;
}

export interface OfferSchema {
  '@type': 'Offer';
  price: number | string;
  priceCurrency: string;
  availability?: string;
  url?: string;
  validFrom?: string;
  priceValidUntil?: string;
  seller?: OrganizationSchema;
}

export interface AggregateRatingSchema {
  '@type': 'AggregateRating';
  ratingValue: number | string;
  reviewCount?: number;
  ratingCount?: number;
  bestRating?: number | string;
  worstRating?: number | string;
}

export interface ReviewSchema extends SchemaMarkup {
  '@type': 'Review';
  author: PersonSchema;
  reviewBody: string;
  datePublished?: string;
  reviewRating?: RatingSchema;
}

export interface RatingSchema {
  '@type': 'Rating';
  ratingValue: number | string;
  bestRating?: number | string;
  worstRating?: number | string;
}

export interface LocalBusinessSchema extends SchemaMarkup {
  '@type': 'LocalBusiness';
  name: string;
  address: PostalAddressSchema;
  telephone?: string;
  url?: string;
  openingHours?: string[];
  geo?: GeoCoordinatesSchema;
  priceRange?: string;
}

export interface GeoCoordinatesSchema {
  '@type': 'GeoCoordinates';
  latitude: number;
  longitude: number;
}

export interface EventSchema extends SchemaMarkup {
  '@type': 'Event';
  name: string;
  startDate: string;
  endDate?: string;
  location: PlaceSchema | VirtualLocationSchema;
  description?: string;
  image?: string;
  offers?: OfferSchema;
  organizer?: OrganizationSchema | PersonSchema;
  eventStatus?: string;
  eventAttendanceMode?: string;
}

export interface PlaceSchema extends SchemaMarkup {
  '@type': 'Place';
  name: string;
  address?: PostalAddressSchema;
}

export interface VirtualLocationSchema extends SchemaMarkup {
  '@type': 'VirtualLocation';
  url: string;
}

// Redirect Types
export interface Redirect {
  id: string;
  source: string;
  destination: string;
  type: 301 | 302 | 307 | 308;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  hits: number;
  lastHitAt?: Date;
  notes?: string;
}

export interface RedirectCreateInput {
  source: string;
  destination: string;
  type?: 301 | 302 | 307 | 308;
  notes?: string;
}

// SEO Audit Types
export interface SEOAuditResult {
  url: string;
  timestamp: Date;
  score: number;
  issues: SEOIssue[];
  warnings: SEOWarning[];
  passed: SEOCheck[];
  metrics: SEOMetrics;
  recommendations: SEORecommendation[];
}

export interface SEOIssue {
  code: string;
  severity: 'critical' | 'error';
  message: string;
  element?: string;
  suggestion?: string;
}

export interface SEOWarning {
  code: string;
  severity: 'warning';
  message: string;
  element?: string;
  suggestion?: string;
}

export interface SEOCheck {
  code: string;
  message: string;
}

export interface SEOMetrics {
  titleLength: number;
  descriptionLength: number;
  h1Count: number;
  h2Count: number;
  imageCount: number;
  imagesWithoutAlt: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: number;
  wordCount: number;
  readabilityScore: number;
  keywordDensity: Record<string, number>;
  loadTime?: number;
  pageSize?: number;
}

export interface SEORecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
}

// Content Analysis Types
export interface ContentAnalysis {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgSentencesPerParagraph: number;
  readabilityScore: number;
  readabilityGrade: string;
  keywordDensity: KeywordDensity[];
  headingStructure: HeadingItem[];
  links: LinkAnalysis;
  images: ImageAnalysis;
  sentiment?: SentimentAnalysis;
}

export interface KeywordDensity {
  keyword: string;
  count: number;
  density: number;
  inTitle: boolean;
  inH1: boolean;
  inMeta: boolean;
  positions: number[];
}

export interface HeadingItem {
  level: number;
  text: string;
  issues: string[];
}

export interface LinkAnalysis {
  total: number;
  internal: number;
  external: number;
  noFollow: number;
  broken: string[];
  suggestions: string[];
}

export interface ImageAnalysis {
  total: number;
  withAlt: number;
  withoutAlt: string[];
  optimized: number;
  unoptimized: string[];
}

export interface SentimentAnalysis {
  score: number;
  comparative: number;
  positive: string[];
  negative: string[];
  tokens: string[];
}

// Keyword Types
export interface Keyword {
  id: string;
  keyword: string;
  searchVolume?: number;
  difficulty?: number;
  cpc?: number;
  trend?: number[];
  relatedKeywords?: string[];
  questions?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordRanking {
  id: string;
  keywordId: string;
  keyword: string;
  url: string;
  position: number;
  previousPosition?: number;
  searchEngine: 'google' | 'bing' | 'yahoo';
  country: string;
  device: 'desktop' | 'mobile';
  recordedAt: Date;
}

export interface KeywordSuggestion {
  keyword: string;
  type: 'related' | 'question' | 'long-tail' | 'lsi';
  searchVolume?: number;
  difficulty?: number;
  relevance: number;
}

// Backlink Types
export interface Backlink {
  id: string;
  sourceUrl: string;
  sourceDomain: string;
  targetUrl: string;
  anchorText: string;
  rel: 'follow' | 'nofollow' | 'ugc' | 'sponsored';
  domainAuthority?: number;
  pageAuthority?: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'active' | 'lost' | 'broken';
}

export interface BacklinkAnalysis {
  totalBacklinks: number;
  uniqueDomains: number;
  followLinks: number;
  noFollowLinks: number;
  domainAuthorityAvg: number;
  topAnchors: { anchor: string; count: number }[];
  topDomains: { domain: string; count: number; authority: number }[];
  newBacklinks: number;
  lostBacklinks: number;
}

// Core Web Vitals Types
export interface CoreWebVitals {
  url: string;
  recordedAt: Date;
  device: 'desktop' | 'mobile';
  lcp: WebVitalMetric; // Largest Contentful Paint
  fid: WebVitalMetric; // First Input Delay
  cls: WebVitalMetric; // Cumulative Layout Shift
  ttfb: WebVitalMetric; // Time to First Byte
  fcp: WebVitalMetric; // First Contentful Paint
  inp: WebVitalMetric; // Interaction to Next Paint
}

export interface WebVitalMetric {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  percentile?: number;
}

// SEO Health Score
export interface SEOHealthScore {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  mobile: number;
  security: number;
  accessibility: number;
  backlinks: number;
  breakdown: SEOScoreBreakdown[];
  trend: SEOScoreTrend[];
}

export interface SEOScoreBreakdown {
  category: string;
  score: number;
  maxScore: number;
  issues: number;
  passed: number;
}

export interface SEOScoreTrend {
  date: string;
  score: number;
}

// Competitor Analysis Types
export interface CompetitorAnalysis {
  domain: string;
  domainAuthority: number;
  organicKeywords: number;
  organicTraffic: number;
  backlinks: number;
  contentGaps: string[];
  keywordOverlap: KeywordOverlap[];
  topPages: CompetitorPage[];
}

export interface KeywordOverlap {
  keyword: string;
  yourPosition?: number;
  competitorPosition: number;
  searchVolume: number;
  opportunity: 'win' | 'improve' | 'defend';
}

export interface CompetitorPage {
  url: string;
  title: string;
  estimatedTraffic: number;
  keywords: number;
  backlinks: number;
}

// Report Types
export interface SEOReport {
  id: string;
  type: 'audit' | 'ranking' | 'backlink' | 'competitor' | 'comprehensive';
  generatedAt: Date;
  period: { start: Date; end: Date };
  data: Record<string, unknown>;
  summary: string;
  recommendations: SEORecommendation[];
}

// Task Types for Team Collaboration
export interface SEOTask {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'review' | 'completed';
  assigneeId?: string;
  dueDate?: Date;
  url?: string;
  issue?: SEOIssue;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
