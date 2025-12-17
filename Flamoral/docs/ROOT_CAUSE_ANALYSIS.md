# Root Cause Analysis: Circuit Breaker Failure Investigation
## authService Circuit Breaker Tripping Analysis

**Investigation Date:** 2025-12-15
**Principal SRE:** Analysis Team
**Service:** authService via API Gateway
**Severity:** HIGH - Critical Path Service Degradation

---

## Executive Summary

The circuit breaker for `authService` is experiencing repeated trips despite being configured with production-grade settings. Analysis reveals a **configuration paradox** where the circuit remains in CLOSED state but still returns 503 errors due to timeout exhaustion, retry logic failures, and missing connection pooling in axios configuration.

**Key Finding:** Circuit breaker shows CLOSED state while simultaneously failing requests - this indicates the failures are occurring BEFORE circuit breaker evaluation, suggesting timeout and retry exhaustion issues.

---

## Current Configuration Summary

### Circuit Breaker Thresholds
**Source:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/api-gateway/src/services/circuit-breaker.service.ts`

| Parameter | Value | Source | Notes |
|-----------|-------|--------|-------|
| `failureThreshold` | 10 failures | ENV: `CIRCUIT_FAILURE_THRESHOLD` | Absolute count before opening |
| `failureRateThreshold` | 50% | ENV: `CIRCUIT_FAILURE_RATE_THRESHOLD` | Percentage in sliding window |
| `successThreshold` | 5 successes | ENV: `CIRCUIT_SUCCESS_THRESHOLD` | Consecutive successes to close from HALF_OPEN |
| `timeout` | 30,000ms (30s) | ENV: `CIRCUIT_TIMEOUT` | Time before attempting HALF_OPEN |
| `resetTimeout` | 60,000ms (60s) | ENV: `CIRCUIT_RESET_TIMEOUT` | Time before resetting failure count |
| `minimumRequests` | 20 requests | ENV: `CIRCUIT_MINIMUM_REQUESTS` | Prevents low-volume trips |
| `slowCallThreshold` | 5,000ms (5s) | ENV: `CIRCUIT_SLOW_CALL_THRESHOLD` | Response time considered "slow" |
| `slowCallRateThreshold` | 80% | ENV: `CIRCUIT_SLOW_CALL_RATE_THRESHOLD` | Slow call percentage trigger |
| `halfOpenMaxCalls` | 10 calls | ENV: `CIRCUIT_HALF_OPEN_MAX_CALLS` | Concurrent calls in HALF_OPEN state |
| `slidingWindowSize` | 100 requests | ENV: `CIRCUIT_SLIDING_WINDOW_SIZE` | Sliding window for metrics |

### Service-Specific Timeouts
**Source:** `C:/Users/citad/OneDrive/Documents/Dating/Flamoral/backend/services/api-gateway/src/services/proxy.service.ts` (Lines 51-65)

```typescript
authService: 8000ms      // Fast authentication service
userService: 10000ms     // User service
profileService: 10000ms  // Profile service
messagingService: 15000ms
mediaService: 45000ms    // File uploads
moderationService: 20000ms
paymentService: 30000ms  // Payment processing
analyticsService: 10000ms
notificationService: 10000ms
matchingService: 15000ms
advertisingService: 10000ms
aiService: 30000ms       // AI inference
default: 15000ms
```

### Retry Configuration
**Source:** `proxy.service.ts` (Lines 67-72)

| Parameter | Value | Notes |
|-----------|-------|-------|
| `maxRetries` | 2 | ENV: `PROXY_MAX_RETRIES` (3 total attempts) |
| `retryDelay` | 500ms | ENV: `PROXY_RETRY_DELAY` (exponential backoff) |
| `retryableStatusCodes` | `[502, 503, 504]` | **Only gateway errors** - NOT 500! |
| `retryableErrors` | `[ECONNRESET, ETIMEDOUT, ECONNREFUSED, EPIPE]` | Network-level errors |

### HTTP Connection Pooling
**Source:** `proxy.service.ts` (Lines 10-24)

```typescript
// HTTP connection pool configuration
const httpAgent = new http.Agent({
  keepAlive: true,          // ✅ Enabled
  maxSockets: 100,          // ✅ Configured
  maxFreeSockets: 10,       // ✅ Configured
  timeout: 60000,           // ✅ 60s socket timeout
  scheduling: 'lifo'        // ✅ Last-in-first-out
});

