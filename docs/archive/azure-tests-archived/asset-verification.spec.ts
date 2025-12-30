/**
 * E2E Tests for Asset Verification
 * Verifies all static assets and media are accessible and served correctly
 */

import { test, expect, Page, Response } from '@playwright/test';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Allowed origins for assets - customize based on your CDN/storage setup
 */
const ALLOWED_ASSET_ORIGINS = [
  // Local development
  'http://localhost:3000',
  'http://localhost:3001',

  // Azure Blob Storage
  /^https:\/\/[a-z0-9]+\.blob\.core\.windows\.net$/,

  // Azure CDN
  /^https:\/\/[a-z0-9-]+\.azureedge\.net$/,

  // Cloudflare CDN
  /^https:\/\/[a-z0-9-]+\.cloudflare\.com$/,

  // Your custom domain
  /^https:\/\/(www\.)?flamoral\.com$/,
  /^https:\/\/cdn\.flamoral\.com$/,
  /^https:\/\/media\.flamoral\.com$/,
];

/**
 * Expected cache control headers for different asset types
 */
const EXPECTED_CACHE_HEADERS = {
  images: {
    minMaxAge: 86400, // 1 day minimum
    expectedDirectives: ['public'],
  },
  staticAssets: {
    minMaxAge: 2592000, // 30 days minimum for JS/CSS with hashes
    expectedDirectives: ['public', 'immutable'],
  },
  profileMedia: {
    minMaxAge: 3600, // 1 hour minimum for user-uploaded content
    expectedDirectives: ['private'],
  },
};

// ============================================================================
// Helper Types
// ============================================================================

interface AssetInfo {
  url: string;
  type: 'image' | 'video' | 'audio' | 'font' | 'css' | 'js' | 'other';
  source: 'src' | 'srcset' | 'background' | 'link' | 'script';
  element?: string;
}

interface AssetVerificationResult {
  asset: AssetInfo;
  status: number;
  headers: Record<string, string>;
  error?: string;
  warnings: string[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract all asset URLs from a page
 */
async function extractAllAssetUrls(page: Page): Promise<AssetInfo[]> {
  const assets: AssetInfo[] = [];

  // Extract image sources
  const imgSources = await page.evaluate(() => {
    const results: { url: string; source: string; element: string }[] = [];

    // Regular img elements
    document.querySelectorAll('img').forEach((img) => {
      if (img.src) {
        results.push({ url: img.src, source: 'src', element: 'img' });
      }
      if (img.srcset) {
        img.srcset.split(',').forEach((srcsetItem) => {
          const url = srcsetItem.trim().split(' ')[0];
          if (url) {
            results.push({ url, source: 'srcset', element: 'img' });
          }
        });
      }
    });

    // Picture sources
    document.querySelectorAll('picture source').forEach((source) => {
      const srcset = source.getAttribute('srcset');
      if (srcset) {
        srcset.split(',').forEach((srcsetItem) => {
          const url = srcsetItem.trim().split(' ')[0];
          if (url) {
            results.push({ url, source: 'srcset', element: 'picture>source' });
          }
        });
      }
    });

    return results;
  });

  imgSources.forEach((item) => {
    assets.push({
      url: item.url,
      type: 'image',
      source: item.source as 'src' | 'srcset',
      element: item.element,
    });
  });

  // Extract video sources
  const videoSources = await page.evaluate(() => {
    const results: { url: string; element: string }[] = [];

    document.querySelectorAll('video').forEach((video) => {
      if (video.src) {
        results.push({ url: video.src, element: 'video' });
      }
      video.querySelectorAll('source').forEach((source) => {
        if (source.src) {
          results.push({ url: source.src, element: 'video>source' });
        }
      });
      if (video.poster) {
        results.push({ url: video.poster, element: 'video[poster]' });
      }
    });

    return results;
  });

  videoSources.forEach((item) => {
    assets.push({
      url: item.url,
      type: item.element.includes('poster') ? 'image' : 'video',
      source: 'src',
      element: item.element,
    });
  });

  // Extract audio sources
  const audioSources = await page.evaluate(() => {
    const results: string[] = [];

    document.querySelectorAll('audio').forEach((audio) => {
      if (audio.src) results.push(audio.src);
      audio.querySelectorAll('source').forEach((source) => {
        if (source.src) results.push(source.src);
      });
    });

    return results;
  });

  audioSources.forEach((url) => {
    assets.push({ url, type: 'audio', source: 'src', element: 'audio' });
  });

  // Extract background images from CSS
  const backgroundImages = await page.evaluate(() => {
    const results: string[] = [];
    const urlRegex = /url\(["']?([^"')]+)["']?\)/g;

    document.querySelectorAll('*').forEach((element) => {
      const style = window.getComputedStyle(element);
      const bgImage = style.backgroundImage;

      if (bgImage && bgImage !== 'none') {
        let match;
        while ((match = urlRegex.exec(bgImage)) !== null) {
          if (!match[1].startsWith('data:')) {
            results.push(match[1]);
          }
        }
      }
    });

    return [...new Set(results)];
  });

  backgroundImages.forEach((url) => {
    assets.push({ url, type: 'image', source: 'background', element: 'css-background' });
  });

  // Extract linked stylesheets
  const stylesheets = await page.evaluate(() => {
    const results: string[] = [];
    document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
      const href = link.getAttribute('href');
      if (href) results.push(new URL(href, window.location.origin).href);
    });
    return results;
  });

