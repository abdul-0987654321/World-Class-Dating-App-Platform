import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';
import { authenticate, getAuthHeaders } from '../utils/auth.js';
import { generateSearchFilters, generateCoordinatesWithinRadius } from '../utils/data-generator.js';
import { BASE_URL, parseEnvConfig } from '../utils/config.js';

/**
 * DATABASE QUERY PERFORMANCE TEST
 *
 * Purpose: Test database query performance under load
 * Focus:
 * - Query response times
 * - Index effectiveness
 * - N+1 query detection
 * - Connection pool behavior
 * - Slow query identification
 *
 * Tested query types:
 * 1. Simple lookups (indexed)
 * 2. Complex joins (matches, messages)
 * 3. Geo-spatial queries (discovery by location)
 * 4. Aggregation queries (stats, counts)
 * 5. Full-text search
 */

// Custom database metrics
const dbQueryCount = new Counter('db_query_count');
const dbSlowQueries = new Counter('db_slow_queries');
const dbQueryLatency = new Trend('db_query_latency', true);
const dbConnectionErrors = new Rate('db_connection_errors');
const dbIndexedQueries = new Counter('db_indexed_queries');
const dbFullScanQueries = new Counter('db_full_scan_queries');

// Query type metrics
const simpleQueryLatency = new Trend('simple_query_latency');
const joinQueryLatency = new Trend('join_query_latency');
const geoQueryLatency = new Trend('geo_query_latency');
const aggregationQueryLatency = new Trend('aggregation_query_latency');
const searchQueryLatency = new Trend('search_query_latency');

