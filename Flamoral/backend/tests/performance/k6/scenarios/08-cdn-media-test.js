import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { generatePhotoMetadata } from '../utils/data-generator.js';
import { BASE_URL, CDN_URL, parseEnvConfig } from '../utils/config.js';

/**
 * CDN AND MEDIA DELIVERY PERFORMANCE TEST
 *
 * Purpose: Test media upload, processing, and CDN delivery performance
 * Focus:
 * - Upload speeds for various file sizes
 * - Image processing time
 * - CDN cache hit rates
 * - Global delivery performance
 * - Thumbnail generation speed
 */

// Custom media metrics
const uploadCount = new Counter('upload_count');
const uploadLatency = new Trend('upload_latency', true);
const uploadErrors = new Rate('upload_errors');
const cdnHitRate = new Rate('cdn_cache_hit');
const cdnLatency = new Trend('cdn_latency', true);
const imageProcessingTime = new Trend('image_processing_time', true);
const thumbnailGenerationTime = new Trend('thumbnail_generation_time', true);

// File size metrics
const smallFileUpload = new Trend('small_file_upload_time'); // < 1MB
const mediumFileUpload = new Trend('medium_file_upload_time'); // 1-5MB
const largeFileUpload = new Trend('large_file_upload_time'); // > 5MB

export const options = {
  scenarios: {
    media_upload: {
      executor: 'constant-vus',
      vus: 30,
      duration: '5m',
      exec: 'testMediaUpload',
      tags: { test_type: 'upload' },
    },
    cdn_delivery: {
      executor: 'constant-vus',
      vus: 100,
      duration: '5m',
      exec: 'testCDNDelivery',
      tags: { test_type: 'cdn' },
      startTime: '0s',
    },
  },

  thresholds: {
    'upload_latency': ['p(95)<2000', 'p(99)<5000'],
    'cdn_latency': ['p(95)<100', 'p(99)<200'],
    'upload_errors': ['rate<0.02'],
    'cdn_cache_hit': ['rate>0.80'], // 80% cache hit rate
    'image_processing_time': ['p(95)<3000'],
    'small_file_upload_time': ['p(95)<1000'],
    'medium_file_upload_time': ['p(95)<3000'],
    'large_file_upload_time': ['p(95)<8000'],
  },

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
};

const config = parseEnvConfig();

export function setup() {
  console.log('=== CDN and Media Performance Test Setup ===');
  console.log(`API URL: ${BASE_URL}`);
  console.log(`CDN URL: ${CDN_URL}`);

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  return { token };
}

// Test 1: Media Upload Performance
export function testMediaUpload(data) {
  if (!data || !data.token) {
    uploadErrors.add(1);
    return;
  }

  const headers = getAuthHeaders(data.token);

  group('Media Upload', () => {
    // Generate test image data
    const metadata = generatePhotoMetadata();
    const fileSize = metadata.size;

    // Categorize by file size
    let sizeCategory = 'small';
    if (fileSize > 5000000) sizeCategory = 'large';
    else if (fileSize > 1000000) sizeCategory = 'medium';

    // Simulate image upload (in real scenario, would send actual binary data)
    const uploadStart = Date.now();

    // Create a mock binary payload (normally you'd use file.open() in k6)
    const mockImageData = 'x'.repeat(Math.min(fileSize, 100000)); // Limit for test

    const uploadRes = http.post(
      `${BASE_URL}/media/upload`,
      {
        file: http.file(mockImageData, `test-image-${__VU}-${Date.now()}.${metadata.format}`),
        type: 'profile_photo',
      },
      {
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        timeout: '30s',
        tags: { file_size: sizeCategory },
      }
    );

    const uploadTime = Date.now() - uploadStart;

    uploadCount.add(1);
    uploadLatency.add(uploadTime);

    // Track by size category
    if (sizeCategory === 'small') smallFileUpload.add(uploadTime);
    else if (sizeCategory === 'medium') mediumFileUpload.add(uploadTime);
    else if (sizeCategory === 'large') largeFileUpload.add(uploadTime);

    const success = check(uploadRes, {
      'upload status 200 or 201': (r) => r.status === 200 || r.status === 201,
      'upload completed in time': (r) => uploadTime < 10000,
      'response has media URL': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.url || body.media_url;
        } catch {
          return false;
        }
      },
    });

    if (!success) {
      uploadErrors.add(1);
    }

    // Check image processing time from response headers
    if (uploadRes.headers['X-Processing-Time']) {
      const processingTime = parseInt(uploadRes.headers['X-Processing-Time']);
      imageProcessingTime.add(processingTime);
    }

    // Check thumbnail generation time
    if (uploadRes.headers['X-Thumbnail-Time']) {
      const thumbnailTime = parseInt(uploadRes.headers['X-Thumbnail-Time']);
      thumbnailGenerationTime.add(thumbnailTime);
    }

    sleep(Math.random() * 2 + 1);
  });
}

