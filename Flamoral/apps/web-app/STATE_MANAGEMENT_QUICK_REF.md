# State Management Quick Reference

## Import Patterns

### Hooks
```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
```

### Selectors
```typescript
import {
  selectCurrentUser,
  selectMatches,
  selectConversations,
  selectActiveCall,
} from '@/store';
```

### Actions
```typescript
import {
  loginSuccess,
  logout,
  addMessage,
  addMatch,
  setTypingStatus,
} from '@/store';
```

### Thunks
```typescript
import {
  loginUser,
  fetchMatches,
  sendMessage,
} from '@/store';
```

### RTK Query Hooks
```typescript
import {
  useLoginMutation,
  useGetMatchesQuery,
  useSendMessageMutation,
} from '@/store';
```

## Common Patterns

### Read State
```typescript
// Using selectors (recommended)
const user = useAppSelector(selectCurrentUser);
const matches = useAppSelector(selectSortedMatches);
const unreadCount = useAppSelector(selectUnreadCount);
```

### Dispatch Actions
```typescript
const dispatch = useAppDispatch();

// Simple action
dispatch(logout());

// Action with payload
dispatch(updateUser({ name: 'New Name' }));

// Async thunk
await dispatch(loginUser({ email, password }));
```

### Query Data
```typescript
// Basic query
const { data, isLoading, error } = useGetMatchesQuery();

// Query with parameters
const { data } = useGetMessagesQuery({ conversationId, limit: 50 });

// Query with options
const { data } = useGetProfileByIdQuery(userId, {
  skip: !userId,
  pollingInterval: 30000,
});
```

### Mutate Data
```typescript
const [updateProfile, { isLoading }] = useUpdateProfileMutation();

const handleUpdate = async (updates) => {
  try {
    await updateProfile(updates).unwrap();
    toast.success('Profile updated');
  } catch (error) {
    toast.error(error.message);
  }
};
```

## Selectors Cheat Sheet

### Auth
```typescript
selectIsAuthenticated    // boolean
selectCurrentUser        // User | null
selectAuthToken          // string | null
selectUserId             // string | undefined
selectUserPremiumTier    // SubscriptionTier
selectIsUserVerified     // boolean
```

### Profile
```typescript
selectCurrentProfile     // Profile | null
selectProfiles           // Profile[]
selectProfileLoading     // boolean
selectProfileById(id)    // Profile | undefined
selectIsProfileStale     // boolean
```

### Matching
```typescript
selectMatches            // Match[]
selectCurrentMatch       // Match | null
selectMatchById(id)      // Match | undefined
selectMatchesCount       // number
selectUnreadMatchesCount // number
selectSortedMatches      // Match[]
```

### Messaging
```typescript
selectConversations              // Conversation[]
selectCurrentConversation        // Conversation | null
selectMessages                   // Message[]
selectUnreadCount                // number
selectSortedConversations        // Conversation[]
selectSortedMessages             // Message[]
selectIsTypingInConversation(id) // boolean
```

### Call
```typescript
selectActiveCall         // ActiveCall | null
selectIncomingCall       // IncomingCall | null
selectIsInCall           // boolean
selectCallDuration       // number
selectIsMuted            // boolean
selectIsVideoEnabled     // boolean
selectNetworkQuality     // NetworkQuality | null
```

## RTK Query Hooks

### Auth
```typescript
useLoginMutation()
useRegisterMutation()
useLogoutMutation()
useGetCurrentUserQuery()
useRefreshTokenMutation()
useVerifyEmailMutation()
```

### Profile
```typescript
useGetCurrentProfileQuery()
useGetProfileByIdQuery(id)
useUpdateProfileMutation()
useUploadProfilePhotoMutation()
useDeleteProfilePhotoMutation()
useGetDiscoveryProfilesQuery(filters)
```

### Matching
```typescript
useGetMatchesQuery()
useLikeUserMutation()
usePassUserMutation()
useSuperLikeUserMutation()
useUnmatchMutation()
```

### Messaging
```typescript
useGetConversationsQuery()
useGetMessagesQuery({ conversationId, limit, before })
useSendMessageMutation()
useMarkAsReadMutation()
useDeleteMessageMutation()
useUploadMessageMediaMutation()
```

## Action Creators