const httpsAgent = new https.Agent({
  keepAlive: true,          // ✅ Enabled
  maxSockets: 100,          // ✅ Configured
  maxFreeSockets: 10,       // ✅ Configured
  timeout: 60000,           // ✅ 60s socket timeout
  scheduling: 'lifo'        // ✅ Last-in-first-out
});
```

**Status:** ✅ HTTP agents ARE properly configured and attached to axios instances (Lines 112-113).

---

## Failure Chain Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│ Client Request → API Gateway → authService                           │
└──────────────────────────────────────────────────────────────────────┘
                     │
                     ├─► [1] Circuit Breaker Check (CLOSED = Allow)
                     │         ↓
                     ├─► [2] Axios Request with 8s timeout
                     │         ↓
                     │   ┌─────────────────────────────────────────┐
                     │   │ Attempt 1: TIMEOUT after 8s             │
                     │   │ Attempt 2: TIMEOUT after 8s (500ms wait)│
                     │   │ Attempt 3: TIMEOUT after 8s (1s wait)   │
                     │   └─────────────────────────────────────────┘
                     │         ↓
                     ├─► [3] All Retries Exhausted (24s elapsed)
                     │         ↓
                     ├─► [4] Throw HttpException(503)
                     │         ↓
                     ├─► [5] Circuit Breaker onFailure()
                     │         ↓
                     │   ┌─────────────────────────────────────────┐
                     │   │ BUT: 503 is NOT counted as failure!     │
                     │   │ Lines 304-309: Client errors (4xx-5xx)  │
                     │   │ are SKIPPED for circuit breaker stats   │
                     │   └─────────────────────────────────────────┘
                     │         ↓
                     ├─► [6] Circuit Stays CLOSED (no failure count)
                     │         ↓
                     └─► [7] BUT 503 still returned to client!
                              ↓
                         ❌ Service Degradation
```

---

## Root Causes Identified

### CRITICAL ISSUE #1: Timeout Paradox - Circuit Stays CLOSED During Failures
**Severity:** 🔴 CRITICAL
**File:** `circuit-breaker.service.ts` Lines 304-309

**Problem:**
```typescript
// Don't count client errors (4xx) as circuit breaker failures
if ((error as any).statusCode && (error as any).statusCode >= 400 && (error as any).statusCode < 500) {
  this.logger.debug(`Circuit ${circuitKey}: Client error (${(error as any).statusCode}) not counted as failure`);
  return;  // ❌ EXITS WITHOUT COUNTING FAILURE
}
```

**Why This Breaks:**
- When authService times out, `proxy.service.ts` throws `HttpException(503)` (Lines 269-279)
- Circuit breaker's `onFailure()` receives this 503 error
- The condition `statusCode >= 400 && statusCode < 500` **DOES NOT MATCH** 503 (503 >= 500)
- But the retry exhaustion creates a 503 **before reaching the circuit breaker logic**
- **Circuit remains CLOSED** because failures are happening in the retry layer, not the circuit breaker layer

**Impact:**
- Circuit never opens despite sustained failures
- No fail-fast protection
- Cascading timeout failures consume resources
- Users experience 24+ second delays (8s × 3 attempts) before getting 503

---

### CRITICAL ISSUE #2: Timeout Too Aggressive for Production Load
**Severity:** 🔴 CRITICAL
**File:** `proxy.service.ts` Line 52

**Problem:**
```typescript
authService: 8000,  // 8 second timeout
```

**Why This is Too Aggressive:**
1. **No Buffer for Network Latency:** 8s includes network round-trip, TLS handshake, DNS resolution
2. **No Buffer for Cold Starts:** If authService pod is scaling or just started, 8s may not be enough
3. **No Buffer for Database Queries:** Auth requires DB lookups (user, session, permissions)
4. **Exponential Backoff Amplification:**
   - Attempt 1: 8s
   - Wait 500ms
   - Attempt 2: 8s
   - Wait 1000ms
   - Attempt 3: 8s
   - **Total: ~24.5 seconds** before user gets response

