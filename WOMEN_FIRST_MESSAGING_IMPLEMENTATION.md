# Women-First Messaging Feature Implementation

## Overview
This document describes the implementation of the Women-First Messaging feature for the dating app. This is a critical safety and user experience feature that ensures in heterosexual matches, only women can send the first message, giving them more control over their dating experience.

## Feature Requirements

### Core Functionality
1. **Heterosexual Match Detection**: Automatically detect heterosexual matches (male-female pairs)
2. **First Message Restriction**: Only the woman can send the first message in heterosexual matches
3. **No Restriction for Same-Sex Matches**: Same-sex matches have no messaging restrictions
4. **Conversation Unlocking**: Once the woman sends the first message, both parties can message freely
5. **Clear UI Feedback**: Men see a clear message explaining they must wait for the woman to message first

## Architecture

### Database Changes

#### 1. Matches Table Migration
**File**: `backend/services/matching-service/src/infrastructure/database/migrations/20250202_add_women_first_messaging_fields.ts`

Added fields:
- `first_message_sent_by`: UUID of user who sent the first message
- `conversation_initiated`: Boolean flag indicating if conversation has started
- `requires_women_first`: Boolean flag indicating if this match requires women-first rule
- `woman_user_id`: UUID of the woman in heterosexual matches (for quick validation)

### Backend Implementation

#### 2. Match Entity Updates
**File**: `backend/services/matching-service/src/domain/entities/Match.entity.ts`

Added properties to the Match class:
```typescript
firstMessageSentBy?: string;
conversationInitiated: boolean;
requiresWomenFirst: boolean;
womanUserId?: string;
```

#### 3. User Service Client
**File**: `backend/services/matching-service/src/infrastructure/clients/user-service.client.ts`

Created a new client to communicate with the user service to:
- Fetch user profiles (including gender information)
- Get user preferences
- Batch fetch multiple user profiles

#### 4. Match Creation Logic
**File**: `backend/services/matching-service/src/domain/services/swipe.service.ts`

Enhanced the `createMatch()` method to:
1. Fetch user profiles for both matched users
2. Determine if women-first rule applies using `determineWomenFirstRule()` helper
3. Set appropriate fields when creating the match

The `determineWomenFirstRule()` helper function:
- Returns `false` if gender information is missing (fail-safe)
- Checks if match is heterosexual (one male, one female)
- Identifies the woman's user ID for validation
- Returns `true` only for heterosexual matches

#### 5. Messaging Validation
**File**: `backend/services/messaging-service/src/api/controllers/message.controller.ts`

Enhanced the `sendMessage()` method to:
1. Check if conversation has been initiated
2. If not initiated and women-first rule applies, validate sender is the woman
3. Return HTTP 403 error with clear message if man tries to message first
4. Mark conversation as initiated after first message is sent
5. Update match status via matching service API

Error response format:
```json
{
  "success": false,
  "error": "In heterosexual matches, only women can send the first message. Please wait for her to message you first.",
  "code": "WOMEN_FIRST_MESSAGING_REQUIRED",
  "data": {
    "requiresWomenFirst": true,
    "waitingFor": "<woman_user_id>"
  }
}
```

#### 6. Matching Service Client
**File**: `backend/services/messaging-service/src/infrastructure/clients/matching-service.client.ts`

Created client to communicate with matching service for:
- Fetching match information
- Finding matches between two users
- Updating match conversation status

#### 7. Conversation Repository Updates
**File**: `backend/services/messaging-service/src/domain/repositories/conversation.repository.ts`

Updated Conversation interface to include:
```typescript
firstMessageSentBy?: string;
conversationInitiated?: boolean;
requiresWomenFirst?: boolean;
womanUserId?: string;
```

#### 8. Match API Enhancements
**File**: `backend/services/matching-service/src/api/controllers/match.controller.ts`

Added `getMessagingPermissions()` helper method that returns:
```typescript
{
  canSendMessage: boolean;          // Can current user send a message?
  waitingForFirstMessage: boolean;  // Is user waiting for woman to message?
  requiresWomenFirst: boolean;      // Does this match have women-first rule?
  womanUserId?: string;             // ID of the woman (for heterosexual matches)
  conversationInitiated: boolean;   // Has conversation started?
  message?: string;                 // Human-readable message
}
```

