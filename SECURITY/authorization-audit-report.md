# Backend Services Security Audit Report

## DTO Validation and Server-Side Authorization Compliance

**Audit Date:** December 25, 2025
**Auditor:** Security Compliance Team
**Scope:** All 17 backend services in `backend/services/`

---

## Executive Summary

This audit evaluated all backend services for compliance with DTO validation and server-side authorization requirements. The findings reveal significant security gaps across most services, with critical vulnerabilities related to missing DTO validation, inadequate server-owned field protection, and inconsistent authorization enforcement.

### Risk Rating: HIGH

**Key Findings:**
- Only **2 of 17 services** (12%) fully implement class-validator DTOs
- **15 services** accept raw `req.body` without validation
- **0 services** implement comprehensive `forbidNonWhitelisted` protection at the controller level
- Server-owned field protection is inconsistent across all services
- Authorization guards are properly implemented only in the API Gateway and admin-service

---

## Compliance Summary Table

| Service | DTO Validation | forbidNonWhitelisted | Auth Guards | Ownership Check | Server-Owned Fields | Overall Status |
|---------|---------------|---------------------|-------------|-----------------|---------------------|----------------|
| api-gateway | PARTIAL | YES (main.ts) | YES (Global JWT) | N/A (Proxy) | N/A | PARTIAL |
| auth-service | NO | NO | PARTIAL | N/A | PARTIAL | FAIL |
| user-service | NO | NO | YES (Middleware) | YES | NO | FAIL |
| matching-service | NO | NO | YES (Middleware) | YES | NO | FAIL |
| messaging-service | NO | NO | YES (Middleware) | YES | NO | PARTIAL |
| media-service | NO | NO | YES (Middleware) | YES | NO | FAIL |
| payment-service | NO | NO | PARTIAL | NO | NO | CRITICAL |
| notification-service | NO | NO | YES (Middleware) | PARTIAL | NO | FAIL |
| analytics-service | NO | NO | NO | NO | NO | CRITICAL |
| moderation-service | NO | NO | NO | N/A | NO | CRITICAL |
| admin-service | NO | NO | YES (Permissions) | N/A | NO | PARTIAL |
| automation-service | PARTIAL | NO | YES (Middleware) | NO | NO | FAIL |
| advertising-service | NO | NO | NO | NO | NO | CRITICAL |
| workflow-engine | YES | YES (main.ts) | YES (Guard) | N/A | PARTIAL | PASS |
| realtime-service | N/A | N/A | N/A | N/A | N/A | N/A (Not Found) |
| policy-service | NO | NO | NO | N/A | NO | CRITICAL |
| ai-services | N/A | N/A | N/A | N/A | N/A | N/A (Not Found) |

**Legend:**
- **PASS** - Meets security requirements
- **PARTIAL** - Some requirements met, improvements needed
- **FAIL** - Missing critical security controls
- **CRITICAL** - No security controls, requires immediate attention
- **N/A** - Not applicable or service not implemented

---

## Detailed Findings by Service

### 1. API Gateway

**Location:** `backend/services/api-gateway/`

**DTO Validation:**
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` configured in `main.ts:109-111`
- However, all controller endpoints use `@Body() body: any` type, negating validation benefits

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/controllers/auth.controller.ts` | 67 | `@Body() body: any` - No DTO for register |
| `src/controllers/auth.controller.ts` | 77 | `@Body() body: any` - No DTO for login |
| `src/controllers/user.controller.ts` | 48 | `@Body() body: any` - No DTO for updateCurrentUser |
| `src/controllers/messaging.controller.ts` | 103-104 | `@Body() body: any` - No DTO for createConversation |
| `src/controllers/messaging.controller.ts` | 234-236 | `@Body() body: any` - No DTO for sendMessage |
| `src/controllers/payment.controller.ts` | 72-74 | `@Body() body: any` - No DTO for createSubscription |

**Authorization:**
- Global JWT guard configured in `app.module.ts:88`
- `@Public()` decorator used for public endpoints
- Role-based guards implemented for admin endpoints

**Recommendation:** Create typed DTOs with class-validator decorators for all mutation endpoints.

---

### 2. Auth Service

**Location:** `backend/services/auth-service/`

