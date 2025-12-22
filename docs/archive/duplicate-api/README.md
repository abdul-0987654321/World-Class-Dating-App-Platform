# Flamoral Dating Platform - API Documentation

Welcome to the comprehensive API documentation for the Flamoral Dating Platform. This documentation provides everything you need to integrate with and build on top of the Flamoral platform.

## Documentation Overview

### Core API Documentation

#### 1. [OpenAPI Specification](./openapi-complete.yaml)
Complete OpenAPI 3.0 specification file for all API endpoints.
- Machine-readable API specification
- Compatible with Swagger UI, Postman, and other API tools
- Includes request/response schemas, authentication, and examples
- Can be imported into API development tools

**Use this for:**
- Generating API client libraries
- Testing APIs with Swagger UI
- Importing into Postman
- Auto-generating documentation

#### 2. [Complete API Reference](./API_REFERENCE_COMPLETE.md)
Detailed, human-readable documentation for all REST API endpoints.
- Authentication and authorization
- Rate limiting and error handling
- Pagination strategies
- Complete endpoint documentation with examples
- Request/response formats
- Error codes and troubleshooting

**Topics covered:**
- Authentication Service (Registration, Login, Social Login)
- User Profile Service (Profile management, Photos, Subscriptions)
- Discovery & Matching Service (Discovery feed, Swipes, Matches)
- Messaging Service (Conversations, Messages)
- Payment Service (Stripe integration, Webhooks)
- Media Service (Photo/video upload)
- Notification Service (Push notifications, Email)
- Admin Service (Platform management)
- Moderation Service (Content moderation, Safety)

#### 3. [WebSocket API Documentation](./WEBSOCKET_API.md)
Real-time communication via WebSocket.
- Connection setup and authentication
- Event types and message formats
- Messaging events (send, receive, typing indicators)
- Presence system (online/offline status)
- Matching events (new matches, expiration)
- Video call signaling (WebRTC)
- Error handling and reconnection strategies
- Best practices for production use

**Use this for:**
- Implementing real-time messaging
- Building presence indicators
- Video call integration
- Live notifications

#### 4. [SDK Documentation](./SDK_DOCUMENTATION.md)
Official SDKs and integration guides for multiple platforms.
- JavaScript/TypeScript SDK (React, Vue, Angular)
- iOS SDK (Swift, SwiftUI)
- Android SDK (Kotlin, Jetpack Compose)
- React Native integration
- Flutter integration

**Features:**
- Type-safe API clients
- Automatic token refresh
- WebSocket connection management
- Error handling
- Offline queue
- File upload helpers

### Integration Guides

#### 5. [Third-Party Integration Guides](./INTEGRATION_GUIDES.md)
Step-by-step guides for integrating external services.

**Covers:**
- **Stripe Payment Integration**
  - Setup and configuration
  - Client integration (Web, iOS, Android)
  - Backend webhook handling
  - Testing and troubleshooting

- **Agora Video Calling**
  - Account setup
  - Token generation
  - Client implementation
  - Call recording
  - Quality optimization

- **Firebase Integration**
  - Push notifications (FCM)
  - Analytics
  - Crashlytics
  - Remote config

- **Social Login**
  - Google Sign-In
  - Facebook Login
  - Apple Sign In
  - OAuth flow implementation

## Quick Start

### For Frontend Developers

1. **Install the SDK:**
   ```bash
   npm install @flamoral/sdk
   ```

2. **Initialize the client:**
   ```typescript
   import { FlamoralClient } from '@flamoral/sdk';

   const client = new FlamoralClient({
     apiUrl: 'https://api.flamoral.com',
     environment: 'production'
   });
   ```

3. **Authenticate:**
   ```typescript
   const result = await client.auth.login({
     email: 'user@example.com',
     password: 'password123'
   });
   ```

4. **Start building!**
   ```typescript
   // Get discovery feed
   const profiles = await client.discovery.getFeed();

   // Send a message
   const message = await client.messages.send({
     conversationId: 'conv_123',
     content: 'Hello!',
     type: 'text'
   });

   // Listen for real-time events
   client.realtime.on('message:new', (event) => {
     console.log('New message:', event.message);
   });
   ```

### For Backend Developers

