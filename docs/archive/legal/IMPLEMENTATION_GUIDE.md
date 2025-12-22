# Legal Documents Implementation Guide

**Flamoral Dating Platform**
**Version:** 1.0
**Date:** December 11, 2025

---

## Quick Start: Implementing Legal Documents

This guide provides step-by-step instructions for implementing the legal documentation package in the Flamoral Dating Platform.

---

## Prerequisites

Before implementation:
- [ ] All legal documents reviewed and finalized
- [ ] Legal counsel has approved documents (highly recommended)
- [ ] Contact email addresses set up
- [ ] Development environment ready

---

## Phase 1: Email Setup (Day 1)

### Required Email Addresses

Set up the following email addresses and routing:

```
legal@flamoral.com          → Legal team
privacy@flamoral.com        → Privacy/DPO team
gdpr@flamoral.com          → GDPR requests (can route to privacy@)
ccpa@flamoral.com          → CCPA requests (can route to privacy@)
dpo@flamoral.com           → Data Protection Officer
dmca@flamoral.com          → DMCA/Copyright team
safety@flamoral.com        → Trust & Safety team (24/7 monitoring)
abuse@flamoral.com         → Abuse reports (route to safety@)
community@flamoral.com     → Community team
support@flamoral.com       → General support (existing)
appeals@flamoral.com       → Account appeals
compliance@flamoral.com    → Compliance team
```

### Email Configuration

**Priority/SLA Settings:**
- `safety@` and `abuse@` - Immediate (24/7 monitoring)
- `dmca@` - High (24-48 hours)
- `privacy@`, `gdpr@`, `ccpa@` - Medium (5 business days)
- `legal@`, `compliance@` - Standard (5 business days)
- `community@`, `appeals@` - Standard (3-5 business days)

---

## Phase 2: DMCA Agent Registration (Day 1-2)

### U.S. Copyright Office Registration

1. **Visit:** https://www.copyright.gov/dmca-directory/

2. **Required Information:**
   - Company legal name: Flamoral, Inc.
   - DMCA Agent name: [Designated person]
   - Address: [Company registered address]
   - Phone: [Contact number]
   - Email: dmca@flamoral.com
   - Alternative contact methods (if any)

3. **Filing Fee:** $6 (one-time, renewal $6 if information changes)

4. **Processing Time:** Usually immediate to 1 business day

5. **Confirmation:** Save confirmation email and registration number

**Important:** Must be completed before launch to claim DMCA safe harbor protection.

---

## Phase 3: Website Implementation (Day 3-5)

### 3.1 Create Legal Pages

**File Structure:**
```
/legal/
  /terms-of-service
  /privacy-policy
  /community-guidelines
  /cookie-policy
  /dmca-policy
  /safety-tips
```

**For each page:**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Flamoral</title>
    <!-- SEO meta tags -->
    <meta name="description" content="Flamoral Terms of Service">
    <meta name="robots" content="noindex, follow">
</head>
<body>
    <main class="legal-document">
        <!-- Convert markdown to HTML -->
        <!-- Include table of contents -->
        <!-- Add last updated date at top -->
        <!-- Add version number -->
    </main>
</body>
</html>
```

**CSS Considerations:**
- Readable font size (16px minimum)
- Adequate line height (1.6)
- Sufficient contrast (WCAG AA)
- Mobile-responsive design
- Print-friendly styles

### 3.2 Footer Links

Add to website footer:

```html
<footer>
    <div class="footer-legal">
        <h4>Legal</h4>
        <ul>
            <li><a href="/legal/terms-of-service">Terms of Service</a></li>
            <li><a href="/legal/privacy-policy">Privacy Policy</a></li>
            <li><a href="/legal/community-guidelines">Community Guidelines</a></li>
            <li><a href="/legal/cookie-policy">Cookie Policy</a></li>
            <li><a href="/legal/dmca-policy">DMCA Policy</a></li>
            <li><a href="/cookie-settings">Cookie Settings</a></li>
            <li><a href="/legal/safety-tips">Safety Tips</a></li>
        </ul>
    </div>

    <div class="footer-privacy">
        <a href="#" id="do-not-sell-link">Do Not Sell My Personal Information</a> (California)
    </div>

    <div class="footer-copyright">
        <p>&copy; 2025 Flamoral, Inc. All rights reserved.</p>
    </div>