**DTO Validation:**
- Uses TypeScript interfaces (`RegisterDto`, `LoginDto`) in service layer (`auth.service.ts:15-32`)
- No class-validator decorators
- Manual validation in `validateRegistrationData()` method (`auth.service.ts:513-539`)

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/auth.controller.ts` | 13 | `req.body` passed directly to service without validation |
| `src/api/controllers/auth.controller.ts` | 42-47 | Login accepts arbitrary `req.body` fields |
| `src/api/controllers/auth.controller.ts` | 107 | refreshToken only validates token presence |

**Server-Owned Fields:**
- Password hash properly handled server-side
- User ID generated server-side
- `is_active`, `is_email_verified` controlled server-side

**Authorization:**
- Uses custom `AuthRequest` middleware for authenticated routes
- No route-level guards, relies on middleware

**Recommendation:** Implement class-validator DTOs with `@Exclude()` for sensitive fields.

---

### 3. User Service

**Location:** `backend/services/user-service/`

**DTO Validation:**
- No DTOs defined for any controller
- All endpoints accept raw `req.body`

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/profile.controller.ts` | 35 | `updateProfile(userId, req.body)` - Allows any fields |
| `src/api/controllers/subscription.controller.ts` | 110 | `req.body.tier` not validated against enum |
| `src/api/controllers/swipe.controller.ts` | 41-42 | `target_user_id` only checked for presence |
| `src/api/controllers/coin.controller.ts` | 177-178 | `amount, reason` not type-validated |

**Server-Owned Fields - CRITICAL:**
- Profile update accepts arbitrary fields including potential privilege escalation
- No protection for: `id`, `createdAt`, `updatedAt`, `subscriptionTier`, `isVerified`

**Authorization:**
- Uses `AuthRequest` middleware for all routes
- Server-side subscription tier lookup implemented (`swipe.controller.ts:18-36`)
- Ownership validation present for most operations

**Recommendation:** Create DTOs with explicit allowlists for all mutable fields.

---

### 4. Matching Service

**Location:** `backend/services/matching-service/`

**DTO Validation:**
- No DTO files found
- Manual validation in controllers

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/swipe.controller.ts` | 16-17 | `targetUserId, action` from `req.body` without DTO |
| `src/api/controllers/match.controller.ts` | All | No input validation DTOs |

**Authorization:**
- Uses `(req as any).user` pattern for auth
- Ownership validation implemented (`match.controller.ts:60-66`, `match.controller.ts:107-113`)
- `isPremium` flag from JWT used for feature gating

**Recommendation:** Implement DTOs with enum validation for `SwipeAction`.

---

### 5. Messaging Service

**Location:** `backend/services/messaging-service/`

**DTO Validation:**
- No DTO files found
- Manual validation for required fields

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/message.controller.ts` | 84 | `receiverId, content, type, metadata, replyTo` from `req.body` |
| `src/api/controllers/message.controller.ts` | 309 | `conversationId, content` not validated |
| `src/api/controllers/message.controller.ts` | 367 | `deleteForAll` boolean not type-checked |

**Authorization:**
- Strong ownership validation for conversations (`message.controller.ts:36-44`)
- Message sender/receiver validation (`message.controller.ts:328-333`, `386-391`)
- Women-first messaging rule enforced (`message.controller.ts:142-156`)

**Recommendation:** Create MessageDto, UpdateMessageDto with proper validation.

---

### 6. Media Service

**Location:** `backend/services/media-service/`

**DTO Validation:**
- No DTOs for upload parameters
- Uses multer for file handling

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/upload.controller.ts` | 31 | `isProfilePhoto` from body without validation |

**Authorization:**
- Auth middleware present
- Ownership check for photo deletion (`upload.controller.ts:143-148`)

**Recommendation:** Create UploadDto with validated metadata fields.

---

### 7. Payment Service

**Location:** `backend/services/payment-service/`

**DTO Validation - CRITICAL:**
- No DTOs defined
- Sensitive payment data accepted without validation

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/payment.controller.ts` | 14 | `amount, currency, customerId, metadata` unvalidated |
| `src/api/controllers/payment.controller.ts` | 49 | Subscription purchase accepts arbitrary `tier` |
| `src/api/controllers/iap.controller.ts` | 31-32 | Receipt validation accepts raw `provider, receipt` |

**Authorization - CRITICAL:**
- `userId` extracted from body in `iap.controller.ts:33` - allows user impersonation
- No ownership validation for `customerId` in payment methods
- Missing admin authorization for refund endpoint

