# Evidence Folder

This folder contains evidence gathered during the UX audit of https://flamoral.com

## Contents

### Screenshots (Not Captured)
Due to headless analysis constraints, visual screenshots were not captured.
Manual screenshot capture recommended for:

- [ ] Landing page above fold
- [ ] Login page (showing test buttons issue)
- [ ] Signup step 1
- [ ] Signup step 2
- [ ] Discovery page
- [ ] Match modal
- [ ] Safety Center
- [ ] Mobile viewport views

### HTTP Response Evidence

#### Landing Page Response
```
HTTP/2 200
date: Sun, 15 Dec 2024
content-type: text/html
strict-transport-security: max-age=15724800; includeSubDomains
```

#### Security Headers Captured
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://*.googletagmanager.com https://*.google-analytics.com https://*.sentry.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.flamoral.com https://*.googleusercontent.com; connect-src 'self' https://api.flamoral.com wss://api.flamoral.com https://*.sentry.io https://*.google-analytics.com; frame-src 'self' https://accounts.google.com; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'
X-Frame-Options: DENY (meta tag)
X-Content-Type-Options: nosniff (meta tag)
X-XSS-Protection: 1; mode=block (meta tag)
Referrer-Policy: strict-origin-when-cross-origin (meta tag)
```

### Network Timing Evidence
```
DNS Resolution: 94.8ms
TCP Connect: 183.2ms
TLS Handshake: ~100ms (estimated)
Time to First Byte: 403ms
Total Download: 403ms
```

### Source Code Evidence

#### Test Account Buttons (LoginPage.tsx:28-36)
```javascript
const fillTestAccount = (num: 1 | 2) => {
  if (num === 1) {
    setEmail('test1@flamoral.com');
    setPassword('TestUser1!');
  } else {
    setEmail('test2@flamoral.com');
    setPassword('TestUser2!');
  }
};
```

### Route Verification
All routes returned HTTP 200:
- / (Landing)
- /login
- /signup
- /discover
- /about
- /safety
- /pricing
- /help
- /terms
- /privacy
- /contact

## Recommended Manual Evidence Collection

1. Run Lighthouse in Chrome DevTools
2. Capture screenshots with DevTools device emulation
3. Record video of signup flow
4. Test with actual mobile device
5. Run WebPageTest for detailed waterfall