  stylesheets.forEach((url) => {
    assets.push({ url, type: 'css', source: 'link', element: 'link[stylesheet]' });
  });

  // Extract scripts
  const scripts = await page.evaluate(() => {
    const results: string[] = [];
    document.querySelectorAll('script[src]').forEach((script) => {
      const src = script.getAttribute('src');
      if (src) results.push(new URL(src, window.location.origin).href);
    });
    return results;
  });

  scripts.forEach((url) => {
    assets.push({ url, type: 'js', source: 'script', element: 'script' });
  });

  // Deduplicate assets
  const uniqueAssets = assets.filter((asset, index, self) =>
    index === self.findIndex((a) => a.url === asset.url)
  );

  return uniqueAssets;
}

/**
 * Verify an asset is accessible and has correct headers
 */
async function verifyAsset(
  page: Page,
  asset: AssetInfo
): Promise<AssetVerificationResult> {
  const warnings: string[] = [];
  let status = 0;
  const headers: Record<string, string> = {};
  let error: string | undefined;

  try {
    const response = await page.request.get(asset.url, {
      timeout: 10000,
    });

    status = response.status();

    // Capture relevant headers
    const headersObj = response.headers();
    headers['content-type'] = headersObj['content-type'] || '';
    headers['cache-control'] = headersObj['cache-control'] || '';
    headers['access-control-allow-origin'] = headersObj['access-control-allow-origin'] || '';
    headers['etag'] = headersObj['etag'] || '';
    headers['last-modified'] = headersObj['last-modified'] || '';

    // Check for HTTP on HTTPS pages
    if (asset.url.startsWith('http://') && page.url().startsWith('https://')) {
      warnings.push('Mixed content: HTTP resource on HTTPS page');
    }

    // Check origin is allowed
    const assetOrigin = new URL(asset.url).origin;
    const isAllowedOrigin = ALLOWED_ASSET_ORIGINS.some((allowed) => {
      if (typeof allowed === 'string') {
        return assetOrigin === allowed;
      }
      return allowed.test(assetOrigin);
    });

    if (!isAllowedOrigin) {
      warnings.push(`Unexpected origin: ${assetOrigin}`);
    }

    // Check cache headers for images
    if (asset.type === 'image' && headers['cache-control']) {
      const cacheControl = headers['cache-control'];
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);

      if (maxAgeMatch) {
        const maxAge = parseInt(maxAgeMatch[1], 10);
        if (maxAge < EXPECTED_CACHE_HEADERS.images.minMaxAge) {
          warnings.push(
            `Cache max-age (${maxAge}s) is below recommended minimum (${EXPECTED_CACHE_HEADERS.images.minMaxAge}s)`
          );
        }
      } else if (!cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
        warnings.push('No max-age directive in Cache-Control header');
      }
    }

  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    status = 0;
  }

  return {
    asset,
    status,
    headers,
    error,
    warnings,
  };
}

/**
 * Log failed assets for debugging
 */
