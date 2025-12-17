# Security Test Cases
**Flamoral Dating Platform**

**Version:** 1.0
**Last Updated:** December 2025
**Classification:** Confidential - Internal Use Only

---

## Table of Contents

1. [Authentication Testing](#authentication-testing)
2. [Authorization Testing](#authorization-testing)
3. [Input Validation Testing](#input-validation-testing)
4. [API Security Testing](#api-security-testing)
5. [Business Logic Testing](#business-logic-testing)
6. [File Upload Testing](#file-upload-testing)
7. [WebSocket Security Testing](#websocket-security-testing)
8. [Mobile Application Security Testing](#mobile-application-security-testing)
9. [Session Management Testing](#session-management-testing)
10. [Cryptography Testing](#cryptography-testing)

---

## Authentication Testing

### AUTH-001: Brute Force Protection

**Objective**: Verify protection against credential brute force attacks

**Severity**: High

**Test Steps**:
1. Identify login endpoint (`POST /api/auth/login`)
2. Attempt 10 failed login attempts with incorrect password
3. Verify account lockout or CAPTCHA is triggered
4. Attempt login with correct credentials during lockout
5. Wait for lockout period and verify access restored

**Expected Result**:
- Account locked after 5-10 failed attempts
- Lockout duration: 15-30 minutes
- CAPTCHA triggered after 3 failed attempts
- Email notification sent to user about suspicious activity

**Tools**: Burp Suite Intruder, Hydra, Custom scripts

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### AUTH-002: Username Enumeration

**Objective**: Verify system doesn't leak valid usernames

**Severity**: Medium

**Test Steps**:
1. Attempt login with known valid username and invalid password
2. Attempt login with invalid username and invalid password
3. Compare response times, messages, and HTTP status codes
4. Test password reset functionality with valid/invalid emails
5. Test registration endpoint with existing/non-existing usernames

**Expected Result**:
- Identical error messages for valid and invalid users
- Response times should not differ significantly (< 100ms variance)
- Generic messages like "Invalid credentials" without specifying username or password

**Tools**: Burp Suite Comparer, Custom timing scripts

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### AUTH-003: Weak Password Policy

**Objective**: Verify password complexity requirements

**Severity**: Medium

**Test Steps**:
1. Attempt registration with password: "password"
2. Attempt registration with password: "12345678"
3. Attempt registration with 7-character password
4. Attempt registration with password missing uppercase
5. Attempt registration with password missing numbers
6. Attempt registration with password missing special characters
7. Verify password history (prevent reuse of last 5 passwords)

**Expected Result**:
- Minimum 8 characters required
- Must contain: uppercase, lowercase, number, special character
- Common passwords rejected (e.g., "Password123!")
- Password history enforced

**Tools**: Burp Suite, Custom wordlist

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### AUTH-004: Session Hijacking via XSS

**Objective**: Verify session tokens are not accessible via JavaScript

**Severity**: Critical

**Test Steps**:
1. Login to application
2. Open browser console
3. Attempt to access session token: `document.cookie`
4. Verify HttpOnly flag is set on session cookies
5. Test if JWT stored in localStorage is accessible
6. Inject XSS payload to steal session token

**Expected Result**:
- Session cookies have HttpOnly flag set
- Session cookies have Secure flag set
- SameSite attribute set to 'Strict' or 'Lax'
- JWT tokens not stored in localStorage

**Tools**: Browser DevTools, XSS payloads

**OWASP Reference**: A03:2021 - Injection, A05:2021 - Security Misconfiguration

---

### AUTH-005: Credential Stuffing Attack

**Objective**: Verify protection against credential stuffing

**Severity**: High

**Test Steps**:
1. Obtain list of compromised credentials (public breach data)
2. Attempt automated login with 100+ username/password pairs
3. Vary request timing to avoid rate limiting
4. Use different IP addresses (via proxies)
5. Check if CAPTCHA or additional verification triggered

**Expected Result**:
- CAPTCHA triggered after multiple login attempts
- Rate limiting per IP address enforced
- Suspicious login patterns detected and blocked
- Integration with breach detection services (HaveIBeenPwned)

**Tools**: Burp Suite Intruder with IP rotation, Custom scripts

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### AUTH-006: Multi-Factor Authentication Bypass

**Objective**: Verify MFA cannot be bypassed

**Severity**: Critical

**Test Steps**:
1. Enable MFA on test account
2. Complete first factor (username/password)
3. Attempt to access protected resources before completing MFA
4. Manipulate session token to bypass MFA requirement
5. Test direct access to protected endpoints
6. Test MFA code brute force (6-digit codes)
7. Test MFA backup codes for proper validation

**Expected Result**:
- Access denied until MFA completed
- Session token invalid until MFA verified
- Rate limiting on MFA code attempts (3-5 attempts)
- Account lockout after failed MFA attempts
- Backup codes single-use only

**Tools**: Burp Suite, Custom scripts

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### AUTH-007: Password Reset Token Security

**Objective**: Verify password reset tokens are secure

**Severity**: High

**Test Steps**:
1. Request password reset for test account
2. Analyze reset token in email link
3. Check token entropy (minimum 128-bit)
4. Verify token expires (15-30 minutes)
5. Test token reuse (should be single-use)
6. Test if old sessions invalidated after password reset
7. Test token predictability (request multiple tokens)

**Expected Result**:
- Token minimum 128-bit entropy (cryptographically random)
- Token expires within 15-30 minutes
- Token is single-use only
- All existing sessions invalidated after password change
- Old password cannot be reused

**Tools**: Burp Suite Sequencer, Custom entropy analysis

**OWASP Reference**: A02:2021 - Cryptographic Failures, A07:2021 - Authentication Failures

---

### AUTH-008: OAuth/Social Login Security

**Objective**: Verify OAuth implementation security

**Severity**: High

**Test Steps**:
1. Initiate OAuth flow (Google/Facebook/Apple)
2. Capture OAuth callback URL
3. Test for missing state parameter (CSRF protection)
4. Test state parameter predictability
5. Test redirect_uri validation
6. Attempt account linking attacks
7. Test token handling and storage

**Expected Result**:
- State parameter present and unpredictable
- redirect_uri strictly validated (no open redirects)
- OAuth tokens not exposed in URL
- Proper account linking validation
- PKCE (Proof Key for Code Exchange) implemented

**Tools**: Burp Suite, OAuth security scanner

**OWASP Reference**: A07:2021 - Authentication Failures, A01:2021 - Broken Access Control

---

## Authorization Testing

### AUTHZ-001: Horizontal Privilege Escalation

**Objective**: Verify users cannot access other users' data

**Severity**: Critical

**Test Steps**:
1. Login as User A (ID: 1001)
2. Access User A's profile: `GET /api/users/1001/profile`
3. Modify request to access User B's profile: `GET /api/users/1002/profile`
4. Test all endpoints with different user IDs:
   - `/api/users/{userId}/messages`
   - `/api/users/{userId}/matches`
   - `/api/users/{userId}/photos`
   - `/api/users/{userId}/settings`
5. Test with both path parameters and query parameters

**Expected Result**:
- 403 Forbidden or 404 Not Found for unauthorized access
- No data leakage about other users
- Proper authorization checks on all endpoints

**Tools**: Burp Suite Repeater, Autorize extension

**OWASP Reference**: A01:2021 - Broken Access Control

---

### AUTHZ-002: Vertical Privilege Escalation

**Objective**: Verify regular users cannot access admin functions

**Severity**: Critical

**Test Steps**:
1. Login as regular user
2. Attempt to access admin endpoints:
   - `GET /api/admin/users`
   - `POST /api/admin/users/{userId}/ban`
   - `DELETE /api/admin/users/{userId}`
   - `GET /api/admin/reports`
   - `PUT /api/admin/settings`
3. Test by modifying role in JWT token
4. Test by adding admin parameters to requests
5. Test direct access to admin dashboard URL

**Expected Result**:
- 403 Forbidden for all admin endpoints
- Role validation on server-side (not client-side only)
- JWT signature verification prevents token tampering
- Admin UI not accessible to non-admin users

**Tools**: Burp Suite, JWT manipulation tools

**OWASP Reference**: A01:2021 - Broken Access Control

---

### AUTHZ-003: Insecure Direct Object Reference (IDOR)

**Objective**: Identify IDOR vulnerabilities across application

**Severity**: High

**Test Steps**:
1. Enumerate all endpoints with object IDs
2. Test sequential IDs (1, 2, 3, 4...)
3. Test UUID/GUID predictability
4. Test object ID in different formats:
   - Path parameters: `/api/messages/12345`
   - Query parameters: `/api/messages?id=12345`
   - Request body: `{"messageId": 12345}`
5. Test mass assignment of unauthorized fields

**Affected Endpoints**:
- User profiles
- Messages
- Photos
- Match requests
- Payment records
- Subscription details

**Expected Result**:
- Authorization check before object access
- Non-sequential, unpredictable IDs (UUIDs)
- Proper error messages (404 vs 403)

**Tools**: Burp Suite Intruder, IDOR scanner

**OWASP Reference**: A01:2021 - Broken Access Control

---

### AUTHZ-004: Function Level Access Control

**Objective**: Verify function-level authorization

**Severity**: High

**Test Steps**:
1. Map all API endpoints and required permissions
2. Test each endpoint with different user roles:
   - Unauthenticated user
   - Free user
   - Premium user
   - Moderator
   - Admin
3. Test privilege escalation via parameter manipulation
4. Test accessing deprecated or hidden endpoints

**Test Matrix**:
```
Endpoint                          | Unauth | Free | Premium | Mod | Admin
----------------------------------+--------+------+---------+-----+-------
POST /api/messages                |   ✗    |  ✓   |    ✓    |  ✓  |   ✓
GET /api/users/{id}/private-photos|   ✗    |  ✗   |    ✓    |  ✗  |   ✓
POST /api/admin/ban-user          |   ✗    |  ✗   |    ✗    |  ✓  |   ✓
```

**Expected Result**:
- Proper authorization for each role
- Consistent access control enforcement
- Server-side permission checks

**Tools**: Burp Suite, Custom authorization matrix

**OWASP Reference**: A01:2021 - Broken Access Control

---

### AUTHZ-005: Path Traversal in User Content

**Objective**: Verify path traversal protection

**Severity**: High

**Test Steps**:
1. Upload profile photo
2. Note the returned file URL
3. Attempt path traversal:
   - `/api/files/../../etc/passwd`
   - `/api/files/..%2F..%2Fetc%2Fpasswd`
   - `/api/files/....//....//etc/passwd`
4. Test Windows path traversal: `..\..\windows\system32\config\sam`
5. Test absolute paths: `/etc/passwd`

**Expected Result**:
- Path traversal sequences stripped or rejected
- Access only to user's own files
- No access to system files

**Tools**: Burp Suite Intruder, DotDotPwn

**OWASP Reference**: A01:2021 - Broken Access Control

---

## Input Validation Testing

### INPUT-001: SQL Injection (Classic)

**Objective**: Test for SQL injection vulnerabilities

**Severity**: Critical

**Test Steps**:
1. Identify all database query parameters
2. Test with single quote: `'`
3. Test with SQL comments: `--`, `#`, `/**/`
4. Test boolean-based blind injection:
   - `1' AND '1'='1`
   - `1' AND '1'='2`
5. Test time-based blind injection:
   - `1' AND SLEEP(5)--`
6. Test union-based injection:
   - `1' UNION SELECT null,null,null--`

**Affected Parameters**:
- Search queries: `/api/search?q=`
- User ID filters: `/api/users?id=`
- Sort parameters: `/api/matches?sort=`
- Login username field
- Profile update fields

**Expected Result**:
- Parameterized queries or ORM used
- No error messages revealing database structure
- Input validation and sanitization

**Tools**: SQLMap, Burp Suite, Manual testing

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-002: NoSQL Injection

**Objective**: Test for NoSQL injection (MongoDB, etc.)

**Severity**: Critical

**Test Steps**:
1. Test JSON parameter injection:
   ```json
   {"username": {"$ne": null}, "password": {"$ne": null}}
   ```
2. Test MongoDB operators:
   - `{"$gt": ""}` (greater than)
   - `{"$regex": ".*"}` (regex match)
   - `{"$where": "sleep(5000)"}` (JavaScript execution)
3. Test authentication bypass
4. Test data exfiltration via blind injection

**Affected Endpoints**:
- `/api/auth/login`
- `/api/users/search`
- `/api/matches/filter`

**Expected Result**:
- Input validation for MongoDB operators
- Parameterized queries
- No JavaScript execution in queries

**Tools**: NoSQLMap, Burp Suite, Custom payloads

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-003: Cross-Site Scripting (XSS) - Reflected

**Objective**: Test for reflected XSS vulnerabilities

**Severity**: High

**Test Steps**:
1. Test all input fields with XSS payloads:
   - `<script>alert(1)</script>`
   - `<img src=x onerror=alert(1)>`
   - `<svg onload=alert(1)>`
2. Test URL parameters
3. Test HTTP headers (User-Agent, Referer)
4. Test with encoding variations:
   - HTML encoding: `&lt;script&gt;`
   - URL encoding: `%3Cscript%3E`
   - Double encoding
   - Unicode encoding

**Affected Areas**:
- Search results page
- Error messages
- Profile display
- User-generated content

**Expected Result**:
- Output encoding based on context (HTML, JavaScript, URL)
- Content Security Policy (CSP) headers
- Input validation

**Tools**: XSS Hunter, Burp Suite XSS scanner, Manual payloads

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-004: Cross-Site Scripting (XSS) - Stored

**Objective**: Test for stored XSS vulnerabilities

**Severity**: Critical

**Test Steps**:
1. Inject XSS payloads in persistent fields:
   - Profile bio: `<script>alert(document.cookie)</script>`
   - Username/Display name
   - About me section
   - Messages
   - Comments
2. Verify payload executes when other users view content
3. Test rich text editor bypasses
4. Test file upload with HTML/SVG containing JavaScript

**Expected Result**:
- HTML sanitization on server-side
- DOMPurify or similar library used
- Content Security Policy prevents inline scripts
- Rich text limited to safe HTML subset

**Tools**: XSS Hunter, Burp Suite, Manual testing

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-005: Cross-Site Scripting (XSS) - DOM-Based

**Objective**: Test for DOM-based XSS vulnerabilities

**Severity**: High

**Test Steps**:
1. Analyze JavaScript code for DOM sinks:
   - `innerHTML`
   - `document.write()`
   - `eval()`
   - `setTimeout()/setInterval()` with string arguments
2. Test URL fragments: `https://flamoral.com#<script>alert(1)</script>`
3. Test PostMessage vulnerabilities
4. Review client-side routing for XSS

**Expected Result**:
- Safe DOM manipulation (textContent vs innerHTML)
- Input validation in JavaScript
- Avoid dangerous functions (eval, document.write)

**Tools**: DOM Invader (Burp Suite), Manual code review

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-006: Command Injection

**Objective**: Test for OS command injection

**Severity**: Critical

**Test Steps**:
1. Test file upload processing (image manipulation)
2. Test export/download features
3. Inject command sequences:
   - `; ls -la`
   - `| whoami`
   - `& dir`
   - `` `id` ``
   - `$(whoami)`
4. Test with encoding: URL encoding, double encoding

**Affected Features**:
- Image processing (resize, crop)
- File format conversion
- Export user data
- Backup/restore functions

**Expected Result**:
- No shell commands executed with user input
- Use of safe APIs instead of shell execution
- Input validation and whitelisting

**Tools**: Commix, Burp Suite, Manual testing

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-007: XML External Entity (XXE)

**Objective**: Test for XXE vulnerabilities

**Severity**: High

**Test Steps**:
1. Identify XML input endpoints
2. Test XXE payload:
   ```xml
   <?xml version="1.0"?>
   <!DOCTYPE foo [
     <!ENTITY xxe SYSTEM "file:///etc/passwd">
   ]>
   <root>&xxe;</root>
   ```
3. Test blind XXE (OOB data exfiltration)
4. Test XXE in file uploads (SVG, DOCX, etc.)

**Affected Endpoints**:
- SOAP API endpoints (if any)
- XML file uploads
- RSS/Atom feed parsing
- SAML authentication (if implemented)

**Expected Result**:
- XML external entities disabled
- Secure XML parser configuration
- Input validation

**Tools**: Burp Suite, XXE payloads, Manual testing

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-008: Server-Side Template Injection (SSTI)

**Objective**: Test for template injection vulnerabilities

**Severity**: Critical

**Test Steps**:
1. Identify template usage (email templates, notifications)
2. Test template syntax injection:
   - Jinja2: `{{7*7}}` should output 49
   - EJS: `<%= 7*7 %>`
   - Handlebars: `{{7*7}}`
3. Test RCE payloads specific to template engine
4. Test in email templates by registering with payload username

**Affected Areas**:
- Email notifications
- Push notifications
- SMS messages
- Dynamic content generation

**Expected Result**:
- User input never directly interpolated in templates
- Template sandboxing enabled
- Strict template context

**Tools**: Tplmap, Burp Suite, Manual testing

**OWASP Reference**: A03:2021 - Injection

---

### INPUT-009: LDAP Injection

**Objective**: Test for LDAP injection (if LDAP used)

**Severity**: High

**Test Steps**:
1. Test LDAP special characters: `*, (, ), \, /`
2. Test authentication bypass: `*)(uid=*))(|(uid=*`
3. Test blind LDAP injection

**Expected Result**:
- LDAP special characters escaped
- Parameterized LDAP queries

**Tools**: Manual testing, Custom scripts

**OWASP Reference**: A03:2021 - Injection

---

## API Security Testing

### API-001: Rate Limiting Bypass

**Objective**: Verify API rate limiting cannot be bypassed

**Severity**: High

**Test Steps**:
1. Identify rate limits (e.g., 100 requests/minute)
2. Send requests at maximum rate
3. Verify rate limiting response (429 Too Many Requests)
4. Attempt bypass techniques:
   - Change User-Agent header
   - Rotate X-Forwarded-For header
   - Use different API keys
   - Exploit edge cases (case-sensitive endpoints)
5. Test distributed rate limiting (multiple IPs)

**Affected Endpoints**:
- `/api/auth/login` (10 requests/minute)
- `/api/messages/send` (30 requests/minute)
- `/api/profile/update` (5 requests/minute)
- `/api/search` (60 requests/minute)

**Expected Result**:
- Rate limiting enforced per user account
- Rate limiting enforced per IP address
- Cannot bypass via header manipulation
- Proper 429 response with Retry-After header

**Tools**: Burp Suite Intruder, Custom rate limiting script

**OWASP Reference**: A04:2021 - Insecure Design

---

### API-002: API Authentication Bypass

**Objective**: Test for API authentication bypass

**Severity**: Critical

**Test Steps**:
1. Test APIs without authentication token
2. Test with expired JWT token
3. Test with malformed JWT (remove signature)
4. Test JWT algorithm confusion (RS256 to HS256)
5. Test with null/empty authorization header
6. Test parameter pollution: `?userId=1&userId=2`

**Expected Result**:
- 401 Unauthorized for missing/invalid tokens
- JWT signature verification enforced
- Algorithm whitelist (only RS256)
- Proper token expiration validation

**Tools**: JWT_Tool, Burp Suite, Manual testing

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### API-003: Mass Assignment Vulnerability

**Objective**: Test for mass assignment vulnerabilities

**Severity**: High

**Test Steps**:
1. Analyze API object models
2. Test adding extra fields in requests:
   ```json
   {
     "username": "newuser",
     "email": "user@example.com",
     "isAdmin": true,
     "role": "admin",
     "verified": true
   }
   ```
3. Test modifying read-only fields
4. Test changing user role/permissions

**Affected Endpoints**:
- `POST /api/users/register`
- `PUT /api/users/profile`
- `PATCH /api/users/{id}`

**Expected Result**:
- Whitelist of allowed fields
- Read-only fields cannot be modified
- Role/permission fields protected

**Tools**: Burp Suite, Param Miner

**OWASP Reference**: A01:2021 - Broken Access Control

---

### API-004: GraphQL Security

**Objective**: Test GraphQL API security

**Severity**: High

**Test Steps**:
1. Test introspection query (should be disabled in production):
   ```graphql
   { __schema { types { name } } }
   ```
2. Test query depth limits (nested queries)
3. Test query complexity limits
4. Test for GraphQL injection
5. Test batch query attacks
6. Test for information disclosure in errors

**Expected Result**:
- Introspection disabled in production
- Query depth limited (max 5-7 levels)
- Query complexity limits enforced
- Cost analysis prevents DoS
- Generic error messages

**Tools**: GraphQL Voyager, InQL, Burp Suite

**OWASP Reference**: A04:2021 - Insecure Design

---

### API-005: API Versioning Issues

**Objective**: Test for vulnerabilities in old API versions

**Severity**: Medium

**Test Steps**:
1. Enumerate API versions:
   - `/api/v1/users`
   - `/api/v2/users`
   - `/api/v3/users`
2. Test deprecated endpoints for vulnerabilities
3. Test if old versions bypass new security controls
4. Test version parameter manipulation

**Expected Result**:
- Old API versions deprecated and removed
- Security controls consistent across versions
- Clear API lifecycle policy

**Tools**: Burp Suite, Custom scripts

**OWASP Reference**: A04:2021 - Insecure Design

---

### API-006: Excessive Data Exposure

**Objective**: Test for over-exposure of data in API responses

**Severity**: Medium

**Test Steps**:
1. Analyze all API responses
2. Look for sensitive fields:
   - Hashed passwords
   - Internal IDs
   - Email addresses (of other users)
   - Phone numbers
   - Location coordinates
   - Payment details
3. Test if filtering can expose admin-only fields

**Expected Result**:
- Minimal data exposure (only what's needed)
- Sensitive fields filtered from responses
- Different response models for different roles

**Tools**: Burp Suite, Manual analysis

**OWASP Reference**: A01:2021 - Broken Access Control

---

### API-007: Insecure API Keys

**Objective**: Test API key security

**Severity**: High

**Test Steps**:
1. Search for API keys in client-side code
2. Test if API keys are embedded in mobile apps
3. Test if API keys can be reused across users
4. Test API key rotation mechanism
5. Search public repositories (GitHub) for leaked keys

**Expected Result**:
- No API keys in client-side code
- API keys tied to specific users/accounts
- API key rotation supported
- Rate limiting per API key

**Tools**: GitHub search, Mobile app decompilation, Manual review

**OWASP Reference**: A02:2021 - Cryptographic Failures

---

## Business Logic Testing

### LOGIC-001: Purchase Flow Manipulation

**Objective**: Test payment amount manipulation

**Severity**: Critical

**Test Steps**:
1. Add premium subscription to cart ($9.99/month)
2. Intercept checkout request
3. Modify price to $0.01
4. Modify product ID to different subscription
5. Test negative amounts: `-$9.99`
6. Test currency manipulation (USD to EUR)

**Expected Result**:
- Price validation on server-side
- Product ID validated against expected price
- No client-side price trust

**Tools**: Burp Suite, Browser DevTools

**OWASP Reference**: A04:2021 - Insecure Design

---

### LOGIC-002: Race Conditions in Matching

**Objective**: Test for race conditions in match/like features

**Severity**: Medium

**Test Steps**:
1. Send multiple "like" requests simultaneously for same user
2. Test concurrent match creation
3. Test concurrent message sending
4. Test concurrent profile updates

**Expected Result**:
- Database transactions prevent duplicate records
- Idempotency keys used for critical operations
- Proper locking mechanisms

**Tools**: Burp Suite Turbo Intruder, Custom scripts

**OWASP Reference**: A04:2021 - Insecure Design

---

### LOGIC-003: Subscription Bypass

**Objective**: Test premium feature access without subscription

**Severity**: High

**Test Steps**:
1. Create free account
2. Attempt to access premium features:
   - Unlimited likes
   - See who liked you
   - Advanced filters
   - Incognito mode
3. Test by manipulating user role in requests
4. Test expired subscription access

**Expected Result**:
- Premium features require valid subscription
- Subscription validation on each request
- Expired subscriptions immediately revoked

**Tools**: Burp Suite, Manual testing

**OWASP Reference**: A01:2021 - Broken Access Control

---

### LOGIC-004: Message Flood Protection

**Objective**: Test spam prevention in messaging

**Severity**: Medium

**Test Steps**:
1. Send 100 messages in 1 minute to different users
2. Test automated message sending
3. Test message length limits
4. Test image spam (multiple images in messages)

**Expected Result**:
- Rate limiting on messages per minute
- CAPTCHA for suspicious activity
- Message length limits enforced
- Spam detection algorithms

**Tools**: Burp Suite Intruder, Custom scripts

**OWASP Reference**: A04:2021 - Insecure Design

---

### LOGIC-005: Geolocation Spoofing

**Objective**: Test location manipulation

**Severity**: Medium

**Test Steps**:
1. Modify GPS coordinates in API requests
2. Test VPN detection
3. Test distance calculation manipulation
4. Test location history tampering

**Expected Result**:
- Server-side IP geolocation validation
- GPS coordinates validated against IP location
- Anomaly detection for location jumps

**Tools**: Burp Suite, GPS spoofing apps

**OWASP Reference**: A04:2021 - Insecure Design

---

### LOGIC-006: Age Verification Bypass

**Objective**: Test underage user protection

**Severity**: Critical

**Test Steps**:
1. Register with birthdate indicating age < 18
2. Test if registration blocked
3. Modify birthdate in profile update
4. Test date format manipulation
5. Test age calculation logic (edge cases)

**Expected Result**:
- Users under 18 cannot register
- Birthdate cannot be modified after registration
- Server-side age calculation
- Legal compliance with regional laws

**Tools**: Burp Suite, Manual testing

**OWASP Reference**: A04:2021 - Insecure Design, Compliance

---

### LOGIC-007: Referral/Promo Code Abuse

**Objective**: Test referral and promotional code abuse

**Severity**: Medium

**Test Steps**:
1. Apply promo code for discount
2. Test multiple applications of same code
3. Test self-referral
4. Test expired codes
5. Test code brute forcing

**Expected Result**:
- Promo codes single-use per account
- Expiration dates enforced
- No self-referral
- Rate limiting on code validation

**Tools**: Burp Suite Intruder

**OWASP Reference**: A04:2021 - Insecure Design

---

## File Upload Testing

### UPLOAD-001: Malicious File Upload

**Objective**: Test for remote code execution via file upload

**Severity**: Critical

**Test Steps**:
1. Upload PHP shell: `shell.php`
2. Upload with double extension: `shell.php.jpg`
3. Upload with null byte: `shell.php%00.jpg`
4. Upload .htaccess file to enable PHP execution
5. Upload SVG with embedded JavaScript
6. Upload HTML file with JavaScript
7. Test MIME type validation bypass

**Expected Result**:
- File extension whitelist enforced
- MIME type validation
- File contents validation (magic bytes)
- Uploaded files served with noexec permissions
- Files stored outside webroot or with content disposition

**Tools**: Burp Suite, Various malicious file samples

**OWASP Reference**: A04:2021 - Insecure Design, A03:2021 - Injection

---

### UPLOAD-002: File Size and Resource Exhaustion

**Objective**: Test file upload size limits

**Severity**: Medium

**Test Steps**:
1. Upload extremely large file (> 100MB)
2. Upload many small files rapidly
3. Test ZIP bomb (compressed file that expands enormously)
4. Test storage quota enforcement

**Expected Result**:
- Maximum file size enforced (e.g., 10MB)
- Rate limiting on uploads
- ZIP bomb detection
- Per-user storage quotas

**Tools**: Custom file generators, Burp Suite

**OWASP Reference**: A04:2021 - Insecure Design

---

### UPLOAD-003: Path Traversal in File Upload

**Objective**: Test path traversal via filename

**Severity**: High

**Test Steps**:
1. Upload file with filename: `../../etc/passwd.jpg`
2. Upload with Windows path: `..\..\..\windows\system32\config\sam.jpg`
3. Upload with encoded traversal: `..%2F..%2Fetc%2Fpasswd.jpg`

**Expected Result**:
- Filename sanitization
- Generated filenames (UUID) instead of user-supplied names
- Files stored in controlled directory structure

**Tools**: Burp Suite, Custom payloads

**OWASP Reference**: A01:2021 - Broken Access Control

---

### UPLOAD-004: Image Processing Vulnerabilities

**Objective**: Test image processing libraries for vulnerabilities

**Severity**: High

**Test Steps**:
1. Upload malformed images to trigger errors
2. Upload images with EXIF metadata containing XSS payloads
3. Test ImageMagick/GraphicsMagick vulnerabilities:
   - ImageTragick (CVE-2016-3714)
4. Upload polyglot files (valid image + malicious content)

**Expected Result**:
- Updated image processing libraries
- EXIF data stripped on upload
- Sandboxed image processing
- File re-encoding on server

**Tools**: ImageMagick exploits, Custom polyglot generators

**OWASP Reference**: A06:2021 - Vulnerable and Outdated Components

---

### UPLOAD-005: Unauthorized File Access

**Objective**: Test access control on uploaded files

**Severity**: High

**Test Steps**:
1. Upload private photo as User A
2. Note the file URL
3. Access URL as User B (not matched)
4. Access URL as unauthenticated user
5. Test predictable file naming
6. Test directory listing

**Expected Result**:
- Authorization required to view private photos
- Non-predictable file names (UUIDs)
- Directory listing disabled
- Proper access control on CDN

**Tools**: Burp Suite, Manual testing

**OWASP Reference**: A01:2021 - Broken Access Control

---

## WebSocket Security Testing

### WS-001: WebSocket Authentication

**Objective**: Verify WebSocket connection requires authentication

**Severity**: High

**Test Steps**:
1. Attempt WebSocket connection without auth token
2. Test with expired JWT token
3. Test with invalid JWT signature
4. Test token passed in different locations:
   - URL parameter: `wss://ws.flamoral.com?token=xxx`
   - Custom header
   - First message payload

**Expected Result**:
- Authentication required before WebSocket upgrade
- Token validation on connection
- Connection rejected if authentication fails

**Tools**: WebSocket testing tools, Burp Suite

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### WS-002: WebSocket Message Injection

**Objective**: Test for injection vulnerabilities in WebSocket messages

**Severity**: High

**Test Steps**:
1. Send WebSocket message with XSS payload:
   ```json
   {"type": "message", "content": "<script>alert(1)</script>"}
   ```
2. Send SQL injection payloads in message content
3. Test command injection in message parameters
4. Test message format tampering

**Expected Result**:
- Input validation on all message content
- Output encoding when displaying messages
- Parameterized queries for message storage

**Tools**: WebSocket tools, Custom scripts

**OWASP Reference**: A03:2021 - Injection

---

### WS-003: WebSocket Authorization

**Objective**: Verify authorization for WebSocket actions

**Severity**: High

**Test Steps**:
1. Connect as User A
2. Attempt to send message to User C (not matched)
3. Attempt to read messages from User B's conversation
4. Test sending messages on behalf of other users

**Expected Result**:
- Authorization checks on each WebSocket message
- Users can only send messages to matched users
- Cannot read other users' conversations

**Tools**: WebSocket tools, Manual testing

**OWASP Reference**: A01:2021 - Broken Access Control

---

### WS-004: WebSocket CSRF

**Objective**: Test for CSRF in WebSocket connections

**Severity**: Medium

**Test Steps**:
1. Create malicious webpage that attempts WebSocket connection
2. Trick authenticated user to visit page
3. Test if WebSocket connection established from different origin
4. Test CSRF token validation

**Expected Result**:
- Origin header validation
- CSRF token required for sensitive actions
- SameSite cookie attributes

**Tools**: Custom HTML page, Manual testing

**OWASP Reference**: A01:2021 - Broken Access Control

---

## Mobile Application Security Testing

### MOBILE-001: Insecure Data Storage

**Objective**: Test for sensitive data stored insecurely on device

**Severity**: High

**Test Steps**:
1. Decompile mobile app (APK/IPA)
2. Access device file system (rooted/jailbroken device)
3. Check for sensitive data in:
   - Shared Preferences (Android) / UserDefaults (iOS)
   - SQLite databases
   - Log files
   - Cache directories
   - Temporary files
4. Search for:
   - Authentication tokens
   - Passwords
   - API keys
   - User PII
   - Chat messages

**Expected Result**:
- No sensitive data in plain text
- Encryption for local data storage (SQLCipher)
- Secure storage APIs used (Keychain on iOS, KeyStore on Android)
- No sensitive data in logs

**Tools**: apktool, Hopper, iExplorer, grep

**OWASP Reference**: MASVS-STORAGE-1

---

### MOBILE-002: Insufficient Transport Layer Protection

**Objective**: Test SSL/TLS implementation in mobile app

**Severity**: Critical

**Test Steps**:
1. Install proxy certificate on device
2. Configure device to use proxy (Burp Suite)
3. Test if app enforces certificate pinning
4. Test downgrade to HTTP
5. Test weak cipher suites
6. Test SSL stripping attacks

**Expected Result**:
- Certificate pinning implemented
- Reject self-signed certificates
- TLS 1.2 or higher enforced
- Strong cipher suites only

**Tools**: Burp Suite, Charles Proxy, SSL Kill Switch, Objection

**OWASP Reference**: MASVS-NETWORK-1

---

### MOBILE-003: Code Obfuscation and Tampering

**Objective**: Test anti-tampering and code obfuscation

**Severity**: Medium

**Test Steps**:
1. Decompile app
2. Analyze code readability
3. Modify app code (remove security checks)
4. Repackage and install modified app
5. Test if app detects tampering
6. Test root/jailbreak detection

**Expected Result**:
- Code obfuscation applied (ProGuard, R8)
- String encryption for sensitive values
- Root/jailbreak detection
- App integrity checks
- Anti-debugging measures

**Tools**: apktool, dex2jar, Frida, Objection

**OWASP Reference**: MASVS-RESILIENCE-2

---

### MOBILE-004: Insecure Authentication

**Objective**: Test mobile app authentication mechanisms

**Severity**: High

**Test Steps**:
1. Test biometric authentication bypass
2. Test if app caches credentials
3. Test "Remember Me" functionality
4. Test token storage
5. Test auto-login after app reinstall

**Expected Result**:
- Biometric authentication with proper fallback
- No credential caching
- JWT tokens in secure storage
- No auto-login after reinstall

**Tools**: Frida, Objection, Manual testing

**OWASP Reference**: MASVS-AUTH-1

---

### MOBILE-005: Sensitive Functionality Exposure

**Objective**: Test for exposed app components

**Severity**: High

**Test Steps**:
1. Analyze AndroidManifest.xml for exported components
2. Test deep link vulnerabilities
3. Test Intent redirection
4. Test URL scheme hijacking (iOS)
5. Invoke activities/services directly via ADB

**Affected Areas**:
- Exported activities
- Deep links: `flamoral://`
- Custom URL schemes

**Expected Result**:
- No sensitive components exported
- Deep link validation
- Intent data validation

**Tools**: ADB, Drozer, Manual analysis

**OWASP Reference**: MASVS-PLATFORM-1

---

### MOBILE-006: Insecure Communication

**Objective**: Test API communication security

**Severity**: High

**Test Steps**:
1. Intercept API traffic
2. Test if sensitive data sent in URL parameters
3. Test if sensitive data logged
4. Test API response caching
5. Test for hardcoded secrets in app

**Expected Result**:
- Sensitive data in request body only
- HTTPS for all communications
- No sensitive data in logs
- Appropriate cache headers

**Tools**: Burp Suite, Charles Proxy, Log analysis

**OWASP Reference**: MASVS-NETWORK-2

---

### MOBILE-007: Clipboard Data Leakage

**Objective**: Test for sensitive data in clipboard

**Severity**: Low

**Test Steps**:
1. Copy password from app
2. Check if clipboard is cleared
3. Test autocomplete for sensitive fields
4. Test screenshots of sensitive screens

**Expected Result**:
- Clipboard cleared after use
- Autocomplete disabled for passwords
- Screenshot prevention on sensitive screens

**Tools**: Manual testing

**OWASP Reference**: MASVS-STORAGE-2

---

### MOBILE-008: Third-Party Libraries

**Objective**: Test for vulnerable third-party libraries

**Severity**: Medium

**Test Steps**:
1. Extract and list all third-party libraries
2. Check for known vulnerabilities (CVE database)
3. Test outdated library versions
4. Analyze library permissions

**Expected Result**:
- Up-to-date libraries
- No known vulnerabilities
- Minimal permissions for libraries

**Tools**: MobSF, Dependency-Check, Manual analysis

**OWASP Reference**: A06:2021 - Vulnerable and Outdated Components

---

## Session Management Testing

### SESSION-001: Session Fixation

**Objective**: Test for session fixation vulnerabilities

**Severity**: High

**Test Steps**:
1. Obtain session ID before login
2. Login with valid credentials
3. Check if session ID changed after login
4. Test if old session ID still valid

**Expected Result**:
- New session ID generated after login
- Old session ID invalidated
- Session regeneration on privilege change

**Tools**: Burp Suite, Manual testing

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### SESSION-002: Session Timeout

**Objective**: Verify appropriate session timeout

**Severity**: Medium

**Test Steps**:
1. Login and note session start time
2. Remain idle (no requests)
3. Wait for timeout period (15-30 minutes)
4. Attempt to access protected resource

**Expected Result**:
- Absolute timeout: 24 hours
- Idle timeout: 15-30 minutes
- Timeout enforced on server-side
- User redirected to login

**Tools**: Burp Suite, Manual testing

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### SESSION-003: Concurrent Session Control

**Objective**: Test concurrent session handling

**Severity**: Low

**Test Steps**:
1. Login from Browser A
2. Login from Browser B with same credentials
3. Check if both sessions are active
4. Test session limit enforcement

**Expected Result**:
- Maximum concurrent sessions defined
- Older sessions optionally invalidated
- User notified of multiple sessions

**Tools**: Multiple browsers, Manual testing

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

### SESSION-004: Logout Functionality

**Objective**: Verify proper logout implementation

**Severity**: Medium

**Test Steps**:
1. Login and obtain session token
2. Logout
3. Attempt to use old session token
4. Test browser back button after logout
5. Test if JWT blacklisted after logout

**Expected Result**:
- Session token invalidated on logout
- Back button doesn't restore session
- JWT added to blacklist/revocation list
- Clear cache headers

**Tools**: Burp Suite, Browser testing

**OWASP Reference**: A07:2021 - Identification and Authentication Failures

---

## Cryptography Testing

### CRYPTO-001: Weak Encryption Algorithms

**Objective**: Identify use of weak cryptographic algorithms

**Severity**: High

**Test Steps**:
1. Review code for cryptographic functions
2. Search for weak algorithms:
   - DES, 3DES
   - MD5, SHA1 (for passwords)
   - RC4, RC2
   - ECB mode
3. Test password hashing (should be bcrypt/argon2/PBKDF2)

**Expected Result**:
- AES-256 for symmetric encryption
- RSA-2048+ or ECC for asymmetric
- bcrypt/argon2 for password hashing
- SHA-256+ for message digests
- Proper IV/nonce generation

**Tools**: Code review, Grep patterns

**OWASP Reference**: A02:2021 - Cryptographic Failures

---

### CRYPTO-002: Hardcoded Cryptographic Keys

**Objective**: Search for hardcoded encryption keys

**Severity**: Critical

**Test Steps**:
1. Decompile mobile apps
2. Search source code for:
   - "key =", "secret =", "password ="
   - Base64 encoded strings
   - Hexadecimal patterns
3. Search configuration files
4. Test if same encryption key used for all users

**Expected Result**:
- No hardcoded keys in code
- Keys stored in secure key management system
- Unique keys per user where applicable

**Tools**: Grep, Code analysis, APK decompilation

**OWASP Reference**: A02:2021 - Cryptographic Failures

---

### CRYPTO-003: Insecure Random Number Generation

**Objective**: Test random number generation security

**Severity**: Medium

**Test Steps**:
1. Review code for random number generation
2. Look for weak RNGs: `Math.random()`, `rand()`
3. Test predictability of:
   - Session tokens
   - Password reset tokens
   - CSRF tokens
4. Collect multiple tokens and analyze entropy

**Expected Result**:
- Cryptographically secure RNG (crypto.randomBytes, SecureRandom)
- Sufficient entropy (128+ bits)
- Unpredictable tokens

**Tools**: Burp Suite Sequencer, Statistical analysis

**OWASP Reference**: A02:2021 - Cryptographic Failures

---

## Test Execution Tracking

### Test Status Legend
- ⬜ Not Started
- 🟡 In Progress
- ✅ Passed
- ❌ Failed
- ⚠️ Needs Retest

### Test Execution Matrix

| Test ID | Test Name | Priority | Status | Severity | Assigned To | Notes |
|---------|-----------|----------|--------|----------|-------------|-------|
| AUTH-001 | Brute Force Protection | P1 | ⬜ | High | | |
| AUTH-002 | Username Enumeration | P2 | ⬜ | Medium | | |
| AUTH-003 | Weak Password Policy | P2 | ⬜ | Medium | | |
| AUTH-004 | Session Hijacking via XSS | P1 | ⬜ | Critical | | |
| AUTH-005 | Credential Stuffing | P1 | ⬜ | High | | |
| AUTH-006 | MFA Bypass | P1 | ⬜ | Critical | | |
| AUTH-007 | Password Reset Token | P1 | ⬜ | High | | |
| AUTH-008 | OAuth Security | P1 | ⬜ | High | | |
| AUTHZ-001 | Horizontal Privilege Escalation | P1 | ⬜ | Critical | | |
| AUTHZ-002 | Vertical Privilege Escalation | P1 | ⬜ | Critical | | |
| AUTHZ-003 | IDOR | P1 | ⬜ | High | | |
| AUTHZ-004 | Function Level Access Control | P1 | ⬜ | High | | |
| AUTHZ-005 | Path Traversal | P2 | ⬜ | High | | |
| INPUT-001 | SQL Injection | P1 | ⬜ | Critical | | |
| INPUT-002 | NoSQL Injection | P1 | ⬜ | Critical | | |
| INPUT-003 | XSS - Reflected | P1 | ⬜ | High | | |
| INPUT-004 | XSS - Stored | P1 | ⬜ | Critical | | |
| INPUT-005 | XSS - DOM | P2 | ⬜ | High | | |
| INPUT-006 | Command Injection | P1 | ⬜ | Critical | | |
| INPUT-007 | XXE | P2 | ⬜ | High | | |
| INPUT-008 | SSTI | P2 | ⬜ | Critical | | |
| INPUT-009 | LDAP Injection | P3 | ⬜ | High | | |

---

## Appendix: Testing Checklist

### Pre-Test Checklist
- [ ] Test plan approved
- [ ] Test environments provisioned
- [ ] Test accounts created
- [ ] VPN access configured
- [ ] Tools installed and configured
- [ ] Baseline vulnerability scan completed
- [ ] Communication channels established

### Post-Test Checklist
- [ ] All test cases executed
- [ ] Evidence collected and archived
- [ ] Findings documented
- [ ] Risk ratings assigned
- [ ] Remediation recommendations provided
- [ ] Executive summary drafted
- [ ] Technical report completed
- [ ] Report reviewed and finalized

---

**Document Control**

- **Version**: 1.0
- **Classification**: Confidential - Internal Use Only
- **Next Review Date**: March 2026
- **Owner**: Security Team
- **Approved By**: CISO

---

*These test cases are confidential and intended for authorized security testing only. Unauthorized use is prohibited.*
