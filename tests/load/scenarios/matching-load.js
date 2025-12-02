import http from 'k6/http';
import { check, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { options, randomUser, think } from '../k6-config.js';

/**
 * Load Test: Matching Service
 * Tests recommendations, swiping, match creation
 */

export { options };

// Custom metrics
const matchCreationRate = new Rate('match_creation_rate');
const swipeSuccessRate = new Rate('swipe_success_rate');
const recommendationLoadTime = new Trend('recommendation_load_time');
const swipeLatency = new Trend('swipe_latency');
const totalSwipes = new Counter('total_swipes');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export function setup() {
  console.log('Starting matching service load test...');

  // Create pool of test users
  const users = [];
  for (let i = 0; i < 100; i++) {
    const user = randomUser();
    const res = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify(user),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (res.status === 201) {
      const body = JSON.parse(res.body);
      users.push({
        id: body.user.id,
        email: user.email,
        password: user.password,
        token: body.accessToken,
      });
    }
  }

  console.log(`Created ${users.length} test users`);
  return { users };
}

export default function (data) {
  // Select random user
  const user = data.users[Math.floor(Math.random() * data.users.length)];

  if (!user || !user.token) {
    return;
  }

  group('Get Recommendations', () => {
    const startTime = Date.now();

    const res = http.get(`${BASE_URL}/api/matching/recommendations?limit=20`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'get_recommendations' },
    });

    recommendationLoadTime.add(Date.now() - startTime);

    check(res, {
      'recommendations status is 200': (r) => r.status === 200,
      'recommendations has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.recommendations && Array.isArray(body.recommendations);
        } catch {
          return false;
        }
      },
      'recommendations load time < 1000ms': (r) => r.timings.duration < 1000,
      'recommendations has match scores': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.recommendations.every((rec) => rec.matchScore !== undefined);
        } catch {
          return false;
        }
      },
    });

    think(1, 3);
  });

  group('Swipe Actions', () => {
    // Get recommendations first
    const recRes = http.get(`${BASE_URL}/api/matching/recommendations?limit=10`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (recRes.status === 200) {
      const body = JSON.parse(recRes.body);
      const recommendations = body.recommendations || [];

      // Swipe on multiple profiles
      for (let i = 0; i < Math.min(5, recommendations.length); i++) {
        const targetUser = recommendations[i];
        const direction = Math.random() > 0.3 ? 'right' : 'left'; // 70% right, 30% left

        const startTime = Date.now();

        const swipeRes = http.post(
          `${BASE_URL}/api/matching/swipe`,
          JSON.stringify({
            targetUserId: targetUser.userId,
            direction: direction,
          }),
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
            tags: { name: 'swipe', direction: direction },
          }
        );

        swipeLatency.add(Date.now() - startTime);
        totalSwipes.add(1);

        const success = check(swipeRes, {
          'swipe status is 200': (r) => r.status === 200,
          'swipe has response': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.swiped !== undefined;
            } catch {
              return false;
            }
          },
          'swipe latency < 300ms': (r) => r.timings.duration < 300,
        });

        swipeSuccessRate.add(success);

        // Check if match was created
        if (success && direction === 'right') {
          const swipeBody = JSON.parse(swipeRes.body);
          if (swipeBody.isMatch) {
            matchCreationRate.add(1);
          } else {
            matchCreationRate.add(0);
          }
        }

        think(0.3, 1);
      }
    }

    think(1, 2);
  });

  group('Super Like', () => {
    const recRes = http.get(`${BASE_URL}/api/matching/recommendations?limit=1`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (recRes.status === 200) {
      const body = JSON.parse(recRes.body);
      if (body.recommendations && body.recommendations.length > 0) {
        const targetUser = body.recommendations[0];

        const res = http.post(
          `${BASE_URL}/api/matching/swipe`,
          JSON.stringify({
            targetUserId: targetUser.userId,
            direction: 'super',
          }),
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
            tags: { name: 'super_like' },
          }
        );

        check(res, {
          'super like status is 200 or 402': (r) => [200, 402].includes(r.status),
        });

        think(0.5, 1);
      }
    }
  });

  group('Get Matches', () => {
    const res = http.get(`${BASE_URL}/api/matching/matches`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
      tags: { name: 'get_matches' },
    });

    check(res, {
      'get matches status is 200': (r) => r.status === 200,
      'get matches has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.matches !== undefined;
        } catch {
          return false;
        }
      },
    });

    think(1, 2);
  });

  group('Search Users', () => {
    const res = http.get(
      `${BASE_URL}/api/matching/search?ageMin=25&ageMax=35&distance=50`,
      {
        headers: {
          Authorization: `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        tags: { name: 'search' },
      }
    );

    check(res, {
      'search status is 200': (r) => r.status === 200,
      'search has results': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.results !== undefined;
        } catch {
          return false;
        }
      },
      'search response time < 2000ms': (r) => r.timings.duration < 2000,
    });

    think(1, 3);
  });

  group('Compatibility Score', () => {
    // Get a recommendation first
    const recRes = http.get(`${BASE_URL}/api/matching/recommendations?limit=1`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (recRes.status === 200) {
      const body = JSON.parse(recRes.body);
      if (body.recommendations && body.recommendations.length > 0) {
        const targetUser = body.recommendations[0];

        const res = http.get(
          `${BASE_URL}/api/matching/compatibility?targetUserId=${targetUser.userId}`,
          {
            headers: {
              Authorization: `Bearer ${user.token}`,
              'Content-Type': 'application/json',
            },
            tags: { name: 'compatibility' },
          }
        );

        check(res, {
          'compatibility status is 200': (r) => r.status === 200,
          'compatibility has score': (r) => {
            try {
              const body = JSON.parse(r.body);
              return body.score !== undefined;
            } catch {
              return false;
            }
          },
        });

        think(0.5, 1);
      }
    }
  });

  group('Rapid Swiping', () => {
    // Simulate rapid swiping behavior
    const recRes = http.get(`${BASE_URL}/api/matching/recommendations?limit=20`, {
      headers: {
        Authorization: `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (recRes.status === 200) {
      const body = JSON.parse(recRes.body);
      const recommendations = body.recommendations || [];

      // Batch swipes
      const swipeRequests = recommendations.slice(0, 10).map((rec) => ({
        method: 'POST',
        url: `${BASE_URL}/api/matching/swipe`,
        body: JSON.stringify({
          targetUserId: rec.userId,
          direction: Math.random() > 0.5 ? 'right' : 'left',
        }),
        params: {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          tags: { name: 'rapid_swipe' },
        },
      }));

      const responses = http.batch(swipeRequests);

      check(responses, {
        'all rapid swipes completed': (resps) => {
          return resps.every((r) => r.status === 200 || r.status === 429);
        },
        'no rapid swipe errors': (resps) => {
          return !resps.some((r) => r.status >= 500);
        },
      });

      think(1, 2);
    }
  });

  think(1, 3);
}

export function teardown(data) {
  console.log('Matching service load test completed');
  console.log(`Total test users: ${data.users.length}`);
}