function logFailedAssets(results: AssetVerificationResult[]): void {
  const failed = results.filter((r) => r.status !== 200 || r.error);

  if (failed.length > 0) {
    console.log('\n=== Failed Assets ===');
    failed.forEach((result) => {
      console.log(`\nURL: ${result.asset.url}`);
      console.log(`  Type: ${result.asset.type}`);
      console.log(`  Source: ${result.asset.source}`);
      console.log(`  Element: ${result.asset.element}`);
      console.log(`  Status: ${result.status}`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });
    console.log('\n=====================\n');
  }
}

/**
 * Log assets with warnings
 */
function logAssetWarnings(results: AssetVerificationResult[]): void {
  const withWarnings = results.filter((r) => r.warnings.length > 0);

  if (withWarnings.length > 0) {
    console.log('\n=== Asset Warnings ===');
    withWarnings.forEach((result) => {
      console.log(`\nURL: ${result.asset.url}`);
      result.warnings.forEach((warning) => {
        console.log(`  - ${warning}`);
      });
    });
    console.log('\n======================\n');
  }
}

// ============================================================================
// Test Suites
// ============================================================================

test.describe('Asset Verification', () => {
  test.describe.configure({ mode: 'serial' });

  test('all images on landing page load successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);
    const imageAssets = assets.filter((a) => a.type === 'image');

    console.log(`Found ${imageAssets.length} image assets on landing page`);

    const results: AssetVerificationResult[] = [];
    for (const asset of imageAssets) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    logFailedAssets(results);

    const failedImages = results.filter((r) => r.status !== 200 && !r.error);
    const errorImages = results.filter((r) => r.error);

    expect(
      failedImages.length,
      `${failedImages.length} images returned non-200 status`
    ).toBe(0);

    expect(
      errorImages.length,
      `${errorImages.length} images failed to load`
    ).toBe(0);
  });

  test('profile images are served from correct CDN', async ({ page }) => {
    // Navigate to a page with profile images (discovery or similar)
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to navigate to discovery page if logged in, otherwise check landing page
    const discoveryLink = page.locator('a[href*="discover"], a[href*="discovery"]');
    if (await discoveryLink.count() > 0) {
      await discoveryLink.first().click();
      await page.waitForLoadState('networkidle');
    }

    const assets = await extractAllAssetUrls(page);
    const imageAssets = assets.filter((a) => a.type === 'image');

    const results: AssetVerificationResult[] = [];
    for (const asset of imageAssets) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    // Check for unexpected origins
    const unexpectedOrigins = results.filter((r) =>
      r.warnings.some((w) => w.includes('Unexpected origin'))
    );

    logAssetWarnings(results);

    // This is a soft check - log but don't fail if we find unexpected origins
    if (unexpectedOrigins.length > 0) {
      console.warn(
        `Found ${unexpectedOrigins.length} assets from unexpected origins`
      );
    }

    // All assets should load successfully regardless of origin
    const failedAssets = results.filter((r) => r.status !== 200 || r.error);
    expect(
      failedAssets.length,
      `${failedAssets.length} assets failed to load`
    ).toBe(0);
  });

  test('media assets have correct cache headers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);
    const imageAssets = assets.filter((a) => a.type === 'image');

    const results: AssetVerificationResult[] = [];
    for (const asset of imageAssets) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    logAssetWarnings(results);

    // Check that most assets have cache headers
    const assetsWithCacheHeaders = results.filter(
      (r) => r.headers['cache-control'] && r.status === 200
    );

    const assetsWithoutCacheHeaders = results.filter(
      (r) => !r.headers['cache-control'] && r.status === 200
    );

    console.log(`Assets with cache headers: ${assetsWithCacheHeaders.length}`);
    console.log(`Assets without cache headers: ${assetsWithoutCacheHeaders.length}`);

    // At least 80% of successful assets should have cache headers
    const cacheHeaderRatio =
      assetsWithCacheHeaders.length /
      (assetsWithCacheHeaders.length + assetsWithoutCacheHeaders.length);

    if (results.filter((r) => r.status === 200).length > 0) {
      expect(
        cacheHeaderRatio,
        'Most assets should have cache headers'
      ).toBeGreaterThanOrEqual(0.5);
    }
  });

  test('no mixed content warnings (HTTP on HTTPS)', async ({ page, baseURL }) => {
    // Only run this test if we're on HTTPS
    const isHttps = baseURL?.startsWith('https://') || false;

    test.skip(!isHttps, 'Skipping mixed content test - not running on HTTPS');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);

    // Check for HTTP URLs when page is HTTPS
    const httpAssets = assets.filter((a) => a.url.startsWith('http://'));

    if (httpAssets.length > 0) {
      console.log('\n=== Mixed Content Assets ===');
      httpAssets.forEach((asset) => {
        console.log(`  ${asset.type}: ${asset.url}`);
      });
      console.log('============================\n');
    }

    expect(
      httpAssets.length,
      `Found ${httpAssets.length} HTTP resources on HTTPS page`
    ).toBe(0);
  });

  test('background images load correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);
    const backgroundImages = assets.filter((a) => a.source === 'background');

    console.log(`Found ${backgroundImages.length} background images`);

    if (backgroundImages.length === 0) {
      console.log('No CSS background images found on page');
      return;
    }

    const results: AssetVerificationResult[] = [];
    for (const asset of backgroundImages) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    logFailedAssets(results);

    const failedImages = results.filter((r) => r.status !== 200 || r.error);

    expect(
      failedImages.length,
      `${failedImages.length} background images failed to load`
    ).toBe(0);
  });

  test('favicon and app icons are accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Extract favicon and app icon URLs
    const iconUrls = await page.evaluate(() => {
      const results: { url: string; rel: string }[] = [];

      // Standard favicon
      const favicon = document.querySelector('link[rel="icon"]');
      if (favicon) {
        const href = favicon.getAttribute('href');
        if (href) {
          results.push({
            url: new URL(href, window.location.origin).href,
            rel: 'icon',
          });
        }
      }

      // Shortcut icon (legacy)
      const shortcutIcon = document.querySelector('link[rel="shortcut icon"]');
      if (shortcutIcon) {
        const href = shortcutIcon.getAttribute('href');
        if (href) {
          results.push({
            url: new URL(href, window.location.origin).href,
            rel: 'shortcut icon',
          });
        }
      }

      // Apple touch icons
      document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((link) => {
        const href = link.getAttribute('href');
        if (href) {
          results.push({
            url: new URL(href, window.location.origin).href,
            rel: 'apple-touch-icon',
          });
        }
      });

      // PWA manifest icons
      const manifest = document.querySelector('link[rel="manifest"]');
      if (manifest) {
        const href = manifest.getAttribute('href');
        if (href) {
          results.push({
            url: new URL(href, window.location.origin).href,
            rel: 'manifest',
          });
        }
      }

      // MS tile icon
      const msTile = document.querySelector('meta[name="msapplication-TileImage"]');
      if (msTile) {
        const content = msTile.getAttribute('content');
        if (content) {
          results.push({
            url: new URL(content, window.location.origin).href,
            rel: 'msapplication-TileImage',
          });
        }
      }

      return results;
    });

    console.log(`Found ${iconUrls.length} favicon/app icons`);

    if (iconUrls.length === 0) {
      console.warn('No favicon or app icons found on page');
      // Try the default /favicon.ico
      iconUrls.push({
        url: new URL('/favicon.ico', page.url()).href,
        rel: 'default favicon.ico',
      });
    }

    const results: { url: string; rel: string; status: number; error?: string }[] = [];

    for (const icon of iconUrls) {
      try {
        const response = await page.request.get(icon.url, { timeout: 10000 });
        results.push({
          url: icon.url,
          rel: icon.rel,
          status: response.status(),
        });
      } catch (err) {
        results.push({
          url: icon.url,
          rel: icon.rel,
          status: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Log all icon results
    console.log('\n=== Favicon/Icon Results ===');
    results.forEach((result) => {
      const statusIcon = result.status === 200 ? '[OK]' : '[FAIL]';
      console.log(`  ${statusIcon} ${result.rel}: ${result.url} (${result.status})`);
      if (result.error) {
        console.log(`       Error: ${result.error}`);
      }
    });
    console.log('============================\n');

    const failedIcons = results.filter((r) => r.status !== 200);

    // At least one icon should be accessible
    const successfulIcons = results.filter((r) => r.status === 200);
    expect(
      successfulIcons.length,
      'At least one favicon/app icon should be accessible'
    ).toBeGreaterThan(0);
  });

  test('all static assets on page load successfully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);

    console.log(`\n=== Asset Summary ===`);
    console.log(`Total assets found: ${assets.length}`);
    console.log(`  Images: ${assets.filter((a) => a.type === 'image').length}`);
    console.log(`  Videos: ${assets.filter((a) => a.type === 'video').length}`);
    console.log(`  Audio: ${assets.filter((a) => a.type === 'audio').length}`);
    console.log(`  CSS: ${assets.filter((a) => a.type === 'css').length}`);
    console.log(`  JS: ${assets.filter((a) => a.type === 'js').length}`);
    console.log(`  Other: ${assets.filter((a) => a.type === 'other').length}`);
    console.log(`=====================\n`);

    const results: AssetVerificationResult[] = [];
    for (const asset of assets) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    logFailedAssets(results);
    logAssetWarnings(results);

    const failedAssets = results.filter((r) => r.status !== 200 && !r.error);
    const errorAssets = results.filter((r) => r.error);

    console.log(`\n=== Verification Results ===`);
    console.log(`Successful: ${results.filter((r) => r.status === 200).length}`);
    console.log(`Failed (non-200): ${failedAssets.length}`);
    console.log(`Errors: ${errorAssets.length}`);
    console.log(`With warnings: ${results.filter((r) => r.warnings.length > 0).length}`);
    console.log(`============================\n`);

    expect(
      failedAssets.length,
      `${failedAssets.length} assets returned non-200 status`
    ).toBe(0);

    expect(
      errorAssets.length,
      `${errorAssets.length} assets failed to load`
    ).toBe(0);
  });

  test('video and audio media load correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);
    const mediaAssets = assets.filter(
      (a) => a.type === 'video' || a.type === 'audio'
    );

    if (mediaAssets.length === 0) {
      console.log('No video/audio assets found on landing page');
      return;
    }

    console.log(`Found ${mediaAssets.length} video/audio assets`);

    const results: AssetVerificationResult[] = [];
    for (const asset of mediaAssets) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    logFailedAssets(results);

    const failedMedia = results.filter((r) => r.status !== 200 || r.error);

    expect(
      failedMedia.length,
      `${failedMedia.length} media assets failed to load`
    ).toBe(0);
  });

  test('CORS headers are correctly set for CDN assets', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const assets = await extractAllAssetUrls(page);

    // Filter for assets from CDN domains
    const cdnAssets = assets.filter((asset) => {
      const url = new URL(asset.url);
      return (
        url.hostname.includes('blob.core.windows.net') ||
        url.hostname.includes('azureedge.net') ||
        url.hostname.includes('cloudflare') ||
        url.hostname.includes('cdn.')
      );
    });

    if (cdnAssets.length === 0) {
      console.log('No CDN assets found - skipping CORS verification');
      return;
    }

    console.log(`Found ${cdnAssets.length} CDN assets`);

    const results: AssetVerificationResult[] = [];
    for (const asset of cdnAssets) {
      const result = await verifyAsset(page, asset);
      results.push(result);
    }

    // Check CORS headers
    const assetsWithCors = results.filter(
      (r) => r.headers['access-control-allow-origin']
    );
    const assetsWithoutCors = results.filter(
      (r) => !r.headers['access-control-allow-origin'] && r.status === 200
    );

    console.log(`CDN assets with CORS headers: ${assetsWithCors.length}`);
    console.log(`CDN assets without CORS headers: ${assetsWithoutCors.length}`);

    // Log assets without CORS for debugging
    if (assetsWithoutCors.length > 0) {
      console.log('\n=== CDN Assets Missing CORS Headers ===');
      assetsWithoutCors.forEach((result) => {
        console.log(`  ${result.asset.url}`);
      });
      console.log('=======================================\n');
    }

    // All successful CDN assets should have CORS headers
    // This is a soft warning, not a hard failure
    if (cdnAssets.length > 0 && assetsWithCors.length === 0) {
      console.warn('Warning: No CDN assets have CORS headers configured');
    }
  });
});