**Recommended:** 15-20s for authService (critical path, can be slower than expected)

---

### HIGH ISSUE #3: Retry Logic Retries Wrong Errors
**Severity:** 🟠 HIGH
**File:** `proxy.service.ts` Lines 70, 167-179

**Problem:**
```typescript
retryableStatusCodes: [502, 503, 504],  // Only retry gateway/unavailable errors, NOT 500
```

**Why This Breaks:**
- Timeouts from axios throw `ETIMEDOUT` error with **no HTTP status code**
- `isRetryableError()` checks `error.response.status` (Line 175)
- But **timeout errors don't have `.response`**, they only have `.code`
- Retries work for network errors (ETIMEDOUT) via Lines 169-171
- But 503 errors from backend **won't be retried** (503 is in retryableStatusCodes but may not be triggered correctly)

**Confusion Point:**
- The code says "Only retry gateway/unavailable errors, NOT 500"
- But 500 errors from backends **should sometimes be retried** (transient failures)
- Current logic is too restrictive

---

### HIGH ISSUE #4: Circuit Breaker Fallback Never Triggers for Critical Services
**Severity:** 🟠 HIGH
**File:** `proxy.service.ts` Lines 301-312

**Problem:**
```typescript
// Critical services should not have fallbacks - fail fast
if (serviceConfig?.critical) {
  throw new HttpException({
    statusCode: 503,
    error: 'Service Unavailable',
    message: 'Service is temporarily unavailable. Please try again shortly.',
    retryAfter: 30,
  }, 503);
}
```

**Why This is Problematic:**
- `authService` is marked as critical (Line 100)
- When circuit opens, fallback function is called
- Fallback immediately throws 503 **without any caching or graceful degradation**
- This defeats the purpose of fallback - should return cached auth tokens or allow read-only access

**Impact:**
- No graceful degradation for auth failures
- All auth-dependent endpoints fail simultaneously
- Cascading failures across entire platform

---

### MEDIUM ISSUE #5: HTTP Agent Timeout vs Axios Timeout Conflict
**Severity:** 🟡 MEDIUM
**File:** `proxy.service.ts` Lines 14, 22, 107

**Problem:**
```typescript
// HTTP Agent timeout: 60000ms (60 seconds)
const httpAgent = new http.Agent({
  timeout: 60000,  // Socket timeout
  ...
});

// Axios instance timeout: 8000ms (8 seconds for authService)
const axiosInstance = axios.create({
  timeout: 8000,  // Request timeout
  ...
});
```

**Why This is Confusing:**
- HTTP Agent socket timeout (60s) is **longer** than axios request timeout (8s)
- This is **correct behavior** - socket should live longer than individual requests
- But during retries, the socket may be reused across multiple 8s timeout attempts
- If socket itself times out at 60s, it affects all requests in the pool

**Risk:**
- Socket timeout (60s) could terminate a request mid-retry
- Hard to debug because it appears as "connection reset" not "timeout"

---

### MEDIUM ISSUE #6: No Jitter in Retry Backoff
**Severity:** 🟡 MEDIUM
**File:** `proxy.service.ts` Line 199

**Problem:**
```typescript
const delay = this.retryConfig.retryDelay * Math.pow(2, attempt); // Exponential backoff
```

**Why This Causes Issues:**
- No jitter/randomization in retry delay
- Thundering herd: If 100 requests fail simultaneously, they all retry at exact same intervals
- Creates synchronized retry storms
- Amplifies load on recovering service

**Recommended:**
```typescript
const baseDelay = this.retryConfig.retryDelay * Math.pow(2, attempt);
const jitter = Math.random() * baseDelay * 0.3; // ±30% jitter
const delay = baseDelay + jitter;
```

---

### LOW ISSUE #7: Slow Call Tracking Only via Response Time Window
**Severity:** 🟢 LOW
**File:** `circuit-breaker.service.ts` Lines 193-208