// Test 2: CDN Delivery Performance
export function testCDNDelivery(data) {
  group('CDN Delivery', () => {
    // Test various CDN endpoints
    const testPaths = [
      '/images/profile-photos/sample1.jpg',
      '/images/profile-photos/sample2.jpg',
      '/images/thumbnails/sample1_thumb.jpg',
      '/images/thumbnails/sample2_thumb.jpg',
    ];

    const path = testPaths[Math.floor(Math.random() * testPaths.length)];
    const cdnStart = Date.now();

    const cdnRes = http.get(`${CDN_URL}${path}`, {
      headers: {
        'Accept': 'image/*',
      },
      tags: { cdn_resource: 'image' },
    });

    const cdnTime = Date.now() - cdnStart;
    cdnLatency.add(cdnTime);

    // Check cache headers
    const isCacheHit = cdnRes.headers['X-Cache'] === 'HIT' ||
                       cdnRes.headers['CF-Cache-Status'] === 'HIT' ||
                       cdnRes.headers['X-Cache-Status'] === 'HIT';

    cdnHitRate.add(isCacheHit ? 1 : 0);

    check(cdnRes, {
      'CDN status 200': (r) => r.status === 200 || r.status === 304,
      'CDN response < 100ms': (r) => cdnTime < 100,
      'image delivered': (r) => r.body && r.body.length > 0,
      'cache headers present': (r) => r.headers['Cache-Control'] !== undefined,
      'CDN cache hit': (r) => isCacheHit,
    });

    // Check image format optimization
    const contentType = cdnRes.headers['Content-Type'];
    const optimized = contentType && (contentType.includes('webp') || contentType.includes('avif'));

    check(cdnRes, {
      'image format optimized': () => optimized,
    });

    sleep(0.5);
  });
}