This is included in the match detail response automatically.

#### 9. Internal API Routes
**File**: `backend/services/matching-service/src/api/routes/internal.routes.ts`

Added new endpoints:

**GET /api/internal/matches/find**
- Query params: `user1Id`, `user2Id`
- Returns match between two users
- Used by messaging service to get match info when creating conversations

**PATCH /api/internal/matches/:matchId/conversation**
- Updates conversation status on match
- Request body: `{ conversationInitiated: boolean, firstMessageSentBy?: string }`
- Called when first message is sent

### Frontend Implementation

#### 10. MessageThread Component Updates
**File**: `apps/mobile-app/src/components/messaging/MessageThread.tsx`

Added new props:
```typescript
canSendMessage?: boolean;           // Permission to send messages
waitingForFirstMessage?: boolean;   // Waiting for woman to message
requiresWomenFirst?: boolean;       // Match has women-first rule
matchExpiresAt?: Date;              // Match expiration time (for countdown)
```

New UI elements:

**Women-First Banner**
- Displays above message input when `waitingForFirstMessage` is true
- Shows clear explanation: "Waiting for her to message first"
- Includes subtitle: "In heterosexual matches, women send the first message"
- Shows countdown timer if match has expiration

**Disabled Input States**
- Input field becomes non-editable when `canSendMessage` is false
- Placeholder changes to: "Waiting for her to message first..."
- Send button is disabled
- Attachment, voice note, and GIF buttons are disabled
- Visual opacity reduced to indicate disabled state

**Helper Function**
- `getTimeRemaining()`: Calculates and formats time until match expires

## Data Flow

### Match Creation Flow
1. Users swipe right on each other
2. Swipe service creates match
3. Service fetches both user profiles from user service
4. Service determines if heterosexual match
5. Match created with `requiresWomenFirst` and `womanUserId` fields set
6. Both users notified of match

### First Message Flow (Heterosexual Match)

**Woman sends first message:**
1. Woman opens conversation
2. Frontend shows normal message input (no restrictions)
3. Woman types and sends message
4. Message controller validates (passes, sender is woman)
5. Message created in database
6. Conversation marked as initiated (`conversationInitiated = true`)
7. Match status updated via internal API
8. Message delivered to man
9. Now both can message freely

**Man tries to send first message:**
1. Man opens conversation
2. Frontend receives match data with `canSendMessage: false`
3. Women-first banner displayed
4. Message input disabled
5. If man somehow bypasses frontend (API call), backend returns 403 error
6. Clear error message returned to client

### Conversation Continuation Flow
1. After first message, `conversationInitiated` is true
2. Backend skips women-first validation
3. Both users can message freely
4. No restrictions on subsequent messages

## Security Considerations

1. **Frontend Validation**: UI prevents message sending, but not relied upon for security
2. **Backend Validation**: Primary enforcement happens in message controller
3. **Fail-Safe Design**: If gender info unavailable, defaults to no restriction (avoids blocking)
4. **Clear Error Messages**: Users understand why they cannot message
5. **No Gender Bypass**: Cannot change gender to bypass restriction (requires re-matching)

## Testing Considerations

### Test Scenarios

1. **Heterosexual Match - Woman Messages First**
   - Woman can send first message
   - Man receives message
   - Both can continue conversation

2. **Heterosexual Match - Man Tries to Message First**
   - Man sees disabled input
   - API returns 403 error if attempted
   - Clear error message displayed

3. **Same-Sex Match (Male-Male)**
   - Either party can send first message
   - No restrictions apply
   - Normal conversation flow

4. **Same-Sex Match (Female-Female)**
   - Either party can send first message
   - No restrictions apply
   - Normal conversation flow

5. **Missing Gender Information**
   - System defaults to no restrictions
   - Both users can message
   - Logged as warning for monitoring

6. **Non-Binary Users**
   - Currently treated as non-heterosexual match
   - No restrictions apply
   - May need product decision for future enhancement

### API Testing

**Test Match Creation:**
```bash
# Create test match between male and female users
POST /api/internal/matches/create
{
  "userId1": "male-user-id",
  "userId2": "female-user-id"
}

# Verify response includes:
# - requiresWomenFirst: true
# - womanUserId: "female-user-id"
# - conversationInitiated: false
```

