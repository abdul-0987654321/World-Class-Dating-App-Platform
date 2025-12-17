# Policy Service Integration Documentation

## Overview

The frontend has been successfully connected to the backend Policy Service, enabling dynamic loading of legal policies from the backend API. This integration provides automatic policy updates, version management, and region-specific content delivery.

## Architecture

### Frontend Components

```
apps/web-app/src/
├── services/
│   ├── policy.service.ts         # Policy API client
│   └── index.ts                  # Service exports
└── pages/Legal/
    ├── PrivacyPolicy.tsx         # Privacy Policy page with API integration
    ├── TermsOfService.tsx        # Terms of Service page with API integration
    └── CommunityGuidelines.tsx   # Community Guidelines page (static)
```

### Backend Service

```
backend/services/policy-service/
├── src/routes/
│   └── policies.ts               # API endpoint definitions
├── policies/
│   ├── privacy-policy.ts         # Privacy Policy content
│   ├── terms-of-service.ts       # Terms of Service content
│   └── trust-safety-policy.ts    # Trust & Safety Policy content
└── config/
    ├── monitoring-sources.json   # Legal data sources
    └── regions.json              # Regional configuration
```

## Implementation Details

### 1. Policy Service (policy.service.ts)

The Policy Service provides a clean API client for fetching policies from the backend:

**Key Features:**
- Automatic caching (5-minute TTL) to reduce API calls
- Region and language detection based on user preferences
- Fallback to static content if API fails
- Support for all policy types: privacy, terms, community-guidelines, trust-safety
- Version management and comparison capabilities

**API Methods:**
```typescript
// Get Privacy Policy
await policyService.getPrivacyPolicy(region, language, version?)

// Get Terms of Service
await policyService.getTermsOfService(region, language, version?)

// Get Community Guidelines
await policyService.getCommunityGuidelines(region, language, version?)

// Get Trust & Safety Policy
await policyService.getTrustSafetyPolicy(region, language, version?)

// Get Policy Summary
await policyService.getPolicySummary(policyType, region, language)

// Get Version History
await policyService.getPolicyVersions(policyType, region, limit, offset)

// Utility Methods
policyService.getUserRegion()     // Detect user's region
policyService.getUserLanguage()   // Detect user's language preference
policyService.clearCache()        // Clear cached policies
```

### 2. Updated Legal Pages

#### PrivacyPolicy.tsx
- Loads policy content from backend API on mount
- Displays loading state while fetching
- Shows error message and fallback to static content if API fails
- Dynamically renders sections, examples, and contact information
- Supports version display and last updated date

**States:**
- `loading`: Shows loading spinner
- `error`: Displays error message with static fallback
- `success`: Renders dynamic policy from API

#### TermsOfService.tsx
- Similar implementation to PrivacyPolicy.tsx
- API-first approach with graceful degradation
- Dynamic rendering of terms sections
- Static fallback content for reliability

### 3. API Integration

#### Backend Endpoints

The frontend connects to these backend endpoints:

```
GET /api/policies/{region}/{policyType}
  Query params: language, format, version
  Returns: Complete policy document

GET /api/policies/{region}/{policyType}/summary
  Query params: language
  Returns: Executive summary and key points

GET /api/policies/{region}/{policyType}/versions
  Query params: limit, offset
  Returns: Version history with change logs

GET /api/policies/regions
  Returns: List of supported regions

GET /api/policies/types
  Returns: Available policy types
```

**Policy Types:**
- `privacy` - Privacy Policy
- `terms` - Terms of Service
- `community-guidelines` - Community Guidelines
- `content` - Trust & Safety / Content Policy

**Regions Supported:**
- `us` - United States (general)
- `us/california` - California (CCPA/CPRA)
- `eu` - European Union (GDPR)
- `uk` - United Kingdom (UK GDPR)
- And more... (see backend config/regions.json)

### 4. Data Flow

```
User visits Legal page
  ↓
Component mounts
  ↓
loadPolicy() called
  ↓
Check cache (policy.service.ts)
  ↓ (cache miss)
API Request → Backend Policy Service
  ↓
Parse response
  ↓
Store in cache
  ↓
Render dynamic content
  ↓ (if API fails)
Show error + static fallback
```

### 5. Caching Strategy

**Client-side Cache:**
- 5-minute in-memory cache per policy
- Reduces unnecessary API calls
- Improves page load performance
- Cache key: `${region}:${policyType}:${language}:${version}`

**Cache Management:**
```typescript
// Automatic cache on successful fetch
policyService.setCachedPolicy(cacheKey, policy);

// Check cache before API call
const cached = policyService.getCachedPolicy(cacheKey);

// Manual cache clear (if needed)
policyService.clearCache();
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# API Base URL (backend policy service)
VITE_API_URL=http://localhost:3000

# Or for production
VITE_API_URL=https://api.flamoral.com
```

### Backend Configuration

The backend Policy Service should be configured with:

```bash
# Service Configuration
POLICY_SERVICE_PORT=3010
NODE_ENV=production

# Database (for policy metadata)
POSTGRES_HOST=localhost
POSTGRES_DB=flamoral_policies

# Cache (Redis)
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage (S3 for policy files)
S3_BUCKET=flamoral-policies
```