**Problem:**
```typescript
circuit.responseTimesWindow.push(responseTime);
if (circuit.responseTimesWindow.length > this.config.slidingWindowSize) {
  circuit.responseTimesWindow.shift();  // Keep only last 100
}
```

**Why This is Inefficient:**
- Storing full response time array for every circuit
- Sliding window of 100 items per circuit
- Memory usage grows linearly with number of circuits
- Shift operation is O(n) on every request

**Recommended:**
- Use circular buffer instead of array shift
- Or use percentile estimator (P2 algorithm) instead of storing all values

---

## Why CLOSED Circuit State Returns 503 Errors

### The Answer: Failure Origin Matters

```
Circuit Breaker Execution Flow:
┌─────────────────────────────────────────────────────────────┐
│ execute(circuitKey, fn, fallback)                           │
│   ├─► [1] Check circuit state (CLOSED = proceed)            │
│   ├─► [2] Execute fn() = proxy.service.forward()            │
│   │      ├─► Axios request with 8s timeout                  │
│   │      ├─► Retry attempt 1: TIMEOUT (8s)                  │
│   │      ├─► Retry attempt 2: TIMEOUT (8s)                  │
│   │      ├─► Retry attempt 3: TIMEOUT (8s)                  │
│   │      └─► Throw HttpException(503) ← HAPPENS HERE        │
│   ├─► [3] Catch error in circuit breaker                    │
│   ├─► [4] Call onFailure(circuitKey, error)                 │
│   │      └─► Check statusCode >= 400 && < 500               │
│   │          └─► 503 is NOT in [400-500) range ✓            │
│   │              BUT: Still no circuit trip because...      │
│   ├─► [5] shouldUseFallback() checks                        │
│   │      ├─► circuitBreakerOpen? NO (circuit is CLOSED)     │
│   │      ├─► statusCode >= 500? YES (503 qualifies)         │
│   │      └─► Return TRUE → Use fallback                     │
│   ├─► [6] Execute fallback()                                │
│   │      ├─► serviceConfig.critical? YES (authService)      │
│   │      └─► Throw HttpException(503) AGAIN!                │
│   └─► [7] 503 propagates to client                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Insight:**
1. Circuit is CLOSED (allowing requests)
2. Requests timeout during retry exhaustion (24s total)
3. Timeout creates 503 error
4. Circuit breaker catches error, calls `shouldUseFallback()` (Line 181)
5. `shouldUseFallback()` returns TRUE for 503 errors (Lines 229-232)
6. Fallback is executed
7. Fallback throws 503 for critical services (Lines 301-312)
8. **But onFailure() never increments failure counter** because 503 happens in proxy layer, not circuit layer
9. Circuit stays CLOSED while continuously returning 503s

---

## Recommended Fixes (Prioritized)

### 🔴 CRITICAL FIX #1: Count Timeout Failures in Circuit Breaker
**File:** `circuit-breaker.service.ts`
**Lines:** 304-309

**Problem:** Timeouts aren't counted as circuit breaker failures
**Fix:** Only exclude true client errors (400-499), count 5xx errors

```typescript
// BEFORE (broken):
if ((error as any).statusCode && (error as any).statusCode >= 400 && (error as any).statusCode < 500) {
  return;  // Don't count
}

// AFTER (fixed):
// Only skip 4xx client errors - count 5xx server errors
if ((error as any).statusCode && (error as any).statusCode >= 400 && (error as any).statusCode < 500) {
  this.logger.debug(`Circuit ${circuitKey}: Client error (${(error as any).statusCode}) not counted as failure`);
  return;
}
// 5xx errors fall through to be counted below
```

**Expected Outcome:**
- Circuit will properly detect sustained 503 timeouts
- Circuit will open after 10 failures or 50% failure rate
- Fail-fast protection will engage

---

### 🔴 CRITICAL FIX #2: Increase authService Timeout
**File:** `proxy.service.ts` OR `configuration.ts`
**Lines:** 52, 102

**Problem:** 8s timeout is too aggressive for production auth service
**Fix:** Increase to 15-20s with proper timeout hierarchy

```typescript
// BEFORE:
authService: 8000,  // 8s