1. **Review the OpenAPI Specification:**
   - Download [openapi-complete.yaml](./openapi-complete.yaml)
   - Import into your API tool of choice

2. **Understand Authentication:**
   - Read the [Authentication section](./API_REFERENCE_COMPLETE.md#authentication)
   - Implement JWT token handling
   - Set up token refresh logic

3. **Implement Webhooks:**
   - Configure [Stripe webhooks](./INTEGRATION_GUIDES.md#stripe-payment-integration)
   - Handle payment events
   - Update user subscriptions

4. **Test with Postman:**
   - Import the OpenAPI spec into Postman
   - Set up environment variables
   - Test endpoints

### For Mobile Developers

#### iOS (Swift)

1. **Install SDK:**
   ```ruby
   pod 'FlamoralSDK'
   ```

2. **Initialize:**
   ```swift
   import FlamoralSDK

   let client = FlamoralClient(config: FlamoralConfig(
     apiUrl: "https://api.flamoral.com",
     environment: .production
   ))
   ```

3. **Build features:**
   - See [iOS SDK Documentation](./SDK_DOCUMENTATION.md#ios-sdk-swift)

#### Android (Kotlin)

1. **Install SDK:**
   ```gradle
   implementation 'com.flamoral:sdk:1.0.0'
   ```

2. **Initialize:**
   ```kotlin
   val client = FlamoralClient(context, FlamoralConfig(
     apiUrl = "https://api.flamoral.com",
     environment = Environment.PRODUCTION
   ))
   ```

3. **Build features:**
   - See [Android SDK Documentation](./SDK_DOCUMENTATION.md#android-sdk-kotlin)

## API Environments

| Environment | URL | Purpose |
|------------|-----|---------|
| Production | `https://api.flamoral.com` | Live production environment |
| Staging | `https://api-staging.flamoral.com` | Pre-production testing |
| Development | `http://localhost:3000` | Local development |

## Authentication

The Flamoral API uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid access token.

### Getting Started

1. **Register a new account** or **login** to get tokens:
   ```bash
   POST /api/auth/register
   POST /api/auth/login
   ```

2. **Include access token** in requests:
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Refresh token** before expiration (15 minutes):
   ```bash
   POST /api/auth/refresh-token
   ```

**See:** [Complete Authentication Guide](./API_REFERENCE_COMPLETE.md#authentication)

## Rate Limiting

API requests are rate-limited to ensure fair usage:

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| Media Upload | 20 requests | 1 hour |
| Messaging | 60 requests | 1 minute |

Rate limit information is included in response headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

**See:** [Rate Limiting Details](./API_REFERENCE_COMPLETE.md#rate-limiting)

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "statusCode": 400,
  "details": {
    "field": "email",
    "constraint": "isEmail"
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid input or validation error |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

**See:** [Complete Error Handling Guide](./API_REFERENCE_COMPLETE.md#error-handling)

## WebSocket Events

Real-time features use WebSocket connections:

```javascript
import { io } from 'socket.io-client';

const socket = io('https://api.flamoral.com', {
  auth: {
    token: accessToken,
    userId: currentUserId
  }
});

// Listen for new messages
socket.on('message:new', (event) => {
  console.log('New message:', event.message);
});

// Listen for matches
socket.on('match:new', (event) => {
  console.log('New match:', event.user);
});
```

**See:** [Complete WebSocket Documentation](./WEBSOCKET_API.md)

## SDKs and Libraries

Official SDKs are available for multiple platforms:

### JavaScript/TypeScript
```bash
npm install @flamoral/sdk
```
[Documentation](./SDK_DOCUMENTATION.md#javascripttypescript-sdk)

### iOS (Swift)
```ruby
pod 'FlamoralSDK'
```
[Documentation](./SDK_DOCUMENTATION.md#ios-sdk-swift)

### Android (Kotlin)
```gradle
implementation 'com.flamoral:sdk:1.0.0'
```
[Documentation](./SDK_DOCUMENTATION.md#android-sdk-kotlin)

### React Native
```bash
npm install @flamoral/react-native-sdk
```
[Documentation](./SDK_DOCUMENTATION.md#react-native-integration)

### Flutter
```yaml
dependencies:
  flamoral_sdk: ^1.0.0
```
[Documentation](./SDK_DOCUMENTATION.md#flutter-integration)

## Postman Collection

Import our Postman collection for easy API testing:

1. Download: [dating-platform.postman_collection.json](../../dating-platform.postman_collection.json)
2. Import into Postman
3. Set up environment variables:
   - `baseUrl`: API base URL
   - `accessToken`: Your access token
   - `userId`: Your user ID

## Testing

### Test Accounts

For development and testing:

```
Premium User:
Email: premium@test.flamoral.com
Password: Test123!

Free User:
Email: free@test.flamoral.com
Password: Test123!
```

### Test Cards (Stripe)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

### Test Environment

Use staging environment for testing:
```
https://api-staging.flamoral.com
```

## Support and Resources

### Documentation

- [API Reference](./API_REFERENCE_COMPLETE.md) - Complete REST API documentation
- [WebSocket API](./WEBSOCKET_API.md) - Real-time communication
- [SDK Documentation](./SDK_DOCUMENTATION.md) - Client libraries
- [Integration Guides](./INTEGRATION_GUIDES.md) - Third-party integrations

### Additional Resources

- [Architecture Overview](../ARCHITECTURE_OVERVIEW.md)
- [Security Guide](../security/SECURITY_QUICK_REFERENCE.md)
- [Deployment Guide](../deployment-guide/README.md)
- [Testing Guide](../../COMPREHENSIVE_TESTING_GUIDE.md)

### Getting Help

- **Email:** api@flamoral.com
- **Slack:** [flamoral-developers.slack.com](https://flamoral-developers.slack.com)
- **GitHub Issues:** [github.com/flamoral/flamoral-platform/issues](https://github.com/flamoral/flamoral-platform/issues)
- **Stack Overflow:** Tag questions with `flamoral`

### Community

- **Developer Forum:** [developers.flamoral.com](https://developers.flamoral.com)
- **Discord:** [discord.gg/flamoral-dev](https://discord.gg/flamoral-dev)
- **Twitter:** [@FlamoralDev](https://twitter.com/FlamoralDev)

## Changelog

### Version 2.0.0 (Current)

**New Features:**
- Enhanced messaging with reactions and replies
- Video calling integration with Agora
- Photo verification system
- Super Likes feature
- Boost products
- Mobile in-app purchases

**Improvements:**
- Improved matching algorithm
- Better rate limiting
- Enhanced error messages
- Optimized WebSocket connections

**Breaking Changes:**
- Authentication tokens now expire after 15 minutes (was 60 minutes)
- User profile structure updated
- Pagination format changed

**See:** [Complete Changelog](../../CHANGELOG.md)

## Best Practices

### Security

1. **Never expose API keys** in client-side code
2. **Always use HTTPS** in production
3. **Implement token refresh** before expiration
4. **Validate all user input** on the backend
5. **Rate limit your requests** to avoid blocks

### Performance

1. **Cache responses** when appropriate
2. **Use pagination** for large datasets
3. **Batch requests** when possible
4. **Use WebSocket** for real-time features instead of polling
5. **Optimize images** before upload

### Error Handling

1. **Always handle errors** gracefully
2. **Show user-friendly messages** for errors
3. **Log errors** for debugging
4. **Implement retry logic** for transient failures
5. **Monitor error rates** in production

### Development

1. **Use staging environment** for testing
2. **Test edge cases** thoroughly
3. **Follow API conventions** in your code
4. **Keep SDKs updated** to latest version
5. **Read documentation** before asking for help

## Contributing

We welcome contributions to improve our API and documentation!

### Reporting Issues

If you find a bug or have a feature request:

1. Check if it's already reported
2. Create a new issue with:
   - Clear description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details

### Suggesting Improvements

Have ideas for improving the API or documentation?

1. Open a discussion on our forum
2. Describe the use case
3. Explain the benefits
4. Provide examples if possible

## License

The Flamoral API documentation is licensed under [MIT License](../../LICENSE).

The Flamoral Platform API itself is proprietary and usage is subject to our [Terms of Service](https://flamoral.com/terms).

---

**Last Updated:** December 2024
**API Version:** 2.0.0
**Documentation Version:** 2.0.0

For questions or feedback about this documentation, please contact: api@flamoral.com