**Server-Owned Fields:**
- Transaction ID should be server-generated but not enforced

**Recommendation:** URGENT - Implement strict DTOs and ensure userId comes from JWT only.

---

### 8. Notification Service

**Location:** `backend/services/notification-service/`

**DTO Validation:**
- No class-validator DTOs
- Manual validation for required fields

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/notification.controller.ts` | 23 | `SendNotificationRequest` is a type interface, not a validated DTO |
| `src/api/controllers/notification.controller.ts` | 289 | `updatePreferences` accepts arbitrary `req.body` |

**Authorization:**
- Uses `req.user!.id` from middleware
- No explicit guards

---

### 9. Analytics Service

**Location:** `backend/services/analytics-service/`

**DTO Validation - CRITICAL:**
- No DTOs defined
- Query parameters not validated

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/analytics.controller.ts` | 17-25 | Date parsing from query without validation |
| All controllers | All | No authentication middleware visible |

**Authorization - CRITICAL:**
- No authentication middleware on routes
- No role-based access control for analytics data
- Potential data exfiltration risk

**Recommendation:** URGENT - Add authentication and admin role requirements.

---

### 10. Moderation Service

**Location:** `backend/services/moderation-service/`

**DTO Validation:**
- Uses TypeScript interfaces, not class-validator
- Manual validation present

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/routes/moderation.routes.ts` | 15-16 | `ModerateImageRequest` from body without DTO validation |
| `src/routes/moderation.routes.ts` | 147-149 | Admin endpoints accept `adminId` from body |

**Authorization - CRITICAL:**
- No authentication middleware on routes
- Admin actions accept `adminId` from request body - allows admin impersonation
- No verification of admin privileges

**Recommendation:** URGENT - Add service-to-service auth and verify admin identity from JWT.

---

### 11. Admin Service

**Location:** `backend/services/admin-service/`

**DTO Validation:**
- No class-validator DTOs
- Accepts raw `req.body` for all operations

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/routes/index.ts` | 84-85 | `req.body.reason, req.body.duration` unvalidated |
| `src/routes/index.ts` | 231-237 | A/B test creation accepts arbitrary body |
| `src/routes/index.ts` | 399-405 | Ticket message content unvalidated |

**Authorization:**
- Strong authentication: `authenticateAdmin` middleware
- Permission-based access: `requirePermission()`
- Role-based access: `requireRole()`
- Audit logging implemented

**Recommendation:** Add DTOs for structured operations like ban/suspend.

---

### 12. Automation Service

**Location:** `backend/services/automation-service/`

**DTO Validation:**
- Has DTO files but uses TypeScript interfaces, not class-validator
- `GenerateIcebreakerDto` is an interface (`dtos/icebreaker.dto.ts:14-22`)

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/icebreaker.controller.ts` | 16 | Destructures body without DTO class |

**Authorization:**
- Uses `AuthenticatedRequest` with `req.userId`

---

### 13. Advertising Service

**Location:** `backend/services/advertising-service/`

**DTO Validation - CRITICAL:**
- No DTOs defined
- All endpoints accept arbitrary body

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/api/controllers/creative.controller.ts` | 9 | `baseCreative, userProfile` from body unvalidated |
| `src/api/controllers/creative.controller.ts` | 33 | `userId, context` from body - userId should come from JWT |
| `src/api/controllers/creative.controller.ts` | 214-217 | A/B experiment creation lacks validation |

**Authorization - CRITICAL:**
- No authentication middleware visible
- `userId` accepted from request body - privilege escalation risk

**Recommendation:** URGENT - Add authentication and validate userId from JWT.

---

### 14. Workflow Engine

**Location:** `backend/services/workflow-engine/`