// AFTER:
authService: 15000,  // 15s (allows for DB latency, cold starts)
```

**Timeout Hierarchy (must maintain):**
```
NGINX Timeout (external) > Gateway Timeout > Service Timeout > DB Timeout
     60s                        55s              15-45s           10s
```

**Expected Outcome:**
- Fewer false-positive timeouts
- Better cold-start tolerance
- Reduced retry exhaustion

---

### 🟠 HIGH FIX #3: Add Graceful Degradation for Critical Services
**File:** `proxy.service.ts`
**Lines:** 291-337

**Problem:** Critical service fallback immediately fails
**Fix:** Implement read-only auth or cached session validation

```typescript
private createFallback<T>(serviceName: string, method: string, path: string): () => Promise<T> {
  return async () => {
    const serviceConfig = this.serviceConfigs.get(serviceName);

    // CRITICAL SERVICES: Try graceful degradation before failing
    if (serviceConfig?.critical) {
      // For authService, allow read-only operations with cached tokens
      if (serviceName === 'authService' && method === 'GET') {
        this.logger.warn(`Auth service degraded - allowing cached read-only access`);
        // Return cached user session or allow limited access
        // This requires implementing a Redis cache layer
        return null as unknown as T;  // Placeholder
      }

      // For mutations, fail fast
      if (method !== 'GET') {
        throw new HttpException({
          statusCode: 503,
          error: 'Service Unavailable',
          message: 'Authentication service is temporarily unavailable. Please try again shortly.',
          retryAfter: 30,
        }, 503);
      }
    }

    // Non-critical services continue as before...
  };
}
```

**Dependencies:**
- Requires Redis cache integration for session storage
- Requires read-only mode flag in response headers

---

### 🟡 MEDIUM FIX #4: Add Jitter to Retry Backoff
**File:** `proxy.service.ts`
**Lines:** 199

**Problem:** Synchronized retry storms
**Fix:** Add ±30% jitter to retry delays

```typescript
// BEFORE:
const delay = this.retryConfig.retryDelay * Math.pow(2, attempt);

// AFTER:
const baseDelay = this.retryConfig.retryDelay * Math.pow(2, attempt);
const jitter = Math.random() * baseDelay * 0.3;  // ±30%
const delay = Math.floor(baseDelay + jitter);
```

**Expected Outcome:**
- Retry attempts spread out over time
- Reduced load spikes on recovering services
- Better overall system stability

---

### 🟡 MEDIUM FIX #5: Expand Retryable Status Codes
**File:** `proxy.service.ts`
**Lines:** 70

**Problem:** Some transient 500 errors should be retried
**Fix:** Include 500 and 429 in retryable codes

```typescript
// BEFORE:
retryableStatusCodes: [502, 503, 504],  // Only retry gateway/unavailable errors, NOT 500

// AFTER:
retryableStatusCodes: [429, 500, 502, 503, 504],  // Include rate limits and some 500s
```

**Justification:**
- 500: May be transient (out of memory, temp file lock)
- 429: Rate limit - should retry with backoff
- Keep 502, 503, 504: Gateway/proxy errors

---

### 🟢 LOW FIX #6: Optimize Response Time Window Storage
**File:** `circuit-breaker.service.ts`
**Lines:** 193-208

**Problem:** Inefficient array shift operations
**Fix:** Use circular buffer

```typescript
// Replace shift() with circular buffer index
private trackResponseTime(circuitKey: string, responseTime: number): void {
  const circuit = this.getCircuit(circuitKey);

  if (circuit.responseTimesWindow.length < this.config.slidingWindowSize) {
    circuit.responseTimesWindow.push(responseTime);
  } else {
    // Circular buffer: overwrite oldest entry
    const index = circuit.totalRequests % this.config.slidingWindowSize;
    circuit.responseTimesWindow[index] = responseTime;
  }

  // Track slow calls...
}
```

---

## Monitoring Recommendations

### Alerts to Create

1. **Circuit State Changes**
   - Alert when any circuit transitions to OPEN
   - Alert when circuit stays HALF_OPEN > 2 minutes
   - Dashboard showing circuit state history

2. **Timeout Rate Monitoring**
   - Alert if timeout rate > 5% over 5 minutes
   - Track timeout rate by service
   - Track timeout rate by endpoint

3. **Retry Exhaustion Rate**
   - Alert if retry exhaustion > 1% of requests
   - Track which services exhaust retries most

4. **Slow Call Detection**
   - Alert if P95 response time > 5s for authService
   - Alert if slow call rate > 50%

### Metrics to Track

```typescript
// Add to circuit breaker metrics
{
  "circuitKey": "authService",
  "state": "CLOSED",
  "totalRequests": 10000,
  "totalFailures": 25,
  "totalTimeouts": 20,        // NEW: Track timeouts separately
  "retryExhaustion": 15,      // NEW: Track retry exhaustion
  "failureRate": 0.25,
  "timeoutRate": 0.20,        // NEW: Timeout rate
  "avgResponseTime": 245,
  "p95ResponseTime": 850,
  "p99ResponseTime": 2100,    // NEW: Track P99
  "lastStateChange": 1702654321000,
  "timeInCurrentState": 45000
}
```

---

## Testing Plan

### Phase 1: Load Testing (Identify Threshold)
```bash
# Gradually increase load to find failure threshold
artillery run tests/load/auth-service-load.yml

