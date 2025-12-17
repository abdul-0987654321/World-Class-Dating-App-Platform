# State Management Guide - Flamoral Web App

## Overview

The Flamoral web app uses a comprehensive state management solution based on Redux Toolkit with the following features:

- **Redux Toolkit** - Modern Redux with simplified API
- **RTK Query** - Data fetching and caching
- **Redux Persist** - State persistence with migrations
- **WebSocket Integration** - Real-time updates via middleware
- **TypeScript** - Full type safety
- **Selectors** - Memoized state selection with Reselect

## Architecture

### Store Structure

```
src/store/
├── index.ts                 # Store configuration
├── hooks.ts                 # Typed Redux hooks
├── migrations.ts            # Redux persist migrations
├── api/                     # RTK Query APIs
│   ├── baseApi.ts          # Base API configuration
│   ├── authApi.ts          # Authentication endpoints
│   ├── profileApi.ts       # Profile endpoints
│   ├── matchingApi.ts      # Matching endpoints
│   └── messagingApi.ts     # Messaging endpoints
├── slices/                  # Redux slices
│   ├── authSlice.ts        # Authentication state
│   ├── profileSlice.ts     # Profile state
│   ├── matchingSlice.ts    # Matching state
│   ├── messagingSlice.ts   # Messaging state
│   └── callSlice.ts        # Video/audio call state
├── thunks/                  # Async thunks
│   ├── authThunks.ts       # Auth async operations
│   ├── profileThunks.ts    # Profile async operations
│   ├── matchingThunks.ts   # Matching async operations
│   └── messagingThunks.ts  # Messaging async operations
├── selectors/               # Memoized selectors
│   ├── authSelectors.ts    # Auth state selectors
│   ├── profileSelectors.ts # Profile state selectors
│   ├── matchingSelectors.ts# Matching state selectors
│   ├── messagingSelectors.ts# Messaging state selectors
│   └── callSelectors.ts    # Call state selectors
└── middleware/              # Custom middleware
    ├── socketMiddleware.ts # WebSocket integration
    └── stateListeners.ts   # State synchronization
```

## State Slices

### 1. Auth Slice
Manages authentication state including user data and tokens.

**State:**
```typescript
{
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
}
```

**Actions:**
- `loginStart()` - Start login process
- `loginSuccess(payload)` - Login successful
- `loginFailure(error)` - Login failed
- `logout()` - Logout user
- `updateUser(updates)` - Update user data
- `updateTokens(tokens)` - Update auth tokens
- `clearError()` - Clear error state

### 2. Profile Slice
Manages user profiles and discovery profiles.

**State:**
```typescript
{
  currentProfile: Profile | null;
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
  uploading: boolean;
  uploadProgress: number;
}
```

**Actions:**
- `setCurrentProfile(profile)` - Set current user profile
- `updateProfile(updates)` - Update profile
- `setProfiles(profiles)` - Set discovery profiles
- `addProfile(profile)` - Add profile to list
- `removeProfile(id)` - Remove profile
- `setUploading(boolean)` - Set upload state
- `setUploadProgress(progress)` - Update upload progress

### 3. Matching Slice
Manages matches and matching state.

**State:**
```typescript
{
  matches: Match[];
  currentMatch: Match | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}
```

**Actions:**
- `setMatches(matches)` - Set all matches
- `addMatch(match)` - Add new match
- `removeMatch(id)` - Remove match
- `setCurrentMatch(match)` - Set active match
- `updateMatch(id, updates)` - Update match

### 4. Messaging Slice
Manages conversations and messages.

**State:**
```typescript
{
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  typingUsers: Record<string, boolean>;
  lastFetched: number | null;
}
```

**Actions:**
- `setConversations(conversations)` - Set all conversations
- `upsertConversation(conversation)` - Add/update conversation
- `setCurrentConversation(conversation)` - Set active conversation
- `setMessages(messages)` - Set messages
- `addMessage(message)` - Add new message
- `updateMessage(id, updates)` - Update message
- `deleteMessage(id)` - Delete message
- `markConversationAsRead(id)` - Mark conversation as read
- `setTypingStatus(data)` - Set typing indicator