</footer>
```

### 3.3 Cookie Consent Banner

**Implementation:**

```html
<!-- Cookie Consent Banner (GDPR/CCPA) -->
<div id="cookie-banner" class="cookie-consent-banner" style="display: none;">
    <div class="cookie-content">
        <h3>We value your privacy</h3>
        <p>We use cookies to enhance your experience, analyze site traffic, and serve personalized ads.
           By clicking "Accept All," you consent to our use of cookies.</p>
        <div class="cookie-buttons">
            <button id="cookie-accept-all" class="btn-primary">Accept All</button>
            <button id="cookie-reject-non-essential" class="btn-secondary">Reject Non-Essential</button>
            <button id="cookie-settings" class="btn-text">Cookie Settings</button>
        </div>
        <a href="/legal/cookie-policy">Learn more about cookies</a>
    </div>
</div>

<script>
// Show banner if user hasn't made a choice
if (!localStorage.getItem('cookie_consent')) {
    document.getElementById('cookie-banner').style.display = 'block';
}

// Handle acceptance
document.getElementById('cookie-accept-all').addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'all');
    enableAllCookies();
    hideBanner();
});

// Handle rejection
document.getElementById('cookie-reject-non-essential').addEventListener('click', () => {
    localStorage.setItem('cookie_consent', 'essential');
    enableEssentialCookiesOnly();
    hideBanner();
});

// Handle settings
document.getElementById('cookie-settings').addEventListener('click', () => {
    window.location.href = '/cookie-settings';
});

function hideBanner() {
    document.getElementById('cookie-banner').style.display = 'none';
}
</script>
```

### 3.4 Cookie Preference Center

**Create page:** `/cookie-settings`

```html
<div class="cookie-preferences">
    <h2>Cookie Preferences</h2>

    <div class="cookie-category">
        <h3>Essential Cookies</h3>
        <p>Required for the site to function. Cannot be disabled.</p>
        <label class="toggle disabled">
            <input type="checkbox" checked disabled>
            <span class="slider"></span>
            Always Active
        </label>
    </div>

    <div class="cookie-category">
        <h3>Preference Cookies</h3>
        <p>Remember your settings and preferences.</p>
        <label class="toggle">
            <input type="checkbox" id="preference-cookies" checked>
            <span class="slider"></span>
        </label>
    </div>

    <div class="cookie-category">
        <h3>Analytics Cookies</h3>
        <p>Help us understand how you use our site.</p>
        <label class="toggle">
            <input type="checkbox" id="analytics-cookies" checked>
            <span class="slider"></span>
        </label>
    </div>

    <div class="cookie-category">
        <h3>Advertising Cookies</h3>
        <p>Used to show you relevant advertisements.</p>
        <label class="toggle">
            <input type="checkbox" id="advertising-cookies" checked>
            <span class="slider"></span>
        </label>
    </div>

    <button id="save-preferences" class="btn-primary">Save Preferences</button>
</div>
```

---

## Phase 4: Sign-Up Flow Implementation (Day 6-7)

### 4.1 Terms Acceptance

**Add to registration form:**

```html
<form id="signup-form">
    <!-- Existing form fields -->

    <div class="terms-acceptance">
        <label class="checkbox-container">
            <input type="checkbox" id="age-verification" required>
            <span class="checkmark"></span>
            I confirm that I am at least 18 years old
        </label>

        <label class="checkbox-container">
            <input type="checkbox" id="terms-acceptance" required>
            <span class="checkmark"></span>
            I agree to the
            <a href="/legal/terms-of-service" target="_blank">Terms of Service</a> and
            <a href="/legal/privacy-policy" target="_blank">Privacy Policy</a>
        </label>

        <label class="checkbox-container">
            <input type="checkbox" id="community-guidelines" required>
            <span class="checkmark"></span>
            I have read and agree to follow the
            <a href="/legal/community-guidelines" target="_blank">Community Guidelines</a>
        </label>
    </div>

    <button type="submit" id="submit-signup">Create Account</button>
</form>

<script>
document.getElementById('signup-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate checkboxes
    if (!document.getElementById('age-verification').checked) {
        alert('You must be 18 or older to use Flamoral');
        return;
    }

    if (!document.getElementById('terms-acceptance').checked) {
        alert('You must accept the Terms of Service and Privacy Policy');
        return;
    }

    // Send to backend with consent tracking
    const userData = {
        // ... user data
        consents: {
            terms_version: '1.0',
            privacy_version: '1.0',
            community_version: '1.0',
            age_verified: true,
            timestamp: new Date().toISOString(),
            ip_address: '...' // Capture from backend
        }
    };

    // Submit registration
    await registerUser(userData);
});
</script>
```

### 4.2 Backend Consent Storage

**Database Schema:**

```sql
CREATE TABLE user_consents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    consent_type VARCHAR(50) NOT NULL,
    document_version VARCHAR(10) NOT NULL,
    accepted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    INDEX idx_user_consent (user_id, consent_type)
);