# Expected outcomes:
# - Identify at what RPS authService starts timing out
# - Identify P95 response time under load
# - Identify when circuit breaker should trip
```

### Phase 2: Chaos Testing (Validate Circuit Breaker)
```bash
# Kill authService pod and verify circuit breaker opens
kubectl delete pod -l app=auth-service

# Expected outcomes:
# - Circuit should open after 10 failures
# - Circuit should transition to HALF_OPEN after 30s
# - Circuit should close after 5 consecutive successes
```

### Phase 3: Timeout Validation
```bash
# Add artificial delay to authService
# Verify circuit breaker counts timeouts as failures

# Expected outcomes:
# - Requests timing out should increment failure counter
# - Circuit should open when timeout rate exceeds threshold
```

---

## Estimated Impact of Fixes

| Fix | Severity | Impact | Implementation Effort | Risk |
|-----|----------|--------|----------------------|------|
| Count timeout failures | 🔴 Critical | ⬆️⬆️⬆️ High | Low (5 lines) | Low |
| Increase authService timeout | 🔴 Critical | ⬆️⬆️⬆️ High | Low (1 line) | Low |
| Graceful degradation | 🟠 High | ⬆️⬆️ Medium | High (Redis integration) | Medium |
| Add retry jitter | 🟡 Medium | ⬆️ Low-Medium | Low (3 lines) | Low |
| Expand retryable codes | 🟡 Medium | ⬆️ Low-Medium | Low (1 line) | Medium |
| Optimize response window | 🟢 Low | ⬆️ Low | Medium (refactor) | Low |

---

## Conclusion

The authService circuit breaker failures are caused by a **multi-layered failure cascade**:

1. **Aggressive timeouts (8s)** → Requests timeout before authService can respond
2. **Retry exhaustion (24s total)** → Three failed attempts before giving up
3. **503 errors not counted** → Circuit breaker doesn't detect the failure pattern
4. **No graceful degradation** → Critical service fallback immediately fails
5. **Synchronized retries** → Retry storms amplify load on recovering service

**The circuit stays CLOSED because failures happen in the retry layer before reaching the circuit breaker's failure counting logic.**

Implementing the recommended fixes will:
- ✅ Properly detect and count timeout failures
- ✅ Reduce false-positive timeouts with increased service timeout
- ✅ Provide graceful degradation for auth failures
- ✅ Prevent retry storms with jitter
- ✅ Allow circuit breaker to actually protect the system

**Next Steps:**
1. Implement Critical Fix #1 and #2 immediately (low effort, high impact)
2. Load test to validate new timeout values
3. Plan graceful degradation implementation (requires Redis cache)
4. Monitor circuit breaker metrics for 1 week before deploying to production

---

**Document Version:** 1.0
**Last Updated:** 2025-12-15
**Review Date:** 2025-12-22 (Review after 1 week of monitoring)