### 5. Call Slice
Manages video/audio call state.

**State:**
```typescript
{
  activeCall: ActiveCall | null;
  incomingCall: IncomingCall | null;
  callHistory: CallHistoryEntry[];
  networkQuality: NetworkQuality | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  recordingConsent: ConsentData | null;
}
```

**Actions:**
- `startCall(callData)` - Start outgoing call
- `receiveIncomingCall(call)` - Receive incoming call
- `acceptIncomingCall(data)` - Accept call
- `rejectIncomingCall()` - Reject call
- `endCall(reason)` - End active call
- `toggleMute()` - Toggle audio mute
- `toggleVideo()` - Toggle video
- `setNetworkQuality(quality)` - Update network quality

## RTK Query APIs

### Base API
Centralized API configuration with automatic token refresh.

**Features:**
- Automatic authentication header injection
- Token refresh on 401 errors
- Automatic cache invalidation
- Request/response interceptors

### Endpoints

#### Auth API
- `login(credentials)` - User login
- `register(data)` - User registration
- `logout()` - User logout
- `getCurrentUser()` - Get current user
- `refreshToken()` - Refresh access token
- `verifyEmail(token)` - Verify email
- `requestPasswordReset(email)` - Request password reset
- `resetPassword(token, password)` - Reset password

#### Profile API
- `getCurrentProfile()` - Get current user profile
- `getProfileById(id)` - Get profile by ID
- `updateProfile(updates)` - Update profile
- `uploadProfilePhoto(formData)` - Upload photo
- `deleteProfilePhoto(id)` - Delete photo
- `getDiscoveryProfiles(filters)` - Get discovery profiles

#### Matching API
- `getMatches()` - Get all matches
- `likeUser(userId)` - Like a user
- `passUser(userId)` - Pass on a user
- `superLikeUser(userId)` - Super like a user
- `unmatch(matchId)` - Unmatch a user

#### Messaging API
- `getConversations()` - Get all conversations
- `getMessages(conversationId)` - Get messages
- `sendMessage(data)` - Send a message
- `markAsRead(conversationId)` - Mark as read
- `deleteMessage(messageId)` - Delete message
- `uploadMessageMedia(file, type)` - Upload media

## Usage Examples

### Using Typed Hooks
```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectCurrentUser, loginUser } from '@/store';

function LoginComponent() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);

  const handleLogin = async () => {
    await dispatch(loginUser({ email, password }));
  };
}
```

### Using RTK Query Hooks
```typescript
import { useGetMatchesQuery, useLikeUserMutation } from '@/store';

function MatchingComponent() {
  const { data: matches, isLoading } = useGetMatchesQuery();
  const [likeUser] = useLikeUserMutation();

  const handleLike = async (userId: string) => {
    await likeUser(userId);
  };
}
```

### Using Selectors
```typescript
import { useAppSelector } from '@/store/hooks';
import { selectSortedMatches, selectUnreadMatchesCount } from '@/store';

function MatchesPage() {
  const matches = useAppSelector(selectSortedMatches);
  const unreadCount = useAppSelector(selectUnreadMatchesCount);
}
```

### Dispatching Actions
```typescript
import { useAppDispatch } from '@/store/hooks';
import { addMessage, setTypingStatus } from '@/store';

function MessageInput() {
  const dispatch = useAppDispatch();

  const handleTyping = () => {
    dispatch(setTypingStatus({ conversationId, isTyping: true }));
  };
}
```

## State Persistence

Only the **auth** slice is persisted to localStorage. This includes:
- User data
- Authentication tokens
- Login state

**Why only auth?**
- Security: Sensitive data is not persisted
- Performance: Reduces storage usage
- Freshness: Other data is fetched on demand

## WebSocket Integration

The socket middleware automatically:
1. Connects to WebSocket on login
2. Subscribes to real-time events
3. Dispatches actions when events occur
4. Disconnects on logout

**Events handled:**
- New messages → `addMessage()`
- Typing indicators → `setTypingStatus()`
- New matches → `addMatch()`
- Online status updates

## Migrations

Redux persist migrations handle state structure changes:

```typescript
// Add new migration when changing state structure
export const migrations = {
  1: (state) => {
    // Migration logic
    return updatedState;
  },
};
```

## Best Practices

### 1. Always Use Typed Hooks
```typescript
// ✅ Good
import { useAppSelector, useAppDispatch } from '@/store/hooks';

// ❌ Bad
import { useSelector, useDispatch } from 'react-redux';
```

### 2. Use Selectors for Derived Data
```typescript
// ✅ Good - Memoized selector
const sortedMatches = useAppSelector(selectSortedMatches);

// ❌ Bad - Recalculates on every render
const sortedMatches = useAppSelector((state) =>
  [...state.matching.matches].sort(...)
);
```

### 3. Use RTK Query for API Calls
```typescript
// ✅ Good - Automatic caching and refetching
const { data } = useGetMatchesQuery();

// ❌ Bad - Manual state management
useEffect(() => {
  fetchMatches().then(setMatches);
}, []);
```

### 4. Handle Loading and Error States
```typescript
const { data, isLoading, error } = useGetMatchesQuery();

if (isLoading) return <LoadingSpinner />;
if (error) return <ErrorMessage error={error} />;
return <MatchesList matches={data} />;
```

### 5. Avoid Nesting Selectors
```typescript
// ✅ Good
const user = useAppSelector(selectCurrentUser);
const tier = useAppSelector(selectUserPremiumTier);

// ❌ Bad
const user = useAppSelector(selectCurrentUser);
const tier = user?.premium_tier; // Recalculates on every render
```

## Debugging

### Redux DevTools
The store is configured with Redux DevTools in development:
- View state changes
- Time-travel debugging
- Inspect dispatched actions
- Monitor RTK Query requests

### Console Logging
State changes are logged in development mode via the listener middleware.

### Network Monitoring
RTK Query requests can be monitored in the browser's Network tab.

## Performance Optimizations

1. **Memoized Selectors** - Use Reselect for computed values
2. **RTK Query Caching** - Automatic request deduplication
3. **Code Splitting** - Lazy load state slices when needed
4. **Selective Persistence** - Only persist necessary data
5. **Listener Middleware** - Efficient state synchronization

## Common Patterns

### Optimistic Updates
```typescript
const [updateProfile] = useUpdateProfileMutation();

const handleUpdate = async (updates) => {
  // Optimistically update UI
  dispatch(updateProfile(updates));

  try {
    await updateProfile(updates).unwrap();
  } catch (error) {
    // Revert on error
    dispatch(setError(error.message));
  }
};
```

### Invalidating Cache
```typescript
// Invalidate specific tags
invalidatesTags: ['Match', 'Conversation']

// Invalidate on mutation
invalidatesTags: (result, error, arg) => [
  { type: 'Match', id: arg.matchId }
]
```

### Conditional Fetching
```typescript
const { data } = useGetMatchesQuery(undefined, {
  skip: !isAuthenticated, // Skip if not authenticated
  pollingInterval: 30000, // Refetch every 30 seconds
  refetchOnMountOrArgChange: true,
});
```

## Troubleshooting

### State Not Persisting
- Check persist config whitelist
- Verify storage is available
- Check browser console for errors

### RTK Query Not Refetching
- Check cache invalidation tags
- Verify tag types in baseApi
- Use `refetchOnMountOrArgChange`

### WebSocket Not Connecting
- Check token is available
- Verify VITE_SOCKET_URL is set
- Check browser console for errors

### Type Errors
- Ensure all slices export state types
- Use typed hooks from `@/store/hooks`
- Check selector return types

## Migration Checklist

When updating state structure:

1. [ ] Update slice state interface
2. [ ] Add migration in `migrations.ts`
3. [ ] Increment version in persist config
4. [ ] Update selectors if needed
5. [ ] Update components using the state
6. [ ] Test migration with existing persisted state

## Resources

- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [RTK Query Docs](https://redux-toolkit.js.org/rtk-query/overview)
- [Redux Persist Docs](https://github.com/rt2zz/redux-persist)
- [Reselect Docs](https://github.com/reduxjs/reselect)