export function teardown(data) {
  console.log('=== CDN and Media Test Completed ===');
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  const totalUploads = data.metrics.upload_count?.values?.count || 0;
  const uploadErrorRate = data.metrics.upload_errors?.values?.rate || 0;
  const avgUploadTime = data.metrics.upload_latency?.values?.avg || 0;
  const p95UploadTime = data.metrics.upload_latency?.values?.['p(95)'] || 0;
  const p99UploadTime = data.metrics.upload_latency?.values?.['p(99)'] || 0;

  const cacheHitRate = data.metrics.cdn_cache_hit?.values?.rate || 0;
  const avgCDNLatency = data.metrics.cdn_latency?.values?.avg || 0;
  const p95CDNLatency = data.metrics.cdn_latency?.values?.['p(95)'] || 0;

  const smallFileP95 = data.metrics.small_file_upload_time?.values?.['p(95)'] || 0;
  const mediumFileP95 = data.metrics.medium_file_upload_time?.values?.['p(95)'] || 0;
  const largeFileP95 = data.metrics.large_file_upload_time?.values?.['p(95)'] || 0;

  const uploadPerformanceGood = p95UploadTime < 2000 && uploadErrorRate < 0.02;
  const cdnPerformanceGood = p95CDNLatency < 100 && cacheHitRate > 0.80;

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                  FLAMORAL CDN AND MEDIA PERFORMANCE TEST                  ║
║                     Upload and Delivery Analysis                          ║
╚═══════════════════════════════════════════════════════════════════════════╝

📤 MEDIA UPLOAD PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
Total Uploads:           ${totalUploads.toLocaleString()}
Upload Error Rate:       ${(uploadErrorRate * 100).toFixed(2)}%

Average Upload Time:     ${avgUploadTime.toFixed(0)}ms
P95 Upload Time:         ${p95UploadTime.toFixed(0)}ms  ${p95UploadTime < 2000 ? '✅' : '⚠️'}
P99 Upload Time:         ${p99UploadTime.toFixed(0)}ms  ${p99UploadTime < 5000 ? '✅' : '⚠️'}

Upload Performance:      ${uploadPerformanceGood ? '✅ EXCELLENT' : '⚠️  NEEDS IMPROVEMENT'}

📁 UPLOAD BY FILE SIZE
─────────────────────────────────────────────────────────────────────────────
Small Files (< 1MB):     P95: ${smallFileP95.toFixed(0)}ms  ${smallFileP95 < 1000 ? '✅' : '⚠️'}
Medium Files (1-5MB):    P95: ${mediumFileP95.toFixed(0)}ms  ${mediumFileP95 < 3000 ? '✅' : '⚠️'}
Large Files (> 5MB):     P95: ${largeFileP95.toFixed(0)}ms  ${largeFileP95 < 8000 ? '✅' : '⚠️'}

🌐 CDN DELIVERY PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
Cache Hit Rate:          ${(cacheHitRate * 100).toFixed(1)}%  ${cacheHitRate > 0.80 ? '✅' : '⚠️'}
Average CDN Latency:     ${avgCDNLatency.toFixed(0)}ms
P95 CDN Latency:         ${p95CDNLatency.toFixed(0)}ms  ${p95CDNLatency < 100 ? '✅' : '⚠️'}

CDN Performance:         ${cdnPerformanceGood ? '✅ EXCELLENT' : '⚠️  NEEDS OPTIMIZATION'}

📊 IMAGE PROCESSING
─────────────────────────────────────────────────────────────────────────────
Image Processing:        P95: ${(data.metrics.image_processing_time?.values?.['p(95)'] || 0).toFixed(0)}ms
Thumbnail Generation:    P95: ${(data.metrics.thumbnail_generation_time?.values?.['p(95)'] || 0).toFixed(0)}ms

✅ PERFORMANCE ASSESSMENT
─────────────────────────────────────────────────────────────────────────────
${uploadPerformanceGood ? '✅' : '❌'} Upload Performance: ${uploadPerformanceGood ? 'Excellent' : 'Needs optimization'}
${cdnPerformanceGood ? '✅' : '❌'} CDN Performance: ${cdnPerformanceGood ? 'Excellent' : 'Needs optimization'}
${cacheHitRate > 0.90 ? '✅' : cacheHitRate > 0.80 ? '⚠️ ' : '❌'} Cache Effectiveness: ${(cacheHitRate * 100).toFixed(1)}%

💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${!uploadPerformanceGood ? '• Optimize image processing pipeline\n• Consider async processing for large files\n• Implement upload resumability\n' : ''}${!cdnPerformanceGood ? '• Review CDN configuration and regions\n• Optimize cache policies\n• Implement image compression\n' : ''}${cacheHitRate < 0.80 ? '• Increase CDN cache TTL\n• Review cache invalidation strategy\n' : ''}${smallFileP95 > 1000 ? '• Optimize small file handling\n• Review upload chunking strategy\n' : ''}${uploadPerformanceGood && cdnPerformanceGood ? '• Media delivery is well optimized\n• Continue monitoring cache hit rates\n' : ''}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/cdn-media-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/cdn-media-${timestamp}.html`]: htmlCDNReport(data, uploadPerformanceGood, cdnPerformanceGood),
  };
}

function htmlCDNReport(data, uploadGood, cdnGood) {
  const p95Upload = data.metrics.upload_latency?.values?.['p(95)'] || 0;
  const p95CDN = data.metrics.cdn_latency?.values?.['p(95)'] || 0;
  const cacheHitRate = data.metrics.cdn_cache_hit?.values?.rate || 0;
  const uploadErrorRate = data.metrics.upload_errors?.values?.rate || 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>CDN & Media Performance - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      margin-bottom: 30px;
    }
    .status {
      padding: 15px 30px;
      border-radius: 25px;
      font-weight: bold;
      margin: 10px;
      background: ${uploadGood && cdnGood ? '#10b981' : '#f59e0b'};
      color: white;
      display: inline-block;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }
    .metric-card {
      background: white;
      padding: 30px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .metric-value {
      font-size: 2.5em;
      font-weight: bold;
      color: #06b6d4;
      margin: 15px 0;
    }
    .metric-label { color: #666; text-transform: uppercase; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📤 CDN & Media Performance</h1>
      <p style="font-size: 1.2em; margin: 10px 0;">Upload and Delivery Analysis</p>
      <div class="status">${uploadGood && cdnGood ? '✅ EXCELLENT PERFORMANCE' : '⚠️  OPTIMIZATION NEEDED'}</div>
    </div>
    <div class="metrics">
      <div class="metric-card">
        <div class="metric-label">P95 Upload Time</div>
        <div class="metric-value">${p95Upload.toFixed(0)}ms</div>
        <div style="color: ${p95Upload < 2000 ? '#10b981' : '#f59e0b'};">
          ${p95Upload < 2000 ? '✅ Fast' : '⚠️  Slow'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 CDN Latency</div>
        <div class="metric-value">${p95CDN.toFixed(0)}ms</div>
        <div style="color: ${p95CDN < 100 ? '#10b981' : '#f59e0b'};">
          ${p95CDN < 100 ? '✅ Excellent' : '⚠️  High'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">CDN Cache Hit Rate</div>
        <div class="metric-value">${(cacheHitRate * 100).toFixed(1)}%</div>
        <div style="color: ${cacheHitRate > 0.80 ? '#10b981' : '#f59e0b'};">
          ${cacheHitRate > 0.80 ? '✅ Good' : '⚠️  Low'}
        </div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Upload Error Rate</div>
        <div class="metric-value">${(uploadErrorRate * 100).toFixed(2)}%</div>
        <div style="color: ${uploadErrorRate < 0.02 ? '#10b981' : '#f59e0b'};">
          ${uploadErrorRate < 0.02 ? '✅ Low' : '⚠️  High'}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