-- Insert consents on registration
INSERT INTO user_consents (user_id, consent_type, document_version, ip_address, user_agent)
VALUES
    (?, 'terms_of_service', '1.0', ?, ?),
    (?, 'privacy_policy', '1.0', ?, ?),
    (?, 'community_guidelines', '1.0', ?, ?);
```

---

## Phase 5: Mobile App Implementation (Day 8-10)

### 5.1 iOS App Store Requirements

**Add to Info.plist:**

```xml
<key>NSUserTrackingUsageDescription</key>
<string>We use tracking to personalize your experience and show relevant matches.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>We use your location to show you matches nearby.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photos to upload profile pictures.</string>
```

**App Store Listing:**
- Privacy Policy URL: https://www.flamoral.com/legal/privacy-policy
- Terms of Service URL: https://www.flamoral.com/legal/terms-of-service
- Age Rating: 17+ (Mature/Suggestive Themes)

### 5.2 Android Play Store Requirements

**Add to AndroidManifest.xml:**

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

**Play Store Listing:**
- Privacy Policy URL: https://www.flamoral.com/legal/privacy-policy
- Content Rating: Mature 17+
- Data Safety Section: Complete all questions

### 5.3 In-App Legal Section

**Add to Settings:**

```javascript
// React Native example
<View style={styles.legalSection}>
  <Text style={styles.sectionHeader}>Legal</Text>

  <TouchableOpacity onPress={() => navigation.navigate('TermsOfService')}>
    <Text style={styles.menuItem}>Terms of Service</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
    <Text style={styles.menuItem}>Privacy Policy</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate('CommunityGuidelines')}>
    <Text style={styles.menuItem}>Community Guidelines</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate('CookiePolicy')}>
    <Text style={styles.menuItem}>Cookie Policy</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate('SafetyTips')}>
    <Text style={styles.menuItem}>Safety Tips</Text>
  </TouchableOpacity>

  <TouchableOpacity onPress={() => navigation.navigate('DMCAPolicy')}>
    <Text style={styles.menuItem}>Copyright Policy</Text>
  </TouchableOpacity>

  <View style={styles.versionInfo}>
    <Text style={styles.versionText}>Terms Version 1.0</Text>
    <Text style={styles.versionText}>Privacy Version 1.0</Text>
  </View>