### Auth
```typescript
loginStart()
loginSuccess({ user, token, refreshToken })
loginFailure(error)
logout()
updateUser(updates)
updateTokens({ token, refreshToken })
clearError()
```

### Profile
```typescript
setCurrentProfile(profile)
updateProfile(updates)
setProfiles(profiles)
addProfile(profile)
removeProfile(id)
setUploading(boolean)
setUploadProgress(number)
clearProfile()
```

### Matching
```typescript
setMatches(matches)
addMatch(match)
removeMatch(id)
setCurrentMatch(match)
updateMatch({ id, updates })
clearMatches()
```

### Messaging
```typescript
setConversations(conversations)
upsertConversation(conversation)
setCurrentConversation(conversation)
setMessages(messages)
addMessage(message)
updateMessage({ id, updates })
deleteMessage(id)
markConversationAsRead(id)
setTypingStatus({ conversationId, isTyping })
clearMessages()
clearMessagingState()
```

### Call
```typescript
startCall(callData)
receiveIncomingCall(call)
acceptIncomingCall(data)
rejectIncomingCall()
endCall({ reason })
toggleMute()
toggleVideo()
toggleScreenShare()
setNetworkQuality(quality)
clearCall()
```

## Thunks

### Auth
```typescript
loginUser({ email, password })
registerUser({ email, password, name, dateOfBirth })
logoutUser()
refreshToken()
verifyEmail(token)
requestPasswordReset(email)
resetPassword({ token, password })
```

### Profile
```typescript
fetchCurrentProfile()
updateUserProfile(updates)
uploadProfilePhoto(file)
deleteProfilePhoto(photoId)
fetchDiscoveryProfiles({ filters, limit })
fetchProfileById(profileId)
```

### Matching
```typescript
fetchMatches()
sendLike(userId)
sendPass(userId)
sendSuperLike(userId)
unmatchUser(matchId)
```

### Messaging
```typescript
fetchConversations()
fetchMessages({ conversationId, limit, before })
sendMessage({ conversationId, content, type })
markAsRead(conversationId)
deleteMessage(messageId)
uploadMessageMedia({ file, type })
```

## TypeScript Types

```typescript
import type {
  RootState,
  AppDispatch,
  User,
  Profile,
  Match,
  Conversation,
  Message,
} from '@/store';
```

## Best Practices

### ✅ Do
- Use typed hooks (`useAppDispatch`, `useAppSelector`)
- Use memoized selectors
- Use RTK Query for API calls
- Handle loading and error states
- Clean up on unmount

### ❌ Don't
- Use plain `useSelector` and `useDispatch`
- Select derived data directly in components
- Make API calls in useEffect
- Ignore loading/error states
- Leave subscriptions active

## Example Component

```typescript
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  selectCurrentUser,
  selectSortedMatches,
  useGetMatchesQuery,
  useLikeUserMutation,
} from '@/store';

function MatchesPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);

  // Query data
  const { data: matches, isLoading, error } = useGetMatchesQuery();

  // Mutation
  const [likeUser, { isLoading: isLiking }] = useLikeUserMutation();

  // Handler
  const handleLike = async (userId: string) => {
    try {
      const result = await likeUser(userId).unwrap();
      if (result.match) {
        toast.success('It\'s a match!');
      }
    } catch (error) {
      toast.error('Failed to like user');
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <MatchesList
      matches={matches}
      onLike={handleLike}
      isLiking={isLiking}
    />
  );
}
```

## Debugging

### View State
```typescript
// In component
const state = useAppSelector(state => state);
console.log('Current state:', state);
```

### View Action
```typescript
const dispatch = useAppDispatch();
const result = await dispatch(loginUser(credentials));
console.log('Action result:', result);
```

### Redux DevTools
1. Open browser DevTools
2. Go to Redux tab
3. View state, actions, and diff
4. Time-travel through state changes

## Quick Troubleshooting

### State not updating?
- Check action is being dispatched
- Verify reducer handles action
- Check Redux DevTools for action

### Component not re-rendering?
- Use memoized selector
- Check selector returns new reference
- Verify correct state slice

### RTK Query not refetching?
- Check cache invalidation tags
- Use `refetchOnMountOrArgChange`
- Manual refetch with `refetch()`

### WebSocket not working?
- Check token is available
- Verify socket URL is correct
- Check browser console for errors