## Usage Examples

### Basic Usage

```typescript
import { policyService } from '@/services';

// In a React component
const [policy, setPolicy] = useState<Policy | null>(null);

useEffect(() => {
  const loadPolicy = async () => {
    try {
      const data = await policyService.getPrivacyPolicy();
      setPolicy(data);
    } catch (error) {
      console.error('Failed to load policy:', error);
    }
  };
  loadPolicy();
}, []);
```

### With Region and Language

```typescript
// Get user's region and language
const region = policyService.getUserRegion(); // e.g., 'us'
const language = policyService.getUserLanguage(); // e.g., 'en'

// Fetch policy with user preferences
const policy = await policyService.getPrivacyPolicy(region, language);
```

### Version Comparison

```typescript
// Get version history
const versions = await policyService.getPolicyVersions('privacy', 'us', 10);

// Display in UI
versions.forEach(version => {
  console.log(`Version ${version.version} - ${version.effectiveDate}`);
});
```

## Error Handling

The integration includes comprehensive error handling:

1. **Network Errors**: Caught and logged, fallback to static content
2. **API Errors**: Displayed to user with error message
3. **Parsing Errors**: Graceful degradation to fallback content
4. **Missing Policies**: Returns default policy for region

### Error States

```typescript
try {
  const policy = await policyService.getPrivacyPolicy();
  setPolicy(policy);
} catch (err) {
  // Error handling
  console.error('Failed to load privacy policy:', err);
  setError('Failed to load privacy policy. Please try again later.');
  // Component shows static fallback
}
```

## Testing

### Manual Testing

1. **Start Backend Service:**
   ```bash
   cd backend/services/policy-service
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd apps/web-app
   npm run dev
   ```

3. **Test Pages:**
   - Visit `/privacy-policy` - Should load from API
   - Visit `/terms-of-service` - Should load from API
   - Check browser console for API calls
   - Verify caching (second visit should be instant)

### Testing Fallback

1. **Stop backend service**
2. **Refresh legal pages**
3. **Verify:** Error message shown + static content displayed

### Testing Different Regions

```typescript
// Temporarily override user region
const policy = await policyService.getPrivacyPolicy('eu', 'en');
// Should return EU-specific privacy policy
```

## Future Enhancements

### Planned Features

1. **Version History UI**: Display policy changes over time
2. **Diff Viewer**: Show differences between policy versions
3. **Consent Management**: Track user acceptance of policy updates
4. **Notification System**: Alert users of policy changes
5. **Multi-language Support**: Full translation support
6. **Offline Support**: Service worker caching for offline access

### Backend Enhancements

1. **Automated Updates**: Monitor legal changes and auto-update policies
2. **A/B Testing**: Test policy wording effectiveness
3. **Analytics**: Track policy views, acceptance rates
4. **Search**: Full-text search across policies
5. **Export**: PDF/DOCX export functionality

## Troubleshooting

### Common Issues

**Issue: Policies not loading**
- Check if backend service is running
- Verify API_URL in `.env` file
- Check browser console for errors
- Ensure CORS is configured on backend

**Issue: Cache not working**
- Check cache duration in policy.service.ts
- Verify cache key generation
- Clear browser cache and retry

**Issue: Wrong region/language**
- Implement proper region detection logic
- Use user profile settings if available
- Allow manual region selection

**Issue: Slow page load**
- Verify cache is working
- Check API response times
- Consider implementing skeleton loaders
- Preload policies on app init

## API Reference

### Policy Interface

```typescript
interface Policy {
  version: string;
  effectiveDate: string;
  lastUpdated: string;
  summary: string;
  sections: PolicySection[];
  userRights?: string[];
  contactInfo?: {
    email: string;
    address: string;
    dpo?: string;
  };
}

interface PolicySection {
  id: string;
  title: string;
  content: string;
  examples?: string[];
  lastUpdated?: string;
}
```

## Security Considerations

1. **No Authentication Required**: Policy endpoints are public (skipAuth: true)
2. **Rate Limiting**: Backend should implement rate limiting
3. **XSS Protection**: All policy content is sanitized
4. **HTTPS Only**: Always use HTTPS in production
5. **Content Validation**: Backend validates policy content structure

## Deployment Checklist

- [ ] Backend policy service deployed and accessible
- [ ] Frontend environment variables configured
- [ ] API endpoints tested and responding
- [ ] CORS configured properly
- [ ] Caching working as expected
- [ ] Fallback content verified
- [ ] Error handling tested
- [ ] Mobile responsiveness checked
- [ ] Load testing completed
- [ ] Monitoring and logging in place

## Support

For issues or questions:
- Check backend logs: `backend/services/policy-service/logs`
- Review API documentation: `/api/policies/health`
- Contact: policy-service@flamoral.com

## Version History

- **v1.0.0** (2025-12-15)
  - Initial integration
  - Privacy Policy and Terms of Service connected
  - Caching implemented
  - Fallback strategy in place
  - Region and language detection added