</View>
```

### 5.4 Age Gate

**Implement on app launch (first time):**

```javascript
const AgeGate = () => {
  const [birthdate, setBirthdate] = useState(null);

  const verifyAge = () => {
    const age = calculateAge(birthdate);
    if (age < 18) {
      Alert.alert(
        'Age Requirement',
        'You must be at least 18 years old to use Flamoral.',
        [{ text: 'OK', onPress: () => exitApp() }]
      );
      return;
    }
    // Proceed to terms acceptance
    navigation.navigate('TermsAcceptance');
  };

  return (
    <View style={styles.ageGate}>
      <Text style={styles.title}>Welcome to Flamoral</Text>
      <Text style={styles.subtitle}>Please confirm your age</Text>
      <DatePicker
        value={birthdate}
        onChange={setBirthdate}
        maximumDate={new Date()}
      />
      <Button title="Continue" onPress={verifyAge} />
    </View>
  );
};
```

---

## Phase 6: Reporting System (Day 11-12)

### 6.1 In-App Reporting

**Report User Flow:**

```javascript
const ReportUser = ({ userId, userName }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const reportReasons = [
    'Inappropriate content',
    'Harassment or bullying',
    'Fake profile',
    'Underage user',
    'Scam or fraud',
    'Spam',
    'Threats or violence',
    'Hate speech',
    'Other'
  ];

  const submitReport = async () => {
    await api.post('/reports', {
      reported_user_id: userId,
      reported_by: currentUser.id,
      reason: reason,
      details: details,
      timestamp: new Date().toISOString(),
      context: 'user_profile'
    });

    Alert.alert('Report Submitted', 'Thank you for helping keep Flamoral safe.');
    navigation.goBack();
  };

  return (
    <View>
      <Text>Report {userName}</Text>
      <Picker selectedValue={reason} onValueChange={setReason}>
        {reportReasons.map(r => <Picker.Item key={r} label={r} value={r} />)}
      </Picker>
      <TextInput
        placeholder="Additional details (optional)"
        value={details}
        onChangeText={setDetails}
        multiline
      />
      <Button title="Submit Report" onPress={submitReport} />
    </View>
  );
};
```

### 6.2 Backend Report Processing

```javascript
// API endpoint: POST /api/reports
app.post('/api/reports', authenticateUser, async (req, res) => {
  const { reported_user_id, reason, details, context } = req.body;

  // Store report
  const report = await db.reports.create({
    reported_user_id,
    reported_by: req.user.id,
    reason,
    details,
    context,
    status: 'pending',
    priority: calculatePriority(reason), // High for underage, threats, etc.
    created_at: new Date()
  });

  // Send to moderation queue
  await moderationQueue.add({
    report_id: report.id,
    priority: report.priority
  });

  // Auto-action for critical reports
  if (reason === 'Underage user' || reason === 'Threats or violence') {
    await users.suspend(reported_user_id, 'pending_review');
    await notifyTrustAndSafety(report);
  }

  res.json({ success: true, report_id: report.id });
});
```

---

## Phase 7: Data Subject Rights (Day 13-15)

### 7.1 Data Access Request (GDPR/CCPA)

**User Portal:**

```javascript
// Settings > Privacy > Request Your Data
const DataAccessRequest = () => {
  const requestData = async () => {
    await api.post('/privacy/data-access-request');
    Alert.alert(
      'Data Request Submitted',
      'We will email you a copy of your data within 30 days.'
    );
  };

  return (
    <View>
      <Text>Request Your Data</Text>
      <Text>Download a copy of all your personal data we have stored.</Text>
      <Button title="Request Data" onPress={requestData} />
    </View>
  );
};
```

**Backend Implementation:**

```javascript
app.post('/api/privacy/data-access-request', authenticateUser, async (req, res) => {
  // Create request
  const request = await db.data_requests.create({
    user_id: req.user.id,
    request_type: 'access',
    status: 'pending',
    requested_at: new Date()
  });

  // Queue data export job
  await dataExportQueue.add({
    request_id: request.id,
    user_id: req.user.id
  });

  // Send confirmation email
  await sendEmail(req.user.email, 'data-access-request-confirmation', {
    request_id: request.id,
    estimated_completion: '30 days'
  });

  res.json({ success: true, request_id: request.id });
});

// Background job to generate data export
async function generateDataExport(userId) {
  const userData = {
    profile: await db.users.findOne(userId),
    photos: await db.photos.find({ user_id: userId }),
    matches: await db.matches.find({ user_id: userId }),
    messages: await db.messages.find({ user_id: userId }),
    // ... all user data
  };

  // Create ZIP file
  const zipFile = await createZip(userData);

  // Upload to secure storage
  const downloadUrl = await storage.upload(zipFile);

  // Send email with download link
  await sendEmail(user.email, 'data-export-ready', {
    download_url: downloadUrl,
    expires_in: '7 days'
  });
}
```

### 7.2 Account Deletion (Right to be Forgotten)

```javascript
// Settings > Account > Delete Account
const DeleteAccount = () => {
  const [confirmText, setConfirmText] = useState('');

  const deleteAccount = async () => {
    if (confirmText !== 'DELETE') {
      Alert.alert('Confirmation Required', 'Please type DELETE to confirm');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await api.post('/account/delete');
            // Log out and exit
            await logout();
          }
        }
      ]
    );
  };

  return (
    <View>
      <Text>Delete Your Account</Text>
      <Text>This will permanently delete:</Text>
      <Text>• Your profile and photos</Text>
      <Text>• All your matches and messages</Text>
      <Text>• Your account data</Text>
      <Text style={styles.warning}>This cannot be undone!</Text>

      <TextInput
        placeholder="Type DELETE to confirm"
        value={confirmText}
        onChangeText={setConfirmText}
      />
      <Button title="Delete My Account" onPress={deleteAccount} />
    </View>
  );
};
```

**Backend Deletion:**

```javascript
app.post('/api/account/delete', authenticateUser, async (req, res) => {
  const userId = req.user.id;

  // Immediate actions
  await db.users.update(userId, {
    status: 'deleted',
    deleted_at: new Date(),
    email: `deleted_${userId}@deleted.flamoral.com`, // Anonymize
    phone: null
  });

  // Queue deletion job (GDPR allows 30 days)
  await deletionQueue.add({
    user_id: userId,
    scheduled_for: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  });

  // Send confirmation
  await sendEmail(req.user.email, 'account-deletion-confirmation', {
    deletion_date: '30 days from now'
  });

  res.json({ success: true });
});

