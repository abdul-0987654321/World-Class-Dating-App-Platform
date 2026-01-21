# Flamoral Zero-Conflict Integration Playbook

**Agent F: Zero-Conflict Integration Architect**
**Document Version:** 1.0
**Last Updated:** 2026-01-19

---

## Executive Summary

This playbook provides a comprehensive strategy for safely integrating new features into the Flamoral dating platform without disrupting existing functionality. The platform consists of 27 NestJS microservices, React/React Native frontends, and a multi-database architecture (PostgreSQL, MongoDB, Redis).

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Extension Patterns](#2-extension-patterns)
3. [Collision Risk Matrix](#3-collision-risk-matrix)
4. [Safe Integration Checklist](#4-safe-integration-checklist)
5. [Recommended Integration Order](#5-recommended-integration-order)
6. [Testing Strategy](#6-testing-strategy)
7. [Service-Specific Guidelines](#7-service-specific-guidelines)
8. [Code Templates](#8-code-templates)

---

## 1. Architecture Overview

### 1.1 Service Inventory (27 Services)

| Port | Service | Domain | Database | Risk Level |
|------|---------|--------|----------|------------|
| 3000 | api-gateway | Routing, Auth | Redis | HIGH |
| 3001 | auth-service | Authentication | PostgreSQL | CRITICAL |
| 3002 | user-service | User Management | PostgreSQL | CRITICAL |
| 3003 | profile-service | Profile Data | PostgreSQL | HIGH |
| 3004 | matching-service | Swipes, Matches | PostgreSQL | HIGH |
| 3005 | messaging-service | Chat, Calls | PostgreSQL/MongoDB | HIGH |
| 3006 | notification-service | Push, Email, SMS | PostgreSQL | MEDIUM |
| 3007 | payment-service | Payments, Billing | PostgreSQL | CRITICAL |
| 3008 | subscription-service | Tiers, Features | PostgreSQL | HIGH |
| 3009 | media-service | Photos, Videos | PostgreSQL/S3 | MEDIUM |
| 3010 | moderation-service | Content Safety | PostgreSQL | HIGH |
| 3011 | analytics-service | Metrics, Events | MongoDB | LOW |
| 3012 | recommendation-service | ML Recommendations | PostgreSQL | MEDIUM |
| 3013 | search-service | Elasticsearch | Elasticsearch | MEDIUM |
| 3014 | location-service | Geolocation | PostgreSQL | MEDIUM |
| 3015 | verification-service | ID Verification | PostgreSQL | HIGH |
| 3016 | report-service | User Reports | PostgreSQL | MEDIUM |
| 3017 | admin-service | Admin Panel | PostgreSQL | HIGH |
| 3018 | webhook-service | External Events | Redis | LOW |
| 3019 | scheduler-service | Cron Jobs | Redis | LOW |
| 3020 | worker-service | Background Jobs | Redis | LOW |
| 3021 | email-service | Email Delivery | SES | LOW |
| 3022 | realtime-service | WebSockets | Redis | MEDIUM |
| 3023 | workflow-engine | State Machines | PostgreSQL | MEDIUM |
| 3024 | automation-service | Auto-DMs, Flows | PostgreSQL | LOW |
| 3025 | advertising-service | Ads Revenue | PostgreSQL | LOW |
| 3026 | partnership-service | B2B Integrations | PostgreSQL | LOW |

### 1.2 Event-Driven Integration Points

```
[RabbitMQ Exchange: flamoral-events]
   |
   +-- match.created --> automation-service, notification-service
   +-- match.superlike --> automation-service, analytics-service
   +-- match.anniversary --> automation-service
   +-- message.sent --> analytics-service, moderation-service
   +-- user.registered --> analytics-service, email-service
   +-- payment.completed --> subscription-service, analytics-service
   +-- profile.updated --> search-service, recommendation-service
```

### 1.3 Existing Infrastructure Patterns

- **Feature Flags**: `/backend/shared/src/platform-intelligence/feature-flags.ts`
- **API Versioning**: `/backend/services/api-gateway/src/middleware/api-versioning.middleware.ts`
- **Circuit Breakers**: `/backend/services/api-gateway/src/services/circuit-breaker.service.ts`
- **Message Queues**: SQS (notifications), RabbitMQ (automation)

---

## 2. Extension Patterns

### 2.1 Decision Matrix: New Microservice vs. Extend Existing

```
QUESTION 1: Does the feature have a distinct domain?
  |
  +-- YES --> Consider new microservice
  |     |
  |     +-- QUESTION 2: Will it require >5 new tables?
  |           |
  |           +-- YES --> Create new microservice
  |           +-- NO --> Extend existing service
  |
  +-- NO --> Extend existing service
        |
        +-- QUESTION 3: Which service owns the primary entity?
              |
              +-- Match that service's domain --> Extend it
              +-- No clear owner --> Create new microservice
```

### 2.2 New Endpoint Patterns

#### Pattern A: Additive Endpoint (SAFE)
```typescript
// Add new endpoint to existing controller
// File: /backend/services/matching-service/src/api/controllers/match.controller.ts

@Controller('api/v1/matches')
export class MatchController {
  // Existing endpoints remain unchanged

  // NEW: Additive endpoint
  @Get(':matchId/compatibility-insights')
  @UseGuards(JwtAuthGuard)
  async getCompatibilityInsights(
    @Param('matchId') matchId: string,
    @CurrentUser() user: User,
  ) {
    return this.matchService.getCompatibilityInsights(matchId, user.id);
  }
}
```

#### Pattern B: Versioned Endpoint (BREAKING CHANGE)
```typescript
// When changing existing endpoint behavior
// File: /backend/services/api-gateway/src/middleware/api-versioning.middleware.ts

// Register new version
const versionRegistry: Map<ApiVersion, VersionMetadata> = new Map([
  [ApiVersion.V1, { /* existing */ }],
  [ApiVersion.V2, {
    version: ApiVersion.V2,
    status: VersionStatus.CURRENT,
    changes: [
      'Enhanced match response with compatibility scores',
      'Deprecated legacy swipe format',
    ],
  }],
]);

// Route to version-specific handler
@Controller('api/v2/matches')
export class MatchControllerV2 extends MatchController {
  @Get(':matchId')
  async getMatch(@Param('matchId') id: string) {
    // Enhanced response format
    return this.matchService.getMatchV2(id);
  }
}
```

#### Pattern C: New Service Module (ISOLATED)
```typescript
// When feature is isolated but related to existing domain
// File: /backend/services/matching-service/src/modules/speed-dating/

// speed-dating.module.ts
@Module({
  imports: [DatabaseModule, SharedModule],
  controllers: [SpeedDatingController],
  providers: [SpeedDatingService, SpeedDatingRepository],
  exports: [SpeedDatingService],
})
export class SpeedDatingModule {}

// Register in main app module
@Module({
  imports: [
    // ... existing modules
    SpeedDatingModule, // New module
  ],
})
export class AppModule {}
```

### 2.3 Database Migration Strategy (Zero-Downtime)

#### Phase 1: Expand (Additive Only)
```typescript
// File: /backend/services/matching-service/src/infrastructure/database/migrations/
// Name: 20260120_add_compatibility_score.ts

export async function up(knex: Knex): Promise<void> {
  // SAFE: Only ADD columns, never remove/rename
  await knex.schema.alterTable('matches', (table) => {
    table.decimal('compatibility_score', 5, 2).nullable();
    table.jsonb('compatibility_factors').nullable();
    table.timestamp('score_calculated_at').nullable();

    // Add index CONCURRENTLY to avoid locking
    table.index(['compatibility_score'], 'idx_matches_compat_score');
  });
}

export async function down(knex: Knex): Promise<void> {
  // Reversible migration
  await knex.schema.alterTable('matches', (table) => {
    table.dropColumn('compatibility_score');
    table.dropColumn('compatibility_factors');
    table.dropColumn('score_calculated_at');
  });
}
```

#### Phase 2: Migrate (Background Job)
```typescript
// File: /backend/services/worker-service/src/jobs/backfill-compatibility-scores.job.ts

export class BackfillCompatibilityScoresJob {
  async execute(): Promise<void> {
    const batchSize = 1000;
    let offset = 0;

    while (true) {
      const matches = await this.matchRepository
        .createQueryBuilder('match')
        .where('match.compatibility_score IS NULL')
        .limit(batchSize)
        .offset(offset)
        .getMany();

      if (matches.length === 0) break;

      for (const match of matches) {
        const score = await this.calculateScore(match);
        await this.matchRepository.update(match.id, {
          compatibility_score: score,
          score_calculated_at: new Date(),
        });
      }

      offset += batchSize;
      await this.sleep(100); // Rate limit
    }
  }
}
```

#### Phase 3: Contract (Make Non-Nullable)
```typescript
// Only after Phase 2 completes and feature flag is 100%
// Name: 20260220_enforce_compatibility_score.ts

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('matches', (table) => {
    table.decimal('compatibility_score', 5, 2).notNullable().alter();
  });
}
```

### 2.4 Event-Driven Integration

#### Publishing Events
```typescript
// File: /backend/services/matching-service/src/domain/services/match.service.ts

async createMatch(userId1: string, userId2: string): Promise<Match> {
  const match = await this.matchRepository.save({ userId1, userId2 });

  // Publish to RabbitMQ
  await this.rabbitmqClient.publish('match.created', {
    type: 'match.created',
    data: {
      matchId: match.id,
      userId1,
      userId2,
      conversationId: match.conversationId,
      timestamp: new Date(),
    },
  });

  return match;
}
```

#### Consuming Events (New Feature)
```typescript
// File: /backend/services/analytics-service/src/consumers/match-events.consumer.ts

export class MatchEventsConsumer {
  async start(): Promise<void> {
    await this.rabbitmqClient.subscribe(
      'analytics-match-queue',
      ['match.created', 'match.expired', 'match.unmatched'],
      this.handleMatchEvent.bind(this),
    );
  }

  private async handleMatchEvent(event: MatchEvent): Promise<void> {
    switch (event.type) {
      case 'match.created':
        await this.trackMatchCreated(event.data);
        break;
      // ... other handlers
    }
  }
}
```

### 2.5 Feature Flag Implementation

```typescript
// File: /backend/shared/src/platform-intelligence/feature-flags.ts

// Add new feature flag
export const FEATURE_FLAGS = {
  // Existing flags...

  // New feature flags
  newFeatures: {
    compatibilityInsights: {
      name: 'feature_compatibility_insights',
      description: 'Show compatibility insights on match profiles',
      enabled: false,
      rolloutPercentage: 0, // Start at 0%
      regions: ['US', 'EU'],
      userSegments: ['premium', 'platinum'],
      createdAt: '2026-01-20T00:00:00Z',
      updatedAt: '2026-01-20T00:00:00Z',
    },
  },
};

// Usage in service
export class MatchService {
  async getMatchDetails(matchId: string, userId: string) {
    const match = await this.matchRepository.findById(matchId);

    // Feature flag check
    if (this.featureFlags.isEnabled('newFeatures', 'compatibilityInsights', {
      userId,
      region: await this.getUserRegion(userId),
      userSegment: await this.getUserTier(userId),
    })) {
      match.compatibilityInsights = await this.getInsights(match);
    }

    return match;
  }
}
```

---

## 3. Collision Risk Matrix

### 3.1 Feature Category: Profile Enhancements

| Feature | Services Touched | Potential Breaking Changes | Data Extensions | API Version |
|---------|-----------------|---------------------------|-----------------|-------------|
| Video Profiles | profile-service, media-service, matching-service | Discovery feed payload change | profiles.video_url, profiles.video_thumbnail | v1 (additive) |
| Voice Bios | profile-service, media-service | None | profiles.voice_bio_url | v1 (additive) |
| Verified Photos | media-service, verification-service, profile-service | Photo object structure | photos.verification_status | v1 (additive) |
| Profile Prompts v2 | profile-service, user-service | Prompt format change | New prompts_v2 table | v2 (breaking) |

### 3.2 Feature Category: Matching Enhancements

| Feature | Services Touched | Potential Breaking Changes | Data Extensions | API Version |
|---------|-----------------|---------------------------|-----------------|-------------|
| Speed Dating | matching-service, realtime-service, notification-service | None (new endpoints) | speed_dating_sessions, speed_dating_matches | v1 (additive) |
| Group Matching | matching-service, user-service | None (new endpoints) | groups, group_matches | v1 (additive) |
| Compatibility Scores | matching-service, recommendation-service | Match response extension | matches.compatibility_score | v1 (additive) |
| Swipe Rewind | matching-service, subscription-service | Swipe history requirement | swipe_history | v1 (additive) |

### 3.3 Feature Category: Messaging Enhancements

| Feature | Services Touched | Potential Breaking Changes | Data Extensions | API Version |
|---------|-----------------|---------------------------|-----------------|-------------|
| Voice Messages | messaging-service, media-service | Message type expansion | messages.voice_url | v1 (additive) |
| Read Receipts v2 | messaging-service, realtime-service | WebSocket event change | message_reads | v2 (breaking) |
| Message Reactions | messaging-service | Message object extension | message_reactions | v1 (additive) |
| Scheduled Messages | messaging-service, scheduler-service | None (new endpoints) | scheduled_messages | v1 (additive) |

### 3.4 Feature Category: Monetization

| Feature | Services Touched | Potential Breaking Changes | Data Extensions | API Version |
|---------|-----------------|---------------------------|-----------------|-------------|
| Dynamic Pricing | payment-service, subscription-service | Price calculation logic | pricing_rules, user_pricing | v1 (additive) |
| Gift Store | payment-service, messaging-service, media-service | None (new endpoints) | gifts, gift_transactions | v1 (additive) |
| Boost Packages | matching-service, payment-service | Boost response change | boost_packages | v1 (additive) |
| Premium Tiers v2 | subscription-service, payment-service | Tier structure change | subscription_tiers_v2 | v2 (breaking) |

### 3.5 High-Risk Service Interactions

```
                    +-----------------+
                    |  api-gateway    |
                    |   (CRITICAL)    |
                    +--------+--------+
                             |
     +-----------------------+-----------------------+
     |                       |                       |
+----v----+           +------v------+         +------v------+
|  auth   |           |    user     |         |   payment   |
|(CRITICAL)|          | (CRITICAL)  |         | (CRITICAL)  |
+----+----+           +------+------+         +------+------+
     |                       |                       |
     |    +-----------+------+------+-----------+    |
     |    |           |             |           |    |
     v    v           v             v           v    v
+--------+--+   +-----+-----+  +----+----+  +---+----+
| profile   |   | matching  |  |messaging|  |subscr. |
|  (HIGH)   |   |  (HIGH)   |  | (HIGH)  |  | (HIGH) |
+-----------+   +-----------+  +---------+  +--------+
```

**CRITICAL Services**: Changes require extended review, load testing, and staged rollout.

---

## 4. Safe Integration Checklist

### 4.1 Pre-Development Checklist

```markdown
## Feature: [Feature Name]
## Target Service(s): [Service Names]
## Risk Level: [LOW/MEDIUM/HIGH/CRITICAL]

### Planning Phase
- [ ] Feature specification reviewed by team
- [ ] Database schema changes documented
- [ ] API contract changes documented
- [ ] Event contract changes documented
- [ ] Breaking changes identified and migration plan created
- [ ] Feature flag strategy defined
- [ ] Rollback procedure documented

### Architecture Review
- [ ] No circular dependencies introduced
- [ ] Service boundaries respected
- [ ] Data ownership clear
- [ ] Event flow documented
```

### 4.2 Development Checklist

```markdown
### Schema Migration
- [ ] Migration is reversible (down function works)
- [ ] New columns are NULLABLE initially
- [ ] No ALTER TABLE on hot tables during peak hours
- [ ] Indexes added CONCURRENTLY (PostgreSQL)
- [ ] Backfill job prepared for existing data

### API Changes
- [ ] Backwards compatible (additive only for v1)
- [ ] OpenAPI spec updated
- [ ] Request validation added
- [ ] Response DTOs typed
- [ ] Error responses follow contract

### Feature Flags
- [ ] Feature wrapped in flag check
- [ ] Flag has appropriate rollout percentage
- [ ] Flag has region/segment restrictions if needed
- [ ] Metrics track feature usage

### Events
- [ ] Event schema versioned
- [ ] Consumers handle unknown event types gracefully
- [ ] Dead letter queue configured
- [ ] Idempotency implemented
```

### 4.3 Testing Checklist

```markdown
### Unit Tests
- [ ] Service layer tests pass
- [ ] Repository tests pass
- [ ] DTO validation tests pass
- [ ] Edge cases covered

### Integration Tests
- [ ] API endpoint tests pass
- [ ] Database integration tests pass
- [ ] Event publishing verified
- [ ] Event consuming verified

### Contract Tests
- [ ] API response contract validated
- [ ] Event schema contract validated
- [ ] Service-to-service contracts verified

### Load Testing
- [ ] Endpoint handles expected load
- [ ] Database queries optimized (EXPLAIN ANALYZE)
- [ ] No N+1 queries
- [ ] Response times within SLA
```

### 4.4 Deployment Checklist

```markdown
### Pre-Deployment
- [ ] Feature flag set to 0%
- [ ] Database migration staged
- [ ] Canary deployment configured
- [ ] Monitoring alerts configured
- [ ] Runbook updated

### Deployment
- [ ] Deploy migration first (expand phase)
- [ ] Deploy service code
- [ ] Verify health checks pass
- [ ] Run smoke tests
- [ ] Gradually increase feature flag (0% -> 1% -> 10% -> 50% -> 100%)

### Post-Deployment
- [ ] Monitor error rates
- [ ] Monitor latency
- [ ] Monitor database performance
- [ ] Verify event flow
- [ ] Collect user feedback

### Rollback Criteria
- [ ] Error rate > 1%
- [ ] P95 latency > 2x baseline
- [ ] Database CPU > 80%
- [ ] User complaints spike
```

---

## 5. Recommended Integration Order

### Phase 1: Foundation & Low-Risk (Weeks 1-2)

```
Priority: LOW RISK, HIGH VALUE
Strategy: Build confidence with isolated features

1. Analytics Enhancements (analytics-service)
   - New tracking events
   - Dashboard improvements
   - No user-facing changes

2. Admin Tools (admin-service)
   - New admin dashboards
   - Reporting features
   - Internal only

3. Notification Templates (notification-service, email-service)
   - New email templates
   - Push notification variations
   - A/B testing framework
```

### Phase 2: Additive Features (Weeks 3-4)

```
Priority: MEDIUM RISK, USER-FACING
Strategy: New endpoints, feature flagged

4. Media Enhancements (media-service)
   - Video profile uploads
   - Voice note processing
   - New endpoints only

5. Profile Extensions (profile-service)
   - New profile fields
   - Additional prompts
   - Backwards compatible

6. Matching Addons (matching-service)
   - Compatibility scores (new field)
   - Swipe statistics
   - New endpoints only
```

### Phase 3: Integration Features (Weeks 5-6)

```
Priority: HIGH RISK, CROSS-SERVICE
Strategy: Multiple services, careful coordination

7. Speed Dating (matching-service, realtime-service, notification-service)
   - New module in matching
   - WebSocket events
   - Scheduled notifications

8. Voice Messages (messaging-service, media-service)
   - New message type
   - Media processing integration
   - Existing message flow extension

9. Gift Store (payment-service, messaging-service)
   - New payment flow
   - Message attachment
   - Transaction tracking
```

### Phase 4: Core Flow Changes (Weeks 7-8)

```
Priority: CRITICAL RISK, BREAKING CHANGES
Strategy: API versioning, extended rollout

10. Premium Tiers v2 (subscription-service, payment-service, user-service)
    - New tier structure
    - Migration from v1
    - API v2 endpoints

11. Matching Algorithm v2 (matching-service, recommendation-service)
    - New scoring system
    - A/B testing required
    - Gradual rollout

12. Authentication Enhancements (auth-service)
    - Biometric login
    - Session management
    - Security review required
```

### Integration Order Visualization

```
Week 1-2         Week 3-4         Week 5-6         Week 7-8
   |                |                |                |
   v                v                v                v
[Analytics]    [Media Ext.]    [Speed Dating]   [Tiers v2]
   |                |                |                |
[Admin Tools]  [Profile Ext.]  [Voice Msgs]    [Match Algo]
   |                |                |                |
[Notif Temp]   [Match Addons]  [Gift Store]    [Auth Enh.]
   |                |                |                |
   +--------> FOUNDATION --------> INTEGRATION -----> CORE
              (Low Risk)         (High Value)     (Breaking)
```

---

## 6. Testing Strategy

### 6.1 Contract Testing Between Services

```typescript
// File: /backend/services/api-gateway/tests/contract/api-response-contract.test.ts

describe('API Response Contract Validation', () => {
  describe('Success Response Contract', () => {
    it('should match success response structure', () => {
      const response = {
        success: true,
        data: { id: 'test-123' },
      };
      expect(isValidSuccessResponse(response)).toBe(true);
    });
  });

  describe('Error Response Contract', () => {
    it('should match error response structure', () => {
      const response = {
        success: false,
        error: 'Validation failed',
        message: 'Email is required',
      };
      expect(isValidErrorResponse(response)).toBe(true);
    });
  });
});
```

```typescript
// File: /backend/services/matching-service/tests/contract/match-event.contract.test.ts

import { Pact } from '@pact-foundation/pact';

describe('Match Event Contract', () => {
  const provider = new Pact({
    consumer: 'automation-service',
    provider: 'matching-service',
  });

  it('should produce valid match.created event', async () => {
    await provider.addInteraction({
      state: 'a match exists',
      uponReceiving: 'match.created event',
      withRequest: {
        method: 'GET',
        path: '/api/v1/matches/123',
      },
      willRespondWith: {
        status: 200,
        body: {
          success: true,
          data: {
            matchId: Matchers.string(),
            userId1: Matchers.uuid(),
            userId2: Matchers.uuid(),
            createdAt: Matchers.iso8601DateTime(),
          },
        },
      },
    });
  });
});
```

### 6.2 Integration Test Patterns

```typescript
// File: /backend/services/matching-service/tests/integration/speed-dating.integration.test.ts

describe('Speed Dating Integration', () => {
  let app: INestApplication;
  let testUser1: User;
  let testUser2: User;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Setup test data
    testUser1 = await createTestUser();
    testUser2 = await createTestUser();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe('POST /api/v1/speed-dating/sessions', () => {
    it('should create a speed dating session', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/speed-dating/sessions')
        .set('Authorization', `Bearer ${testUser1.token}`)
        .send({
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
          duration: 300,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionId');
    });
  });

  describe('Event Publishing', () => {
    it('should publish speed_dating.session_started event', async () => {
      const eventSpy = jest.spyOn(rabbitmqClient, 'publish');

      // Trigger session start
      await speedDatingService.startSession(sessionId);

      expect(eventSpy).toHaveBeenCalledWith(
        'speed_dating.session_started',
        expect.objectContaining({
          sessionId,
          participants: expect.any(Array),
        }),
      );
    });
  });
});
```

### 6.3 Canary Deployment Approach

```yaml
# File: /infrastructure/terraform/modules/ecs/canary-deployment.tf

resource "aws_appconfig_deployment_strategy" "canary" {
  name                           = "flamoral-canary"
  deployment_duration_in_minutes = 30
  growth_factor                  = 10
  growth_type                    = "LINEAR"
  replicate_to                   = "NONE"
  final_bake_time_in_minutes     = 10
}

# Canary stages:
# T+0:  10% traffic
# T+10: 20% traffic
# T+20: 30% traffic
# T+30: 100% traffic (after 10min bake)
```

```typescript
// File: /backend/services/api-gateway/src/middleware/canary.middleware.ts

export const canaryMiddleware = (canaryPercentage: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip;
    const hash = hashUserId(userId);
    const bucket = hash % 100;

    if (bucket < canaryPercentage) {
      // Route to canary deployment
      req.headers['x-canary'] = 'true';
      res.setHeader('X-Canary', 'true');
    }

    next();
  };
};
```

### 6.4 Smoke Test Suite

```typescript
// File: /backend/tests/smoke/critical-paths.smoke.test.ts

describe('Critical Path Smoke Tests', () => {
  const baseUrl = process.env.API_URL;

  describe('Authentication Flow', () => {
    it('should complete login flow', async () => {
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: process.env.SMOKE_TEST_EMAIL,
          password: process.env.SMOKE_TEST_PASSWORD,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('accessToken');
    });
  });

  describe('Discovery Flow', () => {
    it('should return discovery feed', async () => {
      const response = await fetch(`${baseUrl}/api/v1/discovery/feed`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('profiles');
    });
  });

  describe('Matching Flow', () => {
    it('should process swipe action', async () => {
      const response = await fetch(`${baseUrl}/api/v1/swipes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetUserId: testTargetUserId,
          action: 'like',
        }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Messaging Flow', () => {
    it('should send message to match', async () => {
      const response = await fetch(`${baseUrl}/api/v1/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: testConversationId,
          content: 'Smoke test message',
        }),
      });

      expect(response.status).toBe(200);
    });
  });

  describe('Payment Flow', () => {
    it('should retrieve subscription plans', async () => {
      const response = await fetch(`${baseUrl}/api/v1/subscriptions/plans`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.length).toBeGreaterThan(0);
    });
  });
});
```

### 6.5 Load Testing Configuration

```javascript
// File: /infrastructure/load-testing/k6/critical-endpoints.js

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 200 },  // Spike test
    { duration: '5m', target: 200 },  // Sustained spike
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Discovery feed (high traffic endpoint)
  const discoveryResponse = http.get(`${__ENV.API_URL}/api/v1/discovery/feed`, {
    headers: { Authorization: `Bearer ${__ENV.TEST_TOKEN}` },
  });

  check(discoveryResponse, {
    'discovery status 200': (r) => r.status === 200,
    'discovery response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Swipe action
  const swipeResponse = http.post(
    `${__ENV.API_URL}/api/v1/swipes`,
    JSON.stringify({ targetUserId: randomUserId(), action: 'like' }),
    {
      headers: {
        Authorization: `Bearer ${__ENV.TEST_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  check(swipeResponse, {
    'swipe status 200': (r) => r.status === 200,
    'swipe response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

---

## 7. Service-Specific Guidelines

### 7.1 auth-service (CRITICAL)

```
DO:
- Add new OAuth providers as separate modules
- Extend token payload with additive fields only
- Use feature flags for new auth methods

DON'T:
- Change existing token structure
- Modify session management without review
- Remove any existing endpoints
```

### 7.2 user-service (CRITICAL)

```
DO:
- Add new profile fields as nullable
- Create new tables for distinct features
- Use events for cross-service updates

DON'T:
- Rename existing columns
- Change user ID format
- Modify email verification flow
```

### 7.3 matching-service (HIGH)

```
DO:
- Add new swipe types as enum values
- Extend match object with optional fields
- Create separate modules for new features

DON'T:
- Change existing match creation flow
- Modify swipe history format
- Alter recommendation queries without testing
```

### 7.4 payment-service (CRITICAL)

```
DO:
- Add new product types
- Create new payment flows as separate modules
- Version webhook handlers

DON'T:
- Modify Stripe integration directly
- Change existing subscription logic
- Remove any price tier
```

### 7.5 messaging-service (HIGH)

```
DO:
- Add new message types
- Extend message metadata
- Create new conversation types

DON'T:
- Change message delivery flow
- Modify encryption handling
- Alter real-time event structure
```

---

## 8. Code Templates

### 8.1 New Feature Module Template

```typescript
// File structure for new feature in existing service:
// /backend/services/{service-name}/src/modules/{feature-name}/
//   ├── {feature-name}.module.ts
//   ├── {feature-name}.controller.ts
//   ├── {feature-name}.service.ts
//   ├── {feature-name}.repository.ts
//   ├── dto/
//   │   ├── create-{feature}.dto.ts
//   │   └── update-{feature}.dto.ts
//   └── entities/
//       └── {feature}.entity.ts

// {feature-name}.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureController } from './feature.controller';
import { FeatureService } from './feature.service';
import { FeatureRepository } from './feature.repository';
import { Feature } from './entities/feature.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Feature])],
  controllers: [FeatureController],
  providers: [FeatureService, FeatureRepository],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### 8.2 Migration Template

```typescript
// File: /backend/services/{service}/src/infrastructure/database/migrations/
// Naming: YYYYMMDD_description.ts

import { Knex } from 'knex';

/**
 * Migration: Add [feature description]
 *
 * This migration adds support for [feature].
 *
 * Changes:
 * - Adds column X to table Y
 * - Creates index Z
 *
 * Rollback:
 * - Safe to rollback, removes added columns/indexes
 */
export async function up(knex: Knex): Promise<void> {
  // Check if column already exists (idempotent)
  const hasColumn = await knex.schema.hasColumn('table_name', 'new_column');

  if (!hasColumn) {
    await knex.schema.alterTable('table_name', (table) => {
      // Always add as NULLABLE first
      table.string('new_column', 255).nullable();

      // Add index if needed
      table.index(['new_column'], 'idx_table_new_column');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('table_name', 'new_column');

  if (hasColumn) {
    await knex.schema.alterTable('table_name', (table) => {
      table.dropIndex('idx_table_new_column');
      table.dropColumn('new_column');
    });
  }
}
```

### 8.3 Feature Flag Wrapper Template

```typescript
// File: /backend/shared/src/decorators/feature-flag.decorator.ts

import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import { FeatureFlagGuard } from '../guards/feature-flag.guard';

export const FEATURE_FLAG_KEY = 'featureFlag';

export interface FeatureFlagOptions {
  category: string;
  feature: string;
  fallbackResponse?: any;
}

export const FeatureFlag = (options: FeatureFlagOptions) =>
  applyDecorators(
    SetMetadata(FEATURE_FLAG_KEY, options),
    UseGuards(FeatureFlagGuard),
  );

// Usage:
@Controller('api/v1/matches')
export class MatchController {
  @Get(':id/insights')
  @FeatureFlag({
    category: 'newFeatures',
    feature: 'compatibilityInsights',
    fallbackResponse: { insights: null, message: 'Feature not available' },
  })
  async getInsights(@Param('id') id: string) {
    return this.matchService.getInsights(id);
  }
}
```

### 8.4 Event Publisher Template

```typescript
// File: /backend/shared/src/events/event-publisher.ts

export interface DomainEvent<T = any> {
  type: string;
  version: string;
  data: T;
  metadata: {
    timestamp: string;
    correlationId: string;
    causationId?: string;
    userId?: string;
  };
}

export class EventPublisher {
  async publish<T>(
    eventType: string,
    data: T,
    options?: { correlationId?: string; causationId?: string; userId?: string },
  ): Promise<void> {
    const event: DomainEvent<T> = {
      type: eventType,
      version: '1.0',
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        correlationId: options?.correlationId || uuid(),
        causationId: options?.causationId,
        userId: options?.userId,
      },
    };

    await this.rabbitmqClient.publish(eventType, event);

    // Log for debugging
    this.logger.debug(`Published event: ${eventType}`, { event });
  }
}

// Usage:
await this.eventPublisher.publish('match.created', {
  matchId: match.id,
  userId1: match.userId1,
  userId2: match.userId2,
}, {
  correlationId: requestContext.correlationId,
  userId: requestContext.userId,
});
```

### 8.5 API Versioning Template

```typescript
// File: /backend/services/{service}/src/controllers/v2/{resource}.controller.v2.ts

import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Matches V2')
@Controller('api/v2/matches')
export class MatchControllerV2 {
  constructor(private readonly matchService: MatchService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get match with enhanced details (V2)' })
  @ApiResponse({
    status: 200,
    description: 'Match details with compatibility insights',
  })
  async getMatch(@Param('id') id: string) {
    // V2 response includes additional fields
    const match = await this.matchService.findById(id);
    const insights = await this.matchService.getInsights(id);

    return {
      success: true,
      data: {
        ...match,
        compatibilityScore: insights.score,
        compatibilityFactors: insights.factors,
        // V2 deprecates legacy fields
        _deprecated: {
          legacyScore: match.score, // Will be removed in v3
        },
      },
    };
  }
}

// Register both v1 and v2 in app module
@Module({
  controllers: [
    MatchController,    // /api/v1/matches
    MatchControllerV2,  // /api/v2/matches
  ],
})
export class MatchModule {}
```

---

## Appendix A: Quick Reference Commands

```bash
# Run migrations for a service
cd backend/services/matching-service
npx knex migrate:latest --env development

# Rollback last migration
npx knex migrate:rollback --env development

# Check migration status
npx knex migrate:status --env development

# Run tests for a service
npm run test:unit
npm run test:integration
npm run test:e2e

# Run contract tests
npm run test:contract

# Run load tests
k6 run infrastructure/load-testing/k6/critical-endpoints.js

# Check feature flag status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3017/api/admin/feature-flags

# Toggle feature flag
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "rolloutPercentage": 10}' \
  http://localhost:3017/api/admin/feature-flags/compatibility_insights
```

---

## Appendix B: Rollback Procedures

### Database Rollback
```bash
# Identify current migration
npx knex migrate:currentVersion

# Rollback to specific version
npx knex migrate:rollback --to 20260119

# Emergency: direct SQL rollback
psql -h $DB_HOST -U $DB_USER -d flamoral << EOF
BEGIN;
ALTER TABLE matches DROP COLUMN IF EXISTS compatibility_score;
DELETE FROM knex_migrations WHERE name = '20260120_add_compatibility_score.ts';
COMMIT;
EOF
```

### Service Rollback
```bash
# ECS: Roll back to previous task definition
aws ecs update-service \
  --cluster flamoral-prod \
  --service matching-service \
  --task-definition matching-service:42  # Previous version

# Kubernetes: Rollback deployment
kubectl rollout undo deployment/matching-service -n flamoral

# Docker Compose: Restart with previous image
docker-compose pull matching-service@sha256:abc123
docker-compose up -d matching-service
```

### Feature Flag Emergency Disable
```bash
# Immediately disable feature for all users
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "rolloutPercentage": 0}' \
  http://localhost:3017/api/admin/feature-flags/compatibility_insights
```

---

**Document Maintained By:** Agent F - Integration Architecture
**Review Cycle:** Monthly
**Next Review:** 2026-02-19