**DTO Validation:**
- Properly implemented class-validator DTOs in `dto/` directory
- `CreateWorkflowDto` with full validation (`dto/create-workflow.dto.ts`)
- `TriggerWorkflowDto` with validation (`dto/trigger-workflow.dto.ts`)
- Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` (`main.ts:44-45`)

**Authorization:**
- Uses `InternalServiceGuard` for all endpoints (`controllers/workflow.controller.ts:26`)

**Status: COMPLIANT**

---

### 15. Realtime Service

**Status:** Service directory not found in `backend/services/realtime-service/`

---

### 16. Policy Service

**Location:** `backend/services/policy-service/`

**DTO Validation - CRITICAL:**
- No validation implementation found
- Controller methods are placeholder stubs

**Violations Found:**
| File | Line | Issue |
|------|------|-------|
| `src/controllers/policyController.ts` | All | All methods return null/empty - not implemented |

**Authorization:**
- No authentication visible in routes

---

### 17. AI Services

**Status:** No TypeScript files found in `backend/services/ai-services/`

---

## Critical Security Vulnerabilities

### 1. User ID from Request Body (CRITICAL)

**Affected Services:** payment-service, advertising-service, moderation-service

**Issue:** Multiple services accept `userId` from the request body instead of extracting it from the authenticated JWT token.

**Example Violations:**
- `payment-service/src/api/controllers/iap.controller.ts:33`
- `advertising-service/src/api/controllers/creative.controller.ts:33`
- `moderation-service/src/routes/moderation.routes.ts:149`

**Risk:** Attackers can impersonate any user by sending arbitrary user IDs.

**Fix:** Always extract userId from `req.user.userId` (set by auth middleware from JWT).

---

### 2. Missing Authentication on Internal Services (CRITICAL)

**Affected Services:** analytics-service, moderation-service, advertising-service, policy-service

**Issue:** These services lack authentication middleware, allowing unauthorized access to sensitive data and operations.

**Risk:**
- Data exfiltration from analytics
- Unauthorized moderation actions
- Ad fraud and manipulation

**Fix:** Implement service-to-service authentication or API gateway enforcement.

---

### 3. No DTO Validation Allows Mass Assignment (HIGH)

**Affected Services:** All except workflow-engine

**Issue:** Controllers accept `req.body` directly without validation, allowing attackers to:
- Set server-owned fields (`id`, `createdAt`, `role`, `subscriptionTier`)
- Inject unexpected fields
- Bypass business logic

**Example Attack:**
```json
POST /api/users/me
{
  "name": "John",
  "subscriptionTier": "elite",
  "isAdmin": true,
  "role": "admin"
}
```

**Fix:** Implement class-validator DTOs with explicit field allowlists.

---

### 4. Admin ID Accepted from Body (HIGH)

**Affected Services:** moderation-service

**Location:** `src/routes/moderation.routes.ts:147-157`

**Issue:** Admin actions accept `adminId` from request body without verification.

**Risk:** Any authenticated user could perform admin actions by spoofing the adminId.

**Fix:** Extract admin identity from authenticated session/JWT only.

---

## Recommendations

### Immediate Actions (P0 - This Week)

1. **payment-service:** Ensure all userId references come from JWT, not request body
2. **analytics-service:** Add authentication middleware to all routes
3. **moderation-service:** Fix admin impersonation vulnerability
4. **advertising-service:** Add authentication and fix userId extraction

### Short-Term (P1 - Next 2 Weeks)

1. Create a shared DTO library with common validators
2. Implement DTOs for all mutation endpoints across services
3. Add `forbidNonWhitelisted: true` to all NestJS services
4. Create server-owned field protection decorators

### Medium-Term (P2 - Next Month)

1. Implement comprehensive API schema validation
2. Add input sanitization layer
3. Create automated DTO compliance tests
4. Document field mutability in API specs

---

## Compliance Checklist for Future Development

### For Each New Endpoint:

- [ ] Create a DTO class with class-validator decorators
- [ ] Enable `whitelist: true` and `forbidNonWhitelisted: true`
- [ ] Use `@Exclude()` decorator on server-owned fields
- [ ] Extract userId from JWT, never from request body
- [ ] Implement ownership validation for resource operations
- [ ] Add appropriate authentication guards
- [ ] Add role/permission guards for admin operations
- [ ] Document field mutability in OpenAPI spec

---

## Appendix: Services File Inventory

### Services with Controllers Audited:

1. api-gateway: 14 controllers
2. auth-service: 1 controller
3. user-service: 28 controllers
4. matching-service: 6 controllers
5. messaging-service: 6 controllers
6. media-service: 3 controllers
7. payment-service: 3 controllers
8. notification-service: 3 controllers
9. analytics-service: 4 controllers
10. moderation-service: Route files only
11. admin-service: Route files only
12. automation-service: 5 controllers
13. advertising-service: 4 controllers
14. workflow-engine: 4 controllers
15. policy-service: 3 controllers

### Services Not Found/Empty:

1. realtime-service: No src directory
2. ai-services: No TypeScript files

---

*Report generated by Security Compliance Audit Tool*
