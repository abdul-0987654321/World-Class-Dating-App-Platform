/**
 * SEO Utilities for Flamoral Dating Platform
 * Handles structured data, meta tags, and SEO optimization
 */

// Base URL for the application
const BASE_URL = 'https://flamoral.com';

// Organization Schema (JSON-LD)
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Flamoral',
  alternateName: 'Flamoral Dating',
  url: BASE_URL,
  logo: `${BASE_URL}/flamoral-logo.png`,
  description:
    'Premium dating platform where passion meets connection. Find meaningful relationships with verified profiles and advanced matching.',
  foundingDate: '2024',
  sameAs: [
    'https://twitter.com/flamoral',
    'https://facebook.com/flamoral',
    'https://instagram.com/flamoral',
    'https://linkedin.com/company/flamoral',
    'https://tiktok.com/@flamoral',
  ],
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+1-800-FLAMORAL',
      contactType: 'customer service',
      availableLanguage: ['English', 'Spanish', 'French', 'German'],
      areaServed: 'Worldwide',
    },
    {
      '@type': 'ContactPoint',
      email: 'support@flamoral.com',
      contactType: 'technical support',
    },
  ],
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'US',
  },
};

// WebSite Schema for search box
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Flamoral',
  alternateName: 'Flamoral Dating',
  url: BASE_URL,
  description: 'Premium dating platform for meaningful connections',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
};

// Mobile App Schema
export const mobileAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'MobileApplication',
  name: 'Flamoral Dating',
  operatingSystem: ['iOS', 'Android'],
  applicationCategory: 'SocialNetworkingApplication',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '50000',
    bestRating: '5',
    worstRating: '1',
  },
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Free to download with premium subscription options',
  },
  downloadUrl: [
    'https://apps.apple.com/app/flamoral/id123456789',
    'https://play.google.com/store/apps/details?id=com.flamoral',
  ],
  screenshot: [
    `${BASE_URL}/screenshots/app-screenshot-1.jpg`,
    `${BASE_URL}/screenshots/app-screenshot-2.jpg`,
    `${BASE_URL}/screenshots/app-screenshot-3.jpg`,
  ],
  featureList: [
    'Advanced AI-powered matching',
    'Video chat capabilities',
    'Profile verification',
    'Safety features',
    'Premium subscriptions',
    'Speed dating events',
  ],
};

// FAQ Page Schema
export const createFAQSchema = (faqs: Array<{ question: string; answer: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.answer,
    },
  })),
});

// Product/Subscription Schema
export const createSubscriptionSchema = (subscription: {
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'month' | 'year';
  features: string[];
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: `Flamoral ${subscription.name}`,
  description: subscription.description,
  brand: {
    '@type': 'Brand',
    name: 'Flamoral',
  },
  offers: {
    '@type': 'Offer',
    price: subscription.price,
    priceCurrency: subscription.currency,
    priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    availability: 'https://schema.org/InStock',
    url: `${BASE_URL}/pricing`,
    seller: {
      '@type': 'Organization',
      name: 'Flamoral',
    },
  },
  additionalProperty: subscription.features.map((feature) => ({
    '@type': 'PropertyValue',
    name: 'Feature',
    value: feature,
  })),
});

// Breadcrumb Schema
export const createBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
  })),
});