// Background job (runs after 30 days)
async function permanentlyDeleteUser(userId) {
  // Delete user data
  await db.users.hardDelete(userId);
  await db.photos.deleteAll({ user_id: userId });
  await db.messages.deleteAll({ user_id: userId });
  await db.matches.deleteAll({ user_id: userId });

  // Delete from storage
  await storage.deleteFolder(`users/${userId}`);

  // Exceptions: Keep for legal/compliance
  // - Transaction records (7 years)
  // - Abuse reports (3 years)
  // - Legal holds
}
```

---

## Phase 8: Testing (Day 16-17)

### Testing Checklist

**Website:**
- [ ] All legal pages load correctly
- [ ] Footer links work
- [ ] Cookie banner displays (incognito/new session)
- [ ] Cookie settings save preferences
- [ ] Mobile responsive on all legal pages
- [ ] Print styles work correctly
- [ ] Links within documents work
- [ ] Terms acceptance required on sign-up
- [ ] Cannot sign up without accepting terms

**Mobile App:**
- [ ] Age gate appears on first launch
- [ ] Users under 18 cannot proceed
- [ ] Terms acceptance required
- [ ] In-app legal pages load
- [ ] Reporting flow works
- [ ] Block user works
- [ ] Account deletion works
- [ ] Data request submission works

**Backend:**
- [ ] Consent records saved correctly
- [ ] Data export generates complete data
- [ ] Account deletion soft-deletes immediately
- [ ] Reports create tickets correctly
- [ ] High-priority reports trigger alerts
- [ ] Emails send correctly

**Compliance:**
- [ ] Cookie consent recorded
- [ ] GDPR requests processed within 30 days
- [ ] CCPA requests processed within 45 days
- [ ] Deletion completes within 30 days
- [ ] All user rights functional

---

## Phase 9: Training (Day 18-19)

### Team Training

**Support Team:**
- How to handle privacy requests
- How to escalate reports
- Where to find policies
- Common user questions

**Moderation Team:**
- Community Guidelines enforcement
- Report prioritization
- Escalation procedures
- Documentation requirements

**Development Team:**
- Privacy by design principles
- Data minimization
- Security best practices
- Consent management

**Legal/Compliance:**
- Monitoring legal changes
- Document update procedures
- Vendor management
- Audit procedures

---

## Phase 10: Launch (Day 20)

### Pre-Launch Checklist

- [ ] All legal documents live on website
- [ ] DMCA agent registered
- [ ] Email addresses configured
- [ ] Cookie consent implemented
- [ ] Terms acceptance implemented
- [ ] Reporting system live
- [ ] Data subject rights functional
- [ ] Team trained
- [ ] Legal counsel final approval
- [ ] Monitoring systems in place

### Post-Launch Monitoring

**Week 1:**
- Monitor user feedback on policies
- Check consent capture rates
- Review report volumes
- Verify email delivery

**Month 1:**
- Review compliance metrics
- Process any data requests
- Update FAQ based on questions
- Assess policy effectiveness

---

## Ongoing Maintenance

### Monthly
- Review reported incidents
- Update FAQs
- Monitor regulatory changes

### Quarterly
- Compliance audit
- Team training refresh
- Policy effectiveness review

### Annually
- Full legal document review
- Legal counsel consultation
- Policy updates as needed

---

## Emergency Contacts

**Legal Issues:**
legal@flamoral.com

**Privacy Incidents:**
privacy@flamoral.com
dpo@flamoral.com

**Safety Emergencies:**
safety@flamoral.com (24/7)

**System Issues:**
tech@flamoral.com

---

## Resources

**Internal:**
- Legal documents: `/docs/legal/`
- Implementation code: `/src/legal/`
- Training materials: `/docs/training/`

**External:**
- GDPR: https://gdpr.eu
- CCPA: https://oag.ca.gov/privacy/ccpa
- DMCA: https://www.copyright.gov/dmca-directory/

---

**Document Status:**
- Created: December 11, 2025
- Version: 1.0
- Owner: Legal/Compliance Team
- Next Review: January 1, 2026

---

*This implementation guide provides a structured approach to deploying the legal documentation package. Adjust timelines based on team size and complexity.*

**END OF GUIDE**