**Test Message Sending:**
```bash
# Try to send message as man (should fail)
POST /api/messages
{
  "receiverId": "female-user-id",
  "content": "Hello"
}
# Expected: 403 with WOMEN_FIRST_MESSAGING_REQUIRED

# Send message as woman (should succeed)
POST /api/messages
{
  "receiverId": "male-user-id",
  "content": "Hi there!"
}
# Expected: 201 with message created

# Try to send message as man again (should succeed now)
POST /api/messages
{
  "receiverId": "female-user-id",
  "content": "Hello back!"
}
# Expected: 201 with message created
```

## Migration Guide

### Database Migration
```bash
# Run the migration on matching service database
cd backend/services/matching-service
npm run migrate:latest
```

The migration is backward compatible:
- Existing matches will have `requiresWomenFirst: false` (default)
- New matches will be properly analyzed and flagged
- No data loss or corruption

### Deployment Order
1. Deploy matching service (with migration)
2. Deploy messaging service (with validation)
3. Deploy frontend (with UI updates)
4. Monitor logs for any issues

### Rollback Plan
If issues arise:
1. Revert frontend to remove UI restrictions
2. Revert messaging service to remove validation
3. Database migration can be rolled back: `npm run migrate:rollback`

## Configuration

### Environment Variables
No new environment variables required. Uses existing service URLs:
- `MATCHING_SERVICE_URL`: URL for matching service
- `USER_SERVICE_URL`: URL for user service

### Feature Flags
Consider adding feature flag for gradual rollout:
```typescript
const ENABLE_WOMEN_FIRST_MESSAGING = process.env.ENABLE_WOMEN_FIRST_MESSAGING === 'true';
```

## Monitoring and Analytics

### Metrics to Track
1. **Match Creation Metrics**
   - Percentage of matches with women-first rule enabled
   - Distribution of heterosexual vs same-sex matches

2. **Messaging Metrics**
   - First message send rate by women
   - Time to first message (woman sends)
   - Rate of men attempting to message first (errors)
   - Conversation continuation rate after first message

3. **Error Metrics**
   - Count of WOMEN_FIRST_MESSAGING_REQUIRED errors
   - Failed validations (should be low in production)

### Logging
Key log points:
- Match creation with women-first determination
- First message validation checks
- Conversation initiation events
- Validation failures

## Future Enhancements

### Potential Improvements
1. **Match Expiration**: Auto-expire matches if woman doesn't message within 24 hours
2. **Extend Feature**: Allow woman to extend match expiration (premium feature)
3. **Notification Reminders**: Remind women to message their matches
4. **Icebreaker Suggestions**: Provide conversation starters for women
5. **Non-Binary Matching**: Product decision on how to handle non-binary users
6. **Analytics Dashboard**: Admin view of women-first messaging metrics
7. **A/B Testing**: Test different messaging and UI approaches

### Known Limitations
1. **Gender Changes**: If user changes gender after match, rule doesn't update (by design)
2. **Non-Binary Users**: Currently treated as unrestricted (may need refinement)
3. **No Time Limit**: Matches don't expire (can be added as enhancement)

## Support and Documentation

### User-Facing Documentation
Users should be informed about this feature:
- During onboarding
- In help/FAQ section
- In match notification

### Help Center Article Example
**Q: Why can't I send a message to my match?**

A: In matches between men and women, we empower women to make the first move. This means that women send the first message. Once she sends the first message, both of you can chat freely!

This feature creates a more respectful and comfortable experience for everyone.

---

## Conclusion

The Women-First Messaging feature has been successfully implemented across the entire stack:
- Database schema updated with migration
- Backend services updated with validation logic
- Frontend updated with clear user experience
- Internal APIs created for service communication

The implementation is:
- **Secure**: Backend validation prevents bypassing
- **User-Friendly**: Clear UI feedback for all users
- **Fail-Safe**: Defaults to no restriction if data unavailable
- **Scalable**: Works efficiently with existing architecture
- **Maintainable**: Well-documented and tested

All existing functionality remains intact, and the feature integrates seamlessly with the current codebase.