// Article/Blog Schema
export const createArticleSchema = (article: {
  title: string;
  description: string;
  url: string;
  image: string;
  datePublished: string;
  dateModified: string;
  author: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  description: article.description,
  image: article.image,
  url: article.url.startsWith('http') ? article.url : `${BASE_URL}${article.url}`,
  datePublished: article.datePublished,
  dateModified: article.dateModified,
  author: {
    '@type': 'Person',
    name: article.author,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Flamoral',
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/flamoral-logo.png`,
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': article.url.startsWith('http') ? article.url : `${BASE_URL}${article.url}`,
  },
});

// Event Schema (for speed dating events)
export const createEventSchema = (event: {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location?: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: event.name,
  description: event.description,
  startDate: event.startDate,
  endDate: event.endDate,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: event.location
    ? 'https://schema.org/MixedEventAttendanceMode'
    : 'https://schema.org/OnlineEventAttendanceMode',
  location: event.location
    ? {
        '@type': 'Place',
        name: event.location,
      }
    : {
        '@type': 'VirtualLocation',
        url: event.url.startsWith('http') ? event.url : `${BASE_URL}${event.url}`,
      },
  image: event.image || `${BASE_URL}/flamoral-logo.png`,
  organizer: {
    '@type': 'Organization',
    name: 'Flamoral',
    url: BASE_URL,
  },
  offers: event.price
    ? {
        '@type': 'Offer',
        price: event.price,
        priceCurrency: event.currency || 'USD',
        availability: 'https://schema.org/InStock',
        validFrom: new Date().toISOString(),
        url: event.url.startsWith('http') ? event.url : `${BASE_URL}${event.url}`,
      }
    : {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
        url: event.url.startsWith('http') ? event.url : `${BASE_URL}${event.url}`,
      },
});

// Success Story/Review Schema
export const createSuccessStorySchema = (story: {
  author: string;
  reviewBody: string;
  datePublished: string;
  rating?: number;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Review',
  author: {
    '@type': 'Person',
    name: story.author,
  },
  reviewBody: story.reviewBody,
  datePublished: story.datePublished,
  reviewRating: story.rating
    ? {
        '@type': 'Rating',
        ratingValue: story.rating,
        bestRating: '5',
        worstRating: '1',
      }
    : undefined,
  itemReviewed: {
    '@type': 'MobileApplication',
    name: 'Flamoral Dating',
    applicationCategory: 'SocialNetworkingApplication',
  },
});

// Meta Tags Configuration
export interface MetaTagsConfig {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile' | 'product';
  twitterCard?: 'summary' | 'summary_large_image' | 'app';
  noIndex?: boolean;
  noFollow?: boolean;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

// Default meta tags
export const defaultMetaTags: MetaTagsConfig = {
  title: 'Flamoral - Find Your Perfect Connection',
  description:
    'Premium dating platform where passion meets connection. Join millions finding meaningful relationships with verified profiles and advanced AI matching.',
  keywords:
    'dating, relationships, love, flamoral, premium dating, online dating, matchmaking, verified profiles',
  ogType: 'website',
  twitterCard: 'summary_large_image',
  ogImage: `${BASE_URL}/og-image.jpg`,
};

// Page-specific meta tags
export const pageMetaTags: Record<string, Partial<MetaTagsConfig>> = {
  home: {
    title: 'Flamoral - Where Passion Meets Connection | Premium Dating',
    description:
      'Find your perfect match on Flamoral. Advanced AI matching, verified profiles, and a safe community for meaningful connections.',
  },
  features: {
    title: 'Features - AI Matching, Video Chat & More | Flamoral',
    description:
      'Discover Flamoral features: AI-powered matching, video chat, profile verification, speed dating events, and premium safety features.',
    keywords: 'dating features, AI matching, video chat dating, verified profiles, speed dating',
  },
  pricing: {
    title: 'Pricing & Premium Plans | Flamoral Dating',
    description:
      'Explore Flamoral subscription plans. Choose from Essential, Premium, or Platinum tiers to unlock unlimited likes, super likes, and advanced features.',
    keywords: 'dating subscription, premium dating, flamoral pricing, dating plans',
  },
  about: {
    title: 'About Us - Our Mission & Story | Flamoral',
    description:
      'Learn about Flamoral mission to create meaningful connections. Our team is dedicated to building the safest and most effective dating platform.',
  },
  safety: {
    title: 'Safety Center - Your Security Matters | Flamoral',
    description:
      'Your safety is our priority. Learn about Flamoral verification process, reporting tools, and community guidelines that keep you protected.',
    keywords: 'dating safety, profile verification, safe dating, report user',
  },
  blog: {
    title: 'Dating Tips & Relationship Advice | Flamoral Blog',
    description:
      'Expert dating tips, relationship advice, and success stories. Stay updated with the latest trends in modern dating.',
    keywords: 'dating tips, relationship advice, dating blog, love advice',
    ogType: 'article',
  },
  login: {
    title: 'Sign In to Your Account | Flamoral',
    description:
      'Sign in to Flamoral to connect with matches, send messages, and find your perfect partner.',
    noIndex: true,
  },
  register: {
    title: 'Create Your Free Account | Flamoral Dating',
    description:
      'Join Flamoral for free. Create your profile in minutes and start meeting verified singles looking for real connections.',
  },
  privacy: {
    title: 'Privacy Policy | Flamoral',
    description:
      'Read Flamoral privacy policy to understand how we collect, use, and protect your personal information.',
  },
  terms: {
    title: 'Terms of Service | Flamoral',
    description:
      'Read Flamoral terms of service and community guidelines for using our dating platform.',
  },
  help: {
    title: 'Help Center & Support | Flamoral',
    description:
      'Get help with your Flamoral account. Browse FAQs, contact support, or learn how to use features.',
  },
  download: {
    title: 'Download the Flamoral App | iOS & Android',
    description:
      'Download Flamoral on iOS and Android. Find love on the go with our mobile dating app featuring all premium features.',
    keywords: 'flamoral app, dating app download, iOS dating app, Android dating app',
  },
};

// Generate meta tags for a page
export const generateMetaTags = (
  page: string,
  customTags?: Partial<MetaTagsConfig>
): MetaTagsConfig => {
  const pageTags = pageMetaTags[page] || {};
  return {
    ...defaultMetaTags,
    ...pageTags,
    ...customTags,
  };
};

// Inject JSON-LD schema into document
export const injectSchema = (schema: object): void => {
  const existingScript = document.querySelector('script[data-schema-type="json-ld"]');
  if (existingScript) {
    existingScript.remove();
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-schema-type', 'json-ld');
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
};

// Inject multiple schemas
export const injectSchemas = (schemas: object[]): void => {
  // Remove existing schemas
  document.querySelectorAll('script[data-schema-type="json-ld"]').forEach((el) => el.remove());

  schemas.forEach((schema, index) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-schema-type', 'json-ld');
    script.setAttribute('data-schema-index', String(index));
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  });
};

// Update document meta tags
export const updateMetaTags = (config: MetaTagsConfig): void => {
  // Update title
  document.title = config.title;

  // Helper to update or create meta tag
  const setMetaTag = (name: string, content: string, property = false) => {
    const attr = property ? 'property' : 'name';
    let tag = document.querySelector(`meta[${attr}="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Basic meta tags
  setMetaTag('description', config.description);
  if (config.keywords) setMetaTag('keywords', config.keywords);

  // Robots
  const robotsContent = [
    config.noIndex ? 'noindex' : 'index',
    config.noFollow ? 'nofollow' : 'follow',
  ].join(', ');
  setMetaTag('robots', robotsContent);

  // Open Graph tags
  setMetaTag('og:title', config.title, true);
  setMetaTag('og:description', config.description, true);
  setMetaTag('og:type', config.ogType || 'website', true);
  if (config.canonicalUrl) setMetaTag('og:url', config.canonicalUrl, true);
  if (config.ogImage) setMetaTag('og:image', config.ogImage, true);
  setMetaTag('og:site_name', 'Flamoral', true);

  // Twitter Card tags
  setMetaTag('twitter:card', config.twitterCard || 'summary_large_image');
  setMetaTag('twitter:title', config.title);
  setMetaTag('twitter:description', config.description);
  if (config.ogImage) setMetaTag('twitter:image', config.ogImage);
  setMetaTag('twitter:site', '@flamoral');

  // Article-specific tags
  if (config.ogType === 'article') {
    if (config.author) setMetaTag('article:author', config.author, true);
    if (config.publishedTime) setMetaTag('article:published_time', config.publishedTime, true);
    if (config.modifiedTime) setMetaTag('article:modified_time', config.modifiedTime, true);
  }

  // Canonical URL
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (config.canonicalUrl) {
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = config.canonicalUrl;
  } else if (canonicalLink) {
    canonicalLink.remove();
  }
};

// Export all schemas for global injection
export const globalSchemas = [organizationSchema, websiteSchema, mobileAppSchema];
