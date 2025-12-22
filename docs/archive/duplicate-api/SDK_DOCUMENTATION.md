# Flamoral SDK Documentation

## Table of Contents

- [Overview](#overview)
- [JavaScript/TypeScript SDK](#javascripttypescript-sdk)
- [iOS SDK (Swift)](#ios-sdk-swift)
- [Android SDK (Kotlin)](#android-sdk-kotlin)
- [React Native Integration](#react-native-integration)
- [Flutter Integration](#flutter-integration)

---

## Overview

The Flamoral SDK provides easy-to-use libraries for integrating the Flamoral Dating Platform into your applications. Each SDK wraps the REST API and WebSocket connections with native language features and best practices.

### Features

- Type-safe API client
- Automatic authentication handling
- Token refresh management
- WebSocket connection management
- Error handling and retry logic
- Offline queue for messages
- File upload helpers
- Response caching
- Analytics integration

---

## JavaScript/TypeScript SDK

### Installation

```bash
npm install @flamoral/sdk
# or
yarn add @flamoral/sdk
```

### Setup

```typescript
import { FlamoralClient } from '@flamoral/sdk';

const client = new FlamoralClient({
  apiUrl: 'https://api.flamoral.com',
  environment: 'production', // 'development' | 'staging' | 'production'
  debug: false
});
```

### Authentication

#### Register

```typescript
async function register() {
  try {
    const result = await client.auth.register({
      email: 'john@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1995-06-15',
      gender: 'male'
    });

    console.log('Registered:', result.user);
    console.log('Access Token:', result.accessToken);

    // Tokens are automatically stored and used for subsequent requests
  } catch (error) {
    if (error.code === 'EMAIL_EXISTS') {
      console.error('Email already registered');
    } else {
      console.error('Registration failed:', error.message);
    }
  }
}
```

#### Login

```typescript
async function login() {
  try {
    const result = await client.auth.login({
      email: 'john@example.com',
      password: 'SecurePass123!'
    });

    console.log('Logged in:', result.user);

    // Client is now authenticated
    // All subsequent requests will include the access token
  } catch (error) {
    if (error.code === 'INVALID_CREDENTIALS') {
      console.error('Invalid email or password');
    } else if (error.code === 'ACCOUNT_LOCKED') {
      console.error('Account locked:', error.details.lockedUntil);
    } else {
      console.error('Login failed:', error.message);
    }
  }
}
```

#### Social Login

```typescript
// Google Login
async function loginWithGoogle(googleToken: string) {
  try {
    const result = await client.auth.socialLogin.google({
      token: googleToken
    });

    console.log('Logged in with Google:', result.user);
  } catch (error) {
    console.error('Google login failed:', error);
  }
}

// Facebook Login
async function loginWithFacebook(facebookToken: string) {
  const result = await client.auth.socialLogin.facebook({
    token: facebookToken
  });
}

// Apple Login
async function loginWithApple(identityToken: string) {
  const result = await client.auth.socialLogin.apple({
    identityToken
  });
}
```

#### Logout

```typescript
async function logout() {
  await client.auth.logout();
  console.log('Logged out successfully');
}
```

#### Token Management

```typescript
// Check if authenticated
if (client.auth.isAuthenticated()) {
  console.log('User is authenticated');
}

// Get current user
const currentUser = client.auth.getCurrentUser();

// Get access token
const accessToken = client.auth.getAccessToken();

// Manually refresh token
await client.auth.refreshToken();

// Listen for token expiration
client.auth.on('tokenExpired', async () => {
  console.log('Token expired, refreshing...');
  await client.auth.refreshToken();
});
```

### Profile Management

#### Get Profile

```typescript
async function getMyProfile() {
  const profile = await client.profile.get();

  console.log('Profile:', profile);
  console.log('Photos:', profile.photos);
  console.log('Interests:', profile.interests);
  console.log('Verified:', profile.verified);
}
```

#### Update Profile

```typescript
async function updateProfile() {
  const updatedProfile = await client.profile.update({
    bio: 'Adventure seeker and coffee enthusiast ☕',
    interests: ['Travel', 'Photography', 'Hiking'],
    height: 175,
    occupation: 'Software Engineer',
    relationshipGoal: 'long-term'
  });

  console.log('Profile updated:', updatedProfile);
}
```

#### Get Another User's Profile

```typescript
async function getUserProfile(userId: string) {
  try {
    const profile = await client.profile.getUser(userId);

    console.log('User profile:', profile);
    console.log('Distance:', profile.distance, 'km');
  } catch (error) {
    if (error.code === 'USER_BLOCKED') {
      console.log('Cannot view blocked user');
    }
  }
}
```

### Photo Management

#### Upload Photo

```typescript
async function uploadPhoto(file: File) {
  try {
    const photo = await client.photos.upload(file, {
      order: 2
    });

    console.log('Photo uploaded:', photo);
    console.log('URL:', photo.url);
    console.log('Thumbnail:', photo.thumbnailUrl);
  } catch (error) {
    if (error.code === 'MAX_PHOTOS_REACHED') {
      console.error('Maximum 9 photos allowed');
    } else if (error.code === 'FILE_TOO_LARGE') {
      console.error('File must be less than 10MB');
    }
  }
}
```

#### Upload with Progress

```typescript
async function uploadPhotoWithProgress(file: File) {
  const photo = await client.photos.upload(file, {
    onProgress: (progress) => {
      console.log('Upload progress:', progress.percent + '%');
      updateProgressBar(progress.percent);
    }
  });

  console.log('Upload complete:', photo);
}
```

#### Delete Photo

```typescript
async function deletePhoto(photoId: string) {
  await client.photos.delete(photoId);
  console.log('Photo deleted');
}
```

#### Set Primary Photo

```typescript
async function setPrimaryPhoto(photoId: string) {
  await client.photos.setPrimary(photoId);
  console.log('Primary photo updated');
}
```

#### Reorder Photos

```typescript
async function reorderPhotos(photoIds: string[]) {
  await client.photos.reorder(photoIds);
  console.log('Photos reordered');
}
```

### Discovery & Matching

#### Get Discovery Feed

```typescript
async function getDiscoveryFeed() {
  const profiles = await client.discovery.getFeed({
    limit: 10
  });

  console.log('Discovered profiles:', profiles);

  profiles.forEach(profile => {
    console.log(`${profile.firstName}, ${profile.age}`);
    console.log(`Distance: ${profile.distance} km`);
  });
}
```

#### Record Swipe

```typescript
async function swipeRight(userId: string) {
  const result = await client.swipes.like(userId);

  if (result.matched) {
    console.log('It\'s a match!');
    console.log('Match ID:', result.matchId);
    showMatchAnimation(result.match);
  } else {
    console.log('Liked, waiting for match');
  }
}

async function swipeLeft(userId: string) {
  await client.swipes.pass(userId);
  console.log('Passed');
}

async function superLike(userId: string) {
  try {
    const result = await client.swipes.superLike(userId);

    if (result.matched) {
      console.log('Super Like Match!');
    } else {
      console.log('Super Like sent');
    }
  } catch (error) {
    if (error.code === 'INSUFFICIENT_COINS') {
      console.error('Not enough coins for Super Like');
      showBuyCoinsProm();
    }
  }
}
```

#### Get Matches

```typescript
async function getMatches() {
  const { data: matches, pagination } = await client.matches.list({
    page: 1,
    limit: 20,
    sort: 'matchedAt:desc'
  });

  matches.forEach(match => {
    console.log(`Match with ${match.user.firstName}`);
    console.log(`Matched at: ${match.matchedAt}`);
    console.log(`Expires at: ${match.expiresAt}`);
  });

  console.log(`Total matches: ${pagination.total}`);
}
```

#### Get Match Details

```typescript
async function getMatchDetails(matchId: string) {
  const match = await client.matches.get(matchId);

  console.log('Match:', match);
  console.log('User:', match.user);
  console.log('Conversation ID:', match.conversationId);
}
```

#### Unmatch

```typescript
async function unmatch(matchId: string) {
  await client.matches.unmatch(matchId);
  console.log('Unmatched successfully');
}
```

### Messaging

#### Send Message

```typescript
async function sendMessage(conversationId: string, content: string) {
  const message = await client.messages.send({
    conversationId,
    content,
    type: 'text'
  });

  console.log('Message sent:', message);
}
```

#### Send Image Message

```typescript
async function sendImageMessage(conversationId: string, imageFile: File) {
  // First upload the image
  const media = await client.media.upload(imageFile, {
    type: 'image'
  });

  // Then send message with image URL
  const message = await client.messages.send({
    conversationId,
    type: 'image',
    content: '',
    metadata: {
      mediaUrl: media.url,
      thumbnailUrl: media.thumbnailUrl
    }
  });

  console.log('Image message sent:', message);
}
```

#### Get Conversations

```typescript
async function getConversations() {
  const { data: conversations, pagination } = await client.conversations.list({
    page: 1,
    limit: 20
  });

  conversations.forEach(conv => {
    console.log(`Conversation with ${conv.participant.firstName}`);
    console.log(`Last message: ${conv.lastMessage?.content}`);
    console.log(`Unread: ${conv.unreadCount}`);
  });
}
```

#### Get Conversation Messages

```typescript
async function getMessages(conversationId: string) {
  const { data: messages, pagination } = await client.conversations.getMessages(
    conversationId,
    {
      page: 1,
      limit: 50
    }
  );

  messages.forEach(message => {
    console.log(`${message.senderId}: ${message.content}`);
  });
}
```

#### Mark Messages as Read

```typescript
async function markAsRead(conversationId: string) {
  await client.conversations.markAsRead(conversationId);
  console.log('Marked as read');
}
```

### WebSocket Integration

#### Connect to WebSocket

```typescript
// Connect (automatically called on first use)
await client.realtime.connect();

// Or manually control connection
client.realtime.connect();
client.realtime.disconnect();

// Check connection status
if (client.realtime.isConnected()) {
  console.log('WebSocket connected');
}
```

#### Listen for Messages

```typescript
client.realtime.on('message:new', (event) => {
  console.log('New message from:', event.sender.firstName);
  console.log('Message:', event.message.content);

  // Update UI
  addMessageToUI(event.message);

  // Show notification
  showNotification({
    title: event.sender.firstName,
    body: event.message.content
  });

  // Mark as delivered
  client.realtime.emit('message:delivered', {
    messageId: event.message.id,
    conversationId: event.message.conversationId
  });
});
```

#### Listen for Matches

```typescript
client.realtime.on('match:new', (event) => {
  console.log('New match with:', event.user.firstName);

  // Show match animation
  showMatchAnimation(event.user);

  // Play sound
  playMatchSound();
});
```

#### Typing Indicators

```typescript
// Emit typing start
client.realtime.typing.start(conversationId, receiverId);

// Emit typing stop
client.realtime.typing.stop(conversationId, receiverId);

// Listen for typing indicators
client.realtime.on('typing:start', (event) => {
  showTypingIndicator(event.userId, event.conversationId);
});

client.realtime.on('typing:stop', (event) => {
  hideTypingIndicator(event.userId, event.conversationId);
});
```

#### Presence

```typescript
// Subscribe to user presence
client.realtime.presence.subscribe([userId1, userId2, userId3]);

// Listen for online/offline events
client.realtime.on('presence:online', (event) => {
  console.log(`${event.userId} is online`);
  updateUserStatus(event.userId, 'online');
});

client.realtime.on('presence:offline', (event) => {
  console.log(`${event.userId} is offline`);
  updateUserStatus(event.userId, 'offline');
});

// Unsubscribe
client.realtime.presence.unsubscribe([userId1, userId2]);
```

### Subscriptions & Payments

#### Get Current Subscription

```typescript
async function getCurrentSubscription() {
  const subscription = await client.subscriptions.getCurrent();

  console.log('Tier:', subscription.tier);
  console.log('Status:', subscription.status);
  console.log('Expires:', subscription.expiresAt);
}
```

#### Create Payment Intent

```typescript
async function subscribeToPremium() {
  try {
    const paymentIntent = await client.payments.createIntent({
      productId: 'premium_monthly',
      productType: 'subscription'
    });

    // Use Stripe to process payment
    const stripe = await loadStripe(stripePublicKey);
    const { error } = await stripe.confirmPayment({
      clientSecret: paymentIntent.clientSecret,
      confirmParams: {
        return_url: 'https://yourapp.com/payment/success'
      }
    });

    if (error) {
      console.error('Payment failed:', error);
    }
  } catch (error) {
    console.error('Failed to create payment intent:', error);
  }
}
```

#### Get Coin Balance

```typescript
async function getCoinBalance() {
  const balance = await client.coins.getBalance();
  console.log('Coin balance:', balance);
}
```

#### Purchase Coins

```typescript
async function purchaseCoins(productId: string) {
  const paymentIntent = await client.coins.purchaseIntent(productId);

  // Process payment with Stripe
  // ...

  console.log('Coins purchased successfully');
}
```

### Error Handling

```typescript
import { FlamoralError, ErrorCode } from '@flamoral/sdk';

try {
  await client.profile.update({ bio: 'New bio' });
} catch (error) {
  if (error instanceof FlamoralError) {
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
        console.error('Please log in again');
        redirectToLogin();
        break;

      case ErrorCode.VALIDATION_ERROR:
        console.error('Validation errors:', error.details);
        showValidationErrors(error.details);
        break;

      case ErrorCode.RATE_LIMITED:
        console.error('Rate limited. Retry after:', error.retryAfter);
        break;

      case ErrorCode.NETWORK_ERROR:
        console.error('Network error. Please check your connection.');
        break;

      default:
        console.error('Error:', error.message);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### React Hooks

The SDK includes React hooks for easier integration:

```typescript
import { useFlamoral, useProfile, useMatches, useMessages } from '@flamoral/sdk/react';

function ProfileScreen() {
  const { profile, loading, error, updateProfile } = useProfile();

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      <h1>{profile.firstName}</h1>
      <p>{profile.bio}</p>
      <button onClick={() => updateProfile({ bio: 'New bio' })}>
        Update Bio
      </button>
    </div>
  );
}

function MatchesScreen() {
  const { matches, loading, loadMore, hasMore } = useMatches();

  return (
    <div>
      {matches.map(match => (
        <MatchCard key={match.id} match={match} />
      ))}
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          Load More
        </button>
      )}
    </div>
  );
}

function ConversationScreen({ conversationId }) {
  const {
    messages,
    loading,
    sendMessage,
    markAsRead
  } = useMessages(conversationId);

  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  return (
    <div>
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  );
}
```

### Configuration Options

```typescript
const client = new FlamoralClient({
  // API Configuration
  apiUrl: 'https://api.flamoral.com',
  environment: 'production',

  // Debugging
  debug: true,
  logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'

  // Authentication
  autoRefreshToken: true,
  tokenRefreshBuffer: 60, // Refresh token 60 seconds before expiry

  // HTTP Client
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,

  // WebSocket
  websocket: {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  },

  // Caching
  cache: {
    enabled: true,
    ttl: 300, // 5 minutes
    maxSize: 100 // Max cache entries
  },

  // Offline Support
  offline: {
    enabled: true,
    queueMessages: true
  }
});
```

---

## iOS SDK (Swift)

### Installation

#### CocoaPods

```ruby
pod 'FlamoralSDK'
```

#### Swift Package Manager

```swift
dependencies: [
    .package(url: "https://github.com/flamoral/flamoral-ios-sdk.git", from: "1.0.0")
]
```

### Setup

```swift
import FlamoralSDK

// Configure SDK
let config = FlamoralConfig(
    apiUrl: "https://api.flamoral.com",
    environment: .production
)

let client = FlamoralClient(config: config)
```

### Authentication

```swift
// Register
Task {
    do {
        let request = RegisterRequest(
            email: "john@example.com",
            password: "SecurePass123!",
            firstName: "John",
            lastName: "Doe",
            dateOfBirth: "1995-06-15",
            gender: .male
        )

        let result = try await client.auth.register(request)
        print("Registered: \(result.user.firstName)")

        // Tokens are automatically stored in Keychain
    } catch let error as FlamoralError {
        switch error.code {
        case .emailExists:
            print("Email already registered")
        default:
            print("Registration failed: \(error.message)")
        }
    }
}
```

```swift
// Login
Task {
    let result = try await client.auth.login(
        email: "john@example.com",
        password: "SecurePass123!"
    )

    print("Logged in: \(result.user.firstName)")
}
```

```swift
// Social Login - Google
Task {
    let result = try await client.auth.socialLogin(
        provider: .google,
        token: googleIdToken
    )

    print("Logged in with Google")
}
```

```swift
// Logout
Task {
    try await client.auth.logout()
    print("Logged out")
}
```

### Profile Management

```swift
// Get profile
Task {
    let profile = try await client.profile.get()

    print("Name: \(profile.firstName)")
    print("Bio: \(profile.bio)")
    print("Photos: \(profile.photos.count)")
}
```

```swift
// Update profile
Task {
    let updates = ProfileUpdate(
        bio: "Adventure seeker ☕",
        interests: ["Travel", "Photography"],
        height: 175
    )

    let profile = try await client.profile.update(updates)
    print("Profile updated")
}
```

### Photo Upload

```swift
// Upload photo
Task {
    guard let image = UIImage(named: "profile") else { return }

    let photo = try await client.photos.upload(
        image: image,
        order: 1,
        compressionQuality: 0.8
    )

    print("Photo uploaded: \(photo.url)")
}
```

```swift
// Upload with progress
Task {
    let photo = try await client.photos.upload(
        image: image,
        progress: { progress in
            DispatchQueue.main.async {
                self.progressView.progress = Float(progress.fractionCompleted)
            }
        }
    )

    print("Upload complete")
}
```

### Discovery & Matching

```swift
// Get discovery feed
Task {
    let profiles = try await client.discovery.getFeed(limit: 10)

    for profile in profiles {
        print("\(profile.firstName), \(profile.age)")
        print("Distance: \(profile.distance) km")
    }
}
```

```swift
// Swipe right
Task {
    let result = try await client.swipes.like(userId: targetUserId)

    if result.matched {
        print("It's a match!")
        showMatchAnimation(result.match)
    }
}
```

```swift
// Get matches
Task {
    let response = try await client.matches.list(
        page: 1,
        limit: 20
    )

    for match in response.data {
        print("Match with \(match.user.firstName)")
    }
}
```

### Messaging

```swift
// Send message
Task {
    let message = try await client.messages.send(
        conversationId: conversationId,
        content: "Hello!",
        type: .text
    )

    print("Message sent: \(message.id)")
}
```

```swift
// Get conversations
Task {
    let response = try await client.conversations.list(page: 1, limit: 20)

    for conversation in response.data {
        print("Conversation with \(conversation.participant.firstName)")
        print("Unread: \(conversation.unreadCount)")
    }
}
```

### WebSocket Integration

```swift
// Connect
client.realtime.connect()

// Listen for messages
client.realtime.on(.messageNew) { (event: MessageNewEvent) in
    print("New message from \(event.sender.firstName)")
    print("Content: \(event.message.content)")

    // Update UI on main thread
    DispatchQueue.main.async {
        self.addMessage(event.message)
    }
}

// Listen for matches
client.realtime.on(.matchNew) { (event: MatchNewEvent) in
    print("New match with \(event.user.firstName)")

    DispatchQueue.main.async {
        self.showMatchAnimation(event.user)
    }
}

// Typing indicators
client.realtime.typing.start(
    conversationId: conversationId,
    receiverId: receiverId
)

// Disconnect
client.realtime.disconnect()
```

### SwiftUI Integration

```swift
import SwiftUI
import FlamoralSDK

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        VStack {
            if viewModel.isLoading {
                ProgressView()
            } else if let profile = viewModel.profile {
                VStack(alignment: .leading, spacing: 16) {
                    Text(profile.firstName)
                        .font(.title)

                    Text(profile.bio)
                        .font(.body)

                    ScrollView(.horizontal) {
                        HStack {
                            ForEach(profile.photos) { photo in
                                AsyncImage(url: URL(string: photo.url)) { image in
                                    image.resizable()
                                } placeholder: {
                                    ProgressView()
                                }
                                .frame(width: 200, height: 200)
                                .cornerRadius(12)
                            }
                        }
                    }
                }
            }
        }
        .task {
            await viewModel.loadProfile()
        }
    }
}

class ProfileViewModel: ObservableObject {
    @Published var profile: Profile?
    @Published var isLoading = false
    @Published var error: Error?

    private let client = FlamoralClient.shared

    func loadProfile() async {
        isLoading = true
        defer { isLoading = false }

        do {
            profile = try await client.profile.get()
        } catch {
            self.error = error
        }
    }
}
```

---

## Android SDK (Kotlin)

### Installation

#### Gradle

```gradle
dependencies {
    implementation 'com.flamoral:sdk:1.0.0'
}
```

### Setup

```kotlin
import com.flamoral.sdk.FlamoralClient
import com.flamoral.sdk.FlamoralConfig

val config = FlamoralConfig(
    apiUrl = "https://api.flamoral.com",
    environment = Environment.PRODUCTION
)

val client = FlamoralClient(context, config)
```

### Authentication

```kotlin
// Register
lifecycleScope.launch {
    try {
        val request = RegisterRequest(
            email = "john@example.com",
            password = "SecurePass123!",
            firstName = "John",
            lastName = "Doe",
            dateOfBirth = "1995-06-15",
            gender = Gender.MALE
        )

        val result = client.auth.register(request)
        Log.d("Auth", "Registered: ${result.user.firstName}")
    } catch (e: FlamoralException) {
        when (e.code) {
            ErrorCode.EMAIL_EXISTS -> {
                Toast.makeText(context, "Email already registered", Toast.LENGTH_SHORT).show()
            }
            else -> {
                Log.e("Auth", "Registration failed", e)
            }
        }
    }
}
```

```kotlin
// Login
lifecycleScope.launch {
    val result = client.auth.login(
        email = "john@example.com",
        password = "SecurePass123!"
    )

    Log.d("Auth", "Logged in: ${result.user.firstName}")
}
```

```kotlin
// Social Login
lifecycleScope.launch {
    val result = client.auth.socialLogin(
        provider = SocialProvider.GOOGLE,
        token = googleIdToken
    )

    Log.d("Auth", "Logged in with Google")
}
```

### Profile Management

```kotlin
// Get profile
lifecycleScope.launch {
    val profile = client.profile.get()

    Log.d("Profile", "Name: ${profile.firstName}")
    Log.d("Profile", "Bio: ${profile.bio}")
}
```

```kotlin
// Update profile
lifecycleScope.launch {
    val updates = ProfileUpdate(
        bio = "Adventure seeker ☕",
        interests = listOf("Travel", "Photography"),
        height = 175
    )

    val profile = client.profile.update(updates)
    Log.d("Profile", "Profile updated")
}
```

### Photo Upload

```kotlin
// Upload photo
lifecycleScope.launch {
    val uri = // photo URI from gallery

    val photo = client.photos.upload(
        uri = uri,
        order = 1,
        compressionQuality = 0.8f
    )

    Log.d("Photos", "Photo uploaded: ${photo.url}")
}
```

```kotlin
// Upload with progress
lifecycleScope.launch {
    val photo = client.photos.upload(
        uri = photoUri,
        onProgress = { progress ->
            runOnUiThread {
                progressBar.progress = progress
            }
        }
    )

    Toast.makeText(context, "Upload complete", Toast.LENGTH_SHORT).show()
}
```

### Discovery & Matching

```kotlin
// Get discovery feed
lifecycleScope.launch {
    val profiles = client.discovery.getFeed(limit = 10)

    profiles.forEach { profile ->
        Log.d("Discovery", "${profile.firstName}, ${profile.age}")
        Log.d("Discovery", "Distance: ${profile.distance} km")
    }
}
```

```kotlin
// Swipe right
lifecycleScope.launch {
    val result = client.swipes.like(targetUserId)

    if (result.matched) {
        Log.d("Swipe", "It's a match!")
        showMatchAnimation(result.match)
    }
}
```

### Messaging

```kotlin
// Send message
lifecycleScope.launch {
    val message = client.messages.send(
        conversationId = conversationId,
        content = "Hello!",
        type = MessageType.TEXT
    )

    Log.d("Messages", "Message sent: ${message.id}")
}
```

```kotlin
// Get conversations
lifecycleScope.launch {
    val response = client.conversations.list(page = 1, limit = 20)

    response.data.forEach { conversation ->
        Log.d("Conversations", "Conversation with ${conversation.participant.firstName}")
    }
}
```

### WebSocket Integration

```kotlin
// Connect
client.realtime.connect()

// Listen for messages
client.realtime.on(RealtimeEvent.MESSAGE_NEW) { event: MessageNewEvent ->
    Log.d("Realtime", "New message from ${event.sender.firstName}")

    runOnUiThread {
        addMessage(event.message)
    }
}

// Listen for matches
client.realtime.on(RealtimeEvent.MATCH_NEW) { event: MatchNewEvent ->
    Log.d("Realtime", "New match with ${event.user.firstName}")

    runOnUiThread {
        showMatchAnimation(event.user)
    }
}

// Typing indicators
client.realtime.typing.start(conversationId, receiverId)

// Disconnect
client.realtime.disconnect()
```

### Jetpack Compose Integration

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel = viewModel()) {
    val profile by viewModel.profile.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()

    LaunchedEffect(Unit) {
        viewModel.loadProfile()
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            isLoading -> {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center)
                )
            }
            profile != null -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    Text(
                        text = profile!!.firstName,
                        style = MaterialTheme.typography.h4
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    Text(
                        text = profile!!.bio,
                        style = MaterialTheme.typography.body1
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    LazyRow {
                        items(profile!!.photos) { photo ->
                            AsyncImage(
                                model = photo.url,
                                contentDescription = "Profile photo",
                                modifier = Modifier
                                    .size(200.dp)
                                    .padding(4.dp)
                                    .clip(RoundedCornerShape(12.dp))
                            )
                        }
                    }
                }
            }
        }
    }
}

class ProfileViewModel(
    private val client: FlamoralClient
) : ViewModel() {
    private val _profile = MutableStateFlow<Profile?>(null)
    val profile: StateFlow<Profile?> = _profile

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading

    fun loadProfile() {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _profile.value = client.profile.get()
            } catch (e: Exception) {
                Log.e("ProfileViewModel", "Failed to load profile", e)
            } finally {
                _isLoading.value = false
            }
        }
    }
}
```

---

This SDK documentation continues with React Native and Flutter integrations, which would provide similar patterns adapted for those frameworks.