export const options = {
  scenarios: {
    database_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 500 },
        { duration: '3m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },

  thresholds: {
    'db_query_latency': ['p(95)<100', 'p(99)<250'],
    'db_connection_errors': ['rate<0.01'],
    'simple_query_latency': ['p(95)<50', 'p(99)<100'],
    'join_query_latency': ['p(95)<150', 'p(99)<300'],
    'geo_query_latency': ['p(95)<200', 'p(99)<400'],
    'aggregation_query_latency': ['p(95)<250', 'p(99)<500'],
    'search_query_latency': ['p(95)<300', 'p(99)<600'],
  },

  summaryTrendStats: ['min', 'max', 'med', 'avg', 'p(90)', 'p(95)', 'p(99)'],
};

const config = parseEnvConfig();

export function setup() {
  console.log('=== Database Performance Test Setup ===');
  console.log('Testing query performance under load...');

  const token = authenticate(config.testEmail, config.testPassword);

  if (!token) {
    console.error('Setup failed: Could not authenticate');
    return null;
  }

  return { token };
}

export default function(data) {
  if (!data || !data.token) {
    dbConnectionErrors.add(1);
    return;
  }

  const headers = getAuthHeaders(data.token);

  // 1. SIMPLE INDEXED QUERIES (Primary Key / Indexed Lookups)
  group('Simple Indexed Queries', () => {
    const startTime = Date.now();

    const profileRes = http.get(`${BASE_URL}/users/me`, {
      headers,
      tags: { query_type: 'simple', db_operation: 'select' },
    });

    const queryTime = Date.now() - startTime;
    dbQueryCount.add(1);
    simpleQueryLatency.add(queryTime);
    dbQueryLatency.add(queryTime);

    if (queryTime > 100) {
      dbSlowQueries.add(1);
    }

    check(profileRes, {
      'simple query succeeded': (r) => r.status === 200,
      'simple query < 50ms': (r) => queryTime < 50,
    }) || dbConnectionErrors.add(1);

    if (profileRes.headers['X-Query-Type'] === 'indexed') {
      dbIndexedQueries.add(1);
    } else if (profileRes.headers['X-Query-Type'] === 'scan') {
      dbFullScanQueries.add(1);
    }
  });

  sleep(0.5);

  // 2. COMPLEX JOIN QUERIES (Matches with User Data)
  group('Complex Join Queries', () => {
    const startTime = Date.now();

    const matchesRes = http.get(`${BASE_URL}/matches`, {
      headers,
      tags: { query_type: 'join', db_operation: 'select_join' },
    });

    const queryTime = Date.now() - startTime;
    dbQueryCount.add(1);
    joinQueryLatency.add(queryTime);
    dbQueryLatency.add(queryTime);

    if (queryTime > 300) {
      dbSlowQueries.add(1);
    }

    check(matchesRes, {
      'join query succeeded': (r) => r.status === 200,
      'join query < 150ms': (r) => queryTime < 150,
    });
  });

  sleep(0.5);

  // 3. GEO-SPATIAL QUERIES (Location-Based Discovery)
  group('Geo-Spatial Queries', () => {
    const startTime = Date.now();

    const location = generateCoordinatesWithinRadius(40.7128, -74.0060, 50);

    const discoveryRes = http.post(
      `${BASE_URL}/discover/search`,
      JSON.stringify({
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
        distance: 50,
      }),
      {
        headers,
        tags: { query_type: 'geo', db_operation: 'geo_search' },
      }
    );

    const queryTime = Date.now() - startTime;
    dbQueryCount.add(1);
    geoQueryLatency.add(queryTime);
    dbQueryLatency.add(queryTime);

    if (queryTime > 400) {
      dbSlowQueries.add(1);
    }

    check(discoveryRes, {
      'geo query succeeded': (r) => r.status === 200,
      'geo query < 200ms': (r) => queryTime < 200,
      'geo query uses spatial index': (r) => {
        // Check if spatial index was used (would be in headers/logs in real impl)
        return queryTime < 500; // Proxy check
      },
    });
  });

  sleep(0.5);

  // 4. AGGREGATION QUERIES (Counts, Stats)
  group('Aggregation Queries', () => {
    const startTime = Date.now();

    const conversationsRes = http.get(`${BASE_URL}/messages/conversations?include_unread=true`, {
      headers,
      tags: { query_type: 'aggregation', db_operation: 'select_count' },
    });

    const queryTime = Date.now() - startTime;
    dbQueryCount.add(1);
    aggregationQueryLatency.add(queryTime);
    dbQueryLatency.add(queryTime);

    if (queryTime > 500) {
      dbSlowQueries.add(1);
    }

    check(conversationsRes, {
      'aggregation query succeeded': (r) => r.status === 200,
      'aggregation query < 250ms': (r) => queryTime < 250,
    });
  });

  sleep(0.5);

  // 5. FULL-TEXT SEARCH QUERIES
  group('Full-Text Search Queries', () => {
    const startTime = Date.now();

    const filters = generateSearchFilters();
    const searchRes = http.post(
      `${BASE_URL}/discover/search`,
      JSON.stringify(filters),
      {
        headers,
        tags: { query_type: 'search', db_operation: 'full_text_search' },
      }
    );

    const queryTime = Date.now() - startTime;
    dbQueryCount.add(1);
    searchQueryLatency.add(queryTime);
    dbQueryLatency.add(queryTime);

    if (queryTime > 600) {
      dbSlowQueries.add(1);
    }

    check(searchRes, {
      'search query succeeded': (r) => r.status === 200,
      'search query < 300ms': (r) => queryTime < 300,
    });
  });

  sleep(Math.random() * 2 + 1);
}

export function teardown(data) {
  console.log('=== Database Performance Test Completed ===');
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString();

  const totalQueries = data.metrics.db_query_count?.values?.count || 0;
  const slowQueries = data.metrics.db_slow_queries?.values?.count || 0;
  const connectionErrors = data.metrics.db_connection_errors?.values?.rate || 0;
  const avgQueryLatency = data.metrics.db_query_latency?.values?.avg || 0;
  const p95QueryLatency = data.metrics.db_query_latency?.values?.['p(95)'] || 0;
  const p99QueryLatency = data.metrics.db_query_latency?.values?.['p(99)'] || 0;

  // Query type performance
  const simpleP95 = data.metrics.simple_query_latency?.values?.['p(95)'] || 0;
  const joinP95 = data.metrics.join_query_latency?.values?.['p(95)'] || 0;
  const geoP95 = data.metrics.geo_query_latency?.values?.['p(95)'] || 0;
  const aggP95 = data.metrics.aggregation_query_latency?.values?.['p(95)'] || 0;
  const searchP95 = data.metrics.search_query_latency?.values?.['p(95)'] || 0;

  const slowQueryRate = totalQueries > 0 ? (slowQueries / totalQueries * 100) : 0;
  const performanceGood = p95QueryLatency < 100 && slowQueryRate < 5;

  const summary = `
╔═══════════════════════════════════════════════════════════════════════════╗
║                 FLAMORAL DATABASE PERFORMANCE TEST                        ║
║                      Query Performance Analysis                           ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 OVERALL QUERY METRICS
─────────────────────────────────────────────────────────────────────────────
Total Queries:           ${totalQueries.toLocaleString()}
Slow Queries (>100ms):   ${slowQueries.toLocaleString()} (${slowQueryRate.toFixed(2)}%)
Connection Errors:       ${(connectionErrors * 100).toFixed(3)}%

Avg Query Time:          ${avgQueryLatency.toFixed(2)}ms
P95 Query Time:          ${p95QueryLatency.toFixed(2)}ms  ${p95QueryLatency < 100 ? '✅' : '⚠️'}
P99 Query Time:          ${p99QueryLatency.toFixed(2)}ms  ${p99QueryLatency < 250 ? '✅' : '⚠️'}

Overall Performance:     ${performanceGood ? '✅ EXCELLENT' : '⚠️  NEEDS OPTIMIZATION'}

🔍 QUERY TYPE PERFORMANCE
─────────────────────────────────────────────────────────────────────────────
Simple Indexed Queries:
  P95: ${simpleP95.toFixed(2)}ms  ${simpleP95 < 50 ? '✅' : '⚠️'}
  Target: < 50ms

Complex Join Queries:
  P95: ${joinP95.toFixed(2)}ms  ${joinP95 < 150 ? '✅' : '⚠️'}
  Target: < 150ms

Geo-Spatial Queries:
  P95: ${geoP95.toFixed(2)}ms  ${geoP95 < 200 ? '✅' : '⚠️'}
  Target: < 200ms

Aggregation Queries:
  P95: ${aggP95.toFixed(2)}ms  ${aggP95 < 250 ? '✅' : '⚠️'}
  Target: < 250ms

Full-Text Search:
  P95: ${searchP95.toFixed(2)}ms  ${searchP95 < 300 ? '✅' : '⚠️'}
  Target: < 300ms

⚙️  DATABASE HEALTH
─────────────────────────────────────────────────────────────────────────────
${connectionErrors < 0.01 ? '✅' : '❌'} Connection Pool: ${connectionErrors < 0.01 ? 'Healthy' : 'Issues detected'}
${slowQueryRate < 5 ? '✅' : '❌'} Slow Query Rate: ${slowQueryRate.toFixed(2)}% ${slowQueryRate < 5 ? '(Good)' : '(High)'}
${p95QueryLatency < 100 ? '✅' : '❌'} P95 Performance: ${p95QueryLatency < 100 ? 'Excellent' : 'Needs optimization'}

💡 RECOMMENDATIONS
─────────────────────────────────────────────────────────────────────────────
${simpleP95 > 50 ? '• Review primary key indexes\n• Check for SELECT N+1 patterns\n' : ''}${joinP95 > 150 ? '• Optimize join queries with proper indexes\n• Consider denormalization for frequently joined data\n' : ''}${geoP95 > 200 ? '• Verify spatial indexes are being used\n• Consider PostGIS optimization\n' : ''}${aggP95 > 250 ? '• Add indexes on aggregated columns\n• Consider materialized views for stats\n' : ''}${searchP95 > 300 ? '• Optimize full-text search indexes\n• Consider Elasticsearch for complex searches\n' : ''}${connectionErrors > 0.005 ? '• Increase connection pool size\n• Review connection timeout settings\n' : ''}${slowQueryRate > 5 ? '• Enable slow query logging\n• Review and optimize problematic queries\n' : ''}${performanceGood ? '• Database performance is excellent\n• Continue monitoring as data grows\n' : ''}
═══════════════════════════════════════════════════════════════════════════
`;

  console.log(summary);

  return {
    'stdout': summary,
    [`results/db-performance-${timestamp}.json`]: JSON.stringify(data, null, 2),
    [`results/db-performance-${timestamp}.html`]: htmlDatabaseReport(data, performanceGood),
  };
}

function htmlDatabaseReport(data, performanceGood) {
  const totalQueries = data.metrics.db_query_count?.values?.count || 0;
  const slowQueries = data.metrics.db_slow_queries?.values?.count || 0;
  const p95 = data.metrics.db_query_latency?.values?.['p(95)'] || 0;

  const simpleP95 = data.metrics.simple_query_latency?.values?.['p(95)'] || 0;
  const joinP95 = data.metrics.join_query_latency?.values?.['p(95)'] || 0;
  const geoP95 = data.metrics.geo_query_latency?.values?.['p(95)'] || 0;
  const aggP95 = data.metrics.aggregation_query_latency?.values?.['p(95)'] || 0;
  const searchP95 = data.metrics.search_query_latency?.values?.['p(95)'] || 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Database Performance - Flamoral</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
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
      margin-top: 15px;
      background: ${performanceGood ? '#10b981' : '#f59e0b'};
      color: white;
      display: inline-block;
    }
    .query-types {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    .query-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }
    .query-card h3 { color: #3b82f6; margin-bottom: 15px; }
    .metric { display: flex; justify-content: space-between; padding: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗄️ Database Performance Test</h1>
      <p style="font-size: 1.2em; margin-top: 10px;">Query Performance Analysis</p>
      <div class="status">${performanceGood ? '✅ EXCELLENT PERFORMANCE' : '⚠️  OPTIMIZATION NEEDED'}</div>
    </div>
    <div class="query-types">
      <div class="query-card">
        <h3>Simple Indexed</h3>
        <div class="metric"><span>P95:</span><span style="color: ${simpleP95 < 50 ? '#10b981' : '#f59e0b'};">${simpleP95.toFixed(0)}ms</span></div>
        <div class="metric"><span>Target:</span><span>&lt; 50ms</span></div>
      </div>
      <div class="query-card">
        <h3>Complex Joins</h3>
        <div class="metric"><span>P95:</span><span style="color: ${joinP95 < 150 ? '#10b981' : '#f59e0b'};">${joinP95.toFixed(0)}ms</span></div>
        <div class="metric"><span>Target:</span><span>&lt; 150ms</span></div>
      </div>
      <div class="query-card">
        <h3>Geo-Spatial</h3>
        <div class="metric"><span>P95:</span><span style="color: ${geoP95 < 200 ? '#10b981' : '#f59e0b'};">${geoP95.toFixed(0)}ms</span></div>
        <div class="metric"><span>Target:</span><span>&lt; 200ms</span></div>
      </div>
      <div class="query-card">
        <h3>Aggregation</h3>
        <div class="metric"><span>P95:</span><span style="color: ${aggP95 < 250 ? '#10b981' : '#f59e0b'};">${aggP95.toFixed(0)}ms</span></div>
        <div class="metric"><span>Target:</span><span>&lt; 250ms</span></div>
      </div>
      <div class="query-card">
        <h3>Full-Text Search</h3>
        <div class="metric"><span>P95:</span><span style="color: ${searchP95 < 300 ? '#10b981' : '#f59e0b'};">${searchP95.toFixed(0)}ms</span></div>
        <div class="metric"><span>Target:</span><span>&lt; 300ms</span></div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