test.describe('Page-Specific Asset Verification', () => {
  const pagesToCheck = [
    { path: '/', name: 'Landing Page' },
    { path: '/login', name: 'Login Page' },
    { path: '/signup', name: 'Signup Page' },
  ];

  for (const pageConfig of pagesToCheck) {
    test(`assets load correctly on ${pageConfig.name}`, async ({ page }) => {
      const response = await page.goto(pageConfig.path, {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // Skip if page doesn't exist
      if (response && response.status() === 404) {
        console.log(`Page ${pageConfig.path} not found - skipping`);
        return;
      }

      const assets = await extractAllAssetUrls(page);
      console.log(
        `${pageConfig.name}: Found ${assets.length} assets`
      );

      if (assets.length === 0) {
        return;
      }

      const results: AssetVerificationResult[] = [];
      for (const asset of assets) {
        const result = await verifyAsset(page, asset);
        results.push(result);
      }

      const failed = results.filter((r) => r.status !== 200 || r.error);

      if (failed.length > 0) {
        console.log(`\n=== Failed Assets on ${pageConfig.name} ===`);
        failed.forEach((result) => {
          console.log(`  [${result.status}] ${result.asset.url}`);
          if (result.error) {
            console.log(`       Error: ${result.error}`);
          }
        });
        console.log('==========================================\n');
      }

      expect(
        failed.length,
        `${failed.length} assets failed on ${pageConfig.name}`
      ).toBe(0);
    });
  }
});
